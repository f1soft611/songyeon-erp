import type { F1GridColumn, F1GridRowId } from '../types/grid.types';
import { isF1GridInputDigitCountValid } from '../editing/inputFormat';
import { getGridRowId } from '../utils/grid.utils';

export type F1GridValidationContext<T extends object> = {
  isDuplicate: (row: T, field: keyof T) => boolean;
};

function normalizeUniqueValue(value: unknown, mode: boolean | 'digits' | undefined): unknown {
  if (mode === 'digits' && value !== null && value !== undefined) {
    return String(value).replace(/[^0-9]/g, '');
  }
  return typeof value === 'string' ? value.trim() : value;
}

function isEmptyValue(value: unknown): boolean {
  return value === null || value === undefined || value === '';
}

export function createGridValidationContext<T extends object>(
  rows: T[],
  columns: F1GridColumn<T>[],
  rowKey: keyof T,
): F1GridValidationContext<T> {
  const indexes = new Map<keyof T, Map<unknown, Set<F1GridRowId>>>();
  const modes = new Map<keyof T, boolean | 'digits'>();
  columns.forEach((column) => {
    const mode = column.validation?.unique;
    if (!mode) return;
    const values = new Map<unknown, Set<F1GridRowId>>();
    rows.forEach((row) => {
      const value = normalizeUniqueValue(row[column.field], mode);
      if (isEmptyValue(value)) return;
      const ids = values.get(value) ?? new Set<F1GridRowId>();
      ids.add(getGridRowId(row, rowKey));
      values.set(value, ids);
    });
    indexes.set(column.field, values);
    modes.set(column.field, mode);
  });
  return {
    isDuplicate(row, field) {
      const ids = indexes.get(field)?.get(normalizeUniqueValue(row[field], modes.get(field)));
      if (!ids?.size) return false;
      return ids.size > 1 || !ids.has(getGridRowId(row, rowKey));
    },
  };
}

function buildInputFormatErrorMessage<T extends object>(
  headerName: string,
  column: F1GridColumn<T>,
) {
  const inputFormat = column.inputFormat;
  if (!inputFormat) return '';

  if (inputFormat.type === 'digits' && inputFormat.validDigitCounts?.length) {
    const expectedLengths = [...new Set(inputFormat.validDigitCounts)]
      .sort((left, right) => left - right)
      .join(' 또는 ');
    return `${headerName}은(는) ${expectedLengths}자리여야 합니다.`;
  }

  if (inputFormat.type === 'korean-phone') {
    return `${headerName}은(는) 02는 9자리 또는 10자리, 그 외는 10자리 또는 11자리여야 합니다.`;
  }

  return '';
}

export function validateGridRow<T extends object>(
  row: T,
  columns: F1GridColumn<T>[],
  context?: F1GridValidationContext<T>,
): Record<string, string> {
  const errors: Record<string, string> = {};

  columns.forEach((column) => {
    const value = row[column.field];
    const key = String(column.field);
    const isEmpty =
      value === null ||
      value === undefined ||
      (typeof value === 'string' && value.trim() === '');

    if (column.required && isEmpty) {
      errors[key] = `${column.headerName}은(는) 필수입니다.`;
      return;
    }

    if (!isEmpty && typeof value === 'string' && column.inputFormat) {
      if (!isF1GridInputDigitCountValid(value, column.inputFormat)) {
        errors[key] = buildInputFormatErrorMessage(column.headerName, column);
        return;
      }
    }

    const numericValue = Number(value);
    if (
      column.min !== undefined &&
      Number.isFinite(numericValue) &&
      numericValue < column.min
    ) {
      errors[key] =
        `${column.headerName}은(는) ${column.min} 이상이어야 합니다.`;
      return;
    }

    if (
      column.max !== undefined &&
      Number.isFinite(numericValue) &&
      numericValue > column.max
    ) {
      errors[key] = `${column.headerName}은(는) ${column.max} 이하여야 합니다.`;
      return;
    }

    if (
      !isEmpty &&
      column.validation?.unique &&
      context?.isDuplicate(row, column.field)
    ) {
      errors[key] = `${column.headerName} 값이 중복되었습니다.`;
      return;
    }

    const customResult = column.validate?.(value, row);
    if (typeof customResult === 'string') errors[key] = customResult;
    if (customResult === false)
      errors[key] = `${column.headerName} 값이 올바르지 않습니다.`;
  });

  return errors;
}

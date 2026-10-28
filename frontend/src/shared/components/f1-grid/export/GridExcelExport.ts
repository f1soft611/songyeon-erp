import type { F1GridColumn } from '../types/grid.types';
import { getCellDisplayValue, getGridDateValue } from '../utils/grid.utils';

type ExportCellValue = string | number | boolean | Date | null;

type ExportCell = {
  value: ExportCellValue;
  numFmt?: string;
  alignment?: { horizontal: 'left' | 'center' | 'right' };
};

const DECIMAL_VALUE_PATTERN =
  /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i;

function getNumberOrText(value: unknown): number | string {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : String(value);
  }

  if (typeof value === 'string' && DECIMAL_VALUE_PATTERN.test(value)) {
    const number = Number(value);
    return Number.isFinite(number) ? number : value;
  }

  return String(value);
}

function getDateTimeValue(value: unknown): Date | undefined {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : new Date(value.getTime());
  }
  if (typeof value !== 'string' || !getGridDateValue(value)) return undefined;

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function getTimeValue(
  value: unknown,
): { value: number; numFmt: string } | undefined {
  if (typeof value !== 'string') return undefined;
  const match = value.match(/^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/);
  if (!match) return undefined;

  const seconds =
    Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3] ?? 0);
  return {
    value: seconds / 86400,
    numFmt: match[3] ? 'hh:mm:ss' : 'hh:mm',
  };
}

function getBooleanOrText(value: unknown): boolean | string {
  if (typeof value === 'boolean') return value;
  if (value === 1) return true;
  if (value === 0) return false;

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', 'y', 'yes', '1', 'on'].includes(normalized)) return true;
    if (['false', 'n', 'no', '0', 'off'].includes(normalized)) return false;
  }

  return String(value);
}

function getNumericFormat<T extends object>(
  column: Pick<F1GridColumn<T>, 'format' | 'decimalPlaces'>,
  value: number | string,
): string {
  const decimalPlaces =
    column.decimalPlaces !== undefined &&
    Number.isInteger(column.decimalPlaces)
      ? Math.max(0, column.decimalPlaces)
      : undefined;
  const isDefaultInteger =
    decimalPlaces === undefined &&
    column.format !== 'currency' &&
    typeof value === 'number' &&
    Number.isInteger(value);
  const digits =
    decimalPlaces !== undefined
      ? '0'.repeat(decimalPlaces)
      : column.format === 'currency' || isDefaultInteger
        ? ''
        : '#####';
  const numberFormat = digits ? `#,##0.${digits}` : '#,##0';

  return column.format === 'currency'
    ? `"₩"${numberFormat}`
    : numberFormat;
}

function getGridCellAlignment<T extends object>(
  column: F1GridColumn<T>,
): NonNullable<ExportCell['alignment']> {
  return {
    horizontal:
      column.align ??
      (column.type === 'number' || column.type === 'rownumber'
        ? 'right'
        : 'left'),
  };
}

function getTypedExcelCell<T extends object>(
  column: F1GridColumn<T>,
  rawValue: unknown,
): ExportCell {
  const alignment = getGridCellAlignment(column);
  if (rawValue === null || rawValue === undefined || rawValue === '') {
    return { value: null, alignment };
  }

  let cell: ExportCell;
  switch (column.type) {
    case 'number':
    case 'decimal':
    case 'currency': {
      const value = getNumberOrText(rawValue);
      cell = {
        value,
        numFmt: getNumericFormat(column, value),
      };
      break;
    }
    case 'date':
      cell = { value: getCellDisplayValue(column, rawValue) };
      break;
    case 'datetime': {
      const date = getDateTimeValue(rawValue);
      cell = date
        ? { value: date, numFmt: 'yyyy-mm-dd hh:mm:ss' }
        : { value: String(rawValue) };
      break;
    }
    case 'time': {
      const time = getTimeValue(rawValue);
      cell = time ?? { value: String(rawValue) };
      break;
    }
    case 'checkbox':
      cell = { value: getBooleanOrText(rawValue) };
      break;
    case 'rownumber':
      cell = { value: getNumberOrText(rawValue), numFmt: '0' };
      break;
    default:
      cell = { value: getCellDisplayValue(column, rawValue) };
  }
  if (typeof cell.value === 'string') cell.numFmt ??= '@';
  return { ...cell, alignment };
}

/** 화면에 보이는 컬럼/행 기준으로 .xlsx 파일을 생성해 즉시 다운로드한다. */
export async function exportGridRowsToExcel<T extends object>(
  columns: F1GridColumn<T>[],
  rows: T[],
  fileName: string,
): Promise<void> {
  const ExcelJS = await import('exceljs');

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Sheet1');
  worksheet.columns = columns.map((column) => ({
    header: column.headerName,
    key: String(column.field),
  }));
  const headerRow = worksheet.getRow(1);
  columns.forEach((column, index) => {
    headerRow.getCell(index + 1).alignment = {
      horizontal: column.headerAlign ?? 'center',
    };
  });
  rows.forEach((row) => {
    const cells = columns.map((column) => {
      const rawValue = column.getValue?.(row) ?? row[column.field];
      return getTypedExcelCell(column, rawValue);
    });
    const excelRow = worksheet.addRow(cells.map((cell) => cell.value));
    cells.forEach((cell, index) => {
      const excelCell = excelRow.getCell(index + 1);
      if (cell.numFmt) excelCell.numFmt = cell.numFmt;
      if (cell.alignment) excelCell.alignment = cell.alignment;
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${fileName}.xlsx`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

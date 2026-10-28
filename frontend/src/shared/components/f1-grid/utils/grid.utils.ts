import dayjs from 'dayjs';
import type {
  F1GridColumn,
  F1GridPinSide,
  F1GridRowId,
} from '../types/grid.types';

export function getStateKey(rowId: F1GridRowId): string {
  return String(rowId);
}

export function hasGridRowId<T extends object>(
  rows: T[],
  rowKey: keyof T,
  rowId: F1GridRowId,
): boolean {
  return rows.some((row) => row[rowKey] === rowId);
}

export function getGridRowId<T extends object>(
  row: T,
  rowKey: keyof T,
): F1GridRowId {
  const rowId = row[rowKey];

  if (typeof rowId !== 'string' && typeof rowId !== 'number') {
    throw new Error('F1Grid rowKey must reference a string or number value.');
  }

  return rowId;
}

export function isCellEditable<T extends object>(
  column: F1GridColumn<T>,
  row: T,
): boolean {
  if (column.type === 'rownumber') return false;
  if (column.type === 'checkbox' && column.editable === undefined) {
    return true;
  }
  if (column.editable === undefined) return false;
  return typeof column.editable === 'function'
    ? column.editable(row)
    : Boolean(column.editable);
}

export function isGridCheckboxChecked(value: unknown): boolean {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === '') return false;
    return ['true', 'y', 'yes', '1', 'on'].includes(normalized);
  }

  if (typeof value === 'number') {
    return value !== 0;
  }

  return Boolean(value);
}

export function normalizeGridNumberInput(
  rawValue: string,
  decimalPlaces?: number,
): string {
  if (rawValue === '') return '';
  if (
    decimalPlaces === undefined ||
    !Number.isInteger(decimalPlaces) ||
    decimalPlaces < 0
  ) {
    return rawValue;
  }

  const trimComma = rawValue.replace(/,/g, '');
  if (trimComma === '') return '';

  const sign = trimComma.startsWith('-')
    ? '-'
    : trimComma.startsWith('+')
      ? '+'
      : '';
  const unsigned = sign ? trimComma.slice(1) : trimComma;

  if (decimalPlaces === 0) {
    const digits = unsigned.replace(/[^\d]/g, '');
    return digits ? `${sign}${digits}` : sign;
  }

  if (unsigned === '.' || unsigned === '-.' || unsigned === '+.') {
    return `${sign}.`;
  }

  const hasDecimalPoint = unsigned.includes('.');
  const [integerPart, fractionPart = ''] = unsigned.split('.');
  const sanitizedInteger = integerPart.replace(/[^\d]/g, '');
  const sanitizedFraction = fractionPart
    .replace(/[^\d]/g, '')
    .slice(0, decimalPlaces);

  if (sanitizedInteger === '' && sanitizedFraction === '' && !hasDecimalPoint) {
    return sign || '';
  }

  if (hasDecimalPoint && sanitizedFraction === '') {
    return `${sign}${sanitizedInteger}.`;
  }

  if (sanitizedInteger === '' && sanitizedFraction !== '') {
    return `${sign}.${sanitizedFraction}`;
  }

  return `${sign}${sanitizedInteger}${sanitizedFraction ? `.${sanitizedFraction}` : ''}`;
}

export function getGridColumnTrack<T extends object>(
  column: F1GridColumn<T>,
  resizedWidth?: number,
  pinned = false,
): string {
  if (resizedWidth !== undefined) return `${resizedWidth}px`;
  if (pinned) return `${column.width ?? 140}px`;
  if (column.flex !== undefined && column.flex > 0) {
    return `minmax(${column.width ?? 0}px, ${column.flex}fr)`;
  }
  return `${column.width ?? 140}px`;
}

function formatGridTrackWidth(width: number): string {
  const roundedWidth = Math.round(width * 1000) / 1000;
  return `${roundedWidth}px`;
}

export function getGridColumnTracks<T extends object>(
  columns: F1GridColumn<T>[],
  columnWidths: Record<string, number>,
  pinnedFields: Map<string, F1GridPinSide>,
  containerWidth: number,
  checkboxWidth = 44,
): string {
  const baseWidths = columns.map((column) => {
    const field = String(column.field);
    const resizedWidth = columnWidths[field];
    const pinned = pinnedFields.has(field);
    return resizedWidth ?? column.width ?? (pinned || !column.flex ? 140 : 0);
  });
  const flexTotal = columns.reduce((total, column) => {
    const field = String(column.field);
    const resized = columnWidths[field] !== undefined;
    const pinned = pinnedFields.has(field);
    return !resized && !pinned && column.flex && column.flex > 0
      ? total + column.flex
      : total;
  }, 0);
  const minimumWidth = baseWidths.reduce((total, width) => total + width, 0);
  const availableWidth = Math.max(0, containerWidth - checkboxWidth);
  const remainingWidth = Math.max(0, availableWidth - minimumWidth);

  const tracks = columns.map((column, index) => {
    const field = String(column.field);
    const canFlex =
      columnWidths[field] === undefined &&
      !pinnedFields.has(field) &&
      Boolean(column.flex && column.flex > 0);
    const width = canFlex
      ? baseWidths[index] + (remainingWidth * (column.flex ?? 0)) / flexTotal
      : baseWidths[index];
    return formatGridTrackWidth(width);
  });

  return `${checkboxWidth > 0 ? `${checkboxWidth}px ` : ''}${tracks.join(' ')}`;
}

function formatNumericValue(
  value: unknown,
  options?: {
    type?: F1GridColumn<object>['type'];
    format?: F1GridColumn<object>['format'];
    decimalPlaces?: number;
  },
): string {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return String(value ?? '');
  }

  const decimalPlaces =
    options?.decimalPlaces !== undefined &&
    Number.isInteger(options.decimalPlaces)
      ? Math.max(0, options.decimalPlaces)
      : undefined;

  const resolvedFormat = options?.format ?? options?.type;

  if (resolvedFormat === 'currency' && options?.format === 'currency') {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      maximumFractionDigits: decimalPlaces ?? 0,
      minimumFractionDigits: decimalPlaces ?? 0,
    }).format(numericValue);
  }

  if (resolvedFormat === 'number' || resolvedFormat === 'decimal') {
    return new Intl.NumberFormat('ko-KR', {
      minimumFractionDigits: decimalPlaces ?? 0,
      maximumFractionDigits: decimalPlaces ?? 5,
    }).format(numericValue);
  }

  return new Intl.NumberFormat('ko-KR', {
    minimumFractionDigits: decimalPlaces ?? 0,
    maximumFractionDigits: decimalPlaces ?? 5,
  }).format(numericValue);
}

export function getGridDateValue(value: unknown): Date | undefined {
  if (value instanceof Date) {
    if (!dayjs(value).isValid()) return undefined;
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }
  if (typeof value !== 'string') return undefined;

  const match = value.match(/^(\d{4})-?(\d{2})-?(\d{2})(?:$|[T ])/);
  if (!match) return undefined;
  const dateText = `${match[1]}-${match[2]}-${match[3]}`;
  const parsed = dayjs(dateText);
  if (!parsed.isValid() || parsed.format('YYYY-MM-DD') !== dateText) {
    return undefined;
  }
  return new Date(parsed.year(), parsed.month(), parsed.date());
}

function formatDateValue(value: unknown, format = 'yyyy-mm-dd'): string {
  const rawValue = String(value ?? '');
  if (rawValue === '') return '';

  const dateValue = getGridDateValue(value);
  if (!dateValue) return rawValue;
  const parsed = dayjs(dateValue);

  const tokens: Record<string, string> = {
    yyyy: parsed.format('YYYY'),
    yy: parsed.format('YY'),
    mm: parsed.format('MM'),
    m: parsed.format('M'),
    dd: parsed.format('DD'),
    d: parsed.format('D'),
  };
  return (format || 'yyyy-mm-dd').replace(
    /\[([^\]]*)\]|yyyy|YYYY|yy|YY|mm|MM|dd|DD|m|M|d|D/g,
    (token: string, literal: string | undefined) =>
      literal ?? tokens[token.toLowerCase()],
  );
}

export function getCellDisplayValue<T extends object>(
  column: F1GridColumn<T>,
  value: unknown,
): string {
  if (column.type === 'date') {
    return formatDateValue(value, column.format);
  }

  if (column.type === 'user') {
    const selectedValues = Array.isArray(value) ? value : [value];
    return selectedValues
      .filter(
        (selected): selected is string | number =>
          typeof selected === 'string' || typeof selected === 'number',
      )
      .map(
        (selected) =>
          column.userOptions?.find(
            (option) => String(option.value) === String(selected),
          )?.label ?? String(selected),
      )
      .join(', ');
  }

  if (column.type === 'select' || column.type === 'autocomplete') {
    return (
      column.options?.find((option) => Object.is(option.value, value))?.label ??
      String(value ?? '')
    );
  }

  if (
    column.type === 'number' ||
    column.type === 'decimal' ||
    column.type === 'currency'
  ) {
    return formatNumericValue(value, {
      type: column.type,
      format: column.format,
      decimalPlaces: column.decimalPlaces,
    });
  }

  return String(value ?? '');
}

const GRID_CELL_FONT = '400 13px "Roboto", "Helvetica", "Arial", sans-serif';
const AUTO_FIT_CELL_PADDING = 32;

let measureContext: CanvasRenderingContext2D | null | undefined;

function getMeasureContext(): CanvasRenderingContext2D | null {
  if (measureContext !== undefined) return measureContext;
  measureContext =
    typeof document === 'undefined'
      ? null
      : (document.createElement('canvas').getContext('2d') ?? null);
  return measureContext;
}

function measureTextWidth(text: string): number {
  const context = getMeasureContext();
  if (!context) return text.length * 7;
  context.font = GRID_CELL_FONT;
  return context.measureText(text).width;
}

export function getAutoFitColumnWidth<T extends object>(
  column: F1GridColumn<T>,
  rows: T[],
  options: { minWidth: number },
): number {
  const headerWidth = measureTextWidth(column.headerName);
  const contentWidth = rows.reduce((widest, row) => {
    const rawValue = column.getValue?.(row) ?? row[column.field];
    const displayValue = getCellDisplayValue(column, rawValue as T[keyof T]);
    return Math.max(widest, measureTextWidth(displayValue));
  }, 0);

  const measuredWidth =
    Math.max(headerWidth, contentWidth) + AUTO_FIT_CELL_PADDING;
  const clampedWidth = Math.max(options.minWidth, measuredWidth);

  return column.maxWidth !== undefined
    ? Math.min(column.maxWidth, clampedWidth)
    : clampedWidth;
}

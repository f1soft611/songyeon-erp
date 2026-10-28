import type {
  F1GridColumn,
  F1GridEditorType,
  F1GridFilter,
  F1GridFilterOperator,
} from '../types/grid.types';

const TEXT_OPERATORS: F1GridFilterOperator[] = [
  'contains',
  'equals',
  'notEquals',
  'startsWith',
  'endsWith',
  'isEmpty',
  'isNotEmpty',
];

const RANGE_OPERATORS: F1GridFilterOperator[] = [
  'equals',
  'notEquals',
  'greaterThan',
  'lessThan',
  'greaterThanOrEqual',
  'lessThanOrEqual',
  'between',
  'isEmpty',
  'isNotEmpty',
];

const CHECKBOX_OPERATORS: F1GridFilterOperator[] = ['equals'];

const RANGE_TYPES: F1GridEditorType[] = [
  'number',
  'decimal',
  'currency',
  'date',
  'datetime',
  'time',
];

export function getGridFilterOperators(
  type: F1GridEditorType | undefined,
): F1GridFilterOperator[] {
  if (type === 'checkbox') return CHECKBOX_OPERATORS;
  if (type && RANGE_TYPES.includes(type)) return RANGE_OPERATORS;
  return TEXT_OPERATORS;
}

function isEmptyValue(value: unknown): boolean {
  return value === null || value === undefined || value === '';
}

function toComparable(
  value: unknown,
  type: F1GridEditorType | undefined,
): number | string {
  if (type === 'number' || type === 'decimal' || type === 'currency') {
    return Number(value);
  }
  return String(value ?? '');
}

export function matchesGridFilter<T extends object>(
  row: T,
  filter: F1GridFilter<T>,
  column: F1GridColumn<T>,
): boolean {
  const rawValue = row[filter.field];

  if (filter.operator === 'isEmpty') return isEmptyValue(rawValue);
  if (filter.operator === 'isNotEmpty') return !isEmptyValue(rawValue);

  if (column.type === 'checkbox') {
    return Boolean(rawValue) === Boolean(filter.value);
  }

  if (
    filter.operator === 'contains' ||
    filter.operator === 'startsWith' ||
    filter.operator === 'endsWith'
  ) {
    const text = String(rawValue ?? '').toLowerCase();
    const needle = String(filter.value ?? '').toLowerCase();
    if (filter.operator === 'contains') return text.includes(needle);
    if (filter.operator === 'startsWith') return text.startsWith(needle);
    return text.endsWith(needle);
  }

  const value = toComparable(rawValue, column.type);
  const target = toComparable(filter.value, column.type);

  switch (filter.operator) {
    case 'equals':
      return value === target;
    case 'notEquals':
      return value !== target;
    case 'greaterThan':
      return value > target;
    case 'lessThan':
      return value < target;
    case 'greaterThanOrEqual':
      return value >= target;
    case 'lessThanOrEqual':
      return value <= target;
    case 'between': {
      const upper = toComparable(filter.value2, column.type);
      return value >= target && value <= upper;
    }
    default:
      return true;
  }
}

export function applyGridFilters<T extends object>(
  rows: T[],
  filters: F1GridFilter<T>[],
  columns: F1GridColumn<T>[],
): T[] {
  if (filters.length === 0) return rows;

  return rows.filter((row) =>
    filters.every((filter) => {
      const column = columns.find((item) => item.field === filter.field);
      if (!column) return true;
      return matchesGridFilter(row, filter, column);
    }),
  );
}

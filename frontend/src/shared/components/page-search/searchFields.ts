import type {
  F1GridColumn,
  F1GridDateRangeDefault,
  F1GridEditorType,
  F1GridInputFormat,
  F1GridOption,
} from '../f1-grid';

export type PageSearchFieldType =
  | 'text'
  | 'number'
  | 'decimal'
  | 'currency'
  | 'date'
  | 'select'
  | 'checkbox';

export type PageSearchFieldValue =
  | string
  | number
  | boolean
  | null
  | { from?: string; to?: string };

export type PageSearchField = {
  field: string;
  label: string;
  type: PageSearchFieldType;
  searchSpan: 1 | 2 | 3 | 4 | 5;
  group?: string;
  options?: F1GridOption[];
  defaultValue?: F1GridDateRangeDefault;
  inputFormat?: F1GridInputFormat;
  sanitizeInput?: (value: string) => string;
};

const SEARCH_FIELD_TYPES = new Set<PageSearchFieldType>([
  'text',
  'number',
  'decimal',
  'currency',
  'date',
  'select',
  'checkbox',
]);

function resolveSearchType(type?: F1GridEditorType): PageSearchFieldType {
  if (type && SEARCH_FIELD_TYPES.has(type as PageSearchFieldType)) {
    return type as PageSearchFieldType;
  }
  return 'text';
}

export function toPageSearchFields<T extends object>(
  columns: F1GridColumn<T>[],
): PageSearchField[] {
  return columns
    .filter(
      (column) =>
        column.search?.hidden !== true &&
        (column.hidden !== true || column.search !== undefined),
    )
    .sort((left, right) => {
      const leftOrder = left.search?.order;
      const rightOrder = right.search?.order;
      if (leftOrder === undefined && rightOrder === undefined) return 0;
      if (leftOrder === undefined) return 1;
      if (rightOrder === undefined) return -1;
      return leftOrder - rightOrder;
    })
    .map((column) => ({
      field: String(column.field),
      label: column.search?.label ?? column.headerName,
      type: resolveSearchType(column.type),
      searchSpan: column.search?.span ?? 1,
      ...(column.search?.group ? { group: column.search.group } : {}),
      ...(column.options ? { options: column.options } : {}),
      ...(column.inputFormat ? { inputFormat: column.inputFormat } : {}),
      ...(column.sanitizeInput ? { sanitizeInput: column.sanitizeInput } : {}),
      ...(column.search?.defaultValue
        ? { defaultValue: column.search.defaultValue }
        : {}),
    }));
}

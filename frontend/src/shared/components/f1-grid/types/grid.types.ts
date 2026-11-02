import type { CSSProperties, ReactNode } from 'react';

export type F1GridRowId = string | number;

export type F1GridSavedRow<T extends object> = {
  previousRowId: F1GridRowId;
  row: T;
};

export type F1GridRowState = 'normal' | 'inserted' | 'updated' | 'deleted';

export type F1GridEditorType =
  | 'text'
  | 'number'
  | 'decimal'
  | 'currency'
  | 'checkbox'
  | 'date'
  | 'datetime'
  | 'time'
  | 'select'
  | 'autocomplete'
  | 'user'
  | 'code'
  | 'rownumber';

export type F1GridOption = {
  value: string | number | boolean;
  label: string;
};

export type F1GridUserOption = {
  value: string | number;
  label: string;
  avatarUrl?: string | null;
  positionName?: string | null;
  departmentName?: string | null;
};

export type F1GridDraftValue = string | number | null | Array<string | number>;

export type F1GridNumberFormat = 'number' | 'decimal' | 'currency';

export type F1GridInputFormat =
  | {
      type: 'digits';
      groupSizes?: number[];
      separator?: string;
      maxDigits?: number;
      validDigitCounts?: number[];
    }
  | { type: 'korean-phone'; maxDigits?: number };

export type F1GridFormMode = 'create' | 'edit';

export type F1GridDateDefault =
  | { type: 'fixed'; year: number; month: number; day: number }
  | {
      type: 'systemDate';
      offset?: { years?: number; months?: number; days?: number };
    };

export type F1GridDateRangeDefault = {
  from?: F1GridDateDefault;
  to?: F1GridDateDefault;
};

export type F1GridColumnFormOptions<T extends object> = {
  hidden?: boolean;
  readOnly?: boolean | ((row: T, mode: F1GridFormMode) => boolean);
  label?: string | ((row: T) => string);
  disabled?: boolean | ((row: T, mode: F1GridFormMode) => boolean);
  group?: string;
  order?: number;
  span?: 1 | 2 | 3;
  multiple?: boolean;
  targetField?: keyof T;
  targetLabel?: string;
};

export type F1GridColumnSearchOptions = {
  hidden?: boolean;
  label?: string;
  group?: string;
  order?: number;
  span?: 1 | 2 | 3 | 4 | 5;
  required?: boolean;
  defaultValue?: F1GridDateRangeDefault;
};

export type F1GridRowFormContext<T extends object> = {
  mode: F1GridFormMode;
  row: T;
};

export type F1GridRowFormApplyContext<T extends object> = {
  mode: F1GridFormMode;
  originalRow?: T;
  draftRow: T;
};

export type F1GridRowFormPlugin<T extends object> = {
  id?: string;
  enabled?: boolean;
  getTitle?: (context: F1GridRowFormContext<T>) => string;
  getDescription?: (context: F1GridRowFormContext<T>) => string;
  onBeforeApply?: (context: F1GridRowFormApplyContext<T>) => boolean | void;
};

export type F1GridEditContext<T extends object> = {
  row: T;
  rowId: F1GridRowId;
  column: F1GridColumn<T>;
  field: keyof T;
  value: unknown;
  defaultValue: string;
};

export type F1GridCellRenderContext<T extends object> = {
  row: T;
  rowId: F1GridRowId;
  column: F1GridColumn<T>;
  field: keyof T;
  value: unknown;
  rowIndex: number;
};

export type F1GridCellProps = {
  className?: string;
  style?: CSSProperties;
  title?: string;
  'aria-label'?: string;
};

export type F1GridEditLifecycle<T extends object> = (
  context: F1GridEditContext<T>,
) => boolean | void;

export type F1GridEditorPlugin<T extends object> = {
  id?: string;
  name?: string;
  enabled?: boolean;
  canEdit?: (context: F1GridEditContext<T>) => boolean;
  createEditor?: (context: F1GridEditContext<T>) => ReactNode;
  startEdit?: (context: F1GridEditContext<T>) => boolean | void;
  endEdit?: (context: F1GridEditContext<T>) => boolean | void;
};

export type F1GridColumn<T extends object> = {
  field: keyof T;
  headerName: string;
  headerGroup?: string;
  form?: F1GridColumnFormOptions<T>;
  search?: F1GridColumnSearchOptions;
  getValue?: (row: T) => unknown;
  onValueChange?: (row: T, value: unknown) => Partial<T>;
  width?: number;
  flex?: number;
  maxWidth?: number;
  editable?: boolean | ((row: T) => boolean);
  type?: F1GridEditorType;
  format?: string;
  decimalPlaces?: number;
  options?: F1GridOption[];
  userOptions?: F1GridUserOption[];
  selectOptionIcon?: (option: F1GridOption) => ReactNode;
  required?: boolean;
  validation?: { unique?: boolean | 'digits' };
  inputFormat?: F1GridInputFormat;
  sanitizeInput?: (value: string) => string;
  min?: number;
  max?: number;
  validate?: (value: T[keyof T], row: T) => string | boolean;
  onOpenCodePicker?: (
    row: T,
    applyPatch: (changes: Partial<T>) => void,
  ) => Partial<T> | undefined;
  renderCell?: (context: F1GridCellRenderContext<T>) => ReactNode;
  getCellStyle?: (
    context: F1GridCellRenderContext<T>,
  ) => CSSProperties | undefined;
  getCellProps?: (
    context: F1GridCellRenderContext<T>,
  ) => F1GridCellProps | undefined;
  align?: 'left' | 'center' | 'right';
  headerAlign?: 'left' | 'center' | 'right';
  wrapText?: boolean;
  mergeRows?: boolean;
  headerCheckbox?: boolean;
  hidden?: boolean;
  pinned?: F1GridPinSide;
  selectOnFocus?: boolean;
  syncWithTreeCheckbox?: boolean;
};

export type F1GridChanges<T> = {
  insertedRows: T[];
  updatedRows: T[];
  deletedRows: T[];
};

export type F1GridSortDirection = 'asc' | 'desc';

export type F1GridSort<T extends object> = {
  field: keyof T;
  direction: F1GridSortDirection;
};

export type F1GridFilterOperator =
  | 'equals'
  | 'notEquals'
  | 'contains'
  | 'startsWith'
  | 'endsWith'
  | 'greaterThan'
  | 'lessThan'
  | 'greaterThanOrEqual'
  | 'lessThanOrEqual'
  | 'between'
  | 'isEmpty'
  | 'isNotEmpty';

export type F1GridFilter<T extends object> = {
  field: keyof T;
  operator: F1GridFilterOperator;
  value?: unknown;
  value2?: unknown;
};

export type F1GridPinSide = 'left' | 'right';

export type F1GridRowProjection<T extends object> = {
  rows: T[];
};

export type F1GridDataSourceQuery<T extends object> = {
  offset: number;
  limit: number;
  sorts: F1GridSort<T>[];
  filters: F1GridFilter<T>[];
  signal: AbortSignal;
};

export type F1GridDataSourceResult<T extends object> = {
  rows: T[];
  totalRowCount: number;
};

export type F1GridDataSource<T extends object> = {
  pageSize?: number;
  load(query: F1GridDataSourceQuery<T>): Promise<F1GridDataSourceResult<T>>;
};

/** F1Tree가 내부적으로 주입하는 트리 전용 컨텍스트 메뉴 확장 포인트. 일반 F1Grid 사용 화면에서는 지정하지 않는다. */
export type F1GridContextMenuTreeConfig = {
  onAddRoot: () => void;
  onAddChild: (targetRowId?: F1GridRowId) => void;
};

export type F1GridValidationError = {
  rowId: F1GridRowId;
  field: string;
  message: string;
};

export type F1GridProps<T extends object> = {
  rows?: T[];
  dataSource?: F1GridDataSource<T>;
  onDataSourceError?: (error: Error) => void;
  columns: F1GridColumn<T>[];
  rowKey: keyof T;
  rowFormPlugin?: F1GridRowFormPlugin<T>;
  ariaLabel?: string;
  columnLine?: boolean;
  stripeRows?: boolean;
  storageKey?: string;
  height?: number | string;
  minHeight?: number | string;
  maxHeight?: number | string;
  rowHeight?: number;
  minRowHeight?: number;
  maxRowHeight?: number;
  resizableRows?: boolean;
  resizableColumns?: boolean;
  minColumnWidth?: number;
  virtualizeRows?: boolean;
  virtualizeColumns?: boolean;
  rowOverscan?: number;
  columnOverscan?: number;
  fixedRowHeightThreshold?: number;
  queryWorkerThreshold?: number;
  disableQueryWorker?: boolean;
  showCheckbox?: boolean;
  selectionMode?: 'cell' | 'row';
  multiSelect?: boolean;
  createRow?: () => T;
  createDuplicate?: (row: T) => T;
  editorPlugins?: F1GridEditorPlugin<T>[];
  editors?: F1GridEditorPlugin<T>[];
  onBeforeEdit?: F1GridEditLifecycle<T>;
  beforeEdit?: F1GridEditLifecycle<T>;
  onAfterEdit?: F1GridEditLifecycle<T>;
  afterEdit?: F1GridEditLifecycle<T>;
  onChangesChange?: (changes: F1GridChanges<T>) => void;
  onSelectionChange?: (rowIds: F1GridRowId[]) => void;
  onValidationErrors?: (errors: F1GridValidationError[]) => void;
  initialSelectedRowIds?: F1GridRowId[];
  rowProjection?: (rows: T[]) => F1GridRowProjection<T>;
  cellAdornment?: (row: T, column: F1GridColumn<T>) => ReactNode;
  disableSorting?: boolean;
  disableFiltering?: boolean;
  disableContextMenu?: boolean;
  selectRowOnContextMenu?: boolean;
  canExportExcel?: boolean;
  excelFileName?: string;
  allowAddRootInContextMenu?: boolean;
  allowAddRowInContextMenu?: boolean;
  allowDuplicateRowInContextMenu?: boolean;
  allowDeleteRowInContextMenu?: boolean;
  deleteMenuDisabled?: boolean;
  loading?: boolean;
  treeContextMenu?: F1GridContextMenuTreeConfig;
};

export type F1GridRef<T extends object> = {
  getSelectedRows(): T[];
  getSelectedRowIds(): F1GridRowId[];
  clearSelection(): void;
  setSelectedRowIds(rowIds: F1GridRowId[]): void;
  addRow(row?: Partial<T>): void;
  deleteSelectedRows(): void;
  restoreDeletedRows(): void;
  duplicateSelectedRows(): void;
  getRows(): T[];
  getActiveRows(): T[];
  getChanges(): F1GridChanges<T>;
  acceptSavedRows(savedRows: F1GridSavedRow<T>[]): T[];
  validate(): boolean;
  startEdit(rowId: F1GridRowId, field: keyof T): void;
  stopEdit(): void;
  setCellValue(rowId: F1GridRowId, field: keyof T, value: unknown): void;
};

export type F1TreeProps<T extends object> = Omit<
  F1GridProps<T>,
  'rowProjection' | 'cellAdornment'
> & {
  rows: T[];
  parentKey: keyof T;
  treeColumn: keyof T;
  treeCheckbox?: boolean;
  defaultExpandAll?: boolean;
  defaultExpanded?: 'all' | 'root' | F1GridRowId[];
  getRowOrder?: (row: T) => number;
  onDeleteBlocked?: (rowIds: F1GridRowId[]) => void;
  onTreeCheckboxChange?: (rowIds: F1GridRowId[]) => void;
  isDeleteDisabled?: (row: T) => boolean;
};

export type F1TreeRef<T extends object> = F1GridRef<T> & {
  addChildRow(parentId: F1GridRowId, row?: Partial<T>): void;
  expandRow(rowId: F1GridRowId): void;
  collapseRow(rowId: F1GridRowId): void;
  expandAll(): void;
  collapseAll(): void;
  isExpanded(rowId: F1GridRowId): boolean;
};

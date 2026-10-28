import {
  useCallback,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ForwardedRef,
  type ClipboardEvent,
  type KeyboardEvent,
  type MouseEvent,
  type ReactElement,
  type Ref,
} from 'react';
import { Box, Divider, Menu, MenuItem } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { AppLoadingSpinner } from '../../AppLoadingSpinner';
import { useOptionalDisplayScale } from '../../../context/AppSettingsContext';
import { GridHeader } from './GridHeader';
import { GridBody } from './GridBody';
import { F1GridFormModal } from '../form/F1GridFormModal';
import { exportGridRowsToExcel } from '../export/GridExcelExport';
import {
  addGridRow,
  areGridValuesEqual,
  acceptSavedGridRows,
  createGridData,
  duplicateGridRows,
  getGridChanges,
  getGridRowById,
  insertGridRow,
  markRowsDeleted,
  rebaseGridData,
  restoreGridRows,
  updateGridRow,
  type F1GridData,
} from '../state/GridState';
import type {
  F1GridColumn,
  F1GridDraftValue,
  F1GridEditContext,
  F1GridEditLifecycle,
  F1GridFilter,
  F1GridPinSide,
  F1GridProps,
  F1GridRef,
  F1GridRowId,
  F1GridSavedRow,
  F1GridSort,
  F1GridValidationError,
} from '../types/grid.types';
import { findNextEditableCell } from '../keyboard/GridKeyboard';
import {
  createGridCellRange,
  createGridRowSelection,
  getGridCellRangeBounds,
  isGridRowSelected,
  materializeGridRowSelection,
  selectAllGridRows,
  setGridRowSelected,
  type F1GridCellPosition,
  type F1GridCellRange,
  type F1GridRowSelection,
} from '../selection/GridSelection';
import { getGridMergeInfo } from '../merge/GridRowMerge';
import {
  getAutoFitColumnWidth,
  getGridColumnTracks,
  getGridRowId,
  getStateKey,
  isCellEditable,
  isGridCheckboxChecked,
} from '../utils/grid.utils';
import {
  coerceClipboardValue,
  parseGridTsv,
  toGridTsv,
} from '../clipboard/GridClipboard';
import {
  createGridValidationContext,
  validateGridRow,
} from '../validation/GridValidation';
import { clampGridRowHeight } from '../layout/GridRowHeight';
import {
  canHideGridColumn,
  getVisibleGridColumns,
  moveGridColumnOrder,
  parseGridColumnStorageState,
  reorderGridColumns,
} from '../columns/GridColumnManagement';
import { toggleGridSort, sortGridRows } from '../sorting/GridSort';
import { applyGridFilters } from '../filter/GridFilter';
import { normalizeDateInput } from '../editing/DateEditor';
import { normalizeF1GridInput } from '../editing/inputFormat';
import {
  getGridColumnPinOffsets,
  getGridColumnPinSide,
  getPinnedGridColumns,
} from '../columns/GridColumnPin';
import {
  createGridRafScheduler,
  DEFAULT_GRID_ROW_OVERSCAN,
  getVirtualColumnIndexes,
  getVirtualRowWindow,
  type GridViewportMetrics,
} from './GridVirtualization';
import {
  createGridQueryWorkerClient,
  type GridQueryWorkerClient,
} from '../query/GridQueryEngine';
import {
  createGridDataSourceController,
  type GridDataSourceController,
} from '../query/GridDataSource';

const GRID_ROW_FORM_ACTION_COLUMN_WIDTH = 48;
const GRID_ROW_VIRTUALIZATION_THRESHOLD = 200;
const GRID_COLUMN_VIRTUALIZATION_THRESHOLD = 12;

type F1GridRowInsertion = {
  targetRowId: F1GridRowId;
  position: 'before' | 'after';
};

type F1GridRowFormSession<T extends object> = {
  mode: 'create' | 'edit';
  row: T;
  originalRow?: T;
  insertion?: F1GridRowInsertion;
};

function F1GridInner<T extends object>(
  {
    rows: localRows = [],
    dataSource,
    onDataSourceError,
    columns,
    rowKey,
    rowFormPlugin,
    ariaLabel = 'F1-GRID',
    columnLine = true,
    stripeRows = true,
    storageKey,
    height,
    minHeight,
    maxHeight,
    rowHeight = 32,
    minRowHeight = 32,
    maxRowHeight = 300,
    resizableRows = true,
    resizableColumns = true,
    minColumnWidth = 50,
    virtualizeRows,
    virtualizeColumns,
    rowOverscan = DEFAULT_GRID_ROW_OVERSCAN,
    columnOverscan = 2,
    fixedRowHeightThreshold = 10000,
    queryWorkerThreshold = 10000,
    disableQueryWorker = false,
    showCheckbox = true,
    createRow,
    createDuplicate,
    editorPlugins,
    editors,
    onBeforeEdit,
    beforeEdit,
    onAfterEdit,
    afterEdit,
    onChangesChange,
    onSelectionChange,
    onValidationErrors,
    initialSelectedRowIds,
    rowProjection,
    cellAdornment,
    disableSorting = false,
    disableFiltering = false,
    disableContextMenu = false,
    selectRowOnContextMenu = true,
    canExportExcel = false,
    excelFileName,
    allowAddRootInContextMenu = true,
    allowAddRowInContextMenu = true,
    allowDuplicateRowInContextMenu = true,
    allowDeleteRowInContextMenu = true,
    deleteMenuDisabled = false,
    loading = false,
    treeContextMenu,
  }: F1GridProps<T>,
  ref: ForwardedRef<F1GridRef<T>>,
) {
  const [serverRows, setServerRows] = useState<T[]>([]);
  const [serverTotalRowCount, setServerTotalRowCount] = useState(0);
  const [dataSourceLoading, setDataSourceLoading] = useState(false);
  const dataSourceLoadingRef = useRef(false);
  const dataSourceRequestRef = useRef(0);
  const dataSourceControllerRef = useRef<GridDataSourceController<T>>(
    createGridDataSourceController<T>(),
  );
  const rows = dataSource ? serverRows : localRows;
  const [data, setData] = useState<F1GridData<T>>(() =>
    createGridData(rows, rowKey),
  );
  const lastRowsPropRef = useRef<T[]>(rows);
  const acceptedRowsRef = useRef<T[] | undefined>(undefined);
  const rowsHaveEquivalentValues = (left: T[], right: T[]) => {
    if (left.length !== right.length) return false;
    return left.every((row, index) => areGridValuesEqual(row, right[index]));
  };
  const onChangesChangeRef = useRef(onChangesChange);
  const onSelectionChangeRef = useRef(onSelectionChange);
  const restoredSelectionKeyRef = useRef<string | undefined>(undefined);
  const [rowSelection, setRowSelection] = useState<F1GridRowSelection>(
    createGridRowSelection,
  );
  const [lastSelectedRowId, setLastSelectedRowId] = useState<F1GridRowId>();
  const [focusedCell, setFocusedCell] = useState<F1GridCellPosition>();
  const [pendingInsertedRowId, setPendingInsertedRowId] =
    useState<F1GridRowId>();
  const [editingCell, setEditingCell] = useState<F1GridCellPosition>();
  const [cellSelection, setCellSelection] = useState<F1GridCellRange>();
  const [isCellSelectionDragging, setIsCellSelectionDragging] = useState(false);
  const [copiedCellRange, setCopiedCellRange] = useState<F1GridCellRange>();
  const [rangeOverlay, setRangeOverlay] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);
  const cellSelectionRef = useRef(cellSelection);
  const copiedCellRangeRef = useRef(copiedCellRange);
  const cellRangeDragRef = useRef<F1GridCellRange | null>(null);
  const dragSelectionStateRef = useRef<{
    active: boolean;
    previousCell: { rowId: F1GridRowId; columnIndex: number } | null;
  }>({
    active: false,
    previousCell: null,
  });
  const [draftValue, setDraftValue] = useState<F1GridDraftValue>('');
  const [cellErrors, setCellErrors] = useState<Record<string, string>>({});
  const [rowFormSession, setRowFormSession] = useState<
    F1GridRowFormSession<T> | undefined
  >();
  const [rowFormErrors, setRowFormErrors] = useState<Record<string, string>>(
    {},
  );
  const queryWorkerRef = useRef<GridQueryWorkerClient<T> | null>(null);
  const [workerQueryResult, setWorkerQueryResult] = useState<{
    source: T[];
    rows: T[];
  }>();
  const [queryLoading, setQueryLoading] = useState(false);
  const [queryWorkerFailed, setQueryWorkerFailed] = useState(false);
  const displayScale = useOptionalDisplayScale();
  const normalizedMinRowHeight = Math.max(1, minRowHeight * displayScale);
  const normalizedMaxRowHeight = Math.max(
    normalizedMinRowHeight,
    maxRowHeight * displayScale,
  );
  const defaultRowHeight = clampGridRowHeight(
    rowHeight * displayScale,
    normalizedMinRowHeight,
    normalizedMaxRowHeight,
  );
  const [rowHeights, setRowHeights] = useState<Record<string, number>>({});
  const [contextMenu, setContextMenu] = useState<
    { mouseX: number; mouseY: number; rowId?: F1GridRowId } | undefined
  >(undefined);
  const contextMenuReopenTimeoutRef = useRef<number | undefined>(undefined);
  const gridContainerRef = useRef<HTMLDivElement | null>(null);
  const headerScrollRef = useRef<HTMLDivElement | null>(null);
  const bodyScrollRef = useRef<HTMLDivElement | null>(null);
  const [gridContainerWidth, setGridContainerWidth] = useState(0);
  const gridContainerWidthRef = useRef(0);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(
    () => {
      if (storageKey) {
        const stored = parseGridColumnStorageState(
          window.localStorage.getItem(storageKey),
        );
        if (stored?.widths) return stored.widths;
      }
      return {};
    },
  );
  const [hiddenColumnFields, setHiddenColumnFields] = useState<Set<string>>(
    () => {
      if (storageKey) {
        const stored = parseGridColumnStorageState(
          window.localStorage.getItem(storageKey),
        );
        if (stored?.hidden) return new Set(stored.hidden);
      }
      return new Set(
        columns
          .filter((column) => column.hidden)
          .map((column) => String(column.field)),
      );
    },
  );
  const [sortState, setSortState] = useState<F1GridSort<T>[]>([]);
  const [filterState, setFilterState] = useState<F1GridFilter<T>[]>([]);
  const [pinnedFields, setPinnedFields] = useState<Map<string, F1GridPinSide>>(
    () => {
      if (storageKey) {
        const stored = parseGridColumnStorageState(
          window.localStorage.getItem(storageKey),
        );
        if (stored?.pinned) return new Map(Object.entries(stored.pinned));
      }
      return new Map(
        columns
          .filter((column) => column.pinned)
          .map((column) => [String(column.field), column.pinned!]),
      );
    },
  );
  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    if (storageKey) {
      const stored = parseGridColumnStorageState(
        window.localStorage.getItem(storageKey),
      );
      if (stored?.order) return stored.order;
    }
    return columns.map((column) => String(column.field));
  });
  const editingCellNodeRef = useRef<HTMLElement | null>(null);
  const cellNodeRefs = useRef(new Map<string, HTMLElement>());
  const activeEditorPlugins = useMemo(
    () =>
      (editorPlugins ?? editors ?? []).filter(
        (plugin) => plugin && (plugin.enabled ?? true),
      ),
    [editorPlugins, editors],
  );
  const rowFormActive = Boolean(
    rowFormPlugin && rowFormPlugin.enabled !== false,
  );

  function resolveEditContext(
    rowId: F1GridRowId,
    columnIndex: number,
  ): F1GridEditContext<T> | undefined {
    const column = visibleColumns[columnIndex];
    const row = getGridRowById(data, rowId);
    if (!column || !row) return undefined;

    return {
      row,
      rowId,
      column,
      field: column.field,
      value: row[column.field],
      defaultValue: String(row[column.field] ?? ''),
    };
  }

  function canStartEditor(rowId: F1GridRowId, columnIndex: number) {
    const context = resolveEditContext(rowId, columnIndex);
    if (!context) return false;
    if (!isCellEditable(context.column, context.row)) return false;

    const pluginEnabled = activeEditorPlugins.every((plugin) => {
      if (plugin.canEdit && !plugin.canEdit(context)) return false;
      return true;
    });
    if (!pluginEnabled) return false;

    const onBefore = onBeforeEdit ?? beforeEdit;
    if (onBefore) {
      const result = onBefore(context);
      if (result === false) return false;
    }

    const pluginStartResult = activeEditorPlugins.every((plugin) => {
      if (!plugin.startEdit) return true;
      const result = plugin.startEdit(context);
      return result !== false;
    });
    if (!pluginStartResult) return false;

    return true;
  }

  function finishEditLifecycle(nextContext?: F1GridEditContext<T>) {
    const context =
      nextContext ??
      (editingCell
        ? resolveEditContext(editingCell.rowId, editingCell.columnIndex)
        : undefined);
    if (!context) return;
    const hooks = [onAfterEdit ?? afterEdit].filter(Boolean) as Array<
      F1GridEditLifecycle<T>
    >;
    hooks.forEach((hook) => hook(context));
  }

  useEffect(() => {
    if (!storageKey) return;
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({
        order: columnOrder,
        widths: columnWidths,
        hidden: Array.from(hiddenColumnFields),
        pinned: Object.fromEntries(pinnedFields),
      }),
    );
  }, [columnOrder, columnWidths, hiddenColumnFields, pinnedFields, storageKey]);

  function reorderColumn(
    sourceField: string,
    targetField: string,
    position: 'before' | 'after' = 'before',
  ) {
    setColumnOrder((current) =>
      moveGridColumnOrder(current, sourceField, targetField, position),
    );
  }

  const orderedColumns = useMemo(
    () => reorderGridColumns(columns, columnOrder),
    [columnOrder, columns],
  );
  const visibleColumns = useMemo(
    () =>
      getPinnedGridColumns(
        getVisibleGridColumns(orderedColumns, hiddenColumnFields),
        pinnedFields,
      ),
    [hiddenColumnFields, orderedColumns, pinnedFields],
  );
  const { leftOffsets, rightOffsets } = useMemo(
    () =>
      getGridColumnPinOffsets(
        visibleColumns,
        pinnedFields,
        columnWidths,
        showCheckbox ? 44 : 0,
        rowFormActive ? GRID_ROW_FORM_ACTION_COLUMN_WIDTH : 0,
      ),
    [columnWidths, pinnedFields, rowFormActive, showCheckbox, visibleColumns],
  );
  const dataColumnTracks = useMemo(
    () =>
      getGridColumnTracks(
        visibleColumns,
        columnWidths,
        pinnedFields,
        gridContainerWidth,
        showCheckbox ? 44 : 0,
      ),
    [
      columnWidths,
      gridContainerWidth,
      pinnedFields,
      showCheckbox,
      visibleColumns,
    ],
  );
  const columnTracks = rowFormActive
    ? `${dataColumnTracks}${dataColumnTracks ? ' ' : ''}${GRID_ROW_FORM_ACTION_COLUMN_WIDTH}px`
    : dataColumnTracks;
  const hasRightPinnedColumns = visibleColumns.some(
    (column) => getGridColumnPinSide(pinnedFields, column) === 'right',
  );
  const formActionPinnedShadow = !hasRightPinnedColumns;

  useLayoutEffect(() => {
    const container = gridContainerRef.current;
    if (!container) return;

    const updateWidth = () => {
      const nextWidth = container.clientWidth;
      if (!Number.isFinite(nextWidth)) return;
      if (Math.abs(gridContainerWidthRef.current - nextWidth) < 1) {
        return;
      }
      gridContainerWidthRef.current = nextWidth;
      setGridContainerWidth(nextWidth);
    };

    updateWidth();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateWidth);
      return () => window.removeEventListener('resize', updateWidth);
    }

    const observer = new ResizeObserver(updateWidth);
    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, []);

  const activeRows = useMemo(
    () =>
      data.rows.filter(
        (row) =>
          data.stateById[getStateKey(getGridRowId(row, rowKey))] !== 'deleted',
      ),
    [data.rows, data.stateById, rowKey],
  );
  const projectedRows = useMemo(
    () => rowProjection?.(activeRows).rows ?? activeRows,
    [activeRows, rowProjection],
  );
  async function loadDataSourcePage(offset: number, append: boolean) {
    if (!dataSource || dataSourceLoadingRef.current) return;

    const requestId = ++dataSourceRequestRef.current;
    dataSourceLoadingRef.current = true;
    setDataSourceLoading(true);
    try {
      const result = await dataSourceControllerRef.current.load(dataSource, {
        offset,
        limit: Math.max(1, dataSource.pageSize ?? 200),
        sorts: sortState,
        filters: filterState,
      });
      if (!result || requestId !== dataSourceRequestRef.current) return;
      setServerRows((current) =>
        append ? [...current, ...result.rows] : result.rows,
      );
      setServerTotalRowCount(result.totalRowCount);
    } catch (error: unknown) {
      if (requestId === dataSourceRequestRef.current) {
        onDataSourceError?.(
          error instanceof Error ? error : new Error(String(error)),
        );
      }
    } finally {
      if (requestId === dataSourceRequestRef.current) {
        dataSourceLoadingRef.current = false;
        setDataSourceLoading(false);
      }
    }
  }

  useEffect(() => {
    if (!dataSource) return;
    dataSourceRequestRef.current += 1;
    dataSourceLoadingRef.current = false;
    setServerRows([]);
    void loadDataSourcePage(0, false);
  }, [dataSource, filterState, onDataSourceError, sortState]);

  useEffect(() => () => dataSourceControllerRef.current.dispose(), []);
  const queryWorkerEligible =
    !dataSource &&
    !disableQueryWorker &&
    !queryWorkerFailed &&
    projectedRows.length >= Math.max(1, queryWorkerThreshold) &&
    (filterState.length > 0 || sortState.length > 0) &&
    columns.every((column) => !column.getValue) &&
    typeof Worker !== 'undefined';

  useEffect(() => {
    if (!queryWorkerEligible) {
      setWorkerQueryResult(undefined);
      setQueryLoading(false);
      return;
    }

    if (!queryWorkerRef.current) {
      try {
        queryWorkerRef.current = createGridQueryWorkerClient<T>(
          new Worker(new URL('../query/GridQueryWorker.ts', import.meta.url), {
            type: 'module',
          }),
        );
      } catch {
        setQueryWorkerFailed(true);
        setQueryLoading(false);
        return;
      }
    }

    let active = true;
    setQueryLoading(true);
    void queryWorkerRef.current
      .query({
        rows: projectedRows,
        filters: filterState,
        sorts: sortState,
        columnTypes: Object.fromEntries(
          columns.map((column) => [String(column.field), column.type]),
        ),
      })
      .then((response) => {
        if (active)
          setWorkerQueryResult({ source: projectedRows, rows: response.rows });
      })
      .catch(() => {
        if (active) {
          setWorkerQueryResult(undefined);
          setQueryWorkerFailed(true);
          queryWorkerRef.current?.dispose();
          queryWorkerRef.current = null;
        }
      })
      .finally(() => {
        if (active) setQueryLoading(false);
      });

    return () => {
      active = false;
    };
  }, [columns, filterState, projectedRows, queryWorkerEligible, sortState]);

  useEffect(
    () => () => {
      queryWorkerRef.current?.dispose();
      queryWorkerRef.current = null;
    },
    [],
  );
  const filteredRows = useMemo(
    () =>
      dataSource
        ? projectedRows
        : queryWorkerEligible
          ? workerQueryResult?.source === projectedRows
            ? workerQueryResult.rows
            : projectedRows
          : disableFiltering
            ? projectedRows
            : applyGridFilters(projectedRows, filterState, columns),
    [
      columns,
      disableFiltering,
      filterState,
      projectedRows,
      queryWorkerEligible,
      dataSource,
      workerQueryResult,
    ],
  );
  const visibleRows = useMemo(
    () =>
      dataSource || queryWorkerEligible || disableSorting
        ? filteredRows
        : sortGridRows(filteredRows, sortState),
    [dataSource, disableSorting, filteredRows, queryWorkerEligible, sortState],
  );
  const rowIndexById = useMemo(
    () =>
      new Map(
        visibleRows.map((row, index) => [
          String(getGridRowId(row, rowKey)),
          index,
        ]),
      ),
    [rowKey, visibleRows],
  );
  const visibleRowIds = useMemo(
    () => visibleRows.map((row) => getGridRowId(row, rowKey)),
    [rowKey, visibleRows],
  );
  const selectedIds = useMemo(
    () => materializeGridRowSelection(rowSelection, visibleRowIds),
    [rowSelection, visibleRowIds],
  );
  const selectedCount = rowSelection.allSelected
    ? Math.max(0, visibleRows.length - rowSelection.excludedIds.size)
    : rowSelection.includedIds.size;
  const selectedCellRangeBounds = useMemo(
    () => getGridCellRangeBounds(cellSelection, rowIndexById),
    [cellSelection, rowIndexById],
  );
  const [bodyScrollMetrics, setBodyScrollMetrics] =
    useState<GridViewportMetrics>({
      scrollTop: 0,
      scrollLeft: 0,
      viewportHeight: 0,
      viewportWidth: 0,
      verticalScrollbarWidth: 0,
    });
  const viewportSchedulerRef = useRef<
    ReturnType<typeof createGridRafScheduler<GridViewportMetrics>> | undefined
  >(undefined);
  if (!viewportSchedulerRef.current) {
    viewportSchedulerRef.current = createGridRafScheduler<GridViewportMetrics>(
      (next) => {
        setBodyScrollMetrics((current) =>
          current.scrollTop === next.scrollTop &&
          current.scrollLeft === next.scrollLeft &&
          current.viewportHeight === next.viewportHeight &&
          current.viewportWidth === next.viewportWidth &&
          current.verticalScrollbarWidth === next.verticalScrollbarWidth
            ? current
            : next,
        );
      },
    );
  }

  function scheduleViewportMeasure(bodyScroll: HTMLDivElement) {
    const hasVerticalOverflow =
      bodyScroll.scrollHeight > bodyScroll.clientHeight;
    viewportSchedulerRef.current?.schedule({
      scrollTop: bodyScroll.scrollTop,
      scrollLeft: bodyScroll.scrollLeft,
      viewportHeight: bodyScroll.clientHeight,
      viewportWidth: bodyScroll.clientWidth,
      verticalScrollbarWidth: hasVerticalOverflow
        ? Math.max(0, bodyScroll.offsetWidth - bodyScroll.clientWidth)
        : 0,
    });
  }

  useEffect(() => {
    const bodyScroll = bodyScrollRef.current;
    if (!bodyScroll) return;

    const measureViewport = () => scheduleViewportMeasure(bodyScroll);

    measureViewport();
    window.addEventListener('resize', measureViewport);

    if (typeof ResizeObserver === 'undefined') {
      return () => {
        viewportSchedulerRef.current?.cancel();
        window.removeEventListener('resize', measureViewport);
      };
    }

    const observer = new ResizeObserver(measureViewport);
    observer.observe(bodyScroll);

    return () => {
      viewportSchedulerRef.current?.cancel();
      window.removeEventListener('resize', measureViewport);
      observer.disconnect();
    };
  }, []);

  const rowHeightsById = useMemo(
    () => new Map(Object.entries(rowHeights)),
    [rowHeights],
  );

  const rowVirtualState = useMemo(() => {
    if (visibleRows.length === 0) {
      return {
        visibleRows: [] as T[],
        startIndex: 0,
        topPadding: 0,
        bottomPadding: 0,
      };
    }

    const virtualizationActive =
      virtualizeRows ?? visibleRows.length >= GRID_ROW_VIRTUALIZATION_THRESHOLD;
    if (!virtualizationActive) {
      return {
        visibleRows,
        startIndex: 0,
        topPadding: 0,
        bottomPadding: 0,
      };
    }

    const viewportHeight = bodyScrollMetrics.viewportHeight || 240;
    const normalizedOverscan = Math.max(
      2,
      Math.min(
        DEFAULT_GRID_ROW_OVERSCAN,
        Math.max(0, Math.floor(rowOverscan || DEFAULT_GRID_ROW_OVERSCAN)),
      ),
    );
    const normalizedFixedThreshold = Math.max(
      1,
      Math.floor(fixedRowHeightThreshold),
    );
    const fixedHeightMode =
      visibleRows.length >= normalizedFixedThreshold ||
      Object.keys(rowHeights).length === 0;

    if (fixedHeightMode) {
      const window = getVirtualRowWindow({
        rowCount: visibleRows.length,
        rowHeight: defaultRowHeight,
        scrollTop: bodyScrollMetrics.scrollTop,
        viewportHeight,
        overscan: normalizedOverscan,
      });
      return {
        visibleRows: visibleRows.slice(window.startIndex, window.endIndex),
        startIndex: window.startIndex,
        topPadding: window.topPadding,
        bottomPadding: window.bottomPadding,
      };
    }

    const overscanPx = defaultRowHeight * normalizedOverscan;
    const cumulativeHeights = [0];
    let totalHeight = 0;

    visibleRows.forEach((row) => {
      const rowHeight =
        rowHeightsById.get(String(getGridRowId(row, rowKey))) ??
        defaultRowHeight;
      totalHeight += rowHeight;
      cumulativeHeights.push(totalHeight);
    });

    let startIndex = 0;
    while (
      startIndex < visibleRows.length &&
      cumulativeHeights[startIndex + 1] <= bodyScrollMetrics.scrollTop
    ) {
      startIndex += 1;
    }

    let endIndex = startIndex;
    const scrollLimit =
      bodyScrollMetrics.scrollTop + viewportHeight + overscanPx;
    while (
      endIndex < visibleRows.length &&
      cumulativeHeights[endIndex + 1] < scrollLimit
    ) {
      endIndex += 1;
    }

    const slicedEnd = Math.min(visibleRows.length, endIndex + 1);

    return {
      visibleRows: visibleRows.slice(startIndex, slicedEnd),
      startIndex,
      topPadding: cumulativeHeights[startIndex],
      bottomPadding: Math.max(
        0,
        totalHeight - (cumulativeHeights[slicedEnd] ?? totalHeight),
      ),
    };
  }, [
    bodyScrollMetrics.scrollTop,
    bodyScrollMetrics.viewportHeight,
    defaultRowHeight,
    fixedRowHeightThreshold,
    rowHeightsById,
    rowKey,
    rowOverscan,
    virtualizeRows,
    visibleRows,
  ]);

  useEffect(() => {
    if (pendingInsertedRowId === undefined) return;

    const rowIndex = visibleRows.findIndex(
      (row) => getGridRowId(row, rowKey) === pendingInsertedRowId,
    );
    const bodyScroll = bodyScrollRef.current;
    if (rowIndex < 0 || !bodyScroll) return;

    let rowTop = 0;
    for (let index = 0; index < rowIndex; index += 1) {
      const row = visibleRows[index];
      rowTop +=
        rowHeightsById.get(String(getGridRowId(row, rowKey))) ??
        defaultRowHeight;
    }
    const insertedRow = visibleRows[rowIndex];
    const insertedRowHeight =
      rowHeightsById.get(String(getGridRowId(insertedRow, rowKey))) ??
      defaultRowHeight;

    if (bodyScroll.clientHeight > 0) {
      const currentScrollTop = bodyScroll.scrollTop;
      let nextScrollTop = currentScrollTop;
      if (rowTop < currentScrollTop) {
        nextScrollTop = rowTop;
      } else if (
        rowTop + insertedRowHeight >
        currentScrollTop + bodyScroll.clientHeight
      ) {
        nextScrollTop =
          rowTop + insertedRowHeight - bodyScroll.clientHeight;
      }

      if (nextScrollTop !== currentScrollTop) {
        bodyScroll.scrollTop = nextScrollTop;
        scheduleViewportMeasure(bodyScroll);
        return;
      }
    }

    const firstEditableColumn = visibleColumns.findIndex(
      (column) =>
        isCellEditable(column, insertedRow) && column.type !== 'checkbox',
    );
    if (firstEditableColumn >= 0) {
      const cellNode = cellNodeRefs.current.get(
        `${String(pendingInsertedRowId)}:${firstEditableColumn}`,
      );
      if (!cellNode) return;
      cellNode.focus();
    }
    setPendingInsertedRowId(undefined);
  }, [
    bodyScrollMetrics.scrollTop,
    bodyScrollMetrics.viewportHeight,
    defaultRowHeight,
    pendingInsertedRowId,
    rowHeightsById,
    rowKey,
    visibleColumns,
    visibleRows,
  ]);

  const resolvedColumnWidths = useMemo(
    () =>
      dataColumnTracks
        .split(/\s+/)
        .filter(Boolean)
        .map((track) => Number.parseFloat(track) || 140)
        .slice(showCheckbox ? 1 : 0),
    [dataColumnTracks, showCheckbox],
  );
  const allColumnIndexes = useMemo(
    () => new Set(visibleColumns.map((_, index) => index)),
    [visibleColumns],
  );
  const previousVirtualColumnIndexesRef = useRef(new Set<number>());
  const renderedColumnIndexes = useMemo(() => {
    const viewportWidth =
      bodyScrollMetrics.viewportWidth || gridContainerWidth || 800;
    const totalWidth = resolvedColumnWidths.reduce(
      (sum, width) => sum + width,
      0,
    );
    const virtualizationActive =
      virtualizeColumns ??
      (visibleColumns.length >= GRID_COLUMN_VIRTUALIZATION_THRESHOLD &&
        totalWidth > viewportWidth);
    if (!virtualizationActive) {
      return allColumnIndexes;
    }

    const pinnedIndexes = visibleColumns
      .map((column, index) =>
        getGridColumnPinSide(pinnedFields, column) ? index : -1,
      )
      .filter((index) => index >= 0);
    const protectedIndexes = [
      focusedCell?.columnIndex,
      editingCell?.columnIndex,
      cellSelection?.anchor.columnIndex,
      cellSelection?.focus.columnIndex,
      copiedCellRange?.anchor.columnIndex,
      copiedCellRange?.focus.columnIndex,
    ].filter((index): index is number => index !== undefined);

    const nextIndexes = getVirtualColumnIndexes({
        widths: resolvedColumnWidths,
        scrollLeft: Math.max(
          0,
          bodyScrollMetrics.scrollLeft - (showCheckbox ? 44 : 0),
        ),
        viewportWidth: Math.max(
          0,
          viewportWidth -
            (showCheckbox ? 44 : 0) -
            (rowFormActive ? GRID_ROW_FORM_ACTION_COLUMN_WIDTH : 0),
        ),
        overscan: columnOverscan,
        pinnedIndexes,
        protectedIndexes,
      });
    const previous = previousVirtualColumnIndexesRef.current;
    if (previous.size === nextIndexes.length &&
      nextIndexes.every((index) => previous.has(index))) {
      return previous;
    }
    const next = new Set(nextIndexes);
    previousVirtualColumnIndexesRef.current = next;
    return next;
  }, [
    allColumnIndexes,
    bodyScrollMetrics.scrollLeft,
    bodyScrollMetrics.viewportWidth,
    cellSelection,
    columnOverscan,
    copiedCellRange,
    editingCell,
    focusedCell,
    gridContainerWidth,
    pinnedFields,
    resolvedColumnWidths,
    rowFormActive,
    showCheckbox,
    virtualizeColumns,
    visibleColumns,
  ]);

  const dirtyCellMap = useMemo(() => {
    const nextDirtyCellMap: Record<string, boolean> = {};
    rowVirtualState.visibleRows.forEach((row) => {
      const stateKey = getStateKey(getGridRowId(row, rowKey));
      const originalValues = data.originalValuesById[stateKey];
      const rowDirtyFields = data.dirtyFieldsById[stateKey] ?? {};
      visibleColumns.forEach((column) => {
        const field = String(column.field);
        const originalRow = originalValues
          ? ({ ...row, ...originalValues } as T)
          : row;
        const isDirty = column.getValue
          ? !areGridValuesEqual(
              column.getValue(row),
              column.getValue(originalRow),
            )
          : Boolean(rowDirtyFields[field]);
        nextDirtyCellMap[`${stateKey}:${field}`] = isDirty;
      });
    });
    return nextDirtyCellMap;
  }, [
    data.dirtyFieldsById,
    data.originalValuesById,
    rowKey,
    rowVirtualState.visibleRows,
    visibleColumns,
  ]);

  const editableColumnFields = useMemo(
    () =>
      new Set<string>(
        visibleColumns
          .filter((column) =>
            visibleRows.some((row) => {
              if (!isCellEditable(column, row)) {
                return false;
              }

              const context: F1GridEditContext<T> = {
                row,
                rowId: getGridRowId(row, rowKey),
                column,
                field: column.field,
                value: row[column.field],
                defaultValue: String(row[column.field] ?? ''),
              };

              return activeEditorPlugins.every((plugin) => {
                if (plugin.canEdit && !plugin.canEdit(context)) {
                  return false;
                }
                return true;
              });
            }),
          )
          .map((column) => String(column.field)),
      ),
    [activeEditorPlugins, rowKey, visibleColumns, visibleRows],
  );

  const mergeInfoByColumn = useMemo(() => {
    const nextMergeInfo: Array<
      Array<{ isStart: boolean; span: number } | undefined>
    > = [];
    visibleColumns.forEach((column, columnIndex) => {
      if (!column.mergeRows) {
        nextMergeInfo[columnIndex] = [];
        return;
      }

      const previousMergeColumnIndex = (() => {
        for (let index = columnIndex - 1; index >= 0; index -= 1) {
          if (visibleColumns[index].mergeRows) return index;
        }
        return undefined;
      })();
      const previousMergeInfo =
        previousMergeColumnIndex === undefined
          ? undefined
          : nextMergeInfo[previousMergeColumnIndex];
      let parentGroupByRow: number[] | undefined;
      if (previousMergeInfo) {
        parentGroupByRow = [];
        previousMergeInfo.forEach((info, rowIndex) => {
          parentGroupByRow![rowIndex] =
            info?.isStart === true
              ? rowIndex
              : rowIndex > 0
                ? parentGroupByRow![rowIndex - 1]
                : rowIndex;
        });
      }

      nextMergeInfo[columnIndex] = getGridMergeInfo(
        visibleRows,
        column.field,
        parentGroupByRow,
      );
    });
    return nextMergeInfo;
  }, [visibleColumns, visibleRows]);

  function toggleSortColumn(
    column: F1GridColumn<T>,
    direction: 'asc' | 'desc',
  ) {
    setSortState((current) => toggleGridSort(current, column.field, direction));
  }

  function applyColumnFilter(
    column: F1GridColumn<T>,
    filter: F1GridFilter<T> | undefined,
  ) {
    setFilterState((current) => {
      const withoutColumn = current.filter(
        (item) => item.field !== column.field,
      );
      return filter ? [...withoutColumn, filter] : withoutColumn;
    });
  }

  function pinColumn(column: F1GridColumn<T>, side: F1GridPinSide | undefined) {
    setPinnedFields((current) => {
      const next = new Map(current);
      if (side) {
        next.set(String(column.field), side);
      } else {
        next.delete(String(column.field));
      }
      return next;
    });
  }

  function handleResizeColumn(column: F1GridColumn<T>, nextWidth: number) {
    setColumnWidths((current) => ({
      ...current,
      [String(column.field)]: Math.max(minColumnWidth, nextWidth),
    }));
  }

  const getPinOffset = useCallback((
    column: F1GridColumn<T>,
  ): { side: 'left' | 'right'; offset: number; shadow?: boolean } | undefined => {
    const side = getGridColumnPinSide(pinnedFields, column);
    if (!side) return undefined;
    const offset =
      side === 'left'
        ? leftOffsets[String(column.field)]
        : rightOffsets[String(column.field)];
    if (offset === undefined) return undefined;
    const rightPinnedBoundaryOffset = Math.max(...Object.values(rightOffsets));
    return {
      side,
      offset,
      shadow: side === 'right' ? offset === rightPinnedBoundaryOffset : true,
    };
  }, [leftOffsets, pinnedFields, rightOffsets]);

  const getCellError = useCallback(
    (rowId: F1GridRowId, field: keyof T) =>
      cellErrors[getErrorKey(rowId, field)],
    [cellErrors],
  );

  useLayoutEffect(() => {
    if (rowsHaveEquivalentValues(lastRowsPropRef.current, rows)) return;
    lastRowsPropRef.current = rows;
    if (acceptedRowsRef.current && rowsHaveEquivalentValues(acceptedRowsRef.current, rows)) {
      acceptedRowsRef.current = undefined;
      return;
    }
    acceptedRowsRef.current = undefined;
    const changes = getGridChanges(data);
    if (
      changes.insertedRows.length === 0 &&
      changes.updatedRows.length === 0 &&
      changes.deletedRows.length === 0
    ) {
      setData(createGridData(rows, rowKey));
      setRowSelection(createGridRowSelection());
      setFocusedCell(undefined);
    } else if (dataSource) {
      setData((current) => rebaseGridData(current, rows, rowKey));
    }
  }, [data, dataSource, rowKey, rows]);

  useEffect(() => {
    if (!focusedCell) return;
    const cellNode = cellNodeRefs.current.get(
      `${String(focusedCell.rowId)}:${focusedCell.columnIndex}`,
    );
    if (!cellNode) return;

    if (
      editingCell?.rowId === focusedCell.rowId &&
      editingCell.columnIndex === focusedCell.columnIndex
    ) {
      (
        cellNode.querySelector('input, select, textarea') as HTMLElement | null
      )?.focus();
      return;
    }

    cellNode.focus();
  }, [editingCell, focusedCell]);

  // Read via refs so unmemoized consumer callbacks can't re-trigger these
  // effects on every render and form an update loop (data is the real trigger).
  onChangesChangeRef.current = onChangesChange;
  onSelectionChangeRef.current = onSelectionChange;

  useEffect(() => {
    onChangesChangeRef.current?.(getGridChanges(data));
  }, [data, rowKey]);

  useEffect(() => {
    onSelectionChangeRef.current?.(selectedIds);
  }, [selectedIds]);

  useEffect(() => {
    if (!initialSelectedRowIds || initialSelectedRowIds.length === 0) return;
    const selectionKey = initialSelectedRowIds.map(String).join('|');
    if (restoredSelectionKeyRef.current === selectionKey) return;
    const selectedKeys = new Set(
      initialSelectedRowIds.map((rowId) => String(rowId)),
    );
    const nextIds = visibleRowIds.filter((rowId) =>
      selectedKeys.has(String(rowId)),
    );
    if (nextIds.length === 0) return;
    setRowSelection({
      allSelected: false,
      includedIds: new Set(nextIds),
      excludedIds: new Set(),
    });
    restoredSelectionKeyRef.current = selectionKey;
  }, [initialSelectedRowIds, visibleRowIds]);

  useEffect(() => {
    cellSelectionRef.current = cellSelection;
  }, [cellSelection]);

  useEffect(() => {
    copiedCellRangeRef.current = copiedCellRange;
  }, [copiedCellRange]);

  useEffect(() => {
    if (!isCellSelectionDragging) return;

    let frameId: number | undefined;

    function handlePointerMove(event: PointerEvent) {
      const nextCell = resolvePointerCell(event.clientX, event.clientY);
      if (!nextCell) return;

      const previousCell = dragSelectionStateRef.current.previousCell;
      const isSameCell =
        previousCell?.rowId === nextCell.rowId &&
        previousCell?.columnIndex === nextCell.columnIndex;
      if (isSameCell) return;

      if (frameId !== undefined) {
        cancelAnimationFrame(frameId);
      }

      frameId = window.requestAnimationFrame(() => {
        frameId = undefined;
        dragSelectionStateRef.current = {
          ...dragSelectionStateRef.current,
          previousCell: nextCell,
        };
        updateCellSelectionRange(nextCell);
      });
    }

    function handlePointerUp() {
      finishCellSelectionRange();
    }

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      if (frameId !== undefined) {
        cancelAnimationFrame(frameId);
      }
    };
  }, [isCellSelectionDragging, visibleRows, rowKey]);

  function getCell(
    rowId: F1GridRowId,
    columnIndex: number,
  ): F1GridCellPosition {
    return { rowId, columnIndex };
  }

  function getErrorKey(rowId: F1GridRowId, field: keyof T): string {
    return `${String(rowId)}:${String(field)}`;
  }

  function updateRowHeight(rowId: F1GridRowId, nextHeight: number) {
    setRowHeights((current) => ({
      ...current,
      [String(rowId)]: clampGridRowHeight(
        nextHeight,
        normalizedMinRowHeight,
        normalizedMaxRowHeight,
      ),
    }));
  }

  function validate(): boolean {
    const nextErrors: Record<string, string> = {};
    const validationErrors: F1GridValidationError[] = [];
    const context = createGridValidationContext(activeRows, columns, rowKey);
    visibleRows.forEach((row) => {
      const rowId = getGridRowId(row, rowKey);
      Object.entries(validateGridRow(row, columns, context)).forEach(
        ([field, message]) => {
          nextErrors[`${String(rowId)}:${field}`] = message;
          validationErrors.push({ rowId, field, message });
        },
      );
    });
    setCellErrors(nextErrors);
    onValidationErrors?.(validationErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleCopy(event: ClipboardEvent<HTMLElement>) {
    const range =
      cellSelectionRef.current ??
      (focusedCell ? createGridCellRange(focusedCell) : undefined);
    if (range) {
      const startRowIndex = visibleRows.findIndex(
        (row) => getGridRowId(row, rowKey) === range.anchor.rowId,
      );
      const endRowIndex = visibleRows.findIndex(
        (row) => getGridRowId(row, rowKey) === range.focus.rowId,
      );
      const startColIndex = Math.min(
        range.anchor.columnIndex,
        range.focus.columnIndex,
      );
      const endColIndex = Math.max(
        range.anchor.columnIndex,
        range.focus.columnIndex,
      );
      const selectedRows = visibleRows.slice(
        Math.min(startRowIndex, endRowIndex),
        Math.max(startRowIndex, endRowIndex) + 1,
      );
      const selectedColumns = visibleColumns.slice(
        startColIndex,
        endColIndex + 1,
      );
      const value = selectedRows
        .map((row) =>
          selectedColumns
            .map((column) => String(row[column.field] ?? ''))
            .join('\t'),
        )
        .join('\n');
      if (value) {
        event.preventDefault();
        event.clipboardData.setData('text/plain', value);
        setCopiedCellRange(range);
        return;
      }
    }

    const selectedRows = visibleRows.filter((row) =>
      isGridRowSelected(rowSelection, getGridRowId(row, rowKey)),
    );
    const rowValue =
      selectedRows.length > 0
        ? toGridTsv(selectedRows, visibleColumns)
        : focusedCell
          ? String(
              visibleRows.find(
                (row) => getGridRowId(row, rowKey) === focusedCell.rowId,
              )?.[visibleColumns[focusedCell.columnIndex]?.field] ?? '',
            )
          : '';
    if (!rowValue) return;
    event.preventDefault();
    event.clipboardData.setData('text/plain', rowValue);
    setCopiedCellRange(
      focusedCell ? createGridCellRange(focusedCell) : copiedCellRange,
    );
  }

  function handlePaste(event: ClipboardEvent<HTMLElement>) {
    if (editingCell) return;
    if (!focusedCell) return;
    const text = event.clipboardData.getData('text/plain');
    if (!text) return;
    event.preventDefault();
    const startRowIndex = visibleRows.findIndex(
      (row) => getGridRowId(row, rowKey) === focusedCell.rowId,
    );
    if (startRowIndex < 0) return;

    setData((current) => {
      let next = current;
      const targetRows = current.rows.filter(
        (row) =>
          current.stateById[getStateKey(getGridRowId(row, rowKey))] !==
          'deleted',
      );
      parseGridTsv(text).forEach((values, valueRowIndex) => {
        let targetRow = targetRows[startRowIndex + valueRowIndex];
        if (!targetRow && createRow) {
          targetRow = createRow();
          next = addGridRow(next, targetRow, rowKey);
          targetRows.push(targetRow);
        }
        if (!targetRow) return;
        const changes: Partial<T> = {};
        values.forEach((rawValue, valueColumnIndex) => {
          const column =
            visibleColumns[focusedCell.columnIndex + valueColumnIndex];
          if (!column || !isCellEditable(column, targetRow)) return;
          const normalizedValue = normalizeF1GridInput(
            rawValue,
            column.inputFormat,
            column.sanitizeInput,
          );
          const value = coerceClipboardValue(normalizedValue, column);
          if (value !== undefined) {
            (changes as Record<keyof T, unknown>)[column.field] = value;
          }
        });
        if (Object.keys(changes).length > 0) {
          next = updateGridRow(
            next,
            rowKey,
            getGridRowId(targetRow, rowKey),
            changes,
          );
        }
      });
      return next;
    });
  }

  function selectRow(rowId: F1GridRowId, event?: MouseEvent<HTMLElement>) {
    if (event?.button === 2 && !selectRowOnContextMenu) return;

    const rowIndex = visibleRows.findIndex(
      (row) => getGridRowId(row, rowKey) === rowId,
    );

    if (event?.shiftKey && lastSelectedRowId !== undefined) {
      const lastIndex = visibleRows.findIndex(
        (row) => getGridRowId(row, rowKey) === lastSelectedRowId,
      );
      const range = visibleRows
        .slice(Math.min(rowIndex, lastIndex), Math.max(rowIndex, lastIndex) + 1)
        .map((row) => getGridRowId(row, rowKey));
      setRowSelection({
        allSelected: false,
        includedIds: new Set(range),
        excludedIds: new Set(),
      });
    } else if (event?.ctrlKey || event?.metaKey) {
      setRowSelection((current) =>
        setGridRowSelected(current, rowId, !isGridRowSelected(current, rowId)),
      );
    } else {
      setRowSelection({
        allSelected: false,
        includedIds: new Set([rowId]),
        excludedIds: new Set(),
      });
    }

    setLastSelectedRowId(rowId);
  }

  function setSingleRowSelection(rowId: F1GridRowId, checked: boolean) {
    setRowSelection((current) => setGridRowSelected(current, rowId, checked));
    setLastSelectedRowId(rowId);
  }

  function startEdit(rowId: F1GridRowId, columnIndex: number) {
    const column = visibleColumns[columnIndex];
    const row = getGridRowById(data, rowId);
    const context =
      column && row ? resolveEditContext(rowId, columnIndex) : undefined;

    if (
      !column ||
      !row ||
      !isCellEditable(column, row) ||
      column.type === 'checkbox' ||
      !context ||
      !canStartEditor(rowId, columnIndex)
    )
      return;

    const pluginStartResult = activeEditorPlugins.every((plugin) => {
      if (!plugin.startEdit) return true;
      const result = plugin.startEdit(context);
      return result !== false;
    });
    if (!pluginStartResult) return;

    setFocusedCell(getCell(rowId, columnIndex));
    setEditingCell(getCell(rowId, columnIndex));
    setDraftValue(
      column.type === 'user'
        ? ((row[column.field] as F1GridDraftValue | undefined) ??
            (column.form?.multiple ? [] : null))
        : String(row[column.field] ?? ''),
    );
    finishEditLifecycle(context);
  }

  function stopEdit() {
    if (editingCell) {
      const context = resolveEditContext(
        editingCell.rowId,
        editingCell.columnIndex,
      );
      if (context) {
        activeEditorPlugins.forEach((plugin) => {
          if (plugin.endEdit) plugin.endEdit(context);
        });
      }
    }
    setEditingCell(undefined);
    setDraftValue('');
  }

  function commitEdit(nextCell?: F1GridCellPosition) {
    if (!editingCell) return;

    const column = visibleColumns[editingCell.columnIndex];
    const row = getGridRowById(data, editingCell.rowId);
    const draftText = String(draftValue ?? '');
    const matchedAutocompleteOption =
      column.type === 'autocomplete'
        ? column.options?.find(
            (option) =>
              option.label === draftText || String(option.value) === draftText,
          )
        : undefined;
    const matchedSelectOption =
      column.type === 'select'
        ? column.options?.find((option) => String(option.value) === draftText)
        : undefined;
    const restoreUserValue = (selected: string | number) =>
      column.type === 'user'
        ? (column.userOptions?.find(
            (option) => String(option.value) === String(selected),
          )?.value ?? selected)
        : selected;
    const value =
      column.type === 'user'
        ? Array.isArray(draftValue)
          ? draftValue.map(restoreUserValue)
          : draftValue == null || draftValue === ''
            ? null
            : restoreUserValue(draftValue)
        : column.type === 'number' ||
            column.type === 'decimal' ||
            column.type === 'currency'
          ? Number(draftText)
          : column.type === 'date'
            ? normalizeDateInput(draftText) || draftText
            : (matchedAutocompleteOption?.value ??
              matchedSelectOption?.value ??
              (column.type === 'select' &&
              row &&
              String(row[column.field] ?? '') === draftText
                ? row[column.field]
                : draftText));

    if (
      column &&
      row &&
      ((column.type !== 'number' &&
        column.type !== 'decimal' &&
        column.type !== 'currency') ||
        !Number.isNaN(value))
    ) {
      const changes = column.onValueChange?.(row, value) ?? {
        [column.field]: value,
      };
      const hasChanges = Object.entries(changes).some(
        ([field, nextValue]) =>
          !areGridValuesEqual(row[field as keyof T], nextValue),
      );
      if (hasChanges) {
        setData((current) =>
          updateGridRow(
            current,
            rowKey,
            editingCell.rowId,
            changes as Partial<T>,
          ),
        );
      }
    }

    stopEdit();
    if (nextCell) setFocusedCell(nextCell);
  }

  function getColumnCheckboxState(column: F1GridColumn<T>) {
    const editableRows = visibleRows.filter((row) =>
      isCellEditable(column, row),
    );
    const checkedCount = editableRows.filter((row) =>
      isGridCheckboxChecked(column.getValue?.(row) ?? row[column.field]),
    ).length;

    return {
      allChecked:
        editableRows.length > 0 && checkedCount === editableRows.length,
      indeterminate: checkedCount > 0 && checkedCount < editableRows.length,
      hasEditableRows: editableRows.length > 0,
    };
  }

  function toggleColumnCheckbox(column: F1GridColumn<T>, nextValue: boolean) {
    setData((current) => {
      let next = current;
      visibleRows.forEach((row) => {
        if (!isCellEditable(column, row)) return;
        const patch = column.onValueChange?.(row, nextValue);
        next = updateGridRow(next, rowKey, getGridRowId(row, rowKey), {
          ...(patch ?? { [column.field]: nextValue }),
        } as Partial<T>);
      });
      return next;
    });
  }

  function toggleColumnVisibility(column: F1GridColumn<T>, visible: boolean) {
    setHiddenColumnFields((current) => {
      const next = new Set(current);
      if (visible) {
        next.delete(String(column.field));
      } else if (canHideGridColumn(visibleColumns, column)) {
        next.add(String(column.field));
      }
      return next;
    });
  }

  const commitEditRef = useRef(commitEdit);
  useEffect(() => {
    commitEditRef.current = commitEdit;
  });

  useEffect(() => {
    if (!editingCell) return;

    function handleOutsideMouseDown(event: globalThis.MouseEvent) {
      const node = editingCellNodeRef.current;
      if (node && event.target instanceof Node && node.contains(event.target))
        return;
      const grid = node?.closest('[role="grid"]');
      const targetNode = event.target instanceof Node ? event.target : null;
      const clickedEditorPopup =
        targetNode !== null &&
        Array.from(
          document.querySelectorAll(
            '.MuiPopover-root, .MuiMenu-paper, .MuiModal-root, .MuiAutocomplete-popper',
          ),
        ).some(
          (popup) =>
            popup.contains(targetNode) && !popup.contains(grid ?? null),
        );
      if (clickedEditorPopup) {
        return;
      }
      commitEditRef.current();
    }

    document.addEventListener('mousedown', handleOutsideMouseDown, true);
    return () => {
      document.removeEventListener('mousedown', handleOutsideMouseDown, true);
    };
  }, [editingCell]);

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (!focusedCell) return;
    const currentFocusedRowIndex =
      rowIndexById.get(String(focusedCell.rowId)) ?? -1;

    if (currentFocusedRowIndex < 0) return;

    if (event.key === 'Insert') {
      event.preventDefault();
      handleAddRow();
      return;
    }

    if (event.ctrlKey && event.key.toLowerCase() === 'd') {
      event.preventDefault();
      handleDuplicateSelectedRows();
      return;
    }

    if (event.key === 'Delete') {
      event.preventDefault();
      if (selectedCount > 0) {
        handleDeleteSelectedRows();
      } else {
        const row = visibleRows[currentFocusedRowIndex];
        const column = visibleColumns[focusedCell.columnIndex];
        if (row && column && isCellEditable(column, row)) {
          setData((current) =>
            updateGridRow(current, rowKey, focusedCell.rowId, {
              [column.field]: '',
            } as Partial<T>),
          );
        }
      }
      return;
    }

    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      const direction = event.key === 'Home' ? 1 : -1;
      const indexes = visibleColumns.map((_, index) => index);
      if (direction === -1) indexes.reverse();
      const columnIndex = indexes.find((index) =>
        isCellEditable(
          visibleColumns[index],
          visibleRows[currentFocusedRowIndex],
        ),
      );
      if (columnIndex !== undefined) {
        setFocusedCell(getCell(focusedCell.rowId, columnIndex));
      }
      return;
    }

    if (event.key === 'Enter' || event.key === 'F2') {
      event.preventDefault();
      if (editingCell) {
        commitEdit();
      } else {
        startEdit(focusedCell.rowId, focusedCell.columnIndex);
      }
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      setCopiedCellRange(undefined);
      copiedCellRangeRef.current = undefined;
      setCellSelection(undefined);
      cellSelectionRef.current = undefined;
      if (editingCell) {
        stopEdit();
      }
      return;
    }

    if (event.key === 'Tab') {
      event.preventDefault();
      const direction = event.shiftKey ? -1 : 1;
      const nextCellPos = findNextEditableCell(
        {
          rowIndex: currentFocusedRowIndex,
          columnIndex: focusedCell.columnIndex,
        },
        visibleRows.length,
        visibleColumns.length,
        direction,
        (rowIndex, columnIndex) => {
          const row = visibleRows[rowIndex];
          const column = visibleColumns[columnIndex];
          return Boolean(
            row &&
            column &&
            isCellEditable(column, row) &&
            column.type !== 'checkbox',
          );
        },
      );

      if (!nextCellPos) return;

      const nextRow = visibleRows[nextCellPos.rowIndex];
      if (!nextRow) return;

      const nextCell = getCell(
        getGridRowId(nextRow, rowKey),
        nextCellPos.columnIndex,
      );
      if (editingCell) {
        commitEdit(nextCell);
      } else {
        setFocusedCell(nextCell);
      }
      return;
    }

    if (
      editingCell &&
      ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)
    ) {
      return;
    }

    let nextRowIndex = currentFocusedRowIndex;
    let nextColIndex = focusedCell.columnIndex;

    if (event.key === 'ArrowUp') nextRowIndex = Math.max(0, nextRowIndex - 1);
    if (event.key === 'ArrowDown')
      nextRowIndex = Math.min(visibleRows.length - 1, nextRowIndex + 1);
    if (event.key === 'ArrowLeft') nextColIndex = Math.max(0, nextColIndex - 1);
    if (event.key === 'ArrowRight')
      nextColIndex = Math.min(visibleColumns.length - 1, nextColIndex + 1);

    if (
      nextRowIndex !== currentFocusedRowIndex ||
      nextColIndex !== focusedCell.columnIndex
    ) {
      event.preventDefault();
      const nextRow = visibleRows[nextRowIndex];
      if (!nextRow) return;
      const nextCell = getCell(getGridRowId(nextRow, rowKey), nextColIndex);
      setFocusedCell(nextCell);
    }
  }

  function focusNewRow(row: T) {
    const rowId = getGridRowId(row, rowKey);
    const firstEditableCol = visibleColumns.findIndex(
      (column) => isCellEditable(column, row) && column.type !== 'checkbox',
    );
    if (firstEditableCol >= 0) {
      setFocusedCell(getCell(rowId, firstEditableCol));
    }
  }

  function handleAddRow(
    row?: Partial<T>,
    insertion?: F1GridRowInsertion,
  ) {
    if (!createRow && !row) return;

    const baseRow = createRow ? createRow() : ({} as T);
    const newRow = { ...baseRow, ...row } as T;
    if (
      insertion &&
      !data.rowIndexById.has(String(insertion.targetRowId))
    ) {
      return;
    }
    if (rowFormActive) {
      const newRowId = newRow[rowKey];
      if (typeof newRowId !== 'string' && typeof newRowId !== 'number') return;
      setRowFormErrors({});
      setRowFormSession({
        mode: 'create',
        row: { ...newRow },
        insertion,
      });
      return;
    }
    const newRowId = getGridRowId(newRow, rowKey);

    setData((current) => {
      if (!insertion) return addGridRow(current, newRow, rowKey);
      const targetIndex = current.rowIndexById.get(
        String(insertion.targetRowId),
      );
      if (targetIndex === undefined) return current;
      return insertGridRow(
        current,
        newRow,
        rowKey,
        targetIndex + (insertion.position === 'after' ? 1 : 0),
      );
    });
    setRowSelection({
      allSelected: false,
      includedIds: new Set([newRowId]),
      excludedIds: new Set(),
    });

    focusNewRow(newRow);
    if (insertion) setPendingInsertedRowId(newRowId);
  }

  function openEditRowForm(row: T) {
    setRowFormErrors({});
    setRowFormSession({
      mode: 'edit',
      row: { ...row },
      originalRow: { ...row },
    });
  }

  function closeRowForm() {
    setRowFormSession(undefined);
    setRowFormErrors({});
  }

  function applyRowForm(draftRow: T) {
    if (!rowFormSession) return;

    if (rowFormSession.mode === 'create') {
      const draftRowId = getGridRowId(draftRow, rowKey);
      const duplicate = data.rows.some(
        (row) => getGridRowId(row, rowKey) === draftRowId,
      );
      if (duplicate) {
        setRowFormErrors({
          [String(rowKey)]: '이미 존재하는 행 ID입니다.',
        });
        return;
      }

      const insertion = rowFormSession.insertion;
      const targetIndex = insertion
        ? data.rowIndexById.get(String(insertion.targetRowId))
        : undefined;
      if (insertion && targetIndex === undefined) {
        setRowFormErrors({
          [String(rowKey)]: '삽입 기준 행을 찾을 수 없습니다.',
        });
        return;
      }

      setData((current) => {
        if (!insertion) return addGridRow(current, draftRow, rowKey);
        const currentTargetIndex = current.rowIndexById.get(
          String(insertion.targetRowId),
        );
        if (currentTargetIndex === undefined) return current;
        return insertGridRow(
          current,
          draftRow,
          rowKey,
          currentTargetIndex + (insertion.position === 'after' ? 1 : 0),
        );
      });
      setRowSelection({
        allSelected: false,
        includedIds: new Set([draftRowId]),
        excludedIds: new Set(),
      });
      if (insertion) {
        focusNewRow(draftRow);
        setPendingInsertedRowId(draftRowId);
      }
      closeRowForm();
      return;
    }

    const originalRow = rowFormSession.originalRow;
    if (!originalRow) return;
    const patch = Object.fromEntries(
      Object.keys(draftRow)
        .filter(
          (field) =>
            !areGridValuesEqual(
              originalRow[field as keyof T],
              draftRow[field as keyof T],
            ),
        )
        .map((field) => [field, draftRow[field as keyof T]]),
    ) as Partial<T>;

    if (Object.keys(patch).length > 0) {
      const rowId = getGridRowId(originalRow, rowKey);
      setData((current) => updateGridRow(current, rowKey, rowId, patch));
    }
    closeRowForm();
  }

  function resolvePointerCell(
    clientX: number,
    clientY: number,
  ): F1GridCellPosition | undefined {
    if (!gridContainerRef.current) return undefined;

    const hitTargets =
      typeof document !== 'undefined' &&
      typeof document.elementsFromPoint === 'function'
        ? document.elementsFromPoint(clientX, clientY)
        : [];

    const candidate =
      hitTargets.length > 0
        ? hitTargets.find((element): element is HTMLElement => {
            if (!(element instanceof HTMLElement)) return false;
            const gridCell = element.closest('[role="gridcell"]');
            return !!gridCell && gridContainerRef.current!.contains(gridCell);
          })
        : typeof document !== 'undefined' &&
            typeof document.elementFromPoint === 'function'
          ? (document.elementFromPoint(clientX, clientY) as HTMLElement | null)
          : null;

    if (candidate) {
      const gridCell = candidate.closest(
        '[role="gridcell"]',
      ) as HTMLElement | null;
      if (gridCell && gridContainerRef.current.contains(gridCell)) {
        const rowNode = gridCell.closest(
          '[data-f1-grid-row-id]',
        ) as HTMLElement | null;
        const rowIdAttr = rowNode?.getAttribute('data-f1-grid-row-id');
        if (rowIdAttr && rowNode) {
          const targetRow = visibleRows.find(
            (row) => String(getGridRowId(row, rowKey)) === rowIdAttr,
          );
          if (targetRow) {
            const rowCellNodes = rowNode.querySelectorAll('[role="gridcell"]');
            const columnIndex = Array.from(rowCellNodes).indexOf(gridCell);
            if (columnIndex >= 0) {
              return {
                rowId: getGridRowId(targetRow, rowKey),
                columnIndex,
              };
            }
          }
        }
      }
    }

    let nearestCell:
      | {
          rowId: F1GridRowId;
          columnIndex: number;
          distance: number;
          inside: boolean;
        }
      | undefined;

    for (const [key, node] of cellNodeRefs.current.entries()) {
      if (
        !gridContainerRef.current ||
        !gridContainerRef.current.contains(node)
      ) {
        continue;
      }

      const rect = node.getBoundingClientRect();
      const insideCell =
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom;
      const nearestX = Math.min(Math.max(clientX, rect.left), rect.right);
      const nearestY = Math.min(Math.max(clientY, rect.top), rect.bottom);
      const distance = (clientX - nearestX) ** 2 + (clientY - nearestY) ** 2;
      const [rowIdText, columnIndexText] = key.split(':');
      const columnIndex = Number.parseInt(columnIndexText, 10);
      const targetRow = visibleRows.find(
        (row) => String(getGridRowId(row, rowKey)) === rowIdText,
      );
      if (!targetRow || Number.isNaN(columnIndex)) continue;

      const nextCell = {
        rowId: getGridRowId(targetRow, rowKey),
        columnIndex,
        distance,
        inside: insideCell,
      };

      if (
        !nearestCell ||
        (insideCell && !nearestCell.inside) ||
        (insideCell === nearestCell.inside && distance < nearestCell.distance)
      ) {
        nearestCell = nextCell;
      }
    }

    const previousDragCell = dragSelectionStateRef.current.previousCell;
    if (
      previousDragCell &&
      nearestCell &&
      nearestCell.rowId === previousDragCell.rowId &&
      nearestCell.columnIndex === previousDragCell.columnIndex
    ) {
      const previousNode = cellNodeRefs.current.get(
        `${String(previousDragCell.rowId)}:${previousDragCell.columnIndex}`,
      );
      if (previousNode) {
        const previousRect = previousNode.getBoundingClientRect();
        const boundaryPadding = 8;
        const pointerWithinPreviousWidth =
          clientX >= previousRect.left && clientX <= previousRect.right;
        const pointerWithinPreviousHeight =
          clientY >= previousRect.top && clientY <= previousRect.bottom;

        const isNearBottomBoundary =
          Math.abs(clientY - previousRect.bottom) <= boundaryPadding &&
          pointerWithinPreviousWidth;
        const isNearRightBoundary =
          Math.abs(clientX - previousRect.right) <= boundaryPadding &&
          pointerWithinPreviousHeight;

        if (isNearBottomBoundary || isNearRightBoundary) {
          const previousRowIndex = visibleRows.findIndex(
            (row) => getGridRowId(row, rowKey) === previousDragCell.rowId,
          );

          if (previousRowIndex >= 0) {
            const rowBelow = visibleRows[previousRowIndex + 1];
            if (rowBelow && isNearBottomBoundary) {
              return {
                rowId: getGridRowId(rowBelow, rowKey),
                columnIndex: previousDragCell.columnIndex,
              };
            }
          }

          if (previousDragCell.columnIndex + 1 < visibleColumns.length) {
            if (isNearRightBoundary) {
              return {
                rowId: previousDragCell.rowId,
                columnIndex: previousDragCell.columnIndex + 1,
              };
            }
          }
        }
      }
    }

    return nearestCell
      ? {
          rowId: nearestCell.rowId,
          columnIndex: nearestCell.columnIndex,
        }
      : undefined;
  }

  function setCellSelectionRange(
    anchor: F1GridCellPosition,
    focus: F1GridCellPosition,
  ) {
    const next = createGridCellRange(anchor, focus);
    const current = cellSelectionRef.current;
    const isSameSelection =
      current &&
      current.anchor.rowId === next.anchor.rowId &&
      current.anchor.columnIndex === next.anchor.columnIndex &&
      current.focus.rowId === next.focus.rowId &&
      current.focus.columnIndex === next.focus.columnIndex;

    if (isSameSelection) return;

    setCellSelection(next);
    cellSelectionRef.current = next;
    setCopiedCellRange(undefined);
    copiedCellRangeRef.current = undefined;
  }

  function updateCellSelectionRange(cell: F1GridCellPosition) {
    if (!cellRangeDragRef.current) return;
    const next = createGridCellRange(cellRangeDragRef.current.anchor, cell);
    const current = cellSelectionRef.current;
    const isSameSelection =
      current &&
      current.anchor.rowId === next.anchor.rowId &&
      current.anchor.columnIndex === next.anchor.columnIndex &&
      current.focus.rowId === next.focus.rowId &&
      current.focus.columnIndex === next.focus.columnIndex;

    if (isSameSelection) return;

    cellRangeDragRef.current.focus = cell;
    setCellSelection(next);
  }

  function finishCellSelectionRange() {
    cellRangeDragRef.current = null;
    dragSelectionStateRef.current = {
      active: false,
      previousCell: null,
    };
    setIsCellSelectionDragging(false);
  }

  function handleDeleteSelectedRows() {
    if (selectedCount === 0) return;
    setData((current) => markRowsDeleted(current, rowKey, selectedIds));
    setRowSelection(createGridRowSelection());
    setFocusedCell(undefined);
    setEditingCell(undefined);
  }

  function handleRestoreDeletedRows() {
    setData((current) => restoreGridRows(current));
  }

  function handleDuplicateSelectedRows() {
    if (selectedCount === 0 || !createDuplicate) return;
    setData((current) =>
      duplicateGridRows(current, rowKey, selectedIds, createDuplicate),
    );
  }

  function openContextMenu(event: MouseEvent<HTMLElement>) {
    event.preventDefault();

    const target = event.target instanceof HTMLElement ? event.target : null;
    const directTargetIsCell =
      !!target &&
      (!!target.closest('[role="gridcell"]') ||
        !!target.closest('[data-f1-grid-row-id]'));
    const pointerTarget =
      typeof document !== 'undefined' &&
      typeof document.elementsFromPoint === 'function'
        ? Array.from(
            document.elementsFromPoint(event.clientX, event.clientY),
          ).find((element): element is HTMLElement => {
            if (!(element instanceof HTMLElement)) return false;
            const cellOrRow =
              element.closest('[role="gridcell"]') ??
              element.closest('[data-f1-grid-row-id]');
            if (!cellOrRow || !gridContainerRef.current) return false;
            return gridContainerRef.current.contains(cellOrRow);
          })
        : typeof document !== 'undefined' &&
            typeof document.elementFromPoint === 'function'
          ? (document.elementFromPoint(
              event.clientX,
              event.clientY,
            ) as HTMLElement | null)
          : null;
    const resolvedTarget = directTargetIsCell
      ? target
      : (pointerTarget ?? target);
    const containerRect = gridContainerRef.current?.getBoundingClientRect();
    const isInsideGrid =
      Boolean(
        gridContainerRef.current &&
        resolvedTarget &&
        gridContainerRef.current.contains(resolvedTarget),
      ) ||
      Boolean(
        target &&
        gridContainerRef.current &&
        gridContainerRef.current.contains(target),
      ) ||
      (containerRect
        ? event.clientX >= containerRect.left &&
          event.clientX <= containerRect.right &&
          event.clientY >= containerRect.top &&
          event.clientY <= containerRect.bottom
        : true);

    if (!isInsideGrid) {
      closeContextMenu();
      return;
    }

    if (resolvedTarget?.closest('[role="columnheader"]')) {
      closeContextMenu();
      return;
    }
    const cellNode =
      (resolvedTarget?.closest('[role="gridcell"]') as HTMLElement | null) ??
      null;
    const rowNode =
      (resolvedTarget?.closest(
        '[data-f1-grid-row-id]',
      ) as HTMLElement | null) ??
      cellNode?.closest('[data-f1-grid-row-id]') ??
      null;
    const rowIdAttr = rowNode?.getAttribute('data-f1-grid-row-id');
    const targetRow =
      rowIdAttr !== undefined && rowIdAttr !== null
        ? visibleRows.find(
            (row) => String(getGridRowId(row, rowKey)) === rowIdAttr,
          )
        : undefined;
    const targetRowId = targetRow ? getGridRowId(targetRow, rowKey) : undefined;
    const clickedCellIndex =
      cellNode && rowNode
        ? Array.from(rowNode.querySelectorAll('[role="gridcell"]')).indexOf(
            cellNode,
          )
        : undefined;
    const clickedCell =
      targetRowId !== undefined && clickedCellIndex !== undefined
        ? {
            rowId: targetRowId,
            columnIndex: clickedCellIndex,
          }
        : undefined;

    const nextContextMenu = {
      mouseX: event.clientX,
      mouseY: event.clientY,
      rowId: targetRowId,
    };

    const applySelection = () => {
      if (selectRowOnContextMenu && targetRowId !== undefined) {
        setRowSelection({
          allSelected: false,
          includedIds: new Set([targetRowId]),
          excludedIds: new Set(),
        });
      }
      if (clickedCell) {
        setFocusedCell(clickedCell);
        setCellSelectionRange(clickedCell, clickedCell);
        if (selectRowOnContextMenu) {
          setRowSelection(
            targetRowId !== undefined
              ? {
                  allSelected: false,
                  includedIds: new Set([targetRowId]),
                  excludedIds: new Set(),
                }
              : createGridRowSelection(),
          );
        }
      }
    };

    if (contextMenuReopenTimeoutRef.current !== undefined) {
      window.clearTimeout(contextMenuReopenTimeoutRef.current);
      contextMenuReopenTimeoutRef.current = undefined;
    }

    if (disableContextMenu) {
      applySelection();
      closeContextMenu();
      return;
    }

    if (contextMenu) {
      setContextMenu(undefined);
      applySelection();
      contextMenuReopenTimeoutRef.current = window.setTimeout(() => {
        setContextMenu(nextContextMenu);
        contextMenuReopenTimeoutRef.current = undefined;
      }, 0);
      return;
    }

    applySelection();
    setContextMenu(nextContextMenu);
  }

  function closeContextMenu() {
    if (contextMenuReopenTimeoutRef.current !== undefined) {
      window.clearTimeout(contextMenuReopenTimeoutRef.current);
      contextMenuReopenTimeoutRef.current = undefined;
    }
    setContextMenu(undefined);
  }

  useEffect(() => {
    if (disableContextMenu) {
      closeContextMenu();
    }
  }, [disableContextMenu]);

  useEffect(() => {
    if (!contextMenu) return;

    function handleDocumentPointerDown(event: globalThis.MouseEvent) {
      if (event.button === 2) return;

      const target = event.target as Node | null;
      if (!target) return;

      const menuNode = document.querySelector('[role="menu"]');
      if (menuNode?.contains(target)) {
        return;
      }

      closeContextMenu();
    }

    document.addEventListener('mousedown', handleDocumentPointerDown);
    return () => {
      document.removeEventListener('mousedown', handleDocumentPointerDown);
    };
  }, [contextMenu]);

  async function handleExportExcelClick() {
    closeContextMenu();
    const fileName = excelFileName ?? `${ariaLabel}-export`;
    await exportGridRowsToExcel(visibleColumns, visibleRows, fileName);
  }

  function handleAutoFitColumnsClick() {
    closeContextMenu();
    setColumnWidths((current) => {
      const next = { ...current };
      visibleColumns.forEach((column) => {
        next[String(column.field)] = getAutoFitColumnWidth(
          column,
          visibleRows,
          {
            minWidth: minColumnWidth,
          },
        );
      });
      return next;
    });
  }

  function handleAddRootClick() {
    closeContextMenu();
    treeContextMenu?.onAddRoot();
  }

  function handleAddRowContextClick() {
    const targetRowId = contextMenu?.rowId;
    closeContextMenu();
    if (treeContextMenu) {
      treeContextMenu.onAddChild(targetRowId);
    } else {
      handleAddRow();
    }
  }

  function handleInsertRowContextClick(position: 'before' | 'after') {
    const targetRowId = contextMenu?.rowId;
    closeContextMenu();
    if (targetRowId === undefined) return;
    handleAddRow(undefined, { targetRowId, position });
  }

  function handleDuplicateContextClick() {
    closeContextMenu();
    handleDuplicateSelectedRows();
  }

  function handleDeleteContextClick() {
    closeContextMenu();
    handleDeleteSelectedRows();
  }

  function handleClearFiltersClick() {
    closeContextMenu();
    setFilterState([]);
  }

  function handleClearSortClick() {
    closeContextMenu();
    setSortState([]);
  }

  function handleResetColumnSettingsClick() {
    closeContextMenu();
    setColumnOrder(columns.map((column) => String(column.field)));
    setColumnWidths({});
    setHiddenColumnFields(
      new Set(
        columns
          .filter((column) => column.hidden)
          .map((column) => String(column.field)),
      ),
    );
    setPinnedFields(
      new Map(
        columns
          .filter((column) => column.pinned)
          .map((column) => [String(column.field), column.pinned!]),
      ),
    );
    if (storageKey) {
      window.localStorage.removeItem(storageKey);
    }
  }

  useImperativeHandle(ref, () => ({
    getSelectedRows() {
      const selectedSet = new Set(selectedIds);
      return visibleRows.filter((row) =>
        selectedSet.has(getGridRowId(row, rowKey)),
      );
    },
    getSelectedRowIds() {
      return selectedIds;
    },
    clearSelection() {
      setRowSelection(createGridRowSelection());
    },
    setSelectedRowIds(rowIds) {
      const selectedKeys = new Set(rowIds.map((rowId) => String(rowId)));
      setRowSelection({
        allSelected: false,
        includedIds: new Set(
          visibleRowIds.filter((rowId) => selectedKeys.has(String(rowId))),
        ),
        excludedIds: new Set(),
      });
    },
    addRow(row?: Partial<T>) {
      handleAddRow(row);
    },
    deleteSelectedRows() {
      handleDeleteSelectedRows();
    },
    restoreDeletedRows() {
      handleRestoreDeletedRows();
    },
    duplicateSelectedRows() {
      handleDuplicateSelectedRows();
    },
    getRows() {
      return visibleRows;
    },
    getActiveRows() {
      return activeRows;
    },
    getChanges() {
      return getGridChanges(data);
    },
    acceptSavedRows(savedRows: F1GridSavedRow<T>[]) {
      if (editingCell || rowFormSession) throw new Error('편집을 완료한 뒤 저장 결과를 반영해 주세요.');
      if (!savedRows.length) return data.rows;
      const next = acceptSavedGridRows(data, rowKey, savedRows);
      const mappings = new Map(savedRows.map(({ previousRowId, row }) =>
        [String(previousRowId), getGridRowId(row, rowKey)]));
      const remap = (id: F1GridRowId) => mappings.get(String(id)) ?? id;
      const remapCell = (cell: F1GridCellPosition | undefined) =>
        cell ? { ...cell, rowId: remap(cell.rowId) } : undefined;
      const remapRange = (range: F1GridCellRange | undefined) => range ? {
        anchor: { ...range.anchor, rowId: remap(range.anchor.rowId) },
        focus: { ...range.focus, rowId: remap(range.focus.rowId) },
      } : undefined;
      acceptedRowsRef.current = next.rows;
      setData(next);
      setRowSelection((current) => ({
        ...current,
        includedIds: new Set([...current.includedIds].map(remap)),
        excludedIds: new Set([...current.excludedIds].map(remap)),
      }));
      setLastSelectedRowId((id) => id === undefined ? id : remap(id));
      setPendingInsertedRowId((id) => id === undefined ? id : remap(id));
      setFocusedCell(remapCell);
      setCellSelection(remapRange);
      setCopiedCellRange(remapRange);
      cellSelectionRef.current = remapRange(cellSelectionRef.current);
      copiedCellRangeRef.current = remapRange(copiedCellRangeRef.current);
      cellRangeDragRef.current = cellRangeDragRef.current
        ? remapRange(cellRangeDragRef.current) ?? null : null;
      const previousCell = dragSelectionStateRef.current.previousCell;
      if (previousCell) dragSelectionStateRef.current.previousCell = remapCell(previousCell) ?? null;
      setRowHeights((current) => Object.fromEntries(
        Object.entries(current).map(([id, height]) => [String(remap(id)), height]),
      ));
      setCellErrors((current) => {
        const nextErrors = { ...current };
        savedRows.forEach(({ previousRowId }) => {
          columns.forEach((column) => { delete nextErrors[getErrorKey(previousRowId, column.field)]; });
        });
        return nextErrors;
      });
      return next.rows;
    },
    validate,
    startEdit(rowId: F1GridRowId, field: keyof T) {
      const colIndex = visibleColumns.findIndex((col) => col.field === field);
      if (colIndex >= 0) {
        startEdit(rowId, colIndex);
      }
    },
    stopEdit() {
      stopEdit();
    },
    setCellValue(rowId: F1GridRowId, field: keyof T, value: unknown) {
      const column = visibleColumns.find((item) => item.field === field);

      setData((current) => {
        const row = getGridRowById(current, rowId);
        if (!row || !column || !isCellEditable(column, row)) return current;

        const patch = column.onValueChange?.(row, value) ?? {
          [field]: value,
        };

        return updateGridRow(current, rowKey, rowId, patch as Partial<T>);
      });
    },
  }));

  const selectedAll =
    visibleRows.length > 0 && selectedCount === visibleRows.length;
  const showAddRootInContextMenu = allowAddRootInContextMenu ?? true;
  const showAddRowInContextMenu = allowAddRowInContextMenu ?? true;
  const rowInsertionDisabled =
    sortState.length > 0 || filterState.length > 0;
  const showDuplicateRowInContextMenu = allowDuplicateRowInContextMenu ?? true;
  const showDeleteRowInContextMenu = allowDeleteRowInContextMenu ?? true;
  const hasRowContextMenuActions =
    (treeContextMenu !== undefined && showAddRootInContextMenu) ||
    showAddRowInContextMenu ||
    showDuplicateRowInContextMenu ||
    showDeleteRowInContextMenu;
  const hasClearContextMenuActions = !disableFiltering || !disableSorting;

  const resolvedHeight =
    typeof height === 'number' ? `${height}px` : (height ?? 'auto');
  const resolvedMinHeight =
    typeof minHeight === 'number' ? `${minHeight}px` : (minHeight ?? '0');
  const resolvedMaxHeight =
    typeof maxHeight === 'number' ? `${maxHeight}px` : (maxHeight ?? 'none');
  function updateRangeOverlay() {
    const range = copiedCellRange ?? cellSelection;
    if (!range || !bodyScrollRef.current) {
      setRangeOverlay((current) => (current ? null : current));
      return;
    }

    const isSingleCellRange =
      range.anchor.rowId === range.focus.rowId &&
      range.anchor.columnIndex === range.focus.columnIndex;
    if (isSingleCellRange) {
      setRangeOverlay(null);
      return;
    }

    const startRowIndex = visibleRows.findIndex(
      (row) => getGridRowId(row, rowKey) === range.anchor.rowId,
    );
    const endRowIndex = visibleRows.findIndex(
      (row) => getGridRowId(row, rowKey) === range.focus.rowId,
    );
    if (startRowIndex < 0 || endRowIndex < 0) {
      setRangeOverlay((current) => (current ? null : current));
      return;
    }

    const minRowIndex = Math.min(startRowIndex, endRowIndex);
    const maxRowIndex = Math.max(startRowIndex, endRowIndex);
    const minColumnIndex = Math.min(
      range.anchor.columnIndex,
      range.focus.columnIndex,
    );
    const maxColumnIndex = Math.max(
      range.anchor.columnIndex,
      range.focus.columnIndex,
    );

    const topLeftRow = visibleRows[minRowIndex];
    const bottomRightRow = visibleRows[maxRowIndex];
    const topLeftNode = cellNodeRefs.current.get(
      `${String(getGridRowId(topLeftRow, rowKey))}:${minColumnIndex}`,
    );
    const bottomRightNode = cellNodeRefs.current.get(
      `${String(getGridRowId(bottomRightRow, rowKey))}:${maxColumnIndex}`,
    );
    if (!topLeftNode || !bottomRightNode) {
      setRangeOverlay((current) => (current ? null : current));
      return;
    }

    const containerRect = bodyScrollRef.current.getBoundingClientRect();
    const topLeftRect = topLeftNode.getBoundingClientRect();
    const bottomRightRect = bottomRightNode.getBoundingClientRect();
    const scrollLeft = bodyScrollRef.current.scrollLeft;
    const next = {
      left: Math.max(0, topLeftRect.left - containerRect.left + scrollLeft + 1),
      top: Math.max(
        0,
        topLeftRect.top -
          containerRect.top +
          bodyScrollRef.current.scrollTop +
          1,
      ),
      width: Math.max(0, bottomRightRect.right - topLeftRect.left - 2),
      height: Math.max(0, bottomRightRect.bottom - topLeftRect.top - 2),
    };

    setRangeOverlay((current) => {
      if (
        current &&
        current.left === next.left &&
        current.top === next.top &&
        current.width === next.width &&
        current.height === next.height
      ) {
        return current;
      }
      return next;
    });
  }

  useEffect(() => {
    if (!copiedCellRange && !cellSelection) {
      setRangeOverlay(null);
      return;
    }
    updateRangeOverlay();
  }, [copiedCellRange, cellSelection, rowKey]);

  useEffect(() => {
    const bodyScroll = bodyScrollRef.current;
    if (!bodyScroll || (!copiedCellRange && !cellSelection)) return;

    const handleScrollOrResize = () => updateRangeOverlay();
    bodyScroll.addEventListener('scroll', handleScrollOrResize, {
      passive: true,
    });
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      bodyScroll.removeEventListener('scroll', handleScrollOrResize);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [copiedCellRange, cellSelection, rowKey]);

  useEffect(() => {
    const headerScroll = headerScrollRef.current;
    const bodyScroll = bodyScrollRef.current;
    if (!headerScroll || !bodyScroll) return;

    const syncHeaderScroll = () => {
      if (headerScroll.scrollLeft !== bodyScroll.scrollLeft) {
        headerScroll.scrollLeft = bodyScroll.scrollLeft;
      }
    };

    const syncBodyScroll = () => {
      if (bodyScroll.scrollLeft !== headerScroll.scrollLeft) {
        bodyScroll.scrollLeft = headerScroll.scrollLeft;
      }
    };

    bodyScroll.addEventListener('scroll', syncHeaderScroll, { passive: true });
    headerScroll.addEventListener('scroll', syncBodyScroll, { passive: true });

    return () => {
      bodyScroll.removeEventListener('scroll', syncHeaderScroll);
      headerScroll.removeEventListener('scroll', syncBodyScroll);
    };
  }, []);

  return (
    <Box
      ref={gridContainerRef}
      role="grid"
      aria-label={ariaLabel}
      aria-busy={loading || queryLoading || dataSourceLoading || undefined}
      aria-rowcount={dataSource ? serverTotalRowCount : visibleRows.length}
      onCopy={handleCopy}
      onPaste={handlePaste}
      onContextMenu={openContextMenu}
      sx={{
        position: 'relative',
        width: '100%',
        minWidth: 0,
        maxWidth: '100%',
        overflowX: 'auto',
        overflowY: 'hidden',
        height: resolvedHeight,
        minHeight: resolvedMinHeight,
        maxHeight: resolvedMaxHeight,
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        bgcolor: 'background.paper',
        display: 'flex',
        flexDirection: 'column',
        fontSize: '0.8125rem',
      }}
    >
      <Box
        ref={headerScrollRef}
        sx={{
          width: '100%',
          overflowX: 'auto',
          overflowY: 'auto',
          flex: '0 0 auto',
          scrollbarGutter: 'stable',
          scrollbarWidth: 'none',
          boxSizing: 'border-box',
          paddingRight: `${bodyScrollMetrics.verticalScrollbarWidth}px`,
          '&::-webkit-scrollbar': { display: 'none' },
        }}
      >
        <GridHeader
          columns={visibleColumns}
          allColumns={columns}
          renderedColumnIndexes={renderedColumnIndexes}
          rows={visibleRows}
          columnLine={columnLine}
          selectedAll={selectedAll}
          selectedCount={selectedCount}
          columnWidths={columnWidths}
          columnTracks={columnTracks}
          resizableColumns={resizableColumns}
          minColumnWidth={minColumnWidth}
          showCheckbox={showCheckbox}
          onResizeColumn={handleResizeColumn}
          getColumnCheckboxState={getColumnCheckboxState}
          onToggleAllRows={() => {
            setRowSelection(selectAllGridRows(!selectedAll));
          }}
          onToggleColumnCheckbox={toggleColumnCheckbox}
          onToggleColumnVisibility={toggleColumnVisibility}
          sorts={sortState}
          onToggleSort={toggleSortColumn}
          disableSorting={disableSorting}
          filters={filterState}
          onApplyFilter={applyColumnFilter}
          disableFiltering={disableFiltering}
          pinnedFields={pinnedFields}
          onPinColumn={pinColumn}
          leftOffsets={leftOffsets}
          rightOffsets={rightOffsets}
          editableColumnFields={editableColumnFields}
          showFormAction={rowFormActive}
          formActionWidth={
            GRID_ROW_FORM_ACTION_COLUMN_WIDTH +
            bodyScrollMetrics.verticalScrollbarWidth
          }
          formActionRightOffset={bodyScrollMetrics.verticalScrollbarWidth}
          formActionPinnedShadow={formActionPinnedShadow}
          onReorderColumn={reorderColumn}
        />
      </Box>
      <Box
        ref={bodyScrollRef}
        data-testid="f1-grid-body-scroll"
        onScroll={(event) => {
          const bodyScroll = event.currentTarget;
          scheduleViewportMeasure(bodyScroll);
          if (
            dataSource &&
            serverRows.length < serverTotalRowCount &&
            bodyScroll.scrollTop + bodyScroll.clientHeight >=
              bodyScroll.scrollHeight - defaultRowHeight * 8
          ) {
            void loadDataSourcePage(serverRows.length, true);
          }
        }}
        onContextMenu={openContextMenu}
        sx={{
          position: 'relative',
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'auto',
          overflowAnchor: 'none',
          scrollbarGutter: 'stable',
        }}
      >
        {!loading ? (
          <GridBody
            visibleRows={rowVirtualState.visibleRows}
            allRows={visibleRows}
            rowStartIndex={rowVirtualState.startIndex}
            columns={visibleColumns}
            renderedColumnIndexes={renderedColumnIndexes}
            rowKey={rowKey}
            columnLine={columnLine}
            stripeRows={stripeRows}
            columnTracks={columnTracks}
            defaultRowHeight={defaultRowHeight}
            minRowHeight={normalizedMinRowHeight}
            maxRowHeight={normalizedMaxRowHeight}
            rowHeights={rowHeights}
            resizableRows={
              resizableRows &&
              visibleRows.length < Math.max(1, fixedRowHeightThreshold)
            }
            selectedIds={selectedIds}
            rowSelection={rowSelection}
            focusedCell={focusedCell}
            editingCell={editingCell}
            selectedCellRange={cellSelection}
            selectedCellRangeBounds={selectedCellRangeBounds}
            copiedCellRange={copiedCellRange}
            isCellSelectionDragging={isCellSelectionDragging}
            dragSelectionStateRef={dragSelectionStateRef}
            draftValue={draftValue}
            dirtyCellMap={dirtyCellMap}
            mergeInfoByColumn={mergeInfoByColumn}
            getRowId={(row) => getGridRowId(row, rowKey)}
            virtualTopPadding={rowVirtualState.topPadding}
            virtualBottomPadding={rowVirtualState.bottomPadding}
            onSelectRow={selectRow}
            onSetRowSelection={setSingleRowSelection}
            onSetFocusedCell={(cell) => {
              setFocusedCell(cell);
              setCopiedCellRange(undefined);
              setCellSelectionRange(cell, cell);
            }}
            onStartEdit={startEdit}
            onCellSelectionStart={(cell) => {
              dragSelectionStateRef.current = {
                active: true,
                previousCell: cell,
              };
              setFocusedCell(cell);
              cellRangeDragRef.current = createGridCellRange(cell);
              setIsCellSelectionDragging(true);
              setCellSelectionRange(cell, cell);
            }}
            onCellSelectionDrag={(cell) => {
              dragSelectionStateRef.current = {
                ...dragSelectionStateRef.current,
                previousCell: cell,
              };
              updateCellSelectionRange(cell);
            }}
            onCellSelectionEnd={finishCellSelectionRange}
            onCommitEdit={() => commitEditRef.current()}
            onDraftChange={setDraftValue}
            onKeyDown={handleKeyDown}
            onUpdateRow={(rowId, field, value) => {
              setData((current) =>
                updateGridRow(current, rowKey, rowId, {
                  [field]: value,
                } as Partial<T>),
              );
            }}
            onPatchRow={(rowId, changes) => {
              setData((current) =>
                updateGridRow(current, rowKey, rowId, changes),
              );
            }}
            getCellError={getCellError}
            onStopEdit={stopEdit}
            onCellRef={(rowId, columnIndex, node) => {
              const key = `${String(rowId)}:${columnIndex}`;
              if (node) {
                cellNodeRefs.current.set(key, node);
              } else {
                cellNodeRefs.current.delete(key);
              }
            }}
            onEditingCellRef={(node) => {
              editingCellNodeRef.current = node;
            }}
            onUpdateRowHeight={updateRowHeight}
            getPinOffset={getPinOffset}
            cellAdornment={cellAdornment}
            showCheckbox={showCheckbox}
            showFormAction={rowFormActive}
            formActionPinnedShadow={formActionPinnedShadow}
            onOpenRowForm={openEditRowForm}
          />
        ) : null}
        {rangeOverlay ? (
          <Box
            data-range-overlay={copiedCellRange ? 'copy' : 'drag'}
            sx={{
              position: 'absolute',
              left: rangeOverlay.left,
              top: rangeOverlay.top,
              width: rangeOverlay.width,
              height: rangeOverlay.height,
              border: copiedCellRange ? '2px dashed' : '2px solid',
              borderColor: 'primary.main',
              borderRadius: 0,
              pointerEvents: 'none',
              boxSizing: 'border-box',
              backgroundColor: copiedCellRange
                ? 'rgba(25, 118, 210, 0.02)'
                : 'rgba(25, 118, 210, 0.04)',
              boxShadow: copiedCellRange
                ? 'inset 0 0 0 1px rgba(25, 118, 210, 0.10)'
                : 'inset 0 0 0 1px rgba(25, 118, 210, 0.14)',
              zIndex: 8,
            }}
          />
        ) : null}
      </Box>
      {loading || queryLoading || dataSourceLoading ? (
        <Box
          data-testid="f1-grid-loading-overlay"
          sx={{
            position: 'absolute',
            inset: 0,
            zIndex: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: (theme) => alpha(theme.palette.background.default, 0.84),
            pointerEvents: 'auto',
          }}
          aria-live="polite"
        >
          <AppLoadingSpinner thickness={2.4} />
        </Box>
      ) : null}
      <Menu
        open={Boolean(contextMenu) && !disableContextMenu}
        onClose={closeContextMenu}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
        }
        slotProps={{
          backdrop: {
            // 배경막이 클릭/우클릭을 가로채면 그리드 밖 클릭 판정과
            // 셀 재선택 로직이 실제 대상 대신 배경막을 타겟으로 받는다.
            sx: { pointerEvents: 'none' },
          },
        }}
      >
        {canExportExcel ? (
          <MenuItem onClick={handleExportExcelClick}>엑셀 내보내기</MenuItem>
        ) : null}
        <MenuItem onClick={handleAutoFitColumnsClick}>
          컬럼 길이 자동 조정
        </MenuItem>
        <Divider />
        {treeContextMenu && showAddRootInContextMenu ? (
          <MenuItem onClick={handleAddRootClick}>루트 추가</MenuItem>
        ) : null}
        {showAddRowInContextMenu ? (
          <MenuItem onClick={handleAddRowContextClick}>행 추가</MenuItem>
        ) : null}
        {!treeContextMenu &&
        showAddRowInContextMenu &&
        contextMenu?.rowId !== undefined ? (
          <>
            <MenuItem
              disabled={rowInsertionDisabled}
              onClick={() => handleInsertRowContextClick('before')}
            >
              {rowInsertionDisabled
                ? '위에 행 삽입 (정렬/필터 해제 필요)'
                : '위에 행 삽입'}
            </MenuItem>
            <MenuItem
              disabled={rowInsertionDisabled}
              onClick={() => handleInsertRowContextClick('after')}
            >
              {rowInsertionDisabled
                ? '아래에 행 삽입 (정렬/필터 해제 필요)'
                : '아래에 행 삽입'}
            </MenuItem>
          </>
        ) : null}
        {showDuplicateRowInContextMenu ? (
          <MenuItem
            disabled={!createDuplicate || selectedCount === 0}
            onClick={handleDuplicateContextClick}
          >
            행 복사
          </MenuItem>
        ) : null}
        {showDeleteRowInContextMenu ? (
          <MenuItem
            disabled={selectedCount === 0 || deleteMenuDisabled}
            onClick={handleDeleteContextClick}
          >
            행 삭제
          </MenuItem>
        ) : null}
        {hasRowContextMenuActions && hasClearContextMenuActions ? (
          <Divider />
        ) : null}
        {!disableFiltering ? (
          <MenuItem
            disabled={filterState.length === 0}
            onClick={handleClearFiltersClick}
          >
            필터 해제
          </MenuItem>
        ) : null}
        {!disableSorting ? (
          <MenuItem
            disabled={sortState.length === 0}
            onClick={handleClearSortClick}
          >
            정렬 해제
          </MenuItem>
        ) : null}
        {hasRowContextMenuActions || hasClearContextMenuActions ? (
          <Divider />
        ) : null}
        <MenuItem onClick={handleResetColumnSettingsClick}>
          설정을 기본값으로 복원
        </MenuItem>
      </Menu>
      {rowFormActive && rowFormPlugin && rowFormSession ? (
        <F1GridFormModal
          open
          mode={rowFormSession.mode}
          row={rowFormSession.row}
          originalRow={rowFormSession.originalRow}
          columns={columns}
          rowKey={rowKey}
          validationRows={activeRows}
          plugin={rowFormPlugin}
          externalErrors={rowFormErrors}
          onValidationErrors={onValidationErrors}
          onCancel={closeRowForm}
          onApply={applyRowForm}
          onDraftChange={(fields) => {
            setRowFormErrors((current) =>
              Object.fromEntries(
                Object.entries(current).filter(
                  ([field]) => !fields.includes(field),
                ),
              ),
            );
          }}
        />
      ) : null}
    </Box>
  );
}

export const F1Grid = forwardRef(F1GridInner) as unknown as <T extends object>(
  props: F1GridProps<T> & { ref?: Ref<F1GridRef<T>> },
) => ReactElement;

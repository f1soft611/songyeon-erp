import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { Box, Checkbox, IconButton } from '@mui/material';
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ForwardedRef,
  type ReactElement,
  type Ref,
} from 'react';
import { F1Grid } from '../core/F1Grid';
import type {
  F1GridChanges,
  F1GridRef,
  F1GridRowId,
  F1TreeProps,
  F1TreeRef,
} from '../types/grid.types';
import { getGridRowId, getStateKey } from '../utils/grid.utils';
import {
  createTreeIndex,
  projectTreeIndex,
  type F1TreeIndex,
  type F1TreeProjection,
} from './TreeProjection';

function F1TreeInner<T extends object>(
  {
    parentKey,
    treeColumn,
    treeCheckbox = false,
    defaultExpandAll,
    defaultExpanded = 'all',
    getRowOrder,
    onDeleteBlocked,
    onTreeCheckboxChange,
    isDeleteDisabled,
    rows,
    rowKey,
    ...gridProps
  }: F1TreeProps<T>,
  ref: ForwardedRef<F1TreeRef<T>>,
) {
  const gridRef = useRef<F1GridRef<T>>(null);
  const pendingChildInsertRef = useRef<
    | {
        parentId: F1GridRowId;
        existingInsertedIds: Set<F1GridRowId>;
      }
    | undefined
  >(undefined);
  const currentProjectionRef = useRef<F1TreeProjection<T>>({
    rows: [],
    metaById: {},
  });
  const treeIndexCacheRef = useRef<
    | {
        rows: T[];
        rowKey: keyof T;
        parentKey: keyof T;
        getRowOrder?: (row: T) => number;
        index: F1TreeIndex<T>;
      }
    | undefined
  >(undefined);
  const allParentIds = useMemo(
    () =>
      rows
        .filter((row) => rows.some((child) => child[parentKey] === row[rowKey]))
        .map((row) => getGridRowId(row, rowKey)),
    [parentKey, rowKey, rows],
  );
  const rootIds = useMemo(
    () =>
      rows
        .filter(
          (row) => row[parentKey] === null || row[parentKey] === undefined,
        )
        .map((row) => getGridRowId(row, rowKey)),
    [parentKey, rowKey, rows],
  );
  const [expandedIds, setExpandedIds] = useState<Set<F1GridRowId>>(
    () =>
      new Set(
        defaultExpandAll || defaultExpanded === 'all'
          ? allParentIds
          : defaultExpanded === 'root'
            ? rootIds
            : defaultExpanded,
      ),
  );
  const [treeCheckedIds, setTreeCheckedIds] = useState<Set<F1GridRowId>>(
    () => new Set(),
  );

  const childIdsByParent = useMemo(() => {
    const map = new Map<F1GridRowId, F1GridRowId[]>();
    rows.forEach((row) => {
      const rowId = getGridRowId(row, rowKey);
      const parentRowId = row[parentKey];
      const parentKeyValue =
        typeof parentRowId === 'string' || typeof parentRowId === 'number'
          ? parentRowId
          : null;
      if (parentKeyValue == null) return;
      const next = map.get(parentKeyValue) ?? [];
      next.push(rowId);
      map.set(parentKeyValue, next);
    });
    return map;
  }, [parentKey, rowKey, rows]);

  function getDescendantIds(rowId: F1GridRowId): F1GridRowId[] {
    const descendants: F1GridRowId[] = [];
    const visit = (current: F1GridRowId) => {
      const children = childIdsByParent.get(current) ?? [];
      children.forEach((child) => {
        descendants.push(child);
        visit(child);
      });
    };
    visit(rowId);
    return descendants;
  }

  function getTreeCheckboxState(rowId: F1GridRowId) {
    const targetIds = [rowId, ...getDescendantIds(rowId)];
    const checkedCount = targetIds.filter((id) =>
      treeCheckedIds.has(id),
    ).length;
    if (checkedCount === 0) {
      return { checked: false, indeterminate: false };
    }
    if (checkedCount === targetIds.length) {
      return { checked: true, indeterminate: false };
    }
    return { checked: false, indeterminate: true };
  }

  function toggleTreeCheckbox(rowId: F1GridRowId, nextChecked: boolean) {
    setTreeCheckedIds((current) => {
      const next = new Set(current);
      const targetIds = [rowId, ...getDescendantIds(rowId)];
      if (nextChecked) {
        targetIds.forEach((id) => next.add(id));
      } else {
        targetIds.forEach((id) => next.delete(id));
      }
      return next;
    });

    const syncedCheckboxFields = gridProps.columns
      .filter(
        (column) =>
          column.type === 'checkbox' && column.syncWithTreeCheckbox !== false,
      )
      .map((column) => column.field);
    if (syncedCheckboxFields.length === 0) return;

    const targetIds = [rowId, ...getDescendantIds(rowId)];
    targetIds.forEach((id) => {
      syncedCheckboxFields.forEach((field) => {
        gridRef.current?.setCellValue(id, field, nextChecked);
      });
    });
  }

  useEffect(() => {
    onTreeCheckboxChange?.([...treeCheckedIds]);
  }, [onTreeCheckboxChange, treeCheckedIds]);

  useEffect(() => {
    if (!defaultExpandAll || allParentIds.length === 0) return;
    setExpandedIds((current) => {
      const next = new Set(current);
      allParentIds.forEach((rowId) => next.add(rowId));
      return next;
    });
  }, [allParentIds, defaultExpandAll]);

  const projectRows = (gridRows: T[]) => {
    const cached = treeIndexCacheRef.current;
    let treeIndex = cached?.index;
    if (
      !cached ||
      cached.rows !== gridRows ||
      cached.rowKey !== rowKey ||
      cached.parentKey !== parentKey ||
      cached.getRowOrder !== getRowOrder
    ) {
      treeIndex = createTreeIndex(gridRows, {
        rowKey,
        parentKey,
        getRowOrder,
      });
      treeIndexCacheRef.current = {
        rows: gridRows,
        rowKey,
        parentKey,
        getRowOrder,
        index: treeIndex,
      };
    }
    if (!treeIndex) {
      return { rows: gridRows };
    }
    const projection = projectTreeIndex(treeIndex, expandedIds);
    const rowsWithHierarchyMetadata = projection.rows.map((row) => {
      const rowId = getGridRowId(row, rowKey);
      const metadata = projection.metaById[getStateKey(rowId)];
      const apiHasChildren = Boolean(
        (row as { hasChildren?: unknown }).hasChildren,
      );

      return {
        ...row,
        hasChildren:
          metadata?.hasChildren || (!metadata?.hasChildren && apiHasChildren),
      } as T;
    });
    const currentProjection = {
      rows: rowsWithHierarchyMetadata,
      metaById: Object.fromEntries(
        Object.entries(projection.metaById).map(([rowId, metadata]) => [
          rowId,
          {
            ...metadata,
            hasChildren:
              metadata.hasChildren ||
              (!metadata.hasChildren &&
                Boolean(
                  (
                    gridRows.find(
                      (row) => getStateKey(getGridRowId(row, rowKey)) === rowId,
                    ) as { hasChildren?: unknown } | undefined
                  )?.hasChildren,
                )),
          },
        ]),
      ),
    };
    currentProjectionRef.current = currentProjection;
    return currentProjection;
  };

  function addExpanded(rowId: F1GridRowId) {
    setExpandedIds((current) => new Set(current).add(rowId));
  }

  function removeExpanded(rowId: F1GridRowId) {
    setExpandedIds((current) => {
      const next = new Set(current);
      next.delete(rowId);
      return next;
    });
  }

  const rowFormActive = Boolean(
    gridProps.rowFormPlugin && gridProps.rowFormPlugin.enabled !== false,
  );

  const handleChangesChange = useCallback(
    (changes: F1GridChanges<T>) => {
      const pendingInsert = pendingChildInsertRef.current;
      if (
        pendingInsert &&
        changes.insertedRows.some(
          (row) =>
            row[parentKey] === pendingInsert.parentId &&
            !pendingInsert.existingInsertedIds.has(getGridRowId(row, rowKey)),
        )
      ) {
        pendingChildInsertRef.current = undefined;
        setExpandedIds((current) =>
          new Set(current).add(pendingInsert.parentId),
        );
      }
      gridProps.onChangesChange?.(changes);
    },
    [gridProps.onChangesChange, parentKey, rowKey],
  );

  function addChildRow(parentId: F1GridRowId, row?: Partial<T>) {
    if (rowFormActive) {
      pendingChildInsertRef.current = {
        parentId,
        existingInsertedIds: new Set(
          gridRef.current
            ?.getChanges()
            .insertedRows.map((insertedRow) =>
              getGridRowId(insertedRow, rowKey),
            ) ?? [],
        ),
      };
    } else {
      addExpanded(parentId);
    }
    gridRef.current?.addRow({ ...row, [parentKey]: parentId } as Partial<T>);
  }

  useImperativeHandle(ref, () => ({
    getSelectedRows: () => gridRef.current?.getSelectedRows() ?? [],
    getSelectedRowIds: () => gridRef.current?.getSelectedRowIds() ?? [],
    clearSelection: () => gridRef.current?.clearSelection(),
    setSelectedRowIds: (rowIds) => gridRef.current?.setSelectedRowIds(rowIds),
    addRow: (row) => {
      pendingChildInsertRef.current = undefined;
      gridRef.current?.addRow(row);
    },
    addChildRow,
    deleteSelectedRows: () => {
      const selectedIds = gridRef.current?.getSelectedRowIds() ?? [];
      const rowsSnapshot = gridRef.current?.getRows() ?? [];
      const blockedIds = selectedIds.filter((rowId) => {
        const matchingRow = rowsSnapshot.find(
          (row) => getGridRowId(row, rowKey) === rowId,
        );
        if (!matchingRow) return false;
        if (
          currentProjectionRef.current.metaById[getStateKey(rowId)]?.hasChildren
        ) {
          return true;
        }
        return Boolean(isDeleteDisabled?.(matchingRow));
      });
      if (blockedIds.length > 0) {
        onDeleteBlocked?.(blockedIds);
        return;
      }
      gridRef.current?.deleteSelectedRows();
    },
    restoreDeletedRows: () => gridRef.current?.restoreDeletedRows(),
    duplicateSelectedRows: () => gridRef.current?.duplicateSelectedRows(),
    getRows: () => gridRef.current?.getRows() ?? [],
    getActiveRows: () => gridRef.current?.getActiveRows() ?? [],
    acceptSavedRows: (savedRows) => {
      if (!gridRef.current) throw new Error('그리드가 준비되지 않았습니다.');
      return gridRef.current.acceptSavedRows(savedRows);
    },
    getChanges: () =>
      gridRef.current?.getChanges() ?? {
        insertedRows: [],
        updatedRows: [],
        deletedRows: [],
      },
    validate: () => gridRef.current?.validate() ?? true,
    startEdit: (rowId, field) => gridRef.current?.startEdit(rowId, field),
    stopEdit: () => gridRef.current?.stopEdit(),
    setCellValue: (rowId, field, value) =>
      gridRef.current?.setCellValue(rowId, field, value),
    expandRow: addExpanded,
    collapseRow: removeExpanded,
    expandAll: () => setExpandedIds(new Set(allParentIds)),
    collapseAll: () => setExpandedIds(new Set()),
    isExpanded: (rowId) => expandedIds.has(rowId),
  }));

  return (
    <F1Grid
      ref={gridRef}
      {...gridProps}
      rows={rows}
      rowKey={rowKey}
      disableSorting
      disableFiltering
      onChangesChange={handleChangesChange}
      rowProjection={(gridRows) => projectRows(gridRows)}
      treeContextMenu={{
        onAddRoot: () => {
          pendingChildInsertRef.current = undefined;
          gridRef.current?.addRow();
        },
        onAddChild: (targetRowId) => {
          if (targetRowId === undefined) {
            pendingChildInsertRef.current = undefined;
            gridRef.current?.addRow();
            return;
          }
          addChildRow(targetRowId);
        },
      }}
      cellAdornment={(row, column) => {
        if (column.field !== treeColumn) return undefined;
        const rowId = getGridRowId(row, rowKey);
        const meta = currentProjectionRef.current.metaById[getStateKey(rowId)];
        if (!meta) return undefined;
        const expanded = expandedIds.has(rowId);
        const label = String(row[treeColumn] ?? '');
        const treeCheckboxState = treeCheckbox
          ? getTreeCheckboxState(rowId)
          : undefined;
        return (
          <Box
            sx={{ display: 'flex', alignItems: 'center', pl: meta.depth * 2 }}
          >
            {treeCheckbox ? (
              <Checkbox
                size="small"
                checked={treeCheckboxState?.checked ?? false}
                indeterminate={treeCheckboxState?.indeterminate ?? false}
                slotProps={{
                  input: { 'aria-label': `${label} 트리 선택` },
                }}
                onChange={(event) => {
                  event.stopPropagation();
                  toggleTreeCheckbox(rowId, event.target.checked);
                }}
              />
            ) : null}
            {meta.hasChildren ? (
              <IconButton
                size="small"
                aria-label={`${label} ${expanded ? '접기' : '펼치기'}`}
                onClick={(event) => {
                  event.stopPropagation();
                  if (expanded) removeExpanded(rowId);
                  else addExpanded(rowId);
                }}
              >
                {expanded ? (
                  <ExpandMoreIcon fontSize="small" />
                ) : (
                  <ChevronRightIcon fontSize="small" />
                )}
              </IconButton>
            ) : (
              <Box sx={{ width: 32, flex: '0 0 auto' }} />
            )}
          </Box>
        );
      }}
    />
  );
}

export const F1Tree = forwardRef(F1TreeInner) as unknown as <T extends object>(
  props: F1TreeProps<T> & { ref?: Ref<F1TreeRef<T>> },
) => ReactElement;

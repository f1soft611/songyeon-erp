import type { F1GridRowId } from '../types/grid.types';

export type F1GridCellPosition = {
  rowId: F1GridRowId;
  columnIndex: number;
};

export type F1GridCellRange = {
  anchor: F1GridCellPosition;
  focus: F1GridCellPosition;
};

export type F1GridCellRangeBounds = {
  minRowIndex: number;
  maxRowIndex: number;
  minColumnIndex: number;
  maxColumnIndex: number;
};

export type F1GridRowSelection = {
  allSelected: boolean;
  includedIds: Set<F1GridRowId>;
  excludedIds: Set<F1GridRowId>;
};

export function createGridRowSelection(): F1GridRowSelection {
  return {
    allSelected: false,
    includedIds: new Set(),
    excludedIds: new Set(),
  };
}

export function isGridRowSelected(
  selection: F1GridRowSelection,
  rowId: F1GridRowId,
): boolean {
  return selection.allSelected
    ? !selection.excludedIds.has(rowId)
    : selection.includedIds.has(rowId);
}

export function setGridRowSelected(
  selection: F1GridRowSelection,
  rowId: F1GridRowId,
  selected: boolean,
): F1GridRowSelection {
  if (selection.allSelected) {
    const excludedIds = new Set(selection.excludedIds);
    if (selected) excludedIds.delete(rowId);
    else excludedIds.add(rowId);
    return { ...selection, excludedIds };
  }

  const includedIds = new Set(selection.includedIds);
  if (selected) includedIds.add(rowId);
  else includedIds.delete(rowId);
  return { ...selection, includedIds };
}

export function selectAllGridRows(selected: boolean): F1GridRowSelection {
  return {
    allSelected: selected,
    includedIds: new Set(),
    excludedIds: new Set(),
  };
}

export function materializeGridRowSelection(
  selection: F1GridRowSelection,
  visibleRowIds: F1GridRowId[],
): F1GridRowId[] {
  return visibleRowIds.filter((rowId) => isGridRowSelected(selection, rowId));
}

export function createGridCellRange(
  anchor: F1GridCellPosition,
  focus: F1GridCellPosition = anchor,
): F1GridCellRange {
  return { anchor, focus };
}

export function getGridCellRangeBounds(
  range: F1GridCellRange | undefined,
  rowIndexById: ReadonlyMap<string, number>,
): F1GridCellRangeBounds | undefined {
  if (!range) return undefined;

  const anchorRowIndex = rowIndexById.get(String(range.anchor.rowId));
  const focusRowIndex = rowIndexById.get(String(range.focus.rowId));
  if (anchorRowIndex === undefined || focusRowIndex === undefined) {
    return undefined;
  }

  return {
    minRowIndex: Math.min(anchorRowIndex, focusRowIndex),
    maxRowIndex: Math.max(anchorRowIndex, focusRowIndex),
    minColumnIndex: Math.min(range.anchor.columnIndex, range.focus.columnIndex),
    maxColumnIndex: Math.max(range.anchor.columnIndex, range.focus.columnIndex),
  };
}

type SelectionIntent = {
  ctrlKey?: boolean;
  shiftKey?: boolean;
  visibleRowIds?: F1GridRowId[];
};

export function getSelectedRowIds(
  selectedIds: F1GridRowId[],
  rowId: F1GridRowId,
  intent: SelectionIntent,
): F1GridRowId[] {
  if (intent.shiftKey && intent.visibleRowIds) {
    const anchorIndex = intent.visibleRowIds.findIndex(
      (candidate) => candidate === selectedIds.at(-1),
    );
    const rowIndex = intent.visibleRowIds.findIndex(
      (candidate) => candidate === rowId,
    );

    if (anchorIndex >= 0 && rowIndex >= 0) {
      return intent.visibleRowIds.slice(
        Math.min(anchorIndex, rowIndex),
        Math.max(anchorIndex, rowIndex) + 1,
      );
    }
  }

  if (intent.ctrlKey) {
    return selectedIds.includes(rowId)
      ? selectedIds.filter((candidate) => candidate !== rowId)
      : [...selectedIds, rowId];
  }

  return [rowId];
}

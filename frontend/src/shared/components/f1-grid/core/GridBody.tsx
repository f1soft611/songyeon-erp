import type { KeyboardEvent, MouseEvent, ReactNode } from 'react';
import { Box } from '@mui/material';
import { GridRow } from './GridRow';
import type {
  F1GridColumn,
  F1GridDraftValue,
  F1GridRowId,
} from '../types/grid.types';
import type {
  F1GridCellRange,
  F1GridCellRangeBounds,
  F1GridRowSelection,
} from '../selection/GridSelection';
import { isGridRowSelected } from '../selection/GridSelection';

type GridBodyProps<T extends object> = {
  visibleRows: T[];
  allRows: T[];
  rowStartIndex: number;
  columns: F1GridColumn<T>[];
  renderedColumnIndexes?: Set<number>;
  rowKey: keyof T;
  columnLine: boolean;
  stripeRows: boolean;
  columnTracks: string;
  defaultRowHeight: number;
  minRowHeight: number;
  maxRowHeight: number;
  rowHeights: Record<string, number>;
  resizableRows: boolean;
  selectedIds: F1GridRowId[];
  rowSelection: F1GridRowSelection;
  selectionMode?: 'cell' | 'row';
  focusedCell?: { rowId: F1GridRowId; columnIndex: number };
  editingCell?: { rowId: F1GridRowId; columnIndex: number };
  selectedCellRange?: F1GridCellRange;
  selectedCellRangeBounds?: F1GridCellRangeBounds;
  isCellSelectionDragging?: boolean;
  dragSelectionStateRef: {
    current: {
      active: boolean;
      previousCell: { rowId: F1GridRowId; columnIndex: number } | null;
    };
  };
  copiedCellRange?: F1GridCellRange;
  draftValue: F1GridDraftValue;
  dirtyCellMap?: Record<string, boolean>;
  mergeInfoByColumn: Array<
    Array<{ isStart: boolean; span: number } | undefined>
  >;
  getRowId: (row: T) => F1GridRowId;
  onSelectRow: (rowId: F1GridRowId, event: MouseEvent<HTMLElement>) => void;
  onSetRowSelection: (rowId: F1GridRowId, checked: boolean) => void;
  onSetFocusedCell: (cell: { rowId: F1GridRowId; columnIndex: number }) => void;
  onCellSelectionStart: (cell: {
    rowId: F1GridRowId;
    columnIndex: number;
  }) => void;
  onCellSelectionDrag: (cell: {
    rowId: F1GridRowId;
    columnIndex: number;
  }) => void;
  onCellSelectionEnd: () => void;
  onCommitEdit: () => void;
  onStartEdit: (rowId: F1GridRowId, columnIndex: number) => void;
  onDraftChange: (value: F1GridDraftValue) => void;
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
  onUpdateRow: (rowId: F1GridRowId, field: keyof T, value: unknown) => void;
  onPatchRow: (rowId: F1GridRowId, changes: Partial<T>) => void;
  getCellError: (rowId: F1GridRowId, field: keyof T) => string | undefined;
  onStopEdit: () => void;
  onCellRef: (
    rowId: F1GridRowId,
    columnIndex: number,
    node: HTMLElement | null,
  ) => void;
  onEditingCellRef: (node: HTMLElement | null) => void;
  onUpdateRowHeight: (rowId: F1GridRowId, height: number) => void;
  getPinOffset: (
    column: F1GridColumn<T>,
  ) => { side: 'left' | 'right'; offset: number; shadow?: boolean } | undefined;
  cellAdornment?: (row: T, column: F1GridColumn<T>) => ReactNode;
  virtualTopPadding?: number;
  virtualBottomPadding?: number;
  showCheckbox?: boolean;
  showFormAction?: boolean;
  formActionPinnedShadow?: boolean;
  onOpenRowForm?: (row: T) => void;
};

function getStateKey(rowId: F1GridRowId): string {
  return String(rowId);
}

function getMergeGroupStart<T extends object>(
  rows: T[],
  rowIndex: number,
  field: keyof T,
): number {
  let start = rowIndex;
  while (
    start > 0 &&
    Object.is(rows[start - 1][field], rows[rowIndex][field])
  ) {
    start -= 1;
  }
  return start;
}

export function GridBody<T extends object>({
  visibleRows,
  allRows,
  rowStartIndex,
  columns,
  renderedColumnIndexes,
  rowKey,
  columnLine,
  stripeRows,
  columnTracks,
  defaultRowHeight,
  minRowHeight,
  maxRowHeight,
  rowHeights,
  resizableRows,
  selectedIds,
  rowSelection,
  selectionMode = 'cell',
  focusedCell,
  editingCell,
  selectedCellRange,
  selectedCellRangeBounds,
  isCellSelectionDragging = false,
  dragSelectionStateRef,
  copiedCellRange,
  draftValue,
  dirtyCellMap = {},
  mergeInfoByColumn,
  getRowId,
  onSelectRow,
  onSetRowSelection,
  onSetFocusedCell,
  onCellSelectionStart,
  onCellSelectionDrag,
  onCellSelectionEnd,
  onCommitEdit,
  onStartEdit,
  onDraftChange,
  onKeyDown,
  onUpdateRow,
  onPatchRow,
  getCellError,
  onStopEdit,
  onCellRef,
  onEditingCellRef,
  onUpdateRowHeight,
  getPinOffset,
  cellAdornment,
  virtualTopPadding = 0,
  virtualBottomPadding = 0,
  showCheckbox = true,
  showFormAction = false,
  formActionPinnedShadow = true,
  onOpenRowForm,
}: GridBodyProps<T>) {
  function getMergeEditing(rowIndex: number, columnIndex: number): boolean {
    const column = columns[columnIndex];
    if (
      !column.mergeRows ||
      !editingCell ||
      editingCell.columnIndex !== columnIndex
    ) {
      return false;
    }

    const editingRowIndex = allRows.findIndex(
      (item) => getRowId(item) === editingCell.rowId,
    );

    if (editingRowIndex < 0) return false;

    return (
      getMergeGroupStart(allRows, rowIndex, column.field) ===
      getMergeGroupStart(allRows, editingRowIndex, column.field)
    );
  }

  function getMerged(
    rowIndex: number,
    columnIndex: number,
    value: unknown,
  ): boolean {
    const column = columns[columnIndex];
    const mergeEditing = getMergeEditing(rowIndex, columnIndex);
    const editing =
      editingCell?.rowId === getRowId(allRows[rowIndex]) &&
      editingCell?.columnIndex === columnIndex;
    const mergeInfo = mergeEditing
      ? undefined
      : mergeInfoByColumn[columnIndex]?.[rowIndex];

    return Boolean(
      column.mergeRows &&
      rowIndex > 0 &&
      !mergeEditing &&
      !editing &&
      !mergeInfo?.isStart &&
      Object.is(allRows[rowIndex - 1][column.field], value),
    );
  }

  if (visibleRows.length === 0) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: Math.max(defaultRowHeight * 4, 120),
          color: 'text.secondary',
          fontSize: '0.8125rem',
          backgroundColor: 'background.paper',
        }}
      >
        데이터가 없습니다
      </Box>
    );
  }

  return (
    <Box
      data-f1-grid-selecting={String(isCellSelectionDragging)}
      sx={{
        display: 'grid',
        gridTemplateColumns: columnTracks,
        gridTemplateRows: [
          `${virtualTopPadding}px`,
          ...visibleRows.map(
            (row) =>
              `${rowHeights[String(getRowId(row))] ?? defaultRowHeight}px`,
          ),
          `${virtualBottomPadding}px`,
        ].join(' '),
        minWidth: 'max-content',
        isolation: 'isolate',
      }}
    >
      <Box sx={{ gridColumn: '1 / -1', gridRow: 1, minHeight: 0 }} />
      {visibleRows.map((row, renderIndex) => {
        const rowIndex = rowStartIndex + renderIndex;
        const rowId = getRowId(row);
        const isSelected = isGridRowSelected(rowSelection, rowId);

        return (
          <GridRow
            key={getStateKey(rowId)}
            row={row}
            rowId={rowId}
            rowIndex={rowIndex}
            renderIndex={renderIndex + 1}
            columns={columns}
            renderedColumnIndexes={renderedColumnIndexes}
            columnLine={columnLine}
            stripeRows={stripeRows}
            isSelected={isSelected}
            selectionMode={selectionMode}
            focusedCell={focusedCell}
            editingCell={editingCell}
            selectedCellRange={selectedCellRange}
            selectedCellRangeBounds={selectedCellRangeBounds}
            isCellSelectionDragging={isCellSelectionDragging}
            dragSelectionStateRef={dragSelectionStateRef}
            copiedCellRange={copiedCellRange}
            draftValue={draftValue}
            dirtyCellMap={dirtyCellMap}
            mergeInfoByColumn={mergeInfoByColumn}
            visibleRows={allRows}
            selectedIds={selectedIds}
            rowKey={rowKey}
            onSelectRow={onSelectRow}
            onSetRowSelection={onSetRowSelection}
            onSetFocusedCell={onSetFocusedCell}
            onCellSelectionStart={onCellSelectionStart}
            onCellSelectionDrag={onCellSelectionDrag}
            onCellSelectionEnd={onCellSelectionEnd}
            onCommitEdit={onCommitEdit}
            onStartEdit={onStartEdit}
            onDraftChange={onDraftChange}
            onKeyDown={onKeyDown}
            onUpdateCell={(field: keyof T, value: unknown) =>
              onUpdateRow(rowId, field, value)
            }
            onUpdateRow={(changes: Partial<T>) => onPatchRow(rowId, changes)}
            getCellError={getCellError}
            onStopEdit={onStopEdit}
            onCellRef={onCellRef}
            onEditingCellRef={onEditingCellRef}
            rowHeight={rowHeights[String(rowId)] ?? defaultRowHeight}
            defaultRowHeight={defaultRowHeight}
            minRowHeight={minRowHeight}
            maxRowHeight={maxRowHeight}
            resizableRows={resizableRows}
            onUpdateRowHeight={onUpdateRowHeight}
            getMergeEditing={(columnIndex: number) =>
              getMergeEditing(rowIndex, columnIndex)
            }
            getMerged={(ri: number, ci: number, val: unknown) =>
              getMerged(ri, ci, val)
            }
            getPinOffset={getPinOffset}
            cellAdornment={cellAdornment}
            showCheckbox={showCheckbox}
            showFormAction={showFormAction}
            formActionPinnedShadow={formActionPinnedShadow}
            onOpenRowForm={onOpenRowForm}
          />
        );
      })}
      <Box
        sx={{
          gridColumn: '1 / -1',
          gridRow: visibleRows.length + 2,
          minHeight: 0,
        }}
      />
    </Box>
  );
}

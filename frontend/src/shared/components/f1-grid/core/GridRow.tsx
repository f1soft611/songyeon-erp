import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { Box, Checkbox } from '@mui/material';
import { GridCell } from './GridCell';
import { GridFormActionCell } from '../form/GridFormActionCell';
import type {
  F1GridColumn,
  F1GridDraftValue,
  F1GridRowId,
} from '../types/grid.types';
import type {
  F1GridCellRange,
  F1GridCellRangeBounds,
} from '../selection/GridSelection';

type GridRowProps<T extends object> = {
  row: T;
  rowId: F1GridRowId;
  rowIndex: number;
  renderIndex: number;
  columns: F1GridColumn<T>[];
  renderedColumnIndexes?: Set<number>;
  columnLine: boolean;
  stripeRows: boolean;
  isSelected: boolean;
  rowHeight: number;
  defaultRowHeight: number;
  minRowHeight: number;
  maxRowHeight: number;
  resizableRows: boolean;
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
  visibleRows: T[];
  selectedIds: F1GridRowId[];
  rowKey: keyof T;
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
  onUpdateCell: (field: keyof T, value: unknown) => void;
  onUpdateRow: (changes: Partial<T>) => void;
  getCellError: (rowId: F1GridRowId, field: keyof T) => string | undefined;
  onStopEdit: () => void;
  onCellRef: (
    rowId: F1GridRowId,
    columnIndex: number,
    node: HTMLElement | null,
  ) => void;
  onEditingCellRef: (node: HTMLElement | null) => void;
  onUpdateRowHeight: (rowId: F1GridRowId, height: number) => void;
  getMergeEditing: (columnIndex: number) => boolean;
  getMerged: (rowIndex: number, columnIndex: number, value: unknown) => boolean;
  getPinOffset: (
    column: F1GridColumn<T>,
  ) => { side: 'left' | 'right'; offset: number; shadow?: boolean } | undefined;
  cellAdornment?: (row: T, column: F1GridColumn<T>) => ReactNode;
  showCheckbox?: boolean;
  showFormAction?: boolean;
  formActionPinnedShadow?: boolean;
  onOpenRowForm?: (row: T) => void;
  latestPropsRef?: {
    current: {
      selectedCellRange?: F1GridCellRange;
      isCellSelectionDragging?: boolean;
    };
  };
};

function getStateKey(rowId: F1GridRowId): string {
  return String(rowId);
}

export function getMergeGroupStartIndex<T extends object>(
  rows: T[],
  rowIndex: number,
  field: keyof T,
): number {
  let startIndex = rowIndex;

  while (
    startIndex > 0 &&
    Object.is(rows[startIndex - 1][field], rows[rowIndex][field])
  ) {
    startIndex -= 1;
  }

  return startIndex;
}

export function getActiveMergeGroupStartKeys<T extends object>({
  columns,
  mergeInfoByColumn,
  visibleRows,
  rowKey,
  selectedIds,
  focusedCell,
  editingCell,
}: {
  columns: F1GridColumn<T>[];
  mergeInfoByColumn: Array<
    Array<{ isStart: boolean; span: number } | undefined>
  >;
  visibleRows: T[];
  rowKey: keyof T;
  selectedIds: F1GridRowId[];
  focusedCell?: { rowId: F1GridRowId; columnIndex: number };
  editingCell?: { rowId: F1GridRowId; columnIndex: number };
}): Set<string> {
  const activeKeys = new Set<string>();
  const rowIds = new Set<string>(
    [editingCell?.rowId, focusedCell?.rowId, ...selectedIds]
      .filter((rowId): rowId is F1GridRowId => rowId !== undefined)
      .map(String),
  );

  rowIds.forEach((rowId) => {
    const rowIndex = visibleRows.findIndex(
      (item) => String(item[rowKey]) === rowId,
    );
    if (rowIndex < 0) return;

    columns.forEach((column, columnIndex) => {
      if (!column.mergeRows) return;

      const groupStartIndex = getMergeGroupStartIndex(
        visibleRows,
        rowIndex,
        column.field,
      );
      const groupStartInfo = mergeInfoByColumn[columnIndex]?.[groupStartIndex];

      if (groupStartInfo && groupStartInfo.span > 1) {
        activeKeys.add(`${columnIndex}:${groupStartIndex}`);
      }
    });
  });

  return activeKeys;
}

const areGridRowPropsEqual = <T extends object>(
  prev: Readonly<GridRowProps<T>>,
  next: Readonly<GridRowProps<T>>,
): boolean => {
  const hasMergedColumns = next.columns.some((column) => column.mergeRows);
  const relevantCell = (cell: GridRowProps<T>['focusedCell']) =>
    hasMergedColumns || cell?.rowId === next.rowId ? cell : undefined;
  const rangeState = (props: Readonly<GridRowProps<T>>) => {
    const bounds = props.selectedCellRangeBounds;
    const inRange = bounds &&
      props.rowIndex >= bounds.minRowIndex &&
      props.rowIndex <= bounds.maxRowIndex;
    const range = props.selectedCellRange;
    const copied = props.copiedCellRange;
    return [
      !!range && (range.anchor.rowId !== range.focus.rowId ||
        range.anchor.columnIndex !== range.focus.columnIndex),
      inRange ? bounds.minColumnIndex : -1,
      inRange ? bounds.maxColumnIndex : -1,
      range?.anchor.rowId === props.rowId ? range.anchor.columnIndex : -1,
      !!copied && (copied.anchor.rowId !== copied.focus.rowId ||
        copied.anchor.columnIndex !== copied.focus.columnIndex),
      copied?.anchor.rowId === props.rowId ? copied.anchor.columnIndex : -1,
    ];
  };
  const previousRange = rangeState(prev);
  const nextRange = rangeState(next);

  return (
    prev.row === next.row &&
    prev.rowId === next.rowId &&
    prev.rowIndex === next.rowIndex &&
    prev.renderIndex === next.renderIndex &&
    prev.columns === next.columns &&
    prev.renderedColumnIndexes === next.renderedColumnIndexes &&
    prev.columnLine === next.columnLine &&
    prev.stripeRows === next.stripeRows &&
    prev.isSelected === next.isSelected &&
    prev.rowHeight === next.rowHeight &&
    prev.defaultRowHeight === next.defaultRowHeight &&
    prev.minRowHeight === next.minRowHeight &&
    prev.maxRowHeight === next.maxRowHeight &&
    prev.resizableRows === next.resizableRows &&
    Object.is(relevantCell(prev.focusedCell), relevantCell(next.focusedCell)) &&
    Object.is(relevantCell(prev.editingCell), relevantCell(next.editingCell)) &&
    previousRange.every((value, index) => value === nextRange[index]) &&
    (prev.editingCell?.rowId !== prev.rowId ||
      next.editingCell?.rowId !== next.rowId ||
      prev.draftValue === next.draftValue) &&
    (prev.dirtyCellMap === next.dirtyCellMap ||
      next.columns.every((column) => {
        const key = `${String(next.rowId)}:${String(column.field)}`;
        return Boolean(prev.dirtyCellMap?.[key]) === Boolean(next.dirtyCellMap?.[key]);
      })) &&
    // Only merged cells depend on other rows' values; ordinary rows need the last-row boundary.
    (hasMergedColumns
      ? prev.mergeInfoByColumn === next.mergeInfoByColumn &&
        prev.visibleRows === next.visibleRows
      : prev.visibleRows.length === next.visibleRows.length) &&
    prev.rowKey === next.rowKey &&
    Object.is(prev.getCellError, next.getCellError) &&
    Object.is(prev.getPinOffset, next.getPinOffset) &&
    Object.is(prev.cellAdornment, next.cellAdornment) &&
    prev.showCheckbox === next.showCheckbox &&
    prev.showFormAction === next.showFormAction &&
    prev.formActionPinnedShadow === next.formActionPinnedShadow &&
    Object.is(prev.onOpenRowForm, next.onOpenRowForm)
  );
};

const GridRowInner = <T extends object>({
  row,
  rowId,
  rowIndex,
  renderIndex,
  columns,
  renderedColumnIndexes,
  columnLine,
  stripeRows,
  isSelected,
  rowHeight,
  defaultRowHeight,
  minRowHeight,
  maxRowHeight,
  resizableRows,
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
  visibleRows,
  rowKey,
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
  onUpdateCell,
  onUpdateRow,
  getCellError,
  onStopEdit,
  onCellRef,
  onEditingCellRef,
  onUpdateRowHeight,
  getMergeEditing,
  getMerged,
  getPinOffset,
  cellAdornment,
  showCheckbox = true,
  showFormAction = false,
  formActionPinnedShadow = true,
  onOpenRowForm,
  latestPropsRef,
}: GridRowProps<T>) => {
  const resizeStateRef = useRef<{
    startY: number;
    startHeight: number;
  } | null>(null);
  const previousDragCellRef = useRef<{
    rowId: F1GridRowId;
    columnIndex: number;
  } | null>(null);

  const isSameCell = useCallback(
    (
      first: { rowId: F1GridRowId; columnIndex: number } | undefined,
      second: { rowId: F1GridRowId; columnIndex: number },
    ) => {
      return (
        first?.rowId === second.rowId &&
        first?.columnIndex === second.columnIndex
      );
    },
    [],
  );

  const getCell = useCallback(
    (rowId: F1GridRowId, columnIndex: number) => ({ rowId, columnIndex }),
    [],
  );

  const rowSelectionMeta = useMemo(() => {
    const selectedRangeHasMultipleCells =
      !!selectedCellRange &&
      (selectedCellRange.anchor.rowId !== selectedCellRange.focus.rowId ||
        selectedCellRange.anchor.columnIndex !==
          selectedCellRange.focus.columnIndex);
    const copiedRangeHasMultipleCells =
      !!copiedCellRange &&
      (copiedCellRange.anchor.rowId !== copiedCellRange.focus.rowId ||
        copiedCellRange.anchor.columnIndex !==
          copiedCellRange.focus.columnIndex);

    return {
      selectedRangeHasMultipleCells,
      copiedRangeHasMultipleCells,
    };
  }, [copiedCellRange, selectedCellRange]);

  const handleCellMouseDown = useCallback(
    (
      event: MouseEvent<HTMLElement>,
      cell: { rowId: F1GridRowId; columnIndex: number },
    ) => {
      if (event.button === 2) {
        onSetFocusedCell(cell);
        onSelectRow(rowId, event);
      }
      if (event.button !== 0) return;

      dragSelectionStateRef.current = {
        active: true,
        previousCell: cell,
      };
      previousDragCellRef.current = cell;
      onCellSelectionStart(cell);
    },
    [
      dragSelectionStateRef,
      onCellSelectionStart,
      onSelectRow,
      onSetFocusedCell,
      rowId,
      selectedCellRange,
      latestPropsRef,
    ],
  );

  const handleCellMouseEnter = useCallback(
    (cell: { rowId: F1GridRowId; columnIndex: number }) => {
      const dragState = dragSelectionStateRef.current;
      const dragAlreadyActive =
        latestPropsRef?.current.isCellSelectionDragging ||
        dragState.active || !!latestPropsRef?.current.selectedCellRange;

      if (!dragAlreadyActive) return;

      const previousCell =
        dragState.previousCell ?? previousDragCellRef.current;
      const isSameDragCell =
        previousCell?.rowId === cell.rowId &&
        previousCell?.columnIndex === cell.columnIndex;

      if (isSameDragCell) return;

      dragState.previousCell = cell;
      previousDragCellRef.current = cell;
      onCellSelectionDrag(cell);
    },
    [
      dragSelectionStateRef,
      isCellSelectionDragging,
      onCellSelectionDrag,
      selectedCellRange,
      latestPropsRef,
    ],
  );

  useEffect(() => {
    if (!selectedCellRange) {
      previousDragCellRef.current = null;
      dragSelectionStateRef.current.previousCell = null;
    }
  }, [dragSelectionStateRef, selectedCellRange]);

  useEffect(() => {
    function handlePointerMove(event: PointerEvent) {
      const resizeState = resizeStateRef.current;
      if (!resizeState) return;
      onUpdateRowHeight(
        rowId,
        Math.min(
          maxRowHeight,
          Math.max(
            minRowHeight,
            resizeState.startHeight + event.clientY - resizeState.startY,
          ),
        ),
      );
    }

    function handlePointerUp() {
      resizeStateRef.current = null;
    }

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [maxRowHeight, minRowHeight, onUpdateRowHeight, rowId]);

  const isActiveMergeGroup = useCallback(
    (
      column: F1GridColumn<T>,
      columnIndex: number,
      mergeInfo: { isStart: boolean; span: number } | undefined,
    ): boolean => {
      if (!column.mergeRows || !mergeInfo?.isStart || mergeInfo.span <= 1) {
        return false;
      }

      const activeCells = [focusedCell, editingCell].filter(
        (
          activeCell,
        ): activeCell is { rowId: F1GridRowId; columnIndex: number } =>
          activeCell?.columnIndex === columnIndex,
      );

      return activeCells.some((activeCell) =>
        visibleRows
          .slice(rowIndex, rowIndex + mergeInfo.span)
          .some((item) => String(item[rowKey]) === String(activeCell.rowId)),
      );
    },
    [editingCell, focusedCell, rowIndex, rowKey, visibleRows],
  );

  return (
    <Box
      key={getStateKey(rowId)}
      role="row"
      aria-selected={isSelected}
      data-f1-grid-row-id={String(rowId)}
      sx={{ display: 'contents' }}
    >
      {showCheckbox ? (
        <Box
          sx={{
            gridColumn: 1,
            gridRow: renderIndex + 1,
            display: 'flex',
            justifyContent: 'center',
            borderTop: 1,
            borderBottom: rowIndex === visibleRows.length - 1 ? 1 : 0,
            borderColor: 'divider',
            position: 'sticky',
            left: 0,
            zIndex: 6,
            backgroundColor: (theme) =>
              isSelected
                ? theme.palette.mode === 'dark'
                  ? 'rgb(30, 48, 80)'
                  : 'rgb(232, 238, 252)'
                : theme.palette.background.paper,
          }}
        >
          <Checkbox
            size="small"
            aria-label={`${rowId} 행 선택`}
            checked={isSelected}
            onClick={(event) => {
              event.stopPropagation();
              onSetRowSelection(rowId, !isSelected);
            }}
          />
        </Box>
      ) : null}
      {columns.map((column, columnIndex) => {
        if (renderedColumnIndexes && !renderedColumnIndexes.has(columnIndex)) {
          return null;
        }

        const cell = getCell(rowId, columnIndex);
        const editing = isSameCell(editingCell, cell);
        const focused = isSameCell(focusedCell, cell);
        const isLastRow = rowIndex === visibleRows.length - 1;
        const selectedRangeHasMultipleCells =
          rowSelectionMeta.selectedRangeHasMultipleCells;
        const copiedRangeHasMultipleCells =
          rowSelectionMeta.copiedRangeHasMultipleCells;
        const selected =
          !!selectedCellRangeBounds &&
          rowIndex >= selectedCellRangeBounds.minRowIndex &&
          rowIndex <= selectedCellRangeBounds.maxRowIndex &&
          columnIndex >= selectedCellRangeBounds.minColumnIndex &&
          columnIndex <= selectedCellRangeBounds.maxColumnIndex;
        const isSelectedRangeStart =
          selectedRangeHasMultipleCells &&
          !!selectedCellRange &&
          String(rowId) === String(selectedCellRange.anchor.rowId) &&
          columnIndex === selectedCellRange.anchor.columnIndex;
        const isCopiedRangeStart =
          copiedRangeHasMultipleCells &&
          !!copiedCellRange &&
          String(rowId) === String(copiedCellRange.anchor.rowId) &&
          columnIndex === copiedCellRange.anchor.columnIndex;
        const value = column.getValue?.(row) ?? row[column.field];
        const mergeEditing = getMergeEditing(columnIndex);
        const mergeInfo = mergeEditing
          ? undefined
          : mergeInfoByColumn[columnIndex]?.[rowIndex];
        const merged = getMerged(rowIndex, columnIndex, value);
        const mergeEndsAtLastRow =
          mergeInfo?.isStart &&
          mergeInfo.span > 1 &&
          rowIndex + mergeInfo.span === visibleRows.length;
        const mergeGroupActive = isActiveMergeGroup(
          column,
          columnIndex,
          mergeInfo,
        );

        return (
          <GridCell
            key={String(column.field)}
            row={row}
            rowId={rowId}
            column={column}
            columnIndex={columnIndex}
            showCheckbox={showCheckbox}
            columnLine={columnLine}
            stripeRows={stripeRows}
            focused={focused}
            editing={editing}
            selected={Boolean(selected)}
            selectionRangeActive={selectedRangeHasMultipleCells}
            rangeStart={isSelectedRangeStart || isCopiedRangeStart}
            merged={merged}
            mergeInfo={mergeInfo}
            mergeEndsAtLastRow={mergeEndsAtLastRow}
            mergeGroupActive={mergeGroupActive}
            rowHeight={rowHeight}
            defaultRowHeight={defaultRowHeight}
            rowIndex={rowIndex}
            renderRowIndex={renderIndex}
            isLastRow={isLastRow}
            draftValue={editing ? draftValue : ''}
            dirtyCell={Boolean(
              dirtyCellMap[`${String(rowId)}:${String(column.field)}`],
            )}
            onFocus={() => {
              const focusRowIndex =
                column.mergeRows && merged
                  ? getMergeGroupStartIndex(visibleRows, rowIndex, column.field)
                  : rowIndex;
              const focusRow = visibleRows[focusRowIndex];
              onSetFocusedCell({
                rowId: focusRow[rowKey] as F1GridRowId,
                columnIndex,
              });
              onSelectRow(rowId, {} as MouseEvent<HTMLElement>);
            }}
            onMouseDown={(event: MouseEvent<HTMLElement>) =>
              handleCellMouseDown(event, cell)
            }
            onMouseEnter={() => handleCellMouseEnter(cell)}
            onMouseUp={onCellSelectionEnd}
            onBlur={onCommitEdit}
            onDoubleClick={() => onStartEdit(rowId, columnIndex)}
            onDraftChange={onDraftChange}
            onKeyDown={onKeyDown}
            onSelectChange={(selectedValue: unknown) => {
              onDraftChange(String(selectedValue));
              if (column.type === 'user') {
                const changes =
                  column.onValueChange?.(row, selectedValue) ??
                  ({ [column.field]: selectedValue } as Partial<T>);
                onUpdateRow(changes);
                onStopEdit();
                return;
              }
              onUpdateCell(column.field, selectedValue);
              onStopEdit();
            }}
            onCheckboxChange={(checked: boolean) => {
              const patch = column.onValueChange?.(row, checked);
              if (patch) {
                onUpdateRow(patch);
              } else {
                onUpdateCell(column.field, checked);
              }
            }}
            onCodePick={() => {
              const applyPatch = (patch: Partial<T>) => {
                onUpdateRow(patch);
              };
              const patch = column.onOpenCodePicker?.(row, applyPatch);
              onStopEdit();
              if (patch) applyPatch(patch);
            }}
            errorMessage={getCellError(rowId, column.field)}
            onCellRef={(node: HTMLElement | null) => {
              onCellRef(rowId, columnIndex, node);
              if (editing) onEditingCellRef(node);
            }}
            pinOffset={getPinOffset(column)}
            adornment={cellAdornment?.(row, column)}
          />
        );
      })}
      {showFormAction && onOpenRowForm ? (
        <GridFormActionCell
          rowId={rowId}
          rowIndex={renderIndex}
          stripeRowIndex={rowIndex}
          columnIndex={(showCheckbox ? 2 : 1) + columns.length}
          isLastRow={rowIndex === visibleRows.length - 1}
          stripeRows={stripeRows}
          pinnedShadow={formActionPinnedShadow}
          onEdit={() => onOpenRowForm(row)}
        />
      ) : null}
      {resizableRows ? (
        <Box
          component="button"
          type="button"
          role="button"
          aria-label={`${rowId} 행 높이 조절`}
          aria-valuemin={minRowHeight}
          aria-valuemax={maxRowHeight}
          aria-valuenow={rowHeight}
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => {
            if (latestPropsRef?.current.isCellSelectionDragging) {
              event.preventDefault();
              event.stopPropagation();
              return;
            }

            event.preventDefault();
            event.stopPropagation();
            resizeStateRef.current = {
              startY: event.clientY,
              startHeight: rowHeight,
            };
          }}
          onKeyDown={(event) => {
            if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
            event.preventDefault();
            event.stopPropagation();
            const direction = event.key === 'ArrowDown' ? 4 : -4;
            onUpdateRowHeight(rowId, rowHeight + direction);
          }}
          sx={{
            gridColumn: '1 / -1',
            gridRow: renderIndex + 1,
            alignSelf: 'end',
            justifySelf: 'stretch',
            height: 6,
            minHeight: 6,
            p: 0,
            border: 0,
            bgcolor: 'transparent',
            cursor: 'row-resize',
            pointerEvents: 'auto',
            '[data-f1-grid-selecting="true"] &': {
              cursor: 'default',
              pointerEvents: 'none',
            },
            zIndex: 2,
            '&:focus-visible': {
              outline: '2px solid',
              outlineColor: 'primary.main',
            },
          }}
        />
      ) : null}
    </Box>
  );
};

const MemoizedGridRow = memo(GridRowInner, areGridRowPropsEqual) as typeof GridRowInner;

export function GridRow<T extends object>(props: GridRowProps<T>) {
  const latestProps = useRef(props);
  latestProps.current = props;

  const handlers = useMemo(() => ({
    onSelectRow: (...args: Parameters<GridRowProps<T>['onSelectRow']>) => latestProps.current.onSelectRow(...args),
    onSetRowSelection: (...args: Parameters<GridRowProps<T>['onSetRowSelection']>) => latestProps.current.onSetRowSelection(...args),
    onSetFocusedCell: (...args: Parameters<GridRowProps<T>['onSetFocusedCell']>) => latestProps.current.onSetFocusedCell(...args),
    onCellSelectionStart: (...args: Parameters<GridRowProps<T>['onCellSelectionStart']>) => latestProps.current.onCellSelectionStart(...args),
    onCellSelectionDrag: (...args: Parameters<GridRowProps<T>['onCellSelectionDrag']>) => latestProps.current.onCellSelectionDrag(...args),
    onCellSelectionEnd: () => latestProps.current.onCellSelectionEnd(),
    onCommitEdit: () => latestProps.current.onCommitEdit(),
    onStartEdit: (...args: Parameters<GridRowProps<T>['onStartEdit']>) => latestProps.current.onStartEdit(...args),
    onDraftChange: (...args: Parameters<GridRowProps<T>['onDraftChange']>) => latestProps.current.onDraftChange(...args),
    onKeyDown: (...args: Parameters<GridRowProps<T>['onKeyDown']>) => latestProps.current.onKeyDown(...args),
    onUpdateCell: (...args: Parameters<GridRowProps<T>['onUpdateCell']>) => latestProps.current.onUpdateCell(...args),
    onUpdateRow: (...args: Parameters<GridRowProps<T>['onUpdateRow']>) => latestProps.current.onUpdateRow(...args),
    onStopEdit: () => latestProps.current.onStopEdit(),
    onCellRef: (...args: Parameters<GridRowProps<T>['onCellRef']>) => latestProps.current.onCellRef(...args),
    onEditingCellRef: (...args: Parameters<GridRowProps<T>['onEditingCellRef']>) => latestProps.current.onEditingCellRef(...args),
    onUpdateRowHeight: (...args: Parameters<GridRowProps<T>['onUpdateRowHeight']>) => latestProps.current.onUpdateRowHeight(...args),
    onOpenRowForm: (row: T) => latestProps.current.onOpenRowForm?.(row),
  }), []);

  return <MemoizedGridRow {...props} {...handlers} latestPropsRef={latestProps}
    onOpenRowForm={props.onOpenRowForm ? handlers.onOpenRowForm : undefined} />;
}

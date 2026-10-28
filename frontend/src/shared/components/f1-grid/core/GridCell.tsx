import {
  memo,
  useCallback,
  useMemo,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  useRef,
} from 'react';
import { Box, Checkbox } from '@mui/material';
import { CellEditor } from '../editing/CellEditor';
import type {
  F1GridColumn,
  F1GridDraftValue,
  F1GridRowId,
} from '../types/grid.types';
import {
  getCellDisplayValue,
  isCellEditable,
  isGridCheckboxChecked,
} from '../utils/grid.utils';

type GridCellProps<T extends object> = {
  row: T;
  rowId: F1GridRowId;
  column: F1GridColumn<T>;
  columnIndex: number;
  showCheckbox?: boolean;
  columnLine: boolean;
  stripeRows: boolean;
  focused: boolean;
  editing: boolean;
  selected: boolean;
  selectionRangeActive?: boolean;
  rangeStart?: boolean;
  merged: boolean;
  mergeInfo?: { isStart: boolean; span: number };
  mergeEndsAtLastRow?: boolean;
  mergeGroupActive?: boolean;
  rowHeight: number;
  defaultRowHeight: number;
  rowIndex: number;
  renderRowIndex?: number;
  isLastRow?: boolean;
  draftValue: F1GridDraftValue;
  dirtyCell?: boolean;
  onFocus: () => void;
  onMouseDown: (event: MouseEvent<HTMLElement>) => void;
  onMouseEnter: () => void;
  onMouseUp: () => void;
  onBlur?: () => void;
  onDoubleClick: () => void;
  onDraftChange: (value: F1GridDraftValue) => void;
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
  onSelectChange: (value: unknown) => void;
  onCheckboxChange: (checked: boolean) => void;
  onCodePick: () => void;
  errorMessage?: string;
  onCellRef: (node: HTMLElement | null) => void;
  pinOffset?: { side: 'left' | 'right'; offset: number; shadow?: boolean };
  adornment?: ReactNode;
};

function toJustifyContent(align: 'left' | 'center' | 'right') {
  if (align === 'right') return 'flex-end';
  if (align === 'center') return 'center';
  return 'flex-start';
}

export function getGridCellBottomBorder(
  isLastRow: boolean | undefined,
  merged: boolean,
  isMergeStart: boolean | undefined,
  mergeSpan?: number,
  mergeEndsAtLastRow = false,
) {
  if (merged && !isMergeStart) return 0;
  if (isLastRow || mergeEndsAtLastRow) return 1;
  if (isMergeStart && mergeSpan && mergeSpan > 1) return 0;
  return undefined;
}

const areGridCellPropsEqual = <T extends object>(
  prev: Readonly<GridCellProps<T>>,
  next: Readonly<GridCellProps<T>>,
): boolean => {
  return (
    prev.row === next.row &&
    prev.rowId === next.rowId &&
    prev.column === next.column &&
    prev.columnIndex === next.columnIndex &&
    prev.showCheckbox === next.showCheckbox &&
    prev.columnLine === next.columnLine &&
    prev.stripeRows === next.stripeRows &&
    prev.focused === next.focused &&
    prev.editing === next.editing &&
    prev.selected === next.selected &&
    prev.selectionRangeActive === next.selectionRangeActive &&
    prev.rangeStart === next.rangeStart &&
    prev.merged === next.merged &&
    Object.is(prev.mergeInfo, next.mergeInfo) &&
    prev.mergeEndsAtLastRow === next.mergeEndsAtLastRow &&
    prev.mergeGroupActive === next.mergeGroupActive &&
    prev.rowHeight === next.rowHeight &&
    prev.defaultRowHeight === next.defaultRowHeight &&
    prev.rowIndex === next.rowIndex &&
    prev.renderRowIndex === next.renderRowIndex &&
    prev.isLastRow === next.isLastRow &&
    prev.draftValue === next.draftValue &&
    prev.dirtyCell === next.dirtyCell &&
    prev.errorMessage === next.errorMessage &&
    prev.pinOffset?.side === next.pinOffset?.side &&
    prev.pinOffset?.offset === next.pinOffset?.offset &&
    prev.pinOffset?.shadow === next.pinOffset?.shadow &&
    Object.is(prev.adornment, next.adornment)
  );
};

const GridCellInner = <T extends object>({
  row,
  rowId,
  column,
  columnIndex,
  showCheckbox = true,
  columnLine,
  stripeRows,
  focused,
  editing,
  selected,
  selectionRangeActive = false,
  rangeStart = false,
  merged,
  mergeInfo,
  mergeEndsAtLastRow = false,
  mergeGroupActive = false,
  rowHeight,
  defaultRowHeight,
  rowIndex,
  renderRowIndex = rowIndex,
  isLastRow,
  draftValue,
  dirtyCell = false,
  onFocus,
  onMouseDown,
  onMouseEnter,
  onMouseUp,
  onBlur,
  onDoubleClick,
  onDraftChange,
  onKeyDown,
  onSelectChange,
  onCheckboxChange,
  onCodePick,
  errorMessage,
  onCellRef,
  pinOffset,
  adornment,
}: GridCellProps<T>) => {
  const cellAnchorRef = useRef<HTMLDivElement | null>(null);
  const value = column.getValue?.(row) ?? row[column.field];
  const editable = isCellEditable(column, row);
  const cellRenderContext = useMemo(
    () => ({
      row,
      rowId,
      column,
      field: column.field,
      value,
      rowIndex,
    }),
    [column, row, rowId, rowIndex, value],
  );
  const displayValue = useMemo(
    () =>
      column.type === 'rownumber'
        ? String(rowIndex + 1)
        : getCellDisplayValue(column, value as T[keyof T]),
    [column, rowIndex, value],
  );
  const customCellProps = useMemo(
    () => column.getCellProps?.(cellRenderContext) ?? {},
    [cellRenderContext, column],
  );
  const customCellStyle = useMemo(
    () => column.getCellStyle?.(cellRenderContext),
    [cellRenderContext, column],
  );
  const mergedCellStyle = useMemo(
    () => ({
      ...(customCellStyle ?? {}),
      ...(customCellProps.style ?? {}),
    }),
    [customCellStyle, customCellProps.style],
  );
  const hideRangeStartBorder = rangeStart && !editing;
  const activeHighlight =
    !selectionRangeActive &&
    (focused || editing || mergeGroupActive) &&
    !(selected && !editing && !mergeGroupActive && (rangeStart || !focused));
  const mergedCellHidden = Boolean(merged && !mergeInfo?.isStart);
  const cellClassName = useMemo(
    () => [customCellProps.className].filter(Boolean).join(' ') || undefined,
    [customCellProps.className],
  );
  const handleBlurCapture = useCallback(
    (event: FocusEvent<HTMLElement>) => {
      const nextTarget = event.relatedTarget;
      if (
        nextTarget instanceof Node &&
        event.currentTarget.contains(nextTarget)
      ) {
        return;
      }
      const currentGrid = event.currentTarget.closest('[role="grid"]');
      const focusMovesIntoEditorPopup =
        nextTarget instanceof Node &&
        Array.from(
          document.querySelectorAll(
            '.MuiPopover-root, .MuiMenu-paper, .MuiDialog-root, .MuiModal-root, .MuiAutocomplete-popper',
          ),
        ).some(
          (popup) =>
            popup.contains(nextTarget) && !popup.contains(currentGrid),
        );
      if (focusMovesIntoEditorPopup) return;
      onBlur?.();
    },
    [onBlur],
  );
  const handleCellRef = useCallback(
    (node: HTMLElement | null) => {
      cellAnchorRef.current = node as HTMLDivElement | null;
      onCellRef(node);
    },
    [onCellRef],
  );

  return (
    <Box
      key={String(column.field)}
      role="gridcell"
      aria-label={
        customCellProps['aria-label'] ??
        (adornment && !merged ? displayValue : undefined)
      }
      data-grid-error={errorMessage}
      data-dirty-cell={dirtyCell ? 'true' : 'false'}
      data-f1-grid-column-line={String(columnLine)}
      data-f1-grid-striped={String(stripeRows && rowIndex % 2 === 1)}
      title={customCellProps.title ?? errorMessage ?? undefined}
      className={cellClassName}
      style={mergedCellStyle}
      tabIndex={focused ? 0 : -1}
      ref={handleCellRef}
      onClick={onFocus}
      onMouseDown={onMouseDown}
      onMouseEnter={onMouseEnter}
      onMouseUp={onMouseUp}
      onBlurCapture={handleBlurCapture}
      onDoubleClick={onDoubleClick}
      onKeyDown={onKeyDown}
      data-grid-selected={selected ? 'true' : 'false'}
      sx={{
        gridColumn: columnIndex + (showCheckbox ? 2 : 1),
        minHeight: 0,
        minWidth: 0,
        width: '100%',
        maxWidth: '100%',
        overflow: activeHighlight ? 'visible' : 'hidden',
        boxSizing: 'border-box',
        p: column.type === 'checkbox' ? 0.25 : 0.5,
        display: 'flex',
        alignItems: 'center',
        alignSelf: 'stretch',
        height: '100%',
        justifyContent: toJustifyContent(
          column.align ??
            (column.type === 'number' || column.type === 'rownumber'
              ? 'right'
              : 'left'),
        ),
        cursor: editing ? 'text' : 'default',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        borderLeft: hideRangeStartBorder
          ? 0
          : columnLine && columnIndex > 0
            ? 1
            : 0,
        borderLeftColor:
          hideRangeStartBorder || activeHighlight ? 'transparent' : 'divider',
        gridRow: mergeInfo?.isStart
          ? `${renderRowIndex + 1} / span ${mergeInfo.span}`
          : renderRowIndex + 1,
        borderTop: hideRangeStartBorder ? 0 : merged ? 0 : 1,
        borderBottom: getGridCellBottomBorder(
          isLastRow,
          merged,
          mergeInfo?.isStart,
          mergeInfo?.span,
          mergeEndsAtLastRow,
        ),
        borderColor:
          hideRangeStartBorder || activeHighlight ? 'transparent' : 'divider',
        opacity: mergedCellHidden ? 0 : 1,
        pointerEvents: 'auto',
        position: pinOffset ? 'sticky' : 'relative',
        left: pinOffset?.side === 'left' ? pinOffset.offset : undefined,
        right: pinOffset?.side === 'right' ? pinOffset.offset : undefined,
        zIndex: pinOffset ? 2 : undefined,
        isolation: pinOffset ? 'isolate' : undefined,
        bgcolor: errorMessage ? 'error.lighter' : undefined,
        boxShadow: pinOffset
          ? pinOffset.shadow === false
            ? undefined
            : pinOffset.side === 'left'
              ? '2px 0 4px -2px rgba(0, 0, 0, 0.32)'
              : '-2px 0 4px -2px rgba(0, 0, 0, 0.32)'
          : errorMessage
            ? 'inset 0 0 0 1px'
            : undefined,
        backgroundColor:
          selected && !focused && !editing
            ? 'rgba(25, 118, 210, 0.045)'
            : stripeRows && rowIndex % 2 === 1 && !errorMessage
              ? pinOffset
                ? 'background.paper'
                : 'rgba(148, 163, 184, 0.04)'
              : pinOffset
                ? 'background.paper'
                : undefined,
        backgroundImage:
          stripeRows && rowIndex % 2 === 1 && !errorMessage && pinOffset
            ? 'linear-gradient(90deg, rgba(148, 163, 184, 0.04), rgba(148, 163, 184, 0.04))'
            : undefined,
        backgroundRepeat:
          stripeRows && rowIndex % 2 === 1 && !errorMessage && pinOffset
            ? 'no-repeat'
            : undefined,
        backgroundSize:
          stripeRows && rowIndex % 2 === 1 && !errorMessage && pinOffset
            ? '100% 100%'
            : undefined,
        color: errorMessage ? 'error.main' : undefined,
        outline: activeHighlight ? '2px solid' : 'none',
        outlineColor: errorMessage ? 'error.main' : 'primary.main',
        outlineOffset: -2,
        textAlign:
          column.align ?? (column.type === 'number' ? 'right' : 'left'),
      }}
    >
      {dirtyCell && !editing ? (
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: 0,
            height: 0,
            borderTop: '8px solid',
            borderTopColor: 'error.main',
            borderRight: '8px solid transparent',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />
      ) : null}
      {merged ? null : column.type === 'checkbox' ? (
        <Checkbox
          size="small"
          checked={isGridCheckboxChecked(value)}
          disabled={!editable}
          slotProps={{
            input: {
              'aria-label': `${column.headerName} ${rowId}`,
            },
          }}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => {
            if (!editable) return;
            onCheckboxChange(event.target.checked);
          }}
        />
      ) : editing ? (
        <CellEditor
          column={column}
          value={String(draftValue ?? '')}
          userValue={draftValue}
          userAnchorEl={cellAnchorRef.current}
          onChange={onDraftChange}
          onUserChange={onDraftChange}
          onCommitEdit={() => onBlur?.()}
          onKeyDown={onKeyDown}
          onSelectChange={onSelectChange}
          onCodePick={onCodePick}
        />
      ) : column.renderCell ? (
        <>
          {adornment}
          {column.renderCell(cellRenderContext)}
        </>
      ) : (
        <>
          {adornment}
          <Box
            component="span"
            title={displayValue}
            sx={{
              display: 'block',
              flex: '1 1 auto',
              width: '100%',
              maxWidth: '100%',
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              cursor: 'inherit',
              userSelect: 'none',
              WebkitUserSelect: 'none',
              whiteSpace:
                column.wrapText && rowHeight > defaultRowHeight
                  ? 'normal'
                  : 'nowrap',
              overflowWrap:
                column.wrapText && rowHeight > defaultRowHeight
                  ? 'anywhere'
                  : 'normal',
              wordBreak:
                column.wrapText && rowHeight > defaultRowHeight
                  ? 'break-word'
                  : 'normal',
            }}
          >
            {displayValue}
          </Box>
        </>
      )}
    </Box>
  );
};

const MemoizedGridCell = memo(GridCellInner, areGridCellPropsEqual) as typeof GridCellInner;

export function GridCell<T extends object>(props: GridCellProps<T>) {
  const latestProps = useRef(props);
  latestProps.current = props;

  // Visual memoization must not retain handlers that captured an older edit.
  const handlers = useMemo(() => ({
    onFocus: () => latestProps.current.onFocus(),
    onMouseDown: (event: MouseEvent<HTMLElement>) => latestProps.current.onMouseDown(event),
    onMouseEnter: () => latestProps.current.onMouseEnter(),
    onMouseUp: () => latestProps.current.onMouseUp(),
    onBlur: () => latestProps.current.onBlur?.(),
    onDoubleClick: () => latestProps.current.onDoubleClick(),
    onDraftChange: (value: F1GridDraftValue) => latestProps.current.onDraftChange(value),
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => latestProps.current.onKeyDown(event),
    onSelectChange: (value: unknown) => latestProps.current.onSelectChange(value),
    onCheckboxChange: (checked: boolean) => latestProps.current.onCheckboxChange(checked),
    onCodePick: () => latestProps.current.onCodePick(),
  }), []);

  return <MemoizedGridCell {...props} {...handlers} />;
}

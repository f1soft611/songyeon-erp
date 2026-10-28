import { memo, useMemo, useRef, useState, type MouseEvent } from 'react';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import FilterListIcon from '@mui/icons-material/FilterList';
import PushPinIcon from '@mui/icons-material/PushPin';
import {
  Box,
  Button,
  Checkbox,
  Divider,
  IconButton,
  ListItemIcon,
  Menu,
  MenuItem,
  Select,
  TextField,
} from '@mui/material';
import { canHideGridColumn } from '../columns/GridColumnManagement';
import { getGridColumnPinSide } from '../columns/GridColumnPin';
import { getGridFilterOperators } from '../filter/GridFilter';
import { getGridSortIndicator } from '../sorting/GridSort';
import { getAutoFitColumnWidth } from '../utils/grid.utils';
import type {
  F1GridColumn,
  F1GridFilter,
  F1GridFilterOperator,
  F1GridPinSide,
  F1GridSort,
} from '../types/grid.types';

const OPERATOR_LABELS: Record<F1GridFilterOperator, string> = {
  equals: '같음',
  notEquals: '같지 않음',
  contains: '포함',
  startsWith: '시작 문자',
  endsWith: '끝 문자',
  greaterThan: '초과',
  lessThan: '미만',
  greaterThanOrEqual: '이상',
  lessThanOrEqual: '이하',
  between: '범위',
  isEmpty: '비어 있음',
  isNotEmpty: '비어 있지 않음',
};

type GridHeaderProps<T extends object> = {
  columns: F1GridColumn<T>[];
  allColumns: F1GridColumn<T>[];
  renderedColumnIndexes?: Set<number>;
  rows: T[];
  columnLine: boolean;
  selectedAll: boolean;
  selectedCount: number;
  columnWidths: Record<string, number>;
  columnTracks: string;
  resizableColumns?: boolean;
  minColumnWidth?: number;
  showCheckbox?: boolean;
  multiSelect?: boolean;
  onResizeColumn: (column: F1GridColumn<T>, nextWidth: number) => void;
  getColumnCheckboxState: (column: F1GridColumn<T>) => {
    allChecked: boolean;
    indeterminate: boolean;
    hasEditableRows: boolean;
  };
  onToggleAllRows: () => void;
  onToggleColumnCheckbox: (column: F1GridColumn<T>, nextValue: boolean) => void;
  onToggleColumnVisibility: (column: F1GridColumn<T>, visible: boolean) => void;
  sorts: F1GridSort<T>[];
  onToggleSort: (column: F1GridColumn<T>, direction: 'asc' | 'desc') => void;
  disableSorting?: boolean;
  filters: F1GridFilter<T>[];
  onApplyFilter: (
    column: F1GridColumn<T>,
    filter: F1GridFilter<T> | undefined,
  ) => void;
  disableFiltering?: boolean;
  pinnedFields: Map<string, F1GridPinSide>;
  onPinColumn: (
    column: F1GridColumn<T>,
    side: F1GridPinSide | undefined,
  ) => void;
  leftOffsets: Record<string, number>;
  rightOffsets: Record<string, number>;
  editableColumnFields?: Set<string>;
  showFormAction?: boolean;
  formActionWidth?: number;
  formActionRightOffset?: number;
  formActionPinnedShadow?: boolean;
  onReorderColumn?: (
    sourceField: string,
    targetField: string,
    position?: 'before' | 'after',
  ) => void;
};

function GridHeaderInner<T extends object>({
  columns,
  allColumns,
  renderedColumnIndexes,
  rows,
  columnLine,
  selectedAll,
  selectedCount,
  columnWidths,
  columnTracks,
  resizableColumns = true,
  minColumnWidth = 50,
  showCheckbox = true,
  multiSelect = false,
  onResizeColumn,
  getColumnCheckboxState,
  onToggleAllRows,
  onToggleColumnCheckbox,
  onToggleColumnVisibility,
  sorts,
  onToggleSort,
  disableSorting = false,
  filters,
  onApplyFilter,
  disableFiltering = false,
  pinnedFields,
  onPinColumn,
  leftOffsets,
  rightOffsets,
  editableColumnFields,
  showFormAction = false,
  formActionWidth = 48,
  formActionRightOffset = 0,
  formActionPinnedShadow = true,
  onReorderColumn,
}: GridHeaderProps<T>) {
  const [menuColumn, setMenuColumn] = useState<F1GridColumn<T>>();
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [headerMenuAnchor, setHeaderMenuAnchor] = useState<HTMLElement | null>(
    null,
  );
  const [columnListAnchor, setColumnListAnchor] = useState<HTMLElement | null>(
    null,
  );
  const [filterAnchor, setFilterAnchor] = useState<HTMLElement | null>(null);
  const [draggedColumnField, setDraggedColumnField] = useState<string | null>(
    null,
  );
  const [dropTargetField, setDropTargetField] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<'before' | 'after' | null>(
    null,
  );
  const [filterDraft, setFilterDraft] = useState<{
    operator: F1GridFilterOperator;
    value: string;
    value2: string;
  }>({ operator: 'contains', value: '', value2: '' });

  function handleResizeStart(
    event: MouseEvent<HTMLElement>,
    column: F1GridColumn<T>,
  ) {
    event.preventDefault();
    event.stopPropagation();
    const startX = event.clientX;
    const currentWidth =
      columnWidths[String(column.field)] ?? column.width ?? 140;

    function handleMouseMove(e: globalThis.MouseEvent) {
      const delta = e.clientX - startX;
      const nextWidth = Math.max(minColumnWidth, currentWidth + delta);
      onResizeColumn(column, nextWidth);
    }

    function handleMouseUp() {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }

  function handleAutoFitColumn(column: F1GridColumn<T>) {
    const nextWidth = getAutoFitColumnWidth(column, rows, {
      minWidth: minColumnWidth,
    });
    onResizeColumn(column, nextWidth);
  }

  function closeMenus() {
    setMenuAnchor(null);
    setHeaderMenuAnchor(null);
    setColumnListAnchor(null);
    setFilterAnchor(null);
  }

  function openColumnMenu(
    event: MouseEvent<HTMLElement>,
    column: F1GridColumn<T>,
  ) {
    event.stopPropagation();
    setMenuColumn(column);
    setMenuAnchor(event.currentTarget);
    setHeaderMenuAnchor(event.currentTarget);
  }

  function openFilterPopover(event: MouseEvent<HTMLElement>) {
    event.stopPropagation();
    const existing = menuColumn
      ? filters.find((filter) => filter.field === menuColumn.field)
      : undefined;
    setFilterDraft({
      operator: existing?.operator ?? 'contains',
      value: existing?.value === undefined ? '' : String(existing.value),
      value2: existing?.value2 === undefined ? '' : String(existing.value2),
    });
    setMenuAnchor(null);
    setFilterAnchor(headerMenuAnchor);
  }

  function applyFilterDraft() {
    if (!menuColumn) return;
    if (
      filterDraft.operator === 'isEmpty' ||
      filterDraft.operator === 'isNotEmpty'
    ) {
      onApplyFilter(menuColumn, {
        field: menuColumn.field,
        operator: filterDraft.operator,
      });
    } else if (filterDraft.value === '') {
      onApplyFilter(menuColumn, undefined);
    } else {
      onApplyFilter(menuColumn, {
        field: menuColumn.field,
        operator: filterDraft.operator,
        value:
          menuColumn.type === 'checkbox'
            ? filterDraft.value === 'true'
            : filterDraft.value,
        value2: filterDraft.value2 === '' ? undefined : filterDraft.value2,
      });
    }
    closeMenus();
  }

  function clearFilterDraft() {
    if (!menuColumn) return;
    onApplyFilter(menuColumn, undefined);
    closeMenus();
  }

  const activeOperator = filterDraft.operator;
  const needsValue =
    activeOperator !== 'isEmpty' && activeOperator !== 'isNotEmpty';
  const needsSecondValue = activeOperator === 'between';

  // pin된 컬럼은 그룹 라벨에서 제외한다. 나머지 컬럼은 그룹이 없으면 위/아래가
  // 한 셀로 세로 병합되고, 그룹이 있으면 그룹 라벨(1행) + 컬럼명(2행)으로 나뉜다.
  type GroupLabelSegment = { label: string; startIndex: number; span: number };

  const groupLabelSegments: GroupLabelSegment[] = [];
  for (let i = 0; i < columns.length; ) {
    const column = columns[i];
    if (!column.headerGroup || pinnedFields.has(String(column.field))) {
      i += 1;
      continue;
    }
    const label = column.headerGroup;
    const startIndex = i;
    let span = 0;
    while (
      i < columns.length &&
      columns[i].headerGroup === label &&
      !pinnedFields.has(String(columns[i].field))
    ) {
      span += 1;
      i += 1;
    }
    groupLabelSegments.push({ label, startIndex, span });
  }

  const hasGroups = groupLabelSegments.length > 0;

  function isGroupedColumn(column: F1GridColumn<T>): boolean {
    return (
      Boolean(column.headerGroup) && !pinnedFields.has(String(column.field))
    );
  }

  const groupLabelNodes = groupLabelSegments.map((segment) => (
    <Box
      key={`group-${segment.label}-${segment.startIndex}`}
      role="columnheader"
      sx={{
        gridColumn: `${(showCheckbox ? 2 : 1) + segment.startIndex} / span ${segment.span}`,
        gridRow: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 1,
        py: 0.5,
        borderRight: 1,
        borderRightColor: 'divider',
        borderLeft: columnLine ? 1 : 0,
        borderLeftColor: 'divider',
        color: 'text.primary',
        fontSize: 'inherit',
        fontWeight: 700,
        lineHeight: 1.2,
        minHeight: 28,
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      {segment.label}
    </Box>
  ));

  return (
    <>
      <Box
        role="row"
        sx={{
          display: 'grid',
          gridTemplateColumns: columnTracks,
          gridTemplateRows: hasGroups ? 'auto auto' : undefined,
          minWidth: 'max-content',
          bgcolor: 'action.hover',
          fontWeight: 700,
          isolation: 'isolate',
        }}
      >
        {showCheckbox ? (
          <Box
            role="columnheader"
            sx={{
              gridColumn: 1,
              gridRow: hasGroups ? '1 / span 2' : undefined,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              position: 'sticky',
              left: 0,
              zIndex: 4,
              backgroundColor: (theme) =>
                theme.palette.mode === 'dark'
                  ? 'rgb(28, 36, 50)'
                  : 'rgb(232, 236, 244)',
            }}
          >
            {multiSelect ? (
              <Checkbox
                size="small"
                aria-label="전체 행 선택"
                checked={selectedAll}
                indeterminate={selectedCount > 0 && !selectedAll}
                onChange={onToggleAllRows}
              />
            ) : null}
          </Box>
        ) : null}
        {groupLabelNodes}
        {columns.map((column, columnIndex) => {
          if (
            renderedColumnIndexes &&
            !renderedColumnIndexes.has(columnIndex)
          ) {
            return null;
          }

          const checkboxState = column.type === 'checkbox' && column.headerCheckbox
            ? getColumnCheckboxState(column)
            : { allChecked: false, indeterminate: false, hasEditableRows: false };
          const pinSide = getGridColumnPinSide(pinnedFields, column);
          const sortIndicator = getGridSortIndicator(sorts, column.field);
          const hasFilter = filters.some(
            (filter) => filter.field === column.field,
          );
          const isEditableHeader =
            editableColumnFields?.has(String(column.field)) ?? false;
          const isMenuOpen =
            menuColumn?.field === column.field &&
            Boolean(menuAnchor || columnListAnchor || filterAnchor);
          const grouped = isGroupedColumn(column);
          const isDraggingColumn = draggedColumnField === String(column.field);
          const isDropTarget = dropTargetField === String(column.field);
          const isBeforeDrop = isDropTarget && dropPosition === 'before';
          const isAfterDrop = isDropTarget && dropPosition === 'after';

          return (
            <Box
              key={String(column.field)}
              role="columnheader"
              aria-label={column.headerName}
              draggable={Boolean(onReorderColumn) && !pinSide}
              data-drop-target={isDropTarget ? 'true' : undefined}
              data-drop-position={
                isDropTarget ? (dropPosition ?? 'before') : undefined
              }
              data-editable-column={isEditableHeader ? 'true' : undefined}
              aria-grabbed={isDraggingColumn || undefined}
              onDragStart={(event) => {
                if (!onReorderColumn || pinSide) return;
                setDraggedColumnField(String(column.field));
                setDropTargetField(null);
                setDropPosition(null);
                event.dataTransfer.setData('text/plain', String(column.field));
                event.dataTransfer.effectAllowed = 'move';
              }}
              onDragOver={(event) => {
                if (!onReorderColumn || pinSide) return;
                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';
                if (
                  draggedColumnField &&
                  draggedColumnField !== String(column.field)
                ) {
                  const rect = event.currentTarget.getBoundingClientRect();
                  const hasPointerPosition =
                    Number.isFinite(event.clientX) && rect.width > 0;
                  const nextPosition =
                    hasPointerPosition &&
                    event.clientX - rect.left < rect.width / 2
                      ? 'before'
                      : hasPointerPosition
                        ? 'after'
                        : 'before';
                  setDropTargetField(String(column.field));
                  setDropPosition(nextPosition);
                }
              }}
              onDragLeave={(event) => {
                if (!onReorderColumn || pinSide || !dropTargetField) return;
                const nextTarget = event.relatedTarget as Node | null;
                if (nextTarget && event.currentTarget.contains(nextTarget))
                  return;
                setDropTargetField(null);
                setDropPosition(null);
              }}
              onDrop={(event) => {
                if (!onReorderColumn || pinSide) return;
                event.preventDefault();
                const sourceField = event.dataTransfer.getData('text/plain');
                if (!sourceField) return;
                onReorderColumn(
                  sourceField,
                  String(column.field),
                  dropPosition ?? 'before',
                );
                setDropTargetField(null);
                setDropPosition(null);
                setDraggedColumnField(null);
              }}
              onDragEnd={() => {
                setDraggedColumnField(null);
                setDropTargetField(null);
                setDropPosition(null);
              }}
              sx={{
                gridColumn: (showCheckbox ? 2 : 1) + columnIndex,
                gridRow: hasGroups ? (grouped ? 2 : '1 / span 2') : undefined,
                px: 1,
                py: 0.5,
                minHeight: 28,
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                justifyContent:
                  column.headerAlign === 'right'
                    ? 'flex-end'
                    : column.headerAlign === 'left'
                      ? 'flex-start'
                      : 'center',
                textAlign: column.headerAlign ?? 'left',
                borderTop: grouped ? 1 : 0,
                borderTopColor: 'divider',
                borderRight: columnLine ? 0 : 1,
                borderRightColor: 'divider',
                borderLeft: columnLine && columnIndex > 0 ? 1 : 0,
                borderLeftColor: 'divider',
                minWidth: 0,
                width: '100%',
                boxSizing: 'border-box',
                position: pinSide ? 'sticky' : 'relative',
                left:
                  pinSide === 'left'
                    ? leftOffsets[String(column.field)]
                    : undefined,
                right:
                  pinSide === 'right'
                    ? rightOffsets[String(column.field)]
                    : undefined,
                zIndex: pinSide ? 3 : undefined,
                backgroundColor: isDropTarget
                  ? 'rgba(25, 118, 210, 0.08)'
                  : pinSide
                    ? (theme) =>
                        theme.palette.mode === 'dark'
                          ? 'rgb(28, 36, 50)'
                          : 'rgb(232, 236, 244)'
                    : undefined,
                border: isDropTarget ? 2 : undefined,
                borderColor: isDropTarget ? 'primary.main' : undefined,
                boxShadow: isDropTarget
                  ? 'inset 0 0 0 1px rgba(25, 118, 210, 0.35), 0 0 0 1px rgba(25, 118, 210, 0.15)'
                  : pinSide === 'left'
                    ? '2px 0 4px -2px rgba(0, 0, 0, 0.32)'
                    : pinSide === 'right'
                      ? rightOffsets[String(column.field)] ===
                        Math.max(...Object.values(rightOffsets))
                        ? '-2px 0 4px -2px rgba(0, 0, 0, 0.32)'
                        : undefined
                      : undefined,
                opacity: isDraggingColumn ? 0.78 : 1,
                '&::before': isBeforeDrop
                  ? {
                      content: '""',
                      position: 'absolute',
                      left: 4,
                      top: 4,
                      bottom: 4,
                      width: 3,
                      borderRadius: 999,
                      backgroundColor: 'primary.main',
                    }
                  : undefined,
                '&::after': isAfterDrop
                  ? {
                      content: '""',
                      position: 'absolute',
                      right: 4,
                      top: 4,
                      bottom: 4,
                      width: 3,
                      borderRadius: 999,
                      backgroundColor: 'primary.main',
                    }
                  : undefined,
                '& .f1-grid-col-menu-btn': {
                  opacity: isMenuOpen ? 1 : 0,
                  transition: 'opacity 0.15s ease-in-out',
                  flexShrink: 0,
                  position: 'absolute',
                  right: 4,
                  top: '50%',
                  transform: 'translateY(-50%)',
                },
                '&:hover .f1-grid-col-menu-btn, &:focus-within .f1-grid-col-menu-btn':
                  {
                    opacity: 1,
                  },
                '&:hover .f1-grid-header-content, &:focus-within .f1-grid-header-content':
                  {
                    pr: 4,
                  },
              }}
            >
              <Box
                className="f1-grid-header-content"
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent:
                    column.headerAlign === 'right'
                      ? 'flex-end'
                      : column.headerAlign === 'left'
                        ? 'flex-start'
                        : 'center',
                  gap: 0.5,
                  minWidth: 0,
                  width: '100%',
                  pr: isMenuOpen ? 4 : 0,
                }}
              >
                {column.type === 'checkbox' && column.headerCheckbox ? (
                  <Checkbox
                    size="small"
                    sx={{ p: 0.25, mr: -0.25 }}
                    checked={checkboxState.allChecked}
                    indeterminate={checkboxState.indeterminate}
                    disabled={!checkboxState.hasEditableRows}
                    slotProps={{
                      input: { 'aria-label': `${column.headerName} 전체 선택` },
                    }}
                    onChange={() =>
                      onToggleColumnCheckbox(column, !checkboxState.allChecked)
                    }
                  />
                ) : null}
                <Box
                  component="span"
                  sx={{
                    minWidth: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {column.headerName}
                </Box>
                {column.required ? (
                  <Box
                    component="span"
                    aria-label={`${column.headerName} 필수`}
                    sx={{
                      color: 'error.main',
                      fontWeight: 700,
                      lineHeight: 1,
                      ml: 0.25,
                    }}
                  >
                    *
                  </Box>
                ) : null}
                {sortIndicator ? (
                  <Box
                    component="span"
                    aria-label={`${column.headerName} 정렬 상태`}
                    sx={{ display: 'flex', alignItems: 'center', fontSize: 12 }}
                  >
                    {sortIndicator.direction === 'asc' ? (
                      <ArrowUpwardIcon fontSize="inherit" />
                    ) : (
                      <ArrowDownwardIcon fontSize="inherit" />
                    )}
                    {sorts.length > 1 ? sortIndicator.order : null}
                  </Box>
                ) : null}
                {hasFilter ? (
                  <FilterListIcon
                    fontSize="small"
                    color="primary"
                    aria-label={`${column.headerName} 필터 적용됨`}
                  />
                ) : null}
              </Box>
              <IconButton
                size="small"
                className="f1-grid-col-menu-btn"
                aria-label={`${column.headerName} 컬럼 메뉴`}
                onClick={(event) => openColumnMenu(event, column)}
              >
                <MoreVertIcon fontSize="small" />
              </IconButton>
              {resizableColumns && (
                <Box
                  role="separator"
                  aria-label={`${column.headerName} 컬럼 너비 조절`}
                  onMouseDown={(event) => handleResizeStart(event, column)}
                  onDoubleClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    handleAutoFitColumn(column);
                  }}
                  sx={{
                    position: 'absolute',
                    right: 0,
                    top: 0,
                    bottom: 0,
                    width: 6,
                    cursor: 'col-resize',
                    zIndex: 3,
                    userSelect: 'none',
                    '&:hover': {
                      bgcolor: 'primary.main',
                    },
                  }}
                />
              )}
            </Box>
          );
        })}
        {showFormAction ? (
          <Box
            role="columnheader"
            aria-label="상세"
            sx={{
              alignItems: 'center',
              backgroundColor: (theme) =>
                theme.palette.mode === 'dark'
                  ? 'rgb(28, 36, 50)'
                  : 'rgb(232, 236, 244)',
              borderLeft: 1,
              borderColor: 'divider',
              boxSizing: 'border-box',
              boxShadow: formActionPinnedShadow
                ? '-2px 0 4px -2px rgba(0, 0, 0, 0.32)'
                : undefined,
              display: 'flex',
              gridColumn: (showCheckbox ? 2 : 1) + columns.length,
              gridRow: hasGroups ? '1 / span 2' : undefined,
              justifyContent: 'center',
              minHeight: 28,
              padding: 0,
              position: 'sticky',
              right: -formActionRightOffset,
              width: formActionWidth,
              minWidth: formActionWidth,
              maxWidth: formActionWidth,
              zIndex: 4,
            }}
          >
            상세
          </Box>
        ) : null}
      </Box>
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={closeMenus}
      >
        {!disableSorting ? (
          <>
            <MenuItem
              onClick={() => {
                if (menuColumn) onToggleSort(menuColumn, 'asc');
                closeMenus();
              }}
            >
              <ListItemIcon>
                <ArrowUpwardIcon fontSize="small" />
              </ListItemIcon>
              오름차순 정렬
            </MenuItem>
            <MenuItem
              onClick={() => {
                if (menuColumn) onToggleSort(menuColumn, 'desc');
                closeMenus();
              }}
            >
              <ListItemIcon>
                <ArrowDownwardIcon fontSize="small" />
              </ListItemIcon>
              내림차순 정렬
            </MenuItem>
            <Divider />
          </>
        ) : null}
        <MenuItem
          onClick={(event) => {
            event.stopPropagation();
            setColumnListAnchor(event.currentTarget);
          }}
        >
          컬럼 목록
        </MenuItem>
        {!disableFiltering ? (
          <>
            <Divider />
            <MenuItem onClick={openFilterPopover}>
              <ListItemIcon>
                <FilterListIcon fontSize="small" />
              </ListItemIcon>
              필터
            </MenuItem>
          </>
        ) : null}
        <Divider />
        <MenuItem
          onClick={() => {
            if (menuColumn) onPinColumn(menuColumn, 'left');
            closeMenus();
          }}
        >
          <ListItemIcon>
            <PushPinIcon fontSize="small" />
          </ListItemIcon>
          왼쪽 고정
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (menuColumn) onPinColumn(menuColumn, 'right');
            closeMenus();
          }}
        >
          <ListItemIcon>
            <PushPinIcon fontSize="small" />
          </ListItemIcon>
          오른쪽 고정
        </MenuItem>
        <MenuItem
          disabled={
            !menuColumn || !getGridColumnPinSide(pinnedFields, menuColumn)
          }
          onClick={() => {
            if (menuColumn) onPinColumn(menuColumn, undefined);
            closeMenus();
          }}
        >
          고정 해제
        </MenuItem>
      </Menu>
      <Menu
        anchorEl={columnListAnchor}
        open={Boolean(columnListAnchor)}
        onClose={() => setColumnListAnchor(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      >
        {allColumns.map((column) => {
          const visible = columns.some(
            (visibleColumn) => visibleColumn.field === column.field,
          );
          const canHide = canHideGridColumn(columns, column);

          return (
            <MenuItem
              key={String(column.field)}
              dense
              onClick={(event) => event.stopPropagation()}
            >
              <Checkbox
                size="small"
                checked={visible}
                disabled={visible && !canHide}
                slotProps={{
                  input: { 'aria-label': `${column.headerName} 표시` },
                }}
                onChange={() => {
                  onToggleColumnVisibility(column, !visible);
                  closeMenus();
                }}
              />
              {column.headerName}
            </MenuItem>
          );
        })}
      </Menu>
      <Menu
        anchorEl={filterAnchor}
        open={Boolean(filterAnchor)}
        onClose={closeMenus}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        slotProps={{
          paper: {
            'aria-label': filterAnchor?.getAttribute('aria-label') ?? undefined,
          },
        }}
      >
        <Box
          sx={{
            p: 2,
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
            minWidth: 220,
          }}
        >
          {menuColumn?.type === 'checkbox' ? (
            <Select
              size="small"
              value={filterDraft.value}
              onChange={(event) =>
                setFilterDraft((current) => ({
                  ...current,
                  operator: 'equals',
                  value: event.target.value,
                }))
              }
              displayEmpty
              aria-label={`${menuColumn?.headerName} 필터 값`}
            >
              <MenuItem value="">전체</MenuItem>
              <MenuItem value="true">Yes</MenuItem>
              <MenuItem value="false">No</MenuItem>
            </Select>
          ) : (
            <>
              <Select
                size="small"
                value={filterDraft.operator}
                onChange={(event) =>
                  setFilterDraft((current) => ({
                    ...current,
                    operator: event.target.value as F1GridFilterOperator,
                  }))
                }
                aria-label={`${menuColumn?.headerName} 필터 연산자`}
              >
                {getGridFilterOperators(menuColumn?.type).map((operator) => (
                  <MenuItem key={operator} value={operator}>
                    {OPERATOR_LABELS[operator]}
                  </MenuItem>
                ))}
              </Select>
              {needsValue ? (
                <TextField
                  size="small"
                  label={`${menuColumn?.headerName} 필터 값`}
                  value={filterDraft.value}
                  onChange={(event) =>
                    setFilterDraft((current) => ({
                      ...current,
                      value: event.target.value,
                    }))
                  }
                />
              ) : null}
              {needsSecondValue ? (
                <TextField
                  size="small"
                  label={`${menuColumn?.headerName} 필터 값2`}
                  value={filterDraft.value2}
                  onChange={(event) =>
                    setFilterDraft((current) => ({
                      ...current,
                      value2: event.target.value,
                    }))
                  }
                />
              ) : null}
            </>
          )}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Button size="small" onClick={clearFilterDraft}>
              초기화
            </Button>
            <Button size="small" variant="contained" onClick={applyFilterDraft}>
              적용
            </Button>
          </Box>
        </Box>
      </Menu>
    </>
  );
}

const MemoizedGridHeader = memo(GridHeaderInner) as typeof GridHeaderInner;

export function GridHeader<T extends object>(props: GridHeaderProps<T>) {
  const latestProps = useRef(props);
  latestProps.current = props;
  const handlers = useMemo(() => ({
    onResizeColumn: (...args: Parameters<GridHeaderProps<T>['onResizeColumn']>) => latestProps.current.onResizeColumn(...args),
    getColumnCheckboxState: (...args: Parameters<GridHeaderProps<T>['getColumnCheckboxState']>) => latestProps.current.getColumnCheckboxState(...args),
    onToggleAllRows: () => latestProps.current.onToggleAllRows(),
    onToggleColumnCheckbox: (...args: Parameters<GridHeaderProps<T>['onToggleColumnCheckbox']>) => latestProps.current.onToggleColumnCheckbox(...args),
    onToggleColumnVisibility: (...args: Parameters<GridHeaderProps<T>['onToggleColumnVisibility']>) => latestProps.current.onToggleColumnVisibility(...args),
    onToggleSort: (...args: Parameters<GridHeaderProps<T>['onToggleSort']>) => latestProps.current.onToggleSort(...args),
    onApplyFilter: (...args: Parameters<GridHeaderProps<T>['onApplyFilter']>) => latestProps.current.onApplyFilter(...args),
    onPinColumn: (...args: Parameters<GridHeaderProps<T>['onPinColumn']>) => latestProps.current.onPinColumn(...args),
    onReorderColumn: (source: string, target: string, position?: 'before' | 'after') => latestProps.current.onReorderColumn?.(source, target, position),
  }), []);
  return <MemoizedGridHeader {...props} {...handlers}
    onReorderColumn={props.onReorderColumn ? handlers.onReorderColumn : undefined} />;
}

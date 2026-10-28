import type { F1GridColumn, F1GridPinSide } from '../types/grid.types';

export function getGridColumnPinSide<T extends object>(
  pinnedFields: Map<string, F1GridPinSide>,
  column: F1GridColumn<T>,
): F1GridPinSide | undefined {
  return pinnedFields.get(String(column.field));
}

export function getPinnedGridColumns<T extends object>(
  columns: F1GridColumn<T>[],
  pinnedFields: Map<string, F1GridPinSide>,
): F1GridColumn<T>[] {
  const left: F1GridColumn<T>[] = [];
  const middle: F1GridColumn<T>[] = [];
  const right: F1GridColumn<T>[] = [];

  columns.forEach((column) => {
    const side = pinnedFields.get(String(column.field));
    if (side === 'left') left.push(column);
    else if (side === 'right') right.push(column);
    else middle.push(column);
  });

  return [...left, ...middle, ...right];
}

export type GridColumnPinOffsets = {
  leftOffsets: Record<string, number>;
  rightOffsets: Record<string, number>;
};

export function getGridColumnPinOffsets<T extends object>(
  columns: F1GridColumn<T>[],
  pinnedFields: Map<string, F1GridPinSide>,
  columnWidths?: Record<string, number>,
  checkboxWidth = 44,
  trailingOffset = 0,
): GridColumnPinOffsets {
  const leftOffsets: Record<string, number> = {};
  const rightOffsets: Record<string, number> = {};

  let leftCursor = checkboxWidth;
  columns.forEach((column) => {
    if (pinnedFields.get(String(column.field)) !== 'left') return;
    leftOffsets[String(column.field)] = leftCursor;
    const colWidth =
      columnWidths?.[String(column.field)] ?? column.width ?? 140;
    leftCursor += colWidth;
  });

  let rightCursor = trailingOffset;
  [...columns].reverse().forEach((column) => {
    if (pinnedFields.get(String(column.field)) !== 'right') return;
    rightOffsets[String(column.field)] = rightCursor;
    const colWidth =
      columnWidths?.[String(column.field)] ?? column.width ?? 140;
    rightCursor += colWidth;
  });

  return { leftOffsets, rightOffsets };
}

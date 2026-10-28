export type GridCellPosition = {
  rowIndex: number;
  columnIndex: number;
};

export function getNextEditableCell(
  current: GridCellPosition,
  editableByRow: boolean[][],
  direction: 1 | -1,
): GridCellPosition | undefined {
  const columnCount = editableByRow[0]?.length ?? 0;
  if (columnCount === 0) return undefined;

  let index = current.rowIndex * columnCount + current.columnIndex;
  const end = direction === 1 ? editableByRow.length * columnCount : -1;

  while (true) {
    index += direction;
    if (index === end || index < 0 || index >= end) return undefined;

    const rowIndex = Math.floor(index / columnCount);
    const columnIndex = index % columnCount;
    if (editableByRow[rowIndex]?.[columnIndex]) {
      return { rowIndex, columnIndex };
    }
  }
}

export function findNextEditableCell(
  current: GridCellPosition,
  rowCount: number,
  columnCount: number,
  direction: 1 | -1,
  isEditable: (rowIndex: number, columnIndex: number) => boolean,
): GridCellPosition | undefined {
  if (rowCount <= 0 || columnCount <= 0) return undefined;

  let index = current.rowIndex * columnCount + current.columnIndex;
  const cellCount = rowCount * columnCount;

  while (true) {
    index += direction;
    if (index < 0 || index >= cellCount) return undefined;
    const rowIndex = Math.floor(index / columnCount);
    const columnIndex = index % columnCount;
    if (isEditable(rowIndex, columnIndex)) return { rowIndex, columnIndex };
  }
}

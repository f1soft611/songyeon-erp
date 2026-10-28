import type { F1GridSort, F1GridSortDirection } from '../types/grid.types';

export function toggleGridSort<T extends object>(
  sorts: F1GridSort<T>[],
  field: keyof T,
  direction: F1GridSortDirection,
): F1GridSort<T>[] {
  const existingIndex = sorts.findIndex((sort) => sort.field === field);

  if (existingIndex < 0) {
    return [...sorts, { field, direction }];
  }

  if (sorts[existingIndex].direction === direction) {
    return sorts.filter((_, index) => index !== existingIndex);
  }

  return sorts.map((sort, index) =>
    index === existingIndex ? { field, direction } : sort,
  );
}

function compareValues(a: unknown, b: unknown): number {
  if (a === b) return 0;
  if (a === null || a === undefined) return 1;
  if (b === null || b === undefined) return -1;

  if (typeof a === 'string' && typeof b === 'string') {
    return a.localeCompare(b);
  }

  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

export function sortGridRows<T extends object>(
  rows: T[],
  sorts: F1GridSort<T>[],
): T[] {
  if (sorts.length === 0) return rows;

  return [...rows].sort((rowA, rowB) => {
    for (const sort of sorts) {
      const result = compareValues(rowA[sort.field], rowB[sort.field]);
      if (result !== 0) {
        return sort.direction === 'asc' ? result : -result;
      }
    }
    return 0;
  });
}

export function getGridSortIndicator<T extends object>(
  sorts: F1GridSort<T>[],
  field: keyof T,
): { direction: F1GridSortDirection; order: number } | undefined {
  const index = sorts.findIndex((sort) => sort.field === field);
  if (index < 0) return undefined;
  return { direction: sorts[index].direction, order: index + 1 };
}

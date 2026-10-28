import type { F1GridRowId } from '../types/grid.types';
import { getGridRowId, getStateKey } from '../utils/grid.utils';

export type F1TreeProjectionOptions<T extends object> = {
  rowKey: keyof T;
  parentKey: keyof T;
  getRowOrder?: (row: T) => number;
};

export type F1TreeRowMeta = {
  depth: number;
  hasChildren: boolean;
};

export type F1TreeProjection<T extends object> = {
  rows: T[];
  metaById: Record<string, F1TreeRowMeta>;
};

type IndexedRow<T extends object> = {
  index: number;
  row: T;
  rowId: F1GridRowId;
  rowKey: string;
};

export type F1TreeIndex<T extends object> = {
  indexedRows: IndexedRow<T>[];
  childrenByParent: Map<string, IndexedRow<T>[]>;
  rootRows: IndexedRow<T>[];
};

function toRowKey(value: unknown): string | undefined {
  if (typeof value !== 'string' && typeof value !== 'number') return undefined;
  return getStateKey(value);
}

export function createTreeIndex<T extends object>(
  rows: T[],
  { rowKey, parentKey, getRowOrder }: F1TreeProjectionOptions<T>,
): F1TreeIndex<T> {
  const indexedRows = rows.map((row, index) => {
    const rowId = getGridRowId(row, rowKey);
    return { index, row, rowId, rowKey: getStateKey(rowId) };
  });
  const rowByKey = new Map(indexedRows.map((item) => [item.rowKey, item]));
  const childrenByParent = new Map<string, IndexedRow<T>[]>();
  const rootRows: IndexedRow<T>[] = [];

  indexedRows.forEach((item) => {
    const parentKeyValue = toRowKey(item.row[parentKey]);
    if (
      !parentKeyValue ||
      parentKeyValue === item.rowKey ||
      !rowByKey.has(parentKeyValue)
    ) {
      rootRows.push(item);
      return;
    }

    const children = childrenByParent.get(parentKeyValue) ?? [];
    children.push(item);
    childrenByParent.set(parentKeyValue, children);
  });

  const compareRows = (left: IndexedRow<T>, right: IndexedRow<T>) => {
    const leftOrder = getRowOrder?.(left.row) ?? 0;
    const rightOrder = getRowOrder?.(right.row) ?? 0;
    return leftOrder - rightOrder || left.index - right.index;
  };
  rootRows.sort(compareRows);
  childrenByParent.forEach((children) => children.sort(compareRows));

  return {
    indexedRows: [...indexedRows].sort(compareRows),
    childrenByParent,
    rootRows,
  };
}

export function projectTreeIndex<T extends object>(
  index: F1TreeIndex<T>,
  expandedIds: Set<F1GridRowId>,
): F1TreeProjection<T> {
  const { indexedRows, childrenByParent, rootRows } = index;
  const outputRows: T[] = [];
  const metaById: Record<string, F1TreeRowMeta> = {};
  const visited = new Set<string>();
  const expandedKeys = new Set([...expandedIds].map(getStateKey));

  function visit(item: IndexedRow<T>, depth: number, visible: boolean) {
    if (visited.has(item.rowKey)) return;
    visited.add(item.rowKey);

    const children = childrenByParent.get(item.rowKey) ?? [];
    metaById[item.rowKey] = { depth, hasChildren: children.length > 0 };
    if (!visible) return;

    outputRows.push(item.row);
    const expanded = expandedKeys.has(item.rowKey);
    children.forEach((child) => visit(child, depth + 1, expanded));
  }

  rootRows.forEach((item) => visit(item, 0, true));
  indexedRows
    .filter((item) => !visited.has(item.rowKey))
    .forEach((item) => visit(item, 0, true));

  return { rows: outputRows, metaById };
}

export function projectTreeRows<T extends object>(
  rows: T[],
  options: F1TreeProjectionOptions<T>,
  expandedIds: Set<F1GridRowId>,
): F1TreeProjection<T> {
  return projectTreeIndex(createTreeIndex(rows, options), expandedIds);
}

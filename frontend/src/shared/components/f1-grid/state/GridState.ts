import type {
  F1GridChanges,
  F1GridRowId,
  F1GridRowState,
  F1GridSavedRow,
} from '../types/grid.types';
import { getGridRowId, getStateKey, hasGridRowId } from '../utils/grid.utils';

export type F1GridData<T extends object> = {
  rows: T[];
  rowById: Map<string, T>;
  rowIndexById: Map<string, number>;
  stateById: Record<string, F1GridRowState>;
  previousStateById: Record<string, F1GridRowState>;
  dirtyFieldsById: Record<string, Record<string, boolean>>;
  originalValuesById: Record<string, Partial<T>>;
  patchesById: Record<string, Partial<T>>;
  changedIds: Set<string>;
};

function buildRowIndexes<T extends object>(rows: T[], rowKey: keyof T) {
  const rowById = new Map<string, T>();
  const rowIndexById = new Map<string, number>();
  rows.forEach((row, index) => {
    const stateKey = getStateKey(getGridRowId(row, rowKey));
    rowById.set(stateKey, row);
    rowIndexById.set(stateKey, index);
  });
  return { rowById, rowIndexById };
}

export function getGridRowById<T extends object>(
  data: F1GridData<T>,
  rowId: F1GridRowId,
): T | undefined {
  return data.rowById.get(getStateKey(rowId));
}

export function areGridValuesEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (left == null || right == null) return left === right;

  if (left instanceof Date && right instanceof Date) {
    return left.getTime() === right.getTime();
  }

  if (Array.isArray(left) && Array.isArray(right)) {
    if (left.length !== right.length) return false;
    return left.every((item, index) => areGridValuesEqual(item, right[index]));
  }

  if (typeof left === 'object' && typeof right === 'object') {
    const leftEntries = Object.entries(left as Record<string, unknown>);
    const rightEntries = Object.entries(right as Record<string, unknown>);
    if (leftEntries.length !== rightEntries.length) return false;

    return leftEntries.every(([key, value]) =>
      areGridValuesEqual(value, (right as Record<string, unknown>)[key]),
    );
  }

  return false;
}

export function createGridData<T extends object>(
  rows: T[],
  rowKey: keyof T,
): F1GridData<T> {
  const stateById: Record<string, F1GridRowState> = {};

  rows.forEach((row) => {
    const stateKey = getStateKey(getGridRowId(row, rowKey));
    stateById[stateKey] = 'normal';
  });
  const indexes = buildRowIndexes(rows, rowKey);

  return {
    rows,
    ...indexes,
    stateById,
    previousStateById: {},
    dirtyFieldsById: {},
    originalValuesById: {},
    patchesById: {},
    changedIds: new Set(),
  };
}

export function rebaseGridData<T extends object>(
  data: F1GridData<T>,
  rows: T[],
  rowKey: keyof T,
): F1GridData<T> {
  if (data.changedIds.size === 0) return createGridData(rows, rowKey);

  const nextRows = rows.map((row) => {
    const stateKey = getStateKey(getGridRowId(row, rowKey));
    return data.changedIds.has(stateKey)
      ? (data.rowById.get(stateKey) ?? row)
      : row;
  });
  const incomingIds = new Set(
    rows.map((row) => getStateKey(getGridRowId(row, rowKey))),
  );
  data.changedIds.forEach((stateKey) => {
    if (incomingIds.has(stateKey)) return;
    const changedRow = data.rowById.get(stateKey);
    if (changedRow) nextRows.push(changedRow);
  });

  const rebased = createGridData(nextRows, rowKey);
  data.changedIds.forEach((stateKey) => {
    const state = data.stateById[stateKey];
    if (!state) return;
    rebased.stateById[stateKey] = state;
    if (data.previousStateById[stateKey]) {
      rebased.previousStateById[stateKey] = data.previousStateById[stateKey];
    }
    if (data.dirtyFieldsById[stateKey]) {
      rebased.dirtyFieldsById[stateKey] = data.dirtyFieldsById[stateKey];
    }
    if (data.originalValuesById[stateKey]) {
      rebased.originalValuesById[stateKey] = data.originalValuesById[stateKey];
    }
    if (data.patchesById[stateKey]) {
      rebased.patchesById[stateKey] = data.patchesById[stateKey];
    }
    rebased.changedIds.add(stateKey);
  });
  return rebased;
}

export function acceptSavedGridRows<T extends object>(
  data: F1GridData<T>,
  rowKey: keyof T,
  savedRows: F1GridSavedRow<T>[],
): F1GridData<T> {
  if (!savedRows.length) return data;
  const sources = new Set<string>();
  const targets = new Set<string>();
  savedRows.forEach(({ previousRowId, row }) => {
    const source = getStateKey(previousRowId);
    const target = getStateKey(getGridRowId(row, rowKey));
    if (!data.rowById.has(source) || data.stateById[source] === 'deleted' ||
        sources.has(source) || targets.has(target) ||
        (target !== source && data.rowById.has(target))) {
      throw new Error('저장 행의 ID가 없거나 중복되었습니다.');
    }
    sources.add(source);
    targets.add(target);
  });
  const rows = [...data.rows];
  const stateById = { ...data.stateById };
  const previousStateById = { ...data.previousStateById };
  const dirtyFieldsById = { ...data.dirtyFieldsById };
  const originalValuesById = { ...data.originalValuesById };
  const patchesById = { ...data.patchesById };
  const changedIds = new Set(data.changedIds);
  savedRows.forEach(({ previousRowId, row }) => {
    const source = getStateKey(previousRowId);
    const target = getStateKey(getGridRowId(row, rowKey));
    rows[data.rowIndexById.get(source)!] = row;
    delete stateById[source];
    delete previousStateById[source];
    delete dirtyFieldsById[source];
    delete originalValuesById[source];
    delete patchesById[source];
    changedIds.delete(source);
    stateById[target] = 'normal';
  });
  return {
    rows, ...buildRowIndexes(rows, rowKey), stateById, previousStateById,
    dirtyFieldsById, originalValuesById, patchesById, changedIds,
  };
}

export function insertGridRow<T extends object>(
  data: F1GridData<T>,
  row: T,
  rowKey: keyof T,
  index: number,
): F1GridData<T> {
  const stateKey = getStateKey(getGridRowId(row, rowKey));

  if (data.rowById.has(stateKey)) return data;

  const insertIndex = Math.max(0, Math.min(Math.floor(index), data.rows.length));
  const rows = [
    ...data.rows.slice(0, insertIndex),
    row,
    ...data.rows.slice(insertIndex),
  ];
  const changedIds = new Set(data.changedIds).add(stateKey);

  return {
    ...data,
    rows,
    ...buildRowIndexes(rows, rowKey),
    stateById: { ...data.stateById, [stateKey]: 'inserted' },
    dirtyFieldsById: {
      ...data.dirtyFieldsById,
      [stateKey]: Object.fromEntries(
        Object.keys(row).map((field) => [String(field), true]),
      ),
    },
    patchesById: { ...data.patchesById, [stateKey]: { ...row } },
    changedIds,
  };
}

export function addGridRow<T extends object>(
  data: F1GridData<T>,
  row: T,
  rowKey: keyof T,
): F1GridData<T> {
  return insertGridRow(data, row, rowKey, data.rows.length);
}

export function updateGridRow<T extends object>(
  data: F1GridData<T>,
  _rowKey: keyof T,
  rowId: F1GridRowId,
  changes: Partial<T>,
): F1GridData<T> {
  const stateKey = getStateKey(rowId);
  const currentState = data.stateById[stateKey];

  if (!currentState || currentState === 'deleted') {
    return data;
  }

  const rowIndex = data.rowIndexById.get(stateKey);
  const currentRow = data.rowById.get(stateKey);
  if (rowIndex === undefined || !currentRow) return data;

  const nextDirtyFields = {
    ...data.dirtyFieldsById,
    [stateKey]: {
      ...(data.dirtyFieldsById[stateKey] ?? {}),
    },
  };
  const nextOriginalValues = {
    ...data.originalValuesById,
    [stateKey]: { ...(data.originalValuesById[stateKey] ?? {}) },
  };
  const nextPatch = { ...(data.patchesById[stateKey] ?? {}) };

  Object.keys(changes).forEach((field) => {
    const nextValue = (changes as Record<string, unknown>)[field];
    const typedField = field as keyof T;
    if (!(field in nextOriginalValues[stateKey])) {
      nextOriginalValues[stateKey][typedField] = currentRow[typedField];
    }
    const originalValue = nextOriginalValues[stateKey][typedField];
    if (areGridValuesEqual(originalValue, nextValue)) {
      delete nextDirtyFields[stateKey][field];
      delete nextOriginalValues[stateKey][typedField];
      delete nextPatch[typedField];
    } else {
      nextDirtyFields[stateKey][field] = true;
      nextPatch[typedField] = nextValue as T[keyof T];
    }
  });

  const isRowClean = Object.keys(nextDirtyFields[stateKey]).length === 0;
  if (isRowClean) {
    delete nextDirtyFields[stateKey];
    delete nextOriginalValues[stateKey];
  }
  const nextPatches = { ...data.patchesById };
  if (Object.keys(nextPatch).length === 0) {
    delete nextPatches[stateKey];
  } else {
    nextPatches[stateKey] = nextPatch;
  }
  const nextRow = { ...currentRow, ...changes };
  const rows = [...data.rows];
  rows[rowIndex] = nextRow;
  const rowById = new Map(data.rowById).set(stateKey, nextRow);
  const changedIds = new Set(data.changedIds);
  if (currentState === 'inserted' || !isRowClean) changedIds.add(stateKey);
  else changedIds.delete(stateKey);

  return {
    ...data,
    rows,
    rowById,
    stateById: {
      ...data.stateById,
      [stateKey]:
        currentState === 'inserted'
          ? 'inserted'
          : isRowClean
            ? 'normal'
            : 'updated',
    },
    dirtyFieldsById: nextDirtyFields,
    originalValuesById: nextOriginalValues,
    patchesById: nextPatches,
    changedIds,
  };
}

export function markRowsDeleted<T extends object>(
  data: F1GridData<T>,
  rowKey: keyof T,
  rowIds: F1GridRowId[],
): F1GridData<T> {
  const stateById = { ...data.stateById };
  const previousStateById = { ...data.previousStateById };
  const dirtyFieldsById = { ...data.dirtyFieldsById };
  const originalValuesById = { ...data.originalValuesById };
  const patchesById = { ...data.patchesById };
  const changedIds = new Set(data.changedIds);
  const rowIdSet = new Set(rowIds.map(getStateKey));
  const insertedRowIds = new Set<string>();

  data.rows.forEach((row) => {
    const stateKey = getStateKey(getGridRowId(row, rowKey));
    const currentState = stateById[stateKey];

    if (rowIdSet.has(stateKey) && currentState && currentState !== 'deleted') {
      if (currentState === 'inserted') {
        insertedRowIds.add(stateKey);
        delete stateById[stateKey];
        delete previousStateById[stateKey];
        delete dirtyFieldsById[stateKey];
        delete originalValuesById[stateKey];
        delete patchesById[stateKey];
        changedIds.delete(stateKey);
        return;
      }

      previousStateById[stateKey] = currentState;
      stateById[stateKey] = 'deleted';
      dirtyFieldsById[stateKey] = {};
      changedIds.add(stateKey);
    }
  });

  const rows = data.rows.filter(
    (row) => !insertedRowIds.has(getStateKey(getGridRowId(row, rowKey))),
  );
  return {
    ...data,
    rows,
    ...buildRowIndexes(rows, rowKey),
    stateById,
    previousStateById,
    dirtyFieldsById,
    originalValuesById,
    patchesById,
    changedIds,
  };
}

export function restoreGridRows<T extends object>(
  data: F1GridData<T>,
): F1GridData<T> {
  const stateById = { ...data.stateById };
  const dirtyFieldsById = { ...data.dirtyFieldsById };
  const changedIds = new Set(data.changedIds);

  Object.entries(stateById).forEach(([stateKey, state]) => {
    if (state === 'deleted') {
      const restoredState = data.previousStateById[stateKey] ?? 'normal';
      stateById[stateKey] = restoredState;
      delete dirtyFieldsById[stateKey];
      if (restoredState === 'normal') changedIds.delete(stateKey);
      else changedIds.add(stateKey);
    }
  });

  return {
    ...data,
    stateById,
    previousStateById: {},
    dirtyFieldsById,
    changedIds,
  };
}

export function duplicateGridRows<T extends object>(
  data: F1GridData<T>,
  rowKey: keyof T,
  rowIds: F1GridRowId[],
  createDuplicate: (row: T) => T,
): F1GridData<T> {
  const rowIdSet = new Set(rowIds.map(getStateKey));
  const duplicates = data.rows
    .filter((row) => {
      const stateKey = getStateKey(getGridRowId(row, rowKey));
      return rowIdSet.has(stateKey) && data.stateById[stateKey] !== 'deleted';
    })
    .map(createDuplicate);
  const stateById = { ...data.stateById };
  const changedIds = new Set(data.changedIds);

  duplicates.forEach((row) => {
    const rowId = getGridRowId(row, rowKey);
    if (!hasGridRowId(data.rows, rowKey, rowId)) {
      stateById[getStateKey(rowId)] = 'inserted';
      changedIds.add(getStateKey(rowId));
    }
  });

  const uniqueDuplicates = duplicates.filter(
    (row) => !hasGridRowId(data.rows, rowKey, getGridRowId(row, rowKey)),
  );

  const rows = [...data.rows, ...uniqueDuplicates];
  return {
    ...data,
    rows,
    ...buildRowIndexes(rows, rowKey),
    stateById,
    changedIds,
  };
}

export function getGridChanges<T extends object>(
  data: F1GridData<T>,
): F1GridChanges<T> {
  const changes: F1GridChanges<T> = {
    insertedRows: [],
    updatedRows: [],
    deletedRows: [],
  };

  const orderedChangedIds = Array.from(data.changedIds).sort(
    (left, right) =>
      (data.rowIndexById.get(left) ?? Number.MAX_SAFE_INTEGER) -
      (data.rowIndexById.get(right) ?? Number.MAX_SAFE_INTEGER),
  );

  orderedChangedIds.forEach((stateKey) => {
    const row = data.rowById.get(stateKey);
    if (!row) return;
    const state = data.stateById[stateKey];

    if (state === 'inserted') changes.insertedRows.push(row);
    if (state === 'updated') changes.updatedRows.push(row);
    if (state === 'deleted') changes.deletedRows.push(row);
  });

  return changes;
}

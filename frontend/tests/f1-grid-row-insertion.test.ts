import { describe, expect, it } from 'vitest';
import {
  createGridData,
  getGridChanges,
  insertGridRow,
} from '../src/shared/components/f1-grid/state/GridState';

type TestRow = {
  id: string;
  name: string;
};

const rows: TestRow[] = [
  { id: 'alpha', name: 'Alpha' },
  { id: 'beta', name: 'Beta' },
];

describe('F1-Grid row insertion state', () => {
  it('inserts at the requested index and tracks inserted row state and changes', () => {
    const initial = createGridData(rows, 'id');
    const inserted: TestRow = { id: 'new', name: 'New' };

    const result = insertGridRow(initial, inserted, 'id', 1);

    expect(result.rows).toEqual([
      { id: 'alpha', name: 'Alpha' },
      inserted,
      { id: 'beta', name: 'Beta' },
    ]);
    expect(result.rowIndexById.get('alpha')).toBe(0);
    expect(result.rowIndexById.get('new')).toBe(1);
    expect(result.rowIndexById.get('beta')).toBe(2);
    expect(result.rowById.get('new')).toBe(inserted);
    expect(result.stateById.new).toBe('inserted');
    expect(getGridChanges(result).insertedRows).toEqual([inserted]);
  });

  it('clamps insertion indexes to the start and end of the row sequence', () => {
    const initial = createGridData(rows, 'id');

    const atStart = insertGridRow(
      initial,
      { id: 'first', name: 'First' },
      'id',
      -1,
    );
    const atEnd = insertGridRow(
      initial,
      { id: 'last', name: 'Last' },
      'id',
      rows.length + 1,
    );

    expect(atStart.rows.map((row) => row.id)).toEqual([
      'first',
      'alpha',
      'beta',
    ]);
    expect(atStart.rowIndexById.get('beta')).toBe(2);
    expect(atEnd.rows.map((row) => row.id)).toEqual([
      'alpha',
      'beta',
      'last',
    ]);
    expect(atEnd.rowIndexById.get('last')).toBe(2);
  });

  it('does not change state when the inserted row ID already exists', () => {
    const initial = createGridData(rows, 'id');

    const result = insertGridRow(
      initial,
      { id: 'alpha', name: 'Duplicate' },
      'id',
      1,
    );

    expect(result).toBe(initial);
    expect(result.rows).toBe(rows);
    expect(getGridChanges(result).insertedRows).toEqual([]);
  });
});

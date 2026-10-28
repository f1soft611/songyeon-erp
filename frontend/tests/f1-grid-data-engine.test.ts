import { describe, expect, it } from 'vitest';
import {
  createGridData,
  getGridChanges,
  getGridRowById,
  rebaseGridData,
  updateGridRow,
} from '../src/shared/components/f1-grid/state/GridState';
import { findNextEditableCell } from '../src/shared/components/f1-grid/keyboard/GridKeyboard';

type Row = { id: string; code: string; quantity: number };

const rows: Row[] = [
  { id: 'a', code: 'A', quantity: 1 },
  { id: 'b', code: 'B', quantity: 2 },
];

describe('F1Grid indexed sparse data engine', () => {
  it('builds row and position indexes without cloning every original row', () => {
    const data = createGridData(rows, 'id');

    expect(getGridRowById(data, 'b')).toBe(rows[1]);
    expect(data.rowIndexById.get('b')).toBe(1);
    expect(data.originalValuesById).toEqual({});
    expect(data.patchesById).toEqual({});
  });

  it('stores only changed fields and removes the patch when restored', () => {
    const data = createGridData(rows, 'id');
    const changed = updateGridRow(data, 'id', 'b', { quantity: 9 });

    expect(changed.originalValuesById).toEqual({ b: { quantity: 2 } });
    expect(changed.patchesById).toEqual({ b: { quantity: 9 } });
    expect(getGridChanges(changed).updatedRows).toEqual([
      { id: 'b', code: 'B', quantity: 9 },
    ]);

    const restored = updateGridRow(changed, 'id', 'b', { quantity: 2 });
    expect(restored.originalValuesById).toEqual({});
    expect(restored.patchesById).toEqual({});
    expect(getGridChanges(restored).updatedRows).toEqual([]);
  });

  it('preserves local patches while rebasing appended server rows', () => {
    const changed = updateGridRow(createGridData(rows, 'id'), 'id', 'a', {
      quantity: 9,
    });
    const rebased = rebaseGridData(
      changed,
      [...rows, { id: 'c', code: 'C', quantity: 3 }],
      'id',
    );

    expect(getGridRowById(rebased, 'a')?.quantity).toBe(9);
    expect(getGridRowById(rebased, 'c')?.quantity).toBe(3);
    expect(getGridChanges(rebased).updatedRows).toEqual([
      { id: 'a', code: 'A', quantity: 9 },
    ]);
  });
});

describe('F1Grid lazy keyboard navigation', () => {
  it('stops evaluating as soon as the next editable cell is found', () => {
    let checks = 0;
    const next = findNextEditableCell(
      { rowIndex: 0, columnIndex: 0 },
      100_000,
      10,
      1,
      (rowIndex, columnIndex) => {
        checks += 1;
        return rowIndex === 0 && columnIndex === 3;
      },
    );

    expect(next).toEqual({ rowIndex: 0, columnIndex: 3 });
    expect(checks).toBe(3);
  });
});

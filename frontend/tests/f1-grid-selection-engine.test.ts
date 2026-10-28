import { describe, expect, it } from 'vitest';
import {
  createGridRowSelection,
  isGridRowSelected,
  materializeGridRowSelection,
  selectAllGridRows,
  setGridRowSelected,
} from '../src/shared/components/f1-grid/selection/GridSelection';

describe('F1Grid Set row selection', () => {
  it('stores individual selection in a Set', () => {
    const selected = setGridRowSelected(
      createGridRowSelection(),
      'row-2',
      true,
    );

    expect(selected.includedIds).toEqual(new Set(['row-2']));
    expect(isGridRowSelected(selected, 'row-2')).toBe(true);
  });

  it('represents select-all without allocating every row ID', () => {
    const all = selectAllGridRows(true);
    const exceptOne = setGridRowSelected(all, 'row-2', false);

    expect(exceptOne.includedIds.size).toBe(0);
    expect(exceptOne.excludedIds).toEqual(new Set(['row-2']));
    expect(
      materializeGridRowSelection(exceptOne, ['row-1', 'row-2', 'row-3']),
    ).toEqual(['row-1', 'row-3']);
  });
});

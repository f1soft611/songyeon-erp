import { createRef } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { F1Grid, type F1GridRef } from '../src/shared/components/f1-grid';
import { acceptSavedGridRows, addGridRow, createGridData, getGridChanges, updateGridRow } from '../src/shared/components/f1-grid/state/GridState';
import { resolveSavedGridRows } from '../src/shared/components/f1-grid/state/GridSavedRows';

type Row = { id: string | number; name: string };
const rows: Row[] = [{ id: 1, name: 'One' }, { id: 2, name: 'Two' }];

describe('saved grid rows', () => {
  it('cleans only acknowledged rows and preserves other references and changes', () => {
    let data = updateGridRow(createGridData(rows, 'id'), 'id', 1, { name: 'Edited' });
    data = updateGridRow(data, 'id', 2, { name: 'Other edit' });
    const saved = { id: 1, name: 'Canonical' };
    const next = acceptSavedGridRows(data, 'id', [{ previousRowId: 1, row: saved }]);
    expect(next.rows).toEqual([saved, data.rows[1]]);
    expect(next.rows[1]).toBe(data.rows[1]);
    expect(getGridChanges(next).updatedRows).toEqual([data.rows[1]]);
    expect(next.originalValuesById['1']).toBeUndefined();
    expect(next.patchesById['1']).toBeUndefined();
    expect(next.dirtyFieldsById['1']).toBeUndefined();
    expect(data.changedIds.has('1')).toBe(true);
  });

  it('replaces multiple temporary IDs without depending on response order', () => {
    let data = addGridRow(createGridData(rows, 'id'), { id: 'new-a', name: 'A' }, 'id');
    data = addGridRow(data, { id: 'new-b', name: 'B' }, 'id');
    const result = resolveSavedGridRows(
      data.rows.slice(2), [{ id: 32, name: 'B saved' }, { id: 31, name: 'A saved' }],
      { 'new-a': 31, 'new-b': 32 }, 'id',
    );
    const next = acceptSavedGridRows(data, 'id', result);
    expect(next.rows.map((row) => row.id)).toEqual([1, 2, 31, 32]);
    expect(next.rowById.has('new-a')).toBe(false);
    expect(next.rowIndexById.get('31')).toBe(2);
    expect(next.changedIds.size).toBe(0);
    expect(getGridChanges(updateGridRow(next, 'id', 31, { name: 'Again' })).updatedRows)
      .toEqual([{ id: 31, name: 'Again' }]);
  });

  it('rejects collisions, missing and duplicate acknowledgements atomically', () => {
    const data = createGridData(rows, 'id');
    for (const saved of [
      [{ previousRowId: 1, row: rows[1] }],
      [{ previousRowId: 9, row: { id: 9, name: 'Missing' } }],
      [{ previousRowId: 1, row: rows[0] }, { previousRowId: 1, row: rows[0] }],
    ]) {
      expect(() => acceptSavedGridRows(data, 'id', saved)).toThrow();
      expect(data.rows).toEqual(rows);
    }
    for (const mappings of [{}, { '1': 1, '2': 1 }, { '1': 99 }, { '1': 1, extra: 2 }]) {
      expect(() => resolveSavedGridRows([rows[0]], [rows[0]], mappings, 'id')).toThrow();
    }
  });

  it('keeps selection, focus and DOM when the parent accepts the new baseline', () => {
    const ref = createRef<F1GridRef<Row>>();
    const columns = [{ field: 'name' as const, title: 'Name', editable: true }];
    const { rerender } = render(<F1Grid ref={ref} rows={rows} rowKey="id" columns={columns} />);
    act(() => ref.current!.addRow({ id: 'temp', name: 'Temporary' }));
    const cell = screen.getByRole('gridcell', { name: 'Temporary' });
    fireEvent.mouseDown(cell);
    fireEvent.mouseUp(cell);
    act(() => ref.current!.setSelectedRowIds(['temp']));
    const grid = screen.getByRole('grid');
    let baseline: Row[] = [];
    act(() => { baseline = ref.current!.acceptSavedRows([{ previousRowId: 'temp', row: { id: 31, name: 'Saved' } }]); });
    rerender(<F1Grid ref={ref} rows={baseline} rowKey="id" columns={columns} />);
    expect(screen.getByRole('grid')).toBe(grid);
    expect(ref.current!.getSelectedRowIds()).toEqual([31]);
    expect(ref.current!.getChanges().insertedRows).toEqual([]);
    expect(screen.getByRole('gridcell', { name: 'Saved' })).toHaveFocus();
    fireEvent.doubleClick(screen.getByRole('gridcell', { name: 'Saved' }));
    const editor = screen.getByDisplayValue('Saved');
    fireEvent.change(editor, { target: { value: 'Second edit' } });
    fireEvent.keyDown(editor, { key: 'Enter' });
    expect(ref.current!.getChanges().updatedRows).toEqual([{ id: 31, name: 'Second edit' }]);
    expect(ref.current!.getChanges().insertedRows).toEqual([]);
    rerender(<F1Grid key="discard" ref={ref} rows={baseline} rowKey="id" columns={columns} />);
    expect(screen.getByRole('gridcell', { name: 'Saved' })).toBeInTheDocument();
    expect(ref.current!.getChanges().updatedRows).toEqual([]);
  });

  it('does not clean a deleted row', () => {
    const data = createGridData(rows, 'id');
    data.stateById['1'] = 'deleted';
    data.changedIds.add('1');
    expect(() => acceptSavedGridRows(data, 'id', [{ previousRowId: 1, row: rows[0] }])).toThrow();
    expect(data.changedIds.has('1')).toBe(true);
  });

  it('rejects an acknowledgement during editing without changing rows', () => {
    const ref = createRef<F1GridRef<Row>>();
    render(<F1Grid ref={ref} rows={rows} rowKey="id"
      columns={[{ field: 'name', title: 'Name', editable: true }]} />);
    fireEvent.doubleClick(screen.getByRole('gridcell', { name: 'One' }));
    expect(() => ref.current!.acceptSavedRows([{ previousRowId: 1, row: { id: 1, name: 'Saved' } }])).toThrow('편집');
    expect(ref.current!.getRows()[0].name).toBe('One');
    expect(screen.getByDisplayValue('One')).toBeInTheDocument();
  });
});

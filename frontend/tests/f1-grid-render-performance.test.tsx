import { createRef } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { F1Grid, type F1GridColumn, type F1GridRef } from '../src/shared/components/f1-grid';

type Row = { id: string; name: string; code: string };

function renderGrid() {
  const rows: Row[] = Array.from({ length: 100 }, (_, index) => ({
    id: String(index + 1), name: `Item ${index + 1}`, code: `Code ${index + 1}`,
  }));
  const renderCell = vi.fn(({ value }: { value: unknown }) => String(value));
  const editable = vi.fn((_row: Row) => true);
  const columns: F1GridColumn<Row>[] = [
    { field: 'name', headerName: 'Name', editable, pinned: 'left', renderCell },
    { field: 'code', headerName: 'Code', editable, renderCell },
  ];
  const ref = createRef<F1GridRef<Row>>();
  const cellAdornment = vi.fn((_row: Row) => null);
  render(<F1Grid ref={ref} rows={rows} columns={columns} rowKey="id"
    cellAdornment={cellAdornment} showCheckbox={false}
    virtualizeRows={false} virtualizeColumns ariaLabel="Performance grid" />);
  renderCell.mockClear();
  cellAdornment.mockClear();
  return { renderCell, cellAdornment, editable, ref };
}

describe('F1Grid interaction render isolation', () => {
  it.each(['Enter', 'Tab', 'click'] as const)(
    'does not visit unrelated rows when committing a changed value with %s',
    (action) => {
      const { renderCell, cellAdornment, ref } = renderGrid();
      fireEvent.doubleClick(screen.getByRole('gridcell', { name: 'Item 1', exact: true }));
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'Committed item' } });
      renderCell.mockClear();
      cellAdornment.mockClear();
      if (action === 'click') {
        const neighbor = screen.getByRole('gridcell', { name: 'Code 1', exact: true });
        fireEvent.mouseDown(neighbor, { button: 0 });
        fireEvent.mouseUp(neighbor);
        fireEvent.click(neighbor);
      } else {
        fireEvent.keyDown(input, { key: action });
      }
      expect(ref.current?.getChanges().updatedRows).toEqual([
        expect.objectContaining({ id: '1', name: 'Committed item' }),
      ]);
      expect(renderCell.mock.calls.filter(([context]) => context.row.id !== '1')).toHaveLength(0);
      expect(cellAdornment.mock.calls.filter(([row]) => row.id !== '1')).toHaveLength(0);
    },
  );

  it('clears the dirty marker when restoring a value without visiting other rows', () => {
    const { cellAdornment, ref } = renderGrid();
    for (const value of ['Changed', 'Item 1']) {
      const current = screen.getByRole('gridcell', { name: value === 'Changed' ? 'Item 1' : 'Changed', exact: true });
      fireEvent.doubleClick(current);
      fireEvent.change(screen.getByRole('textbox'), { target: { value } });
      cellAdornment.mockClear();
      fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });
      expect(screen.getByRole('gridcell', { name: value, exact: true }))
        .toHaveAttribute('data-dirty-cell', String(value === 'Changed'));
      expect(cellAdornment.mock.calls.filter(([row]) => row.id !== '1')).toHaveLength(0);
    }
    expect(ref.current?.getChanges().updatedRows).toEqual([]);
  });

  it('keeps the latest edit callbacks on a row skipped during another row commit', () => {
    const { ref } = renderGrid();
    fireEvent.doubleClick(screen.getByRole('gridcell', { name: 'Item 1', exact: true }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'First committed' } });
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });
    fireEvent.doubleClick(screen.getByRole('gridcell', { name: 'Item 2', exact: true }));
    expect(screen.getByRole('textbox')).toHaveValue('Item 2');
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Second committed' } });
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });
    expect(ref.current?.getChanges().updatedRows).toEqual([
      expect.objectContaining({ id: '1', name: 'First committed' }),
      expect.objectContaining({ id: '2', name: 'Second committed' }),
    ]);
  });

  it('updates the previous last row boundary after appending a row', () => {
    const { ref } = renderGrid();
    const last = screen.getByRole('gridcell', { name: 'Code 100', exact: true });
    expect(getComputedStyle(last).borderBottomWidth).toBe('1px');
    act(() => ref.current?.addRow({ id: '101', name: 'Item 101', code: 'Code 101' }));
    expect(getComputedStyle(screen.getByRole('gridcell', { name: 'Code 100', exact: true })).borderBottomWidth)
      .not.toBe('1px');
    expect(getComputedStyle(screen.getByRole('gridcell', { name: 'Code 101', exact: true })).borderBottomWidth)
      .toBe('1px');
  });

  it('renumbers unchanged rows when a committed value changes the sort order', () => {
    const rows: Row[] = [
      { id: '1', name: 'Alpha', code: '' },
      { id: '2', name: 'Beta', code: '' },
    ];
    const columns: F1GridColumn<Row>[] = [
      { field: 'code', headerName: 'No.', type: 'rownumber' },
      { field: 'name', headerName: 'Name', editable: true },
    ];
    render(<F1Grid rows={rows} columns={columns} rowKey="id" showCheckbox={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'Name 컬럼 메뉴' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '오름차순 정렬' }));
    fireEvent.doubleClick(screen.getByRole('gridcell', { name: 'Alpha', exact: true }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Zulu' } });
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });
    const cells = screen.getAllByRole('gridcell');
    expect(cells.map((cell) => cell.textContent)).toEqual(['1', 'Beta', '2', 'Zulu']);
  });

  it('updates the remaining last row boundary when a commit filters out a row', () => {
    const rows: Row[] = [
      { id: '1', name: 'Keep A', code: '' },
      { id: '2', name: 'Keep B', code: '' },
    ];
    const columns: F1GridColumn<Row>[] = [
      { field: 'name', headerName: 'Name', editable: true },
    ];
    render(<F1Grid rows={rows} columns={columns} rowKey="id" showCheckbox={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'Name 컬럼 메뉴' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '필터', exact: true }));
    fireEvent.change(screen.getByLabelText('Name 필터 값'), { target: { value: 'Keep' } });
    fireEvent.click(screen.getByRole('button', { name: '적용', exact: true }));
    const remaining = screen.getByRole('gridcell', { name: 'Keep A', exact: true });
    expect(getComputedStyle(remaining).borderBottomWidth).not.toBe('1px');
    fireEvent.doubleClick(screen.getByRole('gridcell', { name: 'Keep B', exact: true }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Hidden' } });
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });
    expect(screen.queryByRole('gridcell', { name: 'Hidden', exact: true })).not.toBeInTheDocument();
    expect(getComputedStyle(remaining).borderBottomWidth).toBe('1px');
  });

  it('does not rerender other rows when selecting a pinned cell in 100 rows', () => {
    const { renderCell } = renderGrid();
    fireEvent.click(screen.getByRole('gridcell', { name: 'Item 1', exact: true }));
    expect(renderCell.mock.calls.filter(([context]) =>
      context.value !== 'Item 1' && context.value !== 'Code 1',
    )).toHaveLength(0);
  });

  it('does not rerender display cells when changing the editor draft', () => {
    const { renderCell, ref } = renderGrid();
    fireEvent.doubleClick(screen.getByRole('gridcell', { name: 'Item 1', exact: true }));
    renderCell.mockClear();
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Edited item' } });
    expect(renderCell).not.toHaveBeenCalled();
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(ref.current?.getChanges().updatedRows).toEqual([
      expect.objectContaining({ id: '1', name: 'Edited item' }),
    ]);
  });

  it('does not visit unrelated row bodies while typing', () => {
    const { cellAdornment } = renderGrid();
    fireEvent.doubleClick(screen.getByRole('gridcell', { name: 'Item 1', exact: true }));
    cellAdornment.mockClear();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Draft' } });
    expect(cellAdornment).toHaveBeenCalledTimes(2);
  });

  it('does not visit unrelated row bodies for a single-cell selection', () => {
    const { cellAdornment } = renderGrid();
    fireEvent.click(screen.getByRole('gridcell', { name: 'Item 1', exact: true }));
    expect(cellAdornment).toHaveBeenCalledTimes(2);
  });

  it('does not visit unrelated row bodies for a complete pointer click', () => {
    const { cellAdornment } = renderGrid();
    const cell = screen.getByRole('gridcell', { name: 'Item 1', exact: true });
    fireEvent.mouseDown(cell, { button: 0 });
    fireEvent.mouseUp(cell);
    fireEvent.click(cell);
    expect(cellAdornment.mock.calls.filter(([row]) => row.id !== '1')).toHaveLength(0);
  });

  it('does not rescan every row for header checkboxes while typing in a text column', () => {
    const { editable } = renderGrid();
    fireEvent.doubleClick(screen.getByRole('gridcell', { name: 'Item 1', exact: true }));
    editable.mockClear();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Header isolation' } });
    expect(editable.mock.calls.filter(([row]) => row.id !== '1')).toHaveLength(0);
  });

  it('uses the latest edit state when committing from a memoized neighboring cell', () => {
    const { ref } = renderGrid();
    const nameCell = screen.getByRole('gridcell', { name: 'Item 1', exact: true });
    const codeCell = screen.getByRole('gridcell', { name: 'Code 1', exact: true });
    fireEvent.doubleClick(nameCell);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Latest draft' } });
    fireEvent.mouseDown(codeCell);
    fireEvent.click(codeCell);
    fireEvent.keyDown(codeCell, { key: 'F2' });
    expect(screen.getByRole('textbox')).toHaveValue('Code 1');
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Latest code' } });
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Tab' });
    expect(ref.current?.getChanges().updatedRows).toEqual([
      expect.objectContaining({ id: '1', name: 'Latest draft', code: 'Latest code' }),
    ]);
  });

  it('can restart a drag from an earlier row after clearing selection elsewhere', () => {
    renderGrid();
    const first = screen.getByRole('gridcell', { name: 'Item 1', exact: true });
    const second = screen.getByRole('gridcell', { name: 'Item 2', exact: true });
    const third = screen.getByRole('gridcell', { name: 'Item 3', exact: true });
    for (const cell of [first, second]) {
      fireEvent.mouseDown(cell, { button: 0 });
      fireEvent.mouseUp(cell);
      fireEvent.click(cell);
    }
    fireEvent.keyDown(second, { key: 'Escape' });
    fireEvent.mouseDown(first, { button: 0 });
    fireEvent.mouseEnter(third);
    fireEvent.mouseUp(third);
    expect(third).toHaveAttribute('data-grid-selected', 'true');
  });
});

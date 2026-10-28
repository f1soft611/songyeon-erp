import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { F1Grid, getGridMergeInfo } from '../src/shared/components/f1-grid';
import { getGridCellBottomBorder } from '../src/shared/components/f1-grid/core/GridCell';

type MergeRow = {
  id: string;
  itemName: string;
  category: string;
  quantity: number;
};

describe('F1-Grid row merge regression', () => {
  it('updates an unchanged merge start when editing a later row splits the group', () => {
    const rows: MergeRow[] = [
      { id: '1', itemName: 'Group A', category: 'Raw', quantity: 1 },
      { id: '2', itemName: 'Group A', category: 'Raw', quantity: 2 },
      { id: '3', itemName: 'Group B', category: 'Finished', quantity: 3 },
    ];
    render(<F1Grid rows={rows} columns={[
      { field: 'itemName', headerName: 'Item', mergeRows: true, editable: true },
      { field: 'quantity', headerName: 'Quantity' },
    ]} rowKey="id" showCheckbox={false} />);
    const first = screen.getByRole('gridcell', { name: 'Group A', exact: true });
    expect(getComputedStyle(first).gridRow).toContain('span 2');
    const cells = screen.getAllByRole('gridcell');
    fireEvent.doubleClick(cells[2]);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Split group' } });
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });
    expect(screen.getByRole('gridcell', { name: 'Split group', exact: true })).toBeInTheDocument();
    expect(getComputedStyle(first).gridRow).not.toContain('span 2');
  });

  it('does not add a second bottom border to a hidden merged cell on the last grid row', () => {
    expect(getGridCellBottomBorder(true, true, false)).toBe(0);
    expect(getGridCellBottomBorder(false, false, true, 2)).toBe(0);
    expect(getGridCellBottomBorder(false, true, true, 2)).toBe(0);
  });

  it('keeps the bottom border when a merged group reaches the final visible row', () => {
    const rows: MergeRow[] = [
      { id: '1', itemName: 'Item A', category: 'Raw', quantity: 1 },
      { id: '2', itemName: 'Item A', category: 'Raw', quantity: 2 },
      { id: '3', itemName: 'Item A', category: 'Raw', quantity: 3 },
    ];

    render(
      <F1Grid
        rows={rows}
        columns={[
          { field: 'itemName', headerName: 'Item name', mergeRows: true },
          { field: 'category', headerName: 'Category', mergeRows: true },
          { field: 'quantity', headerName: 'Quantity' },
        ]}
        rowKey="id"
        showCheckbox={false}
      />,
    );

    const mergedStartCell = screen.getByRole('gridcell', { name: 'Item A' });
    expect(mergedStartCell).not.toBeNull();
    expect(getComputedStyle(mergedStartCell).borderBottomWidth).toBe('1px');
  });

  it('focuses the merge start cell when a later merged row is clicked', () => {
    const rows: MergeRow[] = [
      { id: '1', itemName: 'Item A', category: 'Raw', quantity: 1 },
      { id: '2', itemName: 'Item A', category: 'Raw', quantity: 2 },
      { id: '3', itemName: 'Item B', category: 'Finished', quantity: 3 },
    ];

    expect(getGridMergeInfo(rows, 'itemName')).toEqual([
      { isStart: true, span: 2 },
      { isStart: false, span: 0 },
      { isStart: true, span: 1 },
    ]);

    render(
      <F1Grid
        rows={rows}
        columns={[
          { field: 'itemName', headerName: 'Item name', mergeRows: true },
          { field: 'category', headerName: 'Category', mergeRows: true },
          { field: 'quantity', headerName: 'Quantity' },
        ]}
        rowKey="id"
        showCheckbox={false}
      />,
    );

    const cells = screen.getAllByRole('gridcell');
    fireEvent.click(cells[2]);

    expect(cells[0].getAttribute('tabIndex')).toBe('-1');
    expect(cells[1].getAttribute('tabIndex')).toBe('-1');
    expect(cells[2].getAttribute('tabIndex')).toBe('0');
    expect(getComputedStyle(cells[0]).outlineStyle).toBe('none');
    expect(getComputedStyle(cells[1]).outlineStyle).toBe('none');
  });

  it('keeps the visible merge start row border aligned inside an internal merged group', () => {
    const rows: MergeRow[] = [
      { id: '1', itemName: 'Group A', category: 'Raw', quantity: 1 },
      { id: '2', itemName: 'Group A', category: 'Raw', quantity: 2 },
      { id: '3', itemName: 'Group B', category: 'Finished', quantity: 3 },
      { id: '4', itemName: 'Group B', category: 'Finished', quantity: 4 },
      { id: '5', itemName: 'Group C', category: 'Finished', quantity: 5 },
    ];

    render(
      <F1Grid
        rows={rows}
        columns={[
          { field: 'itemName', headerName: 'Item name', mergeRows: true },
          { field: 'category', headerName: 'Category', mergeRows: true },
          { field: 'quantity', headerName: 'Quantity' },
        ]}
        rowKey="id"
        showCheckbox={false}
      />,
    );

    const groupBCell = screen.getByText('Group B').closest('[role="gridcell"]');
    expect(groupBCell).not.toBeNull();
    expect(getComputedStyle(groupBCell as HTMLElement).borderTopWidth).toBe(
      '1px',
    );
    expect(getComputedStyle(groupBCell as HTMLElement).borderBottomWidth).toBe(
      '0px',
    );
  });

  it('shows the drag range without a focused merge outline', () => {
    const rows: MergeRow[] = [
      { id: '1', itemName: 'Group A', category: 'Raw', quantity: 1 },
      { id: '2', itemName: 'Group A', category: 'Raw', quantity: 2 },
      { id: '3', itemName: 'Group B', category: 'Finished', quantity: 3 },
    ];

    render(
      <F1Grid
        rows={rows}
        columns={[
          { field: 'itemName', headerName: 'Item name', mergeRows: true },
          { field: 'category', headerName: 'Category', mergeRows: true },
          { field: 'quantity', headerName: 'Quantity' },
        ]}
        rowKey="id"
        showCheckbox={false}
      />,
    );

    const cells = screen.getAllByRole('gridcell');
    fireEvent.mouseDown(cells[0], { button: 0 });
    fireEvent.mouseEnter(cells[3]);

    expect(getComputedStyle(cells[0]).outlineStyle).toBe('none');
    expect(getComputedStyle(cells[3]).outlineStyle).toBe('none');
  });
});

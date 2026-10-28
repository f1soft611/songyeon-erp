import { createRef } from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { F1Grid, type F1GridColumn, type F1GridRef } from '../src/shared/components/f1-grid';

type Row = { id: string; code: string; name: string };
const rows: Row[] = [
  { id: '1', code: 'A', name: 'Alpha' },
  { id: '2', code: 'A', name: 'Beta' },
  { id: '3', code: 'C', name: 'Gamma' },
];
const columns: F1GridColumn<Row>[] = [
  { field: 'code', headerName: 'Code', pinned: 'left', mergeRows: true },
  { field: 'name', headerName: 'Name', editable: true },
];
const cell = (name: string) => screen.getByRole('gridcell', { name, exact: true });
const overlays = () => document.querySelectorAll('[data-row-selection-overlay]');

function setup(selectionMode?: 'cell' | 'row', showCheckbox = false, multiSelect?: boolean) {
  const ref = createRef<F1GridRef<Row>>();
  const onSelectionChange = vi.fn();
  const view = render(
    <F1Grid rows={rows} columns={columns} rowKey="id" ref={ref}
      selectionMode={selectionMode} showCheckbox={showCheckbox} multiSelect={multiSelect}
      onSelectionChange={onSelectionChange} selectRowOnContextMenu={false} />,
  );
  return { ...view, ref, onSelectionChange };
}

describe('F1Grid row selection mode', () => {
  it('keeps the existing cell focus and single-cell copy by default', () => {
    setup();
    fireEvent.click(cell('Alpha'));
    expect(getComputedStyle(cell('Alpha')).outline).toBe('2px solid');
    expect(overlays()).toHaveLength(0);
    const setData = vi.fn();
    fireEvent.copy(cell('Alpha'), { clipboardData: { setData } });
    expect(setData).toHaveBeenCalledWith('text/plain', 'Alpha');
  });

  it('highlights only the clicked physical row, including a merged pinned column', () => {
    const { ref, onSelectionChange } = setup('row');
    fireEvent.click(cell('Beta'));
    expect(ref.current?.getSelectedRowIds()).toEqual(['2']);
    expect(onSelectionChange).toHaveBeenLastCalledWith(['2']);
    expect(cell('Beta').closest('[role="row"]')).toHaveAttribute('aria-selected', 'true');
    expect(overlays()).toHaveLength(1);
    expect(overlays()[0]).toHaveAttribute('data-row-selection-overlay', '2');
    expect(getComputedStyle(overlays()[0]).gridColumn.replace(/\s/g, '')).toBe('1/-1');
    expect(getComputedStyle(overlays()[0]).pointerEvents).toBe('none');
    expect(getComputedStyle(cell('Beta')).outline).toBe('none');
    expect(getComputedStyle(cell('A')).outline).toBe('none');
  });

  it('does not create cell ranges while dragging over another row', () => {
    const { ref } = setup('row');
    fireEvent.mouseDown(cell('Alpha'), { button: 0 });
    fireEvent.mouseEnter(cell('Gamma'));
    fireEvent.mouseUp(cell('Gamma'));
    expect(document.querySelector('[data-f1-grid-selecting="true"]')).toBeNull();
    expect(document.querySelector('[data-range-overlay]')).toBeNull();
    expect(ref.current?.getSelectedRowIds()).toEqual(['1']);
  });

  it('supports Ctrl/Command toggles and a stable Shift range anchor', () => {
    const { ref } = setup('row', false, true);
    fireEvent.click(cell('Alpha'));
    fireEvent.click(cell('Gamma'), { ctrlKey: true });
    expect(ref.current?.getSelectedRowIds()).toEqual(['1', '3']);
    fireEvent.click(cell('Gamma'), { metaKey: true });
    expect(ref.current?.getSelectedRowIds()).toEqual(['1']);
    fireEvent.click(cell('Alpha'));
    fireEvent.click(cell('Beta'), { shiftKey: true });
    fireEvent.click(cell('Gamma'), { shiftKey: true });
    expect(ref.current?.getSelectedRowIds()).toEqual(['1', '2', '3']);
    expect(overlays()).toHaveLength(3);
  });

  it('moves row selection with the keyboard without resetting it on horizontal movement', () => {
    const { ref } = setup('row', false, true);
    fireEvent.click(cell('Alpha'));
    fireEvent.keyDown(cell('Alpha'), { key: 'ArrowDown' });
    expect(ref.current?.getSelectedRowIds()).toEqual(['2']);
    fireEvent.keyDown(cell('Beta'), { key: 'ArrowDown', shiftKey: true });
    expect(ref.current?.getSelectedRowIds()).toEqual(['2', '3']);
    fireEvent.keyDown(cell('Gamma'), { key: 'ArrowLeft' });
    expect(ref.current?.getSelectedRowIds()).toEqual(['2', '3']);
    expect(overlays()).toHaveLength(2);
  });

  it('copies selected whole rows in visible order without a cell-copy overlay', () => {
    setup('row', false, true);
    fireEvent.click(cell('Alpha'));
    fireEvent.click(cell('Gamma'), { ctrlKey: true });
    const setData = vi.fn();
    fireEvent.copy(cell('Gamma'), { clipboardData: { setData } });
    expect(setData).toHaveBeenCalledWith('text/plain', 'A\tAlpha\nC\tGamma');
    expect(document.querySelector('[data-range-overlay]')).toBeNull();
  });

  it('uses the same selection for checkboxes, ref updates and clearSelection', () => {
    const { ref } = setup('row', true, true);
    fireEvent.click(within(cell('Beta').closest('[role="row"]') as HTMLElement).getByRole('checkbox'));
    expect(overlays()).toHaveLength(1);
    expect(ref.current?.getSelectedRowIds()).toEqual(['2']);
    act(() => ref.current?.setSelectedRowIds(['1', '3']));
    expect(overlays()).toHaveLength(2);
    act(() => ref.current?.clearSelection());
    expect(ref.current?.getSelectedRows()).toEqual([]);
    expect(overlays()).toHaveLength(0);
  });

  it('preserves selected rows when context-menu row selection is disabled', () => {
    const { ref } = setup('row');
    fireEvent.click(cell('Alpha'));
    const target = cell('Gamma');
    fireEvent.mouseDown(target, { button: 2 });
    fireEvent.contextMenu(target);
    expect(ref.current?.getSelectedRowIds()).toEqual(['1']);
    expect(overlays()[0]).toHaveAttribute('data-row-selection-overlay', '1');
    expect(getComputedStyle(target).outline).toBe('none');
  });

  it('switches modes on memoized rows and clears old cell range state', () => {
    const { rerender, ref } = setup('cell');
    fireEvent.mouseDown(cell('Alpha'), { button: 0 });
    fireEvent.mouseEnter(cell('Gamma'));
    fireEvent.mouseUp(cell('Gamma'));
    rerender(<F1Grid rows={rows} columns={columns} rowKey="id" ref={ref}
      showCheckbox={false} selectionMode="row" />);
    fireEvent.click(cell('Beta'));
    expect(overlays()).toHaveLength(1);
    expect(document.querySelector('[data-range-overlay]')).toBeNull();
    rerender(<F1Grid rows={rows} columns={columns} rowKey="id" ref={ref}
      showCheckbox={false} selectionMode="cell" />);
    expect(overlays()).toHaveLength(0);
    expect(getComputedStyle(cell('Beta')).outline).toBe('2px solid');
  });

  it('keeps editing and Tab movement available in row mode', () => {
    const { ref } = setup('row');
    fireEvent.click(cell('Alpha'));
    fireEvent.doubleClick(cell('Alpha'));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Edited' } });
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Tab' });
    expect(ref.current?.getChanges().updatedRows).toEqual([
      expect.objectContaining({ id: '1', name: 'Edited' }),
    ]);
    expect(ref.current?.getSelectedRowIds()).toEqual(['2']);
  });

  it.each(['cell', 'row'] as const)('defaults to one selected row with modifiers in %s mode', (mode) => {
    const { ref, onSelectionChange } = setup(mode);
    fireEvent.click(cell('Alpha'));
    fireEvent.click(cell('Gamma'), { ctrlKey: true });
    expect(ref.current?.getSelectedRowIds()).toEqual(['3']);
    fireEvent.click(cell('Beta'), { metaKey: true });
    expect(ref.current?.getSelectedRowIds()).toEqual(['2']);
    fireEvent.click(cell('Alpha'), { shiftKey: true });
    expect(ref.current?.getSelectedRowIds()).toEqual(['1']);
    expect(onSelectionChange.mock.calls.every(([ids]) => ids.length <= 1)).toBe(true);
  });

  it('moves to only the next row with Shift arrows by default', () => {
    const { ref } = setup('row');
    fireEvent.click(cell('Alpha'));
    fireEvent.keyDown(cell('Alpha'), { key: 'ArrowDown', shiftKey: true });
    expect(ref.current?.getSelectedRowIds()).toEqual(['2']);
    expect(overlays()).toHaveLength(1);
  });

  it('replaces checkbox selection and allows unchecking without a select-all control by default', () => {
    const { ref } = setup('row', true);
    const checkbox = (name: string) =>
      within(cell(name).closest('[role="row"]') as HTMLElement).getByRole('checkbox');
    expect(screen.queryByLabelText('전체 행 선택')).not.toBeInTheDocument();
    fireEvent.click(checkbox('Alpha'));
    fireEvent.click(checkbox('Gamma'));
    expect(ref.current?.getSelectedRowIds()).toEqual(['3']);
    expect(checkbox('Alpha')).not.toBeChecked();
    fireEvent.click(checkbox('Gamma'));
    expect(ref.current?.getSelectedRowIds()).toEqual([]);
    expect(overlays()).toHaveLength(0);
  });

  it('limits initial and ref selection to the first valid row in visible order', () => {
    const ref = createRef<F1GridRef<Row>>();
    const onSelectionChange = vi.fn();
    render(<F1Grid rows={rows} columns={columns} rowKey="id" ref={ref}
      selectionMode="row" initialSelectedRowIds={['missing', '3', '2']}
      onSelectionChange={onSelectionChange} />);
    expect(ref.current?.getSelectedRowIds()).toEqual(['2']);
    act(() => ref.current?.setSelectedRowIds(['missing', '3', '1']));
    expect(ref.current?.getSelectedRows()).toEqual([rows[0]]);
    expect(overlays()).toHaveLength(1);
    expect(onSelectionChange.mock.calls.every(([ids]) => ids.length <= 1)).toBe(true);
  });

  it('selects all only when opted in and does not restore discarded rows after disabling', () => {
    const { ref, rerender, onSelectionChange } = setup('row', true, true);
    const header = screen.getByLabelText('전체 행 선택');
    fireEvent.click(within(header.parentElement as HTMLElement).getByRole('checkbox'));
    expect(ref.current?.getSelectedRowIds()).toEqual(['1', '2', '3']);
    onSelectionChange.mockClear();
    rerender(<F1Grid rows={rows} columns={columns} rowKey="id" ref={ref}
      selectionMode="row" multiSelect={false} onSelectionChange={onSelectionChange} />);
    expect(ref.current?.getSelectedRowIds()).toEqual(['1']);
    expect(overlays()).toHaveLength(1);
    expect(screen.queryByLabelText('전체 행 선택')).not.toBeInTheDocument();
    expect(onSelectionChange.mock.calls.every(([ids]) => ids.length <= 1)).toBe(true);
    rerender(<F1Grid rows={rows} columns={columns} rowKey="id" ref={ref}
      selectionMode="row" multiSelect />);
    expect(ref.current?.getSelectedRowIds()).toEqual(['1']);
  });

  it('keeps the first non-excluded row when disabling select-all with exceptions', () => {
    const { ref, rerender } = setup('row', true, true);
    fireEvent.click(screen.getByLabelText('전체 행 선택').querySelector('input') as HTMLInputElement);
    fireEvent.click(within(cell('Alpha').closest('[role="row"]') as HTMLElement).getByRole('checkbox'));
    expect(ref.current?.getSelectedRowIds()).toEqual(['2', '3']);
    rerender(<F1Grid rows={rows} columns={columns} rowKey="id" ref={ref}
      selectionMode="row" multiSelect={false} />);
    expect(ref.current?.getSelectedRowIds()).toEqual(['2']);
  });

  it('keeps data-column headerCheckbox editing independent of multiSelect', () => {
    type CheckboxRow = Row & { enabled: boolean };
    const ref = createRef<F1GridRef<CheckboxRow>>();
    render(<F1Grid rows={rows.map((row) => ({ ...row, enabled: true }))}
      columns={[
        { field: 'name', headerName: 'Name' },
        { field: 'enabled', headerName: 'Enabled', type: 'checkbox', editable: true, headerCheckbox: true },
      ]} rowKey="id" ref={ref} />);
    expect(screen.queryByLabelText('전체 행 선택')).not.toBeInTheDocument();
    fireEvent.click(within(screen.getByRole('columnheader', { name: /Enabled/ })).getByRole('checkbox'));
    expect(ref.current?.getRows().every((row) => row.enabled === false)).toBe(true);
    expect(ref.current?.getChanges().updatedRows).toHaveLength(3);
    expect(ref.current?.getSelectedRowIds()).toEqual([]);
  });
});

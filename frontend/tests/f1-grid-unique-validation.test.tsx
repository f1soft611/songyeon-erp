import { act, fireEvent, render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import {
  F1Grid,
  createGridValidationContext,
  validateGridRow,
  type F1GridColumn,
  type F1GridRef,
} from '../src/shared/components/f1-grid';

type Row = { id: string; name: string; count: number; enabled: boolean };
const row = (id: string, name: string): Row => ({ id, name, count: 0, enabled: false });
const columns: F1GridColumn<Row>[] = [
  { field: 'name', headerName: '이름', editable: true, validation: { unique: true } },
];

describe('F1Grid unique column validation', () => {
  it('normalizes digit-only unique keys without changing values or losing leading zeroes', () => {
    const digitColumns: F1GridColumn<Row>[] = [
      { field: 'name', headerName: '번호', validation: { unique: 'digits' } },
    ];
    const rows = [row('1', '012-34-56789'), row('2', 'Other')];
    const context = createGridValidationContext(rows, digitColumns, 'id');
    expect(validateGridRow(row('2', '0123456789'), digitColumns, context))
      .toEqual({ name: '번호 값이 중복되었습니다.' });
    expect(validateGridRow(row('2', '012 34 56789'), digitColumns, context))
      .toEqual({ name: '번호 값이 중복되었습니다.' });
    expect(validateGridRow(row('1', '0123456789'), digitColumns, context)).toEqual({});
    expect(validateGridRow(row('3', '123456789'), digitColumns, context)).toEqual({});
    expect(validateGridRow(row('3', '---'), digitColumns, context)).toEqual({});
    expect(rows[0].name).toBe('012-34-56789');
  });

  it('compares trimmed names while excluding self and preserving case sensitivity', () => {
    const rows = [row('1', ' Acme '), row('2', 'Other')];
    const context = createGridValidationContext(rows, columns, 'id');
    expect(validateGridRow(row('1', 'Acme'), columns, context)).toEqual({});
    expect(validateGridRow(row('2', 'Acme '), columns, context)).toEqual({
      name: '이름 값이 중복되었습니다.',
    });
    expect(validateGridRow(row('3', 'acme'), columns, context)).toEqual({});
  });

  it('skips empty optional values and leaves undeclared columns unchanged', () => {
    const rows = [row('1', '  '), row('2', '')];
    expect(validateGridRow(rows[1], columns, createGridValidationContext(rows, columns, 'id'))).toEqual({});
    const ordinary: F1GridColumn<Row>[] = [{ field: 'name', headerName: '이름' }];
    const duplicates = [row('1', 'Acme'), row('2', 'Acme')];
    expect(validateGridRow(duplicates[1], ordinary, createGridValidationContext(duplicates, ordinary, 'id'))).toEqual({});
  });

  it('treats zero and false as comparable values', () => {
    const numericColumns: F1GridColumn<Row>[] = [
      { field: 'count', headerName: '수량', validation: { unique: true } },
      { field: 'enabled', headerName: '활성', validation: { unique: true } },
    ];
    const rows = [row('1', 'One'), row('2', 'Two')];
    expect(validateGridRow(rows[1], numericColumns, createGridValidationContext(rows, numericColumns, 'id'))).toEqual({
      count: '수량 값이 중복되었습니다.',
      enabled: '활성 값이 중복되었습니다.',
    });
  });

  it('validates form drafts and inline rows against active rows and excludes deleted rows', () => {
    const ref = createRef<F1GridRef<Row>>();
    const onValidationErrors = vi.fn();
    render(<F1Grid
      ref={ref}
      rows={[row('1', 'Acme'), row('2', 'Other')]}
      columns={columns}
      rowKey="id"
      rowFormPlugin={{}}
      onValidationErrors={onValidationErrors}
    />);
    act(() => ref.current?.addRow(row('3', ' Acme ')));
    fireEvent.click(screen.getByRole('button', { name: '적용' }));
    expect(screen.getByRole('textbox', { name: '이름' })).toHaveAttribute('aria-invalid', 'true');
    expect(onValidationErrors).toHaveBeenLastCalledWith([
      { rowId: '3', field: 'name', message: '이름 값이 중복되었습니다.' },
    ]);
    fireEvent.change(screen.getByRole('textbox', { name: '이름' }), { target: { value: 'Unique' } });
    fireEvent.click(screen.getByRole('button', { name: '적용' }));
    expect(onValidationErrors).toHaveBeenLastCalledWith([]);
    act(() => ref.current?.setCellValue('2', 'name', 'Acme'));
    act(() => expect(ref.current?.validate()).toBe(false));
    expect(onValidationErrors).toHaveBeenLastCalledWith([
      { rowId: '1', field: 'name', message: '이름 값이 중복되었습니다.' },
      { rowId: '2', field: 'name', message: '이름 값이 중복되었습니다.' },
    ]);
    act(() => ref.current?.setSelectedRowIds(['1']));
    act(() => ref.current?.deleteSelectedRows());
    act(() => expect(ref.current?.validate()).toBe(true));
    expect(onValidationErrors).toHaveBeenLastCalledWith([]);
  });

  it('includes rows hidden by the row projection when validating visible rows', () => {
    const ref = createRef<F1GridRef<Row>>();
    const onValidationErrors = vi.fn();
    render(<F1Grid
      ref={ref}
      rows={[row('1', 'Acme'), row('2', 'Acme')]}
      columns={columns}
      rowKey="id"
      rowProjection={(rows) => ({ rows: rows.filter((row) => row.id === '2') })}
      onValidationErrors={onValidationErrors}
    />);
    expect(screen.getAllByRole('gridcell', { name: 'Acme' })).toHaveLength(1);
    act(() => expect(ref.current?.validate()).toBe(false));
    expect(onValidationErrors).toHaveBeenLastCalledWith([
      { rowId: '2', field: 'name', message: '이름 값이 중복되었습니다.' },
    ]);
  });
});

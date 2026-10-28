import { createRef } from 'react';
import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { F1Grid, type F1GridRef } from '../src/shared/components/f1-grid';
import { CellEditor } from '../src/shared/components/f1-grid/editing/CellEditor';
import { GridFormField } from '../src/shared/components/f1-grid/form/GridFormField';
import type { F1GridColumn } from '../src/shared/components/f1-grid';

type InputRow = {
  value: string;
};

const sanitizeInput = (value: string) => value.replace(/[^0-9-]/g, '');

describe('F1-Grid customer input sanitizer hook', () => {
  it('formats inline text editor changes using the column input format', () => {
    const onChange = vi.fn();
    render(
      <CellEditor
        column={{
          field: 'value',
          headerName: '사업자번호',
          inputFormat: { type: 'digits', groupSizes: [3, 2] },
        }}
        value=""
        onChange={onChange}
        onKeyDown={vi.fn()}
        onSelectChange={vi.fn()}
        userValue=""
        onUserChange={vi.fn()}
        onCommitEdit={vi.fn()}
        onCodePick={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: '1234567890' },
    });

    expect(onChange).toHaveBeenCalledWith('123-45-67890');
  });

  it('caps inline text editor digits when maxDigits is configured', () => {
    const onChange = vi.fn();
    render(
      <CellEditor
        column={{
          field: 'value',
          headerName: '사업자번호',
          inputFormat: { type: 'digits', groupSizes: [3, 2], maxDigits: 10 },
        }}
        value=""
        onChange={onChange}
        onKeyDown={vi.fn()}
        onSelectChange={vi.fn()}
        userValue=""
        onUserChange={vi.fn()}
        onCommitEdit={vi.fn()}
        onCodePick={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: '123456789012' },
    });

    expect(onChange).toHaveBeenCalledWith('123-45-67890');
  });

  it('keeps the caret after the same digit when a separator is inserted', () => {
    function ControlledCellEditor() {
      const [value, setValue] = useState('12345');
      return (
        <CellEditor
          column={{
            field: 'value',
            headerName: '사업자번호',
            inputFormat: { type: 'digits', groupSizes: [3, 2] },
            selectOnFocus: false,
          }}
          value={value}
          onChange={setValue}
          onKeyDown={vi.fn()}
          onSelectChange={vi.fn()}
          userValue=""
          onUserChange={vi.fn()}
          onCommitEdit={vi.fn()}
          onCodePick={vi.fn()}
        />
      );
    }

    render(<ControlledCellEditor />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    fireEvent.change(input, {
      target: { value: '123945', selectionStart: 4, selectionEnd: 4 },
    });

    expect(input).toHaveValue('123-94-5');
    expect(input.selectionStart).toBe(5);
  });

  it('sanitizes inline text editor changes when configured', () => {
    const onChange = vi.fn();
    const column: F1GridColumn<InputRow> = {
      field: 'value',
      headerName: '전화번호',
      sanitizeInput,
    };
    render(
      <CellEditor
        column={column}
        value=""
        onChange={onChange}
        onKeyDown={vi.fn()}
        onSelectChange={vi.fn()}
        userValue=""
        onUserChange={vi.fn()}
        onCommitEdit={vi.fn()}
        onCodePick={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'AB012-3X' },
    });

    expect(onChange).toHaveBeenCalledWith('012-3');
  });

  it('sanitizes row-form text changes when configured', () => {
    const onPatch = vi.fn();
    const column: F1GridColumn<InputRow> = {
      field: 'value',
      headerName: '전화번호',
      sanitizeInput,
    };
    render(
      <GridFormField
        column={column}
        row={{ value: '' }}
        mode="edit"
        value=""
        readOnly={false}
        onPatch={onPatch}
      />,
    );

    fireEvent.change(screen.getByRole('textbox', { name: '전화번호' }), {
      target: { value: 'AB012-3X' },
    });

    expect(onPatch).toHaveBeenCalledWith({ value: '012-3' });
  });

  it('formats row-form changes using the column input format', () => {
    const onPatch = vi.fn();
    const column: F1GridColumn<InputRow> = {
      field: 'value',
      headerName: '사업자번호',
      inputFormat: { type: 'digits', groupSizes: [3, 2] },
    };
    render(
      <GridFormField
        column={column}
        row={{ value: '' }}
        mode="edit"
        value=""
        readOnly={false}
        onPatch={onPatch}
      />,
    );

    fireEvent.change(screen.getByRole('textbox', { name: '사업자번호' }), {
      target: { value: '1234567890' },
    });

    expect(onPatch).toHaveBeenCalledWith({ value: '123-45-67890' });
  });

  it('caps row-form digits when maxDigits is configured', () => {
    const onPatch = vi.fn();
    const column: F1GridColumn<InputRow> = {
      field: 'value',
      headerName: '사업자번호',
      inputFormat: { type: 'digits', groupSizes: [3, 2], maxDigits: 10 },
    };
    render(
      <GridFormField
        column={column}
        row={{ value: '' }}
        mode="edit"
        value=""
        readOnly={false}
        onPatch={onPatch}
      />,
    );

    fireEvent.change(screen.getByRole('textbox', { name: '사업자번호' }), {
      target: { value: '123456789012' },
    });

    expect(onPatch).toHaveBeenCalledWith({ value: '123-45-67890' });
  });

  it('keeps unsanitized text columns unchanged', () => {
    const onChange = vi.fn();
    render(
      <CellEditor
        column={{ field: 'value', headerName: '거래처명' }}
        value=""
        onChange={onChange}
        onKeyDown={vi.fn()}
        onSelectChange={vi.fn()}
        userValue=""
        onUserChange={vi.fn()}
        onCommitEdit={vi.fn()}
        onCodePick={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'Acme 12' },
    });

    expect(onChange).toHaveBeenCalledWith('Acme 12');
  });

  it('sanitizes TSV paste into configured F1-Grid cells', () => {
    type PasteRow = InputRow & { id: string; notes: string };
    const gridRef = createRef<F1GridRef<PasteRow>>();
    render(
      <F1Grid
        ref={gridRef}
        rows={[{ id: 'row-1', value: 'legacy/A-10', notes: '' }]}
        columns={[
          {
            field: 'value',
            headerName: '전화번호',
            editable: true,
            sanitizeInput,
          },
          { field: 'notes', headerName: '메모', editable: true },
        ]}
        rowKey="id"
      />,
    );

    const cell = screen.getByRole('gridcell', { name: 'legacy/A-10' });
    fireEvent.click(cell);
    fireEvent.paste(cell, {
      clipboardData: { getData: () => 'AB012-3X\tAcme X' },
    });

    expect(gridRef.current?.getChanges().updatedRows).toEqual([
      expect.objectContaining({
        id: 'row-1',
        value: '012-3',
        notes: 'Acme X',
      }),
    ]);
  });

  it('formats TSV paste using each target column input format', () => {
    type PasteRow = InputRow & { id: string; notes: string };
    const gridRef = createRef<F1GridRef<PasteRow>>();
    render(
      <F1Grid
        ref={gridRef}
        rows={[{ id: 'row-1', value: 'old-value', notes: '' }]}
        columns={[
          {
            field: 'value',
            headerName: '사업자번호',
            editable: true,
            inputFormat: { type: 'digits', groupSizes: [3, 2] },
          },
          { field: 'notes', headerName: '메모', editable: true },
        ]}
        rowKey="id"
      />,
    );

    const cell = screen.getByRole('gridcell', { name: 'old-value' });
    fireEvent.click(cell);
    fireEvent.paste(cell, {
      clipboardData: { getData: () => '1234567890\tAcme X' },
    });

    expect(gridRef.current?.getChanges().updatedRows).toEqual([
      expect.objectContaining({
        id: 'row-1',
        value: '123-45-67890',
        notes: 'Acme X',
      }),
    ]);
  });

  it('caps TSV paste digits using maxDigits in target column format', () => {
    type PasteRow = InputRow & { id: string; notes: string };
    const gridRef = createRef<F1GridRef<PasteRow>>();
    render(
      <F1Grid
        ref={gridRef}
        rows={[{ id: 'row-1', value: 'old-value', notes: '' }]}
        columns={[
          {
            field: 'value',
            headerName: '사업자번호',
            editable: true,
            inputFormat: { type: 'digits', groupSizes: [3, 2], maxDigits: 10 },
          },
          { field: 'notes', headerName: '메모', editable: true },
        ]}
        rowKey="id"
      />
    );

    const cell = screen.getByRole('gridcell', { name: 'old-value' });
    fireEvent.click(cell);
    fireEvent.paste(cell, {
      clipboardData: { getData: () => '123456789012\tAcme X' },
    });

    expect(gridRef.current?.getChanges().updatedRows).toEqual([
      expect.objectContaining({
        id: 'row-1',
        value: '123-45-67890',
        notes: 'Acme X',
      }),
    ]);
  });

  it('preserves existing row-form values until the user changes them', () => {
    const onPatch = vi.fn();
    const value = 'legacy/A-10';
    const column: F1GridColumn<InputRow> = {
      field: 'value',
      headerName: '전화번호',
      sanitizeInput,
    };
    render(
      <GridFormField
        column={column}
        row={{ value }}
        mode="edit"
        value={value}
        readOnly={false}
        onPatch={onPatch}
      />,
    );

    expect(screen.getByRole('textbox', { name: '전화번호' })).toHaveValue(value);
    expect(onPatch).not.toHaveBeenCalled();
  });
});

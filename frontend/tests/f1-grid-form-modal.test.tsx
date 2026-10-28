import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { F1Grid } from '../src/shared/components/f1-grid';
import { getGridColumnPinOffsets } from '../src/shared/components/f1-grid/columns/GridColumnPin';
import { F1GridFormModal } from '../src/shared/components/f1-grid/form/F1GridFormModal';
import { GridFormField } from '../src/shared/components/f1-grid/form/GridFormField';
import {
  buildGridFormSections,
  isGridFormFieldReadOnly,
} from '../src/shared/components/f1-grid/form/GridFormModel';
import type { F1GridColumn, F1GridRef } from '../src/shared/components/f1-grid';

type FormRow = {
  id: string;
  name: string;
  status: boolean;
  department: string;
  memo: string;
  secret: string;
};

type MultiSelectRow = {
  id: string;
  ownerIds: string[];
};

describe('F1-Grid form model', () => {
  it('reports required and digit-count errors consistently from form apply and grid validate', () => {
    const ref = createRef<F1GridRef<{ id: string; number: string }>>();
    const onValidationErrors = vi.fn();
    render(
      <F1Grid
        ref={ref}
        rows={[{ id: 'row-1', number: '' }]}
        columns={[{
          field: 'number',
          headerName: '번호',
          editable: true,
          required: true,
          inputFormat: { type: 'digits', validDigitCounts: [10] },
        }]}
        rowKey="id"
        rowFormPlugin={{}}
        onValidationErrors={onValidationErrors}
      />,
    );
    act(() => expect(ref.current?.validate()).toBe(false));
    expect(onValidationErrors).toHaveBeenLastCalledWith([
      { rowId: 'row-1', field: 'number', message: '번호은(는) 필수입니다.' },
    ]);
    act(() => ref.current?.addRow({ id: 'row-2', number: '123' }));
    fireEvent.click(screen.getByRole('button', { name: '적용' }));
    expect(onValidationErrors).toHaveBeenLastCalledWith([
      { rowId: 'row-2', field: 'number', message: '번호은(는) 10자리여야 합니다.' },
    ]);
    fireEvent.change(screen.getByRole('textbox', { name: '번호' }), {
      target: { value: '1234567890' },
    });
    fireEvent.click(screen.getByRole('button', { name: '적용' }));
    expect(onValidationErrors).toHaveBeenLastCalledWith([]);
    act(() => ref.current?.setCellValue('row-1', 'number', '1234567890'));
    act(() => expect(ref.current?.validate()).toBe(true));
    expect(onValidationErrors).toHaveBeenLastCalledWith([]);
  });

  it('builds form sections from editable fields only by default', () => {
    const columns: F1GridColumn<FormRow>[] = [
      { field: 'id', headerName: '번호', type: 'rownumber' },
      {
        field: 'name',
        headerName: '이름',
        editable: true,
        headerGroup: '기본 정보',
        form: { order: 20, span: 2 },
      },
      {
        field: 'status',
        headerName: '사용 여부',
        editable: false,
        headerGroup: '상태',
        form: { order: 10 },
      },
      {
        field: 'department',
        headerName: '부서',
        editable: true,
        headerGroup: '기본 정보',
        form: { group: '조직', order: 10, label: '소속 부서' },
      },
      { field: 'memo', headerName: '메모' },
      {
        field: 'secret',
        headerName: '숨김 값',
        editable: true,
        hidden: true,
        form: { hidden: false, group: '상태', order: 15 },
      },
      {
        field: 'department',
        headerName: '제외할 필드',
        editable: true,
        form: { hidden: true },
      },
    ];

    const sections = buildGridFormSections(columns, {
      id: '1',
      name: '홍길동',
      status: true,
      department: '개발',
      memo: '메모',
      secret: '숨김',
    });

    expect(sections.map((section) => section.group)).toEqual([
      '기본 정보',
      '조직',
      '상태',
    ]);
    expect(
      sections.map((section) => section.fields.map((field) => field.field)),
    ).toEqual([['name'], ['department'], ['secret']]);
    expect(sections[0].fields[0]).toEqual({
      column: columns[1],
      field: 'name',
      label: '이름',
      group: '기본 정보',
      order: 20,
      span: 2,
    });
    expect(sections[1].fields[0]).toEqual({
      column: columns[3],
      field: 'department',
      label: '소속 부서',
      group: '조직',
      order: 10,
      span: 1,
    });
    expect(sections[2].fields[0]).toEqual({
      column: columns[5],
      field: 'secret',
      label: '숨김 값',
      group: '상태',
      order: 15,
      span: 1,
    });
  });

  it('resolves form model field read-only state from form override or cell editability', () => {
    const row: FormRow = {
      id: '1',
      name: '홍길동',
      status: true,
      department: '개발',
      memo: '',
      secret: '',
    };
    const formReadOnly: F1GridColumn<FormRow> = {
      field: 'name',
      headerName: '이름',
      editable: true,
      form: { readOnly: true },
    };
    const formReadOnlyByMode: F1GridColumn<FormRow> = {
      field: 'department',
      headerName: '부서',
      form: { readOnly: (_row, mode) => mode === 'edit' },
    };
    const checkbox: F1GridColumn<FormRow> = {
      field: 'status',
      headerName: '사용 여부',
      type: 'checkbox',
    };
    const ordinary: F1GridColumn<FormRow> = {
      field: 'memo',
      headerName: '메모',
    };

    expect(isGridFormFieldReadOnly(formReadOnly, row, 'create')).toBe(true);
    expect(isGridFormFieldReadOnly(formReadOnlyByMode, row, 'create')).toBe(
      false,
    );
    expect(isGridFormFieldReadOnly(formReadOnlyByMode, row, 'edit')).toBe(true);
    expect(isGridFormFieldReadOnly(checkbox, row, 'edit')).toBe(false);
    expect(isGridFormFieldReadOnly(ordinary, row, 'edit')).toBe(true);
  });

  it('resolves dynamic form labels from the current row', () => {
    const column: F1GridColumn<FormRow> = {
      field: 'name',
      headerName: '소비기한 숫자',
      editable: true,
      form: {
        label: (currentRow) =>
          currentRow.status ? '소비기한 숫자 (일)' : '소비기한 숫자',
      },
    };

    expect(buildGridFormSections([column], {
      id: '1',
      name: '홍길동',
      status: true,
      department: '',
      memo: '',
      secret: '',
    })[0].fields[0].label).toBe('소비기한 숫자 (일)');
    expect(buildGridFormSections([column])[0].fields[0].label).toBe(
      '소비기한 숫자',
    );
  });
});

type TypedFormRow = {
  id: string;
  name: string;
  quantity: number | '';
  enabled: boolean;
  categoryId: number;
  ownerId: number;
  ownerName: string;
  code: string;
  codeName: string;
  date: string;
  datetime: string;
  time: string;
};

const typedRow: TypedFormRow = {
  id: 'row-1',
  name: '원본 이름',
  quantity: 3,
  enabled: false,
  categoryId: 1,
  ownerId: 10,
  ownerName: '기존 담당자',
  code: 'A01',
  codeName: '기존 코드',
  date: '2026-09-10',
  datetime: '2026-09-10T09:30',
  time: '09:30',
};

describe('typed form field', () => {
  it('renders text with margin none and uses getValue for the displayed value', () => {
    const onPatch = vi.fn();

    const { rerender } = render(
      <GridFormField
        column={{
          field: 'name',
          headerName: '이름',
          getValue: (row) => `${row.name} 표시`,
        }}
        row={typedRow}
        mode="edit"
        value={typedRow.name}
        readOnly={false}
        onPatch={onPatch}
      />,
    );

    const input = screen.getByRole('textbox', { name: '이름' });
    expect(input).toHaveValue('원본 이름 표시');
    expect(input.closest('.MuiTextField-root')).not.toHaveClass(
      'MuiFormControl-marginNormal',
    );

    fireEvent.change(input, { target: { value: '변경 이름' } });
    expect(onPatch).toHaveBeenLastCalledWith({ name: '변경 이름' });
  });

  it('patches non-empty numbers as numbers and empty numbers as an empty string', () => {
    const onPatch = vi.fn();

    const { rerender } = render(
      <GridFormField
        column={{ field: 'quantity', headerName: '수량', type: 'number' }}
        row={typedRow}
        mode="edit"
        value={typedRow.quantity}
        readOnly={false}
        onPatch={onPatch}
      />,
    );

    fireEvent.change(screen.getByRole('spinbutton', { name: '수량' }), {
      target: { value: '12.5' },
    });
    expect(onPatch).toHaveBeenLastCalledWith({ quantity: 12.5 });

    rerender(
      <GridFormField
        column={{ field: 'quantity', headerName: '수량', type: 'number' }}
        row={typedRow}
        mode="edit"
        value={12.5}
        readOnly={false}
        onPatch={onPatch}
      />,
    );
    fireEvent.change(screen.getByRole('spinbutton', { name: '수량' }), {
      target: { value: '' },
    });
    expect(onPatch).toHaveBeenLastCalledWith({ quantity: '' });
  });

  it('patches checkbox values as booleans', () => {
    const onPatch = vi.fn();

    render(
      <GridFormField
        column={{ field: 'enabled', headerName: '사용 여부', type: 'checkbox' }}
        row={typedRow}
        mode="edit"
        value={typedRow.enabled}
        readOnly={false}
        onPatch={onPatch}
      />,
    );

    fireEvent.click(screen.getByRole('checkbox', { name: '사용 여부' }));
    expect(onPatch).toHaveBeenLastCalledWith({ enabled: true });
  });

  it('preserves the original number value of select options', () => {
    const onPatch = vi.fn();

    render(
      <GridFormField
        column={{
          field: 'categoryId',
          headerName: '분류',
          type: 'select',
          options: [
            { value: 1, label: '일반' },
            { value: 2, label: '중요' },
          ],
        }}
        row={typedRow}
        mode="edit"
        value={typedRow.categoryId}
        readOnly={false}
        onPatch={onPatch}
      />,
    );

    fireEvent.mouseDown(screen.getByRole('combobox', { name: '분류' }));
    fireEvent.click(screen.getByRole('option', { name: '중요' }));
    expect(onPatch).toHaveBeenLastCalledWith({ categoryId: 2 });
  });

  it('supports single user selection in a row form field', () => {
    const onPatch = vi.fn();
    const userColumn = {
      field: 'ownerId',
      headerName: '담당자',
      type: 'user',
      userOptions: [
        {
          value: 10,
          label: '김담당',
          avatarUrl: '/profiles/fixture.png',
          positionName: '과장',
        },
        { value: 20, label: '이담당', departmentName: '운영팀' },
      ],
    } as unknown as F1GridColumn<TypedFormRow>;

    const { container } = render(
      <GridFormField
        column={userColumn}
        row={typedRow}
        mode="edit"
        value={typedRow.ownerId}
        readOnly={false}
        onPatch={onPatch}
      />,
    );

    const input = screen.getByRole('combobox', { name: '담당자' });
    expect(
      input.closest('.MuiOutlinedInput-root')?.querySelector('fieldset'),
    ).not.toBeNull();
    expect(screen.getByText('김담당')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Open' }));
    expect(screen.getByText('과장')).toBeVisible();
    expect(screen.getByText('운영팀')).toBeVisible();
    expect(
      container.querySelector('img[src="/profiles/fixture.png"]'),
    ).not.toBeNull();
    fireEvent.change(input, { target: { value: '운영팀' } });
    fireEvent.click(screen.getByRole('option', { name: /이담당/ }));

    expect(onPatch).toHaveBeenLastCalledWith({ ownerId: 20 });
  });

  it('supports array values for a multiple select field in the row form', () => {
    const onPatch = vi.fn();
    const row: MultiSelectRow = { id: '1', ownerIds: ['110'] };

    render(
      <GridFormField
        column={{
          field: 'ownerIds',
          headerName: '담당자',
          type: 'select',
          options: [
            { value: '110', label: '홍길동' },
            { value: '111', label: '김담당' },
          ],
          getValue: () => '홍길동',
          form: { multiple: true },
        }}
        row={row}
        mode="edit"
        value={row.ownerIds}
        readOnly={false}
        onPatch={onPatch}
      />,
    );

    fireEvent.mouseDown(screen.getByRole('combobox', { name: '담당자' }));
    fireEvent.click(screen.getByRole('option', { name: '김담당' }));

    expect(onPatch).toHaveBeenLastCalledWith({ ownerIds: ['110', '111'] });
  });

  it('supports multiple user selection and chip removal in the row form', () => {
    const onPatch = vi.fn();
    const row: MultiSelectRow = { id: '1', ownerIds: ['110'] };

    const { rerender } = render(
      <GridFormField
        column={{
          field: 'ownerIds',
          headerName: '담당자',
          type: 'user',
          userOptions: [
            { value: '110', label: '홍길동', departmentName: '운영팀' },
            { value: '111', label: '김담당', positionName: '과장' },
          ],
          form: { multiple: true },
        }}
        row={row}
        mode="edit"
        value={row.ownerIds}
        readOnly={false}
        onPatch={onPatch}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open' }));
    fireEvent.click(screen.getByRole('option', { name: /김담당/ }));
    expect(onPatch).toHaveBeenLastCalledWith({ ownerIds: ['110', '111'] });

    rerender(
      <GridFormField
        column={{
          field: 'ownerIds',
          headerName: '담당자',
          type: 'user',
          userOptions: [
            { value: '110', label: '홍길동', departmentName: '운영팀' },
            { value: '111', label: '김담당', positionName: '과장' },
          ],
          form: { multiple: true },
        }}
        row={{ id: '1', ownerIds: ['110', '111'] }}
        mode="edit"
        value={['110', '111']}
        readOnly={false}
        onPatch={onPatch}
      />,
    );

    const selectedChip = screen
      .getByRole('button', { name: /홍길동/ })
      .closest('.MuiChip-root');
    const deleteIcon = selectedChip?.querySelector('.MuiChip-deleteIcon');
    expect(deleteIcon).not.toBeNull();
    fireEvent.click(deleteIcon!);
    expect(onPatch).toHaveBeenLastCalledWith({ ownerIds: ['111'] });
  });

  it('preserves the original value of autocomplete options', () => {
    const onPatch = vi.fn();

    render(
      <GridFormField
        column={{
          field: 'ownerId',
          headerName: '담당자',
          type: 'autocomplete',
          options: [
            { value: 10, label: '김담당' },
            { value: 20, label: '이담당' },
          ],
        }}
        row={typedRow}
        mode="edit"
        value={typedRow.ownerId}
        readOnly={false}
        onPatch={onPatch}
      />,
    );

    const input = screen.getByRole('combobox', { name: '담당자' });
    fireEvent.mouseDown(input);
    fireEvent.click(screen.getByRole('option', { name: '이담당' }));
    expect(onPatch).toHaveBeenLastCalledWith({ ownerId: 20 });
  });

  it('uses the column onValueChange patch when provided', () => {
    const onPatch = vi.fn();

    render(
      <GridFormField
        column={{
          field: 'ownerId',
          headerName: '담당자',
          type: 'select',
          options: [{ value: 20, label: '이담당' }],
          onValueChange: (_row, value) => ({
            ownerId: value as number,
            ownerName: '이담당',
          }),
        }}
        row={typedRow}
        mode="edit"
        value={typedRow.ownerId}
        readOnly={false}
        onPatch={onPatch}
      />,
    );

    fireEvent.mouseDown(screen.getByRole('combobox', { name: '담당자' }));
    fireEvent.click(screen.getByRole('option', { name: '이담당' }));
    expect(onPatch).toHaveBeenLastCalledWith({
      ownerId: 20,
      ownerName: '이담당',
    });
  });

  it('applies a code picker callback after the picker has opened', () => {
    let choose!: (patch: Partial<TypedFormRow>) => void;
    const onPatch = vi.fn();
    render(
      <GridFormField
        column={{ field: 'code', headerName: '품목 코드', type: 'code',
          onOpenCodePicker: (_row, applyPatch) => { choose = applyPatch; } }}
        row={typedRow} mode="edit" value={typedRow.code} readOnly={false} onPatch={onPatch}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: '품목 코드 선택' }));
    expect(onPatch).not.toHaveBeenCalled();
    act(() => choose({ code: 'C03', codeName: '선택 코드' }));
    expect(onPatch).toHaveBeenCalledWith({ code: 'C03', codeName: '선택 코드' });
  });

  it('merges code picker callback and return patches', () => {
    const onPatch = vi.fn();
    const onOpenCodePicker = vi.fn((_row, applyPatch) => {
      applyPatch({ code: 'B02' });
      return { codeName: '변경 코드' };
    });

    render(
      <GridFormField
        column={{
          field: 'code',
          headerName: '품목 코드',
          type: 'code',
          onOpenCodePicker,
        }}
        row={typedRow}
        mode="edit"
        value={typedRow.code}
        readOnly={false}
        onPatch={onPatch}
      />,
    );

    expect(screen.getByRole('textbox', { name: '품목 코드' })).toHaveAttribute(
      'readonly',
    );
    fireEvent.click(screen.getByRole('button', { name: '품목 코드 선택' }));

    expect(onOpenCodePicker).toHaveBeenCalledWith(
      typedRow,
      expect.any(Function),
    );
    expect(onPatch).toHaveBeenCalledTimes(1);
    expect(onPatch).toHaveBeenCalledWith({
      code: 'B02',
      codeName: '변경 코드',
    });
  });

  it.each([
    ['date', 'date', '2026-09-11'],
    ['datetime', 'datetime-local', '2026-09-11T10:45'],
    ['time', 'time', '10:45'],
  ] as const)(
    'patches %s values as compatible strings',
    (type, inputType, nextValue) => {
      const onPatch = vi.fn();
      const field = type as 'date' | 'datetime' | 'time';

      render(
        <GridFormField
          column={{ field, headerName: type, type }}
          row={typedRow}
          mode="edit"
          value={typedRow[field]}
          readOnly={false}
          onPatch={onPatch}
        />,
      );

      fireEvent.change(screen.getByLabelText(type), {
        target: { value: nextValue, type: inputType },
      });
      expect(onPatch).toHaveBeenLastCalledWith({ [field]: nextValue });
    },
  );

  it('connects required, read-only, error and helper text accessibility', () => {
    render(
      <GridFormField
        column={{ field: 'name', headerName: '이름', required: true }}
        row={typedRow}
        mode="edit"
        value={typedRow.name}
        readOnly
        error="이름은 필수입니다."
        onPatch={vi.fn()}
      />,
    );

    const input = screen.getByRole('textbox', { name: /이름/ });
    const helper = screen.getByText('이름은 필수입니다.');
    expect(input).toBeRequired();
    expect(input).toHaveAttribute('readonly');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby', helper.id);
  });
});

type ModalRow = {
  id: string;
  name: string;
  department: string;
  memo: string;
  hiddenValue: string;
};

type ExpiryFormRow = {
  id: string;
  expiryedStatus: 'NONE' | 'DAY';
  expiryedCount: number | null;
};

const modalRow: ModalRow = {
  id: 'EMP-001',
  name: '홍길동',
  department: '개발팀',
  memo: '원본 메모',
  hiddenValue: '',
};

const createModalColumns = (): F1GridColumn<ModalRow>[] => [
  { field: 'id', headerName: '사번', editable: true, required: true },
  {
    field: 'name',
    headerName: '이름',
    headerGroup: '인적 정보',
    editable: true,
    required: true,
    form: { order: 20, label: '성명', span: 2 },
  },
  {
    field: 'department',
    headerName: '부서',
    headerGroup: '인적 정보',
    editable: true,
    form: { order: 10 },
  },
  { field: 'memo', headerName: '메모', editable: true, form: { order: 30 } },
  {
    field: 'hiddenValue',
    headerName: '숨김 값',
    editable: true,
    form: { hidden: true },
  },
];

const renderRowFormModal = (
  overrides: Partial<
    React.ComponentProps<typeof F1GridFormModal<ModalRow>>
  > = {},
) => {
  const props: React.ComponentProps<typeof F1GridFormModal<ModalRow>> = {
    open: true,
    mode: 'edit',
    row: modalRow,
    originalRow: modalRow,
    columns: createModalColumns(),
    rowKey: 'id',
    plugin: {},
    onCancel: vi.fn(),
    onApply: vi.fn(),
    ...overrides,
  };

  return { ...render(<F1GridFormModal {...props} />), props };
};

describe('row form modal', () => {
  it('updates a row-dependent unit label and disables the count for NONE', () => {
    const columns: F1GridColumn<ExpiryFormRow>[] = [
      {
        field: 'expiryedCount',
        headerName: '소비기한 숫자',
        type: 'number',
        editable: true,
        form: {
          label: (row) =>
            row.expiryedStatus === 'NONE'
              ? '소비기한 숫자'
              : '소비기한 숫자 (일)',
          disabled: (row) => row.expiryedStatus === 'NONE',
        },
      },
    ];
    const renderExpiryModal = (row: ExpiryFormRow) => (
      <F1GridFormModal
        open
        mode="edit"
        row={row}
        originalRow={row}
        columns={columns}
        rowKey="id"
        plugin={{}}
        onCancel={vi.fn()}
        onApply={vi.fn()}
      />
    );
    const { rerender } = render(renderExpiryModal({
      id: '1',
      expiryedStatus: 'DAY',
      expiryedCount: 30,
    }));

    const activeCount = screen.getByRole('spinbutton', {
      name: '소비기한 숫자 (일)',
    });
    expect(activeCount).toHaveValue(30);
    expect(activeCount).toBeEnabled();

    rerender(
      renderExpiryModal({
        id: '1',
        expiryedStatus: 'NONE',
        expiryedCount: null,
      }),
    );

    const disabledCount = screen.getByRole('spinbutton', {
      name: '소비기한 숫자',
    });
    expect(disabledCount).toHaveValue(null);
    expect(disabledCount).toBeDisabled();
  });

  it('renders an accessible dialog with default edit title and row description', () => {
    renderRowFormModal();

    const dialog = screen.getByRole('dialog', { name: '정보 수정' });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText('대상: EMP-001')).toBeInTheDocument();
    expect(dialog).toHaveAttribute(
      'aria-labelledby',
      screen.getByRole('heading', { name: '정보 수정' }).id,
    );
  });

  it('uses create defaults and plugin title and description contexts', () => {
    const getTitle = vi.fn(({ row }: { row: ModalRow }) => `${row.name} 등록`);
    const getDescription = vi.fn(
      ({ mode }: { mode: 'create' | 'edit' }) => `${mode} 안내`,
    );
    const { rerender } = renderRowFormModal({
      mode: 'create',
      row: { ...modalRow, id: '' },
      originalRow: undefined,
    });

    expect(
      screen.getByRole('dialog', { name: '신규 등록' }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/^대상:/)).not.toBeInTheDocument();

    rerender(
      <F1GridFormModal
        open
        mode="create"
        row={{ ...modalRow, id: '' }}
        columns={createModalColumns()}
        rowKey="id"
        plugin={{ getTitle, getDescription }}
        onCancel={vi.fn()}
        onApply={vi.fn()}
      />,
    );

    expect(
      screen.getByRole('dialog', { name: '홍길동 등록' }),
    ).toBeInTheDocument();
    expect(screen.getByText('create 안내')).toBeInTheDocument();
    expect(getTitle).toHaveBeenCalledWith({
      mode: 'create',
      row: expect.objectContaining({ name: '홍길동' }),
    });
  });

  it('allows the target label and field to be configured from form metadata', () => {
    render(
      <F1GridFormModal
        open
        mode="edit"
        row={modalRow}
        originalRow={modalRow}
        columns={[
          {
            field: 'id',
            headerName: '사번',
            form: { targetField: 'name', targetLabel: '메뉴명' },
          },
          {
            field: 'name',
            headerName: '이름',
            editable: true,
            required: true,
          },
        ]}
        rowKey="id"
        plugin={{}}
        onCancel={vi.fn()}
        onApply={vi.fn()}
      />,
    );

    expect(screen.getByText('메뉴명: 홍길동')).toBeInTheDocument();
  });

  it('renders section headings and field labels in form order with label overrides', () => {
    renderRowFormModal();

    const headings = screen.getAllByRole('heading', { level: 3 });
    expect(headings.map((heading) => heading.textContent)).toEqual([
      '기본 정보',
      '인적 정보',
    ]);
    expect(
      screen
        .getAllByTestId(/^f1-grid-form-field-/)
        .map((field) => field.getAttribute('data-field')),
    ).toEqual(['id', 'memo', 'department', 'name']);
    expect(screen.getByRole('textbox', { name: /성명/ })).toBeInTheDocument();
    expect(
      screen.queryByRole('textbox', { name: '숨김 값' }),
    ).not.toBeInTheDocument();
  });

  it('keeps an isolated draft, preserves it across new columns arrays, and discards it on cancel', () => {
    const onCancel = vi.fn();
    const { rerender } = renderRowFormModal({ onCancel });
    const nameInput = screen.getByRole('textbox', { name: /성명/ });

    fireEvent.change(nameInput, { target: { value: '변경 이름' } });
    expect(modalRow.name).toBe('홍길동');

    rerender(
      <F1GridFormModal
        open
        mode="edit"
        row={modalRow}
        originalRow={modalRow}
        columns={createModalColumns()}
        rowKey="id"
        plugin={{}}
        onCancel={onCancel}
        onApply={vi.fn()}
      />,
    );

    expect(screen.getByRole('textbox', { name: /성명/ })).toHaveValue(
      '변경 이름',
    );
    fireEvent.click(screen.getByRole('button', { name: '취소' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(modalRow.name).toBe('홍길동');

    const nextRow = { ...modalRow, id: 'EMP-002', name: '새 세션 이름' };
    rerender(
      <F1GridFormModal
        open={false}
        mode="edit"
        row={nextRow}
        originalRow={nextRow}
        columns={createModalColumns()}
        rowKey="id"
        plugin={{}}
        onCancel={onCancel}
        onApply={vi.fn()}
      />,
    );
    rerender(
      <F1GridFormModal
        open
        mode="edit"
        row={nextRow}
        originalRow={nextRow}
        columns={createModalColumns()}
        rowKey="id"
        plugin={{}}
        onCancel={onCancel}
        onApply={vi.fn()}
      />,
    );
    expect(screen.getByRole('textbox', { name: /성명/ })).toHaveValue(
      '새 세션 이름',
    );
  });

  it('validates only included columns, keeps the dialog open, and focuses the first invalid input', async () => {
    const onApply = vi.fn();
    renderRowFormModal({
      row: { ...modalRow, id: '', hiddenValue: '' },
      columns: [
        ...createModalColumns(),
        {
          field: 'hiddenValue',
          headerName: '제외 필수값',
          required: true,
          form: { hidden: true },
        },
      ],
      onApply,
    });

    fireEvent.click(screen.getByRole('button', { name: '적용' }));

    const idInput = screen.getByRole('textbox', { name: /사번/ });
    const error = screen.getByText('사번은(는) 필수입니다.');
    expect(onApply).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(idInput).toHaveAttribute('aria-invalid', 'true');
    expect(idInput).toHaveAttribute('aria-describedby', error.id);
    expect(
      screen.queryByText('제외 필수값은(는) 필수입니다.'),
    ).not.toBeInTheDocument();
    await waitFor(() => expect(idInput).toHaveFocus());
  });

  it('keeps the dialog open when onBeforeApply returns false', () => {
    const onApply = vi.fn();
    const onBeforeApply = vi.fn(() => false);
    renderRowFormModal({ plugin: { onBeforeApply }, onApply });

    fireEvent.click(screen.getByRole('button', { name: '적용' }));

    expect(onBeforeApply).toHaveBeenCalledWith({
      mode: 'edit',
      originalRow: modalRow,
      draftRow: expect.objectContaining(modalRow),
    });
    expect(onApply).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('applies a copied valid draft after validation and plugin approval', () => {
    const onApply = vi.fn();
    const onBeforeApply = vi.fn();
    renderRowFormModal({ plugin: { onBeforeApply }, onApply });

    fireEvent.change(screen.getByRole('textbox', { name: /성명/ }), {
      target: { value: '김수정' },
    });
    fireEvent.click(screen.getByRole('button', { name: '적용' }));

    expect(onBeforeApply).toHaveBeenCalledTimes(1);
    expect(onApply).toHaveBeenCalledWith({ ...modalRow, name: '김수정' });
    expect(onApply.mock.calls[0][0]).not.toBe(modalRow);
  });

  it('routes cancel, close, Escape, and backdrop dismissal through onCancel', () => {
    const onCancel = vi.fn();
    renderRowFormModal({ onCancel });

    fireEvent.click(screen.getByRole('button', { name: '닫기' }));
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    const backdrop = document.querySelector('.MuiBackdrop-root');
    expect(backdrop).not.toBeNull();
    fireEvent.mouseDown(backdrop as Element);
    fireEvent.click(backdrop as Element);

    expect(onCancel).toHaveBeenCalledTimes(3);
  });

  it('isolates portal field events from grid ancestor handlers', () => {
    const onCopy = vi.fn();
    const onPaste = vi.fn();
    const onContextMenu = vi.fn();
    const onKeyDown = vi.fn();

    render(
      <div
        onCopy={onCopy}
        onPaste={onPaste}
        onContextMenu={onContextMenu}
        onKeyDown={onKeyDown}
      >
        <F1GridFormModal
          open
          mode="edit"
          row={modalRow}
          originalRow={modalRow}
          columns={createModalColumns()}
          rowKey="id"
          plugin={{}}
          onCancel={vi.fn()}
          onApply={vi.fn()}
        />
      </div>,
    );

    const input = screen.getByRole('textbox', { name: /성명/ });
    fireEvent.copy(input);
    fireEvent.paste(input);
    fireEvent.contextMenu(input);
    fireEvent.keyDown(input, { key: 'ArrowDown' });

    expect(onCopy).not.toHaveBeenCalled();
    expect(onPaste).not.toHaveBeenCalled();
    expect(onContextMenu).not.toHaveBeenCalled();
    expect(onKeyDown).not.toHaveBeenCalled();
  });

  it('renders fixed modal regions, responsive grid span contracts, and final-save guidance', () => {
    renderRowFormModal();

    expect(screen.getByRole('dialog')).toHaveStyle({
      maxWidth: '990px',
      maxHeight: '85vh',
    });
    expect(
      screen.getByTestId('f1-grid-form-content').parentElement,
    ).toHaveStyle({ overflowY: 'auto' });
    expect(screen.getByTestId('f1-grid-form-grid')).toHaveStyle({
      display: 'grid',
    });
    expect(screen.getByTestId('f1-grid-form-field-name')).toHaveStyle({
      '--f1-form-span-xs': '1',
      '--f1-form-span-sm': '2',
      '--f1-form-span-lg': '2',
    });
    const footerGuidance = screen.getByText(
      '적용 후 화면의 저장 버튼으로 최종 저장됩니다.',
    );
    expect(footerGuidance).toBeInTheDocument();
    expect(footerGuidance.parentElement).toHaveStyle({ flex: '1 1 auto' });
    expect(footerGuidance.parentElement?.parentElement).toHaveStyle({
      justifyContent: 'space-between',
    });
    const footer = screen
      .getByTestId('common-dialog-actions')
      .closest('.MuiDialogActions-root');
    const divider = footer?.previousElementSibling;
    expect(divider).toHaveClass('MuiDivider-root');
    expect(getComputedStyle(divider as Element).borderBottomWidth).toBe('thin');
    expect(getComputedStyle(footer as Element).borderTopStyle).toBe('none');
  });

  it('uses a full-screen dialog on mobile matchMedia', () => {
    const originalMatchMedia = window.matchMedia;
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: (query: string) => ({
        matches: query.includes('max-width:599.95px'),
        media: query,
        onchange: null,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        addListener: () => undefined,
        removeListener: () => undefined,
        dispatchEvent: () => false,
      }),
    });

    try {
      renderRowFormModal();
      expect(screen.getByRole('dialog')).toHaveClass(
        'MuiDialog-paperFullScreen',
      );
    } finally {
      Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        value: originalMatchMedia,
      });
    }
  });
});

type IntegratedFormRow = {
  id: string;
  name: string;
  status: string;
};

const integratedRows: IntegratedFormRow[] = [
  { id: 'ROW-001', name: '첫 번째 행', status: '사용' },
];

const integratedColumns: F1GridColumn<IntegratedFormRow>[] = [
  { field: 'name', headerName: '이름', editable: true, width: 120 },
  { field: 'status', headerName: '상태', pinned: 'right', width: 80 },
];

describe('F1-Grid row form integration', () => {
  it('renders the synthetic action column only when the row form plugin is active', () => {
    const { rerender } = render(
      <F1Grid
        rows={integratedRows}
        columns={integratedColumns}
        rowKey="id"
        rowFormPlugin={{}}
        showCheckbox={false}
        resizableRows={false}
      />,
    );

    expect(
      screen.getByRole('columnheader', { name: '상세' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'ROW-001 행 정보 수정' }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('columnheader')).toHaveLength(3);

    rerender(
      <F1Grid
        rows={integratedRows}
        columns={integratedColumns}
        rowKey="id"
        rowFormPlugin={{ enabled: false }}
        showCheckbox={false}
        resizableRows={false}
      />,
    );

    expect(
      screen.queryByRole('columnheader', { name: '상세' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'ROW-001 행 정보 수정' }),
    ).not.toBeInTheDocument();
    expect(screen.getAllByRole('columnheader')).toHaveLength(2);
  });

  it('appends one 48px track for the active action column without changing data columns', () => {
    render(
      <F1Grid
        rows={integratedRows}
        columns={integratedColumns}
        rowKey="id"
        rowFormPlugin={{}}
        showCheckbox={false}
        resizableRows={false}
      />,
    );

    const actionHeader = screen.getByRole('columnheader', { name: '상세' });
    const actionCell = screen
      .getByRole('button', { name: 'ROW-001 행 정보 수정' })
      .closest('[role="gridcell"]');
    expect(actionHeader.parentElement).toHaveStyle({
      gridTemplateColumns: '120px 80px 48px',
    });
    expect(actionCell).toHaveStyle({ gridColumn: '3' });
    expect(integratedColumns).toHaveLength(2);
    expect(integratedRows[0]).toEqual({
      id: 'ROW-001',
      name: '첫 번째 행',
      status: '사용',
    });
  });

  it('keeps the synthetic action header and row cell styled like a pinned right column', () => {
    render(
      <F1Grid
        rows={integratedRows}
        columns={integratedColumns}
        rowKey="id"
        rowFormPlugin={{}}
        showCheckbox={false}
        resizableRows={false}
      />,
    );

    const actionHeader = screen.getByRole('columnheader', {
      name: '상세',
    });
    const actionCell = screen
      .getByRole('button', { name: 'ROW-001 행 정보 수정' })
      .closest('[role="gridcell"]');

    expect(getComputedStyle(actionHeader).backgroundColor).toBe(
      'rgb(232, 236, 244)',
    );
    expect(getComputedStyle(actionHeader).boxShadow).toBe('');
    expect(getComputedStyle(actionHeader).paddingLeft).toBe('0px');
    expect(getComputedStyle(actionHeader).paddingRight).toBe('0px');
    expect(getComputedStyle(actionCell as Element).backgroundColor).toBe(
      'rgb(255, 255, 255)',
    );
    expect(getComputedStyle(actionCell as Element).borderTopWidth).toBe('1px');
    expect(getComputedStyle(actionCell as Element).borderLeftWidth).toBe('1px');
    expect(getComputedStyle(actionCell as Element).position).toBe('sticky');
  });

  it('applies alternating striping to the synthetic action column without overlap', () => {
    const stripeRows = [
      { id: 'ROW-001', name: '첫 번째 행', status: '사용' },
      { id: 'ROW-002', name: '두 번째 행', status: '미사용' },
    ];

    render(
      <F1Grid
        rows={stripeRows}
        columns={integratedColumns}
        rowKey="id"
        rowFormPlugin={{}}
        showCheckbox={false}
        resizableRows={false}
      />,
    );

    const actionCells = screen
      .getAllByRole('button', { name: / 행 정보 수정$/ })
      .map((button) => button.closest('[role="gridcell"]') as HTMLElement);

    expect(actionCells).toHaveLength(2);
    expect(actionCells[0]).toHaveStyle({
      backgroundColor: 'rgb(255, 255, 255)',
    });
    expect(actionCells[1]).toHaveStyle({
      isolation: 'isolate',
      backgroundImage: expect.stringContaining('gradient'),
    });
  });

  it('keeps the action column shadow when it is the only right-pinned column', () => {
    render(
      <F1Grid
        rows={integratedRows}
        columns={[{ field: 'name', headerName: '이름', editable: true }]}
        rowKey="id"
        rowFormPlugin={{}}
        showCheckbox={false}
        resizableRows={false}
      />,
    );

    const actionHeader = screen.getByRole('columnheader', { name: '상세' });
    const actionCell = screen
      .getByRole('button', { name: 'ROW-001 행 정보 수정' })
      .closest('[role="gridcell"]');

    expect(getComputedStyle(actionHeader).boxShadow).toContain(
      'rgba(0, 0, 0, 0.32)',
    );
    expect(getComputedStyle(actionCell as Element).boxShadow).toContain(
      'rgba(0, 0, 0, 0.32)',
    );
  });

  it('keeps the sticky action cell visually separated from the checkbox column', () => {
    render(
      <F1Grid
        rows={integratedRows}
        columns={integratedColumns}
        rowKey="id"
        rowFormPlugin={{}}
        showCheckbox
        resizableRows={false}
      />,
    );

    const actionCell = screen
      .getByRole('button', { name: 'ROW-001 행 정보 수정' })
      .closest('[role="gridcell"]');

    expect(getComputedStyle(actionCell as Element).backgroundColor).toBe(
      'rgb(255, 255, 255)',
    );
    expect(getComputedStyle(actionCell as Element).borderLeftWidth).toBe('1px');
    expect(getComputedStyle(actionCell as Element).position).toBe('sticky');
  });

  it('adds the action column width to right pinned offsets', () => {
    const pinnedFields = new Map<string, 'left' | 'right'>([
      ['status', 'right'],
    ]);

    expect(
      getGridColumnPinOffsets(
        integratedColumns,
        pinnedFields,
        undefined,
        0,
        48,
      ),
    ).toEqual({
      leftOffsets: {},
      rightOffsets: { status: 48 },
    });
  });

  it('treats the action column as the first locked right pin when data columns are right pinned', () => {
    render(
      <F1Grid
        rows={integratedRows}
        columns={integratedColumns}
        rowKey="id"
        rowFormPlugin={{}}
        showCheckbox={false}
        resizableRows={false}
      />,
    );

    const actionHeader = screen.getByRole('columnheader', { name: '상세' });
    const pinnedHeader = screen.getByRole('columnheader', { name: '상태' });
    const actionCell = screen
      .getByRole('button', { name: 'ROW-001 행 정보 수정' })
      .closest('[role="gridcell"]');

    expect(getComputedStyle(actionHeader).right).toBe('0px');
    expect(getComputedStyle(actionCell as Element).right).toBe('0px');
    expect(getComputedStyle(actionHeader).boxShadow).toBe('');
    expect(getComputedStyle(actionCell as Element).boxShadow).toBe('');
    expect(getComputedStyle(pinnedHeader).right).toBe('48px');
    expect(getComputedStyle(pinnedHeader).boxShadow).toContain(
      'rgba(0, 0, 0, 0.32)',
    );
  });

  it('isolates action cell events from row selection and the grid context menu', () => {
    const gridRef = createRef<F1GridRef<IntegratedFormRow>>();
    render(
      <F1Grid
        ref={gridRef}
        rows={integratedRows}
        columns={integratedColumns}
        rowKey="id"
        rowFormPlugin={{}}
      />,
    );

    const editButton = screen.getByRole('button', {
      name: 'ROW-001 행 정보 수정',
    });
    const actionCell = editButton.closest('[role="gridcell"]');
    expect(actionCell).not.toBeNull();

    fireEvent.contextMenu(actionCell as Element);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    fireEvent.click(editButton);
    expect(gridRef.current?.getSelectedRowIds()).toEqual([]);
    expect(
      screen.getByRole('dialog', { name: '정보 수정' }),
    ).toBeInTheDocument();
  });

  it('opens an isolated edit draft and discards it on cancel', () => {
    const gridRef = createRef<F1GridRef<IntegratedFormRow>>();
    render(
      <F1Grid
        ref={gridRef}
        rows={integratedRows}
        columns={integratedColumns}
        rowKey="id"
        rowFormPlugin={{}}
      />,
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'ROW-001 행 정보 수정' }),
    );
    fireEvent.change(screen.getByRole('textbox', { name: '이름' }), {
      target: { value: '취소할 이름' },
    });

    expect(gridRef.current?.getRows()[0].name).toBe('첫 번째 행');
    fireEvent.click(screen.getByRole('button', { name: '취소' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(gridRef.current?.getRows()).toEqual(integratedRows);
    expect(gridRef.current?.getChanges()).toEqual({
      insertedRows: [],
      updatedRows: [],
      deletedRows: [],
    });
  });

  it('applies only changed edit fields and closes without changes for an equal draft', () => {
    const gridRef = createRef<F1GridRef<IntegratedFormRow>>();
    render(
      <F1Grid
        ref={gridRef}
        rows={integratedRows}
        columns={integratedColumns}
        rowKey="id"
        rowFormPlugin={{}}
      />,
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'ROW-001 행 정보 수정' }),
    );
    fireEvent.click(screen.getByRole('button', { name: '적용' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(gridRef.current?.getChanges().updatedRows).toEqual([]);

    fireEvent.click(
      screen.getByRole('button', { name: 'ROW-001 행 정보 수정' }),
    );
    fireEvent.change(screen.getByRole('textbox', { name: '이름' }), {
      target: { value: '변경된 이름' },
    });
    fireEvent.click(screen.getByRole('button', { name: '적용' }));

    expect(gridRef.current?.getRows()[0]).toEqual({
      ...integratedRows[0],
      name: '변경된 이름',
    });
    expect(gridRef.current?.getChanges().updatedRows).toEqual([
      { ...integratedRows[0], name: '변경된 이름' },
    ]);
    expect(
      screen.getByRole('gridcell', { name: '변경된 이름' }),
    ).toHaveAttribute('data-dirty-cell', 'true');
    expect(screen.getByRole('gridcell', { name: '사용' })).toHaveAttribute(
      'data-dirty-cell',
      'false',
    );
  });

  it('opens a create draft from createRow and partial values and cancels without insertion', () => {
    const gridRef = createRef<F1GridRef<IntegratedFormRow>>();
    render(
      <F1Grid
        ref={gridRef}
        rows={integratedRows}
        columns={integratedColumns}
        rowKey="id"
        rowFormPlugin={{}}
        createRow={() => ({ id: 'ROW-002', name: '', status: '대기' })}
      />,
    );

    act(() => gridRef.current?.addRow({ name: '부분 입력' }));

    expect(
      screen.getByRole('dialog', { name: '신규 등록' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: '이름' })).toHaveValue(
      '부분 입력',
    );
    expect(gridRef.current?.getRows()).toEqual(integratedRows);

    fireEvent.click(screen.getByRole('button', { name: '취소' }));
    expect(gridRef.current?.getChanges().insertedRows).toEqual([]);
  });

  it('adds a valid create draft only when apply is clicked', () => {
    const gridRef = createRef<F1GridRef<IntegratedFormRow>>();
    render(
      <F1Grid
        ref={gridRef}
        rows={integratedRows}
        columns={integratedColumns}
        rowKey="id"
        rowFormPlugin={{}}
        createRow={() => ({ id: 'ROW-002', name: '', status: '대기' })}
      />,
    );

    act(() => gridRef.current?.addRow());
    fireEvent.change(screen.getByRole('textbox', { name: '이름' }), {
      target: { value: '신규 행' },
    });
    fireEvent.click(screen.getByRole('button', { name: '적용' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(gridRef.current?.getChanges().insertedRows).toEqual([
      { id: 'ROW-002', name: '신규 행', status: '대기' },
    ]);
  });

  it('applies a relative insert form immediately before its context-menu target', () => {
    const gridRef = createRef<F1GridRef<IntegratedFormRow>>();
    const rows: IntegratedFormRow[] = [
      { id: 'ROW-001', name: '첫 번째 행', status: '사용' },
      { id: 'ROW-002', name: '두 번째 행', status: '사용' },
    ];
    render(
      <F1Grid
        ref={gridRef}
        rows={rows}
        columns={integratedColumns}
        rowKey="id"
        rowFormPlugin={{}}
        createRow={() => ({ id: 'ROW-003', name: '', status: '대기' })}
      />,
    );

    fireEvent.contextMenu(
      screen.getByRole('gridcell', { name: '두 번째 행' }),
    );
    fireEvent.click(screen.getByRole('menuitem', { name: '위에 행 삽입' }));
    fireEvent.change(screen.getByRole('textbox', { name: '이름' }), {
      target: { value: '폼으로 삽입' },
    });
    fireEvent.click(screen.getByRole('button', { name: '적용' }));

    expect(gridRef.current?.getRows().map((row) => row.id)).toEqual([
      'ROW-001',
      'ROW-003',
      'ROW-002',
    ]);
    expect(gridRef.current?.getChanges().insertedRows).toEqual([
      { id: 'ROW-003', name: '폼으로 삽입', status: '대기' },
    ]);
    expect(
      screen.getByRole('gridcell', { name: '폼으로 삽입' }),
    ).toHaveAttribute('tabindex', '0');
  });

  it('does not open a create draft without a valid row key', () => {
    const gridRef = createRef<F1GridRef<IntegratedFormRow>>();
    render(
      <F1Grid
        ref={gridRef}
        rows={integratedRows}
        columns={integratedColumns}
        rowKey="id"
        rowFormPlugin={{}}
      />,
    );

    act(() => gridRef.current?.addRow({ name: '식별자 없음' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(gridRef.current?.getRows()).toEqual(integratedRows);
  });

  it('keeps a duplicate create draft open with a row key error and allows correction', () => {
    const gridRef = createRef<F1GridRef<IntegratedFormRow>>();
    const columnsWithId: F1GridColumn<IntegratedFormRow>[] = [
      { field: 'id', headerName: '행 ID', editable: true, required: true },
      ...integratedColumns,
    ];
    const rowsWithSecondId = [
      ...integratedRows,
      { id: 'ROW-002', name: '두 번째 행', status: '사용' },
    ];
    render(
      <F1Grid
        ref={gridRef}
        rows={rowsWithSecondId}
        columns={columnsWithId}
        rowKey="id"
        rowFormPlugin={{}}
        createRow={() => ({ id: 'ROW-001', name: '중복 행', status: '대기' })}
      />,
    );

    act(() => gridRef.current?.addRow());
    fireEvent.click(screen.getByRole('button', { name: '적용' }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('이미 존재하는 행 ID입니다.')).toBeInTheDocument();
    expect(gridRef.current?.getChanges().insertedRows).toEqual([]);

    fireEvent.change(screen.getByRole('textbox', { name: /행 ID/ }), {
      target: { value: 'ROW-002' },
    });
    fireEvent.click(screen.getByRole('button', { name: '적용' }));
    expect(screen.getByText('이미 존재하는 행 ID입니다.')).toBeInTheDocument();

    fireEvent.change(screen.getByRole('textbox', { name: /행 ID/ }), {
      target: { value: 'ROW-003' },
    });
    fireEvent.click(screen.getByRole('button', { name: '적용' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(gridRef.current?.getChanges().insertedRows).toEqual([
      { id: 'ROW-003', name: '중복 행', status: '대기' },
    ]);
  });
});

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createDraftFormColumns } from '../src/pages/co/workflow/form/components/DraftFormGrid';
import { F1Grid } from '../src/shared/components/f1-grid';
import type { DraftFormRow } from '../src/pages/co/workflow/form/types/draftFormManagement.types';

const row: DraftFormRow = {
  draftingWorkCategoryId: 77,
  cataTypeCode: '007',
  codeName: '정기점검',
  categoryItemId: 101,
  categoryName: '점검',
  regTermId: 201,
  regTerm: '월',
  reviewerId: null,
  reviewerName: '',
  approverId: null,
  approverName: '',
  assigneeIds: [],
  assigneeSummary: '',
  createdByName: '관리자',
  createdAt: '2026-10-02 09:00',
  hasDocument: false,
  useAt: 'Y',
};

function renderActionCell(
  currentRow: DraftFormRow,
  onOpenTemplate?: (value: DraftFormRow) => void,
) {
  const columns = createDraftFormColumns([], [], [], true, onOpenTemplate);
  const column = columns.find((item) => item.field === 'hasDocument');
  if (!column?.renderCell) throw new Error('문서 양식 액션 컬럼이 없습니다.');

  return render(
    <div onClick={vi.fn()}>
      {column.renderCell({
        row: currentRow,
        rowId: currentRow.draftingWorkCategoryId,
        column,
        field: column.field,
        value: currentRow.hasDocument,
        rowIndex: 0,
      })}
    </div>,
  );
}

describe('draft form grid document action', () => {
  it('opens a new template for a row without a document', () => {
    const onOpenTemplate = vi.fn();
    renderActionCell(row, onOpenTemplate);

    fireEvent.click(
      screen.getByRole('button', { name: '문서 작성: 정기점검' }),
    );

    expect(onOpenTemplate).toHaveBeenCalledWith(row);
  });

  it('labels an existing document for editing and hides the action without update permission', () => {
    renderActionCell({ ...row, hasDocument: true });

    expect(screen.getByText('읽기 전용')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();

    renderActionCell({ ...row, hasDocument: true }, vi.fn());
    expect(
      screen.getByRole('button', { name: '문서 수정: 정기점검' }),
    ).toBeInTheDocument();
  });

  it('renders the document action inside the actual F1-Grid cell', () => {
    const actionColumn = createDraftFormColumns([], [], [], true, vi.fn()).find(
      (column) => column.field === 'hasDocument',
    );
    render(
      <F1Grid
        rows={[row]}
        columns={createDraftFormColumns([], [], [], true, vi.fn())}
        rowKey="draftingWorkCategoryId"
      />,
    );

    expect(
      screen.getByRole('columnheader', { name: '문서 양식' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '문서 작성: 정기점검' }),
    ).toBeInTheDocument();
    expect(actionColumn?.getValue?.(row)).toBe('');
  });
});

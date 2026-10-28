import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { describe, expect, it, vi } from 'vitest';
import { CommonCodeItemHelpDialog } from '../src/shared/components/common-code/CommonCodeItemHelpDialog';
import type { CommonCodeItemRow } from '../src/pages/co/master/common-code/types/commonCodeManagement.types';
import { NotificationProvider } from '../src/shared/context/NotificationContext';

const item: CommonCodeItemRow = {
  id: '101',
  groupId: '11',
  itemCode: 'INSPECTION',
  itemNm: '점검',
  parentItemId: null,
  parentItemNm: '',
  sortOrder: 10,
  useAt: 'Y',
  itemDc: '',
};

function renderDialog(
  props: Partial<React.ComponentProps<typeof CommonCodeItemHelpDialog>> = {},
) {
  const onCreateItem = vi.fn().mockResolvedValue({});
  const onUpdateItem = vi.fn().mockResolvedValue({});
  const onReload = vi.fn().mockResolvedValue(undefined);
  const onClose = vi.fn();
  render(
    <ThemeProvider theme={createTheme()}>
      <NotificationProvider>
        <CommonCodeItemHelpDialog
          open
          groupId="11"
          items={[item]}
          canEdit
          onClose={onClose}
          onCreateItem={onCreateItem}
          onUpdateItem={onUpdateItem}
          onReload={onReload}
          {...props}
        />
      </NotificationProvider>
    </ThemeProvider>,
  );
  return { onClose, onCreateItem, onUpdateItem, onReload };
}

async function editCell(cell: HTMLElement, value: string) {
  const currentValue = cell.textContent?.trim() ?? '';
  fireEvent.doubleClick(cell);
  const editor = await screen.findByDisplayValue(currentValue);
  fireEvent.change(editor, { target: { value } });
  fireEvent.keyDown(editor, { key: 'Enter', code: 'Enter' });
}

function getLastGridRow() {
  const rows = within(
    screen.getByRole('grid', { name: '기안양식 분류 목록' }),
  ).getAllByRole('row');
  return rows[rows.length - 1];
}

describe('CommonCodeItemHelpDialog', () => {
  it('hides create and edit actions for read-only users', async () => {
    renderDialog({ canEdit: false });

    expect(
      await screen.findByRole('dialog', { name: '기안양식 분류 설정' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: '분류 추가' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: '분류 수정 점검' }),
    ).not.toBeInTheDocument();
  });

  it('keeps context-menu add and copy but hides row deletion', async () => {
    renderDialog();

    await screen.findByRole('dialog', { name: '기안양식 분류 설정' });
    fireEvent.contextMenu(screen.getByRole('gridcell', { name: '점검' }));

    expect(screen.getByRole('menuitem', { name: '행 추가' })).toBeVisible();
    expect(screen.getByRole('menuitem', { name: '행 복사' })).toBeVisible();
    expect(
      screen.queryByRole('menuitem', { name: '행 삭제' }),
    ).not.toBeInTheDocument();
  });

  it('confirms dirty close and supports canceling or discarding the edits', async () => {
    const { onClose } = renderDialog();
    const categoryDialog = await screen.findByRole('dialog', {
      name: '기안양식 분류 설정',
    });

    fireEvent.doubleClick(screen.getByRole('gridcell', { name: '점검' }));
    const editor = await screen.findByDisplayValue('점검');
    fireEvent.change(editor, { target: { value: '정기점검' } });
    fireEvent.keyDown(editor, { key: 'Enter', code: 'Enter' });
    fireEvent.click(
      within(categoryDialog).getByRole('button', { name: '취소' }),
    );

    const confirmation = await screen.findByRole('dialog', {
      name: '저장하지 않은 변경사항',
    });
    expect(confirmation).toHaveTextContent(
      '분류 변경사항을 버리고 설정 창을 닫으시겠습니까?',
    );
    fireEvent.click(within(confirmation).getByRole('button', { name: '취소' }));

    expect(categoryDialog).toBeInTheDocument();
    expect(
      await screen.findByRole('gridcell', { name: '정기점검' }),
    ).toBeVisible();
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.click(
      within(categoryDialog).getByRole('button', { name: '닫기' }),
    );
    const discardConfirmation = await screen.findByRole('dialog', {
      name: '저장하지 않은 변경사항',
    });
    fireEvent.click(
      within(discardConfirmation).getByRole('button', { name: '계속' }),
    );

    expect(onClose).toHaveBeenCalledOnce();
    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: '저장하지 않은 변경사항' }),
      ).not.toBeInTheDocument(),
    );
  });

  it('adds rows inline and keeps dialog actions and close control visible', async () => {
    renderDialog();

    const dialog = await screen.findByRole('dialog', {
      name: '기안양식 분류 설정',
    });
    const footer = dialog.querySelector('.MuiDialogActions-root');
    const divider = dialog.querySelector('.MuiDivider-root');
    expect(footer).not.toBeNull();
    expect(screen.getByTestId('common-dialog-actions')).toBeInTheDocument();
    expect(dialog.querySelector('.MuiDialogContent-root')).not.toHaveClass(
      'MuiDialogContent-dividers',
    );
    expect(divider).toBeInTheDocument();
    expect(footer?.previousElementSibling).toBe(divider);
    expect(getComputedStyle(divider as Element).borderBottomWidth).toBe('thin');
    expect(getComputedStyle(footer as Element).borderTopStyle).toBe('none');
    expect(
      within(footer as HTMLElement)
        .getAllByRole('button')
        .map((button) => button.textContent?.trim()),
    ).toEqual(['저장', '취소']);
    expect(within(dialog).getByRole('button', { name: '저장' })).toBeVisible();
    expect(within(dialog).getByRole('button', { name: '취소' })).toBeVisible();
    expect(within(dialog).getByRole('button', { name: '닫기' })).toBeVisible();
    expect(
      screen.queryByRole('textbox', { name: '상세코드' }),
    ).not.toBeInTheDocument();

    const grid = within(dialog).getByRole('grid', {
      name: '기안양식 분류 목록',
    });
    const initialRowCount = within(grid).getAllByRole('row').length;
    fireEvent.click(within(dialog).getByRole('button', { name: '분류 추가' }));

    expect(within(grid).getAllByRole('row')).toHaveLength(initialRowCount + 1);
    expect(
      screen.queryByRole('dialog', { name: '분류 추가' }),
    ).not.toBeInTheDocument();
  });

  it('shows a quiet save indicator without covering the grid', async () => {
    let resolveUpdate: (() => void) | undefined;
    const updatePromise = new Promise<void>((resolve) => {
      resolveUpdate = resolve;
    });
    const onUpdateItem = vi.fn(() => updatePromise);
    const { onReload } = renderDialog({ onUpdateItem });
    const categoryDialog = await screen.findByRole('dialog', {
      name: '기안양식 분류 설정',
    });

    await editCell(screen.getByRole('gridcell', { name: '점검' }), '정기점검');
    const saveButton = within(categoryDialog).getByRole('button', {
      name: '저장',
    });
    fireEvent.click(saveButton);

    await waitFor(() => expect(onUpdateItem).toHaveBeenCalledOnce());
    expect(saveButton).toBeDisabled();
    expect(within(saveButton).getByRole('progressbar')).toBeVisible();
    expect(
      screen.queryByTestId('f1-grid-loading-overlay'),
    ).not.toBeInTheDocument();
    expect(
      within(categoryDialog).getByRole('grid', { name: '기안양식 분류 목록' }),
    ).toBeVisible();

    resolveUpdate?.();
    await waitFor(() => expect(onReload).toHaveBeenCalledOnce());
  });

  it('creates a classification item and reloads the list after save', async () => {
    const { onCreateItem, onReload } = renderDialog();

    fireEvent.click(await screen.findByRole('button', { name: '분류 추가' }));
    await editCell(
      within(getLastGridRow()).getAllByRole('gridcell')[2],
      '안전점검',
    );
    fireEvent.click(
      within(
        screen.getByRole('dialog', { name: '기안양식 분류 설정' }),
      ).getByRole('button', { name: '저장' }),
    );

    await waitFor(() =>
      expect(onCreateItem).toHaveBeenCalledWith(
        expect.objectContaining({
          itemCode: '',
          itemNm: '안전점검',
          useAt: 'Y',
        }),
      ),
    );
    expect(onReload).toHaveBeenCalledOnce();
  });

  it('allows a new classification item without a code so the backend can generate it', async () => {
    const { onCreateItem, onReload } = renderDialog();

    fireEvent.click(await screen.findByRole('button', { name: '분류 추가' }));
    await editCell(
      within(getLastGridRow()).getAllByRole('gridcell')[2],
      '자동발번 분류',
    );
    fireEvent.click(
      within(
        screen.getByRole('dialog', { name: '기안양식 분류 설정' }),
      ).getByRole('button', { name: '저장' }),
    );

    await waitFor(() =>
      expect(onCreateItem).toHaveBeenCalledWith(
        expect.objectContaining({ itemCode: '', itemNm: '자동발번 분류' }),
      ),
    );
    expect(onReload).toHaveBeenCalledOnce();
  });

  it('updates an existing classification item and reloads the list', async () => {
    const { onUpdateItem, onReload } = renderDialog();

    await editCell(
      await screen.findByRole('gridcell', { name: '점검' }),
      '정기점검',
    );
    fireEvent.click(
      within(
        screen.getByRole('dialog', { name: '기안양식 분류 설정' }),
      ).getByRole('button', { name: '저장' }),
    );

    await waitFor(() =>
      expect(onUpdateItem).toHaveBeenCalledWith(
        '101',
        expect.objectContaining({
          itemNm: '정기점검',
        }),
      ),
    );
    expect(onReload).toHaveBeenCalledOnce();
  });

  it('shows the shared success toast after saving a classification item', async () => {
    const { onUpdateItem } = renderDialog();

    await editCell(
      await screen.findByRole('gridcell', { name: '점검' }),
      '정기점검',
    );
    fireEvent.click(
      within(
        screen.getByRole('dialog', { name: '기안양식 분류 설정' }),
      ).getByRole('button', { name: '저장' }),
    );

    await waitFor(() => expect(onUpdateItem).toHaveBeenCalledOnce());
    expect(
      await screen.findByText('공통코드를 저장했습니다.'),
    ).toBeInTheDocument();
  });

  it('does not show a success toast when saving a classification item fails', async () => {
    const onUpdateItem = vi.fn().mockRejectedValue(new Error('분류 저장 실패'));
    renderDialog({ onUpdateItem });

    await editCell(
      await screen.findByRole('gridcell', { name: '점검' }),
      '정기점검',
    );
    fireEvent.click(
      within(
        screen.getByRole('dialog', { name: '기안양식 분류 설정' }),
      ).getByRole('button', { name: '저장' }),
    );

    expect(await screen.findByText('분류 저장 실패')).toBeInTheDocument();
    expect(
      screen.queryByText('공통코드를 저장했습니다.'),
    ).not.toBeInTheDocument();
  });

  it('marks an inline edit dirty when focus moves to another grid cell', async () => {
    const { onUpdateItem } = renderDialog();
    const categoryDialog = await screen.findByRole('dialog', {
      name: '기안양식 분류 설정',
    });

    fireEvent.doubleClick(screen.getByRole('gridcell', { name: '점검' }));
    const editor = await screen.findByDisplayValue('점검');
    fireEvent.change(editor, { target: { value: '정기점검' } });
    fireEvent.click(screen.getByRole('gridcell', { name: 'INSPECTION' }));

    const saveButton = within(categoryDialog).getByRole('button', {
      name: '저장',
    });
    await waitFor(() => expect(saveButton).toBeEnabled());
    expect(
      await screen.findByRole('gridcell', { name: '정기점검' }),
    ).toHaveAttribute('data-dirty-cell', 'true');

    fireEvent.click(saveButton);
    await waitFor(() => expect(onUpdateItem).toHaveBeenCalledOnce());
  });

  it('duplicates a row through the F1-Grid context menu and saves the new item', async () => {
    const { onCreateItem, onReload } = renderDialog();

    fireEvent.contextMenu(
      await screen.findByRole('gridcell', { name: '점검' }),
    );
    fireEvent.click(screen.getByRole('menuitem', { name: '행 복사' }));

    const copiedCell = await screen.findByRole('gridcell', {
      name: '점검 복사',
    });
    const copiedRow = copiedCell.closest('[role="row"]');
    expect(copiedRow).not.toBeNull();
    await editCell(
      await screen.findByRole('gridcell', { name: '점검 복사' }),
      '안전점검',
    );
    fireEvent.click(
      within(
        screen.getByRole('dialog', { name: '기안양식 분류 설정' }),
      ).getByRole('button', { name: '저장' }),
    );

    await waitFor(() =>
      expect(onCreateItem).toHaveBeenCalledWith(
        expect.objectContaining({ itemCode: '', itemNm: '안전점검' }),
      ),
    );
    expect(onReload).toHaveBeenCalledOnce();
  });
});

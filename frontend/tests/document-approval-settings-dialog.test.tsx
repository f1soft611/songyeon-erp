import {
  act,
  createEvent,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import '@testing-library/jest-dom/vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const templateApi = vi.hoisted(() => ({
  create: vi.fn(),
  list: vi.fn(),
  get: vi.fn(),
  rename: vi.fn(),
  delete: vi.fn(),
}));

vi.mock(
  '../src/pages/groupware/documents/write/services/approvalLineTemplate.service',
  () => ({
    createApprovalLineTemplate: templateApi.create,
    listApprovalLineTemplates: templateApi.list,
    getApprovalLineTemplate: templateApi.get,
    renameApprovalLineTemplate: templateApi.rename,
    deleteApprovalLineTemplate: templateApi.delete,
  }),
);

import { DocumentApprovalSettingsDialog } from '../src/pages/groupware/documents/write/components/DocumentApprovalSettingsDialog';
import { createAppTheme } from '../src/theme/theme';
import type { DocumentApprovalStage } from '../src/pages/groupware/documents/write/types/documentWrite.types';
import type { F1GridUserOption } from '../src/shared/components/f1-grid/types/grid.types';

beforeEach(() => {
  vi.resetAllMocks();
  templateApi.list.mockResolvedValue([]);
});

const users: F1GridUserOption[] = [
  { value: 'drafter', label: '기안자' },
  { value: 'approver', label: '결재자' },
  { value: 'agreement-1', label: '합의자 1' },
  { value: 'agreement-2', label: '합의자 2' },
  { value: 'reference-1', label: '참조자 1' },
  { value: 'approver-2', label: '새 결재자' },
  { value: 'reference-2', label: '새 참조자' },
];

const approvalStages: DocumentApprovalStage[] = [
  {
    id: 1,
    kind: 'approval',
    users: [users[0]],
    isFixed: true,
  },
  {
    id: 2,
    kind: 'approval',
    users: [users[1]],
  },
  {
    id: 3,
    kind: 'agreement',
    users: [users[2], users[3]],
  },
];

function renderSettings(
  overrides: Partial<{
    approvalStages: DocumentApprovalStage[];
    referenceUserIds: string[];
    documentCode: '001' | '008' | '004' | '031';
    onClose: () => void;
    onApply: (
      stages: DocumentApprovalStage[],
      referenceIds: string[],
    ) => void;
  }> = {},
  withAppTheme = false,
) {
  const onClose = overrides.onClose ?? vi.fn();
  const onApply = overrides.onApply ?? vi.fn();
  const dialog = (
    <DocumentApprovalSettingsDialog
      open
      documentCode="001"
      userOptions={users}
      approvalStages={overrides.approvalStages ?? approvalStages}
      referenceUserIds={overrides.referenceUserIds ?? ['reference-1']}
      onClose={onClose}
      onApply={onApply}
    />
  );
  render(
    withAppTheme ? (
      <ThemeProvider theme={createAppTheme()}>{dialog}</ThemeProvider>
    ) : (
      dialog
    ),
  );
  return { onClose, onApply };
}

function createDataTransfer() {
  const payload = new Map<string, string>();
  return {
    effectAllowed: 'none' as DataTransfer['effectAllowed'],
    setData: (type: string, value: string) => payload.set(type, value),
    getData: (type: string) => payload.get(type) ?? '',
  } as DataTransfer;
}

function dragOverAt(target: HTMLElement, clientY: number) {
  const event = createEvent.dragOver(target, {
    dataTransfer: createDataTransfer(),
  });
  Object.defineProperty(event, 'clientY', { value: clientY });
  fireEvent(target, event);
}

function editTemplateName(currentName: string, nextName: string) {
  fireEvent.doubleClick(
    screen.getByRole('gridcell', { name: currentName }),
  );
  const editor = screen.getByDisplayValue(currentName);
  fireEvent.change(editor, { target: { value: nextName } });
  fireEvent.keyDown(editor, { key: 'Enter' });
}

function getTemplateGrid() {
  return screen.getByRole('grid', { name: '자주 쓰는 결재선 목록' });
}

async function openTemplateManagerGrid() {
  await waitFor(() =>
    expect(
      screen.getByRole('combobox', { name: '자주 쓰는 결재선' }),
    ).toBeEnabled(),
  );
  fireEvent.click(screen.getByRole('button', { name: '설정' }));
  await screen.findByRole('grid', {
    name: '자주 쓰는 결재선 목록',
  });
  await waitFor(() =>
    expect(within(getTemplateGrid()).getAllByRole('gridcell').length).toBeGreaterThan(0),
  );
  await waitFor(() => expect(getTemplateManagerCloseButton()).toBeEnabled());
}

function getTemplateManager() {
  return screen.getByRole('dialog', {
    name: '자주 쓰는 결재선 불러오기',
  });
}

async function selectFavorite(name: string) {
  const select = await screen.findByRole('combobox', {
    name: '자주 쓰는 결재선',
  });
  fireEvent.mouseDown(select);
  fireEvent.click(await screen.findByRole('option', { name }));
  await waitFor(() => expect(select).toBeEnabled());
  return select;
}

function getTemplateManagerCloseButton() {
  const closeButtons = within(getTemplateManager()).getAllByRole('button', {
    name: '닫기',
  });
  return closeButtons[closeButtons.length - 1];
}

describe('DocumentApprovalSettingsDialog', () => {
  it('stretches the favorite selector and settings button to the same row height', () => {
    renderSettings();

    const settingsButton = screen.getByRole('button', { name: '설정' });
    const controlsRow = settingsButton.parentElement;

    expect(controlsRow).not.toBeNull();
    expect(controlsRow).toHaveStyle({ alignItems: 'stretch' });
  });

  it('loads the current approval line and references while keeping the drafter fixed', () => {
    renderSettings();

    expect(
      screen.getByRole('dialog', { name: '결재선 설정' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('group', { name: '결재 1 기안자' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('group', { name: '결재 2 결재자' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: '결재 1 위로 이동' }),
    ).toBeNull();
    expect(
      screen.queryByRole('button', { name: '결재 1 아래로 이동' }),
    ).toBeNull();
    expect(
      screen.getByRole('button', { name: '자주 쓰는 결재선 저장' }),
    ).toBeEnabled();
    expect(screen.getByRole('button', { name: '설정' })).toBeEnabled();
  });

  it('saves the current draft stages and references under a required name', async () => {
    templateApi.list.mockResolvedValue([]);
    templateApi.create.mockResolvedValue({
      templateId: 9,
      name: '기본 결재선',
      eabusNo: '001',
    });
    renderSettings();

    fireEvent.click(screen.getByRole('button', { name: '자주 쓰는 결재선 저장' }));
    fireEvent.change(screen.getByRole('textbox', { name: '결재선 이름' }), {
      target: { value: ' 기본 결재선 ' },
    });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() =>
      expect(templateApi.create).toHaveBeenCalledWith({
        eabusNo: '001',
        name: '기본 결재선',
        approvalLines: [
          {
            stageOrder: 2,
            participantOrder: 1,
            participantType: 'APPROVAL',
            participantUserId: 'approver',
          },
          {
            stageOrder: 3,
            participantOrder: 1,
            participantType: 'AGREEMENT',
            participantUserId: 'agreement-1',
          },
          {
            stageOrder: 3,
            participantOrder: 2,
            participantType: 'AGREEMENT',
            participantUserId: 'agreement-2',
          },
          {
            stageOrder: 4,
            participantOrder: 1,
            participantType: 'REFERENCE',
            participantUserId: 'reference-1',
          },
        ],
      }),
    );
    expect(
      await screen.findByRole('dialog', { name: '결재선 설정' }),
    ).toBeInTheDocument();
  });

  it('loads favorites on open and applies a selected template to the draft', async () => {
    templateApi.list.mockResolvedValue([
      { templateId: 9, name: '기본 결재선', eabusNo: '001' },
    ]);
    templateApi.get.mockResolvedValue({
      templateId: 9,
      name: '기본 결재선',
      eabusNo: '001',
      approvalLines: [
        {
          stageOrder: 2,
          participantOrder: 1,
          participantType: 'APPROVAL',
          participantUserId: 'approver-2',
        },
        {
          stageOrder: 3,
          participantOrder: 1,
          participantType: 'REFERENCE',
          participantUserId: 'reference-2',
        },
      ],
    });
    const { onApply } = renderSettings();
    await selectFavorite('기본 결재선');

    expect(templateApi.list).toHaveBeenCalledWith('001');
    await waitFor(() => expect(templateApi.get).toHaveBeenCalledWith(9));
    await screen.findByRole('group', { name: '결재 2 새 결재자' });
    expect(onApply).not.toHaveBeenCalled();
    fireEvent.click(
      within(screen.getByRole('dialog', { name: '결재선 설정' })).getByRole(
        'button',
        { name: '적용' },
      ),
    );

    expect(onApply).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ isFixed: true }),
        expect.objectContaining({
          kind: 'approval',
          users: [expect.objectContaining({ value: 'approver-2' })],
        }),
      ]),
      ['reference-2'],
    );
  });

  it('shows the registration prompt when no favorites are registered', async () => {
    templateApi.list.mockResolvedValue([]);
    renderSettings({}, true);

    const select = await screen.findByRole('combobox', {
      name: '자주 쓰는 결재선',
    });
    await waitFor(() => expect(select).toBeEnabled());
    const selectInput = select.closest('.MuiOutlinedInput-root');
    const selectField = select.closest('.MuiFormControl-root');
    const settingsButton = screen.getByRole('button', { name: '설정' });
    const approvalButton = screen.getByRole('button', { name: '결재 추가' });
    const agreementButton = screen.getByRole('button', { name: '합의 추가' });
    const prompt = screen.getByText('자주 쓰는 결재선 선택');
    const promptStyle = getComputedStyle(prompt);
    const userPickerStyles = ['결재선 사용자 선택', '참조자 선택'].map(
      (label) => {
        const picker = screen.getByRole('combobox', { name: label });
        const pickerLabel = picker
          .closest('.MuiFormControl-root')
          ?.querySelector('.MuiInputLabel-root');
        if (!pickerLabel) {
          throw new Error(`${label} 라벨을 찾지 못했습니다.`);
        }
        return getComputedStyle(pickerLabel);
      },
    );

    expect(selectInput).toHaveStyle({ minHeight: '38px' });
    expect(selectField).not.toHaveClass('MuiFormControl-marginNormal');
    for (const userPickerStyle of userPickerStyles) {
      expect({
        fontSize: promptStyle.fontSize,
        fontWeight: promptStyle.fontWeight,
        color: promptStyle.color,
      }).toEqual({
        fontSize: userPickerStyle.fontSize,
        fontWeight: userPickerStyle.fontWeight,
        color: userPickerStyle.color,
      });
    }
    expect(settingsButton).toHaveClass('MuiButton-sizeMedium');
    expect(approvalButton).toHaveClass('MuiButton-sizeMedium');
    expect(agreementButton).toHaveClass('MuiButton-sizeMedium');
  });

  it('retries a failed favorite list request', async () => {
    templateApi.list
      .mockRejectedValueOnce(new Error('목록 조회 실패'))
      .mockResolvedValueOnce([
        { templateId: 9, name: '기본 결재선', eabusNo: '001' },
      ]);
    renderSettings();

    expect(await screen.findByText('목록 조회 실패')).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: '결재선 목록 다시 시도' }),
    );
    await waitFor(() => expect(templateApi.list).toHaveBeenCalledTimes(2));
    fireEvent.mouseDown(
      await screen.findByRole('combobox', { name: '자주 쓰는 결재선' }),
    );
    expect(
      await screen.findByRole('option', { name: '기본 결재선' }),
    ).toBeInTheDocument();
  });

  it('keeps the current draft when selected favorite loading fails', async () => {
    templateApi.list.mockResolvedValue([
      { templateId: 9, name: '기본 결재선', eabusNo: '001' },
    ]);
    templateApi.get.mockRejectedValue(new Error('상세 조회 실패'));
    const { onApply } = renderSettings();
    const select = await selectFavorite('기본 결재선');

    await waitFor(() => expect(templateApi.get).toHaveBeenCalledWith(9));
    expect(await screen.findByText('상세 조회 실패')).toBeInTheDocument();
    expect(select).toHaveTextContent('기본 결재선');
    fireEvent.click(
      within(screen.getByRole('dialog', { name: '결재선 설정' })).getByRole(
        'button',
        { name: '적용' },
      ),
    );

    expect(onApply).toHaveBeenCalledWith(approvalStages, ['reference-1']);
  });

  it('refreshes the selector after closing the manager and preserves selection by ID', async () => {
    const beforeRename = {
      templateId: 9,
      name: '기본 결재선',
      eabusNo: '001',
    };
    const afterRename = { ...beforeRename, name: '변경된 이름' };
    templateApi.list
      .mockResolvedValueOnce([beforeRename])
      .mockResolvedValueOnce([beforeRename])
      .mockResolvedValueOnce([afterRename]);
    templateApi.get.mockResolvedValue({
      ...beforeRename,
      approvalLines: [
        {
          stageOrder: 2,
          participantOrder: 1,
          participantType: 'APPROVAL',
          participantUserId: 'approver-2',
        },
      ],
    });
    templateApi.rename.mockResolvedValue(afterRename);
    const { onApply } = renderSettings();
    await selectFavorite('기본 결재선');
    await waitFor(() => expect(templateApi.get).toHaveBeenCalledWith(9));
    await screen.findByRole('group', { name: '결재 2 새 결재자' });

    fireEvent.click(
      within(screen.getByRole('dialog', { name: '결재선 설정' })).getByRole(
        'button',
        { name: '설정' },
      ),
    );
    await screen.findByRole('grid', { name: '자주 쓰는 결재선 목록' });
    editTemplateName('기본 결재선', '변경된 이름');
    fireEvent.click(
      within(getTemplateManager()).getByRole('button', {
        name: '저장',
        exact: true,
      }),
    );
    await waitFor(() =>
      expect(templateApi.rename).toHaveBeenCalledWith(9, '변경된 이름'),
    );
    await waitFor(() =>
      expect(getTemplateManagerCloseButton()).toBeEnabled(),
    );
    fireEvent.click(getTemplateManagerCloseButton());

    await waitFor(() => expect(templateApi.list).toHaveBeenCalledTimes(3));
    const select = await screen.findByRole('combobox', {
      name: '자주 쓰는 결재선',
    });
    await waitFor(() => expect(select).toBeEnabled());
    expect(select).toHaveTextContent('변경된 이름');
    fireEvent.click(
      within(screen.getByRole('dialog', { name: '결재선 설정' })).getByRole(
        'button',
        { name: '적용' },
      ),
    );
    expect(onApply).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'approval',
          users: [expect.objectContaining({ value: 'approver-2' })],
        }),
      ]),
      [],
    );
  });

  it('resets selection after deleting its favorite while preserving the draft', async () => {
    const template = {
      templateId: 9,
      name: '기본 결재선',
      eabusNo: '001',
    };
    templateApi.list
      .mockResolvedValueOnce([template])
      .mockResolvedValueOnce([template])
      .mockResolvedValueOnce([]);
    templateApi.get.mockResolvedValue({
      ...template,
      approvalLines: [
        {
          stageOrder: 2,
          participantOrder: 1,
          participantType: 'APPROVAL',
          participantUserId: 'approver-2',
        },
      ],
    });
    templateApi.delete.mockResolvedValue(undefined);
    const { onApply } = renderSettings();
    await selectFavorite('기본 결재선');
    await waitFor(() => expect(templateApi.get).toHaveBeenCalledWith(9));
    await screen.findByRole('group', { name: '결재 2 새 결재자' });
    await openTemplateManagerGrid();
    fireEvent.click(
      within(getTemplateGrid()).getByRole('button', {
        name: '결재선 삭제 기본 결재선',
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: '삭제 확인' }));
    await waitFor(() => expect(templateApi.delete).toHaveBeenCalledWith(9));
    fireEvent.click(getTemplateManagerCloseButton());

    await waitFor(() => expect(templateApi.list).toHaveBeenCalledTimes(3));
    const select = await screen.findByRole('combobox', {
      name: '자주 쓰는 결재선',
    });
    expect(select).toHaveTextContent('자주 쓰는 결재선 선택');
    fireEvent.click(
      within(screen.getByRole('dialog', { name: '결재선 설정' })).getByRole(
        'button',
        { name: '적용' },
      ),
    );
    expect(onApply).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'approval',
          users: [expect.objectContaining({ value: 'approver-2' })],
        }),
      ]),
      [],
    );
  });

  it('places favorite save in the footer and selects the created favorite', async () => {
    const created = {
      templateId: 12,
      name: '새 결재선',
      eabusNo: '001',
    };
    templateApi.list
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([created]);
    templateApi.create.mockResolvedValue(created);
    renderSettings();

    const settingsDialog = screen.getByRole('dialog', {
      name: '결재선 설정',
    });
    const footer = within(settingsDialog).getByTestId(
      'common-dialog-footer-start',
    );
    const saveStart = within(footer).getByRole('button', {
      name: '자주 쓰는 결재선 저장',
    });
    expect(
      within(settingsDialog).getAllByRole('button', {
        name: '자주 쓰는 결재선 저장',
      }),
    ).toHaveLength(1);
    fireEvent.click(saveStart);

    const saveDialog = screen.getByRole('dialog', {
      name: '결재선 템플릿 저장',
    });
    fireEvent.change(
      within(saveDialog).getByRole('textbox', { name: '결재선 이름' }),
      { target: { value: '새 결재선' } },
    );
    fireEvent.click(
      within(saveDialog).getByRole('button', {
        name: '저장',
        exact: true,
      }),
    );

    await waitFor(() =>
      expect(templateApi.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: '새 결재선', eabusNo: '001' }),
      ),
    );
    const select = await screen.findByRole('combobox', {
      name: '자주 쓰는 결재선',
    });
    await waitFor(() => expect(select).toHaveTextContent('새 결재선'));
    await waitFor(() => expect(select).toBeEnabled());
  });

  it('keeps a created favorite selected when list refresh fails', async () => {
    const created = {
      templateId: 12,
      name: '새 결재선',
      eabusNo: '001',
    };
    templateApi.list
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockRejectedValueOnce(new Error('목록 갱신 실패'));
    templateApi.create.mockResolvedValue(created);
    renderSettings();

    const settingsDialog = screen.getByRole('dialog', {
      name: '결재선 설정',
    });
    fireEvent.click(
      within(
        within(settingsDialog).getByTestId('common-dialog-footer-start'),
      ).getByRole('button', { name: '자주 쓰는 결재선 저장' }),
    );
    const saveDialog = screen.getByRole('dialog', {
      name: '결재선 템플릿 저장',
    });
    fireEvent.change(
      within(saveDialog).getByRole('textbox', { name: '결재선 이름' }),
      { target: { value: '새 결재선' } },
    );
    fireEvent.click(
      within(saveDialog).getByRole('button', {
        name: '저장',
        exact: true,
      }),
    );

    expect(
      await screen.findByText(/결재선 저장은 완료했지만 목록 갱신에 실패했습니다/),
    ).toBeInTheDocument();
    const select = screen.getByRole('combobox', {
      name: '자주 쓰는 결재선',
    });
    expect(select).toHaveTextContent('새 결재선');
    await waitFor(() => expect(select).toBeEnabled());
  });

  it('shows templates in F1-Grid and loads a row into temporary state until Apply', async () => {
    templateApi.list.mockResolvedValue([
      { templateId: 9, name: '기본 결재선', eabusNo: '001' },
    ]);
    templateApi.get.mockResolvedValue({
      templateId: 9,
      name: '기본 결재선',
      eabusNo: '001',
      approvalLines: [
        {
          stageOrder: 2,
          participantOrder: 1,
          participantType: 'APPROVAL',
          participantUserId: 'approver-2',
        },
        {
          stageOrder: 3,
          participantOrder: 1,
          participantType: 'AGREEMENT',
          participantUserId: 'agreement-2',
        },
        {
          stageOrder: 3,
          participantOrder: 2,
          participantType: 'AGREEMENT',
          participantUserId: 'agreement-1',
        },
        {
          stageOrder: 4,
          participantOrder: 1,
          participantType: 'REFERENCE',
          participantUserId: 'reference-2',
        },
      ],
    });
    const { onApply } = renderSettings();

    fireEvent.click(screen.getByRole('button', { name: '설정' }));
    const grid = await screen.findByRole('grid', {
      name: '자주 쓰는 결재선 목록',
    });
    await screen.findByRole('gridcell', { name: '기본 결재선' });
    const loadedGrid = getTemplateGrid();
    expect(
      within(loadedGrid).getByRole('columnheader', { name: '결재선명' }),
    ).toBeInTheDocument();
    expect(
      within(loadedGrid).getByRole('columnheader', { name: '액션' }),
    ).toBeInTheDocument();
    expect(
      within(loadedGrid).queryByRole('columnheader', {
        name: '전체 행 선택',
      }),
    ).not.toBeInTheDocument();
    expect(
      within(loadedGrid).getByRole('gridcell', { name: '기본 결재선' }),
    ).toBeInTheDocument();
    expect(
      within(getTemplateManager()).queryByRole('button', {
        name: '결재선 선택 기본 결재선',
      }),
    ).not.toBeInTheDocument();
    expect(
      within(getTemplateManager()).queryByRole('button', {
        name: '불러오기',
        exact: true,
      }),
    ).not.toBeInTheDocument();
    expect(
      within(getTemplateManager()).getByRole('button', {
        name: '저장',
        exact: true,
      }),
    ).toBeDisabled();

    fireEvent.click(
      within(loadedGrid).getByRole('button', {
        name: '결재선 적용 기본 결재선',
      }),
    );

    await waitFor(() => expect(templateApi.get).toHaveBeenCalledWith(9));
    expect(
      await screen.findByRole('group', { name: '결재 1 기안자' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('group', { name: '결재 2 새 결재자' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('group', { name: '합의 3 합의자 2, 합의자 1' }),
    ).toBeInTheDocument();
    expect(onApply).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: '적용' }));

    expect(vi.mocked(onApply).mock.calls[0][0].map((stage) => stage.id)).toEqual([
      1,
      4,
      5,
    ]);
    expect(vi.mocked(onApply).mock.calls[0][1]).toEqual(['reference-2']);
  });

  it('centers favorite row action buttons in the action column', async () => {
    templateApi.list.mockResolvedValue([
      { templateId: 9, name: '기본 결재선', eabusNo: '001' },
    ]);
    renderSettings();
    await openTemplateManagerGrid();

    const grid = getTemplateGrid();
    const applyButton = within(grid).getByRole('button', {
      name: '결재선 적용 기본 결재선',
    });
    const deleteButton = within(grid).getByRole('button', {
      name: '결재선 삭제 기본 결재선',
    });
    const actionGroup = applyButton.parentElement;

    expect(actionGroup).not.toBeNull();
    if (!actionGroup) {
      throw new Error('Expected the row actions to share a container.');
    }
    expect(actionGroup).toContainElement(deleteButton);
    expect(actionGroup).toHaveStyle({
      display: 'flex',
      width: '100%',
      justifyContent: 'center',
      gap: '4px',
    });
    expect(applyButton).toHaveStyle({
      minWidth: '0px',
      paddingLeft: '6px',
      paddingRight: '6px',
    });
    expect(deleteButton).toHaveStyle({
      minWidth: '0px',
      paddingLeft: '6px',
      paddingRight: '6px',
    });
  });

  it('saves inline template name changes and confirms deletion for that row', async () => {
    templateApi.list.mockResolvedValue([
      { templateId: 9, name: '기본 결재선', eabusNo: '001' },
      { templateId: 10, name: '다른 결재선', eabusNo: '001' },
    ]);
    templateApi.rename.mockImplementation(async (templateId, name) => ({
      templateId,
      name,
      eabusNo: '001',
    }));
    templateApi.delete.mockResolvedValue(undefined);
    renderSettings();

    await openTemplateManagerGrid();
    editTemplateName('기본 결재선', ' 변경된 이름 ');
    fireEvent.click(
      within(getTemplateManager()).getByRole('button', {
        name: '저장',
        exact: true,
      }),
    );

    await waitFor(() =>
      expect(templateApi.rename).toHaveBeenCalledWith(9, '변경된 이름'),
    );
    expect(templateApi.rename).toHaveBeenCalledTimes(1);
    expect(
      within(getTemplateGrid()).getByRole('gridcell', { name: '변경된 이름' }),
    ).toBeInTheDocument();
    expect(
      within(getTemplateManager()).getByRole('button', {
        name: '저장',
        exact: true,
      }),
    ).toBeDisabled();

    fireEvent.click(
      within(getTemplateGrid()).getByRole('button', {
        name: '결재선 삭제 변경된 이름',
      }),
    );
    expect(
      screen.getByText('“변경된 이름” 결재선을 삭제하시겠습니까?'),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '삭제 확인' }));

    await waitFor(() => expect(templateApi.delete).toHaveBeenCalledWith(9));
    expect(
      within(getTemplateManager()).getByRole('gridcell', {
        name: '다른 결재선',
      }),
    ).toBeInTheDocument();
    expect(
      within(getTemplateManager()).queryByRole('gridcell', {
        name: '변경된 이름',
      }),
    ).not.toBeInTheDocument();
  });

  it('saves multiple inline name changes together and trims their values', async () => {
    templateApi.list.mockResolvedValue([
      { templateId: 9, name: '기본 결재선', eabusNo: '001' },
      { templateId: 10, name: '다른 결재선', eabusNo: '001' },
      { templateId: 11, name: '그대로 둘 결재선', eabusNo: '001' },
    ]);
    templateApi.rename.mockImplementation(async (templateId, name) => ({
      templateId,
      name,
      eabusNo: '001',
    }));
    renderSettings();

    await openTemplateManagerGrid();
    editTemplateName('기본 결재선', ' 수정된 결재선 ');
    editTemplateName('다른 결재선', ' 두 번째 수정 ');
    fireEvent.click(
      within(getTemplateManager()).getByRole('button', {
        name: '저장',
        exact: true,
      }),
    );

    await waitFor(() =>
      expect(templateApi.rename).toHaveBeenCalledTimes(2),
    );
    expect(templateApi.rename).toHaveBeenNthCalledWith(
      1,
      9,
      '수정된 결재선',
    );
    expect(templateApi.rename).toHaveBeenNthCalledWith(2, 10, '두 번째 수정');
    expect(
      within(getTemplateGrid()).getByRole('gridcell', {
        name: '그대로 둘 결재선',
      }),
    ).toBeInTheDocument();
    expect(
      within(getTemplateManager()).getByRole('button', {
        name: '저장',
        exact: true,
      }),
    ).toBeDisabled();
  });

  it('commits an edited name when another cell is clicked and enables save', async () => {
    templateApi.list.mockResolvedValue([
      { templateId: 9, name: '기본 결재선', eabusNo: '001' },
      { templateId: 10, name: '다른 결재선', eabusNo: '001' },
    ]);
    templateApi.rename.mockImplementation(async (templateId, name) => ({
      templateId,
      name,
      eabusNo: '001',
    }));
    renderSettings();

    await openTemplateManagerGrid();
    const grid = getTemplateGrid();
    fireEvent.doubleClick(
      within(grid).getByRole('gridcell', { name: '기본 결재선' }),
    );
    const editor = screen.getByDisplayValue('기본 결재선');
    fireEvent.change(editor, { target: { value: '수정된 이름' } });
    const nextCell = within(grid).getByRole('gridcell', {
      name: '다른 결재선',
    });
    fireEvent.mouseDown(nextCell, { button: 0 });
    fireEvent.click(nextCell);

    expect(screen.queryByDisplayValue('수정된 이름')).not.toBeInTheDocument();
    expect(
      within(getTemplateManager()).getByRole('button', {
        name: '저장',
        exact: true,
      }),
    ).toBeEnabled();
    expect(
      within(grid)
        .getAllByRole('gridcell')
        .filter((cell) => cell.getAttribute('data-grid-selected') === 'true'),
    ).toEqual([nextCell]);

    fireEvent.click(
      within(getTemplateManager()).getByRole('button', {
        name: '저장',
        exact: true,
      }),
    );
    await waitFor(() =>
      expect(templateApi.rename).toHaveBeenCalledWith(9, '수정된 이름'),
    );
  });

  it('commits an active edit before clicking a manager action outside the Grid', async () => {
    templateApi.list.mockResolvedValue([
      { templateId: 9, name: '기본 결재선', eabusNo: '001' },
    ]);
    renderSettings();

    await openTemplateManagerGrid();
    fireEvent.doubleClick(
      within(getTemplateGrid()).getByRole('gridcell', {
        name: '기본 결재선',
      }),
    );
    fireEvent.change(screen.getByDisplayValue('기본 결재선'), {
      target: { value: '수정된 이름' },
    });

    const closeButton = getTemplateManagerCloseButton();
    const actionBar = closeButton.parentElement;
    if (!actionBar) throw new Error('Expected the manager action bar.');
    act(() => fireEvent.mouseDown(actionBar, { button: 0 }));
    expect(
      within(getTemplateManager()).getByRole('button', {
        name: '저장',
        exact: true,
      }),
    ).toBeEnabled();
    fireEvent.click(closeButton);

    expect(
      screen.getByRole('dialog', { name: '저장하지 않은 변경사항' }),
    ).toBeInTheDocument();
  });

  it('commits and saves an active name edit from the manager save action', async () => {
    templateApi.list.mockResolvedValue([
      { templateId: 9, name: '기본 결재선', eabusNo: '001' },
    ]);
    templateApi.rename.mockResolvedValue({
      templateId: 9,
      name: '수정된 이름',
      eabusNo: '001',
    });
    renderSettings();

    await openTemplateManagerGrid();
    fireEvent.doubleClick(
      within(getTemplateGrid()).getByRole('gridcell', {
        name: '기본 결재선',
      }),
    );
    fireEvent.change(screen.getByDisplayValue('기본 결재선'), {
      target: { value: '수정된 이름' },
    });

    const saveButton = within(getTemplateManager()).getByRole('button', {
      name: '저장',
      exact: true,
    });
    expect(saveButton).toBeDisabled();
    const actionBar = saveButton.parentElement;
    if (!actionBar) throw new Error('Expected the manager action bar.');
    act(() => fireEvent.mouseDown(actionBar, { button: 0 }));

    expect(saveButton).toBeEnabled();
    fireEvent.click(saveButton);
    await waitFor(() =>
      expect(templateApi.rename).toHaveBeenCalledWith(9, '수정된 이름'),
    );
  });

  it('rejects duplicate normalized template names before saving', async () => {
    templateApi.list.mockResolvedValue([
      { templateId: 9, name: '기본 결재선', eabusNo: '001' },
      { templateId: 10, name: '다른 결재선', eabusNo: '001' },
    ]);
    renderSettings();

    await openTemplateManagerGrid();
    editTemplateName('기본 결재선', ' 다른 결재선 ');
    fireEvent.click(
      within(getTemplateManager()).getByRole('button', {
        name: '저장',
        exact: true,
      }),
    );

    expect(
      await within(getTemplateManager()).findByText(
        '같은 이름의 결재선 템플릿이 이미 있습니다.',
      ),
    ).toBeInTheDocument();
    expect(templateApi.rename).not.toHaveBeenCalled();
    expect(
      within(getTemplateGrid()).getAllByRole('gridcell', {
        name: '다른 결재선',
      }),
    ).toHaveLength(2);
  });

  it.each([
    ['blank', '   '],
    ['longer than 100 characters', 'a'.repeat(101)],
  ])('rejects %s template names without calling the rename API', async (_, name) => {
    templateApi.list.mockResolvedValue([
      { templateId: 9, name: '기본 결재선', eabusNo: '001' },
    ]);
    renderSettings();

    await openTemplateManagerGrid();
    editTemplateName('기본 결재선', name);
    fireEvent.click(
      within(getTemplateManager()).getByRole('button', {
        name: '저장',
        exact: true,
      }),
    );

    expect(
      await within(getTemplateManager()).findByText(
        '결재선 템플릿 이름은 1~100자여야 합니다.',
      ),
    ).toBeInTheDocument();
    expect(templateApi.rename).not.toHaveBeenCalled();
  });

  it('preserves failed inline renames after partial batch failure for retry', async () => {
    templateApi.list.mockResolvedValue([
      { templateId: 9, name: '기본 결재선', eabusNo: '001' },
      { templateId: 10, name: '다른 결재선', eabusNo: '001' },
    ]);
    templateApi.rename
      .mockResolvedValueOnce({
        templateId: 9,
        name: '서버 저장 이름',
        eabusNo: '001',
      })
      .mockRejectedValueOnce(new Error('이름 변경 실패'))
      .mockResolvedValueOnce({
        templateId: 10,
        name: '재시도 성공 이름',
        eabusNo: '001',
      });
    renderSettings();

    await openTemplateManagerGrid();
    editTemplateName('기본 결재선', '성공할 이름');
    editTemplateName('다른 결재선', '실패 후 재시도할 이름');
    fireEvent.click(
      within(getTemplateManager()).getByRole('button', {
        name: '저장',
        exact: true,
      }),
    );

    expect(
      await within(getTemplateManager()).findByText(/이름 변경 실패/),
    ).toBeInTheDocument();
    expect(
      within(getTemplateGrid()).getByRole('gridcell', {
        name: '서버 저장 이름',
      }),
    ).toBeInTheDocument();
    expect(
      within(getTemplateGrid()).getByRole('gridcell', {
        name: '실패 후 재시도할 이름',
      }),
    ).toBeInTheDocument();
    const saveButton = within(getTemplateManager()).getByRole('button', {
      name: '저장',
      exact: true,
    });
    await waitFor(() => expect(saveButton).toBeEnabled());
    fireEvent.click(saveButton);

    await waitFor(() =>
      expect(templateApi.rename).toHaveBeenCalledTimes(3),
    );
    expect(templateApi.rename).toHaveBeenNthCalledWith(
      3,
      10,
      '실패 후 재시도할 이름',
    );
    expect(
      within(getTemplateGrid()).getByRole('gridcell', {
        name: '재시도 성공 이름',
      }),
    ).toBeInTheDocument();
  });

  it('confirms before loading with unsaved names and preserves changes when cancelled', async () => {
    templateApi.list.mockResolvedValue([
      { templateId: 9, name: '기본 결재선', eabusNo: '001' },
    ]);
    templateApi.get.mockResolvedValue({
      templateId: 9,
      name: '기본 결재선',
      eabusNo: '001',
      approvalLines: [],
    });
    renderSettings();

    await openTemplateManagerGrid();
    editTemplateName('기본 결재선', '수정된 이름');
    fireEvent.click(
      within(getTemplateGrid()).getByRole('button', {
        name: '결재선 적용 수정된 이름',
      }),
    );

    expect(
      screen.getByRole('dialog', { name: '저장하지 않은 변경사항' }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '취소' }));
    await waitFor(() =>
      expect(getTemplateGrid()).toBeInTheDocument(),
    );
    expect(
      within(getTemplateGrid()).getByRole('gridcell', { name: '수정된 이름' }),
    ).toBeInTheDocument();
    expect(templateApi.get).not.toHaveBeenCalled();

    fireEvent.click(
      within(getTemplateGrid()).getByRole('button', {
        name: '결재선 적용 수정된 이름',
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: '계속' }));
    await waitFor(() => expect(templateApi.get).toHaveBeenCalledWith(9));
    expect(
      screen.queryByRole('dialog', { name: '자주 쓰는 결재선 불러오기' }),
    ).not.toBeInTheDocument();
  });

  it('confirms before deleting with unsaved names and preserves changes when cancelled', async () => {
    templateApi.list.mockResolvedValue([
      { templateId: 9, name: '기본 결재선', eabusNo: '001' },
    ]);
    templateApi.delete.mockResolvedValue(undefined);
    renderSettings();

    await openTemplateManagerGrid();
    editTemplateName('기본 결재선', '수정된 이름');
    fireEvent.click(
      within(getTemplateGrid()).getByRole('button', {
        name: '결재선 삭제 수정된 이름',
      }),
    );

    expect(
      screen.getByRole('dialog', { name: '저장하지 않은 변경사항' }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '취소' }));
    await waitFor(() =>
      expect(getTemplateGrid()).toBeInTheDocument(),
    );
    expect(
      within(getTemplateGrid()).getByRole('gridcell', { name: '수정된 이름' }),
    ).toBeInTheDocument();
    expect(templateApi.delete).not.toHaveBeenCalled();

    fireEvent.click(
      within(getTemplateGrid()).getByRole('button', {
        name: '결재선 삭제 수정된 이름',
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: '계속' }));
    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: '저장하지 않은 변경사항' }),
      ).not.toBeInTheDocument(),
    );
    expect(
      screen.getByText('“기본 결재선” 결재선을 삭제하시겠습니까?'),
    ).toBeInTheDocument();
    fireEvent.click(
      await within(getTemplateManager()).findByRole('button', {
        name: '삭제 확인',
      }),
    );
    await waitFor(() => expect(templateApi.delete).toHaveBeenCalledWith(9));
  }, 10_000);

  it('confirms before closing with unsaved names and preserves changes when cancelled', async () => {
    templateApi.list.mockResolvedValue([
      { templateId: 9, name: '기본 결재선', eabusNo: '001' },
    ]);
    renderSettings();

    await openTemplateManagerGrid();
    editTemplateName('기본 결재선', '수정된 이름');
    fireEvent.click(
      getTemplateManagerCloseButton(),
    );

    expect(
      screen.getByRole('dialog', { name: '저장하지 않은 변경사항' }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '취소' }));
    await waitFor(() =>
      expect(getTemplateGrid()).toBeInTheDocument(),
    );
    expect(
      within(getTemplateGrid()).getByRole('gridcell', { name: '수정된 이름' }),
    ).toBeInTheDocument();

    fireEvent.click(
      getTemplateManagerCloseButton(),
    );
    fireEvent.click(screen.getByRole('button', { name: '계속' }));
    expect(
      screen.queryByRole('dialog', { name: '자주 쓰는 결재선 불러오기' }),
    ).not.toBeInTheDocument();
  }, 10_000);

  it('preserves temporary participants when loading a template fails', async () => {
    templateApi.list.mockResolvedValue([
      { templateId: 9, name: '기본 결재선', eabusNo: '001' },
    ]);
    templateApi.get.mockRejectedValue(new Error('상세 조회 실패'));
    const { onApply } = renderSettings();

    await openTemplateManagerGrid();
    fireEvent.click(
      within(getTemplateGrid()).getByRole('button', {
        name: '결재선 적용 기본 결재선',
      }),
    );
    expect((await screen.findAllByText('상세 조회 실패')).length).toBeGreaterThan(0);
    fireEvent.click(
      getTemplateManagerCloseButton(),
    );

    expect(
      await screen.findByRole('group', { name: '결재 2 결재자' }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '적용' }));

    expect(vi.mocked(onApply).mock.calls[0][0].map((stage) => stage.users)).toEqual([
      [users[0]],
      [users[1]],
      [users[2], users[3]],
    ]);
    expect(vi.mocked(onApply).mock.calls[0][1]).toEqual(['reference-1']);
  }, 10_000);

  it('applies a reordered agreement stage as one unit without mutating source state', () => {
    const { onApply } = renderSettings();

    fireEvent.click(screen.getByRole('button', { name: '결재 2 아래로 이동' }));
    fireEvent.click(screen.getByRole('button', { name: '적용' }));

    expect(onApply).toHaveBeenCalledTimes(1);
    const [stages, references] = vi.mocked(onApply).mock.calls[0];
    expect(stages.map((stage) => stage.id)).toEqual([1, 3, 2]);
    expect(stages[1].users).toEqual([users[2], users[3]]);
    expect(references).toEqual(['reference-1']);
    expect(stages).not.toBe(approvalStages);
    expect(stages[0]).not.toBe(approvalStages[0]);
    expect(stages[0].users).not.toBe(approvalStages[0].users);
  });

  it('reorders a stage when it is dropped onto another stage', () => {
    const { onApply } = renderSettings();
    const dataTransfer = createDataTransfer();
    const target = screen.getByRole('group', {
      name: '합의 3 합의자 1, 합의자 2',
    });
    vi.spyOn(target, 'getBoundingClientRect').mockReturnValue({
      top: 100,
      bottom: 160,
      height: 60,
    } as DOMRect);
    fireEvent.dragStart(
      screen.getByRole('button', { name: '드래그하여 결재 2 이동' }),
      { dataTransfer },
    );
    dragOverAt(target, 150);
    fireEvent.drop(target, { clientY: 150, dataTransfer });
    fireEvent.click(screen.getByRole('button', { name: '적용' }));

    const [stages] = vi.mocked(onApply).mock.calls[0];
    expect(stages.map((stage) => stage.id)).toEqual([1, 3, 2]);
  });

  it('starts dragging only from the stage handle and marks the dragged stage', () => {
    renderSettings();
    const stage = screen.getByRole('group', { name: '결재 2 결재자' });
    const handle = screen.getByRole('button', {
      name: '드래그하여 결재 2 이동',
    });

    expect(stage).not.toHaveAttribute('draggable');
    expect(handle).toHaveAttribute('draggable', 'true');
    fireEvent.dragStart(stage, { dataTransfer: createDataTransfer() });
    expect(stage).not.toHaveAttribute('data-dragging');

    fireEvent.dragStart(handle, { dataTransfer: createDataTransfer() });

    expect(stage).toHaveAttribute('data-dragging', 'true');
  });

  it.each([
    ['before', 110, [1, 3, 2, 4]],
    ['after', 150, [1, 3, 4, 2]],
  ] as const)(
    'shows the %s insertion marker and inserts the stage at that position',
    (position, clientY, expectedIds) => {
      const { onApply } = renderSettings({
        approvalStages: [
          ...approvalStages,
          {
            id: 4,
            kind: 'approval',
            users: [users[5]],
          },
        ],
      });
      const dataTransfer = createDataTransfer();
      const target = screen.getByRole('group', {
        name: '결재 4 새 결재자',
      });
      const bounds = {
        top: 100,
        bottom: 160,
        height: 60,
      } as DOMRect;
      vi.spyOn(target, 'getBoundingClientRect').mockReturnValue(bounds);
      expect(target.getBoundingClientRect()).toBe(bounds);
      fireEvent.dragStart(
        screen.getByRole('button', { name: '드래그하여 결재 2 이동' }),
        { dataTransfer },
      );
      dragOverAt(target, clientY);

      expect(target).toHaveAttribute('data-drop-position', position);

      fireEvent.drop(target, { clientY, dataTransfer });
      fireEvent.click(screen.getByRole('button', { name: '적용' }));

      const [stages] = vi.mocked(onApply).mock.calls[0];
      expect(stages.map((stage) => stage.id)).toEqual(expectedIds);
    },
  );

  it('clears dragged and insertion feedback after drag end and drop', () => {
    renderSettings({
      approvalStages: [
        ...approvalStages,
        {
          id: 4,
          kind: 'approval',
          users: [users[5]],
        },
      ],
    });
    const source = screen.getByRole('group', { name: '결재 2 결재자' });
    const target = screen.getByRole('group', {
      name: '결재 4 새 결재자',
    });
    vi.spyOn(target, 'getBoundingClientRect').mockReturnValue({
      top: 100,
      bottom: 160,
      height: 60,
    } as DOMRect);
    const handle = screen.getByRole('button', {
      name: '드래그하여 결재 2 이동',
    });
    const dataTransfer = createDataTransfer();

    fireEvent.dragStart(handle, { dataTransfer });
    dragOverAt(target, 110);
    fireEvent.dragEnd(handle);

    expect(source).not.toHaveAttribute('data-dragging');
    expect(target).not.toHaveAttribute('data-drop-position');

    fireEvent.dragStart(handle, { dataTransfer });
    dragOverAt(target, 150);
    fireEvent.drop(target, { clientY: 150, dataTransfer });

    expect(
      screen.getByTestId('document-approval-settings-stage-2'),
    ).not.toHaveAttribute('data-dragging');
    expect(
      screen.getByTestId('document-approval-settings-stage-4'),
    ).not.toHaveAttribute('data-drop-position');
  });

  it('adds individual approval stages and updates references before applying', async () => {
    const { onApply } = renderSettings();
    const approvalPicker = screen.getByRole('combobox', {
      name: '결재선 사용자 선택',
    });

    fireEvent.change(approvalPicker, { target: { value: '새 결재자' } });
    fireEvent.click(await screen.findByRole('option', { name: /새 결재자/ }));
    fireEvent.keyDown(approvalPicker, { key: 'Escape' });
    fireEvent.click(screen.getByRole('button', { name: '결재 추가' }));

    const referencePicker = screen.getByRole('combobox', {
      name: '참조자 선택',
    });
    fireEvent.change(referencePicker, { target: { value: '새 참조자' } });
    fireEvent.click(await screen.findByRole('option', { name: /새 참조자/ }));
    fireEvent.click(screen.getByRole('button', { name: '적용' }));

    expect(onApply).toHaveBeenCalledWith(
      [
        ...approvalStages,
        {
          id: 4,
          kind: 'approval',
          users: [users[5]],
        },
      ],
      ['reference-1', 'reference-2'],
    );
  });

  it('discards the temporary edit when cancelled', () => {
    const { onClose, onApply } = renderSettings();

    fireEvent.click(screen.getByRole('button', { name: '취소' }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onApply).not.toHaveBeenCalled();
  });
});

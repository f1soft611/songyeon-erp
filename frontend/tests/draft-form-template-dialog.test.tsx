import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotificationProvider } from '../src/shared/context/NotificationContext';
import { DraftFormManagementPage } from '../src/pages/co/workflow/form/DraftFormManagementPage';
import { DraftFormTemplateDialog } from '../src/pages/co/workflow/form/components/DraftFormTemplateDialog';
import type { DraftFormRow } from '../src/pages/co/workflow/form/types/draftFormManagement.types';

const apiMocks = vi.hoisted(() => ({
  apiDelete: vi.fn(),
  apiGet: vi.fn(),
  apiGetBlob: vi.fn(),
  apiPostFormData: vi.fn(),
  apiPut: vi.fn(),
}));

vi.mock('../src/shared/services/apiClient', () => apiMocks);

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
  hasDocument: true,
  useAt: 'Y',
};

const template = {
  draftingWorkCategoryId: 77,
  cataTypeCode: '007',
  codeName: '정기점검',
  hasDocument: true,
  templateJson: {
    type: 'doc',
    content: [
      { type: 'paragraph', content: [{ type: 'text', text: '저장된 본문' }] },
    ],
  },
  templateHtml: '<p>저장된 본문</p>',
};

function renderDialog() {
  const onClose = vi.fn();
  const onSaved = vi.fn();
  render(
    <ThemeProvider theme={createTheme()}>
      <NotificationProvider>
        <DraftFormTemplateDialog
          open
          row={row}
          onClose={onClose}
          onSaved={onSaved}
        />
      </NotificationProvider>
    </ThemeProvider>,
  );
  return { onClose, onSaved };
}

describe('DraftFormTemplateDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMocks.apiGet.mockResolvedValue({ item: template });
    apiMocks.apiPut.mockResolvedValue({ item: template });
  });

  it('loads and restores the selected form template', async () => {
    renderDialog();

    expect(
      await screen.findByRole('dialog', { name: '문서 양식 수정' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: '본문' })).toHaveTextContent(
      '저장된 본문',
    );
    expect(apiMocks.apiGet).toHaveBeenCalledWith(
      '/api/v1/co/workflow/forms/77/template',
    );
  });

  it('restores stored Excel line breaks without rewriting them on reopen', async () => {
    apiMocks.apiGet.mockResolvedValue({
      item: {
        ...template,
        templateJson: {
          type: 'doc',
          content: [
            {
              type: 'table',
              content: [
                {
                  type: 'tableRow',
                  content: [
                    {
                      type: 'tableCell',
                      content: [
                        {
                          type: 'paragraph',
                          content: [
                            {
                              type: 'text',
                              text: '중요관리점(CCP-2P)모니터링',
                              marks: [{ type: 'bold' }],
                            },
                            { type: 'hardBreak' },
                            {
                              type: 'text',
                              text: '일지',
                              marks: [{ type: 'bold' }],
                            },
                            { type: 'hardBreak' },
                            { type: 'hardBreak' },
                            {
                              type: 'text',
                              text: '[X-ray 금속검출공정]',
                              marks: [{ type: 'bold' }],
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
        templateHtml:
          '<table><tbody><tr><td><strong>중요관리점(CCP-2P)모니터링<br>일지<br><br>[X-ray 금속검출공정]</strong></td></tr></tbody></table>',
      },
    });
    const { onClose } = renderDialog();

    const editor = await screen.findByRole('textbox', { name: '본문' });
    await waitFor(() =>
      expect(
        editor
          .querySelector('table td p')
          ?.innerHTML.replace(/<\/?strong>/g, ''),
      ).toBe('중요관리점(CCP-2P)모니터링<br>일지<br><br>[X-ray 금속검출공정]'),
    );
    fireEvent.click(screen.getByRole('button', { name: '취소' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(
      screen.queryByRole('dialog', { name: '저장하지 않은 변경사항' }),
    ).not.toBeInTheDocument();
    expect(onClose).toHaveBeenCalled();
    expect(apiMocks.apiPut).not.toHaveBeenCalled();
  });

  it('lets the dialog body own vertical scrolling and removes editor frame separators', async () => {
    renderDialog();

    const editor = await screen.findByRole('textbox', { name: '본문' });
    const frame = screen.getByTestId('draft-form-template-editor');

    expect(editor).toHaveClass('ProseMirror');
    expect(frame).toHaveStyle({ overflow: 'visible' });
    expect(getComputedStyle(frame).borderTopStyle).not.toBe('solid');
    expect(getComputedStyle(frame).borderBottomStyle).not.toBe('solid');
    expect(editor).toHaveStyle({
      overflowY: 'visible',
      padding: '16px',
    });
    expect(frame.closest('.MuiDialogContent-root')).toHaveStyle({
      overflowY: 'auto',
    });
  });

  it('rehydrates a stored image using the authenticated blob endpoint', async () => {
    const objectUrl = 'blob:authenticated-template-image';
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => objectUrl),
      revokeObjectURL: vi.fn(),
    });
    apiMocks.apiGet.mockResolvedValue({
      item: {
        ...template,
        templateJson: {
          type: 'doc',
          content: [
            {
              type: 'image',
              attrs: {
                src: '/api/v1/co/workflow/forms/77/template-images/901',
                'data-file-id': '901',
                alt: '점검 이미지',
              },
            },
          ],
        },
        templateHtml:
          '<img src="/api/v1/co/workflow/forms/77/template-images/901" data-file-id="901" alt="점검 이미지">',
      },
    });
    apiMocks.apiGetBlob.mockResolvedValue(new Blob(['image']));
    renderDialog();

    const editor = await screen.findByRole('textbox', { name: '본문' });
    await waitFor(() =>
      expect(apiMocks.apiGetBlob).toHaveBeenCalledWith(
        '/api/v1/co/workflow/forms/77/template-images/901',
      ),
    );
    expect(editor.querySelector('img')).toHaveAttribute('src', objectUrl);
    expect(editor.querySelector('img')).toHaveAttribute('data-file-id', '901');
  });

  it('saves the editor JSON and HTML through the template endpoint', async () => {
    const { onClose, onSaved } = renderDialog();
    await screen.findByRole('textbox', { name: '본문' });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => expect(apiMocks.apiPut).toHaveBeenCalled());
    expect(apiMocks.apiPut).toHaveBeenCalledWith(
      '/api/v1/co/workflow/forms/77/template',
      expect.objectContaining({
        templateJson: expect.objectContaining({ type: 'doc' }),
        templateHtml: expect.stringContaining('저장된 본문'),
        embeddedImages: [],
      }),
    );
    expect(onSaved).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('uploads a pasted image to the form temp path and saves its upload token', async () => {
    const createObjectUrl = vi.fn(() => 'blob:local-pasted-image');
    const previewUrl = 'https://minio.example/embedded-image-preview';
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: createObjectUrl,
      revokeObjectURL: vi.fn(),
    });
    apiMocks.apiPostFormData.mockResolvedValue({
      item: {
        uploadToken: 'image-token-1',
        fileName: 'pasted.png',
        fileSize: 8,
        mimeType: 'image/png',
        previewUrl,
      },
    });
    renderDialog();
    const editor = await screen.findByRole('textbox', { name: '본문' });
    const file = new File(['png data'], 'pasted.png', { type: 'image/png' });

    fireEvent.paste(editor, {
      clipboardData: {
        items: [
          {
            kind: 'file',
            type: 'image/png',
            getAsFile: () => file,
          },
        ],
        getData: () => '',
      },
    });

    await waitFor(() => expect(apiMocks.apiPostFormData).toHaveBeenCalled());
    await waitFor(() =>
      expect(editor.querySelector('img')).toHaveAttribute('src', previewUrl),
    );
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => expect(apiMocks.apiPut).toHaveBeenCalled());

    expect(apiMocks.apiPostFormData).toHaveBeenCalledWith(
      '/api/v1/co/workflow/forms/77/template-images/temp',
      expect.any(FormData),
    );
    expect(apiMocks.apiPut).toHaveBeenCalledWith(
      '/api/v1/co/workflow/forms/77/template',
      expect.objectContaining({
        embeddedImages: [
          { uploadToken: 'image-token-1', fileName: 'pasted.png' },
        ],
      }),
    );
  });

  it('uses the shared toolbar with accessible command state', async () => {
    renderDialog();
    await screen.findByRole('textbox', { name: '본문' });

    fireEvent.click(screen.getByRole('button', { name: '툴바 열기' }));
    expect(screen.getByRole('button', { name: '굵게' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('hides typography controls and preserves pasted spreadsheet tables', async () => {
    renderDialog();
    const editor = await screen.findByRole('textbox', { name: '본문' });
    fireEvent.click(screen.getByRole('button', { name: '툴바 열기' }));

    const toolbar = screen.getByTestId('draft-form-template-toolbar');
    expect(
      within(toolbar).getByRole('combobox', { name: '문단' }),
    ).toBeInTheDocument();
    expect(
      within(toolbar).queryByRole('combobox', { name: '글꼴' }),
    ).toBeNull();
    expect(
      within(toolbar).queryByRole('combobox', { name: '글자 크기' }),
    ).toBeNull();
    expect(
      within(toolbar).getByRole('button', { name: '글자 색상' }),
    ).toBeInTheDocument();
    expect(
      within(toolbar).getByRole('button', { name: '밑줄' }),
    ).toBeInTheDocument();
    expect(
      within(toolbar).getByRole('button', { name: '표 삽입' }),
    ).toBeInTheDocument();
    expect(
      within(toolbar).getByRole('button', { name: '링크' }),
    ).toBeInTheDocument();

    fireEvent.paste(editor, {
      clipboardData: {
        items: [],
        getData: (type: string) =>
          type === 'text/html'
            ? '<table><tbody><tr><td style="font-family:Arial;font-size:10pt;white-space:pre-wrap;word-break:break-all;overflow-wrap:anywhere">표 셀 A</td><td>표 셀 B</td></tr></tbody></table>'
            : '',
      },
    });

    await waitFor(() => {
      expect(editor.querySelectorAll('table tr')).toHaveLength(1);
      expect(editor.querySelector('table')?.textContent).toBe('표 셀 A표 셀 B');
      const cell = editor.querySelector('table td') as HTMLTableCellElement;
      expect(cell.style.fontFamily).toBe('Arial');
      expect(cell.style.fontSize).toBe('10pt');
      expect(cell.style.whiteSpace).toBe('pre-wrap');
      expect(cell.style.wordBreak).toBe('break-all');
      expect(cell.style.overflowWrap).toBe('anywhere');
    });
  });

  it('preserves Excel title line breaks and cell font size when pasting', async () => {
    renderDialog();
    const editor = await screen.findByRole('textbox', { name: '본문' });
    fireEvent.paste(editor, {
      clipboardData: {
        items: [],
        getData: (type: string) =>
          type === 'text/html'
            ? '<table><tbody><tr><td style="font-family:Arial;font-size:22pt"><strong>중요관리점(CCP-2P)모니터링<br>일지<br><br>[X-ray 금속검출공정]</strong></td></tr></tbody></table>'
            : '',
      },
    });

    await waitFor(() => {
      const cell = editor.querySelector('table td');
      const title = cell?.querySelector('strong');
      expect((cell as HTMLTableCellElement | null)?.style.fontSize).toBe(
        '22pt',
      );
      expect(title?.innerHTML).toBe(
        '중요관리점(CCP-2P)모니터링<br>일지<br><br>[X-ray 금속검출공정]',
      );
    });
  });

  it('preserves font family and size when pasting non-table rich HTML', async () => {
    renderDialog();
    const editor = await screen.findByRole('textbox', { name: '본문' });
    fireEvent.paste(editor, {
      clipboardData: {
        items: [],
        getData: (type: string) =>
          type === 'text/html'
            ? '<p style="font-family:Arial;font-size:14pt;color:#123456">기안 본문</p>'
            : '',
      },
    });

    await waitFor(() => {
      const styledText = editor.querySelector('span');
      expect(styledText).toHaveTextContent('기안 본문');
      expect(styledText).toHaveStyle({
        fontFamily: 'Arial',
        fontSize: '14pt',
        color: 'rgb(18, 52, 86)',
      });
    });
  });

  it('confirms discarding an uploaded image and deletes its temporary object', async () => {
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => 'blob:local-pasted-image'),
      revokeObjectURL: vi.fn(),
    });
    apiMocks.apiPostFormData.mockResolvedValue({
      item: {
        uploadToken: 'image-token-2',
        fileName: 'pasted.png',
        fileSize: 8,
        mimeType: 'image/png',
      },
    });
    const { onClose } = renderDialog();
    const editor = await screen.findByRole('textbox', { name: '본문' });
    const file = new File(['png data'], 'pasted.png', { type: 'image/png' });
    fireEvent.paste(editor, {
      clipboardData: {
        items: [{ kind: 'file', type: 'image/png', getAsFile: () => file }],
        getData: () => '',
      },
    });
    await waitFor(() => expect(apiMocks.apiPostFormData).toHaveBeenCalled());

    fireEvent.click(screen.getByRole('button', { name: '취소' }));
    expect(
      await screen.findByRole('dialog', { name: '저장하지 않은 변경사항' }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '변경 버리기' }));

    await waitFor(() =>
      expect(apiMocks.apiDelete).toHaveBeenCalledWith(
        '/api/v1/co/workflow/forms/77/template-images/temp/image-token-2?fileName=pasted.png',
      ),
    );
    expect(onClose).toHaveBeenCalled();
  });

  it('deletes a temporary upload when its placeholder was removed before upload completed', async () => {
    let resolveUpload: ((value: unknown) => void) | undefined;
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => 'blob:local-pasted-image'),
      revokeObjectURL: vi.fn(),
    });
    apiMocks.apiPostFormData.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveUpload = resolve;
        }),
    );
    renderDialog();
    const editor = await screen.findByRole('textbox', { name: '본문' });
    const file = new File(['png data'], 'pasted.png', { type: 'image/png' });
    fireEvent.paste(editor, {
      clipboardData: {
        items: [{ kind: 'file', type: 'image/png', getAsFile: () => file }],
        getData: () => '',
      },
    });
    const placeholder = await waitFor(() => {
      const image = editor.querySelector('img');
      expect(image).toBeInTheDocument();
      return image as HTMLImageElement;
    });
    placeholder.click();
    fireEvent.keyDown(editor, { key: 'Backspace' });
    await waitFor(() => expect(editor.querySelector('img')).toBeNull());

    resolveUpload?.({
      item: {
        uploadToken: 'late-image-token',
        fileName: 'pasted.png',
        fileSize: 8,
        mimeType: 'image/png',
      },
    });

    await waitFor(() =>
      expect(apiMocks.apiDelete).toHaveBeenCalledWith(
        '/api/v1/co/workflow/forms/77/template-images/temp/late-image-token?fileName=pasted.png',
      ),
    );
    expect(apiMocks.apiPut).not.toHaveBeenCalled();
  });

  it('opens the selected row template dialog from the document action', async () => {
    window.localStorage.setItem(
      'co-workflow-draft-form-grid',
      JSON.stringify({
        order: [
          'draftingWorkCategoryId',
          'cataTypeCode',
          'codeName',
          'categoryItemId',
          'regTermId',
          'reviewerId',
          'approverId',
          'assigneeIds',
          'createdByName',
          'createdAt',
          'useAt',
        ],
        widths: {},
        hidden: [],
        pinned: {
          draftingWorkCategoryId: 'left',
          cataTypeCode: 'left',
          codeName: 'left',
        },
      }),
    );
    window.localStorage.removeItem(
      'co-workflow-draft-form-grid-template-action-pinned-v1',
    );
    apiMocks.apiGet.mockImplementation((path: string) => {
      if (path === '/api/v1/co/workflow/forms') {
        return Promise.resolve({ resultList: [row] });
      }
      if (path === '/api/v1/co/workflow/forms/77/template') {
        return Promise.resolve({ item: template });
      }
      return Promise.resolve({ resultList: [] });
    });

    render(
      <ThemeProvider theme={createTheme()}>
        <NotificationProvider>
          <DraftFormManagementPage
            selectedModule={{
              id: 'co',
              name: '기준정보',
              icon: null,
              tree: [],
              menus: [],
            }}
            currentMenuName="기안양식관리"
            content={{
              title: '기안양식관리',
              description: '',
              cards: [],
              items: [],
            }}
            selectedMenuPermissions={{
              read: true,
              create: false,
              update: true,
              delete: false,
            }}
            isTenantAdmin
          />
        </NotificationProvider>
      </ThemeProvider>,
    );

    await waitFor(() =>
      expect(apiMocks.apiGet).toHaveBeenCalledWith('/api/v1/co/workflow/forms'),
    );
    expect(
      await screen.findByRole('columnheader', { name: '문서 양식' }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('gridcell', { name: '정기점검' }),
    ).toBeVisible();
    fireEvent.click(
      await screen.findByRole('button', { name: '문서 수정: 정기점검' }),
    );

    expect(
      await screen.findByRole('dialog', { name: '문서 양식 수정' }),
    ).toBeInTheDocument();
    expect(apiMocks.apiGet).toHaveBeenCalledWith(
      '/api/v1/co/workflow/forms/77/template',
    );
  });
});

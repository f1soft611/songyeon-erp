import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NoticeComposerDialog } from '../src/pages/groupware/community/notice/components/NoticeComposerDialog';
import { createAppTheme } from '../src/theme/theme';
import {
  normalizeClipboardHtmlForEditor,
  calculateNoticeImageResize,
  calculateNoticeImageResizeWidth,
  serializeNoticeEditorJson,
} from '../src/pages/groupware/community/notice/components/NoticeComposerDialog';
import {
  deleteNoticeEmbeddedImage,
  uploadNoticeEmbeddedImage,
} from '../src/pages/groupware/community/notice/services/noticeBoardService';

vi.mock(
  '../src/pages/groupware/community/notice/services/noticeBoardService',
  () => ({
    deleteNoticeEmbeddedImage: vi.fn(),
    uploadNoticeEmbeddedImage: vi.fn(),
  }),
);

describe('NoticeComposerDialog payload', () => {
  beforeEach(() => {
    vi.mocked(uploadNoticeEmbeddedImage).mockReset();
    vi.mocked(deleteNoticeEmbeddedImage).mockReset();
  });

  it('blocks saving when the notice category is not selected', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      React.createElement(
        ThemeProvider,
        { theme: createAppTheme('light') },
        React.createElement(NoticeComposerDialog, {
          open: true,
          isDark: false,
          onClose: () => undefined,
          onSubmit,
          noticeGubunOptions: [{ code: 'GENERAL', name: '일반' }],
        }),
      ),
    );

    fireEvent.change(screen.getByRole('textbox', { name: '제목' }), {
      target: { value: '구분 필수 검증' },
    });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText('구분을 선택해 주세요.')).toBeInTheDocument();
  });

  it('shows save progress and prevents duplicate submissions while saving', async () => {
    let resolveSubmit: (() => void) | undefined;
    const onClose = vi.fn();
    const onSubmit = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveSubmit = resolve;
        }),
    );

    render(
      React.createElement(
        ThemeProvider,
        { theme: createAppTheme('light') },
        React.createElement(NoticeComposerDialog, {
          open: true,
          isDark: false,
          onClose,
          onSubmit,
          noticeGubunOptions: [{ code: 'GENERAL', name: '일반' }],
          defaultNoticeGubunCode: 'GENERAL',
        }),
      ),
    );

    fireEvent.change(screen.getByRole('textbox', { name: '제목' }), {
      target: { value: '본문 저장 지연 테스트' },
    });
    const saveButton = screen.getByRole('button', { name: '저장' });
    fireEvent.click(saveButton);

    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
    expect(saveButton).toBeDisabled();
    expect(within(saveButton).getByRole('progressbar')).toBeVisible();
    expect(saveButton).toHaveTextContent('저장 중…');
    const cancelButton = screen.getByRole('button', { name: '취소' });
    expect(cancelButton).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: '닫기' }));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(saveButton);
    expect(onSubmit).toHaveBeenCalledOnce();

    resolveSubmit?.();
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    await waitFor(() => expect(saveButton).toHaveTextContent('저장'));
  });

  it('clears save progress and keeps the composer open when submission fails', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('저장 실패'));

    render(
      React.createElement(
        ThemeProvider,
        { theme: createAppTheme('light') },
        React.createElement(NoticeComposerDialog, {
          open: true,
          isDark: false,
          onClose: () => undefined,
          onSubmit,
          noticeGubunOptions: [{ code: 'GENERAL', name: '일반' }],
          defaultNoticeGubunCode: 'GENERAL',
        }),
      ),
    );

    fireEvent.change(screen.getByRole('textbox', { name: '제목' }), {
      target: { value: '저장 실패 상태 복구' },
    });
    const saveButton = screen.getByRole('button', { name: '저장' });
    fireEvent.click(saveButton);

    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
    await waitFor(() => expect(saveButton).toBeEnabled());

    expect(
      within(saveButton).queryByRole('progressbar'),
    ).not.toBeInTheDocument();
    expect(saveButton).toHaveTextContent('저장');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('renders a file-type icon for an existing spreadsheet attachment', () => {
    render(
      React.createElement(
        ThemeProvider,
        { theme: createAppTheme('light') },
        React.createElement(NoticeComposerDialog, {
          open: true,
          isDark: false,
          onClose: () => undefined,
          defaultAttachments: [
            { id: 'file-1', name: '업무일정.xlsx', boardFileId: 101 },
          ],
        }),
      ),
    );

    expect(screen.getByTestId('attachment-icon-xlsx')).toBeInTheDocument();
  });

  it('does not expose a pin checkbox in the composer', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      React.createElement(
        ThemeProvider,
        { theme: createAppTheme('light') },
        React.createElement(NoticeComposerDialog, {
          open: true,
          isDark: false,
          onClose: () => undefined,
          onSubmit,
          noticeGubunOptions: [{ code: 'GENERAL', name: '일반' }],
          defaultNoticeGubunCode: 'GENERAL',
        }),
      ),
    );

    expect(
      screen.queryByRole('checkbox', { name: '중요 공지' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('checkbox', { name: '상단 고정' }),
    ).not.toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('keeps the resize width calculation bounded for image dragging', () => {
    expect(calculateNoticeImageResizeWidth(320, -500)).toBe(120);
    expect(calculateNoticeImageResizeWidth(320, 100)).toBe(420);
    expect(calculateNoticeImageResizeWidth(1200, 300)).toBe(1200);
  });

  it('calculates axis-only image resizing for each edge', () => {
    expect(calculateNoticeImageResize(320, 200, 100, 0, 'e')).toEqual({
      width: 420,
      height: 200,
    });
    expect(calculateNoticeImageResize(320, 200, 50, 0, 'w')).toEqual({
      width: 270,
      height: 200,
    });
    expect(calculateNoticeImageResize(320, 200, 0, 50, 's')).toEqual({
      width: 320,
      height: 250,
    });
    expect(calculateNoticeImageResize(320, 200, 0, 50, 'n')).toEqual({
      width: 320,
      height: 150,
    });
  });

  it('preserves the aspect ratio while resizing from a corner', () => {
    expect(calculateNoticeImageResize(320, 200, 100, 0, 'se')).toEqual({
      width: 420,
      height: 263,
    });
  });

  it('still mounts the composer when image content is present', async () => {
    render(
      React.createElement(
        ThemeProvider,
        { theme: createAppTheme('light') },
        React.createElement(NoticeComposerDialog, {
          open: true,
          isDark: false,
          onClose: () => undefined,
          noticeGubunOptions: [{ code: 'GENERAL', name: '일반' }],
          defaultNoticeGubunCode: 'GENERAL',
        }),
      ),
    );

    const editor = screen.getByRole('textbox', { name: /본문/i });
    fireEvent.input(editor, {
      target: {
        innerHTML:
          '<p><img src="https://example.com/image.png" alt="이미지" /></p>',
      },
    });

    await waitFor(() => {
      expect(
        screen.getByRole('textbox', { name: /본문/i }),
      ).toBeInTheDocument();
    });
  });

  it('passes live embedded images and the full temporary upload session separately on save', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    vi.mocked(uploadNoticeEmbeddedImage).mockResolvedValue({
      uploadToken: 'notice-image-token',
      fileId: 'notice-image-token',
      fileName: 'pasted.png',
      fileSize: 8,
      mimeType: 'image/png',
      objectKey: 'tenant/1/embedded-image-temp/notice-image-token/pasted.png',
      bucketName: 'document-attachments',
      imageUrl: 'https://minio.example/notice-preview',
    });
    render(
      React.createElement(
        ThemeProvider,
        { theme: createAppTheme('light') },
        React.createElement(NoticeComposerDialog, {
          open: true,
          isDark: false,
          onClose: () => undefined,
          onSubmit,
          noticeGubunOptions: [{ code: 'GENERAL', name: '일반' }],
          defaultNoticeGubunCode: 'GENERAL',
        }),
      ),
    );
    const editor = await screen.findByRole('textbox', { name: '본문' });
    fireEvent.paste(editor, {
      clipboardData: {
        items: [
          {
            kind: 'file',
            type: 'image/png',
            getAsFile: () =>
              new File(['png'], 'pasted.png', { type: 'image/png' }),
          },
        ],
        getData: () => '',
      },
    });

    await waitFor(() =>
      expect(editor.querySelector('img')).toHaveAttribute(
        'src',
        'https://minio.example/notice-preview',
      ),
    );
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());

    expect(onSubmit.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        embeddedImages: [
          expect.objectContaining({ uploadToken: 'notice-image-token' }),
        ],
        temporaryImages: [
          expect.objectContaining({
            uploadToken: 'notice-image-token',
            fileName: 'pasted.png',
          }),
        ],
      }),
    );
  });

  it('deletes a temporary embedded image when closing without saving', async () => {
    vi.mocked(uploadNoticeEmbeddedImage).mockResolvedValue({
      uploadToken: 'notice-image-token',
      fileId: 'notice-image-token',
      fileName: 'pasted.png',
      fileSize: 8,
      mimeType: 'image/png',
      objectKey: 'tenant/1/embedded-image-temp/notice-image-token/pasted.png',
      bucketName: 'document-attachments',
      imageUrl: 'https://minio.example/notice-preview',
    });
    render(
      React.createElement(
        ThemeProvider,
        { theme: createAppTheme('light') },
        React.createElement(NoticeComposerDialog, {
          open: true,
          isDark: false,
          onClose: () => undefined,
          noticeGubunOptions: [{ code: 'GENERAL', name: '일반' }],
          defaultNoticeGubunCode: 'GENERAL',
        }),
      ),
    );
    const editor = await screen.findByRole('textbox', { name: '본문' });
    fireEvent.paste(editor, {
      clipboardData: {
        items: [
          {
            kind: 'file',
            type: 'image/png',
            getAsFile: () =>
              new File(['png'], 'pasted.png', { type: 'image/png' }),
          },
        ],
        getData: () => '',
      },
    });
    await waitFor(() =>
      expect(editor.querySelector('img')).toHaveAttribute(
        'src',
        'https://minio.example/notice-preview',
      ),
    );

    fireEvent.click(screen.getByRole('button', { name: '취소' }));

    await waitFor(() =>
      expect(deleteNoticeEmbeddedImage).toHaveBeenCalledWith(
        'notice-image-token',
        'pasted.png',
      ),
    );
  });

  it('blocks saving and closing while an embedded image upload is pending', async () => {
    let resolveUpload:
      | ((image: {
          uploadToken: string;
          fileId: string;
          fileName: string;
          fileSize: number;
          mimeType: string;
          objectKey: string;
          bucketName: string;
          imageUrl: string;
        }) => void)
      | undefined;
    const onClose = vi.fn();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    vi.mocked(uploadNoticeEmbeddedImage).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveUpload = resolve;
        }),
    );
    render(
      React.createElement(
        ThemeProvider,
        { theme: createAppTheme('light') },
        React.createElement(NoticeComposerDialog, {
          open: true,
          isDark: false,
          onClose,
          onSubmit,
          noticeGubunOptions: [{ code: 'GENERAL', name: '일반' }],
          defaultNoticeGubunCode: 'GENERAL',
        }),
      ),
    );
    const editor = await screen.findByRole('textbox', { name: '본문' });
    fireEvent.paste(editor, {
      clipboardData: {
        items: [
          {
            kind: 'file',
            type: 'image/png',
            getAsFile: () =>
              new File(['png'], 'pasted.png', { type: 'image/png' }),
          },
        ],
        getData: () => '',
      },
    });
    await waitFor(() =>
      expect(uploadNoticeEmbeddedImage).toHaveBeenCalledOnce(),
    );

    expect(screen.getByRole('button', { name: '저장' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '취소' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: '닫기' }));
    expect(onClose).not.toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();

    resolveUpload?.({
      uploadToken: 'notice-image-token',
      fileId: 'notice-image-token',
      fileName: 'pasted.png',
      fileSize: 8,
      mimeType: 'image/png',
      objectKey: 'tenant/1/embedded-image-temp/notice-image-token/pasted.png',
      bucketName: 'document-attachments',
      imageUrl: 'https://minio.example/notice-preview',
    });
    await waitFor(() =>
      expect(editor.querySelector('img')).toHaveAttribute(
        'src',
        'https://minio.example/notice-preview',
      ),
    );
    expect(screen.getByRole('button', { name: '저장' })).toBeEnabled();
  });

  it('allows saving a non-empty initial body even when the title is blank', async () => {
    render(
      React.createElement(
        ThemeProvider,
        { theme: createAppTheme('light') },
        React.createElement(NoticeComposerDialog, {
          open: true,
          isDark: false,
          onClose: () => undefined,
          defaultBody: '<p>기존 본문</p>',
          noticeGubunOptions: [{ code: 'GENERAL', name: '일반' }],
          defaultNoticeGubunCode: 'GENERAL',
        }),
      ),
    );

    expect(
      await screen.findByRole('textbox', { name: '본문' }),
    ).toHaveTextContent('기존 본문');
    expect(screen.getByRole('button', { name: '저장' })).toBeEnabled();
  });

  it('serializes the editor JSON returned by Tiptap', () => {
    const json = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'JSON 본문' }] },
      ],
    };

    expect(serializeNoticeEditorJson({ getJSON: () => json })).toBe(
      JSON.stringify(json),
    );
  });

  it('uses the shared toolbar with accessible command state', async () => {
    render(
      React.createElement(
        ThemeProvider,
        { theme: createAppTheme('light') },
        React.createElement(NoticeComposerDialog, {
          open: true,
          isDark: false,
          onClose: () => undefined,
          noticeGubunOptions: [{ code: 'GENERAL', name: '일반' }],
          defaultNoticeGubunCode: 'GENERAL',
        }),
      ),
    );

    fireEvent.click(await screen.findByRole('button', { name: '툴바 열기' }));
    const toolbar = screen.getByTestId('notice-toolbar-popup');
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
      within(toolbar).getByRole('button', { name: '밑줄' }),
    ).toBeInTheDocument();
    expect(
      within(toolbar).getByRole('button', { name: '표 삽입' }),
    ).toBeInTheDocument();
    expect(
      within(toolbar).getByRole('button', { name: '링크' }),
    ).toBeInTheDocument();
    expect(
      within(toolbar).getByRole('button', { name: '굵게' }),
    ).toHaveAttribute('aria-pressed', 'false');
  });

  it('keeps clipboard table structure readable for the notice editor', () => {
    const html = `
      <table>
        <tbody>
          <tr><td>업무</td><td>담당</td></tr>
          <tr><td>공지 작성</td><td>홍길동</td></tr>
        </tbody>
      </table>
    `;

    const normalized = normalizeClipboardHtmlForEditor(html);

    expect(normalized).toContain('업무');
    expect(normalized).toContain('담당');
    expect(normalized).toContain('공지 작성');
    expect(normalized).toContain('<table>');
    expect(normalized).toContain('<tr><td>업무</td><td>담당</td></tr>');
  });

  it('removes dangerous tags before inserting clipboard HTML', () => {
    const html = `
      <script>alert('x')</script>
      <table><tbody><tr><td>안전</td><td>값</td></tr></tbody></table>
    `;

    const normalized = normalizeClipboardHtmlForEditor(html);

    expect(normalized).toContain('안전');
    expect(normalized).toContain('<table>');
    expect(normalized).not.toContain('<script');
    expect(normalized).not.toContain('alert(');
  });

  it('keeps empty spreadsheet cells and cell spans in the normalized table', () => {
    const html = `
      <table><tbody>
        <tr><td></td><td>12</td><td></td></tr>
        <tr><td>123</td><td rowspan="2"></td><td>123</td></tr>
      </tbody></table>
    `;

    const normalized = normalizeClipboardHtmlForEditor(html);

    expect(normalized).toContain('<tr><td></td><td>12</td><td></td></tr>');
    expect(normalized).toContain(
      '<tr><td>123</td><td rowspan="2"></td><td>123</td></tr>',
    );
  });

  it('preserves safe Excel cell size, background, and border styles', () => {
    const html = `
      <table><tbody>
        <tr>
          <td style="width:120px;height:28px;background-color:#fff2cc;border:2px solid #1f2937;font:italic 10pt Arial;">셀</td>
        </tr>
      </tbody></table>
    `;

    const normalized = normalizeClipboardHtmlForEditor(html);

    expect(normalized).toContain('width:120px');
    expect(normalized).toContain('height:28px');
    expect(normalized).toContain('background-color:rgb(255, 242, 204)');
    expect(normalized).toContain('border:2px solid rgb(31, 41, 55)');
    expect(normalized).toContain('font-size:10pt');
    expect(normalized).toContain('font-family:Arial');
    expect(normalized).toContain('font-style:italic');
  });

  it('preserves Excel soft and paragraph line breaks in clipboard order', () => {
    const html =
      '<table><tbody><tr><td>첫 줄<br>이어지는 줄<br><br>새 문단</td></tr></tbody></table>';

    const normalized = normalizeClipboardHtmlForEditor(html);

    expect(normalized).toContain(
      '<td>첫 줄<br>이어지는 줄<br><br>새 문단</td>',
    );
  });

  it('preserves wrapped text-node newlines without dropping characters', () => {
    const html =
      '<table><tbody><tr><td><strong>중요관리점(CCP-2P)모니터링\n일지\n[X-ray 금속검출공정]</strong></td></tr></tbody></table>';

    const normalized = normalizeClipboardHtmlForEditor(html);

    expect(normalized).toContain(
      '<strong>중요관리점(CCP-2P)모니터링<br>일지<br>[X-ray 금속검출공정]</strong>',
    );
  });

  it('synchronizes real Excel plain-text line breaks into merged HTML cells', async () => {
    render(
      React.createElement(
        ThemeProvider,
        { theme: createAppTheme('light') },
        React.createElement(NoticeComposerDialog, {
          open: true,
          isDark: false,
          onClose: () => undefined,
        }),
      ),
    );

    const editor = screen.getByRole('textbox', { name: /본문/i });
    fireEvent.paste(editor, {
      clipboardData: {
        getData: (type: string) =>
          type === 'text/html'
            ? '<table><colgroup><col width="10"><col width="20"><col width="30"><col width="40"></colgroup><tbody><tr><td colspan="2" style="font-family:Arial;font-size:22pt"><p>제목 첫 줄<br>전체<br><br>X-ray 줄</p></td><td>1호기</td><td>2호기</td></tr><tr><td>방법</td><td colspan="3" style="font-family:Arial;font-size:9pt"><p><span style="color:#ff0000">* 기기 감도</span><br> - 표준시편을 통과시킨다. 이어지는 문장<br>* 제품 감도</p></td></tr></tbody></table>'
            : '"제목 첫 줄 전체\nX-ray 줄"\t\t1호기\t2호기\r\n방법\t"* 기기 감도\n - 표준시편을 통과시킨다. 이어지는 문장\n* 제품 감도"\t\t',
      },
      preventDefault: vi.fn(),
    });

    await waitFor(() => {
      const rows = editor.querySelectorAll('table tr');
      expect(rows[0].querySelector('td p')?.innerHTML).toBe(
        '제목 첫 줄 전체<br>X-ray 줄',
      );
      expect(rows[0].querySelector('td')?.getAttribute('colspan')).toBe('2');
      expect(
        (rows[0].querySelector('td') as HTMLTableCellElement).style.fontSize,
      ).toBe('22pt');
      const method = rows[1].querySelectorAll('td')[1]?.querySelector('p');
      const coloredText = method?.querySelector('span');
      expect(coloredText?.textContent).toBe('* 기기 감도');
      expect(coloredText?.style.color).toBe('rgb(255, 0, 0)');
      expect(method?.textContent?.replace(/[\s\u00a0]/g, '')).toBe(
        '*기기감도-표준시편을통과시킨다.이어지는문장*제품감도',
      );
      expect(rows[1].querySelectorAll('td')[1]?.getAttribute('colspan')).toBe(
        '3',
      );
      expect(
        rows[1].querySelectorAll('td')[1]?.querySelector('span')?.style.color,
      ).toBe('rgb(255, 0, 0)');
    });
  });

  it('applies embedded Excel CSS rules to matching cells', () => {
    const html = `
      <html><head>
        <style>
          .xl65 { background-color: #fff2cc; border: 2px solid #1f2937; }
          .xlfont { font: italic bold 10pt Arial; }
          .xlcol { width: 22pt; }
          .xlcolwide { width: 44pt; }
        </style>
      </head><body>
        <table><colgroup><col class="xlcol"><col class="xlcolwide"></colgroup>
          <tbody><tr><td class="xl65 xlfont">셀</td><td>다음</td></tr></tbody>
        </table>
      </body></html>
    `;

    const normalized = normalizeClipboardHtmlForEditor(html);

    expect(normalized).toContain('background-color:rgb(255, 242, 204)');
    expect(normalized).toContain('border:2px solid rgb(31, 41, 55)');
    expect(normalized).toContain('font-size:10pt');
    expect(normalized).toContain('font-family:Arial');
    expect(normalized).toContain('colwidth="29"');
    expect(normalized).toContain('colwidth="59"');
    expect(normalized).not.toContain('class="xl65"');
  });

  it('inserts Excel table HTML via the actual paste handler without losing values', async () => {
    render(
      React.createElement(
        ThemeProvider,
        { theme: createAppTheme('light') },
        React.createElement(NoticeComposerDialog, {
          open: true,
          isDark: false,
          onClose: () => undefined,
        }),
      ),
    );

    const editor = screen.getByRole('textbox', { name: /본문/i });
    const html = `
      <table>
        <tbody>
          <tr><td>업무</td><td>담당</td></tr>
          <tr><td>공지 작성</td><td>홍길동</td></tr>
        </tbody>
      </table>
    `;

    fireEvent.paste(editor, {
      clipboardData: {
        getData: (type: string) => {
          if (type === 'text/html') return html;
          if (type === 'text/plain') return '업무\t담당\n공지 작성\t홍길동';
          return '';
        },
      },
      preventDefault: vi.fn(),
    });

    await waitFor(() => {
      expect(editor).toHaveTextContent('업무');
      expect(editor).toHaveTextContent('담당');
      expect(editor).toHaveTextContent('공지 작성');
      expect(editor).toHaveTextContent('홍길동');
      expect(editor.querySelector('table')?.getAttribute('style')).toContain(
        'min-width: 32px',
      );
    });
  });

  it('does not convert Excel clipboard table data into an embedded image upload', async () => {
    vi.mocked(uploadNoticeEmbeddedImage).mockResolvedValue({
      imageUrl: 'https://example.com/pasted.png',
      fileName: 'sheet.png',
      objectKey: 'notice/sheet.png',
      fileSize: 100,
      mimeType: 'image/png',
    });

    render(
      React.createElement(
        ThemeProvider,
        { theme: createAppTheme('light') },
        React.createElement(NoticeComposerDialog, {
          open: true,
          isDark: false,
          onClose: () => undefined,
        }),
      ),
    );

    const editor = screen.getByRole('textbox', { name: /본문/i });
    const html = `
      <table>
        <tbody>
          <tr><td>업무</td><td>담당</td></tr>
          <tr><td>공지 작성</td><td>홍길동</td></tr>
        </tbody>
      </table>
    `;

    fireEvent.paste(editor, {
      clipboardData: {
        items: [
          {
            kind: 'file',
            type: 'image/png',
            getAsFile: () =>
              new File(['png'], 'sheet.png', { type: 'image/png' }),
          },
        ],
        getData: (type: string) => {
          if (type === 'text/html') return html;
          if (type === 'text/plain') return '업무\t담당\n공지 작성\t홍길동';
          return '';
        },
      },
      preventDefault: vi.fn(),
    });

    await waitFor(() => {
      expect(uploadNoticeEmbeddedImage).not.toHaveBeenCalled();
      expect(editor).toHaveTextContent('업무');
      expect(editor).toHaveTextContent('담당');
      expect(editor).toHaveTextContent('공지 작성');
      expect(editor).toHaveTextContent('홍길동');
    });
  });

  it('preserves spreadsheet values from real Excel-style clipboard HTML', async () => {
    render(
      React.createElement(
        ThemeProvider,
        { theme: createAppTheme('light') },
        React.createElement(NoticeComposerDialog, {
          open: true,
          isDark: false,
          onClose: () => undefined,
        }),
      ),
    );

    const editor = screen.getByRole('textbox', { name: /본문/i });
    const excelHtml = `
      <html><head><style>.excel-text { font: 10pt Arial; }</style></head><body>
        <table border="1" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
          <colgroup>
            <col style="width:120px;" />
            <col style="width:160px;" />
            <col width="140" />
          </colgroup>
          <tbody>
            <tr>
              <td class="excel-text" style="padding:2px 4px;width:120px;height:28px;white-space:pre-wrap;word-break:break-all;overflow-wrap:anywhere;">업무</td>
              <td style="padding:2px 4px;">담당</td>
              <td style="padding:2px 4px;">일자</td>
            </tr>
            <tr>
              <td style="padding:2px 4px;">공지 작성</td>
              <td style="padding:2px 4px;">홍길동</td>
              <td style="padding:2px 4px;">2026-09-18</td>
            </tr>
            <tr>
              <td style="padding:2px 4px;">비고</td>
              <td colspan="2" style="padding:2px 4px;"><span style="font-size:8pt;font-family:Arial;color:#ff0000;"><strong>Excel 붙여넣기 검증</strong></span>&nbsp;<br>테스트</td>
            </tr>
          </tbody>
        </table>
      </body></html>
    `;

    fireEvent.paste(editor, {
      clipboardData: {
        getData: (type: string) => {
          if (type === 'text/html') return excelHtml;
          if (type === 'text/plain') {
            return '업무\t담당\t일자\n공지 작성\t홍길동\t2026-09-18\n비고\tExcel 붙여넣기 검증\t테스트';
          }
          return '';
        },
      },
      preventDefault: vi.fn(),
    });

    await waitFor(() => {
      expect(editor).toHaveTextContent('업무');
      expect(editor).toHaveTextContent('담당');
      expect(editor).toHaveTextContent('홍길동');
      expect(editor).toHaveTextContent('2026-09-18');
      expect(editor).toHaveTextContent('Excel 붙여넣기 검증');
      expect(editor).not.toHaveTextContent('border-collapse');
      const rows = editor.querySelectorAll('table tr');
      expect(rows).toHaveLength(3);
      expect(rows[2].querySelectorAll('td')).toHaveLength(2);
      expect(
        (rows[2].querySelectorAll('td')[1] as HTMLTableCellElement).colSpan,
      ).toBe(2);
      expect(rows[2].querySelectorAll('td')[1]?.textContent).toBe(
        'Excel 붙여넣기 검증\u00a0테스트',
      );
      expect(rows[0].querySelectorAll('td')[0].getAttribute('colwidth')).toBe(
        '120',
      );
      const firstCell = rows[0].querySelectorAll(
        'td',
      )[0] as HTMLTableCellElement;
      expect(firstCell.style.fontFamily).toBe('Arial');
      expect(firstCell.style.fontSize).toBe('10pt');
      expect(firstCell.querySelector('p')).toHaveStyle({ fontSize: '10pt' });
      expect(firstCell.style.whiteSpace).toBe('pre-wrap');
      expect(firstCell.style.wordBreak).toBe('break-all');
      expect(firstCell.style.overflowWrap).toBe('anywhere');
      expect(rows[2].querySelectorAll('td')[1].getAttribute('colwidth')).toBe(
        '160,140',
      );
      expect(
        Array.from(editor.querySelectorAll('table col')).map((column) =>
          column.getAttribute('style'),
        ),
      ).toEqual(['width: 120px;', 'width: 160px;', 'width: 140px;']);
      expect(editor.querySelector('table')?.getAttribute('style')).toContain(
        'width: 420px',
      );
      expect(editor.querySelector('span[style*="font-size"]')).toHaveStyle({
        fontSize: '8pt',
        fontFamily: 'Arial',
        color: 'rgb(255, 0, 0)',
      });
      expect(editor.querySelector('strong')).toHaveTextContent(
        'Excel 붙여넣기 검증',
      );
    });
  });

  it('preserves font family and size when pasting non-table rich HTML', async () => {
    render(
      React.createElement(
        ThemeProvider,
        { theme: createAppTheme('light') },
        React.createElement(NoticeComposerDialog, {
          open: true,
          isDark: false,
          onClose: () => undefined,
        }),
      ),
    );

    const editor = await screen.findByRole('textbox', { name: /본문/i });
    fireEvent.paste(editor, {
      clipboardData: {
        items: [],
        getData: (type: string) =>
          type === 'text/html'
            ? '<p style="font-family:Arial;font-size:14pt;color:#123456">일반 본문</p>'
            : '',
      },
      preventDefault: vi.fn(),
    });

    await waitFor(() => {
      const styledText = editor.querySelector('span');
      expect(styledText).toHaveTextContent('일반 본문');
      expect(styledText).toHaveStyle({
        fontFamily: 'Arial',
        fontSize: '14pt',
        color: 'rgb(18, 52, 86)',
      });
    });
  });

  it('keeps footer rows below a vertically merged section when Excel includes empty rows', async () => {
    render(
      React.createElement(
        ThemeProvider,
        { theme: createAppTheme('light') },
        React.createElement(NoticeComposerDialog, {
          open: true,
          isDark: false,
          onClose: () => undefined,
        }),
      ),
    );

    const editor = screen.getByRole('textbox', { name: /본문/i });
    const html =
      '<table><tbody><tr><td rowspan="3">개선조치 방법</td><td rowspan="3">조치 내용</td></tr><tr></tr><tr></tr><tr><td>이탈일자</td><td>이탈사항</td></tr></tbody></table>';

    fireEvent.paste(editor, {
      clipboardData: {
        getData: (type: string) => (type === 'text/html' ? html : ''),
      },
      preventDefault: vi.fn(),
    });

    await waitFor(() => {
      const rows = editor.querySelectorAll('table tr');
      expect(rows).toHaveLength(4);
      expect(rows[3].querySelector('td')?.textContent).toBe('이탈일자');
      expect(rows[3].querySelectorAll('td')).toHaveLength(2);
    });
  });
});

import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { useCallback, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { describe, expect, it, vi } from 'vitest';
import {
  RichTextEditor,
  RichTextEditorToolbar,
} from '../src/shared/components/rich-text-editor/RichTextEditor';

function RichTextEditorWithToolbar({
  content = '<p></p>',
  onEditorReady,
}: {
  content?: string;
  onEditorReady?: (editor: Editor | null) => void;
}) {
  const [editor, setEditor] = useState<Editor | null>(null);
  const handleEditorReady = useCallback(
    (instance: Editor | null) => {
      setEditor(instance);
      onEditorReady?.(instance);
    },
    [onEditorReady],
  );
  return (
    <ThemeProvider theme={createTheme()}>
      <>
        <RichTextEditor
          ariaLabel="본문"
          content={content}
          onEditorReady={handleEditorReady}
        />
        <RichTextEditorToolbar editor={editor} />
      </>
    </ThemeProvider>
  );
}

describe('RichTextEditor', () => {
  it('renders initial content and exposes its editor instance to the owner', async () => {
    let editor: Editor | null = null;
    render(
      <ThemeProvider theme={createTheme()}>
        <RichTextEditor
          content="<p>공통 편집기 본문</p>"
          ariaLabel="본문"
          onEditorReady={(instance) => {
            editor = instance;
          }}
        />
      </ThemeProvider>,
    );

    expect(
      await screen.findByRole('textbox', { name: '본문' }),
    ).toHaveTextContent('공통 편집기 본문');
    await waitFor(() => expect(editor).not.toBeNull());
  });

  it('bounds the ProseMirror viewport inside a shrinkable flex content wrapper', async () => {
    render(
      <ThemeProvider theme={createTheme()}>
        <RichTextEditor ariaLabel="본문" className="scroll-test-editor" />
      </ThemeProvider>,
    );
    const editor = await screen.findByRole('textbox', { name: '본문' });
    const contentWrapper = editor.parentElement;

    expect(contentWrapper).toHaveClass('rich-text-editor-content');
    expect(getComputedStyle(contentWrapper as HTMLElement).display).toBe(
      'flex',
    );
    expect(getComputedStyle(contentWrapper as HTMLElement).minHeight).toBe(
      '0px',
    );
    expect(getComputedStyle(editor).overflowY).toBe('auto');
  });

  it('lets the parent container own vertical scrolling when requested', async () => {
    render(
      <ThemeProvider theme={createTheme()}>
        <RichTextEditor
          ariaLabel="본문"
          className="scroll-test-editor"
          scrollMode="container"
        />
      </ThemeProvider>,
    );
    const editor = await screen.findByRole('textbox', { name: '본문' });
    const root = editor.closest('.scroll-test-editor');
    const contentWrapper = editor.parentElement;

    expect(root).not.toBeNull();
    expect(contentWrapper).toHaveClass('rich-text-editor-content');
    if (root === null || contentWrapper === null) {
      throw new Error('Container-scroll editor elements were not rendered.');
    }
    expect(getComputedStyle(root).height).toBe('auto');
    expect(getComputedStyle(root).overflowY).toBe('visible');
    expect(getComputedStyle(contentWrapper).overflowY).toBe('visible');
    expect(getComputedStyle(editor).overflowY).toBe('visible');
    expect(getComputedStyle(editor).maxHeight).toBe('none');
  });

  it('uploads pasted images through the caller adapter and updates that image node', async () => {
    const uploadImage = vi.fn().mockResolvedValue({
      src: '/images/pasted.png',
      alt: 'pasted.png',
      uploadToken: 'upload-1',
      fileSize: 4,
      mimeType: 'image/png',
    });
    render(
      <ThemeProvider theme={createTheme()}>
        <RichTextEditor ariaLabel="본문" uploadImage={uploadImage} />
      </ThemeProvider>,
    );
    const editor = await screen.findByRole('textbox', { name: '본문' });
    const file = new File(['data'], 'pasted.png', { type: 'image/png' });

    fireEvent.paste(editor, {
      clipboardData: {
        items: [{ kind: 'file', type: 'image/png', getAsFile: () => file }],
        getData: () => '',
      },
    });

    await waitFor(() => expect(uploadImage).toHaveBeenCalledWith(file));
    await waitFor(() =>
      expect(editor.querySelector('img')).toHaveAttribute(
        'src',
        '/images/pasted.png',
      ),
    );
    expect(editor.querySelector('img')).toHaveAttribute(
      'data-upload-token',
      'upload-1',
    );
  });

  it('removes only the failed image placeholder and clears upload progress', async () => {
    const uploadImage = vi.fn().mockRejectedValue(new Error('upload failed'));
    const onImageUploadError = vi.fn();
    const onUploadingChange = vi.fn();
    render(
      <ThemeProvider theme={createTheme()}>
        <RichTextEditor
          content="<p>본문 유지</p>"
          ariaLabel="본문"
          uploadImage={uploadImage}
          onImageUploadError={onImageUploadError}
          onUploadingChange={onUploadingChange}
        />
      </ThemeProvider>,
    );
    const editor = await screen.findByRole('textbox', { name: '본문' });
    const file = new File(['data'], 'failed.png', { type: 'image/png' });

    fireEvent.paste(editor, {
      clipboardData: {
        items: [{ kind: 'file', type: 'image/png', getAsFile: () => file }],
        getData: () => '',
      },
    });

    await waitFor(() => expect(uploadImage).toHaveBeenCalledWith(file));
    await waitFor(() => expect(editor.querySelector('img')).toBeNull());
    expect(editor).toHaveTextContent('본문 유지');
    expect(onImageUploadError).toHaveBeenCalledWith(
      '본문 이미지 업로드에 실패했습니다.',
    );
    expect(onUploadingChange).toHaveBeenNthCalledWith(1, 1);
    expect(onUploadingChange).toHaveBeenLastCalledWith(0);
  });

  it('shows accessible resize handles when an image is selected', async () => {
    let editorInstance: Editor | null = null;
    render(
      <ThemeProvider theme={createTheme()}>
        <RichTextEditor
          content='<p><img src="/images/saved.png" alt="저장된 이미지" /></p>'
          ariaLabel="본문"
          onEditorReady={(editor) => {
            editorInstance = editor;
          }}
        />
      </ThemeProvider>,
    );
    await screen.findByRole('img', { name: '저장된 이미지' });
    await waitFor(() => expect(editorInstance).not.toBeNull());
    let imagePosition = -1;
    editorInstance?.state.doc.descendants((node, position) => {
      if (node.type.name === 'image') imagePosition = position;
    });
    editorInstance?.commands.setNodeSelection(imagePosition);

    expect(await screen.findByLabelText('이미지 크기 조절 영역')).toBeVisible();
    expect(screen.getAllByLabelText(/방향 이미지 크기 조절/)).toHaveLength(8);
  });

  it('renders the supplied toolbar command list without font pickers', async () => {
    render(<RichTextEditorWithToolbar />);

    fireEvent.click(await screen.findByRole('button', { name: '툴바 열기' }));

    expect(screen.queryByRole('combobox', { name: '글꼴' })).toBeNull();
    expect(screen.queryByRole('combobox', { name: '글자 크기' })).toBeNull();
    expect(screen.getByRole('combobox', { name: '문단' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '글자 색상' }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText('글자 색상 선택')).toBeNull();
    for (const label of [
      '굵게',
      '기울임',
      '밑줄',
      '취소선',
      '표 삽입',
      '링크',
      '번호 목록',
      '글머리 기호',
    ]) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    }
    expect(screen.queryByRole('button', { name: '인용' })).toBeNull();
    expect(screen.queryByRole('button', { name: '되돌리기' })).toBeNull();
    expect(screen.queryByRole('button', { name: '다시 실행' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: '글자 색상' }));
    expect(
      screen.getByRole('button', { name: '기본 색상' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '색상 #ef4444' }),
    ).toBeInTheDocument();
    expect(
      screen
        .getByTestId('rich-text-editor-color-swatches')
        .querySelectorAll('button'),
    ).toHaveLength(12);
  });

  it('removes toolbar icon borders and highlights active formatting after a transaction', async () => {
    let editorInstance: Editor | null = null;
    render(
      <RichTextEditorWithToolbar
        content="<p>강조 텍스트</p>"
        onEditorReady={(editor) => {
          editorInstance = editor;
        }}
      />,
    );
    await screen.findByRole('textbox', { name: '본문' });
    await waitFor(() => expect(editorInstance).not.toBeNull());
    act(() => editorInstance?.commands.setTextSelection({ from: 1, to: 7 }));
    fireEvent.click(screen.getByRole('button', { name: '툴바 열기' }));
    const toolbarTrigger = screen.getByRole('button', { name: '툴바 열기' });
    expect(getComputedStyle(toolbarTrigger).borderTopWidth).toBe('0px');
    const boldButton = screen.getByRole('button', { name: '굵게' });
    const underlineButton = screen.getByRole('button', { name: '밑줄' });

    expect(getComputedStyle(boldButton).borderTopWidth).toBe('0px');
    expect(getComputedStyle(underlineButton).borderTopWidth).toBe('0px');
    fireEvent.click(boldButton);

    await waitFor(() => {
      expect(boldButton).toHaveAttribute('aria-pressed', 'true');
      expect(getComputedStyle(boldButton).backgroundColor).toBe(
        createTheme().palette.action.selected,
      );
    });

    fireEvent.click(underlineButton);
    await waitFor(() => {
      expect(underlineButton).toHaveAttribute('aria-pressed', 'true');
      expect(getComputedStyle(underlineButton).backgroundColor).toBe(
        createTheme().palette.action.selected,
      );
    });
  });

  it('shows body, two heading levels, and subtitle with their applied typography', async () => {
    render(<RichTextEditorWithToolbar content="<p>본문</p>" />);
    const editor = await screen.findByRole('textbox', { name: '본문' });
    const paragraph = editor.querySelector('p');
    expect(paragraph).toHaveTextContent('본문');
    expect(getComputedStyle(paragraph as HTMLElement).fontSize).toBe('16px');
    expect(getComputedStyle(paragraph as HTMLElement).fontWeight).toBe('400');

    fireEvent.click(await screen.findByRole('button', { name: '툴바 열기' }));
    fireEvent.mouseDown(screen.getByRole('combobox', { name: '문단' }));
    expect(
      await screen.findByRole('option', { name: '본문' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '제목 1' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '제목 2' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('option', { name: '부제목' }));

    const subtitle = editor.querySelector('h3');
    expect(subtitle).toHaveTextContent('본문');
    expect(getComputedStyle(subtitle as HTMLElement).fontSize).toBe('18px');
    expect(getComputedStyle(subtitle as HTMLElement).fontWeight).toBe('600');
  });

  it('renders heading levels with the specified size and weight hierarchy', async () => {
    render(
      <ThemeProvider theme={createTheme()}>
        <RichTextEditor
          ariaLabel="본문"
          content="<h1>제목 1</h1><h2>제목 2</h2><h3>부제목</h3><p>본문</p>"
        />
      </ThemeProvider>,
    );
    const editor = await screen.findByRole('textbox', { name: '본문' });
    const styles = [
      ['h1', '24px', '700'],
      ['h2', '20px', '700'],
      ['h3', '18px', '600'],
      ['p', '16px', '400'],
    ] as const;

    for (const [selector, fontSize, fontWeight] of styles) {
      const block = editor.querySelector(selector) as HTMLElement;
      expect(getComputedStyle(block).fontSize).toBe(fontSize);
      expect(getComputedStyle(block).fontWeight).toBe(fontWeight);
    }
  });

  it('inserts a blank three-by-three table from the toolbar', async () => {
    render(<RichTextEditorWithToolbar />);
    fireEvent.click(await screen.findByRole('button', { name: '툴바 열기' }));
    fireEvent.click(screen.getByRole('button', { name: '표 삽입' }));
    const editor = screen.getByRole('textbox', { name: '본문' });

    await waitFor(() =>
      expect(editor.querySelectorAll('table tr')).toHaveLength(3),
    );
    expect(editor.querySelectorAll('table td')).toHaveLength(9);
  });

  it('applies underline to the current selection', async () => {
    let editorInstance: Editor | null = null;
    render(
      <RichTextEditorWithToolbar
        content="<p>본문</p>"
        onEditorReady={(editor) => {
          editorInstance = editor;
        }}
      />,
    );
    await screen.findByRole('textbox', { name: '본문' });
    await waitFor(() => expect(editorInstance).not.toBeNull());
    act(() => editorInstance?.commands.setTextSelection({ from: 1, to: 3 }));
    fireEvent.click(screen.getByRole('button', { name: '툴바 열기' }));
    fireEvent.click(screen.getByRole('button', { name: '밑줄' }));

    expect(
      screen.getByRole('textbox', { name: '본문' }).querySelector('u'),
    ).toHaveTextContent('본문');
  });

  it('applies the selected swatch color to the current text selection', async () => {
    let editorInstance: Editor | null = null;
    render(
      <RichTextEditorWithToolbar
        content="<p>본문</p>"
        onEditorReady={(editor) => {
          editorInstance = editor;
        }}
      />,
    );
    await screen.findByRole('textbox', { name: '본문' });
    await waitFor(() => expect(editorInstance).not.toBeNull());
    act(() => editorInstance?.commands.setTextSelection({ from: 1, to: 3 }));
    fireEvent.click(screen.getByRole('button', { name: '툴바 열기' }));
    fireEvent.click(screen.getByRole('button', { name: '글자 색상' }));
    fireEvent.click(screen.getByRole('button', { name: '색상 #ef4444' }));

    expect(editorInstance?.isActive('textStyle', { color: '#ef4444' })).toBe(
      true,
    );
  });

  it('keeps six deduplicated recent colors in most-recent-first order', async () => {
    render(<RichTextEditorWithToolbar />);
    fireEvent.click(await screen.findByRole('button', { name: '툴바 열기' }));
    const selectedColors = [
      '#ef4444',
      '#f97316',
      '#eab308',
      '#84cc16',
      '#14b8a6',
      '#3b82f6',
      '#6366f1',
      '#eab308',
    ];

    for (const color of selectedColors) {
      fireEvent.click(screen.getByRole('button', { name: '글자 색상' }));
      fireEvent.click(screen.getByRole('button', { name: `색상 ${color}` }));
    }

    fireEvent.click(screen.getByRole('button', { name: '글자 색상' }));
    const recentColors = screen.getByTestId('rich-text-editor-recent-colors');
    const recentButtons = recentColors.querySelectorAll('button');
    expect(recentButtons).toHaveLength(6);
    expect(recentButtons[0]).toHaveAttribute('aria-label', '최근 색상 #eab308');
    expect(
      screen.getAllByRole('button', { name: '최근 색상 #eab308' }),
    ).toHaveLength(1);
    expect(
      screen.queryByRole('button', { name: '최근 색상 #ef4444' }),
    ).toBeNull();
  });

  it('applies a validated link to the current selection', async () => {
    let editorInstance: Editor | null = null;
    render(
      <RichTextEditorWithToolbar
        content="<p>링크 대상</p>"
        onEditorReady={(editor) => {
          editorInstance = editor;
        }}
      />,
    );
    await screen.findByRole('textbox', { name: '본문' });
    await waitFor(() => expect(editorInstance).not.toBeNull());
    act(() => editorInstance?.commands.setTextSelection({ from: 1, to: 5 }));
    fireEvent.click(screen.getByRole('button', { name: '툴바 열기' }));
    fireEvent.click(screen.getByRole('button', { name: '링크' }));
    const displayText = screen.getByRole('textbox', { name: '표시 텍스트' });
    expect(displayText).not.toHaveValue('');
    fireEvent.change(displayText, { target: { value: '도움말 링크' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'URL' }), {
      target: { value: 'https://example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: '확인' }));

    expect(
      screen.getByRole('textbox', { name: '본문' }).querySelector('a'),
    ).toHaveAttribute('href', 'https://example.com');
    expect(
      screen.getByRole('link', { name: '도움말 링크' }),
    ).toBeInTheDocument();
  });

  it('removes an existing link from the current selection', async () => {
    let editorInstance: Editor | null = null;
    render(
      <RichTextEditorWithToolbar
        content='<p><a href="https://example.com">링크</a></p>'
        onEditorReady={(editor) => {
          editorInstance = editor;
        }}
      />,
    );
    await screen.findByRole('link', { name: '링크' });
    await waitFor(() => expect(editorInstance).not.toBeNull());
    act(() => editorInstance?.commands.setTextSelection({ from: 1, to: 3 }));
    fireEvent.click(screen.getByRole('button', { name: '툴바 열기' }));
    fireEvent.click(screen.getByRole('button', { name: '링크' }));
    fireEvent.click(await screen.findByRole('button', { name: '링크 제거' }));

    expect(
      screen.getByRole('textbox', { name: '본문' }).querySelector('a'),
    ).toBeNull();
    expect(screen.getByRole('textbox', { name: '본문' })).toHaveTextContent(
      '링크',
    );
  });

  it('maps vertical wheel input to horizontal toolbar scrolling when overflowing', async () => {
    render(<RichTextEditorWithToolbar />);
    fireEvent.click(await screen.findByRole('button', { name: '툴바 열기' }));
    const toolbar = screen.getByTestId('rich-text-editor-toolbar');
    Object.defineProperties(toolbar, {
      clientWidth: { configurable: true, value: 200 },
      scrollWidth: { configurable: true, value: 500 },
      scrollLeft: { configurable: true, writable: true, value: 0 },
    });

    const wheelEvent = new WheelEvent('wheel', {
      deltaY: 80,
      deltaX: 0,
      bubbles: true,
      cancelable: true,
    });
    toolbar.dispatchEvent(wheelEvent);

    expect(toolbar.scrollLeft).toBe(80);
    expect(wheelEvent.defaultPrevented).toBe(true);
  });

  it('inserts the entered display text when creating a link without a selection', async () => {
    render(<RichTextEditorWithToolbar />);
    fireEvent.click(await screen.findByRole('button', { name: '툴바 열기' }));
    fireEvent.click(screen.getByRole('button', { name: '링크' }));
    fireEvent.change(screen.getByRole('textbox', { name: '표시 텍스트' }), {
      target: { value: '도움말' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'URL' }), {
      target: { value: 'https://example.com/help' },
    });
    fireEvent.click(screen.getByRole('button', { name: '확인' }));

    expect(
      screen.getByRole('textbox', { name: '본문' }).querySelector('a'),
    ).toHaveAttribute('href', 'https://example.com/help');
    expect(screen.getByRole('link', { name: '도움말' })).toBeInTheDocument();
  });

  it('changes paragraph blocks from the paragraph selector', async () => {
    render(<RichTextEditorWithToolbar content="<p>본문</p>" />);
    fireEvent.click(await screen.findByRole('button', { name: '툴바 열기' }));
    fireEvent.mouseDown(screen.getByRole('combobox', { name: '문단' }));
    fireEvent.click(await screen.findByRole('option', { name: '제목 1' }));

    expect(
      screen.getByRole('textbox', { name: '본문' }).querySelector('h1'),
    ).not.toBeNull();
  });

  it('inserts a three-by-three table from the table toolbar button', async () => {
    render(<RichTextEditorWithToolbar />);
    fireEvent.click(await screen.findByRole('button', { name: '툴바 열기' }));
    fireEvent.click(screen.getByRole('button', { name: '표 삽입' }));

    const editor = screen.getByRole('textbox', { name: '본문' });
    await waitFor(() =>
      expect(editor.querySelectorAll('table tr')).toHaveLength(3),
    );
    expect(editor.querySelectorAll('table td')).toHaveLength(9);
  });

  it('applies an allowed link URL to the current text selection', async () => {
    let editorInstance: Editor | null = null;
    render(
      <RichTextEditorWithToolbar
        content="<p>링크 대상</p>"
        onEditorReady={(editor) => {
          editorInstance = editor;
        }}
      />,
    );
    await screen.findByRole('textbox', { name: '본문' });
    await waitFor(() => expect(editorInstance).not.toBeNull());
    act(() => editorInstance?.commands.setTextSelection({ from: 1, to: 5 }));
    fireEvent.click(screen.getByRole('button', { name: '툴바 열기' }));
    fireEvent.click(screen.getByRole('button', { name: '링크' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'URL' }), {
      target: { value: 'https://example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: '확인' }));

    expect(
      screen.getByRole('textbox', { name: '본문' }).querySelector('a'),
    ).toHaveAttribute('href', 'https://example.com');
  });
});

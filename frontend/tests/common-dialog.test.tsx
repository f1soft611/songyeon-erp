import { fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { describe, expect, it, vi } from 'vitest';
import { CommonDialog } from '../src/shared/components/CommonDialog';
import { createAppTheme } from '../src/theme/theme';

const matchMobile = (matches: boolean) => {
  const originalMatchMedia = window.matchMedia;
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: (query: string) => ({
      matches: matches && query.includes('max-width:599.95px'),
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });

  return () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: originalMatchMedia,
    });
  };
};

describe('CommonDialog', () => {
  it('keeps unsaved body state when showing and removing a paper-scoped overlay', () => {
    const onClose = vi.fn();
    const body = <input aria-label="작성 내용" defaultValue="" />;
    const { rerender } = render(<CommonDialog open title="작성창" onClose={onClose}>{body}</CommonDialog>);
    const input = screen.getByRole('textbox', { name: '작성 내용' });
    fireEvent.change(input, { target: { value: '저장하지 않은 본문' } });
    rerender(<CommonDialog open title="작성창" onClose={onClose}
      overlay={<section aria-label="링크 상세">상세</section>}>{body}</CommonDialog>);
    expect(screen.getByRole('region', { name: '링크 상세' }).parentElement)
      .toBe(screen.getByRole('dialog', { name: '작성창' }));
    rerender(<CommonDialog open title="작성창" onClose={onClose}>{body}</CommonDialog>);
    expect(screen.getByRole('textbox', { name: '작성 내용' })).toBe(input);
    expect(input).toHaveValue('저장하지 않은 본문');
  });

  it('supports a separate title badge and rich description without changing the dialog name', () => {
    render(<CommonDialog open title="공지 모달" onClose={vi.fn()}
      titleAside={<span role="status">1 / 1</span>}
      description={<span>작성자 <strong>검증 작성자</strong></span>}>
      <p>본문</p>
    </CommonDialog>);
    const dialog = screen.getByRole('dialog', { name: '공지 모달' });
    expect(dialog).toHaveAccessibleDescription('작성자 검증 작성자');
    expect(screen.getByRole('status').parentElement).toBe(
      screen.getByRole('heading', { name: '공지 모달' }).parentElement);
  });

  it('uses the dark page palette with a distinct slate shell', () => {
    render(
      <ThemeProvider theme={createAppTheme('dark')}>
        <CommonDialog
          open
          title="다크 모달"
          onClose={vi.fn()}
          actions={<button type="button">확인</button>}
        >
          <p>본문</p>
        </CommonDialog>
      </ThemeProvider>,
    );

    const dialog = screen.getByRole('dialog');
    const content = dialog.querySelector('.MuiDialogContent-root');
    const header = dialog.querySelector('.MuiDialogTitle-root')?.parentElement
      ?.parentElement;
    const footer = dialog.querySelector('.MuiDialogActions-root');

    expect(getComputedStyle(dialog).backgroundColor).toBe('rgb(30, 41, 59)');
    expect(getComputedStyle(header as Element).backgroundColor).toBe(
      'rgb(30, 41, 59)',
    );
    expect(getComputedStyle(content as Element).backgroundColor).toBe(
      'rgb(30, 41, 59)',
    );
    expect(getComputedStyle(footer as Element).backgroundColor).toBe(
      'rgb(30, 41, 59)',
    );
  });

  it('uses white surfaces throughout the dialog in light mode', () => {
    render(
      <ThemeProvider theme={createAppTheme('light')}>
        <CommonDialog
          open
          title="라이트 모달"
          onClose={vi.fn()}
          actions={<button type="button">확인</button>}
        >
          <p>본문</p>
        </CommonDialog>
      </ThemeProvider>,
    );

    const dialog = screen.getByRole('dialog');
    const header = dialog.querySelector('.MuiDialogTitle-root')?.parentElement
      ?.parentElement;
    const content = dialog.querySelector('.MuiDialogContent-root');
    const footer = dialog.querySelector('.MuiDialogActions-root');

    expect(getComputedStyle(dialog).backgroundColor).toBe('rgb(255, 255, 255)');
    expect(getComputedStyle(header as Element).backgroundColor).toBe(
      'rgb(255, 255, 255)',
    );
    expect(getComputedStyle(content as Element).backgroundColor).toBe(
      'rgb(255, 255, 255)',
    );
    expect(getComputedStyle(footer as Element).backgroundColor).toBe(
      'rgb(255, 255, 255)',
    );
  });

  it('uses an explicit surface override for every dialog region', () => {
    render(
      <ThemeProvider theme={createAppTheme('dark')}>
        <CommonDialog
          open
          title="사용자 지정 표면"
          onClose={vi.fn()}
          surfaceBackgroundColor="#334155"
          actions={<button type="button">확인</button>}
        >
          <p>본문</p>
        </CommonDialog>
      </ThemeProvider>,
    );

    const dialog = screen.getByRole('dialog');
    const header = dialog.querySelector('.MuiDialogTitle-root')?.parentElement
      ?.parentElement;
    const content = dialog.querySelector('.MuiDialogContent-root');
    const footer = dialog.querySelector('.MuiDialogActions-root');

    [dialog, header, content, footer].forEach((region) => {
      expect(getComputedStyle(region as Element).backgroundColor).toBe(
        'rgb(51, 65, 85)',
      );
    });
  });

  it('renders an accessible title, optional description, and close action', () => {
    const onClose = vi.fn();
    render(
      <CommonDialog
        open
        title="공통 모달"
        description="모달 설명"
        onClose={onClose}
      >
        <p>본문</p>
      </CommonDialog>,
    );

    const dialog = screen.getByRole('dialog', { name: '공통 모달' });
    const title = screen.getByRole('heading', { name: '공통 모달' });
    const description = screen.getByText('모달 설명');

    expect(dialog).toHaveAttribute('aria-labelledby', title.id);
    expect(dialog).toHaveAttribute('aria-describedby', description.id);
    fireEvent.click(screen.getByRole('button', { name: '닫기' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('keeps the body scrollable and places optional footer content before actions', () => {
    render(
      <CommonDialog
        open
        title="툴바 모달"
        onClose={vi.fn()}
        footerStart={<button type="button">보조 툴바</button>}
        actions={<button type="button">저장</button>}
      >
        <p>긴 본문</p>
      </CommonDialog>,
    );

    const dialog = screen.getByRole('dialog');
    const content = dialog.querySelector('.MuiDialogContent-root');
    const toolbar = screen.getByRole('button', { name: '보조 툴바' });
    const save = screen.getByRole('button', { name: '저장' });
    const footer = toolbar.parentElement?.parentElement;
    const divider = dialog.querySelector('.MuiDivider-root');

    expect(content).toHaveStyle({ overflowY: 'auto', minHeight: '0px' });
    expect(footer).toHaveStyle({ justifyContent: 'space-between' });
    expect(divider).toBeInTheDocument();
    expect(footer?.previousElementSibling).toBe(divider);
    expect(getComputedStyle(divider as Element).borderBottomWidth).toBe('thin');
    expect(getComputedStyle(divider as Element).borderBottomStyle).toBe(
      'solid',
    );
    expect(getComputedStyle(footer as Element).borderTopStyle).toBe('none');
    expect(
      toolbar.compareDocumentPosition(save) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('keeps actions aligned when the optional footer start is omitted', () => {
    render(
      <CommonDialog
        open
        title="액션 모달"
        onClose={vi.fn()}
        actions={<button type="button">확인</button>}
      >
        <p>본문</p>
      </CommonDialog>,
    );

    const dialog = screen.getByRole('dialog');
    const footer = screen.getByRole('button', { name: '확인' }).parentElement
      ?.parentElement;

    expect(dialog).toBeInTheDocument();
    expect(footer).toHaveStyle({ justifyContent: 'flex-end' });
  });

  it('uses the selected width and body height mode', () => {
    const { rerender } = render(
      <CommonDialog open title="중간 크기" onClose={vi.fn()}>
        <p>본문</p>
      </CommonDialog>,
    );

    expect(screen.getByRole('dialog')).toHaveStyle({
      maxWidth: '820px',
      maxHeight: '85vh',
    });

    rerender(
      <CommonDialog open title="작은 모달" onClose={vi.fn()} size="xs">
        <p>본문</p>
      </CommonDialog>,
    );

    expect(screen.getByRole('dialog')).toHaveStyle({
      maxWidth: '480px',
    });

    rerender(
      <CommonDialog
        open
        title="큰 채움 모달"
        onClose={vi.fn()}
        size="lg"
        bodyMode="fill"
      >
        <p>본문</p>
      </CommonDialog>,
    );

    expect(screen.getByRole('dialog')).toHaveStyle({
      maxWidth: '990px',
      height: '90vh',
      maxHeight: '880px',
    });
  });

  it('allows a modal-specific paper height without changing fill mode limits', () => {
    render(
      <CommonDialog
        open
        title="분류 설정"
        onClose={vi.fn()}
        size="lg"
        bodyMode="fill"
        paperHeight="60vh"
      >
        <p>본문</p>
      </CommonDialog>,
    );

    expect(screen.getByRole('dialog')).toHaveStyle({
      height: '60vh',
      maxHeight: '880px',
    });
  });

  it('uses full-screen presentation on mobile only when requested', () => {
    const restoreMatchMedia = matchMobile(true);

    try {
      const { rerender } = render(
        <CommonDialog
          open
          title="모바일 폼"
          onClose={vi.fn()}
          fullScreenOnMobile
        >
          <p>본문</p>
        </CommonDialog>,
      );

      expect(screen.getByRole('dialog')).toHaveClass(
        'MuiDialog-paperFullScreen',
      );
      rerender(
        <CommonDialog open title="폼" onClose={vi.fn()}>
          <p>본문</p>
        </CommonDialog>,
      );
      expect(screen.getByRole('dialog')).not.toHaveClass(
        'MuiDialog-paperFullScreen',
      );
    } finally {
      restoreMatchMedia();
    }
  });
});

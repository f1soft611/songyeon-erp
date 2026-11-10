import { act, fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FileView } from '../src/shared/components/view-mode/FileView';
import { ViewModeToggle } from '../src/shared/components/view-mode/ViewModeToggle';
import { createAppTheme } from '../src/theme/theme';

afterEach(() => vi.unstubAllGlobals());

describe('shared file view', () => {
  it('only offers file mode when enabled', () => {
    const onChange = vi.fn();
    const { rerender } = render(<ViewModeToggle mode="list" onChange={onChange} />);
    expect(screen.queryByRole('button', { name: '파일형 보기' })).not.toBeInTheDocument();
    rerender(<ViewModeToggle mode="list" onChange={onChange} enableFileView />);
    fireEvent.click(screen.getByRole('button', { name: '파일형 보기' }));
    expect(onChange).toHaveBeenCalledWith('file');
  });

  it('shows file metadata and separate download and source actions', () => {
    const onDownload = vi.fn();
    const onOpenSource = vi.fn();
    const item = {
      id: 1, name: 'sample.pdf', ownerLabel: 'Sample User',
      dateLabel: '2026-10-20 09:00', sizeLabel: '1 KB', description: '원문 · 댓글 첨부',
    };
    render(<FileView items={[item]} hasNext={false} isLoading={false} error=""
      onLoadMore={vi.fn()} onRetry={vi.fn()} onDownload={onDownload} onOpenSource={onOpenSource} />);
    expect(screen.getByText('Sample User')).toBeInTheDocument();
    expect(screen.getByText('1 KB')).toBeInTheDocument();
    expect(screen.queryByText('모든 파일을 불러왔습니다.')).not.toBeInTheDocument();
    expect(screen.getByLabelText('파일형 첨부파일 목록')).toHaveStyle({
      backgroundColor: 'rgb(255, 255, 255)',
    });
    fireEvent.click(screen.getByRole('button', { name: 'sample.pdf 다운로드' }));
    expect(onDownload).toHaveBeenCalledWith(item);
    fireEvent.click(screen.getByRole('button', { name: 'sample.pdf 원문 보기' }));
    expect(onOpenSource).toHaveBeenCalledWith(item);
  });

  it('observes the supplied scroll root and suppresses loading, errors and final pages', () => {
    let intersect: (entries: { isIntersecting: boolean }[]) => void = () => undefined;
    const disconnect = vi.fn();
    const observe = vi.fn();
    const observer = vi.fn(function (
      callback: typeof intersect,
    ) {
      intersect = callback;
      return { observe, disconnect };
    });
    vi.stubGlobal('IntersectionObserver', observer);
    const root = document.createElement('div');
    const onLoadMore = vi.fn();
    const props = { items: [], hasNext: true, isLoading: false, error: '',
      onLoadMore, onRetry: vi.fn(), onDownload: vi.fn(), scrollRoot: root };
    const { rerender } = render(<FileView {...props} />);
    expect(observer).toHaveBeenCalledWith(expect.any(Function),
      expect.objectContaining({ root }));
    act(() => intersect([{ isIntersecting: true }]));
    expect(onLoadMore).toHaveBeenCalledTimes(1);
    rerender(<FileView {...props} isLoading />);
    expect(disconnect).toHaveBeenCalled();
    rerender(<FileView {...props} hasNext={false} />);
    expect(screen.queryByTestId('file-view-sentinel')).not.toBeInTheDocument();
    rerender(<FileView {...props} error="조회 실패" />);
    expect(screen.getByRole('alert')).toHaveTextContent('조회 실패');
    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));
    expect(props.onRetry).toHaveBeenCalledOnce();
  });

  it('shows empty, loading and end states', () => {
    const props = { items: [], hasNext: false, isLoading: false, error: '',
      onLoadMore: vi.fn(), onRetry: vi.fn(), onDownload: vi.fn() };
    const { rerender } = render(<FileView {...props} />);
    expect(screen.getByText('첨부파일이 없습니다.')).toBeInTheDocument();
    rerender(<FileView {...props} isLoading />);
    expect(screen.getByRole('status', { name: '파일 불러오는 중' })).toBeInTheDocument();
    expect(screen.getByTestId('file-view-skeleton')
      .querySelectorAll('[data-testid="file-view-skeleton-row"]')).toHaveLength(8);
    expect(screen.queryByText('첨부파일이 없습니다.')).not.toBeInTheDocument();
  });

  it('keeps loaded file rows while showing the incremental loading indicator', () => {
    const item = {
      id: 1, name: 'sample.pdf', ownerLabel: 'Sample User',
      dateLabel: '2026-10-20 09:00', sizeLabel: '1 KB',
    };
    render(<FileView items={[item]} hasNext isLoading error=""
      onLoadMore={vi.fn()} onRetry={vi.fn()} onDownload={vi.fn()} />);

    expect(screen.getByTestId('file-view-row')).toHaveTextContent('sample.pdf');
    expect(screen.getByRole('status', { name: '파일 페이지 불러오는 중' })).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.queryByText('파일 불러오는 중')).not.toBeInTheDocument();
    expect(screen.queryByTestId('file-view-skeleton')).not.toBeInTheDocument();
  });

  it('keeps the list surface white in light mode', () => {
    render(
      <ThemeProvider theme={createAppTheme('light')}>
        <FileView items={[]} hasNext={false} isLoading={false} error=""
          onLoadMore={vi.fn()} onRetry={vi.fn()} onDownload={vi.fn()} />
      </ThemeProvider>,
    );

    expect(screen.getByLabelText('파일형 첨부파일 목록')).toHaveStyle({
      backgroundColor: 'rgb(255, 255, 255)',
    });
  });

  it('uses readable theme surfaces and spinner colors in dark mode', () => {
    render(
      <ThemeProvider theme={createAppTheme('dark')}>
        <FileView items={[{
          id: 1, name: 'sample.pdf', ownerLabel: 'Sample User',
          dateLabel: '2026-10-20 09:00', sizeLabel: '1 KB',
        }]} hasNext isLoading error="" onLoadMore={vi.fn()} onRetry={vi.fn()}
          onDownload={vi.fn()} />
      </ThemeProvider>,
    );

    expect(screen.getByLabelText('파일형 첨부파일 목록')).toHaveStyle({
      backgroundColor: 'rgb(17, 24, 39)',
    });
    expect(screen.getByRole('progressbar')).toHaveStyle({
      color: 'rgb(96, 165, 250)',
    });
    expect(screen.getByTestId('file-view-row')).toHaveTextContent('Sample User');
  });
});

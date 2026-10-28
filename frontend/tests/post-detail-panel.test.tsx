import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PostDetailPanel } from '../src/shared/components/feed/PostDetailPanel';
import { PageAreaOverlay } from '../src/shared/components/view-mode/PageAreaOverlay';

describe('PostDetailPanel', () => {
  it('renders reusable panel chrome and closes through the supplied action', () => {
    const onClose = vi.fn();

    render(
      <PostDetailPanel title="공지 상세" onClose={onClose}>
        <div>게시글 본문</div>
      </PostDetailPanel>,
    );

    expect(
      screen.getByRole('heading', { name: '공지 상세' }),
    ).toBeInTheDocument();
    expect(screen.getByText('게시글 본문')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '상세 닫기' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('exposes a full-height independently scrollable detail surface', () => {
    render(
      <PostDetailPanel onClose={() => undefined}>
        <div>긴 게시글 본문</div>
      </PostDetailPanel>,
    );

    expect(screen.getByTestId('post-detail-panel')).toHaveAttribute(
      'data-layout',
      'full-height-overlay',
    );
    expect(screen.getByTestId('post-detail-panel-content')).toHaveAttribute(
      'data-scroll-container',
      'true',
    );
  });

  it('keeps the overlay inside the page area and closes on Escape or backdrop click', () => {
    const onClose = vi.fn();

    render(
      <div data-testid="page-content-area">
        <PageAreaOverlay onClose={onClose}>
          <PostDetailPanel onClose={onClose}>
            <div>페이지 상세</div>
          </PostDetailPanel>
        </PageAreaOverlay>
      </div>,
    );

    const host = screen.getByTestId('page-content-area');
    const overlay = screen.getByTestId('page-area-overlay');
    expect(host).toContainElement(overlay);
    expect(overlay).toHaveAttribute('data-overlay-scope', 'page-content');

    fireEvent.keyDown(overlay, { key: 'Escape' });
    fireEvent.click(screen.getByTestId('page-area-overlay-backdrop'));

    expect(onClose).toHaveBeenCalledTimes(2);
  });
});

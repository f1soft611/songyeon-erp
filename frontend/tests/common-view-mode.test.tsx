import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FeedView } from '../src/shared/components/view-mode/FeedView';
import { FeedViewSkeleton } from '../src/shared/components/view-mode/FeedViewSkeleton';
import { ListView } from '../src/shared/components/view-mode/ListView';
import { ListViewSkeleton } from '../src/shared/components/view-mode/ListViewSkeleton';
import { PinnedItemsPanel } from '../src/shared/components/view-mode/PinnedItemsPanel';
import { ContentSplitLayout } from '../src/shared/components/view-mode/ContentSplitLayout';
import { SummaryPanelSkeleton } from '../src/shared/components/view-mode/SummaryPanelSkeleton';
import { ViewModeToggle } from '../src/shared/components/view-mode/ViewModeToggle';
import type { CommonViewItem } from '../src/shared/components/view-mode/commonViewTypes';

const items: CommonViewItem[] = [
  {
    id: 1,
    title: '고정 공지',
    authorLabel: '관리자',
    dateLabel: '2026-09-21 10:00',
    isPinned: true,
    categoryLabel: '시스템',
  },
  {
    id: 2,
    title: '일반 공지',
    authorLabel: '운영팀',
    dateLabel: '2026-09-20 09:00',
  },
];

describe('common notice view mode components', () => {
  it('switches between feed and list modes through a callback', () => {
    const onChange = vi.fn();

    render(<ViewModeToggle mode="feed" onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: '리스트형 보기' }));

    expect(onChange).toHaveBeenCalledWith('list');
  });

  it('renders pinned items and hides the panel when empty', () => {
    const { rerender } = render(
      <PinnedItemsPanel items={items} ariaLabel="상단 고정 공지" />,
    );

    expect(screen.getByText('고정 공지')).toBeInTheDocument();
    expect(screen.queryByText('일반 공지')).not.toBeInTheDocument();

    rerender(<PinnedItemsPanel items={[]} ariaLabel="상단 고정 공지" />);

    expect(
      screen.queryByRole('region', { name: '상단 고정 공지' }),
    ).not.toBeInTheDocument();
  });

  it('keeps feed and list item rendering separate', () => {
    render(
      <>
        <FeedView
          items={items}
          renderItem={(item) => <span>{item.title}</span>}
        />
        <ListView items={items} />
      </>,
    );

    expect(screen.getAllByText('고정 공지')).toHaveLength(2);
    expect(screen.getByText('관리자')).toBeInTheDocument();
    expect(screen.getByText('2026-09-21 10:00')).toBeInTheDocument();
    expect(screen.getByText('시스템')).toBeInTheDocument();
  });

  it('provides mode-specific skeletons', () => {
    render(
      <>
        <FeedViewSkeleton />
        <ListViewSkeleton />
      </>,
    );

    expect(screen.getByTestId('feed-view-skeleton')).toBeInTheDocument();
    expect(screen.getByTestId('list-view-skeleton')).toBeInTheDocument();
  });

  it('renders a sticky summary slot beside the list slot', () => {
    render(
      <ContentSplitLayout
        left={<div>목록 영역</div>}
        right={<div data-testid="summary-slot">요약 영역</div>}
      />,
    );

    expect(screen.getByText('목록 영역')).toBeInTheDocument();
    expect(screen.getByTestId('summary-slot')).toBeInTheDocument();
    expect(screen.getByTestId('view-mode-right-slot')).toHaveStyle({
      position: 'sticky',
    });
  });

  it('renders the summary skeleton for the right slot', () => {
    render(<SummaryPanelSkeleton />);

    expect(screen.getByTestId('summary-panel-skeleton')).toBeInTheDocument();
  });
});

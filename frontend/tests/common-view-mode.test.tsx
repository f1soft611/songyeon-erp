import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
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

class ImmediateIntersectionObserver {
  constructor(private readonly callback: (entries: Array<{ isIntersecting: boolean }>) => void) {}

  observe() {
    this.callback([{ isIntersecting: true }]);
  }

  disconnect() {}
}

describe('common notice view mode components', () => {
  it('keeps the default document icon and leading column used by document lists', () => {
    const onItemClick = vi.fn();
    render(<ListView items={[items[0]]} onItemClick={onItemClick} />);
    const button = screen.getByText('고정 공지').closest('button')!;
    expect(getComputedStyle(button).gridTemplateColumns).toBe('24px minmax(0, 1fr)');
    expect(button.firstElementChild).toBe(screen.getByTestId('DescriptionOutlinedIcon'));
    fireEvent.click(button);
    expect(onItemClick).toHaveBeenCalledWith(items[0]);
  });

  it('supports opt-in leading icons and category rendering without replacing item selection', () => {
    const onItemClick = vi.fn();
    const view = render(<ListView items={items} onItemClick={onItemClick}
      renderItemIcon={() => <span data-testid="custom-icon">상태 아이콘</span>}
      renderCategoryBadge={(item) => <span>맞춤 {item.categoryLabel}</span>} />);
    expect(screen.getAllByTestId('custom-icon')).toHaveLength(2);
    expect(screen.getByText('맞춤 시스템')).toBeInTheDocument();
    fireEvent.click(screen.getByText('고정 공지'));
    expect(onItemClick).toHaveBeenCalledWith(items[0]);
    view.unmount();
    render(<PinnedItemsPanel items={items} onItemClick={onItemClick} />);
    expect(screen.getByTestId('PushPinOutlinedIcon')).toBeInTheDocument();
    fireEvent.click(screen.getByText('고정 공지'));
    expect(onItemClick).toHaveBeenCalledTimes(2);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each(['feed', 'list'] as const)(
    'supports opt-in pagination in %s mode',
    (mode) => {
      const onLoadMore = vi.fn();
      const scrollRoot = document.createElement('div');
      vi.stubGlobal('IntersectionObserver', ImmediateIntersectionObserver);

      const pagination = {
        scrollRoot,
        hasNext: true,
        isLoadingMore: false,
        onLoadMore,
      };
      const view = mode === 'feed'
        ? (
            <FeedView
              items={[]}
              renderItem={() => <span>피드 항목</span>}
              pagination={pagination}
            />
          )
        : <ListView items={[]} pagination={pagination} />;

      const { rerender } = render(view);

      expect(onLoadMore).toHaveBeenCalledOnce();
      expect(screen.queryByRole('status', { name: '다음 문서 불러오는 중' }))
        .not.toBeInTheDocument();

      const loadingView = mode === 'feed'
        ? (
            <FeedView
              items={[]}
              renderItem={() => <span>피드 항목</span>}
              pagination={{ ...pagination, isLoadingMore: true }}
            />
          )
        : <ListView items={[]} pagination={{ ...pagination, isLoadingMore: true }} />;
      rerender(loadingView);

      expect(onLoadMore).toHaveBeenCalledOnce();
      expect(screen.getByRole('status', { name: '다음 문서 불러오는 중' }))
        .toBeInTheDocument();
    },
  );

  it.each(['feed', 'list'] as const)(
    'supports a caller-specific pagination loading label in %s mode',
    (mode) => {
      const pagination = {
        scrollRoot: null,
        hasNext: true,
        isLoadingMore: true,
        loadingLabel: '다음 공지 불러오는 중',
        onLoadMore: vi.fn(),
      };

      render(
        mode === 'feed'
          ? (
              <FeedView
                items={[]}
                renderItem={() => <span>피드 항목</span>}
                pagination={pagination}
              />
            )
          : <ListView items={[]} pagination={pagination} />,
      );

      expect(
        screen.getByRole('status', { name: '다음 공지 불러오는 중' }),
      ).toBeInTheDocument();
    },
  );

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

  it('keeps pinned panel actions outside the selectable item button', () => {
    const onItemClick = vi.fn();
    const onAction = vi.fn();

    render(
      <PinnedItemsPanel
        items={[items[0]]}
        onItemClick={onItemClick}
        renderItemAction={() => (
          <button type="button" onClick={onAction}>고정 해제</button>
        )}
      />,
    );

    const action = screen.getByRole('button', { name: '고정 해제' });

    expect(action.parentElement?.closest('button')).toBeNull();

    fireEvent.click(action);

    expect(onAction).toHaveBeenCalledOnce();
    expect(onItemClick).not.toHaveBeenCalled();
  });

  it('keeps a custom list toolbar outside selection and replaces default badges', () => {
    const onItemClick = vi.fn();
    const onAction = vi.fn();
    render(
      <ListView
        items={[items[0]]}
        onItemClick={onItemClick}
        renderItemToolbar={() => (
          <button type="button" onClick={onAction}>Toolbar action</button>
        )}
      />,
    );

    const action = screen.getByRole('button', { name: 'Toolbar action' });
    expect(action.parentElement?.closest('button')).toBeNull();
    expect(screen.queryByText('시스템')).not.toBeInTheDocument();
    fireEvent.click(action);
    expect(onAction).toHaveBeenCalledOnce();
    expect(onItemClick).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /고정 공지/ }));
    expect(onItemClick).toHaveBeenCalledWith(items[0]);
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

  it('renders an optional status beside the category label in list mode', () => {
    render(
      <ListView
        items={[
          {
            id: 3,
            title: '결재 문서',
            authorLabel: '작성자',
            dateLabel: '2026-10-02',
            categoryLabel: '기안서',
            statusLabel: '결재진행중',
          },
        ]}
      />,
    );

    const titleRow = screen.getByText('결재 문서').parentElement;
    const documentRow = screen.getByRole('button', { name: /결재 문서/ });
    const badgeLabels = Array.from(
      documentRow.querySelectorAll('.MuiChip-root'),
      (chip) => chip.textContent,
    );
    expect(titleRow).toHaveTextContent('기안서');
    expect(titleRow).toHaveTextContent('결재진행중');
    expect(badgeLabels).toEqual(['기안서', '결재진행중']);
  });

  it('renders status before category when status-first order is requested', () => {
    render(
      <ListView
        badgeOrder="status-category"
        items={[
          {
            id: 5,
            title: '순서 문서',
            authorLabel: '작성자',
            dateLabel: '2026-10-15',
            categoryLabel: '기안서',
            statusLabel: '결재진행중',
          },
        ]}
      />,
    );

    const documentRow = screen.getByRole('button', { name: /순서 문서/ });
    const badgeLabels = Array.from(
      documentRow.querySelectorAll('.MuiChip-root'),
      (chip) => chip.textContent,
    );
    expect(badgeLabels).toEqual(['결재진행중', '기안서']);
  });

  it('renders document status variant and shared badge radius when supplied', () => {
    render(
      <ListView
        items={[
          {
            id: 20,
            title: '진행 문서',
            authorLabel: '작성자',
            dateLabel: '2026-10-14',
            categoryLabel: '기안',
            categoryColor: 'primary',
            statusLabel: '결재진행중',
            statusColor: 'info',
            statusVariant: 'filled',
            badgeBorderRadius: '8px',
          },
        ]}
      />,
    );

    const statusChip = screen.getByText('결재진행중').closest<HTMLElement>('.MuiChip-root');
    const kindChip = screen.getByText('기안').closest<HTMLElement>('.MuiChip-root');
    expect(statusChip).not.toBeNull();
    expect(kindChip).not.toBeNull();
    if (!statusChip || !kindChip) throw new Error('Expected document Chips to render.');
    expect(statusChip).toHaveClass('MuiChip-filled');
    expect(statusChip).toHaveStyle({ borderRadius: '8px' });
    expect(kindChip).toHaveStyle({ borderRadius: '8px' });
  });

  it('keeps default list status styling when document presentation is omitted', () => {
    render(
      <ListView
        items={[
          {
            id: 21,
            title: '일반 항목',
            authorLabel: '작성자',
            dateLabel: '2026-10-14',
            statusLabel: '상태',
          },
        ]}
      />,
    );

    expect(screen.getByText('상태').closest('.MuiChip-root')).toHaveClass(
      'MuiChip-outlined',
    );
  });

  it('uses an optional category color while preserving the default category color', () => {
    render(
      <ListView
        items={[
          {
            id: 4,
            title: '업무 문서',
            authorLabel: '작성자',
            dateLabel: '2026-10-02',
            categoryLabel: '업무',
            categoryColor: 'info',
          },
        ]}
      />,
    );

    expect(screen.getByTestId('list-category-chip')).toHaveClass('MuiChip-colorInfo');
  });

  it('keeps header and metadata actions outside the clickable list row', () => {
    const onItemClick = vi.fn();
    const onHeaderAction = vi.fn();
    const onMetadataAction = vi.fn();

    render(
      <ListView
        items={[
          {
            id: 22,
            title: '고정 대상 문서',
            authorLabel: '작성자',
            dateLabel: '2026-10-21',
            categoryLabel: '업무연락',
          },
        ]}
        onItemClick={onItemClick}
        renderItemHeaderAction={() => (
          <button type="button" onClick={onHeaderAction}>문서 고정</button>
        )}
        renderItemAction={() => (
          <button type="button" onClick={onMetadataAction}>기존 액션</button>
        )}
      />,
    );

    const category = screen.getByTestId('list-category-chip');
    const pin = screen.getByRole('button', { name: '문서 고정' });
    const metadataAction = screen.getByRole('button', { name: '기존 액션' });

    expect(category.compareDocumentPosition(pin) & Node.DOCUMENT_POSITION_FOLLOWING)
      .not.toBe(0);
    expect(pin.parentElement?.closest('button')).toBeNull();
    expect(metadataAction.parentElement?.closest('button')).toBeNull();

    fireEvent.click(pin);
    fireEvent.click(metadataAction);

    expect(onHeaderAction).toHaveBeenCalledOnce();
    expect(onMetadataAction).toHaveBeenCalledOnce();
    expect(onItemClick).not.toHaveBeenCalled();
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

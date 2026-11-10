import {
  act,
  fireEvent,
  render,
  screen,
  within,
  waitFor,
} from '@testing-library/react';
import { useState } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { createAppTheme } from '../src/theme/theme';
import { getNoticeCategoryPresentation } from '../src/pages/groupware/community/notice/data/noticeCategoryPresentation';
import { normalizeNoticeEmbeddedImageSources } from '../src/pages/groupware/community/notice/components/NoticeFeedList';
import { describe, expect, it, vi } from 'vitest';
import { DashboardContent } from '../src/pages/dashboard/components/DashboardContent';
import { NoticeFeedList } from '../src/pages/groupware/community/notice/components/NoticeFeedList';
import { noticeFeed } from '../src/pages/groupware/community/notice/data/noticeData';
import { useNoticeInteractions } from '../src/pages/groupware/community/notice/hooks/useNoticeInteractions';
import { FeedBodyContent } from '../src/shared/components/feed/FeedBodyContent';
import { PostDetailPanel } from '../src/shared/components/feed/PostDetailPanel';
import { ListView } from '../src/shared/components/view-mode/ListView';
import { PinnedItemsPanel } from '../src/shared/components/view-mode/PinnedItemsPanel';

const noticeServices = vi.hoisted(() => ({
  fetchNoticePostDetail: vi.fn(),
}));

vi.mock(
  '../src/pages/groupware/community/notice/services/noticeBoardService',
  async (importOriginal) => ({
    ...(await importOriginal<
      typeof import('../src/pages/groupware/community/notice/services/noticeBoardService')
    >()),
    fetchNoticePostDetail: noticeServices.fetchNoticePostDetail,
  }),
);

function NoticeDetailLoadingHarness() {
  const [noticeItems, setNoticeItems] = useState([noticeFeed[0]]);
  const interactions = useNoticeInteractions({
    noticeItems,
    setNoticeItems,
    showError: () => undefined,
    showSuccess: () => undefined,
  });

  return (
    <>
      <button
        type="button"
        onClick={() =>
          void interactions.handleSelectNotice({ id: noticeFeed[0].id })
        }
      >
        공지 선택
      </button>
      {interactions.selectedNotice && (
        <PostDetailPanel
          onClose={() => undefined}
          isLoading={
            interactions.selectedNoticeLoadingId ===
            interactions.selectedNoticeId
          }
          loadingLabel="공지사항 상세 불러오는 중"
        >
          <FeedBodyContent
            hasMore
            isExpanded={
              interactions.expandedNoticeId === interactions.selectedNotice.id
            }
            onToggleExpand={() => undefined}
            contentTestId="selected-notice-body"
            text={{
              collapsed: interactions.selectedNotice.summary,
              expanded: interactions.selectedNotice.body,
            }}
          />
        </PostDetailPanel>
      )}
    </>
  );
}

describe('Community notice page', () => {
  it.each([false, true])(
    'uses distinct category colors without changing labels or pin state for isDark=%s',
    (isDark) => {
      const items = [
        {
          ...noticeFeed[0],
          id: 201,
          title: '공지 A',
          state: '운영',
          noticeGubunCode: 'NOTICE_A',
          isPinned: 'Y',
        },
        {
          ...noticeFeed[1],
          id: 202,
          title: '공지 B',
          state: '필독',
          noticeGubunCode: 'HR',
          isPinned: 'N',
        },
      ];

      const theme = createAppTheme(isDark ? 'dark' : 'light');
      render(
        <ThemeProvider theme={theme}>
          <NoticeFeedList items={items} isDark={isDark} />
        </ThemeProvider>,
      );

      const firstCategory = screen.getByText('운영').closest('.MuiChip-root');
      const secondCategory = screen.getByText('필독').closest('.MuiChip-root');

      expect(firstCategory).toBeInTheDocument();
      expect(secondCategory).toBeInTheDocument();
      expect(getComputedStyle(firstCategory!).backgroundColor).not.toBe(
        getComputedStyle(secondCategory!).backgroundColor,
      );
      for (const [index, category] of [firstCategory, secondCategory].entries()) {
        const { backgroundColor } = getNoticeCategoryPresentation(
          items[index].noticeGubunCode,
          isDark,
        );
        expect(category).toHaveStyle({
          backgroundColor,
          color:
            items[index].state === '필독'
              ? '#ffffff'
              : theme.palette.getContrastText(backgroundColor),
          height: '28px',
          borderRadius: '8px',
        });
      }
      expect(
        screen.getByRole('button', { name: '상단 고정 해제 공지 A' }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: '상단 고정 공지 B' }),
      ).toBeInTheDocument();
    },
  );

  it('shows centered shared loading while selected notice detail is pending', async () => {
    let resolveDetail!: (detail: {
      postId: number;
      title: string;
      contentsHtml: string;
      createdAt: string;
    }) => void;
    noticeServices.fetchNoticePostDetail.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveDetail = resolve;
        }),
    );

    render(<NoticeDetailLoadingHarness />);
    fireEvent.click(screen.getByRole('button', { name: '공지 선택' }));

    const loadingStatus = await screen.findByRole('status', {
      name: '공지사항 상세 불러오는 중',
    });
    expect(loadingStatus).toBeInTheDocument();
    expect(screen.getByTestId('post-detail-panel-content')).toHaveStyle({
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    });

    await act(async () => {
      resolveDetail({
        postId: noticeFeed[0].id,
        title: noticeFeed[0].title,
        contentsHtml: '<p>불러온 공지 상세</p>',
        createdAt: '2026-10-13T09:00:00Z',
      });
    });

    expect(await screen.findByText('불러온 공지 상세')).toBeInTheDocument();
    expect(screen.getByTestId('selected-notice-body')).toHaveAttribute(
      'data-expanded',
      'true',
    );
    expect(screen.getByRole('button', { name: '접기' })).toBeInTheDocument();
    expect(
      screen.queryByRole('status', { name: '공지사항 상세 불러오는 중' }),
    ).not.toBeInTheDocument();
  });

  it('selects list and pinned items through their common callbacks', () => {
    const onItemClick = vi.fn();
    const item = {
      id: 42,
      title: '선택할 공지',
      authorLabel: '운영팀',
      dateLabel: '2026.09.23',
      isPinned: true,
    };

    render(
      <>
        <ListView items={[item]} onItemClick={onItemClick} />
        <PinnedItemsPanel items={[item]} onItemClick={onItemClick} />
      </>,
    );

    fireEvent.click(screen.getAllByRole('button', { name: /선택할 공지/i })[0]);
    fireEvent.click(screen.getAllByRole('button', { name: /선택할 공지/i })[1]);

    expect(onItemClick).toHaveBeenCalledTimes(2);
    expect(onItemClick).toHaveBeenCalledWith(item);
  });

  it('normalizes legacy MinIO image sources to the stable notice image API', () => {
    const html =
      '<p><img src="http://minio.example/expired" data-object-key="tenant/1/notice-temp/token/image.png" /></p>';

    const normalized = normalizeNoticeEmbeddedImageSources(html, 42);

    expect(normalized).toContain(
      'api/v1/groupware/boards/notice/posts/42/embedded-images?objectKey=tenant%2F1%2Fnotice-temp%2Ftoken%2Fimage.png',
    );
    expect(normalized).not.toContain('minio.example');
  });

  it('keeps the initial skeleton loading state without showing a preloaded notice list', async () => {
    await act(async () => {
      render(
        <DashboardContent
          selectedModule={{
            id: 'groupware',
            name: '그룹웨어',
            icon: <span aria-hidden="true">G</span>,
            tree: [],
            menus: [],
            path: '/groupware',
          }}
          currentMenuName="공지사항"
          currentPageKey="notice"
          breadcrumbItems={['그룹웨어', '커뮤니티', '공지사항']}
          content={{
            title: '공지사항',
            description: '최근 공지 내용을 빠르게 확인합니다.',
            cards: [],
            items: [],
          }}
        />,
      );
    });

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /새 공지 작성/i }),
      ).toBeInTheDocument();
    });

    expect(screen.getByTestId('notice-feed-skeleton')).toBeInTheDocument();
    expect(
      screen.queryByText(/3분기_업무일정표_v2\.pdf/i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: /공지사항/i }),
    ).not.toBeInTheDocument();
  });

  it('renders attachment and comment features for a notice feed item', async () => {
    await act(async () => {
      render(
        <NoticeFeedList
          items={[noticeFeed[0]]}
          isDark={false}
          expandedNoticeId={noticeFeed[0].id}
          onToggleExpand={() => undefined}
          onToggleLike={() => undefined}
          onToggleBookmark={() => undefined}
          onAddComment={() => undefined}
          onDelete={() => undefined}
          onEdit={() => undefined}
          onDownload={() => undefined}
        />,
      );
    });

    expect(
      await screen.findByText('3분기_업무일정표_v2.pdf'),
    ).toBeInTheDocument();
    expect(screen.getByText('부서별_협업_일정_안내.hwp')).toBeInTheDocument();
    expect(screen.getAllByText(/댓글/i).length).toBeGreaterThan(0);
    const noticeCard = screen
      .getByTestId('notice-feed-list')
      .querySelector<HTMLElement>('[data-feed-card="true"]');
    expect(noticeCard).toBeInTheDocument();
    expect(screen.getByTestId('feed-reaction-bar')).toBeInTheDocument();
    expect(screen.getByTestId('feed-comments-section')).toBeInTheDocument();
    expect(
      within(noticeCard).getAllByRole('separator'),
    ).toHaveLength(1);
    expect(screen.getByTestId('feed-reaction-bar').nextElementSibling).toBe(
      screen.getByTestId('feed-comments-section'),
    );

    const commentInput = screen.getByRole('textbox', { name: '댓글 입력' });
    expect(commentInput).toHaveAttribute('contenteditable', 'true');
  });

  it('removes direct body and previous-comments separators on notice feed cards', () => {
    const item = {
      ...noticeFeed[0],
      body: '짧은 공지',
      summary: '짧은 공지',
      attachments: [],
      attachmentDetails: [],
    };

    render(<NoticeFeedList items={[item]} isDark={false} />);

    const noticeCard = screen
      .getByTestId('notice-feed-list')
      .querySelector<HTMLElement>('[data-feed-card="true"]');
    expect(noticeCard).toBeInTheDocument();
    expect(
      within(noticeCard).queryAllByRole('separator'),
    ).toHaveLength(0);
    expect(
      screen.getByTestId(`notice-preview-${item.id}`),
    ).toHaveAttribute('data-expanded', 'false');
    expect(screen.getByTestId('feed-reaction-bar').nextElementSibling).toBe(
      screen.getByTestId('feed-comments-section'),
    );
  });

  it('shows the pin toggle beside the more menu button', () => {
    const onTogglePinned = vi.fn();
    const item = { ...noticeFeed[0], isPinned: 'N' };

    render(
      <NoticeFeedList
        items={[item]}
        isDark={false}
        onTogglePinned={onTogglePinned}
      />,
    );

    const pinButton = screen.getByRole('button', {
      name: `상단 고정 ${item.title}`,
    });
    expect(pinButton).toBeInTheDocument();
    expect(
      screen.queryByRole('menuitem', { name: '상단 고정' }),
    ).not.toBeInTheDocument();

    fireEvent.click(pinButton);
    expect(onTogglePinned).toHaveBeenCalledWith(item);
  });

  it('hides post management menu for a notice owned by another user', () => {
    const item = { ...noticeFeed[0], isPostOwner: false };

    render(
      <NoticeFeedList
        items={[item]}
        isDark={false}
        onEdit={() => undefined}
        onDelete={() => undefined}
      />,
    );

    expect(
      screen.queryByRole('button', { name: `공지 메뉴 ${item.title}` }),
    ).not.toBeInTheDocument();
  });

  it('uses title and body clicks as the read entry point when more is unavailable', () => {
    const onToggleExpand = vi.fn();
    const item = {
      ...noticeFeed[0],
      title: '짧은 공지 제목',
      body: '짧은 공지 내용',
      summary: '짧은 공지 내용',
    };

    render(
      <NoticeFeedList
        items={[item]}
        isDark={false}
        onToggleExpand={onToggleExpand}
      />,
    );

    fireEvent.click(screen.getByText('짧은 공지 제목'));
    fireEvent.click(screen.getByText('짧은 공지 내용'));

    expect(onToggleExpand).toHaveBeenCalledTimes(2);
    expect(onToggleExpand).toHaveBeenCalledWith(item.id);
  });

  it('keeps the more button as the only read entry point when more is available', () => {
    const onToggleExpand = vi.fn();
    const item = noticeFeed[0];

    render(
      <NoticeFeedList
        items={[item]}
        isDark={false}
        onToggleExpand={onToggleExpand}
      />,
    );

    fireEvent.click(screen.getByText(item.title));
    fireEvent.click(screen.getByText(item.summary));

    expect(onToggleExpand).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: '더보기' }));

    expect(onToggleExpand).toHaveBeenCalledTimes(1);
    expect(onToggleExpand).toHaveBeenCalledWith(item.id);
  });

  it('allows a controlled expanded notice to collapse after opening', () => {
    const item = noticeFeed[0];

    function ControlledNotice() {
      const [expandedNoticeId, setExpandedNoticeId] = useState<number | null>(
        item.id,
      );

      return (
        <NoticeFeedList
          items={[item]}
          isDark={false}
          expandedNoticeId={expandedNoticeId}
          onToggleExpand={(noticeId) => {
            setExpandedNoticeId((current) =>
              current === noticeId ? null : noticeId,
            );
          }}
        />
      );
    }

    render(<ControlledNotice />);

    fireEvent.click(screen.getByRole('button', { name: '접기' }));

    expect(screen.getByTestId(`notice-preview-${item.id}`)).toHaveAttribute(
      'data-expanded',
      'false',
    );
  });

  it('preserves notice typography and wraps wide tables in collapsed and expanded previews', () => {
    const item = {
      ...noticeFeed[0],
      body: '긴 표가 포함된 공지 전체 내용',
      summary: '긴 표가 포함된 공지',
      bodyHtml:
        '<p><span style="font-family:Arial;font-size:10pt">중요 안내</span></p><table><tbody><tr><td>첫 번째 열</td><td>두 번째 열</td></tr></tbody></table>',
    };
    const renderPreview = (expandedNoticeId: number | null) => (
      <NoticeFeedList
        items={[item]}
        isDark={false}
        expandedNoticeId={expandedNoticeId}
      />
    );
    const { rerender } = render(renderPreview(null));

    const collapsedPreview = screen.getByTestId(`notice-preview-${item.id}`);
    expect(collapsedPreview).toHaveAttribute('data-expanded', 'false');
    expect(
      collapsedPreview.querySelector('.tableWrapper > table'),
    ).not.toBeNull();
    expect(collapsedPreview.querySelector('span')?.getAttribute('style')).toBe(
      'font-family:Arial;font-size:10pt',
    );

    rerender(renderPreview(item.id));

    const expandedPreview = screen.getByTestId(`notice-preview-${item.id}`);
    expect(expandedPreview).toHaveAttribute('data-expanded', 'true');
    expect(
      expandedPreview.querySelector('.tableWrapper > table'),
    ).not.toBeNull();
    expect(expandedPreview.querySelector('span')?.getAttribute('style')).toBe(
      'font-family:Arial;font-size:10pt',
    );
  });

  it('opens an image viewer when the user clicks a feed image preview', async () => {
    const onNoticeInteract = vi.fn();
    const item = {
      ...noticeFeed[0],
      bodyHtml:
        '<p>공지 내용</p><p><img src="https://example.com/notice-image.png" alt="원본 이미지" /></p>',
      summary: '공지 내용',
    };

    render(
      <NoticeFeedList
        items={[item]}
        isDark={false}
        expandedNoticeId={item.id}
        onNoticeInteract={onNoticeInteract}
        onToggleExpand={() => undefined}
        onToggleLike={() => undefined}
        onToggleBookmark={() => undefined}
        onAddComment={() => undefined}
        onDelete={() => undefined}
        onEdit={() => undefined}
        onDownload={() => undefined}
      />,
    );

    fireEvent.click(screen.getByAltText('원본 이미지'));

    await waitFor(() => {
      expect(
        screen.getByRole('dialog', { name: '이미지 보기' }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('img', { name: '원본 이미지' }),
      ).toBeInTheDocument();
    });
    expect(onNoticeInteract).not.toHaveBeenCalled();
  });

  it('records an interaction from image and attachment areas when more is unavailable', () => {
    const onNoticeInteract = vi.fn();
    const onDownload = vi.fn();
    const item = {
      ...noticeFeed[0],
      body: '짧은 공지',
      summary: '짧은 공지',
      bodyHtml:
        '<p><img src="https://example.com/short-notice.png" alt="공지 이미지" /></p>',
      attachments: ['안내문.pdf'],
      attachmentDetails: [{ id: 'file-1', name: '안내문.pdf' }],
    };

    render(
      <NoticeFeedList
        items={[item]}
        isDark={false}
        onNoticeInteract={onNoticeInteract}
        onDownload={onDownload}
      />,
    );

    fireEvent.click(screen.getByAltText('공지 이미지'));
    fireEvent.click(screen.getByRole('button', { name: '첨부 파일 다운로드' }));

    expect(onNoticeInteract).toHaveBeenCalledTimes(2);
    expect(onNoticeInteract).toHaveBeenCalledWith(item.id);
    expect(onDownload).toHaveBeenCalledWith(
      item.id,
      expect.objectContaining({ name: '안내문.pdf' }),
    );
  });

  it('records a comment-area interaction only when more is unavailable', () => {
    const onNoticeInteract = vi.fn();
    const item = {
      ...noticeFeed[0],
      body: '짧은 공지',
      summary: '짧은 공지',
      comments: [],
    };

    render(
      <NoticeFeedList
        items={[item]}
        isDark={false}
        onNoticeInteract={onNoticeInteract}
      />,
    );

    fireEvent.click(screen.getByRole('textbox', { name: '댓글 입력' }));

    expect(onNoticeInteract).toHaveBeenCalledTimes(1);
    expect(onNoticeInteract).toHaveBeenCalledWith(item.id);
  });

  it('shows multiple embedded images in order without introducing scroll controls', () => {
    const item = {
      ...noticeFeed[0],
      bodyHtml:
        '<p>공지 내용</p><p><img src="https://example.com/notice-image-1.png" alt="첫 번째 이미지" /><img src="https://example.com/notice-image-2.png" alt="두 번째 이미지" /></p>',
      summary: '공지 요약',
    };

    render(
      <NoticeFeedList
        items={[item]}
        isDark={false}
        onToggleExpand={() => undefined}
        onToggleLike={() => undefined}
        onToggleBookmark={() => undefined}
        onAddComment={() => undefined}
        onDelete={() => undefined}
        onEdit={() => undefined}
        onDownload={() => undefined}
      />,
    );

    expect(screen.getByAltText('첫 번째 이미지')).toBeInTheDocument();
    expect(screen.getByAltText('두 번째 이미지')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: '다음 이미지' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: '이전 이미지' }),
    ).not.toBeInTheDocument();
  });

  it('does not render duplicate comment keys when the API repeats a comment', () => {
    const errorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    render(
      <NoticeFeedList
        items={[
          {
            ...noticeFeed[0],
            comments: [
              { id: 2, author: '첫 댓글', time: '오늘', content: '첫 댓글' },
              {
                id: 2,
                author: '중복 댓글',
                time: '오늘',
                content: '중복 댓글',
              },
            ],
          },
        ]}
        isDark={false}
        expandedNoticeId={noticeFeed[0].id}
      />,
    );

    const duplicateKeyWarning = errorSpy.mock.calls.some((call) =>
      call.some((argument) =>
        String(argument).includes('Encountered two children with the same key'),
      ),
    );
    expect(duplicateKeyWarning).toBe(false);

    errorSpy.mockRestore();
  });

  it('does not render duplicate keys when nested replies share an ID', () => {
    const errorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    render(
      <NoticeFeedList
        items={[
          {
            ...noticeFeed[0],
            comments: [
              {
                id: 1,
                author: '원댓글',
                time: '오늘',
                content: '원댓글',
                replies: [
                  {
                    id: 4,
                    author: '첫 답글',
                    time: '오늘',
                    content: '첫 답글',
                    replies: [
                      {
                        id: 4,
                        author: '중복 답글',
                        time: '오늘',
                        content: '중복 답글',
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ]}
        isDark={false}
        expandedNoticeId={noticeFeed[0].id}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /답글 1개/i }));

    const duplicateKeyWarning = errorSpy.mock.calls.some((call) =>
      call.some((argument) =>
        String(argument).includes('Encountered two children with the same key'),
      ),
    );
    expect(duplicateKeyWarning).toBe(false);

    errorSpy.mockRestore();
  });

  it('opens a composer with title, body, toolbar, and attachment area', async () => {
    render(
      <DashboardContent
        selectedModule={{
          id: 'groupware',
          name: '그룹웨어',
          icon: <span aria-hidden="true">G</span>,
          tree: [],
          menus: [],
          path: '/groupware',
        }}
        currentMenuName="공지사항"
        currentPageKey="notice"
        breadcrumbItems={['그룹웨어', '커뮤니티', '공지사항']}
        content={{
          title: '공지사항',
          description: '최근 공지 내용을 빠르게 확인합니다.',
          cards: [],
          items: [],
        }}
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /새 공지 작성/i }),
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /새 공지 작성/i }));

    expect(screen.getAllByLabelText(/제목/i)[0]).toBeInTheDocument();
    expect(screen.getAllByLabelText(/본문/i)[0]).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /툴바 열기/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /첨부 링크/i }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /툴바 열기/i }));

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /^굵게$/i }),
      ).toBeInTheDocument();
    });
  });

  it('adds a nested reply to an existing comment thread', async () => {
    render(
      <NoticeFeedList
        items={[noticeFeed[0]]}
        isDark={false}
        expandedNoticeId={noticeFeed[0].id}
        onToggleExpand={() => undefined}
        onToggleLike={() => undefined}
        onToggleBookmark={() => undefined}
        onAddComment={vi.fn()}
        onDelete={() => undefined}
        onEdit={() => undefined}
        onDownload={() => undefined}
      />,
    );

    fireEvent.click(screen.getAllByRole('button', { name: /^답글$/i })[0]);

    const replyInput = await screen.findByLabelText(/답글 입력/i);
    fireEvent.input(replyInput, {
      target: { innerHTML: '<p>확인했습니다.</p>' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^답글 등록$/i }));

    expect(
      screen.getByRole('button', { name: /^답글 등록$/i }),
    ).toBeInTheDocument();
  });

  it('edits and deletes a comment from the thread', async () => {
    const editableNotice = {
      ...noticeFeed[0],
      comments: noticeFeed[0].comments?.map((comment) => ({
        ...comment,
        isEditable: true,
      })),
    };
    render(
      <NoticeFeedList
        items={[editableNotice]}
        isDark={false}
        expandedNoticeId={noticeFeed[0].id}
        onToggleExpand={() => undefined}
        onToggleLike={() => undefined}
        onToggleBookmark={() => undefined}
        onAddComment={vi.fn()}
        onDelete={() => undefined}
        onEdit={() => undefined}
        onDownload={() => undefined}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /댓글 메뉴 김영식/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: '수정' }));
    const editInput = await screen.findByLabelText(/댓글 수정 입력/i);
    fireEvent.input(editInput, {
      target: { innerHTML: '<p>수정된 코멘트입니다.</p>' },
    });
    fireEvent.click(screen.getByRole('button', { name: '수정' }));

    fireEvent.click(screen.getByRole('button', { name: /댓글 메뉴 김영식/i }));
    expect(screen.getByRole('menuitem', { name: '삭제' })).toBeInTheDocument();
  });

  it('hides the previous-comments loader when there are fewer than three root comments', () => {
    const onLoadPreviousComments = vi.fn();

    render(
      <NoticeFeedList
        items={[
          {
            ...noticeFeed[0],
            comments: [
              { id: 11, author: '첫 댓글', time: '오늘', content: '첫 댓글' },
              {
                id: 12,
                author: '둘째 댓글',
                time: '오늘',
                content: '둘째 댓글',
              },
            ],
            commentCount: 2,
            hasPreviousComments: true,
          },
        ]}
        isDark={false}
        expandedNoticeId={noticeFeed[0].id}
        onLoadPreviousComments={onLoadPreviousComments}
      />,
    );

    expect(
      screen.queryByRole('button', { name: /^이전 댓글 보기/ }),
    ).not.toBeInTheDocument();
  });

  it('shows the previous-comments loader from three root comments', () => {
    const onLoadPreviousComments = vi.fn();

    render(
      <NoticeFeedList
        items={[
          {
            ...noticeFeed[0],
            comments: [
              { id: 11, author: '첫 댓글', time: '오늘', content: '첫 댓글' },
              {
                id: 12,
                author: '둘째 댓글',
                time: '오늘',
                content: '둘째 댓글',
              },
              {
                id: 13,
                author: '셋째 댓글',
                time: '오늘',
                content: '셋째 댓글',
              },
            ],
            commentCount: 4,
            hasPreviousComments: true,
          },
        ]}
        isDark={false}
        expandedNoticeId={noticeFeed[0].id}
        onLoadPreviousComments={onLoadPreviousComments}
      />,
    );

    expect(
      screen.getByRole('button', { name: /^이전 댓글 보기/ }),
    ).toBeInTheDocument();
  });

  it('hides the previous-comments action when all comments are already loaded', () => {
    render(
      <NoticeFeedList
        items={[
          {
            ...noticeFeed[0],
            comments: [
              { id: 11, author: '첫 댓글', time: '오늘', content: '첫 댓글' },
              {
                id: 12,
                author: '둘째 댓글',
                time: '오늘',
                content: '둘째 댓글',
              },
              {
                id: 13,
                author: '셋째 작성자',
                time: '오늘',
                content: '셋째 댓글',
              },
            ],
            commentCount: 3,
            hasPreviousComments: true,
            nextBeforeCommentId: 10,
          },
        ]}
        isDark={false}
        expandedNoticeId={noticeFeed[0].id}
      />,
    );

    expect(
      screen.queryByRole('button', { name: /^이전 댓글 보기/ }),
    ).not.toBeInTheDocument();
  });

  it('requests the previous cursor once and renders merged older comments without duplicates', async () => {
    const onLoadPreviousComments = vi.fn().mockResolvedValue({
      comments: [
        {
          id: 2,
          author: '이전 작성자',
          time: '어제',
          content: '이전 댓글',
          replies: [
            {
              id: 20,
              author: '이전 답글',
              time: '어제',
              content: '이전 답글 내용',
            },
          ],
        },
        {
          id: 4,
          author: '중복 작성자',
          time: '어제',
          content: '중복 댓글',
        },
      ],
      hasPrevious: false,
      nextBeforeCommentId: null,
    });

    render(
      <NoticeFeedList
        items={[
          {
            ...noticeFeed[0],
            nextBeforeCommentId: 3,
            comments: [
              {
                id: 4,
                author: '중복 작성자',
                time: '오늘',
                content: '중복 댓글',
              },
              {
                id: 5,
                author: '두번째 작성자',
                time: '오늘',
                content: '두번째 댓글',
              },
              {
                id: 6,
                author: '세번째 작성자',
                time: '오늘',
                content: '세번째 댓글',
                replies: [
                  {
                    id: 60,
                    author: '세번째 답글',
                    time: '오늘',
                    content: '남아있는 답글',
                  },
                ],
              },
            ],
            commentCount: 5,
          },
        ]}
        isDark={false}
        expandedNoticeId={noticeFeed[0].id}
        onLoadPreviousComments={onLoadPreviousComments}
      />,
    );

    expect(screen.queryByText('이전 댓글')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^이전 댓글 보기/ }));

    expect(await screen.findByText('이전 댓글')).toBeInTheDocument();
    expect(screen.getByText('이전 답글 내용')).toBeInTheDocument();
    expect(await screen.findByText('남아있는 답글')).toBeInTheDocument();
    expect(screen.getAllByText('중복 댓글')).toHaveLength(1);
    expect(onLoadPreviousComments).toHaveBeenCalledWith(1, 3);
    expect(
      screen.queryByRole('button', { name: /^이전 댓글 보기/ }),
    ).not.toBeInTheDocument();

    expect(onLoadPreviousComments).toHaveBeenCalledTimes(1);
  });

  it('uses the response cursor and stops when the backend repeats it', async () => {
    const onLoadPreviousComments = vi
      .fn()
      .mockResolvedValueOnce({
        comments: [
          {
            id: 2,
            author: '이전 작성자',
            time: '어제',
            content: '이전 댓글',
          },
        ],
        hasPrevious: true,
        nextBeforeCommentId: 3,
      })
      .mockResolvedValueOnce({
        comments: [],
        hasPrevious: false,
        nextBeforeCommentId: null,
      });

    render(
      <NoticeFeedList
        items={[{ ...noticeFeed[0], nextBeforeCommentId: 3 }]}
        isDark={false}
        expandedNoticeId={noticeFeed[0].id}
        onLoadPreviousComments={onLoadPreviousComments}
      />,
    );

    fireEvent.click(
      await screen.findByRole('button', { name: /^이전 댓글 보기/ }),
    );
    fireEvent.click(
      await screen.findByRole('button', { name: /^이전 댓글 보기/ }),
    );

    await waitFor(() =>
      expect(onLoadPreviousComments).toHaveBeenCalledTimes(1),
    );
    expect(onLoadPreviousComments).toHaveBeenCalledWith(1, 3);
  });

  it('keeps current comments and reports a previous-comments fetch error', async () => {
    const onLoadPreviousComments = vi
      .fn()
      .mockRejectedValue(new Error('previous comments failed'));
    const onLoadPreviousCommentsError = vi.fn();

    render(
      <NoticeFeedList
        items={[
          {
            ...noticeFeed[0],
            comments: [
              {
                id: 9,
                author: '현재 작성자',
                time: '오늘',
                content: '현재 댓글',
              },
              {
                id: 10,
                author: '다음 작성자',
                time: '오늘',
                content: '둘째 댓글',
              },
              {
                id: 11,
                author: '세 번째 작성자',
                time: '오늘',
                content: '셋째 댓글',
              },
            ],
            nextBeforeCommentId: 8,
            commentCount: 4,
          },
        ]}
        isDark={false}
        expandedNoticeId={noticeFeed[0].id}
        onLoadPreviousComments={onLoadPreviousComments}
        onLoadPreviousCommentsError={onLoadPreviousCommentsError}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /^이전 댓글 보기/ }));

    await waitFor(() => {
      expect(onLoadPreviousCommentsError).toHaveBeenCalledWith(
        expect.any(Error),
      );
    });
    expect(screen.getByText('현재 댓글')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /^이전 댓글 보기/ }),
    ).toBeInTheDocument();
    expect(onLoadPreviousComments).toHaveBeenCalledTimes(1);
  });

  it('falls back to the oldest visible root when cursor metadata is absent', async () => {
    const onLoadPreviousComments = vi.fn().mockResolvedValue({
      comments: [],
      hasPrevious: false,
      nextBeforeCommentId: null,
    });

    render(
      <NoticeFeedList
        items={[
          {
            ...noticeFeed[0],
            nextBeforeCommentId: undefined,
            comments: [
              { id: 4, author: '첫 댓글', time: '오늘', content: '첫 댓글' },
              {
                id: 5,
                author: '둘째 댓글',
                time: '오늘',
                content: '둘째 댓글',
              },
              {
                id: 6,
                author: '셋째 댓글',
                time: '오늘',
                content: '셋째 댓글',
              },
              {
                id: 7,
                author: '넷째 댓글',
                time: '오늘',
                content: '넷째 댓글',
              },
            ],
            commentCount: 5,
          },
        ]}
        isDark={false}
        expandedNoticeId={noticeFeed[0].id}
        onLoadPreviousComments={onLoadPreviousComments}
      />,
    );

    fireEvent.click(
      await screen.findByRole('button', { name: /^이전 댓글 보기/ }),
    );

    await waitFor(() =>
      expect(onLoadPreviousComments).toHaveBeenCalledWith(1, 5),
    );
  });

  it('preserves loaded older roots and cursor when the server item changes locally', async () => {
    const onLoadPreviousComments = vi.fn().mockResolvedValue({
      comments: [
        { id: 2, author: '이전 작성자', time: '어제', content: '이전 댓글' },
      ],
      hasPrevious: true,
      nextBeforeCommentId: 1,
    });
    const serverItem = {
      ...noticeFeed[0],
      comments: [
        { id: 3, author: '현재 작성자', time: '오늘', content: '현재 댓글' },
      ],
      nextBeforeCommentId: 3,
      commentCount: 3,
    };

    const { rerender } = render(
      <NoticeFeedList
        items={[serverItem]}
        isDark={false}
        expandedNoticeId={serverItem.id}
        onLoadPreviousComments={onLoadPreviousComments}
      />,
    );

    fireEvent.click(
      await screen.findByRole('button', { name: /^이전 댓글 보기/ }),
    );
    expect(await screen.findByText('이전 댓글')).toBeInTheDocument();

    rerender(
      <NoticeFeedList
        items={[{ ...serverItem, title: '로컬 CRUD 반영 공지' }]}
        isDark={false}
        expandedNoticeId={serverItem.id}
        onLoadPreviousComments={onLoadPreviousComments}
      />,
    );

    expect(screen.getByText('이전 댓글')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^이전 댓글 보기/ }));
    await waitFor(() =>
      expect(onLoadPreviousComments).toHaveBeenLastCalledWith(1, 1),
    );
  });
});

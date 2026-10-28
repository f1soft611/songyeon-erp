import {
  act,
  fireEvent,
  render,
  screen,
  within,
  waitFor,
} from '@testing-library/react';
import { useState } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NotificationProvider } from '../src/shared/context/NotificationContext';
import {
  CommunityNoticePage,
} from '../src/pages/groupware/community/notice/CommunityNoticePage';
import {
  mergeCommentTrees,
  NoticeFeedList,
} from '../src/pages/groupware/community/notice/components/NoticeFeedList';
import {
  appendCommentToTree,
  insertNoticeReplyAfter,
} from '../src/pages/groupware/community/notice/data/noticeCommentTree';
import { noticeFeed } from '../src/pages/groupware/community/notice/data/noticeData';
import type { NoticeFeedItem } from '../src/pages/groupware/community/notice/data/noticeData';

const noticeServiceMocks = vi.hoisted(() => ({
  fetchNoticePosts: vi.fn(),
  fetchPinnedNoticePosts: vi.fn(),
  fetchNoticePostDetail: vi.fn(),
  createNoticePost: vi.fn(),
  updateNoticePost: vi.fn(),
  deleteNoticePost: vi.fn(),
  deleteNoticeAttachment: vi.fn(),
  downloadNoticeAttachment: vi.fn(),
  uploadNoticeAttachment: vi.fn(),
}));

const commentServiceMocks = vi.hoisted(() => ({
  fetchCommonComments: vi.fn(),
  fetchCommonFileBlob: vi.fn(),
  createCommonComment: vi.fn(),
  updateCommonComment: vi.fn(),
  deleteCommonComment: vi.fn(),
  uploadCommonFile: vi.fn(),
  deleteCommonFile: vi.fn(),
}));

vi.mock(
  '../src/pages/groupware/community/notice/services/noticeBoardService',
  () => ({
    ...noticeServiceMocks,
  }),
);

vi.mock('../src/shared/services/commonContentApi', () => ({
  ...commentServiceMocks,
}));

const selectedModule = {
  id: 'groupware',
  name: '그룹웨어',
  icon: <span aria-hidden="true">G</span>,
  tree: [],
  menus: [],
  path: '/groupware',
};
const content = {
  title: '공지사항',
  description: '최근 공지 내용을 빠르게 확인합니다.',
  cards: [],
  items: [],
};
const detail = {
  postId: 1,
  title: '기존 공지',
  contentsHtml: '<p>공지 본문</p>',
  writerName: '관리자',
  comments: [
    {
      commentId: 10,
      writerName: '작성자',
      content: '서버가 내려준 댓글',
    },
  ],
  commentCount: 1,
};

class ImmediateIntersectionObserver {
  constructor(
    private readonly callback: (
      entries: Array<{ isIntersecting: boolean }>,
    ) => void,
  ) {}

  observe() {
    this.callback([{ isIntersecting: true }]);
  }

  disconnect() {}
}

function renderPage() {
  return render(
    <ThemeProvider theme={createTheme()}>
      <NotificationProvider>
        <CommunityNoticePage
          selectedModule={selectedModule}
          currentMenuName="공지사항"
          content={content}
        />
      </NotificationProvider>
    </ThemeProvider>,
  );
}

describe('CommunityNoticePage local updates', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    noticeServiceMocks.fetchNoticePosts.mockResolvedValue([
      {
        ...detail,
        postId: 1,
        title: '기존 공지',
        isPinned: 'Y',
        attachments: [
          { boardFileId: 101, fileName: '목록 첨부.pdf', fileSize: 12 },
        ],
      },
    ]);
    noticeServiceMocks.fetchPinnedNoticePosts.mockResolvedValue([]);
    noticeServiceMocks.fetchNoticePostDetail.mockResolvedValue(detail);
    noticeServiceMocks.createNoticePost.mockResolvedValue({
      ...detail,
      postId: 2,
      title: '새 공지',
    });
    noticeServiceMocks.updateNoticePost.mockResolvedValue({
      ...detail,
      title: '수정 공지',
    });
    noticeServiceMocks.deleteNoticePost.mockResolvedValue(undefined);
    commentServiceMocks.fetchCommonComments.mockResolvedValue([]);
    commentServiceMocks.createCommonComment.mockResolvedValue({
      commentId: 11,
      writerName: '나',
      content: '새 댓글',
    });
  });

  it('keeps the initial skeleton until the notice API resolves', async () => {
    let resolvePosts: (posts: []) => void = () => undefined;
    noticeServiceMocks.fetchNoticePosts.mockReturnValueOnce(
      new Promise<[]>((resolve) => {
        resolvePosts = resolve;
      }),
    );

    renderPage();

    expect(
      await screen.findByTestId('notice-feed-skeleton'),
    ).toBeInTheDocument();
    await new Promise((resolve) => window.setTimeout(resolve, 1600));
    expect(screen.getByTestId('notice-feed-skeleton')).toBeInTheDocument();

    await act(async () => {
      resolvePosts([]);
    });
    await waitFor(() => {
      expect(
        screen.queryByTestId('notice-feed-skeleton'),
      ).not.toBeInTheDocument();
    });
  });

  it('reloads notices and switches to the selected list view', async () => {
    renderPage();

    const feedList = await screen.findByTestId('notice-feed-list');
    expect(within(feedList).getByText('기존 공지')).toBeInTheDocument();
    expect(noticeServiceMocks.fetchNoticePosts).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: '리스트형 보기' }));

    expect(noticeServiceMocks.fetchNoticePosts).toHaveBeenCalledTimes(2);
    expect(
      await screen.findByRole('region', { name: '리스트형 공지 목록' }),
    ).toBeInTheDocument();
    const listRegion = screen.getByRole('region', {
      name: '리스트형 공지 목록',
    });
    expect(within(listRegion).getByText('기존 공지')).toBeInTheDocument();
    expect(within(listRegion).getByText('관리자')).toBeInTheDocument();
  });

  it('shows pinned notices separately when there are no ordinary notices', async () => {
    noticeServiceMocks.fetchNoticePosts.mockResolvedValue({
      resultList: [],
      resultCnt: 0,
    });
    noticeServiceMocks.fetchPinnedNoticePosts.mockResolvedValue({
      resultList: [{
        ...detail,
        postId: 77,
        title: '고정 전용 공지',
        isPinned: 'Y',
      }],
      resultCnt: 1,
    });

    renderPage();

    const pinnedRegion = await screen.findByRole('region', {
      name: '상단 고정 공지',
    });
    expect(within(pinnedRegion).getByText('고정 전용 공지')).toBeInTheDocument();
    expect(screen.getByText('아직 등록된 공지가 없습니다.')).toBeInTheDocument();
    expect(noticeServiceMocks.fetchNoticePosts).toHaveBeenCalledWith(
      1,
      20,
      '',
      undefined,
      'N',
    );
  });

  it.each(['feed', 'list'] as const)(
    'uses the shared 20-item pagination in %s mode',
    async (mode) => {
      vi.stubGlobal('IntersectionObserver', ImmediateIntersectionObserver);
      noticeServiceMocks.fetchNoticePosts.mockImplementation(
        (page: number) =>
          Promise.resolve({
            resultList:
              page === 1
                ? [{
                    ...detail,
                    postId: 1,
                    title: '공지 1',
                    isPinned: 'N',
                  }]
                : [{
                    ...detail,
                    postId: 2,
                    title: '공지 2',
                    isPinned: 'N',
                  }],
            resultCnt: 2,
          }),
      );
      noticeServiceMocks.fetchPinnedNoticePosts.mockResolvedValue({
        resultList: [],
        resultCnt: 0,
      });

      renderPage();
      await screen.findByTestId('notice-feed-list');

      if (mode === 'list') {
        noticeServiceMocks.fetchNoticePosts.mockClear();
        fireEvent.click(screen.getByRole('button', { name: '리스트형 보기' }));
        await screen.findByRole('region', { name: '리스트형 공지 목록' });
      }

      await waitFor(() => {
        expect(
          noticeServiceMocks.fetchNoticePosts.mock.calls.some(
            ([page, size, , , isPinned]) =>
              page === 2 && size === 20 && isPinned === 'N',
          ),
        ).toBe(true);
      });

      expect(
        noticeServiceMocks.fetchNoticePosts.mock.calls[0],
      ).toEqual([1, 20, '', undefined, 'N']);
    },
  );

  it('shows the list skeleton while the list view reloads', async () => {
    let resolveReload: (posts: []) => void = () => undefined;
    noticeServiceMocks.fetchNoticePosts
      .mockResolvedValueOnce([
        {
          ...detail,
          postId: 1,
          title: '기존 공지',
        },
      ])
      .mockReturnValueOnce(
        new Promise<[]>((resolve) => {
          resolveReload = resolve;
        }),
      );

    renderPage();
    const feedList = await screen.findByTestId('notice-feed-list');
    expect(within(feedList).getByText('기존 공지')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '리스트형 보기' }));

    expect(await screen.findByTestId('list-view-skeleton')).toBeInTheDocument();

    await act(async () => {
      resolveReload([]);
    });
  });

  it('shows a centered retry button after an initial notice API failure', async () => {
    noticeServiceMocks.fetchNoticePosts.mockRejectedValueOnce(
      new Error('network failure'),
    );

    renderPage();

    const retryButton = await screen.findByRole('button', {
      name: '공지사항 다시 불러오기',
    });

    expect(
      screen.queryByTestId('notice-feed-skeleton'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/공지사항 목록을 불러오지 못했습니다/),
    ).not.toBeInTheDocument();
    expect(retryButton).toBeInTheDocument();
  });

  it('reloads the notice list when the retry button is clicked', async () => {
    noticeServiceMocks.fetchNoticePosts
      .mockRejectedValueOnce(new Error('network failure'))
      .mockResolvedValueOnce([
        {
          ...detail,
          postId: 2,
          title: '재조회된 공지',
        },
      ]);

    renderPage();

    fireEvent.click(
      await screen.findByRole('button', { name: '공지사항 다시 불러오기' }),
    );

    expect(screen.getByTestId('notice-feed-skeleton')).toBeInTheDocument();
    expect(noticeServiceMocks.fetchNoticePosts).toHaveBeenCalledTimes(2);
    expect(await screen.findByText('재조회된 공지')).toBeInTheDocument();
  });

  it('appends a new root comment to the end to match server ordering', () => {
    const comments = [
      {
        id: 1,
        author: '기존 댓글',
        time: '현재',
        content: '기존 댓글 내용',
        replies: [],
      },
      {
        id: 2,
        author: '이전 댓글',
        time: '현재',
        content: '이전 댓글 내용',
        replies: [],
      },
    ];
    const newComment = {
      id: 3,
      author: '새 댓글',
      time: '현재',
      content: '새 댓글 내용',
      replies: [],
    };

    const result = appendCommentToTree(comments, undefined, newComment);

    expect(result.map((comment) => comment.id)).toEqual([1, 2, 3]);
  });

  it('inserts a reply directly after its target without adding display depth', () => {
    const comments = [
      {
        id: 1,
        author: '원댓글',
        time: '현재',
        content: '원댓글 내용',
        replies: [
          {
            id: 11,
            author: '첫 답글',
            time: '현재',
            content: '첫 답글 내용',
            replies: [],
          },
          {
            id: 12,
            author: '두 번째 답글',
            time: '현재',
            content: '두 번째 답글 내용',
            replies: [],
          },
        ],
      },
    ];
    const newReply = {
      id: 13,
      author: '새 답글',
      time: '현재',
      content: '새 답글 내용',
      replies: [],
    };

    const result = insertNoticeReplyAfter(comments, 11, newReply);

    expect(result[0].replies?.map((reply) => reply.id)).toEqual([11, 13, 12]);
    expect(
      result[0].replies?.every((reply) => reply.replies?.length === 0),
    ).toBe(true);
  });

  it('uses comments from the integrated detail response without fetching comments per post', async () => {
    renderPage();

    expect(
      await screen.findByText('서버가 내려준 댓글', {}, { timeout: 3000 }),
    ).toBeInTheDocument();
    expect(noticeServiceMocks.fetchNoticePostDetail).not.toHaveBeenCalled();
    expect(commentServiceMocks.fetchCommonComments).not.toHaveBeenCalled();
    expect(screen.getByText('목록 첨부.pdf')).toBeInTheDocument();
  });

  it('removes only the deleted notice without reloading the notice list', async () => {
    renderPage();

    expect(
      await screen.findByText('기존 공지', {}, { timeout: 3000 }),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: /공지 메뉴 기존 공지/i }),
    );
    fireEvent.click(screen.getByRole('menuitem', { name: '공지 삭제' }));

    await waitFor(() => {
      expect(screen.queryByText('기존 공지')).not.toBeInTheDocument();
    });
    expect(noticeServiceMocks.deleteNoticePost).toHaveBeenCalledWith(1);
    expect(noticeServiceMocks.fetchNoticePosts).toHaveBeenCalledTimes(1);
  });

  it('refreshes the created notice using the server list order', async () => {
    noticeServiceMocks.fetchNoticePosts
      .mockResolvedValueOnce([
        {
          ...detail,
          postId: 1,
          title: '기존 공지',
        },
      ])
      .mockResolvedValueOnce([
        {
          ...detail,
          postId: 2,
          title: '새 공지',
        },
        {
          ...detail,
          postId: 1,
          title: '기존 공지',
        },
      ]);
    renderPage();

    expect(
      await screen.findByText('기존 공지', {}, { timeout: 3000 }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /새 공지 작성/i }));
    fireEvent.change(screen.getByLabelText('제목'), {
      target: { value: '새 공지' },
    });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => {
      expect(screen.getByText('새 공지')).toBeInTheDocument();
    });
    expect(noticeServiceMocks.createNoticePost).toHaveBeenCalledTimes(1);
    expect(noticeServiceMocks.fetchNoticePosts).toHaveBeenCalledTimes(2);
    expect(noticeServiceMocks.fetchNoticePosts.mock.results).toHaveLength(2);
  });

  it('clears the notice composer title after a successful save', async () => {
    renderPage();

    expect(
      await screen.findByText('기존 공지', {}, { timeout: 3000 }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /새 공지 작성/i }));
    fireEvent.change(screen.getByLabelText('제목'), {
      target: { value: '초기화할 제목' },
    });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /새 공지 작성/i }));
    expect(screen.getByLabelText('제목')).toHaveValue('');
  });

  it('cleans up already uploaded notice files when a later upload fails', async () => {
    noticeServiceMocks.uploadNoticeAttachment
      .mockResolvedValueOnce({ boardFileId: 201, fileName: '첫 파일.txt' })
      .mockRejectedValueOnce(new Error('second upload failed'));
    noticeServiceMocks.deleteNoticeAttachment.mockResolvedValue(undefined);
    renderPage();

    expect(
      await screen.findByText('기존 공지', {}, { timeout: 3000 }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /새 공지 작성/i }));
    fireEvent.change(screen.getByLabelText('제목'), {
      target: { value: '첨부 rollback 공지' },
    });
    const input = screen.getByLabelText('첨부 파일 선택');
    fireEvent.change(input, {
      target: {
        files: [
          new File(['one'], 'one.txt', { type: 'text/plain' }),
          new File(['two'], 'two.txt', { type: 'text/plain' }),
        ],
      },
    });
    expect(await screen.findByText('one.txt')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() =>
      expect(noticeServiceMocks.deleteNoticeAttachment).toHaveBeenCalledWith(
        201,
        2,
      ),
    );
    expect(
      screen.getByText('공지사항 저장에 실패했습니다.'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('제목')).toHaveValue('첨부 rollback 공지');
    expect(screen.getByRole('button', { name: '저장' })).toBeInTheDocument();
  });

  it('replaces the updated notice without reloading the notice list', async () => {
    renderPage();

    expect(
      await screen.findByText('기존 공지', {}, { timeout: 3000 }),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: /공지 메뉴 기존 공지/i }),
    );
    fireEvent.click(screen.getByRole('menuitem', { name: '공지 수정' }));
    const titleInput = await screen.findByLabelText('제목');
    fireEvent.change(titleInput, { target: { value: '수정 공지' } });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => {
      expect(screen.getByText('수정 공지')).toBeInTheDocument();
    });
    expect(noticeServiceMocks.updateNoticePost).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ title: '수정 공지', isPinned: 'Y' }),
    );
    expect(noticeServiceMocks.fetchNoticePosts).toHaveBeenCalledTimes(1);
  });

  it('deletes only an explicitly removed existing attachment while updating a notice', async () => {
    noticeServiceMocks.fetchNoticePosts.mockResolvedValueOnce([
      {
        ...detail,
        attachments: [
          { boardFileId: 101, fileName: '삭제할 파일.pdf', fileSize: 12 },
          { boardFileId: 102, fileName: '유지할 파일.pdf', fileSize: 24 },
        ],
      },
    ]);
    noticeServiceMocks.fetchNoticePostDetail.mockResolvedValue({
      ...detail,
      attachments: [
        { boardFileId: 101, fileName: '삭제할 파일.pdf', fileSize: 12 },
        { boardFileId: 102, fileName: '유지할 파일.pdf', fileSize: 24 },
      ],
    });
    noticeServiceMocks.deleteNoticeAttachment.mockResolvedValueOnce(undefined);

    renderPage();

    expect(
      await screen.findByText('기존 공지', {}, { timeout: 3000 }),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: /공지 메뉴 기존 공지/i }),
    );
    fireEvent.click(screen.getByRole('menuitem', { name: '공지 수정' }));

    expect(
      (await screen.findAllByText('삭제할 파일.pdf')).length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText('유지할 파일.pdf').length).toBeGreaterThan(0);
    const removedAttachmentCard = screen
      .getAllByText('삭제할 파일.pdf')
      .at(-1)
      ?.closest('[data-file-card="true"]');
    expect(removedAttachmentCard).not.toBeNull();
    fireEvent.click(
      within(removedAttachmentCard as HTMLElement).getByRole('button', {
        name: '첨부 파일 삭제',
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => {
      expect(noticeServiceMocks.deleteNoticeAttachment).toHaveBeenCalledWith(
        101,
        1,
      );
    });
    expect(noticeServiceMocks.deleteNoticeAttachment).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('삭제할 파일.pdf')).not.toBeInTheDocument();
    expect(screen.getAllByText('유지할 파일.pdf').length).toBeGreaterThan(0);
  });

  it('keeps the notice state and edit dialog open when attachment deletion fails', async () => {
    noticeServiceMocks.fetchNoticePosts.mockResolvedValueOnce([
      {
        ...detail,
        attachments: [
          { boardFileId: 101, fileName: '삭제 실패 파일.pdf', fileSize: 12 },
        ],
      },
    ]);
    noticeServiceMocks.fetchNoticePostDetail.mockResolvedValue({
      ...detail,
      attachments: [
        { boardFileId: 101, fileName: '삭제 실패 파일.pdf', fileSize: 12 },
      ],
    });
    noticeServiceMocks.deleteNoticeAttachment.mockRejectedValueOnce(
      new Error('attachment delete failed'),
    );

    renderPage();

    expect(
      await screen.findByText('기존 공지', {}, { timeout: 3000 }),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: /공지 메뉴 기존 공지/i }),
    );
    fireEvent.click(screen.getByRole('menuitem', { name: '공지 수정' }));
    expect(
      (await screen.findAllByText('삭제 실패 파일.pdf')).length,
    ).toBeGreaterThan(0);
    const failedAttachmentCard = screen
      .getAllByText('삭제 실패 파일.pdf')
      .at(-1)
      ?.closest('[data-file-card="true"]');
    expect(failedAttachmentCard).not.toBeNull();
    fireEvent.click(
      within(failedAttachmentCard as HTMLElement).getByRole('button', {
        name: '첨부 파일 삭제',
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => {
      expect(
        screen.getByText('공지사항 첨부파일 삭제에 실패했습니다.'),
      ).toBeInTheDocument();
    });
    expect(noticeServiceMocks.deleteNoticeAttachment).toHaveBeenCalledWith(
      101,
      1,
    );
    expect(screen.getByRole('button', { name: '저장' })).toBeInTheDocument();
    expect(screen.getByText('기존 공지')).toBeInTheDocument();
  });

  it('updates the local comment tree without reloading the notice list', async () => {
    renderPage();

    expect(
      await screen.findByText('서버가 내려준 댓글', {}, { timeout: 3000 }),
    ).toBeInTheDocument();
    const input = screen.getByRole('textbox', { name: '댓글 입력' });
    fireEvent.input(input, { target: { innerHTML: '<p>새 댓글</p>' } });
    fireEvent.click(screen.getByRole('button', { name: '등록' }));

    await waitFor(() => {
      expect(commentServiceMocks.createCommonComment).toHaveBeenCalledWith(
        'NOTICE',
        1,
        '<p>새 댓글</p>',
        undefined,
      );
    });
    expect(screen.getByText('새 댓글')).toBeInTheDocument();
    expect(noticeServiceMocks.fetchNoticePosts).toHaveBeenCalledTimes(1);
    expect(commentServiceMocks.fetchCommonComments).not.toHaveBeenCalled();
  });

  it('shows a newly created root within the capped visible comments and increments the server count', async () => {
    noticeServiceMocks.fetchNoticePosts.mockResolvedValueOnce([
      {
        ...detail,
        comments: [
          { commentId: 10, writerName: '첫 작성자', content: '첫 댓글' },
          { commentId: 9, writerName: '둘째 작성자', content: '둘째 댓글' },
          { commentId: 8, writerName: '셋째 작성자', content: '셋째 댓글' },
        ],
        commentCount: 5,
      },
    ]);
    commentServiceMocks.createCommonComment.mockResolvedValueOnce({
      commentId: 11,
      writerName: '나',
      content: '새 댓글',
    });

    renderPage();
    expect(
      await screen.findByRole(
        'textbox',
        { name: '댓글 입력' },
        { timeout: 3000 },
      ),
    ).toBeInTheDocument();
    const input = screen.getByRole('textbox', { name: '댓글 입력' });
    fireEvent.input(input, { target: { innerHTML: '<p>새 댓글</p>' } });
    fireEvent.click(screen.getByRole('button', { name: '등록' }));

    await waitFor(() => {
      expect(screen.getByText('새 댓글')).toBeInTheDocument();
      expect(screen.getByText('댓글 6')).toBeInTheDocument();
    });
  });

  it('keeps loaded previous comments before a newly created root comment', async () => {
    const loadedPrevious = [
      { id: 0, author: '이전 작성자', time: '어제', content: '이전 댓글' },
    ];
    const currentComments = [
      { id: 3, author: '셋째 작성자', time: '오늘', content: '셋째 댓글' },
      { id: 2, author: '둘째 작성자', time: '오늘', content: '둘째 댓글' },
      { id: 1, author: '첫째 작성자', time: '오늘', content: '첫째 댓글' },
    ];
    const newlyCreated = {
      id: 4,
      author: '나',
      time: '지금',
      content: '새 댓글',
    };

    const afterPreviousLoad = mergeCommentTrees(
      currentComments,
      loadedPrevious,
    );
    const afterServerUpdate = mergeCommentTrees(
      loadedPrevious,
      [...currentComments, newlyCreated],
      false,
    );

    expect(afterPreviousLoad.map((comment) => comment.id)).toEqual([
      0, 3, 2, 1,
    ]);
    expect(afterServerUpdate.map((comment) => comment.id)).toEqual([
      0, 3, 2, 1, 4,
    ]);
  });

  it('increments the server count for a locally created reply', async () => {
    commentServiceMocks.createCommonComment.mockResolvedValueOnce({
      commentId: 11,
      writerName: '나',
      content: '새 답글',
      parentCommentId: 10,
    });
    renderPage();

    expect(
      await screen.findByRole(
        'textbox',
        { name: '댓글 입력' },
        { timeout: 3000 },
      ),
    ).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: '답글' })[0]);
    const input = screen.getByRole('textbox', { name: '답글 입력' });
    fireEvent.input(input, { target: { innerHTML: '<p>새 답글</p>' } });
    fireEvent.click(screen.getByRole('button', { name: '답글 등록' }));

    await waitFor(() => {
      expect(screen.getByText('새 답글')).toBeInTheDocument();
      expect(screen.getByText('댓글 2')).toBeInTheDocument();
    });
  });

  it('keeps all loaded notice comments and the remaining count after creating a comment', async () => {
    const onLoadPreviousComments = vi
      .fn()
      .mockResolvedValueOnce({
        comments: [
          { id: 20, author: '이전 작성자', time: '어제', content: '이전 댓글' },
        ],
        hasPrevious: true,
        nextBeforeCommentId: 20,
      })
      .mockResolvedValueOnce({
        comments: [
          { id: 10, author: '더 이전 작성자', time: '그제', content: '더 이전 댓글' },
        ],
        hasPrevious: false,
        nextBeforeCommentId: null,
      });
    const newestComment = {
      id: 31,
      author: '나',
      time: '지금',
      content: '<p>방금 등록한 댓글</p>',
    };
    const initialItem = {
      ...noticeFeed[0],
      comments: [
        {
          id: 30,
          author: '작성자 30',
          time: '오늘',
          content: '최신 댓글 1',
          replies: [
            {
              id: 301,
              author: '답글 작성자',
              time: '오늘',
              content: '기존 답글',
            },
          ],
        },
        { id: 29, author: '작성자 29', time: '오늘', content: '최신 댓글 2' },
        { id: 28, author: '작성자 28', time: '오늘', content: '최신 댓글 3' },
      ],
      commentCount: 6,
      hasPreviousComments: true,
      nextBeforeCommentId: 28,
    };
    const onAddComment = vi.fn();

    function StatefulNoticeFeed() {
      const [items, setItems] = useState([initialItem]);
      return (
        <NoticeFeedList
          items={items}
          isDark={false}
          expandedNoticeId={initialItem.id}
          onLoadPreviousComments={onLoadPreviousComments}
          onAddComment={async (_noticeId, content, parentCommentId) => {
            const created =
              parentCommentId == null
                ? { ...newestComment, content }
                : {
                    id: 32,
                    author: '나',
                    time: '지금',
                    content,
                    replies: [],
                  };
            onAddComment(content, parentCommentId);
            setItems((current) =>
              current.map((item) =>
                item.id === initialItem.id
                  ? {
                      ...item,
                      comments: appendCommentToTree(
                        item.comments ?? [],
                        parentCommentId,
                        created,
                      ),
                      commentCount: item.commentCount + 1,
                    }
                  : item,
              ),
            );
            return created;
          }}
        />
      );
    }

    render(<StatefulNoticeFeed />);

    fireEvent.click(
      screen.getByRole('button', { name: '이전 댓글 보기 (2)' }),
    );
    expect(await screen.findByText('이전 댓글')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '이전 댓글 보기 (1)' }),
    ).toBeInTheDocument();

    const input = screen.getByRole('textbox', { name: '댓글 입력' });
    fireEvent.input(input, { target: { innerHTML: '<p>방금 등록한 댓글</p>' } });
    fireEvent.click(screen.getByRole('button', { name: '등록' }));

    await waitFor(() => expect(onAddComment).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('방금 등록한 댓글')).toBeInTheDocument();
    expect(screen.getAllByText('방금 등록한 댓글')).toHaveLength(1);
    expect(screen.getByText('이전 댓글')).toBeInTheDocument();
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: '이전 댓글 보기 (1)' }),
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByRole('button', { name: '답글' })[0]);
    const replyInput = await screen.findByRole('textbox', {
      name: '답글 입력',
    });
    fireEvent.input(replyInput, {
      target: { innerHTML: '<p>방금 등록한 답글</p>' },
    });
    fireEvent.click(screen.getByRole('button', { name: '답글 등록' }));

    await waitFor(() => expect(onAddComment).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('방금 등록한 답글')).toBeInTheDocument();
    expect(screen.getByText('이전 댓글')).toBeInTheDocument();
    expect(screen.getByText('방금 등록한 댓글')).toBeInTheDocument();
    expect(onAddComment).toHaveBeenCalledTimes(2);
    expect(
      screen.getByRole('button', { name: '이전 댓글 보기 (1)' }),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: '이전 댓글 보기 (1)' }),
    );
    expect(await screen.findByText('더 이전 댓글')).toBeInTheDocument();
    expect(onLoadPreviousComments).toHaveBeenLastCalledWith(1, 20);
  });

  it('renders a reply immediately when its parent was loaded from previous comments', async () => {
    const onLoadPreviousComments = vi.fn().mockResolvedValueOnce({
      comments: [
        {
          id: 7,
          author: '더 이전 작성자',
          time: '방금',
          content: '더 이전 댓글',
        },
      ],
      hasPrevious: false,
      nextBeforeCommentId: null,
    });
    const onAddComment = vi.fn().mockResolvedValue({
      id: 12,
      author: '나',
      time: '방금',
      content: '이전 댓글의 답글',
      replies: [],
    });

    render(
      <ThemeProvider theme={createTheme()}>
        <NoticeFeedList
          items={[
            {
              ...noticeFeed[0],
              comments: [
                {
                  id: 10,
                  author: '현재 작성자',
                  time: '방금',
                  content: '현재 댓글',
                },
                {
                  id: 9,
                  author: '이전 작성자',
                  time: '방금',
                  content: '이전 댓글1',
                },
                {
                  id: 8,
                  author: '오래된 작성자',
                  time: '방금',
                  content: '이전 댓글2',
                },
              ],
              commentCount: 4,
              hasPreviousComments: true,
              nextBeforeCommentId: 7,
            },
          ]}
          isDark={false}
          onLoadPreviousComments={onLoadPreviousComments}
          onAddComment={onAddComment}
        />
      </ThemeProvider>,
    );

    fireEvent.click(
      await screen.findByRole('button', { name: /^이전 댓글 보기/ }),
    );
    expect(await screen.findByText('더 이전 댓글')).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: '답글' })[0]);
    const replyInput = await screen.findByRole('textbox', {
      name: '답글 입력',
    });
    fireEvent.input(replyInput, {
      target: { innerHTML: '<p>이전 댓글의 답글</p>' },
    });
    fireEvent.click(screen.getByRole('button', { name: '답글 등록' }));

    await waitFor(() =>
      expect(
        screen.queryByRole('textbox', { name: '답글 입력' }),
      ).not.toBeInTheDocument(),
    );
    expect(screen.getByText('이전 댓글의 답글')).toBeInTheDocument();
  });

  it('sends the clicked nested reply as the server parent while keeping display depth flat', async () => {
    const onAddComment = vi.fn().mockResolvedValue(undefined);

    render(
      <NoticeFeedList
        items={[noticeFeed[0]]}
        isDark={false}
        expandedNoticeId={noticeFeed[0].id}
        onToggleExpand={() => undefined}
        onToggleLike={() => undefined}
        onToggleBookmark={() => undefined}
        onAddComment={onAddComment}
        onDelete={() => undefined}
        onEdit={() => undefined}
        onDownload={() => undefined}
      />,
    );

    fireEvent.click(screen.getAllByRole('button', { name: /^답글$/i })[1]);
    const input = await screen.findByLabelText(/답글 입력/i);
    fireEvent.input(input, { target: { innerHTML: '<p>중첩 답글</p>' } });
    fireEvent.click(screen.getByRole('button', { name: /^답글 등록$/i }));

    await waitFor(() => {
      expect(onAddComment).toHaveBeenCalledWith(
        noticeFeed[0].id,
        '<p>중첩 답글</p>',
        2,
        [],
        2,
      );
    });
  });

  it('shows notice comment image previews separately and opens the existing viewer', async () => {
    const imageUrl = 'blob:notice-comment-image';
    vi.mocked(URL.createObjectURL).mockReturnValue(imageUrl);
    commentServiceMocks.fetchCommonFileBlob.mockResolvedValue(
      new Blob(['image'], { type: 'image/png' }),
    );
    const item = {
      ...noticeFeed[0],
      id: 301,
      comments: [
        {
          id: 31,
          author: '작성자',
          time: '2026-10-20 10:00',
          content: '공지 댓글',
          attachments: [
            {
              id: '91',
              name: 'photo.png',
              size: 123,
              mimeType: 'image/png',
            },
          ],
        },
      ],
      commentCount: 1,
      hasPreviousComments: true,
    };

    const { unmount } = render(
      <NoticeFeedList
        items={[item]}
        isDark={false}
        expandedNoticeId={item.id}
        onLoadPreviousComments={vi.fn()}
      />,
    );

    const attachmentLists = await screen.findAllByTestId(
      'notice-attachment-list',
    );
    const attachmentList = attachmentLists.find((element) =>
      within(element).queryByText('photo.png'),
    );
    expect(attachmentList).toBeDefined();
    expect(within(attachmentList).getByText('photo.png')).toBeInTheDocument();
    expect(within(attachmentList).queryByRole('img')).not.toBeInTheDocument();
    expect(
      await screen.findByRole('button', {
        name: '댓글 이미지 미리보기 1: photo.png',
      }),
    ).toBeInTheDocument();
    expect(commentServiceMocks.fetchCommonFileBlob).toHaveBeenCalledWith(
      'NOTICE_COMMENT',
      31,
      '91',
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: '댓글 이미지 미리보기 1: photo.png',
      }),
    );
    const viewer = screen.getByRole('dialog');
    expect(within(viewer).getByRole('img', { name: 'photo.png' })).toHaveAttribute(
      'src',
      imageUrl,
    );
    expect(commentServiceMocks.fetchCommonComments).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: '이미지 뷰어 닫기' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(imageUrl);
  }, 20000);

  it('keeps notice comment image files downloadable and reports preview failures', async () => {
    commentServiceMocks.fetchCommonFileBlob.mockRejectedValue(
      new Error('image request failed'),
    );
    const onDownloadCommentAttachment = vi.fn();
    const item = {
      ...noticeFeed[0],
      id: 302,
      comments: [
        {
          id: 32,
          author: '작성자',
          time: '2026-10-20 10:00',
          content: '미리보기 실패 댓글',
          attachments: [
            {
              id: '92',
              name: 'failed.png',
              size: 123,
              mimeType: 'image/png',
            },
          ],
        },
      ],
      commentCount: 1,
    };

    render(
      <NoticeFeedList
        items={[item]}
        isDark={false}
        expandedNoticeId={item.id}
        onDownloadCommentAttachment={onDownloadCommentAttachment}
      />,
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '이미지 미리보기를 불러오지 못했습니다.',
    );
    const attachmentList = screen
      .getAllByTestId('notice-attachment-list')
      .find((element) => within(element).queryByText('failed.png'));
    if (!attachmentList) throw new Error('Comment attachment list was not rendered.');
    expect(within(attachmentList).getByText('failed.png')).toBeInTheDocument();
    fireEvent.click(
      within(attachmentList).getByRole('button', {
        name: '첨부 파일 다운로드',
      }),
    );
    expect(onDownloadCommentAttachment).toHaveBeenCalledWith(
      32,
      '92',
      'failed.png',
    );
  });

  it('loads the remaining older comments in one larger batch when expanding the thread', async () => {
    noticeServiceMocks.fetchNoticePosts.mockResolvedValueOnce([
      {
        ...detail,
        postId: 1,
        title: '이전 댓글 배치 조회 테스트',
        comments: [
          { commentId: 10, writerName: '현재 작성자', content: '현재 댓글' },
          { commentId: 9, writerName: '이전 작성자', content: '이전 댓글1' },
          { commentId: 8, writerName: '오래된 작성자', content: '이전 댓글2' },
        ],
        commentCount: 3,
        hasPreviousComments: true,
        nextBeforeCommentId: 7,
      },
    ]);
    commentServiceMocks.fetchCommonComments.mockResolvedValueOnce({
      comments: [
        { commentId: 7, writerName: '더 이전 작성자', content: '더 이전 댓글' },
      ],
      hasPrevious: false,
      nextBeforeCommentId: null,
    });

    renderPage();

    fireEvent.click(
      await screen.findByRole('button', { name: /^이전 댓글 보기/ }),
    );

    await waitFor(() => {
      expect(commentServiceMocks.fetchCommonComments).toHaveBeenCalledWith(
        'NOTICE',
        1,
        expect.objectContaining({
          limit: 100,
          beforeCommentId: 7,
        }),
      );
    });
  });

  it('keeps the continued previous-comment cursor across local comment CRUD', async () => {
    const loadPreviousComments = vi
      .fn()
      .mockResolvedValueOnce({
        comments: [
          {
            id: 7,
            author: '이전 작성자',
            time: '방금',
            content: '처음 불러온 이전 댓글',
          },
        ],
        hasPrevious: true,
        nextBeforeCommentId: 4,
      })
      .mockResolvedValueOnce({
        comments: [
          {
            id: 3,
            author: '더 이전 작성자',
            time: '방금',
            content: '계속 불러온 이전 댓글',
          },
        ],
        hasPrevious: false,
        nextBeforeCommentId: null,
      });

    function CursorHarness() {
      const [items, setItems] = useState<NoticeFeedItem[]>([
        {
          id: 1,
          title: '공지',
          meta: '관리자 · 방금',
          state: '공지',
          summary: '공지',
          body: '공지',
          comments: [
            {
              id: 10,
              author: '작성자',
              time: '방금',
              content: '현재 댓글',
            },
          ],
          commentCount: 3,
          hasPreviousComments: true,
          nextBeforeCommentId: 8,
          isPinned: 'N',
        },
      ]);

      return (
        <NoticeFeedList
          items={items}
          isDark={false}
          onLoadPreviousComments={loadPreviousComments}
          onAddComment={async () => {
            setItems((current) =>
              current.map((item) => ({
                ...item,
                comments: [
                  ...(item.comments ?? []),
                  {
                    id: 11,
                    author: '나',
                    time: '방금',
                    content: '새 댓글',
                  },
                ],
              })),
            );
          }}
          onEditComment={async () => {
            setItems((current) =>
              current.map((item) => ({
                ...item,
                comments: (item.comments ?? []).map((comment) =>
                  comment.id === 10
                    ? { ...comment, content: '수정된 댓글' }
                    : comment,
                ),
              })),
            );
          }}
          onDeleteComment={async () => {
            setItems((current) =>
              current.map((item) => ({
                ...item,
                comments: (item.comments ?? []).filter(
                  (comment) => comment.id !== 11,
                ),
              })),
            );
          }}
        />
      );
    }

    render(
      <ThemeProvider theme={createTheme()}>
        <CursorHarness />
      </ThemeProvider>,
    );

    expect(
      await screen.findByRole('button', { name: '댓글 메뉴 작성자' }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^이전 댓글 보기/ }));
    expect(
      await screen.findByText('처음 불러온 이전 댓글'),
    ).toBeInTheDocument();

    const composer = screen.getByRole('textbox', { name: '댓글 입력' });
    fireEvent.input(composer, { target: { innerHTML: '<p>새 댓글</p>' } });
    fireEvent.click(screen.getByRole('button', { name: '등록' }));
    await waitFor(() =>
      expect(screen.getByText('새 댓글')).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole('button', { name: '댓글 메뉴 작성자' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '수정' }));
    const editInput = await screen.findByRole('textbox', {
      name: '댓글 수정 입력',
    });
    fireEvent.input(editInput, { target: { innerHTML: '<p>수정된 댓글</p>' } });
    fireEvent.click(screen.getByRole('button', { name: '수정' }));
    await waitFor(() =>
      expect(screen.getByText('수정된 댓글')).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole('button', { name: '댓글 메뉴 나' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '삭제' }));
    await waitFor(() =>
      expect(screen.queryByText('새 댓글')).not.toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole('button', { name: /^이전 댓글 보기/ }));
    await waitFor(() =>
      expect(loadPreviousComments).toHaveBeenNthCalledWith(2, 1, 4),
    );
    expect(screen.getByText('계속 불러온 이전 댓글')).toBeInTheDocument();
    expect(screen.getAllByText('처음 불러온 이전 댓글')).toHaveLength(1);
  }, 15000);

  it('cleans up already uploaded comment files when a later upload fails', async () => {
    commentServiceMocks.uploadCommonFile
      .mockResolvedValueOnce({ fileId: 301, fileName: '첫 댓글 파일.txt' })
      .mockRejectedValueOnce(new Error('second upload failed'));
    renderPage();

    expect(
      await screen.findByText('서버가 내려준 댓글', {}, { timeout: 3000 }),
    ).toBeInTheDocument();
    const input = screen.getByRole('textbox', { name: '댓글 입력' });
    fireEvent.input(input, { target: { innerHTML: '<p>댓글</p>' } });
    fireEvent.change(screen.getByLabelText('댓글 첨부파일 선택'), {
      target: {
        files: [
          new File(['one'], 'comment-one.txt', { type: 'text/plain' }),
          new File(['two'], 'comment-two.txt', { type: 'text/plain' }),
        ],
      },
    });
    expect(await screen.findByText('comment-one.txt')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '등록' }));

    await waitFor(() =>
      expect(commentServiceMocks.deleteCommonFile).toHaveBeenCalledWith(
        'NOTICE_COMMENT',
        11,
        301,
      ),
    );
  });

  it('shows a newly created comment even when the list already has three comments', async () => {
    noticeServiceMocks.fetchNoticePosts.mockResolvedValueOnce([
      {
        ...detail,
        comments: [
          { commentId: 10, writerName: '첫 댓글', content: '첫 댓글' },
          { commentId: 11, writerName: '둘째 댓글', content: '둘째 댓글' },
          { commentId: 12, writerName: '셋째 댓글', content: '셋째 댓글' },
        ],
      },
    ]);
    commentServiceMocks.createCommonComment.mockResolvedValueOnce({
      commentId: 13,
      writerName: '나',
      content: '새 댓글',
    });
    renderPage();

    expect(
      (await screen.findAllByText('셋째 댓글', {}, { timeout: 3000 })).length,
    ).toBeGreaterThan(0);

    const input = screen.getByRole('textbox', { name: '댓글 입력' });
    fireEvent.input(input, { target: { innerHTML: '<p>새 댓글</p>' } });
    fireEvent.click(screen.getByRole('button', { name: '등록' }));

    await waitFor(() => {
      expect(screen.getByText('새 댓글')).toBeInTheDocument();
    });
  });

  it('keeps the comment draft and does not render a failed comment', async () => {
    commentServiceMocks.createCommonComment.mockRejectedValueOnce(
      new Error('comment failed'),
    );
    renderPage();

    expect(
      await screen.findByText('서버가 내려준 댓글', {}, { timeout: 3000 }),
    ).toBeInTheDocument();
    const input = screen.getByRole('textbox', { name: '댓글 입력' });
    fireEvent.input(input, { target: { innerHTML: '<p>저장 실패 댓글</p>' } });
    fireEvent.click(screen.getByRole('button', { name: '등록' }));

    await waitFor(() => {
      expect(commentServiceMocks.createCommonComment).toHaveBeenCalled();
      expect(screen.getByText('댓글 저장에 실패했습니다.')).toBeInTheDocument();
    });
    expect(input.innerHTML).toContain('저장 실패 댓글');
  });

  it('keeps a failed reply draft without rendering the reply', async () => {
    commentServiceMocks.createCommonComment.mockRejectedValueOnce(
      new Error('reply failed'),
    );
    renderPage();

    expect(
      await screen.findByText('서버가 내려준 댓글', {}, { timeout: 3000 }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '답글' }));
    const replyInput = screen.getByRole('textbox', { name: '답글 입력' });
    fireEvent.input(replyInput, {
      target: { innerHTML: '<p>저장 실패 답글</p>' },
    });
    fireEvent.click(screen.getByRole('button', { name: '답글 등록' }));

    await waitFor(() => {
      expect(commentServiceMocks.createCommonComment).toHaveBeenCalledWith(
        'NOTICE',
        1,
        '<p>저장 실패 답글</p>',
        10,
      );
      expect(screen.getByText('답글 저장에 실패했습니다.')).toBeInTheDocument();
    });
    expect(replyInput.innerHTML).toContain('저장 실패 답글');
  });

  it('keeps the previous comment content when an update fails', async () => {
    commentServiceMocks.updateCommonComment.mockRejectedValueOnce(
      new Error('update failed'),
    );
    renderPage();

    expect(
      await screen.findByText('서버가 내려준 댓글', {}, { timeout: 3000 }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '댓글 메뉴 작성자' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '수정' }));
    const editInput = await screen.findByRole('textbox', {
      name: '댓글 수정 입력',
    });
    fireEvent.input(editInput, {
      target: { innerHTML: '<p>수정 실패 댓글</p>' },
    });
    fireEvent.click(screen.getByRole('button', { name: '수정' }));

    await waitFor(() => {
      expect(commentServiceMocks.updateCommonComment).toHaveBeenCalled();
    });
    expect(screen.getByText('서버가 내려준 댓글')).toBeInTheDocument();
    expect(editInput.innerHTML).toContain('수정 실패 댓글');
  });

  it('removes a deleted comment attachment from local state after success', async () => {
    noticeServiceMocks.fetchNoticePosts.mockResolvedValueOnce([
      {
        ...detail,
        comments: [
          {
            commentId: 10,
            writerName: '작성자',
            content: '첨부 댓글',
            attachments: [{ fileId: 'file-1', fileName: '자료.pdf' }],
          },
        ],
      },
    ]);
    commentServiceMocks.deleteCommonFile.mockResolvedValueOnce(undefined);
    renderPage();

    expect(
      await screen.findByText('첨부 댓글', {}, { timeout: 3000 }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '댓글 메뉴 작성자' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '수정' }));
    fireEvent.click(screen.getByRole('button', { name: '첨부 파일 삭제' }));

    await waitFor(() => {
      expect(commentServiceMocks.deleteCommonFile).toHaveBeenCalledWith(
        'NOTICE_COMMENT',
        10,
        'file-1',
      );
    });
    expect(screen.queryByText('자료.pdf')).not.toBeInTheDocument();
  });

  it('keeps a comment attachment and shows an error when deletion fails', async () => {
    noticeServiceMocks.fetchNoticePosts.mockResolvedValueOnce([
      {
        ...detail,
        comments: [
          {
            commentId: 10,
            writerName: '작성자',
            content: '첨부 댓글',
            attachments: [{ fileId: 'file-1', fileName: '자료.pdf' }],
          },
        ],
      },
    ]);
    commentServiceMocks.deleteCommonFile.mockRejectedValueOnce(
      new Error('attachment delete failed'),
    );
    renderPage();

    expect(
      await screen.findByText('첨부 댓글', {}, { timeout: 3000 }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '댓글 메뉴 작성자' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '수정' }));
    fireEvent.click(screen.getByRole('button', { name: '첨부 파일 삭제' }));

    await waitFor(() => {
      expect(
        screen.getByText('댓글 첨부파일 삭제에 실패했습니다.'),
      ).toBeInTheDocument();
    });
    expect(screen.getByText('자료.pdf')).toBeInTheDocument();
  });

  it('preserves replies when their parent comment is deleted', async () => {
    noticeServiceMocks.fetchNoticePosts.mockResolvedValueOnce([
      {
        ...detail,
        comments: [
          {
            commentId: 10,
            writerName: '작성자',
            content: '부모 댓글',
          },
          {
            commentId: 11,
            parentCommentId: 10,
            writerName: '답글 작성자',
            content: '보존할 답글',
          },
        ],
        commentCount: 2,
      },
    ]);
    renderPage();

    expect(
      await screen.findByText('보존할 답글', {}, { timeout: 3000 }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '댓글 메뉴 작성자' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '삭제' }));

    await waitFor(() => {
      expect(commentServiceMocks.deleteCommonComment).toHaveBeenCalledWith(
        'NOTICE',
        1,
        10,
      );
    });
    expect(screen.getByText('[삭제된 댓글입니다.]')).toBeInTheDocument();
    expect(screen.getByText('보존할 답글')).toBeInTheDocument();
    expect(screen.getByText('댓글 1')).toBeInTheDocument();
  });

  it('keeps the notice when notice deletion fails', async () => {
    noticeServiceMocks.deleteNoticePost.mockRejectedValueOnce(
      new Error('notice delete failed'),
    );
    renderPage();

    expect(
      await screen.findByText('기존 공지', {}, { timeout: 3000 }),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: /공지 메뉴 기존 공지/i }),
    );
    fireEvent.click(screen.getByRole('menuitem', { name: '공지 삭제' }));

    await waitFor(() => {
      expect(noticeServiceMocks.deleteNoticePost).toHaveBeenCalledWith(1);
    });
    expect(screen.getByText('기존 공지')).toBeInTheDocument();
    expect(screen.getByText('공지 삭제에 실패했습니다.')).toBeInTheDocument();
  });
});

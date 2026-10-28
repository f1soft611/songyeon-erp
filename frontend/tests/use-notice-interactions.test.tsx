import { act, renderHook } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { NoticeFeedItem } from '../src/pages/groupware/community/notice/types/community.types';
import { useNoticeInteractions } from '../src/pages/groupware/community/notice/hooks/useNoticeInteractions';

const notice: NoticeFeedItem = {
  id: 1,
  title: '공지',
  meta: '운영팀 · 날짜 · 조회 0',
  state: '공지',
  summary: '본문',
  body: '본문',
  commentCount: 0,
  liked: false,
  likeCount: 2,
  bookmarked: false,
};

const apiMocks = vi.hoisted(() => ({
  fetchNoticePostDetail: vi.fn(),
}));

vi.mock(
  '../src/pages/groupware/community/notice/services/noticeBoardService',
  () => apiMocks,
);

describe('useNoticeInteractions', () => {
  it('updates likes and bookmarks optimistically and reports both actions', () => {
    const showSuccess = vi.fn();
    const { result } = renderHook(() => {
      const [noticeItems, setNoticeItems] = useState([notice]);
      const interactions = useNoticeInteractions({
        setNoticeItems,
        setPinnedNoticeItems: () => undefined,
        noticeGubunNamesRef: { current: new Map() },
        showError: vi.fn(),
        showSuccess,
      });
      return { noticeItems, interactions };
    });

    act(() => result.current.interactions.handleToggleLike(1));
    expect(result.current.noticeItems[0].liked).toBe(true);
    expect(result.current.noticeItems[0].likeCount).toBe(3);

    act(() => result.current.interactions.handleToggleBookmark(1));
    expect(result.current.noticeItems[0].bookmarked).toBe(true);
    expect(showSuccess).toHaveBeenCalledTimes(2);
  });

  it('loads a selected notice detail while preserving local reaction state', async () => {
    apiMocks.fetchNoticePostDetail.mockResolvedValue({
      postId: 1,
      title: '상세 제목',
      contentsHtml: '<p>상세 본문</p>',
      comments: [],
    });
    const { result } = renderHook(() => {
      const [noticeItems, setNoticeItems] = useState([notice]);
      const [pinnedNoticeItems, setPinnedNoticeItems] = useState<
        NoticeFeedItem[]
      >([]);
      const interactions = useNoticeInteractions({
        noticeItems,
        pinnedNoticeItems,
        setNoticeItems,
        setPinnedNoticeItems,
        noticeGubunNamesRef: { current: new Map() },
        showError: vi.fn(),
        showSuccess: vi.fn(),
      });
      return { noticeItems, pinnedNoticeItems, interactions };
    });

    await act(async () => {
      await result.current.interactions.handleSelectNotice({ id: 1 });
    });

    expect(result.current.interactions.selectedNoticeId).toBe(1);
    expect(result.current.interactions.selectedNotice?.title).toBe('상세 제목');
    expect(result.current.noticeItems[0].liked).toBe(false);
    expect(result.current.noticeItems[0].likeCount).toBe(2);
    expect(apiMocks.fetchNoticePostDetail).toHaveBeenCalledWith(1);
  });
});

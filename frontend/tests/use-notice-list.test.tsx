import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const serviceMocks = vi.hoisted(() => ({
  fetchNoticePosts: vi.fn(),
  fetchPinnedNoticePosts: vi.fn(),
}));

vi.mock(
  '../src/pages/groupware/community/notice/services/noticeBoardService',
  () => serviceMocks,
);

import { useNoticeList } from '../src/pages/groupware/community/notice/hooks/useNoticeList';

describe('useNoticeList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    serviceMocks.fetchNoticePosts.mockResolvedValue({
      resultList: [{ postId: 3 }],
      resultCnt: 1,
    });
    serviceMocks.fetchPinnedNoticePosts.mockResolvedValue({
      resultList: [{ postId: 2 }],
      resultCnt: 1,
    });
  });

  it('loads pinned and regular posts using the active category filter', async () => {
    const { result } = renderHook(() =>
      useNoticeList({ selectedNoticeFilter: 'OPS' }),
    );

    await act(async () => {
      await result.current.loadNoticePosts();
    });

    await waitFor(() => expect(result.current.isInitialLoading).toBe(false));
    expect(serviceMocks.fetchNoticePosts).toHaveBeenCalledWith(
      1,
      20,
      '',
      'OPS',
      'N',
    );
    expect(serviceMocks.fetchPinnedNoticePosts).toHaveBeenCalledWith(
      1,
      20,
      '',
      'OPS',
    );
    expect(result.current.noticeItems.map((item) => item.id)).toEqual([3]);
    expect(result.current.pinnedNoticeItems.map((item) => item.id)).toEqual([
      2,
    ]);
    expect(result.current.pinnedNoticeCount).toBe(1);
    expect(result.current.serverItemRevision).toBe(1);
  });

  it('loads every pinned page before publishing the complete pinned set', async () => {
    let resolveLastPage!: (response: {
      resultList: Array<{ postId: number }>;
      resultCnt: number;
    }) => void;
    serviceMocks.fetchPinnedNoticePosts.mockImplementation(
      (page: number) => {
        if (page === 1) {
          return Promise.resolve({
            resultList: Array.from({ length: 20 }, (_, index) => ({
              postId: index + 1,
            })),
            resultCnt: 45,
          });
        }
        if (page === 2) {
          return Promise.resolve({
            resultList: Array.from({ length: 20 }, (_, index) => ({
              postId: index + 21,
            })),
            resultCnt: 45,
          });
        }
        return new Promise((resolve) => {
          resolveLastPage = resolve;
        });
      },
    );

    const { result } = renderHook(() =>
      useNoticeList({ selectedNoticeFilter: 'OPS' }),
    );
    let loadPromise!: Promise<void>;
    act(() => {
      loadPromise = result.current.loadNoticePosts();
    });

    await waitFor(() =>
      expect(serviceMocks.fetchPinnedNoticePosts).toHaveBeenCalledTimes(3),
    );
    expect(result.current.pinnedNoticeItems).toEqual([]);

    await act(async () => {
      resolveLastPage({
        resultList: Array.from({ length: 5 }, (_, index) => ({
          postId: index + 41,
        })),
        resultCnt: 45,
      });
      await loadPromise;
    });

    expect(result.current.pinnedNoticeItems).toHaveLength(45);
    expect(result.current.pinnedNoticeCount).toBe(45);
    expect(serviceMocks.fetchPinnedNoticePosts).toHaveBeenNthCalledWith(
      2,
      2,
      20,
      '',
      'OPS',
    );
    expect(serviceMocks.fetchPinnedNoticePosts).toHaveBeenNthCalledWith(
      3,
      3,
      20,
      '',
      'OPS',
    );
  });

  it('appends the next ordinary page and prevents duplicate in-flight requests', async () => {
    serviceMocks.fetchNoticePosts
      .mockResolvedValueOnce({
        resultList: Array.from({ length: 20 }, (_, index) => ({
          postId: index + 1,
        })),
        resultCnt: 25,
      })
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            window.setTimeout(
              () =>
                resolve({
                  resultList: Array.from({ length: 5 }, (_, index) => ({
                    postId: index + 21,
                  })),
                  resultCnt: 25,
                }),
              0,
            );
          }),
      );

    const { result } = renderHook(() =>
      useNoticeList({ selectedNoticeFilter: '' }),
    );
    await act(async () => {
      await result.current.loadNoticePosts();
    });

    expect(result.current.noticeHasMore).toBe(true);
    await act(async () => {
      await Promise.all([
        result.current.loadMoreNoticePosts(),
        result.current.loadMoreNoticePosts(),
      ]);
    });

    expect(serviceMocks.fetchNoticePosts).toHaveBeenCalledTimes(2);
    expect(serviceMocks.fetchNoticePosts).toHaveBeenLastCalledWith(
      2,
      20,
      '',
      undefined,
      'N',
    );
    expect(result.current.noticeItems).toHaveLength(25);
    expect(result.current.noticeHasMore).toBe(false);
  });

  it('preserves loaded notices and retries the failed ordinary page', async () => {
    serviceMocks.fetchNoticePosts
      .mockResolvedValueOnce({
        resultList: Array.from({ length: 20 }, (_, index) => ({
          postId: index + 1,
        })),
        resultCnt: 25,
      })
      .mockRejectedValueOnce(new Error('page unavailable'))
      .mockResolvedValueOnce({
        resultList: Array.from({ length: 5 }, (_, index) => ({
          postId: index + 21,
        })),
        resultCnt: 25,
      });

    const { result } = renderHook(() =>
      useNoticeList({ selectedNoticeFilter: '' }),
    );
    await act(async () => {
      await result.current.loadNoticePosts();
    });
    await act(async () => {
      await result.current.loadMoreNoticePosts();
    });

    expect(result.current.noticeItems).toHaveLength(20);
    expect(result.current.pageError).toBe('page unavailable');
    await act(async () => {
      await result.current.retryLoadMoreNoticePosts();
    });

    expect(serviceMocks.fetchNoticePosts).toHaveBeenLastCalledWith(
      2,
      20,
      '',
      undefined,
      'N',
    );
    expect(result.current.noticeItems).toHaveLength(25);
    expect(result.current.pageError).toBe('');
  });

  it('ignores an older list response after a newer category load', async () => {
    let resolveOldList!: (response: {
      resultList: Array<{ postId: number }>;
      resultCnt: number;
    }) => void;
    serviceMocks.fetchNoticePosts.mockImplementation(
      (_page: number, _size: number, _keyword: string, category: string) =>
        category === 'OLD'
          ? new Promise((resolve) => {
              resolveOldList = resolve;
            })
          : Promise.resolve({
              resultList: [{ postId: 22 }],
              resultCnt: 1,
            }),
    );
    serviceMocks.fetchPinnedNoticePosts.mockResolvedValue({
      resultList: [],
      resultCnt: 0,
    });

    const { result, rerender } = renderHook(
      ({ category }) => useNoticeList({ selectedNoticeFilter: category }),
      { initialProps: { category: 'OLD' } },
    );
    let oldLoad!: Promise<void>;
    act(() => {
      oldLoad = result.current.loadNoticePosts();
    });
    rerender({ category: 'NEW' });
    await act(async () => {
      await result.current.loadNoticePosts();
    });

    await act(async () => {
      resolveOldList({
        resultList: [{ postId: 11 }],
        resultCnt: 1,
      });
      await oldLoad;
    });

    expect(result.current.noticeItems.map((item) => item.id)).toEqual([22]);
  });
});

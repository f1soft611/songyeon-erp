import { useCallback, useRef, useState } from 'react';
import { useInitialLoadState } from '../../../../../shared/hooks/useInitialLoadState';
import {
  fetchNoticePosts,
  fetchPinnedNoticePosts,
} from '../services/noticeBoardService';
import type { NoticeBoardPostApi } from '../types/community.types';
import type { NoticeFeedItem } from '../types/community.types';
import { mapNoticePost } from '../data/noticePostAdapter';

type UseNoticeListOptions = {
  selectedNoticeFilter: string;
  noticeGubunNamesRef?: { current: Map<string, string> };
};

const noticeFailureMessage =
  '공지사항 목록을 불러오지 못했습니다.\n잠시 후 다시 시도해 주세요.';

function normalizeNoticeListResponse(
  response:
    | NoticeBoardPostApi[]
    | { resultList?: NoticeBoardPostApi[]; resultCnt?: number }
    | null
    | undefined,
) {
  if (Array.isArray(response)) {
    return { resultList: response, resultCnt: response.length };
  }
  return {
    resultList: response?.resultList ?? [],
    resultCnt: Number(response?.resultCnt ?? 0) || 0,
  };
}

export function useNoticeList({
  selectedNoticeFilter,
  noticeGubunNamesRef,
}: UseNoticeListOptions) {
  const [noticeItems, setNoticeItems] = useState<NoticeFeedItem[]>([]);
  const [pinnedNoticeItems, setPinnedNoticeItems] = useState<NoticeFeedItem[]>(
    [],
  );
  const [pinnedNoticeCount, setPinnedNoticeCount] = useState(0);
  const [noticePage, setNoticePage] = useState(1);
  const [noticeHasMore, setNoticeHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [serverItemRevision, setServerItemRevision] = useState(0);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pageError, setPageError] = useState('');
  const requestGeneration = useRef(0);
  const inFlightPage = useRef<number | null>(null);
  const { start, succeed, fail, ...initialLoad } = useInitialLoadState();

  const mapPost = useCallback(
    (post: NoticeBoardPostApi) =>
      mapNoticePost(post, noticeGubunNamesRef?.current),
    [noticeGubunNamesRef],
  );

  const loadAllPinnedPosts = useCallback(async () => {
    const pinnedPosts: NoticeFeedItem[] = [];
    const seenIds = new Set<number>();
    let totalCount = 0;
    let page = 1;

    while (pinnedPosts.length < totalCount || page === 1) {
      const response = normalizeNoticeListResponse(
        await fetchPinnedNoticePosts(
          page,
          20,
          '',
          selectedNoticeFilter || undefined,
        ),
      );
      if (page === 1) {
        totalCount = response.resultCnt;
      }

      const nextPageItems = response.resultList.map(mapPost).filter((item) => {
        if (seenIds.has(item.id)) return false;
        seenIds.add(item.id);
        return true;
      });
      if (pinnedPosts.length < totalCount && nextPageItems.length === 0) {
        throw new Error('상단 고정 공지 목록을 완전히 불러오지 못했습니다.');
      }

      nextPageItems.forEach((item) => {
        pinnedPosts.push(item);
      });
      page += 1;
    }

    return { items: pinnedPosts, totalCount };
  }, [mapPost, selectedNoticeFilter]);

  const loadNoticePosts = useCallback(
    async ({
      silent = false,
      quiet = false,
    }: { silent?: boolean; quiet?: boolean } = {}) => {
      const generation = requestGeneration.current + 1;
      start();
      requestGeneration.current = generation;
      inFlightPage.current = null;
      setNoticePage(1);
      setNoticeHasMore(false);
      setIsLoadingMore(false);
      setPageError('');

      if (silent && !quiet) {
        setIsRefreshing(true);
      } else if (!silent) {
        setIsInitialLoading(true);
      }
      setErrorMessage(null);

      try {
        const [postsResponse, pinnedPosts] = await Promise.all([
          fetchNoticePosts(
            1,
            20,
            '',
            selectedNoticeFilter || undefined,
            'N',
          ),
          loadAllPinnedPosts(),
        ]);
        if (generation !== requestGeneration.current) return;
        succeed();
        const posts = normalizeNoticeListResponse(postsResponse);
        setNoticeItems(posts.resultList.map(mapPost));
        setPinnedNoticeItems(pinnedPosts.items);
        setPinnedNoticeCount(pinnedPosts.totalCount);
        setNoticePage(1);
        setNoticeHasMore(posts.resultList.length < posts.resultCnt);
        setServerItemRevision((revision) => revision + 1);
      } catch (cause) {
        if (generation === requestGeneration.current) {
          fail(cause);
          setErrorMessage(noticeFailureMessage);
        }
      } finally {
        if (generation === requestGeneration.current) {
          if (silent && !quiet) {
            setIsRefreshing(false);
          } else if (!silent) {
            setIsInitialLoading(false);
          }
        }
      }
    },
    [loadAllPinnedPosts, mapPost, start, succeed, fail],
  );

  const requestNoticePage = useCallback(
    async (isRetry = false) => {
      const page = noticePage + 1;
      const generation = requestGeneration.current;
      if (
        isLoadingMore ||
        inFlightPage.current !== null ||
        !noticeHasMore ||
        isInitialLoading ||
        (pageError && !isRetry)
      ) {
        return;
      }

      inFlightPage.current = page;
      setIsLoadingMore(true);
      if (isRetry) setPageError('');

      try {
        const response = normalizeNoticeListResponse(
          await fetchNoticePosts(
            page,
            20,
            '',
            selectedNoticeFilter || undefined,
            'N',
          ),
        );
        if (generation !== requestGeneration.current) return;

        const currentIds = new Set(noticeItems.map((item) => item.id));
        const pageIds = new Set(currentIds);
        const nextPageItems = response.resultList.map(mapPost).filter((item) => {
          if (pageIds.has(item.id)) return false;
          pageIds.add(item.id);
          return true;
        });
        if (
          noticeItems.length < response.resultCnt &&
          nextPageItems.length === 0
        ) {
          throw new Error('다음 공지 페이지에 새 항목이 없습니다.');
        }

        setNoticeItems((current) => {
          const currentIds = new Set(current.map((item) => item.id));
          return [
            ...current,
            ...nextPageItems.filter((item) => !currentIds.has(item.id)),
          ];
        });
        setNoticePage(page);
        setNoticeHasMore(
          noticeItems.length + nextPageItems.length < response.resultCnt,
        );
      } catch (error: unknown) {
        if (generation === requestGeneration.current) {
          setPageError(
            error instanceof Error
              ? error.message
              : '다음 공지 페이지를 불러오지 못했습니다.',
          );
        }
      } finally {
        if (
          generation === requestGeneration.current &&
          inFlightPage.current === page
        ) {
          inFlightPage.current = null;
          setIsLoadingMore(false);
        }
      }
    },
    [
      isInitialLoading,
      isLoadingMore,
      mapPost,
      noticeHasMore,
      noticeItems,
      noticePage,
      pageError,
      selectedNoticeFilter,
    ],
  );

  const loadMoreNoticePosts = useCallback(
    () => requestNoticePage(),
    [requestNoticePage],
  );
  const retryLoadMoreNoticePosts = useCallback(
    () => requestNoticePage(true),
    [requestNoticePage],
  );

  return {
    initialLoad,
    noticeItems,
    setNoticeItems,
    pinnedNoticeItems,
    setPinnedNoticeItems,
    pinnedNoticeCount,
    noticePage,
    noticeHasMore,
    isLoadingMore,
    pageError,
    serverItemRevision,
    setServerItemRevision,
    isInitialLoading,
    isRefreshing,
    errorMessage,
    setErrorMessage,
    loadNoticePosts,
    loadMoreNoticePosts,
    retryLoadMoreNoticePosts,
  };
}

import { useCallback, useMemo, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { fetchNoticePostDetail } from '../services/noticeBoardService';
import { mapNoticePost } from '../data/noticePostAdapter';
import type { NoticeFeedItem } from '../types/community.types';

type UseNoticeInteractionsOptions = {
  noticeItems?: NoticeFeedItem[];
  setNoticeItems: Dispatch<SetStateAction<NoticeFeedItem[]>>;
  pinnedNoticeItems?: NoticeFeedItem[];
  setPinnedNoticeItems?: Dispatch<SetStateAction<NoticeFeedItem[]>>;
  noticeGubunNamesRef?: { current: Map<string, string> };
  showError: (message: string) => void;
  showSuccess: (message: string) => void;
};

export function useNoticeInteractions({
  noticeItems = [],
  setNoticeItems,
  pinnedNoticeItems = [],
  setPinnedNoticeItems,
  noticeGubunNamesRef,
  showError,
  showSuccess,
}: UseNoticeInteractionsOptions) {
  const [expandedNoticeId, setExpandedNoticeId] = useState<number | null>(null);
  const [selectedNoticeId, setSelectedNoticeId] = useState<number | null>(null);
  const [selectedNoticeLoadingId, setSelectedNoticeLoadingId] = useState<
    number | null
  >(null);
  const noticeDetailRequests = useRef(new Map<number, Promise<void>>());
  const selectedNotice = useMemo(
    () =>
      [...noticeItems, ...pinnedNoticeItems].find(
        (item) => item.id === selectedNoticeId,
      ) ?? null,
    [noticeItems, pinnedNoticeItems, selectedNoticeId],
  );

  const loadNoticeDetail = useCallback(
    (noticeId: number, expand: boolean) => {
      const pendingRequest = noticeDetailRequests.current.get(noticeId);
      if (pendingRequest) {
        if (expand) setExpandedNoticeId(noticeId);
        return pendingRequest;
      }
      if (expand) setExpandedNoticeId(noticeId);
      const request = Promise.resolve()
        .then(() => fetchNoticePostDetail(noticeId))
        .then((detail) => {
          const detailItem = mapNoticePost(detail, noticeGubunNamesRef?.current);
          const mergeDetail = (item: NoticeFeedItem) => ({
            ...item,
            ...detailItem,
            liked: item.liked,
            likeCount: item.likeCount,
            bookmarked: item.bookmarked,
          });
          setNoticeItems((current) =>
            current.map((item) =>
              item.id === noticeId ? mergeDetail(item) : item,
            ),
          );
          setPinnedNoticeItems?.((current) =>
            current.map((item) =>
              item.id === noticeId ? mergeDetail(item) : item,
            ),
          );
        })
        .catch(() => {
          showError('공지사항 상세 정보를 불러오지 못했습니다.');
        })
        .finally(() => {
          noticeDetailRequests.current.delete(noticeId);
        });
      noticeDetailRequests.current.set(noticeId, request);
      return request;
    },
    [noticeGubunNamesRef, setNoticeItems, setPinnedNoticeItems, showError],
  );

  const handleToggleNoticeExpand = useCallback(
    async (noticeId: number) => {
      if (expandedNoticeId === noticeId) {
        setExpandedNoticeId(null);
        return;
      }
      await loadNoticeDetail(noticeId, true);
    },
    [expandedNoticeId, loadNoticeDetail],
  );

  const handleNoticeInteract = useCallback(
    async (noticeId: number) => loadNoticeDetail(noticeId, false),
    [loadNoticeDetail],
  );

  const handleSelectNotice = useCallback(
    async (item: { id: string | number }) => {
      const noticeId = Number(item.id);
      if (!noticeId) return;
      setSelectedNoticeId(noticeId);
      setSelectedNoticeLoadingId(noticeId);
      try {
        await loadNoticeDetail(noticeId, true);
      } finally {
        setSelectedNoticeLoadingId((current) =>
          current === noticeId ? null : current,
        );
      }
    },
    [loadNoticeDetail],
  );

  const handleCloseNoticeDetail = useCallback(() => {
    setSelectedNoticeId(null);
    setSelectedNoticeLoadingId(null);
  }, []);

  const handleToggleLike = useCallback(
    (noticeId: number) => {
      setNoticeItems((current) =>
        current.map((item) => {
          if (item.id !== noticeId) return item;
          const nextLiked = !item.liked;
          return {
            ...item,
            liked: nextLiked,
            likeCount: Math.max(
              0,
              (item.likeCount ?? 0) + (nextLiked ? 1 : -1),
            ),
          };
        }),
      );
      showSuccess('좋아요 상태가 반영되었습니다.');
    },
    [setNoticeItems, showSuccess],
  );

  const handleToggleBookmark = useCallback(
    (noticeId: number) => {
      setNoticeItems((current) =>
        current.map((item) =>
          item.id === noticeId
            ? { ...item, bookmarked: !item.bookmarked }
            : item,
        ),
      );
      showSuccess('북마크 상태가 반영되었습니다.');
    },
    [setNoticeItems, showSuccess],
  );

  return {
    expandedNoticeId,
    selectedNoticeId,
    selectedNoticeLoadingId,
    selectedNotice,
    handleToggleLike,
    handleToggleBookmark,
    handleToggleNoticeExpand,
    handleNoticeInteract,
    handleSelectNotice,
    handleCloseNoticeDetail,
  };
}

import ArchiveOutlined from '@mui/icons-material/ArchiveOutlined';
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined';
import MailOutlineOutlined from '@mui/icons-material/MailOutlineOutlined';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  Tooltip,
} from '@mui/material';
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useNotification } from '../../../shared/context/NotificationContext';
import { useRealtimeRefresh } from '../../../shared/hooks/useRealtimeRefresh';
import {
  archiveNotification,
  archiveReadNotifications,
  listNotifications,
  markNotificationRead,
} from '../../../shared/services/notificationService';
import type {
  NotificationEventType,
  NotificationItem,
} from '../../../shared/types/notification.types';
import { resolveNotificationPath as notificationPath } from '../../../shared/utils/notificationPath';
import {
  InboxEmptyState,
  InboxFilterToggle,
  InboxListItem,
  InboxPageShell,
  InboxPanel,
} from '../shared/components/InboxPageLayout';

type NotificationFilter = 'ALL' | 'UNREAD';
type NotificationTypeFilter = 'ALL' | NotificationEventType;

const notificationTypeIndicators: Record<NotificationEventType, { label: string; icon: ReactNode }> = {
  APPROVAL_COMMENT_MENTION: {
    label: '문서 멘션',
    icon: <DescriptionOutlined fontSize="small" />,
  },
  DIRECT_MESSAGE_RECEIVED: {
    label: '새 쪽지',
    icon: <MailOutlineOutlined fontSize="small" />,
  },
};

export function NotificationInboxPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showError, showSuccess } = useNotification();
  const [filter, setFilter] = useState<NotificationFilter>('ALL');
  const [typeFilter, setTypeFilter] = useState<NotificationTypeFilter>('ALL');
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [cursor, setCursor] = useState<number | null>(null);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [archivingId, setArchivingId] = useState<number | null>(null);
  const [archivingRead, setArchivingRead] = useState(false);
  const [confirmArchiveRead, setConfirmArchiveRead] = useState(false);
  const filters = useRef({ filter, typeFilter });
  const requestId = useRef(0);
  const loadedCount = useRef(20);
  const processedPushQuery = useRef<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const pushIds = params.getAll('pushNotificationId');
    if (pushIds.length === 0) {
      processedPushQuery.current = null;
      return;
    }
    if (processedPushQuery.current === location.search) return;
    processedPushQuery.current = location.search;

    const consumePushQuery = () => {
      const nextParams = new URLSearchParams(location.search);
      nextParams.delete('pushNotificationId');
      const query = nextParams.toString();
      navigate({
        pathname: location.pathname,
        search: query ? `?${query}` : '',
        hash: '',
      }, { replace: true });
    };

    if (pushIds.length !== 1 || !/^\d+$/.test(pushIds[0])) {
      consumePushQuery();
      return;
    }
    const notificationId = Number(pushIds[0]);
    if (!Number.isSafeInteger(notificationId) || notificationId <= 0) {
      consumePushQuery();
      return;
    }

    let active = true;
    markNotificationRead(notificationId)
      .then((item) => {
        if (!active) return;
        const path = notificationPath(item);
        if (path) navigate(path, { replace: true });
        else consumePushQuery();
      })
      .catch(() => {
        if (active) consumePushQuery();
      });
    return () => { active = false; };
  }, [location.pathname, location.search, navigate]);

  useLayoutEffect(() => {
    filters.current = { filter, typeFilter };
    loadedCount.current = Math.max(20, items.length);
  }, [filter, typeFilter, items.length]);

  const load = useCallback(async (beforeNotificationId?: number, append = false) => {
    const activeRequestId = ++requestId.current;
    const currentFilters = filters.current;
    if (append) setLoadingMore(true);
    else setLoading(true);
    setError('');
    try {
      const page = await listNotifications({
        limit: 20,
        beforeNotificationId,
        unreadOnly: currentFilters.filter === 'UNREAD',
        eventType: currentFilters.typeFilter === 'ALL' ? undefined : currentFilters.typeFilter,
      });
      if (activeRequestId !== requestId.current) return;
      setItems((current) => append ? [...current, ...page.resultList] : page.resultList);
      setHasNext(page.hasNext);
      setCursor(page.nextBeforeNotificationId);
    } catch {
      if (activeRequestId === requestId.current) {
        setError('알림함을 불러오지 못했습니다.');
      }
    } finally {
      if (activeRequestId === requestId.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, []);

  useEffect(() => {
    setItems([]);
    setCursor(null);
    void load();
    return () => {
      requestId.current += 1;
    };
  }, [filter, typeFilter, load]);

  useRealtimeRefresh('NOTIFICATION', async () => {
    const activeRequestId = ++requestId.current;
    const currentFilters = filters.current;
    const targetCount = loadedCount.current;
    try {
      const nextItems: NotificationItem[] = [];
      let beforeNotificationId: number | undefined;
      let hasNext = false;
      let nextCursor: number | null = null;
      do {
        const page = await listNotifications({
          limit: 20, beforeNotificationId,
          unreadOnly: currentFilters.filter === 'UNREAD',
          eventType: currentFilters.typeFilter === 'ALL' ? undefined : currentFilters.typeFilter,
        });
        if (activeRequestId !== requestId.current) return;
        nextItems.push(...page.resultList);
        hasNext = page.hasNext;
        nextCursor = page.nextBeforeNotificationId;
        beforeNotificationId = nextCursor ?? undefined;
      } while (hasNext && beforeNotificationId !== undefined && nextItems.length < targetCount);
      setItems(nextItems);
      setHasNext(hasNext);
      setCursor(nextCursor);
      setError('');
    } finally {
      if (activeRequestId === requestId.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  });

  const selectItem = async (item: NotificationItem) => {
    if (item.readAt === null) {
      try {
        const updated = await markNotificationRead(item.notificationId);
        requestId.current += 1;
        setLoading(false);
        setLoadingMore(false);
        setItems((current) => current.map((entry) =>
          entry.notificationId === item.notificationId ? updated : entry));
      } catch {
        showError('알림을 읽음 처리하지 못했습니다.');
      }
    }
    const path = notificationPath(item);
    if (path === null) {
      showError('알림 원본 정보를 확인할 수 없습니다.');
      return;
    }
    navigate(path);
  };

  const hideItem = async (item: NotificationItem) => {
    setArchivingId(item.notificationId);
    try {
      await archiveNotification(item.notificationId);
      requestId.current += 1;
      setLoading(false);
      setLoadingMore(false);
      setItems((current) => current.filter((entry) => entry.notificationId !== item.notificationId));
      showSuccess('알림을 목록에서 숨겼습니다.');
    } catch {
      showError('알림을 숨기지 못했습니다.');
    } finally {
      setArchivingId(null);
    }
  };

  const hideReadNotifications = async () => {
    setArchivingRead(true);
    try {
      const { archivedCount } = await archiveReadNotifications(
        typeFilter === 'ALL' ? undefined : typeFilter,
      );
      setConfirmArchiveRead(false);
      showSuccess(`${archivedCount}건의 읽은 알림을 정리했습니다.`);
      await load();
    } catch {
      showError('읽은 알림을 정리하지 못했습니다.');
    } finally {
      setArchivingRead(false);
    }
  };

  return (
    <InboxPageShell
      title="알림함"
      description="업무 멘션과 쪽지 알림을 확인하고 정리합니다."
      toolbar={
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <InboxFilterToggle
              value={filter}
              ariaLabel="알림 필터"
              options={[{ value: 'ALL', label: '전체' }, { value: 'UNREAD', label: '읽지 않음' }]}
              onChange={setFilter}
            />
            <InboxFilterToggle
              value={typeFilter}
              ariaLabel="알림 구분"
              options={[
                { value: 'ALL', label: '전체 유형' },
                { value: 'APPROVAL_COMMENT_MENTION', label: '문서 멘션' },
                { value: 'DIRECT_MESSAGE_RECEIVED', label: '새 쪽지' },
              ]}
              onChange={setTypeFilter}
            />
          </Box>
          <Button
            variant="outlined"
            size="small"
            disabled={filter === 'UNREAD' || archivingRead || archivingId !== null}
            onClick={() => setConfirmArchiveRead(true)}
          >
            읽은 알림 정리
          </Button>
        </Box>
      }
    >
      {error ? (
        <Alert severity="error" action={<Button color="inherit" size="small" onClick={() => void load()}>다시 시도</Button>}>
          {error}
        </Alert>
      ) : null}

      <InboxPanel>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress size={24} aria-label="알림함 불러오는 중" />
          </Box>
        ) : items.length === 0 && !error ? (
          <InboxEmptyState>
            {filter === 'UNREAD' ? '읽지 않은 알림이 없습니다.' : '알림이 없습니다.'}
          </InboxEmptyState>
        ) : (
          <List disablePadding>
            {items.map((item) => (
              <InboxListItem
                key={item.notificationId}
                title={item.title}
                summary={item.summary}
                dateTime={item.createdAt}
                unread={item.readAt === null}
                category={notificationTypeIndicators[item.eventType]}
                action={(
                  <Tooltip title="목록에서 숨기기">
                    <span>
                      <IconButton
                        aria-label={`알림 숨기기: ${item.title}`}
                        size="small"
                        disabled={archivingId !== null || archivingRead}
                        onClick={() => void hideItem(item)}
                      >
                        <ArchiveOutlined fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                )}
                onClick={() => void selectItem(item)}
              />
            ))}
          </List>
        )}
      </InboxPanel>

      {hasNext && !loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <Button
            variant="outlined"
            disabled={loadingMore || cursor === null}
            onClick={() => cursor !== null && void load(cursor, true)}
          >
            {loadingMore ? '불러오는 중...' : '더 보기'}
          </Button>
        </Box>
      )}
      <Dialog
        open={confirmArchiveRead}
        onClose={() => !archivingRead && setConfirmArchiveRead(false)}
        aria-labelledby="archive-read-notifications-title"
      >
        <DialogTitle id="archive-read-notifications-title">읽은 알림 정리</DialogTitle>
        <DialogContent>
          현재 선택한 알림 구분의 읽은 알림을 숨깁니다. 원본 업무 기록은 삭제되지 않습니다.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmArchiveRead(false)} disabled={archivingRead}>
            취소
          </Button>
          <Button onClick={() => void hideReadNotifications()} disabled={archivingRead} variant="contained">
            {archivingRead ? '정리 중...' : '정리'}
          </Button>
        </DialogActions>
      </Dialog>
    </InboxPageShell>
  );
}

import NotificationsOutlined from '@mui/icons-material/NotificationsOutlined';
import {
  Alert,
  Badge,
  Box,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Popover,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import { headerCounterBadgeSx } from './headerCounterBadgeSx';
import { useCallback, useEffect, useRef, useState, type MouseEvent } from 'react';
import { useRealtimeRefresh } from '../hooks/useRealtimeRefresh';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../context/NotificationContext';
import {
  getNotificationSummary,
  listNotifications,
  markNotificationRead,
} from '../services/notificationService';
import type { NotificationItem } from '../types/notification.types';
import { resolveNotificationPath as notificationPath } from '../utils/notificationPath';

export function NotificationCenter() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { showError } = useNotification();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const open = Boolean(anchor);
  const summaryRequest = useRef(0);
  const itemsRequest = useRef(0);

  const refreshSummary = useCallback(async (silent = false) => {
    const request = ++summaryRequest.current;
    try {
      const summary = await getNotificationSummary();
      if (request === summaryRequest.current) setUnreadCount(summary.unreadCount);
    } catch {
      if (!silent && request === summaryRequest.current) showError('알림 개수를 불러오지 못했습니다.');
    }
  }, [showError]);

  const refreshItems = useCallback(async (silent = false) => {
    const request = ++itemsRequest.current;
    if (!silent) {
      setLoading(true);
      setError('');
    }
    try {
      const page = await listNotifications({ limit: 5 });
      if (request === itemsRequest.current) {
        setItems(page.resultList);
        setError('');
      }
    } catch {
      if (!silent && request === itemsRequest.current) setError('최근 알림을 불러오지 못했습니다.');
    } finally {
      if (request === itemsRequest.current) setLoading(false);
    }
  }, []);
  useRealtimeRefresh('NOTIFICATION', async () => {
    await Promise.all([refreshSummary(true), ...(open ? [refreshItems(true)] : [])]);
  });
  useEffect(() => () => {
    summaryRequest.current += 1;
    itemsRequest.current += 1;
  }, []);

  useEffect(() => {
    void refreshSummary();
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void refreshSummary(true);
      }
    };
    const handleMessageRead = () => void refreshSummary(true);
    const handleNotificationArchived = () => void refreshSummary(true);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('songyeon-erp:message-read', handleMessageRead);
    window.addEventListener('songyeon-erp:notification-archived', handleNotificationArchived);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('songyeon-erp:message-read', handleMessageRead);
      window.removeEventListener('songyeon-erp:notification-archived', handleNotificationArchived);
    };
  }, [refreshSummary]);

  const handleOpen = (event: MouseEvent<HTMLElement>) => {
    setAnchor(event.currentTarget);
    void refreshItems();
    void refreshSummary();
  };

  const handleSelect = async (item: NotificationItem) => {
    setAnchor(null);
    if (item.readAt === null) {
      try {
        await markNotificationRead(item.notificationId);
        setUnreadCount((count) => Math.max(0, count - 1));
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

  const handleMore = () => {
    setAnchor(null);
    navigate('/groupware/notifications');
  };

  return (
    <>
      <Tooltip title="알림">
        <IconButton
          aria-label="notifications"
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={handleOpen}
          sx={{ color: theme.palette.text.secondary }}
        >
          <Badge badgeContent={unreadCount > 99 ? '99+' : unreadCount} color="error" sx={headerCounterBadgeSx}>
            <NotificationsOutlined fontSize="small" />
          </Badge>
        </IconButton>
      </Tooltip>
      <Popover
        open={open}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: { width: { xs: 'min(360px, calc(100vw - 24px))', sm: 380 }, maxHeight: 480 },
          },
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>알림</Typography>
          <Typography variant="caption" color="text.secondary">
            읽지 않음 {unreadCount > 99 ? '99+' : unreadCount}
          </Typography>
        </Box>
        <Divider />
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress size={24} aria-label="알림 불러오는 중" />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ m: 1 }}>{error}</Alert>
        ) : items.length === 0 ? (
          <Typography color="text.secondary" sx={{ p: 3, textAlign: 'center' }}>
            최근 알림이 없습니다.
          </Typography>
        ) : (
          <List disablePadding>
            {items.map((item) => (
              <ListItemButton
                key={item.notificationId}
                onClick={() => void handleSelect(item)}
                sx={{ alignItems: 'flex-start', bgcolor: item.readAt === null ? 'action.hover' : undefined }}
              >
                <ListItemText
                  primary={
                    <Typography component="span" sx={{ fontWeight: item.readAt === null ? 700 : 400 }}>
                      {item.title}
                    </Typography>
                  }
                  secondary={
                    <Box component="span" sx={{ display: 'block' }}>
                      <Box component="span" sx={{ display: 'block' }}>{item.summary}</Box>
                      <Box component="span" sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
                        {new Date(item.createdAt).toLocaleString()}
                      </Box>
                    </Box>
                  }
                />
              </ListItemButton>
            ))}
          </List>
        )}
        <Divider />
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 1 }}>
          <Button size="small" onClick={handleMore}>알림함 더보기</Button>
        </Box>
      </Popover>
    </>
  );
}

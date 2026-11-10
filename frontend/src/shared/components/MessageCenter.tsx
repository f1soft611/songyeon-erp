import MailOutlined from '@mui/icons-material/MailOutlined';
import { Badge, IconButton, Tooltip, useTheme } from '@mui/material';
import { headerCounterBadgeSx } from './headerCounterBadgeSx';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRealtimeRefresh } from '../hooks/useRealtimeRefresh';
import { useNavigate } from 'react-router-dom';
import { getMessageSummary } from '../../pages/groupware/messages/services/messageService';
import { useNotification } from '../context/NotificationContext';

export function MessageCenter() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { showError } = useNotification();
  const [unreadCount, setUnreadCount] = useState<number | null>(null);
  const requestId = useRef(0);

  const refresh = useCallback(async (silent = false) => {
    const request = ++requestId.current;
    try {
      const count = await getMessageSummary();
      if (request === requestId.current) setUnreadCount(count);
    } catch {
      if (!silent && request === requestId.current) showError('읽지 않은 쪽지 개수를 불러오지 못했습니다.');
    }
  }, [showError]);
  useRealtimeRefresh('MESSAGE', () => refresh(true));
  useEffect(() => () => { requestId.current += 1; }, []);

  useEffect(() => {
    void refresh();
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') void refresh(true);
    };
    const handleMessageRead = () => void refresh(true);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('songyeon-erp:message-read', handleMessageRead);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('songyeon-erp:message-read', handleMessageRead);
    };
  }, [refresh]);

  return (
    <Tooltip title="쪽지함">
      <IconButton
        aria-label="쪽지함"
        onClick={() => navigate('/groupware/messages')}
        sx={{ color: theme.palette.text.secondary }}
      >
        <Badge badgeContent={unreadCount !== null && unreadCount > 99 ? '99+' : unreadCount ?? undefined} color="error" sx={headerCounterBadgeSx}>
          <MailOutlined fontSize="small" />
        </Badge>
      </IconButton>
    </Tooltip>
  );
}

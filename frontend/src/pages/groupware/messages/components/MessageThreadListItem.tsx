import { Box, ListItemButton, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { ProfileAvatar } from '../../../../shared/components/ProfileAvatar';
import type { MessageThread } from '../types/message.types';

type MessageThreadListItemProps = {
  thread: MessageThread;
  selected: boolean;
  onClick: () => void;
  now?: Date;
};

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function formatThreadTime(value: string, now: Date = new Date()): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const dayDiff = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);
  if (dayDiff <= 0) return date.toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' });
  if (dayDiff === 1) return '어제';
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
  }
  return date.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

export function MessageThreadListItem({ thread, selected, onClick, now }: MessageThreadListItemProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const unread = thread.unreadCount > 0;
  const preview = thread.latestContent || thread.subject || '';

  return (
    <ListItemButton
      data-testid="message-thread-row"
      selected={selected}
      onClick={onClick}
      aria-label={`${thread.otherUserName} ${thread.subject ?? ''}`}
      sx={{
        gap: 1.5,
        px: 2,
        py: 1.25,
        alignItems: 'center',
        '&.Mui-selected, &.Mui-selected:hover': {
          bgcolor: alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.12 : 0.07),
        },
      }}
    >
      <ProfileAvatar
        data-testid="message-thread-avatar"
        name={thread.otherUserName}
        imageUrl={thread.otherUserProfileImage}
        fallback={thread.otherUserName.trim().charAt(0)}
        sx={{
          width: 44,
          height: 44,
          flexShrink: 0,
          bgcolor: alpha(theme.palette.primary.main, isDark ? 0.4 : 0.16),
          color: isDark ? theme.palette.primary.contrastText : theme.palette.primary.main,
          fontSize: '1rem',
          fontWeight: 700,
        }}
      />
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography
          data-testid="message-thread-name"
          noWrap
          sx={{ fontWeight: 700, fontSize: '0.92rem', lineHeight: 1.4 }}
        >
          {thread.otherUserName}
        </Typography>
        <Typography
          data-testid="message-thread-preview"
          color="text.secondary"
          sx={{
            fontSize: '0.82rem',
            lineHeight: 1.4,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            overflowWrap: 'anywhere',
          }}
        >
          {preview}
        </Typography>
      </Box>
      <Box
        sx={{
          alignSelf: 'stretch',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: 0.5,
          flexShrink: 0,
          pt: 0.25,
        }}
      >
        <Typography
          data-testid="message-thread-time"
          color="text.secondary"
          sx={{ fontSize: '0.7rem', whiteSpace: 'nowrap' }}
        >
          {formatThreadTime(thread.latestMessageAt, now)}
        </Typography>
        {unread && (
          <Box
            component="span"
            data-testid="message-thread-unread"
            aria-label={`읽지 않은 쪽지 ${thread.unreadCount}개`}
            sx={{
              minWidth: 18,
              height: 18,
              px: 0.6,
              borderRadius: 9,
              bgcolor: 'error.main',
              color: 'error.contrastText',
              fontSize: '0.68rem',
              fontWeight: 700,
              lineHeight: '18px',
              textAlign: 'center',
            }}
          >
            {thread.unreadCount > 99 ? '99+' : thread.unreadCount}
          </Box>
        )}
      </Box>
    </ListItemButton>
  );
}

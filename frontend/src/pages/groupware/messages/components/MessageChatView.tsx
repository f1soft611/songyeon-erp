import { Box, CircularProgress, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useEffect, useLayoutEffect, useRef } from 'react';
import { ProfileAvatar } from '../../../../shared/components/ProfileAvatar';
import { MessageLinkifiedText, MessageLinkPreviews } from './MessageContentLinks';
import type { DirectMessage } from '../types/message.types';

type MessageChatViewProps = {
  messages: DirectMessage[];
  otherUserId: string;
  otherUserProfileImage?: string | null;
  hasPrevious?: boolean;
  loadingPrevious?: boolean;
  onLoadPrevious?: () => void;
};

type ScrollSnapshot = {
  firstMessageId: number | undefined;
  lastMessageId: number | undefined;
  scrollHeight: number;
  scrollTop: number;
};

const LOAD_PREVIOUS_THRESHOLD_PX = 48;

type ChatRow = {
  message: DirectMessage;
  mine: boolean;
  dateLabel: string | null;
  startsGroup: boolean;
  endsGroup: boolean;
};

function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function minuteKey(date: Date): string {
  return `${localDateKey(date)} ${date.getHours()}:${date.getMinutes()}`;
}

function formatDateDivider(date: Date): string {
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });
}

function formatChatTime(date: Date): string {
  return date.toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' });
}

function buildChatRows(messages: DirectMessage[], otherUserId: string): ChatRow[] {
  return messages.map((message, index) => {
    const createdAt = new Date(message.createdAt);
    const previous = messages[index - 1];
    const next = messages[index + 1];
    const previousDate = previous ? new Date(previous.createdAt) : null;
    const nextDate = next ? new Date(next.createdAt) : null;
    const dateChanged = !previousDate || localDateKey(previousDate) !== localDateKey(createdAt);
    const sameAsPrevious = Boolean(previous && previousDate && !dateChanged
      && previous.senderUserId === message.senderUserId
      && minuteKey(previousDate) === minuteKey(createdAt));
    const sameAsNext = Boolean(next && nextDate
      && next.senderUserId === message.senderUserId
      && minuteKey(nextDate) === minuteKey(createdAt));
    return {
      message,
      mine: message.senderUserId !== otherUserId,
      dateLabel: dateChanged ? formatDateDivider(createdAt) : null,
      startsGroup: !sameAsPrevious,
      endsGroup: !sameAsNext,
    };
  });
}

export function MessageChatView({
  messages,
  otherUserId,
  otherUserProfileImage,
  hasPrevious = false,
  loadingPrevious = false,
  onLoadPrevious,
}: MessageChatViewProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const primary = theme.palette.primary;
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const snapshotRef = useRef<ScrollSnapshot | null>(null);
  const onLoadPreviousRef = useRef(onLoadPrevious);
  const rows = buildChatRows(messages, otherUserId);

  useEffect(() => {
    onLoadPreviousRef.current = onLoadPrevious;
  }, [onLoadPrevious]);

  useLayoutEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    const firstMessageId = messages[0]?.messageId;
    const lastMessageId = messages[messages.length - 1]?.messageId;
    const previous = snapshotRef.current;
    const prependedOlderDay = previous !== null
      && previous.lastMessageId === lastMessageId
      && previous.firstMessageId !== firstMessageId;
    const wasAtBottom = previous === null
      || previous.scrollHeight - previous.scrollTop - element.clientHeight <= LOAD_PREVIOUS_THRESHOLD_PX;
    element.scrollTop = prependedOlderDay
      ? element.scrollHeight - previous.scrollHeight + previous.scrollTop
      : wasAtBottom ? element.scrollHeight : previous.scrollTop;
    snapshotRef.current = {
      firstMessageId,
      lastMessageId,
      scrollHeight: element.scrollHeight,
      scrollTop: element.scrollTop,
    };
  }, [messages]);

  useEffect(() => {
    const element = scrollRef.current;
    // A short day cannot be scrolled, so keep filling the view with older days.
    if (element && hasPrevious && !loadingPrevious && element.clientHeight > 0
      && element.scrollHeight <= element.clientHeight) {
      onLoadPreviousRef.current?.();
    }
  }, [messages, hasPrevious, loadingPrevious]);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element || typeof MutationObserver === 'undefined') return undefined;
    // Link preview cards load after the initial scroll; keep the latest message visible.
    const observer = new MutationObserver(() => {
      const snapshot = snapshotRef.current;
      if (!snapshot || element.scrollHeight === snapshot.scrollHeight) return;
      const wasAtBottom = snapshot.scrollHeight - snapshot.scrollTop - element.clientHeight
        <= LOAD_PREVIOUS_THRESHOLD_PX;
      if (wasAtBottom) element.scrollTop = element.scrollHeight;
      snapshotRef.current = { ...snapshot, scrollHeight: element.scrollHeight, scrollTop: element.scrollTop };
    });
    observer.observe(element, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, []);

  const handleScroll = () => {
    const element = scrollRef.current;
    if (!element) return;
    if (snapshotRef.current) {
      snapshotRef.current = {
        ...snapshotRef.current,
        scrollHeight: element.scrollHeight,
        scrollTop: element.scrollTop,
      };
    }
    if (hasPrevious && !loadingPrevious && element.scrollTop <= LOAD_PREVIOUS_THRESHOLD_PX) {
      onLoadPrevious?.();
    }
  };

  const sentBubble = primary.main;
  const receivedBubble = theme.palette.background.paper;
  const receivedBorder = isDark ? alpha(theme.palette.common.white, 0.08) : alpha(primary.main, 0.12);

  return (
    <Box
      ref={scrollRef}
      data-testid="message-chat-view"
      onScroll={handleScroll}
      aria-busy={loadingPrevious || undefined}
      sx={{
        flex: 1,
        minHeight: 0,
        overflow: 'auto',
        px: { xs: 1.25, sm: 2 },
        py: 1.5,
        bgcolor: alpha(primary.main, isDark ? 0.08 : 0.05),
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {loadingPrevious && (
        <Box
          data-testid="chat-loading-previous"
          sx={{ position: 'sticky', top: 0, height: 0, display: 'flex', justifyContent: 'center', zIndex: 1 }}
        >
          <CircularProgress size={18} aria-label="이전 대화 불러오는 중" sx={{ mt: 0.5 }} />
        </Box>
      )}
      {rows.map(({ message, mine, dateLabel, startsGroup, endsGroup }) => {
        const createdAt = new Date(message.createdAt);
        const unread = mine && message.readAt === null;
        const meta = endsGroup || unread ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: mine ? 'flex-end' : 'flex-start',
              flexShrink: 0,
              lineHeight: 1.2,
            }}
          >
            {unread && (
              <Typography
                component="span"
                data-testid="chat-unread-mark"
                aria-label="상대방이 읽지 않음"
                sx={{ color: isDark ? primary.light : primary.main, fontSize: '0.68rem', fontWeight: 700 }}
              >
                1
              </Typography>
            )}
            {endsGroup && (
              <Typography
                component="span"
                data-testid="chat-message-time"
                color="text.secondary"
                sx={{ fontSize: '0.68rem', whiteSpace: 'nowrap' }}
              >
                {formatChatTime(createdAt)}
              </Typography>
            )}
          </Box>
        ) : null;

        return (
          <Box key={message.messageId} sx={{ display: 'contents' }}>
            {dateLabel && (
              <Box sx={{ display: 'flex', justifyContent: 'center', my: 1.5 }}>
                <Typography
                  component="span"
                  data-testid="chat-date-divider"
                  color="text.secondary"
                  sx={{
                    px: 1.5,
                    py: 0.25,
                    borderRadius: 10,
                    bgcolor: alpha(theme.palette.text.primary, isDark ? 0.12 : 0.06),
                    fontSize: '0.72rem',
                  }}
                >
                  {dateLabel}
                </Typography>
              </Box>
            )}
            <Box
              data-chat-direction={mine ? 'sent' : 'received'}
              sx={{
                display: 'flex',
                justifyContent: mine ? 'flex-end' : 'flex-start',
                alignItems: 'flex-start',
                gap: 1,
                mt: startsGroup ? 1.25 : 0.5,
              }}
            >
              {!mine && (
                <Box sx={{ width: 36, flexShrink: 0 }}>
                  {startsGroup && (
                    <ProfileAvatar
                      name={message.senderUserName}
                      imageUrl={otherUserProfileImage}
                      fallback={message.senderUserName.trim().charAt(0)}
                      sx={{
                        width: 36,
                        height: 36,
                        fontSize: '0.9rem',
                        fontWeight: 700,
                        bgcolor: alpha(primary.main, isDark ? 0.4 : 0.16),
                        color: isDark ? primary.contrastText : primary.main,
                      }}
                    />
                  )}
                </Box>
              )}
              <Box
                sx={{
                  minWidth: 0,
                  maxWidth: { xs: '80%', sm: '68%' },
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: mine ? 'flex-end' : 'flex-start',
                }}
              >
                {!mine && startsGroup && (
                  <Typography
                    component="span"
                    data-testid="chat-sender-name"
                    color="text.secondary"
                    sx={{ fontSize: '0.78rem', fontWeight: 600, mb: 0.5 }}
                  >
                    {message.senderUserName}
                  </Typography>
                )}
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: mine ? 'row-reverse' : 'row',
                    alignItems: 'flex-end',
                    gap: 0.5,
                    maxWidth: '100%',
                  }}
                >
                  <Typography
                    component="div"
                    data-testid="chat-bubble"
                    sx={{
                      minWidth: 0,
                      px: 1.25,
                      py: 0.75,
                      borderRadius: '12px',
                      bgcolor: mine ? sentBubble : receivedBubble,
                      color: mine ? primary.contrastText : 'text.primary',
                      border: mine ? 'none' : `1px solid ${receivedBorder}`,
                      fontSize: '0.875rem',
                      lineHeight: 1.5,
                      whiteSpace: 'pre-wrap',
                      overflowWrap: 'anywhere',
                      ...(startsGroup
                        ? { [mine ? 'borderTopRightRadius' : 'borderTopLeftRadius']: '4px' }
                        : {}),
                    }}
                  >
                    <MessageLinkifiedText content={message.content} />
                  </Typography>
                  {meta}
                </Box>
                <MessageLinkPreviews content={message.content} />
              </Box>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}

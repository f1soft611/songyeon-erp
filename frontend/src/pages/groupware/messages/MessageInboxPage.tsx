import ArrowBackOutlined from '@mui/icons-material/ArrowBackOutlined';
import CreateOutlined from '@mui/icons-material/CreateOutlined';
import DeleteOutlined from '@mui/icons-material/DeleteOutlined';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  List,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useCallback, useEffect, useId, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type KeyboardEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CommonDialog } from '../../../shared/components/CommonDialog';
import { fetchDraftFormUsers } from '../../co/workflow/form/services/draftFormManagement.service';
import { useNotification } from '../../../shared/context/NotificationContext';
import { useRealtimeRefresh } from '../../../shared/hooks/useRealtimeRefresh';
import {
  InboxEmptyState,
  InboxPageShell,
  InboxPanel,
} from '../shared/components/InboxPageLayout';
import { ProfileAvatar } from '../../../shared/components/ProfileAvatar';
import { MessageChatView } from './components/MessageChatView';
import { MessageRecipientSelect } from './components/MessageRecipientSelect';
import { MessageThreadListItem } from './components/MessageThreadListItem';
import {
  createThread,
  deleteThread,
  getThreadMessages,
  listMessageThreads,
  markThreadRead,
  resolveMessageThread,
  replyToThread,
} from './services/messageService';
import type {
  DirectMessage,
  MessageDayPage,
  MessageThread,
  MessageUserOption,
} from './types/message.types';

function mergeLatestDay(current: DirectMessage[], page: MessageDayPage): DirectMessage[] {
  if (!page.messageDate) return page.resultList;
  const latestDate = page.messageDate;
  return [
    ...current.filter((message) => message.createdAt.slice(0, 10) < latestDate),
    ...page.resultList,
  ];
}

export function MessageInboxPage() {
  const { showError } = useNotification();
  const [searchParams] = useSearchParams();
  const messageSourceId = searchParams.get('messageId');
  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<number | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [oldestMessageDate, setOldestMessageDate] = useState<string | null>(null);
  const [hasPreviousMessages, setHasPreviousMessages] = useState(false);
  const [loadingPreviousMessages, setLoadingPreviousMessages] = useState(false);
  const loadingPreviousRef = useRef(false);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [threadError, setThreadError] = useState('');
  const [messageError, setMessageError] = useState('');
  const [replyText, setReplyText] = useState('');
  const [replying, setReplying] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [users, setUsers] = useState<MessageUserOption[]>([]);
  const [recipientUserId, setRecipientUserId] = useState('');
  const [subject, setSubject] = useState('');
  const [newContent, setNewContent] = useState('');
  const [sending, setSending] = useState(false);
  const [composeError, setComposeError] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const composeFormId = useId();
  const selectedThreadIdRef = useRef<number | null>(null);
  const oldestMessageDateRef = useRef<string | null>(null);
  const quietRefreshingRef = useRef(false);
  const quietPendingRef = useRef(false);
  const mountedRef = useRef(true);
  const threadRequestRef = useRef(0);
  const listRequestRef = useRef(0);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      threadRequestRef.current += 1;
      listRequestRef.current += 1;
    };
  }, []);
  useEffect(() => {
    selectedThreadIdRef.current = selectedThreadId;
    oldestMessageDateRef.current = oldestMessageDate;
  }, [selectedThreadId, oldestMessageDate]);

  const selectedThread = useMemo(
    () => threads.find((thread) => thread.threadId === selectedThreadId) ?? null,
    [threads, selectedThreadId],
  );

  const applyDayPage = (page: MessageDayPage) => {
    setMessages(page.resultList);
    setOldestMessageDate(page.messageDate);
    setHasPreviousMessages(page.hasPrevious);
  };

  const loadThreads = useCallback(async (options?: { silent?: boolean }) => {
    const request = ++listRequestRef.current;
    if (!options?.silent) setLoadingThreads(true);
    setThreadError('');
    try {
      const page = await listMessageThreads('ALL');
      if (mountedRef.current && request === listRequestRef.current) setThreads(page.resultList);
    } catch {
      if (mountedRef.current && request === listRequestRef.current) setThreadError('쪽지함을 불러오지 못했습니다.');
    } finally {
      if (mountedRef.current && request === listRequestRef.current && !options?.silent) setLoadingThreads(false);
    }
  }, []);

  useEffect(() => {
    void loadThreads();
  }, [loadThreads]);

  const openThread = async (threadId: number) => {
    const request = ++threadRequestRef.current;
    selectedThreadIdRef.current = threadId;
    setSelectedThreadId(threadId);
    setLoadingMessages(true);
    setMessageError('');
    try {
      const page = await getThreadMessages(threadId);
      if (!mountedRef.current || request !== threadRequestRef.current) return;
      applyDayPage(page);
      try {
        await markThreadRead(threadId);
        if (!mountedRef.current || request !== threadRequestRef.current) return;
        setThreads((current) => current.map((thread) =>
          thread.threadId === threadId ? { ...thread, unreadCount: 0 } : thread));
        window.dispatchEvent(new Event('songyeon-erp:message-read'));
      } catch {
        if (!mountedRef.current || request !== threadRequestRef.current) return;
        showError('쪽지 읽음 처리에 실패했습니다.');
      }
    } catch {
      if (!mountedRef.current || request !== threadRequestRef.current) return;
      setMessages([]);
      setOldestMessageDate(null);
      setHasPreviousMessages(false);
      setMessageError('쪽지 대화를 불러오지 못했습니다.');
    } finally {
      if (mountedRef.current && request === threadRequestRef.current) setLoadingMessages(false);
    }
  };

  const mergeLatestThreadDay = async (threadId: number) => {
    if (selectedThreadIdRef.current !== threadId) return;
    const request = ++threadRequestRef.current;
    const latestPage = await getThreadMessages(threadId);
    if (!mountedRef.current || request !== threadRequestRef.current || selectedThreadIdRef.current !== threadId) return;
    const oldest = oldestMessageDateRef.current;
    const keepsOlderDays = oldest !== null && latestPage.messageDate !== null
      && oldest < latestPage.messageDate;
    setMessages((current) => mergeLatestDay(current, latestPage));
    setLoadingMessages(false);
    if (!keepsOlderDays) {
      setOldestMessageDate(latestPage.messageDate);
      setHasPreviousMessages(latestPage.hasPrevious);
    }
  };

  const refreshQuietly = async () => {
    if (quietRefreshingRef.current) {
      quietPendingRef.current = true;
      return;
    }
    quietRefreshingRef.current = true;
    try {
      do {
        quietPendingRef.current = false;
        const request = ++listRequestRef.current;
        const threadVersion = threadRequestRef.current;
        const threadId = selectedThreadIdRef.current;
        const page = await listMessageThreads('ALL');
        if (!mountedRef.current || request !== listRequestRef.current) return;
        const activeThread = page.resultList.find((thread) => thread.threadId === threadId);
        let nextThreads = page.resultList;
        const applyThreads = () => {
          setThreads((current) => {
            const selected = current.find((thread) => thread.threadId === selectedThreadIdRef.current);
            return selected && !nextThreads.some((thread) => thread.threadId === selected.threadId)
              ? [...nextThreads, selected] : nextThreads;
          });
          setLoadingThreads(false);
        };
        applyThreads();
        if (threadId !== null && threadVersion === threadRequestRef.current
          && selectedThreadIdRef.current === threadId) {
          await mergeLatestThreadDay(threadId);
          if (!mountedRef.current || selectedThreadIdRef.current !== threadId || request !== listRequestRef.current) return;
          if (!activeThread || activeThread.unreadCount > 0) {
            await markThreadRead(threadId);
            if (!mountedRef.current || selectedThreadIdRef.current !== threadId || request !== listRequestRef.current) return;
            nextThreads = nextThreads.map((thread) =>
              thread.threadId === threadId ? { ...thread, unreadCount: 0 } : thread);
            window.dispatchEvent(new Event('songyeon-erp:message-read'));
          }
        }
        if (mountedRef.current && request === listRequestRef.current) {
          applyThreads();
        }
      } while (mountedRef.current && quietPendingRef.current);
    } catch {
      // Keep the current screen on background refresh failures; explicit actions still report errors.
    } finally {
      quietRefreshingRef.current = false;
      if (mountedRef.current && quietPendingRef.current) void refreshQuietlyRef.current();
    }
  };
  useRealtimeRefresh('MESSAGE', refreshQuietly);
  const refreshQuietlyRef = useRef(refreshQuietly);
  useEffect(() => {
    refreshQuietlyRef.current = refreshQuietly;
  });

  useEffect(() => {
    const handleReturn = () => {
      if (document.visibilityState === 'visible') void refreshQuietlyRef.current();
    };
    document.addEventListener('visibilitychange', handleReturn);
    window.addEventListener('focus', handleReturn);
    return () => {
      document.removeEventListener('visibilitychange', handleReturn);
      window.removeEventListener('focus', handleReturn);
    };
  }, []);

  const loadPreviousMessages = async () => {
    if (selectedThreadId === null || !hasPreviousMessages || !oldestMessageDate
      || loadingPreviousRef.current) return;
    const threadId = selectedThreadId;
    loadingPreviousRef.current = true;
    setLoadingPreviousMessages(true);
    try {
      const page = await getThreadMessages(threadId, oldestMessageDate);
      if (!mountedRef.current || selectedThreadIdRef.current !== threadId) return;
      if (page.messageDate) {
        setMessages((current) => [...page.resultList, ...current]);
        setOldestMessageDate(page.messageDate);
      }
      setHasPreviousMessages(page.hasPrevious && page.messageDate !== null);
    } catch {
      showError('이전 대화를 불러오지 못했습니다.');
    } finally {
      loadingPreviousRef.current = false;
      setLoadingPreviousMessages(false);
    }
  };

  useEffect(() => {
    if (loadingThreads || !messageSourceId) return;
    const messageId = Number(messageSourceId);
    if (!Number.isSafeInteger(messageId) || messageId <= 0) {
      showError('쪽지 알림 링크가 올바르지 않습니다.');
      return;
    }
    let active = true;
    void resolveMessageThread(messageId)
      .then((threadId) => {
        if (active) void openThread(threadId);
      })
      .catch(() => {
        if (active) showError('쪽지를 찾을 수 없거나 접근 권한이 없습니다.');
      });
    return () => { active = false; };
  }, [loadingThreads, messageSourceId, showError]);

  const openCompose = async () => {
    setComposeError('');
    setComposeOpen(true);
    try {
      setUsers(await fetchDraftFormUsers());
    } catch {
      setComposeError('수신자 목록을 불러오지 못했습니다.');
    }
  };

  const sendNewMessage = async (event: FormEvent) => {
    event.preventDefault();
    setComposeError('');
    const recipientId = recipientUserId.trim();
    if (!recipientId) {
      setComposeError('수신자를 선택해 주세요.');
      return;
    }
    setSending(true);
    try {
      const message = await createThread({
        recipientUserId: recipientId,
        subject: subject.trim() || undefined,
        content: newContent,
      });
      setComposeOpen(false);
      setRecipientUserId('');
      setSubject('');
      setNewContent('');
      const [threadPage, dayPage] = await Promise.all([
        listMessageThreads('ALL'),
        getThreadMessages(message.threadId),
      ]);
      setThreads(threadPage.resultList);
      threadRequestRef.current += 1;
      listRequestRef.current += 1;
      selectedThreadIdRef.current = message.threadId;
      setSelectedThreadId(message.threadId);
      applyDayPage(dayPage);
    } catch (error) {
      setComposeError(error instanceof Error ? error.message : '쪽지 발송에 실패했습니다.');
    } finally {
      setSending(false);
    }
  };

  const sendReply = async (event: FormEvent) => {
    event.preventDefault();
    if (selectedThreadId === null) return;
    setReplying(true);
    setMessageError('');
    try {
      await replyToThread(selectedThreadId, replyText);
      await mergeLatestThreadDay(selectedThreadId);
      setReplyText('');
      await loadThreads({ silent: true });
    } catch (error) {
      setMessageError(error instanceof Error ? error.message : '답장을 발송하지 못했습니다.');
    } finally {
      setReplying(false);
    }
  };

  const confirmDeleteThread = async () => {
    if (selectedThreadId === null) return;
    const threadId = selectedThreadId;
    threadRequestRef.current += 1;
    listRequestRef.current += 1;
    setDeleting(true);
    try {
      await deleteThread(threadId);
      threadRequestRef.current += 1;
      listRequestRef.current += 1;
      selectedThreadIdRef.current = null;
      setThreads((current) => current.filter((thread) => thread.threadId !== threadId));
      setSelectedThreadId(null);
      setMessages([]);
      setOldestMessageDate(null);
      setHasPreviousMessages(false);
      setReplyText('');
      setDeleteOpen(false);
      window.dispatchEvent(new Event('songyeon-erp:message-read'));
    } catch {
      showError('대화방을 삭제하지 못했습니다.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <InboxPageShell
      fillHeight
      title="쪽지함"
      description="대화 상대별로 주고받은 쪽지를 한곳에서 확인합니다."
      action={
        <Button
          startIcon={<CreateOutlined />}
          variant="contained"
          onClick={() => void openCompose()}
          sx={{ flexShrink: 0, whiteSpace: 'nowrap' }}
        >
          새 쪽지
        </Button>
      }
    >
      {threadError && (
        <Alert severity="error" action={<Button color="inherit" size="small" onClick={() => void loadThreads()}>다시 시도</Button>}>
          {threadError}
        </Alert>
      )}

      <Box sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(260px, 360px) minmax(0, 1fr)' },
        gap: 1.5,
        flex: 1,
        minHeight: 0,
        minWidth: 0,
        overflow: 'hidden',
      }} data-testid="message-inbox-layout">
        <InboxPanel
          sx={{
            display: { xs: selectedThreadId !== null ? 'none' : 'block', md: 'block' },
            minHeight: 0,
            overflow: 'auto',
          }}
          testId="message-thread-list-panel"
        >
          {loadingThreads ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress size={24} aria-label="쪽지함 불러오는 중" />
            </Box>
          ) : threads.length === 0 && !threadError ? (
            <InboxEmptyState>쪽지가 없습니다.</InboxEmptyState>
          ) : (
            <List disablePadding>
              {threads.map((thread) => (
                <MessageThreadListItem
                  key={thread.threadId}
                  thread={thread}
                  selected={thread.threadId === selectedThreadId}
                  onClick={() => void openThread(thread.threadId)}
                />
              ))}
            </List>
          )}
        </InboxPanel>

        <InboxPanel
          sx={{
            display: { xs: selectedThreadId === null ? 'none' : 'flex', md: 'flex' },
            flexDirection: 'column',
            overflow: 'hidden',
            minHeight: 0,
          }}
          testId="message-detail-panel"
        >
          {selectedThread ? (
            <>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', p: 1.5, borderBottom: 1, borderColor: 'divider' }}>
                <IconButton
                  aria-label="쪽지 목록으로"
                  onClick={() => setSelectedThreadId(null)}
                  sx={{ display: { xs: 'inline-flex', md: 'none' } }}
                >
                  <ArrowBackOutlined />
                </IconButton>
                <ProfileAvatar
                  data-testid="message-detail-avatar"
                  name={selectedThread.otherUserName}
                  imageUrl={selectedThread.otherUserProfileImage}
                  fallback={selectedThread.otherUserName.trim().charAt(0)}
                  sx={{
                    width: 40,
                    height: 40,
                    flexShrink: 0,
                    bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.4 : 0.16),
                    color: (theme) => (theme.palette.mode === 'dark' ? theme.palette.primary.contrastText : theme.palette.primary.main),
                    fontSize: '0.95rem',
                    fontWeight: 700,
                  }}
                />
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography sx={{ fontWeight: 700 }}>{selectedThread.otherUserName}</Typography>
                  {selectedThread.subject && <Typography variant="body2" color="text.secondary">{selectedThread.subject}</Typography>}
                </Box>
                <IconButton
                  aria-label="대화방 삭제"
                  title="대화방 삭제"
                  onClick={() => setDeleteOpen(true)}
                  sx={{ flexShrink: 0, color: 'text.secondary' }}
                >
                  <DeleteOutlined />
                </IconButton>
              </Stack>
              {loadingMessages ? (
                <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', p: 3 }}>
                  <CircularProgress size={24} aria-label="대화 불러오는 중" />
                </Box>
              ) : (
                <MessageChatView
                  messages={messages}
                  otherUserId={selectedThread.otherUserId}
                  otherUserProfileImage={selectedThread.otherUserProfileImage}
                  hasPrevious={hasPreviousMessages}
                  loadingPrevious={loadingPreviousMessages}
                  onLoadPrevious={() => void loadPreviousMessages()}
                />
              )}
              <Box
                component="form"
                data-testid="message-reply-form"
                onSubmit={(event) => void sendReply(event)}
                sx={{ p: 1.25, borderTop: 1, borderColor: 'divider', flexShrink: 0 }}
              >
                {messageError && <Alert severity="error" sx={{ mb: 1 }}>{messageError}</Alert>}
                <Box
                  data-testid="message-reply-composer"
                  sx={{
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1.5,
                    bgcolor: 'background.paper',
                    overflow: 'hidden',
                    '&:focus-within': { borderColor: 'primary.main' },
                  }}
                >
                  <Box
                    component="textarea"
                    rows={3}
                    maxLength={5000}
                    aria-label="답장"
                    placeholder="메시지 입력"
                    value={replyText}
                    onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setReplyText(event.target.value)}
                    onKeyDown={(event: KeyboardEvent<HTMLTextAreaElement>) => {
                      if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return;
                      event.preventDefault();
                      if (!replying && replyText.trim()) event.currentTarget.form?.requestSubmit();
                    }}
                    sx={{
                      display: 'block',
                      width: '100%',
                      boxSizing: 'border-box',
                      border: 0,
                      outline: 'none',
                      resize: 'none',
                      px: 1.5,
                      pt: 1.25,
                      pb: 0.5,
                      bgcolor: 'transparent',
                      color: 'text.primary',
                      font: 'inherit',
                      fontSize: '0.875rem',
                      lineHeight: 1.5,
                      '&::placeholder': { color: 'text.disabled', opacity: 1 },
                    }}
                  />
                  <Stack direction="row" sx={{ justifyContent: 'flex-end', px: 1, pb: 1 }}>
                    <Button
                      type="submit"
                      size="small"
                      variant="contained"
                      disabled={replying || !replyText.trim()}
                      sx={{ minWidth: 64 }}
                    >
                      {replying ? '전송 중' : '전송'}
                    </Button>
                  </Stack>
                </Box>
              </Box>
            </>
          ) : (
            <Typography color="text.secondary" sx={{ m: 'auto', p: 3, textAlign: 'center' }}>
              쪽지를 선택해 주세요.
            </Typography>
          )}
        </InboxPanel>
      </Box>

      <CommonDialog
        open={deleteOpen}
        onClose={() => !deleting && setDeleteOpen(false)}
        title="대화방 삭제"
        size="xs"
        actions={
          <>
            <Button color="error" variant="contained" onClick={() => void confirmDeleteThread()} disabled={deleting}>
              {deleting ? '삭제 중...' : '삭제'}
            </Button>
            <Button variant="outlined" onClick={() => setDeleteOpen(false)} disabled={deleting}>취소</Button>
          </>
        }
      >
        <Typography variant="body2">
          {selectedThread?.otherUserName ?? '상대방'}님과의 대화방을 내 쪽지함에서 삭제합니다.
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          상대방의 쪽지함에는 그대로 남습니다. 상대방이 새 쪽지를 보내면 대화방이 다시 표시됩니다.
        </Typography>
      </CommonDialog>

      <CommonDialog
        open={composeOpen}
        onClose={() => !sending && setComposeOpen(false)}
        title="새 쪽지"
        size="xs"
        fullScreenOnMobile
        actions={
          <>
            <Button type="submit" form={composeFormId} variant="contained" disabled={sending}>
              {sending ? '전송 중...' : '보내기'}
            </Button>
            <Button variant="outlined" onClick={() => setComposeOpen(false)} disabled={sending}>취소</Button>
          </>
        }
      >
        <Box
          component="form"
          id={composeFormId}
          onSubmit={(event) => void sendNewMessage(event)}
          sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 0.5 }}
        >
          {composeError && <Alert severity="error">{composeError}</Alert>}
          <MessageRecipientSelect
            users={users}
            value={recipientUserId}
            onChange={setRecipientUserId}
            disabled={sending}
          />
          <TextField label="제목 (선택)" value={subject} onChange={(event) => setSubject(event.target.value)} slotProps={{ htmlInput: { maxLength: 120 } }} />
          <TextField
            label="내용"
            value={newContent}
            onChange={(event) => setNewContent(event.target.value)}
            multiline
            minRows={5}
            required
            slotProps={{ htmlInput: { maxLength: 5000 } }}
          />
        </Box>
      </CommonDialog>
    </InboxPageShell>
  );
}

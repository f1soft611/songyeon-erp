import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Alert, Box, Button, Checkbox, Chip, CircularProgress, FormControlLabel, Typography, useTheme } from '@mui/material';
import PersonOutlineRoundedIcon from '@mui/icons-material/PersonOutlineRounded';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import { alpha } from '@mui/material/styles';
import { CommonDialog } from '../../../../../shared/components/CommonDialog';
import { AttachmentList } from '../../../../../shared/components/feed/AttachmentList';
import { getStoredAuth, subscribeAuthChange } from '../../../../../shared/services/authService';
import { ApiResponseError } from '../../../../../shared/services/apiClient';
import { useNotification } from '../../../../../shared/context/NotificationContext';
import { fetchLoginPopups, fetchLoginPopupDetail, dismissLoginPopupToday } from '../services/noticeLoginPopupService';
import { downloadNoticeAttachment } from '../services/noticeBoardService';
import type { NoticeBoardPostApi } from '../types/community.types';
import { NoticePopupBody } from './NoticePopupBody';

type Queue = { ids: number[]; index: number };
const sessionKey = () => {
  const auth = getStoredAuth();
  return auth ? `s-erp-notice-popups:${JSON.stringify([auth.tenantCode, auth.userId, auth.popupSessionId ?? 'legacy'])}` : '';
};

export function NoticeLoginPopupHost() {
  const key = useSyncExternalStore(subscribeAuthChange, sessionKey, () => '');
  return key ? <LoginPopupQueue key={key} storageKey={key} /> : null;
}

function LoginPopupQueue({ storageKey }: { storageKey: string }) {
  const theme = useTheme();
  const { showError } = useNotification();
  const [queue, setQueue] = useState<Queue | null>(null);
  const [post, setPost] = useState<NoticeBoardPostApi | null>(null);
  const [hideToday, setHideToday] = useState(false);
  const [error, setError] = useState<{ message: string; action: 'list' | 'detail' | 'dismiss'; unavailable?: boolean } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  const persist = useCallback((next: Queue) => {
    try { sessionStorage.setItem(storageKey, JSON.stringify(next)); }
    catch { showError('공지 팝업 진행 상태를 저장하지 못했습니다. 새로고침 시 다시 표시될 수 있습니다.'); }
    setQueue(next);
  }, [storageKey, showError]);

  useEffect(() => {
    if (queue !== null) return;
    let active = true;
    const load = async () => {
      const saved = sessionStorage.getItem(storageKey);
      if (saved) {
        try {
          const value: unknown = JSON.parse(saved);
          if (typeof value !== 'object' || value === null || !('ids' in value) || !('index' in value) ||
              !Array.isArray(value.ids) || value.ids.some((id) => !Number.isSafeInteger(id) || id <= 0) ||
              typeof value.index !== 'number' || !Number.isInteger(value.index) || value.index < 0 || value.index > value.ids.length) {
            throw new Error('Invalid popup queue');
          }
          if (active) setQueue({ ids: value.ids, index: value.index });
          return;
        } catch {
          showError('공지 팝업 진행 정보가 손상되어 목록을 다시 불러옵니다.');
          sessionStorage.removeItem(storageKey);
        }
      }
      const items = await fetchLoginPopups();
      if (active) persist({ ids: items.map((item) => item.postId), index: 0 });
    };
    void load().catch(() => {
      if (active) setError({ message: '로그인 공지를 불러오지 못했습니다.', action: 'list' });
    });
    return () => { active = false; };
  }, [queue, storageKey, attempt, persist, showError]);

  const currentId = queue?.ids[queue.index];
  useEffect(() => {
    if (currentId === undefined) return;
    let active = true;
    void fetchLoginPopupDetail(currentId).then((item) => {
      if (active) setPost(item);
    }).catch((cause: unknown) => {
      if (active) setError({ message: cause instanceof ApiResponseError && cause.status === 404
        ? '종료되었거나 더 이상 표시할 수 없는 공지입니다.' : '공지 내용을 불러오지 못했습니다.',
        action: 'detail', unavailable: cause instanceof ApiResponseError && cause.status === 404 });
    });
    return () => { active = false; };
  }, [currentId, attempt]);

  const advance = async () => {
    if (!queue || currentId === undefined || busy.current) return;
    busy.current = true;
    setSaving(true);
    try {
      if (hideToday && !error?.unavailable) await dismissLoginPopupToday(currentId);
      if (!mounted.current) return;
      setError(null);
      setPost(null);
      setHideToday(false);
      persist({ ...queue, index: queue.index + 1 });
    } catch {
      if (mounted.current) setError({ message: '오늘 하루 숨김을 저장하지 못했습니다. 다시 시도해 주세요.', action: 'dismiss' });
    } finally {
      busy.current = false;
      if (mounted.current) setSaving(false);
    }
  };
  const close = () => {
    if (saving) return;
    if (error && error.action !== 'dismiss') {
      persist({ ids: [], index: 0 });
      setError(null);
    } else if (post || error?.unavailable) void advance();
  };
  const retry = () => {
    if (error?.action === 'dismiss') void advance();
    else {
      setError(null);
      setAttempt((value) => value + 1);
    }
  };
  const attachments = post?.attachments ?? [];
  const open = currentId !== undefined || error !== null;
  const createdAt = post?.createdAt ? new Date(post.createdAt) : null;
  return <CommonDialog open={open} title="로그인 공지" onClose={close} size="md"
    titleAside={currentId !== undefined && <Chip role="status" aria-label="공지 진행"
      label={`${(queue?.index ?? 0) + 1} / ${queue?.ids.length}`} size="small"
      sx={{ height: 24, bgcolor: alpha(theme.palette.primary.main, 0.09),
        color: 'primary.main', border: 1, borderColor: alpha(theme.palette.primary.main, 0.14),
        fontWeight: 700, fontSize: '0.72rem', fontVariantNumeric: 'tabular-nums',
        '& .MuiChip-label': { px: 1.25 } }} />}
    description={post && <Box component="span" sx={{
      display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, flexWrap: 'wrap',
      alignItems: { xs: 'flex-start', sm: 'center' }, columnGap: 2, rowGap: 0.75,
      pt: 0.75, fontSize: '0.75rem', lineHeight: 1.6,
    }}>
      <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, minWidth: 0, maxWidth: '100%' }}>
        <PersonOutlineRoundedIcon sx={{ fontSize: 16, color: 'text.disabled', flexShrink: 0 }} />
        <Box component="span" sx={{ flexShrink: 0 }}>작성자</Box>{' '}
        <Box component="span" sx={{ color: 'text.primary', fontWeight: 600, overflowWrap: 'anywhere', minWidth: 0 }}>
          {post.writerName ?? '관리자'}
        </Box>
      </Box>
      {createdAt && <Box component="span" sx={{ display: 'inline-flex', alignItems: 'flex-start', gap: 0.75, minWidth: 0 }}>
        <AccessTimeRoundedIcon sx={{ fontSize: 16, color: 'text.disabled', flexShrink: 0, mt: '2px' }} />
        <Box component="span" sx={{ flexShrink: 0 }}>작성일시</Box>{' '}
        <Box component="time" dateTime={typeof post.createdAt === 'string' ? post.createdAt : post.createdAt?.toISOString()}
          sx={{ display: 'inline-flex', flexWrap: 'wrap', columnGap: 0.75 }}>
          <Box component="span" sx={{ whiteSpace: 'nowrap' }}>
            {createdAt.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })}{' '}
          </Box>
          <Box component="span" sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
            {createdAt.toLocaleTimeString('ko-KR', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </Box>
        </Box>
      </Box>}
    </Box>}
    footerStart={post && <FormControlLabel label="오늘 하루 이 공지 보지 않기"
      control={<Checkbox checked={hideToday} disabled={saving}
        onChange={(event) => setHideToday(event.target.checked)} />} />}
    actions={error ? <>
      {error.unavailable
        ? <Button onClick={() => void advance()}>다음 공지</Button>
        : <Button disabled={saving} onClick={retry}>다시 시도</Button>}
      <Button disabled={saving} onClick={() => { persist({ ids: [], index: 0 }); setError(null); }}>이번 로그인에서 닫기</Button>
    </> : <Button variant="contained" disabled={!post || saving} onClick={() => void advance()}>
      {saving ? '저장 중' : '확인'}</Button>}
  >
    {error && <Alert severity="error" sx={{ mb: 2 }}>{error.message}</Alert>}
    {!post && !error && <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
      <CircularProgress aria-label="공지 내용 불러오는 중" /></Box>}
    {post && <>
      <Typography component="h3" sx={{ fontSize: '1.25rem', fontWeight: 700, overflowWrap: 'anywhere', mt: 1 }}>{post.title}</Typography>
      <NoticePopupBody post={post} />
      <AttachmentList isDark={theme.palette.mode === 'dark'}
        files={attachments.map((file, index) => ({ id: String(index), name: file.fileName ?? '첨부파일', size: Number(file.fileSize ?? 0) }))}
        onDownload={(id) => {
          const file = attachments[Number(id)];
          if (file) void downloadNoticeAttachment({ ...file, postId: post.postId })
            .catch(() => showError('공지 첨부파일 다운로드에 실패했습니다.'));
        }} />
    </>}
  </CommonDialog>;
}

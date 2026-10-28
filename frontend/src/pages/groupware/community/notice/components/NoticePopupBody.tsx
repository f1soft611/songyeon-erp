import { useEffect, useMemo, useState } from 'react';
import { Alert, Button } from '@mui/material';
import { FeedBodyContent } from '../../../../../shared/components/feed/FeedBodyContent';
import { apiGetBlob } from '../../../../../shared/services/apiClient';
import { resolveApiBaseUrl } from '../../../../../shared/services/authService';
import { normalizeNoticeEmbeddedImageSources } from './NoticeFeedList';
import { prepareNoticeFeedHtml } from '../utils/noticeHtml';
import type { NoticeBoardPostApi } from '../types/community.types';

export function NoticePopupBody({ post }: { post: NoticeBoardPostApi }) {
  const source = useMemo(() => prepareNoticeFeedHtml(normalizeNoticeEmbeddedImageSources(
    post.contentsHtml ?? post.contents ?? '', Number(post.postId),
  )), [post]);
  const [resolved, setResolved] = useState<{ source: string; attempt: number; html: string; failed: boolean }>();
  const [attempt, setAttempt] = useState(0);
  const loadingHtml = useMemo(() => {
    const document = new DOMParser().parseFromString(source, 'text/html');
    document.querySelectorAll('img').forEach((image) => image.removeAttribute('src'));
    return document.body.innerHTML;
  }, [source]);

  useEffect(() => {
    let active = true;
    const urls: string[] = [];
    const document = new DOMParser().parseFromString(source, 'text/html');
    const endpoint = new URL(
      `${resolveApiBaseUrl()}/api/v1/groupware/boards/notice/posts/${post.postId}/embedded-images`,
      window.location.origin,
    );
    void Promise.allSettled(Array.from(document.querySelectorAll('img')).map(async (image) => {
      const src = image.getAttribute('src') ?? '';
      const imageUrl = new URL(src, window.location.origin);
      if (imageUrl.origin !== endpoint.origin || imageUrl.pathname !== endpoint.pathname) return;
      image.removeAttribute('src');
      const url = URL.createObjectURL(await apiGetBlob(imageUrl.href));
      if (!active) { URL.revokeObjectURL(url); return; }
      urls.push(url);
      image.src = url;
    })).then((results) => {
      if (active) setResolved({ source, attempt, html: document.body.innerHTML,
        failed: results.some((result) => result.status === 'rejected') });
    });
    return () => { active = false; urls.forEach((url) => URL.revokeObjectURL(url)); };
  }, [source, attempt, post.postId]);

  const current = resolved?.source === source && resolved.attempt === attempt ? resolved : undefined;
  return <>
    <FeedBodyContent hasMore={false} isExpanded onToggleExpand={() => undefined}
      richText={{ collapsedHtml: '', expandedHtml: current?.html ?? loadingHtml,
        onOpenImage: () => undefined }}
    />
    {current?.failed && <Alert severity="error"
      action={<Button color="inherit" onClick={() => setAttempt((value) => value + 1)}>이미지 다시 시도</Button>}>
      본문 이미지를 불러오지 못했습니다.
    </Alert>}
  </>;
}

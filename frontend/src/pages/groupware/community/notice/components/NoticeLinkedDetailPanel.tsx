import { Alert, useTheme } from '@mui/material';
import { useEffect, useState } from 'react';
import { PostDetailPanel } from '../../../../../shared/components/feed/PostDetailPanel';
import { useNotification } from '../../../../../shared/context/NotificationContext';
import { mapNoticePost } from '../data/noticePostAdapter';
import { useNoticeComments } from '../hooks/useNoticeComments';
import { useNoticeInteractions } from '../hooks/useNoticeInteractions';
import { downloadNoticeAttachment, fetchNoticePostDetail } from '../services/noticeBoardService';
import type { NoticeFeedItem } from '../types/community.types';
import { NoticeFeedList } from './NoticeFeedList';

type NoticeLinkedDetailPanelProps = {
  noticeId: number;
  onClose: () => void;
  onOpenNotice: (id: number) => void;
};

export function NoticeLinkedDetailPanel({
  noticeId,
  onClose,
  onOpenNotice,
}: NoticeLinkedDetailPanelProps) {
  const theme = useTheme();
  const { showError, showSuccess } = useNotification();
  const [items, setItems] = useState<NoticeFeedItem[]>([]);
  const [error, setError] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const comments = useNoticeComments({ setNoticeItems: setItems, showError, showSuccess });
  const interactions = useNoticeInteractions({
    noticeItems: items, setNoticeItems: setItems, showError, showSuccess,
  });

  useEffect(() => {
    let active = true;
    void fetchNoticePostDetail(noticeId).then((post) => {
      if (!active) return;
      if (Number(post.postId) !== noticeId) throw new Error('Notice unavailable');
      setItems([mapNoticePost(post)]);
    }).catch(() => {
      if (active) setError(true);
    });
    return () => { active = false; };
  }, [noticeId]);

  return (
    <PostDetailPanel
      title="공지사항 상세"
      onClose={onClose}
      isLoading={!error && items.length === 0}
      loadingLabel="공지사항 상세 불러오는 중"
    >
      {error ? (
        <Alert severity="error">공지사항 상세 정보를 불러오지 못했습니다.</Alert>
      ) : (
        <NoticeFeedList
          items={items}
          isDark={theme.palette.mode === 'dark'}
          showManagementActions={false}
          expandedNoticeId={expanded ? noticeId : null}
          onToggleExpand={() => setExpanded((value) => !value)}
          onOpenNotice={onOpenNotice}
          onToggleLike={interactions.handleToggleLike}
          onToggleBookmark={interactions.handleToggleBookmark}
          onAddComment={comments.handleAddComment}
          onEditComment={comments.handleUpdateComment}
          onDeleteComment={comments.handleDeleteComment}
          onLoadPreviousComments={comments.handleLoadPreviousComments}
          onLoadPreviousCommentsError={() => showError('이전 댓글을 불러오지 못했습니다.')}
          onDownloadCommentAttachment={comments.handleDownloadCommentAttachment}
          onDeleteCommentAttachment={comments.handleDeleteCommentAttachment}
          onDownload={(id, file) => {
            void downloadNoticeAttachment({
              boardFileId: file.boardFileId,
              postId: id,
              fileName: file.name,
            }).catch(() => showError('첨부파일을 내려받지 못했습니다.'));
          }}
        />
      )}
    </PostDetailPanel>
  );
}

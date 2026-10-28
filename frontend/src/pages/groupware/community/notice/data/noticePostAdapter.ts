import type { CommonFileItem } from '../../../../../shared/services/commonContentApi';
import { getStoredAuth } from '../../../../../shared/services/authService';
import type {
  NoticeCommentItem,
  NoticeFeedItem,
  NoticeBoardPostApi,
} from '../types/community.types';

export const toPlainText = (value = '') =>
  value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?p\s*>/gi, '\n')
    .replace(/<\/?li\s*>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const formatNoticeMeta = (post: NoticeBoardPostApi): string => {
  const writerName = post.writerName || '관리자';
  const createdAt = post.createdAt
    ? new Date(post.createdAt).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
    : '날짜 미상';
  const viewCount = Number(post.viewCount ?? 0);
  return `${writerName} · ${createdAt} · 조회 ${viewCount}`;
};

const formatCommentTime = (value: string | Date | null | undefined): string => {
  if (!value) return '방금';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '방금';
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const countNestedComments = (comments: NoticeCommentItem[] = []): number =>
  comments.filter((comment) => !comment.isDeleted).length;

export const toNoticeCommentTree = (
  records: Array<{
    commentId?: number | string | null;
    parentCommentId?: number | string | null;
    deletedYn?: string | null;
    writerName?: string | null;
    writerId?: string | null;
    writerProfileImage?: string | null;
    content?: string | null;
    createdAt?: string | Date | null;
    attachments?: CommonFileItem[];
  }> = [],
): NoticeCommentItem[] => {
  const commentMap = new Map<number, NoticeCommentItem>();
  const roots: NoticeCommentItem[] = [];

  records.forEach((record) => {
    const commentId = Number(record.commentId ?? 0);
    if (!commentId) return;
    commentMap.set(commentId, {
      id: commentId,
      author:
        record.deletedYn === 'Y'
          ? '삭제된 댓글'
          : record.writerName || record.writerId || '사용자',
      authorProfileImageUrl:
        record.deletedYn === 'Y' ? null : record.writerProfileImage,
      time: formatCommentTime(record.createdAt),
      content:
        record.deletedYn === 'Y'
          ? '[작성자에 의해 삭제 되었습니다.]'
          : (record.content ?? ''),
      isDeleted: record.deletedYn === 'Y',
      isEditable: record.deletedYn !== 'Y',
      attachments: (record.attachments ?? []).map((file) => ({
        id: String(file.fileId ?? file.objectKey ?? file.fileName ?? ''),
        name: file.fileName ?? '첨부파일',
        size: Number(file.fileSize ?? 0) || undefined,
        mimeType: file.mimeType ?? file.contentType ?? undefined,
      })),
      replies: [],
    });
  });

  records.forEach((record) => {
    const item = commentMap.get(Number(record.commentId ?? 0));
    if (!item) return;
    const parentCommentId =
      record.parentCommentId == null ? null : Number(record.parentCommentId);
    if (parentCommentId && commentMap.has(parentCommentId)) {
      const parent = commentMap.get(parentCommentId);
      if (parent) {
        parent.replies = [...(parent.replies ?? []), item];
        return;
      }
    }
    roots.push(item);
  });

  return roots;
};

export function mapNoticePost(
  post: NoticeBoardPostApi,
  noticeGubunNames = new Map<string, string>(),
): NoticeFeedItem {
  const editorHtml = post.contentsHtml ?? post.contents ?? '';
  const bodyText = toPlainText(editorHtml || post.contentsText || '');
  const summaryText =
    bodyText.replace(/\s+/g, ' ').trim() || '공지 내용을 확인해 주세요.';
  const bodyHtml = editorHtml.trim();
  const attachments = (post.attachments ?? [])
    .filter((attachment) => attachment.fileUsageType !== 'EMBEDDED')
    .map((attachment) => ({
      id: String(
        attachment.boardFileId ??
          attachment.fileName ??
          attachment.objectKey ??
          Math.random(),
      ),
      name: attachment.fileName ?? '첨부파일',
      size: Number(attachment.fileSize ?? 0) || undefined,
      boardFileId: attachment.boardFileId,
      objectKey: attachment.objectKey,
      bucketName: attachment.bucketName,
    }));
  const comments = toNoticeCommentTree(post.comments ?? []);
  const categoryName =
    (post.noticeGubunCode
      ? noticeGubunNames.get(post.noticeGubunCode)
      : undefined) ??
    post.noticeGubunCode ??
    '공지';

  return {
    id: Number(post.postId ?? 0),
    writerId: post.writerId ?? undefined,
    writerProfileImage: post.writerProfileImage,
    isPostOwner: Boolean(
      post.writerId &&
      getStoredAuth()?.userId &&
      String(post.writerId) === String(getStoredAuth()?.userId),
    ),
    title: post.title ?? '제목 없음',
    viewCount: Number(post.viewCount ?? 0) || 0,
    createdAt: post.createdAt,
    noticeGubunCode: post.noticeGubunCode ?? undefined,
    noticeGubunName: categoryName,
    meta: formatNoticeMeta(post),
    state: categoryName,
    summary: summaryText,
    summaryHtml: bodyHtml,
    body: bodyText || '공지 내용을 확인해 주세요.',
    bodyHtml,
    attachments: attachments.map((attachment) => attachment.name),
    attachmentDetails: attachments,
    comments,
    commentCount:
      post.commentCount == null
        ? countNestedComments(comments)
        : Number(post.commentCount) || 0,
    hasPreviousComments: post.hasPreviousComments,
    nextBeforeCommentId: post.nextBeforeCommentId,
    likeCount: 0,
    liked: false,
    bookmarked: false,
    isPinned: post.isPinned ?? 'N',
    loginPopupYn: post.loginPopupYn ?? 'N',
    popupEndDate: post.popupEndDate,
  };
}

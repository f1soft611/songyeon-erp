import type { NoticeCommentItem } from '../types/community.types';

export const appendCommentToTree = (
  comments: NoticeCommentItem[] = [],
  parentCommentId: number | string | null | undefined,
  comment: NoticeCommentItem,
): NoticeCommentItem[] => {
  if (parentCommentId == null) return [...comments, comment];
  return comments.map((current) =>
    String(current.id) === String(parentCommentId)
      ? { ...current, replies: [...(current.replies ?? []), comment] }
      : {
          ...current,
          replies: appendCommentToTree(
            current.replies ?? [],
            parentCommentId,
            comment,
          ),
        },
  );
};

export const insertNoticeReplyAfter = (
  comments: NoticeCommentItem[] = [],
  targetCommentId: number | string,
  comment: NoticeCommentItem,
): NoticeCommentItem[] => {
  const nextComments: NoticeCommentItem[] = [];
  comments.forEach((current) => {
    nextComments.push(current);
    if (String(current.id) === String(targetCommentId)) {
      nextComments.push({ ...comment, replies: [] });
      return;
    }
    if (current.replies?.length) {
      nextComments[nextComments.length - 1] = {
        ...current,
        replies: insertNoticeReplyAfter(
          current.replies,
          targetCommentId,
          comment,
        ),
      };
    }
  });
  return nextComments;
};

export const updateCommentInTree = (
  comments: NoticeCommentItem[] = [],
  commentId: number | string,
  content: string,
  attachments?: NoticeCommentItem['attachments'],
): NoticeCommentItem[] =>
  comments.map((comment) =>
    String(comment.id) === String(commentId)
      ? {
          ...comment,
          content,
          ...(attachments
            ? { attachments: [...(comment.attachments ?? []), ...attachments] }
            : {}),
        }
      : {
          ...comment,
          replies: updateCommentInTree(
            comment.replies ?? [],
            commentId,
            content,
            attachments,
          ),
        },
  );

export const deleteCommentFromTree = (
  comments: NoticeCommentItem[] = [],
  commentId: number | string,
): NoticeCommentItem[] =>
  comments.map((comment) => {
    if (String(comment.id) === String(commentId)) {
      return {
        ...comment,
        author: '삭제된 댓글',
        content: '[작성자에 의해 삭제 되었습니다.]',
        isDeleted: true,
        isEditable: false,
        attachments: [],
      };
    }
    return {
      ...comment,
      replies: deleteCommentFromTree(comment.replies ?? [], commentId),
    };
  });

export const removeAttachmentFromCommentTree = (
  comments: NoticeCommentItem[] = [],
  commentId: number | string,
  attachmentId: string,
): NoticeCommentItem[] =>
  comments.map((comment) =>
    String(comment.id) === String(commentId)
      ? {
          ...comment,
          attachments: (comment.attachments ?? []).filter(
            (attachment) => String(attachment.id) !== String(attachmentId),
          ),
        }
      : {
          ...comment,
          replies: removeAttachmentFromCommentTree(
            comment.replies ?? [],
            commentId,
            attachmentId,
          ),
        },
  );

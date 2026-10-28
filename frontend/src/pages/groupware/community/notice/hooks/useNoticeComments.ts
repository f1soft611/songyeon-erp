import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import {
  createCommonComment,
  deleteCommonComment,
  deleteCommonFile,
  downloadCommonFile,
  fetchCommonComments,
  uploadCommonFile,
  updateCommonComment,
} from '../../../../../shared/services/commonContentApi';
import type { CommonFileItem } from '../../../../../shared/services/commonContentApi';
import type {
  NoticeCommentItem,
  NoticeFeedItem,
} from '../types/community.types';
import { toNoticeCommentTree, toPlainText } from '../data/noticePostAdapter';
import {
  appendCommentToTree,
  deleteCommentFromTree,
  insertNoticeReplyAfter,
  removeAttachmentFromCommentTree,
  updateCommentInTree,
} from '../data/noticeCommentTree';

type UseNoticeCommentsOptions = {
  setNoticeItems: Dispatch<SetStateAction<NoticeFeedItem[]>>;
  showError: (message: string) => void;
  showSuccess: (message: string) => void;
};

const adjustCommentCount = (item: NoticeFeedItem, delta: number): number => {
  const currentCount =
    item.commentCount == null
      ? (item.comments ?? []).filter((comment) => !comment.isDeleted).length
      : Number(item.commentCount) || 0;
  return Math.max(0, currentCount + delta);
};

const deleteUploadedCommentFiles = async (
  commentId: number | string,
  files: CommonFileItem[],
) => {
  await Promise.allSettled(
    files
      .map((file) => file.fileId)
      .filter((fileId): fileId is number | string => fileId != null)
      .map((fileId) => deleteCommonFile('NOTICE_COMMENT', commentId, fileId)),
  );
};

const toNoticeCommentItem = (
  comment: NonNullable<Parameters<typeof toNoticeCommentTree>[0]>[number],
): NoticeCommentItem | undefined => toNoticeCommentTree([comment])[0];

export function useNoticeComments({
  setNoticeItems,
  showError,
  showSuccess,
}: UseNoticeCommentsOptions) {
  const handleAddComment = useCallback(
    async (
      noticeId: number,
      content: string,
      parentCommentId?: number | string,
      files: File[] = [],
      displayParentCommentId?: number | string,
    ) => {
      if (!toPlainText(content).trim()) return;
      try {
        const created = await createCommonComment(
          'NOTICE',
          noticeId,
          content,
          parentCommentId,
        );
        const createdId = Number(created.commentId ?? 0);
        const uploadedFiles: CommonFileItem[] = [];
        try {
          for (const file of files) {
            if (createdId > 0) {
              uploadedFiles.push(
                await uploadCommonFile('NOTICE_COMMENT', createdId, file),
              );
            }
          }
        } catch (error) {
          if (createdId > 0) {
            await deleteUploadedCommentFiles(createdId, uploadedFiles);
          }
          throw error;
        }
        const nextComment = toNoticeCommentItem({
          ...created,
          attachments: uploadedFiles,
        });
        if (nextComment) {
          setNoticeItems((current) =>
            current.map((item) => {
              if (item.id !== noticeId) return item;
              const comments =
                displayParentCommentId != null &&
                String(displayParentCommentId) !== String(parentCommentId)
                  ? insertNoticeReplyAfter(
                      item.comments ?? [],
                      displayParentCommentId,
                      nextComment,
                    )
                  : appendCommentToTree(
                      item.comments ?? [],
                      parentCommentId,
                      nextComment,
                    );
              return {
                ...item,
                comments,
                commentCount: adjustCommentCount(item, 1),
              };
            }),
          );
        }
        showSuccess(
          parentCommentId != null
            ? '답글이 등록되었습니다.'
            : '댓글이 등록되었습니다.',
        );
        return nextComment;
      } catch (error) {
        showError(
          parentCommentId != null
            ? '답글 저장에 실패했습니다.'
            : '댓글 저장에 실패했습니다.',
        );
        throw error;
      }
    },
    [setNoticeItems, showError, showSuccess],
  );

  const handleUpdateComment = useCallback(
    async (
      noticeId: number,
      commentId: number | string,
      content: string,
      files: File[] = [],
    ) => {
      if (!toPlainText(content).trim()) return;
      try {
        const updated = await updateCommonComment(
          'NOTICE',
          noticeId,
          commentId,
          content,
        );
        const uploadedFiles: CommonFileItem[] = [];
        try {
          for (const file of files) {
            uploadedFiles.push(
              await uploadCommonFile('NOTICE_COMMENT', commentId, file),
            );
          }
        } catch (error) {
          await deleteUploadedCommentFiles(commentId, uploadedFiles);
          throw error;
        }
        const nextAttachments = uploadedFiles.map((file) => ({
          id: String(file.fileId ?? file.objectKey ?? file.fileName ?? ''),
          name: file.fileName ?? '첨부파일',
          size: Number(file.fileSize ?? 0) || undefined,
          mimeType: file.mimeType ?? file.contentType ?? undefined,
        }));
        const nextContent = updated.content ?? content;
        setNoticeItems((current) =>
          current.map((item) =>
            item.id === noticeId
              ? {
                  ...item,
                  comments: updateCommentInTree(
                    item.comments ?? [],
                    commentId,
                    nextContent,
                    nextAttachments,
                  ),
                }
              : item,
          ),
        );
        showSuccess('댓글이 수정되었습니다.');
      } catch (error) {
        showError('댓글 수정에 실패했습니다.');
        throw error;
      }
    },
    [setNoticeItems, showError, showSuccess],
  );

  const handleDeleteComment = useCallback(
    async (noticeId: number, commentId: number | string) => {
      try {
        await deleteCommonComment('NOTICE', noticeId, commentId);
        setNoticeItems((current) =>
          current.map((item) =>
            item.id === noticeId
              ? {
                  ...item,
                  comments: deleteCommentFromTree(
                    item.comments ?? [],
                    commentId,
                  ),
                  commentCount: adjustCommentCount(item, -1),
                }
              : item,
          ),
        );
        showSuccess('댓글이 삭제되었습니다.');
      } catch (error) {
        showError('댓글 삭제에 실패했습니다.');
        throw error;
      }
    },
    [setNoticeItems, showError, showSuccess],
  );

  const handleLoadPreviousComments = useCallback(
    async (noticeId: number, beforeCommentId: number | string) => {
      const records = await fetchCommonComments('NOTICE', noticeId, {
        limit: 100,
        beforeCommentId,
      });
      return {
        comments: toNoticeCommentTree(records.comments),
        hasPrevious: records.hasPrevious,
        nextBeforeCommentId: records.nextBeforeCommentId,
      };
    },
    [],
  );

  const handleDownloadCommentAttachment = useCallback(
    (commentId: number | string, attachmentId: string, fileName?: string) => {
      void downloadCommonFile(
        'NOTICE_COMMENT',
        commentId,
        attachmentId,
        fileName,
      );
    },
    [],
  );

  const handleDeleteCommentAttachment = useCallback(
    async (
      noticeId: number,
      commentId: number | string,
      attachmentId: string,
    ) => {
      try {
        await deleteCommonFile('NOTICE_COMMENT', commentId, attachmentId);
        setNoticeItems((current) =>
          current.map((item) =>
            item.id === noticeId
              ? {
                  ...item,
                  comments: removeAttachmentFromCommentTree(
                    item.comments ?? [],
                    commentId,
                    attachmentId,
                  ),
                }
              : item,
          ),
        );
        showSuccess('댓글 첨부파일이 삭제되었습니다.');
      } catch (error) {
        showError('댓글 첨부파일 삭제에 실패했습니다.');
        throw error;
      }
    },
    [setNoticeItems, showError, showSuccess],
  );

  return {
    handleAddComment,
    handleUpdateComment,
    handleDeleteComment,
    handleLoadPreviousComments,
    handleDownloadCommentAttachment,
    handleDeleteCommentAttachment,
  };
}

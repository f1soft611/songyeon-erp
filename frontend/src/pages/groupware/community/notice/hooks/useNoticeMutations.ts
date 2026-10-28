import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import {
  createNoticePost,
  deleteNoticeAttachment,
  deleteNoticePost,
  updateNoticePinned,
  updateNoticePost,
  uploadNoticeAttachment,
} from '../services/noticeBoardService';
import type {
  NoticeBoardAttachmentApi,
  NoticeBoardPostApi,
  NoticeBoardPostSavePayload,
  NoticeComposerSubmitPayload,
  NoticeEditorDraft,
  NoticeFeedItem,
} from '../types/community.types';
import { mapNoticePost, toPlainText } from '../data/noticePostAdapter';
import { sanitizeNoticeBodyHtml } from '../utils/noticeHtml';

type UseNoticeMutationsOptions = {
  setNoticeItems: Dispatch<SetStateAction<NoticeFeedItem[]>>;
  setPinnedNoticeItems?: Dispatch<SetStateAction<NoticeFeedItem[]>>;
  setServerItemRevision: Dispatch<SetStateAction<number>>;
  loadNoticePosts: (options?: {
    silent?: boolean;
    quiet?: boolean;
  }) => Promise<void>;
  noticeGubunNamesRef: { current: Map<string, string> };
  editorDraft: NoticeEditorDraft;
  setEditorDraft: Dispatch<SetStateAction<NoticeEditorDraft>>;
  closeComposer: () => void;
  showError: (message: string) => void;
  showSuccess: (message: string) => void;
};

const toNoticeAttachmentApi = (
  attachment: NonNullable<NoticeFeedItem['attachmentDetails']>[number],
): NonNullable<NoticeBoardPostApi['attachments']>[number] => ({
  boardFileId: attachment.boardFileId,
  fileName: attachment.name,
  fileSize: attachment.size,
  objectKey: attachment.objectKey,
  bucketName: attachment.bucketName,
});

const deleteUploadedNoticeAttachments = async (
  postId: number,
  attachments: NoticeBoardAttachmentApi[],
) => {
  await Promise.allSettled(
    attachments
      .map((attachment) => attachment.boardFileId)
      .filter((fileId): fileId is number | string => fileId != null)
      .map((fileId) => deleteNoticeAttachment(fileId, postId)),
  );
};

export function useNoticeMutations({
  setNoticeItems,
  setPinnedNoticeItems,
  setServerItemRevision,
  loadNoticePosts,
  noticeGubunNamesRef,
  editorDraft,
  setEditorDraft,
  closeComposer,
  showError,
  showSuccess,
}: UseNoticeMutationsOptions) {
  const handleSaveNotice = useCallback(
    async ({
      title,
      body,
      bodyJson,
      bodyText,
      noticeGubunCode,
      loginPopupYn,
      popupEndDate,
      attachments,
      removedAttachmentIds,
      embeddedImages,
      temporaryImages,
    }: NoticeComposerSubmitPayload) => {
      const trimmedTitle = title.trim();
      if (!trimmedTitle) return;

      const safeHtml = sanitizeNoticeBodyHtml(body || '<p></p>');
      const safeJson = bodyJson || JSON.stringify({ type: 'doc', content: [] });
      const safeText = (bodyText ?? toPlainText(safeHtml)).trim();
      const updatedDraft = { title: trimmedTitle, body: safeHtml, attachments };
      const existingId = editorDraft.id;
      let attachmentDeletionFailed = false;
      const noticePayload: NoticeBoardPostSavePayload = {
        title: trimmedTitle,
        contents: safeHtml,
        contentsHtml: safeHtml,
        contentsJson: safeJson,
        contentsText: safeText,
        noticeGubunCode,
        loginPopupYn,
        popupEndDate,
        embeddedImages,
        temporaryImages,
      };

      try {
        if (existingId) {
          const updated = await updateNoticePost(existingId, {
            ...noticePayload,
            isPinned: editorDraft.isPinned,
          });
          const uploadableFiles = attachments
            .map((attachment) => attachment.file)
            .filter((file): file is File => Boolean(file));
          const uploadedAttachments: NoticeBoardAttachmentApi[] = [];
          try {
            for (const file of uploadableFiles) {
              uploadedAttachments.push(
                await uploadNoticeAttachment(existingId, file),
              );
            }
          } catch (error) {
            await deleteUploadedNoticeAttachments(
              existingId,
              uploadedAttachments,
            );
            throw error;
          }
          try {
            for (const boardFileId of removedAttachmentIds) {
              await deleteNoticeAttachment(boardFileId, existingId);
            }
          } catch (error) {
            attachmentDeletionFailed = true;
            throw error;
          }
          const mergeUpdatedNotice = (item: NoticeFeedItem) => {
            if (item.id !== existingId) return item;
            const nextPost: NoticeBoardPostApi = {
              ...updated,
              postId: existingId,
              attachments: [
                ...attachments
                  .filter((attachment) => !attachment.file)
                  .map(toNoticeAttachmentApi),
                ...uploadedAttachments,
              ],
              comments: updated.comments,
              commentCount: updated.commentCount ?? item.commentCount,
              isPinned: updated.isPinned ?? item.isPinned,
            };
            const nextItem = mapNoticePost(
              nextPost,
              noticeGubunNamesRef.current,
            );
            return {
              ...nextItem,
              comments: updated.comments ? nextItem.comments : item.comments,
              commentCount: updated.comments
                ? nextItem.commentCount
                : item.commentCount,
            };
          };
          setNoticeItems((current) => current.map(mergeUpdatedNotice));
          setPinnedNoticeItems?.((current) => current.map(mergeUpdatedNotice));
          setServerItemRevision((revision) => revision + 1);
          showSuccess('공지사항이 수정되었습니다.');
        } else {
          const created = await createNoticePost(noticePayload);
          const createdId = Number(created.postId ?? 0);
          const uploadedAttachments: NoticeBoardAttachmentApi[] = [];
          if (createdId > 0) {
            const uploadableFiles = attachments
              .map((attachment) => attachment.file)
              .filter((file): file is File => Boolean(file));
            try {
              for (const file of uploadableFiles) {
                uploadedAttachments.push(
                  await uploadNoticeAttachment(createdId, file),
                );
              }
            } catch (error) {
              await deleteUploadedNoticeAttachments(
                createdId,
                uploadedAttachments,
              );
              throw error;
            }
          }
          if (createdId > 0) await loadNoticePosts({ silent: true });
          showSuccess('공지사항이 등록되었습니다.');
        }
      } catch (error) {
        showError(
          attachmentDeletionFailed
            ? '공지사항 첨부파일 삭제에 실패했습니다.'
            : '공지사항 저장에 실패했습니다.',
        );
        throw error;
      }

      setEditorDraft({
        title: '',
        body: '',
        noticeGubunCode: '',
        attachments: [],
      });
      closeComposer();
      return updatedDraft;
    },
    [
      closeComposer,
      editorDraft.id,
      editorDraft.isPinned,
      loadNoticePosts,
      noticeGubunNamesRef,
      setPinnedNoticeItems,
      setEditorDraft,
      setNoticeItems,
      setServerItemRevision,
      showError,
      showSuccess,
    ],
  );

  const handleDeleteNotice = useCallback(
    async (noticeId: number) => {
      try {
        await deleteNoticePost(noticeId);
        setNoticeItems((current) =>
          current.filter((item) => item.id !== noticeId),
        );
        setPinnedNoticeItems?.((current) =>
          current.filter((item) => item.id !== noticeId),
        );
        showSuccess('공지가 삭제되었습니다.');
      } catch {
        showError('공지 삭제에 실패했습니다.');
      }
    },
    [setNoticeItems, setPinnedNoticeItems, showError, showSuccess],
  );

  const handleConfirmTogglePinned = useCallback(
    async (item: NoticeFeedItem | null) => {
      if (!item) return;
      try {
        await updateNoticePinned(item.id, item.isPinned === 'Y' ? 'N' : 'Y');
        await loadNoticePosts({ silent: true, quiet: true });
        showSuccess(
          item.isPinned === 'Y'
            ? '상단 고정이 해제되었습니다.'
            : '상단 고정으로 설정되었습니다.',
        );
      } catch {
        showError('상단 고정 상태 변경에 실패했습니다.');
      }
    },
    [loadNoticePosts, showError, showSuccess],
  );

  return {
    handleSaveNotice,
    handleDeleteNotice,
    handleConfirmTogglePinned,
  };
}

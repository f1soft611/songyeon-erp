import type { CommonCommentItem } from '../../../../../shared/services/commonContentApi';

export type NoticeBoardAttachmentApi = {
  boardFileId?: number | string | null;
  postId?: number | string | null;
  fileName?: string | null;
  fileSize?: number | string | null;
  objectKey?: string | null;
  bucketName?: string | null;
  mimeType?: string | null;
  contentType?: string | null;
  fileUsageType?: string | null;
};

export type NoticeEmbeddedImageApi = {
  uploadToken: string;
  fileId?: number | string | null;
  fileName: string;
  fileSize: number;
  mimeType: string;
  objectKey: string;
  bucketName: string;
  imageUrl: string;
};

export type NoticeBoardPostApi = {
  postId?: number | string | null;
  title?: string | null;
  noticeGubunCode?: string | null;
  contents?: string | null;
  contentsHtml?: string | null;
  contentsJson?: string | null;
  contentsText?: string | null;
  writerId?: string | null;
  writerName?: string | null;
  writerProfileImage?: string | null;
  lastModifiedBy?: string | null;
  lastModifiedByName?: string | null;
  viewCount?: number | string | null;
  isPinned?: string | null;
  loginPopupYn?: 'Y' | 'N';
  popupEndDate?: string | null;
  createdAt?: string | Date | null;
  attachments?: NoticeBoardAttachmentApi[];
  comments?: Array<
    CommonCommentItem & {
      createdAt?: string | Date | null;
    }
  >;
  commentCount?: number | string | null;
  hasPreviousComments?: boolean;
  nextBeforeCommentId?: number | string | null;
  embeddedImages?: Array<{
    uploadToken: string;
    fileId?: number | string | null;
    objectKey: string;
    imageUrl: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    width?: number | string | null;
  }>;
};

export type NoticeComposerDraftAttachment = {
  id: string;
  name: string;
  size?: number;
  extension?: string;
  file?: File;
  boardFileId?: number | string | null;
  objectKey?: string | null;
  bucketName?: string | null;
};

export type NoticeComposerEmbeddedImage = {
  uploadToken: string;
  fileId?: number | string | null;
  objectKey: string;
  imageUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  width?: number | string | null;
};

export type NoticeComposerSubmitPayload = {
  title: string;
  noticeGubunCode: string;
  loginPopupYn: 'Y' | 'N';
  popupEndDate: string | null;
  body: string;
  bodyJson?: string;
  bodyText?: string;
  attachments: NoticeComposerDraftAttachment[];
  removedAttachmentIds: Array<number | string>;
  embeddedImages: NoticeComposerEmbeddedImage[];
  temporaryImages: Array<
    Pick<NoticeComposerEmbeddedImage, 'uploadToken' | 'fileName'>
  >;
};

export type NoticeBoardPostSavePayload = Partial<NoticeBoardPostApi> & {
  temporaryImages?: Array<
    Pick<NoticeComposerEmbeddedImage, 'uploadToken' | 'fileName'>
  >;
};

export type NoticeComposerDialogProps = {
  open: boolean;
  isDark: boolean;
  onClose: () => void;
  onSubmit?: (
    payload: NoticeComposerSubmitPayload,
  ) => Promise<unknown> | unknown;
  defaultTitle?: string;
  noticeGubunOptions?: Array<{ code: string; name: string }>;
  defaultNoticeGubunCode?: string;
  defaultLoginPopupYn?: 'Y' | 'N';
  defaultPopupEndDate?: string | null;
  defaultBody?: string;
  defaultAttachments?: NoticeComposerDraftAttachment[];
};

export type NoticeEditorDraft = {
  id?: number;
  title: string;
  body: string;
  isPinned?: string;
  loginPopupYn?: 'Y' | 'N';
  popupEndDate?: string | null;
  noticeGubunCode?: string;
  attachments: NoticeComposerDraftAttachment[];
};

export type NoticeCommentItem = {
  id: number;
  author: string;
  authorProfileImageUrl?: string | null;
  time: string;
  content: string;
  isDeleted?: boolean;
  isEditable?: boolean;
  attachments?: Array<{
    id: string;
    name: string;
    size?: number;
    mimeType?: string;
    previewUrl?: string;
    previewError?: string;
  }>;
  replies?: NoticeCommentItem[];
};

export type NoticeFeedItem = {
  id: number;
  writerId?: string | null;
  writerProfileImage?: string | null;
  isPostOwner?: boolean;
  title: string;
  viewCount?: number;
  createdAt?: string | Date | null;
  noticeGubunCode?: string;
  noticeGubunName?: string;
  meta: string;
  state: string;
  summary: string;
  summaryHtml?: string;
  body: string;
  bodyHtml?: string;
  attachments?: string[];
  attachmentDetails?: Array<{
    id: string;
    name: string;
    size?: number;
    boardFileId?: number | string | null;
    objectKey?: string | null;
    bucketName?: string | null;
  }>;
  comments?: NoticeCommentItem[];
  hasPreviousComments?: boolean;
  nextBeforeCommentId?: number | string | null;
  commentCount: number;
  isPinned?: string;
  loginPopupYn?: 'Y' | 'N';
  popupEndDate?: string | null;
  liked?: boolean;
  likeCount?: number;
  bookmarked?: boolean;
};

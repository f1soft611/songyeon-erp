import {
  apiDelete,
  apiDownload,
  apiGet,
  apiGetBlob,
  apiPost,
  apiPostFormData,
  apiPut,
} from './apiClient';
import { sanitizeHtml } from '../utils/sanitizeHtml';

export type CommonOwnerType =
  | 'NOTICE'
  | 'NOTICE_COMMENT'
  | 'BOARD'
  | 'APPROVAL';

export const COMMON_COMMENT_OWNER_TYPE = 'NOTICE_COMMENT' as const;

export type CommonFileItem = {
  fileId?: number | string | null;
  ownerType?: CommonOwnerType | string | null;
  ownerId?: number | string | null;
  fileName?: string | null;
  filePath?: string | null;
  objectKey?: string | null;
  bucketName?: string | null;
  mimeType?: string | null;
  contentType?: string | null;
  fileSize?: number | string | null;
  uploadedBy?: string | null;
};

export type CommonCommentItem = {
  commentId?: number | string | null;
  ownerType?: CommonOwnerType | string | null;
  ownerId?: number | string | null;
  parentCommentId?: number | string | null;
  content?: string | null;
  writerId?: string | null;
  writerName?: string | null;
  writerProfileImage?: string | null;
  deletedYn?: string | null;
  createdAt?: string | Date | null;
  attachments?: CommonFileItem[];
};

export type CommonCommentWritePayload = {
  content: string;
  parentCommentId?: number | string;
};

export type CommonCommentPageOptions = {
  limit?: number;
  pageIndex?: number;
  pageUnit?: number;
  beforeCommentId?: number | string;
};

export type CommonCommentPageResult = {
  comments: CommonCommentItem[];
  hasPrevious: boolean;
  nextBeforeCommentId?: number | string | null;
  resultCnt?: number;
};

const readItem = <T>(response: unknown): T | undefined => {
  if (!response || typeof response !== 'object') return undefined;
  const candidate = response as { item?: T; result?: T };
  return (candidate.item ?? candidate.result) as T | undefined;
};

export async function fetchCommonFiles(
  ownerType: CommonOwnerType | string,
  ownerId: number | string,
): Promise<CommonFileItem[]> {
  const result = await apiGet<{ resultList?: CommonFileItem[] }>(
    `/api/v1/common/files?ownerType=${encodeURIComponent(ownerType)}&ownerId=${encodeURIComponent(String(ownerId))}`,
  );
  return result.resultList ?? [];
}

export function fetchCommonFileBlob(
  ownerType: CommonOwnerType | string,
  ownerId: number | string,
  fileId: number | string,
): Promise<Blob> {
  const query = buildCommonFileOwnerQuery(ownerType, ownerId);
  return apiGetBlob(
    `/api/v1/common/files/${encodeURIComponent(String(fileId))}/download?${query}`,
  );
}

export async function uploadCommonFile(
  ownerType: CommonOwnerType | string,
  ownerId: number | string,
  file: File,
  uploaderId?: string,
): Promise<CommonFileItem> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('ownerType', String(ownerType));
  formData.append('ownerId', String(ownerId));
  if (uploaderId) formData.append('uploaderId', uploaderId);

  const result = await apiPostFormData<{ item?: CommonFileItem }>(
    '/api/v1/common/files/upload',
    formData,
  );

  return (
    readItem<CommonFileItem>(result) ?? {
      fileName: file.name,
      fileSize: file.size,
      contentType: file.type,
      ownerType,
      ownerId,
    }
  );
}

export function buildCommonFileOwnerQuery(
  ownerType: CommonOwnerType | string,
  ownerId: number | string,
): string {
  const query = new URLSearchParams({
    ownerType: String(ownerType),
    ownerId: String(ownerId),
  });
  return query.toString();
}

export function deleteCommonFile(
  ownerType: CommonOwnerType | string,
  ownerId: number | string,
  fileId: number | string,
): Promise<void>;
export function deleteCommonFile(fileId: number | string): Promise<void>;
export async function deleteCommonFile(
  ownerTypeOrFileId: CommonOwnerType | string | number,
  ownerId?: number | string,
  fileId?: number | string,
): Promise<void> {
  if (fileId === undefined || ownerId === undefined) {
    await apiDelete(`/api/v1/common/files/${ownerTypeOrFileId}`);
    return;
  }

  await apiDelete(
    `/api/v1/common/files/${fileId}?${buildCommonFileOwnerQuery(String(ownerTypeOrFileId), ownerId)}`,
  );
}

export function downloadCommonFile(
  ownerType: CommonOwnerType | string,
  ownerId: number | string,
  fileId: number | string,
  downloadFileName?: string,
): Promise<void>;
export function downloadCommonFile(
  fileId: number | string,
  downloadFileName?: string,
): Promise<void>;
export async function downloadCommonFile(
  ownerTypeOrFileId: CommonOwnerType | string | number,
  ownerIdOrDownloadFileName?: number | string,
  fileIdOrUndefined?: number | string,
  downloadFileName?: string,
): Promise<void> {
  const hasOwner =
    fileIdOrUndefined !== undefined && ownerIdOrDownloadFileName !== undefined;
  const targetFileId = hasOwner ? fileIdOrUndefined : ownerTypeOrFileId;
  const effectiveDownloadName = hasOwner
    ? downloadFileName
    : ownerIdOrDownloadFileName;
  const ownerQuery = hasOwner
    ? `?${buildCommonFileOwnerQuery(String(ownerTypeOrFileId), String(ownerIdOrDownloadFileName))}`
    : '';
  const url = `/api/v1/common/files/${targetFileId}/download${ownerQuery}`;
  await apiDownload(url, effectiveDownloadName as string | undefined);
}

export async function fetchCommonComments(
  ownerType: CommonOwnerType | string,
  ownerId: number | string,
  options: CommonCommentPageOptions = {},
): Promise<CommonCommentPageResult> {
  const query = new URLSearchParams({
    ownerType: String(ownerType),
    ownerId: String(ownerId),
  });
  if (options.limit !== undefined) {
    query.set('limit', String(options.limit));
  }
  if (options.pageIndex !== undefined) {
    query.set('pageIndex', String(options.pageIndex));
  }
  if (options.pageUnit !== undefined) {
    query.set('pageUnit', String(options.pageUnit));
  }
  if (options.beforeCommentId !== undefined) {
    query.set('beforeCommentId', String(options.beforeCommentId));
  }

  const result = await apiGet<{
    resultList?: CommonCommentItem[];
    comments?: CommonCommentItem[];
    hasPrevious?: boolean;
    nextBeforeCommentId?: number | string | null;
    resultCnt?: number | string | null;
  }>(`/api/v1/common/comments?${query.toString()}`);
  return {
    comments: result.comments ?? result.resultList ?? [],
    hasPrevious: result.hasPrevious === true,
    nextBeforeCommentId: result.nextBeforeCommentId,
    resultCnt: Number(result.resultCnt ?? 0) || 0,
  };
}

export async function createCommonComment(
  ownerType: CommonOwnerType | string,
  ownerId: number | string,
  content: string | CommonCommentWritePayload,
  parentCommentId?: number | string,
): Promise<CommonCommentItem> {
  const payload =
    typeof content === 'string'
      ? { content: sanitizeHtml(content), parentCommentId }
      : {
          content: sanitizeHtml(content.content),
          parentCommentId: content.parentCommentId,
        };
  const result = await apiPost<{ item?: CommonCommentItem }>(
    '/api/v1/common/comments',
    {
      ownerType,
      ownerId,
      ...payload,
    },
  );

  return (readItem<CommonCommentItem>(result) ?? {
    ownerType,
    ownerId,
    ...payload,
  }) as CommonCommentItem;
}

export async function updateCommonComment(
  ownerType: CommonOwnerType | string,
  ownerId: number | string,
  commentId: number | string,
  content: string | CommonCommentWritePayload,
): Promise<CommonCommentItem> {
  const commentContent =
    typeof content === 'string' ? content : content.content;
  const result = await apiPut<{ item?: CommonCommentItem }>(
    `/api/v1/common/comments/${encodeURIComponent(String(commentId))}`,
    { ownerType, ownerId, content: sanitizeHtml(commentContent) },
  );

  return (readItem<CommonCommentItem>(result) ?? {
    ownerType,
    ownerId,
    commentId,
    content: sanitizeHtml(commentContent),
  }) as CommonCommentItem;
}

export async function deleteCommonComment(
  ownerType: CommonOwnerType | string,
  ownerId: number | string,
  commentId: number | string,
): Promise<void> {
  await apiDelete(
    `/api/v1/common/comments/${encodeURIComponent(String(commentId))}?ownerType=${encodeURIComponent(String(ownerType))}&ownerId=${encodeURIComponent(String(ownerId))}`,
  );
}

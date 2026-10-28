import {
  apiDelete,
  apiDownload,
  apiGet,
  apiPost,
  apiPostFormData,
  apiPut,
} from '../../../../../shared/services/apiClient';
import type {
  NoticeBoardAttachmentApi,
  NoticeBoardPostApi,
  NoticeBoardPostSavePayload,
  NoticeEmbeddedImageApi,
} from '../types/community.types';
export type {
  NoticeBoardAttachmentApi,
  NoticeBoardPostApi,
  NoticeEmbeddedImageApi,
} from '../types/community.types';

type NoticeEmbeddedImageApiFields = Partial<NoticeEmbeddedImageApi> & {
  contentType?: string | null;
};

type NoticeEmbeddedImageApiResponse = NoticeEmbeddedImageApiFields & {
  item?: NoticeEmbeddedImageApiFields;
};

export function normalizeNoticeEmbeddedImage(
  value: NoticeEmbeddedImageApiResponse,
): NoticeEmbeddedImageApi {
  const source = value.item ?? value;
  return {
    uploadToken: String(source.uploadToken ?? ''),
    fileId: source.fileId ?? null,
    fileName: String(source.fileName ?? 'pasted-image'),
    fileSize: Number(source.fileSize ?? 0) || 0,
    mimeType: String(source.mimeType ?? source.contentType ?? ''),
    objectKey: String(source.objectKey ?? ''),
    bucketName: String(source.bucketName ?? ''),
    imageUrl: String(source.imageUrl ?? ''),
  };
}

type NoticeBoardListResponse = {
  resultList?: NoticeBoardPostApi[];
  resultCnt?: number;
  totalCount?: number;
  item?: NoticeBoardPostApi;
  result?: NoticeBoardPostApi | NoticeBoardPostApi[];
  message?: string;
};

function normalizeNoticePost(post: NoticeBoardPostApi): NoticeBoardPostApi {
  const legacyPost = post as NoticeBoardPostApi & {
    is_pinned?: string | null;
  };

  return {
    ...post,
    isPinned: post.isPinned ?? legacyPost.is_pinned ?? 'N',
  };
}

function readItem<T>(response: unknown): T | undefined {
  if (!response || typeof response !== 'object') {
    return undefined;
  }

  const candidate = response as { item?: T; result?: T };
  return (candidate.item ?? candidate.result) as T | undefined;
}

export async function fetchNoticePosts(
  page: number,
  size: number,
  keyword: string,
  noticeGubunCode?: string,
  isPinned?: string,
): Promise<{ resultList: NoticeBoardPostApi[]; resultCnt: number }> {
  const query = new URLSearchParams({
    pageIndex: String(page),
    pageUnit: String(size),
    keyword: keyword ?? '',
  });
  if (noticeGubunCode) {
    query.set('noticeGubunCode', noticeGubunCode);
  }
  if (isPinned) {
    query.set('isPinned', isPinned);
  }

  const result = await apiGet<NoticeBoardListResponse>(
    `/api/v1/groupware/boards/notice/posts?${query.toString()}`,
  );
  return {
    resultList: (result.resultList ?? []).map(normalizeNoticePost),
    resultCnt: Number(result.resultCnt ?? result.totalCount ?? 0) || 0,
  };
}

export function fetchPinnedNoticePosts(
  page: number,
  size: number,
  keyword: string,
  noticeGubunCode?: string,
) {
  return fetchNoticePosts(page, size, keyword, noticeGubunCode, 'Y');
}

export async function fetchNoticePostDetail(
  postId: number,
): Promise<NoticeBoardPostApi> {
  const result = await apiGet<{ item?: NoticeBoardPostApi }>(
    `/api/v1/groupware/boards/notice/posts/${postId}`,
  );

  return (readItem<NoticeBoardPostApi>(result) ?? {}) as NoticeBoardPostApi;
}

export async function createNoticePost(
  payload: NoticeBoardPostSavePayload,
): Promise<NoticeBoardPostApi> {
  const result = await apiPost<{ item?: NoticeBoardPostApi }>(
    '/api/v1/groupware/boards/notice/posts',
    payload,
  );
  return (readItem<NoticeBoardPostApi>(result) ??
    (payload as NoticeBoardPostApi)) as NoticeBoardPostApi;
}

export async function updateNoticePost(
  postId: number,
  payload: NoticeBoardPostSavePayload,
): Promise<NoticeBoardPostApi> {
  const result = await apiPut<{ item?: NoticeBoardPostApi }>(
    `/api/v1/groupware/boards/notice/posts/${postId}`,
    payload,
  );
  return (readItem<NoticeBoardPostApi>(result) ??
    (payload as NoticeBoardPostApi)) as NoticeBoardPostApi;
}

export async function updateNoticePinned(
  postId: number,
  isPinned: 'Y' | 'N',
): Promise<void> {
  await apiPut(`/api/v1/groupware/boards/notice/posts/${postId}/pin`, {
    isPinned,
  });
}

export async function deleteNoticePost(postId: number): Promise<void> {
  await apiDelete(`/api/v1/groupware/boards/notice/posts/${postId}`);
}

export async function uploadNoticeAttachment(
  postId: number,
  file: File,
): Promise<NoticeBoardAttachmentApi> {
  const formData = new FormData();
  formData.append('file', file);

  const result = await apiPostFormData<{ item?: NoticeBoardAttachmentApi }>(
    `/api/v1/groupware/boards/notice/posts/${postId}/attachments`,
    formData,
  );

  return (readItem<NoticeBoardAttachmentApi>(result) ?? {
    fileName: file.name,
    fileSize: file.size,
    contentType: file.type,
  }) as NoticeBoardAttachmentApi;
}

export async function uploadNoticeEmbeddedImage(
  file: File,
): Promise<NoticeEmbeddedImageApi> {
  const formData = new FormData();
  formData.append('file', file);
  const result = await apiPostFormData<NoticeEmbeddedImageApiResponse>(
    '/api/v1/groupware/boards/notice/embedded-images/temp',
    formData,
  );
  return normalizeNoticeEmbeddedImage(result);
}

export async function deleteNoticeEmbeddedImage(
  uploadToken: string,
  fileName: string,
): Promise<void> {
  const query = new URLSearchParams({ fileName });
  await apiDelete(
    `/api/v1/groupware/boards/notice/embedded-images/temp/${encodeURIComponent(uploadToken)}?${query}`,
  );
}

export async function deleteNoticeAttachment(
  boardFileId: number | string,
  postId: number | string,
): Promise<void> {
  await apiDelete(
    `/api/v1/groupware/boards/notice/attachments/${boardFileId}?postId=${encodeURIComponent(String(postId))}`,
  );
}

export async function downloadNoticeAttachment(
  attachment: NoticeBoardAttachmentApi,
): Promise<void> {
  const boardFileId = attachment.boardFileId;
  const postId = attachment.postId;
  if (!boardFileId || postId == null) {
    return;
  }

  const url = `/api/v1/groupware/boards/notice/attachments/${boardFileId}/download?postId=${encodeURIComponent(String(postId))}`;
  await apiDownload(url, attachment.fileName ?? undefined);
}

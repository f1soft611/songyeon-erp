import {
  apiDelete,
  apiDownload,
  apiGet,
  apiPostFormData,
  apiPut,
} from '../../../../../shared/services/apiClient';
import type {
  ArchiveFileRow,
  ArchiveFileSearchFilters,
  ArchiveFileUpdatePayload,
  ArchiveId,
  ArchivePageResult,
} from '../types/archive.types';

type ArchiveListApiResponse = {
  resultList?: ArchiveFileRow[];
  resultCnt?: number | string | null;
};

type ArchiveItemApiResponse<T> = {
  item?: T;
};

function requireItem<T>(response: ArchiveItemApiResponse<T>, label: string): T {
  if (response.item == null) {
    throw new Error(`Archive ${label} response did not include an item.`);
  }
  return response.item;
}

export async function fetchArchiveFiles(
  filters: ArchiveFileSearchFilters,
  signal?: AbortSignal,
): Promise<ArchivePageResult> {
  const query = new URLSearchParams();
  const normalizedKeyword = filters.keyword.trim();
  if (normalizedKeyword) query.set('keyword', normalizedKeyword);
  const normalizedFolderCode = filters.folderCode.trim();
  if (normalizedFolderCode) query.set('folderCode', normalizedFolderCode);
  if (filters.uploadedFrom) query.set('uploadedFrom', filters.uploadedFrom);
  if (filters.uploadedTo) query.set('uploadedTo', filters.uploadedTo);
  if (filters.fileType !== 'ALL') query.set('fileType', filters.fileType);

  const queryString = query.toString();
  const url = `/api/v1/groupware/boards/archive/files${queryString ? `?${queryString}` : ''}`;
  const response =
    signal === undefined
      ? await apiGet<ArchiveListApiResponse>(url)
      : await apiGet<ArchiveListApiResponse>(url, signal);
  return {
    resultList: response.resultList ?? [],
    resultCnt: Number(response.resultCnt ?? 0) || 0,
  };
}

export async function uploadArchiveFile(
  file: File,
  folderCode?: string,
): Promise<ArchiveFileRow> {
  const formData = new FormData();
  formData.append('file', file);
  if (folderCode?.trim()) {
    formData.append('folderCode', folderCode.trim());
  }
  const response = await apiPostFormData<ArchiveItemApiResponse<ArchiveFileRow>>(
    '/api/v1/groupware/boards/archive/files',
    formData,
  );
  return requireItem(response, 'file upload');
}

export async function updateArchiveFile(
  boardFileId: ArchiveId,
  payload: ArchiveFileUpdatePayload,
): Promise<ArchiveFileRow> {
  const response = await apiPut<ArchiveItemApiResponse<ArchiveFileRow>>(
    `/api/v1/groupware/boards/archive/files/${encodeURIComponent(String(boardFileId))}`,
    payload,
  );
  return requireItem(response, 'file update');
}

export function deleteArchiveAttachment(
  boardFileId: ArchiveId,
  postId: ArchiveId,
): Promise<void> {
  const query = new URLSearchParams({ postId: String(postId) });
  return apiDelete(
    `/api/v1/groupware/boards/archive/attachments/${encodeURIComponent(String(boardFileId))}?${query.toString()}`,
  );
}

export function downloadArchiveAttachment(file: {
  boardFileId: ArchiveId;
  postId: ArchiveId;
  fileName: string;
}): Promise<void> {
  const query = new URLSearchParams({ postId: String(file.postId) });
  const path = `/api/v1/groupware/boards/archive/attachments/${encodeURIComponent(String(file.boardFileId))}/download?${query.toString()}`;
  return apiDownload(path, file.fileName);
}

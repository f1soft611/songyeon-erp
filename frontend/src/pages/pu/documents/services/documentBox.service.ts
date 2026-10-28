import { apiDelete, apiDownload, apiGet, apiPost, apiPostFormData, apiPut } from '../../../../shared/services/apiClient';
import type { DocFile, DocFolder, DocPerson, DocShare, DocUser, ShareResult } from '../utils/documentBox';

// 구매관리 > 문서함 (송연 /api/doc-folders · /api/attachments(document) · /api/document-shares · /api/departments)
const PATH = '/api/v1/pu/documents';

export async function fetchMe(): Promise<DocUser> {
  return (await apiGet<{ item: DocUser }>(`${PATH}/me`)).item;
}

export async function fetchFolders(): Promise<DocFolder[]> {
  return (await apiGet<{ resultList: DocFolder[] }>(`${PATH}/folders`)).resultList ?? [];
}

export async function createFolder(body: { name: string; parentId: number | null; kind?: string; department?: string }): Promise<number> {
  return (await apiPost<{ id: number }>(`${PATH}/folders`, body)).id;
}

export const renameFolder = (id: number, name: string) => apiPut(`${PATH}/folders/${id}`, { name });
export const deleteFolder = (id: number) => apiDelete(`${PATH}/folders/${id}`);
export const setFolderLock = (id: number, password: string, current: string) => apiPost(`${PATH}/folders/${id}/lock`, { password, current });
export const clearFolderLock = (id: number, current: string) => apiPost(`${PATH}/folders/${id}/lock/remove`, { current });
export const unlockFolder = (id: number, password: string) => apiPost(`${PATH}/folders/${id}/unlock`, { password });

export async function fetchFiles(folderId: number): Promise<DocFile[]> {
  return (await apiGet<{ resultList: DocFile[] }>(`${PATH}/folders/${folderId}/files`)).resultList ?? [];
}

export async function uploadFiles(folderId: number, files: File[]): Promise<{ saved: number; errors: string[] }> {
  const form = new FormData();
  files.forEach((file) => form.append('files', file));
  return (await apiPostFormData<{ item: { saved: number; errors: string[] } }>(`${PATH}/folders/${folderId}/files`, form)).item;
}

export const downloadFile = (id: number, name: string) => apiDownload(`${PATH}/files/${id}/download`, name);
export const deleteFile = (id: number) => apiDelete(`${PATH}/files/${id}`);

export async function shareDocument(body: { attachmentId: number | null; folderId: number | null; toEmployeeIds: string[]; note: string; expiresAt: string }): Promise<ShareResult> {
  return (await apiPost<{ item: ShareResult }>(`${PATH}/shares`, body)).item;
}

export async function fetchSharePeople(): Promise<DocPerson[]> {
  return (await apiGet<{ resultList: DocPerson[] }>(`${PATH}/shares/people`)).resultList ?? [];
}

export async function fetchSharesToMe(): Promise<DocShare[]> {
  return (await apiGet<{ resultList: DocShare[] }>(`${PATH}/shares/mine`)).resultList ?? [];
}

export async function fetchSharesByMe(): Promise<DocShare[]> {
  return (await apiGet<{ resultList: DocShare[] }>(`${PATH}/shares/by-me`)).resultList ?? [];
}

export const cancelShare = (id: number) => apiDelete(`${PATH}/shares/${id}`);

export async function fetchDepartments(): Promise<string[]> {
  return (await apiGet<{ resultList: string[] }>(`${PATH}/departments`)).resultList ?? [];
}

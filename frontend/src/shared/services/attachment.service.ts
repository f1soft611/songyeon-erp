import { apiDelete, apiDownload, apiGet, apiPostFormData } from './apiClient';

// 공통 첨부 파일 (송연 /api/attachments). 지금은 입고 서류(scope=receiving)가 쓴다.
export type AttachmentFile = {
  id: number;
  scope?: string;
  refId?: string;
  origName: string;
  sizeBytes?: number | null;
  uploadedBy?: string | null;
  createdAt?: string | null;
};

export type UploadResult = { saved: number; errors: string[] };

const PATH = '/api/v1/co/attachments';

export async function uploadAttachments(scope: string, refId: string | number, files: File[]): Promise<UploadResult> {
  const form = new FormData();
  form.append('scope', scope);
  form.append('refId', String(refId));
  files.forEach((file) => form.append('files', file));
  const result = await apiPostFormData<{ item: UploadResult }>(PATH, form);
  return result.item ?? { saved: 0, errors: [] };
}

export async function fetchAttachments(scope: string, refId: string | number): Promise<AttachmentFile[]> {
  const result = await apiGet<{ resultList: AttachmentFile[] }>(`${PATH}?scope=${encodeURIComponent(scope)}&refId=${encodeURIComponent(String(refId))}`);
  return result.resultList ?? [];
}

// 올린 이름으로 내려받는다(한글 이름도 그대로)
export async function downloadAttachment(file: AttachmentFile): Promise<void> {
  await apiDownload(`${PATH}/${file.id}/download`, file.origName);
}

export async function deleteAttachment(id: number): Promise<void> {
  await apiDelete(`${PATH}/${id}`);
}

import {
  apiDelete,
  apiGet,
  apiGetBlob,
  apiPostFormData,
  apiPut,
} from '../../../../../shared/services/apiClient';

export type DraftFormTemplateDocument = Record<string, unknown>;

export type DraftFormTemplate = {
  draftingWorkCategoryId: number;
  cataTypeCode: string;
  codeName: string;
  hasDocument: boolean;
  templateJson: DraftFormTemplateDocument | null;
  templateHtml: string | null;
};

export type DraftFormTemplateEmbeddedImage = {
  uploadToken: string;
  fileName: string;
};

export type DraftFormTemplatePayload = {
  templateJson: DraftFormTemplateDocument;
  templateHtml: string;
  embeddedImages: DraftFormTemplateEmbeddedImage[];
};

export type DraftFormTemplateUpload = {
  uploadToken: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  previewUrl: string;
};

type ApiResponse<T> = {
  item?: T;
};

function requireItem<T>(result: ApiResponse<T>, errorMessage: string): T {
  if (!result.item) throw new Error(errorMessage);
  return result.item;
}

export async function fetchDraftFormTemplate(
  formId: number,
): Promise<DraftFormTemplate> {
  const result = await apiGet<ApiResponse<DraftFormTemplate>>(
    `/api/v1/co/workflow/forms/${formId}/template`,
  );
  return requireItem(result, '기안양식 본문을 불러오지 못했습니다.');
}

export async function saveDraftFormTemplate(
  formId: number,
  payload: DraftFormTemplatePayload,
): Promise<DraftFormTemplate> {
  const result = await apiPut<ApiResponse<DraftFormTemplate>>(
    `/api/v1/co/workflow/forms/${formId}/template`,
    payload,
  );
  return requireItem(result, '기안양식 본문을 저장하지 못했습니다.');
}

export async function uploadDraftFormTemplateImage(
  formId: number,
  file: File,
): Promise<DraftFormTemplateUpload> {
  const formData = new FormData();
  formData.append('file', file);
  const result = await apiPostFormData<ApiResponse<DraftFormTemplateUpload>>(
    `/api/v1/co/workflow/forms/${formId}/template-images/temp`,
    formData,
  );
  return requireItem(result, '기안양식 이미지를 업로드하지 못했습니다.');
}

export async function deleteDraftFormTemplateImage(
  formId: number,
  uploadToken: string,
  fileName: string,
): Promise<void> {
  const query = new URLSearchParams({ fileName });
  await apiDelete(
    `/api/v1/co/workflow/forms/${formId}/template-images/temp/${encodeURIComponent(uploadToken)}?${query}`,
  );
}

export async function fetchDraftFormTemplateImage(
  formId: number,
  fileId: number,
): Promise<Blob> {
  return apiGetBlob(
    `/api/v1/co/workflow/forms/${formId}/template-images/${fileId}`,
  );
}

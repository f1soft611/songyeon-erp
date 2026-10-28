import { apiDelete, apiGet, apiPost, apiPut } from '../../../../shared/services/apiClient';
import type { LabelBomRow, LabelCompanyInfo, LabelFormat, LabelInfo, LabelLayout } from '../../../../shared/components/LabelPrintDialog/label.types';
import type { LabelField, LabelProductRow, LabelRequestRow, LabelSourceProduct } from '../utils/labelRegister';

// 품질관리 > 라벨등록 (송연 label.py). 버전 목록 · 버전 한 개 · 양식 · 마크 · 회사정보 · 배합표 조회는 공용 라벨 API(label.service.ts)
const PATH = '/api/v1/qm/label-register';
const product = (code: string) => `${PATH}/products/${encodeURIComponent(code)}`;

export async function fetchLabelProducts(q: string): Promise<LabelProductRow[]> {
  return (await apiGet<{ resultList: LabelProductRow[] }>(`${PATH}/products${q ? `?q=${encodeURIComponent(q)}` : ''}`)).resultList ?? [];
}

// 라벨 내용(양식마다 다른 항목 extra 포함). versionId 가 없으면 사용중 버전에
export type LabelContent = Omit<LabelInfo, 'id' | 'productCode' | 'versionLabel' | 'isCurrent' | 'layout'> & { versionId?: number | null };

export async function saveLabel(code: string, body: LabelContent): Promise<{ versionId: number; isCurrent: boolean }> {
  return (await apiPut<{ item: { versionId: number; isCurrent: boolean } }>(`${product(code)}/label`, body)).item;
}
export const saveLayout = (code: string, body: LabelLayout & { versionId?: number | null }) => apiPut(`${product(code)}/layout`, body);

export async function createVersion(code: string, body: { fromVersionId: number | null; versionLabel: string; note: string }): Promise<{ id: number; versionLabel: string }> {
  return (await apiPost<{ item: { id: number; versionLabel: string } }>(`${product(code)}/versions`, body)).item;
}
export const renameVersion = (id: number, body: { versionLabel: string; note: string }) => apiPut(`${PATH}/versions/${id}/info`, body);
export const setVersionInUse = (id: number) => apiPut(`${PATH}/versions/${id}/use`, {});
export const deleteVersion = (id: number) => apiDelete(`${PATH}/versions/${id}`);

export async function fetchSourceProducts(exclude: string, q: string): Promise<LabelSourceProduct[]> {
  const query = `exclude=${encodeURIComponent(exclude)}${q ? `&q=${encodeURIComponent(q)}` : ''}`;
  return (await apiGet<{ resultList: LabelSourceProduct[] }>(`${PATH}/source-products?${query}`)).resultList ?? [];
}

export const saveCompanyInfo = (body: LabelCompanyInfo) => apiPut(`${PATH}/company-info`, body);

export async function createTemplate(body: { name: string; size: string; layout: LabelFormat }): Promise<number> {
  return (await apiPost<{ id: number }>(`${PATH}/templates`, body)).id;
}
export const updateTemplate = (id: number, body: { name: string; size: string; layout: LabelFormat }) => apiPut(`${PATH}/templates/${id}`, body);
export const deleteTemplate = (id: number) => apiDelete(`${PATH}/templates/${id}`);
export async function fetchTemplateUsage(id: number): Promise<{ count: number; products: { code: string; name: string }[] }> {
  return (await apiGet<{ item: { count: number; products: { code: string; name: string }[] } }>(`${PATH}/templates/${id}/usage`)).item;
}

export const addMark = (body: { name: string; dataUrl: string; widthMm: number }) => apiPost(`${PATH}/marks`, body);
export const deleteMark = (id: number) => apiDelete(`${PATH}/marks/${id}`);

export async function fetchFields(): Promise<LabelField[]> {
  return (await apiGet<{ resultList: LabelField[] }>(`${PATH}/fields`)).resultList ?? [];
}
export const addField = (name: string) => apiPost(`${PATH}/fields`, { name });
export const deleteField = (id: number) => apiDelete(`${PATH}/fields/${id}`);

export async function fetchRequests(status: string): Promise<LabelRequestRow[]> {
  return (await apiGet<{ resultList: LabelRequestRow[] }>(`${PATH}/requests${status ? `?status=${encodeURIComponent(status)}` : ''}`)).resultList ?? [];
}

// 요청 한 건 = 라벨 버전과 같은 모양 + 요청 정보 + 레시피 배합표
export type LabelRequestDetail = LabelInfo & {
  productName?: string | null;
  note?: string | null;
  movedProductCode?: string | null;
  recipeName?: string | null;
  clientName?: string | null;
  bom?: LabelBomRow[];
};
export async function fetchRequest(id: number): Promise<LabelRequestDetail> {
  return (await apiGet<{ item: LabelRequestDetail }>(`${PATH}/requests/${id}`)).item;
}
export const saveRequest = (id: number, body: LabelContent & { productName: string; layout: LabelLayout; note: string | null }) =>
  apiPut(`${PATH}/requests/${id}`, body);
export async function moveRequest(id: number, productCode: string): Promise<{ productCode: string; copiedFields: number }> {
  return (await apiPost<{ item: { productCode: string; copiedFields: number } }>(`${PATH}/requests/${id}/move`, { productCode })).item;
}

import { apiDelete, apiGet, apiPost, apiPut } from '../../../../../shared/services/apiClient';
import type { MaterialInfoPayload, MaterialInfoSaved, MaterialPriceSaved, MaterialRow, MaterialUsageRow, PriceLogRow, PriceScheduleRow, VendorOption } from '../types/materialMaster.types';

// 공통관리 > 기초정보 > 원재료마스터 주소(/api/v1/co/master/material-master). 2026-10-27 co/basic-info 에서 옮김
const toNumberOrNull = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};
const text = (value: unknown) => (value == null ? '' : String(value));

const MATERIAL_MASTER_PATH = '/api/v1/co/master/material-master';
const materialPath = (code: string) => `${MATERIAL_MASTER_PATH}/${encodeURIComponent(code)}`;
type ApiRow = Record<string, unknown>;

const toVendorOption = (item: ApiRow): VendorOption => ({
  code: text(item.clientCode) || null, // 2026-10-23 거래처코드
  name: text(item.clientName),
});

// 서버 원재료 한 줄(MaterialMasterVO) → 그리드 줄. 부자재마스터도 같이 쓴다
export const toMaterialRow = (item: ApiRow): MaterialRow => ({
  id: text(item.code),
  code: text(item.code),
  name: text(item.name),
  spec: text(item.spec),
  unitPrice: toNumberOrNull(item.unitPrice),
  stockQty: toNumberOrNull(item.stockQty),
  supplier: text(item.supplier),
  suppliers: ((item.suppliers as ApiRow[]) ?? []).map(toVendorOption),
  safetyStock: toNumberOrNull(item.safetyStock),
  baseOrderQty: toNumberOrNull(item.baseOrderQty),
  allergens: text(item.allergens),
  subCategory: text(item.subCategory),
  subCategoryNm: text(item.subCategoryNm),
  unit: text(item.unit),
  unitNm: text(item.unitNm),
  regUserNm: text(item.regUserNm),
  regDt: text(item.regDt),
  updUserNm: text(item.updUserNm),
  updDt: text(item.updDt),
  useYn: text(item.useYn) === 'N' ? 'N' : 'Y',
  unitWeight: toNumberOrNull(item.unitWeight),
  boxQty: toNumberOrNull(item.boxQty),
  lastUsedDate: text(item.lastUsedDate),
  usedByCount: toNumberOrNull(item.usedByCount),
});

// 검색어는 서버가 이름·코드로 찾는다(부자재도 함께 온다 — 화면이 가른다)
export async function fetchMaterialRows(q: string): Promise<MaterialRow[]> {
  const query = q.trim();
  const result = await apiGet<{ resultList: ApiRow[] }>(
    `${MATERIAL_MASTER_PATH}${query ? `?q=${encodeURIComponent(query)}` : ''}`,
  );
  return (result.resultList ?? []).map(toMaterialRow);
}

// 납품업체 자동완성(매입 거래처의 업체코드·업체명)
export async function fetchVendors(): Promise<VendorOption[]> {
  const result = await apiGet<{ resultList: ApiRow[] }>(`${MATERIAL_MASTER_PATH}/vendors`);
  return (result.resultList ?? []).map(toVendorOption);
}

// 신규 등록: 이름(+규격·단가)만 보내고 발번한 코드를 받는다
export async function createMaterial(payload: {
  name: string;
  spec: string | null;
  unitPrice: string | null;
  allowDuplicate?: boolean;
}): Promise<string> {
  const result = await apiPost<{ code?: unknown }>(MATERIAL_MASTER_PATH, payload);
  return text(result?.code);
}

// 이름·규격이 같은 원재료(띄어쓰기·대소문자 무시). excludeCode 는 뺀다(자기 자신)
export async function fetchSameMaterials(
  name: string,
  spec: string,
  excludeCode: string,
): Promise<{ code: string; name: string; spec: string }[]> {
  const params = new URLSearchParams({ name, spec });
  if (excludeCode) params.set('excludeCode', excludeCode);
  const result = await apiGet<{ resultList: ApiRow[] }>(`${MATERIAL_MASTER_PATH}/same?${params.toString()}`);
  return (result.resultList ?? []).map((item) => ({ code: text(item.code), name: text(item.name), spec: text(item.spec) }));
}

// 사용여부 바꾸기(2026-10-23, 원재료 · 부자재 같은 길)
export async function setMaterialUseYn(code: string, useYn: 'Y' | 'N'): Promise<void> {
  await apiPut(`${materialPath(code)}/use-yn`, { useYn });
}

// 보낸 칸만 고친다(안 보낸 칸은 서버가 건드리지 않는다). 이름은 늘 보낸다
export async function saveMaterialInfo(
  code: string,
  payload: Partial<MaterialInfoPayload> & { name: string },
): Promise<MaterialInfoSaved> {
  const result = await apiPut<{ item?: ApiRow }>(`${materialPath(code)}/info`, payload);
  const item = result?.item ?? {};
  return {
    renamedFrom: text(item.renamedFrom),
    cascadedBom: toNumberOrNull(item.cascadedBom) ?? 0,
    cascadedRecipeVersion: toNumberOrNull(item.cascadedRecipeVersion) ?? 0,
    cascadedRecipeSkipped: toNumberOrNull(item.cascadedRecipeSkipped) ?? 0,
  };
}

// 적용일자를 주면 그날부터 적용되도록 예약, 비우면 바로 반영(쓰는 제품 단가까지 따라 바뀐다)
export async function saveMaterialPrice(
  code: string,
  payload: { unitPrice: string; effectiveDate: string | null },
): Promise<MaterialPriceSaved> {
  const result = await apiPost<{ item?: ApiRow }>(`${materialPath(code)}/price`, payload);
  const item = result?.item ?? {};
  return {
    scheduled: Boolean(item.scheduled),
    effectiveDate: text(item.effectiveDate),
    affectedProducts: toNumberOrNull(item.affectedProducts) ?? 0,
  };
}

export async function fetchMaterialPriceLog(code: string): Promise<PriceLogRow[]> {
  const result = await apiGet<{ resultList: ApiRow[] }>(`${materialPath(code)}/price-log`);
  return (result.resultList ?? []).map((item) => ({
    changedAt: text(item.changedAt),
    oldPrice: toNumberOrNull(item.oldPrice),
    newPrice: toNumberOrNull(item.newPrice),
  }));
}

export async function fetchMaterialPriceSchedule(code: string): Promise<PriceScheduleRow[]> {
  const result = await apiGet<{ resultList: ApiRow[] }>(`${materialPath(code)}/price-schedule`);
  return (result.resultList ?? []).map((item) => ({
    id: toNumberOrNull(item.id) ?? 0,
    newPrice: toNumberOrNull(item.newPrice),
    effectiveDate: text(item.effectiveDate),
    applied: Number(item.applied) === 1,
  }));
}

export async function cancelMaterialPriceSchedule(id: number): Promise<void> {
  await apiDelete(`${MATERIAL_MASTER_PATH}/price-schedule/${id}`);
}

export async function fetchMaterialUsage(code: string): Promise<MaterialUsageRow[]> {
  const result = await apiGet<{ resultList: ApiRow[] }>(`${materialPath(code)}/usage`);
  return (result.resultList ?? []).map((item) => ({
    id: text(item.productCode),
    productCode: text(item.productCode),
    productName: text(item.productName),
    productSpec: text(item.productSpec),
    ratio: toNumberOrNull(item.ratioPercent),
  }));
}

// 일괄적용: 고른 제품들의 배합표에서 다른 원재료로 교체. 바꾼 제품 수를 돌려준다.
export async function replaceMaterial(
  code: string,
  newMaterialCode: string,
  productCodes: string[],
): Promise<number> {
  const result = await apiPost<{ affectedCount?: unknown }>(`${materialPath(code)}/bulk-replace`, {
    newMaterialCode,
    productCodes,
  });
  return toNumberOrNull(result?.affectedCount) ?? 0;
}

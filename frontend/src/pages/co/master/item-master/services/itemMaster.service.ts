import { apiGet, apiPost, apiPut } from '../../../../../shared/services/apiClient';
import type { BomEditRow, BomLine, BomLog, ClientOption, MaterialCheck, MaterialOption, ProductBomRow, SubMaterials } from '../types/itemMaster.types';

// 공통관리 > 기초정보 > 제품마스터 주소(/api/v1/co/master/item-master). 2026-10-27 co/basic-info 에서 옮김.
// 원재료 고르기 목록 · 거래처 고르기 목록 · 원재료 이름 확인도 이 주소에 있어 제품등록 · 견적 · 레시피가 같이 쓴다
const toNumberOrNull = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};
const text = (value: unknown) => (value == null ? '' : String(value));

// ===== 제품BOM =====
// 2026-10-20 화면별 주소로 옮김(옛 /api/v1/co/basic-info). 원재료 목록 · 거래처 이름 목록 · 원재료 이름 확인은 제품마스터 주소에 있다
const ITEM_MASTER_PATH = '/api/v1/co/master/item-master';
const productPath = (code: string) =>
  `${ITEM_MASTER_PATH}/${encodeURIComponent(code)}`;

export async function fetchProductBomRows(
  includeDiscontinued: boolean,
): Promise<ProductBomRow[]> {
  const result = await apiGet<{ resultList: Record<string, unknown>[] }>(
    `${ITEM_MASTER_PATH}${includeDiscontinued ? '?includeDiscontinued=true' : ''}`,
  );
  return (result.resultList ?? []).map(toProductBomRow);
}

// 서버 제품 한 줄(ProductBomVO) → 그리드 줄. 제품마스터 · 거래처별 제품조회가 같이 쓴다
export const toProductBomRow = (item: Record<string, unknown>): ProductBomRow => ({
    id: text(item.code),
    code: text(item.code),
    name: text(item.name),
    spec: text(item.spec),
    storage: text(item.storage),
    storageNm: text(item.storageNm),
    clientName: text(item.clientName),
    clientCode: text(item.clientCode),
    discontinued: Number(item.discontinued) === 1,
    discontinuedAt: text(item.discontinuedAt),
    discontinuedBy: text(item.discontinuedBy),
    regUserNm: text(item.regUserNm),
    regDt: text(item.regDt),
    updUserNm: text(item.updUserNm),
    updDt: text(item.updDt),
    materialCount: toNumberOrNull(item.materialCount) ?? 0,
    lastProducedDate: text(item.lastProducedDate),
});

const toBomLine = (item: Record<string, unknown>): BomLine => ({
  materialCode: item.materialCode == null ? null : String(item.materialCode),
  materialName: text(item.materialName),
  ratio: toNumberOrNull(item.ratioPercent),
  unitPricePerKg: toNumberOrNull(item.unitPricePerKg),
  amountPerKg: toNumberOrNull(item.amountPerKg),
});

export async function fetchBom(code: string): Promise<BomLine[]> {
  const result = await apiGet<{ resultList: Record<string, unknown>[] }>(`${productPath(code)}/bom`);
  return (result.resultList ?? []).map(toBomLine);
}

export async function fetchBomLog(code: string): Promise<BomLog[]> {
  const result = await apiGet<{ resultList: Record<string, unknown>[] }>(`${productPath(code)}/bom-log`);
  return (result.resultList ?? []).map((item) => ({
    logId: toNumberOrNull(item.logId) ?? 0,
    changedAt: text(item.changedAt),
    oldBom: ((item.oldBom as Record<string, unknown>[]) ?? []).map(toBomLine),
    newBom: ((item.newBom as Record<string, unknown>[]) ?? []).map(toBomLine),
  }));
}

// 배합비를 통째로 다시 적는다. 이름이나 비율이 빈 줄은 빼고, 비율은 퍼센트로 보낸다. 다시 계산한 원재료비를 돌려준다.
export async function saveBom(code: string, rows: BomEditRow[]): Promise<number> {
  const bom = rows
    .filter((row) => row.materialName.trim() && row.ratioPercent !== null)
    .map((row) => ({
      materialName: row.materialName.trim(),
      ratioPercent: row.ratioPercent,
      unitPrice: row.unitPrice,
      ...(row.materialCode ? { materialCode: row.materialCode } : {}),
    }));
  const result = await apiPut<{ materialCost?: number }>(`${productPath(code)}/bom`, { bom });
  return Number(result?.materialCost ?? 0) || 0;
}

export async function saveProductInfo(
  code: string,
  payload: { name: string; storage: string; clientCode: string },
): Promise<void> {
  // 2026-10-23 거래처는 목록에서 고른 거래처코드를 보낸다(서버가 그대로 저장)
  await apiPut(`${productPath(code)}/info`, {
    name: payload.name.trim(),
    storage: payload.storage.trim(),
    clientCode: payload.clientCode.trim(),
  });
}

// 줄을 지우지 않고 고르는 목록에서만 뺀다(송연 사용안함)
export async function setProductDiscontinued(code: string, discontinued: boolean): Promise<void> {
  await apiPut(`${productPath(code)}/discontinue`, { discontinued });
}

export async function fetchSubMaterials(code: string): Promise<SubMaterials> {
  const result = await apiGet<{ item?: Record<string, unknown> }>(`${productPath(code)}/sub-materials`);
  const item = result.item ?? {};
  return {
    pouchNetWeightKg: toNumberOrNull(item.pouchNetWeightKg),
    pouchLengthM: toNumberOrNull(item.pouchLengthM),
    pouchPerUnit: toNumberOrNull(item.pouchPerUnit),
    filmMaterialName: text(item.filmMaterialName),
    pouchMaterialName: text(item.pouchMaterialName),
    boxMaterialName: text(item.boxMaterialName),
  };
}

export async function saveSubMaterials(code: string, sub: SubMaterials): Promise<void> {
  await apiPut(`${productPath(code)}/sub-materials`, {
    pouchNetWeightKg: sub.pouchNetWeightKg,
    pouchLengthM: sub.pouchLengthM,
    pouchPerUnit: sub.pouchPerUnit,
    filmMaterial: sub.filmMaterialName.trim(),
    pouchMaterial: sub.pouchMaterialName.trim(),
    boxMaterial: sub.boxMaterialName.trim(),
  });
}

export async function fetchMaterialOptions(): Promise<MaterialOption[]> {
  const result = await apiGet<{ resultList: Record<string, unknown>[] }>(`${ITEM_MASTER_PATH}/materials`);
  return (result.resultList ?? []).map((item) => ({
    code: text(item.code),
    name: text(item.name),
    unitPrice: toNumberOrNull(item.unitPrice),
    subCategory: item.subCategory == null ? null : String(item.subCategory),
    subCategoryNm: text(item.subCategoryNm),
  }));
}

// 거래처 고르기 목록(2026-10-23): 사용 중 거래처의 코드 · 이름
export async function fetchClientOptions(): Promise<ClientOption[]> {
  const result = await apiGet<{ resultList: Record<string, unknown>[] }>(`${ITEM_MASTER_PATH}/client-options`);
  return (result.resultList ?? []).map((item) => ({ clientCode: text(item.clientCode), name: text(item.name) }));
}

export async function fetchClientNames(): Promise<string[]> {
  const result = await apiGet<{ resultList: unknown[] }>(`${ITEM_MASTER_PATH}/clients`);
  return (result.resultList ?? []).map((name) => String(name));
}

export async function checkMaterialNames(names: string[]): Promise<MaterialCheck[]> {
  const result = await apiPost<{ resultList: Record<string, unknown>[] }>(
    `${ITEM_MASTER_PATH}/materials/check`,
    { names },
  );
  return (result.resultList ?? []).map((item) => ({
    input: text(item.input),
    exact: Boolean(item.exact),
    suggestions: ((item.suggestions as unknown[]) ?? []).map((value) => String(value)),
  }));
}

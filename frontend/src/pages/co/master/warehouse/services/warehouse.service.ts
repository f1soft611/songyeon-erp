import { apiGet, apiPost, apiPut } from '../../../../../shared/services/apiClient';
import type { WarehouseRow, WarehouseSavePayload, WarehouseVO } from '../types/warehouse.types';

// 공통관리 > 기초정보 > 창고등록(BSWarehouseView, tb_warehouse 표). 재고조정도 창고 목록을 여기서 받는다
const toNumberOrNull = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toText = (value: unknown): string => (value == null ? '' : String(value));

const WAREHOUSE_PATH = '/api/v1/co/master/warehouse';

// includeUnused: 창고등록 화면만 사용안함 줄까지 받는다(재고조정 등은 사용 중만)
export async function fetchWarehouseRows(includeUnused = false): Promise<WarehouseRow[]> {
  const result = await apiGet<{ resultList: WarehouseVO[] }>(includeUnused ? `${WAREHOUSE_PATH}?includeUnused=true` : WAREHOUSE_PATH);
  return (result.resultList ?? []).map((item) => {
    const warehouseId = toNumberOrNull(item.warehouseId);
    return {
      id: String(warehouseId ?? ''),
      warehouseId,
      warehouseCd: toText(item.warehouseCd),
      name: toText(item.warehouseNm),
      warehouseType: toText(item.warehouseType),
      isDefault: toText(item.defaultYn) === 'Y',
      remark: toText(item.remark),
      materialCount: toNumberOrNull(item.materialCount) ?? 0,
      regUserNm: toText(item.regUserNm),
      regDt: toText(item.regDt),
      updUserNm: toText(item.updUserNm),
      updDt: toText(item.updDt),
      useYn: toText(item.useYn) === 'N' ? 'N' : 'Y',
    };
  });
}

// 창고코드는 보내지 않는다(서버가 6자리 숫자로 매김). 상태(useYn)는 저장할 때 함께 보낸다(2026-10-22)
const body = (payload: WarehouseSavePayload) => ({
  warehouseNm: payload.name.trim(),
  warehouseType: payload.warehouseType,
  remark: payload.remark.trim(),
  ...(payload.isDefault === undefined ? {} : { defaultYn: payload.isDefault }),
  useYn: payload.useYn,
});

// 기본창고로 켜서 등록하면 서버가 다른 기본창고를 끈다(전체에서 한 곳)
export async function createWarehouse(payload: WarehouseSavePayload): Promise<void> {
  await apiPost(WAREHOUSE_PATH, body(payload));
}

// 이름을 바꾸면 서버가 쓰던 곳까지 같이 바꾸고, 같이 옮긴 원재료 수(moved)를 돌려준다
export async function updateWarehouse(
  warehouseId: number,
  payload: WarehouseSavePayload,
): Promise<number> {
  const result = await apiPut<{ moved?: number }>(`${WAREHOUSE_PATH}/${warehouseId}`, body(payload));
  return Number(result?.moved ?? 0) || 0;
}

import { apiDelete, apiGet, apiPost } from '../../../../../shared/services/apiClient';
import type { BoxTypeRow, BoxTypeSavePayload, BoxTypeVO } from '../types/boxType.types';

// 공통관리 > 기초정보 > 포장유형(BoxTypeManagementPage, tb_box_type). 단가관리 · 제품등록 · 견적도 포장유형 목록을 여기서 받는다
const BOX_TYPE_PATH = '/api/v1/co/master/box-type';

// 포장유형코드(2026-10-22): 화면에서 받지 않는다. 새 줄은 빈 코드를 보내고 서버가 6자리 숫자(가장 큰 번호 + 1, 없으면 000001)로 매긴다

const toNumberOrNull = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toRow = (item: BoxTypeVO): BoxTypeRow => {
  const boxTypeId = toNumberOrNull(item.boxTypeId);
  return {
    id: String(boxTypeId ?? ''),
    boxTypeId,
    boxTypeCd: String(item.boxTypeCd ?? ''),
    boxTypeNm: String(item.boxTypeNm ?? ''),
    fixedMarginRate: toNumberOrNull(item.fixedMarginRate),
    lossRate: toNumberOrNull(item.lossRate),
    laborCost: toNumberOrNull(item.laborCost),
    packingCost: toNumberOrNull(item.packingCost),
    logisticsCost: toNumberOrNull(item.logisticsCost),
    marginAmt: toNumberOrNull(item.marginAmt),
    regUserId: String(item.regUserId ?? ''),
    regUserNm: String(item.regUserNm ?? ''),
    regDt: String(item.regDt ?? ''),
    updUserId: String(item.updUserId ?? ''),
    updUserNm: String(item.updUserNm ?? ''),
    updDt: String(item.updDt ?? ''),
    useYn: String(item.useYn ?? 'Y') === 'N' ? 'N' : 'Y',
  };
};

export const toBoxTypePayload = (row: BoxTypeRow): BoxTypeSavePayload => ({
  boxTypeId: row.boxTypeId,
  // 새 줄은 '' (서버가 매김). 저장된 줄은 코드를 바꾸지 않는다
  boxTypeCd: row.boxTypeId == null ? '' : row.boxTypeCd.trim(),
  boxTypeNm: row.boxTypeNm.trim(),
  fixedMarginRate: toNumberOrNull(row.fixedMarginRate),
  lossRate: toNumberOrNull(row.lossRate),
  laborCost: toNumberOrNull(row.laborCost),
  packingCost: toNumberOrNull(row.packingCost),
  logisticsCost: toNumberOrNull(row.logisticsCost),
  marginAmt: toNumberOrNull(row.marginAmt),
  // 사용여부 체크박스(2026-10-22): 'Y' 사용 · 'N' 사용안함
  useYn: row.useYn === 'N' ? 'N' : 'Y',
});

// includeUnused: 포장유형 화면만 사용안함 줄까지 받는다(단가관리 · 제품등록 · 견적은 사용 중만)
export async function fetchBoxTypeRows(includeUnused = false): Promise<BoxTypeRow[]> {
  const result = await apiGet<{ resultList: BoxTypeVO[] }>(includeUnused ? `${BOX_TYPE_PATH}?includeUnused=true` : BOX_TYPE_PATH);
  return (result.resultList ?? []).map(toRow);
}

// boxTypeId 가 없으면 새로 등록, 있으면 그 줄 수정(적용기간 · 이력은 관리하지 않는다)
export async function saveBoxType(payload: BoxTypeSavePayload): Promise<void> {
  await apiPost(BOX_TYPE_PATH, payload);
}

// 물리 삭제. 2026-10-27 포장유형 화면에서 행삭제를 뺐다(지금 화면에서는 부르지 않음). 사용안함은 사용여부 체크박스
export async function deleteBoxType(boxTypeId: number): Promise<void> {
  await apiDelete(`${BOX_TYPE_PATH}/${boxTypeId}`);
}

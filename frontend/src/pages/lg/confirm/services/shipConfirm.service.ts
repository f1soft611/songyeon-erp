import { apiGet, apiPost } from '../../../../shared/services/apiClient';
import { fetchCommonCodeGroups, fetchCommonCodeItems } from '../../../co/master/common-code/services/commonCodeManagement.service';
import type { CharterSummary, ShipRecord, ShipSource } from '../utils/shipConfirm';

// 물류관리 > 출하확정 (송연 LG0002). 포장방법 · 차량 목록은 공통코드(PACKING_TYPE · VEHICLE) 상세코드에서 받는다(2026-10-19, 예전엔 기초정보 탭).
const PATH = '/api/v1/lg/ship-confirm';

export async function fetchShipSchedule(date: string): Promise<ShipRecord[]> {
  const result = await apiGet<{ resultList: ShipRecord[] }>(`${PATH}?date=${encodeURIComponent(date)}`);
  return result.resultList ?? [];
}

export const PACKING_CODE_GROUP = 'PACKING_TYPE';
export const VEHICLE_CODE_GROUP = 'VEHICLE_INFO'; // 2026-10-26 송연 공통코드 '차량정보'

// 공통코드 그룹의 사용 중인 상세코드 이름(정렬순서대로). 그룹이 없으면 빈 목록
export async function fetchCommonCodeNames(groupCode: string): Promise<string[]> {
  const group = (await fetchCommonCodeGroups()).find((g) => g.groupCode === groupCode && g.useAt === 'Y');
  if (!group) return [];
  return (await fetchCommonCodeItems(group.id))
    .filter((item) => item.useAt === 'Y' && item.itemNm.trim())
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((item) => item.itemNm);
}

export async function fetchDriverNames(): Promise<string[]> {
  const result = await apiGet<{ resultList: string[] }>(`${PATH}/drivers`);
  return result.resultList ?? [];
}

// 실출하량 저장·재고 빼기·배차 등 저장·확정 표시를 서버가 한 번에 한다(중간에 막히면 모두 되돌린다)
export async function confirmShipment(source: ShipSource, id: number, body: Record<string, string | null>): Promise<void> {
  await apiPost(`${PATH}/${source}/${id}/confirm`, body);
}

export async function unconfirmShipment(source: ShipSource, id: number): Promise<void> {
  await apiPost(`${PATH}/${source}/${id}/unconfirm`, {});
}

export async function fetchCharterSummary(start: string, end: string): Promise<CharterSummary> {
  const result = await apiGet<{ item: CharterSummary }>(`${PATH}/charter-summary?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`);
  return result.item;
}

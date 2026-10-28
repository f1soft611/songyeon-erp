import { apiGet, apiPut } from '../../../../shared/services/apiClient';
import type { ActualRecord } from '../utils/productionActual';

// 생산관리 > 생산입고 (송연 PD0002)
const PATH = '/api/v1/pd/production-actual';

export async function fetchActualSchedule(date: string): Promise<ActualRecord[]> {
  const result = await apiGet<{ resultList: ActualRecord[] }>(`${PATH}?date=${encodeURIComponent(date)}`);
  return result.resultList ?? [];
}

// 실생산량 저장(제품 재고·원장·필름/파우치가 함께 움직인다). 빈 값이면 입고취소.
export async function saveActualQty(id: number, actualQty: string): Promise<void> {
  await apiPut(`${PATH}/${id}/actual-qty`, { actualQty });
}

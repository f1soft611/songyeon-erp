import { apiDelete, apiGet, apiPost, apiPut } from '../../../../shared/services/apiClient';
import type { BatchSheet, PendingOrder, SavedSchedule, ScheduleSaveBody } from '../utils/productionConfirm';

// 생산관리 > 생산확정 (송연 PD0001). 거래처·품목 후보는 수주등록 API 를 같이 쓴다.
const PATH = '/api/v1/pd/production-confirm';

export async function fetchSchedule(date: string): Promise<SavedSchedule[]> {
  const result = await apiGet<{ resultList: SavedSchedule[] }>(`${PATH}?date=${encodeURIComponent(date)}`);
  return result.resultList ?? [];
}

// 확정: 로트번호 발번 + 배합비대로 원재료 차감 + 수주 가져감 표시
export async function createSchedule(body: ScheduleSaveBody): Promise<{ id: number; lotNo: string }> {
  return apiPost<{ id: number; lotNo: string }>(PATH, body);
}

// 수정: 깎았던 원재료를 되돌린 뒤 다시 깎는다
export async function updateSchedule(id: number, body: ScheduleSaveBody): Promise<void> {
  await apiPut(`${PATH}/${id}`, body);
}

export async function deleteSchedule(id: number): Promise<void> {
  await apiDelete(`${PATH}/${id}`);
}

export async function fetchBatchSheet(id: number): Promise<BatchSheet> {
  const result = await apiGet<{ item: BatchSheet }>(`${PATH}/${id}/batch-sheet`);
  return result.item;
}

export async function fetchImportOrders(start: string, end: string): Promise<PendingOrder[]> {
  const result = await apiGet<{ resultList: PendingOrder[] }>(
    `${PATH}/import-orders?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,
  );
  return result.resultList ?? [];
}

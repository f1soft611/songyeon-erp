import { apiDelete, apiGet, apiPost } from '../../../../shared/services/apiClient';
import { toBulkBody, type Receiving, type ReceivingDetail, type ReceivingSummary, type StagingItem } from '../utils/receiving';

// 구매관리 > 입고관리 (송연 /api/materials/receiving · last-price · receiving-status)
// 매입 거래처·원재료는 기초정보, 발주 가져오기는 발주관리 서비스를 쓴다.
const PATH = '/api/v1/pu/receivings';

export type ReceivingQuery = { date?: string; start?: string; end?: string; clientQ?: string; materialQ?: string; kind?: '' | 'receiving' | 'return' };

export async function fetchReceivings(query: ReceivingQuery): Promise<Receiving[]> {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value != null && String(value).trim()) params.set(key, String(value).trim());
  });
  const result = await apiGet<{ resultList: Receiving[] }>(`${PATH}?${params.toString()}`);
  return result.resultList ?? [];
}

export async function registerReceivings(receiveDate: string, items: StagingItem[], isReturn: boolean): Promise<number> {
  const result = await apiPost<{ item: { registered: number } }>(`${PATH}/bulk`, toBulkBody(receiveDate, items, isReturn));
  return result.item?.registered ?? 0;
}

export async function cancelReceiving(id: number): Promise<void> {
  await apiDelete(`${PATH}/${id}`);
}

// 이 원재료를 마지막으로 입고했을 때의 단가(같은 거래처 우선)
export async function fetchLastPrice(materialCode: string, clientName: string): Promise<number | null> {
  const params = new URLSearchParams({ materialCode });
  if (clientName) params.set('clientName', clientName);
  const result = await apiGet<{ item: { unitPrice: number | null } }>(`${PATH}/last-price?${params.toString()}`);
  return result.item?.unitPrice ?? null;
}

export async function fetchReceivingSummary(start: string, end: string, clientQ: string, materialQ: string): Promise<ReceivingSummary[]> {
  const params = new URLSearchParams({ start, end });
  if (clientQ.trim()) params.set('clientQ', clientQ.trim());
  if (materialQ.trim()) params.set('materialQ', materialQ.trim());
  const result = await apiGet<{ resultList: ReceivingSummary[] }>(`${PATH}/summary?${params.toString()}`);
  return result.resultList ?? [];
}

export async function fetchReceivingDetail(materialCode: string, start: string, end: string, clientQ: string): Promise<ReceivingDetail> {
  const params = new URLSearchParams({ materialCode, start, end });
  if (clientQ.trim()) params.set('clientQ', clientQ.trim());
  const result = await apiGet<{ item: ReceivingDetail }>(`${PATH}/summary/detail?${params.toString()}`);
  return result.item ?? { rows: [], totalReceived: 0, totalUsed: 0 };
}

import { apiDelete, apiGet, apiPost } from '../../../../shared/services/apiClient';
import { toBulkBody, type PurchaseOrder, type StagingItem, type StatusQuery } from '../utils/purchaseOrder';

// 구매관리 > 발주관리 (송연 /api/materials/purchase-order)
// 매입 거래처·원재료 후보는 기초정보 서비스(fetchVendors · fetchMaterialOptions)를 쓴다.
const PATH = '/api/v1/pu/purchase-orders';

// 발주내역: 발주일 하나(비우면 전체) + 거래처
export async function fetchOrdersByDate(date: string, clientQ: string): Promise<PurchaseOrder[]> {
  const params = new URLSearchParams();
  if (date) params.set('date', date);
  if (clientQ.trim()) params.set('clientQ', clientQ.trim());
  const result = await apiGet<{ resultList: PurchaseOrder[] }>(`${PATH}?${params.toString()}`);
  return result.resultList ?? [];
}

// 발주현황: 기간 + 거래처·원재료명·입고여부
export async function fetchOrdersByPeriod(query: StatusQuery): Promise<PurchaseOrder[]> {
  const params = new URLSearchParams({ start: query.start, end: query.end });
  if (query.clientQ.trim()) params.set('clientQ', query.clientQ.trim());
  if (query.materialQ.trim()) params.set('materialQ', query.materialQ.trim());
  if (query.received) params.set('received', query.received);
  const result = await apiGet<{ resultList: PurchaseOrder[] }>(`${PATH}?${params.toString()}`);
  return result.resultList ?? [];
}

export async function registerOrders(orderDate: string, items: StagingItem[]): Promise<number> {
  const result = await apiPost<{ registered: number }>(`${PATH}/bulk`, toBulkBody(orderDate, items));
  return result.registered ?? 0;
}

export async function cancelOrder(id: number): Promise<void> {
  await apiDelete(`${PATH}/${id}`);
}

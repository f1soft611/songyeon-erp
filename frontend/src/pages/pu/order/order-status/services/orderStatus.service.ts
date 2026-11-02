import { apiGet } from '../../../../../shared/services/apiClient';
import type { PurchaseOrder } from '../../order-register/types/purchaseOrder.types';
import type { StatusQuery } from '../types/orderStatus.types';

// 구매관리 > 발주관리 > 발주현황. 발주등록과 같은 발주 API 를 기간으로 부른다
const PATH = '/api/v1/pu/order/purchase-orders';

// 기간 + 거래처 · 원재료명 · 입고여부
export async function fetchOrdersByPeriod(query: StatusQuery): Promise<PurchaseOrder[]> {
  const params = new URLSearchParams({ start: query.start, end: query.end });
  if (query.clientQ.trim()) params.set('clientQ', query.clientQ.trim());
  if (query.materialQ.trim()) params.set('materialQ', query.materialQ.trim());
  if (query.received) params.set('received', query.received);
  const result = await apiGet<{ resultList: PurchaseOrder[] }>(`${PATH}?${params.toString()}`);
  return result.resultList ?? [];
}

import { apiDelete, apiGet, apiPost } from '../../../../../shared/services/apiClient';
import type { PurchaseOrder, OrderStagingRow } from '../types/orderRegister.types';
import { orderQueryParams, toBulkBody } from '../utils/orderRegister';

// 구매관리 > 발주관리 > 발주등록 (송연 /api/materials/purchase-order). 입고관리 등록 창도 발주일별 발주를 여기서 받는다
// 매입 거래처·원재료 후보는 기초정보 서비스(fetchVendors · fetchMaterialOptions)를 쓴다.
const PATH = '/api/v1/pu/order/purchase-orders';

// 발주일 하나(비우면 전체) + 거래처. 입고관리 등록 창이 쓴다
export async function fetchOrdersByDate(date: string, clientQ: string): Promise<PurchaseOrder[]> {
  return fetchOrders(date, date, clientQ);
}

// 발주내역: 상세 발주일(시작 ~ 종료, 비우면 전체) + 거래처코드/명
export async function fetchOrders(from: string, to: string, clientQ: string): Promise<PurchaseOrder[]> {
  const params = orderQueryParams(from, to, clientQ);
  const result = await apiGet<{ resultList: PurchaseOrder[] }>(`${PATH}?${params.toString()}`);
  return result.resultList ?? [];
}

export async function registerOrders(orderDate: string, items: OrderStagingRow[]): Promise<number> {
  const result = await apiPost<{ registered: number }>(`${PATH}/bulk`, toBulkBody(orderDate, items));
  return result.registered ?? 0;
}

export async function cancelOrder(id: number): Promise<void> {
  await apiDelete(`${PATH}/${id}`);
}

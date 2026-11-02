import { apiDelete, apiGet, apiPost, apiPut } from '../../../../../shared/services/apiClient';
import type { OrderClientOption, OrderProduct, OrderSaveBody, SavedOrder } from '../types/salesOrder.types';

// 영업관리 > 수주등록 (송연 SA0004)
export type { OrderProduct } from '../types/salesOrder.types';

const PATH = '/api/v1/sales/order/order-register';

// 그 수주일의 수주(생산예정일 → 순서 순)
export async function fetchOrders(orderDate: string): Promise<SavedOrder[]> {
  const result = await apiGet<{ resultList: SavedOrder[] }>(`${PATH}?date=${encodeURIComponent(orderDate)}`);
  return result.resultList ?? [];
}

// 수주를 받을 수 있는 거래처(분류에 '매출')
export async function fetchOrderClients(): Promise<string[]> {
  const result = await apiGet<{ resultList: string[] }>(`${PATH}/clients`);
  return result.resultList ?? [];
}

// 거래처 고르기 팝업 후보(분류에 '매출', 코드 · 이름. 2026-10-29)
export async function fetchOrderClientOptions(): Promise<OrderClientOption[]> {
  const result = await apiGet<{ resultList: Array<Partial<OrderClientOption>> }>(`${PATH}/client-options`);
  return (result.resultList ?? [])
    .map((item) => ({ clientCode: item.clientCode ?? '', name: item.name ?? '' }))
    .filter((item) => item.clientCode && item.name);
}

// 품목 후보(사용 중인 제품)
export async function fetchOrderProducts(): Promise<OrderProduct[]> {
  const result = await apiGet<{ resultList: Array<Partial<OrderProduct>> }>(`${PATH}/products`);
  return (result.resultList ?? []).map((item) => ({
    code: item.code ?? '',
    name: item.name ?? '',
    spec: item.spec ?? '',
    clientName: item.clientName ?? '',
    display: item.display ?? item.name ?? '',
  }));
}

export async function createOrder(body: OrderSaveBody): Promise<number> {
  const result = await apiPost<{ id: number }>(PATH, body);
  return result.id;
}

export async function updateOrder(id: number, body: OrderSaveBody): Promise<void> {
  await apiPut(`${PATH}/${id}`, body);
}

export async function deleteOrder(id: number): Promise<void> {
  await apiDelete(`${PATH}/${id}`);
}

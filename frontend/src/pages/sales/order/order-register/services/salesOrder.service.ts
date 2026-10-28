import { apiDelete, apiGet, apiPost, apiPut } from '../../../../shared/services/apiClient';
import type { OrderSaveBody, SavedOrder } from '../utils/salesOrder';

// 영업관리 > 수주등록 (송연 SA0004)
export type OrderProduct = {
  code: string;
  name: string;
  spec: string;
  clientName: string;
  display: string; // 규격이 있으면 '이름(규격)'
};

const PATH = '/api/v1/sa/orders';

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

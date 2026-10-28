import { apiDelete, apiGet, apiPost, apiPut } from '../../../../shared/services/apiClient';
import type { LotAllocation, PendingOrder, ProductLot, ShipmentRecord, ShipmentSaveBody } from '../utils/shipment';

// 영업관리 > 출하등록 (송연 SA0005). 거래처·품목 후보는 수주등록 API 를 같이 쓴다.
const PATH = '/api/v1/sa/shipments';

export async function fetchShipments(date: string): Promise<ShipmentRecord[]> {
  const result = await apiGet<{ resultList: ShipmentRecord[] }>(`${PATH}?date=${encodeURIComponent(date)}`);
  return result.resultList ?? [];
}

export async function createShipment(body: ShipmentSaveBody): Promise<number> {
  const result = await apiPost<{ id: number }>(PATH, body);
  return result.id;
}

// 저장된 줄은 출하량만 고친다(생산연동 줄은 생산확정 줄의 실출하량)
export async function updateActualQty(record: ShipmentRecord, actualQty: string): Promise<void> {
  const path = record.source === 'production' ? `${PATH}/production/${record.id}/actual-qty` : `${PATH}/${record.id}/actual-qty`;
  await apiPut(path, { actualQty });
}

export async function deleteShipment(id: number): Promise<void> {
  await apiDelete(`${PATH}/${id}`);
}

export async function fetchAllocations(id: number): Promise<LotAllocation[]> {
  const result = await apiGet<{ resultList: LotAllocation[] }>(`${PATH}/${id}/lot-allocation`);
  return result.resultList ?? [];
}

export async function saveAllocations(id: number, allocations: { lotId: number; qty: number }[]): Promise<void> {
  await apiPut(`${PATH}/${id}/lot-allocation`, { allocations });
}

// 품목명(규격)과 같은 제품이 없으면 productCode 가 비어 있다
export async function fetchLots(productName: string): Promise<{ productCode: string | null; lots: ProductLot[] }> {
  const result = await apiGet<{ item?: { productCode?: string | null; lots?: ProductLot[] } }>(
    `${PATH}/lots?productName=${encodeURIComponent(productName)}`,
  );
  return { productCode: result.item?.productCode ?? null, lots: result.item?.lots ?? [] };
}

export async function fetchPlannedOrders(productName: string): Promise<PendingOrder[]> {
  const result = await apiGet<{ resultList: PendingOrder[] }>(`${PATH}/planned-orders?productName=${encodeURIComponent(productName)}`);
  return result.resultList ?? [];
}

export async function fetchImportOrders(start: string, end: string): Promise<PendingOrder[]> {
  const result = await apiGet<{ resultList: PendingOrder[] }>(
    `${PATH}/import-orders?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,
  );
  return result.resultList ?? [];
}

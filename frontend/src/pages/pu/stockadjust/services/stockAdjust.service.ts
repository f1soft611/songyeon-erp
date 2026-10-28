import { apiDelete, apiGet, apiPost, apiPut } from '../../../../shared/services/apiClient';
import type {
  ConfirmResult, MaterialStock, ProductMovement, StockSchedule, UploadResult, WarehouseLookup, WarehouseMove,
} from '../utils/stockAdjust';

// 구매관리 > 재고조정 (송연 /api/materials/stock-* · /api/products/stock-* · /api/warehouse-moves)
// 제품 전체 재고·로트는 제품재고관리 서비스(pages/lg/stock)를, 창고 목록은 기초정보 서비스를 쓴다.
const PATH = '/api/v1/pu/stock-adjust';
export type Target = 'materials' | 'products';

const list = async <T>(path: string) => (await apiGet<{ resultList: T[] }>(path)).resultList ?? [];

export const fetchSchedule = (target: Target) => list<StockSchedule>(`${PATH}/${target}/schedule`);

export async function uploadStock(target: Target, rows: string[][], warehouse = ''): Promise<UploadResult> {
  const result = await apiPost<{ item: UploadResult }>(`${PATH}/${target}/upload`, { rows, warehouse });
  return result.item;
}

export async function editSchedule(target: Target, id: number, editedQty: string): Promise<void> {
  await apiPut(`${PATH}/${target}/schedule/${id}`, { editedQty });
}

export async function cancelSchedule(target: Target, id: number): Promise<void> {
  await apiDelete(`${PATH}/${target}/schedule/${id}`);
}

export async function cancelAllSchedule(target: Target): Promise<number> {
  const result = await apiDelete<{ cancelled: number }>(`${PATH}/${target}/schedule`);
  return result.cancelled ?? 0;
}

export async function confirmSchedule(target: Target, effectiveDate: string, note?: string): Promise<ConfirmResult> {
  const result = await apiPost<{ item: ConfirmResult }>(`${PATH}/${target}/confirm`, { effectiveDate, note });
  return result.item;
}

// 시작·끝이 둘 다 있을 때만 기간으로
export function fetchMaterialHistory(start: string, end: string) {
  return list<StockSchedule>(`${PATH}/materials/history${start && end ? `?start=${start}&end=${end}` : ''}`);
}

export const fetchMaterials = () => list<MaterialStock>(`${PATH}/materials`);

export async function moveMaterial(code: string, body: { inQty: string; outQty: string; setQty: string; note: string }): Promise<void> {
  await apiPost(`${PATH}/materials/${encodeURIComponent(code)}/movement`, body);
}

export function fetchProductHistory(start: string, end: string, kind: string) {
  const params = new URLSearchParams();
  if (start) params.set('start', start);
  if (end) params.set('end', end);
  if (kind) params.set('kind', kind);
  const qs = params.toString();
  return list<ProductMovement>(`${PATH}/products/history${qs ? `?${qs}` : ''}`);
}

// ===== 창고이동 =====
export async function lookupMove(barcode: string): Promise<WarehouseLookup> {
  const result = await apiGet<{ item: WarehouseLookup }>(`${PATH}/warehouse-moves/lookup?barcode=${encodeURIComponent(barcode)}`);
  return result.item;
}

export const fetchMoveTargets = () => list<string>(`${PATH}/warehouse-moves/targets`);

export async function moveWarehouse(body: { materialCode: string; barcode?: string | null; packCount: string; movedDate: string; toWarehouse: string }) {
  const result = await apiPost<{ item: { qty: number; toWarehouse: string } }>(`${PATH}/warehouse-moves`, body);
  return result.item;
}

export const fetchMoves = (date: string) => list<WarehouseMove>(`${PATH}/warehouse-moves?date=${encodeURIComponent(date)}`);

export async function cancelMove(id: number): Promise<void> {
  await apiDelete(`${PATH}/warehouse-moves/${id}`);
}

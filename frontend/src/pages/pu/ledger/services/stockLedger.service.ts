import { apiGet, apiPost } from '../../../../shared/services/apiClient';
import { toLedgerBulkBody, type DraftItem, type LedgerRow, type StockAsOf } from '../utils/stockLedger';

// 구매관리 > 수불대장 (송연 /api/purchase-stock-range · /api/materials/stock-as-of)
// 발주 등록은 발주관리 API 를 source=ledger 로 쓴다(송연 /api/materials/purchase-order/bulk 와 같음).
const PATH = '/api/v1/pu/stock-ledger';

export async function fetchLedger(start: string, end: string): Promise<LedgerRow[]> {
  const result = await apiGet<{ resultList: LedgerRow[] }>(`${PATH}?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`);
  return result.resultList ?? [];
}

// 그 날짜 끝 시점 재고·재고금액(비우면 오늘)
export async function fetchStockAsOf(date: string): Promise<StockAsOf> {
  const result = await apiGet<{ item: StockAsOf }>(`${PATH}/stock-as-of${date ? `?date=${encodeURIComponent(date)}` : ''}`);
  return result.item;
}

export async function registerLedgerOrders(items: DraftItem[]): Promise<number> {
  const result = await apiPost<{ registered: number }>('/api/v1/pu/purchase-orders/bulk', toLedgerBulkBody(items));
  return result.registered ?? 0;
}

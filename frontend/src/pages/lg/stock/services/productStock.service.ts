import { apiGet } from '../../../../shared/services/apiClient';
import type { LotRecord, StockAsOf, StockRow, StockSort } from '../utils/productStock';

// 물류관리 > 제품재고관리 (송연 LG0001). 조회만 한다.
const PATH = '/api/v1/lg/product-stock';

export async function fetchStock(q: string, clientName: string, sort: StockSort): Promise<StockRow[]> {
  const params = new URLSearchParams({ sort });
  if (q.trim()) params.set('q', q.trim());
  if (clientName.trim()) params.set('clientName', clientName.trim());
  const result = await apiGet<{ resultList: StockRow[] }>(`${PATH}?${params.toString()}`);
  return result.resultList ?? [];
}

// 날짜를 비우면 오늘
export async function fetchStockAsOf(date: string): Promise<StockAsOf> {
  const result = await apiGet<{ item: StockAsOf }>(`${PATH}/as-of${date ? `?date=${encodeURIComponent(date)}` : ''}`);
  return result.item;
}

export async function fetchLots(code: string): Promise<LotRecord[]> {
  const result = await apiGet<{ resultList: LotRecord[] }>(`${PATH}/products/${encodeURIComponent(code)}/lots`);
  return result.resultList ?? [];
}

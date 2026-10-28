import { apiGet } from '../../../../shared/services/apiClient';
import type { MaterialLot, StockStatusData } from '../utils/stockStatus';

// 구매관리 > 재고현황 (송연 /api/materials/stock-as-of · /api/materials/{code}/lots). 조회만 한다
const PATH = '/api/v1/pu/stock-status';

export async function fetchStockStatus(date: string): Promise<StockStatusData> {
  const result = await apiGet<{ item: StockStatusData }>(`${PATH}?date=${encodeURIComponent(date)}`);
  return result.item;
}

export async function fetchMaterialLots(code: string, date: string): Promise<MaterialLot[]> {
  const result = await apiGet<{ resultList: MaterialLot[] }>(`${PATH}/materials/${encodeURIComponent(code)}/lots?date=${encodeURIComponent(date)}`);
  return result.resultList ?? [];
}

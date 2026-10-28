import { apiGet } from '../../../../shared/services/apiClient';
import { salesQueryString, type SalesQuery } from '../../status/utils/salesStatus';
import type { SalesTotal } from '../utils/salesTotal';

// 판매관리 > 토탈집계 (송연 GET /api/sales/total). 조회만 한다.
const PATH = '/api/v1/sl/sales-total';

export async function fetchSalesTotal(query: SalesQuery): Promise<SalesTotal> {
  const result = await apiGet<{ item: SalesTotal }>(`${PATH}?${salesQueryString(query)}`);
  return result.item ?? { rows: [], count: 0, inQty: 0, outQty: 0, totalAmount: 0, noPriceCount: 0 };
}

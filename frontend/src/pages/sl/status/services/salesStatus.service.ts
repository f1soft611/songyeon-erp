import { apiDelete, apiGet } from '../../../../shared/services/apiClient';
import { salesQueryString, type SalesQuery, type SalesStatus } from '../utils/salesStatus';

// 판매관리 > 판매현황 (송연 GET /api/sales · DELETE /api/sales/{id})
const PATH = '/api/v1/sl/sales-status';

export async function fetchSalesStatus(query: SalesQuery): Promise<SalesStatus> {
  const result = await apiGet<{ item: SalesStatus }>(`${PATH}?${salesQueryString(query)}`);
  return result.item ?? { rows: [], count: 0, totalQty: 0, totalAmount: 0, noPriceCount: 0 };
}

export async function deleteSale(id: number): Promise<void> {
  await apiDelete(`${PATH}/${id}`);
}

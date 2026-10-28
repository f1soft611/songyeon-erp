import { apiGet } from '../../../../shared/services/apiClient';
import { statusQueryString, type StatusQuery, type StatusRecord } from '../utils/productionStatus';

// 생산관리 > 생산현황 (송연 PD0003)
const PATH = '/api/v1/pd/production-status';

export async function fetchProductionStatus(query: StatusQuery): Promise<StatusRecord[]> {
  const result = await apiGet<{ resultList: StatusRecord[] }>(`${PATH}?${statusQueryString(query)}`);
  return result.resultList ?? [];
}

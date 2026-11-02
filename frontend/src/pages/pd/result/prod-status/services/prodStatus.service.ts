import { apiGet } from '../../../../../shared/services/apiClient';
import type { ProdStatusQuery, ProdStatusRow } from '../types/prodStatus.types';
import { statusQueryString } from '../utils/prodStatus';

// 생산관리 > 생산실적 > 생산현황 (송연 PD0003). 조회만
const PATH = '/api/v1/pd/result/prod-status';

export async function fetchProdStatus(query: ProdStatusQuery): Promise<ProdStatusRow[]> {
  const result = await apiGet<{ resultList: ProdStatusRow[] }>(`${PATH}?${statusQueryString(query)}`);
  return result.resultList ?? [];
}

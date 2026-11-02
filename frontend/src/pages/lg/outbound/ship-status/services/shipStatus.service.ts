import { apiGet } from '../../../../../shared/services/apiClient';
import type { ShipStatusQuery, ShipStatusRecord } from '../types/shipStatus.types';
import { statusQueryString } from '../utils/shipStatus';

// 물류관리 > 출고관리 > 출하현황 (송연 LG0003). 조회만 한다.
const PATH = '/api/v1/lg/outbound/ship-status';

export async function fetchShipStatus(query: ShipStatusQuery): Promise<ShipStatusRecord[]> {
  const result = await apiGet<{ resultList: ShipStatusRecord[] }>(`${PATH}?${statusQueryString(query)}`);
  return result.resultList ?? [];
}

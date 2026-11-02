import { apiGet, apiPost } from '../../../../../shared/services/apiClient';
import type { PullResult, ShippableList, ShippableRow } from '../utils/salesRegister';
import { toManualBody } from '../utils/salesRegister';

// 판매관리 > 판매등록 (송연 /api/sales/shippable · /api/sales/pull · POST /api/sales)
const PATH = '/api/v1/sl/entry/sales-register';

export async function fetchShippable(start: string, end: string, clientName: string): Promise<ShippableList> {
  const params = new URLSearchParams({ start, end });
  if (clientName.trim()) params.set('clientName', clientName.trim());
  const result = await apiGet<{ item: ShippableList }>(`${PATH}/shippable?${params.toString()}`);
  return result.item ?? { rows: [] };
}

// 금액은 보내지 않는다. 서버가 지금 출하 기록에서 다시 센다
export async function pullSales(items: { sourceType: string; sourceId: number }[]): Promise<PullResult> {
  const result = await apiPost<{ item: PullResult }>(`${PATH}/pull`, { items });
  return result.item;
}

export async function createManualSale(row: ShippableRow): Promise<void> {
  await apiPost(`${PATH}/manual`, toManualBody(row));
}

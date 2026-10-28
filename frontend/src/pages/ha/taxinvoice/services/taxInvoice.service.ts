import { apiGet, apiPost } from '../../../../shared/services/apiClient';
import type { TaxBatch, TaxSingle } from '../utils/taxInvoice';

// 인사·회계 > 세금계산서 (송연 /api/tax-invoice/* · /api/accounting/sales-by-client)
const PATH = '/api/v1/ha/tax-invoice';

export async function fetchTaxStatus(): Promise<boolean> {
  return Boolean((await apiGet<{ item: { configured: boolean } }>(`${PATH}/status`)).item?.configured);
}
export async function fetchTaxSingle(clientName: string, start: string, end: string): Promise<TaxSingle> {
  const qs = new URLSearchParams({ clientName, start, end });
  return (await apiGet<{ item: TaxSingle }>(`${PATH}/single?${qs.toString()}`)).item;
}
export async function fetchTaxBatch(start: string, end: string): Promise<TaxBatch> {
  const qs = new URLSearchParams({ start, end });
  return (await apiGet<{ item: TaxBatch }>(`${PATH}/batch?${qs.toString()}`)).item;
}
// 발행 요청. 지금은 서버가 안내 문구(발급업체 미연결 / 준비 중)로 막는다
export const issueSingle = (clientName: string, start: string, end: string) => apiPost(`${PATH}/issue-single`, { clientName, start, end });
export const issueBatch = (start: string, end: string, clientNames: string[]) => apiPost(`${PATH}/issue-batch`, { start, end, clientNames });

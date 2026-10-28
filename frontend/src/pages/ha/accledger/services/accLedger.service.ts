import { apiGet } from '../../../../shared/services/apiClient';
import type { LedgerKind, LedgerReport } from '../utils/accLedger';

// 인사·회계 > 거래처별관리대장 (송연 /api/accounting/client-ledger). 조회만 한다
const PATH = '/api/v1/ha/acc-ledger';

export async function fetchClientLedger(kind: LedgerKind, start: string, end: string, clients: string[]): Promise<LedgerReport> {
  const qs = new URLSearchParams({ kind, start, end });
  clients.forEach((n) => qs.append('client', n));
  return (await apiGet<{ item: LedgerReport }>(`${PATH}/client-ledger?${qs.toString()}`)).item;
}

// 고를 거래처: 거래처BOM 전체(송연 /api/accounting/clients)
export async function fetchLedgerClients(): Promise<string[]> {
  return (await apiGet<{ list: string[] }>(`${PATH}/clients`)).list ?? [];
}

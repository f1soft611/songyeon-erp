import { apiDelete, apiGet, apiPost, apiPut } from '../../../../shared/services/apiClient';
import type { CashReport } from '../../accio/utils/accIo';
import type { AccTransaction, TxFilter } from '../utils/accTx';

// 인사·회계 > 회계거래현황 (송연 /api/accounting/transactions). 계정과목 · 계좌 · 카드는 기초회계정보 서비스를 같이 쓴다
const PATH = '/api/v1/ha/acc-tx';

export async function fetchTransactions(f: TxFilter): Promise<{ rows: AccTransaction[]; inTotal: number; outTotal: number }> {
  const qs = new URLSearchParams(Object.entries(f).filter(([, v]) => v.trim())).toString();
  return (await apiGet<{ item: { rows: AccTransaction[]; inTotal: number; outTotal: number } }>(`${PATH}/transactions?${qs}`)).item;
}
export const saveTransaction = (id: number | null, body: Record<string, unknown>) =>
  (id == null ? apiPost(`${PATH}/transactions`, body) : apiPut(`${PATH}/transactions/${id}`, body));
export const deleteTransaction = (id: number) => apiDelete(`${PATH}/transactions/${id}`);

// 입·출금관리: 한쪽(입금 또는 출금)만 묶어 보기(송연 /api/accounting/cash-report)
export async function fetchCashReport(kind: string, start: string, end: string, clientName: string): Promise<CashReport> {
  const qs = new URLSearchParams(Object.entries({ kind, start, end, clientName }).filter(([, v]) => v.trim())).toString();
  return (await apiGet<{ item: CashReport }>(`${PATH}/cash-report?${qs}`)).item;
}

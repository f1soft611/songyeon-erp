import { apiGet } from '../../../../shared/services/apiClient';
import type { TradeKind, TradeReport, TradeSearch } from '../utils/accSales';

// 인사·회계 > 매출·매입관리 (송연 /api/accounting/trade-report). 조회만 한다
const PATH = '/api/v1/ha/acc-sales';

export async function fetchTradeReport(kind: TradeKind, s: TradeSearch): Promise<TradeReport> {
  const qs = new URLSearchParams({ kind, start: s.start, end: s.end, view: s.view, unit: s.unit });
  s.clients.forEach((n) => qs.append('client', n));
  s.items.forEach((n) => qs.append('item', n));
  return (await apiGet<{ item: TradeReport }>(`${PATH}/trade-report?${qs.toString()}`)).item;
}

// 조회 창의 고를 거리: 매출은 거래처BOM · 제품 '이름(규격)', 매입은 매입처 · 원재료
export async function fetchTradeOptions(kind: TradeKind): Promise<{ clients: string[]; items: string[] }> {
  return (await apiGet<{ item: { clients: string[]; items: string[] } }>(`${PATH}/options?kind=${encodeURIComponent(kind)}`)).item;
}

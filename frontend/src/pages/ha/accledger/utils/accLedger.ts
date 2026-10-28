// 인사·회계 > 거래처별관리대장 (송연 33-acc-cash.js 304~541 · accounting.py /api/accounting/client-ledger)
// 채권은 받을 돈(매출 − 입금), 채무는 줄 돈(매입 − 출금). 보는 방향만 다르고 하는 일이 같아서 한 화면 두 탭이다.
import type { ExcelColumn } from '../../../../shared/utils/excelFile';
import { todayFileTag } from '../../../../shared/utils/excelFile';

export type LedgerKind = '채권' | '채무';
export type LedgerEntry = {
  date: string; itemName: string; qty: number | null; unitPrice: number | null; amount: number | null; paid: number | null;
  unpriced: boolean; note: string; txId?: number; balance: number;
};
export type LedgerClient = {
  clientName: string; businessNo: string | null; openingBalance: number; tradeTotal: number; paidTotal: number; closingBalance: number;
  unpriced: number; entries: LedgerEntry[];
};
export type LedgerReport = { kind: LedgerKind; start: string; end: string; clients: LedgerClient[]; totalClosing: number };

export const LEDGER_TABS: Record<LedgerKind, { tab: string; dateLabel: string; payLabel: string }> = {
  채권: { tab: '채권 (받을 돈)', dateLabel: '판매일자', payLabel: '수금' },
  채무: { tab: '채무 (줄 돈)', dateLabel: '구매일자', payLabel: '지급' },
};

// 송연 accMoney: 원 단위 쉼표(빈 값은 0)
export const ledgerMoney = (v: number | null | undefined) => Number(v || 0).toLocaleString('ko-KR');
// 송연 fmt(수량)
export const ledgerQty = (v: number | null | undefined) =>
  (v == null || !Number.isFinite(v) ? '' : v.toLocaleString('ko-KR', { maximumFractionDigits: 2 }));

// 여기는 안 담으면 전체가 아니다. 한 곳 이상 담아야 한다(천 곳의 잔액을 한꺼번에 펴면 기간 앞의 거래를 거래처마다 다 더해야 해서 한참 걸린다)
export function ledgerSearchError(s: { start: string; end: string; clients: string[] }): string {
  if (!s.start || !s.end) return '조회 기간을 골라주세요';
  if (s.clients.length === 0) return '거래처를 한 곳 이상 담아주세요';
  return '';
}
export const ledgerCondition = (r: LedgerReport) => `${r.start} ~ ${r.end} · ${r.kind} · 거래처 ${r.clients.length}곳`;

// 엑셀: 거래처마다 갈라진 줄을 한 장으로 편다. 엑셀에서 걸러 보려면 거래처가 줄마다 적혀 있어야 한다
export type LedgerExcelRow = LedgerEntry & { clientName: string };
export function ledgerExcel(r: LedgerReport): { rows: LedgerExcelRow[]; columns: ExcelColumn<LedgerExcelRow>[]; fileName: string } {
  const t = LEDGER_TABS[r.kind];
  return {
    rows: r.clients.flatMap((c) => c.entries.map((e) => ({ clientName: c.clientName, ...e }))),
    columns: [
      { key: 'clientName', label: '거래처', width: 16 }, { key: 'date', label: t.dateLabel }, { key: 'itemName', label: '품목명', width: 18 },
      { key: 'qty', label: '수량' }, { key: 'unitPrice', label: '단가' }, { key: 'amount', label: '금액' },
      { key: 'balance', label: '잔액' }, { key: 'paid', label: t.payLabel },
    ],
    fileName: `거래처별관리대장_${r.kind}_${r.start}_${todayFileTag()}.xlsx`,
  };
}

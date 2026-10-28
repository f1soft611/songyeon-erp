import { describe, expect, it } from 'vitest';

import { LEDGER_TABS, ledgerCondition, ledgerExcel, ledgerMoney, ledgerSearchError, type LedgerReport } from '../src/pages/ha/accledger/utils/accLedger';

describe('거래처별관리대장(송연 33-acc-cash.js 304~541)', () => {
  it('탭마다 이름 · 날짜 칸 · 돈 칸이 다르다', () => {
    expect(LEDGER_TABS.채권).toEqual({ tab: '채권 (받을 돈)', dateLabel: '판매일자', payLabel: '수금' });
    expect(LEDGER_TABS.채무).toEqual({ tab: '채무 (줄 돈)', dateLabel: '구매일자', payLabel: '지급' });
  });

  it('조회 창: 기간 다음 거래처 한 곳 이상', () => {
    expect(ledgerSearchError({ start: '', end: '2026-10-15', clients: ['a'] })).toBe('조회 기간을 골라주세요');
    expect(ledgerSearchError({ start: '2026-10-01', end: '2026-10-15', clients: [] })).toBe('거래처를 한 곳 이상 담아주세요');
    expect(ledgerSearchError({ start: '2026-10-01', end: '2026-10-15', clients: ['a'] })).toBe('');
    expect(ledgerMoney(null)).toBe('0');
    expect(ledgerMoney(1234567.5)).toBe('1,234,567.5');
  });

  it('조건 줄 · 엑셀(거래처를 줄마다 적어 한 장으로 편다)', () => {
    const r: LedgerReport = {
      kind: '채무', start: '2026-10-01', end: '2026-10-31', totalClosing: 0,
      clients: [
        { clientName: 'A', businessNo: null, openingBalance: 0, tradeTotal: 0, paidTotal: 0, closingBalance: 0, unpriced: 0,
          entries: [{ date: '2026-10-02', itemName: '설탕', qty: 1, unitPrice: 10, amount: 10, paid: null, unpriced: false, note: '', balance: 10 }] },
        { clientName: 'B', businessNo: null, openingBalance: 0, tradeTotal: 0, paidTotal: 0, closingBalance: 0, unpriced: 0,
          entries: [{ date: '2026-10-03', itemName: '', qty: null, unitPrice: null, amount: null, paid: 5, unpriced: false, note: '', balance: -5 }] },
      ],
    };
    expect(ledgerCondition(r)).toBe('2026-10-01 ~ 2026-10-31 · 채무 · 거래처 2곳');
    const x = ledgerExcel(r);
    expect(x.columns.map((c) => c.label)).toEqual(['거래처', '구매일자', '품목명', '수량', '단가', '금액', '잔액', '지급']);
    expect(x.rows.map((row) => row.clientName)).toEqual(['A', 'B']);
    expect(x.fileName).toMatch(/^거래처별관리대장_채무_2026-10-01_\d{8}\.xlsx$/);
  });
});

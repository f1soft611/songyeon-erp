import { describe, expect, it } from 'vitest';

import { SALES_STATUS_EXCEL_COLUMNS, salesQueryString, statusSummary, todayFileTag } from '../src/pages/sl/status/utils/salesStatus';
import {
  SALES_TOTAL_EXCEL_COLUMNS, filterDirection, noPriceWarning, shownTotals, toTotalRows, type TotalRecord,
} from '../src/pages/sl/total/utils/salesTotal';

describe('판매현황(송연 sales.py GET /api/sales)', () => {
  it('조회 조건·요약·파일 이름·엑셀 칸', () => {
    expect(Object.fromEntries(new URLSearchParams(salesQueryString({ start: '2026-10-01', end: '2026-10-07', clientName: ' 달 ', productName: ' ' }))))
      .toEqual({ start: '2026-10-01', end: '2026-10-07', clientName: '달' });
    expect(statusSummary({ rows: [], count: 2, totalQty: 145, totalAmount: 669600, noPriceCount: 0 })).toBe('2건 · 수량 145 · 금액 669,600원');
    expect(statusSummary({ rows: [], count: 2, totalQty: 145, totalAmount: 669600, noPriceCount: 1 }))
      .toBe('2건 · 수량 145 · 금액 669,600원 (단가 없는 줄 1건은 금액에 안 들어갔어요)');
    expect(todayFileTag(new Date(2026, 9, 7))).toBe('20261007');
    expect(SALES_STATUS_EXCEL_COLUMNS.map((c) => c.label)).toEqual(['판매일자', '거래처', '품목명', '수량', '단가', '금액', '들어온곳', '메모']);
  });
});

describe('토탈집계(송연 sales.py GET /api/sales/total)', () => {
  const records: TotalRecord[] = [
    { direction: 'in', directionLabel: '입고', saleDate: '2026-10-06', qty: 135, sourceLabel: '생산입고' },
    { direction: 'in', directionLabel: '입고', saleDate: '2026-10-06', qty: 300, sourceLabel: '생산입고' },
    { id: 6, direction: 'out', directionLabel: '출고', saleDate: '2026-10-06', qty: 135, unitPrice: 4960, amount: 669600, sourceLabel: '출하확정' },
    { id: 7, direction: 'out', directionLabel: '출고', saleDate: '2026-10-07', qty: 10, unitPrice: null, amount: null, sourceLabel: '직접등록' },
  ];

  it('입고 줄은 id 가 없어 순서로 열쇠, 입고·출고 거르기', () => {
    const rows = toTotalRows(records);
    expect(rows.map((r) => r.key)).toEqual(['in:0', 'in:1', 'out:2', 'out:3']);
    expect(filterDirection(rows, 'in')).toHaveLength(2);
    expect(filterDirection(rows, 'out').map((r) => r.id)).toEqual([6, 7]);
    expect(filterDirection(rows, '')).toHaveLength(4);
  });

  it('보이는 줄로 합계: 입고·출고 수량 따로, 금액은 출고만, 단가 없는 출고 경고', () => {
    expect(shownTotals(records)).toEqual({ count: 4, inQty: 435, outQty: 145, amount: 669600, noPrice: 1 });
    expect(shownTotals(records.slice(0, 2))).toEqual({ count: 2, inQty: 435, outQty: 0, amount: 0, noPrice: 0 });
    expect(noPriceWarning(1)).toBe('단가가 없어 금액이 비어 있는 출고 줄이 1건 있어요. 아래 금액 합계에는 그만큼 빠져 있습니다.');
    expect(noPriceWarning(0)).toBe('');
    expect(SALES_TOTAL_EXCEL_COLUMNS.map((c) => c.label)).toEqual(['일자', '구분', '거래처', '품목명', '수량', '단가', '금액', '들어온곳', '메모']);
  });
});

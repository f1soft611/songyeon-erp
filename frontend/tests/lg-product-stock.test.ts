import { describe, expect, it } from 'vitest';

import {
  STOCK_EXCEL_COLUMNS, flattenLots, formatPrice, formatQty, lotText, plannedText, stockedOnly, totalStock, type StockRow,
} from '../src/pages/lg/stock/utils/productStock';

const row = (code: string, extra: Partial<StockRow> = {}): StockRow => ({ code, name: `품목${code}`, stockQty: 0, plannedQty: 0, plannedCount: 0, ...extra });
const lot = (lotId: number, extra = {}) => ({ lotId, lotNo: '', lotDate: '2026-10-06', status: 'produced' as const, producedQty: 10, shippedQty: 0, remainingQty: 10, ...extra });

describe('제품재고관리 utils(송연 LG0001)', () => {
  it('수량·금액 표시와 생산예정 칸', () => {
    expect(formatQty(1234.567)).toBe('1,234.57');
    expect(formatPrice(677148.7814)).toBe('677,148.7814');
    expect(formatPrice(null)).toBe('');
    expect(plannedText(row('1', { plannedQty: 1200, plannedCount: 2 }))).toBe('1,200 (2건)');
    expect(plannedText(row('1'))).toBe('');
    expect(totalStock([row('1', { stockQty: 1000 }), row('2', { stockQty: 135.5 })])).toBe(1135.5);
  });

  it('로트: 번호가 없으면 생산일, 펼친 품목만 목록 순서대로 모은다(불러오는 중은 빼고)', () => {
    expect(lotText(lot(1, { lotNo: '20261006-01' }))).toBe('20261006-01');
    expect(lotText(lot(1))).toBe('2026-10-06');
    const rows = [row('A', { spec: '5kg' }), row('B'), row('C')];
    const flat = flattenLots(rows, { C: [lot(9)], A: [lot(1), lot(2)], B: 'loading' });
    expect(flat.map((r) => r.key)).toEqual(['A-1', 'A-2', 'C-9']);
    expect(flat[0].productLabel).toBe('품목A(5kg)');
  });

  it('재고금액은 재고가 있는 품목만, 엑셀 칸은 송연과 같다', () => {
    expect(stockedOnly([{ code: '1', stockQty: 0 }, { code: '2', stockQty: -3 }, { code: '3', stockQty: 5 }]).map((p) => p.code)).toEqual(['2', '3']);
    expect(STOCK_EXCEL_COLUMNS.map((c) => c.label)).toEqual(['제품코드', '품목명', '규격', '거래처', '재고수량', '원재료비(단위당)', '재고금액']);
  });
});

import { describe, expect, it } from 'vitest';

import {
  emptyText, excelColumns, splitWarehouses, ssPrice, ssQty, visibleRows, visibleTotal, warehouseQty,
  type StockStatusRow,
} from '../src/pages/pu/stockstatus/utils/stockStatus';

const row = (code: string, extra: Partial<StockStatusRow> = {}): StockStatusRow => ({ code, name: `품목${code}`, stockQty: 0, ...extra });

describe('재고현황 utils(송연 29-stock-status.js)', () => {
  it('탭·검색·재고 0 제외. 서버 순서를 그대로 둔다', () => {
    const rows = [
      row('3', { name: 'Sugar', stockQty: 5 }),
      row('1', { name: '간장', stockQty: 0 }),
      row('9', { name: '필름', subCategory: '필름', stockQty: -2 }),
    ];
    expect(visibleRows(rows, 'material', '', true).map((r) => r.code)).toEqual(['3']);
    expect(visibleRows(rows, 'material', '', false).map((r) => r.code)).toEqual(['3', '1']);
    expect(visibleRows(rows, 'submaterial', '', true).map((r) => r.code)).toEqual(['9']);
    expect(visibleRows(rows, 'material', ' sug ', false).map((r) => r.code)).toEqual(['3']);
    expect(visibleRows(rows, 'material', '1', false).map((r) => r.code)).toEqual(['1']);
    expect(emptyText('material')).toBe('해당하는 원재료가 없습니다');
    expect(emptyText('submaterial')).toBe('해당하는 부자재가 없습니다');
  });

  it('합계는 보이는 줄만, 금액이 없으면 0 으로', () => {
    expect(visibleTotal([row('1', { amount: 1000 }), row('2', { amount: null }), row('3', { amount: 250.5 })])).toBe(1250.5);
  });

  it('창고가 한 곳뿐이면 창고 칸을 만들지 않는다. 없는 창고는 0', () => {
    expect(splitWarehouses(['본창고'])).toEqual([]);
    expect(splitWarehouses(undefined)).toEqual([]);
    expect(splitWarehouses(['본창고', '계량실'])).toEqual(['본창고', '계량실']);
    const r = row('1', { warehouseStock: [{ name: '본창고', qty: 7 }, { name: '계량실', qty: null }] });
    expect(warehouseQty(r, '본창고')).toBe(7);
    expect(warehouseQty(r, '계량실')).toBe(0);
    expect(warehouseQty(r, '없는창고')).toBe(0);
  });

  it('숫자 표기: 수량 둘째 자리, 단가 넷째 자리, 비면 빈칸', () => {
    expect(ssQty(1234.567)).toBe('1,234.57');
    expect(ssQty(0)).toBe('0');
    expect(ssQty(null)).toBe('');
    expect(ssPrice(1500)).toBe('1,500');
    expect(ssPrice(12.34567)).toBe('12.3457');
    expect(ssPrice(undefined)).toBe('');
  });

  it('엑셀 칸: 코드·품목명·규격·분류(없으면 원재료)·창고별·재고·단가·재고금액', () => {
    const cols = excelColumns(['본창고', '계량실']);
    expect(cols.map((c) => c.label)).toEqual(['코드', '품목명', '규격', '분류', '본창고', '계량실', '재고', '단가(원)', '재고금액']);
    const r = row('1', { warehouseStock: [{ name: '계량실', qty: 3 }] });
    const value = (i: number) => (typeof cols[i].key === 'function' ? (cols[i].key as (x: StockStatusRow) => unknown)(r) : r[cols[i].key as keyof StockStatusRow]);
    expect(value(3)).toBe('원재료');
    expect(value(4)).toBe(0);
    expect(value(5)).toBe(3);
    expect(excelColumns([]).map((c) => c.label)).toEqual(['코드', '품목명', '규격', '분류', '재고', '단가(원)', '재고금액']);
  });
});

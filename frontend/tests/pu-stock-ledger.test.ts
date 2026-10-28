import { describe, expect, it } from 'vitest';

import {
  STOCK_AS_OF_EXCEL_COLUMNS, adjustTitle, dateRangeList, dayLabel, draftItems, emptyText, filterRows, groupByVendor, ledgerNum,
  orderCellValue, registeredMessage, splitBySupplier, toLedgerBulkBody, whQtyText,
  type LedgerRow,
} from '../src/pages/pu/ledger/utils/stockLedger';

const row = (code: string, extra: Partial<LedgerRow> = {}): LedgerRow => ({ code, name: `원재료${code}`, totalUsage: 0, remainingStock: 0, suppliers: [], ...extra });

describe('수불대장 utils(송연 18-stock.js)', () => {
  it('숫자: 0·빈 값은 빈칸, 둘째 자리, 0 으로 보이는 작은 값은 자리를 늘린다. 창고 칸은 0 을 0 으로', () => {
    expect(ledgerNum(0)).toBe('');
    expect(ledgerNum(null)).toBe('');
    expect(ledgerNum(1234.567)).toBe('1,234.57');
    expect(ledgerNum(-5)).toBe('-5');
    expect(ledgerNum(0.001)).toBe('0.001');
    expect(whQtyText(0)).toBe('0');
    expect(whQtyText(12.5)).toBe('12.5');
  });

  it('날짜 목록(최대 62일)과 머리 표기', () => {
    expect(dateRangeList('2026-09-29', '2026-10-02')).toEqual(['2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02']);
    expect(dateRangeList('2026-10-02', '2026-10-01')).toEqual([]);
    expect(dateRangeList('2026-01-01', '2026-12-31')).toHaveLength(62);
    expect(dayLabel('2026-10-06')).toBe('10/06');
  });

  it('탭·검색·보기 거르기와 이름순, 빈 문구', () => {
    const rows = [
      row('3', { name: '설탕', totalUsage: 5, remainingStock: 0 }),
      row('1', { name: '간장', totalUsage: 0, remainingStock: 7 }),
      row('9', { name: '필름', subCategory: '필름', remainingStock: 3 }),
    ];
    expect(filterRows(rows, 'material', '', 'used').map((r) => r.code)).toEqual(['3']);
    expect(filterRows(rows, 'material', '', 'nonzero').map((r) => r.code)).toEqual(['1']);
    expect(filterRows(rows, 'material', '', 'all').map((r) => r.code)).toEqual(['1', '3']);
    expect(filterRows(rows, 'submaterial', '', 'all').map((r) => r.code)).toEqual(['9']);
    expect(filterRows(rows, 'material', '설', 'all').map((r) => r.code)).toEqual(['3']);
    expect(filterRows(rows, 'material', '1', 'all').map((r) => r.code)).toEqual(['1']);
    expect(emptyText('material', 'used')).toBe('생산스케줄에서 사용된 원재료가 없습니다');
    expect(emptyText('submaterial', 'nonzero')).toBe('남은재고가 있는 부자재가 없습니다');
    expect(emptyText('submaterial', 'all')).toBe('부자재가 없습니다');
  });

  it('발주량 칸: 적어둔 값 → 첫 날짜 칸에만 기초발주량. 미리 채운 값은 적어둔 것이 아니다', () => {
    const r = row('1', { suggestedOrderQty: 50 });
    expect(orderCellValue(r, '2026-10-06', 0, {})).toBe('50');
    expect(orderCellValue(r, '2026-10-07', 1, {})).toBe('');
    expect(orderCellValue(r, '2026-10-06', 0, { '1|2026-10-06': '12' })).toBe('12');
    expect(draftItems({}, [r])).toEqual([]);
    expect(draftItems({ '1|2026-10-06': '12', '1|2026-10-07': '0', '2|2026-10-06': 'abc' }, [row('1', { suppliers: ['대한'] })])).toEqual([
      { materialCode: '1', materialName: '원재료1', orderDate: '2026-10-06', qty: 12, suppliers: ['대한'] },
    ]);
  });

  it('업체: 한 곳이면 그대로, 여럿·없음은 묻고, 업체별(가나다) → 발주일 → 이름 순으로 묶는다', () => {
    const items = [
      { materialCode: 'B', materialName: '설탕', orderDate: '2026-10-07', qty: 5, suppliers: ['삼양'] },
      { materialCode: 'A', materialName: '간장', orderDate: '2026-10-07', qty: 3, suppliers: ['삼양'] },
      { materialCode: 'C', materialName: '소금', orderDate: '2026-10-06', qty: 2, suppliers: ['삼양'] },
      { materialCode: 'D', materialName: '고추', orderDate: '2026-10-06', qty: 1, suppliers: ['대한', '삼양'] },
      { materialCode: 'E', materialName: '마늘', orderDate: '2026-10-06', qty: 1, suppliers: [] },
    ];
    const { decided, needAsk } = splitBySupplier(items);
    expect(decided.map((it) => [it.materialCode, it.clientName])).toEqual([['B', '삼양'], ['A', '삼양'], ['C', '삼양']]);
    expect(needAsk.map((it) => it.materialCode)).toEqual(['D', 'E']);
    const groups = groupByVendor([...decided, { ...needAsk[0], clientName: '대한' }]);
    expect(groups.map((g) => [g.name, g.count, g.dates.map((d) => d.date)])).toEqual([['대한', 1, ['2026-10-06']], ['삼양', 3, ['2026-10-06', '2026-10-07']]]);
    expect(groups[1].dates[1].items.map((it) => it.materialName)).toEqual(['간장', '설탕']);
    expect(toLedgerBulkBody([{ ...decided[0] }])).toEqual({ source: 'ledger', items: [{ materialCode: 'B', clientName: '삼양', qty: '5', orderDate: '2026-10-07' }] });
    expect(registeredMessage(3)).toBe('3건 발주 등록됐어요.\n지우려면 발주등록 화면에서 지워주세요.');
  });

  it('조사 꼬리표 설명과 재고 엑셀 칸', () => {
    expect(adjustTitle(row('1', { totalAdjust: 0 }))).toBe('');
    expect(adjustTitle(row('1', { totalAdjust: 2.5, adjustNote: '실사' }))).toBe('재고조사로 +2.5 만큼 맞춘 값이에요\n사유: 실사');
    expect(adjustTitle(row('1', { totalAdjust: -3 }))).toBe('재고조사로 -3 만큼 맞춘 값이에요');
    expect(STOCK_AS_OF_EXCEL_COLUMNS.map((c) => c.label)).toEqual(['원재료코드', '원재료명', '규격', '재고수량', '단가', '재고금액']);
  });
});

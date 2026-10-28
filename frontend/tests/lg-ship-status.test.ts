import { describe, expect, it } from 'vitest';

import {
  SHIP_STATUS_EXCEL_COLUMNS, carryoverText, dash, qtyText, statusExcelName, statusQueryString, toStatusRow,
} from '../src/pages/lg/status/utils/shipStatus';

describe('출하현황 utils(송연 LG0003)', () => {
  it('조회 조건: 빈 품목명·거래처명은 보내지 않는다, 엑셀 이름', () => {
    const query = { start: '2026-10-01', end: '2026-10-07', productName: '  ', clientName: ' 달구지 ' };
    expect(Object.fromEntries(new URLSearchParams(statusQueryString(query)))).toEqual({ start: '2026-10-01', end: '2026-10-07', clientName: '달구지' });
    expect(statusExcelName(query)).toBe('출하현황_2026-10-01~2026-10-07.xlsx');
  });

  it('2026-10-26 출하량은 숫자로 읽고 천 단위 쉼표로 보인다', () => {
    expect(toStatusRow({ id: 1, scheduleType: 'logistics', orderQty: '340000' }).orderQty).toBe(340000);
    expect(toStatusRow({ id: 1, scheduleType: 'logistics', orderQty: '1,500kg' }).orderQty).toBe(1500);
    expect(toStatusRow({ id: 1, scheduleType: 'logistics', orderQty: '' }).orderQty).toBeNull();
    expect(toStatusRow({ id: 1, scheduleType: 'logistics' }).orderQty).toBeNull();
    expect(qtyText(340000)).toBe('340,000');
    expect(qtyText(95.5)).toBe('95.5');
    expect(qtyText(null)).toBe('');
  });

  it('줄 열쇠는 출처까지(두 곳의 id 가 겹칠 수 있다), 빈 칸은 빈칸, 이월만 꼬리표', () => {
    expect(toStatusRow({ id: 6, scheduleType: 'production' }).key).toBe('production:6');
    expect(toStatusRow({ id: 6, scheduleType: 'logistics' }).key).toBe('logistics:6');
    expect(dash(null)).toBe('');
    expect(dash(0)).toBe('0');
    expect(carryoverText({ id: 1, scheduleType: 'logistics', carriedOver: true, carryoverLabel: '이월(2026-11)' })).toBe('이월(2026-11)');
    expect(carryoverText({ id: 1, scheduleType: 'logistics', carriedOver: true, carryoverLabel: '' })).toBe('이월');
    expect(carryoverText({ id: 1, scheduleType: 'logistics', carriedOver: false, carryoverLabel: '이월' })).toBe('');
    expect(SHIP_STATUS_EXCEL_COLUMNS.map((c) => c.label)).toEqual(['출고일', '거래처', '품목명', '보관방법', '출하량', '배차', '운행자', '순서', '포장방법', '특이사항', '비고']);
  });
});

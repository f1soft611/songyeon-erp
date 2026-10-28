import { describe, expect, it } from 'vitest';

import { ACTUAL_EXCEL_COLUMNS, isLocked, toActualRow, undoMessage } from '../src/pages/pd/actual/utils/productionActual';

describe('생산입고 utils(송연 PD0002)', () => {
  it('실생산량이 적힌 줄은 잠기고, 수정 중이면 풀린다', () => {
    const saved = toActualRow({ id: 2, actualQty: '1000' });
    expect(saved).toMatchObject({ input: '1000', saved: '1000', editing: false });
    expect(isLocked(saved)).toBe(true);
    expect(isLocked({ ...saved, editing: true })).toBe(false);
    expect(isLocked(toActualRow({ id: 4, actualQty: null }))).toBe(false);
    expect(isLocked(toActualRow({ id: 5, actualQty: '  ' }))).toBe(false);
  });

  it('입고취소 확인 문구와 엑셀 칸(송연과 같음)', () => {
    expect(undoMessage(toActualRow({ id: 2, actualQty: '980kg' }))).toBe('실생산량 980kg 을 지우고 재고도 그만큼 되돌릴까요?');
    expect(ACTUAL_EXCEL_COLUMNS.map((c) => c.label)).toEqual(['거래처', '품목명', '생산지시량계획', '실생산량']);
  });
});

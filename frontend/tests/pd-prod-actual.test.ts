import { describe, expect, it } from 'vitest';

import {
  ACTUAL_EXCEL_COLUMNS,
  actualChanges,
  actualSaveMessage,
  cancelMessage,
  toActualRow,
} from '../src/pages/pd/result/prod-actual/utils/prodActual';

describe('생산입고 utils(송연 PD0002)', () => {
  it('받은 실생산량은 칸 값과 저장된 값으로 둔다(공백은 저장 안 된 것)', () => {
    expect(toActualRow({ id: 2, actualQty: '1000' })).toMatchObject({ input: '1000', saved: '1000' });
    expect(toActualRow({ id: 4, actualQty: null })).toMatchObject({ input: '', saved: '' });
    expect(toActualRow({ id: 5, actualQty: '  ' })).toMatchObject({ saved: '' });
  });

  it('2026-10-30 [저장]: 새로 적은 줄은 입고, 바꾼 줄은 수정, 비운 줄은 따로(입고취소는 [입고취소]로)', () => {
    const rows = [
      { ...toActualRow({ id: 1, actualQty: null }), input: '980kg' },
      { ...toActualRow({ id: 2, actualQty: '500' }), input: '520' },
      { ...toActualRow({ id: 3, actualQty: '700' }), input: '' },
      toActualRow({ id: 4, actualQty: '300' }),
      toActualRow({ id: 5, actualQty: null }),
    ];
    const { receives, updates, cleared } = actualChanges(rows);
    expect(receives.map((row) => row.id)).toEqual([1]);
    expect(updates.map((row) => row.id)).toEqual([2]);
    expect(cleared.map((row) => row.id)).toEqual([3]);
  });

  it('저장 · 입고취소 확인 문구와 엑셀 칸(송연과 같음)', () => {
    expect(actualSaveMessage(3, 1)).toBe('입고 3건 · 수정 1건을 저장할까요? 제품 재고가 그만큼 바뀌어요.');
    expect(actualSaveMessage(0, 2)).toBe('수정 2건을 저장할까요? 제품 재고가 그만큼 바뀌어요.');
    expect(cancelMessage([toActualRow({ id: 2, actualQty: '980kg' })])).toBe('실생산량 980kg 을 지우고 재고도 그만큼 되돌릴까요?');
    expect(cancelMessage([toActualRow({ id: 2, actualQty: '1' }), toActualRow({ id: 3, actualQty: '2' })]))
      .toBe('입고 2건의 실생산량을 지우고 재고도 그만큼 되돌릴까요?');
    expect(ACTUAL_EXCEL_COLUMNS.map((c) => c.label)).toEqual(['거래처', '품목명', '생산지시량계획', '실생산량']);
  });
});

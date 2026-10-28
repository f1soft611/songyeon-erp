import { describe, expect, it } from 'vitest';

import {
  canEditOrder,
  emptyOrderRow,
  focusFieldOf,
  formatTotal,
  fromSaved,
  importedLabel,
  isUnknownClient,
  ORDER_EXCEL_COLUMNS,
  parseQtyNumber,
  saveBodyOf,
  orderSnapshot,
  pendingOrderRows,
  isBlankOrderRow,
  summaryOf,
} from '../src/pages/sales/order/order-register/utils/salesOrder';

describe('수주등록 utils', () => {
  it('수량은 쉼표·단위가 섞여도 첫 숫자를 읽고, 합계는 줄 수와 수량 합', () => {
    expect(parseQtyNumber('1,000kg')).toBe(1000);
    expect(parseQtyNumber('12.5')).toBe(12.5);
    expect(parseQtyNumber('')).toBe(0);
    expect(parseQtyNumber('미정')).toBe(0);
    const rows = [
      { ...emptyOrderRow(1), orderQty: '1,000' },
      { ...emptyOrderRow(2), orderQty: '150' },
      emptyOrderRow(3),
    ];
    expect(summaryOf(rows)).toEqual({ count: 3, total: 1150 });
    expect(formatTotal(1150)).toBe('1,150.00');
  });

  it('저장된 줄은 잠긴 채로, 가져간 표시는 불리언으로 받는다', () => {
    const row = fromSaved(
      { id: 2, clientName: '(주) 디에이치식품', productName: '국물두루치기분말(1kg*10ea)', orderQty: '1000',
        productionDate: '2026-09-21', logisticsDate: null, isStockProduction: 1, importedProduction: 1, importedShipment: 0 },
      7,
    );
    expect(row).toMatchObject({ key: 7, id: 2, logisticsDate: '', isStockProduction: true, importedProduction: true, importedShipment: false, note: '' });
    expect(importedLabel(row)).toBe('생산확정에서 가져감');
    expect(importedLabel({ ...row, importedShipment: true })).toBe('생산+출하 가져감');
    expect(importedLabel({ ...row, importedProduction: false, importedShipment: true })).toBe('출하등록에서 가져감');
    expect(canEditOrder(row)).toBe(false); // 가져간 줄은 못 고친다
    expect(canEditOrder({ ...row, importedProduction: false, importedShipment: false })).toBe(true); // 2026-10-23 저장된 줄도 바로 고친다
    expect(canEditOrder(emptyOrderRow(1))).toBe(true);
  });

  it('저장 본문: 글자는 다듬고, 빈 날짜는 null, 재고생산이면 물류출고일을 보내지 않는다', () => {
    const row = {
      ...emptyOrderRow(1),
      clientName: ' (주) 디에이치식품 ',
      productName: ' 국물두루치기분말(1kg*10ea) ',
      orderQty: ' 100 ',
      logisticsDate: '2026-10-08',
    };
    expect(saveBodyOf(row, '2026-10-06')).toEqual({
      orderDate: '2026-10-06',
      clientName: '(주) 디에이치식품',
      productName: '국물두루치기분말(1kg*10ea)',
      orderQty: '100',
      note: '',
      productionDate: null,
      isStockProduction: 0,
      logisticsDate: '2026-10-08',
    });
    expect(saveBodyOf({ ...row, isStockProduction: true }, '2026-10-06')).toMatchObject({ isStockProduction: 1, logisticsDate: null });
  });

  // 2026-10-23 제목줄 [저장]이 보낼 줄: 새 줄(빈 줄 빼고) + 고친 저장된 줄, 가져간 줄은 빼고
  it('저장할 줄: 빈 새 줄 · 안 고친 줄 · 가져간 줄은 빼고, 고친 줄은 넣는다', () => {
    const saved = fromSaved({ id: 3, clientName: 'A', productName: 'P', orderQty: '10' }, 1);
    const imported = fromSaved({ id: 4, clientName: 'A', importedShipment: 1 }, 2);
    const originals = new Map([[3, orderSnapshot(saved)], [4, orderSnapshot(imported)]]);
    const blank = emptyOrderRow(3);
    const typed = { ...emptyOrderRow(4), clientName: 'B' };
    expect(pendingOrderRows([saved, imported, blank, typed], originals).map((row) => row.key)).toEqual([4]);
    expect(pendingOrderRows([{ ...saved, orderQty: '20' }, { ...imported, orderQty: '20' }], originals).map((row) => row.key)).toEqual([1]);
    expect(isBlankOrderRow(blank)).toBe(true);
  });

  it('거래처 목록에 없으면 막고(목록을 못 받았으면 서버에 맡김), 거절 문구로 고칠 칸을 정한다', () => {
    const clients = ['(주) 디에이치식품'];
    expect(isUnknownClient('부산', clients)).toBe(true);
    expect(isUnknownClient(' (주) 디에이치식품 ', clients)).toBe(false);
    expect(isUnknownClient('', clients)).toBe(false);
    expect(isUnknownClient('부산', [])).toBe(false);
    expect(focusFieldOf("물류출고일을 정하거나 '재고생산' 에 체크해주세요.")).toBe('logisticsDate');
    expect(focusFieldOf('거래처를 입력해주세요.')).toBe('clientName');
  });

  it('엑셀 칸은 송연과 같은 순서, 재고생산은 글자로', () => {
    expect(ORDER_EXCEL_COLUMNS.map((column) => column.label)).toEqual(['거래처', '품목명', '수량', '비고', '생산예정일', '재고생산', '물류출고일']);
    const stock = ORDER_EXCEL_COLUMNS[5].key as (row: { id: number; isStockProduction?: number }) => unknown;
    expect(stock({ id: 1, isStockProduction: 1 })).toBe('재고생산');
    expect(stock({ id: 1, isStockProduction: 0 })).toBe('');
  });
});

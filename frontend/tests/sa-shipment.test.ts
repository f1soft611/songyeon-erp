import { describe, expect, it } from 'vitest';

import {
  allocationStatus,
  applyLotPick,
  importRange,
  initialLotLabel,
  mineByLot,
  pickedLotLabel,
  plannedItems,
  rowFromOrder,
  saveBodyOf,
  SHIPMENT_EXCEL_COLUMNS,
  shipLotText,
  toShipmentRow,
  type ProductLot,
  type ShipmentRecord,
} from '../src/pages/sa/shipment/utils/shipment';
import * as shipmentUtils from '../src/pages/sa/shipment/utils/shipment';

const record = (overrides: Partial<ShipmentRecord> = {}): ShipmentRecord => ({
  id: 3,
  source: 'manual',
  scheduleDate: '2026-09-21',
  clientName: '(주) 디에이치식품',
  productName: '국물두루치기분말(1kg*10ea)',
  orderQty: '1000',
  lotId: 2,
  lotNo: '20260921-01',
  lotDate: '2026-09-21',
  shipConfirmed: 0,
  lotAllocations: [],
  ...overrides,
});

const lot = (overrides: Partial<ProductLot>): ProductLot => ({
  lotId: 1, lotDate: '2026-09-20', lotNo: '', status: 'produced', producedQty: 1000, shippedQty: 0, remainingQty: 1000,
  clientName: '(주) 디에이치식품', orderQty: '1000', ...overrides,
});

describe('출하등록 utils', () => {
  it('로트 칸: 배분이 여러 개면 로트마다 수량, 하나면 그 로트, 없으면 걸린 로트. 아무것도 없으면 미선택', () => {
    expect(shipLotText(record())).toBe('20260921-01');
    expect(shipLotText(record({ lotAllocations: [{ lotId: 2, qty: 600, lotNo: 'A' }, { lotId: 5, qty: 400, lotDate: '2026-09-22' }] })))
      .toBe('A 600 · 2026-09-22 400');
    expect(initialLotLabel(record())).toEqual({ text: '로트 20260921-01', tone: 'teal', bold: true });
    expect(initialLotLabel(null)).toEqual({ text: '미선택', tone: 'muted', bold: false });
  });

  it('줄 만들기: 저장된 줄·새 줄·수주에서 가져온 줄(출고일은 물류출고일)', () => {
    expect(toShipmentRow(1, record(), '2026-10-06')).toMatchObject({ key: 1, clientName: '(주) 디에이치식품', scheduleDate: '2026-09-21', lotId: 2, sourceOrderId: null });
    expect(toShipmentRow(2, null, '2026-10-06')).toMatchObject({ record: null, scheduleDate: '2026-10-06', orderQty: '' });
    expect(rowFromOrder(3, { id: 9, clientName: 'A', productName: 'P', orderQty: '50', logisticsDate: '2026-10-08' }, '2026-10-06'))
      .toMatchObject({ sourceOrderId: 9, scheduleDate: '2026-10-08', orderQty: '50' });
    expect(rowFromOrder(4, { id: 9 }, '2026-10-06').scheduleDate).toBe('2026-10-06');
  });

  it('로트 고르기: 새 줄은 비어 있는 거래처·출하량만 채우고, 수주등록 건은 로트 없이 수주 번호를 단다', () => {
    const fresh = { ...toShipmentRow(1, null, '2026-10-06'), orderQty: '300' };
    const picked = applyLotPick(fresh, { lotId: 7, lotDate: '2026-09-21', lotNo: 'L7', remainingQty: 800, clientName: 'B', orderQty: '1000' });
    expect(picked).toMatchObject({ lotId: 7, clientName: 'B', orderQty: '300' });
    expect(picked.lotLabel.text).toBe('로트 L7 (잔량 800)');
    const fromOrder = applyLotPick(fresh, { lotId: null, lotDate: '2026-10-07', remainingQty: 50, fromSalesOrder: true, sourceOrderId: 4, clientName: 'C', orderQty: '50' });
    expect(fromOrder).toMatchObject({ lotId: null, sourceOrderId: 4 });
    expect(fromOrder.lotLabel.text).toBe('수주등록 기준 (2026-10-07) — 생산확정되면 자동연결됨');
    expect(pickedLotLabel({ lotId: 1, lotDate: '2026-09-30', remainingQty: 200, beforeStockIn: true, clientName: null, orderQty: null }).text)
      .toBe('로트 2026-09-30 (생산입고 전 · 계획잔량 200)');
  });

  it('저장 본문은 글자를 다듬고 로트·수주 번호를 함께 보낸다', () => {
    const row = { ...toShipmentRow(1, null, '2026-10-06'), clientName: ' A ', productName: ' P ', orderQty: ' 10 ', sourceOrderId: 2 };
    expect(saveBodyOf(row)).toEqual({ scheduleDate: '2026-10-06', clientName: 'A', productName: 'P', orderQty: '10', note: '', lotId: null, sourceOrderId: 2 });
  });

  it('생산예정: 입고 전 로트(내 배분은 잔량에 도로 더함)와 생산확정 전 수주를 날짜순으로', () => {
    const lots = [
      lot({ lotId: 1, status: 'produced' }),
      lot({ lotId: 6, status: 'planned', lotDate: '2026-10-09', producedQty: 300, remainingQty: 0 }),
    ];
    const mine = mineByLot([{ lotId: 6, qty: '100' }]);
    const items = plannedItems(lots, [{ id: 4, orderDate: '2026-10-01', productionDate: '2026-10-08', orderQty: '50kg' }], mine);
    expect(items.map((item) => [item.kind, item.date, item.remaining])).toEqual([
      ['수주등록', '2026-10-08', 50],
      ['생산확정', '2026-10-09', 100],
    ]);
    expect(items[0].label).toBe('2026-10-08 예정');
  });

  it('배분 합계: 모자람·많음·잔량 초과·맞음', () => {
    expect(allocationStatus([{ want: 500, avail: 600 }], 1000)).toMatchObject({ tone: 'danger', message: '500 모자랍니다' });
    expect(allocationStatus([{ want: 1200, avail: 2000 }], 1000)).toMatchObject({ tone: 'danger', message: '200 많습니다' });
    expect(allocationStatus([{ want: 1000, avail: 600 }], 1000)).toMatchObject({ tone: 'warn' });
    expect(allocationStatus([{ want: 600, avail: 600 }, { want: 400, avail: 500 }], 1000)).toMatchObject({ tone: 'ok', message: '맞습니다', sum: 1000 });
  });

  it('가져오기 기본 기간은 출하일 3일 전 ~ 7일 뒤(달 넘김 포함), 엑셀 칸은 송연 순서', () => {
    expect(importRange('2026-10-01')).toEqual({ start: '2026-09-28', end: '2026-10-08' });
    expect(SHIPMENT_EXCEL_COLUMNS.map((column) => column.label)).toEqual(['거래처', '품목명', '출고일', '출하량', '비고']);
  });

  // 2026-10-23 제목줄 [저장] · [삭제]
  it('저장할 줄 · 지울 수 있는 줄: 빈 새 줄과 출하확정 줄은 보내지 않고, 출하확정 · 생산연동 줄은 지우지 못한다', () => {
    const { toShipmentRow, pendingShipments, canDeleteShipment, recordKey, qtyText, shipmentStatus } = shipmentUtils;
    const manual = toShipmentRow(1, { id: 5, source: 'manual', orderQty: '10' }, '2026-10-23');
    const production = toShipmentRow(2, { id: 5, source: 'production', orderQty: '20' }, '2026-10-23');
    const confirmed = toShipmentRow(3, { id: 6, source: 'manual', orderQty: '30', shipConfirmed: 1 }, '2026-10-23');
    const blank = toShipmentRow(4, null, '2026-10-23');
    const typed = { ...toShipmentRow(5, null, '2026-10-23'), clientName: 'A' };
    const originals = new Map([manual, production, confirmed].map((row) => [recordKey(row), qtyText(row.orderQty)]));
    expect(pendingShipments([manual, production, confirmed, blank, typed], originals)).toEqual({ creates: [typed], updates: [] });
    const changed = pendingShipments([{ ...manual, orderQty: 12 }, { ...production, orderQty: '20' }, { ...confirmed, orderQty: 99 }], originals);
    expect(changed.updates.map((row) => row.key)).toEqual([1]); // 숫자 칸 값(12)도 고친 것으로 본다, 같은 id 의 생산연동 줄과 섞이지 않는다
    expect([manual, production, confirmed, blank].map(canDeleteShipment)).toEqual([true, false, false, true]);
    expect([manual, production, confirmed].map(shipmentStatus)).toEqual(['', '생산연동', '출하확정됨']);
  });
});

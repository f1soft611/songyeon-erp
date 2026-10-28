import { describe, expect, it } from 'vitest';
import * as shipConfirmUtils from '../src/pages/lg/confirm/utils/shipConfirm';

import {
  SHIP_EXCEL_COLUMNS, buildShipmentLogHtml, buildWorkOrderHtml, negativeStockMessage, onlyDecimal, onlyDigits, onlyQty,
  shipLotText, sortByVehicle, suggestShipQty, toConfirmBody, toShipRow, type ShipRecord,
} from '../src/pages/lg/confirm/utils/shipConfirm';

const rec = (extra: Partial<ShipRecord> = {}): ShipRecord => ({ id: 7, source: 'manual', productName: '로제파스타소스(5kg*4ea)', clientName: '달구지', ...extra });

describe('출하확정 utils(송연 LG0002)', () => {
  it('실출하량 제안: 정한 값 > 덜 만든 양 > 예정량', () => {
    expect(suggestShipQty(rec({ plannedQty: '1000', actualQty: '980' }))).toBe('980');
    expect(suggestShipQty(rec({ plannedQty: '1000', actualQty: '1000', lotActualQty: '950kg' }))).toBe('950kg');
    expect(suggestShipQty(rec({ plannedQty: '1000', lotActualQty: '1200' }))).toBe('1000');
    expect(suggestShipQty(rec({}))).toBe('');
  });

  it('로트 글: 나뉘면 수량까지, 하나면 번호, 없으면 생산일', () => {
    expect(shipLotText(rec({ lotAllocations: [{ qty: 60, lotNo: 'A-1', lotDate: '' }, { qty: 40.5, lotNo: '', lotDate: '2026-10-01' }] }))).toBe('A-1 60 · 2026-10-01 40.5');
    expect(shipLotText(rec({ lotAllocations: [{ qty: 60, lotNo: 'A-1', lotDate: '' }] }))).toBe('A-1');
    expect(shipLotText(rec({ lotDate: '2026-10-06' }))).toBe('2026-10-06');
  });

  it('칸 글자 거르기와 확정 본문(목록에 없는 포장·배차는 비움)', () => {
    expect(onlyQty('135 kg!')).toBe('135kg');
    expect(onlyDigits('2번')).toBe('2');
    expect(onlyDecimal('5만0.5원')).toBe('50.5');
    const row = { ...toShipRow(rec({ plannedQty: '135' })), inputVehicle: '없는차', inputPacking: '박스', inputOrder: '', inputBox: ' 4 ' };
    expect(toConfirmBody(row, ['박스'], ['1톤'])).toEqual({
      actualQty: '135', boxQty: '4', vehicle: '', driverName: '', packingMethod: '박스', note: '', visitOrder: null, charterInfo: '', charterAmount: null,
    });
    // 표에 친 그대로 들어와도 보낼 때 거른다
    const typed = { ...row, inputActual: '135 kg', inputBox: '4박스', inputOrder: '2번', inputCharterAmount: '5만0원', inputVehicle: '1톤' };
    expect(toConfirmBody(typed, ['박스'], ['1톤'])).toMatchObject({ actualQty: '135kg', boxQty: '4', visitOrder: '2', charterAmount: '50', vehicle: '1톤' });
  });

  it('배차·순서 정렬: 배차 이름 순, 미지정은 뒤, 같은 배차는 순서(없으면 뒤)', () => {
    const rows = [rec({ id: 1 }), rec({ id: 2, vehicle: '2톤', visitOrder: 1 }), rec({ id: 3, vehicle: '1톤' }), rec({ id: 4, vehicle: '1톤', visitOrder: 2 })];
    expect(sortByVehicle(rows).map((r) => r.id)).toEqual([4, 3, 2, 1]);
  });

  it('재고 마이너스 경고: 지금 재고 + 자동입고 - 실출하량', () => {
    expect(negativeStockMessage(rec({ stockQty: 135, lotActualQty: '135' }), '135')).toBeNull();
    expect(negativeStockMessage(rec({ stockQty: 0, lotPlannedQty: '100' }), '100')).toBeNull(); // 자동입고 100
    const message = negativeStockMessage(rec({ stockQty: 10, lotActualQty: '50' }), '30kg');
    expect(message).toContain('확정하면 재고가 -20 이 됩니다.');
    expect(message).toContain('실출하량: -30');
    expect(negativeStockMessage(rec({ stockQty: null }), '30')).toBeNull();
  });

  it('인쇄: 출고일지는 거래처별로 묶고 글자를 이스케이프, 작업지시서는 순서대로', () => {
    const rows = [rec({ id: 1, clientName: 'A<b>', orderQty: '10' }), rec({ id: 2, clientName: 'B', orderQty: '20' }), rec({ id: 3, clientName: 'A<b>', orderQty: '30' })];
    const log = buildShipmentLogHtml(rows, '2026-10-06');
    expect(log).toContain('2026년 10월 6일 화요일');
    expect(log).toContain('rowspan="2"');
    expect(log).toContain('A&lt;b&gt;');
    expect(log).toContain('로제파스타소스');
    const work = buildWorkOrderHtml(rows, '2026-10-06');
    expect(work).toContain('지시일자: 2026-10-06');
    expect(work.match(/<tr>/g)?.length).toBe(4);
    expect(SHIP_EXCEL_COLUMNS.map((c) => c.label)).toEqual(['거래처', '품목명', '보관방법', '출하예정량', '실출하량', '로트번호', '제조일자', '포장방법', '운행자', '배차', '순서', '용차정보', '용차금액', '특이사항', '상태']);
  });

  // 2026-10-26 숫자 칸: 박스수량 · 용차금액은 입력한 그대로 보낸다, 실출하량은 0 보다 커야 확정
  it('박스수량 · 용차금액은 입력한 그대로(4.7 은 4.7), 실출하량 0 이하는 확정하지 않는다', () => {
    const { hasShipQty, onlyDecimal } = shipConfirmUtils;
    expect([onlyDecimal(4.7), onlyDecimal('3'), onlyDecimal(''), onlyDecimal(45000)]).toEqual(['4.7', '3', '', '45000']);
    expect([hasShipQty(0), hasShipQty(''), hasShipQty('12'), hasShipQty(95.5), hasShipQty('100kg')]).toEqual([false, false, true, true, true]);
  });
});

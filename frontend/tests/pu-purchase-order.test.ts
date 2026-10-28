import { describe, expect, it } from 'vitest';

import {
  HISTORY_EXCEL_COLUMNS, STATUS_EXCEL_COLUMNS, historyRows, monthStart, sortStatus, stagingError, statusCounts, toBulkBody, toStatusRows,
  type PurchaseOrder,
} from '../src/pages/pu/order/utils/purchaseOrder';

const po = (id: number, extra: Partial<PurchaseOrder> = {}): PurchaseOrder => ({ id, materialCode: `M${id}`, materialName: `원재료${id}`, qty: 10, orderDate: '2026-10-07', clientName: '대한상사', received: false, ...extra });

describe('발주관리 utils(송연 19-purchase.js · 38-po-status.js)', () => {
  it('발주내역: 서버 차례대로 거래처로 묶고, 묶음에 종수·미입고·수량 합', () => {
    const rows = historyRows([po(3), po(2, { clientName: '삼양', received: true }), po(1, { qty: 5, received: true }), po(4, { clientName: '' })]);
    expect(rows.map((r) => r.id)).toEqual(['g:대한상사', 'po:3', 'po:1', 'g:삼양', 'po:2', 'g:-', 'po:4']);
    expect(rows[0]).toMatchObject({ kind: 'group', label: '대한상사', info: '2종', pending: 1, received: false, qty: 15, parentId: null });
    expect(rows[1]).toMatchObject({ kind: 'item', label: '원재료3 (M3)', info: '미입고', parentId: 'g:대한상사', poId: 3 });
    expect(rows[3]).toMatchObject({ pending: 0, received: true });
    expect(HISTORY_EXCEL_COLUMNS.map((c) => c.label)).toEqual(['거래처', '원재료명', '원재료코드', '수량', '상태']);
  });

  it('발주 등록 창: 추가 검사 순서와 문구, 보낼 본문', () => {
    const materials = [{ code: 'M1', name: '설탕' }];
    const vendors = ['대한'];
    expect(stagingError(' ', '설탕', '1', materials, vendors)).toBe('거래처를 먼저 입력해주세요');
    expect(stagingError('없는상사', '설탕', '1', materials, vendors)).toBe('등록된 매입 거래처와 일치하지 않아요'); // 2026-10-26
    expect(stagingError('대한', '', '1', materials, vendors)).toBe('품목과 수량을 입력해주세요');
    expect(stagingError('대한', '설탕', '', materials, vendors)).toBe('품목과 수량을 입력해주세요');
    expect(stagingError('대한', '소금', '1', materials, vendors)).toBe('등록된 원재료명과 일치하지 않아요');
    expect(stagingError(' 대한 ', ' 설탕 ', '1', materials, vendors)).toBeNull();
    expect(toBulkBody('2026-10-07', [{ key: 1, materialCode: 'M1', materialName: '설탕', qty: 12.5, clientName: '대한', checked: true }]))
      .toEqual({ orderDate: '2026-10-07', items: [{ materialCode: 'M1', clientName: '대한', qty: '12.5' }] });
  });

  it('발주현황: 최근 날짜·거래처·품목 순, 같은 날 같은 거래처 건수, 요약 칸', () => {
    const list = [
      po(1, { orderDate: '2026-10-06', materialName: '나' }),
      po(2, { orderDate: '2026-10-07', clientName: '삼양' }),
      po(3, { orderDate: '2026-10-07', materialName: '가', received: true }),
      po(4, { orderDate: '2026-10-07', materialName: '다' }),
    ];
    expect(sortStatus(list).map((r) => r.id)).toEqual([3, 4, 2, 1]);
    expect(toStatusRows(list).map((r) => [r.id, r.clientCount])).toEqual([[3, 2], [4, 2], [2, 1], [1, 1]]);
    expect(statusCounts(list)).toEqual({ count: 4, clients: 2, pending: 3, done: 1 });
    expect(monthStart(new Date(2026, 9, 7))).toBe('2026-10-01');
    expect(STATUS_EXCEL_COLUMNS.map((c) => c.label)).toEqual(['발주일자', '거래처', '발주품목', '품목코드', '수량', '입고여부']);
  });
});

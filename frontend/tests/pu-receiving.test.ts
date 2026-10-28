import { describe, expect, it } from 'vitest';

import {
  DOC_EXCEL_COLUMNS, HISTORY_EXCEL_COLUMNS, IN_STATUS_EXCEL_COLUMNS, RETURN_EXCEL_COLUMNS,
  filesOfMaterial, itemCalc, monthStart, noPriceMessage, noPriceRows, priceDiffers, priceMismatchMessage, returnQtyError,
  rowsOfMaterial, stagingTotal, sumOf, toBulkBody, toInStatusRows, unitPriceFromTotal,
  type Receiving, type StagingItem,
} from '../src/pages/pu/receiving/utils/receiving';

const item = (key: number, extra: Partial<StagingItem> = {}): StagingItem => ({
  key, materialCode: `M${key}`, materialName: `원재료${key}`, qty: 10, unitPrice: 1000, taxType: '과세', clientName: '대한상사', checked: true, ...extra,
});
const recv = (id: number, extra: Partial<Receiving> = {}): Receiving => ({
  id, materialCode: 'M1', materialName: '설탕', qty: 10, receiveDate: '2026-10-08', clientName: '대한상사', totalAmount: 1100, ...extra,
});

describe('입고관리 utils(송연 19-purchase.js · 37-recv-status.js)', () => {
  it('금액 계산: 과세는 부가세 10%, 면세·영세는 0, 단가·수량이 없으면 비운다', () => {
    expect(itemCalc({ unitPrice: 1234.5, qty: 3, taxType: '과세' })).toEqual({ supply: 3704, vat: 370, total: 4074 });
    expect(itemCalc({ unitPrice: '1000', qty: '2', taxType: '면세' })).toEqual({ supply: 2000, vat: 0, total: 2000 });
    expect(itemCalc({ unitPrice: 1000, qty: 2, taxType: '영세' }).vat).toBe(0);
    expect(itemCalc({ unitPrice: '', qty: 2, taxType: '과세' })).toEqual({ supply: null, vat: null, total: null });
    expect(itemCalc({ unitPrice: 1000, qty: '', taxType: '과세' }).total).toBeNull();
  });

  it('합계 직접입력 → 단가 역산(합계/1.1, 넷째 자리), 지우면 비우고 숫자가 아니면 그대로', () => {
    expect(unitPriceFromTotal('11000', 10)).toBe(1000);
    expect(unitPriceFromTotal('10000', 3)).toBe(3030.3333);
    expect(unitPriceFromTotal('  ', 10)).toBe('');
    expect(unitPriceFromTotal('abc', 10)).toBeNull();
    expect(unitPriceFromTotal('1000', 0)).toBeNull();
  });

  it('선택 합계·BOM 단가 비교·확정 전 문구', () => {
    expect(stagingTotal([item(1), item(2, { checked: false }), item(3, { unitPrice: null })])).toBe(11000);
    expect(priceDiffers(1000.4, 1000)).toBe(false);
    expect(priceDiffers(1001, 1000)).toBe(true);
    expect(priceDiffers(1001, null)).toBe(false);
    expect(priceDiffers('', 1000)).toBe(false);

    expect(noPriceMessage([item(1)])).toBeNull();
    expect(noPriceMessage([item(1, { unitPrice: '' }), item(2, { unitPrice: null }), item(3)]))
      .toBe('단가를 적어야 등록할 수 있어요.\n\n· 원재료1\n· 원재료2\n\n단가를 모르면 합계금액만 적어도 단가가 자동으로 역산돼요.');
    const bom = (code: string) => (code === 'M1' ? 900 : 1000);
    expect(priceMismatchMessage([item(1), item(2)], bom))
      .toBe('원재료BOM에 등록된 단가와 다른 품목이 있어요.\n\n· 원재료1: 입력단가 1,000원 / 원재료BOM단가 900원\n\n그대로 진행할까요?');
    expect(priceMismatchMessage([item(2)], bom)).toBeNull();
  });

  it('반품 확정 전 검사: 수량 없음 → 남은 수량 넘음', () => {
    expect(returnQtyError([item(1, { qty: '' }), item(2, { qty: 0 })])).toBe('반품수량을 적어주세요 — 원재료1, 원재료2');
    expect(returnQtyError([item(1, { qty: '6', maxQty: 5 }), item(2, { qty: 5, maxQty: 5 })])).toBe('원재료1은(는) 5까지만 반품할 수 있어요');
    expect(returnQtyError([item(1, { qty: 5, maxQty: 5 }), item(2, { qty: 99 })])).toBeNull();
  });

  it('보낼 본문: 수량·단가는 글자로, 과세 기본값, 발주·반품 연결', () => {
    expect(toBulkBody('2026-10-08', [item(1, { poId: 7 }), item(2, { unitPrice: null, taxType: '면세', returnOfId: 3, returnReason: '파손' })], true)).toEqual({
      receiveDate: '2026-10-08',
      isReturn: true,
      items: [
        { materialCode: 'M1', clientName: '대한상사', qty: '10', unitPrice: '1000', poId: 7, taxType: '과세', returnReason: null, returnOfId: null, key: '1' },
        { materialCode: 'M2', clientName: '대한상사', qty: '10', unitPrice: null, poId: null, taxType: '면세', returnReason: '파손', returnOfId: 3, key: '2' },
      ],
    });
  });

  it('입고현황: 최근 날짜 → 거래처 → 품목 차례, 같은 날 같은 거래처 덩어리 소계(전부 단가 없으면 비움)', () => {
    const rows = toInStatusRows([
      recv(1, { receiveDate: '2026-10-07', materialName: '소금' }),
      recv(2, { materialName: '설탕', totalAmount: 1000 }),
      recv(3, { materialName: '간장', totalAmount: -500, isReturn: 1, qty: -2 }),
      recv(4, { clientName: '삼양', totalAmount: null }),
    ]);
    expect(rows.map((r) => r.id)).toEqual([3, 2, 4, 1]);
    expect(rows[0]).toMatchObject({ groupKey: '2026-10-08|대한상사', groupCount: 2, subtotal: 500 });
    expect(rows[2]).toMatchObject({ groupCount: 1, subtotal: null });
    expect(rows[3]).toMatchObject({ subtotal: 1100 });
    const all = [recv(1), recv(2, { totalAmount: null, supplyAmount: 5 }), recv(3, { totalAmount: -100 })];
    expect(sumOf(all, 'totalAmount')).toBe(1000);
    expect(sumOf(all, 'supplyAmount')).toBe(5);
    expect(noPriceRows(all)).toBe(1);
  });

  it('서류등록: 품목별 입고줄과 그 서류(입고일 붙임), 이번 달 1일', () => {
    const rows = [
      recv(1, { files: [{ id: 9, origName: '성적서.pdf' }] }),
      recv(2, { materialCode: 'M2', files: [] }),
      recv(3, { receiveDate: '2026-10-01', files: [{ id: 10, origName: '명세서.pdf' }] }),
    ];
    expect(rowsOfMaterial(rows, 'M1').map((r) => r.id)).toEqual([1, 3]);
    expect(filesOfMaterial(rows, 'M1')).toEqual([
      { id: 9, origName: '성적서.pdf', receiveDate: '2026-10-08' },
      { id: 10, origName: '명세서.pdf', receiveDate: '2026-10-01' },
    ]);
    expect(filesOfMaterial(rows, 'M2')).toEqual([]);
    expect(monthStart(new Date(2026, 9, 8))).toBe('2026-10-01');
  });

  it('엑셀 칸은 송연과 같다', () => {
    expect(HISTORY_EXCEL_COLUMNS.map((c) => c.label)).toEqual(['거래처', '원재료명', '원재료코드', '바코드', '수량', '과세구분', '단가', '공급가액', '부가세', '합계', '첨부서류']);
    const files = HISTORY_EXCEL_COLUMNS[10].key as (row: Receiving) => string;
    expect(files(recv(1, { files: [{ id: 1, origName: 'a.pdf' }, { id: 2, origName: 'b.pdf' }] }))).toBe('a.pdf / b.pdf');
    expect(RETURN_EXCEL_COLUMNS.map((c) => c.label)).toEqual(['반품일', '거래처', '원재료명', '원재료코드', '수량', '과세구분', '단가', '공급가액', '부가세', '합계', '사유']);
    expect(IN_STATUS_EXCEL_COLUMNS.map((c) => c.label)).toEqual(['입고일자', '거래처', '입고품목', '품목코드', '수량', '과세구분', '단가', '공급가액', '부가세', '합계금액', '구분']);
    expect(DOC_EXCEL_COLUMNS.map((c) => c.label)).toEqual(['원재료', '입고건수', '총입고수량']);
  });
});

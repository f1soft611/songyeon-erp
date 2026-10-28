import { describe, expect, it } from 'vitest';

import {
  MATERIAL_HISTORY_EXCEL_COLUMNS, PRODUCT_HISTORY_EXCEL_COLUMNS, confirmQuestion, confirmedMessage, diffColor, diffText, filterByProduct,
  finalQty, historyTree, kindColor, materialUploadMessage, movedMessage, productUploadMessage, toUploadRows, warehouseTotals, whmNum,
  type StockSchedule,
} from '../src/pages/pu/stockadjust/utils/stockAdjust';

const row = (id: number, extra: Partial<StockSchedule> = {}): StockSchedule => ({ id, code: `M${id}`, name: `원재료${id}`, newStockQty: 10, currentStockQty: 8, ...extra });

describe('재고조정 utils(송연 18-stock.js · 30-warehouse-move.js)', () => {
  it('차이 표기와 색, 고친 값이 있으면 그것이 이후 수량', () => {
    expect(diffText(2.5)).toBe('+2.5');
    expect(diffText(-3)).toBe('-3');
    expect(diffText(0)).toBe('0');
    expect(diffText(null)).toBe('');
    expect(diffColor(1)).toBe('#2563eb');
    expect(diffColor(-1)).toBe('#dc2626');
    expect(diffColor(0)).toBeUndefined();
    expect(finalQty(row(1, { editedQty: 7 }))).toBe(7);
    expect(finalQty(row(1))).toBe(10);
    expect(whmNum(12.34567)).toBe('12.346');
  });

  it('창고별 합계: 창고등록 순 → 등록 안 된 이름 → 미지정, 없는 창고는 빼고, 마지막에 전체', () => {
    const totals = warehouseTotals([
      row(1, { warehouse: '자재창고', newStockQty: 10, currentStockQty: 8 }),
      row(2, { warehouse: null, newStockQty: 5, editedQty: 4, currentStockQty: 6 }),
      row(3, { warehouse: '옛창고', newStockQty: 1, currentStockQty: 1 }),
      row(4, { warehouse: '자재창고', newStockQty: 2, currentStockQty: 0 }),
    ], ['계량창고', '자재창고']);
    expect(totals.map((t) => [t.label, t.count, t.current, t.target, t.diff])).toEqual([
      ['자재창고 합계', 2, 8, 12, 4],
      ['옛창고 합계', 1, 1, 1, 0],
      ['창고 미지정 합계', 1, 6, 4, -2],
      ['전체 합계', 4, 15, 17, 2],
    ]);
    expect(totals[3].all).toBe(true);
    expect(warehouseTotals([], ['계량창고'])).toEqual([]);
  });

  it('적용 내역: 반영일로 묶고(최근 위), 사유는 중복 없이 · 로 잇는다', () => {
    const tree = historyTree([
      row(1, { effectiveDate: '2026-10-01', note: '정기', oldStockQty: 5, newStockQty: 7, diff: 2 }),
      row(2, { effectiveDate: '2026-10-05', note: '파손', diff: -1 }),
      row(3, { effectiveDate: '2026-10-01', note: '정기' }),
      row(4, { effectiveDate: '2026-10-05', note: '재실사' }),
    ]);
    expect(tree.map((n) => [n.id, n.parentId, n.label])).toEqual([
      ['g:2026-10-05', null, '2026-10-05'], ['i:2026-10-05:0', 'g:2026-10-05', '원재료2 (M2)'], ['i:2026-10-05:1', 'g:2026-10-05', '원재료4 (M4)'],
      ['g:2026-10-01', null, '2026-10-01'], ['i:2026-10-01:0', 'g:2026-10-01', '원재료1 (M1)'], ['i:2026-10-01:1', 'g:2026-10-01', '원재료3 (M3)'],
    ]);
    expect(tree[0]).toMatchObject({ count: 2, notes: '파손 · 재실사' });
    expect(tree[4]).toMatchObject({ oldQty: 5, newQty: 7, diff: 2 });
  });

  it('제품 원장: 종류 색, 품목명은 화면에서 거른다', () => {
    expect(kindColor('생산입고')).toBe('success');
    expect(kindColor('출하')).toBe('error');
    expect(kindColor('재고조정')).toBe('default');
    expect(kindColor('모름')).toBe('default');
    const rows = [{ productCode: 'P1', productName: '떡볶이소스(2kg)' }, { productCode: 'P2', productName: '로제파스타소스' }];
    expect(filterByProduct(rows, ' 로제 ').map((r) => r.productCode)).toEqual(['P2']);
    expect(filterByProduct(rows, '')).toHaveLength(2);
  });

  it('엑셀 줄은 글자로, 문구는 송연과 같다', () => {
    expect(toUploadRows([['코드', '이름', '규격', '재고수량'], ['000101', '설탕', null, 12.5], [101, '', '', 0]])).toEqual([
      ['코드', '이름', '규격', '재고수량'], ['000101', '설탕', '', '12.5'], ['101', '', '', '0'],
    ]);
    expect(materialUploadMessage('계량창고', { staged: 3, skipped: 1 })).toBe('계량창고 3건 올렸어요 (건너뜀 1건) — 반영일과 사유를 적고 확정을 눌러주세요');
    expect(materialUploadMessage('', { staged: 3, skipped: 0 })).toBe('3건 올렸어요 (건너뜀 0건) — 반영일과 사유를 적고 확정을 눌러주세요');
    expect(productUploadMessage({ staged: 2, skipped: 0 })).toBe('대기목록에 2건 등록됨 (건너뜀 0건) — 반영일을 지정하고 확정을 눌러주세요');
    expect(confirmQuestion('2026-10-13', '9월 정기 재고조사')).toBe('대기 중인 재고조정을 전부 2026-10-13 기준으로 확정할까요?\n사유: 9월 정기 재고조사');
    expect(confirmQuestion('2026-10-13')).toBe('대기 중인 재고조정을 전부 2026-10-13 기준으로 확정할까요?');
    expect(confirmedMessage({ confirmed: 4, effectiveDate: '2026-10-13' })).toBe('4건이 2026-10-13 기준으로 재고에 반영됐어요');
    expect(movedMessage({ materialCode: 'M1', materialName: '양파밀링', unit: 'kg' }, 3, 60, '계량창고')).toBe('양파밀링 3봉 (60kg) 을 계량창고로 옮겼어요');
    expect(MATERIAL_HISTORY_EXCEL_COLUMNS.map((c) => c.label)).toEqual(['반영일', '원재료명', '원재료코드', '이전재고', '이후재고', '차이', '사유']);
    expect(PRODUCT_HISTORY_EXCEL_COLUMNS.map((c) => c.label)).toEqual(['날짜', '품목명', '제품코드', '종류', '수량', '이후재고', '거래처', '비고', '처리자']);
  });
});

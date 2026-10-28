import { describe, expect, it } from 'vitest';

import {
  addLines,
  conditionText,
  emptyQtyLines,
  excelColumnsOf,
  footerOf,
  toGridRows,
  verdictOf,
  type FeasibilityResult,
  type FeasibilityRow,
} from '../src/pages/sa/feasibility/utils/feasibility';

const row = (overrides: Partial<FeasibilityRow>): FeasibilityRow => ({
  code: 'M1', name: '양파', spec: null, known: true, needQty: 0, stockQty: 0, afterQty: 0, shortage: 0, per: null, ...overrides,
});

const result = (overrides: Partial<FeasibilityResult>): FeasibilityResult => ({
  date: '2026-10-06', lines: [{ product: 'A', qtyKg: 1000 }, { product: 'B', qtyKg: 500 }], rows: [], byProduct: [],
  unknownProducts: [], shortageCount: 0, ok: true, ...overrides,
});

describe('생산가능확인 utils(송연 34-prod-check.js)', () => {
  it('담기: 이미 있는 제품은 다시 넣지 않고, 수량이 비었거나 0 이하인 줄을 찾는다', () => {
    const lines = addLines([{ product: 'A', qty: 100 }], ['A', 'B', 'C']);
    expect(lines).toEqual([{ product: 'A', qty: 100 }, { product: 'B', qty: null }, { product: 'C', qty: null }]);
    expect(emptyQtyLines([{ product: 'A', qty: 100 }, { product: 'B', qty: '0' }, { product: 'C', qty: null }]).map((l) => l.product)).toEqual(['B', 'C']);
  });

  it('판정 문구: BOM 못 찾음 → 경고, 모두 넉넉 → 성공, 모자람 → 오류', () => {
    expect(verdictOf(null)).toBeNull();
    expect(verdictOf(result({ unknownProducts: ['X'], ok: false }))).toEqual({ tone: 'warning', text: 'BOM 을 못 찾은 제품이 있어요 — X' });
    expect(verdictOf(result({ rows: [row({}), row({ code: 'M2' })] }))).toEqual({ tone: 'success', text: '생산할 수 있어요. 원재료 2가지가 모두 넉넉합니다' });
    expect(verdictOf(result({ ok: false, shortageCount: 1, rows: [row({}), row({ code: 'M2' })] }))?.text).toBe('원재료 1가지가 모자랍니다 (전체 2가지)');
  });

  it('조건 글자: 결과가 있으면 날짜·제품 수·총량, 없으면 안내', () => {
    expect(conditionText(result({}), 2)).toBe('2026-10-06 · 제품 2개 · 모두 1,500kg');
    expect(conditionText(null, 1)).toBe('수량을 적고 확인을 눌러주세요');
    expect(conditionText(null, 0)).toBe('검색 을 눌러 생산일자와 제품을 골라주세요');
  });

  it('표 줄: 제품마다 필요량을 per0·per1 칸으로 펼치고, 합계줄은 필요량만 더한다', () => {
    const rows = [row({ needQty: 800, shortage: 0, per: [500, 300] }), row({ code: 'M9', needQty: 700, shortage: 700, per: [0, 700] })];
    const grid = toGridRows(rows);
    expect(grid[0]).toMatchObject({ id: 'M1-0', per0: 500, per1: 300 });
    expect(grid[1].per0).toBe(0);
    expect(footerOf(rows, 2)).toEqual({ count: 2, per: [500, 1000], need: 1500, shortage: 700 });
  });

  it('엑셀 칸: 제품이 둘 이상이면 제품별 필요량 칸과 "필요량 합계"', () => {
    const many = excelColumnsOf(result({}));
    expect(many.map((c) => c.label)).toEqual(['원재료명', '규격', '2026-10-06 재고', '필요량1 A', '필요량2 B', '필요량 합계', '생산 후 재고', '부족량']);
    const perB = many[4].key as (r: FeasibilityRow) => unknown;
    expect(perB(row({ per: [1, 2] }))).toBe(2);
    expect(excelColumnsOf(result({ lines: [{ product: 'A', qtyKg: 1 }] })).map((c) => c.label)).toEqual(['원재료명', '규격', '2026-10-06 재고', '필요량', '생산 후 재고', '부족량']);
  });
});

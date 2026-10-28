import { describe, expect, it } from 'vitest';

import {
  ACC_SALES, conditionText, defaultPeriod, excelOf, josaIGa, moneyText, pctText, qtyText, searchError, signedMoney, type TradeReport,
} from '../src/pages/ha/accsales/utils/accSales';

const report = (patch: Partial<TradeReport>): TradeReport => ({
  kind: '매출', view: 'summary', unit: 'month', start: '2026-10-01', end: '2026-10-15', clients: [], items: [],
  totalAmount: 0, totalQty: 0, unpriced: 0, ...patch,
});

describe('매출·매입관리(송연 10-accounting.js ACCM)', () => {
  it('탭마다 칸 이름 · 합계 이름 · 안내만 다르다', () => {
    expect([ACC_SALES.매출.tab, ACC_SALES.매출.itemLabel, ACC_SALES.매출.dateLabel, ACC_SALES.매출.totalLabel]).toEqual(['매출관리', '제품명', '출고일', '총 매출']);
    expect([ACC_SALES.매입.tab, ACC_SALES.매입.itemLabel, ACC_SALES.매입.dateLabel, ACC_SALES.매입.totalLabel]).toEqual(['매입관리', '원재료명', '입고일', '총 매입액(부가세포함)']);
    expect(ACC_SALES.매출.meta).toBe('확정된 출하 × 판매단가(단가관리) 기준으로 계산한 매출이에요. 이월된 건은 이월된 달에 반영돼요.');
  });

  it('조회 창: 처음엔 이번 달 1일 ~ 오늘, 기간 검사', () => {
    expect(defaultPeriod(new Date(2026, 9, 15))).toEqual({ start: '2026-10-01', end: '2026-10-15' });
    expect(searchError({ start: '', end: '2026-10-15' })).toBe('조회 기간을 골라주세요');
    expect(searchError({ start: '2026-10-16', end: '2026-10-15' })).toBe('시작일이 종료일보다 늦어요');
    expect(searchError({ start: '2026-10-01', end: '2026-10-15' })).toBe('');
  });

  it('조건 줄: 담은 수만 적고, 전년비교는 작년 기간을 붙인다', () => {
    expect(conditionText(report({}))).toBe('2026-10-01 ~ 2026-10-15 · 매출 · 집계(월) · 거래처 전체 · 제품명 전체');
    expect(conditionText(report({ kind: '매입', view: 'yoy', unit: 'day', clients: ['a', 'b'], items: ['설탕'], prevStart: '2025-10-01', prevEnd: '2025-10-15' })))
      .toBe('2026-10-01 ~ 2026-10-15 · 매입 · 전년동기간비교 · 거래처 2곳 · 원재료명 1개 (작년 2025-10-01 ~ 2025-10-15)');
  });

  it('숫자: 수량 소수 2자리, 금액 4자리, 빈 값 빈칸, 증감 · 증감률', () => {
    expect(qtyText(1234.567)).toBe('1,234.57');
    expect(moneyText(1500.12345)).toBe('1,500.1235');
    expect(moneyText(null)).toBe('');
    expect(signedMoney(-1200)).toBe('−1,200');
    expect(pctText(null, 100)).toBe('신규');
    expect(pctText(null, 0)).toBe('');
    expect(pctText(-12.34, 1)).toBe('−12.3%');
    expect(josaIGa('거래처')).toBe('가');
    expect(josaIGa('제품명')).toBe('이');
  });

  it('엑셀: 보기마다 이름 · 칸이 다르다', () => {
    const today = (() => { const d = new Date(); return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`; })();
    const detail = excelOf(report({ kind: '매입', view: 'detail', rows: [] }));
    expect(detail.fileName).toBe(`매입관리_2026-10-01~2026-10-15_내역_${today}.xlsx`);
    expect(detail.columns.map((c) => c.label)).toEqual(['입고일', '거래처', '원재료명', '수량', '단가', '공급가액', '부가세', '합계']);
    const summary = excelOf(report({ periods: [] }));
    expect(summary.fileName).toBe(`매출관리_2026-10-01~2026-10-15_집계_${today}.xlsx`);
    expect(summary.columns.map((c) => c.label)).toEqual(['월', '건수', '수량', '매출액']);
    const yoy = excelOf(report({ view: 'yoy', unit: 'year', compare: [{ period: '2026', cur: 10, prev: 0, diff: 10, pct: null }] }));
    expect(yoy.columns.map((c) => c.label)).toEqual(['년도', '올해', '작년', '증감', '증감률(%)']);
    const pctKey = yoy.columns[4].key as unknown as (r: unknown) => unknown;
    expect(pctKey(yoy.rows[0])).toBe('신규');
  });
});

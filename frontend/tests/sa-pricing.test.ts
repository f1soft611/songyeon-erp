import { describe, expect, it } from 'vitest';

import {
  computedHints,
  diffOf,
  filterPricingRows,
  matchesClient,
  pricingFormFrom,
  pricingSaveBody,
  rateText,
  topAmountNames,
} from '../src/pages/sales/product/pricing/utils/pricing';
import type { PricingDetail, PricingRow } from '../src/pages/sales/product/pricing/types/pricing.types';

const row = (overrides: Partial<PricingRow>): PricingRow => ({
  id: '000001',
  productCode: '000001',
  productName: '소스',
  spec: '',
  materialCost: 1000,
  laborCost: null,
  packagingCost: null,
  logisticsCost: null,
  margin: null,
  totalPrice: 1000,
  currentPrice: null,
  clientCode: '',
  clientName: '',
  diff: null,
  ...overrides,
});

describe('영업관리 > 단가관리 규칙', () => {
  it('차액금 = 현재단가 − 제품단가(둘 중 하나라도 없으면 계산 안 함)', () => {
    expect(diffOf({ currentPrice: 1200, totalPrice: 1000 })).toBe(200);
    expect(diffOf({ currentPrice: null, totalPrice: 1000 })).toBeNull();
  });

  it('거래처는 포함 관계 또는 공통 글자 비율 0.6 이상이면 같은 곳으로 본다', () => {
    expect(matchesClient('(주) 디에이치식품', '디에이치')).toBe(true);
    expect(matchesClient('(주) 디에이치식품', '')).toBe(true);
    expect(matchesClient('', '디에이치')).toBe(false);
    expect(matchesClient('가나상회', '다온')).toBe(false);
  });

  it('차액금 초과·미달로 거르고 정렬한다', () => {
    const rows = [
      row({ id: 'a', currentPrice: 1100, totalPrice: 1000 }),
      row({ id: 'b', currentPrice: 900, totalPrice: 1000 }),
      row({ id: 'c', currentPrice: 1500, totalPrice: 1000 }),
      row({ id: 'd', currentPrice: null }),
    ];
    expect(filterPricingRows(rows, '', '').map((r) => r.id)).toEqual(['a', 'b', 'c', 'd']);
    expect(filterPricingRows(rows, '', 'plus-desc').map((r) => r.id)).toEqual(['c', 'a']);
    expect(filterPricingRows(rows, '', 'plus-asc').map((r) => r.id)).toEqual(['a', 'c']);
    expect(filterPricingRows(rows, '', 'minus-desc').map((r) => r.id)).toEqual(['b']);
  });

  it('고정마진 → 로스 순서로 누적해 미리 보여준다', () => {
    expect(computedHints(1000, '10', '5')).toEqual({ markupAmount: 100, afterMarkup: 1100, lossAmount: 55, afterLoss: 1155 });
    expect(computedHints(null, '', '')).toEqual({ markupAmount: 0, afterMarkup: 0, lossAmount: 0, afterLoss: 0 });
  });

  it('저장 본문: 금액은 빈 값·0 이면 null, 비율은 입력한 % 그대로(빈 값만 null)', () => {
    const detail = {
      ...row({}),
      productType: '', markupRate: null, lossRate: 0, otherCost1: null, otherCost1Note: '', otherCost2: null, otherCost2Note: '',
      otherCost3: null, otherCost3Note: '', otherCost4: null, otherCost4Note: '',
    } as PricingDetail;
    const form = { ...pricingFormFrom(detail), laborCost: '0', packagingCost: '120', markupRate: '', currentPrice: '1500', otherCost1Note: '특별포장비' };
    const body = pricingSaveBody(form);
    expect(body).toMatchObject({
      laborCost: null,
      packagingCost: 120,
      markupRate: null,
      lossRate: 0,
      currentPrice: 1500,
      otherCost1Note: '특별포장비',
      productType: null,
      clientCode: null, // 2026-10-28 거래처는 거래처코드로 보낸다
    });
    expect(body).not.toHaveProperty('clientName');
    expect(pricingSaveBody({ ...form, clientCode: '000006' }).clientCode).toBe('000006');
    expect(rateText(12.3456)).toBe('12.35');
    expect(rateText(null)).toBe('');
  });

  it('원재료 구성은 적용단가가 큰 5개를 강조한다', () => {
    const bom = [1, 7, 3, 9, 5, 2, null].map((amount, index) => ({ id: String(index), materialName: `m${index}`, ratio: 0.1, amountPerKg: amount }));
    expect([...topAmountNames(bom)].sort()).toEqual(['m1', 'm2', 'm3', 'm4', 'm5'].sort());
  });
});

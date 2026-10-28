import { describe, expect, it } from 'vitest';

import { pickedTotal, taxMoney, taxQty, toggleAll, type TaxBatchClient } from '../src/pages/ha/taxinvoice/utils/taxInvoice';

const c = (clientName: string, amount: number): TaxBatchClient => ({ clientName, qty: 1, amount, hasMissingPrice: false });

describe('세금계산서(송연 12-tax-invoice.js)', () => {
  it('일괄발행: 고른 거래처 합계', () => {
    const list = [c('A', 1000), c('B', 2500.5), c('C', 0)];
    expect(pickedTotal(list, [])).toBe(0);
    expect(pickedTotal(list, ['A', 'B'])).toBe(3500.5);
  });

  it("'전체선택': 다 골라져 있으면 모두 풀고, 아니면 모두 고른다", () => {
    const list = [c('A', 1), c('B', 2)];
    expect(toggleAll(list, ['A'])).toEqual(['A', 'B']);
    expect(toggleAll(list, ['B', 'A'])).toEqual([]);
    expect(toggleAll([], [])).toEqual([]);
  });

  it('숫자: 수량 소수 2자리, 금액 4자리, 빈 값 빈칸', () => {
    expect(taxQty(1234.567)).toBe('1,234.57');
    expect(taxMoney(1500.12345)).toBe('1,500.1235');
    expect(taxMoney(null)).toBe('');
  });
});

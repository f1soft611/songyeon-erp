import { describe, expect, it } from 'vitest';

import {
  formatMoney, formatQty, monthStart, pullItems, pullMessage, statusOf, summaryText, toManualBody, toShippableRow, type ShippableRecord,
} from '../src/pages/sl/register/utils/salesRegister';

const rec = (extra: Partial<ShippableRecord> = {}): ShippableRecord => ({ sourceType: 'logistics', sourceId: 7, qty: 135, unitPrice: 4960, amount: 669600, ...extra });

describe('판매등록 utils(송연 sales.py · 36-sales.js)', () => {
  it('줄 열쇠는 출처까지, 상태·요약', () => {
    expect(toShippableRow(rec({ sourceType: 'production' })).key).toBe('production:7');
    expect(statusOf(rec({ already: true, unitPrice: null }))).toBe('already');
    expect(statusOf(rec({ unitPrice: null }))).toBe('no-price');
    expect(statusOf(rec())).toBe('');
    expect(summaryText([rec(), rec({ already: true }), rec()])).toBe('3건 중 아직 안 넣은 것 2건');
    expect(summaryText([])).toBe('');
  });

  it('보낼 항목은 아직 안 넣은 줄만, 금액은 보내지 않는다', () => {
    expect(pullItems([rec(), rec({ sourceId: 5, already: true }), rec({ sourceType: 'production', sourceId: 6 })]))
      .toEqual([{ sourceType: 'logistics', sourceId: 7 }, { sourceType: 'production', sourceId: 6 }]);
    expect(pullMessage({ added: 2, skipped: 0 })).toBe('2건을 판매로 넣었어요');
    expect(pullMessage({ added: 1, skipped: 1 })).toBe('1건 등록, 1건은 건너뛰었어요');
  });

  it('표시와 기본 기간, 직접 등록 본문', () => {
    expect(formatQty(1234.567)).toBe('1,234.57');
    expect(formatMoney(1148635.068)).toBe('1,148,635.068');
    expect(formatMoney(null)).toBe('');
    expect(monthStart(new Date(2026, 9, 7))).toBe('2026-10-01');
    expect(toManualBody({ saleDate: '2026-10-07', clientName: ' 달구지 ', productName: ' 로제 ', qty: ' 10 ', unitPrice: '', note: ' ' }))
      .toEqual({ saleDate: '2026-10-07', clientName: '달구지', productName: '로제', qtyText: '10', unitPriceText: '', note: '' });
  });
});

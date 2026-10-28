import { describe, expect, it } from 'vitest';

import {
  bomMaterialCost,
  bomRowsFromQuote,
  buildQuoteSheetHtml,
  computeQuote,
  EMPTY_QUOTE_FORM,
  filterQuotes,
  QUOTE_EXCEL_COLUMNS,
  quoteFormFrom,
  quoteStatusLabel,
  toQuoteSaveBody,
  type QuoteRow,
} from '../src/pages/sales/order/quote/utils/quote';
import type { BomEditRow } from '../src/pages/co/master/item-master/types/itemMaster.types';
import { quoteDeletePlan } from '../src/pages/sales/order/quote/hooks/useQuoteManagement';

const row = (overrides: Partial<BomEditRow>): BomEditRow => ({
  id: 'r', materialName: '', ratioPercent: null, unitPrice: null, autoPrice: false, materialCode: null, ...overrides,
});

describe('견적 utils(송연 05-quote.js)', () => {
  it('원재료비 → 고정마진 → 로스 → 원가 합계(견적단가)', () => {
    const rows = [row({ materialName: '양파', ratioPercent: 50, unitPrice: 2000 }), row({ materialName: '설탕', ratioPercent: 50, unitPrice: 1000 }), row({ materialName: '소금', ratioPercent: 5 })];
    expect(bomMaterialCost(rows)).toBe(1500);
    const form = { ...EMPTY_QUOTE_FORM, markupRate: '10', lossRate: '2', laborCost: '100', otherCost1: '17' };
    expect(computeQuote(form, rows)).toEqual({ materialCost: 1500, markupAmount: 150, afterMarkup: 1650, lossAmount: 33, afterLoss: 1683, total: 1800 });
  });

  it('저장 본문: 이름·배합비율이 있는 줄만, 율은 빈칸만 null(0 은 0), 금액은 빈칸·0 이 null', () => {
    const form = { ...EMPTY_QUOTE_FORM, productName: ' 떡볶이소스 ', clientCode: ' ', markupRate: '0', lossRate: '', laborCost: '0', margin: '12.5', otherCost2Note: ' 특별 ' };
    const body = toQuoteSaveBody(form, [
      row({ materialName: ' 양파 ', ratioPercent: 50, unitPrice: 2000, materialCode: '000022' }),
      row({ materialName: '설탕', ratioPercent: null }),
      row({ materialName: '', ratioPercent: 10 }),
    ]);
    expect(body.productName).toBe('떡볶이소스');
    expect(body.clientCode).toBeNull(); // 2026-10-23 거래처코드
    expect(body.bom).toEqual([{ materialName: '양파', ratioPercent: 50, unitPrice: 2000, materialCode: '000022' }]);
    expect(body.markupRate).toBe(0);
    expect(body.lossRate).toBeNull();
    expect(body.laborCost).toBeNull();
    expect(body.margin).toBe(12.5);
    expect(body.otherCost2Note).toBe('특별');
  });

  it('상세 → 입력칸, 저장해 둔 배합비 → 표 줄(단가가 없으면 원재료 목록 단가)', () => {
    const form = quoteFormFrom({ quoteId: 1, productName: 'A', markupRate: 10, currentPrice: null, otherCost1Note: '비고' });
    expect(form).toMatchObject({ productName: 'A', markupRate: '10', currentPrice: '', otherCost1Note: '비고', spec: '' });
    let n = 0;
    const rows = bomRowsFromQuote(
      [{ materialName: '양파', ratioPercent: 18.69, unitPrice: null }, { materialName: '설탕', ratioPercent: 5, unitPrice: 900, materialCode: '000012' }],
      [{ code: '000022', name: '양파', unitPrice: 1700, subCategory: null }],
      () => `id-${n++}`,
    );
    expect(rows[0]).toMatchObject({ id: 'id-0', materialName: '양파', ratioPercent: 18.69, unitPrice: 1700, autoPrice: true, materialCode: '000022' });
    expect(rows[1]).toMatchObject({ unitPrice: 900, autoPrice: false, materialCode: '000012' });
  });

  it('검색은 제품명·거래처명 부분 일치(대소문자 무시), 상태 글자, 엑셀 칸', () => {
    const rows: QuoteRow[] = [
      { quoteId: 1, productName: 'Tteok 소스', clientName: '(주)A', status: 'draft' },
      { quoteId: 2, productName: '김치찌개', clientName: '(주)부산축산', status: 'confirmed', confirmedProductCode: '000007' },
    ];
    expect(filterQuotes(rows, 'tteok').map((r) => r.quoteId)).toEqual([1]);
    expect(filterQuotes(rows, '부산').map((r) => r.quoteId)).toEqual([2]);
    expect(filterQuotes(rows, ' ').length).toBe(2);
    expect(quoteStatusLabel(rows[0])).toBe('가견적');
    expect(quoteStatusLabel(rows[1])).toBe('확정됨 (000007)');
    expect(QUOTE_EXCEL_COLUMNS.map((c) => c.label)).toEqual(['제품명', '규격', '거래처', '제품단가', '상태']);
  });

  it('견적서: 공급받는자는 첫 견적 거래처, 세액 10%, 빈 줄로 10줄 채움, 입력값은 HTML 로 해석하지 않는다', () => {
    const html = buildQuoteSheetHtml(
      [{ quoteId: 1, productName: '떡볶이<script>', spec: '2kg', clientName: '(주)A&B', totalPrice: 1234.5, note: '초도' }],
      new Date(2026, 9, 6),
      'http://x/company_seal.png',
    );
    expect(html).toContain('견적년월일 : 2026. 10. 06');
    expect(html).toContain('견적유효년월일 : 2026. 11. 06');
    expect(html).toContain('(주)A&amp;B');
    expect(html).toContain('떡볶이&lt;script&gt;');
    expect(html).not.toContain('<script>');
    expect(html).toContain('>1,234.5<');
    expect(html).toContain('>123<'); // Math.round(1234.5 × 0.1)
    expect((html.match(/<tr><td>&nbsp;<\/td>/g) || []).length).toBe(9);
    expect(html).toContain('468-86-01233');
  });
});

describe('견적 삭제(2026-10-28, [삭제] · [행 삭제] 뒤 [저장])', () => {
  it('가견적만 지우고, 확정된 견적이 섞이면 그 이름을 알린다', () => {
    const rows = [
      { quoteId: 1, productName: '예시소스', status: 'draft' },
      { quoteId: 2, productName: '예시분말', status: 'confirmed' },
      { quoteId: 3, productName: '', status: 'draft' },
    ];
    expect(quoteDeletePlan([rows[0], rows[2]])).toEqual({ ids: [1, 3], confirmedNames: [] });
    expect(quoteDeletePlan(rows).confirmedNames).toEqual(['예시분말']);
    expect(quoteDeletePlan([{ quoteId: 9, status: 'confirmed' }]).confirmedNames).toEqual(['견적 9']);
  });
});

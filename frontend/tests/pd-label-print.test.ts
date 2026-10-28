import { describe, expect, it } from 'vitest';

import { printQtyText } from '../src/pages/pd/label/utils/labelPrint';
import {
  buildLabelHTML, LABEL_FORMAT_BASIC, labelPrintExpiryStr, labelShelfLifeText, missingLabelItems, sanitizeLabelHtml,
} from '../src/shared/components/LabelPrintDialog/labelHtml';

describe('라벨출력(송연 PD0004)', () => {
  it('생산수량: 쉼표를 떼고 숫자 앞부분만 읽는다', () => {
    expect(printQtyText('1,000kg')).toBe('1,000');
    expect(printQtyText('132.5')).toBe('132.5');
    expect(printQtyText(null)).toBe('0');
  });

  it('소비기한 = 제조일 + 기간 - 1일, 그 달에 없는 날은 마지막 날로', () => {
    expect(labelPrintExpiryStr('2026-10-06', 6, '월')).toBe('2027년 04월 05일');
    expect(labelPrintExpiryStr('2026-09-01', 1, '년')).toBe('2027년 08월 31일');
    expect(labelPrintExpiryStr('2026-10-06', 10, '일')).toBe('2026년 10월 15일');
    expect(labelPrintExpiryStr('2026-04-01', 1, '월')).toBe('2026년 04월 30일');
    expect(labelPrintExpiryStr('2026-12-01', 2, '월')).toBe('2027년 01월 30일');
    expect(labelShelfLifeText('2026-10-06', 6, '월')).toBe('2027년 04월 05일(제조일로부터 6개월)');
  });

  it('라벨 HTML: 양식의 snake_case 항목을 서버 값(camelCase)에서 찾고, 회사정보·스크립트 거름', () => {
    const html = buildLabelHTML({
      code: '000006', name: '로제파스타소스', mfgDate: '2026-10-06',
      info: { foodType: '소스', netWeight: '5Kg', shelfLifeMonths: 6, shelfLifeUnit: '월', ingredientsText: '<b>토마토</b><script>x()</script>', storage: '냉장' },
      companyInfo: { businessName: '송연', businessAddress: '경기', customerServicePhone: '031-000-0000', noticeText: '주의\n사항' },
      format: null, recycle: null, marks: [],
    });
    expect(LABEL_FORMAT_BASIC.paper).toEqual({ w: 100, h: 150 });
    expect(html).toContain('>소스</td>');
    expect(html).toContain('>5Kg</td>');
    expect(html).toContain('2026년 10월 06일');
    expect(html).toContain('2027년 04월 05일(제조일로부터 6개월)');
    expect(html).toContain('<b>토마토</b>');
    expect(html).not.toContain('script');
    expect(html).toContain('송연<br>경기');
    expect(html).toContain('031-000-0000');
    expect(html).toContain('주의<br>사항');
    expect(sanitizeLabelHtml('<span onclick="x()" style="font-weight:700">a</span>')).toBe('<span style="font-weight:700">a</span>');
  });

  it('비어 있는 항목 안내', () => {
    expect(missingLabelItems({ foodType: '소스', ingredientsText: '<p> </p>' }, {})).toEqual(
      ['내용량', '소비기한', '원재료명', '품목제조보고번호', '보관방법', '포장재질', '영업소 명칭(회사 고정정보)'],
    );
  });
});

import { describe, expect, it } from 'vitest';

import {
  bomForSave, calcRecipe, codeCell, filterClients, percentText, recipeExcelFileName, recipeExcelRows, recipePrintHtml, rowsFromBom, versionOption, versionTag,
  type RecipeBomRow,
} from '../src/pages/rd/recipe/utils/recipe';

const row = (materialName: string, weight: number | null, unitPrice: number | null = null, materialCode: string | null = null): RecipeBomRow =>
  ({ id: materialName || 'blank', materialName, weight, unitPrice, materialCode });

describe('레시피 작성 배합표(송연 recalcRecipeBom)', () => {
  it('배합비율 = 중량 / 중량 합계, 적용단가 = 비율 × 원재료단가, 합계도 함께', () => {
    const rows = [row('설탕', 400, 1500), row('정제수', 600, null), row('', null)];
    const c = calcRecipe(rows);
    expect(c.totalWeight).toBe(1000);
    expect(percentText(c.percent(rows[0]))).toBe('40.00%');
    expect(c.amount(rows[0])).toBeCloseTo(600);
    expect(c.amount(rows[1])).toBeNull(); // 단가가 없으면 빈칸
    expect(c.totalAmount).toBeCloseTo(600);
  });

  it('중량이 하나도 없으면 비율은 계산하지 않는다(빈칸)', () => {
    const c = calcRecipe([row('설탕', null, 1500)]);
    expect(c.percent(row('설탕', null))).toBeNull();
    expect(percentText(null)).toBe('');
  });

  it('저장할 줄: 이름이 있고 비율이 0보다 큰 줄만, 비율은 퍼센트, 빈 중량·단가는 빈 글자', () => {
    const bom = bomForSave([row(' 설탕 ', 1, 1500, '000012'), row('정제수', 3), row('소금', 0), row('', 5)]);
    expect(bom).toEqual([
      { materialName: '설탕', materialCode: '000012', weight: '1', ratioPercent: 1 / 9 * 100, unitPrice: '1500' },
      { materialName: '정제수', materialCode: null, weight: '3', ratioPercent: 3 / 9 * 100, unitPrice: '' },
    ]);
  });

  it('불러오기: 중량이 없는 배합표(제품BOM·옛 레시피)는 배합비율(%)을 중량 자리에, 비면 빈 줄 셋', () => {
    const rows = rowsFromBom([{ materialName: '설탕', weight: null, ratio: 0.18694, unitPrice: 1500, materialCode: '000012' }, { materialName: '정제수', weight: 750 }]);
    expect(rows.map((r) => [r.materialName, r.weight, r.unitPrice, r.materialCode])).toEqual([['설탕', 18.69, 1500, '000012'], ['정제수', 750, null, null]]);
    expect(rowsFromBom([])).toHaveLength(3);
  });

  it('원재료코드 칸: 물고 있는 코드, 이름이 하나면 그 코드, 같은 이름이 둘 이상이면 겹침', () => {
    const materials = [{ code: '000012', name: '설탕' }, { code: '000020', name: '소금' }, { code: '000031', name: '소금' }];
    expect(codeCell(row('설탕', 1), materials)).toEqual({ text: '000012' });
    expect(codeCell(row('소금', 1, null, '000031'), materials)).toEqual({ text: '000031' });
    const overlap = codeCell(row('소금', 1), materials);
    expect(overlap.text).toBe('겹침');
    expect(overlap.overlap).toBe("'소금' 이라는 원재료가 2개예요 (000020, 000031). 저장하면 코드가 작은 쪽으로 붙습니다.");
    expect(codeCell(row('없는것', 1), materials)).toEqual({ text: '' });
  });
});

describe('레시피 작성 화면 글자(송연 09-recipe.js)', () => {
  it('버전 꼬리표: 넘긴 기록이 있으면 그것을 · 로, 없으면 옛 분류, 둘 다 없으면 없음', () => {
    expect(versionTag({ id: 1, versionLabel: 'test1', handoffKinds: '견적,확정', stage: '견적공유' })).toBe('견적·확정');
    expect(versionOption({ id: 1, versionLabel: 'test1', stage: '신규확정' })).toBe('test1 🔒신규확정');
    expect(versionOption({ id: 2, versionLabel: '초안' })).toBe('초안');
  });

  it('업체 폴더 찾기: 이름 일부, 대소문자 무시', () => {
    const rows = [{ clientName: '태화분식', recipeCount: 1 }, { clientName: 'ABC푸드', recipeCount: 0 }];
    expect(filterClients(rows, 'abc').map((c) => c.clientName)).toEqual(['ABC푸드']);
    expect(filterClients(rows, ' ')).toHaveLength(2);
  });

  it('인쇄: 제목 칸 레시피명 (업체명), TEST번호, YYYY. MM. DD, 함량이 비면 빈칸, < 는 글자로', () => {
    const html = recipePrintHtml('떡볶이<소스>', '태화분식', 'test1', [{ name: '설탕', weight: '400', percent: '40.00%' }, { name: '물', weight: '', percent: '' }], new Date(2026, 9, 4));
    expect(html).toContain('떡볶이&lt;소스> (태화분식)');
    expect(html).toContain('TEST번호<br/><span style="font-weight:400;color:#111;">test1</span>');
    expect(html).toContain('2026. 10. 04');
    expect(html).toContain('<td style="text-align:right;">40.00%</td>');
    expect(html).not.toContain('>-<');
  });

  it('엑셀: 머리 네 줄, 빈 줄, 배합표(배합비율은 % 숫자), 파일 이름의 / 는 -', () => {
    const rows = recipeExcelRows({ id: 1, clientName: '태화분식', name: '떡볶이소스', spec: '1kg' }, 'test1', [
      { materialName: '설탕', ratioPercent: 0.4, unitPricePerKg: 1500, amountPerKg: 600 },
      { materialName: '정제수', ratioPercent: null },
    ]);
    expect(rows.slice(0, 6)).toEqual([['업체명', '태화분식'], ['레시피명', '떡볶이소스'], ['규격', '1kg'], ['버전', 'test1'], [], ['원재료명', '배합비율(%)', '원재료단가', '적용단가']]);
    expect(rows[6]).toEqual(['설탕', 40, 1500, 600]);
    expect(rows[7]).toEqual(['정제수', null, null, null]);
    expect(recipeExcelFileName('소스 1/2', '초안')).toBe('소스 1-2_초안.xlsx');
  });
});

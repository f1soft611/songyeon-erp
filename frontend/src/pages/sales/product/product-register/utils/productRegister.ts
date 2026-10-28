import type { BomEditRow } from '../../../co/master/item-master/types/itemMaster.types';
import type { CommonCodeOption } from '../../../../shared/components/common-code/useCommonCodeOptions';
import type { ProductRegisterBody, ProductRegisterForm } from '../types/productRegister.types';

// 영업관리 > 제품등록 화면 규칙(보관방법 코드 · 빈 입력값 · 등록할 때 보낼 내용)
// 보관방법(2026-10-23): 공통코드 STORAGE_METHOD. 제품에는 코드로 저장한다
export const STORAGE_METHOD_GROUP = 'STORAGE_METHOD';

// 견적 등에서 넘어온 글자를 보관방법 코드로 바꾼다: 코드 그대로 · 이름이 같으면 그 코드 ·
// 이름의 앞말(실온 · 냉장 · 냉동)이 들어 있으면 그 코드('냉장보관(0℃~10℃)' → 냉장). 맞는 게 없으면 빈 값
export function storageCodeOf(options: CommonCodeOption[], value: string): string {
  const text = (value || '').trim();
  if (!text) return '';
  const byCode = options.find((option) => option.code === text);
  if (byCode) return byCode.code;
  const byName = options.find((option) => option.name === text);
  if (byName) return byName.code;
  const byWord = options.find((option) => {
    const word = option.name.split('(')[0].trim();
    return word !== '' && text.includes(word);
  });
  return byWord ? byWord.code : '';
}

export const EMPTY_PRODUCT_FORM: ProductRegisterForm = {
  name: '',
  spec: '',
  productType: '',
  storage: '',
  clientCode: '',
};

// 송연 buildSaveBody: 원재료명과 배합비율이 모두 있는 줄만 보낸다. 목록에서 맞춘 원재료는 코드도 보낸다.
export function buildRegisterBody(form: ProductRegisterForm, rows: BomEditRow[]): ProductRegisterBody {
  const orNull = (value: string) => (value.trim() ? value.trim() : null);
  return {
    productName: form.name.trim(),
    spec: orNull(form.spec),
    productType: orNull(form.productType),
    storage: orNull(form.storage),
    clientCode: orNull(form.clientCode),
    bom: rows
      .filter((row) => row.materialName.trim() && row.ratioPercent !== null)
      .map((row) => ({
        materialName: row.materialName.trim(),
        ratioPercent: row.ratioPercent as number,
        unitPrice: row.unitPrice,
        ...(row.materialCode ? { materialCode: row.materialCode } : {}),
      })),
  };
}

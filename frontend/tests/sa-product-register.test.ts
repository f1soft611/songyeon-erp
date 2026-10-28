import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiPost = vi.fn();
vi.mock('../src/shared/services/apiClient', () => ({
  apiGet: vi.fn(),
  apiPost: (...args: unknown[]) => apiPost(...args),
  apiPut: vi.fn(),
  apiDelete: vi.fn(),
}));

import { registerProduct } from '../src/pages/sales/product/product-register/services/productRegister.service';
import { buildRegisterBody, EMPTY_PRODUCT_FORM } from '../src/pages/sales/product/product-register/utils/productRegister';
import type { BomEditRow } from '../src/pages/co/master/item-master/types/itemMaster.types';

const row = (overrides: Partial<BomEditRow>): BomEditRow => ({
  id: 'r',
  materialName: '',
  ratioPercent: null,
  unitPrice: null,
  autoPrice: false,
  materialCode: null,
  ...overrides,
});

describe('영업관리 > 제품등록', () => {
  beforeEach(() => apiPost.mockReset());

  it('빈 칸은 null, 원재료명·배합비율이 모두 있는 줄만, 맞춘 원재료는 코드도 보낸다', () => {
    const body = buildRegisterBody(
      { ...EMPTY_PRODUCT_FORM, name: ' 떡볶이소스 2kg ', spec: ' ', storage: '002', clientCode: '000003' }, // 2026-10-23 보관방법 · 거래처는 코드
      [
        row({ id: '1', materialName: ' 고춧가루 ', ratioPercent: 12.5, unitPrice: 8700, materialCode: '000002' }),
        row({ id: '2', materialName: '소금', ratioPercent: null }),
        row({ id: '3', materialName: '', ratioPercent: 5 }),
        row({ id: '4', materialName: '설탕', ratioPercent: 3, unitPrice: null }),
      ],
    );
    expect(body).toEqual({
      productName: '떡볶이소스 2kg',
      spec: null,
      productType: null,
      storage: '002',
      clientCode: '000003',
      bom: [
        { materialName: '고춧가루', ratioPercent: 12.5, unitPrice: 8700, materialCode: '000002' },
        { materialName: '설탕', ratioPercent: 3, unitPrice: null },
      ],
    });
  });

  it('등록하면 발번한 제품코드와 원재료비를 받는다', async () => {
    apiPost.mockResolvedValueOnce({ productCode: '000003', materialCost: 1087.5 });
    const body = buildRegisterBody({ ...EMPTY_PRODUCT_FORM, name: '소스' }, []);
    expect(await registerProduct(body)).toEqual({ productCode: '000003', materialCost: 1087.5 });
    expect(apiPost).toHaveBeenCalledWith('/api/v1/sales/product/product-register', body);
  });
});

import { parseRecipeRows } from '../src/pages/sales/product/product-register/utils/recipeExcel';

describe('제품등록 레시피 엑셀 읽기(송연 handleBomFile)', () => {
  it('"품목" 표에서 합계가 100% 근처인 가장 오른쪽 칸을 배합비율로 읽고, "합계" 줄 앞에서 멈춘다', () => {
    const rows: unknown[][] = [
      ['레시피', '', '', ''],
      ['', '품목', '1차(9/1)', '2차(9/15)', '단가'],
      ['', '양파분말', 0.5, 0.45, 1700],
      ['', '설탕', 0.3, 0.35, 900],
      ['', '소금', 0.2, 0.2, 400],
      ['', '합계', 1, 1, ''],
      ['', '메모', 0.9, 0.9, ''],
    ];
    expect(parseRecipeRows(rows)).toEqual([
      { materialName: '양파분말', ratioPercent: 45 },
      { materialName: '설탕', ratioPercent: 35 },
      { materialName: '소금', ratioPercent: 20 },
    ]);
  });

  it('배합비율은 소수 셋째 자리까지 남긴다', () => {
    const rows: unknown[][] = [['품목', '비율'], ['A', 0.123456], ['B', 0.876544]];
    expect(parseRecipeRows(rows)).toEqual([
      { materialName: 'A', ratioPercent: 12.346 },
      { materialName: 'B', ratioPercent: 87.654 },
    ]);
  });

  it('"품목" 표가 없으면 A열=원재료명·B열=배합비율(%) 두 칸 양식으로 읽고, 첫 머리줄은 건너뛴다', () => {
    const rows: unknown[][] = [['원재료명', '배합비율'], ['양파', '60'], ['', 5], ['마늘', 40], ['메모', '없음']];
    expect(parseRecipeRows(rows)).toEqual([
      { materialName: '양파', ratioPercent: 60 },
      { materialName: '마늘', ratioPercent: 40 },
    ]);
  });

  it('글자가 섞인 칸은 배합비율 칸으로 보지 않아 두 칸 양식으로 다시 읽고(숫자 줄만), 아무것도 못 찾으면 빈 목록', () => {
    expect(parseRecipeRows([['품목', '비율'], ['A', '미정'], ['B', 1]])).toEqual([{ materialName: 'B', ratioPercent: 1 }]);
    expect(parseRecipeRows([['품목', '비율'], ['A', '미정']])).toEqual([]);
    expect(parseRecipeRows([])).toEqual([]);
  });
});

import ExcelJS from 'exceljs';
import { readExcelValues } from '../src/shared/utils/excelFile';
import { buildRecipeTemplate } from '../src/pages/sales/product/product-register/utils/recipeTemplate';

describe('제품등록 레시피 양식 내려받기', () => {
  it('내려받은 양식을 그대로 올리면 예시 3줄이 배합비율(%)로 읽힌다(첫 장 = "품목" 표, 둘째 장 = 작성방법)', async () => {
    const workbook = buildRecipeTemplate(new ExcelJS.Workbook());
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual(['레시피', '작성방법']);
    const buffer = await workbook.xlsx.writeBuffer();
    const file = new File([buffer as ArrayBuffer], '레시피_배합비_양식.xlsx');
    expect(parseRecipeRows(await readExcelValues(file))).toEqual([
      { materialName: '양파분말', ratioPercent: 45 },
      { materialName: '하얀설탕', ratioPercent: 35 },
      { materialName: '구운소금', ratioPercent: 20 },
    ]);
  });

  it('예시를 지우고 원재료를 새로 적으면 그 줄만 읽힌다(빈 줄은 건너뜀)', async () => {
    const workbook = buildRecipeTemplate(new ExcelJS.Workbook());
    const sheet = workbook.getWorksheet('레시피')!;
    [5, 6, 7].forEach((r) => { sheet.getCell(`B${r}`).value = null; sheet.getCell(`C${r}`).value = null; });
    sheet.getCell('B9').value = '마늘밀링';
    sheet.getCell('C9').value = 0.6;
    sheet.getCell('B12').value = '요리당';
    sheet.getCell('C12').value = 0.4;
    const file = new File([(await workbook.xlsx.writeBuffer()) as ArrayBuffer], 'x.xlsx');
    expect(parseRecipeRows(await readExcelValues(file))).toEqual([
      { materialName: '마늘밀링', ratioPercent: 60 },
      { materialName: '요리당', ratioPercent: 40 },
    ]);
  });
});

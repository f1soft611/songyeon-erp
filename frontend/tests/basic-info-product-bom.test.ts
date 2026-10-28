import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiGet = vi.fn();
const apiPost = vi.fn();
const apiPut = vi.fn();
const apiDelete = vi.fn();
vi.mock('../src/shared/services/apiClient', () => ({
  apiGet: (...args: unknown[]) => apiGet(...args),
  apiPost: (...args: unknown[]) => apiPost(...args),
  apiPut: (...args: unknown[]) => apiPut(...args),
  apiDelete: (...args: unknown[]) => apiDelete(...args),
}));

import { fetchBom, fetchProductBomRows, fetchSubMaterials, saveBom, setProductDiscontinued } from '../src/pages/co/master/item-master/services/itemMaster.service';
import { appliedPrice, diffBom, filterProductRows, materialNamePatch, staleCutoff, unknownClientMessage } from '../src/pages/co/master/item-master/utils/productBom';
import { formatPrice, formatQty, percentText, ratioToPercent } from '../src/shared/utils/numberFormat';
import type { MaterialOption, ProductBomRow } from '../src/pages/co/master/item-master/types/itemMaster.types';

const product = (overrides: Partial<ProductBomRow>): ProductBomRow => ({
  id: '000001',
  code: '000001',
  name: '양념불고기',
  spec: '1kg',
  storage: '냉동',
  clientName: '',
  discontinued: false,
  discontinuedAt: '',
  discontinuedBy: '',
  materialCount: 3,
  lastProducedDate: '',
  ...overrides,
});

const materials: MaterialOption[] = [
  { code: 'M001', name: '돼지고기', unitPrice: 8000, subCategory: null },
  { code: 'M002', name: '설탕', unitPrice: null, subCategory: null },
];

describe('제품BOM 화면 규칙', () => {
  it('송연 fmt·fmtPrice 와 같이 숫자를 보여준다', () => {
    expect(formatQty(1234.567)).toBe('1,234.57');
    expect(formatQty(null)).toBe('');
    expect(formatPrice(12.345678)).toBe('12.3457');
    expect(percentText(0.125)).toBe('12.50%');
    expect(ratioToPercent(0.12345)).toBe(12.345);
    expect(ratioToPercent(0.123456)).toBe(12.346);
    expect(percentText(0.12345)).toBe('12.345%');
    expect(percentText(0.0026)).toBe('0.26%');
    expect(appliedPrice(25, 8000)).toBe('2,000');
    expect(appliedPrice(null, 8000)).toBe('');
  });

  it('원재료명이 등록된 이름과 같으면 단가를 채우고, 맞지 않으면 자동으로 채운 단가만 비운다', () => {
    expect(materialNamePatch({ autoPrice: false }, '돼지고기', materials)).toEqual({
      materialName: '돼지고기',
      unitPrice: 8000,
      autoPrice: true,
      materialCode: 'M001',
    });
    expect(materialNamePatch({ autoPrice: true }, '돼지', materials)).toEqual({
      materialName: '돼지',
      materialCode: null,
      unitPrice: null,
      autoPrice: false,
    });
    // 손으로 넣은 단가는 그대로 둔다
    expect(materialNamePatch({ autoPrice: false }, '돼지', materials)).toEqual({
      materialName: '돼지',
      materialCode: null,
    });
    // 단가가 없는 원재료는 코드만 맞춘다
    expect(materialNamePatch({ autoPrice: false }, '설탕', materials)).toEqual({
      materialName: '설탕',
      materialCode: 'M002',
    });
  });

  it('변경로그는 추가·바뀜·삭제만 적는다', () => {
    const line = (materialName: string, ratio: number) => ({
      materialCode: null,
      materialName,
      ratio,
      unitPricePerKg: null,
      amountPerKg: null,
    });
    const result = diffBom(
      [line('돼지고기', 0.5), line('설탕', 0.1), line('간장', 0.4)],
      [line('돼지고기', 0.6), line('설탕', 0.1), line('마늘', 0.3)],
    );
    expect(result).toEqual([
      { kind: 'change', text: '돼지고기 — 50.00% → 60.00%' },
      { kind: 'add', text: '+ 추가됨 — 마늘 (30.00%)' },
      { kind: 'remove', text: '− 삭제됨 — 간장 (40.00%)' },
    ]);
    expect(diffBom([line('설탕', 0.1)], [line('설탕', 0.1)])).toEqual([]);
  });

  it('검색어와 안 만든 기간으로 거른다(생산이력이 없으면 안 만든 것으로 본다)', () => {
    const today = new Date(2026, 9, 2);
    expect(staleCutoff(6, today)).toBe('2026-04-02');
    const rows = [
      product({ id: 'a', code: '000001', name: '양념불고기', lastProducedDate: '2026-09-01' }),
      product({ id: 'b', code: '000002', name: '돈까스', lastProducedDate: '2025-01-10' }),
      product({ id: 'c', code: '000003', name: '불고기 소스', lastProducedDate: '' }),
    ];
    expect(filterProductRows(rows, '불고기', null, today).map((row) => row.id)).toEqual(['a', 'c']);
    expect(filterProductRows(rows, '000002', null, today).map((row) => row.id)).toEqual(['b']);
    expect(filterProductRows(rows, '', 6, today).map((row) => row.id)).toEqual(['b', 'c']);
  });

  it('거래처BOM에 없는 업체명은 비슷한 이름을 알려준다', () => {
    const message = unknownClientMessage('디에이치', ['(주) 디에이치식품']);
    expect(message).toContain("'디에이치' 은 거래처BOM에 없는 거래처예요.");
    expect(message).toContain("혹시 '(주) 디에이치식품' 인가요?");
    expect(unknownClientMessage('없는곳', ['(주) 디에이치식품'])).not.toContain('혹시');
  });
});

describe('제품BOM 서비스', () => {
  beforeEach(() => {
    apiGet.mockReset();
    apiPut.mockReset();
  });

  it('제품 목록과 배합비를 화면 값으로 바꾼다', async () => {
    apiGet.mockResolvedValueOnce({
      resultList: [{ code: '000001', name: '양념불고기', discontinued: 1, materialCount: '4', lastProducedDate: null }],
    });
    const rows = await fetchProductBomRows(true);
    expect(apiGet).toHaveBeenLastCalledWith('/api/v1/co/master/item-master?includeDiscontinued=true');
    expect(rows[0]).toMatchObject({ id: '000001', discontinued: true, materialCount: 4, lastProducedDate: '' });

    apiGet.mockResolvedValueOnce({
      resultList: [{ materialCode: 'M001', materialName: '돼지고기', ratioPercent: 0.5, unitPricePerKg: 8000, amountPerKg: 4000 }],
    });
    expect(await fetchBom('000001')).toEqual([
      { materialCode: 'M001', materialName: '돼지고기', ratio: 0.5, unitPricePerKg: 8000, amountPerKg: 4000 },
    ]);
  });

  it('빈 부자재는 빈 값으로 받는다', async () => {
    apiGet.mockResolvedValueOnce({ item: {} });
    expect(await fetchSubMaterials('000001')).toEqual({
      pouchNetWeightKg: null,
      pouchLengthM: null,
      pouchPerUnit: null,
      filmMaterialName: '',
      pouchMaterialName: '',
      boxMaterialName: '',
    });
  });

  it('배합비 저장은 이름·비율이 빈 줄을 빼고 퍼센트로 보낸다', async () => {
    apiPut.mockResolvedValueOnce({ materialCost: 4200.5 });
    const cost = await saveBom('000001', [
      { id: '1', materialName: ' 돼지고기 ', ratioPercent: 50, unitPrice: 8000, autoPrice: true, materialCode: 'M001' },
      { id: '2', materialName: '설탕', ratioPercent: null, unitPrice: null, autoPrice: false, materialCode: null },
      { id: '3', materialName: '', ratioPercent: 10, unitPrice: null, autoPrice: false, materialCode: null },
      { id: '4', materialName: '마늘', ratioPercent: 5, unitPrice: 3000, autoPrice: false, materialCode: null },
    ]);
    expect(cost).toBe(4200.5);
    expect(apiPut).toHaveBeenCalledWith('/api/v1/co/master/item-master/000001/bom', {
      bom: [
        { materialName: '돼지고기', ratioPercent: 50, unitPrice: 8000, materialCode: 'M001' },
        { materialName: '마늘', ratioPercent: 5, unitPrice: 3000 },
      ],
    });
  });

  it('사용안함은 줄을 지우지 않고 표시만 바꾼다', async () => {
    apiPut.mockResolvedValueOnce(undefined);
    await setProductDiscontinued('000001', true);
    expect(apiPut).toHaveBeenCalledWith('/api/v1/co/master/item-master/000001/discontinue', { discontinued: true });
  });
});

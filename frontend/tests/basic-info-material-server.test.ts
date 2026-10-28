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

import { fetchMaterialRows, replaceMaterial, saveMaterialInfo, saveMaterialPrice } from '../src/pages/co/master/material-master/services/materialMaster.service';

import { fetchSubMaterialRows } from '../src/pages/co/master/sub-material-master/services/subMaterialMaster.service';
import { filterMaterialRows, findReplaceTarget, isLowStock, isMinusStock, materialStaleCutoff, priceSavedText, renameNotice, needsSameMaterialCheck, sameKey, sameMaterialMessage, vendorText } from '../src/pages/co/master/material-master/utils/materialMaster';
import { filterSubMaterialMasterRows } from '../src/pages/co/master/sub-material-master/hooks/useSubMaterialMasterManagement';
import { toMaterialMasterRows } from '../src/pages/co/master/material-master/hooks/useMaterialMasterManagement';
import type { MaterialRow } from '../src/pages/co/master/material-master/types/materialMaster.types';

const material = (overrides: Partial<MaterialRow>): MaterialRow => ({
  id: '000001',
  code: '000001',
  name: '정제소금',
  spec: '',
  unitPrice: null,
  stockQty: null,
  supplier: '',
  suppliers: [],
  safetyStock: null,
  baseOrderQty: null,
  allergens: '',
  subCategory: '',
  unit: '',
  unitWeight: null,
  boxQty: null,
  lastUsedDate: '',
  usedByCount: null,
  ...overrides,
});

describe('원재료BOM 규칙', () => {
  it('부자재는 빼고, 안 쓴 기간(일·월·년)으로 거른다(사용이력 없는 것 포함)', () => {
    const today = new Date(2026, 9, 2);
    expect(materialStaleCutoff(45, 'day', today)).toBe('2026-08-18');
    expect(materialStaleCutoff(6, 'month', today)).toBe('2026-04-02');
    expect(materialStaleCutoff(1, 'year', today)).toBe('2025-10-02');
    const rows = [
      material({ id: 'a', lastUsedDate: '2026-09-30' }),
      material({ id: 'b', lastUsedDate: '2026-01-01' }),
      material({ id: 'c', lastUsedDate: '' }),
      material({ id: 'd', subCategory: '필름' }),
    ];
    expect(filterMaterialRows(rows, null, today).map((row) => row.id)).toEqual(['a', 'b', 'c']);
    expect(filterMaterialRows(rows, { value: 6, unit: 'month' }, today).map((row) => row.id)).toEqual(['b', 'c']);
  });

  it('재고 표시와 납품업체 표시', () => {
    expect(isLowStock({ safetyStock: 10, stockQty: 5 })).toBe(true);
    expect(isLowStock({ safetyStock: null, stockQty: 5 })).toBe(false);
    expect(isMinusStock({ stockQty: -1 })).toBe(true);
    expect(vendorText({ suppliers: [] })).toBe('');
    expect(vendorText({ suppliers: [{ code: null, name: '옛업체' }] })).toBe('옛업체');
    expect(vendorText({ suppliers: [{ code: '000001', name: '가' }, { code: '000002', name: '나' }, { code: '000003', name: '다' }] })).toBe('가 외 2');
  });

  it('이름을 바꾸면 따라 바뀐 곳을 알리고, 레시피를 손대지 않았으면 알림 창으로 알린다', () => {
    expect(renameNotice({ renamedFrom: '', cascadedBom: 0, cascadedRecipeVersion: 0, cascadedRecipeSkipped: 0 }, '새이름')).toEqual({});
    expect(renameNotice({ renamedFrom: '계피분말', cascadedBom: 3, cascadedRecipeVersion: 2, cascadedRecipeSkipped: 0 }, '계피가루'))
      .toEqual({ suffix: ' — 제품BOM 3줄 · 레시피 2줄 도 같이 바뀌었어요' });
    const skipped = renameNotice({ renamedFrom: '계피분말', cascadedBom: 1, cascadedRecipeVersion: 0, cascadedRecipeSkipped: 2 }, '계피가루');
    expect(skipped.alert).toContain("이름을 '계피분말' 에서 '계피가루' 으로 바꿨어요.");
    expect(skipped.alert).toContain('제품BOM 1줄 도 같이 바뀌었습니다.');
    expect(skipped.alert).toContain("'계피분말' 이라는 이름을 쓰는 원재료가 2개 더 있어서");
  });

  it('단가 저장 문구', () => {
    expect(priceSavedText({ scheduled: true, effectiveDate: '2026-11-01', affectedProducts: 0 })).toBe('2026-11-01부터 적용되도록 예약되었습니다');
    expect(priceSavedText({ scheduled: false, effectiveDate: '', affectedProducts: 0 })).toBe('저장되었습니다');
    expect(priceSavedText({ scheduled: false, effectiveDate: '', affectedProducts: 4 }))
      .toBe('저장되었습니다 (이 원재료를 쓰는 제품 4건의 단가도 자동 반영됨)');
  });

  it('일괄적용 대상은 코드·괄호 속 코드·이름으로 찾고, 같은 이름이 둘이면 코드를 묻는다', () => {
    const pool = [
      { code: '002797', name: '계피분말' },
      { code: '002798', name: '계피분말' },
      { code: '000010', name: '설탕' },
    ];
    expect(findReplaceTarget('', pool).error).toBe('대체할 원재료를 적어주세요');
    expect(findReplaceTarget('002798', pool).material?.code).toBe('002798');
    expect(findReplaceTarget('계피분말 (002797)', pool).material?.code).toBe('002797');
    expect(findReplaceTarget('설탕', pool).material?.code).toBe('000010');
    expect(findReplaceTarget('계피분말', pool).error).toBe("'계피분말' 이라는 원재료가 2개예요 (002797, 002798). 어느 것인지 원재료코드로 적어주세요.");
    expect(findReplaceTarget('없음', pool).error).toBe('대체할 원재료명이나 원재료코드를 정확히 적어주세요');
  });

  it('부자재는 이름·코드로 화면에서 거른다', () => {
    const rows = toMaterialMasterRows([
      material({ id: 'a', code: '000101', name: '파우치 1kg', subCategory: '002', useYn: 'Y', suppliers: [{ code: '000007', name: '가나상회' }] }),
      material({ id: 'b', code: '000102', name: '박스', subCategory: '003', useYn: 'N' }),
    ]);
    expect(filterSubMaterialMasterRows(rows, '파우치', 'ALL').map((row) => row.id)).toEqual(['a']);
    expect(filterSubMaterialMasterRows(rows, '000102', 'ALL').map((row) => row.id)).toEqual(['b']);
    // 2026-10-27 상세 조회: 사용여부 · 분류 · 납품업체
    expect(filterSubMaterialMasterRows(rows, '', 'Y').map((row) => row.id)).toEqual(['a']);
    expect(filterSubMaterialMasterRows(rows, '', 'ALL', '003').map((row) => row.id)).toEqual(['b']);
    expect(filterSubMaterialMasterRows(rows, '', 'ALL', '', '000007').map((row) => row.id)).toEqual(['a']);
    // 2026-10-28 납품업체는 글자 칸: 이름 일부로도 찾는다
    expect(filterSubMaterialMasterRows(rows, '', 'ALL', '', '가나').map((row) => row.id)).toEqual(['a']);
    expect(filterSubMaterialMasterRows(rows, '', 'ALL', '', '없는업체')).toEqual([]);
  });
});

describe('원재료 서비스', () => {
  beforeEach(() => {
    apiGet.mockReset();
    apiPost.mockReset();
    apiPut.mockReset();
  });

  it('원재료 목록은 검색어를 서버로, 부자재는 분류를 서버로 보낸다', async () => {
    apiGet.mockResolvedValue({ resultList: [{ code: '000001', name: '소금', suppliers: [{ clientId: 7, clientCode: '000007', clientName: '가' }], unitPrice: 800, boxQty: 2 }] });
    const rows = await fetchMaterialRows(' 소금 ');
    expect(apiGet).toHaveBeenLastCalledWith('/api/v1/co/master/material-master?q=%EC%86%8C%EA%B8%88');
    expect(rows[0]).toMatchObject({ id: '000001', suppliers: [{ code: '000007', name: '가' }], unitPrice: 800, boxQty: 2, subCategory: '' });
    await fetchSubMaterialRows('박스');
    expect(apiGet).toHaveBeenLastCalledWith('/api/v1/co/master/sub-material-master?category=%EB%B0%95%EC%8A%A4');
  });

  it('기본정보·단가·일괄적용 요청 모양', async () => {
    apiPut.mockResolvedValueOnce({ item: { renamedFrom: '가', cascadedBom: 2 } });
    const saved = await saveMaterialInfo('000001', {
      name: '나', spec: '', supplierCodes: ['000007'], unit: '', safetyStock: '', baseOrderQty: '', allergens: '', unitWeight: '', boxQty: '',
    });
    expect(apiPut.mock.calls[0][0]).toBe('/api/v1/co/master/material-master/000001/info');
    expect(apiPut.mock.calls[0][1]).not.toHaveProperty('subCategory'); // 원재료 창은 분류를 보내지 않는다
    expect(saved).toEqual({ renamedFrom: '가', cascadedBom: 2, cascadedRecipeVersion: 0, cascadedRecipeSkipped: 0 });

    apiPost.mockResolvedValueOnce({ item: { scheduled: true, effectiveDate: '2026-11-01' } });
    expect(await saveMaterialPrice('000001', { unitPrice: '900', effectiveDate: '2026-11-01' }))
      .toEqual({ scheduled: true, effectiveDate: '2026-11-01', affectedProducts: 0 });

    apiPost.mockResolvedValueOnce({ affectedCount: 3 });
    expect(await replaceMaterial('000001', '000002', ['P1'])).toBe(3);
    expect(apiPost).toHaveBeenLastCalledWith('/api/v1/co/master/material-master/000001/bulk-replace', {
      newMaterialCode: '000002',
      productCodes: ['P1'],
    });
  });
});

describe('같은 원재료(이름·규격) 확인', () => {
  it('띄어쓰기·대소문자를 무시해 비교하고, 신규이거나 이름·규격이 바뀔 때만 확인한다', () => {
    expect(sameKey(' 흑후추 분말 ')).toBe(sameKey('흑후추분말'));
    expect(sameKey('20KG')).toBe(sameKey('20 kg'));
    expect(needsSameMaterialCheck(true, { name: '', spec: '' }, { name: '소금', spec: '' })).toBe(true);
    expect(needsSameMaterialCheck(false, { name: '흑후추분말', spec: '20kg' }, { name: '흑후추 분말', spec: '20KG' })).toBe(false);
    expect(needsSameMaterialCheck(false, { name: '흑후추분말', spec: '20kg' }, { name: '흑후추분말', spec: '1kg' })).toBe(true);
  });

  it('확인 창 문구에 기존 원재료를 보여준다', () => {
    expect(sameMaterialMessage([{ code: '000005', name: '흑후추분말', spec: '20kg' }, { code: '000015', name: '흑후추분말', spec: '' }]))
      .toBe('같은 이름·규격의 원재료가 이미 있어요.\n\n· 흑후추분말 20kg (000005)\n· 흑후추분말 (000015)\n\n그래도 저장할까요?');
  });
});

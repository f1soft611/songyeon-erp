import { describe, expect, it } from 'vitest';
import { subCategoryShortName } from '../src/pages/co/master/sub-material-master/hooks/useSubMaterialCategories';
import { SUB_MATERIAL_EXCEL_COLUMNS } from '../src/pages/co/master/material-master/utils/materialMaster';
import type { MaterialRow } from '../src/pages/co/master/material-master/types/materialMaster.types';

describe('부자재 분류 공통코드 (2026-10-23)', () => {
  it('공통코드 이름의 " — " 앞부분이 분류 이름이다(서버 sub_category_nm 과 같은 규칙)', () => {
    expect(subCategoryShortName('필름 — M로 입고 · 생산입고 때 빠짐')).toBe('필름');
    expect(subCategoryShortName('박스')).toBe('박스');
  });

  it('엑셀 분류 칸은 코드가 아니라 이름으로 쓴다', () => {
    const column = SUB_MATERIAL_EXCEL_COLUMNS.find((c) => c.label === '분류');
    const row = { subCategory: '003', subCategoryNm: '박스' } as MaterialRow;
    expect(typeof column?.key === 'function' ? column.key(row) : undefined).toBe('박스');
  });
});

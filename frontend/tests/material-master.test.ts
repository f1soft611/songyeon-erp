import { describe, expect, it } from 'vitest';
import {
  filterMaterialMasterRows,
  materialSavePlansOf,
  SUB_MATERIAL_INFO_FIELDS,
  toMaterialMasterRows,
} from '../src/pages/co/master/material-master/hooks/useMaterialMasterManagement';
import { createMaterialMasterRow } from '../src/pages/co/master/material-master/components/MaterialMasterGrid';
import type { MaterialMasterRow, MaterialRow } from '../src/pages/co/master/material-master/types/materialMaster.types';

// 가짜 원재료(실제 데이터 아님)
const material = (overrides: Partial<MaterialRow>): MaterialRow => ({
  ...createMaterialMasterRow(),
  id: '900001',
  code: '900001',
  name: '예시소금',
  spec: '25kg',
  unitPrice: 800,
  suppliers: [{ code: '900011', name: '예시상사' }, { code: null, name: '옛업체' }],
  useYn: 'Y',
  ...overrides,
});
const noChanges = { insertedRows: [], updatedRows: [], deletedRows: [] };

describe('원재료마스터(BSMaterialMasterView) 화면 규칙', () => {
  it('그리드 줄: 납품업체는 거래처코드만 고르고, 적용일자는 비운다', () => {
    const [row] = toMaterialMasterRows([material({})]);
    expect(row.supplierCodes).toEqual(['900011']);
    expect(row.priceDate).toBe('');
  });

  it('표: 부자재 빼기 · 사용여부 · 검색어(코드 · 이름) · 안 쓴 기간', () => {
    const rows = toMaterialMasterRows([
      material({ id: '1', code: '900001', name: '예시소금', lastUsedDate: '2026-10-20' }),
      material({ id: '2', code: '900002', name: '예시설탕', useYn: 'N' }),
      material({ id: '3', code: '900003', name: '예시필름', subCategory: '001' }),
    ]);
    const today = new Date(2026, 9, 27);
    expect(filterMaterialMasterRows(rows, '', 'ALL', null, today).map((row) => row.id)).toEqual(['1', '2']);
    expect(filterMaterialMasterRows(rows, '', 'Y', null, today).map((row) => row.id)).toEqual(['1']);
    expect(filterMaterialMasterRows(rows, '900002', 'ALL', null, today).map((row) => row.id)).toEqual(['2']);
    expect(filterMaterialMasterRows(rows, '설탕', 'ALL', null, today).map((row) => row.id)).toEqual(['2']);
    // 30일 이상 안 쓴 것(사용이력 없음 포함)
    expect(filterMaterialMasterRows(rows, '', 'ALL', { value: 30, unit: 'day' }, today).map((row) => row.id)).toEqual(['2']);
    // 상세 조회 납품업체(거래처코드): 그 업체가 들어 있는 원재료만
    expect(filterMaterialMasterRows(rows, '', 'ALL', null, today, '900011').map((row) => row.id)).toEqual(['1', '2']);
    expect(filterMaterialMasterRows(rows, '', 'ALL', null, today, '900099')).toEqual([]);
  });

  it('[저장]: 새 줄은 등록 + 값이 있는 칸, 고친 줄은 바뀐 칸만 보낸다', () => {
    const [original] = toMaterialMasterRows([material({})]);
    const fresh: MaterialMasterRow = { ...createMaterialMasterRow(), name: '새원재료', safetyStock: 5, supplierCodes: ['900011'] };
    const plans = materialSavePlansOf([original], {
      ...noChanges,
      insertedRows: [fresh],
      updatedRows: [{ ...original, allergens: '대두', useYn: 'N' }],
    });
    expect(plans[0]).toMatchObject({
      isNew: true,
      info: { name: '새원재료', safetyStock: '5', supplierCodes: ['900011'] },
      useYn: null,
      sameCheck: true,
    });
    // 이름 · 규격 · 납품업체는 그대로라 보내지 않는다(옛 업체가 지워지지 않는다), 같은 원재료 확인도 하지 않는다
    expect(plans[1]).toMatchObject({ isNew: false, info: { name: '예시소금', allergens: '대두' }, price: null, useYn: 'N', sameCheck: false });
    expect(plans[1].info).not.toHaveProperty('supplierCodes');
    expect(plans[1].info).not.toHaveProperty('spec');
  });

  it('[저장] 부자재: 분류도 보낸다(원재료는 보내지 않는다)', () => {
    const [original] = toMaterialMasterRows([material({ subCategory: '001' })]);
    const changes = { ...noChanges, updatedRows: [{ ...original, subCategory: '002' }] };
    expect(materialSavePlansOf([original], changes, SUB_MATERIAL_INFO_FIELDS)[0].info).toEqual({ name: '예시소금', subCategory: '002' });
    expect(materialSavePlansOf([original], changes)).toEqual([]);
    const fresh: MaterialMasterRow = { ...createMaterialMasterRow(), name: '새필름', subCategory: '001' };
    expect(materialSavePlansOf([], { ...noChanges, insertedRows: [fresh] }, SUB_MATERIAL_INFO_FIELDS)[0].info).toEqual({ name: '새필름', subCategory: '001' });
  });

  it('[저장]: 단가는 바꾸거나 적용일자를 넣었을 때만, 이름을 바꾸면 같은 원재료를 확인한다', () => {
    const [original] = toMaterialMasterRows([material({})]);
    const [price] = materialSavePlansOf([original], { ...noChanges, updatedRows: [{ ...original, unitPrice: 850, priceDate: '2026-11-01' }] });
    expect(price).toMatchObject({ info: null, price: { unitPrice: '850', effectiveDate: '2026-11-01' } });
    const [renamed] = materialSavePlansOf([original], { ...noChanges, updatedRows: [{ ...original, name: '예시소금2' }] });
    expect(renamed).toMatchObject({ info: { name: '예시소금2' }, sameCheck: true });
    expect(materialSavePlansOf([original], { ...noChanges, updatedRows: [{ ...original }] })).toEqual([]);
  });

  it('[저장] 새 줄: 적용일자를 넣으면 단가를 등록과 따로 그날로 보낸다, 비우면 등록할 때 같이', () => {
    const fresh: MaterialMasterRow = { ...createMaterialMasterRow(), name: '새원재료', unitPrice: 900 };
    const [dated] = materialSavePlansOf([], { ...noChanges, insertedRows: [{ ...fresh, priceDate: '2026-11-01' }] });
    expect(dated.price).toEqual({ unitPrice: '900', effectiveDate: '2026-11-01' });
    const [now] = materialSavePlansOf([], { ...noChanges, insertedRows: [fresh] });
    expect(now.price).toBeNull();
  });
});

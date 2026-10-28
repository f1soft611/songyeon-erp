import { describe, expect, it } from 'vitest';
import {
  discontinueChangesOf,
  filterItemMasterByUse,
  toItemMasterRows,
} from '../src/pages/co/master/item-master/utils/itemMaster';
import type { ProductBomRow } from '../src/pages/co/master/item-master/types/itemMaster.types';

const product = (code: string, discontinued: boolean): ProductBomRow =>
  ({ id: code, code, name: `제품${code}`, discontinued, discontinuedAt: '', discontinuedBy: '' }) as ProductBomRow;

describe('제품마스터 사용여부 칸 (2026-10-23)', () => {
  it('서버 줄을 화면 줄로 바꾸면 사용여부가 Y/N 이 된다', () => {
    const rows = toItemMasterRows([product('P1', false), product('P2', true)]);
    expect(rows.map((row) => row.useYn)).toEqual(['Y', 'N']);
  });

  it('사용여부를 바꾼 줄만 보내고, 원래대로 되돌린 줄은 보내지 않는다', () => {
    const originals = toItemMasterRows([product('P1', false), product('P2', true), product('P3', false)]);
    const updated = [
      { ...originals[0], useYn: 'N' as const },
      { ...originals[1], useYn: 'Y' as const },
      { ...originals[2], useYn: 'Y' as const },
    ];
    expect(discontinueChangesOf(originals, updated)).toEqual([
      { code: 'P1', discontinued: true },
      { code: 'P2', discontinued: false },
    ]);
  });
});

describe('제품마스터 조회 조건 사용여부 (2026-10-23)', () => {
  it('전체 · 사용중(Y) · 사용안함(N)으로 거른다', () => {
    const rows = toItemMasterRows([product('P1', false), product('P2', true)]);
    expect(filterItemMasterByUse(rows, 'ALL').map((row) => row.code)).toEqual(['P1', 'P2']);
    expect(filterItemMasterByUse(rows, 'Y').map((row) => row.code)).toEqual(['P1']);
    expect(filterItemMasterByUse(rows, 'N').map((row) => row.code)).toEqual(['P2']);
  });
});

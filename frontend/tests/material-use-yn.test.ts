import { describe, expect, it } from 'vitest';
import type { MaterialRow } from '../src/pages/co/master/material-master/types/materialMaster.types';
import { filterMaterialUse } from '../src/pages/co/master/material-master/utils/materialMaster';

// 원재료 · 부자재 사용여부(2026-10-23): 조회 조건 전체 · 사용중 · 사용안함. [저장]으로 보낼 것은 materialSavePlansOf(tests/material-master.test.ts)
const row = (id: string, code: string, useYn: 'Y' | 'N') => ({ id, code, useYn }) as MaterialRow;

describe('material use yn', () => {
  const rows = [row('1', '000001', 'Y'), row('2', '000002', 'N'), row('3', '000003', 'Y')];

  it('filters by use filter', () => {
    expect(filterMaterialUse(rows, 'ALL').map((r) => r.code)).toEqual(['000001', '000002', '000003']);
    expect(filterMaterialUse(rows, 'Y').map((r) => r.code)).toEqual(['000001', '000003']);
    expect(filterMaterialUse(rows, 'N').map((r) => r.code)).toEqual(['000002']);
  });
});

import { beforeEach, describe, expect, it } from 'vitest';

import { resetGridStorageIfColumnsChanged } from '../src/shared/utils/gridStorage';

describe('F1-Grid 저장된 칸 순서 맞추기(shared/utils/gridStorage)', () => {
  beforeEach(() => window.localStorage.clear());

  it('저장된 순서에 지금 칸이 빠져 있으면(새 칸) 저장값을 지운다', () => {
    window.localStorage.setItem('g', JSON.stringify({ order: ['id', 'name', 'memo'], widths: { name: 200 } }));
    expect(resetGridStorageIfColumnsChanged('g', ['id', 'name', 'permissionCount', 'memo'])).toBe(true);
    expect(window.localStorage.getItem('g')).toBeNull();
  });

  it('칸이 다 있으면(순서를 손으로 바꾼 것 포함) 그대로 둔다, 저장값이 없거나 깨졌으면 아무것도 안 한다', () => {
    const saved = JSON.stringify({ order: ['name', 'id', 'memo', 'old'] });
    window.localStorage.setItem('g', saved);
    expect(resetGridStorageIfColumnsChanged('g', ['id', 'name', 'memo'])).toBe(false);
    expect(window.localStorage.getItem('g')).toBe(saved);
    expect(resetGridStorageIfColumnsChanged('none', ['id'])).toBe(false);
    window.localStorage.setItem('bad', '{깨짐');
    expect(resetGridStorageIfColumnsChanged('bad', ['id'])).toBe(false);
  });
});

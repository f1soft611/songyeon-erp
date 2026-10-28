import { describe, expect, it } from 'vitest';
import {
  createTreeIndex,
  projectTreeIndex,
} from '../src/shared/components/f1-grid/tree/TreeProjection';

type Row = { id: string; parentId: string | null; order: number };

const rows: Row[] = [
  { id: 'root', parentId: null, order: 1 },
  { id: 'child', parentId: 'root', order: 1 },
];

describe('F1Tree incremental projection', () => {
  it('reuses one structure index for collapsed and expanded projections', () => {
    const index = createTreeIndex(rows, {
      rowKey: 'id',
      parentKey: 'parentId',
      getRowOrder: (row) => row.order,
    });

    const collapsed = projectTreeIndex(index, new Set());
    const expanded = projectTreeIndex(index, new Set(['root']));

    expect(collapsed.rows.map((row) => row.id)).toEqual(['root']);
    expect(expanded.rows.map((row) => row.id)).toEqual(['root', 'child']);
    expect(index.childrenByParent.get('root')?.[0].row).toBe(rows[1]);
  });
});

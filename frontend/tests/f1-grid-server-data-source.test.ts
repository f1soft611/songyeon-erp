import { describe, expect, it, vi } from 'vitest';
import { createGridDataSourceController } from '../src/shared/components/f1-grid/query/GridDataSource';
import type { F1GridDataSource } from '../src/shared/components/f1-grid/types/grid.types';

type Row = { id: string };

describe('F1Grid server data source', () => {
  it('aborts the previous request and only resolves the latest page', async () => {
    const requests: Array<{
      signal: AbortSignal;
      resolve: (value: { rows: Row[]; totalRowCount: number }) => void;
    }> = [];
    const source: F1GridDataSource<Row> = {
      pageSize: 50,
      load: vi.fn(
        (query) =>
          new Promise((resolve) =>
            requests.push({ signal: query.signal, resolve }),
          ),
      ),
    };
    const controller = createGridDataSourceController<Row>();
    const first = controller.load(source, {
      offset: 0,
      limit: 50,
      sorts: [],
      filters: [],
    });
    const second = controller.load(source, {
      offset: 0,
      limit: 50,
      sorts: [{ field: 'id', direction: 'asc' }],
      filters: [],
    });

    expect(requests[0].signal.aborted).toBe(true);
    requests[0].resolve({ rows: [{ id: 'stale' }], totalRowCount: 1 });
    requests[1].resolve({ rows: [{ id: 'latest' }], totalRowCount: 1 });

    await expect(first).resolves.toBeUndefined();
    await expect(second).resolves.toEqual({
      rows: [{ id: 'latest' }],
      totalRowCount: 1,
    });
    controller.dispose();
  });
});

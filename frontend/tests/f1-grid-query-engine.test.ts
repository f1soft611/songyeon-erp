import { describe, expect, it, vi } from 'vitest';
import {
  createGridQueryWorkerClient,
  runGridQuery,
  type GridQueryResponse,
} from '../src/shared/components/f1-grid/query/GridQueryEngine';

type Row = { id: string; name: string; amount: number };

describe('F1Grid query engine', () => {
  it('filters and sorts serializable rows', () => {
    const response = runGridQuery<Row>({
      requestId: 1,
      rows: [
        { id: '1', name: 'Beta', amount: 20 },
        { id: '2', name: 'Alpha', amount: 10 },
        { id: '3', name: 'Alpine', amount: 30 },
      ],
      filters: [{ field: 'name', operator: 'startsWith', value: 'Al' }],
      sorts: [{ field: 'amount', direction: 'desc' }],
      columnTypes: { name: 'text', amount: 'number' },
    });

    expect(response.rows.map((row) => row.id)).toEqual(['3', '2']);
  });

  it('ignores stale worker responses', async () => {
    const worker = {
      postMessage: vi.fn(),
      terminate: vi.fn(),
      onmessage: null,
      onerror: null,
    } as unknown as Worker;
    const client = createGridQueryWorkerClient<Row>(worker);
    const first = client.query({
      rows: [],
      filters: [],
      sorts: [],
      columnTypes: {},
    });
    const second = client.query({
      rows: [],
      filters: [],
      sorts: [],
      columnTypes: {},
    });
    const secondResult = {
      requestId: 2,
      rows: [],
    } satisfies GridQueryResponse<Row>;

    worker.onmessage?.({ data: { requestId: 1, rows: [] } } as MessageEvent);
    worker.onmessage?.({ data: secondResult } as MessageEvent);

    await expect(second).resolves.toEqual(secondResult);
    await expect(first).rejects.toThrow('superseded');
    client.dispose();
  });
});

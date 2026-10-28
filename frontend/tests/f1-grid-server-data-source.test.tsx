import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { F1Grid } from '../src/shared/components/f1-grid';
import type {
  F1GridColumn,
  F1GridDataSource,
} from '../src/shared/components/f1-grid/types/grid.types';

type Row = { id: string; code: string };

const columns: F1GridColumn<Row>[] = [
  { field: 'code', headerName: 'Code', width: 120 },
];

describe('F1Grid server data source integration', () => {
  it('loads server rows and exposes the total row count', async () => {
    const dataSource: F1GridDataSource<Row> = {
      pageSize: 50,
      load: vi.fn().mockResolvedValue({
        rows: [{ id: 'server-1', code: 'SERVER-001' }],
        totalRowCount: 100_000,
      }),
    };
    render(
      <F1Grid
        dataSource={dataSource}
        columns={columns}
        rowKey="id"
        ariaLabel="server grid"
        height={240}
      />,
    );

    expect(await screen.findByText('SERVER-001')).toBeInTheDocument();
    expect(screen.getByRole('grid', { name: 'server grid' })).toHaveAttribute(
      'aria-rowcount',
      '100000',
    );
    expect(dataSource.load).toHaveBeenCalledWith(
      expect.objectContaining({ offset: 0, limit: 50 }),
    );
  });

  it('loads the next server page when scrolling near the loaded bottom', async () => {
    const dataSource: F1GridDataSource<Row> = {
      pageSize: 1,
      load: vi
        .fn()
        .mockResolvedValueOnce({
          rows: [{ id: 'server-1', code: 'SERVER-001' }],
          totalRowCount: 2,
        })
        .mockResolvedValueOnce({
          rows: [{ id: 'server-2', code: 'SERVER-002' }],
          totalRowCount: 2,
        }),
    };

    render(
      <F1Grid
        dataSource={dataSource}
        columns={columns}
        rowKey="id"
        height={240}
      />,
    );

    await screen.findByText('SERVER-001');
    const body = screen.getByTestId('f1-grid-body-scroll');
    Object.defineProperties(body, {
      clientHeight: { configurable: true, value: 200 },
      scrollHeight: { configurable: true, value: 240 },
      scrollTop: { configurable: true, value: 40, writable: true },
    });
    fireEvent.scroll(body);

    expect(await screen.findByText('SERVER-002')).toBeInTheDocument();
    expect(dataSource.load).toHaveBeenLastCalledWith(
      expect.objectContaining({ offset: 1, limit: 1 }),
    );
  });
});

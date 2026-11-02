import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SalesTotalManagementPage } from '../src/pages/sl/inquiry/sales-total/SalesTotalManagementPage';
import * as service from '../src/pages/sl/inquiry/sales-total/services/salesTotal.service';

vi.mock('../src/pages/sl/inquiry/sales-total/services/salesTotal.service', () => ({
  fetchSalesTotal: vi.fn(),
}));

const permissions = { read: true, create: false, update: false, delete: false, excel: true };

describe('토탈집계 상세 조회', () => {
  beforeEach(() => {
    vi.mocked(service.fetchSalesTotal).mockResolvedValue({
      rows: [
        { direction: 'in', directionLabel: '입고', saleDate: '2026-11-01', clientName: 'A사', productName: '제품1', qty: 100 },
        { id: 1, direction: 'out', directionLabel: '출고', saleDate: '2026-11-01', clientName: 'B사', productName: '제품2', qty: 40, unitPrice: 10, amount: 400 },
      ],
      count: 2, inQty: 100, outQty: 40, totalAmount: 400, noPriceCount: 0,
    });
  });

  it('구분을 고르면 표와 합계가 그 줄만 보여 주고, 품목은 서버 조건으로 보낸다', async () => {
    render(
      <SalesTotalManagementPage
        selectedModule={{ id: 'sl', name: '판매관리' } as never}
        currentMenuName="토탈집계"
        content={{ description: '' } as never}
        selectedMenuPermissions={permissions as never}
      />,
    );
    await screen.findByText('B사');
    expect(screen.getByLabelText('입고 수량').textContent).toBe('100');

    fireEvent.click(screen.getByRole('button', { name: /상세/ }));
    fireEvent.change(await screen.findByLabelText(/품목코드\/명/), { target: { value: 'P002' } });
    fireEvent.mouseDown(screen.getByRole('combobox', { name: /구분/ }));
    fireEvent.click(within(await screen.findByRole('listbox')).getByText('출고'));
    fireEvent.click(screen.getAllByRole('button', { name: '조회' }).at(-1)!);

    await waitFor(() => expect(screen.queryByText('A사')).toBeNull());
    expect(screen.getByLabelText('입고 수량').textContent).toBe('0');
    expect(screen.getByLabelText('출고 수량').textContent).toBe('40');
    expect(vi.mocked(service.fetchSalesTotal).mock.lastCall![0].productName).toBe('P002');
  });
});

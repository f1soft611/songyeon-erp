import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SalesStatusManagementPage } from '../src/pages/sl/inquiry/sales-status/SalesStatusManagementPage';
import * as service from '../src/pages/sl/inquiry/sales-status/services/salesStatus.service';

vi.mock('../src/pages/sl/inquiry/sales-status/services/salesStatus.service', () => ({
  fetchSalesStatus: vi.fn(),
  deleteSale: vi.fn(),
}));

const renderPage = (canDelete: boolean) => render(
  <SalesStatusManagementPage
    selectedModule={{ id: 'sl', name: '판매관리' } as never}
    currentMenuName="판매현황"
    content={{ description: '' } as never}
    selectedMenuPermissions={{ read: true, create: true, update: true, delete: canDelete, excel: true } as never}
  />,
);

describe('판매현황 삭제 막기', () => {
  beforeEach(() => {
    vi.mocked(service.fetchSalesStatus).mockResolvedValue({
      rows: [{ id: 1, saleDate: '2026-11-01', clientName: 'A사', productName: '제품1', qty: 10, unitPrice: 100, amount: 1000, sourceLabel: '직접등록' }],
      count: 1, totalQty: 10, totalAmount: 1000, noPriceCount: 0,
    });
  });

  const pressDelete = async () => {
    const cell = await screen.findByText('A사');
    fireEvent.click(cell);
    fireEvent.keyDown(cell, { key: 'Delete' });
  };

  it('삭제 권한이 없으면 Delete 키로 지운 줄을 되살리고 알리며, [삭제] · [행 삭제]도 없다', async () => {
    renderPage(false);
    await pressDelete();

    expect(await screen.findByText('삭제 권한이 없어요')).toBeTruthy();
    expect(screen.getByText('A사')).toBeTruthy();
    expect(screen.queryByRole('button', { name: '삭제' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /확인/ }));

    fireEvent.contextMenu(screen.getByText('A사'));
    await waitFor(() => expect(screen.queryByRole('menuitem', { name: '행 삭제' })).toBeNull());
  });

  it('삭제 권한이 있으면 Delete 키로 표에서 빼고 [저장]이 켜진다', async () => {
    renderPage(true);
    await pressDelete();

    await waitFor(() => expect(screen.queryByText('A사')).toBeNull());
    expect((screen.getByRole('button', { name: '저장' }) as HTMLButtonElement).disabled).toBe(false);
    expect(screen.queryByText('삭제 권한이 없어요')).toBeNull();
  });
});

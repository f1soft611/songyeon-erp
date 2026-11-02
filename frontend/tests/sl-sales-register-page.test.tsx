import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SalesRegisterManagementPage } from '../src/pages/sl/entry/sales-register/SalesRegisterManagementPage';
import { createManualRow, pullItems, statusOf, toManualBody } from '../src/pages/sl/entry/sales-register/utils/salesRegister';
import * as service from '../src/pages/sl/entry/sales-register/services/salesRegister.service';

vi.mock('../src/pages/sl/entry/sales-register/services/salesRegister.service', () => ({
  fetchShippable: vi.fn(),
  pullSales: vi.fn(),
  createManualSale: vi.fn(),
}));
vi.mock('../src/pages/sales/order/order-register/services/salesOrder.service', () => ({
  fetchOrderClientOptions: vi.fn().mockResolvedValue([]),
  fetchOrderProducts: vi.fn().mockResolvedValue([]),
}));

const permissions = { read: true, create: true, update: true, delete: true, excel: true };
const renderPage = () => render(
  <SalesRegisterManagementPage
    selectedModule={{ id: 'sl', name: '판매관리' } as never}
    currentMenuName="판매등록"
    content={{ description: '' } as never}
    selectedMenuPermissions={permissions as never}
  />,
);

describe('판매등록 직접 등록', () => {
  beforeEach(() => {
    vi.mocked(service.fetchShippable).mockResolvedValue({
      rows: [
        { sourceType: 'logistics', sourceId: 1, saleDate: '2026-11-01', clientName: 'A사', productCode: 'P001', productName: '제품1', qty: 10, unitPrice: 100, amount: 1000 },
        { sourceType: 'logistics', sourceId: 2, saleDate: '2026-11-01', clientName: 'B사', productCode: 'P002', productName: '제품2', qty: 5, unitPrice: 100, amount: 500 },
      ],
    });
  });

  it('[직접 등록]과 오른쪽 클릭 [행 추가]가 같은 등록 창을 연다', async () => {
    renderPage();
    // 조회가 끝나면 그리드가 새로 그려지므로 그 뒤에 찾는다
    await screen.findByText('A사');

    fireEvent.click(screen.getByRole('button', { name: '직접 등록' }));
    expect(await screen.findByRole('dialog', { name: /판매 직접 등록/ })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '취소' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: /판매 직접 등록/ })).toBeNull());

    fireEvent.contextMenu(screen.getByText('A사'));
    fireEvent.click(await screen.findByRole('menuitem', { name: '행 추가' }));
    expect(await screen.findByRole('dialog', { name: /판매 직접 등록/ })).toBeTruthy();
  });

  it('출하확정 줄의 상세 창은 값을 읽기 전용으로 보여 주고 [적용]해도 닫히지 않는다', async () => {
    renderPage();
    await screen.findByText('A사');

    fireEvent.click(screen.getAllByRole('button', { name: /행 정보 수정/ })[0]);
    const dialog = await screen.findByRole('dialog', { name: /판매 상세/ });
    expect(within(dialog).getByDisplayValue('A사')).toBeTruthy();
    expect((within(dialog).getByLabelText(/수량/) as HTMLInputElement).readOnly || (within(dialog).getByLabelText(/수량/) as HTMLInputElement).disabled).toBe(true);

    fireEvent.click(within(dialog).getByRole('button', { name: '적용' }));
    expect(screen.getByRole('dialog', { name: /판매 상세/ })).toBeTruthy();
  });

  it('상세 조회 품목코드/명은 받은 목록을 거르고, 조회 조건에 기간이 들어간다', async () => {
    renderPage();
    await screen.findByText('B사');

    fireEvent.click(screen.getByRole('button', { name: /상세/ }));
    fireEvent.change(await screen.findByLabelText(/품목코드\/명/), { target: { value: 'p001' } });
    fireEvent.click(screen.getAllByRole('button', { name: '조회' }).at(-1)!);

    await waitFor(() => expect(screen.queryByText('B사')).toBeNull());
    expect(screen.getByText('A사')).toBeTruthy();
    const [start, end, client] = vi.mocked(service.fetchShippable).mock.lastCall!;
    expect(start).toMatch(/^\d{4}-\d{2}-01$/);
    expect(end).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(client).toBe('');
  });

  it('새 줄은 판매등록 대상에서 빠지고, 저장값은 직접 등록 양식으로 바뀐다', () => {
    const row = { ...createManualRow(), saleDate: '2026-11-02', clientName: 'A사', productName: '제품1', qty: 3, unitPrice: null };
    expect(pullItems([row])).toEqual([]);
    expect(statusOf(row)).toBe('');
    expect(toManualBody(row)).toEqual({ saleDate: '2026-11-02', clientName: 'A사', productName: '제품1', qtyText: '3', unitPriceText: '', note: '' });
  });
});

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ReceivingDialog } from '../src/pages/pu/inbound/receiving-register/components/ReceivingDialog';

vi.mock('../src/pages/co/master/material-master/services/materialMaster.service', () => ({
  fetchVendors: vi.fn(async () => [{ code: 'V001', name: '가나상사' }, { code: 'V002', name: '다라유통' }]),
}));
vi.mock('../src/pages/co/master/item-master/services/itemMaster.service', () => ({
  fetchMaterialOptions: vi.fn(async () => [{ code: 'M001', name: '찹쌀', unitPrice: 1000 }, { code: 'M002', name: '설탕', unitPrice: 500 }]),
}));
vi.mock('../src/pages/pu/order/order-register/services/orderRegister.service', () => ({
  fetchOrdersByDate: vi.fn(async () => []),
}));
vi.mock('../src/pages/pu/inbound/receiving-register/services/receiving.service', () => ({
  fetchLastPrice: vi.fn(async () => null),
  registerReceivings: vi.fn(async () => 0),
}));

// 입고 등록 창: 거래처 · 품목은 칸 안 🔍 → 팝업에서 고른다(발주등록 창과 같음, 2026-11-05)
describe('입고 등록 창 거래처 · 품목 팝업', () => {
  beforeEach(() => {
    render(<ReceivingDialog open onClose={() => undefined} onRegistered={() => undefined} />);
  });

  const pickFromPopup = async (button: string, option: string) => {
    fireEvent.click(screen.getByRole('button', { name: button }));
    // 팝업은 [검색]을 눌러야 후보를 보여 준다(S_ERP MasterPickerDialog)
    fireEvent.click(await screen.findByRole('button', { name: '검색' }));
    fireEvent.click(await screen.findByRole('button', { name: option }));
  };

  it('팝업에서 고른 거래처 · 품목으로 목록에 추가한다', async () => {
    await pickFromPopup('거래처 선택', 'V002 다라유통 선택');
    await waitFor(() => expect(screen.getByRole('textbox', { name: '거래처' })).toHaveValue('V002 · 다라유통'));
    expect(screen.getByRole('textbox', { name: '거래처' })).toHaveAttribute('readonly');

    await pickFromPopup('품목 선택', 'M001 찹쌀 선택');
    await waitFor(() => expect(screen.getByRole('textbox', { name: '품목' })).toHaveValue('M001 · 찹쌀'));
    fireEvent.change(screen.getByRole('spinbutton', { name: '수량' }), { target: { value: '30' } });
    fireEvent.click(screen.getByRole('button', { name: '목록에 추가' }));

    const grid = await screen.findByLabelText('F1-GRID 입고 등록 품목');
    await waitFor(() => expect(within(grid).getByText('찹쌀')).toBeInTheDocument());
    expect(within(grid).getByText('다라유통')).toBeInTheDocument();
    // 추가하면 품목 · 수량만 비우고 거래처는 남긴다
    expect(screen.getByRole('textbox', { name: '품목' })).toHaveValue('');
    expect(screen.getByRole('textbox', { name: '거래처' })).toHaveValue('V002 · 다라유통');
  }, 30000);

  it('거래처를 고르지 않고 추가하면 먼저 고르라고 알린다', async () => {
    await pickFromPopup('품목 선택', 'M002 설탕 선택');
    await waitFor(() => expect(screen.getByRole('textbox', { name: '품목' })).toHaveValue('M002 · 설탕'));
    fireEvent.change(screen.getByRole('spinbutton', { name: '수량' }), { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: '목록에 추가' }));
    expect(await screen.findByText('거래처를 먼저 선택해주세요')).toBeInTheDocument();
  }, 30000);
});

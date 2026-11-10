import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// 제품검사 > 검사 탭 로트 조회 · 제품 검사 창 자동 칸(2026-11-06). 송연 qdocs.py list_lots · 41-qdoc-spec.js loadQdocSpec · qsRender
const api = vi.hoisted(() => ({ apiGet: vi.fn(), apiPost: vi.fn(), apiPut: vi.fn(), apiDelete: vi.fn() }));
vi.mock('../src/shared/services/apiClient', () => api);

import { ProductInspectionManagementPage } from '../src/pages/qm/inspection/product-inspection/ProductInspectionManagementPage';

const PATH = '/api/v1/qm/inspection/product-inspection/lots';

const renderPage = () =>
  render(
    <ThemeProvider theme={createTheme()}>
      <ProductInspectionManagementPage
        selectedModule={{ id: 'qm', name: '품질관리', icon: null, tree: [], menus: [] }}
        currentMenuName="제품검사"
        content={{ title: '제품검사', description: '', cards: [], items: [] }}
        selectedMenuPermissions={{ read: true, create: true, update: true, delete: true, excel: true }}
      />
    </ThemeProvider>,
  );

const LOTS = [
  {
    lotId: 11, lotNo: 'L-1105-01', madeOn: '2026-11-05', productCode: '000007', productName: '간장소스',
    foodType: '002', foodTypeNm: '소스(살균제품)', netWeight: '5kg', shelfLife: '제조일로부터 12개월까지 [냉장]',
    qty: '120', qtyIsActual: true, shippedOn: '2026-11-06', shipState: '확정', recordId: null, recordStatus: null,
  },
  {
    lotId: 12, lotNo: 'L-1104-02', madeOn: '2026-11-04', productCode: '000009', productName: '양념',
    foodType: null, foodTypeNm: null, netWeight: null, shelfLife: '',
    qty: '100', qtyIsActual: false, shippedOn: '미정', shipState: '재고생산', recordId: null, recordStatus: null,
  },
];

beforeEach(() => {
  api.apiGet.mockReset();
  api.apiGet.mockResolvedValue({ resultList: LOTS });
});

describe('검사 탭 로트 조회', () => {
  it('화면을 열면 조건 없이 부르고, 줄 · 요약 · 결과 안내를 보인다', async () => {
    renderPage();
    await waitFor(() => expect(api.apiGet).toHaveBeenCalledWith(PATH));
    expect(await screen.findByText('▸ 간장소스')).toBeInTheDocument();
    expect(screen.getByText('소스(살균제품)')).toBeInTheDocument();
    expect(screen.getByText('유형 없음')).toBeInTheDocument();
    expect(screen.getByText('(예정)')).toBeInTheDocument();
    expect(screen.getByText('미정 (재고생산)')).toBeInTheDocument();
    expect(screen.getAllByText('아직 안 함')).toHaveLength(2);
    expect(screen.getByText('로트 2건 · 아직 검사 안 한 것 2건 · 검토 기다리는 것 0건')).toBeInTheDocument();
    expect(screen.getByText(/조회 결과 총 2건/)).toBeInTheDocument();
  });

  it('기간 · 날짜 기준 · 생산예정도를 붙여 다시 부른다(생산예정도를 바꾸면 바로)', async () => {
    renderPage();
    await screen.findByText('▸ 간장소스');
    fireEvent.change(screen.getByLabelText('시작일'), { target: { value: '2026-11-01' } });
    fireEvent.change(screen.getByLabelText('종료일'), { target: { value: '2026-11-30' } });
    fireEvent.mouseDown(screen.getByRole('combobox', { name: '날짜 기준' }));
    fireEvent.click(within(screen.getByRole('listbox')).getByRole('option', { name: '출고일' }));
    fireEvent.click(screen.getByRole('button', { name: '조회' }));
    await waitFor(() => expect(api.apiGet).toHaveBeenLastCalledWith(`${PATH}?start=2026-11-01&end=2026-11-30&dateBy=ship`));
    fireEvent.click(screen.getByRole('checkbox', { name: '생산예정도 보기' }));
    await waitFor(() => expect(api.apiGet).toHaveBeenLastCalledWith(`${PATH}?start=2026-11-01&end=2026-11-30&dateBy=ship&planned=true`));
  });

  it('기간이 한쪽만 있으면 기간을 붙이지 않는다', async () => {
    renderPage();
    await screen.findByText('▸ 간장소스');
    fireEvent.change(screen.getByLabelText('시작일'), { target: { value: '2026-11-01' } });
    fireEvent.click(screen.getByRole('button', { name: '조회' }));
    await waitFor(() => expect(api.apiGet).toHaveBeenCalledTimes(2));
    expect(api.apiGet).toHaveBeenLastCalledWith(PATH);
  });

  it('상태 고르기는 받아온 줄을 거른다. 남는 줄이 없으면 생산예정도 안내를 보인다', async () => {
    renderPage();
    await screen.findByText('▸ 간장소스');
    fireEvent.mouseDown(screen.getByRole('combobox', { name: '상태' }));
    fireEvent.click(within(screen.getByRole('listbox')).getByRole('option', { name: '검토 기다리는 것' }));
    await waitFor(() => expect(screen.queryByText('▸ 간장소스')).toBeNull());
    expect(screen.getByText(/생산이 끝난 것\(실생산량이 들어온 줄\)만 보고 있습니다/)).toBeInTheDocument();
    expect(screen.getByText('로트 2건 · 아직 검사 안 한 것 2건 · 검토 기다리는 것 0건')).toBeInTheDocument();
    expect(api.apiGet).toHaveBeenCalledTimes(1);
  });

  it('품목을 누르면 제품 검사 창 위쪽에 로트 값이 채워진다', async () => {
    renderPage();
    fireEvent.click(await screen.findByText('▸ 간장소스'));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('로트 L-1105-01 · 간장소스')).toBeInTheDocument();
    expect(within(dialog).getByText('5kg')).toBeInTheDocument();
    expect(within(dialog).getByText('2026-11-05')).toBeInTheDocument();
    expect(within(dialog).getByText('120')).toBeInTheDocument();
    expect(within(dialog).getByText('2026-11-06')).toBeInTheDocument();
    expect(within(dialog).getByText('제조일로부터 12개월까지 [냉장]')).toBeInTheDocument();
  });

  it('불러오지 못하면 오류를 보인다', async () => {
    api.apiGet.mockRejectedValueOnce(new Error('날짜 기준이 올바르지 않습니다'));
    renderPage();
    expect(await screen.findByText('날짜 기준이 올바르지 않습니다')).toBeInTheDocument();
  });
});

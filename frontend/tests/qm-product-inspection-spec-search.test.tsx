import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// 제품검사 > 제품별 기준 탭 조회(2026-11-06). 송연 qdocs.py pspec_products · 42-qdoc-pspec.js loadQdocPspec
const api = vi.hoisted(() => ({ apiGet: vi.fn(), apiPost: vi.fn(), apiPut: vi.fn(), apiDelete: vi.fn() }));
vi.mock('../src/shared/services/apiClient', () => api);

import { ProductInspectionManagementPage } from '../src/pages/qm/inspection/product-inspection/ProductInspectionManagementPage';

const PATH = '/api/v1/qm/inspection/product-inspection/product-specs';

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

beforeEach(() => {
  api.apiGet.mockReset();
  api.apiGet.mockResolvedValue({
    resultList: [
      { code: '000007', name: '간장소스', spec: '5Kg', foodType: '002', foodTypeNm: '소스(살균제품)' },
      { code: '000009', name: '양념', spec: '', foodType: null, foodTypeNm: null },
    ],
    stats: { total: 6, typed: 2, withSpec: 0 },
  });
});

describe('제품별 기준 탭 조회', () => {
  it('검사 탭에서는 제품별 기준을 부르지 않고, 제품별 기준 탭을 열면 부른다', async () => {
    renderPage();
    expect(api.apiGet).not.toHaveBeenCalledWith(PATH);
    fireEvent.click(screen.getByRole('tab', { name: '제품별 기준' }));
    await waitFor(() => expect(api.apiGet).toHaveBeenCalledWith(PATH));
    expect(await screen.findByText('간장소스')).toBeInTheDocument();
    expect(screen.getByText('소스(살균제품)')).toBeInTheDocument();
    expect(screen.getByText('제품 6개 · 식품유형 정한 것 2개 · 규격 넣은 것 0개')).toBeInTheDocument();
  });

  it('유형 없는 줄은 "유형 없음" 만 보이고 제품BOM · 제품마스터 안내는 없다. 유형 있는 줄 기준은 "안 넣음"', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('tab', { name: '제품별 기준' }));
    expect(await screen.findByText('유형 없음')).toBeInTheDocument();
    expect(screen.getByText('안 넣음')).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/제품BOM|제품마스터에서/);
  });

  it('검색어(앞뒤 공백 지움)와 상세 조회 보기를 붙여 다시 부른다', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('tab', { name: '제품별 기준' }));
    await screen.findByText('간장소스');
    fireEvent.change(screen.getByRole('textbox', { name: '제품명 또는 제품코드 검색' }), { target: { value: ' 간장 ' } });
    fireEvent.click(screen.getByRole('button', { name: '조회' }));
    await waitFor(() => expect(api.apiGet).toHaveBeenLastCalledWith(`${PATH}?q=${encodeURIComponent('간장')}`));
  });
});

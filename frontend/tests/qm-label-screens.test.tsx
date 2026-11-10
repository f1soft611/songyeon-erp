import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MenuPermission, ModuleItem, PageContent } from '../src/pages/dashboard/types/dashboard';

const service = vi.hoisted(() => ({
  fetchLabelProducts: vi.fn(),
  fetchRequests: vi.fn(),
  fetchTemplateUsage: vi.fn(),
  deleteTemplate: vi.fn(),
  moveRequest: vi.fn(),
}));
const labelApi = vi.hoisted(() => ({ listLabelTemplates: vi.fn(), getLabelTemplate: vi.fn() }));

vi.mock('../src/pages/qm/label/label-register/services/labelRegister.service', async () => ({
  ...(await vi.importActual<object>('../src/pages/qm/label/label-register/services/labelRegister.service')),
  ...service,
}));
vi.mock('../src/shared/components/LabelPrintDialog/label.service', async () => ({
  ...(await vi.importActual<object>('../src/shared/components/LabelPrintDialog/label.service')),
  ...labelApi,
}));

const props = {
  selectedModule: { id: 'qm', name: '품질관리' } as ModuleItem,
  currentMenuName: '화면',
  content: { title: '화면', description: '설명', cards: [], items: [] } as unknown as PageContent,
  selectedMenuPermissions: { read: true, create: true, update: true, delete: false } as MenuPermission,
};

const PRODUCTS = [
  { code: 'P001', name: '찹쌀떡', spec: '1kg', labelState: 'done', versionCount: 2, currentVersion: 'v2', lastEdited: '2026-11-01T10:00' },
  { code: 'P002', name: '꿀떡', spec: '500g', labelState: 'none', versionCount: 0, currentVersion: null, lastEdited: null },
];
const REQUESTS = [
  { id: 1, clientName: '가나식품', recipeName: '인절미', versionLabel: 'v1', spec: '1kg', requestedByName: '김', requestedAt: '2026-11-01T09:00', fillState: 'none', status: 'requested', movedProductCode: null },
  { id: 2, clientName: '다라유통', recipeName: '송편', versionLabel: 'v1', spec: '1kg', requestedByName: '이', requestedAt: '2026-11-02T09:00', fillState: 'done', status: 'requested', movedProductCode: null },
];

beforeEach(() => {
  Object.values(service).forEach((fn) => fn.mockReset());
  Object.values(labelApi).forEach((fn) => fn.mockReset());
  service.fetchLabelProducts.mockResolvedValue(PRODUCTS);
  service.fetchRequests.mockResolvedValue(REQUESTS);
  labelApi.listLabelTemplates.mockResolvedValue([{ id: 7, name: '기본 양식', size: '100x60' }, { id: 8, name: '냉동 양식', size: '100x60' }]);
  labelApi.getLabelTemplate.mockResolvedValue({ layout: { cols: [1, 2], rows: [1] } });
});

// 2026-11-05 품질관리 > 라벨관리 화면 3개(예전 라벨등록 탭). 표준: 검색줄 · 상세 조회 · 조회 결과 안내 · No 칸 · Delete 키로 줄이 빠지지 않음
describe('라벨등록 화면', () => {
  it('조회 결과를 알리고, 상세 조회 라벨 상태로 거른다', async () => {
    const { LabelRegisterManagementPage } = await import('../src/pages/qm/label/label-register/LabelRegisterManagementPage');
    render(<LabelRegisterManagementPage {...props} />);
    expect(await screen.findByText('조회 결과 총 2건입니다.')).toBeInTheDocument();
    expect(service.fetchLabelProducts).toHaveBeenCalledWith('');
    const grid = screen.getByLabelText('F1-GRID 라벨등록 제품');
    expect(within(grid).getByText('No')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '상세 검색 열기' }));
    const detail = await screen.findByLabelText('상세 검색');
    fireEvent.mouseDown(within(detail).getByRole('combobox', { name: '라벨 상태' }));
    fireEvent.click(await screen.findByRole('option', { name: '아직 안된 것만' }));
    fireEvent.click(within(detail).getByRole('button', { name: '조회' }));
    expect(await screen.findByText('조회 결과 총 1건입니다.')).toBeInTheDocument();
    expect(within(grid).queryByText('찹쌀떡')).not.toBeInTheDocument();
  }, 30000);

  it('Delete 키로 줄이 빠지지 않는다', async () => {
    const { LabelRegisterManagementPage } = await import('../src/pages/qm/label/label-register/LabelRegisterManagementPage');
    render(<LabelRegisterManagementPage {...props} />);
    const cell = await screen.findByText('찹쌀떡');
    fireEvent.click(cell);
    fireEvent.keyDown(cell, { key: 'Delete' });
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.getByText('찹쌀떡')).toBeInTheDocument();
  }, 30000);
});

describe('표시사항 요청 화면', () => {
  it('상세 조회는 빈 값(전체)으로 시작하고, 검색줄 업체명/레시피명으로 거른다', async () => {
    const { LabelRequestManagementPage } = await import('../src/pages/qm/label/label-request/LabelRequestManagementPage');
    render(<LabelRequestManagementPage {...props} />);
    expect(await screen.findByText('조회 결과 총 2건입니다.')).toBeInTheDocument();
    expect(service.fetchRequests).toHaveBeenCalledWith('');
    fireEvent.change(screen.getByRole('textbox', { name: '업체명/레시피명 검색' }), { target: { value: '송편' } });
    await waitFor(() => expect(screen.queryByText('가나식품')).not.toBeInTheDocument());
    expect(screen.getByText('다라유통')).toBeInTheDocument();
  }, 30000);
});

describe('라벨양식 화면', () => {
  it('양식 목록을 보이고 검색줄 양식 이름으로 거른다', async () => {
    const { LabelFormatManagementPage } = await import('../src/pages/qm/label/label-format/LabelFormatManagementPage');
    render(<LabelFormatManagementPage {...props} />);
    expect(await screen.findByText('조회 결과 총 2건입니다.')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: '양식 이름 검색' }), { target: { value: '냉동' } });
    await waitFor(() => expect(screen.queryByText('기본 양식')).not.toBeInTheDocument());
    expect(screen.getByText('냉동 양식')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '새 양식' })).toBeInTheDocument();
  }, 30000);
});

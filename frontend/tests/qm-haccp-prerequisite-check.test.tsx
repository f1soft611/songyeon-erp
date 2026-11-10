import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// HACCP(선행) 2단계(2026-11-09): 점검표 열기 · 임시저장 · 현황. 송연 43-qdoc-survey.js qvOpenSheet · qvSend · qvLoadRecords
const api = vi.hoisted(() => ({ apiGet: vi.fn(), apiPost: vi.fn(), apiPut: vi.fn(), apiDelete: vi.fn() }));
vi.mock('../src/shared/services/apiClient', () => api);

import { PrerequisiteManagementPage } from '../src/pages/qm/haccp/prerequisite/PrerequisiteManagementPage';
import { todayLocal } from '../src/pages/qm/haccp/prerequisite/utils/prerequisite';

const BASE = '/api/v1/qm/haccp/prerequisite';
const CHOICES = [
  { label: '적합', mark: 'O', score: 2 },
  { label: '미흡', mark: '△', score: 1 },
  { label: '부적합', mark: 'X', score: 0 },
];
const ITEMS = [
  { id: 100, parentId: null, rowKind: 'group', label: '1. 법적 요건 점검', topic: '', required: 1, sortOrder: 1, depth: 0, questions: 2 },
  { id: 102, parentId: 100, rowKind: 'single', label: '1년에 1회 이상 건강검진을 실시하는가?', topic: '건강검진', required: 1, sortOrder: 2, depth: 1 },
  { id: 103, parentId: 100, rowKind: 'single', label: '자가품질검사는 유형별로 이루어지고 있는가?', topic: '자가품질검사', required: 1, sortOrder: 3, depth: 1 },
];
const sheet = (extra: Record<string, unknown> = {}) => ({
  recordId: null, formId: 1, formName: '협력업체 자체 위생점검 평가표', category: '외부감사', bindType: 'client', cycle: '연1회', period: '2026년',
  versionId: 10, versionLabel: '1판', choices: CHOICES, hasNote: true, hasDefect: true, scoring: true, fullMark: 2, items: ITEMS, answers: {},
  docDate: todayLocal(), bindId: 7, bindName: '송연상회', clientCode: '000007', existingId: null, existingDate: null, status: null, ...extra,
});

const routes: Record<string, unknown> = {};
beforeEach(() => {
  api.apiGet.mockReset();
  api.apiPost.mockReset();
  Object.keys(routes).forEach((k) => delete routes[k]);
  routes[`${BASE}/forms/pick`] = { resultList: [{ id: 1, name: '협력업체 자체 위생점검 평가표', bindType: 'client', cycle: '연1회', questions: 2 }] };
  routes['/api/v1/co/master/item-master/client-options'] = { resultList: [{ clientCode: '000007', name: '송연상회' }, { clientCode: '000008', name: '갑성식품' }] };
  routes[`${BASE}/missing`] = { resultList: [] };
  api.apiGet.mockImplementation(async (path: string) => {
    const key = Object.keys(routes).find((k) => path === k || path.startsWith(`${k}?`));
    if (!key) throw new Error(`없는 주소: ${path}`);
    return routes[key];
  });
});

const renderPage = () =>
  render(
    <ThemeProvider theme={createTheme()}>
      <PrerequisiteManagementPage
        selectedModule={{ id: 'qm', name: '품질관리', icon: null, tree: [], menus: [] }}
        currentMenuName="HACCP(선행)"
        content={{ title: 'HACCP(선행)', description: '', cards: [], items: [] }}
        selectedMenuPermissions={{ read: true, create: true, update: true, delete: true, excel: true }}
      />
    </ThemeProvider>,
  );

const pickClient = async (name: string, code: string) => {
  fireEvent.click(screen.getByRole('button', { name: '점검한 거래처 선택' }));
  const dialog = await screen.findByRole('dialog');
  fireEvent.click(within(dialog).getByRole('button', { name: '검색' }));
  fireEvent.click(await within(dialog).findByRole('button', { name: `${code} ${name} 선택` }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
};

describe('점검 탭', () => {
  it('들어오면 쓸 서류를 불러 첫 서류를 고른다. 거래처마다 서류라 거래처 칸이 나온다', async () => {
    renderPage();
    expect(await screen.findByRole('combobox', { name: '서류' })).toHaveTextContent('협력업체 자체 위생점검 평가표 (질문 2개)');
    expect(screen.getByRole('textbox', { name: '점검한 거래처' })).toHaveValue('');
    expect(screen.queryByText('양식 만들기 탭에서 서류를 먼저 등록해주세요')).toBeNull();
  });

  it('거래처를 안 고르면 막고, 고르면 빈 점검표를 연다', async () => {
    routes[`${BASE}/blank`] = { sheet: sheet() };
    renderPage();
    await screen.findByText('협력업체 자체 위생점검 평가표 (질문 2개)');
    fireEvent.click(screen.getByRole('button', { name: '점검표 열기' }));
    expect(await screen.findByText('점검한 거래처를 골라주세요.')).toBeInTheDocument();
    await pickClient('송연상회', '000007');
    expect(screen.getByRole('textbox', { name: '점검한 거래처' })).toHaveValue('000007 · 송연상회');
    fireEvent.click(screen.getByRole('button', { name: '점검표 열기' }));
    await waitFor(() => expect(api.apiGet).toHaveBeenCalledWith(`${BASE}/blank?formId=1&docDate=${todayLocal()}&clientCode=000007`));
    expect(await screen.findByText('1년에 1회 이상 건강검진을 실시하는가?')).toBeInTheDocument();
    expect(screen.getByText(`송연상회 · ${todayLocal()} · 양식 1판`)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '결재 올리기' })).toBeDisabled();
  });

  it('답을 고르고 [임시저장] 하면 서버에 보내고 상태가 작성중이 된다', async () => {
    routes[`${BASE}/blank`] = { sheet: sheet() };
    api.apiPost.mockResolvedValue({ result: { id: 77, status: '작성중', score: 2, scoreMax: 2, answered: 1, bad: 0 } });
    renderPage();
    await screen.findByText('협력업체 자체 위생점검 평가표 (질문 2개)');
    await pickClient('송연상회', '000007');
    fireEvent.click(screen.getByRole('button', { name: '점검표 열기' }));
    const row = await screen.findByTestId('qv-row-102');
    fireEvent.click(within(row).getByRole('button', { name: '적합' }));
    fireEvent.change(within(screen.getByTestId('qv-row-103')).getByRole('textbox', { name: '세부내역' }), { target: { value: '서류 확인' } });
    fireEvent.click(screen.getByRole('button', { name: '임시저장' }));
    await waitFor(() => expect(api.apiPost).toHaveBeenCalledWith(`${BASE}/records`, {
      formId: 1, docDate: todayLocal(), clientCode: '000007',
      answers: { 102: { value: '적합', note: '', defect: '' }, 103: { value: '', note: '서류 확인', defect: '' } },
    }));
    expect(await screen.findByText('임시저장했습니다')).toBeInTheDocument();
    expect(screen.getByText('· 작성중')).toBeInTheDocument();
  });

  it('그 기간에 이미 쓴 장이 있으면 그 장을 연다(고른 답이 보인다)', async () => {
    routes[`${BASE}/blank`] = { sheet: sheet({ existingId: 55, existingDate: '2026-03-02' }) };
    routes[`${BASE}/records/55`] = { sheet: sheet({ recordId: 55, docDate: '2026-03-02', status: '작성중', answers: { 102: { value: '부적합', note: '', defect: '손 세척대 없음' } } }) };
    renderPage();
    await screen.findByText('협력업체 자체 위생점검 평가표 (질문 2개)');
    await pickClient('송연상회', '000007');
    fireEvent.click(screen.getByRole('button', { name: '점검표 열기' }));
    const row = await screen.findByTestId('qv-row-102');
    expect(api.apiGet).toHaveBeenCalledWith(`${BASE}/records/55`);
    expect(within(row).getByRole('button', { name: '부적합' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(row).getByRole('textbox', { name: '부적합내역' })).toHaveValue('손 세척대 없음');
    expect(screen.getByText('송연상회 · 2026-03-02 · 양식 1판')).toBeInTheDocument();
  });

  it('저장이 막히면 까닭을 보이고, 그 기간에 다른 장이 생겼으면 열지 묻는다', async () => {
    routes[`${BASE}/blank`] = { sheet: sheet() };
    renderPage();
    await screen.findByText('협력업체 자체 위생점검 평가표 (질문 2개)');
    await pickClient('송연상회', '000007');
    fireEvent.click(screen.getByRole('button', { name: '점검표 열기' }));
    fireEvent.click(within(await screen.findByTestId('qv-row-102')).getByRole('button', { name: '적합' }));
    api.apiPost.mockRejectedValue(new Error('2026년 점검표는 2026-03-02 에 이미 썼습니다. 연1회 짜리 서류는 한 기간에 한 장이라, 그 장을 열어 고쳐주세요.'));
    routes[`${BASE}/blank`] = { sheet: sheet({ existingId: 55, existingDate: '2026-03-02' }) };
    routes[`${BASE}/records/55`] = { sheet: sheet({ recordId: 55, docDate: '2026-03-02', status: '작성중' }) };
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    fireEvent.click(screen.getByRole('button', { name: '임시저장' }));
    await waitFor(() => expect(confirm).toHaveBeenCalledWith('2026년 점검표는 2026-03-02 에 이미 썼습니다. 연1회 짜리 서류는 한 기간에 한 장이라, 그 장을 열어 고쳐주세요.\n\n그 장을 열까요?'));
    expect(await screen.findByText('송연상회 · 2026-03-02 · 양식 1판')).toBeInTheDocument();
    confirm.mockRestore();
  });
});

describe('현황 탭', () => {
  it('들어오면 목록과 안 쓴 기간을 불러오고, 줄을 누르면 보기 전용으로 연다', async () => {
    routes[`${BASE}/records`] = { resultList: [
      { id: 55, docDate: '2026-11-06', formName: '협력업체 자체 위생점검 평가표', bindName: '송연상회', period: '2026년', cycle: '연1회', score: 170, scoreMax: 182, status: '작성중', writtenByNm: '김점검' },
    ] };
    routes[`${BASE}/missing`] = { resultList: [
      { formId: 1, formName: '협력업체 자체 위생점검 평가표', cycle: '연1회', bindType: 'client', rows: [{ label: '갑성식품', period: '2026년', clientId: 8 }] },
    ] };
    routes[`${BASE}/records/55`] = { sheet: sheet({ recordId: 55, docDate: '2026-11-06', status: '작성중' }) };
    renderPage();
    await screen.findByText('협력업체 자체 위생점검 평가표 (질문 2개)');
    fireEvent.click(screen.getByRole('tab', { name: '현황' }));
    expect(await screen.findByText('170 / 182점')).toBeInTheDocument();
    expect(api.apiGet).toHaveBeenCalledWith(`${BASE}/records`);
    expect(screen.getByText('김점검')).toBeInTheDocument();
    expect(screen.getByText('연1회 · 전에 평가한 업체 중 이번 기간에 빠진 곳')).toBeInTheDocument();
    expect(screen.getByText('갑성식품')).toBeInTheDocument();
    expect(screen.getByText('1건')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '협력업체 자체 위생점검 평가표' }));
    expect(await screen.findByText("현황에서는 보기만 됩니다. 고치려면 '점검' 탭에서 그 날짜·거래처로 여세요")).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '임시저장' })).toBeNull();
  });

  // 목록과 안 쓴 기간을 함께 부르므로 마지막 부름은 안 쓴 기간일 수 있다 → 부른 적이 있는지로 본다
  it('기간 · 서류를 붙여 다시 부른다(기간은 둘 다 있을 때만)', async () => {
    routes[`${BASE}/records`] = { resultList: [] };
    renderPage();
    await screen.findByText('협력업체 자체 위생점검 평가표 (질문 2개)');
    fireEvent.click(screen.getByRole('tab', { name: '현황' }));
    await waitFor(() => expect(api.apiGet).toHaveBeenCalledWith(`${BASE}/records`));
    fireEvent.change(screen.getByLabelText('시작일'), { target: { value: '2026-01-01' } });
    fireEvent.change(screen.getByLabelText('종료일'), { target: { value: '2026-12-31' } });
    fireEvent.click(screen.getByRole('button', { name: '조회' }));
    await waitFor(() => expect(api.apiGet).toHaveBeenCalledWith(`${BASE}/records?start=2026-01-01&end=2026-12-31`));
    fireEvent.mouseDown(screen.getByRole('combobox', { name: '서류' }));
    fireEvent.click(within(screen.getByRole('listbox')).getByRole('option', { name: '협력업체 자체 위생점검 평가표' }));
    await waitFor(() => expect(api.apiGet).toHaveBeenCalledWith(`${BASE}/records?start=2026-01-01&end=2026-12-31&formId=1`));
  });
});

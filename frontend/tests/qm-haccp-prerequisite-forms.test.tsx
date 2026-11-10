import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// HACCP(선행) 3단계 양식 만들기(2026-11-09). 송연 43-qdoc-survey.js qvLoadForms · qvEditForm · qvOpenInline · qvInlineSave · qvItemAction · qvSaveForm · qvSaveChoices · qvToggleForm · qvNewFormSave
const api = vi.hoisted(() => ({ apiGet: vi.fn(), apiPost: vi.fn(), apiPut: vi.fn(), apiDelete: vi.fn() }));
vi.mock('../src/shared/services/apiClient', () => api);

import { PrerequisiteManagementPage } from '../src/pages/qm/haccp/prerequisite/PrerequisiteManagementPage';

const BASE = '/api/v1/qm/haccp/prerequisite';
const CHOICES = [
  { label: '적합', mark: 'O', score: 2 },
  { label: '미흡', mark: '△', score: 1 },
  { label: '부적합', mark: 'X', score: 0 },
];
const ITEMS = [
  { id: 100, parentId: null, rowKind: 'group', label: '1. 법적 요건 점검', topic: '', required: 1, sortOrder: 1, depth: 0, questions: 2 },
  { id: 102, parentId: 100, rowKind: 'single', label: '1년에 1회 이상 건강검진을 실시하는가?', topic: '건강검진', required: 1, sortOrder: 2, depth: 1 },
  { id: 103, parentId: 100, rowKind: 'single', label: '자가품질검사의 기록을 유지하고 있는가?', topic: '자가품질검사', required: 0, sortOrder: 3, depth: 1 },
];
const FORM = {
  id: 1, name: '협력업체 자체 위생점검 평가표', category: '외부감사', bindType: 'client', active: true, cycle: '연1회',
  cycles: ['매일', '주1회', '월1회', '분기1회', '반기1회', '연1회', '수시'], versionId: 10, versionLabel: '1판',
  choices: CHOICES, hasNote: true, hasDefect: true, scoring: true, fullMark: 2, items: ITEMS, used: 0,
};
const FORMS = [{ id: 1, name: '협력업체 자체 위생점검 평가표', bindType: 'client', cycle: '연1회', active: 1, questions: 2, scoreMax: 4, records: 3 }];

let routes: Record<string, unknown> = {};
let confirm: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  api.apiGet.mockReset();
  api.apiPost.mockReset();
  api.apiPut.mockReset();
  api.apiDelete.mockReset();
  routes = {
    [`${BASE}/forms/pick`]: { resultList: [] },
    [`${BASE}/forms`]: { resultList: FORMS },
    [`${BASE}/forms/1`]: { form: FORM },
    [`${BASE}/forms/3`]: { form: { ...FORM, id: 3, name: '새 평가표', bindType: '', cycle: '수시', items: [] } },
  };
  api.apiGet.mockImplementation(async (path: string) => {
    if (!(path in routes)) throw new Error(`없는 주소: ${path}`);
    return routes[path];
  });
  api.apiPost.mockResolvedValue({ id: 900 });
  api.apiPut.mockResolvedValue({});
  api.apiDelete.mockResolvedValue({ deleted: 3 });
  confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
});
afterEach(() => confirm.mockRestore());

const renderPage = (permissions = { read: true, create: true, update: true, delete: true, excel: true }) =>
  render(
    <ThemeProvider theme={createTheme()}>
      <PrerequisiteManagementPage
        selectedModule={{ id: 'qm', name: '품질관리', icon: null, tree: [], menus: [] }}
        currentMenuName="HACCP(선행)"
        content={{ title: 'HACCP(선행)', description: '', cards: [], items: [] }}
        selectedMenuPermissions={permissions}
      />
    </ThemeProvider>,
  );

const openEditor = async () => {
  renderPage();
  fireEvent.click(screen.getByRole('tab', { name: '양식 만들기' }));
  fireEvent.click(await screen.findByRole('button', { name: /협력업체 자체 위생점검 평가표/ }));
  return screen.findByRole('textbox', { name: '제목' });
};

describe('양식 만들기 탭', () => {
  it('등록 · 수정 권한이 없으면 탭이 없다', () => {
    renderPage({ read: true, create: false, update: false, delete: false, excel: false });
    expect(screen.queryByRole('tab', { name: '양식 만들기' })).toBeNull();
  });

  it('서류 목록 카드를 보이고, 누르면 오른쪽에 편집을 연다', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('tab', { name: '양식 만들기' }));
    const card = await screen.findByRole('button', { name: /협력업체 자체 위생점검 평가표/ });
    expect(within(card).getByText('질문 2개 · 만점 4점 · 거래처마다 연1회 · 쓴 것 3장')).toBeInTheDocument();
    fireEvent.click(card);
    expect(await screen.findByRole('textbox', { name: '제목' })).toHaveValue('협력업체 자체 위생점검 평가표');
    expect(api.apiGet).toHaveBeenCalledWith(`${BASE}/forms/1`);
    expect(screen.getByText('질문 작성 · 2개 · 만점 4점')).toBeInTheDocument();
  });

  it('새 서류: 제목이 비면 막고, 질문을 가져와 만들면 그 서류 편집을 연다', async () => {
    api.apiPost.mockResolvedValue({ result: { id: 3, copied: 3 } });
    renderPage();
    fireEvent.click(screen.getByRole('tab', { name: '양식 만들기' }));
    await screen.findByRole('button', { name: /협력업체 자체 위생점검 평가표/ });
    fireEvent.click(screen.getByRole('button', { name: '+ 새 서류 만들기' }));
    const dialog = screen.getByRole('dialog', { name: '새 서류 만들기' });
    fireEvent.click(within(dialog).getByRole('button', { name: '만들기' }));
    expect(await within(dialog).findByText('서류 제목을 적어주세요')).toBeInTheDocument();
    fireEvent.change(within(dialog).getByRole('textbox', { name: '서류 제목' }), { target: { value: '새 평가표' } });
    fireEvent.mouseDown(within(dialog).getByRole('combobox', { name: '질문 가져오기' }));
    fireEvent.click(within(screen.getByRole('listbox')).getByRole('option', { name: '협력업체 자체 위생점검 평가표 — 질문 2개' }));
    fireEvent.click(within(dialog).getByRole('button', { name: '만들기' }));
    await waitFor(() => expect(api.apiPost).toHaveBeenCalledWith(`${BASE}/forms`, { name: '새 평가표', category: '일반', bindType: '', cycle: '수시', copyFrom: 1 }));
    expect(await screen.findByText('만들었습니다 (질문 3줄 가져옴)')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('textbox', { name: '제목' })).toHaveValue('새 평가표'));
  });

  it('서류 블록: 기간을 바꿔 저장한다', async () => {
    await openEditor();
    fireEvent.mouseDown(screen.getByRole('combobox', { name: '기간' }));
    fireEvent.click(within(screen.getByRole('listbox')).getByRole('option', { name: '반기1회' }));
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => expect(api.apiPut).toHaveBeenCalledWith(`${BASE}/forms/1`, { name: '협력업체 자체 위생점검 평가표', category: '외부감사', bindType: 'client', cycle: '반기1회' }));
    expect(await screen.findByText('저장했습니다')).toBeInTheDocument();
  });

  it('질문 넣기: 고른 줄 바로 밑에 넣고, Enter 로 저장하면 그 밑에 다음 칸이 열린다(관리항목 물려받음). 쓴 장이 있으면 먼저 묻는다', async () => {
    routes[`${BASE}/forms/1`] = { form: { ...FORM, used: 2 } };
    await openEditor();
    fireEvent.click(screen.getByText('1년에 1회 이상 건강검진을 실시하는가?'));
    fireEvent.click(screen.getByRole('button', { name: '+ 질문' }));
    const body = screen.getByRole('textbox', { name: '질문' });
    fireEvent.change(screen.getByRole('textbox', { name: '관리항목' }), { target: { value: '건강검진' } });
    fireEvent.change(body, { target: { value: '보건증을 비치하는가?' } });
    fireEvent.keyDown(body, { key: 'Enter' });
    await waitFor(() => expect(api.apiPost).toHaveBeenCalledWith(`${BASE}/forms/1/items`, {
      rowKind: 'single', label: '보건증을 비치하는가?', topic: '건강검진', required: true, afterId: 102,
    }));
    expect(confirm).toHaveBeenCalledWith('이 판으로 쓴 점검표가 2장 있습니다. 질문을 고치면 새 판이 뜨고, 지난 점검표는 그때 질문 그대로 남습니다. 고칠까요?');
    await waitFor(() => expect(screen.getByRole('textbox', { name: '질문' })).toHaveValue(''));
    expect(screen.getByRole('textbox', { name: '관리항목' })).toHaveValue('건강검진');
    fireEvent.keyDown(screen.getByRole('textbox', { name: '질문' }), { key: 'Escape' });
    expect(screen.queryByRole('textbox', { name: '질문' })).toBeNull();
  });

  it('줄 고치기 · 지우기(묶음이면 안의 질문 수를 알린다) · 옮기기', async () => {
    await openEditor();
    const row = screen.getByTestId('qve-row-103');
    fireEvent.click(within(row).getByRole('button', { name: '고치기' }));
    const body = screen.getByRole('textbox', { name: '질문' });
    expect(body).toHaveValue('자가품질검사의 기록을 유지하고 있는가?');
    fireEvent.change(body, { target: { value: '자가품질검사 기록을 2년 보관하는가?' } });
    // 서류 블록에도 [저장] 이 있어 칸에서는 Enter 로 저장한다
    fireEvent.keyDown(body, { key: 'Enter' });
    await waitFor(() => expect(api.apiPut).toHaveBeenCalledWith(`${BASE}/items/103`, { label: '자가품질검사 기록을 2년 보관하는가?', topic: '자가품질검사', required: false }));

    fireEvent.click(within(screen.getByTestId('qve-row-100')).getByRole('button', { name: '지우기' }));
    await waitFor(() => expect(confirm).toHaveBeenCalledWith("'1. 법적 요건 점검' 을(를) 지웁니다. 이 묶음 안의 질문 2개도 같이 지워집니다. 지울까요?"));
    await waitFor(() => expect(api.apiDelete).toHaveBeenCalledWith(`${BASE}/items/100`));

    fireEvent.click(within(screen.getByTestId('qve-row-103')).getByRole('button', { name: '위로' }));
    await waitFor(() => expect(api.apiPut).toHaveBeenCalledWith(`${BASE}/items/103/move`, { dir: 'up' }));
  });

  it('보기 저장: 고친 점수를 보내고, 보기를 다 비우면 막는다', async () => {
    await openEditor();
    const scores = screen.getAllByRole('textbox', { name: '점수' });
    fireEvent.change(scores[1], { target: { value: '0' } });
    fireEvent.click(screen.getByRole('checkbox', { name: '부적합내역 칸' }));
    fireEvent.click(screen.getByRole('button', { name: '답변 저장' }));
    await waitFor(() => expect(api.apiPut).toHaveBeenCalledWith(`${BASE}/forms/1/choices`, {
      choices: [{ label: '적합', mark: 'O', score: '2' }, { label: '미흡', mark: '△', score: '0' }, { label: '부적합', mark: 'X', score: '0' }],
      hasNote: true, hasDefect: false,
    }));
    // 저장 뒤 양식을 다시 읽어 칸이 새로 채워진다 — 다 읽은 뒤에 비운다
    expect(await screen.findByText('저장했습니다')).toBeInTheDocument();
    screen.getAllByRole('textbox', { name: '보기 이름' }).forEach((el) => fireEvent.change(el, { target: { value: '' } }));
    api.apiPut.mockClear();
    fireEvent.click(screen.getByRole('button', { name: '답변 저장' }));
    expect(await screen.findByText('고를 답을 하나 이상 적어주세요.')).toBeInTheDocument();
    expect(api.apiPut).not.toHaveBeenCalled();
  });

  it('목록에서 내리기: 먼저 묻고 내린다', async () => {
    await openEditor();
    fireEvent.click(screen.getByRole('button', { name: '목록에서 내리기' }));
    expect(confirm).toHaveBeenCalledWith('이 서류를 목록에서 내립니다. 쓴 점검표는 그대로 남고, 새로 쓸 수만 없게 됩니다. 내릴까요?');
    await waitFor(() => expect(api.apiPut).toHaveBeenCalledWith(`${BASE}/forms/1/active`, { active: false }));
    expect(await screen.findByText('목록에서 내렸습니다')).toBeInTheDocument();
  });
});

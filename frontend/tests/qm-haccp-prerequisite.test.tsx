import { fireEvent, render, screen, within } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material';
import { describe, expect, it, vi } from 'vitest';

// 2026-11-09 점검 · 현황 탭이 서버를 부른다. 여기서는 서류 · 점검표가 하나도 없는 빈 응답(화면 모양 확인용)
const api = vi.hoisted(() => ({ apiGet: vi.fn(async () => ({ resultList: [] })), apiPost: vi.fn(), apiPut: vi.fn(), apiDelete: vi.fn() }));
vi.mock('../src/shared/services/apiClient', () => api);

import { PrerequisiteManagementPage } from '../src/pages/qm/haccp/prerequisite/PrerequisiteManagementPage';
import { SurveySheet } from '../src/pages/qm/haccp/prerequisite/components/SurveySheet';
import { SurveyFormEditor } from '../src/pages/qm/haccp/prerequisite/components/SurveyFormEditor';
import {
  recordScoreText, recordStatusText, todayLocal,
  type SurveyFormDetail, type SurveySheetData,
} from '../src/pages/qm/haccp/prerequisite/utils/prerequisite';

// 품질관리 > HACCP > HACCP(선행) 화면만(2026-11-06). 송연 qdoc-survey.html · 43-qdoc-survey.js
const theme = createTheme();
const renderPage = () =>
  render(
    <ThemeProvider theme={theme}>
      <PrerequisiteManagementPage
        selectedModule={{ id: 'qm', name: '품질관리', icon: null, tree: [], menus: [] }}
        currentMenuName="HACCP(선행)"
        content={{ title: 'HACCP(선행)', description: '', cards: [], items: [] }}
        selectedMenuPermissions={{ read: true, create: true, update: true, delete: true, excel: true }}
      />
    </ThemeProvider>,
  );

// MUI 는 고르기 칸의 라벨을 label 이 아닌 div 로 그린다 → 라벨 class 로 찾는다
const fieldLabel = (root: HTMLElement, text: string) => {
  const found = Array.from(root.querySelectorAll('.MuiInputLabel-root')).find((el) => el.textContent?.replace(/[\s* ]/g, '') === text.replace(/\s/g, ''));
  if (!found) throw new Error(`라벨 없음: ${text}`);
  return found;
};

const headers = () => screen.getAllByRole('columnheader').map((cell) => cell.textContent?.trim()).filter(Boolean);

const CHOICES = [
  { label: '적합', mark: 'O', score: 2 },
  { label: '미흡', mark: '△', score: 1 },
  { label: '부적합', mark: 'X', score: 0 },
];
const SHEET: SurveySheetData = {
  formName: '협력업체 자체 위생점검 평가표',
  docDate: '2026-11-06',
  bindName: '송연상회',
  versionLabel: '1판',
  status: '',
  rejectReason: '',
  scoring: true,
  fullMark: 2,
  hasNote: true,
  hasDefect: true,
  choices: CHOICES,
  items: [
    { id: 1, parentId: null, rowKind: 'group', label: '1. 법적 요건 점검', topic: '', required: true, depth: 0 },
    { id: 2, parentId: 1, rowKind: 'single', label: '건강진단을 받았는가?', topic: '건강검진', required: true, depth: 1 },
    { id: 3, parentId: 1, rowKind: 'single', label: '기록을 유지하는가?', topic: '건강검진', required: false, depth: 1 },
  ],
  signs: [],
};

describe('HACCP(선행) 화면', () => {
  it('탭은 점검 · 현황 · 양식 만들기 세 개다', () => {
    renderPage();
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual(['점검', '현황', '양식 만들기']);
  });

  it('점검 탭: 서류가 없으면 안내하고, 점검일은 오늘, 거래처 칸은 없다. [점검표 열기] 는 서류를 고르라고 한다', async () => {
    renderPage();
    expect(screen.getByRole('combobox', { name: '서류' })).toHaveTextContent('쓸 수 있는 서류가 없습니다');
    expect(await screen.findByText('양식 만들기 탭에서 서류를 먼저 등록해주세요')).toBeInTheDocument();
    expect(screen.getByLabelText('점검일')).toHaveValue(todayLocal());
    expect(screen.queryByRole('textbox', { name: '점검한 거래처' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '점검표 열기' }));
    expect(screen.getByText('쓸 서류를 골라주세요.')).toBeInTheDocument();
  });

  it('현황 탭: 서류 전체 · 기간(비어 있음)과 표 칸', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('tab', { name: '현황' }));
    expect(screen.getByRole('combobox', { name: '서류' })).toHaveTextContent('서류 전체');
    expect(screen.getByLabelText('시작일')).toHaveValue('');
    expect(screen.getByLabelText('종료일')).toHaveValue('');
    expect(headers()).toEqual(['No', '점검일', '서류', '점검 대상', '기간', '점수', '결재', '쓴 사람']);
    expect(await screen.findByText('데이터가 없습니다')).toBeInTheDocument();
  });

  // 2026-11-09 [만들기] 를 붙였다(20261109_002) — 이제 눌린다
  it('양식 만들기 탭: 서류가 없다는 안내와 새 서류 만들기 창(결재선 안내 없음)', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('tab', { name: '양식 만들기' }));
    expect(await screen.findByText('아직 만든 서류가 없습니다')).toBeInTheDocument();
    expect(screen.getByText('왼쪽에서 서류를 고르거나, 새로 만들어주세요')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '+ 새 서류 만들기' }));
    const dialog = screen.getByRole('dialog', { name: '새 서류 만들기' });
    expect(within(dialog).getByRole('textbox', { name: '서류 제목' })).toHaveValue('');
    expect(within(dialog).getByRole('combobox', { name: '분류' })).toHaveTextContent('일반');
    expect(within(dialog).getByRole('combobox', { name: '대상' })).toHaveTextContent('날짜마다 (한 기간에 한 장)');
    expect(within(dialog).getByRole('combobox', { name: '기간' })).toHaveTextContent('수시 (정해진 주기 없음)');
    expect(within(dialog).getByRole('combobox', { name: '질문 가져오기' })).toHaveTextContent('가져오지 않음 (빈 양식)');
    // 빈 값('')을 고른 칸도 라벨이 위로 올라가 있어야 고른 글자와 겹치지 않는다(2026-11-09 대상 · 질문 가져오기 글자 겹침)
    for (const label of ['분류', '대상', '기간', '질문 가져오기']) {
      expect(fieldLabel(dialog, label)).toHaveAttribute('data-shrink', 'true');
    }
    expect(within(dialog).getByRole('button', { name: '만들기' })).toBeEnabled();
    expect(dialog.textContent).not.toMatch(/결재선/);
    fireEvent.mouseDown(within(dialog).getByRole('combobox', { name: '기간' }));
    expect(within(screen.getByRole('listbox')).getAllByRole('option').map((o) => o.textContent)).toEqual([
      '매일', '주1회', '월1회', '분기1회', '반기1회', '연1회', '수시 (정해진 주기 없음)',
    ]);
  });
});

describe('점검표 한 장(모양)', () => {
  const renderSheet = (data: SurveySheetData, view = false) =>
    render(<ThemeProvider theme={theme}><SurveySheet data={data} view={view} /></ThemeProvider>);

  it('머리 · 보기 설명 · 묶음/질문 줄 · 세부내역/부적합내역 칸, 저장 단추는 눌리지 않는다', () => {
    renderSheet(SHEET);
    expect(screen.getByText('협력업체 자체 위생점검 평가표')).toBeInTheDocument();
    expect(screen.getByText('송연상회 · 2026-11-06 · 양식 1판')).toBeInTheDocument();
    expect(screen.getByText('O 적합 (2점)')).toBeInTheDocument();
    expect(screen.getByText('1. 법적 요건 점검')).toBeInTheDocument();
    // 관리항목은 바로 위 줄과 같으면 한 번만
    expect(screen.getAllByText('건강검진')).toHaveLength(1);
    expect(screen.getByText('(선택)')).toBeInTheDocument();
    expect(screen.getAllByRole('textbox', { name: '세부내역' })).toHaveLength(2);
    expect(screen.getAllByRole('textbox', { name: '부적합내역' })).toHaveLength(2);
    expect(screen.getByTestId('qv-score')).toHaveTextContent('0 / 0점');
    expect(screen.getByText('아직 2개 남음')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '임시저장' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '결재 올리기' })).toBeDisabled();
  });

  it('보기를 누르면 골라지고 점수 · 남은 수 · 묶음 소계가 바뀐다. 같은 보기를 다시 누르면 풀린다', () => {
    renderSheet(SHEET);
    const row = screen.getByTestId('qv-row-2');
    fireEvent.click(within(row).getByRole('button', { name: '부적합' }));
    expect(within(row).getByRole('button', { name: '부적합' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('qv-score')).toHaveTextContent('0 / 2점');
    expect(screen.getByText('아직 1개 남음 · 부적합 1건')).toBeInTheDocument();
    fireEvent.click(within(row).getByRole('button', { name: '적합' }));
    fireEvent.click(within(screen.getByTestId('qv-row-3')).getByRole('button', { name: '미흡' }));
    expect(screen.getByTestId('qv-score')).toHaveTextContent('3 / 4점');
    expect(screen.getByText('다 답했습니다')).toBeInTheDocument();
    expect(within(screen.getByTestId('qv-group-1')).getByText('3 / 4점')).toBeInTheDocument();
    fireEvent.click(within(row).getByRole('button', { name: '적합' }));
    expect(within(row).getByRole('button', { name: '적합' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('아직 1개 남음')).toBeInTheDocument();
  });

  it('점수 없는 양식은 답한 수를 센다', () => {
    renderSheet({ ...SHEET, scoring: false, choices: CHOICES.map((c) => ({ ...c, score: null })) });
    expect(screen.getByTestId('qv-score')).toHaveTextContent('0 / 2개 답함');
    expect(screen.getByText('O 적합')).toBeInTheDocument();
  });

  it('승인 · 검토대기 · 현황에서 연 장은 고칠 수 없고 까닭을 적는다. 반려 사유 · 결재란을 보인다', () => {
    const { unmount } = renderSheet({
      ...SHEET, status: '승인',
      signs: [{ step: 1, label: '작성', employeeName: '김작성', state: '승인', actedBy: '김작성', actedAt: '2026-11-06 10:00' }],
    });
    expect(screen.getByText('결재가 끝난 점검표라 고칠 수 없습니다')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '임시저장' })).toBeNull();
    expect(screen.getByText('결 재')).toBeInTheDocument();
    expect(within(screen.getByTestId('qv-row-2')).getByRole('button', { name: '적합' })).toBeDisabled();
    unmount();
    const second = renderSheet({ ...SHEET, status: '검토대기' });
    expect(screen.getByText('결재에 올라가 있어 고칠 수 없습니다 (돌려받으면 다시 열립니다)')).toBeInTheDocument();
    second.unmount();
    const third = renderSheet({ ...SHEET, status: '반려', rejectReason: '사진 없음' }, true);
    expect(screen.getByText("현황에서는 보기만 됩니다. 고치려면 '점검' 탭에서 그 날짜·거래처로 여세요")).toBeInTheDocument();
    expect(screen.getByText('반려: 사진 없음')).toBeInTheDocument();
    third.unmount();
  });
});

describe('양식 편집(모양)', () => {
  const FORM: SurveyFormDetail = {
    name: '협력업체 자체 위생점검 평가표', category: '외부감사', bindType: 'client', cycle: '연1회', active: true,
    versionLabel: '1판', used: 0, scoring: true, fullMark: 2, hasNote: true, hasDefect: true,
    choices: CHOICES, items: SHEET.items.map((it) => ({ ...it, questions: it.rowKind === 'group' ? 2 : undefined })),
  };
  const renderEditor = (form: SurveyFormDetail) =>
    render(<ThemeProvider theme={theme}><SurveyFormEditor form={form} /></ThemeProvider>);

  it('서류 · 질문 작성 · 답변 작성 블록, 저장 단추는 눌리지 않는다', () => {
    renderEditor(FORM);
    expect(screen.getByRole('textbox', { name: '제목' })).toHaveValue('협력업체 자체 위생점검 평가표');
    expect(screen.getByRole('combobox', { name: '분류' })).toHaveTextContent('외부감사');
    expect(screen.getByRole('combobox', { name: '대상' })).toHaveTextContent('거래처마다');
    expect(screen.getByRole('combobox', { name: '기간' })).toHaveTextContent('연1회');
    expect(screen.getByText(/아직 이 판으로 쓴 점검표가 없습니다\./)).toBeInTheDocument();
    expect(screen.getByText('연1회라')).toBeInTheDocument();
    expect(screen.getByText(/한 기간에 한 장만 쓸 수 있고, 빠진 기간은 현황에서 짚어줍니다/)).toBeInTheDocument();
    expect(screen.getByText('질문 작성 · 2개 · 만점 4점')).toBeInTheDocument();
    expect(screen.getByText('질문 2개 · 4점')).toBeInTheDocument();
    for (const name of ['저장', '목록에서 내리기', '+ 묶음', '+ 질문', '답변 저장']) {
      expect(screen.getByRole('button', { name })).toBeDisabled();
    }
    expect(screen.getAllByRole('button', { name: '고치기' })[0]).toBeDisabled();
    expect(screen.getAllByRole('textbox', { name: '보기 이름' }).map((el) => (el as HTMLInputElement).value)).toEqual(['적합', '미흡', '부적합']);
    expect(screen.getByRole('checkbox', { name: '세부내역 칸' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: '부적합내역 칸' })).toBeChecked();
    expect(screen.getByText(/짜리 보기는 부적합으로 셉니다/)).toBeInTheDocument();
  });

  it('쓴 점검표가 있으면 대상을 바꿀 수 없고 새 판 안내가 나온다. 질문이 없으면 안내', () => {
    renderEditor({ ...FORM, used: 3, items: [], bindType: '' });
    // 날짜마다(빈 값)를 골라도 라벨이 위로 올라가 글자와 겹치지 않는다
    expect(fieldLabel(document.body, '대상')).toHaveAttribute('data-shrink', 'true');
    expect(screen.getByRole('combobox', { name: '대상' })).toHaveTextContent('날짜마다');
    expect(screen.getByRole('combobox', { name: '대상' })).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByText(/이 판으로 쓴 점검표가 3장 있습니다/)).toBeInTheDocument();
    expect(screen.getByText('아직 질문이 없습니다. 위의 + 질문을 눌러 등록해주세요')).toBeInTheDocument();
  });
});

describe('현황 칸 글자', () => {
  it('결재 칸: 승인 · 반려 · 내 차례 · 남의 차례 · 작성중', () => {
    expect(recordStatusText({ status: '승인', approvedBy: '이팀장', turnName: '', myTurn: false })).toBe('승인 · 이팀장');
    expect(recordStatusText({ status: '반려', approvedBy: '', turnName: '', myTurn: false })).toBe('반려');
    expect(recordStatusText({ status: '검토대기', approvedBy: '', turnName: '박검토', myTurn: true })).toBe('내 차례');
    expect(recordStatusText({ status: '검토대기', approvedBy: '', turnName: '박검토', myTurn: false })).toBe('박검토 차례');
    expect(recordStatusText({ status: '작성중', approvedBy: '', turnName: '', myTurn: false })).toBe('작성중');
  });

  it('점수 칸: 만점이 없으면 비운다', () => {
    expect(recordScoreText({ score: 170, scoreMax: 182 })).toBe('170 / 182점');
    expect(recordScoreText({ score: 0, scoreMax: 0 })).toBe('');
  });
});

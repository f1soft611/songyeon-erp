// 품질관리 > HACCP > HACCP(선행) (송연 qdoc-survey.html · 43-qdoc-survey.js · qsurvey.py)
// 2026-11-06 화면만 옮겼다. 2026-11-09 점검 · 현황 탭을 서버에 붙였다(점검표 열기 · 임시저장 · 현황 · 안 쓴 기간). 결재 · 양식 만들기 동작은 아직

export type PrerequisiteTab = 'check' | 'list' | 'build';

export const PREREQUISITE_TABS: { value: PrerequisiteTab; label: string }[] = [
  { value: 'check', label: '점검' },
  { value: 'list', label: '현황' },
  { value: 'build', label: '양식 만들기' },
];

export const CATEGORY_OPTIONS = ['외부감사', '내부감사', '일반'];

// 대상: 한 장이 무엇에 붙는가(날짜냐 업체냐). 기간과 다른 것이다
export const BIND_OPTIONS = [
  { value: '', label: '날짜마다 (한 기간에 한 장)' },
  { value: 'client', label: '거래처마다 (업체마다 한 장)' },
];

// 기간: 얼마나 자주 쓰는가(원본 qsurvey.CYCLES)
export const CYCLES = ['매일', '주1회', '월1회', '분기1회', '반기1회', '연1회', '수시'];
export const cycleLabel = (cycle: string) => (cycle === '수시' ? '수시 (정해진 주기 없음)' : cycle);

// 고를 답(판 survey_json.choices). score 가 null 이면 점수를 안 매기는 보기
export type SurveyChoice = { label: string; mark: string; score: number | null };

// 줄(qdoc_item). 묶음(group) 아래 질문(single), 묶음은 두 단계까지
export type SurveyItem = {
  id: number;
  parentId: number | null;
  rowKind: 'group' | 'single';
  label: string;
  topic: string;
  required: boolean;
  depth: number;
  questions?: number;
};

// 결재란 한 칸(qdoc_sign). 올린 장에만 있다
export type SurveySign = { step: number; label: string; employeeName: string; state: '' | '승인' | '전결'; actedBy: string; actedAt: string };

export type SurveyStatus = '' | '작성중' | '검토대기' | '승인' | '반려';

// 점검표 한 장(원본 /api/qsurvey/blank · /records/{id})
export type SurveySheetData = {
  formName: string;
  docDate: string;
  bindName: string;
  versionLabel: string;
  status: SurveyStatus;
  rejectReason: string;
  scoring: boolean;
  fullMark: number;
  hasNote: boolean;
  hasDefect: boolean;
  choices: SurveyChoice[];
  items: SurveyItem[];
  signs: SurveySign[];
  // 서버에서 받은 장: 쓴 장 번호 · 서류 · 거래처코드 · 저장된 답(줄 번호 → 답)
  recordId?: number | null;
  formId?: number;
  bindType?: '' | 'client';
  clientCode?: string;
  answers?: Record<number, SurveyAnswer>;
};

export type SurveyAnswer = { value: string; note: string; defect: string };

// 현황 한 줄(원본 /api/qsurvey/records)
export type SurveyRecordRow = {
  id: number;
  docDate: string;
  formName: string;
  bindName: string;
  period: string;
  cycle: string;
  score: number;
  scoreMax: number;
  status: SurveyStatus;
  approvedBy: string;
  turnName: string;
  myTurn: boolean;
  writtenBy: string;
};

// 안 쓴 기간(원본 /api/qsurvey/missing). 거래처마다 서류면 줄 이름이 업체 이름
export type SurveyMissing = { formId: number; formName: string; cycle: string; bindType: '' | 'client'; rows: { label: string; period: string }[] };

export const missingTitle = (missing: SurveyMissing) =>
  `${missing.cycle} · ${missing.bindType === 'client' ? '전에 평가한 업체 중 이번 기간에 빠진 곳' : '빠진 기간'}`;

// 고를 수 있는 서류(원본 /api/qsurvey/pick)
export type SurveyPickForm = { id: number; name: string; bindType: '' | 'client'; cycle: string; questions: number };

// 양식 목록 카드(원본 /api/qsurvey/forms)
export type SurveyFormSummary = { id: number; name: string; questions: number; scoreMax: number; bindType: '' | 'client'; cycle: string; records: number; active: boolean };

// 양식 편집(원본 /api/qsurvey/forms/{id})
export type SurveyFormDetail = {
  id?: number;
  versionId?: number;
  name: string;
  category: string;
  bindType: '' | 'client';
  cycle: string;
  active: boolean;
  versionLabel: string;
  used: number;
  scoring: boolean;
  fullMark: number;
  hasNote: boolean;
  hasDefect: boolean;
  choices: SurveyChoice[];
  items: SurveyItem[];
};

// 양식 카드 둘째 줄(원본 qvLoadForms): 질문 N개 · 만점 N점 · 거래처마다/날짜마다 기간 · 쓴 것 N장 · 내려둠
export const formCardMeta = (form: SurveyFormSummary) =>
  [
    `질문 ${form.questions}개`,
    form.scoreMax ? `만점 ${form.scoreMax}점` : '',
    `${form.bindType === 'client' ? '거래처마다' : '날짜마다'} ${form.cycle}`,
    form.records ? `쓴 것 ${form.records}장` : '',
    form.active ? '' : '내려둠',
  ].filter(Boolean).join(' · ');

// 쓴 장이 있는 판을 고칠 때 먼저 묻는 말(원본 qvInlineSave · qvItemAction · qvSaveChoices)
export const usedVersionQuestion = (used: number, what: 'item' | 'action' | 'choices') =>
  what === 'choices'
    ? `이 판으로 쓴 점검표가 ${used}장 있습니다. 고르는 답을 바꾸면 새 판이 뜨고, 지난 점검표는 그때 보기 그대로 남습니다. 바꿀까요?`
    : what === 'item'
      ? `이 판으로 쓴 점검표가 ${used}장 있습니다. 질문을 고치면 새 판이 뜨고, 지난 점검표는 그때 질문 그대로 남습니다. 고칠까요?`
      : `이 판으로 쓴 점검표가 ${used}장 있습니다. 고치면 새 판이 뜨고, 지난 점검표는 그때 질문 그대로 남습니다. 이어갈까요?`;

// 점검일 기본값은 오늘(원본은 UTC 로 만들어 오전 9시 전엔 어제가 됐다 → 이 컴퓨터 날짜로)
export const todayLocal = (now = new Date()) => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

// 결재 칸. '검토대기' 만 적으면 내가 누를 것인지 남을 기다리는 것인지 모른다 → 걸린 사람 이름(원본 qvStatusCell)
export const recordStatusText = (row: Pick<SurveyRecordRow, 'status' | 'approvedBy' | 'turnName' | 'myTurn'>) => {
  if (row.status === '승인') return `승인 · ${row.approvedBy}`;
  if (row.status === '반려') return '반려';
  if (row.status === '검토대기') return row.myTurn ? '내 차례' : `${row.turnName} 차례`;
  return row.status;
};

// 점수 칸. 만점이 없으면(점수 안 매기는 서류) 비운다
export const recordScoreText = (row: Pick<SurveyRecordRow, 'score' | 'scoreMax'>) =>
  row.scoreMax ? `${row.score} / ${row.scoreMax}점` : '';

// 화면에 보여줄 점수(원본 qvTally). 저장되는 점수는 서버가 따로 센다.
// 만점 = 답한 질문 수 × 최고 점수, 0점 보기만 부적합, 작은 묶음 점수는 큰 묶음에도 올려 센다
export function tallySheet(data: SurveySheetData, answers: Record<number, SurveyAnswer>) {
  const byLabel = new Map(data.choices.map((choice) => [choice.label, choice]));
  const byId = new Map(data.items.map((item) => [item.id, item]));
  const mark = data.fullMark || 0;
  let got = 0;
  let answered = 0;
  let bad = 0;
  let total = 0;
  const perGroup: Record<number, { got: number; max: number }> = {};
  data.items.forEach((item) => {
    if (item.rowKind !== 'single') return;
    total += 1;
    const value = answers[item.id]?.value;
    const choice = value ? byLabel.get(value) : undefined;
    if (!choice) return;
    answered += 1;
    if (choice.score != null) got += choice.score;
    if (choice.score === 0) bad += 1;
    let parent = item.parentId;
    while (parent != null && byId.has(parent)) {
      perGroup[parent] = perGroup[parent] ?? { got: 0, max: 0 };
      if (choice.score != null) perGroup[parent].got += choice.score;
      perGroup[parent].max += mark;
      parent = byId.get(parent)?.parentId ?? null;
    }
  });
  const rest = total - answered;
  const scoreText = data.scoring ? `${got} / ${answered * mark}점` : `${answered} / ${total}개 답함`;
  const leftText = rest
    ? `아직 ${rest}개 남음${bad ? ` · 부적합 ${bad}건` : ''}`
    : bad ? `다 답했습니다 · 부적합 ${bad}건` : '다 답했습니다';
  const groupText = (groupId: number) => {
    const g = perGroup[groupId];
    return data.scoring && g ? `${g.got} / ${g.max}점` : '';
  };
  return { scoreText, leftText, groupText };
}

// 받침에 따라 '이라' / '라'(원본 josa)
export const withIra = (word: string) => {
  const last = word.charCodeAt(word.length - 1);
  const hasBatchim = last >= 0xac00 && last <= 0xd7a3 && (last - 0xac00) % 28 !== 0;
  return `${word}${hasBatchim ? '이라' : '라'}`;
};

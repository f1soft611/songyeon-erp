import { apiDelete, apiGet, apiPost, apiPut } from '../../../../../shared/services/apiClient';
import type {
  SurveyAnswer, SurveyChoice, SurveyFormDetail, SurveyFormSummary, SurveyItem, SurveyMissing, SurveyPickForm, SurveyRecordRow, SurveySheetData, SurveyStatus,
} from '../utils/prerequisite';

// 품질관리 > HACCP > HACCP(선행) (송연 qsurvey.py). 2026-11-09 점검표 열기 · 임시저장 · 현황 · 안 쓴 기간
const PATH = '/api/v1/qm/haccp/prerequisite';

type Raw = Record<string, unknown>;
const text = (v: unknown) => (v == null ? '' : String(v));
const num = (v: unknown) => (v == null || v === '' ? 0 : Number(v));

const toItem = (r: Raw): SurveyItem => ({
  id: num(r.id),
  parentId: r.parentId == null ? null : num(r.parentId),
  rowKind: r.rowKind === 'group' ? 'group' : 'single',
  label: text(r.label),
  topic: text(r.topic),
  required: Number(r.required ?? 1) !== 0,
  depth: num(r.depth),
  questions: r.questions == null ? undefined : num(r.questions),
});

const toChoice = (r: Raw): SurveyChoice => ({ label: text(r.label), mark: text(r.mark), score: r.score == null ? null : Number(r.score) });

const toAnswers = (raw: unknown): Record<number, SurveyAnswer> => {
  const out: Record<number, SurveyAnswer> = {};
  Object.entries((raw ?? {}) as Record<string, Raw>).forEach(([id, a]) => {
    out[Number(id)] = { value: text(a?.value), note: text(a?.note), defect: text(a?.defect) };
  });
  return out;
};

export type FetchedSheet = SurveySheetData & { existingId: number | null; existingDate: string };

const toSheet = (r: Raw): FetchedSheet => ({
  recordId: r.recordId == null ? null : num(r.recordId),
  formId: num(r.formId),
  formName: text(r.formName),
  docDate: text(r.docDate),
  bindType: r.bindType === 'client' ? 'client' : '',
  bindName: text(r.bindName),
  clientCode: text(r.clientCode),
  versionLabel: text(r.versionLabel),
  status: text(r.status) as SurveyStatus,
  rejectReason: text(r.rejectReason),
  scoring: Boolean(r.scoring),
  fullMark: num(r.fullMark),
  hasNote: Boolean(r.hasNote),
  hasDefect: Boolean(r.hasDefect),
  choices: ((r.choices ?? []) as Raw[]).map(toChoice),
  items: ((r.items ?? []) as Raw[]).map(toItem),
  // 결재란은 결재 방식이 정해지면 붙인다
  signs: [],
  answers: toAnswers(r.answers),
  existingId: r.existingId == null ? null : num(r.existingId),
  existingDate: text(r.existingDate),
});

export async function fetchPickForms(): Promise<SurveyPickForm[]> {
  const body = await apiGet<{ resultList?: Raw[] }>(`${PATH}/forms/pick`);
  return (body.resultList ?? []).map((r) => ({
    id: num(r.id), name: text(r.name), bindType: r.bindType === 'client' ? 'client' : '', cycle: text(r.cycle), questions: num(r.questions),
  }));
}

export async function fetchBlankSheet(formId: number, docDate: string, clientCode: string): Promise<FetchedSheet> {
  const params = new URLSearchParams({ formId: String(formId), docDate });
  if (clientCode) params.set('clientCode', clientCode);
  const body = await apiGet<{ sheet: Raw }>(`${PATH}/blank?${params.toString()}`);
  return toSheet(body.sheet ?? {});
}

export async function fetchRecordSheet(recordId: number): Promise<FetchedSheet> {
  const body = await apiGet<{ sheet: Raw }>(`${PATH}/records/${recordId}`);
  return toSheet(body.sheet ?? {});
}

export type SurveySaveInput = { formId: number; docDate: string; clientCode: string; answers: Record<number, SurveyAnswer> };

export async function saveSurveyRecord(input: SurveySaveInput): Promise<{ id: number; status: SurveyStatus }> {
  const body = await apiPost<{ result?: Raw }>(`${PATH}/records`, input);
  return { id: num(body.result?.id), status: text(body.result?.status) as SurveyStatus };
}

export async function fetchSurveyRecords(start: string, end: string, formId: string): Promise<SurveyRecordRow[]> {
  const params = new URLSearchParams();
  if (start && end) {
    params.set('start', start);
    params.set('end', end);
  }
  if (formId) params.set('formId', formId);
  const query = params.toString();
  const body = await apiGet<{ resultList?: Raw[] }>(`${PATH}/records${query ? `?${query}` : ''}`);
  return (body.resultList ?? []).map((r) => ({
    id: num(r.id),
    docDate: text(r.docDate),
    formName: text(r.formName),
    bindName: text(r.bindName),
    period: text(r.period),
    cycle: text(r.cycle),
    score: num(r.score),
    scoreMax: num(r.scoreMax),
    status: text(r.status) as SurveyStatus,
    approvedBy: text(r.approvedByNm || r.approvedBy),
    // 누구 차례인지는 결재 방식이 정해지면 붙인다
    turnName: '',
    myTurn: false,
    writtenBy: text(r.writtenByNm || r.writtenBy),
  }));
}

export async function fetchMissing(): Promise<SurveyMissing[]> {
  const body = await apiGet<{ resultList?: Raw[] }>(`${PATH}/missing`);
  return (body.resultList ?? []).map((r) => ({
    formId: num(r.formId),
    formName: text(r.formName),
    cycle: text(r.cycle),
    bindType: r.bindType === 'client' ? 'client' : '',
    rows: ((r.rows ?? []) as Raw[]).map((x) => ({ label: text(x.label), period: text(x.period) })),
  }));
}

// ---------------------------------------------------------------- 양식 만들기(2026-11-09)

export async function fetchSurveyForms(): Promise<SurveyFormSummary[]> {
  const body = await apiGet<{ resultList?: Raw[] }>(`${PATH}/forms`);
  return (body.resultList ?? []).map((r) => ({
    id: num(r.id),
    name: text(r.name),
    questions: num(r.questions),
    scoreMax: num(r.scoreMax),
    bindType: r.bindType === 'client' ? 'client' : '',
    cycle: text(r.cycle) || '수시',
    records: num(r.records),
    active: Number(r.active ?? 1) !== 0,
  }));
}

export async function fetchSurveyForm(formId: number): Promise<SurveyFormDetail> {
  const body = await apiGet<{ form?: Raw }>(`${PATH}/forms/${formId}`);
  const r = body.form ?? {};
  return {
    id: num(r.id),
    versionId: num(r.versionId),
    name: text(r.name),
    category: text(r.category) || '일반',
    bindType: r.bindType === 'client' ? 'client' : '',
    cycle: text(r.cycle) || '수시',
    active: Boolean(r.active),
    versionLabel: text(r.versionLabel),
    used: num(r.used),
    scoring: Boolean(r.scoring),
    fullMark: num(r.fullMark),
    hasNote: Boolean(r.hasNote),
    hasDefect: Boolean(r.hasDefect),
    choices: ((r.choices ?? []) as Raw[]).map(toChoice),
    items: ((r.items ?? []) as Raw[]).map(toItem),
  };
}

export type SurveyFormInfo = { name: string; category: string; bindType: '' | 'client'; cycle: string };

export async function createSurveyForm(info: SurveyFormInfo & { copyFrom: number | null }): Promise<{ id: number; copied: number }> {
  const body = await apiPost<{ result?: Raw }>(`${PATH}/forms`, info);
  return { id: num(body.result?.id), copied: num(body.result?.copied) };
}

export async function updateSurveyForm(formId: number, info: SurveyFormInfo): Promise<void> {
  await apiPut(`${PATH}/forms/${formId}`, info);
}

export async function setSurveyFormActive(formId: number, active: boolean): Promise<void> {
  await apiPut(`${PATH}/forms/${formId}/active`, { active });
}

export type SurveyChoiceDraft = { label: string; mark: string; score: string };

export async function saveSurveyChoices(formId: number, choices: SurveyChoiceDraft[], hasNote: boolean, hasDefect: boolean): Promise<void> {
  await apiPut(`${PATH}/forms/${formId}/choices`, { choices, hasNote, hasDefect });
}

export type SurveyItemInput = { rowKind: 'single' | 'group'; label: string; topic: string; required: boolean };

export async function addSurveyItem(formId: number, input: SurveyItemInput, afterId: number | null): Promise<number> {
  const body = await apiPost<{ id?: unknown }>(`${PATH}/forms/${formId}/items`, afterId ? { ...input, afterId } : input);
  return num(body.id);
}

export async function updateSurveyItem(itemId: number, input: Omit<SurveyItemInput, 'rowKind'>): Promise<number> {
  const body = await apiPut<{ id?: unknown }>(`${PATH}/items/${itemId}`, input);
  return num(body?.id) || itemId;
}

export async function deleteSurveyItem(itemId: number): Promise<void> {
  await apiDelete(`${PATH}/items/${itemId}`);
}

export async function moveSurveyItem(itemId: number, dir: 'up' | 'down'): Promise<void> {
  await apiPut(`${PATH}/items/${itemId}/move`, { dir });
}

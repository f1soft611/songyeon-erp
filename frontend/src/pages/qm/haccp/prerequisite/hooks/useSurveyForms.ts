import { useCallback, useEffect, useState } from 'react';
import {
  addSurveyItem, createSurveyForm, deleteSurveyItem, fetchSurveyForm, fetchSurveyForms, moveSurveyItem, saveSurveyChoices,
  setSurveyFormActive, updateSurveyForm, updateSurveyItem,
  type SurveyChoiceDraft, type SurveyFormInfo, type SurveyItemInput,
} from '../services/prerequisite.service';
import { usedVersionQuestion, type SurveyFormDetail, type SurveyFormSummary, type SurveyItem } from '../utils/prerequisite';

const errorText = (error: unknown, fallback: string) => (error instanceof Error && error.message ? error.message : fallback);
type Message = { severity: 'success' | 'error'; text: string } | null;

// 양식 만들기 탭(송연 qvLoadForms · qvEditForm · qvSaveForm · qvToggleForm · qvSaveChoices · qvInlineSave · qvItemAction · qvNewFormSave).
// 고칠 때마다 서류 목록 · 고른 서류를 다시 읽고, onChanged 로 점검 탭의 쓸 서류 목록도 다시 읽게 한다
export function useSurveyForms(active: boolean, onChanged: () => void) {
  const [forms, setForms] = useState<SurveyFormSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [form, setForm] = useState<SurveyFormDetail | null>(null);
  const [message, setMessage] = useState<Message>(null);
  const [busy, setBusy] = useState(false);

  const loadForms = useCallback(async () => {
    setLoading(true);
    try {
      setForms(await fetchSurveyForms());
    } catch (error) {
      setMessage({ severity: 'error', text: errorText(error, '서류 목록을 불러오지 못했습니다') });
    } finally {
      setLoading(false);
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (active && !loaded && !loading) void loadForms();
  }, [active, loaded, loading, loadForms]);

  const open = useCallback(async (formId: number) => {
    try {
      setForm(await fetchSurveyForm(formId));
    } catch (error) {
      setMessage({ severity: 'error', text: errorText(error, '서류를 열지 못했습니다') });
    }
  }, []);

  const select = (formId: number) => {
    setMessage(null);
    void open(formId);
  };

  // 서버에 고친 뒤: 목록 · 고른 서류 · 점검 탭 쓸 서류를 다시 읽는다
  const refresh = async (formId: number, done?: string) => {
    if (done) setMessage({ severity: 'success', text: done });
    await Promise.all([loadForms(), open(formId)]);
    onChanged();
  };

  const run = async <T,>(work: () => Promise<T>): Promise<T | null> => {
    setBusy(true);
    try {
      return await work();
    } catch (error) {
      setMessage({ severity: 'error', text: errorText(error, '저장하지 못했습니다') });
      return null;
    } finally {
      setBusy(false);
    }
  };

  /** 새 서류. 실패하면 창에 보일 까닭을 돌려준다 */
  const create = async (info: SurveyFormInfo & { copyFrom: number | null }): Promise<string | null> => {
    try {
      const result = await createSurveyForm(info);
      await refresh(result.id, result.copied ? `만들었습니다 (질문 ${result.copied}줄 가져옴)` : '만들었습니다');
      return null;
    } catch (error) {
      return errorText(error, '만들지 못했습니다');
    }
  };

  const saveInfo = async (info: SurveyFormInfo) => {
    if (!form?.id) return;
    const formId = form.id;
    if ((await run(() => updateSurveyForm(formId, info))) !== null) await refresh(formId, '저장했습니다');
  };

  const toggleActive = async () => {
    if (!form?.id) return;
    const formId = form.id;
    const next = !form.active;
    if (!next && !window.confirm('이 서류를 목록에서 내립니다. 쓴 점검표는 그대로 남고, 새로 쓸 수만 없게 됩니다. 내릴까요?')) return;
    if ((await run(() => setSurveyFormActive(formId, next))) !== null) await refresh(formId, next ? '다시 올렸습니다' : '목록에서 내렸습니다');
  };

  const saveChoices = async (choices: SurveyChoiceDraft[], hasNote: boolean, hasDefect: boolean) => {
    if (!form?.id) return;
    const formId = form.id;
    const filled = choices.filter((choice) => choice.label.trim());
    if (!filled.length) {
      setMessage({ severity: 'error', text: '고를 답을 하나 이상 적어주세요.' });
      return;
    }
    if (form.used && !window.confirm(usedVersionQuestion(form.used, 'choices'))) return;
    if ((await run(() => saveSurveyChoices(formId, filled, hasNote, hasDefect))) !== null) await refresh(formId, '저장했습니다');
  };

  /** 줄 넣기 · 고치기. 저장한 줄 번호(실패 · 취소면 null)와 까닭 */
  const saveItem = async (input: SurveyItemInput & { id?: number; afterId?: number | null }): Promise<{ id: number | null; error?: string }> => {
    if (!form?.id) return { id: null };
    const formId = form.id;
    if (form.used && !window.confirm(usedVersionQuestion(form.used, 'item'))) return { id: null };
    setBusy(true);
    try {
      const id = input.id
        ? await updateSurveyItem(input.id, { label: input.label, topic: input.topic, required: input.required })
        : await addSurveyItem(formId, { rowKind: input.rowKind, label: input.label, topic: input.topic, required: input.required }, input.afterId ?? null);
      await refresh(formId, '저장했습니다');
      return { id };
    } catch (error) {
      return { id: null, error: errorText(error, '저장하지 못했습니다') };
    } finally {
      setBusy(false);
    }
  };

  const deleteItem = async (item: SurveyItem) => {
    if (!form?.id) return;
    const formId = form.id;
    const kids = item.rowKind === 'group' ? item.questions ?? 0 : 0;
    if (!window.confirm(`'${item.label}' 을(를) 지웁니다.${kids ? ` 이 묶음 안의 질문 ${kids}개도 같이 지워집니다.` : ''} 지울까요?`)) return;
    if (form.used && !window.confirm(usedVersionQuestion(form.used, 'action'))) return;
    if ((await run(() => deleteSurveyItem(item.id))) !== null) await refresh(formId);
  };

  const moveItem = async (item: SurveyItem, dir: 'up' | 'down') => {
    if (!form?.id) return;
    const formId = form.id;
    if (form.used && !window.confirm(usedVersionQuestion(form.used, 'action'))) return;
    if ((await run(() => moveSurveyItem(item.id, dir))) !== null) await refresh(formId);
  };

  return { forms, loading, loaded, form, message, busy, select, create, saveInfo, toggleActive, saveChoices, saveItem, deleteItem, moveItem };
}

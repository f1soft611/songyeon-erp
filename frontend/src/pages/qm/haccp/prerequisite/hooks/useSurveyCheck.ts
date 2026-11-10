import { useCallback, useEffect, useState } from 'react';
import { fetchClientOptions } from '../../../../co/master/item-master/services/itemMaster.service';
import type { ClientOption } from '../../../../co/master/item-master/types/itemMaster.types';
import {
  fetchBlankSheet, fetchPickForms, fetchRecordSheet, saveSurveyRecord, type FetchedSheet,
} from '../services/prerequisite.service';
import { todayLocal, type SurveyAnswer, type SurveyPickForm } from '../utils/prerequisite';

const errorText = (error: unknown, fallback: string) => (error instanceof Error && error.message ? error.message : fallback);
type Message = { severity: 'success' | 'error'; text: string } | null;

// 점검 탭(송연 loadQdocSurvey · qvOpenSheet · qvSend): 서류 고르기 · 거래처 · 점검일 → 점검표 열기 → 임시저장
export function useSurveyCheck() {
  const [forms, setForms] = useState<SurveyPickForm[]>([]);
  const [formsLoaded, setFormsLoaded] = useState(false);
  const [formId, setFormId] = useState('');
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [clientCode, setClientCode] = useState('');
  // 점검일은 쓰는 날짜라 오늘로 둔다(조회 조건이 아님, 원본과 같음)
  const [docDate, setDocDate] = useState(() => todayLocal());
  const [openMessage, setOpenMessage] = useState('');
  const [opening, setOpening] = useState(false);
  const [sheet, setSheet] = useState<FetchedSheet | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<Message>(null);

  // 쓸 서류를 불러 첫 서류를 고른다(원본 qvLoadPickList). 고른 서류가 목록에서 빠졌으면(내려둠) 첫 서류로
  const reloadForms = useCallback(async () => {
    try {
      const rows = await fetchPickForms();
      setForms(rows);
      setFormId((prev) => (rows.some((row) => String(row.id) === prev) ? prev : rows[0] ? String(rows[0].id) : ''));
    } catch (error) {
      setOpenMessage(errorText(error, '서류 목록을 불러오지 못했습니다'));
    } finally {
      setFormsLoaded(true);
    }
  }, []);

  useEffect(() => {
    void reloadForms();
  }, [reloadForms]);

  const picked = forms.find((form) => String(form.id) === formId);
  const needsClient = picked?.bindType === 'client';

  // 거래처마다 서류일 때만 거래처 목록(거래처 고르기 창)
  useEffect(() => {
    if (!needsClient || clients.length) return;
    fetchClientOptions().then(setClients).catch(() => undefined);
  }, [needsClient, clients.length]);

  const clientName = clients.find((client) => client.clientCode === clientCode)?.name ?? '';

  const show = (next: FetchedSheet) => {
    setSheet(next);
    setSaveMessage(null);
  };

  // 쓴 장을 점검 탭에서 연다(고칠 수 있게). '그 장을 열까요' 라고 묻고 보기만 되는 장을 내주면 안 된다
  const openRecord = useCallback(async (recordId: number) => {
    setOpening(true);
    try {
      show(await fetchRecordSheet(recordId));
      setOpenMessage('');
    } catch (error) {
      setOpenMessage(errorText(error, '점검표를 열지 못했습니다'));
    } finally {
      setOpening(false);
    }
  }, []);

  // [점검표 열기]: 원본 화면 검사 → 빈 장. 그 기간에 이미 쓴 장이 있으면 그 장을 연다(한 기간에 한 장)
  const open = async () => {
    if (!picked) return setOpenMessage('쓸 서류를 골라주세요.');
    if (!docDate) return setOpenMessage('점검일을 골라주세요.');
    if (needsClient && !clientCode) return setOpenMessage('점검한 거래처를 골라주세요.');
    setOpenMessage('');
    setOpening(true);
    try {
      const blank = await fetchBlankSheet(picked.id, docDate, needsClient ? clientCode : '');
      if (blank.existingId) {
        show(await fetchRecordSheet(blank.existingId));
      } else {
        show(blank);
      }
    } catch (error) {
      setSheet(null);
      setOpenMessage(errorText(error, '점검표를 열지 못했습니다'));
    } finally {
      setOpening(false);
    }
  };

  // [임시저장]. 막히면 까닭을 보이고, 그 기간에 다른 장이 생겼으면(누가 먼저 썼으면) 그 장을 열지 묻는다
  const save = async (answers: Record<number, SurveyAnswer>) => {
    if (!sheet?.formId) return;
    const target = { formId: sheet.formId, docDate: sheet.docDate, clientCode: sheet.bindType === 'client' ? sheet.clientCode ?? '' : '' };
    setSaving(true);
    try {
      const result = await saveSurveyRecord({ ...target, answers });
      setSheet((prev) => (prev ? { ...prev, recordId: result.id, status: result.status, answers } : prev));
      setSaveMessage({ severity: 'success', text: '임시저장했습니다' });
    } catch (error) {
      const text = errorText(error, '저장하지 못했습니다');
      let other: FetchedSheet | null = null;
      try {
        other = await fetchBlankSheet(target.formId, target.docDate, target.clientCode);
      } catch {
        other = null;
      }
      if (other?.existingId && other.existingId !== sheet.recordId && window.confirm(`${text}\n\n그 장을 열까요?`)) {
        await openRecord(other.existingId);
      } else {
        setSaveMessage({ severity: 'error', text });
      }
    } finally {
      setSaving(false);
    }
  };

  return {
    forms, formsLoaded, reloadForms, formId, setFormId, picked, needsClient, clients, clientCode, setClientCode, clientName,
    docDate, setDocDate, openMessage, opening, open, openRecord, sheet, saving, saveMessage, save,
  };
}

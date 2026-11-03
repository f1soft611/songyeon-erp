import { useCallback, useState } from 'react';
import { todayDash } from '../../utils/excelFile';
import { OWNER_DRAFT, OWNER_HISTORY, reviewFormError } from './screenReview';
import {
  deleteReviewFile, downloadReviewFile, fetchScreenReview, saveScreenReview, saveScreenReviewDraft, uploadReviewFiles,
} from './screenReview.service';
import type { ReviewFile, ReviewForm, ScreenReviewData } from './screenReview.types';

type Message = { text: string; ok: boolean } | null;

const errorText = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

const EMPTY: ScreenReviewData = { review: null, history: [], draft: null };

// 화면검수 버튼 · 패널 상태. 검수자는 로그인 사용자, 검수일은 오늘(서버가 넣는다). 열 때 내 임시저장을 불러온다
export function useScreenReview(screenCode: string, reviewer: string) {
  const reviewDate = todayDash();
  const [data, setData] = useState<ScreenReviewData>(EMPTY);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ReviewForm>({ status: 'NOT_STARTED', comment: '', files: [] });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<Message>(null);

  // 지금 상태를 고른 채로, 임시저장이 있으면 그 내용(의견 · 올린 첨부)을 채운다
  const fillForm = (source: ScreenReviewData) =>
    setForm({
      status: source.review?.status ?? 'NOT_STARTED',
      comment: source.draft?.comment ?? '',
      files: source.draft?.files ?? [],
    });

  const load = useCallback(async () => {
    const next = await fetchScreenReview(screenCode);
    setData(next);
    return next;
  }, [screenCode]);

  const openPanel = async () => {
    setMessage(null);
    setOpen(true);
    try {
      fillForm(await load());
    } catch (requestError) {
      setData(EMPTY);
      fillForm(EMPTY);
      setMessage({ text: errorText(requestError, '화면검수를 불러오지 못했어요'), ok: false });
    }
  };

  const changeForm = <K extends keyof ReviewForm>(key: K, value: ReviewForm[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const addFiles = (files: ReviewFile[]) => setForm((current) => ({ ...current, files: [...current.files, ...files] }));

  // 올린 임시저장 첨부는 바로 지우고, 아직 안 올린 파일은 목록에서만 뺀다
  const removeFile = async (index: number) => {
    const target = form.files[index];
    if (target?.fileId && data.draft) {
      try {
        await deleteReviewFile(OWNER_DRAFT, data.draft.draftId, target.fileId);
      } catch (requestError) {
        setMessage({ text: errorText(requestError, '첨부를 지우지 못했어요'), ok: false });
        return;
      }
    }
    setForm((current) => ({ ...current, files: current.files.filter((_item, itemIndex) => itemIndex !== index) }));
  };

  const downloadFile = (ownerType: string, ownerId: number, file: ReviewFile) => {
    downloadReviewFile(ownerType, ownerId, file).catch((requestError) =>
      setMessage({ text: errorText(requestError, '내려받지 못했어요'), ok: false }));
  };

  const uploadedMessage = (done: string, failed: string[]) =>
    failed.length > 0 ? { text: `${done}. 첨부 ${failed.length}개를 올리지 못했어요: ${failed.join(', ')}`, ok: false } : { text: done, ok: true };

  const saveDraft = async () => {
    setSaving(true);
    try {
      const draftId = await saveScreenReviewDraft(screenCode, form.comment);
      const failed = await uploadReviewFiles(OWNER_DRAFT, draftId, form.files);
      fillForm(await load());
      setMessage(uploadedMessage('임시저장했어요. 검수 상태는 바뀌지 않아요', failed));
    } catch (requestError) {
      setMessage({ text: errorText(requestError, '임시저장하지 못했어요'), ok: false });
    } finally {
      setSaving(false);
    }
  };

  const save = async () => {
    const current = data.review?.status ?? 'NOT_STARTED';
    const error = reviewFormError(form, reviewer, current);
    if (error) {
      setMessage({ text: error, ok: false });
      return;
    }
    setSaving(true);
    try {
      const historyId = await saveScreenReview(screenCode, { status: form.status, expectedStatus: current, comment: form.comment });
      // 임시저장 때 올린 첨부는 서버가 이력으로 옮긴다. 새로 고른 파일만 이력에 올린다
      const failed = await uploadReviewFiles(OWNER_HISTORY, historyId, form.files);
      fillForm(await load());
      setMessage(uploadedMessage('저장했어요', failed));
    } catch (requestError) {
      setMessage({ text: errorText(requestError, '저장하지 못했어요'), ok: false });
    } finally {
      setSaving(false);
    }
  };

  return {
    data,
    open,
    setOpen,
    openPanel,
    reviewer,
    reviewDate,
    form,
    changeForm,
    addFiles,
    removeFile,
    downloadFile,
    saving,
    message,
    setMessage,
    saveDraft,
    save,
    hasDraft: data.draft !== null,
  };
}

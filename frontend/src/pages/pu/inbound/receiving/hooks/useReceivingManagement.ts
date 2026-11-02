import { useRef, useState } from 'react';
import { downloadExcel } from '../../../../../shared/utils/excelFile';
import { cancelReceiving, fetchReceivings } from '../services/receiving.service';
import type { DeleteKind, ReceivingQuery, TabKey } from '../types/receiving.types';
import { HISTORY_EXCEL_COLUMNS, RETURN_EXCEL_COLUMNS, errorText } from '../utils/receiving';
import { useReceivingDocs } from './useReceivingDocs';
import { useReceivingHistory } from './useReceivingHistory';
import { useReceivingReturns } from './useReceivingReturns';
import { useReceivingStatus } from './useReceivingStatus';

// 입고관리 화면의 탭 네 개를 묶고, 탭을 넘나드는 일(탭 옮기기 · 입고내역 / 반품내역 [삭제] · [저장] · 등록 뒤 다시 조회)을 맡는다
export function useReceivingManagement() {
  const [tab, setTab] = useState<TabKey>('register');
  const [alertText, setAlertText] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const history = useReceivingHistory(setAlertText);
  const status = useReceivingStatus(setAlertText);
  const docs = useReceivingDocs(setAlertText);
  const returns = useReceivingReturns(setAlertText);

  // ===== 2026-10-26 입고내역 · 반품내역 [삭제] · [저장] =====
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ kind: DeleteKind; count: number } | null>(null);
  const [confirmLeave, setConfirmLeave] = useState<(() => void) | null>(null);
  // 이번에 이미 지운 줄(저장 도중 오류가 나도 또 지우지 않게)
  const deletedIdsRef = useRef<Set<number>>(new Set());
  const listOf = (kind: DeleteKind) => (kind === 'receiving' ? history : returns);
  const removedRows = (kind: DeleteKind) =>
    (listOf(kind).gridRef.current?.getChanges().deletedRows ?? []).filter((row) => !deletedIdsRef.current.has(row.id));
  const refreshDirty = (kind: DeleteKind) => listOf(kind).setDirty(removedRows(kind).length > 0);

  // 저장하지 않은 삭제가 있으면 먼저 묻고 한다([조회] · 탭 옮기기)
  const guard = (kind: DeleteKind | null, action: () => void) => {
    if (kind && removedRows(kind).length > 0) {
      setConfirmLeave(() => action);
      return;
    }
    action();
  };
  const currentKind = (): DeleteKind | null => (tab === 'register' ? 'receiving' : tab === 'return' ? 'return' : null);

  const searchHistory = () => guard('receiving', () => void history.load(history.date, history.client));
  const searchReturns = () => guard('return', () => void returns.load(returns.date, returns.client));

  const exportList = async (query: ReceivingQuery, columns: typeof HISTORY_EXCEL_COLUMNS, name: string, sheet: string) => {
    try {
      const list = await fetchReceivings(query);
      await downloadExcel(list, columns, `${name}${query.date ? `_${query.date}` : ''}.xlsx`, sheet);
    } catch (requestError) {
      setAlertText(errorText(requestError, '다운로드하지 못했어요'));
    }
  };
  const exportHistory = () => exportList({ date: history.date, kind: 'receiving' }, HISTORY_EXCEL_COLUMNS, '입고내역', '입고내역');
  const exportReturns = () => exportList({ date: returns.date, kind: 'return' }, RETURN_EXCEL_COLUMNS, '반품내역', '반품내역');

  const removeSelected = (kind: DeleteKind) => {
    const grid = listOf(kind).gridRef.current;
    if ((grid?.getSelectedRows() ?? []).length === 0) {
      setAlertText(kind === 'return' ? '지울 반품 줄을 먼저 골라주세요(줄을 누르면 골라집니다)' : '지울 입고 줄을 먼저 골라주세요(줄을 누르면 골라집니다)');
      return;
    }
    grid?.deleteSelectedRows();
  };

  const askSave = (kind: DeleteKind) => {
    const count = removedRows(kind).length;
    if (count > 0) setConfirmDelete({ kind, count });
  };

  // 뺀 줄을 차례대로 지운다(서버 규칙은 예전 [취소] 와 같다). 거절되면 거기서 멈추고 알린 뒤 다시 조회한다
  const saveAll = async (kind: DeleteKind) => {
    const targets = removedRows(kind);
    if (targets.length === 0) return;
    setSaving(true);
    try {
      for (const row of targets) {
        try {
          await cancelReceiving(row.id);
          deletedIdsRef.current.add(row.id);
        } catch (requestError) {
          setAlertText(errorText(requestError, '지우지 못했어요'));
          break;
        }
      }
      if (targets.every((row) => deletedIdsRef.current.has(row.id))) setNotice('저장되었습니다');
      // 반품을 지우면 원래 입고의 '반품된 양' 도 바뀌므로 입고내역도 다시 부른다
      if (kind === 'return') await returns.load(returns.date, returns.client);
      await history.load(history.date, history.client);
    } finally {
      setSaving(false);
    }
  };

  const confirmSave = () => {
    const target = confirmDelete;
    setConfirmDelete(null);
    if (target) void saveAll(target.kind);
  };

  const continueLeave = () => {
    const action = confirmLeave;
    setConfirmLeave(null);
    action?.();
  };

  const switchTab = (next: TabKey) => guard(currentKind(), () => {
    setTab(next);
    // 송연과 같이 탭을 열 때마다 다시 부른다
    if (next === 'instatus') void status.load();
    if (next === 'doc') void docs.load();
    if (next === 'return') void returns.load(returns.date, returns.client);
  });

  const afterReturnRegistered = (returnDate: string) => {
    returns.setDate(returnDate);
    void returns.load(returnDate, returns.client);
    void history.load(history.date, history.client);
  };

  return {
    tab,
    switchTab,
    history,
    status,
    docs,
    returns,
    searchHistory,
    searchReturns,
    exportHistory,
    exportReturns,
    afterReturnRegistered,
    refreshDirty,
    saving,
    removeSelected,
    askSave,
    confirmDelete,
    setConfirmDelete,
    confirmSave,
    confirmLeave,
    setConfirmLeave,
    continueLeave,
    alertText,
    setAlertText,
    notice,
    setNotice,
  };
}

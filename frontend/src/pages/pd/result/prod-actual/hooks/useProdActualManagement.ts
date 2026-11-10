import { useCallback, useEffect, useRef, useState } from 'react';
import type { F1GridRef } from '../../../../../shared/components/f1-grid';
import { downloadExcel, todayDash } from '../../../../../shared/utils/excelFile';
import { clientProductDetailValues, readSearchSession, saveSearchSession } from '../../../../../shared/utils/searchSession';
import { restoreBlockedGridDeletes } from '../../../../../shared/utils/gridDelete';
import { filterOrderRows } from '../../../../sales/order/order-register/utils/salesOrder';
import { fetchActualSchedule, saveActualQty } from '../services/prodActual.service';
import type { ProdActualDetailFilter, ProdActualRow } from '../types/prodActual.types';
import { ACTUAL_EXCEL_COLUMNS, actualChanges, actualSendValue, toActualRow } from '../utils/prodActual';

const NO_FILTER: ProdActualDetailFilter = { clientName: '', product: '' };
const CANCEL_GUIDE = '입고취소는 줄을 고르고 위쪽 [입고취소]를 눌러주세요';
const errorText = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

// 생산입고 화면의 조회 · 저장 · 입고취소 상태. 송연처럼 열면 오늘 것을 바로 보여준다. 마지막 요청의 응답만 쓴다
// 2026-10-30 줄의 [저장] · [수정] · [입고취소] 단추를 뺐다. 실생산량은 표에서 바로 고치고 제목줄 [저장](확인 창)으로 보내고,
// 입고취소는 줄을 고르고 제목줄 [입고취소]로 한다(S_ERP 저장 방식)
export function useProdActualManagement() {
  const gridRef = useRef<F1GridRef<ProdActualRow>>(null);
  const requestIdRef = useRef(0);
  // 2026-11-04 마지막으로 조회한 날짜 · 상세 조회 조건은 탭 세션에 두고, 다른 화면에 갔다 돌아오면 그 조건으로 다시 부른다
  const [saved] = useState(() => readSearchSession('pd-prod-actual', { date: todayDash(), filter: NO_FILTER }));
  const [date, setDate] = useState(saved.date);
  const [rows, setRows] = useState<ProdActualRow[]>([]);
  const rowsRef = useRef(rows);
  rowsRef.current = rows;
  // F1-Grid 는 받은 목록을 따로 들고 있어서, 줄 자체가 바뀌면(저장 · 입고취소) 표를 새로 그린다
  const [version, setVersion] = useState(0);
  const [loading, setLoading] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmSave, setConfirmSave] = useState<{ receives: number; updates: number } | null>(null);
  const [cancelTargets, setCancelTargets] = useState<ProdActualRow[] | null>(null);
  const [confirmLeave, setConfirmLeave] = useState<(() => void) | null>(null);
  const [alertText, setAlertText] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  // 상세 조회(⌄)로 적용한 조건. 받은 생산건 중 맞는 줄만 표에 둔다(2026-10-30)
  const detailFilterRef = useRef<ProdActualDetailFilter>(saved.filter);

  const commit = (next: ProdActualRow[]) => {
    rowsRef.current = next;
    setRows(next);
    setVersion((v) => v + 1);
  };
  // 표 안에서 친 값을 목록으로 되받아 온다
  const pull = (): ProdActualRow[] => gridRef.current?.getActiveRows() ?? rowsRef.current;

  const loadRows = useCallback(async (day: string) => {
    if (!day) {
      setError('조회할 날짜를 먼저 선택해주세요');
      return;
    }
    saveSearchSession('pd-prod-actual', { date: day, filter: detailFilterRef.current });
    const requestId = ++requestIdRef.current;
    setLoading(true);
    try {
      const records = await fetchActualSchedule(day);
      if (requestId !== requestIdRef.current) return;
      setDirty(false);
      commit(filterOrderRows(records.map(toActualRow), detailFilterRef.current));
    } catch (requestError) {
      if (requestId === requestIdRef.current) setError(errorText(requestError, '생산입고 목록을 불러오지 못했습니다.'));
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRows(saved.date);
  }, [loadRows, saved]);

  // 저장하지 않은 실생산량이 있으면 먼저 묻고 한다([조회] · 상세 조회)
  const hasChanges = () => {
    const { receives, updates, cleared } = actualChanges(pull());
    return receives.length + updates.length + cleared.length > 0;
  };
  const guard = (action: () => void) => {
    if (hasChanges()) {
      setConfirmLeave(() => action);
      return;
    }
    action();
  };
  const search = () => guard(() => void loadRows(date));
  // 상세 조회(⌄) [조회]: 조건을 적용해 그 날짜 것을 다시 받는다
  const applyDetailFilter = (filter: ProdActualDetailFilter) => guard(() => {
    detailFilterRef.current = filter;
    void loadRows(date);
  });

  // 표가 바뀌면: Delete 키로 줄을 지웠으면 되살리고(이 화면은 줄을 지우지 않는다), 아니면 [저장]을 켜고 끈다
  const handleGridChanges = () => {
    if (restoreBlockedGridDeletes(gridRef.current, false, () => false).length > 0) {
      setAlertText(`줄은 지울 수 없어요. ${CANCEL_GUIDE}`);
      return;
    }
    setDirty(hasChanges());
  };

  // 제목줄 [저장]: 비운 줄이 있으면 [입고취소]로 안내하고, 아니면 건수를 보여 주고 묻는다
  const askSave = () => {
    const { receives, updates, cleared } = actualChanges(pull());
    if (cleared.length > 0) {
      setAlertText(`저장된 실생산량을 비운 줄이 있어요. ${CANCEL_GUIDE}`);
      return;
    }
    if (receives.length + updates.length === 0) return;
    setConfirmSave({ receives: receives.length, updates: updates.length });
  };

  // 입고 · 수정 줄을 차례로 보낸다(제품 재고 · 원장 · 필름/파우치가 함께 움직인다). 거절되면 거기서 멈추고 알린다. 끝나면 다시 조회한다
  const saveAll = async () => {
    setConfirmSave(null);
    const { receives, updates } = actualChanges(pull());
    const targets = [...receives, ...updates];
    if (targets.length === 0) return;
    setSaving(true);
    try {
      for (const row of targets) {
        try {
          await saveActualQty(row.id, actualSendValue(row));
        } catch (requestError) {
          setAlertText(errorText(requestError, '저장하지 못했어요'));
          await loadRows(date);
          return;
        }
      }
      await loadRows(date);
      setNotice('저장되었습니다 — 제품 재고에 반영했어요');
    } finally {
      setSaving(false);
    }
  };

  // 제목줄 [입고취소]: 고른 줄 중 실생산량이 저장된 줄만 취소한다
  const askCancel = () => {
    const picked = gridRef.current?.getSelectedRows() ?? [];
    if (picked.length === 0) {
      setAlertText('입고취소할 줄을 먼저 골라주세요(줄을 누르면 골라집니다)');
      return;
    }
    if (picked.some((row) => !row.saved)) {
      setAlertText('실생산량이 저장되지 않은 줄은 입고취소할 수 없어요');
      return;
    }
    setCancelTargets(picked);
  };

  // 실생산량을 지우고 재고를 되돌린다. 다른 줄에 적던 값은 그대로 둔다
  const cancelSelected = async () => {
    const targets = cancelTargets ?? [];
    setCancelTargets(null);
    if (targets.length === 0) return;
    setSaving(true);
    const done = new Set<number>();
    try {
      for (const row of targets) {
        try {
          await saveActualQty(row.id, '');
          done.add(row.id);
        } catch (requestError) {
          setAlertText(errorText(requestError, '입고취소하지 못했어요'));
          break;
        }
      }
    } finally {
      if (done.size > 0) {
        commit(pull().map((row) => (done.has(row.id) ? { ...row, actualQty: null, input: '', saved: '' } : row)));
        setNotice(`입고취소했습니다 (${done.size}건) — 제품 재고를 되돌렸어요`);
      }
      setSaving(false);
    }
  };

  // 송연 엑셀: 그 날짜 것을 서버에서 다시 받는다
  const exportExcel = async () => {
    if (!date) {
      setError('조회할 날짜를 먼저 선택해주세요');
      return;
    }
    try {
      const list = await fetchActualSchedule(date);
      if (list.length === 0) {
        setAlertText('다운로드할 데이터가 없어요');
        return;
      }
      await downloadExcel(list, ACTUAL_EXCEL_COLUMNS, `생산입고_${date}.xlsx`, '생산입고');
    } catch (requestError) {
      setError(errorText(requestError, '다운로드하지 못했어요'));
    }
  };

  return {
    savedDetailValues: clientProductDetailValues(saved.filter),
    gridRef,
    date,
    setDate,
    rows,
    version,
    loading,
    search,
    applyDetailFilter,
    handleGridChanges,
    dirty,
    saving,
    askSave,
    confirmSave,
    setConfirmSave,
    saveAll,
    askCancel,
    cancelTargets,
    setCancelTargets,
    cancelSelected,
    confirmLeave,
    setConfirmLeave,
    exportExcel,
    alertText,
    setAlertText,
    error,
    setError,
    notice,
    setNotice,
  };
}

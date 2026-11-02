import { useCallback, useEffect, useRef, useState } from 'react';
import type { F1GridRef } from '../../../../../shared/components/f1-grid';
import { downloadExcel } from '../../../../../shared/utils/excelFile';
import { restoreBlockedGridDeletes } from '../../../../../shared/utils/gridDelete';
import { deleteSale, fetchSalesStatus } from '../services/salesStatus.service';
import { SALES_STATUS_EXCEL_COLUMNS, statusSummary, todayFileTag, type SaleRow, type SalesQuery } from '../utils/salesStatus';

const errorText = (error: unknown, fallback: string) =>
  (error instanceof Error && error.message ? error.message : fallback);

// 판매현황 조회 · 삭제 · 엑셀. 판매는 고치는 기능이 없어서 [저장] 은 지우기만 한다
export function useSalesStatusManagement(initialQuery: SalesQuery, canDelete: boolean) {
  const gridRef = useRef<F1GridRef<SaleRow>>(null);
  const requestIdRef = useRef(0);
  const queryRef = useRef(initialQuery);
  // 이번에 이미 지운 판매(저장 도중 오류가 나도 또 지우지 않게)
  const deletedIdsRef = useRef<Set<number>>(new Set());
  const [rows, setRows] = useState<SaleRow[]>([]);
  const [summary, setSummary] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [gridKey, setGridKey] = useState(0); // 다시 조회하면 표를 새로 그려 표의 '지운 줄' 기록도 비운다
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(0);
  const [confirmLeave, setConfirmLeave] = useState<(() => void) | null>(null);
  const [alertText, setAlertText] = useState<string | null>(null);
  const [notice, setNotice] = useState('');

  const loadRows = useCallback(async (query: SalesQuery = queryRef.current) => {
    queryRef.current = query;
    const requestId = ++requestIdRef.current;
    setLoading(true);
    try {
      const data = await fetchSalesStatus(query);
      if (requestId !== requestIdRef.current) return;
      setRows(data.rows);
      setSummary(statusSummary(data));
      setLoaded(true);
      deletedIdsRef.current = new Set();
      setDirty(false);
      setGridKey((current) => current + 1);
    } catch (requestError) {
      if (requestId === requestIdRef.current) setAlertText(errorText(requestError, '불러오지 못했어요'));
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  // 표에서 뺀 판매([삭제] · 오른쪽 클릭 [행 삭제] · Delete 키). [저장] 때 서버에서 지운다
  const removedRows = () => (gridRef.current?.getChanges().deletedRows ?? []).filter((row) => !deletedIdsRef.current.has(row.id));

  // F1-Grid 는 Delete 키에서 [행 삭제] 막기를 보지 않아, 삭제 권한이 없으면 지운 줄을 되살리고 알린다
  const handleGridChanges = () => {
    if (restoreBlockedGridDeletes(gridRef.current, canDelete, () => true).length > 0) {
      setAlertText('삭제 권한이 없어요');
      return;
    }
    setDirty(removedRows().length > 0);
  };

  // 저장하지 않은 삭제가 있으면 먼저 묻고 한다
  const guard = (action: () => void) => {
    if (removedRows().length > 0) {
      setConfirmLeave(() => action);
      return;
    }
    action();
  };
  const continueLeave = () => {
    const action = confirmLeave;
    setConfirmLeave(null);
    action?.();
  };

  const removeSelected = () => {
    if ((gridRef.current?.getSelectedRows() ?? []).length === 0) {
      setAlertText('지울 판매 줄을 먼저 골라주세요(줄을 누르면 골라집니다)');
      return;
    }
    gridRef.current?.deleteSelectedRows();
  };

  const askSave = () => {
    const count = removedRows().length;
    if (count > 0) setConfirmDelete(count);
  };

  // 뺀 줄을 차례대로 지운다. 거절되면 거기서 멈추고 알린 뒤 다시 조회한다(앞에서 지운 줄은 지워진 채로)
  const saveAll = async () => {
    const targets = removedRows();
    if (targets.length === 0) return;
    setSaving(true);
    try {
      for (const row of targets) {
        try {
          await deleteSale(row.id);
          deletedIdsRef.current.add(row.id);
        } catch (requestError) {
          setAlertText(errorText(requestError, '지우지 못했어요'));
          await loadRows();
          return;
        }
      }
      setNotice('저장되었습니다');
      await loadRows();
    } finally {
      setSaving(false);
    }
  };

  // 송연과 같이 지금 화면에 불러온 것을 내려받는다
  const exportExcel = async () => {
    if (rows.length === 0) {
      setAlertText('내려받을 자료가 없습니다');
      return;
    }
    await downloadExcel(rows, SALES_STATUS_EXCEL_COLUMNS, `판매현황_${todayFileTag()}.xlsx`, '판매현황');
  };

  return {
    gridRef, rows, summary, loaded, loading, gridKey, dirty, saving,
    confirmDelete, setConfirmDelete, confirmLeave, setConfirmLeave, continueLeave,
    alertText, setAlertText, notice, setNotice,
    loadRows, guard, handleGridChanges, removeSelected, askSave, saveAll, exportExcel,
  };
}

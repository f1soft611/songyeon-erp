import { useCallback, useEffect, useMemo, useState } from 'react';
import { downloadExcel, todayDash } from '../../../../../shared/utils/excelFile';
import { cancelAllSchedule, cancelSchedule, confirmSchedule, fetchMaterialHistory, fetchSchedule } from '../services/stockAdjust.service';
import type { Ask, StockSchedule } from '../types/stockAdjust.types';
import {
  CANCEL_ALL_QUESTION, DATE_REQUIRED, MATERIAL_HISTORY_EXCEL_COLUMNS, NOTE_REQUIRED, confirmQuestion, confirmedMessage, historyTree, warehouseTotals,
} from '../utils/stockAdjust';

const errorText = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

// 원재료 재고조정 탭의 예정 목록 · 확정 · 적용 내역 상태
export function useMaterialAdjust(refreshKey: number, warehouses: string[]) {
  const [schedule, setSchedule] = useState<StockSchedule[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [confirmDate, setConfirmDate] = useState(() => todayDash());
  const [note, setNote] = useState('');
  const [editing, setEditing] = useState<StockSchedule | null>(null);
  const [historyStart, setHistoryStart] = useState('');
  const [historyEnd, setHistoryEnd] = useState('');
  const [history, setHistory] = useState<StockSchedule[] | null>(null);
  const [treeVersion, setTreeVersion] = useState(0);
  const [alertText, setAlertText] = useState<string | null>(null);
  const [ask, setAsk] = useState<Ask>(null);

  const loadSchedule = useCallback(async () => {
    try {
      setSchedule(await fetchSchedule('materials'));
      setLoaded(true);
    } catch (requestError) {
      setAlertText(errorText(requestError, '예정된 재고조정을 불러오지 못했어요'));
    }
  }, []);

  const loadHistory = useCallback(async (start: string, end: string) => {
    try {
      setHistory(await fetchMaterialHistory(start, end));
      setTreeVersion((v) => v + 1);
    } catch (requestError) {
      setAlertText(errorText(requestError, '재고조정 내역을 불러오지 못했어요'));
    }
  }, []);

  useEffect(() => {
    void loadSchedule();
  }, [loadSchedule, refreshKey]);
  useEffect(() => {
    void loadHistory('', '');
  }, [loadHistory]);

  // 사유 없이 재고를 바꾸면 나중에 왜 바뀌었는지 되짚을 수 없다
  const confirm = () => {
    if (!confirmDate) {
      setAlertText(DATE_REQUIRED);
      return;
    }
    if (!note.trim()) {
      setAlertText(NOTE_REQUIRED);
      return;
    }
    setAsk({
      text: confirmQuestion(confirmDate, note.trim()),
      action: async () => {
        try {
          const result = await confirmSchedule('materials', confirmDate, note.trim());
          setAlertText(confirmedMessage(result));
          setNote('');
          void loadSchedule();
          void loadHistory(historyStart, historyEnd);
        } catch (requestError) {
          setAlertText(errorText(requestError, '확정에 실패했어요'));
        }
      },
    });
  };

  const cancelAll = () => setAsk({
    text: CANCEL_ALL_QUESTION,
    action: async () => {
      try {
        const n = await cancelAllSchedule('materials');
        setAlertText(`${n}건 취소완료`);
        void loadSchedule();
      } catch (requestError) {
        setAlertText(errorText(requestError, '취소에 실패했어요'));
      }
    },
  });

  const cancelOne = useCallback(async (row: StockSchedule) => {
    try {
      await cancelSchedule('materials', row.id);
      void loadSchedule();
    } catch (requestError) {
      setAlertText(errorText(requestError, '취소에 실패했어요'));
    }
  }, [loadSchedule]);

  const exportHistory = async () => {
    try {
      await downloadExcel(await fetchMaterialHistory(historyStart, historyEnd), MATERIAL_HISTORY_EXCEL_COLUMNS, '재고조정내역.xlsx', '재고조정내역');
    } catch (requestError) {
      setAlertText(errorText(requestError, '다운로드하지 못했어요'));
    }
  };

  // 묻는 창의 [확인]: 창을 닫고 맡겨둔 일을 한다
  const runAsk = () => {
    const action = ask?.action;
    setAsk(null);
    action?.();
  };

  const totals = useMemo(() => warehouseTotals(schedule, warehouses), [schedule, warehouses]);
  const historyRows = useMemo(() => historyTree(history ?? []), [history]);

  return {
    schedule,
    loaded,
    loadSchedule,
    confirmDate,
    setConfirmDate,
    note,
    setNote,
    editing,
    setEditing,
    historyStart,
    setHistoryStart,
    historyEnd,
    setHistoryEnd,
    history,
    historyRows,
    treeVersion,
    loadHistory,
    confirm,
    cancelAll,
    cancelOne,
    exportHistory,
    totals,
    ask,
    setAsk,
    runAsk,
    alertText,
    setAlertText,
  };
}

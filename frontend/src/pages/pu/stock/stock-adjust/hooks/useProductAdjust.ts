import { useCallback, useEffect, useMemo, useState } from 'react';
import { downloadExcel, readExcelValues, todayDash } from '../../../../../shared/utils/excelFile';
import { cancelAllSchedule, cancelSchedule, confirmSchedule, fetchProductHistory, fetchSchedule, uploadStock } from '../services/stockAdjust.service';
import type { Ask, ProductHistoryQuery, ProductHistoryRow, ProductMovement, StockSchedule, UploadMessage } from '../types/stockAdjust.types';
import {
  CANCEL_ALL_QUESTION, DATE_REQUIRED, PRODUCT_HISTORY_EXCEL_COLUMNS, confirmQuestion, confirmedMessage, filterByProduct, productUploadMessage, toUploadRows,
} from '../utils/stockAdjust';

const errorText = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

// 제품 재고조정 탭의 업로드 · 예정 목록 · 확정 · 입출고 내역 상태
export function useProductAdjust() {
  const [schedule, setSchedule] = useState<StockSchedule[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<UploadMessage>(null);
  const [confirmDate, setConfirmDate] = useState(() => todayDash());
  const [editing, setEditing] = useState<StockSchedule | null>(null);
  const [historyQuery, setHistoryQuery] = useState<ProductHistoryQuery>({ start: '', end: '', kind: '', product: '' });
  const [history, setHistory] = useState<ProductMovement[] | null>(null);
  const [alertText, setAlertText] = useState<string | null>(null);
  const [ask, setAsk] = useState<Ask>(null);

  const loadSchedule = useCallback(async () => {
    try {
      setSchedule(await fetchSchedule('products'));
      setLoaded(true);
    } catch (requestError) {
      setAlertText(errorText(requestError, '예정된 재고조정을 불러오지 못했어요'));
    }
  }, []);

  const fetchHistory = useCallback(async (query: ProductHistoryQuery) =>
    filterByProduct(await fetchProductHistory(query.start, query.end, query.kind), query.product), []);

  const loadHistory = useCallback(async (query: ProductHistoryQuery) => {
    try {
      setHistory(await fetchHistory(query));
    } catch (requestError) {
      setAlertText(errorText(requestError, '입출고 내역을 불러오지 못했어요'));
    }
  }, [fetchHistory]);

  useEffect(() => {
    void loadSchedule();
    void loadHistory({ start: '', end: '', kind: '', product: '' });
  }, [loadSchedule, loadHistory]);

  const upload = async (file: File) => {
    setUploadMessage({ text: '올리는 중...', ok: null });
    try {
      let rows: string[][];
      try {
        rows = toUploadRows(await readExcelValues(file));
      } catch {
        throw new Error('엑셀 파일을 읽을 수 없습니다');
      }
      setUploadMessage({ text: productUploadMessage(await uploadStock('products', rows)), ok: true });
      void loadSchedule();
    } catch (requestError) {
      setUploadMessage({ text: errorText(requestError, '업로드에 실패했어요'), ok: false });
    }
  };

  const confirm = () => {
    if (!confirmDate) {
      setAlertText(DATE_REQUIRED);
      return;
    }
    setAsk({
      text: confirmQuestion(confirmDate),
      action: async () => {
        try {
          setAlertText(confirmedMessage(await confirmSchedule('products', confirmDate)));
          void loadSchedule();
          void loadHistory(historyQuery);
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
        setAlertText(`${await cancelAllSchedule('products')}건 취소완료`);
        void loadSchedule();
      } catch (requestError) {
        setAlertText(errorText(requestError, '취소에 실패했어요'));
      }
    },
  });

  const cancelOne = useCallback(async (row: StockSchedule) => {
    try {
      await cancelSchedule('products', row.id);
      void loadSchedule();
    } catch (requestError) {
      setAlertText(errorText(requestError, '취소에 실패했어요'));
    }
  }, [loadSchedule]);

  const exportHistory = async () => {
    try {
      await downloadExcel(await fetchHistory(historyQuery), PRODUCT_HISTORY_EXCEL_COLUMNS, '제품입출고내역.xlsx', '제품입출고내역');
    } catch (requestError) {
      setAlertText(errorText(requestError, '다운로드하지 못했어요'));
    }
  };

  const changeQuery = (key: keyof ProductHistoryQuery) => (event: { target: { value: string } }) =>
    setHistoryQuery((current) => ({ ...current, [key]: event.target.value }));

  // 송연과 같이 고르면 바로 다시 부른다
  const changeKind = (kind: string) => {
    const next = { ...historyQuery, kind };
    setHistoryQuery(next);
    void loadHistory(next);
  };

  const searchHistory = () => void loadHistory(historyQuery);

  // 묻는 창의 [확인]: 창을 닫고 맡겨둔 일을 한다
  const runAsk = () => {
    const action = ask?.action;
    setAsk(null);
    action?.();
  };

  const historyRows = useMemo<ProductHistoryRow[]>(() => (history ?? []).map((row, i) => ({ ...row, key: i + 1 })), [history]);

  return {
    schedule,
    loaded,
    loadSchedule,
    uploadMessage,
    upload,
    confirmDate,
    setConfirmDate,
    editing,
    setEditing,
    historyQuery,
    changeQuery,
    changeKind,
    history,
    historyRows,
    searchHistory,
    confirm,
    cancelAll,
    cancelOne,
    exportHistory,
    ask,
    setAsk,
    runAsk,
    alertText,
    setAlertText,
  };
}

import { useCallback, useRef, useState } from 'react';
import type { LabelPrintTarget } from '../../../../../shared/components/LabelPrintDialog';
import { todayDash } from '../../../../../shared/utils/excelFile';
import { fetchLabelPrintRows } from '../services/labelPrint.service';
import type { LabelPrintRow } from '../types/labelPrint.types';

const errorText = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

// 라벨출력 화면의 조회 · 인쇄 상태. 날짜는 송연처럼 오늘로 채워 두고, [조회] 를 눌러야 불러온다(송연도 처음엔 빈 표).
// 마지막 요청의 응답만 쓴다
export function useLabelPrintManagement() {
  const requestIdRef = useRef(0);
  const [date, setDate] = useState(() => todayDash());
  const [rows, setRows] = useState<LabelPrintRow[]>([]);
  const [searchedDate, setSearchedDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [printing, setPrinting] = useState<LabelPrintTarget | null>(null);
  const [error, setError] = useState('');

  const loadRows = async () => {
    // 날짜를 비우고 조회하면 오늘로 채운다(송연과 같음)
    const day = date || todayDash();
    if (!date) setDate(day);
    const requestId = ++requestIdRef.current;
    setLoading(true);
    try {
      const records = await fetchLabelPrintRows(day);
      if (requestId !== requestIdRef.current) return;
      setRows(records);
      setSearchedDate(day);
    } catch (requestError) {
      if (requestId === requestIdRef.current) setError(errorText(requestError, '조회에 실패했어요'));
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  };

  // 🏷️ 인쇄: 라벨등록과 같은 라벨 창을 인쇄 전용으로 연다(제조년월일 = 조회한 날짜)
  const openPrint = useCallback((row: LabelPrintRow) => {
    if (row.productCode) setPrinting({ code: row.productCode, name: row.productName || '', mfgDate: searchedDate });
  }, [searchedDate]);

  return {
    date,
    setDate,
    rows,
    searchedDate,
    loading,
    loadRows,
    printing,
    openPrint,
    closePrint: () => setPrinting(null),
    error,
    setError,
  };
}

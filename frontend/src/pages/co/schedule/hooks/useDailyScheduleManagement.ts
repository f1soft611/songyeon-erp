import { useCallback, useEffect, useRef, useState } from 'react';
import { downloadExcel, todayDash, type ExcelColumn } from '../../../../shared/utils/excelFile';

const errorText = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

// 생산스케줄 · 물류스케줄의 조회 상태(S_ERP 품목관리 useMaterialManagement 와 같은 역할). 보기 전용이라 저장은 없다.
// 열면 오늘 것을 받고, 그 뒤로는 고른 날짜로 다시 받는다
export function useDailyScheduleManagement<T>(load: (date: string) => Promise<T[]>) {
  const [rows, setRows] = useState<T[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const requestIdRef = useRef(0);

  // 마지막 조회의 응답만 쓴다(날짜를 빠르게 바꿔 조회해도 순서가 뒤바뀌지 않게)
  const loadRows = useCallback(async (date: string) => {
    if (!date) {
      setError('조회할 날짜를 먼저 선택해주세요');
      return;
    }
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError('');
    try {
      const result = await load(date);
      if (requestId === requestIdRef.current) setRows(result);
    } catch (loadError) {
      if (requestId === requestIdRef.current) setError(errorText(loadError, '목록을 불러오지 못했습니다.'));
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [load]);

  useEffect(() => {
    void loadRows(todayDash());
  }, [loadRows]);

  // 송연 엑셀: 내려받을 때 그 날짜를 서버에서 다시 받는다(날짜를 바꾸고 조회를 안 눌렀을 수 있다).
  // 칸은 송연 엑셀과 같다(표 칸과 다르다: 생산량은 실생산량 우선, 물류 상태는 출하완료/출하대기)
  const exportExcel = useCallback(async (date: string, columns: ExcelColumn<T>[], name: string) => {
    if (!date) {
      setError('조회할 날짜를 먼저 선택해주세요');
      return;
    }
    try {
      const list = await load(date);
      if (list.length === 0) {
        setError('다운로드할 데이터가 없어요');
        return;
      }
      await downloadExcel(list, columns, `${name}_${date}.xlsx`, name);
    } catch (exportError) {
      setError(errorText(exportError, '다운로드하지 못했어요'));
    }
  }, [load]);

  return {
    rows,
    error,
    setError,
    loading,
    reload: loadRows,
    exportExcel,
  };
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { downloadExcel } from '../../../../../shared/utils/excelFile';
import { todayFileTag, type SalesQuery } from '../../sales-status/utils/salesStatus';
import { fetchSalesTotal } from '../services/salesTotal.service';
import {
  SALES_TOTAL_EXCEL_COLUMNS, filterDirection, noPriceWarning, shownTotals, toTotalRows, type DirectionFilter, type TotalRow,
} from '../utils/salesTotal';

const errorText = (error: unknown, fallback: string) =>
  (error instanceof Error && error.message ? error.message : fallback);

// 토탈집계 조회 · 엑셀. 조회만 하는 화면이다. 입고 · 출고 거르기는 받은 목록을 화면에서 거른다
export function useSalesTotalManagement(initialQuery: SalesQuery) {
  const requestIdRef = useRef(0);
  const queryRef = useRef(initialQuery);
  const [direction, setDirection] = useState<DirectionFilter>('');
  const [rows, setRows] = useState<TotalRow[] | null>(null); // null = 아직 안 불러옴
  const [loading, setLoading] = useState(false);
  const [alertText, setAlertText] = useState<string | null>(null);

  const loadRows = useCallback(async (query: SalesQuery = queryRef.current) => {
    queryRef.current = query;
    const requestId = ++requestIdRef.current;
    setLoading(true);
    try {
      const data = await fetchSalesTotal(query);
      if (requestId !== requestIdRef.current) return;
      setRows(toTotalRows(data.rows));
    } catch (requestError) {
      if (requestId === requestIdRef.current) setAlertText(errorText(requestError, '불러오지 못했어요'));
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  const visible = useMemo(() => filterDirection(rows ?? [], direction), [rows, direction]);
  const shown = shownTotals(visible);

  // 화면에 보이는 것만 내려받는다. '입고만' 걸어놓고 받았는데 출고까지 딸려오면 화면과 다르다고 여긴다
  const exportExcel = async () => {
    if (visible.length === 0) {
      setAlertText('내려받을 자료가 없습니다');
      return;
    }
    await downloadExcel(visible, SALES_TOTAL_EXCEL_COLUMNS, `토탈집계_${todayFileTag()}.xlsx`, '토탈집계');
  };

  return {
    loaded: rows !== null, visible, shown, warning: noPriceWarning(shown.noPrice), loading,
    alertText, setAlertText, setDirection, loadRows, exportExcel,
  };
}

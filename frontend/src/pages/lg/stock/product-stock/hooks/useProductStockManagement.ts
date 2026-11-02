import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { downloadExcel, todayDash } from '../../../../../shared/utils/excelFile';
import { fetchLots, fetchStock, fetchStockAsOf } from '../services/productStock.service';
import type { LotRecord, LotState, StockRow, StockSort } from '../types/productStock.types';
import { flattenLots, STOCK_EXCEL_COLUMNS } from '../utils/productStock';

const errorText = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

// 제품재고관리 화면의 조회 · 로트 펼치기 · 엑셀 상태. 열면 바로 목록을 불러온다. 마지막 요청의 응답만 쓴다
export function useProductStockManagement() {
  const requestIdRef = useRef(0);
  const [exportDate, setExportDate] = useState(() => todayDash());
  const [search, setSearch] = useState('');
  const [client, setClient] = useState('');
  const [sort, setSort] = useState<StockSort>('name-asc');
  const [rows, setRows] = useState<StockRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lots, setLotsState] = useState<LotState>({}); // 펼친 줄(제품코드)과 그 로트
  const lotsRef = useRef(lots); // 전체 로트보기처럼 여러 줄을 한꺼번에 펼칠 때 지금 펼친 줄을 바로 알아야 한다
  const setLots = useCallback((next: LotState) => {
    lotsRef.current = next;
    setLotsState(next);
  }, []);
  const [allExpanded, setAllExpanded] = useState(false);
  const [valueOpen, setValueOpen] = useState(false);
  const [alertText, setAlertText] = useState<string | null>(null);
  const [error, setError] = useState('');

  const loadRows = useCallback(async (q: string, clientName: string, order: StockSort) => {
    const requestId = ++requestIdRef.current;
    setAllExpanded(false);
    setLots({});
    setLoading(true);
    try {
      const list = await fetchStock(q, clientName, order);
      if (requestId !== requestIdRef.current) return;
      setRows(list);
    } catch (requestError) {
      if (requestId !== requestIdRef.current) return;
      setRows([]);
      setError(errorText(requestError, '제품재고를 불러오지 못했습니다.'));
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
        setLoaded(true);
      }
    }
  }, [setLots]);

  useEffect(() => {
    void loadRows('', '', 'name-asc');
  }, [loadRows]);

  const reload = () => void loadRows(search, client, sort);
  // 상세 조회(⌄) [조회]: 거래처 · 정렬을 적용해 다시 받는다(정렬을 비우면 품목명 오름차순)
  const applyDetail = (clientName: string, order: StockSort | '') => {
    const nextSort = order || 'name-asc';
    setClient(clientName);
    setSort(nextSort);
    void loadRows(search, clientName, nextSort);
  };

  // 이미 펼친 줄은 다시 부르지 않는다
  const openLot = useCallback(async (code: string) => {
    if (code in lotsRef.current) return;
    setLots({ ...lotsRef.current, [code]: 'loading' });
    const list = await fetchLots(code).catch(() => [] as LotRecord[]);
    // 기다리는 사이 접었으면 그대로 둔다
    if (code in lotsRef.current) setLots({ ...lotsRef.current, [code]: list });
  }, [setLots]);

  const closeLot = useCallback((code: string) => {
    const next = { ...lotsRef.current };
    delete next[code];
    setLots(next);
  }, [setLots]);

  const toggleAll = async () => {
    if (rows.length === 0) return;
    const expand = !allExpanded;
    setAllExpanded(expand);
    if (expand) await Promise.all(rows.map((row) => openLot(row.code)));
    else setLots({});
  };

  // 송연 엑셀: 기준일(비우면 오늘) 기준 재고를 서버에서 다시 받는다
  const exportExcel = async () => {
    try {
      const data = await fetchStockAsOf(exportDate);
      if (data.products.length === 0) {
        setAlertText('다운로드할 데이터가 없어요');
        return;
      }
      await downloadExcel(data.products, STOCK_EXCEL_COLUMNS, `제품재고_${data.date}.xlsx`, '제품재고');
    } catch {
      setAlertText('재고 조회에 실패했어요');
    }
  };

  // 아래 로트 표: 펼친 품목(목록 순서대로)의 로트
  const lotRows = useMemo(() => flattenLots(rows, lots), [rows, lots]);
  const openRows = rows.filter((row) => row.code in lots);
  const loadingLots = openRows.some((row) => lots[row.code] === 'loading');
  const noLotRows = openRows.filter((row) => Array.isArray(lots[row.code]) && (lots[row.code] as LotRecord[]).length === 0);

  return {
    exportDate,
    setExportDate,
    search,
    setSearch,
    rows,
    loaded,
    loading,
    reload,
    applyDetail,
    lots,
    openLot,
    closeLot,
    allExpanded,
    toggleAll,
    lotRows,
    openRows,
    loadingLots,
    noLotRows,
    exportExcel,
    valueOpen,
    setValueOpen,
    alertText,
    setAlertText,
    error,
    setError,
  };
}

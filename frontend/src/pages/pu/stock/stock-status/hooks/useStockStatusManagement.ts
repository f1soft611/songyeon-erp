import { useCallback, useEffect, useMemo, useState } from 'react';
import { downloadExcel, todayDash } from '../../../../../shared/utils/excelFile';
import { readSearchSession, saveSearchSession } from '../../../../../shared/utils/searchSession';
import { fetchStockStatus } from '../services/stockStatus.service';
import type { StockStatusGridRow, StockStatusKind, StockStatusRow } from '../types/stockStatus.types';
import { excelColumns, splitWarehouses, visibleRows, visibleTotal, warehouseQty } from '../utils/stockStatus';

const errorText = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

// 재고현황 화면의 조회 · 탭 · 로트 펼침 · 엑셀 상태
export function useStockStatusManagement() {
  // 2026-11-04 마지막으로 조회한 기준일과 탭 · 검색어 · '재고 있는 것만'은 탭 세션에 두고, 다른 화면에 갔다 돌아오면 그대로 다시 연다
  const [initial] = useState(() =>
    readSearchSession('pu-stock-status', { date: todayDash(), kind: 'material' as StockStatusKind, query: '', nonzero: true }));
  const [kind, setKind] = useState<StockStatusKind>(initial.kind);
  const [date, setDate] = useState(initial.date);
  const [appliedDate, setAppliedDate] = useState(initial.date);
  const [query, setQuery] = useState(initial.query);
  const [nonzero, setNonzero] = useState(initial.nonzero);
  const [rows, setRows] = useState<StockStatusRow[]>([]);
  const [warehouses, setWarehouses] = useState<string[]>([]);
  const [loadedDate, setLoadedDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [openCode, setOpenCode] = useState<string | null>(null);
  const [alertText, setAlertText] = useState<string | null>(null);

  const load = useCallback(async (day: string) => {
    if (!day) {
      setAlertText('기준일을 선택해주세요');
      return;
    }
    setAppliedDate(day);
    setLoading(true);
    try {
      const data = await fetchStockStatus(day);
      setRows(data.materials ?? []);
      setWarehouses(splitWarehouses(data.warehouses));
      setLoadedDate(data.date || day);
      setOpenCode(null);
    } catch (requestError) {
      setAlertText(errorText(requestError, '조회에 실패했어요'));
    } finally {
      setLoading(false);
    }
  }, []);

  // 화면을 열면 오늘 기준으로 바로 조회(송연 03-shell.js)
  useEffect(() => {
    void load(initial.date);
  }, [load, initial]);

  useEffect(() => {
    saveSearchSession('pu-stock-status', { date: appliedDate, kind, query, nonzero });
  }, [appliedDate, kind, query, nonzero]);

  const search = () => void load(date);

  const shown = useMemo(() => visibleRows(rows, kind, query, nonzero), [rows, kind, query, nonzero]);
  const gridRows = useMemo<StockStatusGridRow[]>(
    () => shown.map((m) => ({ ...m, ...Object.fromEntries(warehouses.map((n, i) => [`w${i}`, warehouseQty(m, n)])) })),
    [shown, warehouses],
  );
  const total = visibleTotal(shown);
  const openRow = openCode ? shown.find((m) => m.code === openCode) : undefined;

  const toggle = useCallback((code: string) => setOpenCode((current) => (current === code ? null : code)), []);

  const switchKind = (value: StockStatusKind) => {
    setKind(value);
    setOpenCode(null);
  };

  const exportExcel = async () => {
    if (shown.length === 0) {
      setAlertText('내려받을 내역이 없어요');
      return;
    }
    await downloadExcel(shown, excelColumns(warehouses), `재고현황_${loadedDate || date}.xlsx`, '재고현황');
  };

  return {
    kind,
    switchKind,
    date,
    setDate,
    query,
    setQuery,
    nonzero,
    setNonzero,
    warehouses,
    loadedDate,
    loading,
    search,
    gridRows,
    total,
    openCode,
    setOpenCode,
    openRow,
    toggle,
    exportExcel,
    alertText,
    setAlertText,
  };
}

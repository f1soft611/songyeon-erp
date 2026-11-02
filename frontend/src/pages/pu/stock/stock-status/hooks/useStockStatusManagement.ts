import { useCallback, useEffect, useMemo, useState } from 'react';
import { downloadExcel, todayDash } from '../../../../../shared/utils/excelFile';
import { fetchStockStatus } from '../services/stockStatus.service';
import type { StockStatusGridRow, StockStatusKind, StockStatusRow } from '../types/stockStatus.types';
import { excelColumns, splitWarehouses, visibleRows, visibleTotal, warehouseQty } from '../utils/stockStatus';

const errorText = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

// 재고현황 화면의 조회 · 탭 · 로트 펼침 · 엑셀 상태
export function useStockStatusManagement() {
  const [kind, setKind] = useState<StockStatusKind>('material');
  const [date, setDate] = useState(() => todayDash());
  const [query, setQuery] = useState('');
  const [nonzero, setNonzero] = useState(true);
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
    void load(todayDash());
  }, [load]);

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

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { downloadExcel, todayDash } from '../../../../../shared/utils/excelFile';
import { readSearchSession, saveSearchSession } from '../../../../../shared/utils/searchSession';
import { fetchVendors } from '../../../../co/master/material-master/services/materialMaster.service';
import { fetchLedger, fetchStockAsOf, registerLedgerOrders } from '../services/stockLedger.service';
import type { DraftItem, LedgerFilter, LedgerGridRow, LedgerKind, LedgerRow } from '../types/stockLedger.types';
import {
  STOCK_AS_OF_EXCEL_COLUMNS, dateRangeList, draftItems, draftKey, filterRows, orderCellValue, registeredMessage,
} from '../utils/stockLedger';

const errorText = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

// 수불대장 화면의 조회 · 발주량 칸 · 발주 등록 · 재고 내려받기 상태. 열면 오늘 것을 바로 보여준다. 마지막 요청의 응답만 쓴다
export function useStockLedgerManagement() {
  const requestIdRef = useRef(0);
  // 2026-11-04 마지막으로 조회한 기간과 탭 · 검색어 · 보기는 탭 세션에 두고, 다른 화면에 갔다 돌아오면 그대로 다시 연다
  const [initial] = useState(() => readSearchSession('pu-stock-ledger', {
    start: todayDash(), end: todayDash(), kind: 'material' as LedgerKind, query: '', mode: 'used' as LedgerFilter,
  }));
  const [kind, setKind] = useState<LedgerKind>(initial.kind);
  const [start, setStart] = useState(initial.start);
  const [end, setEnd] = useState(initial.end);
  const [applied, setApplied] = useState({ start: initial.start, end: initial.end });
  const [query, setQuery] = useState(initial.query);
  const [mode, setMode] = useState<LedgerFilter>(initial.mode);
  const [exportDate, setExportDate] = useState('');
  const [dates, setDates] = useState<string[]>([]);
  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  // 적어둔 발주량(저장 전) · ✓ 표시. 키는 '원재료코드|날짜' — 검색어를 바꿔 다시 그려도 적던 숫자가 날아가지 않게 따로 든다
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [marked, setMarked] = useState<Record<string, boolean>>({});
  const [vendors, setVendors] = useState<string[]>([]);
  const [ordering, setOrdering] = useState<DraftItem[] | null>(null);
  const [valueOpen, setValueOpen] = useState(false);
  const [lens, setLens] = useState<{ anchor: HTMLElement; row: LedgerRow } | null>(null);
  const [alertText, setAlertText] = useState<string | null>(null);

  const load = useCallback(async (from: string, to: string) => {
    if (!from || !to) return;
    if (to < from) {
      setAlertText('종료일이 시작일보다 빠를 수 없어요');
      return;
    }
    setApplied({ start: from, end: to });
    const requestId = ++requestIdRef.current;
    setLoading(true);
    try {
      const list = await fetchLedger(from, to);
      if (requestId !== requestIdRef.current) return;
      setDates(dateRangeList(from, to));
      setRows(list);
      setLoaded(true);
    } catch (requestError) {
      if (requestId === requestIdRef.current) setAlertText(errorText(requestError, '수불대장을 불러오지 못했어요'));
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(initial.start, initial.end);
    fetchVendors().then((list) => setVendors(list.map((v) => v.name).filter(Boolean))).catch(() => undefined);
  }, [load, initial]);

  useEffect(() => {
    saveSearchSession('pu-stock-ledger', { ...applied, kind, query, mode });
  }, [applied, kind, query, mode]);

  const search = () => void load(start, end);

  const switchKind = (next: LedgerKind) => {
    setKind(next);
    // 부자재는 '생산스케줄 사용' 으로 걸러두면 거의 안 보인다(필름·파우치는 배합표에 없다) — 전체로 바꿔준다
    if (next === 'submaterial' && mode === 'used') setMode('all');
  };

  const gridRows = useMemo<LedgerGridRow[]>(() => filterRows(rows, kind, query, mode).map((row) => {
    const flat: LedgerGridRow = { ...row };
    dates.forEach((d, i) => {
      flat[`u${i}`] = row.usageByDate?.[d] ?? 0;
      const ordered = row.orderByDate?.[d];
      flat[`ot${i}`] = orderCellValue(row, d, i, drafts);
      flat[`o${i}`] = ordered != null && ordered !== 0 ? ordered : parseFloat(drafts[draftKey(row.code, d)] ?? '') || 0;
    });
    return flat;
  }), [rows, kind, query, mode, dates, drafts]);

  const setDraft = useCallback((key: string, value: string) => setDrafts((current) => {
    const next = { ...current };
    if (value.trim() === '') delete next[key];
    else next[key] = value;
    return next;
  }), []);

  // ✓ 는 '이 칸은 다 적었다' 는 표시 — 칸에서 손을 떼는 순간 켜진다(엔터·마우스·탭 모두). 값이 비거나 0 이면 끈다
  const mark = useCallback((key: string, value: string) => setMarked((current) => {
    const next = { ...current };
    if (value.trim() !== '' && parseFloat(value) > 0) next[key] = true;
    else delete next[key];
    return next;
  }), []);

  // 엔터: 표시를 켜고 엑셀처럼 같은 날짜 칸을 따라 아랫줄로 내려간다. 여기서 바로 발주를 내보내지는 않는다
  const onOrderKeyDown = useCallback((event: KeyboardEvent<HTMLInputElement>, key: string, date: string) => {
    event.stopPropagation();
    if (event.key !== 'Enter') return;
    event.preventDefault();
    const input = event.currentTarget;
    mark(key, input.value);
    const all = Array.from(document.querySelectorAll<HTMLInputElement>(`input[data-ledger-date="${date}"]`));
    const nextInput = all[all.indexOf(input) + 1];
    if (nextInput) {
      nextInput.focus();
      nextInput.select();
    }
  }, [mark]);

  const openLens = useCallback((anchor: HTMLElement, row: LedgerRow) => setLens({ anchor, row }), []);

  const draftCount = useMemo(() => draftItems(drafts, rows).length, [drafts, rows]);

  const startOrder = () => {
    const items = draftItems(drafts, rows);
    if (items.length === 0) {
      setAlertText('발주량을 적은 품목이 없어요');
      return;
    }
    setOrdering(items);
  };

  const submitOrders = async (items: DraftItem[]) => {
    setOrdering(null);
    try {
      const registered = await registerLedgerOrders(items);
      // 넘어간 것만 지운다. 남은 것이 있으면 그 칸은 그대로 두어야 한다
      const keys = new Set(items.map((it) => draftKey(it.materialCode, it.orderDate)));
      setDrafts((current) => Object.fromEntries(Object.entries(current).filter(([key]) => !keys.has(key))));
      setMarked((current) => Object.fromEntries(Object.entries(current).filter(([key]) => !keys.has(key))));
      setAlertText(registeredMessage(registered));
      void load(start, end);
    } catch (requestError) {
      setAlertText(errorText(requestError, '발주 등록에 실패했어요'));
    }
  };

  const exportStock = async () => {
    try {
      const data = await fetchStockAsOf(exportDate);
      await downloadExcel(data.materials, STOCK_AS_OF_EXCEL_COLUMNS, `구매재고_${data.date}.xlsx`, '구매재고');
    } catch {
      setAlertText('재고 조회에 실패했어요');
    }
  };

  const lensRow = lens?.row;
  const lensSum = (lensRow?.warehouseStock ?? []).reduce((sum, w) => sum + Number(w.qty || 0), 0);

  return {
    kind,
    switchKind,
    start,
    setStart,
    end,
    setEnd,
    query,
    setQuery,
    mode,
    setMode,
    exportDate,
    setExportDate,
    dates,
    gridRows,
    loaded,
    loading,
    search,
    marked,
    setDraft,
    mark,
    onOrderKeyDown,
    draftCount,
    vendors,
    ordering,
    setOrdering,
    startOrder,
    submitOrders,
    exportStock,
    valueOpen,
    setValueOpen,
    lens,
    setLens,
    openLens,
    lensRow,
    lensSum,
    alertText,
    setAlertText,
  };
}

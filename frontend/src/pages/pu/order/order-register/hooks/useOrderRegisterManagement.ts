import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { F1GridRowId, F1TreeRef } from '../../../../../shared/components/f1-grid';
import { downloadExcel, todayDash } from '../../../../../shared/utils/excelFile';
import { cancelOrder, fetchOrdersByDate } from '../services/purchaseOrder.service';
import type { HistoryRow, PurchaseOrder } from '../types/purchaseOrder.types';
import { HISTORY_EXCEL_COLUMNS, historyRows } from '../utils/purchaseOrder';

const errorText = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

// 발주등록 화면의 발주내역 조회 · 취소 · 엑셀 상태. 열면 오늘 발주를 바로 보여준다. 마지막 요청의 응답만 쓴다
export function useOrderRegisterManagement() {
  const treeRef = useRef<F1TreeRef<HistoryRow>>(null);
  const requestIdRef = useRef(0);
  const [date, setDate] = useState(() => todayDash());
  const [client, setClient] = useState('');
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [treeVersion, setTreeVersion] = useState(0);
  const [openGroups, setOpenGroups] = useState<F1GridRowId[]>([]); // 펼쳐둔 거래처(다시 불러와도 그대로 편다)
  const [expandAll, setExpandAll] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [cancelling, setCancelling] = useState<HistoryRow | null>(null);
  const [alertText, setAlertText] = useState<string | null>(null);
  const [notice, setNotice] = useState('');

  const rows = useMemo(() => historyRows(orders), [orders]);
  const rowsRef = useRef(rows);
  rowsRef.current = rows;

  const loadRows = useCallback(async (day: string, clientQ: string) => {
    const requestId = ++requestIdRef.current;
    // 펼쳐둔 거래처를 기억해 둔다. 사라진 거래처는 다음 목록에 없으니 저절로 빠진다
    const groups = rowsRef.current.filter((row) => row.kind === 'group').map((row) => row.id);
    const opened = groups.filter((id) => treeRef.current?.isExpanded(id));
    setLoading(true);
    try {
      const list = await fetchOrdersByDate(day, clientQ);
      if (requestId !== requestIdRef.current) return;
      const nextGroups = new Set(historyRows(list).filter((row) => row.kind === 'group').map((row) => row.id));
      const keep = opened.filter((id) => nextGroups.has(String(id)));
      setOpenGroups(keep);
      setExpandAll(nextGroups.size > 0 && keep.length === nextGroups.size);
      setOrders(list);
      setLoaded(true);
      setTreeVersion((v) => v + 1);
    } catch (requestError) {
      if (requestId === requestIdRef.current) setAlertText(errorText(requestError, '발주내역을 불러오지 못했어요'));
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRows(todayDash(), '');
  }, [loadRows]);

  const search = () => void loadRows(date, client);

  const toggleExpandAll = (checked: boolean) => {
    setExpandAll(checked);
    if (checked) treeRef.current?.expandAll();
    else treeRef.current?.collapseAll();
  };

  const cancel = async () => {
    const row = cancelling;
    setCancelling(null);
    if (!row?.poId) return;
    try {
      await cancelOrder(row.poId);
    } catch (requestError) {
      setAlertText(errorText(requestError, '취소에 실패했어요'));
      return;
    }
    await loadRows(date, client);
  };

  // 송연 발주내역 엑셀: 그 발주일 것(거래처 조건 없이)을 다시 받는다
  const exportExcel = async () => {
    try {
      const list = await fetchOrdersByDate(date, '');
      await downloadExcel(list, HISTORY_EXCEL_COLUMNS, `발주내역${date ? `_${date}` : ''}.xlsx`, '발주내역');
    } catch (requestError) {
      setAlertText(errorText(requestError, '다운로드하지 못했어요'));
    }
  };

  // 송연과 같이 발주일을 그 날짜로 옮겨 다시 불러온다
  const afterRegistered = (orderDate: string) => {
    setDate(orderDate);
    setNotice('저장되었습니다');
    void loadRows(orderDate, client);
  };

  return {
    treeRef,
    date,
    setDate,
    client,
    setClient,
    orders,
    rows,
    loaded,
    loading,
    treeVersion,
    openGroups,
    expandAll,
    toggleExpandAll,
    search,
    exportExcel,
    registerOpen,
    setRegisterOpen,
    afterRegistered,
    cancelling,
    setCancelling,
    cancel,
    alertText,
    setAlertText,
    notice,
    setNotice,
  };
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { F1GridRowId, F1TreeRef } from '../../../../../shared/components/f1-grid';
import { downloadExcel, todayDash } from '../../../../../shared/utils/excelFile';
import { cancelOrder, fetchOrders } from '../services/orderRegister.service';
import type { OrderRegisterRow, PurchaseOrder } from '../types/orderRegister.types';
import { REGISTER_EXCEL_COLUMNS, errorText, toRegisterRows } from '../utils/orderRegister';

// 발주등록 화면의 발주내역 조회 · 취소 · 엑셀 상태. 마지막 요청의 응답만 쓴다.
// 2026-11-03 발주일은 상세 조회(⌄) 기간으로 옮겼다. 오늘 ~ 오늘로 시작하고, 열면 오늘 발주를 바로 보여준다(사용자 결정)
export type OrderPeriod = { from: string; to: string };
const todayPeriod = (): OrderPeriod => ({ from: todayDash(), to: todayDash() });

export function useOrderRegisterManagement() {
  const treeRef = useRef<F1TreeRef<OrderRegisterRow>>(null);
  const requestIdRef = useRef(0);
  const [period, setPeriod] = useState<OrderPeriod>(todayPeriod); // [조회]로 적용한 상세 발주일
  const [client, setClient] = useState('');
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [treeVersion, setTreeVersion] = useState(0);
  const [openGroups, setOpenGroups] = useState<F1GridRowId[]>([]); // 펼쳐둔 거래처(다시 불러와도 그대로 편다)
  const [expandAll, setExpandAll] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [cancelling, setCancelling] = useState<OrderRegisterRow | null>(null);
  const [alertText, setAlertText] = useState<string | null>(null);
  const [notice, setNotice] = useState('');

  const rows = useMemo(() => toRegisterRows(orders), [orders]);
  const rowsRef = useRef(rows);
  rowsRef.current = rows;

  const loadRows = useCallback(async (range: OrderPeriod, clientQ: string) => {
    const requestId = ++requestIdRef.current;
    // 펼쳐둔 거래처를 기억해 둔다. 사라진 거래처는 다음 목록에 없으니 저절로 빠진다
    const groups = rowsRef.current.filter((row) => row.kind === 'group').map((row) => row.id);
    const opened = groups.filter((id) => treeRef.current?.isExpanded(id));
    setLoading(true);
    try {
      const list = await fetchOrders(range.from, range.to, clientQ);
      if (requestId !== requestIdRef.current) return;
      const nextGroups = new Set(toRegisterRows(list).filter((row) => row.kind === 'group').map((row) => row.id));
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
    void loadRows(todayPeriod(), '');
  }, [loadRows]);

  const search = () => void loadRows(period, client);

  // 상세 조회(⌄) [조회]: 발주일 기간을 적용하고 다시 부른다
  const applyPeriod = (next: OrderPeriod) => {
    setPeriod(next);
    void loadRows(next, client);
  };

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
    await loadRows(period, client);
  };

  // 송연 발주내역 엑셀: 적용한 발주일 것(거래처 조건 없이)을 다시 받는다
  const exportExcel = async () => {
    try {
      const list = await fetchOrders(period.from, period.to, '');
      const days = [...new Set([period.from.trim(), period.to.trim()].filter(Boolean))].join('_');
      await downloadExcel(list, REGISTER_EXCEL_COLUMNS, `발주내역${days ? `_${days}` : ''}.xlsx`, '발주내역');
    } catch (requestError) {
      setAlertText(errorText(requestError, '다운로드하지 못했어요'));
    }
  };

  // 송연과 같이 발주일을 그 날짜로 옮겨 다시 불러온다(상세 발주일 = 그 날 ~ 그 날)
  const afterRegistered = (orderDate: string) => {
    const next = { from: orderDate, to: orderDate };
    setPeriod(next);
    setNotice('저장되었습니다');
    void loadRows(next, client);
  };

  return {
    treeRef,
    period,
    applyPeriod,
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

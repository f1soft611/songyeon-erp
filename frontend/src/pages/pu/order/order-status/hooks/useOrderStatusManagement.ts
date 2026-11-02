import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { downloadExcel, todayDash } from '../../../../../shared/utils/excelFile';
import type { PurchaseOrder } from '../../order-register/types/purchaseOrder.types';
import { fetchOrdersByPeriod } from '../services/orderStatus.service';
import type { StatusFilter, StatusQuery, StatusRow } from '../types/orderStatus.types';
import { STATUS_EXCEL_COLUMNS, monthStart, sortStatus, statusCounts, toStatusRows } from '../utils/orderStatus';

const errorText = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

// 발주현황 화면의 조회 · 엑셀 상태. 기간은 이번 달 1일~오늘로 시작하고, 송연과 같이 화면을 열면 바로 부른다. 마지막 요청의 응답만 쓴다
export function useOrderStatusManagement() {
  const requestIdRef = useRef(0);
  const [query, setQuery] = useState<StatusQuery>(() => ({ start: monthStart(), end: todayDash(), clientQ: '', materialQ: '', received: '' }));
  const queryRef = useRef(query);
  queryRef.current = query;
  const [orders, setOrders] = useState<PurchaseOrder[] | null>(null); // null = 아직 안 불러옴
  const [loading, setLoading] = useState(false);
  const [alertText, setAlertText] = useState<string | null>(null);

  const loadRows = useCallback(async (override?: Partial<StatusQuery>) => {
    const target = { ...queryRef.current, ...override };
    if (!target.start || !target.end) {
      setAlertText('조회 기간을 선택해주세요');
      return;
    }
    const requestId = ++requestIdRef.current;
    setLoading(true);
    try {
      const list = await fetchOrdersByPeriod(target);
      if (requestId !== requestIdRef.current) return;
      setOrders(list);
    } catch (requestError) {
      if (requestId === requestIdRef.current) setAlertText(errorText(requestError, '조회에 실패했어요'));
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  const changeQuery = (key: keyof StatusQuery, value: string) =>
    setQuery((current) => ({ ...current, [key]: value }));

  // 송연과 같이 입고여부는 고르면 바로 다시 부른다
  const changeReceived = (received: StatusFilter) => {
    setQuery((current) => ({ ...current, received }));
    void loadRows({ received });
  };

  const rows = useMemo<StatusRow[]>(() => toStatusRows(orders ?? []), [orders]);
  const counts = statusCounts(orders ?? []);

  const exportExcel = async () => {
    if (!orders || orders.length === 0) {
      setAlertText('먼저 조회해주세요');
      return;
    }
    const { start, end } = queryRef.current;
    await downloadExcel(sortStatus(orders), STATUS_EXCEL_COLUMNS, `발주현황_${start}_${end}.xlsx`, '발주현황');
  };

  return {
    query,
    changeQuery,
    changeReceived,
    orders,
    rows,
    counts,
    loading,
    loadRows,
    exportExcel,
    alertText,
    setAlertText,
  };
}

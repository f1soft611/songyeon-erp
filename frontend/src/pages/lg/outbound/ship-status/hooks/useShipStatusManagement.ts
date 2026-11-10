import { useEffect, useRef, useState } from 'react';
import { downloadExcel, todayDash } from '../../../../../shared/utils/excelFile';
import { readSearchSession, saveSearchSession } from '../../../../../shared/utils/searchSession';
import { fetchShipStatus } from '../services/shipStatus.service';
import type { ShipStatusQuery, ShipStatusRow } from '../types/shipStatus.types';
import { SHIP_STATUS_EXCEL_COLUMNS, statusExcelName, toStatusRow } from '../utils/shipStatus';

const errorText = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

// 출하현황 화면의 조회 · 엑셀 상태. 기간은 오늘~오늘로 채워 두고(현황 페이지 기준일), 송연처럼 [조회] 를 눌러야 목록이 나온다.
// 마지막 요청의 응답만 쓴다
export function useShipStatusManagement() {
  const requestIdRef = useRef(0);
  // 2026-11-04 마지막으로 조회한 조건은 탭 세션에 둔다. 조회한 적이 있으면 다른 화면에 갔다 돌아왔을 때 그 조건으로 바로 다시 부른다
  const [saved] = useState(() =>
    readSearchSession<ShipStatusQuery | null>('lg-ship-status', null, { start: '', end: '', productName: '', clientName: '' }));
  const [query, setQuery] = useState<ShipStatusQuery>(() => saved ?? { start: todayDash(), end: todayDash(), productName: '', clientName: '' });
  const [rows, setRows] = useState<ShipStatusRow[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alertText, setAlertText] = useState<string | null>(null);
  const [error, setError] = useState('');

  const changeQuery = (key: keyof ShipStatusQuery, value: string) =>
    setQuery((current) => ({ ...current, [key]: value }));

  const periodMissing = (target: ShipStatusQuery) => {
    if (target.start && target.end) return false;
    setAlertText('조회 기간을 선택해주세요');
    return true;
  };

  const loadRows = async (target: ShipStatusQuery = query) => {
    if (periodMissing(target)) return;
    saveSearchSession('lg-ship-status', target);
    const requestId = ++requestIdRef.current;
    setLoading(true);
    try {
      const records = await fetchShipStatus(target);
      if (requestId !== requestIdRef.current) return;
      setRows(records.map(toStatusRow));
      setSearched(true);
    } catch (requestError) {
      if (requestId === requestIdRef.current) setError(errorText(requestError, '출하현황을 불러오지 못했습니다.'));
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    if (saved) void loadRows(saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 상세 조회(⌄) [조회]: 거래처 · 품목코드/명을 조건에 넣고 다시 받는다
  const applyDetailFilter = (filter: { clientName: string; product: string }) => {
    const next = { ...query, clientName: filter.clientName, productName: filter.product };
    setQuery(next);
    void loadRows(next);
  };

  // 송연 엑셀: 지금 조건으로 서버에서 다시 받는다
  const exportExcel = async () => {
    if (periodMissing(query)) return;
    try {
      const list = await fetchShipStatus(query);
      if (list.length === 0) {
        setAlertText('다운로드할 데이터가 없어요');
        return;
      }
      await downloadExcel(list, SHIP_STATUS_EXCEL_COLUMNS, statusExcelName(query), '출하현황');
    } catch (requestError) {
      setError(errorText(requestError, '다운로드하지 못했어요'));
    }
  };

  return {
    query,
    changeQuery,
    rows,
    searched,
    loading,
    loadRows,
    applyDetailFilter,
    exportExcel,
    alertText,
    setAlertText,
    error,
    setError,
  };
}

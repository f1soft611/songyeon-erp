import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { F1GridRef } from '../../../../../shared/components/f1-grid';
import { downloadExcel, todayDash } from '../../../../../shared/utils/excelFile';
import { clientProductDetailValues, readSearchSession, saveSearchSession } from '../../../../../shared/utils/searchSession';
import {
  PACKING_CODE_GROUP, VEHICLE_CODE_GROUP, confirmShipment, fetchCommonCodeNames, fetchDriverOptions, fetchShipSchedule, unconfirmShipment,
} from '../services/shipConfirm.service';
import type { DriverOption, ShipDetailFilter, ShipRow } from '../types/shipConfirm.types';
import { filterOrderRows } from '../../../../sales/order/order-register/utils/salesOrder';
import {
  buildShipmentLogHtml, buildWorkOrderHtml, hasShipQty, isConfirmed, negativeStockMessage, onlyQty,
  SHIP_EXCEL_COLUMNS, sortByVehicle, toConfirmBody, toShipRow,
} from '../utils/shipConfirm';

const NO_FILTER: ShipDetailFilter = { clientName: '', product: '' };
const errorText = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

// 출하확정 화면의 조회 · 확정 · 확정취소 · 정렬 · 인쇄 · 엑셀 상태(S_ERP 품목관리 useMaterialManagement 와 같은 역할)
// 출하등록된 건에 실출하량 · 배차 · 포장방법을 적어 확정한다. 열면 오늘 것을 바로 불러온다. 마지막 요청의 응답만 쓴다
export function useShipConfirmManagement() {
  const gridRef = useRef<F1GridRef<ShipRow>>(null);
  const requestIdRef = useRef(0);
  // 2026-11-04 마지막으로 조회한 날짜 · 상세 조회 조건은 탭 세션에 두고, 다른 화면에 갔다 돌아오면 그 조건으로 다시 부른다
  const [saved] = useState(() => readSearchSession('lg-ship-confirm', { date: todayDash(), filter: NO_FILTER }));
  const [date, setDate] = useState(saved.date);
  const [loadedDate, setLoadedDate] = useState('');
  const [rows, setRows] = useState<ShipRow[]>([]); // 조회한 그대로(인쇄는 이 순서)
  const rowsRef = useRef(rows);
  rowsRef.current = rows;
  // F1-Grid 는 받은 목록을 따로 들고 있어서, 줄 자체가 바뀌면(조회 · 정렬) 표를 새로 그린다
  const [version, setVersion] = useState(0);
  const [sorted, setSorted] = useState(false); // 🚚 배차·순서로 정렬해서 보는 중
  const [loading, setLoading] = useState(false);
  const [packingNames, setPackingNames] = useState<string[]>([]);
  const [vehicleNames, setVehicleNames] = useState<string[]>([]);
  const [drivers, setDrivers] = useState<DriverOption[]>([]); // 운행자 사원 팝업 후보
  const [pending, setPending] = useState<{ row: ShipRow; message: string } | null>(null); // 재고 마이너스 확인
  const [undoing, setUndoing] = useState<ShipRow | null>(null);
  const [printOpen, setPrintOpen] = useState(false);
  const [charterOpen, setCharterOpen] = useState(false);
  const [alertText, setAlertText] = useState<string | null>(null);
  const [error, setError] = useState('');
  // 상세 조회(⌄)로 적용한 조건. 받은 출하 중 맞는 줄만 표에 둔다(2026-10-30)
  const detailFilterRef = useRef<ShipDetailFilter>(saved.filter);

  // 표 안에서 친 값을 목록으로 되받아 온다
  const pull = (): ShipRow[] => gridRef.current?.getActiveRows() ?? rowsRef.current;

  const loadRows = useCallback(async (day: string) => {
    if (!day) {
      setError('조회할 날짜를 먼저 선택해주세요');
      return;
    }
    saveSearchSession('lg-ship-confirm', { date: day, filter: detailFilterRef.current });
    const requestId = ++requestIdRef.current;
    setLoading(true);
    try {
      const records = await fetchShipSchedule(day);
      if (requestId !== requestIdRef.current) return;
      const next = filterOrderRows(records.map(toShipRow), detailFilterRef.current);
      rowsRef.current = next;
      setRows(next);
      setSorted(false);
      setLoadedDate(day);
      setVersion((v) => v + 1);
    } catch (requestError) {
      if (requestId === requestIdRef.current) setError(errorText(requestError, '출하 목록을 불러오지 못했습니다.'));
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, []);

  // 상세 조회(⌄) [조회]: 조건을 적용해 조회한 날짜(없으면 고른 날짜) 것을 다시 받는다
  const applyDetailFilter = (filter: ShipDetailFilter) => {
    detailFilterRef.current = filter;
    void loadRows(date);
  };

  useEffect(() => {
    void loadRows(saved.date);
    // 칸에 고를 것. 못 받으면 빈 목록(고를 것 없이 비워둔다)
    fetchCommonCodeNames(PACKING_CODE_GROUP).then(setPackingNames).catch(() => undefined);
    fetchCommonCodeNames(VEHICLE_CODE_GROUP).then(setVehicleNames).catch(() => undefined);
    fetchDriverOptions().then(setDrivers).catch(() => undefined);
  }, [loadRows, saved]);

  const send = async (row: ShipRow) => {
    try {
      await confirmShipment(row.source, row.id, toConfirmBody(row, packingNames, vehicleNames));
    } catch (requestError) {
      setAlertText(errorText(requestError, '실출하량 저장에 실패했어요'));
      return;
    }
    await loadRows(loadedDate || date);
  };

  const confirmRow = async (key: string) => {
    const row = pull().find((item) => item.key === key);
    if (!row) return;
    const actualQty = onlyQty(row.inputActual).trim();
    // 2026-10-26 숫자 칸은 비우거나 글자만 치면 0 이 된다. 0 으로 확정하지 않게 막는다
    if (!actualQty || !hasShipQty(actualQty)) {
      setAlertText('실출하량을 입력해주세요. 이 수량만큼 재고가 빠져요.');
      return;
    }
    // 확정하면 재고가 마이너스로 가는 때만 물어본다
    const warning = negativeStockMessage(row, actualQty);
    if (warning) {
      setPending({ row, message: warning });
      return;
    }
    await send(row);
  };

  // 재고 확인 창에서 [확정]
  const confirmPending = () => {
    const row = pending?.row;
    setPending(null);
    if (row) void send(row);
  };

  const unconfirm = async () => {
    const row = undoing;
    setUndoing(null);
    if (!row) return;
    try {
      await unconfirmShipment(row.source, row.id);
    } catch (requestError) {
      setAlertText(errorText(requestError, '확정취소에 실패했어요'));
      return;
    }
    await loadRows(loadedDate || date);
  };

  const sortRows = () => {
    if (rows.length === 0) {
      setAlertText('먼저 조회해주세요');
      return;
    }
    const current = pull();
    rowsRef.current = current;
    setRows(current);
    setSorted(true);
    setVersion((v) => v + 1);
  };

  const openPrint = () => {
    if (rows.length === 0) {
      setAlertText('먼저 조회해주세요');
      return;
    }
    setPrintOpen(true);
  };

  const print = (kind: 'log' | 'work') => {
    setPrintOpen(false);
    const win = window.open('', '_blank');
    if (!win) {
      setAlertText('새 창을 열 수 없어요. 브라우저의 팝업 차단을 풀어주세요.');
      return;
    }
    // 조회한 순서 그대로, 조회한 날짜로 찍는다
    win.document.write(kind === 'log' ? buildShipmentLogHtml(rows, loadedDate) : buildWorkOrderHtml(rows, loadedDate));
    win.document.close();
  };

  // 송연 엑셀: 그 날짜 출하 목록을 서버에서 다시 받는다
  const exportExcel = async () => {
    if (!date) {
      setError('조회할 날짜를 먼저 선택해주세요');
      return;
    }
    try {
      const list = (await fetchShipSchedule(date)).map(toShipRow);
      if (list.length === 0) {
        setAlertText('다운로드할 데이터가 없어요');
        return;
      }
      await downloadExcel(list, SHIP_EXCEL_COLUMNS, `출하확정_${date}.xlsx`, '출하확정');
    } catch (requestError) {
      setError(errorText(requestError, '다운로드하지 못했어요'));
    }
  };

  const shown = useMemo(() => (sorted ? sortByVehicle(rows) : rows), [rows, sorted]);
  const confirmedCount = rows.filter(isConfirmed).length;

  return {
    savedDetailValues: clientProductDetailValues(saved.filter),
    gridRef,
    applyDetailFilter,
    date,
    setDate,
    rows,
    shown,
    version,
    sorted,
    loading,
    loadRows,
    packingNames,
    vehicleNames,
    drivers,
    confirmedCount,
    confirmRow,
    pending,
    setPending,
    confirmPending,
    undoing,
    setUndoing,
    unconfirm,
    sortRows,
    printOpen,
    setPrintOpen,
    openPrint,
    print,
    charterOpen,
    setCharterOpen,
    exportExcel,
    alertText,
    setAlertText,
    error,
    setError,
  };
}

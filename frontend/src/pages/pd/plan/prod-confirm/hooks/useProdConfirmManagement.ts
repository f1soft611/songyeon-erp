import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { F1GridRef } from '../../../../../shared/components/f1-grid';
import type { LabelPrintTarget } from '../../../../../shared/components/LabelPrintDialog';
import { downloadExcel, todayDash } from '../../../../../shared/utils/excelFile';
import { restoreBlockedGridDeletes } from '../../../../../shared/utils/gridDelete';
import { unknownClientMessage } from '../../../../co/master/item-master/utils/productBom';
import { fetchClientNames } from '../../../../co/master/item-master/services/itemMaster.service';
import { fetchOrderProducts } from '../../../../sales/order/order-register/services/salesOrder.service';
import { filterOrderRows } from '../../../../sales/order/order-register/utils/salesOrder';
import type { OrderProduct } from '../../../../sales/order/order-register/types/salesOrder.types';
import { startOrderHandoff } from '../../../../sales/order/order-register/orderHandoff';
import { NO_PRODUCT_CODE_MESSAGE } from '../../../label/label-print/utils/labelPrint';
import { createSchedule, deleteSchedule, fetchBatchSheet, fetchSchedule, updateSchedule } from '../services/prodConfirm.service';
import type { PendingOrder, ScheduleDetailFilter, ScheduleRow } from '../types/prodConfirm.types';
import {
  buildBatchSheetHtml,
  canDeleteSchedule,
  changedSchedules,
  fromSaved,
  NO_BOM_MESSAGE,
  rowFromOrder,
  saveBodyOf,
  SCHEDULE_EXCEL_COLUMNS,
  scheduleSnapshot,
} from '../utils/prodConfirm';

const NO_FILTER: ScheduleDetailFilter = { clientName: '', product: '' };
const errorText = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

// 생산확정 화면의 조회 · 확정 · 저장 · 삭제 상태(S_ERP 품목관리 useMaterialManagement 와 같은 역할)
// 새 줄은 줄의 [확정], 확정된 줄은 바로 고치고 제목줄 [저장]으로 보낸다(빠졌던 원재료를 되돌린 뒤 다시 뺀다).
// 지우기는 제목줄 [삭제] · 오른쪽 클릭 [행 삭제]로 표에서 빼 두고 [저장] 때 지운다. 실생산량이 적혔거나 출하확정된 생산건은 지우지 못한다.
export function useProdConfirmManagement() {
  const navigate = useNavigate();
  const gridRef = useRef<F1GridRef<ScheduleRow>>(null);
  const requestIdRef = useRef(0);
  const nextKeyRef = useRef(1);
  const [date, setDate] = useState(() => todayDash());
  const [rows, setRows] = useState<ScheduleRow[]>([]);
  const rowsRef = useRef(rows);
  rowsRef.current = rows;
  // F1-Grid 는 받은 목록을 따로 들고 있어서, 줄 자체가 바뀌면(확정 · 담기 · 삭제) 표를 새로 그린다
  const [version, setVersion] = useState(0);
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<string[]>([]);
  const [products, setProducts] = useState<OrderProduct[]>([]);
  const [importOpen, setImportOpen] = useState(false);
  // 처음 불러온 확정 줄(id → 저장 칸 글자). [저장]이 고친 줄을 찾는다
  const originalsRef = useRef<Map<number, string>>(new Map());
  // 표에서 빼 둔 확정 줄. [확정] · 담기로 표를 새로 그리면 표의 '지운 줄' 기록이 사라져서 따로 들고 있는다
  const removedRef = useRef<Map<number, ScheduleRow>>(new Map());
  // 이번에 이미 지운 생산건(저장 도중 오류로 다시 조회하지 않았을 때 또 지우지 않게)
  const deletedIdsRef = useRef<Set<number>>(new Set());
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(0);
  const [confirmLeave, setConfirmLeave] = useState<(() => void) | null>(null);
  const [selectionLocked, setSelectionLocked] = useState(false);
  const [alertText, setAlertText] = useState<string | null>(null);
  // 🏷️ 라벨: 라벨출력 화면과 같은 창(인쇄 전용)
  const [labelFor, setLabelFor] = useState<LabelPrintTarget | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  // 상세 조회(⌄)로 적용한 조건. 받은 생산건 중 맞는 줄만 표에 둔다(수주등록과 같음, 2026-10-30)
  const detailFilterRef = useRef<ScheduleDetailFilter>(NO_FILTER);

  // 표에서 빼 둔 확정 줄을 모은다(표를 새로 그리기 전에도 부른다)
  const keepRemoved = () => {
    for (const row of gridRef.current?.getChanges().deletedRows ?? []) {
      if (row.id && !deletedIdsRef.current.has(row.id)) removedRef.current.set(row.id, row);
    }
  };
  const commit = (next: ScheduleRow[]) => {
    keepRemoved();
    rowsRef.current = next;
    setRows(next);
    setVersion((v) => v + 1);
  };
  // 표 안에서 고친 값을 목록으로 되받아 온다
  const pull = (): ScheduleRow[] => gridRef.current?.getActiveRows() ?? rowsRef.current;

  const loadRows = useCallback(async (day: string) => {
    if (!day) {
      setError('조회할 날짜를 먼저 선택해주세요');
      return;
    }
    const requestId = ++requestIdRef.current;
    setLoading(true);
    try {
      const records = await fetchSchedule(day);
      if (requestId !== requestIdRef.current) return;
      const next = filterOrderRows(records.map((record) => fromSaved(record, nextKeyRef.current++)), detailFilterRef.current);
      originalsRef.current = new Map(next.map((row) => [row.id as number, scheduleSnapshot(row)]));
      removedRef.current = new Map();
      deletedIdsRef.current = new Set();
      setDirty(false);
      rowsRef.current = next;
      setRows(next);
      setVersion((v) => v + 1);
    } catch (requestError) {
      if (requestId === requestIdRef.current) setError(errorText(requestError, '생산확정 목록을 불러오지 못했습니다.'));
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, []);

  // 송연처럼 열면 오늘 것을 바로 보여준다. 거래처는 거래처BOM 전체(재고생산은 비워둘 수 있다), 품목은 사용 중 제품.
  useEffect(() => {
    void loadRows(todayDash());
    fetchClientNames().then(setClients).catch(() => undefined);
    fetchOrderProducts().then(setProducts).catch(() => undefined);
  }, [loadRows]);

  const unknownClient = (row: ScheduleRow) => {
    const typed = row.clientName.trim();
    return typed && clients.length && !clients.includes(typed) ? unknownClientMessage(typed, clients) : '';
  };

  // 송연 pc-save: 새 줄이면 확정(로트 발번·원재료 차감·수주 가져감), 확정된 줄이면 수정
  const confirmRow = async (key: number) => {
    const row = pull().find((item) => item.key === key);
    if (!row) return;
    const clientMessage = unknownClient(row);
    if (clientMessage) {
      setAlertText(clientMessage);
      return;
    }
    try {
      const body = saveBodyOf(row, date);
      let id = row.id;
      let lotNo = '';
      if (id) await updateSchedule(id, body);
      else {
        const saved = await createSchedule(body);
        id = saved.id;
        lotNo = saved.lotNo;
      }
      if (id) originalsRef.current.set(id, scheduleSnapshot({ ...row, id }));
      commit(pull().map((item) => (item.key === key ? { ...item, id } : item)));
      setNotice(lotNo ? `확정되었습니다 (로트번호 ${lotNo}) — 배합비대로 원재료 재고가 빠졌어요` : '저장되었습니다 — 원재료 사용량을 다시 계산했어요');
    } catch (requestError) {
      setAlertText(errorText(requestError, '저장에 실패했어요'));
    }
  };

  // ===== 2026-10-26 제목줄 [삭제] · [저장] =====
  const removedRows = (): ScheduleRow[] => {
    keepRemoved();
    return [...removedRef.current.values()];
  };
  // [저장]할 것: 고친 확정 줄 · 지운 확정 줄
  const hasChanges = () => changedSchedules(pull(), originalsRef.current).length > 0 || removedRows().length > 0;
  const refreshDirty = () => setDirty(hasChanges());
  // Delete 키로 지운 줄(2026-10-30): F1-Grid 는 Delete 키에서 [행 삭제] 막기를 보지 않아, 권한이 없거나 지울 수 없는 줄이 섞였으면
  // 지운 줄을 모두 되살리고 알린다. 아니면 저장할 것이 있는지 다시 본다(표의 onChangesChange)
  const handleGridChanges = (canDelete: boolean) => {
    const restored = restoreBlockedGridDeletes(gridRef.current, canDelete, canDeleteSchedule);
    if (restored.length === 0) {
      refreshDirty();
      return;
    }
    restored.forEach((row) => {
      if (row.id) removedRef.current.delete(row.id);
    });
    setAlertText(canDelete ? '실생산량이 적힌 생산건은 지울 수 없어요' : '삭제 권한이 없어요');
  };
  // 다시 조회하면 사라지는 것: [저장]할 것 + 아직 [확정] 안 한 새 줄
  const guard = (action: () => void) => {
    if (hasChanges() || pull().some((row) => !row.id)) {
      setConfirmLeave(() => action);
      return;
    }
    action();
  };
  const search = () => guard(() => void loadRows(date));
  // 상세 조회(⌄) [조회]: 저장 · 확정하지 않은 변경이 있으면 먼저 묻고, 조건을 적용해 다시 받는다
  const applyDetailFilter = (filter: ScheduleDetailFilter) => guard(() => {
    detailFilterRef.current = filter;
    void loadRows(date);
  });

  // 고른 줄을 표에서 뺀다(오른쪽 클릭 [행 삭제]와 같음). 지우기는 [저장] 때
  const removeSelected = () => {
    const picked = gridRef.current?.getSelectedRows() ?? [];
    if (picked.length === 0) {
      setAlertText('지울 생산 줄을 먼저 골라주세요(줄을 누르면 골라집니다)');
      return;
    }
    if (picked.some((row) => !canDeleteSchedule(row))) {
      setAlertText('실생산량이 적힌 생산건은 지울 수 없어요');
      return;
    }
    gridRef.current?.deleteSelectedRows();
  };

  // 실생산량이 적힌 줄을 고르면 오른쪽 클릭 [행 삭제]를 끈다
  const changeSelection = (ids: Array<string | number>) => {
    const active = pull();
    setSelectionLocked(ids.some((id) => {
      const row = active.find((item) => String(item.key) === String(id));
      return Boolean(row && !canDeleteSchedule(row));
    }));
  };

  // 지운 확정 줄 삭제(빠졌던 원재료를 되돌린다) → 고친 확정 줄 저장(원재료를 다시 계산한다). 거절되면 거기서 멈춘다
  const saveAll = async () => {
    const removed = removedRows();
    const changed = changedSchedules(pull(), originalsRef.current);
    if (removed.length === 0 && changed.length === 0) return;
    setSaving(true);
    try {
      for (const row of removed) {
        try {
          await deleteSchedule(row.id as number);
          removedRef.current.delete(row.id as number);
          deletedIdsRef.current.add(row.id as number);
        } catch (requestError) {
          setAlertText(errorText(requestError, '삭제에 실패했어요'));
          await loadRows(date);
          return;
        }
      }
      for (const row of changed) {
        const clientMessage = unknownClient(row);
        if (clientMessage) {
          setAlertText(clientMessage);
          return;
        }
        try {
          await updateSchedule(row.id as number, saveBodyOf(row, date));
          originalsRef.current.set(row.id as number, scheduleSnapshot(row));
        } catch (requestError) {
          setAlertText(errorText(requestError, '저장에 실패했어요'));
          return;
        }
      }
      await loadRows(date);
      setNotice(removed.length > 0 ? '저장되었습니다 — 지운 생산건의 원재료를 되돌렸어요' : '저장되었습니다 — 원재료 사용량을 다시 계산했어요');
    } finally {
      setSaving(false);
    }
  };

  // 지운 줄이 있으면 먼저 묻는다
  const askSave = () => {
    const count = removedRows().length;
    if (count > 0) {
      setConfirmDelete(count);
      return;
    }
    void saveAll();
  };

  // 송연 pullOneOrder: 담기만 한다('확정' 을 눌러야 실제로 등록된다)
  const pullOrders = useCallback((orders: PendingOrder[]) => {
    commit([...pull(), ...orders.map((order) => rowFromOrder(order, nextKeyRef.current++))]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 송연 gotoSalesOrder: 그 수주를 등록한 날짜의 수주등록 화면으로 가서 그 줄을 잠깐 밝혀준다
  const gotoOrder = useCallback((order: PendingOrder) => {
    if (!order.orderDate) {
      setAlertText('이 수주는 등록일이 남아있지 않아 찾아갈 수 없어요.');
      return;
    }
    startOrderHandoff({ date: order.orderDate, orderId: order.id });
    setImportOpen(false);
    navigate('/sales/order/OMOrderRegisterView');
  }, [navigate]);

  // 송연 printPcBatchSheet: 먼저 받아보고, 배합이 없으면 종이를 만들지 않고 알려준다
  const openBatchSheet = async (row: ScheduleRow) => {
    if (!row.id) return;
    try {
      const sheet = await fetchBatchSheet(row.id);
      if (sheet.rows.length === 0) {
        setAlertText(NO_BOM_MESSAGE);
        return;
      }
      const win = window.open('', '_blank');
      if (!win) {
        setAlertText('새 창을 열 수 없어요. 브라우저의 팝업 차단을 풀어주세요.');
        return;
      }
      win.document.write(buildBatchSheetHtml(sheet, new Date()));
      win.document.close();
    } catch (requestError) {
      setAlertText(errorText(requestError, '불러오지 못했어요'));
    }
  };

  // 송연 pc-label: 제품코드는 화면에 안 보이는 값이라 서버에서 그 생산건의 것을 받아온다.
  // 라벨출력 화면과 같은 창을 인쇄 전용으로 연다(현장에서 글자를 못 고치게 잠근다). 제조년월일은 그 생산일.
  const openLabel = async (row: ScheduleRow) => {
    if (!row.id) return;
    try {
      const { header } = await fetchBatchSheet(row.id);
      if (!header.productCode) {
        setAlertText(NO_PRODUCT_CODE_MESSAGE);
        return;
      }
      setLabelFor({ code: header.productCode, name: header.productName || '', mfgDate: header.scheduleDate || '' });
    } catch (requestError) {
      setAlertText(errorText(requestError, '불러오지 못했어요'));
    }
  };

  // 송연 엑셀: 그 날짜 확정건을 서버에서 다시 받는다(아직 확정 안 한 줄은 들어가지 않는다)
  const exportExcel = async () => {
    if (!date) {
      setError('조회할 날짜를 먼저 선택해주세요');
      return;
    }
    try {
      const list = await fetchSchedule(date);
      if (list.length === 0) {
        setAlertText('다운로드할 데이터가 없어요');
        return;
      }
      await downloadExcel(list, SCHEDULE_EXCEL_COLUMNS, `생산확정_${date}.xlsx`, '생산확정');
    } catch (requestError) {
      setError(errorText(requestError, '다운로드하지 못했어요'));
    }
  };

  return {
    gridRef,
    date,
    setDate,
    rows,
    version,
    loading,
    clients,
    products,
    search,
    applyDetailFilter,
    exportExcel,
    confirmRow,
    openBatchSheet,
    openLabel,
    labelFor,
    closeLabel: () => setLabelFor(null),
    importOpen,
    setImportOpen,
    pullOrders,
    gotoOrder,
    removeSelected,
    selectionLocked,
    changeSelection,
    handleGridChanges,
    dirty,
    saving,
    askSave,
    confirmDelete,
    setConfirmDelete,
    saveAll,
    confirmLeave,
    setConfirmLeave,
    alertText,
    setAlertText,
    error,
    setError,
    notice,
    setNotice,
  };
}

import { useCallback, useEffect, useRef, useState } from 'react';
import type { F1GridRef } from '../../../../../shared/components/f1-grid';
import { useNotification } from '../../../../../shared/context/NotificationContext';
import { downloadExcel, todayDash } from '../../../../../shared/utils/excelFile';
import { restoreBlockedGridDeletes } from '../../../../../shared/utils/gridDelete';
import { unknownClientMessage } from '../../../../co/master/item-master/utils/productBom';
import { fetchOrderClientOptions, fetchOrderProducts } from '../../../order/order-register/services/salesOrder.service';
import type { OrderClientOption, OrderProduct } from '../../../order/order-register/types/salesOrder.types';
import { filterOrderRows, isUnknownClient, parseQtyNumber } from '../../../order/order-register/utils/salesOrder';
import {
  createShipment,
  deleteShipment,
  fetchAllocations,
  fetchImportOrders,
  fetchLots,
  fetchPlannedOrders,
  fetchShipments,
  saveAllocations,
  updateActualQty,
} from '../services/shipment.service';
import type {
  AllocationMode,
  LotPick,
  LotPickState,
  PendingOrder,
  ShipmentAlertState,
  ShipmentDetailFilter,
  ShipmentRow,
} from '../types/shipment.types';
import {
  applyLotPick,
  canDeleteShipment,
  importRange,
  pendingShipments,
  qtyText,
  recordKey,
  rowFromOrder,
  saveBodyOf,
  SHIPMENT_EXCEL_COLUMNS,
  toShipmentRow,
} from '../utils/shipment';

const errorText = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;
const NO_FILTER: ShipmentDetailFilter = { clientName: '', product: '' };

// 출하등록 화면의 조회 · 저장 상태(S_ERP 품목관리 useMaterialManagement 와 같은 역할)
// 출고일을 골라 그날 나가는 출하를 등록한다. 생산확정 줄에 물류출고일이 있으면 그 줄도 함께 보인다(생산연동).
// 새 줄은 모두 입력하고, 저장된 줄은 출하량만 고친다. 출하확정된 줄은 고치지 못한다.
// 2026-10-23 제목줄 [저장] · [삭제] 로 한다. 지우기는 표에서 빼 두고 [저장] 때 지운다. 출하확정된 줄 · 생산연동 줄은 지우지 못한다
export function useShipmentManagement() {
  const { showSuccess } = useNotification();
  const gridRef = useRef<F1GridRef<ShipmentRow>>(null);
  const requestIdRef = useRef(0);
  const nextKeyRef = useRef(1);
  // 처음 불러온 출하량(저장된 줄 구분값 → 글자). [저장]이 고친 줄을 찾는다
  const originalQtyRef = useRef<Map<string, string>>(new Map());
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState<(() => void) | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(0);
  // 고른(오른쪽 클릭한) 줄에 지울 수 없는 줄이 있으면 [행 삭제]를 끈다
  const [selectionLocked, setSelectionLocked] = useState(false);
  const [date, setDate] = useState(() => todayDash());
  const [loadedDate, setLoadedDate] = useState(() => todayDash());
  const [rows, setRows] = useState<ShipmentRow[]>([]);
  // F1-Grid 는 받은 목록을 표 안에 따로 들고 있어서, 줄 자체가 바뀌면 표를 새로 그린다
  const [version, setVersion] = useState(0);
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<OrderClientOption[]>([]);
  const [products, setProducts] = useState<OrderProduct[]>([]);
  const [error, setError] = useState('');
  const [alertState, setAlertState] = useState<ShipmentAlertState | null>(null);
  const [lotPick, setLotPick] = useState<LotPickState | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importStart, setImportStart] = useState('');
  const [importEnd, setImportEnd] = useState('');
  const rowsRef = useRef(rows);
  rowsRef.current = rows;
  // 표에서 빼 둔 저장된 출하. 줄 추가 · 로트 고르기로 표를 새로 그리면 표의 '지운 줄' 기록이 사라져서 따로 들고 있는다(2026-10-26)
  const removedRef = useRef<Map<string, ShipmentRow>>(new Map());
  const clientNames = clients.map((client) => client.name);
  // 상세 조회(⌄)로 적용한 조건. 받은 출하 중 맞는 줄만 표에 둔다(다른 날짜를 조회하는 것과 같이 다룬다)
  const [detailFilter, setDetailFilter] = useState<ShipmentDetailFilter>(NO_FILTER);
  const detailFilterRef = useRef(detailFilter);
  detailFilterRef.current = detailFilter;
  const keepRemoved = () => {
    for (const row of gridRef.current?.getChanges().deletedRows ?? []) {
      if (row.record) removedRef.current.set(recordKey(row), row);
    }
  };
  const redraw = () => {
    keepRemoved();
    setVersion((previous) => previous + 1);
  };
  const alert = (message: string) => setAlertState({ message });

  // 표 안에서 고친 값을 목록으로 되받아 온다(표는 다시 그리지 않는다)
  const pull = (): ShipmentRow[] => {
    const active = gridRef.current?.getActiveRows();
    if (!active) return rowsRef.current;
    rowsRef.current = active;
    setRows(active);
    return active;
  };

  // 송연 loadShipSchedule: 날짜가 있어야 조회. 마지막 조회의 응답만 쓴다.
  // keepNew: 로트 배분 · 저장 중 오류 뒤 다시 받을 때는 아직 저장 안 한 새 줄을 지우지 않고 뒤에 남긴다(dropKeys: 이미 저장한 줄)
  const loadRows = useCallback(async (shipDate: string, keepNew = false, dropKeys: number[] = []) => {
    if (!shipDate) {
      setError('조회할 날짜를 먼저 선택해주세요');
      return;
    }
    const requestId = ++requestIdRef.current;
    setLoading(true);
    try {
      const records = await fetchShipments(shipDate);
      if (requestId !== requestIdRef.current) return;
      const kept = keepNew
        ? (gridRef.current?.getActiveRows() ?? rowsRef.current).filter((row) => !row.record && !dropKeys.includes(row.key))
        : [];
      const loaded = filterOrderRows(records.map((record) => toShipmentRow(nextKeyRef.current++, record, shipDate)), detailFilterRef.current);
      originalQtyRef.current = new Map(loaded.map((row) => [recordKey(row), qtyText(row.orderQty)]));
      removedRef.current = new Map();
      const next = [...loaded, ...kept];
      setDirty(kept.some((row) => !row.record));
      rowsRef.current = next;
      setRows(next);
      setLoadedDate(shipDate);
      setVersion((previous) => previous + 1);
    } catch (requestError) {
      if (requestId === requestIdRef.current) setError(errorText(requestError, '출하 목록을 불러오지 못했습니다.'));
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, []);

  // 송연처럼 열면 오늘 출하를 바로 보여주고, 매출 거래처·품목 후보를 한 번 받는다(못 받으면 고르기 목록 없이)
  useEffect(() => {
    void loadRows(todayDash());
    fetchOrderClientOptions().then(setClients).catch(() => undefined);
    fetchOrderProducts().then(setProducts).catch(() => undefined);
  }, [loadRows]);

  // 송연 "+ 출하 추가"·수주등록 가져오기: 저장 전 새 줄. 출고일은 조회 날짜(가져온 건은 물류출고일)
  const addRows = (orders?: PendingOrder[]) => {
    const current = pull();
    const added = orders
      ? orders.map((order) => rowFromOrder(nextKeyRef.current++, order, loadedDate))
      : [toShipmentRow(nextKeyRef.current++, null, loadedDate)];
    const next = [...current, ...added];
    rowsRef.current = next;
    setRows(next);
    redraw();
  };
  // 오른쪽 클릭 [행 추가]의 빈 줄(출고일 = 조회 날짜)
  const createRow = () => toShipmentRow(nextKeyRef.current++, null, loadedDate);

  // ===== 2026-10-23 제목줄 [저장] · [삭제] (송연 s-save · s-del 을 줄마다 하던 것) =====
  // 표에서 빼 둔 저장된 출하(제목줄 [삭제] · 오른쪽 클릭 [행 삭제]). [저장] 때 서버에서 지운다
  const deletedSaved = (): ShipmentRow[] => {
    keepRemoved();
    return [...removedRef.current.values()];
  };
  const hasPending = () => {
    const pending = pendingShipments(gridRef.current?.getActiveRows() ?? rowsRef.current, originalQtyRef.current);
    return pending.creates.length > 0 || pending.updates.length > 0 || deletedSaved().length > 0;
  };
  const refreshDirty = () => setDirty(hasPending());
  // Delete 키로 지운 줄(2026-10-30): F1-Grid 는 Delete 키에서 [행 삭제] 막기를 보지 않아, 권한이 없거나 지울 수 없는 줄이 섞였으면
  // 지운 줄을 모두 되살리고 알린다. 아니면 저장할 것이 있는지 다시 본다(표의 onChangesChange)
  const handleGridChanges = (canDelete: boolean) => {
    const restored = restoreBlockedGridDeletes(gridRef.current, canDelete, canDeleteShipment);
    if (restored.length === 0) {
      refreshDirty();
      return;
    }
    restored.forEach((row) => {
      if (row.record) removedRef.current.delete(recordKey(row));
    });
    alert(canDelete ? '출하확정된 줄 · 생산연동 줄은 지울 수 없어요' : '삭제 권한이 없어요');
  };

  // 저장하지 않은 변경이 있으면 먼저 묻고 한다([조회])
  const guard = (action: () => void) => {
    if (hasPending()) {
      setConfirmLeave(() => action);
      return;
    }
    action();
  };
  const reload = () => guard(() => void loadRows(date));
  // 상세 조회(⌄) [조회]: 저장하지 않은 변경이 있으면 먼저 묻고, 조건을 적용해 다시 받는다
  const applyDetailFilter = (filter: ShipmentDetailFilter) => guard(() => {
    detailFilterRef.current = filter;
    setDetailFilter(filter);
    void loadRows(date);
  });
  const continueLeave = () => {
    const action = confirmLeave;
    setConfirmLeave(null);
    action?.();
  };

  // 고른 줄에 지울 수 없는 줄이 있는지(오른쪽 클릭 [행 삭제] 끄기)
  const handleSelectionChange = (ids: Array<string | number>) => {
    const active = gridRef.current?.getActiveRows() ?? rowsRef.current;
    setSelectionLocked(ids.some((id) => {
      const row = active.find((item) => String(item.key) === String(id));
      return Boolean(row && !canDeleteShipment(row));
    }));
  };

  // 제목줄 [삭제]: 고른 줄을 표에서 뺀다(오른쪽 클릭 [행 삭제]와 같음). 지우기는 [저장] 때
  const removeSelected = () => {
    const picked = gridRef.current?.getSelectedRows() ?? [];
    if (picked.length === 0) {
      alert('지울 출하 줄을 먼저 골라주세요(줄을 누르면 골라집니다)');
      return;
    }
    if (picked.some((row) => !canDeleteShipment(row))) {
      alert('출하확정된 줄 · 생산연동 줄은 지울 수 없어요');
      return;
    }
    gridRef.current?.deleteSelectedRows();
  };

  // 지운 줄 삭제 → 새 줄 등록(출고일 · 거래처 확인, 수주에서 가져온 줄이면 그 수주의 '출하로 가져감' 표시까지 서버가 한 번에)
  // → 저장된 줄 출하량 저장(생산연동 줄은 생산확정 줄의 실출하량). 거절되면 거기서 멈추고 알린다. 다 되면 다시 조회한다
  const saveAll = async () => {
    const removed = deletedSaved();
    const { creates, updates } = pendingShipments(pull(), originalQtyRef.current);
    if (removed.length === 0 && creates.length === 0 && updates.length === 0) return;
    const created: number[] = [];
    setSaving(true);
    try {
      for (const row of removed) {
        try {
          await deleteShipment((row.record as NonNullable<ShipmentRow['record']>).id);
          removedRef.current.delete(recordKey(row));
        } catch (requestError) {
          alert(errorText(requestError, '삭제에 실패했어요'));
          await loadRows(loadedDate, true);
          return;
        }
      }
      for (const row of creates) {
        const problem = !row.scheduleDate
          ? '출고일을 입력해주세요'
          : !row.clientCode && isUnknownClient(row.clientName, clientNames)
            ? unknownClientMessage(row.clientName.trim(), clientNames)
            : '';
        try {
          if (problem) throw new Error(problem);
          await createShipment(saveBodyOf(row));
          created.push(row.key);
        } catch (requestError) {
          alert(errorText(requestError, '저장에 실패했어요'));
          await loadRows(loadedDate, true, created); // 이미 등록한 새 줄은 목록에서 다시 받는다
          return;
        }
      }
      for (const row of updates) {
        try {
          await updateActualQty(row.record as NonNullable<ShipmentRow['record']>, qtyText(row.orderQty));
        } catch (requestError) {
          alert(errorText(requestError, '저장에 실패했어요'));
          await loadRows(loadedDate, true, created);
          return;
        }
      }
      showSuccess('저장되었습니다');
      await loadRows(loadedDate);
    } finally {
      setSaving(false);
    }
  };

  // 지울 출하가 있으면 먼저 몇 건인지 묻는다
  const askSave = () => {
    const count = deletedSaved().length;
    if (count > 0) {
      setConfirmDelete(count);
      return;
    }
    void saveAll();
  };
  const confirmDeleteAndSave = () => {
    setConfirmDelete(0);
    void saveAll();
  };

  // 송연 openLotPickModal: 저장된 줄은 로트를 여러 개로 나눠 적을 수 있다(적어둔 배분을 받아 온다). 저장 전 줄은 하나만 고른다.
  const openLot = async (key: number) => {
    const row = pull().find((item) => item.key === key);
    if (!row) return;
    const productName = row.record ? row.record.productName || '' : row.productName.trim();
    if (!productName) {
      alert('먼저 품목명을 입력해주세요');
      return;
    }
    try {
      let alloc: AllocationMode | null = null;
      if (row.record) {
        const qty = parseQtyNumber(qtyText(row.orderQty));
        if (!qty) {
          alert('먼저 출하량을 적고 저장해주세요. 그 수량을 로트별로 나눕니다.');
          return;
        }
        alloc = { shipmentId: row.record.id, targetQty: qty, existing: await fetchAllocations(row.record.id) };
      }
      // 품목명(규격)과 같은 제품이 없으면 로트도 생산예정 수주도 찾지 않는다
      const found = await fetchLots(productName);
      const matched = Boolean(found.productCode);
      const orders = matched ? await fetchPlannedOrders(productName) : [];
      setLotPick({ rowKey: key, productName, alloc, lots: matched ? found.lots : null, orders });
    } catch (requestError) {
      alert(errorText(requestError, '로트를 불러오지 못했어요'));
    }
  };

  const pickLot = (lot: LotPick) => {
    if (!lotPick) return;
    const next = pull().map((row) => (row.key === lotPick.rowKey ? applyLotPick(row, lot) : row));
    rowsRef.current = next;
    setRows(next);
    redraw();
    setLotPick(null);
  };

  // 송연 lot-pick-alloc-save: 저장되면 창을 닫고 목록을 다시 받는다(로트 칸이 배분대로 바뀐다)
  const saveAlloc = async (allocations: { lotId: number; qty: number }[]) => {
    if (!lotPick?.alloc) return;
    try {
      await saveAllocations(lotPick.alloc.shipmentId, allocations);
    } catch (requestError) {
      alert(errorText(requestError, '로트 배분 저장에 실패했어요'));
      return;
    }
    setLotPick(null);
    await loadRows(loadedDate, true);
  };

  // 송연 ship-excel-btn: 그 날짜 출하를 서버에서 다시 받아 파일로(아직 저장 안 한 줄은 들어가지 않는다)
  const exportExcel = async () => {
    if (!date) {
      setError('조회할 날짜를 먼저 선택해주세요');
      return;
    }
    try {
      const records = await fetchShipments(date);
      if (records.length === 0) {
        alert('다운로드할 데이터가 없어요');
        return;
      }
      await downloadExcel(records, SHIPMENT_EXCEL_COLUMNS, `출하등록_${date}.xlsx`, '출하등록');
    } catch (requestError) {
      setError(errorText(requestError, '다운로드하지 못했어요'));
    }
  };

  const openImport = () => {
    if (date) {
      const range = importRange(date);
      setImportStart(range.start);
      setImportEnd(range.end);
    }
    setImportOpen(true);
  };

  return {
    gridRef,
    date,
    setDate,
    loadedDate,
    rows,
    version,
    loading,
    saving,
    dirty,
    error,
    setError,
    alertState,
    alert,
    closeAlert: () => setAlertState(null),
    confirmDelete,
    cancelDelete: () => setConfirmDelete(0),
    confirmDeleteAndSave,
    confirmLeave,
    cancelLeave: () => setConfirmLeave(null),
    continueLeave,
    clients,
    products,
    applyDetailFilter,
    selectionLocked,
    handleSelectionChange,
    handleGridChanges,
    reload,
    addRows,
    createRow,
    removeSelected,
    askSave,
    exportExcel,
    lotPick,
    openLot,
    pickLot,
    saveAlloc,
    closeLotPick: () => setLotPick(null),
    importOpen,
    importStart,
    importEnd,
    setImportStart,
    setImportEnd,
    openImport,
    closeImport: () => setImportOpen(false),
    fetchImportOrders,
  };
}

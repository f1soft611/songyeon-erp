import { useCallback, useEffect, useRef, useState } from 'react';
import type { F1GridRef } from '../../../../../shared/components/f1-grid';
import { useNotification } from '../../../../../shared/context/NotificationContext';
import { downloadExcel, todayDash } from '../../../../../shared/utils/excelFile';
import { restoreBlockedGridDeletes } from '../../../../../shared/utils/gridDelete';
import { unknownClientMessage } from '../../../../co/master/item-master/utils/productBom';
import { finishOrderHandoff, useOrderHandoff } from '../orderHandoff';
import {
  createOrder,
  deleteOrder,
  fetchOrderClientOptions,
  fetchOrderProducts,
  fetchOrders,
  updateOrder,
} from '../services/salesOrder.service';
import type { OrderAlertState, OrderClientOption, OrderDetailFilter, OrderProduct, OrderRow } from '../types/salesOrder.types';
import {
  emptyOrderRow,
  filterOrderRows,
  focusFieldOf,
  fromSaved,
  importedLabel,
  isUnknownClient,
  ORDER_EXCEL_COLUMNS,
  orderSnapshot,
  pendingOrderRows,
  saveBodyOf,
  summaryOf,
} from '../utils/salesOrder';

const errorText = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;
const NO_FILTER: OrderDetailFilter = { clientName: '', product: '' };

// 수주등록 화면의 조회 · 저장 상태(S_ERP 품목관리 useMaterialManagement 와 같은 역할)
// 2026-10-23 줄 끝 [저장] · [수정] · [삭제] 칸을 빼고 제목줄 [저장]으로 새 줄 · 고친 줄 · 지운 줄을 한 번에 보낸다.
// 지우기는 제목줄 [삭제] 나 오른쪽 클릭 [행 삭제]로 표에서 빼 두고 [저장] 때 지운다. 생산확정 · 출하등록에서 가져간 줄은 고치지도 지우지도 못한다
export function useSalesOrderManagement() {
  const { showSuccess } = useNotification();
  const gridRef = useRef<F1GridRef<OrderRow>>(null);
  const requestIdRef = useRef(0);
  const nextKeyRef = useRef(1);
  // 처음 불러온 값(수주 id → 저장 칸 글자). 제목줄 [저장]이 고친 줄을 찾는다
  const originalsRef = useRef<Map<number, string>>(new Map());
  const [date, setDate] = useState(() => todayDash());
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState<(() => void) | null>(null);
  // [저장] 때 지울 수주가 있으면 먼저 묻는다(지울 건수)
  const [confirmDelete, setConfirmDelete] = useState(0);
  // 고른(오른쪽 클릭한) 줄에 가져간 수주가 있으면 [행 삭제]를 끈다
  const [selectionHasImported, setSelectionHasImported] = useState(false);
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [summary, setSummary] = useState(() => summaryOf([]));
  // F1-Grid 는 받은 목록을 표 안에 따로 들고 있어서, 잠금·줄 추가처럼 줄 자체가 바뀌면 표를 새로 그린다
  const [version, setVersion] = useState(0);
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<OrderClientOption[]>([]);
  const [products, setProducts] = useState<OrderProduct[]>([]);
  const [error, setError] = useState('');
  const [alertState, setAlertState] = useState<OrderAlertState | null>(null);
  const [focusCell, setFocusCell] = useState<{ key: number; field: keyof OrderRow } | null>(null);
  // 표에서 빼 둔 저장된 수주. 줄 추가 등으로 표를 새로 그리면 표의 '지운 줄' 기록이 사라져서 따로 들고 있는다(2026-10-26)
  const removedRef = useRef<Map<number, OrderRow>>(new Map());
  // 이번에 이미 지운 수주(저장 도중 오류로 다시 조회하지 않았을 때 또 지우지 않게)
  const deletedIdsRef = useRef<Set<number>>(new Set());
  const clientNames = clients.map((client) => client.name);
  // 상세 조회(⌄)로 적용한 조건. 받은 수주 중 맞는 줄만 표에 둔다(다른 날짜를 조회하는 것과 같이 다룬다)
  const [detailFilter, setDetailFilter] = useState<OrderDetailFilter>(NO_FILTER);
  const detailFilterRef = useRef(detailFilter);
  detailFilterRef.current = detailFilter;
  const keepRemoved = () => {
    for (const row of gridRef.current?.getChanges().deletedRows ?? []) {
      if (row.id && !deletedIdsRef.current.has(row.id)) removedRef.current.set(row.id, row);
    }
  };
  const redraw = () => {
    keepRemoved();
    setVersion((previous) => previous + 1);
  };

  // 송연 loadProdSchedule: 날짜가 있어야 조회. 날짜를 빠르게 바꿔 조회하면 마지막 조회의 응답만 쓴다
  const loadRows = useCallback(async (orderDate: string) => {
    if (!orderDate) {
      setError('조회할 날짜를 먼저 선택해주세요');
      return;
    }
    const requestId = ++requestIdRef.current;
    setLoading(true);
    try {
      const saved = await fetchOrders(orderDate);
      if (requestId !== requestIdRef.current) return;
      const next = filterOrderRows(saved.map((row) => fromSaved(row, nextKeyRef.current++)), detailFilterRef.current);
      originalsRef.current = new Map(next.map((row) => [row.id as number, orderSnapshot(row)]));
      removedRef.current = new Map();
      deletedIdsRef.current = new Set();
      setDirty(false);
      setRows(next);
      setSummary(summaryOf(next));
      setVersion((previous) => previous + 1);
    } catch (requestError) {
      if (requestId === requestIdRef.current) setError(errorText(requestError, '수주 목록을 불러오지 못했습니다.'));
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, []);

  // 송연 gotoSalesOrder: 생산확정 가져오기 창의 '→' 로 들어오면 그 수주일로 조회하고 그 줄을 잠깐 밝힌다
  const handoff = useOrderHandoff();
  const [flashId, setFlashId] = useState<number | null>(null);
  useEffect(() => {
    if (!handoff) return;
    setDate(handoff.date);
    void loadRows(handoff.date);
    setFlashId(handoff.orderId);
    finishOrderHandoff();
  }, [handoff, loadRows]);
  // 밝힌 줄은 2.4초 뒤 원래대로(넘겨받기를 비우면 위 효과가 다시 돌아서, 타이머는 따로 둔다)
  useEffect(() => {
    if (flashId == null) return undefined;
    const timer = setTimeout(() => setFlashId(null), 2400);
    return () => clearTimeout(timer);
  }, [flashId]);

  // 송연처럼 열면 오늘 수주를 바로 보여주고(찾아온 수주가 있으면 그 날짜), 매출 거래처·품목 후보를 한 번 받는다(못 받으면 고르기 목록 없이)
  useEffect(() => {
    if (!handoff) void loadRows(todayDash());
    fetchOrderClientOptions().then(setClients).catch(() => undefined);
    fetchOrderProducts().then(setProducts).catch(() => undefined);
    // 처음 열 때 한 번만
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadRows]);

  // 고칠 칸으로 보내기. 표를 다시 그린 뒤에 열어야 해서 그린 다음으로 미룬다
  useEffect(() => {
    if (!focusCell) return;
    gridRef.current?.startEdit(focusCell.key, focusCell.field);
    setFocusCell(null);
  }, [focusCell, version]);

  // 표 안에서 고친 값을 목록으로 되받아 온다(표는 다시 그리지 않는다)
  const pull = (): OrderRow[] => {
    const active = gridRef.current?.getActiveRows();
    if (!active) return rows;
    setRows(active);
    return active;
  };

  // 저장·삭제는 서버 응답을 기다린 뒤라 그 사이 바뀐 목록을 기준으로 고치고, 합계를 다시 센다
  const changeRows = (change: (previous: OrderRow[]) => OrderRow[]) => {
    setRows((previous) => {
      const next = change(previous);
      setSummary(summaryOf(next));
      return next;
    });
    redraw();
  };

  // 송연 "+ 수주 추가": 빈 줄 하나(저장 전, 빨간 표시). 합계는 저장·삭제 때만 다시 센다
  const addRow = () => {
    const current = pull();
    const key = nextKeyRef.current++;
    setRows([...current, emptyOrderRow(key)]);
    redraw();
    setFocusCell({ key, field: 'clientName' });
  };
  // 오른쪽 클릭 [행 추가]의 빈 줄
  const createRow = () => emptyOrderRow(nextKeyRef.current++);

  // 표에서 빼 둔 저장된 수주(제목줄 [삭제] · 오른쪽 클릭 [행 삭제]). [저장] 때 서버에서 지운다
  const deletedSaved = (): OrderRow[] => {
    keepRemoved();
    return [...removedRef.current.values()];
  };

  // 저장할 것(새 줄 · 고친 줄 · 지운 줄)이 있는지. 표의 값을 읽어 본다(표는 다시 그리지 않는다)
  const hasPending = () => {
    const active = gridRef.current?.getActiveRows() ?? rows;
    return pendingOrderRows(active, originalsRef.current).length > 0 || deletedSaved().length > 0;
  };
  const refreshDirty = () => setDirty(hasPending());
  // Delete 키로 지운 줄(2026-10-30): F1-Grid 는 Delete 키에서 [행 삭제] 막기를 보지 않아, 권한이 없거나 지울 수 없는 줄이 섞였으면
  // 지운 줄을 모두 되살리고 알린다. 아니면 저장할 것이 있는지 다시 본다(표의 onChangesChange)
  const handleGridChanges = (canDelete: boolean) => {
    const restored = restoreBlockedGridDeletes(gridRef.current, canDelete, (row) => !importedLabel(row));
    if (restored.length === 0) {
      refreshDirty();
      return;
    }
    restored.forEach((row) => {
      if (row.id) removedRef.current.delete(row.id);
    });
    setAlertState({ message: canDelete ? '생산확정 · 출하등록에서 가져간 수주는 지울 수 없어요' : '삭제 권한이 없어요' });
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
  const applyDetailFilter = (filter: OrderDetailFilter) => guard(() => {
    detailFilterRef.current = filter;
    setDetailFilter(filter);
    void loadRows(date);
  });
  const continueLeave = () => {
    const action = confirmLeave;
    setConfirmLeave(null);
    action?.();
  };

  // 고른 줄에 가져간 수주가 있는지(오른쪽 클릭 [행 삭제] 끄기)
  const handleSelectionChange = (ids: Array<string | number>) => {
    const active = gridRef.current?.getActiveRows() ?? rows;
    setSelectionHasImported(ids.some((id) => {
      const row = active.find((item) => String(item.key) === String(id));
      return Boolean(row && importedLabel(row));
    }));
  };

  // 제목줄 [삭제](2026-10-23): 고른 줄을 표에서 뺀다(오른쪽 클릭 [행 삭제]와 같음). 지우기는 [저장] 때.
  // 생산확정 · 출하등록에서 가져간 수주는 뺄 수 없다
  const removeSelected = () => {
    const picked = gridRef.current?.getSelectedRows() ?? [];
    if (picked.length === 0) {
      setAlertState({ message: '지울 수주 줄을 먼저 골라주세요(줄을 누르면 골라집니다)' });
      return;
    }
    if (picked.some((row) => importedLabel(row))) {
      setAlertState({ message: '생산확정 · 출하등록에서 가져간 수주는 지울 수 없어요' });
      return;
    }
    gridRef.current?.deleteSelectedRows();
  };

  const saveAll = async () => {
    const removed = deletedSaved();
    const targets = pendingOrderRows(pull(), originalsRef.current);
    if (targets.length === 0 && removed.length === 0) return;
    setSaving(true);
    try {
      for (const row of removed) {
        try {
          await deleteOrder(row.id as number);
          removedRef.current.delete(row.id as number);
          deletedIdsRef.current.add(row.id as number);
          originalsRef.current.delete(row.id as number);
        } catch (requestError) {
          setAlertState({ message: errorText(requestError, '삭제하지 못했어요') });
          await loadRows(date);
          return;
        }
      }
      for (const row of targets) {
        if (!row.clientCode && isUnknownClient(row.clientName, clientNames)) {
          setAlertState({ message: unknownClientMessage(row.clientName.trim(), clientNames), focus: { key: row.key, field: 'clientName' } });
          return;
        }
        const body = saveBodyOf(row, date);
        try {
          if (row.id) {
            await updateOrder(row.id, body);
            originalsRef.current.set(row.id, orderSnapshot(row));
          } else {
            const id = await createOrder(body);
            originalsRef.current.set(id, orderSnapshot({ ...row, id }));
            changeRows((previous) => previous.map((item) => (item.key === row.key ? { ...item, id } : item)));
          }
        } catch (requestError) {
          const message = errorText(requestError, '저장하지 못했어요');
          setAlertState({ message, focus: { key: row.key, field: focusFieldOf(message) } });
          return;
        }
      }
      showSuccess('저장되었습니다');
      await loadRows(date);
    } finally {
      setSaving(false);
    }
  };

  // 2026-10-23 제목줄 [저장](송연 p-save 를 줄마다 하던 것): 지운 줄을 먼저 지우고, 새 줄은 등록, 고친 줄은 수정을 화면 차례대로 보낸다.
  // 거절되면 거기서 멈추고 서버 문구를 띄우고 그 칸으로 보낸다(앞에서 저장된 줄은 저장된 채로 둔다). 다 되면 다시 조회한다.
  // 지울 수주가 있으면 먼저 몇 건인지 묻는다
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

  // 송연 prod-excel-btn: 그 날짜 수주를 서버에서 다시 받아 파일로(아직 저장 안 한 줄은 들어가지 않는다)
  const exportExcel = async () => {
    if (!date) {
      setError('조회할 날짜를 먼저 선택해주세요');
      return;
    }
    try {
      const saved = await fetchOrders(date);
      if (saved.length === 0) {
        setAlertState({ message: '다운로드할 데이터가 없어요' });
        return;
      }
      await downloadExcel(saved, ORDER_EXCEL_COLUMNS, `수주등록_${date}.xlsx`, '수주등록');
    } catch (requestError) {
      setError(errorText(requestError, '다운로드하지 못했어요'));
    }
  };

  const closeAlert = () => {
    const focus = alertState?.focus;
    setAlertState(null);
    if (focus) setFocusCell(focus);
  };

  return {
    gridRef,
    date,
    setDate,
    rows,
    summary,
    version,
    loading,
    saving,
    dirty,
    error,
    setError,
    alertState,
    closeAlert,
    confirmDelete,
    cancelDelete: () => setConfirmDelete(0),
    confirmDeleteAndSave,
    confirmLeave,
    cancelLeave: () => setConfirmLeave(null),
    continueLeave,
    clients,
    products,
    applyDetailFilter,
    flashId,
    selectionHasImported,
    handleSelectionChange,
    handleGridChanges,
    reload,
    addRow,
    createRow,
    removeSelected,
    askSave,
    exportExcel,
  };
}

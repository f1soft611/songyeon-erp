import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Box, Button, Card, Chip, TextField, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import MoveToInboxIcon from '@mui/icons-material/MoveToInbox';
import SaveIcon from '@mui/icons-material/Save';
import SearchIcon from '@mui/icons-material/Search';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { type PermissionActionGroupDefinition } from '../../../../shared/components/PermissionGroup';
import { PageMessageArea } from '../../../../shared/components/PageMessageArea';
import { PageSearchArea } from '../../../../shared/components/PageSearchArea';
import { UnsavedChangesConfirmDialog } from '../../../../shared/components/UnsavedChangesConfirmDialog';
import { useNotification } from '../../../../shared/context/NotificationContext';
import { resetGridStorageIfColumnsChanged } from '../../../../shared/utils/gridStorage';
import {
  F1Grid,
  type F1GridColumn,
  type F1GridRef,
} from '../../../../shared/components/f1-grid';
import { downloadExcel, todayDash } from '../../../../shared/utils/excelFile';
import type { MenuPermission, ModuleItem, PageContent } from '../../../dashboard/types/dashboard';
import { ConfirmDialog } from '../../../../shared/components/ConfirmDialog';
import { unknownClientMessage } from '../../../co/master/item-master/utils/productBom';
import { fetchOrderClients, fetchOrderProducts, type OrderProduct } from '../../order/order-register/services/salesOrder.service';
import { isUnknownClient, parseQtyNumber } from '../../order/order-register/utils/salesOrder';
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
} from './services/shipment.service';
import {
  applyLotPick,
  canDeleteShipment,
  importRange,
  isConfirmed,
  isProductionRow,
  lotText,
  pendingShipments,
  qtyText,
  recordKey,
  rowFromOrder,
  saveBodyOf,
  SHIPMENT_EXCEL_COLUMNS,
  shipLotText,
  shipmentStatus,
  toShipmentRow,
  type AllocationMode,
  type LotPick,
  type PendingOrder,
  type ProductLot,
  type ShipmentRow,
} from './utils/shipment';
import { LotPickDialog } from './components/LotPickDialog';
import { OrderImportDialog } from './components/OrderImportDialog';

const errorText = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;
const toOptions = (values: string[]) =>
  [...new Set(values.filter(Boolean))].map((value) => ({ value, label: value }));
const rowButton = { minWidth: 0, px: 1, py: 0 };
const STORAGE_KEY = 'sa-shipment-grid';
// 2026-10-23 줄 끝 단추 칸(sourceOrderId)을 빼고 상태 칸을 더했다. 저장된 칸 순서가 다르면 처음 순서로
const GRID_FIELDS = ['key', 'clientName', 'productName', 'scheduleDate', 'orderQty', 'lotLabel', 'note', 'status'];

type ShipmentPageProps = {
  selectedModule: ModuleItem;
  currentMenuName: string;
  content: PageContent;
  breadcrumbItems?: string[];
  selectedMenuPermissions?: MenuPermission;
};

const searchFieldSx = (theme: { palette: { mode: string } }) => ({
  height: 40,
  '& .MuiOutlinedInput-root': {
    height: '100%',
    borderRadius: '0 8px 8px 0',
    backgroundColor: theme.palette.mode === 'dark' ? 'rgba(15, 23, 42, 0.72)' : 'rgba(255,255,255,0.72)',
  },
});

// 로트 선택 창에 띄울 것. lots 가 null 이면 품목명이 등록된 제품과 일치하지 않은 것이다.
type LotPickState = { rowKey: number; productName: string; alloc: AllocationMode | null; lots: ProductLot[] | null; orders: PendingOrder[] };
type AlertState = { message: string };

// 영업관리 > 출하등록 (송연 SA0005)
// 출고일을 골라 그날 나가는 출하를 등록한다. 생산확정 줄에 물류출고일이 있으면 그 줄도 함께 보인다(생산연동).
// 새 줄은 모두 입력하고, 저장된 줄은 출하량만 고친다. 출하확정된 줄은 고치지 못한다.
// 2026-10-23 줄 끝 [저장] · [취소] · [삭제] 칸을 빼고 제목줄 [저장] · [삭제] 로 한다. 오른쪽 클릭 [행 추가] · [행 삭제] 도 된다.
// 지우기는 표에서 빼 두고 [저장] 때 지운다. 출하확정된 줄 · 생산연동 줄은 지우지 못한다('상태' 칸).
export function ShipmentPage({
  selectedModule,
  currentMenuName,
  content,
  breadcrumbItems,
  selectedMenuPermissions,
}: ShipmentPageProps) {
  useState(() => resetGridStorageIfColumnsChanged(STORAGE_KEY, GRID_FIELDS));
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
  const [clients, setClients] = useState<string[]>([]);
  const [products, setProducts] = useState<OrderProduct[]>([]);
  const [error, setError] = useState('');
  const [alertState, setAlertState] = useState<AlertState | null>(null);
  const [lotPick, setLotPick] = useState<LotPickState | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importStart, setImportStart] = useState('');
  const [importEnd, setImportEnd] = useState('');
  const rowsRef = useRef(rows);
  rowsRef.current = rows;
  // 표에서 빼 둔 저장된 출하. 줄 추가 · 로트 고르기로 표를 새로 그리면 표의 '지운 줄' 기록이 사라져서 따로 들고 있는다(2026-10-26)
  const removedRef = useRef<Map<string, ShipmentRow>>(new Map());
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
      const loaded = records.map((record) => toShipmentRow(nextKeyRef.current++, record, shipDate));
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

  // 송연처럼 열면 오늘 출하를 바로 보여주고, 매출 거래처·품목 후보를 한 번 받는다(못 받으면 자동완성 없이)
  useEffect(() => {
    void loadRows(todayDash());
    fetchOrderClients().then(setClients).catch(() => undefined);
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

  // 저장하지 않은 변경이 있으면 먼저 묻고 한다([조회])
  const guard = (action: () => void) => {
    if (hasPending()) {
      setConfirmLeave(() => action);
      return;
    }
    action();
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

  // 지울 출하가 있으면 먼저 몇 건인지 묻는다
  const askSave = () => {
    const count = deletedSaved().length;
    if (count > 0) {
      setConfirmDelete(count);
      return;
    }
    void saveAll();
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
          : isUnknownClient(row.clientName, clients)
            ? unknownClientMessage(row.clientName.trim(), clients)
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

  const pick = (lot: LotPick) => {
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

  // 저장 전 줄은 빨간 바탕에 왼쪽 선(수주등록과 같음)
  const cellStyle = (row: ShipmentRow, first = false): CSSProperties => {
    if (row.record) return {};
    return { background: 'rgba(220, 38, 38, 0.08)', ...(first ? { boxShadow: 'inset 4px 0 0 #dc2626' } : {}) };
  };

  const columns = useMemo<F1GridColumn<ShipmentRow>[]>(() => {
    const style = (first = false) => ({ getCellStyle: ({ row }: { row: ShipmentRow }) => cellStyle(row, first) });
    const isNew = (row: ShipmentRow) => !row.record;
    return [
      { field: 'key', type: 'rownumber', width: 60, headerName: '순번', headerAlign: 'center', align: 'center', pinned: 'left', ...style(true) },
      {
        field: 'clientName', headerName: '거래처', flex: 1.1, width: 110, headerAlign: 'center', align: 'left',
        type: 'autocomplete', options: toOptions(clients), editable: isNew, required: true, ...style(),
      },
      {
        field: 'productName', headerName: '품목명(규격)', flex: 1.4, width: 170, headerAlign: 'center', align: 'left',
        type: 'autocomplete', options: toOptions(products.map((product) => product.display)), editable: isNew, ...style(),
      },
      {
        field: 'scheduleDate', headerName: '출고일', width: 110, headerAlign: 'center', align: 'center',
        type: 'date', editable: isNew, ...style(),
      },
      {
        field: 'orderQty', headerName: '출하량', width: 90, headerAlign: 'center', align: 'right',
        type: 'number', decimalPlaces: 2, editable: (row) => !isConfirmed(row), ...style(),
      },
      {
        field: 'lotLabel', headerName: '로트', flex: 1.2, width: 100, headerAlign: 'center', align: 'left', ...style(),
        renderCell: ({ row }) => {
          if (isConfirmed(row) || isProductionRow(row)) {
            const text = row.record ? (isProductionRow(row) ? lotText(row.record.lotNo, row.record.lotDate) : shipLotText(row.record)) : '';
            return text ? <Chip size="small" color="success" variant="outlined" label={text} /> : '';
          }
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, width: '100%' }}>
              <Typography variant="body2" noWrap title={row.lotLabel.text}
                sx={{ flex: 1, minWidth: 0, fontWeight: row.lotLabel.bold ? 700 : 400, color: row.lotLabel.tone === 'teal' ? '#0f766e' : 'text.secondary' }}>
                {row.lotLabel.text}
              </Typography>
              <Button size="small" variant="outlined" sx={rowButton} onClick={() => void openLot(row.key)}>로트선택</Button>
            </Box>
          );
        },
      },
      { field: 'note', headerName: '비고', flex: 1, width: 200, headerAlign: 'center', align: 'left', editable: isNew, ...style() },
      // 2026-10-23 상태(보기만): 출하확정된 줄 · 생산연동 줄. 예전 줄 끝 단추 칸의 '— 수정불가' 표시를 옮겼다
      {
        field: 'status' as keyof ShipmentRow, headerName: '상태', width: 110, headerAlign: 'center', align: 'center', editable: false,
        getValue: (row) => shipmentStatus(row), ...style(),
      },
    ];
    // 로트선택 단추는 누를 때 표의 값을 다시 읽으므로, 표를 새로 그릴 때(version) 함께 새로 만든다
  }, [clients, products, version, loadedDate]);

  const pageActionGroups: PermissionActionGroupDefinition[] = [
    {
      key: 'read',
      actions: [
        { label: '조회', icon: SearchIcon, visible: Boolean(selectedMenuPermissions?.read), disabled: loading, onClick: () => guard(() => void loadRows(date)) },
        {
          label: '엑셀 다운로드', icon: FileDownloadIcon,
          visible: Boolean(selectedMenuPermissions?.excel || selectedMenuPermissions?.read), onClick: () => void exportExcel(),
        },
      ],
    },
    {
      key: 'write',
      actions: [
        { label: '수주등록 가져오기', icon: MoveToInboxIcon, visible: Boolean(selectedMenuPermissions?.create), onClick: openImport },
        { label: '출하 추가', icon: AddIcon, visible: Boolean(selectedMenuPermissions?.create), onClick: () => addRows() },
        // 2026-10-23 고른 줄을 표에서 뺀다(지우기는 [저장] 때). 출하확정 · 생산연동 줄은 안 된다
        { label: '삭제', icon: DeleteIcon, visible: Boolean(selectedMenuPermissions?.delete), disabled: saving, onClick: removeSelected },
        // 2026-10-23 새 줄 · 고친 출하량 · 지운 줄을 한 번에 보낸다
        {
          label: '저장', icon: SaveIcon,
          visible: Boolean(selectedMenuPermissions?.create || selectedMenuPermissions?.update || selectedMenuPermissions?.delete),
          disabled: !dirty || saving, onClick: askSave,
        },
      ],
    },
  ];

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%' }}>
      <PageHeader
        breadcrumbItems={breadcrumbItems && breadcrumbItems.length > 0 ? breadcrumbItems : [selectedModule.name, currentMenuName]}
        description={content.description}
        actionGroups={pageActionGroups}
      />
      <PageSearchArea
        searchField={
          <TextField
            type="date"
            size="small"
            margin="none"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            slotProps={{ htmlInput: { 'aria-label': '출하일' } }}
            sx={(theme) => ({ width: { xs: '100%', sm: 200 }, ...searchFieldSx(theme) })}
          />
        }
        onDefaultSearch={() => guard(() => void loadRows(date))}
      />
      <PageMessageArea message={error} onClose={() => setError('')} />
      <Box sx={{ p: { xs: 1.5, sm: 1 }, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Card sx={{ borderRadius: 1, border: '1px solid rgba(148,163,184,0.18)', boxShadow: 'none', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', p: 1.5 }}>
          {!loading && rows.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>이 날짜에 등록된 출하 예정이 없습니다</Typography>
          )}
          <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
            <F1Grid
              key={version}
              ref={gridRef}
              rows={rows}
              columns={columns}
              rowKey="key"
              storageKey={STORAGE_KEY}
              ariaLabel="F1-GRID 출하 목록"
              height="100%"
              maxHeight="100%"
              rowHeight={34}
              minRowHeight={34}
              maxRowHeight={320}
              columnLine
              showCheckbox={false}
              loading={loading}
              resizableRows={false}
              // 2026-10-23 우클릭 [행 추가]: 제목줄 [출하 추가]와 같은 빈 줄(출고일 = 조회 날짜, 등록 권한이 있을 때만)
              allowAddRowInContextMenu={Boolean(selectedMenuPermissions?.create)}
              createRow={() => toShipmentRow(nextKeyRef.current++, null, loadedDate)}
              allowDuplicateRowInContextMenu={false}
              // 2026-10-23 오른쪽 클릭 [행 삭제]: 표에서 빼 두고 [저장] 때 지운다. 출하확정 · 생산연동 줄을 고르면 꺼진다
              allowDeleteRowInContextMenu={Boolean(selectedMenuPermissions?.delete)}
              selectRowOnContextMenu
              deleteMenuDisabled={selectionLocked}
              onSelectionChange={(ids) => {
                const active = gridRef.current?.getActiveRows() ?? rowsRef.current;
                setSelectionLocked(ids.some((id) => {
                  const row = active.find((item) => String(item.key) === String(id));
                  return Boolean(row && !canDeleteShipment(row));
                }));
              }}
              onChangesChange={() => refreshDirty()}
            />
          </Box>
        </Card>
      </Box>
      {lotPick && (
        <LotPickDialog
          productName={lotPick.productName}
          lots={lotPick.lots}
          orders={lotPick.orders}
          alloc={lotPick.alloc}
          onPick={pick}
          onSaveAlloc={saveAlloc}
          onClose={() => setLotPick(null)}
          onAlert={alert}
        />
      )}
      {importOpen && (
        <OrderImportDialog
          start={importStart}
          end={importEnd}
          setStart={setImportStart}
          setEnd={setImportEnd}
          load={fetchImportOrders}
          onPull={(orders) => addRows(orders)}
          onClose={() => setImportOpen(false)}
          onAlert={alert}
        />
      )}
      <ConfirmDialog
        open={Boolean(alertState)}
        title="출하등록"
        message={alertState?.message ?? ''}
        alertOnly
        onCancel={() => setAlertState(null)}
        onConfirm={() => setAlertState(null)}
      />
      <ConfirmDialog
        open={confirmDelete > 0}
        title="출하 삭제"
        message={`출하 ${confirmDelete}건을 지우고 저장할까요?`}
        confirmLabel="삭제하고 저장"
        danger
        onCancel={() => setConfirmDelete(0)}
        onConfirm={() => {
          setConfirmDelete(0);
          void saveAll();
        }}
      />
      <UnsavedChangesConfirmDialog
        open={Boolean(confirmLeave)}
        title="저장하지 않은 변경사항"
        description="변경사항을 버리고 목록을 다시 불러오시겠습니까?"
        cancelLabel="취소"
        continueLabel="계속"
        onCancel={() => setConfirmLeave(null)}
        onContinue={() => {
          const action = confirmLeave;
          setConfirmLeave(null);
          action?.();
        }}
      />
    </Box>
  );
}

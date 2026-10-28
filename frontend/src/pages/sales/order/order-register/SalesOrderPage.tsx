import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Box, Card, TextField, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import SaveIcon from '@mui/icons-material/Save';
import SearchIcon from '@mui/icons-material/Search';
import { PageHeader } from '../../../shared/components/PageHeader';
import { type PermissionActionGroupDefinition } from '../../../shared/components/PermissionGroup';
import { PageMessageArea } from '../../../shared/components/PageMessageArea';
import { PageSearchArea } from '../../../shared/components/PageSearchArea';
import { UnsavedChangesConfirmDialog } from '../../../shared/components/UnsavedChangesConfirmDialog';
import { useNotification } from '../../../shared/context/NotificationContext';
import { resetGridStorageIfColumnsChanged } from '../../../shared/utils/gridStorage';
import {
  F1Grid,
  type F1GridColumn,
  type F1GridRef,
} from '../../../shared/components/f1-grid';
import { downloadExcel, todayDash } from '../../../shared/utils/excelFile';
import type { MenuPermission, ModuleItem, PageContent } from '../../dashboard/types/dashboard';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { unknownClientMessage } from '../../co/master/item-master/utils/productBom';
import {
  createOrder,
  deleteOrder,
  fetchOrderClients,
  fetchOrderProducts,
  fetchOrders,
  updateOrder,
  type OrderProduct,
} from './services/salesOrder.service';
import {
  canEditOrder,
  emptyOrderRow,
  focusFieldOf,
  formatTotal,
  fromSaved,
  importedLabel,
  isUnknownClient,
  ORDER_EXCEL_COLUMNS,
  orderSnapshot,
  pendingOrderRows,
  saveBodyOf,
  summaryOf,
  type OrderRow,
} from './utils/salesOrder';
import { finishOrderHandoff, useOrderHandoff } from './orderHandoff';

const errorText = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;
const toOptions = (values: string[]) =>
  [...new Set(values.filter(Boolean))].map((value) => ({ value, label: value }));
const STORAGE_KEY = 'sa-order-grid';
// 2026-10-23 마지막 단추 칸(key)을 빼고 가져감 칸을 더했다. 저장된 칸 순서가 다르면 처음 순서로
const GRID_FIELDS = [
  'id', 'clientName', 'productName', 'orderQty', 'note', 'productionDate', 'isStockProduction', 'logisticsDate',
  'importedProduction',
];

type SalesOrderPageProps = {
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

type AlertState = { message: string; focus?: { key: number; field: keyof OrderRow } };

// 영업관리 > 수주등록 (송연 SA0004)
// 수주일을 골라 그날 받은 수주를 등록한다. 2026-10-23 줄 끝 [저장] · [수정] · [삭제] 칸을 빼고
// 제목줄 [저장]으로 새 줄 · 고친 줄 · 지운 줄을 한 번에 보낸다. 지우기는 제목줄 [삭제] 나 오른쪽 클릭 [행 삭제]로 표에서 빼 두고 [저장] 때 지운다.
// 생산확정 · 출하등록에서 가져간 줄은 고치지도 지우지도 못한다('가져감' 칸).
export function SalesOrderPage({
  selectedModule,
  currentMenuName,
  content,
  breadcrumbItems,
  selectedMenuPermissions,
}: SalesOrderPageProps) {
  useState(() => resetGridStorageIfColumnsChanged(STORAGE_KEY, GRID_FIELDS));
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
  const [clients, setClients] = useState<string[]>([]);
  const [products, setProducts] = useState<OrderProduct[]>([]);
  const [error, setError] = useState('');
  const [alertState, setAlertState] = useState<AlertState | null>(null);
  const [focusCell, setFocusCell] = useState<{ key: number; field: keyof OrderRow } | null>(null);
  // 표에서 빼 둔 저장된 수주. 줄 추가 등으로 표를 새로 그리면 표의 '지운 줄' 기록이 사라져서 따로 들고 있는다(2026-10-26)
  const removedRef = useRef<Map<number, OrderRow>>(new Map());
  // 이번에 이미 지운 수주(저장 도중 오류로 다시 조회하지 않았을 때 또 지우지 않게)
  const deletedIdsRef = useRef<Set<number>>(new Set());
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
      const next = saved.map((row) => fromSaved(row, nextKeyRef.current++));
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

  // 송연처럼 열면 오늘 수주를 바로 보여주고(찾아온 수주가 있으면 그 날짜), 매출 거래처·품목 후보를 한 번 받는다(못 받으면 자동완성 없이)
  useEffect(() => {
    if (!handoff) void loadRows(todayDash());
    fetchOrderClients().then(setClients).catch(() => undefined);
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

  // 저장하지 않은 변경이 있으면 먼저 묻고 한다([조회])
  const guard = (action: () => void) => {
    if (hasPending()) {
      setConfirmLeave(() => action);
      return;
    }
    action();
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
        if (isUnknownClient(row.clientName, clients)) {
          setAlertState({ message: unknownClientMessage(row.clientName.trim(), clients), focus: { key: row.key, field: 'clientName' } });
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

  // 송연 줄 색: 저장 전은 빨간 바탕에 왼쪽 선. F1-Grid 는 줄에 스타일을 달 수 없어 칸마다 준다
  const cellStyle = useCallback((row: OrderRow, first = false): CSSProperties => {
    // 생산확정에서 찾아온 줄은 잠깐 노랗게 밝힌다(송연 row-flash)
    if (flashId != null && row.id === flashId) return { background: 'rgba(250, 204, 21, 0.35)', transition: 'background 0.4s ease' };
    if (row.id) return {};
    return {
      background: 'rgba(220, 38, 38, 0.08)',
      ...(first ? { boxShadow: 'inset 4px 0 0 #dc2626' } : {}),
    };
  }, [flashId]);

  const columns = useMemo<F1GridColumn<OrderRow>[]>(() => {
    const style = (first = false) => ({ getCellStyle: ({ row }: { row: OrderRow }) => cellStyle(row, first) });
    return [
      { field: 'id', type: 'rownumber', width: 60, headerName: '순번', headerAlign: 'center', align: 'center', pinned: 'left', ...style(true) },
      // 거래처는 서버가 반드시 요구한다. 물류출고일은 '재고생산' 과 둘 중 하나라 * 를 붙이지 않는다
      {
        field: 'clientName', headerName: '거래처', flex: 1.2, width: 160, headerAlign: 'center', align: 'left',
        type: 'autocomplete', options: toOptions(clients), editable: canEditOrder, required: true, ...style(),
      },
      {
        field: 'productName', headerName: '품목명(규격)', flex: 1.5, width: 200, headerAlign: 'center', align: 'left',
        type: 'autocomplete', options: toOptions(products.map((product) => product.display)), editable: canEditOrder, ...style(),
      },
      // 2026-10-23 숫자 칸(글자는 들어가지 않는다, 소수 둘째 자리까지)
      {
        field: 'orderQty', headerName: '수량', width: 100, headerAlign: 'center', align: 'right',
        type: 'number', decimalPlaces: 2, editable: canEditOrder, ...style(),
      },
      { field: 'note', headerName: '비고', flex: 1, width: 130, headerAlign: 'center', align: 'left', editable: canEditOrder, ...style() },
      {
        field: 'productionDate', headerName: '생산예정일', width: 120, headerAlign: 'center', align: 'center',
        type: 'date', editable: canEditOrder, ...style(),
      },
      // 재고생산에 체크하면 물류출고일을 비우고 잠근다
      {
        field: 'isStockProduction', headerName: '재고생산', width: 90, headerAlign: 'center', align: 'center',
        type: 'checkbox', editable: canEditOrder,
        onValueChange: (_row, value) => (value ? { isStockProduction: true, logisticsDate: '' } : { isStockProduction: false }),
        ...style(),
      },
      {
        field: 'logisticsDate', headerName: '물류출고일 (재고생산이면 비움)', width: 210, headerAlign: 'center', align: 'center',
        type: 'date', editable: (row) => canEditOrder(row) && !row.isStockProduction, ...style(),
      },
      // 생산확정 · 출하등록에서 가져간 줄(예전 줄 끝 단추 칸의 '— 수정불가' 표시). 보기만
      {
        field: 'importedProduction', headerName: '가져감', width: 150, headerAlign: 'center', align: 'center', editable: false,
        getValue: (row) => importedLabel(row), ...style(),
      },
    ];
  }, [clients, products, cellStyle]);

  const pageActionGroups: PermissionActionGroupDefinition[] = [
    {
      key: 'read',
      actions: [
        {
          label: '조회',
          icon: SearchIcon,
          visible: Boolean(selectedMenuPermissions?.read),
          disabled: loading,
          onClick: () => guard(() => void loadRows(date)),
        },
        {
          label: '엑셀 다운로드',
          icon: FileDownloadIcon,
          visible: Boolean(selectedMenuPermissions?.excel || selectedMenuPermissions?.read),
          onClick: () => void exportExcel(),
        },
      ],
    },
    {
      key: 'write',
      actions: [
        {
          label: '수주 추가',
          icon: AddIcon,
          visible: Boolean(selectedMenuPermissions?.create),
          onClick: addRow,
        },
        // 2026-10-23 고른 줄을 표에서 뺀다(지우기는 [저장] 때). 가져간 수주는 안 된다
        {
          label: '삭제',
          icon: DeleteIcon,
          visible: Boolean(selectedMenuPermissions?.delete),
          disabled: saving,
          onClick: removeSelected,
        },
        // 2026-10-23 새 줄 · 고친 줄 · 지운 줄을 한 번에 보낸다
        {
          label: '저장',
          icon: SaveIcon,
          visible: Boolean(selectedMenuPermissions?.create || selectedMenuPermissions?.update || selectedMenuPermissions?.delete),
          disabled: !dirty || saving,
          onClick: askSave,
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
            slotProps={{ htmlInput: { 'aria-label': '수주일' } }}
            sx={(theme) => ({ width: { xs: '100%', sm: 200 }, ...searchFieldSx(theme) })}
          />
        }
        onDefaultSearch={() => guard(() => void loadRows(date))}
      />
      <PageMessageArea message={error} onClose={() => setError('')} />
      <Box sx={{ p: { xs: 1.5, sm: 1 }, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Card sx={{ borderRadius: 1, border: '1px solid rgba(148,163,184,0.18)', boxShadow: 'none', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', p: 1.5 }}>
          <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
            <F1Grid
              key={version}
              ref={gridRef}
              rows={rows}
              columns={columns}
              rowKey="key"
              storageKey={STORAGE_KEY}
              ariaLabel="F1-GRID 수주 목록"
              height="100%"
              maxHeight="100%"
              rowHeight={34}
              minRowHeight={34}
              maxRowHeight={320}
              columnLine
              showCheckbox={false}
              loading={loading}
              resizableRows={false}
              // 2026-10-23 우클릭 [행 추가]: 제목줄 [수주 추가]와 같은 빈 줄(등록 권한이 있을 때만)
              allowAddRowInContextMenu={Boolean(selectedMenuPermissions?.create)}
              createRow={() => emptyOrderRow(nextKeyRef.current++)}
              allowDuplicateRowInContextMenu={false}
              // 2026-10-23 오른쪽 클릭 [행 삭제]: 표에서 빼 두고 [저장] 때 지운다. 가져간 수주를 고르면 꺼진다
              allowDeleteRowInContextMenu={Boolean(selectedMenuPermissions?.delete)}
              selectRowOnContextMenu
              deleteMenuDisabled={selectionHasImported}
              onSelectionChange={(ids) => {
                const active = gridRef.current?.getActiveRows() ?? rows;
                setSelectionHasImported(ids.some((id) => {
                  const row = active.find((item) => String(item.key) === String(id));
                  return Boolean(row && importedLabel(row));
                }));
              }}
              onChangesChange={() => refreshDirty()}
            />
          </Box>
          <Typography variant="body2" sx={{ mt: 1, textAlign: 'right', color: 'text.secondary' }}>
            수주품목수량: <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>{summary.count}건</Box>
            &nbsp;&nbsp;·&nbsp;&nbsp;
            총수주량: <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>{formatTotal(summary.total)}kg</Box>
          </Typography>
        </Card>
      </Box>
      <ConfirmDialog
        open={Boolean(alertState)}
        title="수주등록"
        message={alertState?.message ?? ''}
        alertOnly
        onCancel={closeAlert}
        onConfirm={closeAlert}
      />
      <ConfirmDialog
        open={confirmDelete > 0}
        title="수주 삭제"
        message={`수주 ${confirmDelete}건을 지우고 저장할까요?`}
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

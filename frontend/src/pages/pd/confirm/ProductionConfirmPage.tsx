import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Card, Chip, TextField, Typography } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import MoveToInboxIcon from '@mui/icons-material/MoveToInbox';
import SaveIcon from '@mui/icons-material/Save';
import SearchIcon from '@mui/icons-material/Search';
import { PageHeader } from '../../../shared/components/PageHeader';
import { type PermissionActionGroupDefinition } from '../../../shared/components/PermissionGroup';
import { PageMessageArea } from '../../../shared/components/PageMessageArea';
import { PageSearchArea } from '../../../shared/components/PageSearchArea';
import { UnsavedChangesConfirmDialog } from '../../../shared/components/UnsavedChangesConfirmDialog';
import { F1Grid, type F1GridColumn, type F1GridRef } from '../../../shared/components/f1-grid';
import { downloadExcel, todayDash } from '../../../shared/utils/excelFile';
import type { MenuPermission, ModuleItem, PageContent } from '../../dashboard/types/dashboard';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { unknownClientMessage } from '../../co/master/item-master/utils/productBom';
import { fetchClientNames } from '../../co/master/item-master/services/itemMaster.service';
import { fetchOrderProducts, type OrderProduct } from '../../sa/order/services/salesOrder.service';
import { formatTotal } from '../../sa/order/utils/salesOrder';
import { startOrderHandoff } from '../../sa/order/orderHandoff';
import { LabelPrintDialog, type LabelPrintTarget } from '../../../shared/components/LabelPrintDialog';
import { NO_PRODUCT_CODE_MESSAGE } from '../label/utils/labelPrint';
import {
  createSchedule,
  deleteSchedule,
  fetchBatchSheet,
  fetchSchedule,
  updateSchedule,
} from './services/productionConfirm.service';
import { ProductionImportDialog } from './components/ProductionImportDialog';
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
  scheduleSummary,
  type PendingOrder,
  type ScheduleRow,
} from './utils/productionConfirm';

const errorText = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;
const toOptions = (values: string[]) =>
  [...new Set(values.filter(Boolean))].map((value) => ({ value, label: value }));
const rowButton = { minWidth: 0, px: 1, py: 0 };

type ProductionConfirmPageProps = {
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

// 생산관리 > 생산확정 (송연 PD0001, 기존 20-production.js)
// 수주에서 가져온 건을 실제 생산으로 확정한다. 확정하면 로트번호가 붙고 배합비대로 원재료가 빠진다.
// 2026-10-26 줄의 [수정] · [삭제] 단추를 뺐다. 새 줄은 줄의 [확정], 확정된 줄은 바로 고치고 제목줄 [저장]으로 보낸다
// (빠졌던 원재료를 되돌린 뒤 다시 뺀다). 지우기는 제목줄 [삭제] · 오른쪽 클릭 [행 삭제]로 표에서 빼 두고 [저장] 때 지운다.
// 실생산량이 적혔거나 출하확정된 생산건은 지우지 못한다.
export function ProductionConfirmPage({
  selectedModule,
  currentMenuName,
  content,
  breadcrumbItems,
  selectedMenuPermissions,
}: ProductionConfirmPageProps) {
  const navigate = useNavigate();
  const gridRef = useRef<F1GridRef<ScheduleRow>>(null);
  const requestIdRef = useRef(0);
  const nextKeyRef = useRef(1);
  const [date, setDate] = useState(() => todayDash());
  const [rows, setRows] = useState<ScheduleRow[]>([]);
  const rowsRef = useRef(rows);
  rowsRef.current = rows;
  // F1-Grid 는 받은 목록을 따로 들고 있어서, 줄 자체가 바뀌면(잠금·담기·삭제) 표를 새로 그린다
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
  const redraw = () => setVersion((v) => v + 1);

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
    redraw();
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
      const next = records.map((record) => fromSaved(record, nextKeyRef.current++));
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

  // 송연 pc-save: 새 줄이면 확정(로트 발번·원재료 차감·수주 가져감), 확정된 줄이면 수정
  const save = async (key: number) => {
    const current = pull();
    const row = current.find((item) => item.key === key);
    if (!row) return;
    const typed = row.clientName.trim();
    if (typed && clients.length && !clients.includes(typed)) {
      setAlertText(unknownClientMessage(typed, clients));
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
      commit(pull().map((item) => (item.key === key ? { ...item, id, locked: true } : item)));
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
  // 다시 조회하면 사라지는 것: [저장]할 것 + 아직 [확정] 안 한 새 줄
  const guard = (action: () => void) => {
    if (hasChanges() || pull().some((row) => !row.id)) {
      setConfirmLeave(() => action);
      return;
    }
    action();
  };

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

  const askSave = () => {
    const count = removedRows().length;
    if (count > 0) {
      setConfirmDelete(count);
      return;
    }
    void saveAll();
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
        const typed = row.clientName.trim();
        if (typed && clients.length && !clients.includes(typed)) {
          setAlertText(unknownClientMessage(typed, clients));
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

  // 송연 pullOneOrder: 담기만 한다('확정' 을 눌러야 실제로 등록된다)
  const pullOrders = useCallback((orders: PendingOrder[]) => {
    const current = gridRef.current?.getActiveRows() ?? rowsRef.current;
    commit([...current, ...orders.map((order) => rowFromOrder(order, nextKeyRef.current++))]);
  }, []);

  // 송연 gotoSalesOrder: 그 수주를 등록한 날짜의 수주등록 화면으로 가서 그 줄을 잠깐 밝혀준다
  const gotoOrder = useCallback((order: PendingOrder) => {
    if (!order.orderDate) {
      setAlertText('이 수주는 등록일이 남아있지 않아 찾아갈 수 없어요.');
      return;
    }
    startOrderHandoff({ date: order.orderDate, orderId: order.id });
    setImportOpen(false);
    navigate('/sa/order');
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

  // 확정 전 줄은 빨간 바탕에 왼쪽 선(수주등록과 같음)
  const cellStyle = (row: ScheduleRow, first = false): CSSProperties =>
    (row.id ? {} : { background: 'rgba(220, 38, 38, 0.08)', ...(first ? { boxShadow: 'inset 4px 0 0 #dc2626' } : {}) });

  const columns = useMemo<F1GridColumn<ScheduleRow>[]>(() => {
    const style = (first = false) => ({ getCellStyle: ({ row }: { row: ScheduleRow }) => cellStyle(row, first) });
    // 2026-10-26 확정된 줄도 바로 고친다(예전에는 [수정]으로 잠금을 풀었다)
    const editable = () => true;
    return [
      { field: 'key', type: 'rownumber', width: 60, headerName: '순번', headerAlign: 'center', align: 'center', pinned: 'left', ...style(true) },
      { field: 'clientName', headerName: '거래처', flex: 1, width: 140, headerAlign: 'center', align: 'left', type: 'autocomplete', options: toOptions(clients), editable, ...style() },
      {
        field: 'productName', headerName: '품목명(규격)', flex: 1.4, width: 190, headerAlign: 'center', align: 'left',
        type: 'autocomplete', options: toOptions(products.map((product) => product.display)), editable, ...style(),
      },
      { field: 'orderQty', headerName: '생산지시량', width: 100, headerAlign: 'center', align: 'right', editable, ...style() },
      { field: 'note', headerName: '비고', flex: 1, width: 110, headerAlign: 'center', align: 'left', editable, ...style() },
      {
        field: 'scheduleDate', headerName: '생산예정일', width: 200, headerAlign: 'center', align: 'left', ...style(),
        renderCell: ({ row }) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
            <span>{row.scheduleDate || ''}</span>
            {row.isStockProduction && <Chip size="small" variant="outlined" label="재고생산" />}
            {row.substitutionCount > 0 && <Chip size="small" color="warning" variant="outlined" label={`원재료치환 ${row.substitutionCount}건`} />}
          </Box>
        ),
      },
      {
        field: 'sourceOrderId', headerName: '', width: 320, headerAlign: 'center', align: 'center', pinned: 'right', ...style(),
        renderCell: ({ row }) => (
          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
            {/* 새 줄만 [확정]. 확정된 줄은 고친 뒤 제목줄 [저장](2026-10-26 [수정] · [삭제] 단추를 뺐다) */}
            <Button size="small" variant="contained" sx={rowButton} disabled={Boolean(row.id)} onClick={() => void save(row.key)}>확정</Button>
            <Button size="small" variant="outlined" sx={rowButton} disabled={!row.id}
              title="이 생산건의 투입지시서를 인쇄해요 (배합비를 생산지시량에 맞춰 kg으로 환산)" onClick={() => void openBatchSheet(row)}>📄 레시피</Button>
            <Button size="small" variant="outlined" sx={rowButton} disabled={!row.id}
              title="이 생산건의 제품 라벨을 인쇄해요 (제조년월일 = 생산일)" onClick={() => void openLabel(row)}>🏷️ 라벨</Button>
          </Box>
        ),
      },
    ];
    // 단추는 누를 때 표의 값을 다시 읽으므로, 표를 새로 그릴 때(version) 함께 새로 만든다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clients, products, version, date]);

  const summary = scheduleSummary(rows);
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
        { label: '수주등록 가져오기', icon: MoveToInboxIcon, visible: Boolean(selectedMenuPermissions?.create), onClick: () => setImportOpen(true) },
        // 2026-10-26 고른 줄을 표에서 뺀다(지우기는 [저장] 때). 실생산량이 적힌 건은 안 된다
        { label: '삭제', icon: DeleteIcon, visible: Boolean(selectedMenuPermissions?.delete), disabled: saving, onClick: removeSelected },
        // 2026-10-26 고친 확정 줄 · 지운 줄을 한 번에 보낸다(새 줄은 줄의 [확정])
        {
          label: '저장', icon: SaveIcon,
          visible: Boolean(selectedMenuPermissions?.update || selectedMenuPermissions?.delete || selectedMenuPermissions?.create),
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
            slotProps={{ htmlInput: { 'aria-label': '생산일자' } }}
            sx={(theme) => ({ width: { xs: '100%', sm: 200 }, ...searchFieldSx(theme) })}
          />
        }
        onDefaultSearch={() => guard(() => void loadRows(date))}
      />
      <PageMessageArea message={error} onClose={() => setError('')} />
      <PageMessageArea message={notice} severity="success" onClose={() => setNotice('')} />
      <Box sx={{ p: { xs: 1.5, sm: 1 }, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Card sx={{ borderRadius: 1, border: '1px solid rgba(148,163,184,0.18)', boxShadow: 'none', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', p: 1.5 }}>
          {!loading && rows.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>이 날짜에 확정된 생산이 없습니다</Typography>
          )}
          <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
            <F1Grid
              key={version}
              ref={gridRef}
              rows={rows}
              columns={columns}
              rowKey="key"
              storageKey="pd-confirm-grid"
              ariaLabel="F1-GRID 생산확정"
              height="100%"
              maxHeight="100%"
              rowHeight={34}
              minRowHeight={34}
              maxRowHeight={320}
              columnLine
              showCheckbox={false}
              loading={loading}
              resizableRows={false}
              allowAddRowInContextMenu={false}
              allowDuplicateRowInContextMenu={false}
              // 2026-10-26 오른쪽 클릭 [행 삭제]: 표에서 빼 두고 [저장] 때 지운다. 실생산량이 적힌 줄을 고르면 꺼진다
              allowDeleteRowInContextMenu={Boolean(selectedMenuPermissions?.delete)}
              selectRowOnContextMenu
              deleteMenuDisabled={selectionLocked}
              onSelectionChange={(ids) => {
                const active = pull();
                setSelectionLocked(ids.some((id) => {
                  const row = active.find((item) => String(item.key) === String(id));
                  return Boolean(row && !canDeleteSchedule(row));
                }));
              }}
              onChangesChange={() => refreshDirty()}
            />
          </Box>
          {/* 합계는 화면에 보이는 줄로 센다(확정 전 줄 포함) */}
          <Typography variant="body2" sx={{ mt: 1, textAlign: 'right', color: 'text.secondary' }}>
            생산품목수량: <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>{summary.count}건</Box>
            &nbsp;&nbsp;·&nbsp;&nbsp;
            총생산량: <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>{formatTotal(summary.total)}kg</Box>
          </Typography>
        </Card>
      </Box>
      {importOpen && (
        <ProductionImportDialog
          targetDate={date}
          alreadyPulled={rows.map((row) => row.sourceOrderId).filter((id): id is number => Boolean(id))}
          onPull={pullOrders}
          onGotoOrder={gotoOrder}
          onAlert={(message) => setAlertText(message)}
          onClose={() => setImportOpen(false)}
        />
      )}
      <ConfirmDialog
        open={alertText != null}
        title="생산확정"
        message={alertText ?? ''}
        alertOnly
        onCancel={() => setAlertText(null)}
        onConfirm={() => setAlertText(null)}
      />
      <ConfirmDialog
        open={confirmDelete > 0}
        title="생산확정 삭제"
        message={`생산확정 ${confirmDelete}건을 지우고 저장할까요? 빠졌던 원재료 재고는 되돌려집니다.`}
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
        description="저장 · 확정하지 않은 변경을 버리고 목록을 다시 불러오시겠습니까?"
        cancelLabel="취소"
        continueLabel="계속"
        onCancel={() => setConfirmLeave(null)}
        onContinue={() => {
          const action = confirmLeave;
          setConfirmLeave(null);
          action?.();
        }}
      />
      <LabelPrintDialog target={labelFor} onClose={() => setLabelFor(null)} />
    </Box>
  );
}

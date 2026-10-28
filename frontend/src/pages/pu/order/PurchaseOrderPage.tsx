import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Button, Card, Checkbox, Chip, FormControlLabel, MenuItem, Tab, Tabs, TextField, Typography } from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import NoteAddIcon from '@mui/icons-material/NoteAdd';
import SearchIcon from '@mui/icons-material/Search';
import { PageHeader } from '../../../shared/components/PageHeader';
import { type PermissionActionGroupDefinition } from '../../../shared/components/PermissionGroup';
import { PageMessageArea } from '../../../shared/components/PageMessageArea';
import { PageSearchArea } from '../../../shared/components/PageSearchArea';
import { F1Grid, F1Tree, type F1GridColumn, type F1GridRowId, type F1TreeRef } from '../../../shared/components/f1-grid';
import { downloadExcel, todayDash } from '../../../shared/utils/excelFile';
import type { MenuPermission, ModuleItem, PageContent } from '../../dashboard/types/dashboard';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { PurchaseOrderDialog } from './components/PurchaseOrderDialog';
import { cancelOrder, fetchOrdersByDate, fetchOrdersByPeriod } from './services/purchaseOrder.service';
import {
  HISTORY_EXCEL_COLUMNS, STATUS_EXCEL_COLUMNS, formatQty, historyRows, monthStart, sortStatus, statusCounts, toStatusRows,
  type HistoryRow, type PurchaseOrder, type StatusFilter, type StatusQuery, type StatusRow,
} from './utils/purchaseOrder';

const errorText = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

type PurchaseOrderPageProps = {
  selectedModule: ModuleItem;
  currentMenuName: string;
  content: PageContent;
  breadcrumbItems?: string[];
  selectedMenuPermissions?: MenuPermission;
};
type TabKey = 'register' | 'status';

const searchFieldSx = (theme: { palette: { mode: string } }) => ({
  height: 40,
  '& .MuiOutlinedInput-root': {
    height: '100%',
    borderRadius: '0 8px 8px 0',
    backgroundColor: theme.palette.mode === 'dark' ? 'rgba(15, 23, 42, 0.72)' : 'rgba(255,255,255,0.72)',
  },
});
const sideFieldSx = (theme: { palette: { mode: string } }) => ({
  ...searchFieldSx(theme),
  '& .MuiOutlinedInput-root': { ...searchFieldSx(theme)['& .MuiOutlinedInput-root'], borderRadius: '8px' },
});
const cardSx = { borderRadius: 1, border: '1px solid rgba(148,163,184,0.18)', boxShadow: 'none', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', p: 1.5 };
const gridProps = {
  height: '100%', maxHeight: '100%', rowHeight: 34, minRowHeight: 34, maxRowHeight: 320, columnLine: true, showCheckbox: false,
  resizableRows: false, allowAddRowInContextMenu: false, allowDuplicateRowInContextMenu: false, allowDeleteRowInContextMenu: false,
} as const;

// 구매관리 > 발주관리 (송연 #screen-po · 19-purchase.js · 38-po-status.js)
// 탭 두 개: 발주등록(발주일별 발주내역 + 발주 등록 창) · 발주현황(기간 안에 낸 발주를 한 줄씩, 미입고 찾기).
export function PurchaseOrderPage({
  selectedModule,
  currentMenuName,
  content,
  breadcrumbItems,
  selectedMenuPermissions,
}: PurchaseOrderPageProps) {
  const [tab, setTab] = useState<TabKey>('register');
  const [alertText, setAlertText] = useState<string | null>(null);
  const [notice, setNotice] = useState('');

  // ===== 발주등록 탭 =====
  const treeRef = useRef<F1TreeRef<HistoryRow>>(null);
  const historyRequestRef = useRef(0);
  const [historyDate, setHistoryDate] = useState(() => todayDash());
  const [historyClient, setHistoryClient] = useState('');
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [treeVersion, setTreeVersion] = useState(0);
  const [openGroups, setOpenGroups] = useState<F1GridRowId[]>([]); // 펼쳐둔 거래처(다시 불러와도 그대로 편다)
  const [expandAll, setExpandAll] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [cancelling, setCancelling] = useState<HistoryRow | null>(null);

  const rows = useMemo(() => historyRows(orders), [orders]);
  const rowsRef = useRef(rows);
  rowsRef.current = rows;

  const loadHistory = useCallback(async (date: string, clientQ: string) => {
    const requestId = ++historyRequestRef.current;
    // 펼쳐둔 거래처를 기억해 둔다. 사라진 거래처는 다음 목록에 없으니 저절로 빠진다
    const groups = rowsRef.current.filter((row) => row.kind === 'group').map((row) => row.id);
    const opened = groups.filter((id) => treeRef.current?.isExpanded(id));
    setHistoryLoading(true);
    try {
      const list = await fetchOrdersByDate(date, clientQ);
      if (requestId !== historyRequestRef.current) return;
      const nextGroups = new Set(historyRows(list).filter((row) => row.kind === 'group').map((row) => row.id));
      const keep = opened.filter((id) => nextGroups.has(String(id)));
      setOpenGroups(keep);
      setExpandAll(nextGroups.size > 0 && keep.length === nextGroups.size);
      setOrders(list);
      setHistoryLoaded(true);
      setTreeVersion((v) => v + 1);
    } catch (requestError) {
      if (requestId === historyRequestRef.current) setAlertText(errorText(requestError, '발주내역을 불러오지 못했어요'));
    } finally {
      if (requestId === historyRequestRef.current) setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHistory(todayDash(), '');
  }, [loadHistory]);

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
    await loadHistory(historyDate, historyClient);
  };

  // 송연 발주내역 엑셀: 그 발주일 것(거래처 조건 없이)을 다시 받는다
  const exportHistory = async () => {
    try {
      const list = await fetchOrdersByDate(historyDate, '');
      await downloadExcel(list, HISTORY_EXCEL_COLUMNS, `발주내역${historyDate ? `_${historyDate}` : ''}.xlsx`, '발주내역');
    } catch (requestError) {
      setAlertText(errorText(requestError, '다운로드하지 못했어요'));
    }
  };

  const historyColumns = useMemo<F1GridColumn<HistoryRow>[]>(() => [
    { field: 'id', type: 'rownumber', width: 60, headerName: '순번', headerAlign: 'center', align: 'center', pinned: 'left' },
    {
      field: 'label', headerName: '거래처 / 원재료', flex: 1.5, width: 260, headerAlign: 'center', align: 'left',
      getCellStyle: ({ row }) => (row.kind === 'group' ? { fontWeight: 700 } : {}),
    },
    {
      field: 'info', headerName: '품목 · 입고', width: 220, headerAlign: 'center', align: 'left',
      renderCell: ({ row }) => (row.kind === 'group' ? (
        <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center' }}>
          <span>{row.info}</span>
          {row.pending > 0
            ? <Chip size="small" color="warning" variant="outlined" label={`미입고 ${row.pending}건`} />
            : <Chip size="small" color="success" variant="outlined" label="모두 입고" />}
        </Box>
      ) : (
        <Chip size="small" variant="outlined" color={row.received ? 'success' : 'warning'} label={row.info} />
      )),
    },
    { field: 'qty', headerName: '수량', width: 120, headerAlign: 'center', align: 'right', renderCell: ({ row }) => formatQty(row.qty) },
    {
      field: 'poId', headerName: '', width: 170, headerAlign: 'center', align: 'center', pinned: 'right',
      renderCell: ({ row }) => {
        if (row.kind === 'group') return '';
        if (row.received) return <Typography variant="caption" color="text.secondary">입고완료 — 취소불가</Typography>;
        return <Button size="small" variant="outlined" color="error" sx={{ minWidth: 0, px: 1, py: 0 }} onClick={() => setCancelling(row)}>취소</Button>;
      },
    },
  ], []);

  // ===== 발주현황 탭 =====
  const statusRequestRef = useRef(0);
  const [statusQuery, setStatusQuery] = useState<StatusQuery>(() => ({ start: monthStart(), end: todayDash(), clientQ: '', materialQ: '', received: '' }));
  const statusQueryRef = useRef(statusQuery);
  statusQueryRef.current = statusQuery;
  const [statusOrders, setStatusOrders] = useState<PurchaseOrder[] | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);

  const loadStatus = useCallback(async (override?: Partial<StatusQuery>) => {
    const query = { ...statusQueryRef.current, ...override };
    if (!query.start || !query.end) {
      setAlertText('조회 기간을 선택해주세요');
      return;
    }
    const requestId = ++statusRequestRef.current;
    setStatusLoading(true);
    try {
      const list = await fetchOrdersByPeriod(query);
      if (requestId !== statusRequestRef.current) return;
      setStatusOrders(list);
    } catch (requestError) {
      if (requestId === statusRequestRef.current) setAlertText(errorText(requestError, '조회에 실패했어요'));
    } finally {
      if (requestId === statusRequestRef.current) setStatusLoading(false);
    }
  }, []);

  const statusRows = useMemo<StatusRow[]>(() => toStatusRows(statusOrders ?? []), [statusOrders]);
  const counts = statusCounts(statusOrders ?? []);

  const exportStatus = async () => {
    if (!statusOrders || statusOrders.length === 0) {
      setAlertText('먼저 조회해주세요');
      return;
    }
    const { start, end } = statusQueryRef.current;
    await downloadExcel(sortStatus(statusOrders), STATUS_EXCEL_COLUMNS, `발주현황_${start}_${end}.xlsx`, '발주현황');
  };

  const changeStatus = (key: keyof StatusQuery) => (event: { target: { value: string } }) =>
    setStatusQuery((current) => ({ ...current, [key]: event.target.value }));

  const statusColumns = useMemo<F1GridColumn<StatusRow>[]>(() => [
    { field: 'id', type: 'rownumber', width: 60, headerName: '순번', headerAlign: 'center', align: 'center', pinned: 'left' },
    { field: 'orderDate', headerName: '발주일자', width: 120, headerAlign: 'center', align: 'center', mergeRows: true },
    {
      field: 'clientName', headerName: '거래처', flex: 1, width: 180, headerAlign: 'center', align: 'left', mergeRows: true,
      renderCell: ({ row }) => (
        <span>
          {row.clientName || ''}
          {row.clientCount > 1 && <Typography component="span" variant="caption" color="text.secondary"> {row.clientCount}건</Typography>}
        </span>
      ),
    },
    { field: 'materialName', headerName: '발주품목', flex: 1.5, width: 220, headerAlign: 'center', align: 'left' },
    { field: 'qty', headerName: '수량', width: 110, headerAlign: 'center', align: 'right', renderCell: ({ row }) => formatQty(row.qty) },
    {
      field: 'received', headerName: '입고여부', width: 110, headerAlign: 'center', align: 'center',
      renderCell: ({ row }) => (row.received
        ? <Chip size="small" color="success" variant="outlined" label="입고완료" />
        : <Chip size="small" color="warning" variant="outlined" label="미입고" />),
    },
  ], []);

  const switchTab = (next: TabKey) => {
    setTab(next);
    // 송연과 같이 발주현황 탭을 열 때마다 다시 부른다
    if (next === 'status') void loadStatus();
  };

  const pageActionGroups: PermissionActionGroupDefinition[] = tab === 'register'
    ? [
      {
        key: 'read',
        actions: [
          { label: '조회', icon: SearchIcon, visible: Boolean(selectedMenuPermissions?.read), disabled: historyLoading, onClick: () => void loadHistory(historyDate, historyClient) },
          {
            label: '엑셀 다운로드', icon: FileDownloadIcon,
            visible: Boolean(selectedMenuPermissions?.excel || selectedMenuPermissions?.read), onClick: () => void exportHistory(),
          },
        ],
      },
      {
        key: 'write',
        actions: [{ label: '발주 등록', icon: NoteAddIcon, visible: Boolean(selectedMenuPermissions?.create), onClick: () => setRegisterOpen(true) }],
      },
    ]
    : [
      {
        key: 'read',
        actions: [
          { label: '조회', icon: SearchIcon, visible: Boolean(selectedMenuPermissions?.read), disabled: statusLoading, onClick: () => void loadStatus() },
          {
            label: '엑셀 다운로드', icon: FileDownloadIcon,
            visible: Boolean(selectedMenuPermissions?.excel || selectedMenuPermissions?.read), onClick: () => void exportStatus(),
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
      <Box sx={{ px: { xs: 1.5, sm: 2 }, borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tab} onChange={(_event, value: TabKey) => switchTab(value)} aria-label="발주관리 탭">
          <Tab value="register" label="발주등록" />
          <Tab value="status" label="발주현황" />
        </Tabs>
      </Box>

      {tab === 'register' && (
        <>
          <PageSearchArea
            searchField={
              <TextField
                size="small" margin="none" placeholder="거래처 검색" value={historyClient} onChange={(event) => setHistoryClient(event.target.value)}
                slotProps={{ htmlInput: { 'aria-label': '거래처 검색' } }} sx={(theme) => ({ width: '100%', ...searchFieldSx(theme) })}
              />
            }
            onDefaultSearch={() => void loadHistory(historyDate, historyClient)}
          >
            <TextField
              type="date" size="small" margin="none" value={historyDate} onChange={(event) => setHistoryDate(event.target.value)}
              title="비우면 전체 발주일"
              slotProps={{ htmlInput: { 'aria-label': '발주일' } }} sx={(theme) => ({ width: 180, ...sideFieldSx(theme) })}
            />
          </PageSearchArea>
          <PageMessageArea message={notice} severity="success" onClose={() => setNotice('')} />
          <Box sx={{ p: { xs: 1.5, sm: 1 }, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <Card sx={cardSx}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                <Typography sx={{ fontSize: 14, fontWeight: 700 }}>발주내역</Typography>
                {historyLoaded && !historyLoading && orders.length === 0 && (
                  <Typography variant="body2" color="text.secondary">발주내역이 없습니다</Typography>
                )}
                <FormControlLabel
                  sx={{ ml: 'auto', mr: 0 }}
                  control={<Checkbox size="small" checked={expandAll} disabled={orders.length === 0} onChange={(event) => toggleExpandAll(event.target.checked)} />}
                  label={<Typography variant="body2">모두 펼쳐보기</Typography>}
                />
              </Box>
              <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
                <F1Tree
                  key={treeVersion}
                  ref={treeRef}
                  rows={rows}
                  columns={historyColumns}
                  rowKey="id"
                  parentKey="parentId"
                  treeColumn="label"
                  defaultExpanded={openGroups}
                  storageKey="pu-po-history-tree"
                  ariaLabel="F1-TREE 발주내역"
                  loading={historyLoading}
                  {...gridProps}
                />
              </Box>
            </Card>
          </Box>
        </>
      )}

      {tab === 'status' && (
        <>
          <PageSearchArea
            searchField={
              <TextField
                size="small" margin="none" placeholder="원재료명 검색" value={statusQuery.materialQ} onChange={changeStatus('materialQ')}
                slotProps={{ htmlInput: { 'aria-label': '원재료명 검색' } }} sx={(theme) => ({ width: '100%', ...searchFieldSx(theme) })}
              />
            }
            onDefaultSearch={() => void loadStatus()}
          >
            <TextField
              size="small" margin="none" placeholder="거래처명 검색" value={statusQuery.clientQ} onChange={changeStatus('clientQ')}
              slotProps={{ htmlInput: { 'aria-label': '거래처명 검색' } }} sx={(theme) => ({ width: { xs: '100%', sm: 180 }, ...sideFieldSx(theme) })}
            />
            <TextField
              select size="small" margin="none" value={statusQuery.received}
              onChange={(event) => {
                const received = event.target.value as StatusFilter;
                setStatusQuery((current) => ({ ...current, received }));
                // 송연과 같이 고르면 바로 다시 부른다
                void loadStatus({ received });
              }}
              slotProps={{ htmlInput: { 'aria-label': '입고여부' }, select: { displayEmpty: true } }}
              sx={(theme) => ({ width: { xs: '100%', sm: 140 }, ...sideFieldSx(theme) })}
            >
              <MenuItem value="">전부</MenuItem>
              <MenuItem value="0">미입고만</MenuItem>
              <MenuItem value="1">입고완료만</MenuItem>
            </TextField>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TextField
                type="date" size="small" margin="none" value={statusQuery.start} onChange={changeStatus('start')}
                slotProps={{ htmlInput: { 'aria-label': '시작일' } }} sx={(theme) => ({ width: 170, ...sideFieldSx(theme) })}
              />
              <Typography variant="body2" color="text.secondary">~</Typography>
              <TextField
                type="date" size="small" margin="none" value={statusQuery.end} onChange={changeStatus('end')}
                slotProps={{ htmlInput: { 'aria-label': '종료일' } }} sx={(theme) => ({ width: 170, ...sideFieldSx(theme) })}
              />
            </Box>
          </PageSearchArea>
          <Box sx={{ p: { xs: 1.5, sm: 1 }, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <Card sx={cardSx}>
              <Box aria-label="발주현황 요약" sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, alignItems: 'center', mb: 0.5, fontSize: 14 }}>
                <span>건수 <b>{statusOrders ? counts.count : '-'}</b></span>
                <span>거래처 <b>{statusOrders ? counts.clients : '-'}</b></span>
                <span>미입고 <b>{statusOrders ? counts.pending : '-'}</b></span>
                <span>입고완료 <b>{statusOrders ? counts.done : '-'}</b></span>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1 }}>
                발주에는 단가를 적지 않아서 금액칸이 없습니다. 수량은 품목마다 단위가 달라 더하지 않습니다. 표 머리 메뉴로 정렬할 수 있어요.
              </Typography>
              {statusOrders && !statusLoading && statusOrders.length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>이 기간에 낸 발주가 없습니다</Typography>
              )}
              <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
                <F1Grid
                  rows={statusRows}
                  columns={statusColumns}
                  rowKey="id"
                  storageKey="pu-po-status-grid"
                  ariaLabel="F1-GRID 발주현황"
                  loading={statusLoading}
                  {...gridProps}
                />
              </Box>
              {statusOrders && statusOrders.length > 0 && (
                <Box aria-label="발주현황 합계" sx={{ mt: 1, px: 1.5, py: 1, display: 'flex', gap: 3, bgcolor: 'action.hover', borderRadius: 1, fontWeight: 800, fontSize: 14 }}>
                  {/* 수량은 더하지 않는다. kg 과 박스와 롤을 한 숫자로 더하면 거짓말이 된다 */}
                  <span>합계 ({counts.count}건)</span>
                  <span>미입고 {counts.pending}건</span>
                </Box>
              )}
            </Card>
          </Box>
        </>
      )}

      <PurchaseOrderDialog
        open={registerOpen}
        onClose={() => setRegisterOpen(false)}
        onRegistered={(orderDate) => {
          // 송연과 같이 발주일을 그 날짜로 옮겨 다시 불러온다
          setHistoryDate(orderDate);
          setNotice('저장되었습니다');
          void loadHistory(orderDate, historyClient);
        }}
      />
      <ConfirmDialog
        open={alertText != null}
        title="발주관리"
        message={alertText ?? ''}
        alertOnly
        onCancel={() => setAlertText(null)}
        onConfirm={() => setAlertText(null)}
      />
      <ConfirmDialog
        open={Boolean(cancelling)}
        title="발주 취소"
        message="이 발주내역을 취소할까요?"
        confirmLabel="취소하기"
        danger
        onCancel={() => setCancelling(null)}
        onConfirm={() => void cancel()}
      />
    </Box>
  );
}

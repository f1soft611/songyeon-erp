import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Card, Chip, TextField, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck';
import SearchIcon from '@mui/icons-material/Search';
import { PageHeader } from '../../../shared/components/PageHeader';
import { type PermissionActionGroupDefinition } from '../../../shared/components/PermissionGroup';
import { PageMessageArea } from '../../../shared/components/PageMessageArea';
import { PageSearchArea } from '../../../shared/components/PageSearchArea';
import { F1Grid, type F1GridColumn, type F1GridRef } from '../../../shared/components/f1-grid';
import { todayDash } from '../../../shared/utils/excelFile';
import type { MenuPermission, ModuleItem, PageContent } from '../../dashboard/types/dashboard';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { ManualSaleDialog } from './components/ManualSaleDialog';
import { fetchShippable, pullSales } from './services/salesRegister.service';
import {
  formatMoney, formatQty, monthStart, pullItems, pullMessage, statusOf, summaryText, toShippableRow, type ShippableRow,
} from './utils/salesRegister';

const errorText = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

type SalesRegisterPageProps = {
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
const sideFieldSx = (theme: { palette: { mode: string } }) => ({
  ...searchFieldSx(theme),
  '& .MuiOutlinedInput-root': { ...searchFieldSx(theme)['& .MuiOutlinedInput-root'], borderRadius: '8px' },
});

// 이미 판매로 들어간 줄은 흐리게(송연과 같음)
const fadedStyle = (row: ShippableRow) => (row.already ? { opacity: 0.5 } : {});

// 판매관리 > 판매등록 (송연 #screen-sales-register · 36-sales.js, 2026-09-09 관리부 요청)
// 출하확정된 것을 끌어와 판매로 남기거나, 출하 없이 판 것을 직접 적는다.
// 한 번 적으면 출하 쪽이 바뀌어도 그대로 남는다 — 팔았다는 사실은 나중에 출하를 취소한다고 없던 일이 되지 않는다.
// 기간은 이번 달 1일~오늘이고, 열면 바로 불러온다(송연과 같음).
export function SalesRegisterPage({
  selectedModule,
  currentMenuName,
  content,
  breadcrumbItems,
  selectedMenuPermissions,
}: SalesRegisterPageProps) {
  const gridRef = useRef<F1GridRef<ShippableRow>>(null);
  const requestIdRef = useRef(0);
  const [start, setStart] = useState(() => monthStart());
  const [end, setEnd] = useState(() => todayDash());
  const [client, setClient] = useState('');
  const [rows, setRows] = useState<ShippableRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [alertText, setAlertText] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const loadRows = useCallback(async (from: string, to: string, clientName: string) => {
    if (!from || !to) {
      setAlertText('조회 기간을 선택해주세요');
      return;
    }
    const requestId = ++requestIdRef.current;
    setLoading(true);
    try {
      const data = await fetchShippable(from, to, clientName);
      if (requestId !== requestIdRef.current) return;
      setRows(data.rows.map(toShippableRow));
      setLoaded(true);
      gridRef.current?.clearSelection();
    } catch (requestError) {
      if (requestId === requestIdRef.current) setAlertText(errorText(requestError, '불러오지 못했어요'));
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRows(monthStart(), todayDash(), '');
  }, [loadRows]);

  const reload = () => void loadRows(start, end, client);

  const pull = async () => {
    const items = pullItems(gridRef.current?.getSelectedRows() ?? []);
    if (items.length === 0) {
      setAlertText('가져올 항목을 체크해주세요');
      return;
    }
    try {
      const result = await pullSales(items);
      setNotice(pullMessage(result));
    } catch (requestError) {
      setAlertText(errorText(requestError, '등록하지 못했어요'));
      return;
    }
    await loadRows(start, end, client);
  };

  const columns = useMemo<F1GridColumn<ShippableRow>[]>(() => [
    { field: 'key', type: 'rownumber', width: 60, headerName: '순번', headerAlign: 'center', align: 'center', pinned: 'left' },
    { field: 'saleDate', headerName: '출고일', width: 120, headerAlign: 'center', align: 'center', getCellStyle: ({ row }) => fadedStyle(row) },
    { field: 'clientName', headerName: '거래처', flex: 1, width: 160, headerAlign: 'center', align: 'left', getCellStyle: ({ row }) => fadedStyle(row) },
    { field: 'productName', headerName: '품목명', flex: 1.5, width: 220, headerAlign: 'center', align: 'left', getCellStyle: ({ row }) => fadedStyle(row) },
    {
      field: 'qty', headerName: '수량', width: 110, headerAlign: 'center', align: 'right',
      renderCell: ({ row }) => formatQty(row.qty), getCellStyle: ({ row }) => fadedStyle(row),
    },
    {
      field: 'unitPrice', headerName: '단가', width: 120, headerAlign: 'center', align: 'right',
      renderCell: ({ row }) => formatMoney(row.unitPrice), getCellStyle: ({ row }) => fadedStyle(row),
    },
    {
      field: 'amount', headerName: '금액', width: 140, headerAlign: 'center', align: 'right',
      renderCell: ({ row }) => formatMoney(row.amount), getCellStyle: ({ row }) => ({ fontWeight: 700, ...fadedStyle(row) }),
    },
    {
      field: 'already', headerName: '상태', width: 120, headerAlign: 'center', align: 'center',
      renderCell: ({ row }) => {
        const status = statusOf(row);
        if (status === 'already') return <Chip size="small" variant="outlined" label="이미 등록됨" />;
        if (status === 'no-price') return <Chip size="small" color="warning" variant="outlined" label="단가 없음" />;
        return '';
      },
    },
  ], []);

  const pageActionGroups: PermissionActionGroupDefinition[] = [
    {
      key: 'read',
      actions: [
        { label: '출하확정 불러오기', icon: SearchIcon, visible: Boolean(selectedMenuPermissions?.read), disabled: loading, onClick: reload },
      ],
    },
    {
      key: 'write',
      actions: [
        { label: '직접 등록', icon: AddIcon, visible: Boolean(selectedMenuPermissions?.create), onClick: () => setManualOpen(true) },
        { label: '선택 항목 판매등록', icon: PlaylistAddCheckIcon, visible: Boolean(selectedMenuPermissions?.create), onClick: () => void pull() },
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
            size="small"
            margin="none"
            placeholder="거래처 (비우면 전체)"
            autoComplete="off"
            value={client}
            onChange={(event) => setClient(event.target.value)}
            slotProps={{ htmlInput: { 'aria-label': '거래처 검색' } }}
            sx={(theme) => ({ width: '100%', ...searchFieldSx(theme) })}
          />
        }
        onDefaultSearch={reload}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TextField
            type="date" size="small" margin="none" value={start} onChange={(event) => setStart(event.target.value)}
            slotProps={{ htmlInput: { 'aria-label': '시작일' } }} sx={(theme) => ({ width: 170, ...sideFieldSx(theme) })}
          />
          <Typography variant="body2" color="text.secondary">~</Typography>
          <TextField
            type="date" size="small" margin="none" value={end} onChange={(event) => setEnd(event.target.value)}
            slotProps={{ htmlInput: { 'aria-label': '종료일' } }} sx={(theme) => ({ width: 170, ...sideFieldSx(theme) })}
          />
        </Box>
      </PageSearchArea>
      <PageMessageArea message={error} onClose={() => setError('')} />
      <PageMessageArea message={notice} severity="success" onClose={() => setNotice('')} />
      <Box sx={{ p: { xs: 1.5, sm: 1 }, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Card sx={{ borderRadius: 1, border: '1px solid rgba(148,163,184,0.18)', boxShadow: 'none', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', p: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1, flexWrap: 'wrap' }}>
            {loaded && !loading && rows.length === 0 && (
              <Typography variant="body2" color="text.secondary">이 기간에 출하확정된 건이 없습니다</Typography>
            )}
            <Typography variant="body2" color="text.secondary">
              출하확정된 것을 체크해 판매로 남겨요. 출하 없이 판 것은 [직접 등록] 으로 적어요. 금액은 넣을 때 값으로 굳어요.
            </Typography>
            <Typography variant="body2" aria-label="판매등록 요약" sx={{ ml: 'auto', fontWeight: 700 }}>{summaryText(rows)}</Typography>
          </Box>
          <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
            <F1Grid
              ref={gridRef}
              rows={rows}
              columns={columns}
              rowKey="key"
              storageKey="sl-sales-register-grid"
              ariaLabel="F1-GRID 판매등록"
              height="100%"
              maxHeight="100%"
              rowHeight={34}
              minRowHeight={34}
              maxRowHeight={320}
              columnLine
              showCheckbox
              loading={loading}
              resizableRows={false}
              allowAddRowInContextMenu={false}
              allowDuplicateRowInContextMenu={false}
              allowDeleteRowInContextMenu={false}
            />
          </Box>
        </Card>
      </Box>
      <ManualSaleDialog
        open={manualOpen}
        onClose={() => setManualOpen(false)}
        onSaved={() => {
          setManualOpen(false);
          setNotice('판매를 넣었어요');
        }}
      />
      <ConfirmDialog
        open={alertText != null}
        title="판매등록"
        message={alertText ?? ''}
        alertOnly
        onCancel={() => setAlertText(null)}
        onConfirm={() => setAlertText(null)}
      />
    </Box>
  );
}

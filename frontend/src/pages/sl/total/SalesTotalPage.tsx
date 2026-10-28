import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Box, Card, Chip, MenuItem, TextField, Typography } from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import SearchIcon from '@mui/icons-material/Search';
import { PageHeader } from '../../../shared/components/PageHeader';
import { type PermissionActionGroupDefinition } from '../../../shared/components/PermissionGroup';
import { PageSearchArea } from '../../../shared/components/PageSearchArea';
import { F1Grid, type F1GridColumn } from '../../../shared/components/f1-grid';
import { downloadExcel, todayDash } from '../../../shared/utils/excelFile';
import type { MenuPermission, ModuleItem, PageContent } from '../../dashboard/types/dashboard';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { formatMoney, formatQty, monthStart } from '../register/utils/salesRegister';
import { todayFileTag, type SalesQuery } from '../status/utils/salesStatus';
import { fetchSalesTotal } from './services/salesTotal.service';
import {
  SALES_TOTAL_EXCEL_COLUMNS, filterDirection, noPriceWarning, shownTotals, toTotalRows, type DirectionFilter, type TotalRow,
} from './utils/salesTotal';

const errorText = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

type SalesTotalPageProps = {
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
const tileSx = { flex: '1 1 180px', border: '1px solid', borderColor: 'divider', borderRadius: 1, px: 2, py: 1.25, bgcolor: 'background.paper' };

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={tileSx}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography aria-label={label} sx={{ fontSize: 20, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{value}</Typography>
    </Box>
  );
}

// 판매관리 > 토탈집계 (송연 #screen-sales-total · 36-sales.js renderSalesTotal)
// 들어온 것(생산입고)과 나간 것(판매)을 한 표에 다 펴놓고 합계를 본다. 표 머리 메뉴로 정렬한다.
// 입고·출고 거르기는 화면에서 한다(다시 부르지 않음). 기간은 이번 달 1일~오늘이고 열면 바로 불러온다.
export function SalesTotalPage({
  selectedModule,
  currentMenuName,
  content,
  breadcrumbItems,
  selectedMenuPermissions,
}: SalesTotalPageProps) {
  const requestIdRef = useRef(0);
  const [query, setQuery] = useState<SalesQuery>(() => ({ start: monthStart(), end: todayDash(), clientName: '', productName: '' }));
  const queryRef = useRef(query);
  queryRef.current = query;
  const [direction, setDirection] = useState<DirectionFilter>('');
  const [rows, setRows] = useState<TotalRow[] | null>(null); // null = 아직 안 불러옴
  const [loading, setLoading] = useState(false);
  const [alertText, setAlertText] = useState<string | null>(null);

  const change = (key: keyof SalesQuery) => (event: { target: { value: string } }) =>
    setQuery((current) => ({ ...current, [key]: event.target.value }));

  const loadRows = useCallback(async () => {
    const current = queryRef.current;
    if (!current.start || !current.end) {
      setAlertText('조회 기간을 선택해주세요');
      return;
    }
    const requestId = ++requestIdRef.current;
    setLoading(true);
    try {
      const data = await fetchSalesTotal(current);
      if (requestId !== requestIdRef.current) return;
      setRows(toTotalRows(data.rows));
    } catch (requestError) {
      if (requestId === requestIdRef.current) setAlertText(errorText(requestError, '불러오지 못했어요'));
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  const visible = useMemo(() => filterDirection(rows ?? [], direction), [rows, direction]);
  const shown = shownTotals(visible);
  const warning = noPriceWarning(shown.noPrice);

  // 화면에 보이는 것만 내려받는다. '입고만' 걸어놓고 받았는데 출고까지 딸려오면 화면과 다르다고 여긴다
  const exportExcel = async () => {
    if (!rows || visible.length === 0) {
      setAlertText('내려받을 자료가 없습니다');
      return;
    }
    await downloadExcel(visible, SALES_TOTAL_EXCEL_COLUMNS, `토탈집계_${todayFileTag()}.xlsx`, '토탈집계');
  };

  const columns = useMemo<F1GridColumn<TotalRow>[]>(() => [
    { field: 'key', type: 'rownumber', width: 60, headerName: '순번', headerAlign: 'center', align: 'center', pinned: 'left' },
    { field: 'saleDate', headerName: '일자', width: 120, headerAlign: 'center', align: 'center' },
    {
      field: 'directionLabel', headerName: '구분', width: 80, headerAlign: 'center', align: 'center',
      renderCell: ({ row }) => <Chip size="small" variant="outlined" color={row.direction === 'in' ? 'success' : 'primary'} label={row.directionLabel} />,
    },
    { field: 'clientName', headerName: '거래처', flex: 1, width: 150, headerAlign: 'center', align: 'left' },
    { field: 'productName', headerName: '품목명', flex: 1.5, width: 220, headerAlign: 'center', align: 'left' },
    { field: 'qty', headerName: '수량', width: 100, headerAlign: 'center', align: 'right', renderCell: ({ row }) => formatQty(row.qty) },
    { field: 'unitPrice', headerName: '단가', width: 110, headerAlign: 'center', align: 'right', renderCell: ({ row }) => formatMoney(row.unitPrice) },
    {
      field: 'amount', headerName: '금액', width: 130, headerAlign: 'center', align: 'right',
      renderCell: ({ row }) => formatMoney(row.amount), getCellStyle: () => ({ fontWeight: 700 }),
    },
    { field: 'sourceLabel', headerName: '들어온 곳', width: 100, headerAlign: 'center', align: 'center' },
    { field: 'note', headerName: '메모', flex: 1, width: 140, headerAlign: 'center', align: 'left' },
  ], []);

  const pageActionGroups: PermissionActionGroupDefinition[] = [
    {
      key: 'read',
      actions: [
        { label: '조회', icon: SearchIcon, visible: Boolean(selectedMenuPermissions?.read), disabled: loading, onClick: () => void loadRows() },
        {
          label: '엑셀 다운로드', icon: FileDownloadIcon,
          visible: Boolean(selectedMenuPermissions?.excel || selectedMenuPermissions?.read), onClick: () => void exportExcel(),
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
            size="small" margin="none" placeholder="품목명 (비우면 전체)" value={query.productName} onChange={change('productName')}
            slotProps={{ htmlInput: { 'aria-label': '품목명 검색' } }} sx={(theme) => ({ width: '100%', ...searchFieldSx(theme) })}
          />
        }
        onDefaultSearch={() => void loadRows()}
      >
        <TextField
          size="small" margin="none" placeholder="거래처 (비우면 전체)" value={query.clientName} onChange={change('clientName')}
          slotProps={{ htmlInput: { 'aria-label': '거래처 검색' } }} sx={(theme) => ({ width: { xs: '100%', sm: 180 }, ...sideFieldSx(theme) })}
        />
        <TextField
          select size="small" margin="none" value={direction} onChange={(event) => setDirection(event.target.value as DirectionFilter)}
          slotProps={{ htmlInput: { 'aria-label': '입고·출고' }, select: { displayEmpty: true } }}
          sx={(theme) => ({ width: { xs: '100%', sm: 150 }, ...sideFieldSx(theme) })}
        >
          <MenuItem value="">입고·출고 전부</MenuItem>
          <MenuItem value="in">입고만</MenuItem>
          <MenuItem value="out">출고만</MenuItem>
        </TextField>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TextField
            type="date" size="small" margin="none" value={query.start} onChange={change('start')}
            slotProps={{ htmlInput: { 'aria-label': '시작일' } }} sx={(theme) => ({ width: 170, ...sideFieldSx(theme) })}
          />
          <Typography variant="body2" color="text.secondary">~</Typography>
          <TextField
            type="date" size="small" margin="none" value={query.end} onChange={change('end')}
            slotProps={{ htmlInput: { 'aria-label': '종료일' } }} sx={(theme) => ({ width: 170, ...sideFieldSx(theme) })}
          />
        </Box>
      </PageSearchArea>
      <Box sx={{ p: { xs: 1.5, sm: 1 }, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          <StatTile label="건수" value={rows ? String(shown.count) : '-'} />
          <StatTile label="입고 수량" value={rows ? formatQty(shown.inQty) : '-'} />
          <StatTile label="출고 수량" value={rows ? formatQty(shown.outQty) : '-'} />
          <StatTile label="금액 합계 (출고)" value={rows ? formatMoney(shown.amount) : '-'} />
        </Box>
        {warning && <Alert severity="error" sx={{ py: 0 }}>{warning}</Alert>}
        <Card sx={{ borderRadius: 1, border: '1px solid rgba(148,163,184,0.18)', boxShadow: 'none', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', p: 1.5 }}>
          {rows && !loading && visible.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>이 기간에 들어오거나 나간 것이 없습니다</Typography>
          )}
          <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
            <F1Grid
              rows={visible}
              columns={columns}
              rowKey="key"
              storageKey="sl-sales-total-grid"
              ariaLabel="F1-GRID 토탈집계"
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
              allowDeleteRowInContextMenu={false}
            />
          </Box>
          {/* 송연 표 맨 밑 합계 줄 */}
          {rows && visible.length > 0 && (
            <Box
              aria-label="토탈집계 합계"
              sx={{ mt: 1, px: 1.5, py: 1, display: 'flex', flexWrap: 'wrap', gap: 3, alignItems: 'center', bgcolor: 'action.hover', borderRadius: 1, fontWeight: 800, fontSize: 14 }}
            >
              <span>합계 ({shown.count}건)</span>
              <span>입고 {formatQty(shown.inQty)}</span>
              <span>출고 {formatQty(shown.outQty)}</span>
              <span style={{ marginLeft: 'auto' }}>금액 {formatMoney(shown.amount)}</span>
            </Box>
          )}
        </Card>
      </Box>
      <ConfirmDialog
        open={alertText != null}
        title="토탈집계"
        message={alertText ?? ''}
        alertOnly
        onCancel={() => setAlertText(null)}
        onConfirm={() => setAlertText(null)}
      />
    </Box>
  );
}

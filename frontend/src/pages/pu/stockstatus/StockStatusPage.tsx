import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Button, Card, Checkbox, FormControlLabel, Tab, Tabs, TextField, Typography, useTheme } from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import SearchIcon from '@mui/icons-material/Search';
import { PageHeader } from '../../../shared/components/PageHeader';
import { type PermissionActionGroupDefinition } from '../../../shared/components/PermissionGroup';
import { PageSearchArea } from '../../../shared/components/PageSearchArea';
import { F1Grid, type F1GridColumn } from '../../../shared/components/f1-grid';
import { downloadExcel, todayDash } from '../../../shared/utils/excelFile';
import type { MenuPermission, ModuleItem, PageContent } from '../../dashboard/types/dashboard';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { MaterialLotPanel } from './components/MaterialLotPanel';
import { fetchStockStatus } from './services/stockStatus.service';
import {
  emptyText, excelColumns, splitWarehouses, ssPrice, ssQty, visibleRows, visibleTotal, warehouseQty,
  type StockStatusKind, type StockStatusRow,
} from './utils/stockStatus';

const errorText = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

type StockStatusPageProps = {
  selectedModule: ModuleItem;
  currentMenuName: string;
  content: PageContent;
  breadcrumbItems?: string[];
  selectedMenuPermissions?: MenuPermission;
};
// 창고 칸은 'w{n}'(창고 목록 몇 번째) 으로 펼친다 — 창고 이름을 칸 이름에 넣으면 창고가 바뀔 때 저장된 칸 순서와 어긋난다
type GridRow = StockStatusRow & Record<string, unknown>;

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
const DANGER = '#dc2626';
// 긴 규격은 한 줄로 자르고 마우스를 올리면 전부 보인다
const ONE_LINE = { display: 'block', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } as const;

// 구매관리 > 재고현황 (송연 #screen-stock-status · 29-stock-status.js)
// 날짜를 정하면 그 날 기준 재고 · 품목을 누르면 입고 로트별 내역. 수불대장이 '앞으로 얼마를 사야 하는가' 를 보는 곳이라면
// 이 화면은 '지금 창고에 몇이 있는가' 를 본다. 창고 칸을 다 더하면 '재고' 칸과 같다(서버가 한쪽을 빼기로 구한다).
export function StockStatusPage({
  selectedModule,
  currentMenuName,
  content,
  breadcrumbItems,
  selectedMenuPermissions,
}: StockStatusPageProps) {
  const [kind, setKind] = useState<StockStatusKind>('material');
  const [date, setDate] = useState(() => todayDash());
  const [query, setQuery] = useState('');
  const [nonzero, setNonzero] = useState(true);
  const [rows, setRows] = useState<StockStatusRow[]>([]);
  const [warehouses, setWarehouses] = useState<string[]>([]);
  const [loadedDate, setLoadedDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [openCode, setOpenCode] = useState<string | null>(null);
  const [alertText, setAlertText] = useState<string | null>(null);
  // 펼친 줄 색. 왼쪽에 붙인 칸 밑으로 다른 칸이 비치지 않게 불투명한 색을 쓴다
  const openTint = useTheme().palette.mode === 'dark' ? '#1e2b45' : '#edf2fd';

  const load = useCallback(async (day: string) => {
    if (!day) {
      setAlertText('기준일을 선택해주세요');
      return;
    }
    setLoading(true);
    try {
      const data = await fetchStockStatus(day);
      setRows(data.materials ?? []);
      setWarehouses(splitWarehouses(data.warehouses));
      setLoadedDate(data.date || day);
      setOpenCode(null);
    } catch (requestError) {
      setAlertText(errorText(requestError, '조회에 실패했어요'));
    } finally {
      setLoading(false);
    }
  }, []);

  // 화면을 열면 오늘 기준으로 바로 조회(송연 03-shell.js)
  useEffect(() => {
    void load(todayDash());
  }, [load]);

  const shown = useMemo(() => visibleRows(rows, kind, query, nonzero), [rows, kind, query, nonzero]);
  const gridRows = useMemo<GridRow[]>(
    () => shown.map((m) => ({ ...m, ...Object.fromEntries(warehouses.map((n, i) => [`w${i}`, warehouseQty(m, n)])) })),
    [shown, warehouses],
  );
  const total = visibleTotal(shown);
  const openRow = openCode ? shown.find((m) => m.code === openCode) : undefined;

  const toggle = useCallback((code: string) => setOpenCode((current) => (current === code ? null : code)), []);

  const columns = useMemo<F1GridColumn<GridRow>[]>(() => {
    // 펼친 줄은 아래 로트 칸과 같은 색으로 칠해 한 덩어리로 보이게 한다
    const tint = ({ row }: { row: GridRow }) => (row.code === openCode ? { backgroundColor: openTint } : undefined);
    return [
      { field: 'rowNo', type: 'rownumber', width: 56, headerName: '순번', headerAlign: 'center', align: 'center', pinned: 'left', getCellStyle: tint },
      {
        field: 'toggle', headerName: '', width: 36, headerAlign: 'center', align: 'center', pinned: 'left',
        getCellStyle: ({ row }) => ({ color: '#64748b', ...(row.code === openCode ? { backgroundColor: openTint, boxShadow: 'inset 3px 0 0 #2563eb' } : {}) }),
        renderCell: ({ row }) => (row.code === openCode ? '▾' : '▸'),
      },
      // 창고가 늘면 칸이 화면보다 넓어진다. 오른쪽 '입고 로트' 를 눌러도 어느 품목인지 보이게 코드·품목명을 왼쪽에 붙인다
      { field: 'code', headerName: '코드', width: 90, headerAlign: 'center', align: 'center', pinned: 'left', getCellStyle: tint },
      {
        field: 'name', headerName: '품목명', width: 240, headerAlign: 'center', align: 'left', pinned: 'left',
        getCellStyle: (ctx) => ({ ...(ctx.row.code === openCode ? { fontWeight: 700 } : {}), ...tint(ctx) }),
      },
      {
        field: 'spec', headerName: '규격', width: 150, headerAlign: 'center', align: 'left', getCellStyle: tint,
        renderCell: ({ row }) => <Box component="span" title={row.spec || ''} sx={ONE_LINE}>{row.spec || ''}</Box>,
      },
      // 창고 칸: 0 은 '-' 가 아니라 0 으로 적는다('-' 는 '모른다' 로 읽히는데 여기서는 안다). 0 은 흐리게, 마이너스는 빨갛게
      ...warehouses.map((n, i): F1GridColumn<GridRow> => ({
        field: `w${i}`, headerName: n, width: 90, headerAlign: 'center', align: 'right',
        renderCell: ({ row }) => ssQty(Number(row[`w${i}`] || 0)),
        getCellStyle: (ctx) => {
          const v = Number(ctx.row[`w${i}`] || 0);
          return { ...tint(ctx), ...(v === 0 ? { color: '#94a3b8' } : {}), ...(v < 0 ? { color: DANGER, fontWeight: 700 } : {}) };
        },
      })),
      {
        field: 'stockQty', headerName: '재고', width: 110, headerAlign: 'center', align: 'right', renderCell: ({ row }) => ssQty(row.stockQty),
        getCellStyle: (ctx) => ({ fontWeight: 700, ...tint(ctx), ...(Number(ctx.row.stockQty) < 0 ? { color: DANGER } : {}) }),
      },
      { field: 'unitPrice', headerName: '단가(원)', width: 100, headerAlign: 'center', align: 'right', getCellStyle: tint, renderCell: ({ row }) => ssPrice(row.unitPrice) },
      { field: 'amount', headerName: '재고금액', width: 130, headerAlign: 'center', align: 'right', getCellStyle: tint, renderCell: ({ row }) => (row.amount != null ? ssPrice(row.amount) : '') },
      {
        field: 'lots', headerName: '입고 로트', width: 130, headerAlign: 'center', align: 'left', getCellStyle: tint,
        renderCell: ({ row }) => (
          <Button size="small" sx={{ minWidth: 0, px: 0.5, py: 0, fontWeight: row.code === openCode ? 700 : 400 }} onClick={() => toggle(row.code)}>
            {row.code === openCode ? '▾ 접기' : '▸ 입고 로트 보기'}
          </Button>
        ),
      },
    ];
  }, [warehouses, openCode, openTint, toggle]);

  const switchKind = (value: StockStatusKind) => {
    setKind(value);
    setOpenCode(null);
  };

  const exportExcel = async () => {
    if (shown.length === 0) {
      setAlertText('내려받을 내역이 없어요');
      return;
    }
    await downloadExcel(shown, excelColumns(warehouses), `재고현황_${loadedDate || date}.xlsx`, '재고현황');
  };

  const canRead = Boolean(selectedMenuPermissions?.read);
  const pageActionGroups: PermissionActionGroupDefinition[] = [
    {
      key: 'read',
      actions: [
        { label: '조회', icon: SearchIcon, visible: canRead, disabled: loading, onClick: () => void load(date) },
        { label: '엑셀 다운로드', icon: FileDownloadIcon, visible: Boolean(selectedMenuPermissions?.excel || canRead), onClick: () => void exportExcel() },
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
        <Tabs value={kind} onChange={(_event, value: StockStatusKind) => switchKind(value)} aria-label="재고현황 탭">
          <Tab value="material" label="원재료" />
          <Tab value="submaterial" label="부자재" />
        </Tabs>
      </Box>
      <PageSearchArea
        searchField={
          <TextField
            size="small" margin="none" placeholder="품목명 · 코드 검색" value={query} onChange={(event) => setQuery(event.target.value)}
            slotProps={{ htmlInput: { 'aria-label': '품목 검색' } }} sx={(theme) => ({ width: '100%', ...searchFieldSx(theme) })}
          />
        }
        onDefaultSearch={() => void load(date)}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>기준일</Typography>
          <TextField type="date" size="small" margin="none" value={date} onChange={(event) => setDate(event.target.value)}
            slotProps={{ htmlInput: { 'aria-label': '기준일', max: '9999-12-31' } }} sx={(theme) => ({ width: 170, ...sideFieldSx(theme) })} />
        </Box>
        <FormControlLabel
          control={<Checkbox size="small" checked={nonzero} onChange={(event) => setNonzero(event.target.checked)} />}
          label="재고 0 제외" sx={{ mr: 0, '& .MuiFormControlLabel-label': { fontSize: 13, whiteSpace: 'nowrap' } }}
        />
      </PageSearchArea>
      <Box sx={{ p: { xs: 1.5, sm: 1 }, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Card sx={{ borderRadius: 1, border: '1px solid rgba(148,163,184,0.18)', boxShadow: 'none', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', p: 1.5 }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', mb: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
              기준일이 오늘이면 <b>지금 남아있는 양</b>입니다. 현장에서 바코드를 찍어 계량실로 옮기면 창고칸이 바로 갈립니다.
              <b> 로트별로 얼마가 남았는지는 아직 나오지 않습니다</b> — 생산에 투입할 때 어느 입고분을 썼는지를
              아직 받지 않기 때문입니다. 현장 스캔을 붙이면 그때 나옵니다.
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, whiteSpace: 'nowrap' }}>
              <Typography variant="body2" color="text.secondary">재고금액 합계</Typography>
              <Typography sx={{ fontWeight: 700, fontSize: 15 }} aria-label="재고금액 합계">{loadedDate ? `${ssPrice(total)}원` : '-'}</Typography>
            </Box>
          </Box>
          {loadedDate && !loading && gridRows.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{emptyText(kind)}</Typography>
          )}
          <Box sx={{ flex: 1, minHeight: 160, overflow: 'hidden' }}>
            <F1Grid
              key={warehouses.join(',')}
              rows={gridRows} columns={columns} rowKey="code" storageKey={`pu-stock-status-grid-${warehouses.length}`} ariaLabel="F1-GRID 재고현황"
              height="100%" maxHeight="100%" rowHeight={34} minRowHeight={34} maxRowHeight={320} columnLine showCheckbox={false}
              loading={loading} resizableRows={false} allowAddRowInContextMenu={false} allowDuplicateRowInContextMenu={false} allowDeleteRowInContextMenu={false}
            />
          </Box>
          {openRow && loadedDate && (
            <MaterialLotPanel code={openRow.code} name={openRow.name || ''} date={loadedDate} onClose={() => setOpenCode(null)} />
          )}
        </Card>
      </Box>
      <ConfirmDialog open={alertText != null} title="재고현황" message={alertText ?? ''} alertOnly
        onCancel={() => setAlertText(null)} onConfirm={() => setAlertText(null)} />
    </Box>
  );
}

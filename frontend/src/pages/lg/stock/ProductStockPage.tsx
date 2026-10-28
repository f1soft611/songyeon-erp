import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Button, Card, Chip, MenuItem, TextField, Typography } from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import SearchIcon from '@mui/icons-material/Search';
import SavingsIcon from '@mui/icons-material/Savings';
import { PageHeader } from '../../../shared/components/PageHeader';
import { type PermissionActionGroupDefinition } from '../../../shared/components/PermissionGroup';
import { PageMessageArea } from '../../../shared/components/PageMessageArea';
import { PageSearchArea } from '../../../shared/components/PageSearchArea';
import { F1Grid, type F1GridColumn } from '../../../shared/components/f1-grid';
import { downloadExcel, todayDash } from '../../../shared/utils/excelFile';
import type { MenuPermission, ModuleItem, PageContent } from '../../dashboard/types/dashboard';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { StockValueDialog } from './components/StockValueDialog';
import { fetchLots, fetchStock, fetchStockAsOf } from './services/productStock.service';
import {
  flattenLots, formatQty, lotText, plannedText, productLabel, STOCK_EXCEL_COLUMNS, totalStock,
  type LotRecord, type LotRow, type StockRow, type StockSort,
} from './utils/productStock';

const errorText = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;
const rowButton = { minWidth: 0, px: 1, py: 0 };

type LotState = Record<string, LotRecord[] | 'loading'>;

type ProductStockPageProps = {
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
const cardSx = { borderRadius: 1, border: '1px solid rgba(148,163,184,0.18)', boxShadow: 'none', minHeight: 0, display: 'flex', flexDirection: 'column', p: 1.5 };

// 물류관리 > 제품재고관리 (송연 LG0001, 기존 #screen-product-stock · 20-production.js loadPstockList)
// 완제품 현재고와 생산예정을 보고, 줄마다 로트(생산일별 생산·출하·잔량)를 펼쳐 본다.
// 송연은 표 안에서 줄 아래로 펼쳤지만, 여기서는 펼친 품목들의 로트를 아래 로트 표에 모아 보여준다.
// 기준일은 엑셀 다운로드에만 쓴다(그 날짜 기준 재고를 엑셀로). 열면 바로 목록을 불러온다.
export function ProductStockPage({
  selectedModule,
  currentMenuName,
  content,
  breadcrumbItems,
  selectedMenuPermissions,
}: ProductStockPageProps) {
  const requestIdRef = useRef(0);
  const [exportDate, setExportDate] = useState(() => todayDash());
  const [search, setSearch] = useState('');
  const [client, setClient] = useState('');
  const [sort, setSort] = useState<StockSort>('name-asc');
  const [rows, setRows] = useState<StockRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lots, setLotsState] = useState<LotState>({}); // 펼친 줄(제품코드)과 그 로트
  const lotsRef = useRef(lots); // 전체 로트보기처럼 여러 줄을 한꺼번에 펼칠 때 지금 펼친 줄을 바로 알아야 한다
  const setLots = useCallback((next: LotState) => {
    lotsRef.current = next;
    setLotsState(next);
  }, []);
  const [allExpanded, setAllExpanded] = useState(false);
  const [valueOpen, setValueOpen] = useState(false);
  const [alertText, setAlertText] = useState<string | null>(null);
  const [error, setError] = useState('');

  const loadRows = useCallback(async (q: string, clientName: string, order: StockSort) => {
    const requestId = ++requestIdRef.current;
    setAllExpanded(false);
    setLots({});
    setLoading(true);
    try {
      const list = await fetchStock(q, clientName, order);
      if (requestId !== requestIdRef.current) return;
      setRows(list);
    } catch (requestError) {
      if (requestId !== requestIdRef.current) return;
      setRows([]);
      setError(errorText(requestError, '제품재고를 불러오지 못했습니다.'));
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
        setLoaded(true);
      }
    }
  }, [setLots]);

  useEffect(() => {
    void loadRows('', '', 'name-asc');
  }, [loadRows]);

  // 이미 펼친 줄은 다시 부르지 않는다
  const openLot = useCallback(async (code: string) => {
    if (code in lotsRef.current) return;
    setLots({ ...lotsRef.current, [code]: 'loading' });
    const list = await fetchLots(code).catch(() => [] as LotRecord[]);
    // 기다리는 사이 접었으면 그대로 둔다
    if (code in lotsRef.current) setLots({ ...lotsRef.current, [code]: list });
  }, [setLots]);

  const closeLot = useCallback((code: string) => {
    const next = { ...lotsRef.current };
    delete next[code];
    setLots(next);
  }, [setLots]);

  const toggleAll = async () => {
    if (rows.length === 0) return;
    const expand = !allExpanded;
    setAllExpanded(expand);
    if (expand) await Promise.all(rows.map((row) => openLot(row.code)));
    else setLots({});
  };

  // 송연 엑셀: 기준일(비우면 오늘) 기준 재고를 서버에서 다시 받는다
  const exportExcel = async () => {
    try {
      const data = await fetchStockAsOf(exportDate);
      if (data.products.length === 0) {
        setAlertText('다운로드할 데이터가 없어요');
        return;
      }
      await downloadExcel(data.products, STOCK_EXCEL_COLUMNS, `제품재고_${data.date}.xlsx`, '제품재고');
    } catch {
      setAlertText('재고 조회에 실패했어요');
    }
  };

  const reload = () => void loadRows(search, client, sort);

  const columns = useMemo<F1GridColumn<StockRow>[]>(() => [
    { field: 'code', type: 'rownumber', width: 60, headerName: '순번', headerAlign: 'center', align: 'center', pinned: 'left' },
    { field: 'name', headerName: '품목명', flex: 1.5, width: 200, headerAlign: 'center', align: 'left' },
    { field: 'spec', headerName: '규격', width: 120, headerAlign: 'center', align: 'left', renderCell: ({ row }) => row.spec || '' },
    { field: 'clientName', headerName: '거래처', flex: 1, width: 160, headerAlign: 'center', align: 'left', renderCell: ({ row }) => row.clientName || '' },
    {
      field: 'stockQty', headerName: '현재고', width: 120, headerAlign: 'center', align: 'right',
      renderCell: ({ row }) => formatQty(row.stockQty), getCellStyle: () => ({ fontWeight: 700 }),
    },
    {
      field: 'plannedQty', headerName: '생산예정', width: 140, headerAlign: 'center', align: 'right',
      renderCell: ({ row }) => plannedText(row), getCellStyle: ({ row }) => (row.plannedQty > 0 ? { color: '#0369a1' } : {}),
    },
    {
      field: 'plannedCount', headerName: '', width: 100, headerAlign: 'center', align: 'center', pinned: 'right',
      renderCell: ({ row }) => {
        const open = row.code in lots;
        return (
          <Button size="small" variant={open ? 'contained' : 'outlined'} sx={rowButton} onClick={() => (open ? closeLot(row.code) : void openLot(row.code))}>
            {open ? '로트접기' : '로트보기'}
          </Button>
        );
      },
    },
  ], [lots, openLot, closeLot]);

  const lotRows = useMemo(() => flattenLots(rows, lots), [rows, lots]);
  const openCodes = rows.filter((row) => row.code in lots);
  const loadingLots = openCodes.some((row) => lots[row.code] === 'loading');
  const noLotProducts = openCodes.filter((row) => Array.isArray(lots[row.code]) && (lots[row.code] as LotRecord[]).length === 0);

  const lotColumns = useMemo<F1GridColumn<LotRow>[]>(() => [
    { field: 'key', type: 'rownumber', width: 60, headerName: '순번', headerAlign: 'center', align: 'center', pinned: 'left' },
    { field: 'productLabel', headerName: '품목명(규격)', flex: 1.5, width: 220, headerAlign: 'center', align: 'left' },
    {
      field: 'lotNo', headerName: '로트번호', width: 200, headerAlign: 'center', align: 'left',
      renderCell: ({ row }) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <span>{lotText(row)}</span>
          {row.status === 'planned' && <Chip size="small" color="warning" variant="outlined" label="생산예정" />}
        </Box>
      ),
    },
    { field: 'producedQty', headerName: '생산량', width: 120, headerAlign: 'center', align: 'right', renderCell: ({ row }) => formatQty(row.producedQty) },
    { field: 'shippedQty', headerName: '출하량', width: 120, headerAlign: 'center', align: 'right', renderCell: ({ row }) => formatQty(row.shippedQty) },
    {
      field: 'remainingQty', headerName: '잔량', width: 120, headerAlign: 'center', align: 'right',
      renderCell: ({ row }) => formatQty(row.remainingQty),
      // 다 나간 로트는 흐리게(송연과 같음)
      getCellStyle: ({ row }) => ({ fontWeight: 700, ...(row.remainingQty <= 0 ? { color: '#94a3b8' } : {}) }),
    },
  ], []);

  const pageActionGroups: PermissionActionGroupDefinition[] = [
    {
      key: 'read',
      actions: [
        { label: '조회', icon: SearchIcon, visible: Boolean(selectedMenuPermissions?.read), disabled: loading, onClick: reload },
        {
          label: '엑셀 다운로드', icon: FileDownloadIcon,
          visible: Boolean(selectedMenuPermissions?.excel || selectedMenuPermissions?.read), onClick: () => void exportExcel(),
        },
        { label: '재고금액 조회', icon: SavingsIcon, visible: Boolean(selectedMenuPermissions?.read), onClick: () => setValueOpen(true) },
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
            placeholder="품목명 검색 (비우면 전체)"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            slotProps={{ htmlInput: { 'aria-label': '품목명 검색' } }}
            sx={(theme) => ({ width: '100%', ...searchFieldSx(theme) })}
          />
        }
        onDefaultSearch={reload}
      >
        <TextField
          size="small"
          margin="none"
          placeholder="거래처 검색"
          autoComplete="off"
          value={client}
          onChange={(event) => setClient(event.target.value)}
          slotProps={{ htmlInput: { 'aria-label': '거래처 검색' } }}
          sx={(theme) => ({ width: { xs: '100%', sm: 180 }, ...sideFieldSx(theme) })}
        />
        <TextField
          select
          size="small"
          margin="none"
          value={sort}
          onChange={(event) => setSort(event.target.value as StockSort)}
          slotProps={{ htmlInput: { 'aria-label': '정렬' } }}
          sx={(theme) => ({ width: { xs: '100%', sm: 170 }, ...sideFieldSx(theme) })}
        >
          <MenuItem value="name-asc">품목명 오름차순</MenuItem>
          <MenuItem value="name-desc">품목명 내림차순</MenuItem>
        </TextField>
        <TextField
          type="date"
          size="small"
          margin="none"
          value={exportDate}
          onChange={(event) => setExportDate(event.target.value)}
          title="엑셀 다운로드 기준일 (비워두면 오늘)"
          slotProps={{ htmlInput: { 'aria-label': '기준일' } }}
          sx={(theme) => ({ width: { xs: '100%', sm: 175 }, ...sideFieldSx(theme) })}
        />
      </PageSearchArea>
      <PageMessageArea message={error} onClose={() => setError('')} />
      <Box sx={{ p: { xs: 1.5, sm: 1 }, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Card sx={{ ...cardSx, flex: openCodes.length > 0 ? 1.1 : 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1.75, mb: 1 }}>
            {loaded && !loading && rows.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ mr: 'auto' }}>품목이 없습니다</Typography>
            )}
            <Typography variant="caption" color="text.secondary">기준일은 엑셀 다운로드에 쓰여요(그 날짜 기준 재고)</Typography>
            <Button size="small" variant="outlined" disabled={rows.length === 0} onClick={() => void toggleAll()}>
              {allExpanded ? '📦 전체 로트접기' : '📦 전체 로트보기'}
            </Button>
            <Typography sx={{ fontSize: 13, fontWeight: 700 }}>
              합계현재고:{' '}
              <Box component="span" aria-label="합계현재고" sx={{ color: 'primary.main', fontSize: 16, fontVariantNumeric: 'tabular-nums' }}>
                {formatQty(totalStock(rows))}
              </Box>
            </Typography>
          </Box>
          <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
            <F1Grid
              rows={rows}
              columns={columns}
              rowKey="code"
              storageKey="lg-product-stock-grid"
              ariaLabel="F1-GRID 제품재고"
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
        </Card>
        {openCodes.length > 0 && (
          <Card sx={{ ...cardSx, flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
              <Typography sx={{ fontSize: 14, fontWeight: 700 }}>로트</Typography>
              <Typography variant="body2" color="text.secondary">
                {loadingLots ? '불러오는 중...' : `${openCodes.length}개 품목 · 잔량 = 생산량(생산입고 전이면 생산지시량) − 출하량`}
              </Typography>
              {noLotProducts.length > 0 && (
                <Typography variant="body2" color="text.secondary">
                  · 등록된 로트가 없습니다: {noLotProducts.map((row) => productLabel(row)).join(', ')}
                </Typography>
              )}
            </Box>
            <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
              <F1Grid
                rows={lotRows}
                columns={lotColumns}
                rowKey="key"
                storageKey="lg-product-stock-lot-grid"
                ariaLabel="F1-GRID 제품재고 로트"
                height="100%"
                maxHeight="100%"
                rowHeight={34}
                minRowHeight={34}
                maxRowHeight={320}
                columnLine
                showCheckbox={false}
                loading={loadingLots}
                resizableRows={false}
                allowAddRowInContextMenu={false}
                allowDuplicateRowInContextMenu={false}
                allowDeleteRowInContextMenu={false}
              />
            </Box>
          </Card>
        )}
      </Box>
      <StockValueDialog open={valueOpen} onClose={() => setValueOpen(false)} onAlert={setAlertText} />
      <ConfirmDialog
        open={alertText != null}
        title="제품재고관리"
        message={alertText ?? ''}
        alertOnly
        onCancel={() => setAlertText(null)}
        onConfirm={() => setAlertText(null)}
      />
    </Box>
  );
}

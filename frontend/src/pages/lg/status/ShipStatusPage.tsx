import { useMemo, useRef, useState } from 'react';
import { Box, Card, Chip, TextField, Typography } from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import SearchIcon from '@mui/icons-material/Search';
import { PageHeader } from '../../../shared/components/PageHeader';
import { type PermissionActionGroupDefinition } from '../../../shared/components/PermissionGroup';
import { PageMessageArea } from '../../../shared/components/PageMessageArea';
import { PageSearchArea } from '../../../shared/components/PageSearchArea';
import { F1Grid, type F1GridColumn } from '../../../shared/components/f1-grid';
import { downloadExcel, todayDash } from '../../../shared/utils/excelFile';
import type { MenuPermission, ModuleItem, PageContent } from '../../dashboard/types/dashboard';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { fetchShipStatus } from './services/shipStatus.service';
import {
  SHIP_STATUS_EXCEL_COLUMNS, carryoverText, dash, qtyText, statusExcelName, toStatusRow, type ShipStatusQuery, type ShipStatusRow,
} from './utils/shipStatus';

const errorText = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

type ShipStatusPageProps = {
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

// 물류관리 > 출하현황 (송연 LG0003, 기존 #screen-ship-status · 23-ship-status.js)
// 출하확정된 기록을 기간·품목명·거래처명으로 본다. 조회만 하는 화면이고, 송연처럼 [조회] 를 눌러야 목록이 나온다.
// 금액만 다른 때로 넘긴(이월) 건은 물건이 이 날짜에 나갔으므로 빼지 않고 비고에 꼬리표를 단다.
export function ShipStatusPage({
  selectedModule,
  currentMenuName,
  content,
  breadcrumbItems,
  selectedMenuPermissions,
}: ShipStatusPageProps) {
  const requestIdRef = useRef(0);
  const [query, setQuery] = useState<ShipStatusQuery>(() => ({ start: todayDash(), end: todayDash(), productName: '', clientName: '' }));
  const [rows, setRows] = useState<ShipStatusRow[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alertText, setAlertText] = useState<string | null>(null);
  const [error, setError] = useState('');

  const change = (key: keyof ShipStatusQuery) => (event: { target: { value: string } }) =>
    setQuery((current) => ({ ...current, [key]: event.target.value }));

  const periodMissing = () => {
    if (query.start && query.end) return false;
    setAlertText('조회 기간을 선택해주세요');
    return true;
  };

  const loadRows = async () => {
    if (periodMissing()) return;
    const requestId = ++requestIdRef.current;
    setLoading(true);
    try {
      const records = await fetchShipStatus(query);
      if (requestId !== requestIdRef.current) return;
      setRows(records.map(toStatusRow));
      setSearched(true);
    } catch (requestError) {
      if (requestId === requestIdRef.current) setError(errorText(requestError, '출하현황을 불러오지 못했습니다.'));
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  };

  const exportExcel = async () => {
    if (periodMissing()) return;
    try {
      const list = await fetchShipStatus(query);
      if (list.length === 0) {
        setAlertText('다운로드할 데이터가 없어요');
        return;
      }
      await downloadExcel(list, SHIP_STATUS_EXCEL_COLUMNS, statusExcelName(query), '출하현황');
    } catch (requestError) {
      setError(errorText(requestError, '다운로드하지 못했어요'));
    }
  };

  const columns = useMemo<F1GridColumn<ShipStatusRow>[]>(() => [
    { field: 'key', type: 'rownumber', width: 60, headerName: '순번', headerAlign: 'center', align: 'center', pinned: 'left' },
    { field: 'scheduleDate', headerName: '출고일', width: 110, headerAlign: 'center', align: 'center' },
    { field: 'clientName', headerName: '거래처', flex: 1, width: 140, headerAlign: 'center', align: 'left' },
    { field: 'productName', headerName: '품목명(규격)', flex: 1.5, width: 200, headerAlign: 'center', align: 'left' },
    { field: 'storage', headerName: '보관방법', width: 120, headerAlign: 'center', align: 'left', renderCell: ({ row }) => dash(row.storage) },
    {
      field: 'orderQty', headerName: '출하량', width: 90, headerAlign: 'center', align: 'right', type: 'number',
      renderCell: ({ row }) => qtyText(row.orderQty), getCellStyle: () => ({ fontWeight: 700 })
    },
    { field: 'vehicle', headerName: '배차', width: 120, headerAlign: 'center', align: 'left', renderCell: ({ row }) => dash(row.vehicle) },
    { field: 'driverName', headerName: '운행자', width: 90, headerAlign: 'center', align: 'left', renderCell: ({ row }) => dash(row.driverName) },
    { field: 'visitOrder', headerName: '순서', width: 60, headerAlign: 'center', align: 'right', renderCell: ({ row }) => dash(row.visitOrder) },
    { field: 'packingMethod', headerName: '포장방법', width: 100, headerAlign: 'center', align: 'left', renderCell: ({ row }) => dash(row.packingMethod) },
    { field: 'shipNote', headerName: '특이사항', flex: 1, width: 140, headerAlign: 'center', align: 'left', renderCell: ({ row }) => dash(row.shipNote) },
    {
      field: 'carryoverLabel', headerName: '비고', width: 170, headerAlign: 'center', align: 'left',
      renderCell: ({ row }) => (row.carriedOver ? <Chip size="small" color="warning" variant="outlined" label={carryoverText(row)} /> : ''),
    },
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
            size="small"
            margin="none"
            placeholder="품목명 검색"
            value={query.productName}
            onChange={change('productName')}
            slotProps={{ htmlInput: { 'aria-label': '품목명 검색' } }}
            sx={(theme) => ({ width: '100%', ...searchFieldSx(theme) })}
          />
        }
        onDefaultSearch={() => void loadRows()}
      >
        <TextField
          size="small"
          margin="none"
          placeholder="거래처명 검색"
          value={query.clientName}
          onChange={change('clientName')}
          slotProps={{ htmlInput: { 'aria-label': '거래처명 검색' } }}
          sx={(theme) => ({ width: { xs: '100%', sm: 200 }, ...sideFieldSx(theme) })}
        />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TextField
            type="date"
            size="small"
            margin="none"
            value={query.start}
            onChange={change('start')}
            slotProps={{ htmlInput: { 'aria-label': '시작일' } }}
            sx={(theme) => ({ width: 170, ...sideFieldSx(theme) })}
          />
          <Typography variant="body2" color="text.secondary">~</Typography>
          <TextField
            type="date"
            size="small"
            margin="none"
            value={query.end}
            onChange={change('end')}
            slotProps={{ htmlInput: { 'aria-label': '종료일' } }}
            sx={(theme) => ({ width: 170, ...sideFieldSx(theme) })}
          />
        </Box>
      </PageSearchArea>
      <PageMessageArea message={error} onClose={() => setError('')} />
      <Box sx={{ p: { xs: 1.5, sm: 1 }, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Card sx={{ borderRadius: 1, border: '1px solid rgba(148,163,184,0.18)', boxShadow: 'none', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', p: 1.5 }}>
          {!loading && rows.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {searched ? '이 기간에 출하확정된 기록이 없습니다' : '기간을 정하고 [조회] 를 눌러주세요'}
            </Typography>
          )}
          <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
            <F1Grid
              rows={rows}
              columns={columns}
              rowKey="key"
              storageKey="lg-ship-status-grid"
              ariaLabel="F1-GRID 출하현황"
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
      </Box>
      <ConfirmDialog
        open={alertText != null}
        title="출하현황"
        message={alertText ?? ''}
        alertOnly
        onCancel={() => setAlertText(null)}
        onConfirm={() => setAlertText(null)}
      />
    </Box>
  );
}

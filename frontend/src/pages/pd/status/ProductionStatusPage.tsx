import { useMemo, useRef, useState } from 'react';
import { Box, Card, TextField, Typography } from '@mui/material';
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
import { fetchProductionStatus } from './services/productionStatus.service';
import { STATUS_EXCEL_COLUMNS, noteText, statusExcelName, type StatusQuery, type StatusRecord } from './utils/productionStatus';

const errorText = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

type ProductionStatusPageProps = {
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

// 생산관리 > 생산현황 (송연 PD0003, 기존 production_status)
// 생산입고(실생산량이 적힌) 기록을 기간·품목명·거래처명으로 본다. 조회만 하는 화면이고, 송연처럼 [조회] 를 눌러야 목록이 나온다.
export function ProductionStatusPage({
  selectedModule,
  currentMenuName,
  content,
  breadcrumbItems,
  selectedMenuPermissions,
}: ProductionStatusPageProps) {
  const requestIdRef = useRef(0);
  const [query, setQuery] = useState<StatusQuery>(() => ({ start: todayDash(), end: todayDash(), productName: '', clientName: '' }));
  const [rows, setRows] = useState<StatusRecord[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alertText, setAlertText] = useState<string | null>(null);
  const [error, setError] = useState('');

  const change = (key: keyof StatusQuery) => (event: { target: { value: string } }) =>
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
      const records = await fetchProductionStatus(query);
      if (requestId !== requestIdRef.current) return;
      setRows(records);
      setSearched(true);
    } catch (requestError) {
      if (requestId === requestIdRef.current) setError(errorText(requestError, '생산현황을 불러오지 못했습니다.'));
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  };

  const exportExcel = async () => {
    if (periodMissing()) return;
    try {
      const list = await fetchProductionStatus(query);
      if (list.length === 0) {
        setAlertText('다운로드할 데이터가 없어요');
        return;
      }
      await downloadExcel(list, STATUS_EXCEL_COLUMNS, statusExcelName(query), '생산현황');
    } catch (requestError) {
      setError(errorText(requestError, '다운로드하지 못했어요'));
    }
  };

  const columns = useMemo<F1GridColumn<StatusRecord>[]>(() => [
    { field: 'id', type: 'rownumber', width: 60, headerName: '순번', headerAlign: 'center', align: 'center', pinned: 'left' },
    { field: 'scheduleDate', headerName: '생산일', width: 120, headerAlign: 'center', align: 'center' },
    { field: 'clientName', headerName: '거래처', flex: 1, width: 140, headerAlign: 'center', align: 'left' },
    { field: 'productName', headerName: '품목명(규격)', flex: 1.5, width: 200, headerAlign: 'center', align: 'left' },
    {
      field: 'orderQty', headerName: '생산지시량', width: 130, headerAlign: 'center', align: 'right',
      type: 'number', decimalPlaces: 2,
    },
    {
      field: 'actualQty', headerName: '실생산량', width: 130, headerAlign: 'center', align: 'right',
      type: 'number', decimalPlaces: 2, getCellStyle: () => ({ fontWeight: 700 })
    },
    { field: 'note', headerName: '비고', flex: 1, width: 160, headerAlign: 'center', align: 'left', renderCell: ({ row }) => noteText(row.note) },
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
              {searched ? '조회된 생산 실적이 없습니다' : '기간을 정하고 [조회] 를 눌러주세요'}
            </Typography>
          )}
          <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
            <F1Grid
              rows={rows}
              columns={columns}
              rowKey="id"
              storageKey="pd-status-grid"
              ariaLabel="F1-GRID 생산현황"
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
        title="생산현황"
        message={alertText ?? ''}
        alertOnly
        onCancel={() => setAlertText(null)}
        onConfirm={() => setAlertText(null)}
      />
    </Box>
  );
}

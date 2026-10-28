import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Card, Chip, TextField, Typography } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import SaveIcon from '@mui/icons-material/Save';
import SearchIcon from '@mui/icons-material/Search';
import { PageHeader } from '../../../shared/components/PageHeader';
import { type PermissionActionGroupDefinition } from '../../../shared/components/PermissionGroup';
import { PageMessageArea } from '../../../shared/components/PageMessageArea';
import { PageSearchArea } from '../../../shared/components/PageSearchArea';
import { F1Grid, type F1GridColumn, type F1GridRef } from '../../../shared/components/f1-grid';
import { UnsavedChangesConfirmDialog } from '../../../shared/components/UnsavedChangesConfirmDialog';
import { downloadExcel, todayDash } from '../../../shared/utils/excelFile';
import type { MenuPermission, ModuleItem, PageContent } from '../../dashboard/types/dashboard';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { formatMoney, formatQty, monthStart } from '../register/utils/salesRegister';
import { deleteSale, fetchSalesStatus } from './services/salesStatus.service';
import { SALES_STATUS_EXCEL_COLUMNS, statusSummary, todayFileTag, type SaleRow, type SalesQuery } from './utils/salesStatus';

const errorText = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

type SalesStatusPageProps = {
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

// 판매관리 > 판매현황 (송연 #screen-sales-status · 36-sales.js loadSalesStatus)
// 등록한 판매를 기간·거래처·품목으로 찾아보고, 잘못 넣은 줄을 지운다. 기간은 이번 달 1일~오늘이고 열면 바로 불러온다.
// 2026-10-26 줄마다 있던 [지우기] 대신 수주등록 · 출하등록처럼 줄을 골라 [삭제](오른쪽 클릭 [행 삭제])로 표에서 빼고 [저장] 때 지운다.
// 판매는 고치는 기능이 없어서 [저장] 은 지우기만 한다.
export function SalesStatusPage({
  selectedModule,
  currentMenuName,
  content,
  breadcrumbItems,
  selectedMenuPermissions,
}: SalesStatusPageProps) {
  const requestIdRef = useRef(0);
  const [query, setQuery] = useState<SalesQuery>(() => ({ start: monthStart(), end: todayDash(), clientName: '', productName: '' }));
  const queryRef = useRef(query);
  queryRef.current = query;
  const [rows, setRows] = useState<SaleRow[]>([]);
  const [summary, setSummary] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const gridRef = useRef<F1GridRef<SaleRow>>(null);
  const [version, setVersion] = useState(0); // 다시 조회하면 표를 새로 그려 표의 '지운 줄' 기록도 비운다
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(0);
  const [confirmLeave, setConfirmLeave] = useState<(() => void) | null>(null);
  // 이번에 이미 지운 판매(저장 도중 오류가 나도 또 지우지 않게)
  const deletedIdsRef = useRef<Set<number>>(new Set());
  const [alertText, setAlertText] = useState<string | null>(null);
  const [notice, setNotice] = useState('');

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
      const data = await fetchSalesStatus(current);
      if (requestId !== requestIdRef.current) return;
      setRows(data.rows);
      setSummary(statusSummary(data));
      setLoaded(true);
      deletedIdsRef.current = new Set();
      setDirty(false);
      setVersion((previous) => previous + 1);
    } catch (requestError) {
      if (requestId === requestIdRef.current) setAlertText(errorText(requestError, '불러오지 못했어요'));
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  // 표에서 뺀 판매([삭제] · 오른쪽 클릭 [행 삭제]). [저장] 때 서버에서 지운다
  const removedRows = () => (gridRef.current?.getChanges().deletedRows ?? []).filter((row) => !deletedIdsRef.current.has(row.id));
  const refreshDirty = () => setDirty(removedRows().length > 0);

  // 저장하지 않은 삭제가 있으면 먼저 묻고 한다([조회])
  const guard = (action: () => void) => {
    if (removedRows().length > 0) {
      setConfirmLeave(() => action);
      return;
    }
    action();
  };

  const removeSelected = () => {
    if ((gridRef.current?.getSelectedRows() ?? []).length === 0) {
      setAlertText('지울 판매 줄을 먼저 골라주세요(줄을 누르면 골라집니다)');
      return;
    }
    gridRef.current?.deleteSelectedRows();
  };

  const askSave = () => {
    const count = removedRows().length;
    if (count > 0) setConfirmDelete(count);
  };

  // 뺀 줄을 차례대로 지운다. 거절되면 거기서 멈추고 알린 뒤 다시 조회한다(앞에서 지운 줄은 지워진 채로)
  const saveAll = async () => {
    const targets = removedRows();
    if (targets.length === 0) return;
    setSaving(true);
    try {
      for (const row of targets) {
        try {
          await deleteSale(row.id);
          deletedIdsRef.current.add(row.id);
        } catch (requestError) {
          setAlertText(errorText(requestError, '지우지 못했어요'));
          await loadRows();
          return;
        }
      }
      setNotice('저장되었습니다');
      await loadRows();
    } finally {
      setSaving(false);
    }
  };

  // 송연과 같이 지금 화면에 불러온 것을 내려받는다
  const exportExcel = async () => {
    if (rows.length === 0) {
      setAlertText('내려받을 자료가 없습니다');
      return;
    }
    await downloadExcel(rows, SALES_STATUS_EXCEL_COLUMNS, `판매현황_${todayFileTag()}.xlsx`, '판매현황');
  };

  const columns = useMemo<F1GridColumn<SaleRow>[]>(() => [
    { field: 'id', type: 'rownumber', width: 60, headerName: '순번', headerAlign: 'center', align: 'center', pinned: 'left' },
    { field: 'saleDate', headerName: '판매일자', width: 120, headerAlign: 'center', align: 'center' },
    { field: 'clientName', headerName: '거래처', flex: 1, width: 150, headerAlign: 'center', align: 'left' },
    { field: 'productName', headerName: '품목명', flex: 1.5, width: 220, headerAlign: 'center', align: 'left' },
    { field: 'qty', headerName: '수량', width: 100, headerAlign: 'center', align: 'right', renderCell: ({ row }) => formatQty(row.qty) },
    { field: 'unitPrice', headerName: '단가', width: 110, headerAlign: 'center', align: 'right', renderCell: ({ row }) => formatMoney(row.unitPrice) },
    {
      field: 'amount', headerName: '금액', width: 130, headerAlign: 'center', align: 'right',
      renderCell: ({ row }) => formatMoney(row.amount), getCellStyle: () => ({ fontWeight: 700 }),
    },
    {
      field: 'sourceLabel', headerName: '들어온 곳', width: 110, headerAlign: 'center', align: 'center',
      renderCell: ({ row }) => <Chip size="small" variant="outlined" label={row.sourceLabel || ''} />,
    },
    { field: 'note', headerName: '메모', flex: 1, width: 150, headerAlign: 'center', align: 'left', renderCell: ({ row }) => row.note || '' },
  ], []);

  const pageActionGroups: PermissionActionGroupDefinition[] = [
    {
      key: 'read',
      actions: [
        { label: '조회', icon: SearchIcon, visible: Boolean(selectedMenuPermissions?.read), disabled: loading, onClick: () => guard(() => void loadRows()) },
        {
          label: '엑셀 다운로드', icon: FileDownloadIcon,
          visible: Boolean(selectedMenuPermissions?.excel || selectedMenuPermissions?.read), onClick: () => void exportExcel(),
        },
      ],
    },
    {
      key: 'write',
      actions: [
        // 2026-10-26 고른 줄을 표에서 뺀다(지우기는 [저장] 때)
        { label: '삭제', icon: DeleteIcon, visible: Boolean(selectedMenuPermissions?.delete), disabled: saving, onClick: removeSelected },
        { label: '저장', icon: SaveIcon, visible: Boolean(selectedMenuPermissions?.delete), disabled: saving || !dirty, onClick: askSave },
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
            size="small" margin="none" placeholder="거래처" value={query.clientName} onChange={change('clientName')}
            slotProps={{ htmlInput: { 'aria-label': '거래처 검색' } }} sx={(theme) => ({ width: '100%', ...searchFieldSx(theme) })}
          />
        }
        onDefaultSearch={() => guard(() => void loadRows())}
      >
        <TextField
          size="small" margin="none" placeholder="품목명" value={query.productName} onChange={change('productName')}
          slotProps={{ htmlInput: { 'aria-label': '품목명 검색' } }} sx={(theme) => ({ width: { xs: '100%', sm: 200 }, ...sideFieldSx(theme) })}
        />
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
      <PageMessageArea message={notice} severity="success" onClose={() => setNotice('')} />
      <Box sx={{ p: { xs: 1.5, sm: 1 }, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Card sx={{ borderRadius: 1, border: '1px solid rgba(148,163,184,0.18)', boxShadow: 'none', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', p: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1, flexWrap: 'wrap' }}>
            {loaded && !loading && rows.length === 0 && (
              <Typography variant="body2" color="text.secondary">이 기간에 등록된 판매가 없습니다</Typography>
            )}
            <Typography variant="body2" aria-label="판매현황 요약" sx={{ ml: 'auto', fontWeight: 700 }}>{summary}</Typography>
          </Box>
          <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
            <F1Grid
              key={version}
              ref={gridRef}
              rows={rows}
              columns={columns}
              rowKey="id"
              storageKey="sl-sales-status-grid"
              ariaLabel="F1-GRID 판매현황"
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
              // 2026-10-26 오른쪽 클릭 [행 삭제]: 표에서 빼 두고 [저장] 때 지운다
              allowDeleteRowInContextMenu={Boolean(selectedMenuPermissions?.delete)}
              selectRowOnContextMenu
              onChangesChange={() => refreshDirty()}
            />
          </Box>
        </Card>
      </Box>
      <ConfirmDialog
        open={alertText != null}
        title="판매현황"
        message={alertText ?? ''}
        alertOnly
        onCancel={() => setAlertText(null)}
        onConfirm={() => setAlertText(null)}
      />
      <ConfirmDialog
        open={confirmDelete > 0}
        title="판매 삭제"
        message={`판매 ${confirmDelete}건을 지우고 저장할까요?`}
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

import { useMemo, useRef, useState } from 'react';
import { Box, Button, Card, TextField, Typography } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { PageHeader } from '../../../shared/components/PageHeader';
import { type PermissionActionGroupDefinition } from '../../../shared/components/PermissionGroup';
import { PageMessageArea } from '../../../shared/components/PageMessageArea';
import { PageSearchArea } from '../../../shared/components/PageSearchArea';
import { F1Grid, type F1GridColumn } from '../../../shared/components/f1-grid';
import { LabelPrintDialog, type LabelPrintTarget } from '../../../shared/components/LabelPrintDialog';
import { barcodeSvgMarkup } from '../../../shared/components/LabelPrintDialog/labelHtml';
import { todayDash } from '../../../shared/utils/excelFile';
import type { MenuPermission, ModuleItem, PageContent } from '../../dashboard/types/dashboard';
import { fetchLabelPrintRows } from './services/labelPrint.service';
import { NO_PRODUCT_CODE_MESSAGE, printQtyText, type LabelPrintRecord } from './utils/labelPrint';

const errorText = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

type LabelPrintPageProps = {
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

// 생산관리 > 라벨출력 (송연 PD0004, 기존 15-label-print.js)
// 날짜를 고르면 그날 생산확정된 품목이 나오고, 🏷️ 인쇄는 라벨등록과 같은 라벨 창을 인쇄 전용으로 연다.
// 날짜는 송연처럼 오늘로 채워 두고, [조회] 를 눌러야 불러온다(송연도 처음엔 빈 표).
export function LabelPrintPage({
  selectedModule,
  currentMenuName,
  content,
  breadcrumbItems,
  selectedMenuPermissions,
}: LabelPrintPageProps) {
  const requestIdRef = useRef(0);
  const [date, setDate] = useState(() => todayDash());
  const [rows, setRows] = useState<LabelPrintRecord[]>([]);
  const [searchedDate, setSearchedDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [printing, setPrinting] = useState<LabelPrintTarget | null>(null);
  const [error, setError] = useState('');

  const loadRows = async () => {
    // 날짜를 비우고 조회하면 오늘로 채운다(송연과 같음)
    const day = date || todayDash();
    if (!date) setDate(day);
    const requestId = ++requestIdRef.current;
    setLoading(true);
    try {
      const records = await fetchLabelPrintRows(day);
      if (requestId !== requestIdRef.current) return;
      setRows(records);
      setSearchedDate(day);
    } catch (requestError) {
      if (requestId === requestIdRef.current) setError(errorText(requestError, '조회에 실패했어요'));
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  };

  const columns = useMemo<F1GridColumn<LabelPrintRecord>[]>(() => [
    { field: 'scheduleId', type: 'rownumber', width: 60, headerName: '순번', headerAlign: 'center', align: 'center', pinned: 'left' },
    { field: 'productName', headerName: '품목명', flex: 1.5, width: 220, headerAlign: 'center', align: 'left' },
    { field: 'spec', headerName: '규격단위', width: 130, headerAlign: 'center', align: 'left', renderCell: ({ row }) => row.spec || '' },
    { field: 'orderQty', headerName: '생산수량', width: 110, headerAlign: 'center', align: 'right', renderCell: ({ row }) => printQtyText(row.orderQty) },
    {
      field: 'productCode', headerName: '바코드', flex: 1, width: 200, headerAlign: 'center', align: 'left',
      renderCell: ({ row }) => (row.productCode ? (
        <Box
          component="span"
          aria-label={`바코드 ${row.productCode}`}
          sx={{ display: 'inline-block', lineHeight: 0 }}
          dangerouslySetInnerHTML={{ __html: barcodeSvgMarkup(row.productCode, { width: 1.4, height: 32, fontSize: 11 }) }}
        />
      ) : (
        <Typography component="span" variant="body2" color="text.disabled">제품코드없음</Typography>
      )),
    },
    {
      field: 'clientName', headerName: '', width: 110, headerAlign: 'center', align: 'center', pinned: 'right',
      renderCell: ({ row }) => (
        <span title={row.productCode ? undefined : NO_PRODUCT_CODE_MESSAGE}>
          <Button
            size="small" variant="contained" sx={{ minWidth: 0, px: 1, py: 0 }} disabled={!row.productCode}
            onClick={() => row.productCode && setPrinting({ code: row.productCode, name: row.productName || '', mfgDate: searchedDate })}
          >
            🏷️ 인쇄
          </Button>
        </span>
      ),
    },
  ], [searchedDate]);

  const pageActionGroups: PermissionActionGroupDefinition[] = [
    {
      key: 'read',
      actions: [
        { label: '조회', icon: SearchIcon, visible: Boolean(selectedMenuPermissions?.read), disabled: loading, onClick: () => void loadRows() },
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
            slotProps={{ htmlInput: { 'aria-label': '생산확정일' } }}
            sx={(theme) => ({ width: { xs: '100%', sm: 200 }, ...searchFieldSx(theme) })}
          />
        }
        onDefaultSearch={() => void loadRows()}
      />
      <PageMessageArea message={error} onClose={() => setError('')} />
      <Box sx={{ p: { xs: 1.5, sm: 1 }, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Card sx={{ borderRadius: 1, border: '1px solid rgba(148,163,184,0.18)', boxShadow: 'none', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', p: 1.5 }}>
          {!loading && rows.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {searchedDate ? '이 날짜에 생산확정된 품목이 없습니다' : '생산확정일을 정하고 [조회] 를 눌러주세요'}
            </Typography>
          )}
          <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
            <F1Grid
              rows={rows}
              columns={columns}
              rowKey="scheduleId"
              storageKey="pd-label-print-grid"
              ariaLabel="F1-GRID 라벨출력"
              height="100%"
              maxHeight="100%"
              rowHeight={52}
              minRowHeight={52}
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
      <LabelPrintDialog target={printing} onClose={() => setPrinting(null)} />
    </Box>
  );
}

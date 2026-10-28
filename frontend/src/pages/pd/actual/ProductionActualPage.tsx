import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Button, Card, TextField, Typography } from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import SearchIcon from '@mui/icons-material/Search';
import { PageHeader } from '../../../shared/components/PageHeader';
import { type PermissionActionGroupDefinition } from '../../../shared/components/PermissionGroup';
import { PageMessageArea } from '../../../shared/components/PageMessageArea';
import { PageSearchArea } from '../../../shared/components/PageSearchArea';
import { F1Grid, type F1GridColumn, type F1GridRef } from '../../../shared/components/f1-grid';
import { downloadExcel, todayDash } from '../../../shared/utils/excelFile';
import type { MenuPermission, ModuleItem, PageContent } from '../../dashboard/types/dashboard';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { fetchActualSchedule, saveActualQty } from './services/productionActual.service';
import { ACTUAL_EXCEL_COLUMNS, isLocked, toActualRow, undoMessage, type ActualRow } from './utils/productionActual';

const errorText = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;
const rowButton = { minWidth: 0, px: 1, py: 0 };

type ProductionActualPageProps = {
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

// 생산관리 > 생산입고 (송연 PD0002, 기존 20-production.js loadActualList·buildActualRow)
// 생산입고는 재고를 만들어내는 자리라, 저장하면 칸을 잠가 실수로 덧쓰는 일을 막고
// 고치려면 '수정' 을 한 번 더 누르게 한다. 잘못 넣었으면 '입고취소' 로 지우고 재고도 함께 되돌린다.
export function ProductionActualPage({
  selectedModule,
  currentMenuName,
  content,
  breadcrumbItems,
  selectedMenuPermissions,
}: ProductionActualPageProps) {
  const gridRef = useRef<F1GridRef<ActualRow>>(null);
  const requestIdRef = useRef(0);
  const [date, setDate] = useState(() => todayDash());
  const [rows, setRows] = useState<ActualRow[]>([]);
  const rowsRef = useRef(rows);
  rowsRef.current = rows;
  const [version, setVersion] = useState(0);
  const [loading, setLoading] = useState(false);
  const [justSaved, setJustSaved] = useState<number | null>(null);
  const [undoing, setUndoing] = useState<ActualRow | null>(null);
  const [alertText, setAlertText] = useState<string | null>(null);
  const [error, setError] = useState('');

  const commit = (next: ActualRow[]) => {
    rowsRef.current = next;
    setRows(next);
    setVersion((v) => v + 1);
  };
  // 표 안에서 친 값을 목록으로 되받아 온다
  const pull = (): ActualRow[] => gridRef.current?.getActiveRows() ?? rowsRef.current;

  const loadRows = useCallback(async (day: string) => {
    if (!day) {
      setError('조회할 날짜를 먼저 선택해주세요');
      return;
    }
    const requestId = ++requestIdRef.current;
    setLoading(true);
    try {
      const records = await fetchActualSchedule(day);
      if (requestId !== requestIdRef.current) return;
      const next = records.map(toActualRow);
      rowsRef.current = next;
      setRows(next);
      setVersion((v) => v + 1);
    } catch (requestError) {
      if (requestId === requestIdRef.current) setError(errorText(requestError, '생산입고 목록을 불러오지 못했습니다.'));
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, []);

  // 송연처럼 열면 오늘 것을 바로 보여준다
  useEffect(() => {
    void loadRows(todayDash());
  }, [loadRows]);
  useEffect(() => {
    if (justSaved == null) return undefined;
    const timer = setTimeout(() => setJustSaved(null), 1200);
    return () => clearTimeout(timer);
  }, [justSaved]);

  const send = async (id: number, value: string): Promise<boolean> => {
    try {
      await saveActualQty(id, value);
      commit(pull().map((row) => (row.id === id ? { ...row, actualQty: value || null, input: value, saved: value, editing: false } : row)));
      return true;
    } catch (requestError) {
      setAlertText(errorText(requestError, '저장하지 못했어요'));
      return false;
    }
  };

  const save = async (id: number) => {
    const row = pull().find((item) => item.id === id);
    if (!row) return;
    const value = String(row.input ?? '').trim();
    if (!value) {
      setAlertText('실생산량을 입력해주세요');
      return;
    }
    if (await send(id, value)) setJustSaved(id);
  };

  const edit = (id: number) => commit(pull().map((row) => (row.id === id ? { ...row, editing: true } : row)));

  const undo = async () => {
    const row = undoing;
    setUndoing(null);
    if (row) await send(row.id, '');
  };

  const exportExcel = async () => {
    if (!date) {
      setError('조회할 날짜를 먼저 선택해주세요');
      return;
    }
    try {
      const list = await fetchActualSchedule(date);
      if (list.length === 0) {
        setAlertText('다운로드할 데이터가 없어요');
        return;
      }
      await downloadExcel(list, ACTUAL_EXCEL_COLUMNS, `생산입고_${date}.xlsx`, '생산입고');
    } catch (requestError) {
      setError(errorText(requestError, '다운로드하지 못했어요'));
    }
  };

  const columns = useMemo<F1GridColumn<ActualRow>[]>(() => [
    { field: 'id', type: 'rownumber', width: 60, headerName: '순번', headerAlign: 'center', align: 'center', pinned: 'left' },
    { field: 'clientName', headerName: '거래처', flex: 1, width: 160, headerAlign: 'center', align: 'left' },
    { field: 'productName', headerName: '품목명(규격)', flex: 1.5, width: 220, headerAlign: 'center', align: 'left' },
    {
      field: 'orderQty', headerName: '생산지시량(계획)', width: 140, headerAlign: 'center', align: 'right',
      type: 'number', decimalPlaces: 2,
    },
    {
      field: 'input', headerName: '실생산량', width: 140, headerAlign: 'center', align: 'right',
      type: 'number', decimalPlaces: 2,
      editable: (row) => !isLocked(row),
      // 아직 안 적은 줄은 예시를 흐리게 보여준다
      renderCell: ({ row }) => (row.input ? row.input : <Typography component="span" variant="body2" color="text.disabled">예: 980kg</Typography>),
      getCellStyle: ({ row }) => (isLocked(row) ? { fontWeight: 700 } : { background: 'rgba(37, 99, 235, 0.06)' }),
    },
    {
      field: 'saved', headerName: '', width: 170, headerAlign: 'center', align: 'center', pinned: 'right',
      renderCell: ({ row }) => (isLocked(row) ? (
        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
          <Button size="small" variant="outlined" sx={rowButton} onClick={() => edit(row.id)}>수정</Button>
          <Button size="small" variant="outlined" color="error" sx={rowButton} onClick={() => setUndoing(row)}>입고취소</Button>
        </Box>
      ) : (
        <Button size="small" variant="contained" sx={rowButton} onClick={() => void save(row.id)}>
          {justSaved === row.id ? '저장됨' : '저장'}
        </Button>
      )),
    },
    // 단추는 누를 때 표의 값을 다시 읽으므로, 표를 새로 그릴 때(version) 함께 새로 만든다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [version, justSaved]);

  const pageActionGroups: PermissionActionGroupDefinition[] = [
    {
      key: 'read',
      actions: [
        { label: '조회', icon: SearchIcon, visible: Boolean(selectedMenuPermissions?.read), disabled: loading, onClick: () => void loadRows(date) },
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
            type="date"
            size="small"
            margin="none"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            slotProps={{ htmlInput: { 'aria-label': '생산일자' } }}
            sx={(theme) => ({ width: { xs: '100%', sm: 200 }, ...searchFieldSx(theme) })}
          />
        }
        onDefaultSearch={() => void loadRows(date)}
      />
      <PageMessageArea message={error} onClose={() => setError('')} />
      <Box sx={{ p: { xs: 1.5, sm: 1 }, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Card sx={{ borderRadius: 1, border: '1px solid rgba(148,163,184,0.18)', boxShadow: 'none', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', p: 1.5 }}>
          {!loading && rows.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>이 날짜에 확정된 생산스케줄이 없습니다</Typography>
          )}
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            실생산량을 저장하면 그만큼 제품 재고가 늘고(수불 원장에 기록) 연결된 필름·파우치가 빠져요. 고치면 차이만큼, 입고취소하면 넣었던 만큼 되돌려요.
          </Typography>
          <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
            <F1Grid
              key={version}
              ref={gridRef}
              rows={rows}
              columns={columns}
              rowKey="id"
              storageKey="pd-actual-grid"
              ariaLabel="F1-GRID 생산입고"
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
        title="생산입고"
        message={alertText ?? ''}
        alertOnly
        onCancel={() => setAlertText(null)}
        onConfirm={() => setAlertText(null)}
      />
      <ConfirmDialog
        open={Boolean(undoing)}
        title="입고취소"
        message={undoing ? undoMessage(undoing) : ''}
        confirmLabel="입고취소"
        danger
        onCancel={() => setUndoing(null)}
        onConfirm={() => void undo()}
      />
    </Box>
  );
}

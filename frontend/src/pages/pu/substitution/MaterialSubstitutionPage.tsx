import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Button, Card, Chip, TextField, Typography } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { PageHeader } from '../../../shared/components/PageHeader';
import { type PermissionActionGroupDefinition } from '../../../shared/components/PermissionGroup';
import { PageSearchArea } from '../../../shared/components/PageSearchArea';
import { F1Grid, type F1GridColumn } from '../../../shared/components/f1-grid';
import { todayDash } from '../../../shared/utils/excelFile';
import type { MenuPermission, ModuleItem, PageContent } from '../../dashboard/types/dashboard';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { SubstitutionDetailDialog } from './components/SubstitutionDetailDialog';
import { fetchDetail, fetchMaterials, fetchSchedules } from './services/materialSubstitution.service';
import {
  applyCount, clientOrStock, summaryText,
  type SubstitutionDetail, type SubstitutionMaterial, type SubstitutionSchedule,
} from './utils/materialSubstitution';

const errorText = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

type MaterialSubstitutionPageProps = {
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
const GOLD = 'rgba(245, 158, 11, 0.12)';

// 구매관리 > 재료 치환등록 (송연 #screen-mat-sub · 39-material-substitute.js)
// '양파밀링(국내산)이 오늘 안 들어왔다' 를 가장 먼저 아는 사람이 구매 담당자라 치환은 여기서 한다.
// 하루 생산이 스무 건이면 배합표 스무 벌을 펼쳐놓을 수 없어서, 목록에서 찾고 그 건만 상세보기로 열어 바꾼다.
export function MaterialSubstitutionPage({
  selectedModule,
  currentMenuName,
  content,
  breadcrumbItems,
  selectedMenuPermissions,
}: MaterialSubstitutionPageProps) {
  const requestIdRef = useRef(0);
  const [date, setDate] = useState(() => todayDash());
  const [rows, setRows] = useState<SubstitutionSchedule[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [materials, setMaterials] = useState<SubstitutionMaterial[]>([]);
  const [detail, setDetail] = useState<SubstitutionDetail | null>(null);
  const [alertText, setAlertText] = useState<string | null>(null);

  const load = useCallback(async (day: string) => {
    if (!day) {
      setAlertText('날짜를 골라주세요');
      return;
    }
    const requestId = ++requestIdRef.current;
    setLoading(true);
    try {
      const list = await fetchSchedules(day);
      if (requestId !== requestIdRef.current) return;
      setRows(list);
      setLoaded(true);
    } catch (requestError) {
      if (requestId === requestIdRef.current) setAlertText(errorText(requestError, '불러오지 못했어요'));
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, []);

  // 송연과 같이 화면을 열면 오늘 것을 바로 조회한다
  useEffect(() => {
    void load(todayDash());
  }, [load]);

  const openDetail = async (row: SubstitutionSchedule) => {
    try {
      // 후보 목록은 처음 열 때 한 번만 받는다
      if (materials.length === 0) setMaterials(await fetchMaterials());
      setDetail(await fetchDetail(row.id));
    } catch (requestError) {
      setAlertText(errorText(requestError, '불러오지 못했어요'));
    }
  };

  // 바꾸거나 되돌린 뒤 뒤에 깔린 목록의 '원재료치환' 칸도 같이 고친다
  const changed = (next: SubstitutionDetail) => {
    setDetail(next);
    setRows((current) => applyCount(current, next.header));
  };

  const columns = useMemo<F1GridColumn<SubstitutionSchedule>[]>(() => {
    const gold = ({ row }: { row: SubstitutionSchedule }) => (row.substitutionCount ? { backgroundColor: GOLD } : undefined);
    return [
      { field: 'id', type: 'rownumber', width: 60, headerName: '순번', headerAlign: 'center', align: 'center', pinned: 'left', getCellStyle: gold },
      { field: 'productName', headerName: '품목명', flex: 1.6, width: 260, headerAlign: 'center', align: 'left', getCellStyle: (ctx) => ({ fontWeight: 700, ...gold(ctx) }) },
      { field: 'clientName', headerName: '거래처', flex: 1, width: 180, headerAlign: 'center', align: 'left', getCellStyle: gold, renderCell: ({ row }) => clientOrStock(row.clientName) },
      { field: 'orderQty', headerName: '생산지시량', width: 120, headerAlign: 'center', align: 'right', getCellStyle: gold, renderCell: ({ row }) => row.orderQty || '' },
      { field: 'lotNo', headerName: '로트번호', width: 130, headerAlign: 'center', align: 'center', getCellStyle: gold, renderCell: ({ row }) => row.lotNo || '' },
      {
        field: 'substitutionCount', headerName: '원재료치환', width: 110, headerAlign: 'center', align: 'center', getCellStyle: gold,
        renderCell: ({ row }) => (row.substitutionCount ? <Chip size="small" color="warning" variant="outlined" label={`${row.substitutionCount}건`} /> : ''),
      },
      {
        field: 'productCode', headerName: '', width: 100, headerAlign: 'center', align: 'center', pinned: 'right', getCellStyle: gold,
        renderCell: ({ row }) => <Button size="small" variant="outlined" sx={{ minWidth: 0, px: 1, py: 0 }} onClick={() => void openDetail(row)}>상세보기</Button>,
      },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [materials]);

  const pageActionGroups: PermissionActionGroupDefinition[] = [
    {
      key: 'read',
      actions: [{ label: '조회', icon: SearchIcon, visible: Boolean(selectedMenuPermissions?.read), disabled: loading, onClick: () => void load(date) }],
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
            type="date" size="small" margin="none" value={date} onChange={(event) => setDate(event.target.value)}
            slotProps={{ htmlInput: { 'aria-label': '생산일자' } }}
            sx={(theme) => ({ width: { xs: '100%', sm: 200 }, ...searchFieldSx(theme) })}
          />
        }
        onDefaultSearch={() => void load(date)}
      />
      <Box sx={{ p: { xs: 1.5, sm: 1 }, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Card sx={{ borderRadius: 1, border: '1px solid rgba(148,163,184,0.18)', boxShadow: 'none', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', p: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 700 }} aria-label="치환 요약">{summaryText(rows)}</Typography>
            {loaded && !loading && rows.length === 0 && (
              <Typography variant="body2" color="text.secondary">이 날짜에 생산확정된 건이 없습니다</Typography>
            )}
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            바꾸면 원래 원재료의 재고가 그만큼 되돌아오고 바꾼 원재료에서 빠집니다.
            수불대장에는 실제로 쓴 원재료로 남고, 현장 투입지시서도 바뀐 이름으로 나옵니다.
            <b> 다음 생산부터는 다시 원래 원재료로 돌아갑니다.</b>
          </Typography>
          <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
            <F1Grid
              rows={rows} columns={columns} rowKey="id" storageKey="pu-msub-grid" ariaLabel="F1-GRID 재료 치환등록"
              height="100%" maxHeight="100%" rowHeight={34} minRowHeight={34} maxRowHeight={320} columnLine showCheckbox={false}
              loading={loading} resizableRows={false} allowAddRowInContextMenu={false} allowDuplicateRowInContextMenu={false} allowDeleteRowInContextMenu={false}
            />
          </Box>
        </Card>
      </Box>
      <SubstitutionDetailDialog detail={detail} materials={materials} onClose={() => setDetail(null)} onChanged={changed} />
      <ConfirmDialog open={alertText != null} title="재료 치환등록" message={alertText ?? ''} alertOnly
        onCancel={() => setAlertText(null)} onConfirm={() => setAlertText(null)} />
    </Box>
  );
}

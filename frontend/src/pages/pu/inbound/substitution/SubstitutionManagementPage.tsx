import { useMemo } from 'react';
import { Box, Card, TextField, Typography } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { type PermissionActionGroupDefinition } from '../../../../shared/components/PermissionGroup';
import { PageSearchArea } from '../../../../shared/components/PageSearchArea';
import { ConfirmDialog } from '../../../../shared/components/ConfirmDialog';
import type { MenuPermission, ModuleItem, PageContent } from '../../../dashboard/types/dashboard';
import { SubstitutionDetailDialog } from './components/SubstitutionDetailDialog';
import { SubstitutionGrid, createSubstitutionColumns } from './components/SubstitutionGrid';
import { useSubstitutionManagement } from './hooks/useSubstitutionManagement';
import { summaryText } from './utils/materialSubstitution';

type SubstitutionManagementPageProps = {
  selectedModule: ModuleItem;
  currentMenuName: string;
  content: PageContent;
  breadcrumbItems?: string[];
  selectedMenuPermissions?: MenuPermission;
};

const cardSx = { borderRadius: 1, border: '1px solid rgba(148,163,184,0.18)', boxShadow: 'none', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', p: 1.5 };
const searchFieldSx = (theme: { palette: { mode: string } }) => ({
  height: 40,
  '& .MuiOutlinedInput-root': {
    height: '100%',
    borderRadius: '0 8px 8px 0',
    backgroundColor: theme.palette.mode === 'dark' ? 'rgba(15, 23, 42, 0.72)' : 'rgba(255,255,255,0.72)',
  },
});

// 구매관리 > 재료 치환등록 (송연 #screen-mat-sub · 39-material-substitute.js)
// '양파밀링(국내산)이 오늘 안 들어왔다' 를 가장 먼저 아는 사람이 구매 담당자라 치환은 여기서 한다.
// 하루 생산이 스무 건이면 배합표 스무 벌을 펼쳐놓을 수 없어서, 목록에서 찾고 그 건만 상세보기로 열어 바꾼다.
export function SubstitutionManagementPage({
  selectedModule,
  currentMenuName,
  content,
  breadcrumbItems,
  selectedMenuPermissions,
}: SubstitutionManagementPageProps) {
  const management = useSubstitutionManagement();
  const { openDetail, rows } = management;
  const columns = useMemo(() => createSubstitutionColumns({ onOpenDetail: (row) => void openDetail(row) }), [openDetail]);

  const pageActionGroups: PermissionActionGroupDefinition[] = [
    {
      key: 'read',
      actions: [
        {
          label: '조회',
          icon: SearchIcon,
          visible: Boolean(selectedMenuPermissions?.read),
          disabled: management.loading,
          onClick: management.search,
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
            value={management.date}
            onChange={(event) => management.setDate(event.target.value)}
            slotProps={{ htmlInput: { 'aria-label': '생산일자' } }}
            sx={(theme) => ({ width: { xs: '100%', sm: 200 }, ...searchFieldSx(theme) })}
          />
        }
        onDefaultSearch={management.search}
      />
      <Box sx={{ p: { xs: 1.5, sm: 1 }, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Card sx={cardSx}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 700 }} aria-label="치환 요약">{summaryText(rows)}</Typography>
            {management.loaded && !management.loading && rows.length === 0 && (
              <Typography variant="body2" color="text.secondary">이 날짜에 생산확정된 건이 없습니다</Typography>
            )}
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            바꾸면 원래 원재료의 재고가 그만큼 되돌아오고 바꾼 원재료에서 빠집니다.
            수불대장에는 실제로 쓴 원재료로 남고, 현장 투입지시서도 바뀐 이름으로 나옵니다.
            <b> 다음 생산부터는 다시 원래 원재료로 돌아갑니다.</b>
          </Typography>
          <SubstitutionGrid rows={rows} columns={columns} loading={management.loading} />
        </Card>
      </Box>
      <SubstitutionDetailDialog
        detail={management.detail}
        materials={management.materials}
        onClose={() => management.setDetail(null)}
        onChanged={management.changed}
      />
      <ConfirmDialog
        open={management.alertText != null}
        title="재료 치환등록"
        message={management.alertText ?? ''}
        alertOnly
        onCancel={() => management.setAlertText(null)}
        onConfirm={() => management.setAlertText(null)}
      />
    </Box>
  );
}

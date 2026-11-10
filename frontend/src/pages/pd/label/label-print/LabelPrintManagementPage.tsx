import { useMemo } from 'react';
import { Box, Card, TextField, Typography } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { type PermissionActionGroupDefinition } from '../../../../shared/components/PermissionGroup';
import { PageMessageArea } from '../../../../shared/components/PageMessageArea';
import { PageSearchArea } from '../../../../shared/components/PageSearchArea';
import { LabelPrintDialog } from '../../../../shared/components/LabelPrintDialog';
import type { MenuPermission, ModuleItem, PageContent } from '../../../dashboard/types/dashboard';
import { LabelPrintGrid, createLabelPrintColumns } from './components/LabelPrintGrid';
import { useLabelPrintManagement } from './hooks/useLabelPrintManagement';

type LabelPrintManagementPageProps = {
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

// 생산관리 > 라벨관리 > 라벨출력 (화면ID LBLabelPrintView, 송연 PD0004)
// 날짜를 고르면 그날 생산확정된 품목이 나오고, 🏷️ 인쇄는 라벨등록과 같은 라벨 창을 인쇄 전용으로 연다.
export function LabelPrintManagementPage({
  selectedModule,
  currentMenuName,
  content,
  breadcrumbItems,
  selectedMenuPermissions,
}: LabelPrintManagementPageProps) {
  const management = useLabelPrintManagement();
  const { openPrint } = management;
  const columns = useMemo(() => createLabelPrintColumns({ onPrint: openPrint }), [openPrint]);

  const pageActionGroups: PermissionActionGroupDefinition[] = [
    {
      key: 'read',
      actions: [
        {
          label: '조회',
          icon: SearchIcon,
          visible: Boolean(selectedMenuPermissions?.read),
          disabled: management.loading,
          onClick: () => void management.loadRows(),
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
            slotProps={{ htmlInput: { 'aria-label': '생산확정일' } }}
            sx={(theme) => ({ width: { xs: '100%', sm: 200 }, ...searchFieldSx(theme) })}
          />
        }
        onDefaultSearch={() => void management.loadRows()}
      />
      <PageMessageArea message={management.error} onClose={() => management.setError('')} />
      <Box sx={{ p: 1, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Card sx={cardSx}>
          {!management.loading && management.rows.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {management.searchedDate ? '이 날짜에 생산확정된 품목이 없습니다' : '생산확정일을 정하고 [조회] 를 눌러주세요'}
            </Typography>
          )}
          <LabelPrintGrid rows={management.rows} columns={columns} loading={management.loading} />
        </Card>
      </Box>
      <LabelPrintDialog target={management.printing} onClose={management.closePrint} />
    </Box>
  );
}

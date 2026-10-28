import { useMemo, useState } from 'react';
import { Box, Card, CardContent, TextField, Typography } from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import SearchIcon from '@mui/icons-material/Search';
import TvIcon from '@mui/icons-material/Tv';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { type PermissionActionGroupDefinition } from '../../../../shared/components/PermissionGroup';
import { PageMessageArea } from '../../../../shared/components/PageMessageArea';
import { PageSearchArea } from '../../../../shared/components/PageSearchArea';
import { todayDash } from '../../../../shared/utils/excelFile';
import type { MenuPermission, ModuleItem, PageContent } from '../../../dashboard/types/dashboard';
import { ScheduleSummary } from '../components/ScheduleSummary';
import { LOGISTICS_EXCEL_COLUMNS } from '../utils/schedule';
import { LogisticsScheduleGrid, createLogisticsScheduleColumns } from './components/LogisticsScheduleGrid';
import { useLogisticsScheduleManagement } from './hooks/useLogisticsScheduleManagement';

// 조회 칸 모양(제품마스터 · 거래처마스터와 같음)
const searchFieldSx = (theme: { palette: { mode: string } }) => ({
  height: 40,
  '& .MuiOutlinedInput-root': {
    height: '100%',
    borderRadius: '0 8px 8px 0',
    backgroundColor: theme.palette.mode === 'dark' ? 'rgba(15, 23, 42, 0.72)' : 'rgba(255,255,255,0.72)',
  },
});

type LogisticsScheduleManagementPageProps = {
  selectedModule: ModuleItem;
  currentMenuName: string;
  content: PageContent;
  breadcrumbItems?: string[];
  selectedMenuPermissions?: MenuPermission;
};

// 공통관리 > 스케줄관리 > 물류스케줄 (화면ID SCLogisticsScheduleView, 송연 CM0003)
// 송연: 날짜 하루치를 보기만 한다(등록 · 수정은 출하등록에서). 열면 오늘 것, 표 아래에 건수 · 총출고량
// 2026-10-28 S_ERP 품목관리와 같은 구조로 나눴다: 화면(이 파일) · 조회(hooks/useLogisticsScheduleManagement) · 그리드(components/LogisticsScheduleGrid)
export function LogisticsScheduleManagementPage({ selectedModule, currentMenuName, content, breadcrumbItems, selectedMenuPermissions }: LogisticsScheduleManagementPageProps) {
  const management = useLogisticsScheduleManagement();
  const [date, setDate] = useState(() => todayDash());
  const columns = useMemo(() => createLogisticsScheduleColumns(), []);

  const permissions = {
    read: Boolean(selectedMenuPermissions?.read),
    excel: Boolean(selectedMenuPermissions?.excel || selectedMenuPermissions?.read),
  };

  const pageActionGroups: PermissionActionGroupDefinition[] = [
    {
      key: 'read',
      actions: [
        { label: '조회', icon: SearchIcon, visible: permissions.read, disabled: management.loading, onClick: () => void management.reload(date) },
        {
          label: '엑셀 다운로드',
          icon: FileDownloadIcon,
          visible: permissions.excel,
          onClick: () => void management.exportExcel(date, LOGISTICS_EXCEL_COLUMNS, '물류스케줄'),
        },
        // 현장 TV 화면은 로그인 없이 열리는 공개 화면이라 새 창으로 띄운다(송연과 같음)
        { label: 'TV로 보기', icon: TvIcon, visible: permissions.read, onClick: () => { window.open('/tv/logistics', '_blank'); } },
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
      {/* 조회 조건: 출고일자(하루) */}
      <PageSearchArea
        searchField={
          <TextField
            type="date"
            size="small"
            margin="none"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            slotProps={{ htmlInput: { 'aria-label': '출고일자' } }}
            sx={(theme) => ({ width: { xs: '100%', sm: 200 }, ...searchFieldSx(theme) })}
          />
        }
        onDefaultSearch={() => void management.reload(date)}
      />
      <PageMessageArea message={management.error} onClose={() => management.setError('')} />
      <Box sx={{ p: { xs: 1.5, sm: 1 }, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Card sx={{ borderRadius: 1, border: '1px solid rgba(148,163,184,0.18)', boxShadow: 'none', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <CardContent sx={{ p: 2, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 1, '&:last-child': { pb: 2 } }}>
            {!management.loading && management.rows.length === 0 && (
              <Typography role="status" variant="body2" color="text.secondary" sx={{ px: 1.5, py: 1, borderRadius: 1, bgcolor: 'action.hover' }}>
                이 날짜에 등록된 물류스케줄이 없습니다
              </Typography>
            )}
            <LogisticsScheduleGrid rows={management.rows} columns={columns} loading={management.loading} />
            <ScheduleSummary rows={management.rows} countLabel="출고품목수량" totalLabel="총출고량" />
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}

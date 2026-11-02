import { useMemo } from 'react';
import { Box, Card, Checkbox, FormControlLabel, Tab, Tabs, TextField, Typography, useTheme } from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import SearchIcon from '@mui/icons-material/Search';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { type PermissionActionGroupDefinition } from '../../../../shared/components/PermissionGroup';
import { PageSearchArea } from '../../../../shared/components/PageSearchArea';
import { ConfirmDialog } from '../../../../shared/components/ConfirmDialog';
import type { MenuPermission, ModuleItem, PageContent } from '../../../dashboard/types/dashboard';
import { MaterialLotPanel } from './components/MaterialLotPanel';
import { StockStatusGrid, createStockStatusColumns } from './components/StockStatusGrid';
import { useStockStatusManagement } from './hooks/useStockStatusManagement';
import type { StockStatusKind } from './types/stockStatus.types';
import { emptyText, ssPrice } from './utils/stockStatus';

type StockStatusManagementPageProps = {
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
const sideFieldSx = (theme: { palette: { mode: string } }) => ({
  ...searchFieldSx(theme),
  '& .MuiOutlinedInput-root': { ...searchFieldSx(theme)['& .MuiOutlinedInput-root'], borderRadius: '8px' },
});

// 구매관리 > 재고현황 (송연 #screen-stock-status · 29-stock-status.js)
// 날짜를 정하면 그 날 기준 재고 · 품목을 누르면 입고 로트별 내역. 수불대장이 '앞으로 얼마를 사야 하는가' 를 보는 곳이라면
// 이 화면은 '지금 창고에 몇이 있는가' 를 본다. 창고 칸을 다 더하면 '재고' 칸과 같다(서버가 한쪽을 빼기로 구한다).
export function StockStatusManagementPage({
  selectedModule,
  currentMenuName,
  content,
  breadcrumbItems,
  selectedMenuPermissions,
}: StockStatusManagementPageProps) {
  const management = useStockStatusManagement();
  const { warehouses, openCode, toggle, openRow, loadedDate } = management;
  // 펼친 줄 색. 왼쪽에 붙인 칸 밑으로 다른 칸이 비치지 않게 불투명한 색을 쓴다
  const openTint = useTheme().palette.mode === 'dark' ? '#1e2b45' : '#edf2fd';
  const columns = useMemo(
    () => createStockStatusColumns({ warehouses, openCode, openTint, onToggle: toggle }),
    [warehouses, openCode, openTint, toggle],
  );

  const canRead = Boolean(selectedMenuPermissions?.read);
  const pageActionGroups: PermissionActionGroupDefinition[] = [
    {
      key: 'read',
      actions: [
        {
          label: '조회',
          icon: SearchIcon,
          visible: canRead,
          disabled: management.loading,
          onClick: management.search,
        },
        {
          label: '엑셀 다운로드',
          icon: FileDownloadIcon,
          visible: Boolean(selectedMenuPermissions?.excel || canRead),
          onClick: () => void management.exportExcel(),
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
      <Box sx={{ px: { xs: 1.5, sm: 2 }, borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={management.kind} onChange={(_event, value: StockStatusKind) => management.switchKind(value)} aria-label="재고현황 탭">
          <Tab value="material" label="원재료" />
          <Tab value="submaterial" label="부자재" />
        </Tabs>
      </Box>
      <PageSearchArea
        searchField={
          <TextField
            size="small"
            margin="none"
            placeholder="품목명 · 코드 검색"
            value={management.query}
            onChange={(event) => management.setQuery(event.target.value)}
            slotProps={{ htmlInput: { 'aria-label': '품목 검색' } }}
            sx={(theme) => ({ width: '100%', ...searchFieldSx(theme) })}
          />
        }
        onDefaultSearch={management.search}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>기준일</Typography>
          <TextField
            type="date"
            size="small"
            margin="none"
            value={management.date}
            onChange={(event) => management.setDate(event.target.value)}
            slotProps={{ htmlInput: { 'aria-label': '기준일', max: '9999-12-31' } }}
            sx={(theme) => ({ width: 170, ...sideFieldSx(theme) })}
          />
        </Box>
        <FormControlLabel
          control={<Checkbox size="small" checked={management.nonzero} onChange={(event) => management.setNonzero(event.target.checked)} />}
          label="재고 0 제외"
          sx={{ mr: 0, '& .MuiFormControlLabel-label': { fontSize: 13, whiteSpace: 'nowrap' } }}
        />
      </PageSearchArea>
      <Box sx={{ p: { xs: 1.5, sm: 1 }, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Card sx={cardSx}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', mb: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
              기준일이 오늘이면 <b>지금 남아있는 양</b>입니다. 현장에서 바코드를 찍어 계량실로 옮기면 창고칸이 바로 갈립니다.
              <b> 로트별로 얼마가 남았는지는 아직 나오지 않습니다</b> — 생산에 투입할 때 어느 입고분을 썼는지를
              아직 받지 않기 때문입니다. 현장 스캔을 붙이면 그때 나옵니다.
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, whiteSpace: 'nowrap' }}>
              <Typography variant="body2" color="text.secondary">재고금액 합계</Typography>
              <Typography sx={{ fontWeight: 700, fontSize: 15 }} aria-label="재고금액 합계">{loadedDate ? `${ssPrice(management.total)}원` : '-'}</Typography>
            </Box>
          </Box>
          {loadedDate && !management.loading && management.gridRows.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{emptyText(management.kind)}</Typography>
          )}
          <StockStatusGrid rows={management.gridRows} columns={columns} loading={management.loading} warehouses={warehouses} />
          {openRow && loadedDate && (
            <MaterialLotPanel code={openRow.code} name={openRow.name || ''} date={loadedDate} onClose={() => management.setOpenCode(null)} />
          )}
        </Card>
      </Box>
      <ConfirmDialog
        open={management.alertText != null}
        title="재고현황"
        message={management.alertText ?? ''}
        alertOnly
        onCancel={() => management.setAlertText(null)}
        onConfirm={() => management.setAlertText(null)}
      />
    </Box>
  );
}

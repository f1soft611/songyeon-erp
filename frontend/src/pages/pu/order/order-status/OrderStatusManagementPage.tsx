import { useMemo } from 'react';
import { Box, Card, MenuItem, TextField, Typography } from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import SearchIcon from '@mui/icons-material/Search';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { type PermissionActionGroupDefinition } from '../../../../shared/components/PermissionGroup';
import { PageSearchArea } from '../../../../shared/components/PageSearchArea';
import { ConfirmDialog } from '../../../../shared/components/ConfirmDialog';
import type { MenuPermission, ModuleItem, PageContent } from '../../../dashboard/types/dashboard';
import { OrderStatusGrid, createOrderStatusColumns } from './components/OrderStatusGrid';
import { useOrderStatusManagement } from './hooks/useOrderStatusManagement';
import type { StatusFilter } from './types/orderStatus.types';

type OrderStatusManagementPageProps = {
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

// 구매관리 > 발주관리 > 발주현황 (화면ID POOrderStatusView, 송연 38-po-status.js)
// 기간 안에 낸 발주를 한 줄씩 보고, 미입고를 찾는다. 2026-11-02 발주관리 탭에서 따로 화면으로 뺐다.
export function OrderStatusManagementPage({
  selectedModule,
  currentMenuName,
  content,
  breadcrumbItems,
  selectedMenuPermissions,
}: OrderStatusManagementPageProps) {
  const management = useOrderStatusManagement();
  const { query, changeQuery, orders, counts } = management;
  const columns = useMemo(() => createOrderStatusColumns(), []);

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
        {
          label: '엑셀 다운로드',
          icon: FileDownloadIcon,
          visible: Boolean(selectedMenuPermissions?.excel || selectedMenuPermissions?.read),
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
      <PageSearchArea
        searchField={
          <TextField
            size="small"
            margin="none"
            placeholder="원재료명 검색"
            value={query.materialQ}
            onChange={(event) => changeQuery('materialQ', event.target.value)}
            slotProps={{ htmlInput: { 'aria-label': '원재료명 검색' } }}
            sx={(theme) => ({ width: '100%', ...searchFieldSx(theme) })}
          />
        }
        onDefaultSearch={() => void management.loadRows()}
      >
        <TextField
          size="small"
          margin="none"
          placeholder="거래처명 검색"
          value={query.clientQ}
          onChange={(event) => changeQuery('clientQ', event.target.value)}
          slotProps={{ htmlInput: { 'aria-label': '거래처명 검색' } }}
          sx={(theme) => ({ width: { xs: '100%', sm: 180 }, ...sideFieldSx(theme) })}
        />
        <TextField
          select
          size="small"
          margin="none"
          value={query.received}
          onChange={(event) => management.changeReceived(event.target.value as StatusFilter)}
          slotProps={{ htmlInput: { 'aria-label': '입고여부' }, select: { displayEmpty: true } }}
          sx={(theme) => ({ width: { xs: '100%', sm: 140 }, ...sideFieldSx(theme) })}
        >
          <MenuItem value="">전부</MenuItem>
          <MenuItem value="0">미입고만</MenuItem>
          <MenuItem value="1">입고완료만</MenuItem>
        </TextField>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TextField
            type="date"
            size="small"
            margin="none"
            value={query.start}
            onChange={(event) => changeQuery('start', event.target.value)}
            slotProps={{ htmlInput: { 'aria-label': '시작일' } }}
            sx={(theme) => ({ width: 170, ...sideFieldSx(theme) })}
          />
          <Typography variant="body2" color="text.secondary">~</Typography>
          <TextField
            type="date"
            size="small"
            margin="none"
            value={query.end}
            onChange={(event) => changeQuery('end', event.target.value)}
            slotProps={{ htmlInput: { 'aria-label': '종료일' } }}
            sx={(theme) => ({ width: 170, ...sideFieldSx(theme) })}
          />
        </Box>
      </PageSearchArea>
      <Box sx={{ p: { xs: 1.5, sm: 1 }, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Card sx={cardSx}>
          <Box aria-label="발주현황 요약" sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, alignItems: 'center', mb: 0.5, fontSize: 14 }}>
            <span>건수 <b>{orders ? counts.count : '-'}</b></span>
            <span>거래처 <b>{orders ? counts.clients : '-'}</b></span>
            <span>미입고 <b>{orders ? counts.pending : '-'}</b></span>
            <span>입고완료 <b>{orders ? counts.done : '-'}</b></span>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1 }}>
            발주에는 단가를 적지 않아서 금액칸이 없습니다. 수량은 품목마다 단위가 달라 더하지 않습니다. 표 머리 메뉴로 정렬할 수 있어요.
          </Typography>
          {orders && !management.loading && orders.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>이 기간에 낸 발주가 없습니다</Typography>
          )}
          <OrderStatusGrid
            rows={management.rows}
            columns={columns}
            loading={management.loading}
            onDeleteBlocked={() => management.setAlertText('발주현황은 보기만 하는 화면이라 줄을 지울 수 없어요')}
          />
          {orders && orders.length > 0 && (
            <Box aria-label="발주현황 합계" sx={{ mt: 1, px: 1.5, py: 1, display: 'flex', gap: 3, bgcolor: 'action.hover', borderRadius: 1, fontWeight: 800, fontSize: 14 }}>
              {/* 수량은 더하지 않는다. kg 과 박스와 롤을 한 숫자로 더하면 거짓말이 된다 */}
              <span>합계 ({counts.count}건)</span>
              <span>미입고 {counts.pending}건</span>
            </Box>
          )}
        </Card>
      </Box>
      <ConfirmDialog
        open={management.alertText != null}
        title="발주현황"
        message={management.alertText ?? ''}
        alertOnly
        onCancel={() => management.setAlertText(null)}
        onConfirm={() => management.setAlertText(null)}
      />
    </Box>
  );
}

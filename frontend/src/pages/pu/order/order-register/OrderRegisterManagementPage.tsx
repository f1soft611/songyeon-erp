import { useMemo } from 'react';
import { Box, Card, Checkbox, FormControlLabel, TextField, Typography } from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import NoteAddIcon from '@mui/icons-material/NoteAdd';
import SearchIcon from '@mui/icons-material/Search';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { type PermissionActionGroupDefinition } from '../../../../shared/components/PermissionGroup';
import { PageMessageArea } from '../../../../shared/components/PageMessageArea';
import { PageSearchArea } from '../../../../shared/components/PageSearchArea';
import { ConfirmDialog } from '../../../../shared/components/ConfirmDialog';
import type { MenuPermission, ModuleItem, PageContent } from '../../../dashboard/types/dashboard';
import { OrderHistoryTree, createOrderHistoryColumns } from './components/OrderHistoryTree';
import { PurchaseOrderDialog } from './components/PurchaseOrderDialog';
import { useOrderRegisterManagement } from './hooks/useOrderRegisterManagement';

type OrderRegisterManagementPageProps = {
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

// 구매관리 > 발주관리 > 발주등록 (화면ID POOrderRegisterView, 송연 #screen-po · 19-purchase.js)
// 발주일별 발주내역을 거래처로 묶어 보고, 발주 등록 창으로 넣는다. 2026-11-02 발주현황을 탭에서 따로 화면으로 뺐다.
export function OrderRegisterManagementPage({
  selectedModule,
  currentMenuName,
  content,
  breadcrumbItems,
  selectedMenuPermissions,
}: OrderRegisterManagementPageProps) {
  const management = useOrderRegisterManagement();
  const { setCancelling, orders } = management;
  const columns = useMemo(() => createOrderHistoryColumns({ onCancel: setCancelling }), [setCancelling]);

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
        {
          label: '엑셀 다운로드',
          icon: FileDownloadIcon,
          visible: Boolean(selectedMenuPermissions?.excel || selectedMenuPermissions?.read),
          onClick: () => void management.exportExcel(),
        },
      ],
    },
    {
      key: 'write',
      actions: [
        {
          label: '발주 등록',
          icon: NoteAddIcon,
          visible: Boolean(selectedMenuPermissions?.create),
          onClick: () => management.setRegisterOpen(true),
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
            placeholder="거래처 검색"
            value={management.client}
            onChange={(event) => management.setClient(event.target.value)}
            slotProps={{ htmlInput: { 'aria-label': '거래처 검색' } }}
            sx={(theme) => ({ width: '100%', ...searchFieldSx(theme) })}
          />
        }
        onDefaultSearch={management.search}
      >
        <TextField
          type="date"
          size="small"
          margin="none"
          value={management.date}
          onChange={(event) => management.setDate(event.target.value)}
          title="비우면 전체 발주일"
          slotProps={{ htmlInput: { 'aria-label': '발주일' } }}
          sx={(theme) => ({ width: 180, ...sideFieldSx(theme) })}
        />
      </PageSearchArea>
      <PageMessageArea message={management.notice} severity="success" onClose={() => management.setNotice('')} />
      <Box sx={{ p: { xs: 1.5, sm: 1 }, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Card sx={cardSx}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 700 }}>발주내역</Typography>
            {management.loaded && !management.loading && orders.length === 0 && (
              <Typography variant="body2" color="text.secondary">발주내역이 없습니다</Typography>
            )}
            <FormControlLabel
              sx={{ ml: 'auto', mr: 0 }}
              control={<Checkbox size="small" checked={management.expandAll} disabled={orders.length === 0} onChange={(event) => management.toggleExpandAll(event.target.checked)} />}
              label={<Typography variant="body2">모두 펼쳐보기</Typography>}
            />
          </Box>
          <OrderHistoryTree
            rows={management.rows}
            columns={columns}
            loading={management.loading}
            gridKey={management.treeVersion}
            treeRef={management.treeRef}
            defaultExpanded={management.openGroups}
            onDeleteBlocked={() => management.setAlertText('발주는 품목 줄의 [취소]로 지워주세요')}
          />
        </Card>
      </Box>
      <PurchaseOrderDialog
        open={management.registerOpen}
        onClose={() => management.setRegisterOpen(false)}
        onRegistered={management.afterRegistered}
      />
      <ConfirmDialog
        open={management.alertText != null}
        title="발주등록"
        message={management.alertText ?? ''}
        alertOnly
        onCancel={() => management.setAlertText(null)}
        onConfirm={() => management.setAlertText(null)}
      />
      <ConfirmDialog
        open={Boolean(management.cancelling)}
        title="발주 취소"
        message="이 발주내역을 취소할까요?"
        confirmLabel="취소하기"
        danger
        onCancel={() => management.setCancelling(null)}
        onConfirm={() => void management.cancel()}
      />
    </Box>
  );
}

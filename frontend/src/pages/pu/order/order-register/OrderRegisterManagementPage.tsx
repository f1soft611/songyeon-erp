import { useEffect, useMemo, useState } from 'react';
import { Box, Card, Checkbox, FormControlLabel, TextField, Typography } from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import NoteAddIcon from '@mui/icons-material/NoteAdd';
import SearchIcon from '@mui/icons-material/Search';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { type PermissionActionGroupDefinition } from '../../../../shared/components/PermissionGroup';
import { PageMessageArea } from '../../../../shared/components/PageMessageArea';
import { PageSearchArea } from '../../../../shared/components/PageSearchArea';
import type { PageSearchField, PageSearchFieldValue } from '../../../../shared/components/page-search/searchFields';
import { ConfirmDialog } from '../../../../shared/components/ConfirmDialog';
import type { MenuPermission, ModuleItem, PageContent } from '../../../dashboard/types/dashboard';
import { OrderRegisterGrid, createOrderRegisterColumns } from './components/OrderRegisterGrid';
import { OrderRegisterDialog } from './components/OrderRegisterDialog';
import { useOrderRegisterManagement, type OrderPeriod } from './hooks/useOrderRegisterManagement';

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
// 2026-11-03 상세 조회(⌄)에는 발주일 기간만 나온다
const DETAIL_FIELDS: PageSearchField[] = [{ field: 'orderDate', label: '발주일', type: 'date', searchSpan: 2 }];
const toPeriod = (value: PageSearchFieldValue | undefined): OrderPeriod =>
  value && typeof value === 'object' ? { from: value.from ?? '', to: value.to ?? '' } : { from: '', to: '' };

// 구매관리 > 발주관리 > 발주등록 (화면ID POOrderRegisterView, 송연 #screen-po · 19-purchase.js)
// 발주일별 발주내역을 거래처로 묶어 보고, 발주 등록 창으로 넣는다. 2026-11-02 발주현황을 탭에서 따로 화면으로 뺐다.
// 2026-11-03 검색줄은 거래처코드/명, 발주일은 상세 조회(⌄) 기간.
export function OrderRegisterManagementPage({
  selectedModule,
  currentMenuName,
  content,
  breadcrumbItems,
  selectedMenuPermissions,
}: OrderRegisterManagementPageProps) {
  const management = useOrderRegisterManagement();
  const { setCancelling, orders, period } = management;
  const columns = useMemo(() => createOrderRegisterColumns({ onCancel: setCancelling }), [setCancelling]);
  // 상세 조회(⌄) 발주일: 고치는 중인 값(detailValues)과 [조회]로 적용한 값(조건 칩). 등록 뒤 옮긴 발주일도 칩으로 보인다
  const appliedDetailValues = useMemo<Record<string, PageSearchFieldValue>>(() => ({ orderDate: period }), [period]);
  const [detailValues, setDetailValues] = useState<Record<string, PageSearchFieldValue>>(appliedDetailValues);
  useEffect(() => setDetailValues(appliedDetailValues), [appliedDetailValues]);

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
            placeholder="거래처코드/명 검색"
            value={management.client}
            onChange={(event) => management.setClient(event.target.value)}
            slotProps={{ htmlInput: { 'aria-label': '거래처코드/명 검색' } }}
            sx={(theme) => ({ width: '100%', ...searchFieldSx(theme) })}
          />
        }
        onDefaultSearch={management.search}
        detailFields={DETAIL_FIELDS}
        detailValues={detailValues}
        appliedDetailValues={appliedDetailValues}
        onDetailValuesChange={setDetailValues}
        onDetailSearch={(values) => management.applyPeriod(toPeriod(values.orderDate))}
        detailLoading={management.loading}
      />
      <PageMessageArea message={management.notice} severity="success" onClose={() => management.setNotice('')} />
      <Box sx={{ p: 1, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Card sx={cardSx}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
            <FormControlLabel
              sx={{ ml: 'auto', mr: 0 }}
              control={<Checkbox size="small" checked={management.expandAll} disabled={orders.length === 0} onChange={(event) => management.toggleExpandAll(event.target.checked)} />}
              label={<Typography variant="body2">모두 펼쳐보기</Typography>}
            />
          </Box>
          <OrderRegisterGrid
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
      <OrderRegisterDialog
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

import { useEffect, useMemo, useState } from 'react';
import { Box, Card, TextField } from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import SearchIcon from '@mui/icons-material/Search';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { type PermissionActionGroupDefinition } from '../../../../shared/components/PermissionGroup';
import { PageSearchArea } from '../../../../shared/components/PageSearchArea';
import { SearchResultMessage } from '../../../../shared/components/SearchResultMessage';
import type { PageSearchField, PageSearchFieldValue } from '../../../../shared/components/page-search/searchFields';
import { ConfirmDialog } from '../../../../shared/components/ConfirmDialog';
import type { MenuPermission, ModuleItem, PageContent } from '../../../dashboard/types/dashboard';
import { OrderStatusGrid, createOrderStatusColumns } from './components/OrderStatusGrid';
import { useOrderStatusManagement } from './hooks/useOrderStatusManagement';
import { statusDetailValues } from './utils/orderStatus';

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
// 2026-11-03 검색줄은 원재료코드/명, 나머지는 상세 조회(⌄). 발주일은 필수(이번 달 1일 ~ 오늘로 시작)
const DETAIL_FIELDS: PageSearchField[] = [
  { field: 'orderDate', label: '발주일', type: 'date', searchSpan: 2, required: true },
  { field: 'clientQ', label: '거래처코드/명', type: 'text', searchSpan: 1 },
  {
    field: 'received',
    label: '입고여부',
    type: 'select',
    searchSpan: 1,
    options: [
      { value: '0', label: '미입고' },
      { value: '1', label: '입고완료' },
    ],
  },
];

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
  // 상세 조회(⌄): 고치는 중인 값(detailValues)과 [조회]로 적용한 값(조건 칩)
  const { start, end, clientQ, received } = query;
  const appliedDetailValues = useMemo<Record<string, PageSearchFieldValue>>(
    () => statusDetailValues({ start, end, clientQ, received, materialQ: '' }),
    [start, end, clientQ, received],
  );
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
            placeholder="원재료코드/명 검색"
            value={query.materialQ}
            onChange={(event) => changeQuery('materialQ', event.target.value)}
            slotProps={{ htmlInput: { 'aria-label': '원재료코드/명 검색' } }}
            sx={(theme) => ({ width: '100%', ...searchFieldSx(theme) })}
          />
        }
        onDefaultSearch={() => void management.loadRows()}
        detailFields={DETAIL_FIELDS}
        detailValues={detailValues}
        appliedDetailValues={appliedDetailValues}
        onDetailValuesChange={setDetailValues}
        onDetailSearch={management.applyDetail}
        detailLoading={management.loading}
      />
      {/* 2026-11-04 S_ERP 현황 표준(SearchResultMessage): 조회가 끝나면 '조회 결과 총 N건입니다.' · 0건 안내, X 로 닫고 다시 조회하면 다시 보인다 */}
      {orders && !management.loading && <SearchResultMessage resultCount={orders.length} />}
      <Box sx={{ p: 1, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Card sx={cardSx}>
          <Box aria-label="발주현황 요약" sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, alignItems: 'center', mb: 0.5, fontSize: 14 }}>
            <span>건수 <b>{orders ? counts.count : '-'}</b></span>
            <span>거래처 <b>{orders ? counts.clients : '-'}</b></span>
            <span>미입고 <b>{orders ? counts.pending : '-'}</b></span>
            <span>입고완료 <b>{orders ? counts.done : '-'}</b></span>
          </Box>
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

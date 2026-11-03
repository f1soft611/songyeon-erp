import { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Card, TextField, Typography } from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import SearchIcon from '@mui/icons-material/Search';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { type PermissionActionGroupDefinition } from '../../../../shared/components/PermissionGroup';
import { PageSearchArea } from '../../../../shared/components/PageSearchArea';
import type { PageSearchField, PageSearchFieldValue } from '../../../../shared/components/page-search/searchFields';
import { ConfirmDialog } from '../../../../shared/components/ConfirmDialog';
import type { MenuPermission, ModuleItem, PageContent } from '../../../dashboard/types/dashboard';
import { formatMoney, inStatusDetailValues } from '../receiving-register/utils/receiving';
import { ReceivingStatusGrid, createReceivingStatusColumns } from './components/ReceivingStatusGrid';
import { useReceivingStatus } from './hooks/useReceivingStatus';

type ReceivingStatusManagementPageProps = {
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
const cardSx = { borderRadius: 1, border: '1px solid rgba(148,163,184,0.18)', boxShadow: 'none', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', p: 1.5 };

// 상세 조회(⌄): 입고일(필수, 이번 달 1일 ~ 오늘로 시작) · 거래처코드/명 · 구분
const DETAIL_FIELDS: PageSearchField[] = [
  { field: 'receiveDate', label: '입고일', type: 'date', searchSpan: 2, required: true },
  { field: 'clientQ', label: '거래처코드/명', type: 'text', searchSpan: 1 },
  {
    field: 'kind',
    label: '구분',
    type: 'select',
    searchSpan: 1,
    options: [
      { value: 'receiving', label: '입고' },
      { value: 'return', label: '반품' },
    ],
  },
];

// 구매관리 > 입고관리 > 입고현황 (화면ID IBReceivingStatusView, 송연 37-recv-status.js)
// 기간 안에 들어온 것을 한 줄씩(반품 포함) 보고, 같은 날 같은 거래처 덩어리마다 소계를 낸다.
// 2026-11-03 입고관리 탭에서 화면으로 나눴다. 검색줄은 원재료코드/명, 나머지는 상세 조회.
export function ReceivingStatusManagementPage({
  selectedModule,
  currentMenuName,
  content,
  breadcrumbItems,
  selectedMenuPermissions,
}: ReceivingStatusManagementPageProps) {
  const [alertText, setAlertText] = useState<string | null>(null);
  const status = useReceivingStatus(setAlertText);
  const columns = useMemo(() => createReceivingStatusColumns(), []);
  // 상세 조회(⌄): 고치는 중인 값(detailValues)과 [조회]로 적용한 값(조건 칩)
  const { start, end, clientQ, kind } = status.query;
  const appliedDetailValues = useMemo<Record<string, PageSearchFieldValue>>(
    () => inStatusDetailValues({ start, end, clientQ, kind, materialQ: '' }),
    [start, end, clientQ, kind],
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
          disabled: status.loading,
          onClick: () => void status.load(),
        },
        {
          label: '엑셀 다운로드',
          icon: FileDownloadIcon,
          visible: Boolean(selectedMenuPermissions?.excel || selectedMenuPermissions?.read),
          onClick: () => void status.exportExcel(),
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
            value={status.query.materialQ}
            onChange={(event) => status.changeMaterial(event.target.value)}
            slotProps={{ htmlInput: { 'aria-label': '원재료코드/명 검색' } }}
            sx={(theme) => ({ width: '100%', ...searchFieldSx(theme) })}
          />
        }
        onDefaultSearch={() => void status.load()}
        detailFields={DETAIL_FIELDS}
        detailValues={detailValues}
        appliedDetailValues={appliedDetailValues}
        onDetailValuesChange={setDetailValues}
        onDetailSearch={status.applyDetail}
        detailLoading={status.loading}
      />
      <Box sx={{ p: { xs: 1.5, sm: 1 }, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Card sx={cardSx}>
          {status.noPrice > 0 && (
            <Alert severity="warning" sx={{ mb: 1, py: 0 }}>
              단가가 없어 금액이 비어 있는 줄이 {status.noPrice}건 있어요. 아래 소계·합계에는 그만큼 빠져 있습니다.
            </Alert>
          )}
          {status.records && !status.loading && status.records.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>이 기간에 들어온 것이 없습니다</Typography>
          )}
          <ReceivingStatusGrid rows={status.rows} columns={columns} loading={status.loading} />
          {/* 합계줄. 수량은 품목마다 단위가 달라 더하지 않는다 */}
          <Box aria-label="입고현황 합계" sx={{
            display: 'flex', flexWrap: 'wrap', gap: 3, alignItems: 'center', justifyContent: 'flex-end', mt: 1, px: 1.5, py: 1,
            borderRadius: 1, bgcolor: 'action.hover', fontSize: 14, fontWeight: 700,
          }}>
            <span style={{ marginRight: 'auto' }}>합계 ({status.records?.length ?? 0}건)</span>
            <span>공급가액 {formatMoney(status.supplyAmount)}</span>
            <span>부가세 {formatMoney(status.vatAmount)}</span>
            <span>합계금액 {formatMoney(status.totalAmount)}</span>
          </Box>
        </Card>
      </Box>
      <ConfirmDialog
        open={alertText != null}
        title="입고현황"
        message={alertText ?? ''}
        alertOnly
        onCancel={() => setAlertText(null)}
        onConfirm={() => setAlertText(null)}
      />
    </Box>
  );
}

import { useMemo, useState } from 'react';
import { Box, Card, TextField, Typography } from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import SearchIcon from '@mui/icons-material/Search';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { type PermissionActionGroupDefinition } from '../../../../shared/components/PermissionGroup';
import { PageMessageArea } from '../../../../shared/components/PageMessageArea';
import { PageSearchArea } from '../../../../shared/components/PageSearchArea';
import { toPageSearchFields, type PageSearchFieldValue } from '../../../../shared/components/page-search/searchFields';
import { ConfirmDialog } from '../../../../shared/components/ConfirmDialog';
import type { MenuPermission, ModuleItem, PageContent } from '../../../dashboard/types/dashboard';
import { ProdStatusGrid, createProdStatusColumns } from './components/ProdStatusGrid';
import { useProdStatusManagement } from './hooks/useProdStatusManagement';

const textOf = (value: PageSearchFieldValue | undefined) => (typeof value === 'string' ? value : '');

type ProdStatusManagementPageProps = {
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

// 생산관리 > 생산실적 > 생산현황 (화면ID PRProdStatusView, 송연 PD0003)
// 생산입고(실생산량이 적힌) 기록을 기간으로 보고, 상세 조회(⌄)로 거래처 · 품목코드/명을 더한다. 조회만 하는 화면이다.
export function ProdStatusManagementPage({
  selectedModule,
  currentMenuName,
  content,
  breadcrumbItems,
  selectedMenuPermissions,
}: ProdStatusManagementPageProps) {
  const management = useProdStatusManagement();
  const { query, changeQuery } = management;
  const columns = useMemo(() => createProdStatusColumns(), []);
  const detailFields = useMemo(() => toPageSearchFields(columns), [columns]);
  // 상세 조회(⌄) 거래처 · 품목코드/명: 고치는 중인 값(detailValues)과 [조회]로 적용한 값(appliedDetailValues, 조건 칩)
  const [detailValues, setDetailValues] = useState<Record<string, PageSearchFieldValue>>({});
  const [appliedDetailValues, setAppliedDetailValues] = useState<Record<string, PageSearchFieldValue>>({});

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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TextField
              type="date"
              size="small"
              margin="none"
              value={query.start}
              onChange={(event) => changeQuery('start', event.target.value)}
              slotProps={{ htmlInput: { 'aria-label': '시작일' } }}
              sx={(theme) => ({ width: 170, ...searchFieldSx(theme) })}
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
        }
        onDefaultSearch={() => void management.loadRows()}
        detailFields={detailFields}
        detailValues={detailValues}
        appliedDetailValues={appliedDetailValues}
        onDetailValuesChange={setDetailValues}
        onDetailSearch={(values) => {
          setAppliedDetailValues(values);
          management.applyDetailFilter({ clientName: textOf(values.clientName), product: textOf(values.productName) });
        }}
        detailLoading={management.loading}
      />
      <PageMessageArea message={management.error} onClose={() => management.setError('')} />
      <Box sx={{ p: { xs: 1.5, sm: 1 }, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Card sx={cardSx}>
          {!management.loading && management.rows.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {management.searched ? '조회된 생산 실적이 없습니다' : '기간을 정하고 [조회] 를 눌러주세요'}
            </Typography>
          )}
          <ProdStatusGrid rows={management.rows} columns={columns} loading={management.loading} />
        </Card>
      </Box>
      <ConfirmDialog
        open={management.alertText != null}
        title="생산현황"
        message={management.alertText ?? ''}
        alertOnly
        onCancel={() => management.setAlertText(null)}
        onConfirm={() => management.setAlertText(null)}
      />
    </Box>
  );
}

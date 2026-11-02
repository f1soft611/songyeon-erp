import { useMemo, useState } from 'react';
import { Alert, Box, Card, TextField, Typography } from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import SearchIcon from '@mui/icons-material/Search';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { type PermissionActionGroupDefinition } from '../../../../shared/components/PermissionGroup';
import { PageSearchArea } from '../../../../shared/components/PageSearchArea';
import { toPageSearchFields, type PageSearchFieldValue } from '../../../../shared/components/page-search/searchFields';
import { ConfirmDialog } from '../../../../shared/components/ConfirmDialog';
import type { MenuPermission, ModuleItem, PageContent } from '../../../dashboard/types/dashboard';
import { formatMoney, formatQty } from '../../entry/sales-register/utils/salesRegister';
import { defaultSalesDetailValues, toSalesQuery } from '../sales-status/utils/salesStatus';
import { SalesTotalGrid, createSalesTotalColumns } from './components/SalesTotalGrid';
import { useSalesTotalManagement } from './hooks/useSalesTotalManagement';
import type { DirectionFilter } from './utils/salesTotal';

type SalesTotalManagementPageProps = {
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
const tileSx = { flex: '1 1 180px', border: '1px solid', borderColor: 'divider', borderRadius: 1, px: 2, py: 1.25, bgcolor: 'background.paper' };

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={tileSx}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography aria-label={label} sx={{ fontSize: 20, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{value}</Typography>
    </Box>
  );
}

const toDirection = (value: PageSearchFieldValue | undefined): DirectionFilter =>
  (value === 'in' || value === 'out' ? value : '');

// 판매관리 > 판매조회 > 토탈집계 (화면ID INSalesTotalView, 송연 #screen-sales-total · 36-sales.js renderSalesTotal)
// 들어온 것(생산입고)과 나간 것(판매)을 한 표에 다 펴놓고 합계를 본다. 표 머리 메뉴로 정렬한다.
// 2026-11-02 표준에 맞췄다: 화면(이 파일) · 조회(hooks) · 그리드(components), 품목 · 일자 · 구분은 상세 조회(⌄).
export function SalesTotalManagementPage({
  selectedModule,
  currentMenuName,
  content,
  breadcrumbItems,
  selectedMenuPermissions,
}: SalesTotalManagementPageProps) {
  const [defaults] = useState(defaultSalesDetailValues);
  const management = useSalesTotalManagement(toSalesQuery(defaults, ''));
  const { loaded, shown, visible } = management;
  const [client, setClient] = useState('');
  const [detailValues, setDetailValues] = useState<Record<string, PageSearchFieldValue>>(defaults);
  const [appliedDetailValues, setAppliedDetailValues] = useState<Record<string, PageSearchFieldValue>>(defaults);

  const columns = useMemo(() => createSalesTotalColumns(), []);
  const detailFields = useMemo(() => toPageSearchFields(columns), [columns]);

  const reload = (values = appliedDetailValues) => {
    setAppliedDetailValues(values);
    management.setDirection(toDirection(values.direction));
    void management.loadRows(toSalesQuery(values, client));
  };

  const pageActionGroups: PermissionActionGroupDefinition[] = [
    {
      key: 'read',
      actions: [
        {
          label: '조회',
          icon: SearchIcon,
          visible: Boolean(selectedMenuPermissions?.read),
          disabled: management.loading,
          onClick: () => reload()
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
            placeholder="거래처코드/거래처명 검색"
            autoComplete="off"
            value={client}
            onChange={(event) => setClient(event.target.value)}
            slotProps={{ htmlInput: { 'aria-label': '거래처코드/거래처명 검색' } }}
            sx={(theme) => ({ width: '100%', ...searchFieldSx(theme) })}
          />
        }
        onDefaultSearch={() => reload()}
        detailFields={detailFields}
        detailValues={detailValues}
        appliedDetailValues={appliedDetailValues}
        defaultValues={defaults}
        onDetailValuesChange={setDetailValues}
        onDetailSearch={reload}
        detailLoading={management.loading}
      />
      <Box sx={{ p: { xs: 1.5, sm: 1 }, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          <StatTile label="건수" value={loaded ? String(shown.count) : '-'} />
          <StatTile label="입고 수량" value={loaded ? formatQty(shown.inQty) : '-'} />
          <StatTile label="출고 수량" value={loaded ? formatQty(shown.outQty) : '-'} />
          <StatTile label="금액 합계 (출고)" value={loaded ? formatMoney(shown.amount) : '-'} />
        </Box>
        {management.warning && <Alert severity="error" sx={{ py: 0 }}>{management.warning}</Alert>}
        <Card sx={cardSx}>
          <SalesTotalGrid
            rows={visible}
            columns={columns}
            loading={management.loading}
            onDeleteBlocked={() => management.setAlertText('토탈집계는 보기만 하는 화면이라 줄을 지울 수 없어요')}
          />
          {/* 송연 표 맨 밑 합계 줄 */}
          {visible.length > 0 && (
            <Box
              aria-label="토탈집계 합계"
              sx={{ mt: 1, px: 1.5, py: 1, display: 'flex', flexWrap: 'wrap', gap: 3, alignItems: 'center', bgcolor: 'action.hover', borderRadius: 1, fontWeight: 800, fontSize: 14 }}
            >
              <span>합계 ({shown.count}건)</span>
              <span>입고 {formatQty(shown.inQty)}</span>
              <span>출고 {formatQty(shown.outQty)}</span>
              <span style={{ marginLeft: 'auto' }}>금액 {formatMoney(shown.amount)}</span>
            </Box>
          )}
        </Card>
      </Box>
      <ConfirmDialog
        open={management.alertText != null}
        title="토탈집계"
        message={management.alertText ?? ''}
        alertOnly
        onCancel={() => management.setAlertText(null)}
        onConfirm={() => management.setAlertText(null)}
      />
    </Box>
  );
}

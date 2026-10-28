import { useMemo, useState } from 'react';
import { Box, Card, CardContent, TextField } from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import SearchIcon from '@mui/icons-material/Search';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { type PermissionActionGroupDefinition } from '../../../../shared/components/PermissionGroup';
import { PageMessageArea } from '../../../../shared/components/PageMessageArea';
import { PageSearchArea } from '../../../../shared/components/PageSearchArea';
import { toPageSearchFields, type PageSearchField, type PageSearchFieldValue } from '../../../../shared/components/page-search/searchFields';
import { downloadExcel, todayDash } from '../../../../shared/utils/excelFile';
import type { MenuPermission, ModuleItem, PageContent } from '../../../dashboard/types/dashboard';
import { PricingDetailDialog } from './components/PricingDetailDialog';
import { PricingGrid, createPricingColumns } from './components/PricingGrid';
import { usePricingManagement } from './hooks/usePricingManagement';
import { DIFF_OPTIONS, filterPricingRows, PRICING_EXCEL_COLUMNS, type DiffOption } from './utils/pricing';

const errorText = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

// 조회 칸 모양(제품마스터 · 거래처마스터와 같음)
const searchFieldSx = (theme: { palette: { mode: string } }) => ({
  height: 40,
  '& .MuiOutlinedInput-root': {
    height: '100%',
    borderRadius: '0 8px 8px 0',
    backgroundColor: theme.palette.mode === 'dark' ? 'rgba(15, 23, 42, 0.72)' : 'rgba(255,255,255,0.72)',
  },
});

// 상세 조회(⌄): 거래처(열의 search 설정) + 차액금 조건. 차액금 조건은 칸 값이 아니라 초과/미달 거르기와 정렬이라 따로 더한다
// (원재료마스터의 '안 쓴 기간'과 같은 방식). '전체'는 상세 조회가 붙인다
const DIFF_FIELD: PageSearchField = {
  field: 'diffOption',
  label: '차액금',
  type: 'select',
  searchSpan: 1,
  options: DIFF_OPTIONS.filter((option) => option.value !== ''),
};
const textOf = (value: PageSearchFieldValue | undefined) => (typeof value === 'string' ? value : '');

type PricingManagementPageProps = {
  selectedModule: ModuleItem;
  currentMenuName: string;
  content: PageContent;
  breadcrumbItems?: string[];
  selectedMenuPermissions?: MenuPermission;
};

// 영업관리 > 제품관리 > 단가관리 (화면ID PMPricingView, 송연 SA0002)
// 제품마다 원재료비 + 인건비 · 포장비 · 물류비 · 마진 등 원가 항목으로 제품단가를 계산하고, 실제 판매단가(현재단가)와의 차액을 본다.
// 원가 항목은 [상세] 칸 연필 → 단가상세 창에서 고친다.
// 2026-10-28 S_ERP 구조로 나눴다: 화면(이 파일) · 조회/저장(hooks/usePricingManagement) · 그리드(components/PricingGrid) · 타입(types).
// 거래처 · 차액금은 검색줄 오른쪽에서 상세 조회(⌄)로 옮겼다
export function PricingManagementPage({ selectedModule, currentMenuName, content, breadcrumbItems, selectedMenuPermissions }: PricingManagementPageProps) {
  const [search, setSearch] = useState('');
  const [detailValues, setDetailValues] = useState<Record<string, PageSearchFieldValue>>({});
  const [client, setClient] = useState('');
  const [diffOption, setDiffOption] = useState<DiffOption>('');
  const management = usePricingManagement(search);

  const permissions = {
    read: Boolean(selectedMenuPermissions?.read),
    excel: Boolean(selectedMenuPermissions?.excel || selectedMenuPermissions?.read),
  };
  const columns = useMemo(() => createPricingColumns(management.openDetail), [management.openDetail]);
  const detailFields = useMemo(() => [...toPageSearchFields(columns), DIFF_FIELD], [columns]);
  const visibleRows = useMemo(() => filterPricingRows(management.rows, client, diffOption), [management.rows, client, diffOption]);

  // 송연 export-excel: 지금 표에 보이는 줄(거래처 · 차액금 거른 뒤) 그대로
  const exportExcel = async () => {
    try {
      await downloadExcel(visibleRows, PRICING_EXCEL_COLUMNS, `단가관리_${todayDash()}.xlsx`, '단가관리');
    } catch (requestError) {
      management.setError(errorText(requestError, '엑셀을 만들지 못했어요'));
    }
  };

  const pageActionGroups: PermissionActionGroupDefinition[] = [
    {
      key: 'read',
      actions: [
        { label: '조회', icon: SearchIcon, visible: permissions.read, disabled: management.loading, onClick: () => void management.reload() },
        { label: '엑셀 다운로드', icon: FileDownloadIcon, visible: permissions.excel, onClick: () => void exportExcel() },
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
      {/* 조회 조건: 제품명 · 제품코드 · 거래처(돋보기 칸, 서버에서 다시 받음) + 상세 조회(⌄)의 거래처 · 차액금(받은 목록 안에서 거름) */}
      <PageSearchArea
        searchField={
          <TextField
            size="small"
            margin="none"
            placeholder="제품명 · 제품코드 · 거래처 검색"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            slotProps={{ htmlInput: { 'aria-label': '제품 검색' } }}
            sx={(theme) => ({ width: '100%', ...searchFieldSx(theme) })}
          />
        }
        onDefaultSearch={() => void management.reload()}
        detailFields={detailFields}
        detailValues={detailValues}
        onDetailValuesChange={setDetailValues}
        onDetailSearch={(values) => {
          setClient(textOf(values.clientName).trim());
          setDiffOption((DIFF_OPTIONS.find((option) => option.value === values.diffOption)?.value ?? '') as DiffOption);
        }}
        detailLoading={management.loading}
      />
      <PageMessageArea message={management.error} onClose={() => management.setError('')} />
      <Box sx={{ p: { xs: 1.5, sm: 1 }, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Card sx={{ borderRadius: 1, border: '1px solid rgba(148,163,184,0.18)', boxShadow: 'none', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <CardContent sx={{ p: 2, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', '&:last-child': { pb: 2 } }}>
            <PricingGrid rows={visibleRows} columns={columns} loading={management.loading} />
          </CardContent>
        </Card>
      </Box>
      {management.detail && management.selectedCode && (
        <PricingDetailDialog
          detail={management.detail.detail}
          bom={management.detail.bom}
          packagingTypes={management.packagingTypes}
          onSave={management.saveDetail}
          onClose={management.closeDetail}
        />
      )}
    </Box>
  );
}

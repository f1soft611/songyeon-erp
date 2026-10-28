import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Card, CardContent, TextField } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SaveIcon from '@mui/icons-material/Save';
import SearchIcon from '@mui/icons-material/Search';
import { AppLoadingSpinner } from '../../../../shared/components/AppLoadingSpinner';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { type PermissionActionGroupDefinition } from '../../../../shared/components/PermissionGroup';
import { PageMessageArea } from '../../../../shared/components/PageMessageArea';
import { PageSearchArea } from '../../../../shared/components/PageSearchArea';
import { toPageSearchFields, type PageSearchField, type PageSearchFieldValue } from '../../../../shared/components/page-search/searchFields';
import { UnsavedChangesConfirmDialog } from '../../../../shared/components/UnsavedChangesConfirmDialog';
import type { F1GridRef } from '../../../../shared/components/f1-grid';
import type { MenuPermission, ModuleItem, PageContent } from '../../../dashboard/types/dashboard';
// 제품 상세 창(배합비 · 부자재)은 기초정보의 거래처BOM 탭도 같이 쓴다
import { ProductBomDialog, type ProductBomDialogTab } from './components/ProductBomDialog';
import { ProductBomHistoryDialog } from './components/ProductBomHistoryDialog';
import { filterProductRows, STALE_PERIODS } from './utils/productBom';
import { useCommonCodeOptions } from '../../../../shared/components/common-code/useCommonCodeOptions';
import { ItemMasterGrid, createItemMasterColumns } from './components/ItemMasterGrid';
import { useItemMasterManagement } from './hooks/useItemMasterManagement';
import { filterItemMasterByUse, type ItemMasterRow, type ItemMasterUseFilter } from './utils/itemMaster';

// 조회 칸 모양(포장유형 · 창고등록과 같음)
const searchFieldSx = (theme: { palette: { mode: string } }) => ({
  height: 40,
  '& .MuiOutlinedInput-root': {
    height: '100%',
    borderRadius: '0 8px 8px 0',
    backgroundColor: theme.palette.mode === 'dark' ? 'rgba(15, 23, 42, 0.72)' : 'rgba(255,255,255,0.72)',
  },
});

// 상세 조회 조건(2026-10-27, S_ERP 거래처관리처럼 검색칸 오른쪽 ⌄): 사용여부(열의 search 설정) + 안 만든 기간
// 안 만든 기간은 표의 칸이 아니라서 칸 목록에 따로 더한다(마지막생산일이 그 기간보다 오래된 제품만, 생산이력 없음 포함)
const STALE_FIELD: PageSearchField = {
  field: 'staleMonths',
  label: '안 만든 기간',
  type: 'select',
  searchSpan: 1,
  options: STALE_PERIODS.map((period) => ({ value: String(period.months), label: period.label })),
};

// 처음 값 · [초기화] 값: 사용여부 '사용'(2026-10-23 부터 기본은 사용중), 안 만든 기간 전체
const DEFAULT_DETAIL_VALUES: Record<string, PageSearchFieldValue> = { useYn: 'Y' };

// 상세 조회 값 → 거르기 값
const useFilterOf = (values: Record<string, PageSearchFieldValue>): ItemMasterUseFilter =>
  values.useYn === 'Y' || values.useYn === 'N' ? values.useYn : 'ALL';
const textOf = (value: PageSearchFieldValue | undefined): string =>
  value == null || typeof value === 'object' ? '' : String(value).trim();

// 열에서 만든 상세 조회 칸(업체명 · 보관방법): 업체명은 포함, 보관방법은 같은 코드
type DetailFilter = { clientName: string; storage: string };
const detailFilterOf = (values: Record<string, PageSearchFieldValue>): DetailFilter => ({
  clientName: textOf(values.clientName),
  storage: textOf(values.storage),
});
const filterByDetail = (rows: ItemMasterRow[], filter: DetailFilter): ItemMasterRow[] => {
  const client = filter.clientName.toLowerCase();
  return rows.filter(
    (row) =>
      (!client || row.clientName.toLowerCase().includes(client)) &&
      (!filter.storage || row.storage === filter.storage),
  );
};

const staleMonthsOf = (values: Record<string, PageSearchFieldValue>): number | null => {
  const months = Number(values.staleMonths);
  return Number.isFinite(months) && months > 0 ? months : null;
};

type ItemMasterManagementPageProps = {
  selectedModule: ModuleItem;
  currentMenuName: string;
  content: PageContent;
  breadcrumbItems?: string[];
  selectedMenuPermissions?: MenuPermission;
};

function SaveProgressIcon() {
  return <AppLoadingSpinner size={16} color="inherit" aria-label="제품 저장 중" />;
}

// 공통관리 > 기초정보 > 제품마스터 (화면ID BSItemMasterView, 송연 CM0001Tab05)
// 송연: 제품은 영업관리 > 제품등록에서 만들고, 여기서는 배합비 · 부자재(수정일시 뒤 [상세] 칸 → 제품BOM 창) · 사용여부만 다룬다
// 2026-10-27 S_ERP 거래처관리와 같은 구조로 나눴다: 화면(이 파일) · 조회/저장(hooks/useItemMasterManagement) · 그리드(components/ItemMasterGrid)
export function ItemMasterManagementPage({ selectedModule, currentMenuName, content, breadcrumbItems, selectedMenuPermissions }: ItemMasterManagementPageProps) {
  const navigate = useNavigate();
  const management = useItemMasterManagement();
  const gridRef = useRef<F1GridRef<ItemMasterRow>>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [detailValues, setDetailValues] = useState<Record<string, PageSearchFieldValue>>(DEFAULT_DETAIL_VALUES);
  const [useFilter, setUseFilter] = useState<ItemMasterUseFilter>(useFilterOf(DEFAULT_DETAIL_VALUES));
  const [staleMonths, setStaleMonths] = useState<number | null>(staleMonthsOf(DEFAULT_DETAIL_VALUES));
  const [detailFilter, setDetailFilter] = useState<DetailFilter>(detailFilterOf(DEFAULT_DETAIL_VALUES));
  // 보관방법 고르기: 공통코드 STORAGE_METHOD 의 사용 중 항목
  const storageCodes = useCommonCodeOptions('STORAGE_METHOD');
  const storageOptions = useMemo(
    () => storageCodes.map((option) => ({ value: option.code, label: option.name })),
    [storageCodes],
  );
  const [confirmReload, setConfirmReload] = useState(false);
  const [dialog, setDialog] = useState<{ product: ItemMasterRow; tab: ProductBomDialogTab } | null>(null);
  const [history, setHistory] = useState<ItemMasterRow | null>(null);

  const permissions = {
    read: Boolean(selectedMenuPermissions?.read),
    create: Boolean(selectedMenuPermissions?.create),
    write: Boolean(selectedMenuPermissions?.create || selectedMenuPermissions?.update),
    excel: Boolean(selectedMenuPermissions?.excel),
  };
  const canEdit = permissions.write && !management.saving;
  const columns = useMemo(
    () => createItemMasterColumns(canEdit, (product) => setDialog({ product, tab: 'view' }), storageOptions, setHistory),
    [canEdit, storageOptions],
  );
  const detailFields = useMemo(() => [...toPageSearchFields(columns), STALE_FIELD], [columns]);
  const visibleRows = useMemo(
    // 거르기만 하고 줄은 그대로 돌려준다(사용여부 값도 남는다)
    () =>
      filterByDetail(
        filterItemMasterByUse(filterProductRows(management.rows, searchQuery, staleMonths) as ItemMasterRow[], useFilter),
        detailFilter,
      ),
    [management.rows, searchQuery, staleMonths, useFilter, detailFilter],
  );

  // 저장하지 않은 변경이 있으면 먼저 묻는다
  const requestReload = () => (management.hasChanges ? setConfirmReload(true) : void management.reload());

  const handleSave = () => {
    const grid = gridRef.current;
    if (!grid) return;
    void management.saveChanges(grid.getChanges());
  };

  const pageActionGroups: PermissionActionGroupDefinition[] = [
    {
      key: 'read',
      actions: [
        { label: '조회', icon: SearchIcon, visible: permissions.read, disabled: management.loading || management.saving, onClick: requestReload },
      ],
    },
    {
      key: 'write',
      actions: [
        // 새 제품은 영업관리 > 제품등록에서 만든다(송연과 같음)
        { label: '신규 제품 등록', icon: AddIcon, visible: permissions.create, disabled: management.loading, onClick: () => navigate('/sa/product') },
        {
          label: '저장',
          icon: management.saving ? SaveProgressIcon : SaveIcon,
          visible: permissions.write,
          disabled: !management.hasChanges || management.saving,
          onClick: handleSave,
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
      {/* 조회 조건: 제품코드 · 제품명(돋보기 칸, 바로 거름) + 상세 조회(⌄)의 사용여부 · 안 만든 기간 */}
      <PageSearchArea
        searchField={
          <TextField
            size="small"
            margin="none"
            placeholder="제품코드/제품명 검색"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            slotProps={{ htmlInput: { 'aria-label': '제품코드/제품명 검색' } }}
            sx={(theme) => ({ width: '100%', ...searchFieldSx(theme) })}
          />
        }
        onDefaultSearch={requestReload}
        detailFields={detailFields}
        detailValues={detailValues}
        defaultValues={DEFAULT_DETAIL_VALUES}
        onDetailValuesChange={setDetailValues}
        // 상세 [조회]: 받은 목록을 화면에서 거른다(서버에서 다시 받지 않는다)
        onDetailSearch={(values) => {
          setUseFilter(useFilterOf(values));
          setStaleMonths(staleMonthsOf(values));
          setDetailFilter(detailFilterOf(values));
        }}
        detailLoading={management.loading}
      />
      <PageMessageArea message={management.error} onClose={() => management.setError('')} />
      <Box sx={{ p: { xs: 1.5, sm: 1 }, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Card sx={{ borderRadius: 1, border: '1px solid rgba(148,163,184,0.18)', boxShadow: 'none', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <CardContent sx={{ p: 2, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', '&:last-child': { pb: 2 } }}>
            <ItemMasterGrid
              rows={visibleRows}
              columns={columns}
              canExportExcel={permissions.excel}
              loading={management.loading}
              gridKey={management.gridKey}
              gridRef={gridRef}
              onChangesChange={management.handleChangesChange}
            />
          </CardContent>
        </Card>
      </Box>
      {dialog && (
        <ProductBomDialog
          key={`${dialog.product.code}-${dialog.tab}`}
          product={dialog.product}
          initialTab={dialog.tab}
          canWrite={permissions.write}
          onSaved={() => management.reload()}
          onClose={() => setDialog(null)}
        />
      )}
      {history && <ProductBomHistoryDialog product={history} onClose={() => setHistory(null)} />}
      <UnsavedChangesConfirmDialog
        open={confirmReload}
        title="저장하지 않은 변경사항"
        description="변경사항을 버리고 목록을 다시 불러오시겠습니까?"
        cancelLabel="취소"
        continueLabel="계속"
        onCancel={() => setConfirmReload(false)}
        onContinue={() => {
          setConfirmReload(false);
          void management.reload();
        }}
      />
    </Box>
  );
}

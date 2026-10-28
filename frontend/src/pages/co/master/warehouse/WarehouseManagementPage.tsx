import { useMemo, useRef, useState } from 'react';
import { Box, Card, CardContent, TextField } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SaveIcon from '@mui/icons-material/Save';
import SearchIcon from '@mui/icons-material/Search';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { AppLoadingSpinner } from '../../../../shared/components/AppLoadingSpinner';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { type PermissionActionGroupDefinition } from '../../../../shared/components/PermissionGroup';
import { PageMessageArea } from '../../../../shared/components/PageMessageArea';
import { PageSearchArea } from '../../../../shared/components/PageSearchArea';
import { toPageSearchFields, type PageSearchFieldValue } from '../../../../shared/components/page-search/searchFields';
import { UnsavedChangesConfirmDialog } from '../../../../shared/components/UnsavedChangesConfirmDialog';
import type { F1GridRef } from '../../../../shared/components/f1-grid';
import { downloadExcel, todayDash } from '../../../../shared/utils/excelFile';
import type { MenuPermission, ModuleItem, PageContent } from '../../../dashboard/types/dashboard';
import { WarehouseGrid, createWarehouseColumns } from './components/WarehouseGrid';
import { useWarehouseManagement } from './hooks/useWarehouseManagement';
import type { WarehouseRow, WarehouseUseFilter } from './types/warehouse.types';
import { filterWarehouseRows, WAREHOUSE_EXCEL_COLUMNS } from './utils/warehouse';

const searchFieldSx = (theme: { palette: { mode: string } }) => ({
  height: 40,
  '& .MuiOutlinedInput-root': {
    height: '100%',
    borderRadius: '0 8px 8px 0',
    backgroundColor: theme.palette.mode === 'dark' ? 'rgba(15, 23, 42, 0.72)' : 'rgba(255,255,255,0.72)',
  },
});

// 상세 조회 조건 처음 값 · [초기화] 값: 사용여부 '사용'(2026-10-23 부터 기본은 사용중)
const DEFAULT_DETAIL_VALUES: Record<string, PageSearchFieldValue> = { useYn: 'Y' };

// 상세 조회 조건의 사용여부 → 거르기 값('' 은 전체)
const useFilterOf = (values: Record<string, PageSearchFieldValue>): WarehouseUseFilter =>
  values.useYn === 'Y' || values.useYn === 'N' ? values.useYn : 'ALL';

type WarehouseManagementPageProps = {
  selectedModule: ModuleItem;
  currentMenuName: string;
  content: PageContent;
  breadcrumbItems?: string[];
  selectedMenuPermissions?: MenuPermission;
};

function SaveProgressIcon() {
  return <AppLoadingSpinner size={16} color="inherit" aria-label="창고 저장 중" />;
}

// 공통관리 > 기초정보 > 창고등록 (화면ID BSWarehouseView, tb_warehouse, 송연 CM0001Tab04)
// 2026-10-27 S_ERP 거래처관리와 같은 구조로 나눴다: 화면(이 파일) · 조회/저장(hooks/useWarehouseManagement) · 그리드(components/WarehouseGrid)
export function WarehouseManagementPage({ selectedModule, currentMenuName, content, breadcrumbItems, selectedMenuPermissions }: WarehouseManagementPageProps) {
  const management = useWarehouseManagement();
  const gridRef = useRef<F1GridRef<WarehouseRow>>(null);
  const [searchQuery, setSearchQuery] = useState('');
  // 조회 조건: 사용여부는 S_ERP 거래처관리처럼 상세 조회(⌄)에서 고른다(2026-10-27, 예전 전체 · 사용중 · 사용안함 단추 대신)
  const [detailValues, setDetailValues] = useState<Record<string, PageSearchFieldValue>>(DEFAULT_DETAIL_VALUES);
  const [useFilter, setUseFilter] = useState<WarehouseUseFilter>(useFilterOf(DEFAULT_DETAIL_VALUES));
  const [confirmReload, setConfirmReload] = useState(false);

  const permissions = {
    read: Boolean(selectedMenuPermissions?.read),
    create: Boolean(selectedMenuPermissions?.create),
    write: Boolean(selectedMenuPermissions?.create || selectedMenuPermissions?.update),
    excel: Boolean(selectedMenuPermissions?.excel),
  };
  const canEdit = permissions.write && !management.saving;
  const columns = useMemo(() => createWarehouseColumns(canEdit), [canEdit]);
  // 열의 search 설정으로 상세 조회 칸을 만든다(지금은 사용여부 하나)
  const detailFields = useMemo(() => toPageSearchFields(columns), [columns]);
  const visibleRows = useMemo(
    () => filterWarehouseRows(management.rows, searchQuery, useFilter),
    [management.rows, searchQuery, useFilter],
  );

  // 저장하지 않은 변경이 있으면 먼저 묻는다
  const requestReload = () => (management.hasChanges ? setConfirmReload(true) : void management.reload());

  const handleSave = () => {
    const grid = gridRef.current;
    if (!grid) return;
    void management.saveChanges(grid.getChanges(), grid.getActiveRows());
  };

  // 지금 조회 조건(검색 · 사용여부)으로 보이는 줄을 엑셀로 내려받는다(메뉴 권한: 엑셀)
  const exportExcel = async () => {
    management.setError('');
    try {
      if (visibleRows.length === 0) throw new Error('다운로드할 데이터가 없어요');
      await downloadExcel(visibleRows, WAREHOUSE_EXCEL_COLUMNS, `창고등록_${todayDash()}.xlsx`, '창고등록');
    } catch (exportError) {
      management.setError(exportError instanceof Error ? exportError.message : '다운로드하지 못했어요');
    }
  };

  const pageActionGroups: PermissionActionGroupDefinition[] = [
    {
      key: 'read',
      actions: [
        { label: '조회', icon: SearchIcon, visible: permissions.read, disabled: management.loading || management.saving, onClick: requestReload },
        { label: '엑셀 다운로드', icon: FileDownloadIcon, visible: permissions.excel, disabled: management.loading, onClick: () => void exportExcel() },
      ],
    },
    {
      key: 'write',
      actions: [
        { label: '추가', icon: AddIcon, visible: permissions.create, disabled: management.loading || management.saving, onClick: () => gridRef.current?.addRow() },
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
      {/* 조회 조건: 창고명(돋보기 칸, 바로 거름) + 상세 조회(⌄)의 사용여부 */}
      <PageSearchArea
        searchField={
          <TextField
            size="small"
            margin="none"
            placeholder="창고 검색"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            slotProps={{ htmlInput: { 'aria-label': '창고 검색' } }}
            sx={(theme) => ({ width: '100%', ...searchFieldSx(theme) })}
          />
        }
        onDefaultSearch={requestReload}
        detailFields={detailFields}
        detailValues={detailValues}
        defaultValues={DEFAULT_DETAIL_VALUES}
        onDetailValuesChange={setDetailValues}
        // 상세 [조회]: 받은 목록을 화면에서 거른다(서버에서 다시 받지 않는다)
        onDetailSearch={(values) => setUseFilter(useFilterOf(values))}
        detailLoading={management.loading}
      />
      <PageMessageArea
        message={management.error}
        onClose={() => management.setError('')}
      />
      <Box sx={{ p: { xs: 1.5, sm: 1 }, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Card sx={{ borderRadius: 1, border: '1px solid rgba(148,163,184,0.18)', boxShadow: 'none', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <CardContent sx={{ p: 2, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 1, '&:last-child': { pb: 2 } }}>
            <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
              <WarehouseGrid
                rows={visibleRows}
                columns={columns}
                canCreate={permissions.create && !management.saving}
                canExportExcel={permissions.excel}
                loading={management.loading}
                gridKey={management.gridKey}
                gridRef={gridRef}
                onChangesChange={management.handleChangesChange}
              />
            </Box>
          </CardContent>
        </Card>
      </Box>
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

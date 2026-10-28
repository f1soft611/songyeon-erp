import { useMemo, useRef, useState } from 'react';
import { Box, Card, CardContent, TextField } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import SaveIcon from '@mui/icons-material/Save';
import SearchIcon from '@mui/icons-material/Search';
import { AppLoadingSpinner } from '../../../../shared/components/AppLoadingSpinner';
import { ConfirmDialog } from '../../../../shared/components/ConfirmDialog';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { type PermissionActionGroupDefinition } from '../../../../shared/components/PermissionGroup';
import { PageMessageArea } from '../../../../shared/components/PageMessageArea';
import { PageSearchArea } from '../../../../shared/components/PageSearchArea';
import { toPageSearchFields, type PageSearchField, type PageSearchFieldValue } from '../../../../shared/components/page-search/searchFields';
import { UnsavedChangesConfirmDialog } from '../../../../shared/components/UnsavedChangesConfirmDialog';
import type { F1GridRef, F1GridValidationError } from '../../../../shared/components/f1-grid';
import { useCommonCodeOptions } from '../../../../shared/components/common-code/useCommonCodeOptions';
import { downloadExcel, todayFileTag } from '../../../../shared/utils/excelFile';
import type { MenuPermission, ModuleItem, PageContent } from '../../../dashboard/types/dashboard';
import { MaterialHistoryDialog } from './components/MaterialHistoryDialog';
import { MaterialMasterGrid, createMaterialMasterColumns } from './components/MaterialMasterGrid';
import { MaterialReplaceDialog } from './components/MaterialReplaceDialog';
import { MaterialUsageDialog } from './components/MaterialUsageDialog';
import { filterMaterialMasterRows, matchMaterialKeyword, useMaterialMasterManagement } from './hooks/useMaterialMasterManagement';
import type { MaterialMasterRow } from './types/materialMaster.types';
import { MATERIAL_EXCEL_COLUMNS, STALE_UNITS, type MaterialUseFilter, type StaleUnit } from './utils/materialMaster';

// 조회 칸 모양(제품마스터 · 거래처마스터와 같음)
const searchFieldSx = (theme: { palette: { mode: string } }) => ({
  height: 40,
  '& .MuiOutlinedInput-root': {
    height: '100%',
    borderRadius: '0 8px 8px 0',
    backgroundColor: theme.palette.mode === 'dark' ? 'rgba(15, 23, 42, 0.72)' : 'rgba(255,255,255,0.72)',
  },
});

// 상세 조회 조건(검색칸 오른쪽 ⌄): 납품업체 · 사용여부(열의 search 설정) + 안 쓴 기간(숫자 · 단위).
// 안 쓴 기간은 표의 칸이 아니라서 따로 더한다. 정해진 기간만으로는 '45일' 같은 기간을 볼 수 없어 숫자를 직접 적는다(송연과 같음)
const STALE_FIELDS: PageSearchField[] = [
  { field: 'staleValue', label: '안 쓴 기간', type: 'number', searchSpan: 1 },
  { field: 'staleUnit', label: '기간 단위', type: 'select', searchSpan: 1, options: STALE_UNITS },
];

// 처음 값 · [초기화] 값: 사용여부 '사용', 안 쓴 기간 단위 '월'
const DEFAULT_DETAIL_VALUES: Record<string, PageSearchFieldValue> = { useYn: 'Y', staleUnit: 'month' };

const useFilterOf = (values: Record<string, PageSearchFieldValue>): MaterialUseFilter =>
  values.useYn === 'Y' || values.useYn === 'N' ? values.useYn : 'ALL';
const staleOf = (values: Record<string, PageSearchFieldValue>): { value: number; unit: StaleUnit } | null => {
  const value = parseInt(String(values.staleValue ?? ''), 10);
  const unit = STALE_UNITS.find((item) => item.value === values.staleUnit)?.value ?? 'month';
  return value > 0 ? { value, unit } : null;
};

type MaterialMasterManagementPageProps = {
  selectedModule: ModuleItem;
  currentMenuName: string;
  content: PageContent;
  breadcrumbItems?: string[];
  selectedMenuPermissions?: MenuPermission;
};

function SaveProgressIcon() {
  return <AppLoadingSpinner size={16} color="inherit" aria-label="원재료 저장 중" />;
}

// 공통관리 > 기초정보 > 원재료마스터 (화면ID BSMaterialMasterView, 송연 CM0001Tab08)
// 2026-10-27 S_ERP 품목관리와 같은 구조로 나눴다: 화면(이 파일) · 조회/저장(hooks/useMaterialMasterManagement) · 그리드(components/MaterialMasterGrid).
// 등록 · 수정은 F1-Grid 내장 상세 창, 단가 변경로그는 [이력] 칸 → 이력 창, 역전개 · 일괄적용은 [작업] 칸
export function MaterialMasterManagementPage({ selectedModule, currentMenuName, content, breadcrumbItems, selectedMenuPermissions }: MaterialMasterManagementPageProps) {
  const management = useMaterialMasterManagement();
  const gridRef = useRef<F1GridRef<MaterialMasterRow>>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [detailValues, setDetailValues] = useState<Record<string, PageSearchFieldValue>>(DEFAULT_DETAIL_VALUES);
  const [useFilter, setUseFilter] = useState<MaterialUseFilter>(useFilterOf(DEFAULT_DETAIL_VALUES));
  const [stale, setStale] = useState(staleOf(DEFAULT_DETAIL_VALUES));
  // 상세 조회 납품업체(거래처코드, 열의 search 설정)
  const [supplierCode, setSupplierCode] = useState('');
  const [confirmReload, setConfirmReload] = useState(false);
  const [usage, setUsage] = useState<MaterialMasterRow | null>(null);
  const [replace, setReplace] = useState<MaterialMasterRow | null>(null);
  const [history, setHistory] = useState<MaterialMasterRow | null>(null);
  // 입고단위 고르기: 공통코드 UNIT 의 사용 중 항목
  const unitCodes = useCommonCodeOptions('UNIT');
  const unitOptions = useMemo(() => unitCodes.map((option) => ({ value: option.code, label: option.name })), [unitCodes]);

  const permissions = {
    read: Boolean(selectedMenuPermissions?.read),
    create: Boolean(selectedMenuPermissions?.create),
    update: Boolean(selectedMenuPermissions?.update),
    write: Boolean(selectedMenuPermissions?.create || selectedMenuPermissions?.update),
    excel: Boolean(selectedMenuPermissions?.excel),
  };
  const canEdit = permissions.write && !management.saving;
  const columns = useMemo(
    () =>
      createMaterialMasterColumns(canEdit, permissions.write, management.vendors, unitOptions, management.rows, {
        onUsage: setUsage,
        onReplace: setReplace,
        onHistory: setHistory,
      }),
    [canEdit, permissions.write, management.vendors, unitOptions, management.rows],
  );
  const detailFields = useMemo(() => [...toPageSearchFields(columns), ...STALE_FIELDS], [columns]);
  const visibleRows = useMemo(
    () => filterMaterialMasterRows(management.rows, searchQuery, useFilter, stale, new Date(), supplierCode),
    [management.rows, searchQuery, useFilter, stale, supplierCode],
  );

  // 저장하지 않은 변경이 있으면 먼저 묻는다
  const requestReload = () => (management.hasChanges ? setConfirmReload(true) : void management.reload());

  const handleSave = () => {
    const grid = gridRef.current;
    if (!grid) return;
    // 걸린 이유는 handleValidationErrors 가 보여 준다(거래처마스터와 같음)
    if (!grid.validate()) return;
    void management.saveChanges(grid.getChanges());
  };

  // 그리드 검사는 화면의 모든 줄을 본다. 어느 원재료인지 붙여 보여 준다(엑셀 · 새 줄도 그리드의 지금 줄에서 찾는다)
  const handleValidationErrors = (errors: F1GridValidationError[]) => {
    const shownRows = gridRef.current?.getActiveRows() ?? management.rows;
    const nameOf = (rowId: unknown) => shownRows.find((row) => row.id === String(rowId))?.name || '새 원재료';
    management.setError([...new Set(errors.map((error) => `${nameOf(error.rowId)}: ${error.message}`))].join('\n'));
  };

  // 송연 엑셀: 검색어에 맞는 줄 전체(부자재 포함)를 송연 칸 순서로 내려받는다
  const exportExcel = async () => {
    management.setError('');
    try {
      const rows = management.rows.filter((row) => matchMaterialKeyword(row, searchQuery));
      if (rows.length === 0) throw new Error('다운로드할 데이터가 없어요');
      await downloadExcel(rows, MATERIAL_EXCEL_COLUMNS, `원재료마스터_${todayFileTag()}.xlsx`);
    } catch (exportError) {
      management.setError(exportError instanceof Error ? exportError.message : '엑셀을 만들지 못했어요');
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
        // 내장 상세 창(등록)을 연다. 오른쪽 클릭 [행 추가]와 같다
        {
          label: '신규 원재료 등록',
          icon: AddIcon,
          visible: permissions.create,
          disabled: management.loading || management.saving,
          onClick: () => gridRef.current?.addRow(),
        },
        {
          label: '저장',
          icon: management.saving ? SaveProgressIcon : SaveIcon,
          visible: permissions.write,
          disabled: !management.hasChanges || management.saving || management.loading,
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
      {/* 조회 조건: 원재료코드 · 원재료명(돋보기 칸, 바로 거름) + 상세 조회(⌄)의 사용여부 · 안 쓴 기간 */}
      <PageSearchArea
        searchField={
          <TextField
            size="small"
            margin="none"
            placeholder="원재료코드/원재료명 검색"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            slotProps={{ htmlInput: { 'aria-label': '원재료코드/원재료명 검색' } }}
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
          setStale(staleOf(values));
          setSupplierCode(typeof values.supplierCodes === 'string' ? values.supplierCodes : '');
        }}
        detailLoading={management.loading}
      />
      <PageMessageArea message={management.error} onClose={() => management.setError('')} />
      <Box sx={{ p: { xs: 1.5, sm: 1 }, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Card sx={{ borderRadius: 1, border: '1px solid rgba(148,163,184,0.18)', boxShadow: 'none', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <CardContent sx={{ p: 2, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', '&:last-child': { pb: 2 } }}>
            <MaterialMasterGrid
              rows={visibleRows}
              columns={columns}
              canCreate={permissions.create && !management.loading && !management.saving}
              canUpdate={permissions.update && !management.loading && !management.saving}
              canExportExcel={permissions.excel}
              loading={management.loading}
              gridKey={management.gridKey}
              gridRef={gridRef}
              onChangesChange={management.handleChangesChange}
              onValidationErrors={handleValidationErrors}
            />
          </CardContent>
        </Card>
      </Box>
      {usage && <MaterialUsageDialog code={usage.code} name={usage.name} onClose={() => setUsage(null)} />}
      {replace && (
        <MaterialReplaceDialog code={replace.code} name={replace.name} onReplaced={() => management.reload()} onClose={() => setReplace(null)} />
      )}
      {history && (
        <MaterialHistoryDialog code={history.code} name={history.name} canWrite={permissions.write} onClose={() => setHistory(null)} />
      )}
      <ConfirmDialog
        open={management.sameConfirm !== null}
        title="같은 원재료"
        message={management.sameConfirm?.message ?? ''}
        confirmLabel="그래도 저장"
        onCancel={() => {
          management.setSameConfirm(null);
          management.setError('저장하지 않았어요');
        }}
        onConfirm={() => {
          const pending = management.sameConfirm;
          management.setSameConfirm(null);
          if (pending) void management.saveChanges(pending.changes, true);
        }}
      />
      <ConfirmDialog
        open={management.notice !== ''}
        title="원재료마스터"
        message={management.notice}
        alertOnly
        onCancel={() => management.setNotice('')}
        onConfirm={() => management.setNotice('')}
      />
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

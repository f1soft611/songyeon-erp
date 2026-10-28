import { useCallback, useMemo, useRef, useState } from 'react';
import { Box, Card, CardContent, TextField, Typography } from '@mui/material';
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
import { toPageSearchFields, type PageSearchFieldValue } from '../../../../shared/components/page-search/searchFields';
import { UnsavedChangesConfirmDialog } from '../../../../shared/components/UnsavedChangesConfirmDialog';
import type { F1GridRef, F1GridValidationError } from '../../../../shared/components/f1-grid';
import { MasterPickerDialog } from '../../../../shared/components/master-picker/MasterPickerDialog';
import type { MasterPickerOption } from '../../../../shared/components/master-picker/masterPicker.types';
import { useCommonCodeOptions } from '../../../../shared/components/common-code/useCommonCodeOptions';
import { downloadExcel, todayFileTag } from '../../../../shared/utils/excelFile';
import type { MenuPermission, ModuleItem, PageContent } from '../../../dashboard/types/dashboard';
import { MaterialHistoryDialog } from '../material-master/components/MaterialHistoryDialog';
import { matchMaterialKeyword, vendorPickerOptions } from '../material-master/hooks/useMaterialMasterManagement';
import type { MaterialMasterRow } from '../material-master/types/materialMaster.types';
import { SUB_MATERIAL_EXCEL_COLUMNS, type MaterialUseFilter } from '../material-master/utils/materialMaster';
import { SubMaterialMasterGrid, createSubMaterialMasterColumns } from './components/SubMaterialMasterGrid';
import { useSubMaterialCategories } from './hooks/useSubMaterialCategories';
import { filterSubMaterialMasterRows, useSubMaterialMasterManagement } from './hooks/useSubMaterialMasterManagement';

// 조회 칸 모양(원재료마스터 · 제품마스터와 같음)
const searchFieldSx = (theme: { palette: { mode: string } }) => ({
  height: 40,
  '& .MuiOutlinedInput-root': {
    height: '100%',
    borderRadius: '0 8px 8px 0',
    backgroundColor: theme.palette.mode === 'dark' ? 'rgba(15, 23, 42, 0.72)' : 'rgba(255,255,255,0.72)',
  },
});

// 상세 조회 조건(검색칸 오른쪽 ⌄): 분류 · 납품업체 · 사용여부(열의 search 설정). 처음 값 · [초기화] 값: 사용여부 '사용'
const DEFAULT_DETAIL_VALUES: Record<string, PageSearchFieldValue> = { useYn: 'Y' };

const useFilterOf = (values: Record<string, PageSearchFieldValue>): MaterialUseFilter =>
  values.useYn === 'Y' || values.useYn === 'N' ? values.useYn : 'ALL';
const textOf = (value: PageSearchFieldValue | undefined): string => (typeof value === 'string' ? value : '');

type SubMaterialMasterManagementPageProps = {
  selectedModule: ModuleItem;
  currentMenuName: string;
  content: PageContent;
  breadcrumbItems?: string[];
  selectedMenuPermissions?: MenuPermission;
};

function SaveProgressIcon() {
  return <AppLoadingSpinner size={16} color="inherit" aria-label="부자재 저장 중" />;
}

// 공통관리 > 기초정보 > 부자재마스터 (화면ID BSSubMaterialMasterView, 송연 CM0001Tab09)
// 2026-10-27 원재료마스터와 같은 S_ERP 품목관리 구조로 나눴다: 화면(이 파일) · 조회/저장(hooks/useSubMaterialMasterManagement) · 그리드(components/SubMaterialMasterGrid).
// 등록 · 수정은 F1-Grid 내장 상세 창, 단가 변경로그는 [이력] 칸 → 이력 창(원재료마스터와 같은 창)
export function SubMaterialMasterManagementPage({ selectedModule, currentMenuName, content, breadcrumbItems, selectedMenuPermissions }: SubMaterialMasterManagementPageProps) {
  const management = useSubMaterialMasterManagement();
  const gridRef = useRef<F1GridRef<MaterialMasterRow>>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [detailValues, setDetailValues] = useState<Record<string, PageSearchFieldValue>>(DEFAULT_DETAIL_VALUES);
  const [useFilter, setUseFilter] = useState<MaterialUseFilter>(useFilterOf(DEFAULT_DETAIL_VALUES));
  const [subCategory, setSubCategory] = useState('');
  // 상세 조회 납품업체(이름 · 거래처코드 일부)
  const [supplierKeyword, setSupplierKeyword] = useState('');
  // 납품업체 [선택] 팝업: 고르면 상세 창(또는 표 칸)에 넣을 함수(원재료마스터와 같음)
  const [supplierPicker, setSupplierPicker] = useState<{ apply: (changes: Partial<MaterialMasterRow>) => void } | null>(null);
  const [confirmReload, setConfirmReload] = useState(false);
  const [history, setHistory] = useState<MaterialMasterRow | null>(null);
  // 단위(공통코드 UNIT) · 분류(공통코드 SUB_MATERIAL_CATEGORY, 짧은 이름)
  const unitCodes = useCommonCodeOptions('UNIT');
  const unitOptions = useMemo(() => unitCodes.map((option) => ({ value: option.code, label: option.name })), [unitCodes]);
  const subCategories = useSubMaterialCategories();
  const categoryOptions = useMemo(() => subCategories.map((option) => ({ value: option.code, label: option.shortName })), [subCategories]);

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
      createSubMaterialMasterColumns(canEdit, management.vendors, unitOptions, categoryOptions, management.rows, setHistory, (_row, apply) => {
        setSupplierPicker({ apply });
        return undefined;
      }),
    [canEdit, management.vendors, unitOptions, categoryOptions, management.rows],
  );
  const detailFields = useMemo(() => toPageSearchFields(columns), [columns]);
  const visibleRows = useMemo(
    () => filterSubMaterialMasterRows(management.rows, searchQuery, useFilter, subCategory, supplierKeyword),
    [management.rows, searchQuery, useFilter, subCategory, supplierKeyword],
  );
  const searchSuppliers = useCallback(
    async (keyword: string): Promise<MasterPickerOption[]> => vendorPickerOptions(management.vendors, keyword),
    [management.vendors],
  );

  // 저장하지 않은 변경이 있으면 먼저 묻는다
  const requestReload = () => (management.hasChanges ? setConfirmReload(true) : void management.reload());

  const handleSave = () => {
    const grid = gridRef.current;
    if (!grid) return;
    // 걸린 이유는 handleValidationErrors 가 보여 준다(원재료마스터와 같음)
    if (!grid.validate()) return;
    void management.saveChanges(grid.getChanges());
  };

  // 그리드 검사는 화면의 모든 줄을 본다. 어느 부자재인지 붙여 보여 준다(새 줄도 그리드의 지금 줄에서 찾는다)
  const handleValidationErrors = (errors: F1GridValidationError[]) => {
    const shownRows = gridRef.current?.getActiveRows() ?? management.rows;
    const nameOf = (rowId: unknown) => shownRows.find((row) => row.id === String(rowId))?.name || '새 부자재';
    management.setError([...new Set(errors.map((error) => `${nameOf(error.rowId)}: ${error.message}`))].join('\n'));
  };

  // 송연 엑셀: 검색어에 맞는 부자재 전체를 송연 칸 순서로 내려받는다
  const exportExcel = async () => {
    management.setError('');
    try {
      const rows = management.rows.filter((row) => matchMaterialKeyword(row, searchQuery));
      if (rows.length === 0) throw new Error('다운로드할 데이터가 없어요');
      await downloadExcel(rows, SUB_MATERIAL_EXCEL_COLUMNS, `부자재마스터_${todayFileTag()}.xlsx`);
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
          label: '신규 부자재 등록',
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
      {/* 조회 조건: 코드 · 부자재명(돋보기 칸, 바로 거름) + 상세 조회(⌄)의 분류 · 납품업체 · 사용여부 */}
      <PageSearchArea
        searchField={
          <TextField
            size="small"
            margin="none"
            placeholder="코드/부자재명 검색"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            slotProps={{ htmlInput: { 'aria-label': '코드/부자재명 검색' } }}
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
          setSubCategory(textOf(values.subCategory));
          setSupplierKeyword(textOf(values.supplierCodes).trim());
        }}
        detailLoading={management.loading}
      />
      <PageMessageArea message={management.error} onClose={() => management.setError('')} />
      <Box sx={{ p: { xs: 1.5, sm: 1 }, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Card sx={{ borderRadius: 1, border: '1px solid rgba(148,163,184,0.18)', boxShadow: 'none', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <CardContent sx={{ p: 2, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 1, '&:last-child': { pb: 2 } }}>
            {/* 송연 안내 문구(그대로) */}
            <Typography variant="body2" color="text.secondary" sx={{ px: 1.5, py: 1, borderRadius: 1, bgcolor: 'action.hover' }}>
              여기 등록한 것만 제품BOM의 필름·파우치·박스 칸에 넣을 수 있어요.
              제품마다 한 봉 내용량·봉당 필름길이를 적어두면 생산입고·출하확정에서 자동으로 빠집니다.
            </Typography>
            <SubMaterialMasterGrid
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
      <MasterPickerDialog
        label="납품업체"
        open={supplierPicker !== null}
        search={searchSuppliers}
        onClose={() => setSupplierPicker(null)}
        onChange={(option) => {
          supplierPicker?.apply({ supplierCodes: [option.code] });
          setSupplierPicker(null);
        }}
      />
      {history && (
        <MaterialHistoryDialog code={history.code} name={history.name} canWrite={permissions.write} onClose={() => setHistory(null)} />
      )}
      <ConfirmDialog
        open={management.sameConfirm !== null}
        title="같은 부자재"
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
        title="부자재마스터"
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

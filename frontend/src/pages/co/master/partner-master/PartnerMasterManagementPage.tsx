import { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Button, Card, CardContent, Stack, TextField } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SaveIcon from '@mui/icons-material/Save';
import SearchIcon from '@mui/icons-material/Search';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import { AppLoadingSpinner } from '../../../../shared/components/AppLoadingSpinner';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { type PermissionActionGroupDefinition } from '../../../../shared/components/PermissionGroup';
import { PageMessageArea } from '../../../../shared/components/PageMessageArea';
import { PageSearchArea } from '../../../../shared/components/PageSearchArea';
import { UnsavedChangesConfirmDialog } from '../../../../shared/components/UnsavedChangesConfirmDialog';
import { toPageSearchFields, type PageSearchFieldValue } from '../../../../shared/components/page-search/searchFields';
import type { F1GridRef, F1GridValidationError } from '../../../../shared/components/f1-grid';
import { downloadExcel, readExcelRows, todayDash } from '../../../../shared/utils/excelFile';
import type { MenuPermission, ModuleItem, PageContent } from '../../../dashboard/types/dashboard';
import { ConfirmDialog } from '../../../../shared/components/ConfirmDialog';
import { CLIENT_EXCEL_COLUMNS, PARTNER_LIST_EXCEL_COLUMNS, PartnerMasterGrid, createPartnerMasterColumns } from './components/PartnerMasterGrid';
import { stageClientExcel, stageResultText, usePartnerMasterManagement, type ClientExcelStage } from './hooks/usePartnerMasterManagement';
import type { ClientMasterRow } from './types/partnerMaster.types';

const searchFieldSx = (theme: { palette: { mode: string } }) => ({
  height: 40,
  '& .MuiOutlinedInput-root': {
    height: '100%',
    borderRadius: '0 8px 8px 0',
    backgroundColor: theme.palette.mode === 'dark' ? 'rgba(15, 23, 42, 0.72)' : 'rgba(255,255,255,0.72)',
  },
});

// 상세 조회 조건(2026-10-27, S_ERP 거래처관리처럼 검색칸 오른쪽 ⌄): 분류 · 사용여부(열의 search 설정)
// 처음 값 · [초기화] 값: 분류 전체, 사용여부 '사용'(2026-10-23 부터 기본은 사용중)
const DEFAULT_DETAIL_VALUES: Record<string, PageSearchFieldValue> = { useYn: 'Y' };

type PartnerMasterManagementPageProps = {
  selectedModule: ModuleItem;
  currentMenuName: string;
  content: PageContent;
  breadcrumbItems?: string[];
  selectedMenuPermissions?: MenuPermission;
};

function SaveProgressIcon() {
  return <AppLoadingSpinner size={16} color="inherit" aria-label="거래처 저장 중" />;
}

// 공통관리 > 기초정보 > 거래처마스터 (화면ID BSPartnerMasterView, 송연 기초정보 거래처BOM 탭 CM0001Tab06)
// 2026-10-27 S_ERP 거래처관리와 같은 구조로 나눴다: 화면(이 파일) · 조회/저장(hooks/usePartnerMasterManagement) · 그리드(components/PartnerMasterGrid)
export function PartnerMasterManagementPage({ selectedModule, currentMenuName, content, breadcrumbItems, selectedMenuPermissions }: PartnerMasterManagementPageProps) {
  const management = usePartnerMasterManagement();
  const gridRef = useRef<F1GridRef<ClientMasterRow>>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [detailValues, setDetailValues] = useState<Record<string, PageSearchFieldValue>>(DEFAULT_DETAIL_VALUES);
  const [confirmReload, setConfirmReload] = useState(false);
  // 엑셀 올리기(2026-10-27): 그리드에 올릴 줄. 올리는 동안만 내장 상세 창을 꺼 둔다(addRow 가 줄마다 등록 창을 열지 않게)
  const [pendingStage, setPendingStage] = useState<ClientExcelStage | null>(null);

  const permissions = {
    read: Boolean(selectedMenuPermissions?.read),
    create: Boolean(selectedMenuPermissions?.create),
    update: Boolean(selectedMenuPermissions?.update),
    write: Boolean(selectedMenuPermissions?.create || selectedMenuPermissions?.update),
    excel: Boolean(selectedMenuPermissions?.excel),
  };
  const canEdit = permissions.write && !management.saving;

  const columns = useMemo(
    () => createPartnerMasterColumns(canEdit, management.clientTypeOptions),
    [canEdit, management.clientTypeOptions],
  );
  const detailFields = useMemo(() => toPageSearchFields(columns), [columns]);
  const visibleRows = management.visibleRows;

  // 검색어는 치는 대로 거르고, 상세 조회(분류 · 사용여부)는 [조회]에서 건다
  const handleKeywordChange = (keyword: string) => {
    setSearchQuery(keyword);
    management.applyFilters({ ...management.appliedFilters, keyword });
  };
  const handleDetailSearch = (values: Record<string, PageSearchFieldValue>) => {
    const selected = (value: PageSearchFieldValue | undefined) =>
      value == null || typeof value === 'object' ? '' : String(value).trim();
    const useYn = selected(values.useYn);
    management.applyFilters({
      keyword: searchQuery,
      clientType: selected(values.clientType),
      ceoName: selected(values.ceoName),
      businessNo: selected(values.businessNo),
      businessType: selected(values.businessType),
      businessItem: selected(values.businessItem),
      useYn: useYn === 'Y' || useYn === 'N' ? useYn : 'ALL',
    });
  };

  // 저장하지 않은 변경이 있으면 먼저 묻는다
  const requestReload = () => (management.hasChanges ? setConfirmReload(true) : void management.reload());

  const handleSave = () => {
    const grid = gridRef.current;
    if (!grid) return;
    // 걸린 이유는 handleValidationErrors 가 보여 준다(S_ERP 거래처관리와 같음)
    if (!grid.validate()) return;
    void management.saveChanges(grid.getChanges());
  };

  // 그리드 검사(필수 · 숫자 자릿수 등)는 화면의 모든 줄을 본다. 고친 줄이 아니어도 걸리니 어느 거래처인지 붙여 보여 준다(2026-10-27)
  const handleValidationErrors = (errors: F1GridValidationError[]) => {
    // 그리드의 지금 줄에서 찾는다(엑셀로 올린 새 줄도 이름이 보이게). 이름이 비어 있으면 '새 거래처'
    const shownRows = gridRef.current?.getActiveRows() ?? management.rows;
    const nameOf = (rowId: unknown) => shownRows.find((row) => row.id === String(rowId))?.name || '새 거래처';
    management.setError([...new Set(errors.map((error) => `${nameOf(error.rowId)}: ${error.message}`))].join('\n'));
  };

  // 지금 조회 조건으로 보이는 줄을 엑셀로 내려받는다(메뉴 권한: 엑셀)
  const exportExcel = async () => {
    management.setError('');
    try {
      if (visibleRows.length === 0) throw new Error('다운로드할 데이터가 없어요');
      await downloadExcel(visibleRows, PARTNER_LIST_EXCEL_COLUMNS, `거래처마스터_${todayDash()}.xlsx`, '거래처마스터');
    } catch (exportError) {
      management.setError(exportError instanceof Error ? exportError.message : '다운로드하지 못했어요');
    }
  };

  // 엑셀 올리기: 읽어서 그리드에 올린다(저장은 [저장]). 조회 조건은 그대로 — 표에 보이는 거래처는 고친 줄, 새 거래처는 새 줄
  const uploadFile = async (file: File) => {
    management.setError('');
    if (management.hasChanges) {
      management.setError('저장하지 않은 변경이 있어요. [저장]하거나 [조회]한 뒤 엑셀을 올려 주세요.');
      return;
    }
    try {
      const stage = stageClientExcel(await readExcelRows(file), management.rows, management.clientTypeOptions, visibleRows);
      if (!stage.inserted.length && !stage.updates.length) {
        management.setError(stage.notes.length ? stage.notes.join('\n') : '엑셀에서 거래처를 찾지 못했어요. 양식의 첫 칸(거래처명)을 확인해 주세요.');
        return;
      }
      setPendingStage(stage);
    } catch (readError) {
      management.setError(readError instanceof Error && readError.message ? readError.message : '엑셀을 읽지 못했어요');
    }
  };

  // 내장 상세 창이 꺼진 뒤(다음 그리기) 줄을 넣는다
  useEffect(() => {
    const grid = gridRef.current;
    if (!pendingStage || !grid) return;
    pendingStage.inserted.forEach((row) => grid.addRow(row));
    pendingStage.updates.forEach(({ id, patch }) =>
      Object.entries(patch).forEach(([field, value]) => grid.setCellValue(id, field as keyof ClientMasterRow, value)),
    );
    management.setSkippedAlert(stageResultText(pendingStage));
    setPendingStage(null);
  }, [pendingStage, management]);

  // 빈 양식(제목줄만)을 내려준다(2026-10-23). 거래처 내용이 든 파일은 제목줄 [엑셀 다운로드]로 받는다
  const exportTemplate = async () => {
    try {
      await downloadExcel([] as ClientMasterRow[], CLIENT_EXCEL_COLUMNS, '거래처마스터_엑셀양식.xlsx', '거래처');
    } catch (templateError) {
      management.setError(templateError instanceof Error ? templateError.message : '엑셀 양식을 내려받지 못했어요');
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
        // [거래처 추가]: 내장 상세 창('거래처 등록')을 연다
        { label: '거래처 추가', icon: AddIcon, visible: permissions.create, disabled: management.loading || management.saving, onClick: () => gridRef.current?.addRow() },
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
      {/* 조회 조건: 거래처명(돋보기 칸, 바로 거름) + 상세 조회(⌄)의 분류 · 사용여부 */}
      <PageSearchArea
        searchField={
          <TextField
            size="small"
            margin="none"
            placeholder="거래처코드/거래처명 검색"
            value={searchQuery}
            onChange={(event) => handleKeywordChange(event.target.value)}
            slotProps={{ htmlInput: { 'aria-label': '거래처코드/거래처명 검색' } }}
            sx={(theme) => ({ width: '100%', ...searchFieldSx(theme) })}
          />
        }
        onDefaultSearch={requestReload}
        detailFields={detailFields}
        detailValues={detailValues}
        defaultValues={DEFAULT_DETAIL_VALUES}
        onDetailValuesChange={setDetailValues}
        // 상세 [조회]: 받은 목록을 화면에서 거른다(서버에서 다시 받지 않는다)
        onDetailSearch={handleDetailSearch}
        detailLoading={management.loading}
      />
      <PageMessageArea message={management.error} onClose={() => management.setError('')} />
      <Box sx={{ p: { xs: 1.5, sm: 1 }, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Card sx={{ borderRadius: 1, border: '1px solid rgba(148,163,184,0.18)', boxShadow: 'none', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <CardContent sx={{ p: 2, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 1, '&:last-child': { pb: 2 } }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ alignItems: { md: 'center' } }}>
              <Box sx={{ flex: 1 }} />
              {/* 메뉴 권한: 양식 내려받기 = 엑셀, 올리기 = 엑셀 + 쓰기(자료가 바뀐다) */}
              {permissions.excel ? (
                <Button size="small" variant="outlined" startIcon={<FileDownloadIcon />} onClick={() => void exportTemplate()}>
                  엑셀 양식 내려받기
                </Button>
              ) : null}
              {permissions.excel && permissions.write ? (
                <Button size="small" variant="outlined" startIcon={<FileUploadIcon />} onClick={() => fileRef.current?.click()}>
                  엑셀 올리기
                </Button>
              ) : null}
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx"
                hidden
                aria-label="거래처 엑셀 파일"
                onChange={(event) => {
                  const picked = event.target.files?.[0];
                  event.target.value = ''; // 같은 파일을 고쳐서 다시 올릴 수 있게 비운다
                  if (picked) void uploadFile(picked);
                }}
              />
            </Stack>
            <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
              <PartnerMasterGrid
                rows={visibleRows}
                columns={columns}
                canCreate={permissions.create && !management.saving}
                canUpdate={permissions.update && !management.saving}
                canExportExcel={permissions.excel}
                loading={management.loading}
                gridKey={management.gridKey}
                gridRef={gridRef}
                onChangesChange={management.handleChangesChange}
                onValidationErrors={handleValidationErrors}
                formEnabled={!pendingStage}
              />
            </Box>
          </CardContent>
        </Card>
      </Box>
      <ConfirmDialog
        open={management.skippedAlert !== ''}
        title="엑셀 올리기"
        message={management.skippedAlert}
        alertOnly
        onCancel={() => management.setSkippedAlert('')}
        onConfirm={() => management.setSkippedAlert('')}
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

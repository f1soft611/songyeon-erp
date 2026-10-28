import { useMemo, useRef, useState } from 'react';
import { Box, Card, CardContent, TextField } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import PrintIcon from '@mui/icons-material/Print';
import SaveIcon from '@mui/icons-material/Save';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { type PermissionActionGroupDefinition } from '../../../../shared/components/PermissionGroup';
import { PageMessageArea } from '../../../../shared/components/PageMessageArea';
import { PageSearchArea } from '../../../../shared/components/PageSearchArea';
import type { F1GridRef } from '../../../../shared/components/f1-grid';
import { downloadExcel, todayDash } from '../../../../shared/utils/excelFile';
import type { MenuPermission, ModuleItem, PageContent } from '../../../dashboard/types/dashboard';
import { QuoteFormDialog } from './components/QuoteFormDialog';
import { QuoteGrid, createQuoteColumns } from './components/QuoteGrid';
import { useQuoteManagement } from './hooks/useQuoteManagement';
import { buildQuoteSheetHtml, filterQuotes, QUOTE_EXCEL_COLUMNS, type QuoteRow } from './utils/quote';

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

type QuoteManagementPageProps = {
  selectedModule: ModuleItem;
  currentMenuName: string;
  content: PageContent;
  breadcrumbItems?: string[];
  selectedMenuPermissions?: MenuPermission;
};

// 영업관리 > 수주관리 > 견적 (화면ID OMQuoteView, 송연 SA0003, 업체 양식은 파이썬 05-quote.js)
// 가견적을 작성 · 수정하고, 체크한 가견적을 견적서로 출력한다. 확정은 견적 창의 [확정](제품등록에서 [등록] 해야 실제로 확정된다).
// 2026-10-28 S_ERP 구조로 나눴다: 화면(이 파일) · 조회/저장(hooks/useQuoteManagement) · 그리드(components/QuoteGrid).
// 관리 칸(수정 · 확정 · 삭제)을 빼고 [상세] 칸 → 견적 창, 삭제는 오른쪽 클릭 [행 삭제] · 제목줄 [삭제] 뒤 [저장](S_ERP 메뉴관리와 같음)
export function QuoteManagementPage({ selectedModule, currentMenuName, content, breadcrumbItems, selectedMenuPermissions }: QuoteManagementPageProps) {
  const management = useQuoteManagement();
  const gridRef = useRef<F1GridRef<QuoteRow>>(null);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const permissions = {
    read: Boolean(selectedMenuPermissions?.read),
    create: Boolean(selectedMenuPermissions?.create),
    delete: Boolean(selectedMenuPermissions?.delete),
    excel: Boolean(selectedMenuPermissions?.excel || selectedMenuPermissions?.read),
  };
  const columns = useMemo(() => createQuoteColumns(management.openDetail), [management.openDetail]);
  const visible = useMemo(() => filterQuotes(management.quotes, search), [management.quotes, search]);
  const selected = useMemo(() => visible.filter((row) => selectedIds.includes(row.quoteId)), [visible, selectedIds]);

  // 송연 quote-excel-btn: 목록 전체
  const exportExcel = async () => {
    try {
      await downloadExcel(management.quotes, QUOTE_EXCEL_COLUMNS, `견적_${todayDash()}.xlsx`, '견적');
    } catch (requestError) {
      management.setError(errorText(requestError, '엑셀을 만들지 못했어요'));
    }
  };

  // 송연 quote-print-btn: 체크한 가견적으로 A4 견적서를 새 창에 띄운다(그 창에서 인쇄)
  const printQuotes = () => {
    if (selected.length === 0) return;
    const win = window.open('', '_blank');
    if (!win) {
      management.setError('새 창을 열 수 없어요. 브라우저의 팝업 차단을 풀어주세요.');
      return;
    }
    win.document.write(buildQuoteSheetHtml(selected, new Date(), `${window.location.origin}/company_seal.png`));
    win.document.close();
  };

  const pageActionGroups: PermissionActionGroupDefinition[] = [
    {
      key: 'read',
      actions: [
        { label: '엑셀 다운로드', icon: FileDownloadIcon, visible: permissions.excel, onClick: () => void exportExcel() },
        {
          label: `선택 견적서 출력 (${selected.length})`, icon: PrintIcon,
          visible: permissions.read, disabled: selected.length === 0, onClick: printQuotes,
        },
      ],
    },
    {
      key: 'write',
      actions: [
        { label: '새 가견적 작성', icon: AddIcon, visible: permissions.create, disabled: management.saving, onClick: () => void management.openForm({ kind: 'new' }) },
        // 삭제 표시한 가견적을 지운다(S_ERP 메뉴관리처럼 [삭제] · 오른쪽 클릭 [행 삭제] 뒤 [저장])
        {
          label: '저장', icon: SaveIcon, visible: permissions.delete,
          disabled: management.deletedCount === 0 || management.saving || management.loading,
          onClick: () => {
            const grid = gridRef.current;
            if (grid) void management.saveDeletes(grid.getChanges());
          },
        },
      ],
    },
    {
      key: 'delete',
      actions: [
        {
          label: '삭제', icon: DeleteIcon, visible: permissions.delete,
          disabled: selected.length === 0 || management.saving,
          onClick: () => gridRef.current?.deleteSelectedRows(),
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
            placeholder="제품명 · 거래처명 검색"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              // 송연과 같이 목록을 다시 그리면(검색) 체크가 풀린다
              setSelectedIds([]);
              gridRef.current?.clearSelection();
            }}
            slotProps={{ htmlInput: { 'aria-label': '가견적 검색' } }}
            sx={(theme) => ({ width: '100%', ...searchFieldSx(theme) })}
          />
        }
        onDefaultSearch={() => void management.reload()}
      >

      </PageSearchArea>
      <PageMessageArea message={management.error} onClose={() => management.setError('')} />
      <PageMessageArea message={management.notice} severity="success" onClose={() => management.setNotice('')} />
      <Box sx={{ p: { xs: 1.5, sm: 1 }, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Card sx={{ borderRadius: 1, border: '1px solid rgba(148,163,184,0.18)', boxShadow: 'none', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <CardContent sx={{ p: 2, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', '&:last-child': { pb: 2 } }}>
            <QuoteGrid
              rows={visible}
              columns={columns}
              loading={management.loading}
              canDelete={permissions.delete && !management.saving}
              gridKey={management.gridKey}
              gridRef={gridRef}
              onSelectionChange={setSelectedIds}
              onChangesChange={management.handleChangesChange}
              onAddRow={permissions.create && !management.saving ? () => void management.openForm({ kind: 'new' }) : undefined}
            />
          </CardContent>
        </Card>
      </Box>
      {management.formState && (
        <QuoteFormDialog
          key={JSON.stringify(management.formState.mode)}
          mode={management.formState.mode}
          initialForm={management.formState.form}
          initialRows={management.formState.rows}
          initialClientName={management.formState.clientName}
          initialStorageNm={management.formState.storageNm}
          packagingTypes={management.packagingTypes}
          clients={management.clients}
          materials={management.materials}
          onSave={management.saveForm}
          onConfirm={permissions.create ? management.confirmForm : undefined}
          onClose={() => management.setFormState(null)}
        />
      )}
    </Box>
  );
}

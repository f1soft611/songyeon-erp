import { useMemo, useState } from 'react';
import { Box, Card, TextField, Typography } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import MoveToInboxIcon from '@mui/icons-material/MoveToInbox';
import SaveIcon from '@mui/icons-material/Save';
import SearchIcon from '@mui/icons-material/Search';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { type PermissionActionGroupDefinition } from '../../../../shared/components/PermissionGroup';
import { PageMessageArea } from '../../../../shared/components/PageMessageArea';
import { PageSearchArea } from '../../../../shared/components/PageSearchArea';
import { toPageSearchFields, type PageSearchFieldValue } from '../../../../shared/components/page-search/searchFields';
import { UnsavedChangesConfirmDialog } from '../../../../shared/components/UnsavedChangesConfirmDialog';
import { ConfirmDialog } from '../../../../shared/components/ConfirmDialog';
import { LabelPrintDialog } from '../../../../shared/components/LabelPrintDialog';
import type { MenuPermission, ModuleItem, PageContent } from '../../../dashboard/types/dashboard';
import { formatTotal } from '../../../sales/order/order-register/utils/salesOrder';
import { ProdConfirmGrid, createProdConfirmColumns } from './components/ProdConfirmGrid';
import { ProdConfirmImportDialog } from './components/ProdConfirmImportDialog';
import { useProdConfirmManagement } from './hooks/useProdConfirmManagement';
import { scheduleSummary } from './utils/prodConfirm';

const textOf = (value: PageSearchFieldValue | undefined) => (typeof value === 'string' ? value : '');

type ProdConfirmManagementPageProps = {
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

// 생산관리 > 생산계획 > 생산확정 (화면ID PPProdConfirmView, 송연 PD0001)
// 수주에서 가져온 건을 실제 생산으로 확정한다. 확정하면 로트번호가 붙고 배합비대로 원재료가 빠진다.
export function ProdConfirmManagementPage({
  selectedModule,
  currentMenuName,
  content,
  breadcrumbItems,
  selectedMenuPermissions,
}: ProdConfirmManagementPageProps) {
  const management = useProdConfirmManagement();
  const { clients, products, version, date } = management;
  const columns = useMemo(() => createProdConfirmColumns({
    clients,
    products,
    onConfirm: (key) => void management.confirmRow(key),
    onBatchSheet: (row) => void management.openBatchSheet(row),
    onLabel: (row) => void management.openLabel(row),
  }),
    // 단추는 누를 때 표의 값을 다시 읽으므로, 표를 새로 그릴 때(version) 함께 새로 만든다
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [clients, products, version, date]);
  const detailFields = useMemo(() => toPageSearchFields(columns), [columns]);
  // 상세 조회(⌄) 거래처 · 품목코드/명: 고치는 중인 값(detailValues)과 [조회]로 적용한 값(appliedDetailValues, 조건 칩)
  // 돌아온 경우 마지막으로 조회한 조건을 칩으로 다시 보인다(2026-11-04)
  const [detailValues, setDetailValues] = useState<Record<string, PageSearchFieldValue>>(management.savedDetailValues);
  const [appliedDetailValues, setAppliedDetailValues] = useState<Record<string, PageSearchFieldValue>>(management.savedDetailValues);
  const summary = scheduleSummary(management.rows);

  const pageActionGroups: PermissionActionGroupDefinition[] = [
    {
      key: 'read',
      actions: [
        {
          label: '조회',
          icon: SearchIcon,
          visible: Boolean(selectedMenuPermissions?.read),
          disabled: management.loading,
          onClick: management.search,
        },
        {
          label: '엑셀 다운로드',
          icon: FileDownloadIcon,
          visible: Boolean(selectedMenuPermissions?.excel || selectedMenuPermissions?.read),
          onClick: () => void management.exportExcel(),
        },
      ],
    },
    {
      key: 'write',
      actions: [
        {
          label: '수주등록 가져오기',
          icon: MoveToInboxIcon,
          visible: Boolean(selectedMenuPermissions?.create),
          onClick: () => management.setImportOpen(true),
        },
        // 2026-10-26 고른 줄을 표에서 뺀다(지우기는 [저장] 때). 실생산량이 적힌 건은 안 된다
        {
          label: '삭제',
          icon: DeleteIcon,
          visible: Boolean(selectedMenuPermissions?.delete),
          disabled: management.saving,
          onClick: management.removeSelected,
        },
        // 2026-10-26 고친 확정 줄 · 지운 줄을 한 번에 보낸다(새 줄은 줄의 [확정])
        {
          label: '저장',
          icon: SaveIcon,
          visible: Boolean(selectedMenuPermissions?.update || selectedMenuPermissions?.delete || selectedMenuPermissions?.create),
          disabled: !management.dirty || management.saving,
          onClick: management.askSave,
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
            type="date"
            size="small"
            margin="none"
            value={date}
            onChange={(event) => management.setDate(event.target.value)}
            slotProps={{ htmlInput: { 'aria-label': '생산일자' } }}
            sx={(theme) => ({ width: { xs: '100%', sm: 200 }, ...searchFieldSx(theme) })}
          />
        }
        onDefaultSearch={management.search}
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
      <PageMessageArea message={management.notice} severity="success" onClose={() => management.setNotice('')} />
      <Box sx={{ p: 1, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Card sx={cardSx}>
          <ProdConfirmGrid
            rows={management.rows}
            columns={columns}
            loading={management.loading}
            gridKey={version}
            gridRef={management.gridRef}
            canDelete={Boolean(selectedMenuPermissions?.delete)}
            deleteMenuDisabled={management.selectionLocked}
            onSelectionChange={management.changeSelection}
            onChangesChange={() => management.handleGridChanges(Boolean(selectedMenuPermissions?.delete))}
          />
          {/* 합계는 화면에 보이는 줄로 센다(확정 전 줄 포함) */}
          <Typography variant="body2" sx={{ mt: 1, textAlign: 'right', color: 'text.secondary' }}>
            생산품목수량: <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>{summary.count}건</Box>
            &nbsp;&nbsp;·&nbsp;&nbsp;
            총생산량: <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>{formatTotal(summary.total)}kg</Box>
          </Typography>
        </Card>
      </Box>
      {management.importOpen && (
        <ProdConfirmImportDialog
          targetDate={date}
          alreadyPulled={management.rows.map((row) => row.sourceOrderId).filter((id): id is number => Boolean(id))}
          onPull={management.pullOrders}
          onGotoOrder={management.gotoOrder}
          onAlert={(message) => management.setAlertText(message)}
          onClose={() => management.setImportOpen(false)}
        />
      )}
      <ConfirmDialog
        open={management.alertText != null}
        title="생산확정"
        message={management.alertText ?? ''}
        alertOnly
        onCancel={() => management.setAlertText(null)}
        onConfirm={() => management.setAlertText(null)}
      />
      <ConfirmDialog
        open={management.confirmDelete > 0}
        title="생산확정 삭제"
        message={`생산확정 ${management.confirmDelete}건을 지우고 저장할까요? 빠졌던 원재료 재고는 되돌려집니다.`}
        confirmLabel="삭제하고 저장"
        danger
        onCancel={() => management.setConfirmDelete(0)}
        onConfirm={() => {
          management.setConfirmDelete(0);
          void management.saveAll();
        }}
      />
      <UnsavedChangesConfirmDialog
        open={Boolean(management.confirmLeave)}
        title="저장하지 않은 변경사항"
        description="저장 · 확정하지 않은 변경을 버리고 목록을 다시 불러오시겠습니까?"
        cancelLabel="취소"
        continueLabel="계속"
        onCancel={() => management.setConfirmLeave(null)}
        onContinue={() => {
          const action = management.confirmLeave;
          management.setConfirmLeave(null);
          action?.();
        }}
      />
      <LabelPrintDialog target={management.labelFor} onClose={management.closeLabel} />
    </Box>
  );
}

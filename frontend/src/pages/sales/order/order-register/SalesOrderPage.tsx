import { useCallback, useMemo, useState } from 'react';
import { Box, Card, TextField, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import SaveIcon from '@mui/icons-material/Save';
import SearchIcon from '@mui/icons-material/Search';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { type PermissionActionGroupDefinition } from '../../../../shared/components/PermissionGroup';
import { PageMessageArea } from '../../../../shared/components/PageMessageArea';
import { PageSearchArea } from '../../../../shared/components/PageSearchArea';
import { toPageSearchFields, type PageSearchFieldValue } from '../../../../shared/components/page-search/searchFields';
import { UnsavedChangesConfirmDialog } from '../../../../shared/components/UnsavedChangesConfirmDialog';
import { ConfirmDialog } from '../../../../shared/components/ConfirmDialog';
import { MasterPickerDialog } from '../../../../shared/components/master-picker/MasterPickerDialog';
import type { MasterPickerOption } from '../../../../shared/components/master-picker/masterPicker.types';
import type { MenuPermission, ModuleItem, PageContent } from '../../../dashboard/types/dashboard';
import { SalesOrderGrid, createSalesOrderColumns } from './components/SalesOrderGrid';
import { useSalesOrderManagement } from './hooks/useSalesOrderManagement';
import type { OrderRow } from './types/salesOrder.types';
import { clientPickerOptions, formatTotal, productPickerOptions } from './utils/salesOrder';

type SalesOrderPageProps = {
  selectedModule: ModuleItem;
  currentMenuName: string;
  content: PageContent;
  breadcrumbItems?: string[];
  selectedMenuPermissions?: MenuPermission;
};

const textOf = (value: PageSearchFieldValue | undefined) => (typeof value === 'string' ? value : '');

const searchFieldSx = (theme: { palette: { mode: string } }) => ({
  height: 40,
  '& .MuiOutlinedInput-root': {
    height: '100%',
    borderRadius: '0 8px 8px 0',
    backgroundColor: theme.palette.mode === 'dark' ? 'rgba(15, 23, 42, 0.72)' : 'rgba(255,255,255,0.72)',
  },
});

export function SalesOrderPage({
  selectedModule,
  currentMenuName,
  content,
  breadcrumbItems,
  selectedMenuPermissions,
}: SalesOrderPageProps) {
  const management = useSalesOrderManagement();
  const [clientPicker, setClientPicker] = useState<{ apply: (changes: Partial<OrderRow>) => void } | null>(null);
  const [productPicker, setProductPicker] = useState<{ apply: (changes: Partial<OrderRow>) => void } | null>(null);
  // 상세 조회(⌄): 고치는 중인 값과 [조회]로 적용한 값(조건 칩)
  // 돌아온 경우 마지막으로 조회한 조건을 칩으로 다시 보인다(2026-11-04)
  const [detailValues, setDetailValues] = useState<Record<string, PageSearchFieldValue>>(management.savedDetailValues);
  const [appliedDetailValues, setAppliedDetailValues] = useState<Record<string, PageSearchFieldValue>>(management.savedDetailValues);

  const permissions = {
    read: Boolean(selectedMenuPermissions?.read),
    excel: Boolean(selectedMenuPermissions?.excel || selectedMenuPermissions?.read),
    create: Boolean(selectedMenuPermissions?.create),
    delete: Boolean(selectedMenuPermissions?.delete),
    save: Boolean(selectedMenuPermissions?.create || selectedMenuPermissions?.update || selectedMenuPermissions?.delete),
  };
  const columns = useMemo(() => createSalesOrderColumns({
    flashId: management.flashId,
    onPickClient: (_row, apply) => setClientPicker({ apply }),
    onPickProduct: (_row, apply) => setProductPicker({ apply }),
  }), [management.flashId]);
  const detailFields = useMemo(() => toPageSearchFields(columns), [columns]);
  const searchClients = useCallback(
    async (keyword: string): Promise<MasterPickerOption[]> => clientPickerOptions(management.clients, keyword),
    [management.clients],
  );
  const searchProducts = useCallback(
    async (keyword: string): Promise<MasterPickerOption[]> => productPickerOptions(management.products, keyword),
    [management.products],
  );

  const pageActionGroups: PermissionActionGroupDefinition[] = [
    {
      key: 'read',
      actions: [
        {
          label: '조회',
          icon: SearchIcon,
          visible: permissions.read,
          disabled: management.loading,
          onClick: management.reload
        },
        {
          label: '엑셀 다운로드',
          icon: FileDownloadIcon,
          visible: permissions.excel,
          onClick: () => void management.exportExcel()
        },
      ],
    },
    {
      key: 'write',
      actions: [
        {
          label: '수주 추가',
          icon: AddIcon,
          visible: permissions.create,
          onClick: management.addRow
        },
        {
          label: '삭제',
          icon: DeleteIcon,
          visible: permissions.delete,
          disabled: management.saving,
          onClick: management.removeSelected
        },
        {
          label: '저장',
          icon: SaveIcon,
          visible: permissions.save,
          disabled: !management.dirty || management.saving,
          onClick: management.askSave
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
            value={management.date}
            onChange={(event) => management.setDate(event.target.value)}
            slotProps={{ htmlInput: { 'aria-label': '수주일' } }}
            sx={(theme) => ({ width: { xs: '100%', sm: 200 }, ...searchFieldSx(theme) })}
          />
        }
        onDefaultSearch={management.reload}
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
      <Box sx={{ p: 1, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Card sx={{ borderRadius: 1, border: '1px solid rgba(148,163,184,0.18)', boxShadow: 'none', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', p: 1.5 }}>
          <SalesOrderGrid
            rows={management.rows}
            columns={columns}
            loading={management.loading}
            gridKey={management.version}
            gridRef={management.gridRef}
            canCreate={permissions.create}
            canDelete={permissions.delete}
            deleteMenuDisabled={management.selectionHasImported}
            createRow={management.createRow}
            onSelectionChange={management.handleSelectionChange}
            onChangesChange={() => management.handleGridChanges(permissions.delete)}
          />
          <Typography variant="body2" sx={{ mt: 1, textAlign: 'right', color: 'text.secondary' }}>
            수주품목수량: <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>{management.summary.count}건</Box>
            &nbsp;&nbsp;·&nbsp;&nbsp;
            총수주량: <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>{formatTotal(management.summary.total)}kg</Box>
          </Typography>
        </Card>
      </Box>
      <MasterPickerDialog
        label="거래처"
        open={clientPicker !== null}
        search={searchClients}
        onClose={() => setClientPicker(null)}
        onChange={(option) => {
          clientPicker?.apply({ clientCode: option.code, clientName: option.name });
          setClientPicker(null);
        }}
      />
      <MasterPickerDialog
        label="품목"
        open={productPicker !== null}
        search={searchProducts}
        onClose={() => setProductPicker(null)}
        onChange={(option) => {
          productPicker?.apply({ productCode: option.code, productName: option.name });
          setProductPicker(null);
        }}
      />
      <ConfirmDialog
        open={Boolean(management.alertState)}
        title="수주등록"
        message={management.alertState?.message ?? ''}
        alertOnly
        onCancel={management.closeAlert}
        onConfirm={management.closeAlert}
      />
      <ConfirmDialog
        open={management.confirmDelete > 0}
        title="수주 삭제"
        message={`수주 ${management.confirmDelete}건을 지우고 저장할까요?`}
        confirmLabel="삭제하고 저장"
        danger
        onCancel={management.cancelDelete}
        onConfirm={management.confirmDeleteAndSave}
      />
      <UnsavedChangesConfirmDialog
        open={Boolean(management.confirmLeave)}
        title="저장하지 않은 변경사항"
        description="변경사항을 버리고 목록을 다시 불러오시겠습니까?"
        cancelLabel="취소"
        continueLabel="계속"
        onCancel={management.cancelLeave}
        onContinue={management.continueLeave}
      />
    </Box>
  );
}

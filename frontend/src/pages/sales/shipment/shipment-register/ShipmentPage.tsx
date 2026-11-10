import { useCallback, useMemo, useRef, useState } from 'react';
import { Box, Card, TextField, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
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
import { MasterPickerDialog } from '../../../../shared/components/master-picker/MasterPickerDialog';
import type { MasterPickerOption } from '../../../../shared/components/master-picker/masterPicker.types';
import type { MenuPermission, ModuleItem, PageContent } from '../../../dashboard/types/dashboard';
import { clientPickerOptions, productPickerOptions } from '../../order/order-register/utils/salesOrder';
import { LotPickDialog } from './components/LotPickDialog';
import { OrderImportDialog } from './components/OrderImportDialog';
import { ShipmentGrid, createShipmentColumns } from './components/ShipmentGrid';
import { useShipmentManagement } from './hooks/useShipmentManagement';
import type { ShipmentRow } from './types/shipment.types';

type ShipmentPageProps = {
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

// 영업관리 > 출하관리 > 출하등록 (송연 SA0005)
// 출고일을 골라 그날 나가는 출하를 표 안에서 등록하고 제목줄 [저장]으로 한 번에 보낸다.
// 2026-10-29 S_ERP 구조로 나눴다: 화면(이 파일) · 조회/저장(hooks/useShipmentManagement) · 그리드(components/ShipmentGrid) · 타입(types).
// 거래처 · 품목은 [선택] → 고르기 팝업으로 고르고 코드로 저장한다(2026-10-29). 상세 조회(⌄)는 거래처 · 품목코드/명
export function ShipmentPage({
  selectedModule,
  currentMenuName,
  content,
  breadcrumbItems,
  selectedMenuPermissions,
}: ShipmentPageProps) {
  const management = useShipmentManagement();
  const [clientPicker, setClientPicker] = useState<{ apply: (changes: Partial<ShipmentRow>) => void } | null>(null);
  const [productPicker, setProductPicker] = useState<{ apply: (changes: Partial<ShipmentRow>) => void } | null>(null);
  // 상세 조회(⌄): 고치는 중인 값과 [조회]로 적용한 값(조건 칩)
  // 돌아온 경우 마지막으로 조회한 조건을 칩으로 다시 보인다(2026-11-04)
  const [detailValues, setDetailValues] = useState<Record<string, PageSearchFieldValue>>(management.savedDetailValues);
  const [appliedDetailValues, setAppliedDetailValues] = useState<Record<string, PageSearchFieldValue>>(management.savedDetailValues);
  // 로트선택 단추는 누를 때 표의 값을 다시 읽으므로, 칸은 표를 새로 그릴 때(version)만 새로 만들고 단추는 마지막 함수를 부른다
  const openLotRef = useRef(management.openLot);
  openLotRef.current = management.openLot;

  const permissions = {
    read: Boolean(selectedMenuPermissions?.read),
    excel: Boolean(selectedMenuPermissions?.excel || selectedMenuPermissions?.read),
    create: Boolean(selectedMenuPermissions?.create),
    delete: Boolean(selectedMenuPermissions?.delete),
    save: Boolean(selectedMenuPermissions?.create || selectedMenuPermissions?.update || selectedMenuPermissions?.delete),
  };
  const columns = useMemo(() => createShipmentColumns({
    onOpenLot: (key) => void openLotRef.current(key),
    onPickClient: (_row, apply) => setClientPicker({ apply }),
    onPickProduct: (_row, apply) => setProductPicker({ apply }),
  }), []);
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
        { label: '조회', icon: SearchIcon, visible: permissions.read, disabled: management.loading, onClick: management.reload },
        { label: '엑셀 다운로드', icon: FileDownloadIcon, visible: permissions.excel, onClick: () => void management.exportExcel() },
      ],
    },
    {
      key: 'write',
      actions: [
        { label: '수주등록 가져오기', icon: MoveToInboxIcon, visible: permissions.create, onClick: management.openImport },
        { label: '출하 추가', icon: AddIcon, visible: permissions.create, onClick: () => management.addRows() },
        // 2026-10-23 고른 줄을 표에서 뺀다(지우기는 [저장] 때). 출하확정 · 생산연동 줄은 안 된다
        { label: '삭제', icon: DeleteIcon, visible: permissions.delete, disabled: management.saving, onClick: management.removeSelected },
        // 2026-10-23 새 줄 · 고친 출하량 · 지운 줄을 한 번에 보낸다
        { label: '저장', icon: SaveIcon, visible: permissions.save, disabled: !management.dirty || management.saving, onClick: management.askSave },
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
            slotProps={{ htmlInput: { 'aria-label': '출하일' } }}
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
          {!management.loading && management.rows.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>이 날짜에 등록된 출하 예정이 없습니다</Typography>
          )}
          <ShipmentGrid
            rows={management.rows}
            columns={columns}
            loading={management.loading}
            gridKey={management.version}
            gridRef={management.gridRef}
            canCreate={permissions.create}
            canDelete={permissions.delete}
            deleteMenuDisabled={management.selectionLocked}
            createRow={management.createRow}
            onSelectionChange={management.handleSelectionChange}
            onChangesChange={() => management.handleGridChanges(permissions.delete)}
          />
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
      {management.lotPick && (
        <LotPickDialog
          productName={management.lotPick.productName}
          lots={management.lotPick.lots}
          orders={management.lotPick.orders}
          alloc={management.lotPick.alloc}
          onPick={management.pickLot}
          onSaveAlloc={management.saveAlloc}
          onClose={management.closeLotPick}
          onAlert={management.alert}
        />
      )}
      {management.importOpen && (
        <OrderImportDialog
          start={management.importStart}
          end={management.importEnd}
          setStart={management.setImportStart}
          setEnd={management.setImportEnd}
          load={management.fetchImportOrders}
          onPull={(orders) => management.addRows(orders)}
          onClose={management.closeImport}
          onAlert={management.alert}
        />
      )}
      <ConfirmDialog
        open={Boolean(management.alertState)}
        title="출하등록"
        message={management.alertState?.message ?? ''}
        alertOnly
        onCancel={management.closeAlert}
        onConfirm={management.closeAlert}
      />
      <ConfirmDialog
        open={management.confirmDelete > 0}
        title="출하 삭제"
        message={`출하 ${management.confirmDelete}건을 지우고 저장할까요?`}
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

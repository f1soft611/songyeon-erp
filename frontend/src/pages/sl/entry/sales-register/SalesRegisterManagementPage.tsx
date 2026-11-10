import { useCallback, useMemo, useRef, useState } from 'react';
import { Box, Card, TextField, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck';
import SaveIcon from '@mui/icons-material/Save';
import SearchIcon from '@mui/icons-material/Search';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { type PermissionActionGroupDefinition } from '../../../../shared/components/PermissionGroup';
import { PageMessageArea } from '../../../../shared/components/PageMessageArea';
import { PageSearchArea } from '../../../../shared/components/PageSearchArea';
import { UnsavedChangesConfirmDialog } from '../../../../shared/components/UnsavedChangesConfirmDialog';
import { toPageSearchFields, type PageSearchFieldValue } from '../../../../shared/components/page-search/searchFields';
import { ConfirmDialog } from '../../../../shared/components/ConfirmDialog';
import { MasterPickerDialog } from '../../../../shared/components/master-picker/MasterPickerDialog';
import type { MasterPickerOption } from '../../../../shared/components/master-picker/masterPicker.types';
import type { F1GridChanges, F1GridRef, F1GridValidationError } from '../../../../shared/components/f1-grid';
import { todayDash } from '../../../../shared/utils/excelFile';
import { restoreBlockedGridDeletes } from '../../../../shared/utils/gridDelete';
import { readSearchSession, saveSearchSession } from '../../../../shared/utils/searchSession';
import type { MenuPermission, ModuleItem, PageContent } from '../../../dashboard/types/dashboard';
import { clientPickerOptions, productPickerOptions } from '../../../sales/order/order-register/utils/salesOrder';
import { SalesRegisterGrid, createSalesRegisterColumns } from './components/SalesRegisterGrid';
import { useSalesRegisterManagement } from './hooks/useSalesRegisterManagement';
import { monthStart, summaryText, type ShippableRow } from './utils/salesRegister';

type SalesRegisterManagementPageProps = {
  selectedModule: ModuleItem;
  currentMenuName: string;
  content: PageContent;
  breadcrumbItems?: string[];
  selectedMenuPermissions?: MenuPermission;
};

type PickerState = { apply: (changes: Partial<ShippableRow>) => void } | null;

const cardSx = { borderRadius: 1, border: '1px solid rgba(148,163,184,0.18)', boxShadow: 'none', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', p: 1.5 };
const searchFieldSx = (theme: { palette: { mode: string } }) => ({
  height: 40,
  '& .MuiOutlinedInput-root': {
    height: '100%',
    borderRadius: '0 8px 8px 0',
    backgroundColor: theme.palette.mode === 'dark' ? 'rgba(15, 23, 42, 0.72)' : 'rgba(255,255,255,0.72)',
  },
});

// 판매일자는 서버에 꼭 필요한 기간 조건이라 이번 달 1일~오늘로 시작한다(필수 칸, 칩에서 지울 수 없음)
const defaultDetailValues = (): Record<string, PageSearchFieldValue> => ({ saleDate: { from: monthStart(), to: todayDash() } });

// 상세 조회 값을 조회 조건으로 바꾼다(거래처는 검색칸)
const toQuery = (values: Record<string, PageSearchFieldValue>, client: string) => {
  const range = values.saleDate && typeof values.saleDate === 'object' ? values.saleDate : {};
  const product = typeof values.productName === 'string' ? values.productName : '';
  return { start: range.from ?? '', end: range.to ?? '', client, product };
};

// 판매관리 > 판매처리 > 판매등록 (화면ID ENSalesRegisterView, 송연 #screen-sales-register · 36-sales.js, 2026-09-09 관리부 요청)
// 출하확정된 것을 끌어와 판매로 남기거나, 출하 없이 판 것을 직접 적는다.
// 한 번 적으면 출하 쪽이 바뀌어도 그대로 남는다 — 팔았다는 사실은 나중에 출하를 취소한다고 없던 일이 되지 않는다.
// 2026-11-02 표준에 맞췄다: 화면(이 파일) · 조회/저장(hooks) · 그리드(components), 판매일자는 상세 조회(⌄), 직접 등록은 내장 상세 창.
export function SalesRegisterManagementPage({
  selectedModule,
  currentMenuName,
  content,
  breadcrumbItems,
  selectedMenuPermissions,
}: SalesRegisterManagementPageProps) {
  const [defaults] = useState(defaultDetailValues);
  // 2026-11-04 마지막으로 조회한 조건(거래처 · 상세 조회)은 탭 세션에 두고, 다른 화면에 갔다 돌아오면 그 조건으로 다시 부른다
  const [saved] = useState(() => readSearchSession('sl-sales-register', { keyword: '', detailValues: defaults }, { keyword: '', detailValues: {} }));
  const management = useSalesRegisterManagement(toQuery(saved.detailValues, saved.keyword));
  const { clients, products } = management;
  const gridRef = useRef<F1GridRef<ShippableRow>>(null);
  const [client, setClient] = useState(saved.keyword);
  const [detailValues, setDetailValues] = useState<Record<string, PageSearchFieldValue>>(saved.detailValues);
  const [appliedDetailValues, setAppliedDetailValues] = useState<Record<string, PageSearchFieldValue>>(saved.detailValues);
  const [clientPicker, setClientPicker] = useState<PickerState>(null);
  const [productPicker, setProductPicker] = useState<PickerState>(null);
  // 저장하지 않은 새 줄을 버려도 되는지 묻는 동안 기다리는 조회 조건
  const [pendingReload, setPendingReload] = useState<Record<string, PageSearchFieldValue> | null>(null);
  const permitted = Boolean(selectedMenuPermissions?.create);
  const canCreate = permitted && !management.saving;

  const columns = useMemo(() => createSalesRegisterColumns({
    canCreate,
    onPickClient: (_row, apply) => setClientPicker({ apply }),
    onPickProduct: (_row, apply) => setProductPicker({ apply }),
  }), [canCreate]);
  const detailFields = useMemo(() => toPageSearchFields(columns), [columns]);

  const searchClients = useCallback(
    async (keyword: string): Promise<MasterPickerOption[]> => clientPickerOptions(clients, keyword),
    [clients],
  );
  const searchProducts = useCallback(
    async (keyword: string): Promise<MasterPickerOption[]> => productPickerOptions(products, keyword),
    [products],
  );

  const reload = (values: Record<string, PageSearchFieldValue>) => {
    setAppliedDetailValues(values);
    saveSearchSession('sl-sales-register', { keyword: client, detailValues: values });
    void management.loadRows(toQuery(values, client));
  };
  // 저장하지 않은 새 줄이 있으면 먼저 묻는다
  const requestReload = (values = appliedDetailValues) => (management.hasChanges ? setPendingReload(values) : reload(values));

  const handleSave = () => {
    const grid = gridRef.current;
    if (!grid) return;
    // 걸린 이유는 handleValidationErrors 가 보여 준다
    if (!grid.validate()) return;
    void management.saveManual(grid.getChanges());
  };

  // 판매등록은 저장된 줄을 지우지 않는다. Delete 키로 표에서 빠진 줄은 되살리고 알린다(저장 전 새 줄은 지워도 된다)
  const handleGridChanges = (changes: F1GridChanges<ShippableRow>) => {
    if (restoreBlockedGridDeletes(gridRef.current, false, () => false).length > 0) {
      management.setAlertText('이 화면에서는 줄을 지울 수 없어요. 등록한 판매는 판매현황에서 지워주세요.');
      return;
    }
    management.handleChangesChange(changes);
  };

  const handleValidationErrors = (errors: F1GridValidationError[]) => {
    management.setError([...new Set(errors.map((error) => error.message))].join('\n'));
  };

  const pageActionGroups: PermissionActionGroupDefinition[] = [
    {
      key: 'read',
      actions: [
        {
          label: '조회',
          icon: SearchIcon,
          visible: Boolean(selectedMenuPermissions?.read),
          disabled: management.loading || management.saving,
          onClick: () => requestReload()
        },
      ],
    },
    {
      key: 'write',
      actions: [
        // [직접 등록]: 오른쪽 클릭 [행 추가]와 같은 내장 상세 창을 연다
        {
          label: '직접 등록',
          icon: AddIcon,
          visible: permitted,
          disabled: management.loading || management.saving,
          onClick: () => gridRef.current?.addRow()
        },
        {
          label: '선택 항목 판매등록',
          icon: PlaylistAddCheckIcon,
          visible: permitted,
          disabled: management.saving,
          onClick: () => void management.pull(gridRef.current?.getSelectedRows() ?? [])
        },
        {
          label: '저장',
          icon: SaveIcon,
          visible: permitted,
          disabled: !management.hasChanges || management.saving,
          onClick: handleSave
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
            placeholder="거래처코드/거래처명 검색"
            autoComplete="off"
            value={client}
            onChange={(event) => setClient(event.target.value)}
            slotProps={{ htmlInput: { 'aria-label': '거래처코드/거래처명 검색' } }}
            sx={(theme) => ({ width: '100%', ...searchFieldSx(theme) })}
          />
        }
        onDefaultSearch={() => requestReload()}
        detailFields={detailFields}
        detailValues={detailValues}
        appliedDetailValues={appliedDetailValues}
        defaultValues={defaults}
        onDetailValuesChange={setDetailValues}
        onDetailSearch={requestReload}
        detailLoading={management.loading}
      />
      <PageMessageArea message={management.error} onClose={() => management.setError('')} />
      <PageMessageArea message={management.notice} severity="success" onClose={() => management.setNotice('')} />
      <Box sx={{ p: 1, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Card sx={cardSx}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1, flexWrap: 'wrap' }}>
            {management.loaded && !management.loading && management.rows.length === 0 && (
              <Typography variant="body2" color="text.secondary">이 기간에 출하확정된 건이 없습니다</Typography>
            )}
            <Typography variant="body2" color="text.secondary">
              출하확정된 것을 체크해 판매로 남겨요. 출하 없이 판 것은 [직접 등록] 또는 오른쪽 클릭 [행 추가]로 적고 [저장]해요. 금액은 넣을 때 값으로 굳어요.
            </Typography>
            <Typography variant="body2" aria-label="판매등록 요약" sx={{ ml: 'auto', fontWeight: 700 }}>{summaryText(management.rows)}</Typography>
          </Box>
          <SalesRegisterGrid
            rows={management.rows}
            columns={columns}
            canCreate={canCreate}
            loading={management.loading}
            gridKey={management.gridKey}
            gridRef={gridRef}
            onChangesChange={handleGridChanges}
            onValidationErrors={handleValidationErrors}
          />
        </Card>
      </Box>
      <MasterPickerDialog
        label="거래처"
        open={clientPicker !== null}
        search={searchClients}
        onClose={() => setClientPicker(null)}
        onChange={(option) => {
          clientPicker?.apply({ clientName: option.name });
          setClientPicker(null);
        }}
      />
      <MasterPickerDialog
        label="품목"
        open={productPicker !== null}
        search={searchProducts}
        onClose={() => setProductPicker(null)}
        onChange={(option) => {
          productPicker?.apply({ productName: option.name });
          setProductPicker(null);
        }}
      />
      <ConfirmDialog
        open={management.alertText != null}
        title="판매등록"
        message={management.alertText ?? ''}
        alertOnly
        onCancel={() => management.setAlertText(null)}
        onConfirm={() => management.setAlertText(null)}
      />
      <UnsavedChangesConfirmDialog
        open={pendingReload !== null}
        title="저장하지 않은 변경사항"
        description="직접 등록한 줄을 버리고 목록을 다시 불러오시겠습니까?"
        cancelLabel="취소"
        continueLabel="계속"
        onCancel={() => setPendingReload(null)}
        onContinue={() => {
          if (pendingReload) reload(pendingReload);
          setPendingReload(null);
        }}
      />
    </Box>
  );
}

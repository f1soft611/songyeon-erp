import { useCallback, useMemo, useState } from 'react';
import { Box, Button, Card, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography } from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import PaidIcon from '@mui/icons-material/Paid';
import PrintIcon from '@mui/icons-material/Print';
import SearchIcon from '@mui/icons-material/Search';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { type PermissionActionGroupDefinition } from '../../../../shared/components/PermissionGroup';
import { PageMessageArea } from '../../../../shared/components/PageMessageArea';
import { PageSearchArea } from '../../../../shared/components/PageSearchArea';
import { toPageSearchFields, type PageSearchFieldValue } from '../../../../shared/components/page-search/searchFields';
import { ConfirmDialog } from '../../../../shared/components/ConfirmDialog';
import { MasterPickerDialog } from '../../../../shared/components/master-picker/MasterPickerDialog';
import type { MasterPickerOption } from '../../../../shared/components/master-picker/masterPicker.types';
import type { MenuPermission, ModuleItem, PageContent } from '../../../dashboard/types/dashboard';
import { CharterDialog } from './components/CharterDialog';
import { ShipConfirmGrid, createShipConfirmColumns } from './components/ShipConfirmGrid';
import { useShipConfirmManagement } from './hooks/useShipConfirmManagement';
import type { ShipRow } from './types/shipConfirm.types';
import { driverPickerOptions } from './utils/shipConfirm';

const textOf = (value: PageSearchFieldValue | undefined) => (typeof value === 'string' ? value : '');

type ShipConfirmManagementPageProps = {
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

// 물류관리 > 출고관리 > 출하확정 (화면ID OBShipConfirmView, 송연 LG0002, 기존 #screen-ship-confirm · 21-logistics.js loadShipConfirmList)
// 출하등록된 건에 실출하량·배차·포장방법을 적어 확정한다. 확정하면 실출하량만큼 제품 재고가 빠지고(박스도),
// 생산입고를 건너뛴 로트는 나간 만큼 입고로 먼저 잡힌다. 열면 오늘 것을 바로 불러온다.
export function ShipConfirmManagementPage({
  selectedModule,
  currentMenuName,
  content,
  breadcrumbItems,
  selectedMenuPermissions,
}: ShipConfirmManagementPageProps) {
  const management = useShipConfirmManagement();
  const { version, sorted, packingNames, vehicleNames, drivers } = management;
  // 운행자 사원 팝업(2026-10-30): 연 줄에 이름 · 사번을 넣는 함수
  const [driverPicker, setDriverPicker] = useState<{ apply: (changes: Partial<ShipRow>) => void } | null>(null);
  const searchDrivers = useCallback(
    async (keyword: string): Promise<MasterPickerOption[]> => driverPickerOptions(drivers, keyword),
    [drivers],
  );
  const columns = useMemo(() => createShipConfirmColumns({
    sorted,
    packingNames,
    vehicleNames,
    onPickDriver: (_row, apply) => setDriverPicker({ apply }),
    onConfirm: (key) => void management.confirmRow(key),
    onUnconfirm: management.setUndoing,
  }),
    // 단추는 누를 때 표의 값을 다시 읽으므로, 표를 새로 그릴 때(version) 함께 새로 만든다
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version, sorted, packingNames, vehicleNames]);
  const detailFields = useMemo(() => toPageSearchFields(columns), [columns]);
  // 상세 조회(⌄) 거래처 · 품목코드/명: 고치는 중인 값(detailValues)과 [조회]로 적용한 값(appliedDetailValues, 조건 칩)
  // 돌아온 경우 마지막으로 조회한 조건을 칩으로 다시 보인다(2026-11-04)
  const [detailValues, setDetailValues] = useState<Record<string, PageSearchFieldValue>>(management.savedDetailValues);
  const [appliedDetailValues, setAppliedDetailValues] = useState<Record<string, PageSearchFieldValue>>(management.savedDetailValues);

  const pageActionGroups: PermissionActionGroupDefinition[] = [
    {
      key: 'read',
      actions: [
        {
          label: '조회',
          icon: SearchIcon,
          visible: Boolean(selectedMenuPermissions?.read),
          disabled: management.loading,
          onClick: () => void management.loadRows(management.date),
        },
        {
          label: '배차·순서로 정렬',
          icon: LocalShippingIcon,
          visible: Boolean(selectedMenuPermissions?.read),
          onClick: management.sortRows,
        },
        {
          label: '용차 금액 확인',
          icon: PaidIcon,
          visible: Boolean(selectedMenuPermissions?.read),
          onClick: () => management.setCharterOpen(true),
        },
        {
          label: '인쇄',
          icon: PrintIcon,
          visible: Boolean(selectedMenuPermissions?.read),
          onClick: management.openPrint,
        },
        {
          label: '엑셀 다운로드',
          icon: FileDownloadIcon,
          visible: Boolean(selectedMenuPermissions?.excel || selectedMenuPermissions?.read),
          onClick: () => void management.exportExcel(),
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
            slotProps={{ htmlInput: { 'aria-label': '출고일' } }}
            sx={(theme) => ({ width: { xs: '100%', sm: 200 }, ...searchFieldSx(theme) })}
          />
        }
        onDefaultSearch={() => void management.loadRows(management.date)}
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
        <Card sx={cardSx}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1, flexWrap: 'wrap' }}>
            {!management.loading && management.rows.length === 0 && (
              <Typography variant="body2" color="text.secondary">이 날짜에 출하등록된 건이 없습니다</Typography>
            )}
            <Typography variant="body2" color="text.secondary">
              실출하량을 적고 [확정] 하면 그만큼 제품 재고가 빠져요(박스수량이 있으면 박스도). 생산입고 전 로트는 나간 만큼 먼저 입고로 잡혀요.
            </Typography>
            {management.rows.length > 0 && (
              <Typography variant="body2" sx={{ ml: 'auto', fontWeight: 700 }}>
                확정 {management.confirmedCount} / {management.rows.length}건
              </Typography>
            )}
          </Box>
          <ShipConfirmGrid
            rows={management.shown}
            columns={columns}
            loading={management.loading}
            gridKey={version}
            gridRef={management.gridRef}
          />
        </Card>
      </Box>
      <Dialog open={management.printOpen} onClose={() => management.setPrintOpen(false)} maxWidth="xs" fullWidth aria-labelledby="ship-print-title">
        <DialogTitle id="ship-print-title">인쇄할 문서를 선택해주세요</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>현재 조회된 날짜의 출하확정 목록을 기준으로 인쇄해요.</Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button fullWidth variant="contained" onClick={() => management.print('log')}>📦 완제품출고일지</Button>
            <Button fullWidth variant="contained" onClick={() => management.print('work')}>📋 작업지시서</Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => management.setPrintOpen(false)}>닫기</Button>
        </DialogActions>
      </Dialog>
      <MasterPickerDialog
        label="사원"
        open={driverPicker !== null}
        search={searchDrivers}
        onClose={() => setDriverPicker(null)}
        onChange={(option) => {
          const driver = drivers.find((item) => item.employeeId === option.code);
          driverPicker?.apply({ inputDriverId: option.code, inputDriver: driver?.name ?? option.name });
          setDriverPicker(null);
        }}
      />
      <CharterDialog open={management.charterOpen} onClose={() => management.setCharterOpen(false)} onAlert={management.setAlertText} />
      <ConfirmDialog
        open={management.alertText != null}
        title="출하확정"
        message={management.alertText ?? ''}
        alertOnly
        onCancel={() => management.setAlertText(null)}
        onConfirm={() => management.setAlertText(null)}
      />
      <ConfirmDialog
        open={Boolean(management.pending)}
        title="재고 확인"
        message={management.pending?.message ?? ''}
        confirmLabel="확정"
        danger
        onCancel={() => management.setPending(null)}
        onConfirm={management.confirmPending}
      />
      <ConfirmDialog
        open={Boolean(management.undoing)}
        title="확정취소"
        message="확정을 취소할까요? 다시 수정할 수 있는 상태로 돌아가요."
        confirmLabel="확정취소"
        danger
        onCancel={() => management.setUndoing(null)}
        onConfirm={() => void management.unconfirm()}
      />
    </Box>
  );
}

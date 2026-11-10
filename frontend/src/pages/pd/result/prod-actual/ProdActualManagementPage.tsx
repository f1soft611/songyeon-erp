import { useMemo, useState } from 'react';
import { Box, Card, TextField, Typography } from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import SaveIcon from '@mui/icons-material/Save';
import UndoIcon from '@mui/icons-material/Undo';
import SearchIcon from '@mui/icons-material/Search';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { type PermissionActionGroupDefinition } from '../../../../shared/components/PermissionGroup';
import { PageMessageArea } from '../../../../shared/components/PageMessageArea';
import { PageSearchArea } from '../../../../shared/components/PageSearchArea';
import { toPageSearchFields, type PageSearchFieldValue } from '../../../../shared/components/page-search/searchFields';
import { ConfirmDialog } from '../../../../shared/components/ConfirmDialog';
import { UnsavedChangesConfirmDialog } from '../../../../shared/components/UnsavedChangesConfirmDialog';
import type { MenuPermission, ModuleItem, PageContent } from '../../../dashboard/types/dashboard';
import { ProdActualGrid, createProdActualColumns } from './components/ProdActualGrid';
import { useProdActualManagement } from './hooks/useProdActualManagement';
import { actualSaveMessage, cancelMessage } from './utils/prodActual';

const textOf = (value: PageSearchFieldValue | undefined) => (typeof value === 'string' ? value : '');

type ProdActualManagementPageProps = {
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

// 생산관리 > 생산실적 > 생산입고 (화면ID PRProdActualView, 송연 PD0002)
// 생산입고는 재고를 만들어내는 자리라, 제목줄 [저장] · [입고취소] 전에 건수를 보여 주고 한 번 더 묻는다(2026-10-30).
export function ProdActualManagementPage({
  selectedModule,
  currentMenuName,
  content,
  breadcrumbItems,
  selectedMenuPermissions,
}: ProdActualManagementPageProps) {
  const management = useProdActualManagement();
  const { version } = management;
  const columns = useMemo(() => createProdActualColumns(), []);
  const canSave = Boolean(selectedMenuPermissions?.create || selectedMenuPermissions?.update);

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
        // 고른 줄의 실생산량을 지우고 재고를 되돌린다
        {
          label: '입고취소',
          icon: UndoIcon,
          visible: Boolean(selectedMenuPermissions?.delete || selectedMenuPermissions?.update),
          disabled: management.saving,
          onClick: management.askCancel,
        },
        // 표에서 고친 실생산량을 한 번에 보낸다(건수 확인 창)
        {
          label: '저장',
          icon: SaveIcon,
          visible: canSave,
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
            value={management.date}
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
          {!management.loading && management.rows.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>이 날짜에 확정된 생산스케줄이 없습니다</Typography>
          )}
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            실생산량을 적고 위쪽 [저장]을 누르면 그만큼 제품 재고가 늘고(수불 원장에 기록) 연결된 필름·파우치가 빠져요. 고치면 차이만큼, 줄을 고르고 [입고취소]하면 넣었던 만큼 되돌려요.
          </Typography>
          <ProdActualGrid
            rows={management.rows}
            columns={columns}
            loading={management.loading}
            gridKey={version}
            gridRef={management.gridRef}
            onChangesChange={management.handleGridChanges}
          />
        </Card>
      </Box>
      <ConfirmDialog
        open={management.alertText != null}
        title="생산입고"
        message={management.alertText ?? ''}
        alertOnly
        onCancel={() => management.setAlertText(null)}
        onConfirm={() => management.setAlertText(null)}
      />
      <ConfirmDialog
        open={Boolean(management.confirmSave)}
        title="생산입고 저장"
        message={management.confirmSave ? actualSaveMessage(management.confirmSave.receives, management.confirmSave.updates) : ''}
        confirmLabel="저장"
        onCancel={() => management.setConfirmSave(null)}
        onConfirm={() => void management.saveAll()}
      />
      <ConfirmDialog
        open={Boolean(management.cancelTargets)}
        title="입고취소"
        message={management.cancelTargets ? cancelMessage(management.cancelTargets) : ''}
        confirmLabel="입고취소"
        danger
        onCancel={() => management.setCancelTargets(null)}
        onConfirm={() => void management.cancelSelected()}
      />
      <UnsavedChangesConfirmDialog
        open={Boolean(management.confirmLeave)}
        title="저장하지 않은 변경사항"
        description="저장하지 않은 실생산량을 버리고 목록을 다시 불러오시겠습니까?"
        cancelLabel="취소"
        continueLabel="계속"
        onCancel={() => management.setConfirmLeave(null)}
        onContinue={() => {
          const action = management.confirmLeave;
          management.setConfirmLeave(null);
          action?.();
        }}
      />
    </Box>
  );
}

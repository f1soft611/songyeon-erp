import { useEffect, useMemo, useState } from 'react';
import { Box, Card, TextField, Typography } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import NoteAddIcon from '@mui/icons-material/NoteAdd';
import SaveIcon from '@mui/icons-material/Save';
import SearchIcon from '@mui/icons-material/Search';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { type PermissionActionGroupDefinition } from '../../../../shared/components/PermissionGroup';
import { PageMessageArea } from '../../../../shared/components/PageMessageArea';
import { PageSearchArea } from '../../../../shared/components/PageSearchArea';
import type { PageSearchField, PageSearchFieldValue } from '../../../../shared/components/page-search/searchFields';
import { UnsavedChangesConfirmDialog } from '../../../../shared/components/UnsavedChangesConfirmDialog';
import { ConfirmDialog } from '../../../../shared/components/ConfirmDialog';
import { downloadExcel } from '../../../../shared/utils/excelFile';
import type { MenuPermission, ModuleItem, PageContent } from '../../../dashboard/types/dashboard';
import { useReceivingDeleteSave } from '../receiving-register/hooks/useReceivingDeleteSave';
import { fetchReceivings } from '../receiving-register/services/receiving.service';
import { RETURN_EXCEL_COLUMNS, errorText, formatMoney, periodQuery, type DayPeriod } from '../receiving-register/utils/receiving';
import { ReceivingReturnGrid, createReceivingReturnColumns } from './components/ReceivingReturnGrid';
import { ReturnDialog } from './components/ReturnDialog';
import { useReceivingReturns } from './hooks/useReceivingReturns';

type ReturnRegisterManagementPageProps = {
  selectedModule: ModuleItem;
  currentMenuName: string;
  content: PageContent;
  breadcrumbItems?: string[];
  selectedMenuPermissions?: MenuPermission;
};

const searchFieldSx = (theme: { palette: { mode: string } }) => ({
  height: 40,
  '& .MuiOutlinedInput-root': {
    height: '100%',
    borderRadius: '0 8px 8px 0',
    backgroundColor: theme.palette.mode === 'dark' ? 'rgba(15, 23, 42, 0.72)' : 'rgba(255,255,255,0.72)',
  },
});
const cardSx = { borderRadius: 1, border: '1px solid rgba(148,163,184,0.18)', boxShadow: 'none', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', p: 1.5 };

// 상세 조회(⌄)에는 반품일 기간만 나온다(오늘 ~ 오늘로 시작)
const DETAIL_FIELDS: PageSearchField[] = [{ field: 'receiveDate', label: '반품일', type: 'date', searchSpan: 2 }];
const toPeriod = (value: PageSearchFieldValue | undefined): DayPeriod =>
  value && typeof value === 'object' ? { from: value.from ?? '', to: value.to ?? '' } : { from: '', to: '' };

// 구매관리 > 입고관리 > 반품등록 (화면ID IBReturnRegisterView, 송연 #screen-recv 반품 탭 · 19-purchase.js)
// 반품은 '마이너스 입고' 다. 반품내역을 보고, 반품 등록 창으로 넣고, 줄을 골라 [삭제] · [저장]으로 지운다(뺐던 재고가 돌아온다).
// 2026-11-03 입고관리 탭에서 화면으로 나눴다. 검색줄은 거래처코드/명, 반품일은 상세 조회.
export function ReturnRegisterManagementPage({
  selectedModule,
  currentMenuName,
  content,
  breadcrumbItems,
  selectedMenuPermissions,
}: ReturnRegisterManagementPageProps) {
  const [alertText, setAlertText] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const returns = useReceivingReturns(setAlertText);
  const { period, client } = returns;
  const deleteSave = useReceivingDeleteSave(
    'return',
    { gridRef: returns.gridRef, setDirty: returns.setDirty, reload: () => returns.load(period, client) },
    setAlertText,
    setNotice,
  );
  const columns = useMemo(() => createReceivingReturnColumns(), []);
  // 상세 조회(⌄) 반품일: 고치는 중인 값(detailValues)과 [조회]로 적용한 값(조건 칩). 등록 뒤 옮긴 반품일도 칩으로 보인다
  const appliedDetailValues = useMemo<Record<string, PageSearchFieldValue>>(() => ({ receiveDate: period }), [period]);
  const [detailValues, setDetailValues] = useState<Record<string, PageSearchFieldValue>>(appliedDetailValues);
  useEffect(() => setDetailValues(appliedDetailValues), [appliedDetailValues]);

  const search = () => deleteSave.guard(() => void returns.load(period, client));
  const applyPeriod = (next: DayPeriod) => deleteSave.guard(() => {
    returns.setPeriod(next);
    void returns.load(next, client);
  });

  // 송연 반품내역 엑셀: 적용한 반품일 것(거래처 조건 없이)을 다시 받는다
  const exportExcel = async () => {
    try {
      const list = await fetchReceivings({ ...periodQuery(period.from, period.to), kind: 'return' });
      const days = [...new Set([period.from.trim(), period.to.trim()].filter(Boolean))].join('_');
      await downloadExcel(list, RETURN_EXCEL_COLUMNS, `반품내역${days ? `_${days}` : ''}.xlsx`, '반품내역');
    } catch (requestError) {
      setAlertText(errorText(requestError, '다운로드하지 못했어요'));
    }
  };

  const canDelete = Boolean(selectedMenuPermissions?.delete);
  const pageActionGroups: PermissionActionGroupDefinition[] = [
    {
      key: 'read',
      actions: [
        {
          label: '조회',
          icon: SearchIcon,
          visible: Boolean(selectedMenuPermissions?.read),
          disabled: returns.loading,
          onClick: search,
        },
        {
          label: '엑셀 다운로드',
          icon: FileDownloadIcon,
          visible: Boolean(selectedMenuPermissions?.excel || selectedMenuPermissions?.read),
          onClick: () => void exportExcel(),
        },
      ],
    },
    {
      key: 'write',
      actions: [
        {
          label: '반품 등록',
          icon: NoteAddIcon,
          visible: Boolean(selectedMenuPermissions?.create),
          onClick: () => returns.setReturnOpen(true),
        },
        {
          label: '삭제',
          icon: DeleteIcon,
          visible: canDelete,
          disabled: deleteSave.saving,
          onClick: deleteSave.removeSelected,
        },
        {
          label: '저장',
          icon: SaveIcon,
          visible: canDelete,
          disabled: deleteSave.saving || !returns.dirty,
          onClick: deleteSave.askSave,
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
      <PageMessageArea message={notice} severity="success" onClose={() => setNotice('')} />
      <PageSearchArea
        searchField={
          <TextField
            size="small"
            margin="none"
            placeholder="거래처코드/명 검색"
            value={returns.client}
            onChange={(event) => returns.setClient(event.target.value)}
            slotProps={{ htmlInput: { 'aria-label': '거래처코드/명 검색' } }}
            sx={(theme) => ({ width: '100%', ...searchFieldSx(theme) })}
          />
        }
        onDefaultSearch={search}
        detailFields={DETAIL_FIELDS}
        detailValues={detailValues}
        appliedDetailValues={appliedDetailValues}
        onDetailValuesChange={setDetailValues}
        onDetailSearch={(values) => applyPeriod(toPeriod(values.receiveDate))}
        detailLoading={returns.loading}
      />
      <Box sx={{ p: 1, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Card sx={cardSx}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 700 }}>반품내역</Typography>
            {returns.rows && !returns.loading && returns.rows.length === 0 && <Typography variant="body2" color="text.secondary">반품내역이 없습니다</Typography>}
            <Typography sx={{ ml: 'auto', fontSize: 14 }} aria-label="반품 합계금액">
              반품 합계금액 <Box component="b" sx={{ color: 'error.main' }}>{formatMoney(returns.totalAmount)}</Box>원
            </Typography>
          </Box>
          <ReceivingReturnGrid
            rows={returns.rows ?? []}
            columns={columns}
            loading={returns.loading}
            gridKey={returns.version}
            gridRef={returns.gridRef}
            canCreate={Boolean(selectedMenuPermissions?.create)}
            canDelete={canDelete}
            onAddRow={() => returns.setReturnOpen(true)}
            onChangesChange={deleteSave.refreshDirty}
          />
        </Card>
      </Box>
      <ReturnDialog
        open={returns.returnOpen}
        onClose={() => returns.setReturnOpen(false)}
        onRegistered={returns.afterRegistered}
      />
      <ConfirmDialog
        open={deleteSave.confirmDelete != null}
        title="반품 삭제"
        message={`반품 ${deleteSave.confirmDelete?.count ?? 0}건을 지우고 저장할까요? 뺐던 재고가 다시 돌아와요.`}
        confirmLabel="삭제하고 저장"
        danger
        onCancel={() => deleteSave.setConfirmDelete(null)}
        onConfirm={deleteSave.confirmSave}
      />
      <UnsavedChangesConfirmDialog
        open={Boolean(deleteSave.confirmLeave)}
        title="저장하지 않은 변경사항"
        description="변경사항을 버리고 계속하시겠습니까?"
        cancelLabel="취소"
        continueLabel="계속"
        onCancel={() => deleteSave.setConfirmLeave(null)}
        onContinue={deleteSave.continueLeave}
      />
      <ConfirmDialog
        open={alertText != null}
        title="반품등록"
        message={alertText ?? ''}
        alertOnly
        onCancel={() => setAlertText(null)}
        onConfirm={() => setAlertText(null)}
      />
    </Box>
  );
}

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
import { ReceivingDialog } from './components/ReceivingDialog';
import { ReceivingHistoryGrid, createReceivingHistoryColumns } from './components/ReceivingHistoryGrid';
import { useReceivingDeleteSave } from './hooks/useReceivingDeleteSave';
import { useReceivingHistory } from './hooks/useReceivingHistory';
import { fetchReceivings } from './services/receiving.service';
import { HISTORY_EXCEL_COLUMNS, errorText, formatMoney, periodQuery, type DayPeriod } from './utils/receiving';

type ReceivingRegisterManagementPageProps = {
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

// 상세 조회(⌄)에는 입고일 기간만 나온다(오늘 ~ 오늘로 시작)
const DETAIL_FIELDS: PageSearchField[] = [{ field: 'receiveDate', label: '입고일', type: 'date', searchSpan: 2 }];
const toPeriod = (value: PageSearchFieldValue | undefined): DayPeriod =>
  value && typeof value === 'object' ? { from: value.from ?? '', to: value.to ?? '' } : { from: '', to: '' };

// 구매관리 > 입고관리 > 입고등록 (화면ID IBReceivingRegisterView, 송연 #screen-recv · 19-purchase.js)
// 입고내역을 보고, 입고 등록 창으로 넣고, 줄을 골라 [삭제] · [저장]으로 지운다.
// 2026-11-03 입고관리 탭 네 개(입고등록 · 입고현황 · 서류등록 · 반품등록)를 화면으로 나눴다. 검색줄은 거래처코드/명, 입고일은 상세 조회.
export function ReceivingRegisterManagementPage({
  selectedModule,
  currentMenuName,
  content,
  breadcrumbItems,
  selectedMenuPermissions,
}: ReceivingRegisterManagementPageProps) {
  const [alertText, setAlertText] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const history = useReceivingHistory(setAlertText);
  const { period, client } = history;
  const deleteSave = useReceivingDeleteSave(
    'receiving',
    { gridRef: history.gridRef, setDirty: history.setDirty, reload: () => history.load(period, client) },
    setAlertText,
    setNotice,
  );
  const columns = useMemo(() => createReceivingHistoryColumns({ onError: setAlertText }), []);
  // 상세 조회(⌄) 입고일: 고치는 중인 값(detailValues)과 [조회]로 적용한 값(조건 칩). 등록 뒤 옮긴 입고일도 칩으로 보인다
  const appliedDetailValues = useMemo<Record<string, PageSearchFieldValue>>(() => ({ receiveDate: period }), [period]);
  const [detailValues, setDetailValues] = useState<Record<string, PageSearchFieldValue>>(appliedDetailValues);
  useEffect(() => setDetailValues(appliedDetailValues), [appliedDetailValues]);

  const search = () => deleteSave.guard(() => void history.load(period, client));
  const applyPeriod = (next: DayPeriod) => deleteSave.guard(() => {
    history.setPeriod(next);
    void history.load(next, client);
  });

  // 송연 입고내역 엑셀: 적용한 입고일 것(거래처 조건 없이)을 다시 받는다
  const exportExcel = async () => {
    try {
      const list = await fetchReceivings({ ...periodQuery(period.from, period.to), kind: 'receiving' });
      const days = [...new Set([period.from.trim(), period.to.trim()].filter(Boolean))].join('_');
      await downloadExcel(list, HISTORY_EXCEL_COLUMNS, `입고내역${days ? `_${days}` : ''}.xlsx`, '입고내역');
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
          disabled: history.loading,
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
          label: '입고 등록',
          icon: NoteAddIcon,
          visible: Boolean(selectedMenuPermissions?.create),
          onClick: () => history.setRegisterOpen(true),
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
          disabled: deleteSave.saving || !history.dirty,
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
            value={history.client}
            onChange={(event) => history.setClient(event.target.value)}
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
        detailLoading={history.loading}
      />
      <Box sx={{ p: { xs: 1.5, sm: 1 }, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Card sx={cardSx}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 700 }}>입고내역</Typography>
            {history.rows && !history.loading && history.rows.length === 0 && <Typography variant="body2" color="text.secondary">입고내역이 없습니다</Typography>}
            <Typography sx={{ ml: 'auto', fontSize: 14 }} aria-label="입고 합계금액">
              합계금액 <b>{formatMoney(history.totalAmount)}</b>원
            </Typography>
          </Box>
          <ReceivingHistoryGrid
            rows={history.rows ?? []}
            columns={columns}
            loading={history.loading}
            gridKey={history.version}
            gridRef={history.gridRef}
            canDelete={canDelete}
            onChangesChange={deleteSave.refreshDirty}
          />
        </Card>
      </Box>
      <ReceivingDialog
        open={history.registerOpen}
        onClose={() => history.setRegisterOpen(false)}
        onRegistered={history.afterRegistered}
      />
      <ConfirmDialog
        open={deleteSave.confirmDelete != null}
        title="입고 삭제"
        message={`입고 ${deleteSave.confirmDelete?.count ?? 0}건을 지우고 저장할까요? 재고에서 그만큼 다시 차감되고, 붙여둔 서류도 같이 지워져요.`}
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
        title="입고등록"
        message={alertText ?? ''}
        alertOnly
        onCancel={() => setAlertText(null)}
        onConfirm={() => setAlertText(null)}
      />
    </Box>
  );
}

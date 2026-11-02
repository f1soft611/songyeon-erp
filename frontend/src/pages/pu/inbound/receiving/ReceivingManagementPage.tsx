import { useMemo } from 'react';
import { Alert, Box, Card, Checkbox, FormControlLabel, MenuItem, Tab, Tabs, TextField, Typography } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import NoteAddIcon from '@mui/icons-material/NoteAdd';
import SaveIcon from '@mui/icons-material/Save';
import SearchIcon from '@mui/icons-material/Search';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { type PermissionActionGroupDefinition } from '../../../../shared/components/PermissionGroup';
import { PageMessageArea } from '../../../../shared/components/PageMessageArea';
import { PageSearchArea } from '../../../../shared/components/PageSearchArea';
import { UnsavedChangesConfirmDialog } from '../../../../shared/components/UnsavedChangesConfirmDialog';
import type { MenuPermission, ModuleItem, PageContent } from '../../../dashboard/types/dashboard';
import { ConfirmDialog } from '../../../../shared/components/ConfirmDialog';
import { ReceivingDialog } from './components/ReceivingDialog';
import { DocDetailDialog, DocUploadDialog, DocViewDialog } from './components/ReceivingDocDialogs';
import { ReceivingDocGrid, createReceivingDocColumns } from './components/ReceivingDocGrid';
import { ReceivingHistoryGrid, createReceivingHistoryColumns } from './components/ReceivingHistoryGrid';
import { ReceivingReturnGrid, createReceivingReturnColumns } from './components/ReceivingReturnGrid';
import { ReceivingStatusGrid, createReceivingStatusColumns } from './components/ReceivingStatusGrid';
import { ReturnDialog } from './components/ReturnDialog';
import { useReceivingManagement } from './hooks/useReceivingManagement';
import type { DeleteKind, Kind, TabKey } from './types/receiving.types';
import { formatMoney } from './utils/receiving';

type ReceivingManagementPageProps = {
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
const sideFieldSx = (theme: { palette: { mode: string } }) => ({
  ...searchFieldSx(theme),
  '& .MuiOutlinedInput-root': { ...searchFieldSx(theme)['& .MuiOutlinedInput-root'], borderRadius: '8px' },
});
const cardSx = { borderRadius: 1, border: '1px solid rgba(148,163,184,0.18)', boxShadow: 'none', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', p: 1.5 };
const red = { color: 'error.main' } as const;

const dateField = (value: string, onChange: (value: string) => void, label: string) => (
  <TextField
    type="date"
    size="small"
    margin="none"
    value={value}
    onChange={(event) => onChange(event.target.value)}
    slotProps={{ htmlInput: { 'aria-label': label } }}
    sx={(theme) => ({ width: 170, ...sideFieldSx(theme) })}
  />
);
const periodFields = (start: string, end: string, onStart: (v: string) => void, onEnd: (v: string) => void) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
    {dateField(start, onStart, '시작일')}
    <Typography variant="body2" color="text.secondary">~</Typography>
    {dateField(end, onEnd, '종료일')}
  </Box>
);
const textField = (value: string, onChange: (event: { target: { value: string } }) => void, label: string, main = false) => (
  <TextField
    size="small"
    margin="none"
    placeholder={label}
    value={value}
    onChange={onChange}
    slotProps={{ htmlInput: { 'aria-label': label } }}
    sx={(theme) => (main ? { width: '100%', ...searchFieldSx(theme) } : { width: { xs: '100%', sm: 180 }, ...sideFieldSx(theme) })}
  />
);

// 구매관리 > 입고관리 (송연 #screen-recv · 19-purchase.js · 37-recv-status.js)
// 탭 네 개: 입고등록(그날 입고내역 + 입고 등록 창) · 입고현황(기간 안에 들어온 것을 한 줄씩, 반품 포함)
//          · 서류등록(품목별로 묶어 입고 건마다 서류를 붙인다) · 반품등록(반품내역 + 반품 등록 창).
export function ReceivingManagementPage({
  selectedModule,
  currentMenuName,
  content,
  breadcrumbItems,
  selectedMenuPermissions,
}: ReceivingManagementPageProps) {
  const management = useReceivingManagement();
  const { tab, history, status, docs, returns, setAlertText, confirmDelete } = management;
  const { setUploadTarget, setViewTarget, openDetail } = docs;
  const historyColumns = useMemo(() => createReceivingHistoryColumns({ onError: setAlertText }), [setAlertText]);
  const statusColumns = useMemo(() => createReceivingStatusColumns(), []);
  const docColumns = useMemo(
    () => createReceivingDocColumns({ onUpload: setUploadTarget, onView: setViewTarget, onDetail: openDetail }),
    [setUploadTarget, setViewTarget, openDetail],
  );
  const returnColumns = useMemo(() => createReceivingReturnColumns(), []);

  const canRead = Boolean(selectedMenuPermissions?.read);
  const canExcel = Boolean(selectedMenuPermissions?.excel || selectedMenuPermissions?.read);
  const canCreate = Boolean(selectedMenuPermissions?.create);
  const canDelete = Boolean(selectedMenuPermissions?.delete);
  const readGroup = (loading: boolean, onSearch: () => void, onExcel: () => void): PermissionActionGroupDefinition => ({
    key: 'read',
    actions: [
      {
        label: '조회',
        icon: SearchIcon,
        visible: canRead,
        disabled: loading,
        onClick: onSearch,
      },
      {
        label: '엑셀 다운로드',
        icon: FileDownloadIcon,
        visible: canExcel,
        onClick: onExcel,
      },
    ],
  });
  const deleteActions = (kind: DeleteKind, dirty: boolean) => [
    {
      label: '삭제',
      icon: DeleteIcon,
      visible: canDelete,
      disabled: management.saving,
      onClick: () => management.removeSelected(kind),
    },
    {
      label: '저장',
      icon: SaveIcon,
      visible: canDelete,
      disabled: management.saving || !dirty,
      onClick: () => management.askSave(kind),
    },
  ];
  const pageActionGroups: PermissionActionGroupDefinition[] = {
    register: [
      readGroup(history.loading, management.searchHistory, () => void management.exportHistory()),
      {
        key: 'write',
        actions: [
          {
            label: '입고 등록',
            icon: NoteAddIcon,
            visible: canCreate,
            onClick: () => history.setRegisterOpen(true),
          },
          ...deleteActions('receiving', history.dirty),
        ],
      },
    ],
    instatus: [readGroup(status.loading, () => void status.load(), () => void status.exportExcel())],
    doc: [readGroup(docs.loading, () => void docs.load(), () => void docs.exportExcel())],
    return: [
      readGroup(returns.loading, management.searchReturns, () => void management.exportReturns()),
      {
        key: 'write',
        actions: [
          {
            label: '반품 등록',
            icon: NoteAddIcon,
            visible: canCreate,
            onClick: () => returns.setReturnOpen(true),
          },
          ...deleteActions('return', returns.dirty),
        ],
      },
    ],
  }[tab];

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%' }}>
      <PageHeader
        breadcrumbItems={breadcrumbItems && breadcrumbItems.length > 0 ? breadcrumbItems : [selectedModule.name, currentMenuName]}
        description={content.description}
        actionGroups={pageActionGroups}
      />
      <PageMessageArea message={management.notice} severity="success" onClose={() => management.setNotice('')} />
      <Box sx={{ px: { xs: 1.5, sm: 2 }, borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tab} onChange={(_event, value: TabKey) => management.switchTab(value)} aria-label="입고관리 탭">
          <Tab value="register" label="입고등록" />
          <Tab value="instatus" label="입고현황" />
          <Tab value="doc" label="서류등록" />
          <Tab value="return" label="반품등록" />
        </Tabs>
      </Box>

      {tab === 'register' && (
        <>
          <PageSearchArea
            searchField={textField(history.client, (event) => history.setClient(event.target.value), '거래처 검색', true)}
            onDefaultSearch={management.searchHistory}
          >
            {dateField(history.date, history.setDate, '입고일')}
          </PageSearchArea>
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
                columns={historyColumns}
                loading={history.loading}
                gridKey={history.version}
                gridRef={history.gridRef}
                canDelete={canDelete}
                onChangesChange={() => management.refreshDirty('receiving')}
              />
            </Card>
          </Box>
        </>
      )}

      {tab === 'instatus' && (
        <>
          <PageSearchArea
            searchField={textField(status.query.materialQ, status.changeText('materialQ'), '원재료명 검색', true)}
            onDefaultSearch={() => void status.load()}
          >
            {textField(status.query.clientQ, status.changeText('clientQ'), '거래처명 검색')}
            <TextField
              select
              size="small"
              margin="none"
              value={status.query.kind}
              onChange={(event) => status.changeKind(event.target.value as Kind)}
              slotProps={{ htmlInput: { 'aria-label': '입고·반품 구분' }, select: { displayEmpty: true } }}
              sx={(theme) => ({ width: { xs: '100%', sm: 160 }, ...sideFieldSx(theme) })}
            >
              <MenuItem value="">입고·반품 전부</MenuItem>
              <MenuItem value="receiving">입고만</MenuItem>
              <MenuItem value="return">반품만</MenuItem>
            </TextField>
            {periodFields(status.query.start, status.query.end, status.setStart, status.setEnd)}
          </PageSearchArea>
          <Box sx={{ p: { xs: 1.5, sm: 1 }, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <Card sx={cardSx}>
              {status.noPrice > 0 && (
                <Alert severity="warning" sx={{ mb: 1, py: 0 }}>
                  단가가 없어 금액이 비어 있는 줄이 {status.noPrice}건 있어요. 아래 소계·합계에는 그만큼 빠져 있습니다.
                </Alert>
              )}
              {status.records && !status.loading && status.records.length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>이 기간에 들어온 것이 없습니다</Typography>
              )}
              <ReceivingStatusGrid rows={status.rows} columns={statusColumns} loading={status.loading} />
              {/* 합계줄. 수량은 품목마다 단위가 달라 더하지 않는다 */}
              <Box aria-label="입고현황 합계" sx={{
                display: 'flex', flexWrap: 'wrap', gap: 3, alignItems: 'center', justifyContent: 'flex-end', mt: 1, px: 1.5, py: 1,
                borderRadius: 1, bgcolor: 'action.hover', fontSize: 14, fontWeight: 700,
              }}>
                <span style={{ marginRight: 'auto' }}>합계 ({status.records?.length ?? 0}건)</span>
                <span>공급가액 {formatMoney(status.supplyAmount)}</span>
                <span>부가세 {formatMoney(status.vatAmount)}</span>
                <span>합계금액 {formatMoney(status.totalAmount)}</span>
              </Box>
            </Card>
          </Box>
        </>
      )}

      {tab === 'doc' && (
        <>
          <PageSearchArea
            searchField={textField(docs.query.materialQ, docs.changeText('materialQ'), '원재료명 검색', true)}
            onDefaultSearch={() => void docs.load()}
          >
            {textField(docs.query.clientQ, docs.changeText('clientQ'), '거래처명 검색')}
            {periodFields(docs.query.start, docs.query.end, docs.setStart, docs.setEnd)}
          </PageSearchArea>
          <Box sx={{ p: { xs: 1.5, sm: 1 }, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <Card sx={cardSx}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                <Typography sx={{ fontSize: 14, fontWeight: 700 }}>품목별 서류</Typography>
                {docs.summary && !docs.loading && docs.rows.length === 0 && (
                  <Typography variant="body2" color="text.secondary">{docs.missingOnly ? '서류가 빠진 품목이 없습니다' : '이 조건에 맞는 입고내역이 없습니다'}</Typography>
                )}
                <FormControlLabel
                  sx={{ ml: 'auto', mr: 0 }}
                  control={<Checkbox size="small" checked={docs.missingOnly} onChange={(event) => docs.setMissingOnly(event.target.checked)} />}
                  label={<Typography variant="body2">서류 없는 품목만 보기</Typography>}
                />
              </Box>
              <ReceivingDocGrid rows={docs.rows} columns={docColumns} loading={docs.loading} />
            </Card>
          </Box>
        </>
      )}

      {tab === 'return' && (
        <>
          <PageSearchArea
            searchField={textField(returns.client, (event) => returns.setClient(event.target.value), '거래처 검색', true)}
            onDefaultSearch={management.searchReturns}
          >
            {dateField(returns.date, returns.setDate, '반품일')}
          </PageSearchArea>
          <Box sx={{ p: { xs: 1.5, sm: 1 }, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <Card sx={cardSx}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                <Typography sx={{ fontSize: 14, fontWeight: 700 }}>반품내역</Typography>
                {returns.rows && !returns.loading && returns.rows.length === 0 && <Typography variant="body2" color="text.secondary">반품내역이 없습니다</Typography>}
                <Typography sx={{ ml: 'auto', fontSize: 14 }} aria-label="반품 합계금액">
                  반품 합계금액 <Box component="b" sx={red}>{formatMoney(returns.totalAmount)}</Box>원
                </Typography>
              </Box>
              <ReceivingReturnGrid
                rows={returns.rows ?? []}
                columns={returnColumns}
                loading={returns.loading}
                gridKey={returns.version}
                gridRef={returns.gridRef}
                canDelete={canDelete}
                onChangesChange={() => management.refreshDirty('return')}
              />
            </Card>
          </Box>
        </>
      )}

      <ReceivingDialog
        open={history.registerOpen}
        onClose={() => history.setRegisterOpen(false)}
        onRegistered={history.afterRegistered}
      />
      <ReturnDialog
        open={returns.returnOpen}
        onClose={() => returns.setReturnOpen(false)}
        onRegistered={management.afterReturnRegistered}
      />
      <DocUploadDialog
        open={docs.uploadTarget != null}
        materialName={docs.uploadTarget?.name ?? ''}
        rows={docs.uploadRows}
        onClose={() => docs.setUploadTarget(null)}
        onChanged={docs.refreshFiles}
      />
      <DocViewDialog
        open={docs.viewTarget != null}
        materialName={docs.viewTarget?.name ?? ''}
        rows={docs.viewRows}
        onClose={() => docs.setViewTarget(null)}
      />
      <DocDetailDialog
        target={docs.detailTarget}
        start={docs.detailQuery.start}
        end={docs.detailQuery.end}
        clientQ={docs.detailQuery.clientQ}
        onClose={() => docs.setDetailTarget(null)}
      />
      <ConfirmDialog
        open={confirmDelete != null}
        title={confirmDelete?.kind === 'return' ? '반품 삭제' : '입고 삭제'}
        message={confirmDelete?.kind === 'return'
          ? `반품 ${confirmDelete.count}건을 지우고 저장할까요? 뺐던 재고가 다시 돌아와요.`
          : `입고 ${confirmDelete?.count ?? 0}건을 지우고 저장할까요? 재고에서 그만큼 다시 차감되고, 붙여둔 서류도 같이 지워져요.`}
        confirmLabel="삭제하고 저장"
        danger
        onCancel={() => management.setConfirmDelete(null)}
        onConfirm={management.confirmSave}
      />
      <UnsavedChangesConfirmDialog
        open={Boolean(management.confirmLeave)}
        title="저장하지 않은 변경사항"
        description="변경사항을 버리고 계속하시겠습니까?"
        cancelLabel="취소"
        continueLabel="계속"
        onCancel={() => management.setConfirmLeave(null)}
        onContinue={management.continueLeave}
      />
      <ConfirmDialog
        open={management.alertText != null}
        title="입고관리"
        message={management.alertText ?? ''}
        alertOnly
        onCancel={() => setAlertText(null)}
        onConfirm={() => setAlertText(null)}
      />
    </Box>
  );
}

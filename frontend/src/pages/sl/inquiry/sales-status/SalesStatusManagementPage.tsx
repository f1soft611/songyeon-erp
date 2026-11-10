import { useMemo, useState } from 'react';
import { Box, Card, TextField, Typography } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import SaveIcon from '@mui/icons-material/Save';
import SearchIcon from '@mui/icons-material/Search';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { type PermissionActionGroupDefinition } from '../../../../shared/components/PermissionGroup';
import { PageMessageArea } from '../../../../shared/components/PageMessageArea';
import { SearchResultMessage } from '../../../../shared/components/SearchResultMessage';
import { PageSearchArea } from '../../../../shared/components/PageSearchArea';
import { UnsavedChangesConfirmDialog } from '../../../../shared/components/UnsavedChangesConfirmDialog';
import { toPageSearchFields, type PageSearchFieldValue } from '../../../../shared/components/page-search/searchFields';
import { ConfirmDialog } from '../../../../shared/components/ConfirmDialog';
import { readSearchSession, saveSearchSession } from '../../../../shared/utils/searchSession';
import type { MenuPermission, ModuleItem, PageContent } from '../../../dashboard/types/dashboard';
import { SalesStatusGrid, createSalesStatusColumns } from './components/SalesStatusGrid';
import { useSalesStatusManagement } from './hooks/useSalesStatusManagement';
import { defaultSalesDetailValues, toSalesQuery } from './utils/salesStatus';

type SalesStatusManagementPageProps = {
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

// 판매관리 > 판매조회 > 판매현황 (화면ID INSalesStatusView, 송연 #screen-sales-status · 36-sales.js loadSalesStatus)
// 등록한 판매를 기간 · 거래처 · 품목으로 찾아보고, 잘못 넣은 줄을 지운다.
// 2026-10-26 줄을 골라 [삭제](오른쪽 클릭 [행 삭제])로 표에서 빼고 [저장] 때 지운다.
// 2026-11-02 표준에 맞췄다: 화면(이 파일) · 조회/삭제(hooks) · 그리드(components), 판매일자 · 품목은 상세 조회(⌄).
export function SalesStatusManagementPage({
  selectedModule,
  currentMenuName,
  content,
  breadcrumbItems,
  selectedMenuPermissions,
}: SalesStatusManagementPageProps) {
  const canDelete = Boolean(selectedMenuPermissions?.delete);
  const [defaults] = useState(defaultSalesDetailValues);
  // 2026-11-04 마지막으로 조회한 조건(거래처 · 상세 조회)은 탭 세션에 두고, 다른 화면에 갔다 돌아오면 그 조건으로 다시 부른다
  const [saved] = useState(() => readSearchSession('sl-sales-status', { keyword: '', detailValues: defaults }, { keyword: '', detailValues: {} }));
  const management = useSalesStatusManagement(toSalesQuery(saved.detailValues, saved.keyword), canDelete);
  const [client, setClient] = useState(saved.keyword);
  const [detailValues, setDetailValues] = useState<Record<string, PageSearchFieldValue>>(saved.detailValues);
  const [appliedDetailValues, setAppliedDetailValues] = useState<Record<string, PageSearchFieldValue>>(saved.detailValues);

  const columns = useMemo(() => createSalesStatusColumns(), []);
  const detailFields = useMemo(() => toPageSearchFields(columns), [columns]);

  const requestReload = (values = appliedDetailValues) => management.guard(() => {
    setAppliedDetailValues(values);
    saveSearchSession('sl-sales-status', { keyword: client, detailValues: values });
    void management.loadRows(toSalesQuery(values, client));
  });

  const pageActionGroups: PermissionActionGroupDefinition[] = [
    {
      key: 'read',
      actions: [
        { label: '조회', icon: SearchIcon, visible: Boolean(selectedMenuPermissions?.read), disabled: management.loading, onClick: () => requestReload() },
        {
          label: '엑셀 다운로드', icon: FileDownloadIcon,
          visible: Boolean(selectedMenuPermissions?.excel || selectedMenuPermissions?.read), onClick: () => void management.exportExcel(),
        },
      ],
    },
    {
      key: 'write',
      actions: [
        { label: '삭제', icon: DeleteIcon, visible: canDelete, disabled: management.saving, onClick: management.removeSelected },
        { label: '저장', icon: SaveIcon, visible: canDelete, disabled: management.saving || !management.dirty, onClick: management.askSave },
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
      <PageMessageArea message={management.notice} severity="success" onClose={() => management.setNotice('')} />
      {/* 2026-11-04 S_ERP 현황 표준(SearchResultMessage): 조회가 끝나면 '조회 결과 총 N건입니다.' · 0건 안내, X 로 닫고 다시 조회하면 다시 보인다 */}
      {management.loaded && !management.loading && <SearchResultMessage resultCount={management.rows.length} />}
      <Box sx={{ p: 1, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Card sx={cardSx}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1, flexWrap: 'wrap' }}>
            <Typography variant="body2" aria-label="판매현황 요약" sx={{ ml: 'auto', fontWeight: 700 }}>{management.summary}</Typography>
          </Box>
          <SalesStatusGrid
            rows={management.rows}
            columns={columns}
            canDelete={canDelete}
            loading={management.loading}
            gridKey={management.gridKey}
            gridRef={management.gridRef}
            onChangesChange={management.handleGridChanges}
          />
        </Card>
      </Box>
      <ConfirmDialog
        open={management.alertText != null}
        title="판매현황"
        message={management.alertText ?? ''}
        alertOnly
        onCancel={() => management.setAlertText(null)}
        onConfirm={() => management.setAlertText(null)}
      />
      <ConfirmDialog
        open={management.confirmDelete > 0}
        title="판매 삭제"
        message={`판매 ${management.confirmDelete}건을 지우고 저장할까요?`}
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
        description="변경사항을 버리고 목록을 다시 불러오시겠습니까?"
        cancelLabel="취소"
        continueLabel="계속"
        onCancel={() => management.setConfirmLeave(null)}
        onContinue={management.continueLeave}
      />
    </Box>
  );
}

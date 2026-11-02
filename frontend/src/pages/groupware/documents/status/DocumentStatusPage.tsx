import { Box, Button, Chip } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { PageLoadBoundary } from '../../../../shared/components/PageLoadBoundary';
import type { PermissionActionGroupDefinition } from '../../../../shared/components/PermissionGroup';
import { PageMessageArea } from '../../../../shared/components/PageMessageArea';
import { EmptySearchResultMessage } from '../../../../shared/components/EmptySearchResultMessage';
import { DocumentStatusDetail } from './components/DocumentStatusDetail';
import { DocumentStatusGrid } from './components/DocumentStatusGrid';
import { DocumentStatusSearchArea } from './components/DocumentStatusSearchArea';
import { useDocumentStatusDetail } from './hooks/useDocumentStatusDetail';
import { useDocumentStatusList } from './hooks/useDocumentStatusList';
import { useDocumentStatusSearch } from './hooks/useDocumentStatusSearch';
import type { DocumentStatusPageProps } from './types/documentStatusPage.types';
import { getDocumentApprovalScopeLabel } from '../write/data/documentPresentation';

export function DocumentStatusPage({
  selectedModule,
  currentMenuName,
  content,
  selectedMenuPermissions,
  dashboardScope = null,
  onDashboardScopeChange,
}: DocumentStatusPageProps) {
  const search = useDocumentStatusSearch(dashboardScope, onDashboardScopeChange);
  const detail = useDocumentStatusDetail();
  const list = useDocumentStatusList(
    search.appliedFilters,
    search.defaultsInitialized,
    detail.closeDetail,
  );
  const refreshStatusList = () => {
    list.retry();
    detail.refreshDetail();
  };
  const pageActionGroups: PermissionActionGroupDefinition[] = [
    {
      key: 'read',
      actions: [
        {
          label: '조회',
          icon: SearchIcon,
          visible: selectedMenuPermissions?.read ?? false,
          disabled: !search.defaultsInitialized || search.defaultsLoading,
          onClick: () => search.applySearch(search.appliedDetailValues),
        },
      ],
    },
  ];

  return (
    <Box
      sx={{
        flex: 1,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        minWidth: 0,
        overflow: 'hidden',
      }}
    >
      <PageHeader
        breadcrumbItems={[selectedModule.name, '문서관리', currentMenuName]}
        description={content.description}
        actionGroups={pageActionGroups}
      />
      <PageLoadBoundary {...search.defaultsInitialLoad} label="검색 기본값" onRetry={search.retryDefaults}>
      <PageLoadBoundary {...list.initialLoad} label="문서현황" onRetry={list.retry}>
      {search.dashboardScope && (
        <Box sx={{ px: { xs: 1.5, sm: 3 }, pt: 1 }}>
          <Chip
            size="small"
            label={`#${getDocumentApprovalScopeLabel(search.dashboardScope)}`}
            onDelete={search.clearDashboardScope}
            aria-label={`결재 범위 필터 ${getDocumentApprovalScopeLabel(search.dashboardScope)} 취소`}
          />
        </Box>
      )}
      <DocumentStatusSearchArea
        keyword={search.keyword}
        onKeywordChange={search.setKeyword}
        detailFields={search.detailFields}
        detailValues={search.detailValues}
        appliedDetailValues={search.appliedDetailValues}
        defaultValues={search.searchAreaDefaultValues}
        onDetailValuesChange={search.setDetailValues}
        onSearch={search.applySearch}
        onReset={search.resetSearch}
        initialized={search.defaultsInitialized}
        loading={search.defaultsLoading}
      />
      <PageMessageArea
        message={search.defaultsError ?? list.error}
        onClose={list.clearError}
      />
      {list.hasLoaded && !list.loading && !list.initialLoad.loading
        && list.totalRowCount === 0 && !search.defaultsError && !list.error ? (
        <EmptySearchResultMessage onReset={search.resetSearch} />
      ) : null}
      {search.defaultsError || list.error ? (
        <Box sx={{ px: { xs: 1.5, sm: 3 }, pb: 1 }}>
          <Button
            type="button"
            size="small"
            onClick={search.defaultsError ? search.retryDefaults : list.retry}
            aria-label="문서현황 다시 조회"
          >
            다시 조회
          </Button>
        </Box>
      ) : null}
      <Box
        sx={{
          px: { xs: 1, sm: 2 },
          pb: 2,
          pt: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          flex: 1,
          minHeight: 360,
          minWidth: 0,
        }}
      >
        {search.defaultsInitialized ? (
          <Box sx={{ flex: 1, minHeight: 320, minWidth: 0, overflow: 'hidden' }}>
            <DocumentStatusGrid
              rows={list.rows}
              loading={list.loading}
              canExportExcel={selectedMenuPermissions?.excel ?? false}
              onOpenDocument={detail.handleOpenDocument}
            />
          </Box>
        ) : null}
      </Box>
      </PageLoadBoundary>
      </PageLoadBoundary>
      <DocumentStatusDetail
        selectedDocumentId={detail.selectedDocumentId}
        editingDocument={detail.editingDocument}
        isComposerOpen={detail.isComposerOpen}
        detailRefreshToken={detail.detailRefreshToken}
        onClose={detail.closeDetail}
        onActionComplete={refreshStatusList}
        onEditDocument={detail.handleEditDocument}
        onComposerClose={() => {
          detail.closeComposer();
          refreshStatusList();
        }}
      />
    </Box>
  );
}

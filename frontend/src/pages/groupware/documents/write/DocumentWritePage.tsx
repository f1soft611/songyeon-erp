import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined';
import { Alert, Box, Button, Chip, Container, Stack } from '@mui/material';
import { useState } from 'react';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { useNotification } from '../../../../shared/context/NotificationContext';
import type { PermissionActionGroupDefinition } from '../../../../shared/components/PermissionGroup';
import { ContentSplitLayout } from '../../../../shared/components/view-mode/ContentSplitLayout';
import { FeedView } from '../../../../shared/components/view-mode/FeedView';
import { ListView } from '../../../../shared/components/view-mode/ListView';
import { FeedViewSkeleton } from '../../../../shared/components/view-mode/FeedViewSkeleton';
import { ListViewSkeleton } from '../../../../shared/components/view-mode/ListViewSkeleton';
import { PinnedItemsPanel } from '../../../../shared/components/view-mode/PinnedItemsPanel';
import { PinnedViewToolbar } from '../../../../shared/components/view-mode/PinnedViewToolbar';
import { PageAreaOverlay } from '../../../../shared/components/view-mode/PageAreaOverlay';
import { UnsavedChangesConfirmDialog } from '../../../../shared/components/UnsavedChangesConfirmDialog';
import { NoticeFilterMenu } from '../../community/notice/components/NoticeFilterMenu';
import { ApprovalSummaryPanel } from './components/ApprovalSummaryPanel';
import { ApprovalNoticePanel } from './components/ApprovalNoticePanel';
import { DocumentComposerDialog } from './components/DocumentComposerDialog';
import { DocumentApprovalDetailFeed } from './components/DocumentApprovalDetailFeed';
import { DocumentFeedItem } from './components/DocumentFeedItem';
import { DocumentStatusPanel } from './components/DocumentStatusPanel';
import { EmptyDocumentList } from './components/EmptyDocumentList';
import { DocumentFileList } from './components/DocumentFileList';
import { documentKinds } from './data/documentWriteData';
import { useDocumentWritePage } from './hooks/useDocumentWritePage';
import type {
  DocumentApprovalDetail,
  DocumentKind,
  DocumentWritePageProps,
} from './types/documentWrite.types';

type PendingDocumentPinAction = {
  electronicApprovalId: number;
  isPinned: boolean;
  title: string;
};

export function DocumentWritePage({
  selectedModule,
  currentMenuName,
  content,
}: DocumentWritePageProps) {
  const [editingDocument, setEditingDocument] =
    useState<DocumentApprovalDetail | null>(null);
  const [pendingPinAction, setPendingPinAction] =
    useState<PendingDocumentPinAction | null>(null);
  const [detailRefreshToken, setDetailRefreshToken] = useState(0);
  const [scrollRoot, setScrollRoot] = useState<HTMLDivElement | null>(null);
  const { showError } = useNotification();
  const {
    files,
    viewMode,
    setViewMode,
    selectedKind,
    setSelectedKind,
    activeFilterChips,
    isComposerOpen,
    openComposer,
    closeComposer,
    pinnedDocuments,
    listDocuments,
    feedDocuments,
    pinnedViewItems,
    listViewItems,
    summary,
    notices,
    isLoading,
    loadError,
    feedEmployeeId,
    feedEmployeeError,
    retryFeedEmployee,
    retry,
    selectScope,
    selectNotice,
    openDetail,
    closeDetail,
    detailDocumentId,
    refresh,
    togglePin,
    isPinPending,
    hasNextPage,
    isLoadingMore,
    pageError,
    loadMore,
    retryLoadMore,
  } = useDocumentWritePage();
  const requestPinToggle = (
    electronicApprovalId: number,
    isPinned: boolean,
    title: string,
  ) => {
    setPendingPinAction({ electronicApprovalId, isPinned, title });
  };
  const confirmPinToggle = async () => {
    const action = pendingPinAction;
    setPendingPinAction(null);
    if (!action) return;

    try {
      await togglePin(action.electronicApprovalId, action.isPinned);
    } catch (error: unknown) {
      showError(
        error instanceof Error
          ? error.message
          : '문서 고정 상태를 변경하지 못했습니다.',
      );
    }
  };
  const hasVisibleDocuments =
    viewMode === 'feed'
      ? feedDocuments.length > 0
      : pinnedDocuments.length + listDocuments.length > 0;
  const pageActionGroups: PermissionActionGroupDefinition[] = [
    {
      key: 'document-write',
      actions: [
        {
          key: 'create-document',
          label: '문서 작성',
          icon: AddOutlinedIcon,
          visible: true,
          onClick: openComposer,
        },
      ],
    },
  ];

  return (
    <Box
      data-testid="document-write-page"
      sx={{
        flex: 1,
        position: 'relative',
        minWidth: 0,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <PageHeader
        breadcrumbItems={[selectedModule.name, '문서관리', currentMenuName]}
        description={content.description}
        actionGroups={pageActionGroups}
      />

      <Box ref={setScrollRoot} sx={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden' }}>
        <Container
          maxWidth="xl"
          sx={{
            py: { xs: 1.5, sm: 2.5 },
            minHeight: '100%',
            boxSizing: 'border-box',
          }}
        >
          <ContentSplitLayout
            left={
              <>
                <PinnedViewToolbar
                  enableFileView
                  pinnedCount={pinnedDocuments.length}
                  mode={viewMode}
                  onChange={setViewMode}
                  countLabel="상단고정"
                  modeLabel="문서 보기 방식"
                  filterAction={
                    <Stack
                      direction="row"
                      spacing={0.5}
                      sx={{
                        minWidth: 0,
                        flexWrap: 'wrap',
                        alignItems: 'center',
                      }}
                    >
                      <NoticeFilterMenu
                        ariaLabel="문서 업무구분 필터"
                        filters={documentKinds.map((kind) => ({
                          code: kind,
                          name: kind,
                        }))}
                        selectedCode={selectedKind}
                        onChange={(code) =>
                          setSelectedKind(code as DocumentKind | '')
                        }
                      />
                      {activeFilterChips.map((filter) => (
                        <Chip
                          key={filter.key}
                          label={filter.label}
                          size="small"
                          aria-label={filter.deleteLabel}
                          onDelete={filter.onDelete}
                          deleteIcon={
                            <CloseOutlinedIcon
                              data-testid={`filter-delete-icon-${filter.key}`}
                              fontSize="small"
                              aria-hidden="true"
                            />
                          }
                          sx={{
                            maxWidth: '100%',
                            minWidth: 0,
                            height: 'auto',
                            '& .MuiChip-label': {
                              minWidth: 0,
                              whiteSpace: 'normal',
                              overflowWrap: 'anywhere',
                            },
                          }}
                        />
                      ))}
                    </Stack>
                  }
                />
                {loadError && (
                  <Alert
                    severity="error"
                    sx={{ mb: 1.5 }}
                    action={
                      <Button color="inherit" size="small" onClick={retry}>
                        다시 시도
                      </Button>
                    }
                  >
                    {loadError}
                  </Alert>
                )}
                {viewMode === 'feed' && feedEmployeeError && (
                  <Alert
                    severity="error"
                    sx={{ mb: 1.5 }}
                    action={
                      <Button
                        color="inherit"
                        size="small"
                        onClick={retryFeedEmployee}
                      >
                        사원 정보 다시 시도
                      </Button>
                    }
                  >
                    {feedEmployeeError}
                  </Alert>
                )}
                {viewMode === 'file' ? (
                  <DocumentFileList
                    files={files}
                    scrollRoot={scrollRoot}
                    onRefresh={retry}
                    onOpenDocument={openDetail}
                  />
                ) : isLoading ? (
                  <Box
                    role="status"
                    aria-label="문서 목록 불러오는 중"
                    sx={{ width: '100%', py: 2 }}
                  >
                    {viewMode === 'list' ? (
                      <ListViewSkeleton />
                    ) : loadError && !hasVisibleDocuments ? null : (
                      <Box data-testid="document-feed-skeleton">
                        <FeedViewSkeleton />
                      </Box>
                    )}
                  </Box>
                ) : (
                  <>
                {pinnedDocuments.length > 0 && (
                  <Box sx={{ mb: 1.5 }}>
                    <PinnedItemsPanel
                      items={pinnedViewItems}
                      ariaLabel="상단 고정 문서"
                      onItemClick={(item) => openDetail(Number(item.id))}
                    />
                  </Box>
                )}
                {viewMode === 'feed' ? (
                  <Box data-testid="document-feed">
                  {feedDocuments.length > 0 ? (
                      <FeedView
                        items={feedDocuments}
                        pagination={{
                          scrollRoot,
                          hasNext: hasNextPage,
                          isLoadingMore,
                          error: pageError || undefined,
                          onLoadMore: loadMore,
                          onRetry: retryLoadMore,
                        }}
                        renderItem={(item) => (
                          <DocumentFeedItem
                            key={item.id}
                            item={item}
                            employeeId={feedEmployeeId}
                            pinPending={isPinPending(item.id)}
                            detailRefreshToken={detailRefreshToken}
                            onTogglePin={requestPinToggle}
                            onActionComplete={refresh}
                            onEditDocument={(document) => {
                              setEditingDocument(document);
                              openComposer();
                            }}
                          />
                        )}
                      />
                    ) : (
                      <EmptyDocumentList onCreate={openComposer} />
                    )}
                  </Box>
                ) : (
                  <Box data-testid="document-list">
                    {listViewItems.length > 0 ? (
                      <ListView
                        items={listViewItems}
                        ariaLabel="리스트형 문서 목록"
                        badgeOrder="status-category"
                        pagination={{
                          scrollRoot,
                          hasNext: hasNextPage,
                          isLoadingMore,
                          error: pageError || undefined,
                          onLoadMore: loadMore,
                          onRetry: retryLoadMore,
                        }}
                        onItemClick={(item) => openDetail(Number(item.id))}
                      />
                    ) : (
                      <EmptyDocumentList onCreate={openComposer} />
                    )}
                  </Box>
                )}
                  </>
                )}
              </>
            }
            right={
              <Stack spacing={2}>
                <ApprovalSummaryPanel summary={summary} onSelectScope={selectScope} />
                <DocumentStatusPanel summary={summary} onSelectScope={selectScope} />
                <ApprovalNoticePanel items={notices} onSelect={selectNotice} />
              </Stack>
            }
          />
        </Container>
      </Box>

      <DocumentComposerDialog
        open={isComposerOpen}
        initialDocument={editingDocument}
        onClose={() => {
          closeComposer();
          setEditingDocument(null);
          refresh({ quiet: true });
          setDetailRefreshToken((token) => token + 1);
        }}
      />
      {detailDocumentId !== null && (
        <PageAreaOverlay onClose={closeDetail}>
          <DocumentApprovalDetailFeed
            open
            electronicApprovalId={detailDocumentId}
            onClose={closeDetail}
            onActionComplete={refresh}
            onEditDocument={(document) => {
              setEditingDocument(document);
              openComposer();
            }}
            detailRefreshToken={detailRefreshToken}
            isPinned={pinnedDocuments.some(
              (document) => document.id === detailDocumentId,
            )}
            pinPending={isPinPending(detailDocumentId)}
            onTogglePin={requestPinToggle}
          />
        </PageAreaOverlay>
      )}
      <UnsavedChangesConfirmDialog
        open={Boolean(pendingPinAction)}
        title={
          pendingPinAction?.isPinned ? '상단 고정 해제' : '상단 고정'
        }
        description={
          pendingPinAction?.isPinned
            ? '이 문서의 상단 고정을 해제하시겠습니까?'
            : '이 문서를 상단에 고정하시겠습니까?'
        }
        cancelLabel="취소"
        continueLabel="확인"
        disableContinue={
          pendingPinAction
            ? isPinPending(pendingPinAction.electronicApprovalId)
            : false
        }
        onCancel={() => setPendingPinAction(null)}
        onContinue={() => {
          void confirmPinToggle();
        }}
      />
    </Box>
  );
}

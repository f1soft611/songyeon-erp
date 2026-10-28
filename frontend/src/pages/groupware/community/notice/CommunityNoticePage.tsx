import {
  Box,
  Container,
  IconButton,
  Typography,
  useTheme,
} from '@mui/material';
import AddOutlined from '@mui/icons-material/AddOutlined';
import ReplayOutlined from '@mui/icons-material/ReplayOutlined';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { PageMessageArea } from '../../../../shared/components/PageMessageArea';
import { FeedViewSkeleton } from '../../../../shared/components/view-mode/FeedViewSkeleton';
import { ContentSplitLayout } from '../../../../shared/components/view-mode/ContentSplitLayout';
import { ListView } from '../../../../shared/components/view-mode/ListView';
import { ListViewSkeleton } from '../../../../shared/components/view-mode/ListViewSkeleton';
import { PinnedItemsPanel } from '../../../../shared/components/view-mode/PinnedItemsPanel';
import { PinnedViewToolbar } from '../../../../shared/components/view-mode/PinnedViewToolbar';
import { PageAreaOverlay } from '../../../../shared/components/view-mode/PageAreaOverlay';
import { PostDetailPanel } from '../../../../shared/components/feed/PostDetailPanel';
import { UnsavedChangesConfirmDialog } from '../../../../shared/components/UnsavedChangesConfirmDialog';
import type { CommonViewMode } from '../../../../shared/components/view-mode/commonViewTypes';
import type { PermissionActionGroupDefinition } from '../../../../shared/components/PermissionGroup';
import { useNotification } from '../../../../shared/context/NotificationContext';
import type {
  ModuleItem,
  PageContent,
} from '../../../dashboard/types/dashboard';
import { NoticeComposerDialog } from './components/NoticeComposerDialog';
import {
  NoticeFeedList,
  normalizeNoticeEmbeddedImageSources,
} from './components/NoticeFeedList';
import { NoticeEmptyState } from './components/NoticeEmptyState';
import { NoticeFilterMenu } from './components/NoticeFilterMenu';
import { NoticeLoginPopupBadge } from './components/NoticeLoginPopupBadge';
import { NoticeCategoryBadge } from './components/NoticeCategoryBadge';
import { NoticeSummaryPanel } from './components/NoticeSummaryPanel';
import { deriveNoticeSummary } from './data/noticeSummary';
import { toNoticeViewItems } from './data/noticeViewAdapter';
import {
  downloadNoticeAttachment,
  fetchNoticePostDetail,
} from './services/noticeBoardService';
import type {
  NoticeEditorDraft,
  NoticeFeedItem,
} from './types/community.types';
import { useNoticeList } from './hooks/useNoticeList';
import { useNoticeInteractions } from './hooks/useNoticeInteractions';
import { useNoticeComments } from './hooks/useNoticeComments';
import { useNoticeCategories } from './hooks/useNoticeCategories';
import { useNoticeMutations } from './hooks/useNoticeMutations';

type CommunityNoticePageProps = {
  selectedModule: ModuleItem;
  currentMenuName: string;
  content: PageContent;
};

export function CommunityNoticePage({
  selectedModule,
  currentMenuName,
  content,
}: CommunityNoticePageProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { showError, showSuccess } = useNotification();
  const hasCreatePermission = true;
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [pendingPinnedNotice, setPendingPinnedNotice] =
    useState<NoticeFeedItem | null>(null);
  const [editorDraft, setEditorDraft] = useState<NoticeEditorDraft>({
    title: '',
    body: '',
    noticeGubunCode: '',
    attachments: [],
  });
  const [viewMode, setViewMode] = useState<CommonViewMode>('feed');
  const [scrollRoot, setScrollRoot] = useState<HTMLDivElement | null>(null);
  const { noticeGubunOptions, selectedNoticeFilter, setSelectedNoticeFilter } =
    useNoticeCategories();
  const noticeGubunNames = useMemo(
    () =>
      new Map(noticeGubunOptions.map((option) => [option.code, option.name])),
    [noticeGubunOptions],
  );
  const noticeGubunNamesRef = useRef(noticeGubunNames);
  const {
    noticeItems,
    setNoticeItems,
    pinnedNoticeItems,
    setPinnedNoticeItems,
    pinnedNoticeCount,
    serverItemRevision,
    setServerItemRevision,
    isInitialLoading,
    isRefreshing,
    errorMessage,
    setErrorMessage,
    noticeHasMore,
    isLoadingMore,
    pageError,
    loadNoticePosts,
    loadMoreNoticePosts,
    retryLoadMoreNoticePosts,
  } = useNoticeList({ selectedNoticeFilter, noticeGubunNamesRef });
  const {
    expandedNoticeId,
    selectedNoticeId,
    selectedNoticeLoadingId,
    selectedNotice,
    handleToggleLike,
    handleToggleBookmark,
    handleToggleNoticeExpand,
    handleNoticeInteract,
    handleSelectNotice,
    handleCloseNoticeDetail,
  } = useNoticeInteractions({
    noticeItems,
    setNoticeItems,
    pinnedNoticeItems,
    setPinnedNoticeItems,
    noticeGubunNamesRef,
    showError,
    showSuccess,
  });
  const {
    handleAddComment,
    handleUpdateComment,
    handleDeleteComment,
    handleLoadPreviousComments,
    handleDownloadCommentAttachment,
    handleDeleteCommentAttachment,
  } = useNoticeComments({ setNoticeItems, showError, showSuccess });
  const { handleSaveNotice, handleDeleteNotice, handleConfirmTogglePinned } =
    useNoticeMutations({
      setNoticeItems,
      setPinnedNoticeItems,
      setServerItemRevision,
      loadNoticePosts,
      noticeGubunNamesRef,
      editorDraft,
      setEditorDraft,
      closeComposer: () => setIsComposerOpen(false),
      showError,
      showSuccess,
    });
  const noticeSummary = useMemo(
    () => {
      const seenNoticeIds = new Set<number>();
      const summaryItems = [...pinnedNoticeItems, ...noticeItems].filter(
        (item) => {
          if (seenNoticeIds.has(item.id)) return false;
          seenNoticeIds.add(item.id);
          return true;
        },
      );
      return deriveNoticeSummary(
        summaryItems.map((item) => ({
          id: item.id,
          title: item.title,
          viewCount: item.viewCount,
          commentCount: item.commentCount,
          isPinned: item.isPinned,
          createdAt: item.createdAt,
          attachmentCount: item.attachmentDetails?.length ?? 0,
        })),
      );
    },
    [noticeItems, pinnedNoticeItems],
  );
  const noticeViewItems = useMemo(
    () => toNoticeViewItems(noticeItems),
    [noticeItems],
  );
  const unpinnedNoticeItems = noticeItems;
  const unpinnedNoticeViewItems = noticeViewItems;
  const pinnedNoticeViewItems = useMemo(
    () => toNoticeViewItems(pinnedNoticeItems),
    [pinnedNoticeItems],
  );
  useEffect(() => {
    noticeGubunNamesRef.current = noticeGubunNames;
    setNoticeItems((current) =>
      current.map((item) => {
        const name = item.noticeGubunCode
          ? noticeGubunNames.get(item.noticeGubunCode)
          : undefined;
        return {
          ...item,
          noticeGubunName: name ?? item.noticeGubunCode ?? '공지',
          state: name ?? item.noticeGubunCode ?? '공지',
        };
      }),
    );
  }, [noticeGubunNames]);

  useEffect(() => {
    void loadNoticePosts();
  }, [loadNoticePosts]);

  const hasVisibleNoticeList = noticeItems.length > 0 || !errorMessage;

  const pageActionGroups: PermissionActionGroupDefinition[] = useMemo(
    () => [
      {
        key: 'write',
        actions: [
          {
            key: 'create-notice',
            label: '새 공지 작성',
            icon: AddOutlined,
            visible: hasCreatePermission,
            onClick: () => setIsComposerOpen(true),
          },
        ],
      },
    ],
    [hasCreatePermission],
  );

  const handleTogglePinned = (item: NoticeFeedItem) => {
    setPendingPinnedNotice(item);
  };

  const confirmTogglePinned = async () => {
    const item = pendingPinnedNotice;
    setPendingPinnedNotice(null);
    await handleConfirmTogglePinned(item);
  };

  const handleViewModeChange = useCallback(
    async (nextMode: CommonViewMode) => {
      setViewMode(nextMode);
      await loadNoticePosts();
    },
    [loadNoticePosts],
  );

  const selectedNoticePanel = selectedNotice ? (
    <PostDetailPanel
      onClose={handleCloseNoticeDetail}
      isLoading={selectedNoticeLoadingId === selectedNoticeId}
      loadingLabel="공지사항 상세 불러오는 중"
    >
      <NoticeFeedList
        items={[selectedNotice]}
        isDark={isDark}
        expandedNoticeId={expandedNoticeId}
        onToggleExpand={handleToggleNoticeExpand}
        onNoticeInteract={handleNoticeInteract}
        onToggleLike={handleToggleLike}
        onToggleBookmark={handleToggleBookmark}
        onAddComment={handleAddComment}
        onEditComment={handleUpdateComment}
        onDeleteComment={handleDeleteComment}
        onLoadPreviousComments={handleLoadPreviousComments}
        onLoadPreviousCommentsError={() =>
          showError('이전 댓글을 불러오지 못했습니다.')
        }
        onDownloadCommentAttachment={handleDownloadCommentAttachment}
        onDeleteCommentAttachment={handleDeleteCommentAttachment}
        serverItemRevision={serverItemRevision}
        onDelete={handleDeleteNotice}
        onTogglePinned={handleTogglePinned}
        onEdit={(item) => {
          const mappedAttachments = (item.attachmentDetails ?? []).map(
            (attachment) => ({
              id: String(
                attachment.boardFileId ??
                  attachment.objectKey ??
                  `${item.id}-${Math.random()}`,
              ),
              name: attachment.name,
              size: attachment.size,
              extension:
                attachment.name.split('.').pop()?.toUpperCase() || undefined,
              boardFileId: attachment.boardFileId,
              objectKey: attachment.objectKey,
              bucketName: attachment.bucketName,
              postId: item.id,
            }),
          );
          setEditorDraft({
            id: item.id,
            title: item.title,
            body: normalizeNoticeEmbeddedImageSources(
              item.bodyHtml ?? item.body,
              item.id,
            ),
            isPinned: item.isPinned,
            loginPopupYn: item.loginPopupYn,
            popupEndDate: item.popupEndDate,
            noticeGubunCode: item.noticeGubunCode,
            attachments: mappedAttachments,
          });
          setIsComposerOpen(true);
        }}
        onDownload={(noticeId, file) => {
          void (async () => {
            const detail = await fetchNoticePostDetail(noticeId);
            const nextAttachment = (detail.attachments ?? []).find(
              (attachment) =>
                String(attachment.boardFileId ?? '') ===
                  String(file.boardFileId ?? '') ||
                (attachment.fileName ?? '') === file.name,
            );
            if (nextAttachment) {
              await downloadNoticeAttachment({
                ...nextAttachment,
                postId: noticeId,
              });
            }
          })();
        }}
      />
    </PostDetailPanel>
  ) : null;

  return (
    <Box
      sx={{
        flex: 1,
        position: 'relative',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <PageHeader
        breadcrumbItems={[selectedModule.name, '커뮤니티', currentMenuName]}
        description={content.description}
        actionGroups={hasCreatePermission ? pageActionGroups : undefined}
      />

      <PageMessageArea message="" onClose={() => setErrorMessage(null)} />

      <Box
        ref={setScrollRoot}
        sx={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden' }}
      >
        <Container
          maxWidth="xl"
          sx={{
            py: 3,
            minHeight: '100%',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {isInitialLoading ? (
            <ContentSplitLayout
              left={
                <>
                  <PinnedViewToolbar
                    pinnedCount={pinnedNoticeCount}
                    mode={viewMode}
                    onChange={handleViewModeChange}
                    countLabel="상단고정"
                    modeLabel="공지사항 보기 방식"
                    filterAction={
                      <NoticeFilterMenu
                        filters={noticeGubunOptions}
                        selectedCode={selectedNoticeFilter}
                        onChange={setSelectedNoticeFilter}
                      />
                    }
                  />
                  {pinnedNoticeCount > 0 && (
                    <PinnedItemsPanel
                      items={pinnedNoticeViewItems}
                      ariaLabel="상단 고정 공지"
                    />
                  )}
                  <Box sx={{ mt: 2 }}>
                    {viewMode === 'list' ? (
                      <ListViewSkeleton />
                    ) : (
                      <Box data-testid="notice-feed-skeleton">
                        <FeedViewSkeleton />
                      </Box>
                    )}
                  </Box>
                </>
              }
              right={
                <NoticeSummaryPanel
                  stats={noticeSummary.stats}
                  recentIssues={noticeSummary.recentIssues}
                  isDark={isDark}
                />
              }
            />
          ) : errorMessage && !isRefreshing && !hasVisibleNoticeList ? (
            <Box
              sx={{
                flex: 1,
                minHeight: 0,
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
                bgcolor: theme.palette.background.default,
                color: theme.palette.text.primary,
              }}
            >
              <Typography variant="body2" color="text.primary" align="center">
                공지사항을 불러오지 못했습니다. 네트워크 상태를 확인한 뒤 다시
                시도해 주세요.
              </Typography>
              <IconButton
                aria-label="공지사항 다시 불러오기"
                onClick={() => {
                  void loadNoticePosts();
                }}
              >
                <ReplayOutlined />
              </IconButton>
            </Box>
          ) : noticeItems.length === 0 ? (
            <ContentSplitLayout
              left={
                <>
                  <PinnedViewToolbar
                    pinnedCount={pinnedNoticeCount}
                    mode={viewMode}
                    onChange={handleViewModeChange}
                    countLabel="상단고정"
                    modeLabel="공지사항 보기 방식"
                    filterAction={
                      <NoticeFilterMenu
                        filters={noticeGubunOptions}
                        selectedCode={selectedNoticeFilter}
                        onChange={setSelectedNoticeFilter}
                      />
                    }
                  />
                  {pinnedNoticeItems.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <PinnedItemsPanel
                        items={pinnedNoticeViewItems}
                        ariaLabel="상단 고정 공지"
                        selectedItemId={selectedNoticeId}
                        onItemClick={(item) => {
                          void handleSelectNotice(item);
                        }}
                      />
                    </Box>
                  )}
                  <NoticeEmptyState onCreate={() => setIsComposerOpen(true)} />
                </>
              }
              right={
                <NoticeSummaryPanel
                  stats={noticeSummary.stats}
                  recentIssues={noticeSummary.recentIssues}
                  isDark={isDark}
                />
              }
            />
          ) : (
            <ContentSplitLayout
              left={
                <>
                  <PinnedViewToolbar
                    pinnedCount={pinnedNoticeCount}
                    mode={viewMode}
                    onChange={handleViewModeChange}
                    countLabel="상단고정"
                    modeLabel="공지사항 보기 방식"
                    filterAction={
                      <NoticeFilterMenu
                        filters={noticeGubunOptions}
                        selectedCode={selectedNoticeFilter}
                        onChange={setSelectedNoticeFilter}
                      />
                    }
                  />
                  {pinnedNoticeCount > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <PinnedItemsPanel
                        items={pinnedNoticeViewItems}
                        ariaLabel="상단 고정 공지"
                        selectedItemId={selectedNoticeId}
                        onItemClick={(item) => {
                          void handleSelectNotice(item);
                        }}
                      />
                    </Box>
                  )}
                  {viewMode === 'feed' ? (
                    <NoticeFeedList
                      items={unpinnedNoticeItems}
                      pagination={{
                        scrollRoot,
                        hasNext: noticeHasMore,
                        isLoadingMore,
                        error: pageError || undefined,
                        onLoadMore: loadMoreNoticePosts,
                        onRetry: retryLoadMoreNoticePosts,
                        loadingLabel: '다음 공지 불러오는 중',
                      }}
                      isDark={isDark}
                      isRefreshing={isRefreshing}
                      expandedNoticeId={expandedNoticeId}
                      onToggleExpand={handleToggleNoticeExpand}
                      onNoticeInteract={handleNoticeInteract}
                      onToggleLike={handleToggleLike}
                      onToggleBookmark={handleToggleBookmark}
                      onAddComment={handleAddComment}
                      onEditComment={handleUpdateComment}
                      onDeleteComment={handleDeleteComment}
                      onLoadPreviousComments={handleLoadPreviousComments}
                      onLoadPreviousCommentsError={() =>
                        showError('이전 댓글을 불러오지 못했습니다.')
                      }
                      onDownloadCommentAttachment={
                        handleDownloadCommentAttachment
                      }
                      onDeleteCommentAttachment={handleDeleteCommentAttachment}
                      serverItemRevision={serverItemRevision}
                      onDelete={handleDeleteNotice}
                      onTogglePinned={handleTogglePinned}
                      onEdit={async (item) => {
                        const mappedAttachments = (
                          item.attachmentDetails ?? []
                        ).map((attachment) => ({
                          id: String(
                            attachment.boardFileId ??
                              attachment.objectKey ??
                              `${item.id}-${Math.random()}`,
                          ),
                          name: attachment.name,
                          size: attachment.size,
                          extension:
                            attachment.name.split('.').pop()?.toUpperCase() ||
                            undefined,
                          boardFileId: attachment.boardFileId,
                          objectKey: attachment.objectKey,
                          bucketName: attachment.bucketName,
                          postId: item.id,
                        }));

                        setEditorDraft({
                          id: item.id,
                          title: item.title,
                          body: normalizeNoticeEmbeddedImageSources(
                            item.bodyHtml ?? item.body,
                            item.id,
                          ),
                          isPinned: item.isPinned,
                          loginPopupYn: item.loginPopupYn,
                          popupEndDate: item.popupEndDate,
                          noticeGubunCode: item.noticeGubunCode,
                          attachments: mappedAttachments,
                        });
                        setIsComposerOpen(true);
                      }}
                      onDownload={(noticeId, file) => {
                        void (async () => {
                          const detail = await fetchNoticePostDetail(noticeId);
                          const nextAttachment = (
                            detail.attachments ?? []
                          ).find(
                            (attachment) =>
                              String(attachment.boardFileId ?? '') ===
                                String(file.boardFileId ?? '') ||
                              (attachment.fileName ?? '') === file.name,
                          );

                          if (nextAttachment) {
                            await downloadNoticeAttachment({
                              ...nextAttachment,
                              postId: noticeId,
                            });
                          }
                        })();
                      }}
                    />
                  ) : (
                    <ListView
                      items={unpinnedNoticeViewItems}
                      ariaLabel="리스트형 공지 목록"
                      pagination={{
                        scrollRoot,
                        hasNext: noticeHasMore,
                        isLoadingMore,
                        error: pageError || undefined,
                        onLoadMore: loadMoreNoticePosts,
                        onRetry: retryLoadMoreNoticePosts,
                        loadingLabel: '다음 공지 불러오는 중',
                      }}
                      renderCategoryBadge={(item) => (
                        <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
                          <NoticeLoginPopupBadge loginPopupYn={item.loginPopupYn} popupEndDate={item.popupEndDate} />
                          <PushPinOutlinedIcon fontSize="small"
                            aria-label={item.isPinned ? '상단 고정' : '상단 고정 안 됨'}
                            sx={{ color: item.isPinned ? 'primary.main' : 'text.disabled', flexShrink: 0 }} />
                          <NoticeCategoryBadge code={item.noticeGubunCode}
                            label={item.categoryLabel ?? '공지'} compact />
                        </Box>
                      )}
                      onItemClick={(item) => {
                        void handleSelectNotice(item);
                      }}
                    />
                  )}
                </>
              }
              right={
                <NoticeSummaryPanel
                  stats={noticeSummary.stats}
                  recentIssues={noticeSummary.recentIssues}
                  isDark={isDark}
                />
              }
            />
          )}
        </Container>
      </Box>

      {selectedNotice && (
        <PageAreaOverlay onClose={handleCloseNoticeDetail}>
          {selectedNoticePanel}
        </PageAreaOverlay>
      )}

      <NoticeComposerDialog
        open={isComposerOpen}
        isDark={isDark}
        onClose={() => {
          setEditorDraft({
            title: '',
            body: '',
            noticeGubunCode: '',
            attachments: [],
          });
          setIsComposerOpen(false);
        }}
        onSubmit={handleSaveNotice}
        defaultTitle={editorDraft.title}
        noticeGubunOptions={noticeGubunOptions}
        defaultNoticeGubunCode={editorDraft.noticeGubunCode ?? ''}
        defaultLoginPopupYn={editorDraft.loginPopupYn ?? 'N'}
        defaultPopupEndDate={editorDraft.popupEndDate}
        defaultBody={editorDraft.body}
        defaultAttachments={editorDraft.attachments}
      />
      <UnsavedChangesConfirmDialog
        open={Boolean(pendingPinnedNotice)}
        title={
          pendingPinnedNotice?.isPinned === 'Y' ? '상단 고정 해제' : '상단 고정'
        }
        description={
          pendingPinnedNotice?.isPinned === 'Y'
            ? '이 게시글의 상단 고정을 해제하시겠습니까?'
            : '이 게시글을 상단에 고정하시겠습니까?'
        }
        cancelLabel="취소"
        continueLabel="확인"
        onCancel={() => setPendingPinnedNotice(null)}
        onContinue={() => {
          void confirmTogglePinned();
        }}
      />
    </Box>
  );
}

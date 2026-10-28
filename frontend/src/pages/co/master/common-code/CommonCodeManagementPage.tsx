import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, IconButton, TextField } from '@mui/material';
import ClearIcon from '@mui/icons-material/Clear';
import SearchIcon from '@mui/icons-material/Search';
import SaveIcon from '@mui/icons-material/Save';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { type PermissionActionGroupDefinition } from '../../../../shared/components/PermissionGroup';
import { PageMessageArea } from '../../../../shared/components/PageMessageArea';
import { PageSearchArea } from '../../../../shared/components/PageSearchArea';
import { UnsavedChangesConfirmDialog } from '../../../../shared/components/UnsavedChangesConfirmDialog';
import { useNotification } from '../../../../shared/context/NotificationContext';
import { usePageSessionState } from '../../../../shared/hooks/usePageSessionState';
import type {
  ModuleItem,
  PageContent,
} from '../../../dashboard/types/dashboard';
import {
  CommonCodeManagementPanel,
  groupColumns,
  type CommonCodeManagementPanelHandle,
} from './components/CommonCodeManagementPanel';
import {
  fetchCommonCodeGroups,
  type CommonCodeGroupSearchFilters,
} from './services/commonCodeManagement.service';
import type { CommonCodeGroupRow } from './types/commonCodeManagement.types';
import {
  toPageSearchFields,
  type PageSearchFieldValue,
} from '../../../../shared/components/page-search/searchFields';
import {
  applyCommonCodeSearchSession,
  getCommonCodeInitialFilters,
  initialCommonCodePageSession,
  isCommonCodePageSession,
  type CommonCodeSearchMode,
} from './commonCodePageSession';

type CommonCodeManagementPageProps = {
  selectedModule: ModuleItem;
  currentMenuName: string;
  content: PageContent;
  breadcrumbItems?: string[];
  selectedMenuPermissions?: {
    read: boolean;
    create: boolean;
    update: boolean;
    delete: boolean;
    excel?: boolean;
  };
};

export function CommonCodeManagementPage({
  selectedModule,
  currentMenuName,
  content,
  breadcrumbItems,
  selectedMenuPermissions,
}: CommonCodeManagementPageProps) {
  const { showSuccess } = useNotification();
  const { state: pageSession, setState: setPageSession } = usePageSessionState(
    'songyeon-erp:page:common-code-management',
    initialCommonCodePageSession,
    {
      version: 2,
      validate: isCommonCodePageSession,
    },
  );
  const panelRef = useRef<CommonCodeManagementPanelHandle>(null);
  const [groups, setGroups] = useState<CommonCodeGroupRow[]>([]);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState(pageSession.searchQuery);
  const [panelDirty, setPanelDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [commonCodeGridKey, setCommonCodeGridKey] = useState(0);
  const [refreshConfirmOpen, setRefreshConfirmOpen] = useState(false);
  const [detailValues, setDetailValues] = useState<
    Record<string, PageSearchFieldValue>
  >(pageSession.detailValues);
  const pendingSearchRef = useRef<{
    filters: CommonCodeGroupSearchFilters;
    mode: CommonCodeSearchMode;
    searchQuery: string;
    detailValues: Record<string, PageSearchFieldValue>;
  } | null>(null);
  const groupRequestIdRef = useRef(0);
  const handleSelectedGroupChange = useCallback(
    (selectedGroupId: string) => {
      setPageSession((current) => {
        if (current.selectedGroupId === selectedGroupId) {
          return current;
        }

        return {
          ...current,
          selectedGroupId,
        };
      });
    },
    [setPageSession],
  );
  const handleGroupRowSelectionChange = useCallback(
    (selectedGroupRowIds: Array<string | number>) => {
      const nextIds = selectedGroupRowIds.map(String);
      setPageSession((current) =>
        JSON.stringify(current.selectedGroupRowIds) === JSON.stringify(nextIds)
          ? current
          : { ...current, selectedGroupRowIds: nextIds },
      );
    },
    [setPageSession],
  );
  const handleItemRowSelectionChange = useCallback(
    (selectedItemRowIds: Array<string | number>) => {
      const nextIds = selectedItemRowIds.map(String);
      setPageSession((current) =>
        JSON.stringify(current.selectedItemRowIds) === JSON.stringify(nextIds)
          ? current
          : { ...current, selectedItemRowIds: nextIds },
      );
    },
    [setPageSession],
  );
  const handleSplitterSizeChange = useCallback(
    (splitterSize: number) => {
      setPageSession((current) =>
        current.splitterSize === splitterSize
          ? current
          : { ...current, splitterSize },
      );
    },
    [setPageSession],
  );

  const pageActionPermissions = useMemo(() => {
    const writeAllowed = Boolean(
      selectedMenuPermissions?.create || selectedMenuPermissions?.update,
    );

    return {
      read: Boolean(selectedMenuPermissions?.read ?? false),
      write: writeAllowed,
      delete: Boolean(selectedMenuPermissions?.delete ?? false),
      excel: Boolean(selectedMenuPermissions?.excel ?? false),
    };
  }, [selectedMenuPermissions]);

  const loadGroups = useCallback(
    async ({
      filters = {},
      showSkeleton = false,
    }: {
      filters?: CommonCodeGroupSearchFilters;
      showSkeleton?: boolean;
    } = {}) => {
      const requestId = ++groupRequestIdRef.current;
      setError('');
      if (showSkeleton) {
        setPageLoading(true);
      }
      try {
        const result = await fetchCommonCodeGroups(filters);
        if (requestId === groupRequestIdRef.current) {
          setGroups(result);
        }
      } catch (requestError) {
        if (requestId === groupRequestIdRef.current) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : '공통코드 목록을 불러오지 못했습니다.',
          );
        }
        throw requestError;
      } finally {
        if (requestId === groupRequestIdRef.current && showSkeleton) {
          setPageLoading(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    void loadGroups({
      filters: getCommonCodeInitialFilters(pageSession),
      showSkeleton: true,
    }).catch(() => undefined);
    // The initial session snapshot must not trigger another load after a search.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadGroups]);

  const handleGroupsSaved = useCallback(
    async (_options?: { silent?: boolean }) => {
      await loadGroups({ filters: pageSession.appliedFilters });
      setPanelDirty(false);
      setCommonCodeGridKey((current) => current + 1);
    },
    [loadGroups, pageSession.appliedFilters],
  );

  const handleSaveChanges = useCallback(async () => {
    if (!panelRef.current) return;
    setSaving(true);
    try {
      await panelRef.current.saveCurrentChanges();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : '공통코드 저장에 실패했습니다.',
      );
    } finally {
      setSaving(false);
    }
  }, []);

  const executeRefresh = useCallback(
    async (
      filters: CommonCodeGroupSearchFilters,
      mode: CommonCodeSearchMode,
      searchQueryValue = searchQuery,
      detailValuesValue = detailValues,
    ) => {
      try {
        await loadGroups({ filters, showSkeleton: true });
        setPageSession((current) =>
          applyCommonCodeSearchSession(current, {
            mode,
            searchQuery: searchQueryValue,
            detailValues: detailValuesValue,
            filters,
          }),
        );
      } catch {
        // loadGroups already exposes the request error and keeps the old session.
      }
    },
    [detailValues, loadGroups, searchQuery, setPageSession],
  );

  const requestRefresh = useCallback(
    (
      filters: CommonCodeGroupSearchFilters = { keyword: searchQuery },
      mode: CommonCodeSearchMode = 'default',
    ) => {
      if (panelDirty) {
          pendingSearchRef.current = {
            filters,
            mode,
            searchQuery,
            detailValues,
          };
        setRefreshConfirmOpen(true);
        return;
      }
      void executeRefresh(filters, mode);
    },
    [executeRefresh, panelDirty, searchQuery],
  );

  const confirmRefresh = useCallback(() => {
    setRefreshConfirmOpen(false);
    setPanelDirty(false);
    setCommonCodeGridKey((current) => current + 1);
    const pendingSearch = pendingSearchRef.current ?? {
      filters: { keyword: searchQuery },
      mode: 'default' as const,
      searchQuery,
      detailValues,
    };
    pendingSearchRef.current = null;
    void executeRefresh(
      pendingSearch.filters,
      pendingSearch.mode,
      pendingSearch.searchQuery,
      pendingSearch.detailValues,
    );
  }, [executeRefresh, searchQuery, detailValues]);

  const detailFields = toPageSearchFields(groupColumns);
  const handleDetailSearch = useCallback(
    (values: Record<string, PageSearchFieldValue>) => {
      const toText = (value: PageSearchFieldValue): string => {
        if (value == null || typeof value === 'object') return '';
        return String(value).trim();
      };
      requestRefresh(
        {
          groupCode: toText(values.groupCode),
          groupNm: toText(values.groupNm),
          groupDc: toText(values.groupDc),
        },
        'detail',
      );
    },
    [requestRefresh],
  );

  const pageActionGroups: PermissionActionGroupDefinition[] = [
    {
      key: 'read',
      actions: [
        {
          label: '조회',
          icon: SearchIcon,
          visible: pageActionPermissions.read,
          disabled: false,
          onClick: requestRefresh,
        },
      ],
    },
    {
      key: 'write',
      actions: [
        {
          label: '저장',
          icon: SaveIcon,
          visible: pageActionPermissions.write,
          disabled: !panelDirty || saving,
          onClick: () => {
            void handleSaveChanges();
          },
        },
      ],
    },
  ];

  return (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        height: '100%',
      }}
    >
      <PageHeader
        breadcrumbItems={
          breadcrumbItems && breadcrumbItems.length > 0
            ? breadcrumbItems
            : [selectedModule.name, currentMenuName]
        }
        description={content.description}
        actionGroups={pageActionGroups}
      />
      <PageSearchArea
        searchField={
          <TextField
            size="small"
            margin="none"
            placeholder="그룹 코드/명/설명 검색"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            slotProps={{
              htmlInput: { 'aria-label': '공통코드 검색' },
              input: {
                endAdornment: searchQuery ? (
                  <IconButton
                    type="button"
                    size="small"
                    edge="end"
                    aria-label="공통코드 검색어 초기화"
                    onClick={() => setSearchQuery('')}
                    sx={{ p: 0.25 }}
                  >
                    <ClearIcon fontSize="small" />
                  </IconButton>
                ) : null,
              },
            }}
            sx={(theme) => ({
              width: '100%',
              height: 40,
              '& .MuiOutlinedInput-root': {
                height: '100%',
                borderRadius: '0 8px 8px 0',
                backgroundColor:
                  theme.palette.mode === 'dark'
                    ? 'rgba(15, 23, 42, 0.72)'
                    : 'rgba(255,255,255,0.72)',
              },
            })}
          />
        }
        onDefaultSearch={() =>
          requestRefresh({ keyword: searchQuery }, 'default')
        }
        detailFields={detailFields}
        detailValues={detailValues}
        onDetailValuesChange={setDetailValues}
        onDetailSearch={handleDetailSearch}
        detailLoading={pageLoading}
      />
      <PageMessageArea message={error} onClose={() => setError('')} />
      <CommonCodeManagementPanel
        ref={panelRef}
        groups={groups}
        searchQuery={searchQuery}
        canExportExcel={pageActionPermissions.excel}
        canWrite={pageActionPermissions.write}
        canDelete={pageActionPermissions.delete}
        onGroupsSaved={handleGroupsSaved}
        onSaveSuccess={showSuccess}
        onDirtyChange={setPanelDirty}
        onError={setError}
        commonCodeGridKey={commonCodeGridKey}
        groupsLoading={pageLoading}
        initialSelectedGroupId={pageSession.selectedGroupId}
        onSelectedGroupChange={handleSelectedGroupChange}
        initialSelectedGroupRowIds={pageSession.selectedGroupRowIds}
        initialSelectedItemRowIds={pageSession.selectedItemRowIds}
        onGroupRowSelectionChange={handleGroupRowSelectionChange}
        onItemRowSelectionChange={handleItemRowSelectionChange}
        initialSplitterSize={pageSession.splitterSize}
        onSplitterSizeChange={handleSplitterSizeChange}
      />
      <UnsavedChangesConfirmDialog
        open={refreshConfirmOpen}
        title="저장하지 않은 변경사항"
        description="변경사항을 버리고 공통코드 목록을 다시 불러오시겠습니까?"
        cancelLabel="취소"
        continueLabel="계속"
        onCancel={() => setRefreshConfirmOpen(false)}
        onContinue={confirmRefresh}
      />
    </Box>
  );
}

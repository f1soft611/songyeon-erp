import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, TextField, IconButton } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import SaveIcon from '@mui/icons-material/Save';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { PageLoadBoundary } from '../../../../shared/components/PageLoadBoundary';
import { useInitialLoadState } from '../../../../shared/hooks/useInitialLoadState';
import { type PermissionActionGroupDefinition } from '../../../../shared/components/PermissionGroup';
import { PageMessageArea } from '../../../../shared/components/PageMessageArea';
import { PageSearchArea } from '../../../../shared/components/PageSearchArea';
import { UnsavedChangesConfirmDialog } from '../../../../shared/components/UnsavedChangesConfirmDialog';
import { useNotification } from '../../../../shared/context/NotificationContext';
import { useUnsavedChangesBeforeUnload } from '../../../../shared/hooks/useUnsavedChangesBeforeUnload';
import type {
  ModuleItem,
  PageContent,
} from '../../../dashboard/types/dashboard';
import {
  ModuleManagementPanel,
  type ModuleManagementPanelHandle,
} from './components/ModuleManagementPanel';
import {
  createModule,
  deleteModule,
  fetchModuleRows,
  updateModule,
} from './services/moduleManagement.service';
import type { ModuleManagementRow } from './types/moduleManagement.types';

type ModuleManagementPageProps = {
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

export function ModuleManagementPage({
  selectedModule,
  currentMenuName,
  content,
  breadcrumbItems,
  selectedMenuPermissions,
}: ModuleManagementPageProps) {
  const { showSuccess } = useNotification();
  const modulePanelRef = useRef<ModuleManagementPanelHandle>(null);
  const [modules, setModules] = useState<ModuleManagementRow[]>([]);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [panelDirty, setPanelDirty] = useState(false);
  useUnsavedChangesBeforeUnload(panelDirty);
  const [saving, setSaving] = useState(false);
  const [pageLoading, setPageLoading] = useState(false);
  const [moduleGridKey, setModuleGridKey] = useState(0);
  const [refreshConfirmOpen, setRefreshConfirmOpen] = useState(false);
  const moduleRequestIdRef = useRef(0);
  const { start, succeed, fail, ...initialLoad } = useInitialLoadState();

  const filteredModules = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return modules;
    return modules.filter((module) =>
      [module.moduleCode, module.moduleName, module.iconName, module.moduleUrl]
        .join(' ')
        .toLowerCase()
        .includes(query),
    );
  }, [modules, searchQuery]);

  const pageActionPermissions = useMemo(
    () => ({
      read: Boolean(selectedMenuPermissions?.read ?? false),
      write: Boolean(
        selectedMenuPermissions?.create || selectedMenuPermissions?.update,
      ),
      delete: Boolean(selectedMenuPermissions?.delete ?? false),
      excel: Boolean(selectedMenuPermissions?.excel ?? false),
    }),
    [selectedMenuPermissions],
  );

  const loadModules = useCallback(
    async ({ showSkeleton = false }: { showSkeleton?: boolean } = {}) => {
      const requestId = ++moduleRequestIdRef.current;
      start();
      setError('');
      if (showSkeleton) {
        setPageLoading(true);
      }

      try {
        const result = await fetchModuleRows();
        if (requestId === moduleRequestIdRef.current) {
          setModules(result);
          succeed();
        }
      } catch (requestError) {
        if (requestId === moduleRequestIdRef.current) {
          fail(requestError);
          setError(
            requestError instanceof Error
              ? requestError.message
              : '모듈 목록을 불러오지 못했습니다.',
          );
        }
        throw requestError;
      } finally {
        if (requestId === moduleRequestIdRef.current && showSkeleton) {
          setPageLoading(false);
        }
      }
    },
    [start, succeed, fail],
  );

  useEffect(() => {
    void loadModules({ showSkeleton: true }).catch(() => undefined);
  }, [loadModules]);

  const handleModulesSaved = useCallback(async () => {
    await loadModules();
    setPanelDirty(false);
    setModuleGridKey((current) => current + 1);
  }, [loadModules]);

  const handleSaveChanges = useCallback(async () => {
    if (!modulePanelRef.current || saving) return;
    setSaving(true);
    try {
      await modulePanelRef.current.saveCurrentChanges();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : '모듈 저장에 실패했습니다.',
      );
    } finally {
      setSaving(false);
    }
  }, [saving]);

  const requestModuleRefresh = useCallback(() => {
    if (saving) return;
    if (panelDirty) {
      setRefreshConfirmOpen(true);
      return;
    }
    void loadModules({ showSkeleton: true }).catch(() => undefined);
  }, [loadModules, panelDirty, saving]);

  const confirmModuleRefresh = useCallback(() => {
    if (saving) return;
    setRefreshConfirmOpen(false);
    setPanelDirty(false);
    setModuleGridKey((current) => current + 1);
    void loadModules({ showSkeleton: true }).catch(() => undefined);
  }, [loadModules, saving]);

  const pageActionGroups: PermissionActionGroupDefinition[] = [
    {
      key: 'read',
      actions: [
        {
          label: '조회',
          icon: SearchIcon,
          visible: pageActionPermissions.read,
          disabled: saving,
          onClick: requestModuleRefresh,
        },
      ],
    },
    {
      key: 'write',
      actions: [
        {
          label: '저장',
          icon: SaveIcon,
          saving,
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
        overflow: 'hidden',
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
      <PageLoadBoundary {...initialLoad} label="모듈 목록" onRetry={requestModuleRefresh}>
      <PageSearchArea>
        <TextField
          disabled={saving}
          size="small"
          margin="none"
          placeholder="모듈 코드/명/경로/아이콘 검색"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          slotProps={{
            htmlInput: { 'aria-label': '모듈 검색' },
            input: {
              endAdornment: searchQuery ? (
                <IconButton
                  size="small"
                  aria-label="검색어 초기화"
                  disabled={saving}
                  onClick={() => setSearchQuery('')}
                  edge="end"
                  sx={{ mr: 0.5, color: 'text.secondary' }}
                >
                  <ClearIcon fontSize="small" />
                </IconButton>
              ) : null,
            },
          }}
          sx={(theme) => ({
            flex: '1 1 220px',
            minWidth: { xs: '100%', sm: 220 },
            maxWidth: 360,
            height: 40,
            '& .MuiOutlinedInput-root': {
              height: '100%',
              borderRadius: 2,
              backgroundColor:
                theme.palette.mode === 'dark'
                  ? 'rgba(15, 23, 42, 0.72)'
                  : 'rgba(255,255,255,0.72)',
            },
          })}
        />
      </PageSearchArea>
      <PageMessageArea message={error} onClose={() => setError('')} />
      <ModuleManagementPanel
        ref={modulePanelRef}
        modules={filteredModules}
        canExportExcel={pageActionPermissions.excel}
        canWrite={pageActionPermissions.write}
        canDelete={pageActionPermissions.delete}
        onCreateModule={createModule}
        onUpdateModule={updateModule}
        onDeleteModule={deleteModule}
        onModulesSaved={handleModulesSaved}
        onSaveSuccess={showSuccess}
        onDirtyChange={setPanelDirty}
        onError={setError}
        moduleGridKey={moduleGridKey}
        moduleGridLoading={pageLoading}
        saving={saving}
      />
      <UnsavedChangesConfirmDialog
        open={refreshConfirmOpen}
        title="저장하지 않은 변경사항"
        description="변경사항을 버리고 모듈 목록을 다시 불러오시겠습니까?"
        cancelLabel="취소"
        continueLabel="계속"
        onCancel={() => setRefreshConfirmOpen(false)}
        onContinue={confirmModuleRefresh}
      />
      </PageLoadBoundary>
    </Box>
  );
}

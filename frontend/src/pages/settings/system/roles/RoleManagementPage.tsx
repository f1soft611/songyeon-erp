import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, TextField } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
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
  RoleManagementPanel,
  type RoleManagementPanelHandle,
} from './components/RoleManagementPanel';
import {
  createRole,
  fetchRoleRows,
  updateRole,
  type RoleSavePayload,
} from './services/roleManagement.service';
import type { RoleManagementRow } from './types/roleManagement.types';

type RoleManagementPageProps = {
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

export function RoleManagementPage({
  selectedModule,
  currentMenuName,
  content,
  breadcrumbItems,
  selectedMenuPermissions,
}: RoleManagementPageProps) {
  const { showSuccess } = useNotification();
  const rolePanelRef = useRef<RoleManagementPanelHandle>(null);
  const [roles, setRoles] = useState<RoleManagementRow[]>([]);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [panelDirty, setPanelDirty] = useState(false);
  useUnsavedChangesBeforeUnload(panelDirty);
  const [saving, setSaving] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [pageLoading, setPageLoading] = useState(false);
  const [roleGridKey, setRoleGridKey] = useState(0);
  const [refreshConfirmOpen, setRefreshConfirmOpen] = useState(false);
  const roleRequestIdRef = useRef(0);
  const { start, succeed, fail, ...initialLoad } = useInitialLoadState();

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

  const loadRoles = useCallback(
    async ({
      showSkeleton = false,
    }: {
      showSkeleton?: boolean;
    } = {}): Promise<'applied' | 'stale'> => {
      const requestId = ++roleRequestIdRef.current;
      start();
      setError('');
      if (showSkeleton) {
        setPageLoading(true);
      }
      try {
        const result = await fetchRoleRows();
        // A superseded request must not be reported as an applied refresh.
        if (requestId !== roleRequestIdRef.current) return 'stale';
        setRoles(result);
        succeed();
        return 'applied';
      } catch (requestError) {
        if (requestId === roleRequestIdRef.current) {
          fail(requestError);
          setError(
            requestError instanceof Error
              ? requestError.message
              : '역할 목록을 불러오지 못했습니다.',
          );
        }
        throw requestError;
      } finally {
        if (requestId === roleRequestIdRef.current && showSkeleton) {
          setPageLoading(false);
        }
      }
    },
    [start, succeed, fail],
  );

  useEffect(() => {
    void loadRoles({ showSkeleton: true }).catch(() => undefined);
  }, [loadRoles]);

  const handleCreateRole = async (payload: RoleSavePayload) => {
    await createRole(payload);
  };

  const handleUpdateRole = async (roleId: string, payload: RoleSavePayload) => {
    await updateRole(roleId, payload);
  };

  const handleRolesSaved = useCallback(
    async (_options?: { silent?: boolean }) => {
      const status = await loadRoles();
      if (status === 'applied') setRoleGridKey((current) => current + 1);
      return status;
    },
    [loadRoles],
  );

  const handleSaveChanges = useCallback(async () => {
    if (saving || reloading || !rolePanelRef.current) return;
    try {
      await rolePanelRef.current.saveCurrentChanges();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : '역할 저장에 실패했습니다.',
      );
    }
  }, [reloading, saving]);

  const requestRoleRefresh = useCallback(() => {
    if (saving || reloading) return;
    if (panelDirty) {
      setRefreshConfirmOpen(true);
      return;
    }
    // loadRoles already surfaces the error in the page message area.
    setReloading(true);
    void loadRoles({ showSkeleton: true })
      .catch(() => undefined)
      .finally(() => setReloading(false));
  }, [loadRoles, panelDirty, reloading, saving]);

  const confirmRoleRefresh = useCallback(() => {
    if (saving || reloading) return;
    setRefreshConfirmOpen(false);
    const reloadRoles = async () => {
      const status = await loadRoles({ showSkeleton: true });
      if (status === 'applied') {
        setRoleGridKey((current) => current + 1);
      }
      return status;
    };
    setReloading(true);
    void (
      rolePanelRef.current?.discardPendingChanges(reloadRoles) ?? reloadRoles()
    )
      .catch(() => undefined)
      .finally(() => setReloading(false));
  }, [loadRoles, reloading, saving]);

  const pageActionGroups: PermissionActionGroupDefinition[] = [
    {
      key: 'read',
      actions: [
        {
          label: '조회',
          icon: SearchIcon,
          visible: pageActionPermissions.read,
          disabled: saving || reloading,
          onClick: requestRoleRefresh,
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
          disabled: !panelDirty || saving || reloading,
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
      <PageLoadBoundary {...initialLoad} label="역할 목록" onRetry={requestRoleRefresh}>
      <PageSearchArea>
        <TextField
          size="small"
          margin="none"
          placeholder="역할 코드/명/설명 검색"
          value={searchQuery}
          disabled={saving}
          onChange={(event) => {
            if (!saving) setSearchQuery(event.target.value);
          }}
          slotProps={{
            htmlInput: { 'aria-label': '역할 검색' },
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
      <RoleManagementPanel
        ref={rolePanelRef}
        roles={roles}
        searchQuery={searchQuery}
        canExportExcel={pageActionPermissions.excel}
        canWrite={pageActionPermissions.write}
        canDelete={pageActionPermissions.delete}
        onCreateRole={handleCreateRole}
        onUpdateRole={handleUpdateRole}
        onRolesSaved={handleRolesSaved}
        onSaveSuccess={showSuccess}
        onDirtyChange={setPanelDirty}
        onSavingChange={setSaving}
        onError={setError}
        roleGridKey={roleGridKey}
        roleGridLoading={pageLoading}
      />
      <UnsavedChangesConfirmDialog
        open={refreshConfirmOpen}
        title="저장하지 않은 변경사항"
        description="변경사항을 버리고 권한 목록을 다시 불러오시겠습니까?"
        cancelLabel="취소"
        continueLabel="계속"
        disableContinue={saving}
        onCancel={() => setRefreshConfirmOpen(false)}
        onContinue={confirmRoleRefresh}
      />
      </PageLoadBoundary>
    </Box>
  );
}

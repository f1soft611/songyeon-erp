import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  FormControl,
  IconButton,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';
import { type PermissionActionGroupDefinition } from '../../../../shared/components/PermissionGroup';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { UnsavedChangesConfirmDialog } from '../../../../shared/components/UnsavedChangesConfirmDialog';
import { PageSearchArea } from '../../../../shared/components/PageSearchArea';
import { PageMessageArea } from '../../../../shared/components/PageMessageArea';
import { useNotification } from '../../../../shared/context/NotificationContext';
import type {
  MenuPermission,
  MenuTreeNode,
  ModuleItem,
  PageContent,
} from '../../../dashboard/types/dashboard';
import { MenuManagementPanel } from './components/MenuManagementPanel';
import { MENU_PERMISSION_GROUPS } from './constants/menuPermissionGroups';
import { fetchRoleRows } from '../roles/services/roleManagement.service';
import type { RoleManagementRow } from '../roles/types/roleManagement.types';
import {
  fetchActivePermissions,
  fetchMenuRows,
  fetchModules,
} from './services/menuManagement.service';
import type {
  MenuManagementRow,
  MenuModuleOption,
  MenuPermissionDefinition,
} from './types/menuManagement.types';

type MenuManagementPageProps = {
  selectedModule: ModuleItem;
  currentMenuName: string;
  content: PageContent;
  breadcrumbItems?: string[];
  selectedMenuPermissions?: MenuPermission;
};

export function MenuManagementPage({
  selectedModule: dashboardModule,
  currentMenuName,
  content,
  breadcrumbItems,
  selectedMenuPermissions,
}: MenuManagementPageProps) {
  const { showSuccess } = useNotification();
  const [menus, setMenus] = useState<MenuManagementRow[]>([]);
  const [modules, setModules] = useState<MenuModuleOption[]>([]);
  const [roles, setRoles] = useState<RoleManagementRow[]>([]);
  const [permissions, setPermissions] = useState<MenuPermissionDefinition[]>(
    [],
  );
  const [selectedModuleId, setSelectedModuleId] = useState<number>();
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [reloadToken, setReloadToken] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [dirty, setDirty] = useState(false);
  const hasRequiredSelection =
    Boolean(selectedModuleId) && Boolean(selectedRoleId);
  const filteredMenus = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return menus;

    return menus.filter((row) => {
      const haystack = [row.name, row.code, row.path, row.description]
        .map((value) => String(value ?? '').trim())
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [menus, searchQuery]);
  const [pendingModuleId, setPendingModuleId] = useState<number>();
  const [pendingRoleId, setPendingRoleId] = useState<string>();
  const [pendingPermissionReload, setPendingPermissionReload] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const menuLoadRequestIdRef = useRef(0);
  const menuPanelRef = useRef<{
    saveCurrentChanges: () => Promise<void>;
    deleteSelectedRows: () => void;
    exportCurrentRows: () => void;
  } | null>(null);

  const hasPermission = (permissionCode: string) =>
    permissions.some(
      (permission) => permission.permissionCode === permissionCode,
    );

  const currentPagePermission = (() => {
    const normalize = (value: string) =>
      value.replace(/\s+/g, '').toLowerCase();

    const findPagePermission = (
      nodes: MenuTreeNode[],
    ): MenuPermission | undefined => {
      for (const node of nodes) {
        const sameName =
          normalize(node.name ?? '') === normalize(currentMenuName);
        const sameLabel =
          normalize(node.name ?? '') === normalize(String(content.title ?? ''));

        if ((sameName || sameLabel) && node.permissions) {
          return node.permissions;
        }

        if (node.children?.length) {
          const nestedPermission = findPagePermission(node.children);
          if (nestedPermission) return nestedPermission;
        }
      }

      return undefined;
    };

    return (
      selectedMenuPermissions ??
      findPagePermission(dashboardModule.tree ?? []) ?? {
        read: MENU_PERMISSION_GROUPS[0].codes.some((code) =>
          hasPermission(code),
        ),
        create: MENU_PERMISSION_GROUPS[1].codes.some(
          (code) => hasPermission(code) && code === 'CREATE',
        ),
        update: MENU_PERMISSION_GROUPS[1].codes.some(
          (code) => hasPermission(code) && code === 'UPDATE',
        ),
        delete: MENU_PERMISSION_GROUPS[2].codes.some((code) =>
          hasPermission(code),
        ),
        excel: MENU_PERMISSION_GROUPS[3].codes.some((code) =>
          hasPermission(code),
        ),
      }
    );
  })();

  const pageActionPermissions = {
    read: Boolean(currentPagePermission?.read ?? false),
    write: Boolean(
      currentPagePermission?.create || currentPagePermission?.update || false,
    ),
    delete: Boolean(currentPagePermission?.delete ?? false),
    excel: Boolean(currentPagePermission?.excel ?? false),
  };

  const pageActionGroups: PermissionActionGroupDefinition[] = [
    {
      key: 'read',
      actions: [
        {
          label: '조회',
          icon: SearchIcon,
          visible: pageActionPermissions.read,
          disabled: false,
          onClick: () => {
            if (!selectedModuleId) return;
            void requestRefresh(selectedModuleId, false, true);
          },
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
          disabled: !dirty || saving,
          onClick: async () => {
            if (!menuPanelRef.current) return;
            await menuPanelRef.current.saveCurrentChanges();
          },
        },
      ],
    },
    {
      key: 'delete',
      actions: [
        {
          label: '삭제',
          icon: DeleteIcon,
          visible: pageActionPermissions.delete,
          disabled: saving,
          onClick: () => {
            menuPanelRef.current?.deleteSelectedRows();
          },
        },
      ],
    },
  ];

  async function loadMenus(
    moduleId: number,
    reloadPermissions = false,
    clearVisibleMenus = false,
    roleId = selectedRoleId,
    showSkeleton = false,
  ) {
    if (!moduleId || !roleId) {
      setMenus([]);
      setDirty(false);
      setError('');
      return false;
    }

    const requestId = ++menuLoadRequestIdRef.current;
    if (showSkeleton) {
      setLoading(true);
    }
    if (clearVisibleMenus) setMenus([]);
    try {
      setError('');
      const [nextMenus, nextPermissions] = await Promise.all([
        fetchMenuRows(moduleId, roleId),
        reloadPermissions
          ? fetchActivePermissions()
          : Promise.resolve(undefined),
      ]);
      if (requestId !== menuLoadRequestIdRef.current) return false;
      setMenus(nextMenus);
      if (nextPermissions) setPermissions(nextPermissions);
      setDirty(false);
      return true;
    } catch (requestError) {
      if (requestId !== menuLoadRequestIdRef.current) return false;
      setError(
        requestError instanceof Error
          ? requestError.message
          : '메뉴 목록을 불러오지 못했습니다.',
      );
      return false;
    } finally {
      if (requestId === menuLoadRequestIdRef.current && showSkeleton) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    async function initialize() {
      setError('');
      try {
        const [modulesResult, permissionsResult] = await Promise.all([
          fetchModules(),
          fetchActivePermissions(),
        ]);
        setModules(modulesResult);
        setPermissions(permissionsResult);

        let nextRoles: RoleManagementRow[] = [];
        try {
          nextRoles = await fetchRoleRows();
        } catch {
          nextRoles = [];
        }
        setRoles(nextRoles);

        const firstModule = modulesResult[0];
        setSelectedModuleId(firstModule?.moduleId);
        if (firstModule && selectedRoleId) {
          await loadMenus(firstModule.moduleId, false, true, selectedRoleId);
        } else {
          setMenus([]);
        }
      } catch (requestError) {
        setMenus([]);
        setError(
          requestError instanceof Error
            ? requestError.message
            : '메뉴 관리 정보를 불러오지 못했습니다.',
        );
      }
    }

    void initialize();
  }, []);

  const selectedModule = modules.find(
    (module) => module.moduleId === selectedModuleId,
  );

  function requestModuleChange(moduleId: number) {
    if (loading || moduleId === selectedModuleId) return;
    if (dirty) {
      setPendingModuleId(moduleId);
      setPendingRoleId(selectedRoleId);
      setPendingPermissionReload(true);
      setConfirmOpen(true);
      return;
    }
    setSelectedModuleId(moduleId);
    if (!selectedRoleId) {
      setMenus([]);
      setDirty(false);
      setError('');
      return;
    }
    void loadMenus(moduleId, true, true, selectedRoleId, true).then(
      (didLoad) => {
        if (didLoad) {
          setReloadToken((current) => current + 1);
        }
      },
    );
  }

  function requestRoleChange(roleId: string) {
    if (loading || roleId === selectedRoleId || !selectedModuleId) return;
    if (dirty) {
      setPendingModuleId(selectedModuleId);
      setPendingRoleId(roleId);
      setPendingPermissionReload(true);
      setConfirmOpen(true);
      return;
    }
    setSelectedRoleId(roleId);
    if (!selectedModuleId || !roleId) {
      setMenus([]);
      setDirty(false);
      setError('');
      return;
    }
    void loadMenus(selectedModuleId, true, true, roleId, true).then(
      (didLoad) => {
        if (didLoad) {
          setReloadToken((current) => current + 1);
        }
      },
    );
  }

  function requestRefresh(
    moduleId: number,
    bypassDirtyConfirmation = false,
    showSkeleton = false,
  ) {
    if (loading && showSkeleton) return Promise.resolve();
    if (!selectedModuleId || !selectedRoleId) {
      setMenus([]);
      setError('');
      return Promise.resolve();
    }
    if (dirty && !bypassDirtyConfirmation) {
      setPendingModuleId(moduleId);
      setPendingPermissionReload(false);
      setConfirmOpen(true);
      return Promise.resolve();
    }
    return loadMenus(moduleId, false, false, selectedRoleId, showSkeleton).then(
      (didLoad) => {
        if (didLoad) {
          setReloadToken((current) => current + 1);
        }
      },
    );
  }

  function confirmDiscardChanges() {
    const nextModuleId = pendingModuleId;
    const nextRoleId = pendingRoleId ?? selectedRoleId;
    const reloadPermissions = pendingPermissionReload;
    setConfirmOpen(false);
    setPendingModuleId(undefined);
    setPendingRoleId(undefined);
    setPendingPermissionReload(false);
    if (nextModuleId === undefined) return;
    const moduleChanged = nextModuleId !== selectedModuleId;
    if (moduleChanged) setSelectedModuleId(nextModuleId);
    if (nextRoleId && nextRoleId !== selectedRoleId) {
      setSelectedRoleId(nextRoleId);
    }
    void loadMenus(
      nextModuleId,
      reloadPermissions,
      moduleChanged,
      nextRoleId,
      true,
    ).then((didLoad) => {
      if (didLoad) {
        setReloadToken((current) => current + 1);
      }
    });
  }

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
            : [dashboardModule.name, currentMenuName]
        }
        description={content.description}
        actionGroups={pageActionGroups}
      />
      <PageSearchArea
        searchField={
          <TextField
            size="small"
            margin="none"
            placeholder="메뉴명/코드 검색"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && selectedModuleId) {
                event.preventDefault();
                void requestRefresh(selectedModuleId, false, true);
              }
            }}
            slotProps={{
              htmlInput: { 'aria-label': '메뉴 검색' },
              input: {
                endAdornment: searchQuery ? (
                  <IconButton
                    size="small"
                    aria-label="검색어 초기화"
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
                borderRadius: '0 8px 8px 0',
                backgroundColor:
                  theme.palette.mode === 'dark'
                    ? 'rgba(15, 23, 42, 0.72)'
                    : 'rgba(255,255,255,0.72)',
              },
            })}
          />
        }
      >
        <FormControl
          size="small"
          sx={(theme) => ({
            width: { xs: '100%', md: 'auto' },
            minWidth: { md: 220 },
            maxWidth: '100%',
            flex: { xs: '1 1 100%', md: '0 1 280px' },
            height: 40,
            m: 0,
            '& .MuiOutlinedInput-root': {
              height: '100%',
              borderRadius: 2,
              backgroundColor:
                theme.palette.mode === 'dark'
                  ? 'rgba(15, 23, 42, 0.72)'
                  : 'rgba(255,255,255,0.72)',
            },
          })}
        >
          <Select
            value={selectedModuleId ?? ''}
            displayEmpty
            inputProps={{ 'aria-label': '모듈 선택' }}
            disabled={loading || saving || modules.length === 0}
            onChange={(event) =>
              requestModuleChange(Number(event.target.value))
            }
            renderValue={(selected) => {
              if (selectedModuleId === undefined) return '모듈 선택';
              const matchingModule = modules.find(
                (module) => module.moduleId === Number(selected),
              );
              return matchingModule?.moduleName ?? '모듈 선택';
            }}
            sx={{
              '& .MuiSelect-select': {
                display: 'flex',
                alignItems: 'center',
                minHeight: '40px',
                paddingTop: '8px',
                paddingBottom: '8px',
              },
            }}
          >
            {modules.map((module) => (
              <MenuItem key={module.moduleId} value={module.moduleId}>
                {module.moduleName}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl
          size="small"
          sx={(theme) => ({
            width: { xs: '100%', md: 'auto' },
            minWidth: { md: 220 },
            maxWidth: '100%',
            flex: { xs: '1 1 100%', md: '0 1 280px' },
            height: 40,
            m: 0,
            '& .MuiOutlinedInput-root': {
              height: '100%',
              borderRadius: 2,
              backgroundColor:
                theme.palette.mode === 'dark'
                  ? 'rgba(15, 23, 42, 0.72)'
                  : 'rgba(255,255,255,0.72)',
            },
          })}
        >
          <Select
            value={selectedRoleId}
            displayEmpty
            inputProps={{ 'aria-label': '권한 선택' }}
            disabled={loading || saving || roles.length === 0}
            onChange={(event) => requestRoleChange(String(event.target.value))}
            renderValue={(selected) => {
              if (!selected) return '권한 선택';
              const matchingRole = roles.find(
                (role) => role.id === String(selected),
              );
              return matchingRole?.name ?? '권한 선택';
            }}
            sx={{
              '& .MuiSelect-select': {
                display: 'flex',
                alignItems: 'center',
                minHeight: '40px',
                paddingTop: '8px',
                paddingBottom: '8px',
              },
            }}
          >
            {roles.map((role) => (
              <MenuItem key={role.id} value={role.id}>
                {role.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </PageSearchArea>
      <PageMessageArea message={error} onClose={() => setError('')} />
      {hasRequiredSelection ? (
        <MenuManagementPanel
          ref={menuPanelRef}
          key={`${selectedModuleId ?? 'none'}-${selectedRoleId}-${reloadToken}`}
          menus={filteredMenus}
          selectedModule={selectedModule}
          selectedRoleId={selectedRoleId}
          permissions={permissions}
          canExportExcel={pageActionPermissions.excel}
          canWrite={pageActionPermissions.write}
          canDelete={pageActionPermissions.delete}
          menuGridLoading={loading}
          onRefresh={requestRefresh}
          onDirtyChange={setDirty}
          onSavingChange={setSaving}
          onSaveSuccess={showSuccess}
          onError={setError}
        />
      ) : (
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            py: 4,
            color: 'text.secondary',
          }}
        >
          <Typography variant="body1" sx={{ fontWeight: 500 }}>
            모듈과 권한을 모두 선택하세요.
          </Typography>
        </Box>
      )}
      <UnsavedChangesConfirmDialog
        open={confirmOpen}
        title="저장하지 않은 변경사항"
        description="변경사항을 버리고 메뉴 목록을 다시 불러오시겠습니까?"
        cancelLabel="취소"
        continueLabel="계속"
        onCancel={() => setConfirmOpen(false)}
        onContinue={confirmDiscardChanges}
      />
    </Box>
  );
}

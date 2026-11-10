import { readOnlyColumns } from '../../../../../shared/utils/menuPermission';
import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItemButton,
  ListItemText,
  TextField,
  Typography,
} from '@mui/material';
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type SyntheticEvent,
} from 'react';
import {
  F1Grid,
  type F1GridChanges,
  type F1GridColumn,
  type F1GridRef,
} from '../../../../../shared/components/f1-grid';
import Splitter from '../../../../../shared/components/Splitter';
import { UnsavedChangesConfirmDialog } from '../../../../../shared/components/UnsavedChangesConfirmDialog';
import type { RoleManagementRow } from '../types/roleManagement.types';
import {
  assignUserToRole,
  fetchRoleRows,
  fetchRoleUserRows,
  removeUserFromRole,
  type RoleSavePayload,
  type RoleUserRow,
} from '../services/roleManagement.service';

type RoleManagementPanelProps = {
  roles: RoleManagementRow[];
  searchQuery?: string;
  canExportExcel?: boolean;
  // 메뉴 권한(2026-10-21): 쓰기 = 셀 편집 · 오른쪽 클릭 행 추가, 삭제 = 오른쪽 클릭 행 삭제. 안 주면 true
  canWrite?: boolean;
  canDelete?: boolean;
  onCreateRole?: (payload: RoleSavePayload) => Promise<void> | void;
  onUpdateRole?: (
    roleId: string,
    payload: RoleSavePayload,
  ) => Promise<void> | void;
  onRolesSaved?: (options?: {
    silent?: boolean;
  }) => Promise<'applied' | 'stale' | void> | void;
  onSaveSuccess?: (message: string) => void;
  onDirtyChange?: (dirty: boolean) => void;
  onSavingChange?: (saving: boolean) => void;
  onError?: (message: string) => void;
  roleGridKey?: number;
  roleGridLoading?: boolean;
};

export type RoleManagementPanelHandle = {
  saveCurrentChanges: () => Promise<void>;
  discardPendingChanges: (
    reloadRoles: () => Promise<'applied' | 'stale' | void>,
  ) => Promise<void>;
  deleteSelectedRows: () => void;
  exportCurrentRows: () => void;
};

const emptyChanges = <T extends object>(): F1GridChanges<T> => ({
  insertedRows: [],
  updatedRows: [],
  deletedRows: [],
});

export const RoleManagementPanel = forwardRef<
  RoleManagementPanelHandle,
  RoleManagementPanelProps
>(function RoleManagementPanel(
  {
    roles,
    searchQuery = '',
    canExportExcel = false,
    canWrite = true,
    canDelete = true,
    onCreateRole,
    onUpdateRole,
    onRolesSaved,
    onSaveSuccess,
    onDirtyChange,
    onSavingChange,
    onError,
    roleGridKey = 0,
    roleGridLoading = false,
  },
  ref,
) {
  const [selectedRoleId, setSelectedRoleIdState] = useState('');
  const [userRows, setUserRows] = useState<RoleUserRow[]>([]);
  const [unassignedUsers, setUnassignedUsers] = useState<RoleUserRow[]>([]);
  const [userLoading, setUserLoading] = useState(false);
  const [userError, setUserError] = useState('');
  const [userGridKey, setUserGridKey] = useState(0);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [candidateLoginId, setCandidateLoginId] = useState('');
  const [roleGridDirty, setRoleGridDirty] = useState(false);
  const [userGridDirty, setUserGridDirty] = useState(false);
  const [pendingRoleId, setPendingRoleId] = useState<string>();
  const [roleSwitchDialogOpen, setRoleSwitchDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pendingSync, setPendingSync] = useState(false);
  const [committedCreateRowIds, setCommittedCreateRowIds] = useState<
    ReadonlySet<string>
  >(new Set());
  const [savingRoleRows, setSavingRoleRows] = useState<RoleManagementRow[]>([]);
  const [failedSaveView, setFailedSaveView] = useState<{
    rows: RoleManagementRow[];
    inputs?: {
      roles: RoleManagementRow[];
      searchQuery: string;
      roleGridKey: number;
    };
  }>();
  const roleGridRef = useRef<F1GridRef<RoleManagementRow>>(null);
  const userGridRef = useRef<F1GridRef<RoleUserRow>>(null);
  const userRequestIdRef = useRef(0);
  const selectedRoleIdRef = useRef(selectedRoleId);
  const userGridDirtyRef = useRef(false);
  const saveInFlightRef = useRef<Promise<void> | undefined>(undefined);
  const reloadInFlightRef = useRef(false);
  const completedRoleCreatesRef = useRef(
    new Map<string, { roleCode: string; payloadKey: string }>(),
  );
  const completedRoleUpdatesRef = useRef(new Map<string, string>());
  // Last successfully written assignment per role/user, kept until a refetch succeeds.
  const writtenMappingsRef = useRef(new Map<string, boolean>());
  // Mapping retry records are scoped by role and cleared only after that role's
  // mappings are fetched from the server.
  const clearMappingMarkers = useCallback((roleId: string) => {
    for (const key of [...writtenMappingsRef.current.keys()]) {
      if (key.startsWith(`${roleId}:`)) writtenMappingsRef.current.delete(key);
    }
  }, []);
  const hasPendingMarkers = useCallback(
    () =>
      completedRoleCreatesRef.current.size > 0 ||
      completedRoleUpdatesRef.current.size > 0 ||
      writtenMappingsRef.current.size > 0,
    [],
  );

  // Keep the ref in step with queued selection changes so a save started before
  // the commit targets the role the user will actually see.
  const setSelectedRoleId = useCallback((roleId: string) => {
    selectedRoleIdRef.current = roleId;
    setSelectedRoleIdState(roleId);
  }, []);

  const filteredRoles = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return roles;
    return roles.filter((role) =>
      [role.name, role.group, role.description]
        .join(' ')
        .toLowerCase()
        .includes(query),
    );
  }, [roles, searchQuery]);

  // Capture inputs on the first render after a failed save so batched save-time
  // refresh results stay pinned until roles, search, or the grid baseline changes.
  if (failedSaveView && !failedSaveView.inputs) {
    setFailedSaveView({
      ...failedSaveView,
      inputs: { roles, searchQuery, roleGridKey },
    });
  }
  const failedSaveInputs = failedSaveView?.inputs;
  const failedSaveRoles =
    failedSaveView &&
    (!failedSaveInputs ||
      (failedSaveInputs.roles === roles &&
        failedSaveInputs.searchQuery === searchQuery &&
        failedSaveInputs.roleGridKey === roleGridKey))
      ? failedSaveView.rows
      : undefined;
  const displayedRoles = saving
    ? savingRoleRows
    : (failedSaveRoles ?? filteredRoles);

  useEffect(() => {
    // The ref also covers a save started before this effect's render committed.
    if (saving || saveInFlightRef.current || failedSaveRoles) return;
    if (!filteredRoles.length) {
      setSelectedRoleId('');
      return;
    }
    if (!filteredRoles.some((role) => role.id === selectedRoleId)) {
      setSelectedRoleId(filteredRoles[0].id);
    }
  }, [failedSaveRoles, filteredRoles, selectedRoleId, saving, setSelectedRoleId]);

  const selectedRole = displayedRoles.find((role) => role.id === selectedRoleId);

  const loadUserRows = useCallback(
    async (
      roleId: string,
      options: { silent?: boolean; rethrow?: boolean } = {},
    ): Promise<'applied' | 'stale' | 'failed'> => {
      const requestId = ++userRequestIdRef.current;
      if (!roleId || roleId.startsWith('new-role-')) {
        setUserRows([]);
        setUnassignedUsers([]);
        setUserError('');
        userGridDirtyRef.current = false;
        setUserGridDirty(false);
        setUserGridKey((current) => current + 1);
        return 'applied';
      }

      if (!options.silent) {
        setUserLoading(true);
      }
      setUserError('');
      try {
        const result = await fetchRoleUserRows(roleId);
        if (
          requestId !== userRequestIdRef.current ||
          selectedRoleIdRef.current !== roleId
        ) {
          return 'stale';
        }
        setUserRows([...result.assignedUsers, ...result.unassignedUsers]);
        setUnassignedUsers(result.unassignedUsers);
        userGridDirtyRef.current = false;
        setUserGridDirty(false);
        setUserGridKey((current) => current + 1);
        if (!options.silent) {
          clearMappingMarkers(roleId);
          setPendingSync(hasPendingMarkers());
        }
        return 'applied';
      } catch (error) {
        if (requestId !== userRequestIdRef.current) return 'stale';
        const message =
          error instanceof Error
            ? error.message
            : '사용자 매핑을 불러오지 못했습니다.';
        if (options.silent) {
          onError?.(message);
          throw error;
        }
        setUserRows([]);
        setUnassignedUsers([]);
        setUserError(message);
        onError?.(message);
        if (options.rethrow) throw error;
        return 'failed';
      } finally {
        if (requestId === userRequestIdRef.current && !options.silent) {
          setUserLoading(false);
        }
      }
    },
    [clearMappingMarkers, hasPendingMarkers, onError],
  );

  useEffect(() => {
    void loadUserRows(selectedRoleId);
  }, [loadUserRows, selectedRoleId]);

  const handleRoleSelection = useCallback((rowIds: Array<string | number>) => {
    if (saveInFlightRef.current) return;
    const nextRoleId = rowIds[0] == null ? '' : String(rowIds[0]);
    if (!nextRoleId || nextRoleId === selectedRoleIdRef.current) return;
    if (userGridDirtyRef.current) {
      setPendingRoleId(nextRoleId);
      setRoleSwitchDialogOpen(true);
      return;
    }
    setSelectedRoleId(nextRoleId);
  }, [setSelectedRoleId]);

  const handleRoleGridChanges = useCallback(
    (changes: F1GridChanges<RoleManagementRow>) => {
      setRoleGridDirty(
        changes.insertedRows.length > 0 ||
          changes.updatedRows.length > 0 ||
          changes.deletedRows.length > 0,
      );
    },
    [],
  );

  const handleUserGridChanges = useCallback(
    (changes: F1GridChanges<RoleUserRow>) => {
      const dirty = changes.updatedRows.length > 0;
      userGridDirtyRef.current = dirty;
      setUserGridDirty(dirty);
    },
    [],
  );

  useEffect(() => {
    onDirtyChange?.(roleGridDirty || userGridDirty || pendingSync);
  }, [onDirtyChange, roleGridDirty, userGridDirty, pendingSync]);

  // The update API does not persist role_code, so a committed create keeps its code.
  const isUncommittedNewRole = (row: RoleManagementRow) =>
    row.id.startsWith('new-role-') && !committedCreateRowIds.has(row.id);

  const roleEditorPlugin = {
    id: 'role-grid-editor',
    enabled: true,
    canEdit: ({
      row,
      field,
    }: {
      row: RoleManagementRow;
      field: keyof RoleManagementRow;
    }) =>
      !saving &&
      !saveInFlightRef.current &&
      (field === 'name' ||
        field === 'description' ||
        field === 'active' ||
        (field === 'group' && isUncommittedNewRole(row))),
  };

  const roleColumns: F1GridColumn<RoleManagementRow>[] = [
    {
      field: 'id',
      type: 'rownumber',
      width: 60,
      headerName: '순번',
      headerAlign: 'center',
      align: 'center',
      pinned: 'left',
    },
    {
      field: 'group',
      headerName: '역할 코드',
      flex: 1,
      editable: isUncommittedNewRole,
      required: true,
      headerAlign: 'center',
    },
    {
      field: 'name',
      headerName: '역할명',
      flex: 1,
      editable: true,
      required: true,
      headerAlign: 'center',
    },
    {
      field: 'description',
      headerName: '설명',
      flex: 2,
      editable: true,
      wrapText: true,
      headerAlign: 'center',
    },
    {
      field: 'menuCount',
      headerName: '사용자 수',
      flex: 1,
      type: 'number',
      editable: false,
      align: 'center',
      headerAlign: 'center',
    },
    {
      field: 'active',
      headerName: '사용 여부',
      flex: 1,
      type: 'checkbox',
      editable: true,
      headerCheckbox: true,
      align: 'center',
      headerAlign: 'center',
    },
  ];

  const userColumns: F1GridColumn<RoleUserRow>[] = [
    {
      field: 'id',
      type: 'rownumber',
      width: 60,
      headerName: '순번',
      headerAlign: 'center',
      align: 'center',
      pinned: 'left',
    },
    {
      // 송연: 보이는 값은 사번(계정 login_code). 저장 · 줄 키는 계정 번호(loginId) 그대로(2026-10-21)
      field: 'loginId',
      headerName: '로그인 ID',
      flex: 1,
      editable: false,
      headerAlign: 'center',
      getValue: (row) => row.loginCode || row.loginId,
      renderCell: ({ row }) => row.loginCode || row.loginId,
    },
    {
      field: 'userNm',
      headerName: '사용자명',
      flex: 1,
      editable: false,
      headerAlign: 'center',
    },
    {
      field: 'departmentNm',
      headerName: '부서',
      flex: 1,
      editable: false,
      headerAlign: 'center',
    },
    {
      field: 'assigned',
      headerName: '매핑 여부',
      flex: 1,
      editable: true,
      type: 'checkbox',
      headerCheckbox: true,
      align: 'center',
      headerAlign: 'center',
      onValueChange: (_row, value) => ({ assigned: Boolean(value) }),
    },
    {
      field: 'lastLoginAt',
      headerName: '최근 로그인',
      flex: 1,
      editable: false,
      align: 'center',
      headerAlign: 'center',
    },
  ];

  const createRoleRow = useCallback(
    (): RoleManagementRow => ({
      id: `new-role-${Date.now()}`,
      name: '',
      description: '',
      group: '',
      menuCount: 0,
      active: true,
      permissions: { read: true, create: true, update: true, delete: true },
    }),
    [],
  );

  const exportCurrentRows = useCallback(() => {
    const rows = roleGridRef.current?.getActiveRows() ?? [];
    if (!rows.length) return;
    const csv = [
      roleColumns.map((column) => column.headerName).join(','),
      ...rows.map((row) =>
        roleColumns
          .map(
            (column) =>
              `"${String(row[column.field] ?? '').replace(/"/g, '""')}"`,
          )
          .join(','),
      ),
    ].join('\n');
    const url = URL.createObjectURL(
      new Blob([csv], { type: 'text/csv;charset=utf-8;' }),
    );
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'roles-export.csv';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }, [roleColumns]);

  const saveCurrentChanges = useCallback(() => {
    if (saveInFlightRef.current) return saveInFlightRef.current;
    // Grid rows are stale while an explicit reload is pending; never write from them.
    if (reloadInFlightRef.current) return Promise.resolve();

    const savePromise = (async () => {
      const savingRows = roleGridRef.current?.getActiveRows() ?? displayedRoles;
      setSavingRoleRows(savingRows);
      setSaving(true);
      onSavingChange?.(true);
      const roleChanges =
        roleGridRef.current?.getChanges() ?? emptyChanges<RoleManagementRow>();
      const roleId = selectedRoleIdRef.current;
      const mappingChanges =
        userGridRef.current?.getChanges() ?? emptyChanges<RoleUserRow>();
      const mappingBaseline = userRows;
      // Include clean rows too: a written assignment may have been reverted.
      const mappingRows =
        userGridRef.current?.getActiveRows() ?? mappingChanges.updatedRows;
      const hasPendingRoleWrites =
        completedRoleCreatesRef.current.size > 0 ||
        completedRoleUpdatesRef.current.size > 0;
      const hasPendingMappingWrites = writtenMappingsRef.current.size > 0;
      // Rows written before a failed refresh may be clean again in the grid,
      // so compare them against the last successfully written payload.
      // Rows created before a failed refresh keep their temporary ID, so retry them
      // through the create record instead of as updates of the temporary ID.
      const isCreatedRow = (row: RoleManagementRow) =>
        completedRoleCreatesRef.current.has(row.id);
      const roleCreateRows = [
        ...roleChanges.insertedRows,
        ...savingRows.filter(
          (row) =>
            isCreatedRow(row) &&
            !roleChanges.insertedRows.some((inserted) => inserted.id === row.id),
        ),
      ];
      const roleUpdateRows = [
        ...roleChanges.updatedRows.filter((row) => !isCreatedRow(row)),
        ...savingRows.filter(
          (row) =>
            completedRoleUpdatesRef.current.has(row.id) &&
            !roleChanges.updatedRows.some((updated) => updated.id === row.id),
        ),
      ];
      const shouldRefreshRoles =
        roleChanges.insertedRows.length > 0 ||
        roleUpdateRows.length > 0 ||
        hasPendingRoleWrites;
      const shouldRefreshMappings =
        mappingChanges.updatedRows.length > 0 || hasPendingMappingWrites;

      try {
        if (roleChanges.deletedRows.length > 0) {
          throw new Error('기존 역할 삭제는 현재 지원되지 않습니다.');
        }
        for (const row of [...roleCreateRows, ...roleUpdateRows]) {
          if (!row.group.trim() || !row.name.trim()) {
            throw new Error('역할 코드와 역할명은 필수입니다.');
          }
        }
        for (const row of roleCreateRows) {
          const created = completedRoleCreatesRef.current.get(row.id);
          const payload: RoleSavePayload = {
            roleCode: created?.roleCode ?? row.group.trim(),
            roleNm: row.name.trim(),
            roleDc: row.description.trim(),
            useAt: row.active ? 'Y' : 'N',
          };
          const payloadKey = JSON.stringify(payload);
          if (!created) {
            await onCreateRole?.(payload);
            completedRoleCreatesRef.current.set(row.id, {
              roleCode: payload.roleCode,
              payloadKey,
            });
            continue;
          }
          if (created.payloadKey === payloadKey) continue;
          // The create already succeeded, so apply later edits to the persisted role.
          const persistedRole = (await fetchRoleRows()).find(
            (role) => role.group === created.roleCode,
          );
          if (!persistedRole) {
            throw new Error(
              '저장된 역할을 찾을 수 없습니다. 조회 후 다시 시도해 주세요.',
            );
          }
          await onUpdateRole?.(persistedRole.id, payload);
          completedRoleCreatesRef.current.set(row.id, { ...created, payloadKey });
        }
        for (const row of roleUpdateRows) {
          const payload: RoleSavePayload = {
            roleCode: row.group.trim(),
            roleNm: row.name.trim(),
            roleDc: row.description.trim(),
            useAt: row.active ? 'Y' : 'N',
          };
          const payloadKey = JSON.stringify(payload);
          if (completedRoleUpdatesRef.current.get(row.id) === payloadKey) {
            continue;
          }
          await onUpdateRole?.(row.id, payload);
          completedRoleUpdatesRef.current.set(row.id, payloadKey);
        }
        // Role records stay retryable unless the role list was actually applied.
        const refreshRoles = async (options?: { silent?: boolean }) => {
          if ((await onRolesSaved?.(options)) === 'stale') {
            throw new Error(
              '역할 목록을 다시 불러오지 못했습니다. 다시 저장해 주세요.',
            );
          }
        };
        if (shouldRefreshRoles) {
          await refreshRoles();
        }

        const canSaveMappings = Boolean(roleId) && !roleId.startsWith('new-role-');
        for (const row of canSaveMappings ? mappingRows : []) {
          const key = `${roleId}:${row.loginId}`;
          const serverAssigned = writtenMappingsRef.current.has(key)
            ? writtenMappingsRef.current.get(key)
            : mappingBaseline.find((item) => item.id === row.id)?.assigned;
          if (serverAssigned === undefined || serverAssigned === row.assigned) {
            continue;
          }
          if (row.assigned) await assignUserToRole(roleId, row.loginId);
          else await removeUserFromRole(roleId, row.loginId);
          writtenMappingsRef.current.set(key, row.assigned);
        }
        // Role writes are reconciled only after the selected mapping (and every
        // pending role mapping) is fetched and applied, even without mapping edits.
        if (shouldRefreshRoles || shouldRefreshMappings) {
          const reconciledRoleIds: string[] = [];
          if (canSaveMappings) {
            const status = await loadUserRows(roleId, { silent: true });
            // Selection is locked while saving; never report success for a
            // refresh that was not applied to the saved target.
            if (status !== 'applied') {
              throw new Error(
                '사용자 매핑을 다시 불러오지 못했습니다. 다시 저장해 주세요.',
              );
            }
            reconciledRoleIds.push(roleId);
          }
          const otherRoleIds = new Set(
            [...writtenMappingsRef.current.keys()]
              .map((key) => key.split(':')[0])
              .filter((pendingRoleId) => pendingRoleId !== roleId),
          );
          // Non-selected roles have no visible rows to apply, so their records
          // clear only once the fetched rows confirm every written assignment.
          for (const pendingRoleId of otherRoleIds) {
            const result = await fetchRoleUserRows(pendingRoleId);
            const assignedLoginIds = new Set(
              result.assignedUsers.map((user) => String(user.loginId)),
            );
            const confirmed = [...writtenMappingsRef.current].every(
              ([key, assigned]) => {
                const [markerRoleId, loginId] = key.split(':');
                return (
                  markerRoleId !== pendingRoleId ||
                  assignedLoginIds.has(loginId) === assigned
                );
              },
            );
            if (!confirmed) {
              throw new Error(
                '다른 역할의 사용자 매핑 저장 결과를 확인하지 못했습니다. 다시 저장해 주세요.',
              );
            }
            reconciledRoleIds.push(pendingRoleId);
          }
          if (shouldRefreshMappings) await refreshRoles({ silent: true });
          reconciledRoleIds.forEach(clearMappingMarkers);
        }

        // Role records are reconciled only once every post-save refresh applied.
        completedRoleCreatesRef.current.clear();
        completedRoleUpdatesRef.current.clear();
        if (shouldRefreshRoles || shouldRefreshMappings) {
          onSaveSuccess?.('역할을 저장했습니다.');
        }
        setCommittedCreateRowIds(new Set());
        setFailedSaveView(undefined);
        setPendingSync(hasPendingMarkers());
        setRoleGridDirty(false);
        setUserGridDirty(false);
        userGridDirtyRef.current = false;
      } catch (saveError) {
        setFailedSaveView({ rows: savingRows });
        setCommittedCreateRowIds(new Set(completedRoleCreatesRef.current.keys()));
        setPendingSync(hasPendingMarkers());
        throw saveError;
      } finally {
        setSaving(false);
        onSavingChange?.(false);
      }
    })();

    saveInFlightRef.current = savePromise;
    void savePromise.then(
      () => {
        if (saveInFlightRef.current === savePromise) {
          saveInFlightRef.current = undefined;
        }
      },
      () => {
        if (saveInFlightRef.current === savePromise) {
          saveInFlightRef.current = undefined;
        }
      },
    );
    return savePromise;
  }, [
    clearMappingMarkers,
    displayedRoles,
    hasPendingMarkers,
    loadUserRows,
    onCreateRole,
    onRolesSaved,
    onSaveSuccess,
    onSavingChange,
    onUpdateRole,
    userRows,
  ]);

  // Called on a confirmed reload: discard local edits and refetch both role and
  // mapping server state so already-written changes are not sent again.
  // Retry markers are cleared only after both reads succeed.
  const discardPendingChanges = useCallback(
    async (reloadRoles: () => Promise<'applied' | 'stale' | void>) => {
      if (saveInFlightRef.current || reloadInFlightRef.current) return;
      reloadInFlightRef.current = true;
      const targetRoleId = selectedRoleIdRef.current;
      userGridDirtyRef.current = false;
      setUserGridDirty(false);
      setUserGridKey((current) => current + 1);
      const [rolesResult, mappingResult] = await Promise.allSettled([
        reloadRoles(),
        loadUserRows(targetRoleId, { rethrow: true }),
      ]).finally(() => {
        reloadInFlightRef.current = false;
      });
      const rolesApplied =
        rolesResult.status === 'fulfilled' &&
        rolesResult.value !== 'stale';
      if (rolesApplied) {
        setFailedSaveView(undefined);
        setRoleGridDirty(false);
      }
      // Mapping records for the applied role were cleared by loadUserRows; other
      // roles keep theirs until their own mappings are fetched.
      const reconciled =
        rolesResult.status === 'fulfilled' &&
        rolesResult.value !== 'stale' &&
        mappingResult.status === 'fulfilled' &&
        mappingResult.value === 'applied' &&
        selectedRoleIdRef.current === targetRoleId;
      if (reconciled) {
        completedRoleCreatesRef.current.clear();
        completedRoleUpdatesRef.current.clear();
        setCommittedCreateRowIds(new Set());
      }
      const pending = hasPendingMarkers();
      setPendingSync(pending);
      onDirtyChange?.(
        pending || userGridDirtyRef.current || (!rolesApplied && roleGridDirty),
      );
    },
    [hasPendingMarkers, loadUserRows, onDirtyChange, roleGridDirty],
  );

  const closeRoleSwitchDialog = useCallback(() => {
    setRoleSwitchDialogOpen(false);
    setPendingRoleId(undefined);
  }, []);

  const discardMappingAndMove = useCallback(() => {
    if (saving || saveInFlightRef.current || !pendingRoleId) return;
    ++userRequestIdRef.current;
    userGridDirtyRef.current = false;
    setRoleGridDirty(false);
    setUserGridDirty(false);
    setUserGridKey((current) => current + 1);
    const nextRoleId = pendingRoleId;
    closeRoleSwitchDialog();
    setSelectedRoleId(nextRoleId);
  }, [closeRoleSwitchDialog, pendingRoleId, saving, setSelectedRoleId]);

  const filteredCandidates = useMemo(() => {
    const query = userSearchQuery.trim().toLowerCase();
    if (!query) return unassignedUsers;
    return unassignedUsers.filter((user) =>
      [user.loginId, user.userNm, user.departmentNm]
        .join(' ')
        .toLowerCase()
        .includes(query),
    );
  }, [unassignedUsers, userSearchQuery]);

  useImperativeHandle(
    ref,
    () => ({
      saveCurrentChanges,
      discardPendingChanges,
      deleteSelectedRows: () => {
        if (saving || saveInFlightRef.current) return;
        roleGridRef.current?.deleteSelectedRows();
      },
      exportCurrentRows,
    }),
    [discardPendingChanges, exportCurrentRows, saveCurrentChanges, saving],
  );

  const blockGridInteractionWhileSaving = (event: SyntheticEvent) => {
    if (!saving && !saveInFlightRef.current) return;
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <Box
      sx={{
        minWidth: 0,
        minHeight: 0,
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      <Splitter
        direction="horizontal"
        mobileMode="stacked"
        mobileBreakpoint={768}
        initialSize={520}
        minSize={400}
        maxSize={1000}
        leftFlex={1}
        rightFlex={1}
        ariaLabel="권한 관리 영역 분리기"
      >
        <Card
          sx={{
            boxShadow: 'none',
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            minHeight: 0,
            height: '100%',
            overflow: 'hidden',
          }}
        >
          <CardContent
            sx={{
              p: 1,
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              minHeight: 0,
              height: '100%',
              overflow: 'hidden',
              '&:last-child': {
                pb: 1,
              },
            }}
          >
            <Box
              sx={{
                px: 1,
                py: 1,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: { xs: 'flex-start', sm: 'center' },
                flexWrap: 'wrap',
                gap: 1,
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                권한 관리
              </Typography>
            </Box>
            <Box
              sx={{ flex: 1, height: '100%', overflow: 'hidden' }}
              onClickCapture={blockGridInteractionWhileSaving}
              onDoubleClickCapture={blockGridInteractionWhileSaving}
              onKeyDownCapture={blockGridInteractionWhileSaving}
              onPasteCapture={blockGridInteractionWhileSaving}
            >
              <F1Grid
                key={roleGridKey}
                ref={roleGridRef}
                rows={displayedRoles}
                columns={readOnlyColumns(
                  saving
                    ? roleColumns.map((column) => ({ ...column, editable: false }))
                    : roleColumns,
                  canWrite,
                )}
                rowKey="id"
                storageKey="settings-system-role-grid"
                ariaLabel="F1-GRID 권한 관리"
                height={'100%'}
                rowHeight={32}
                minRowHeight={32}
                maxRowHeight={320}
                showCheckbox={false}
                createRow={saving ? undefined : createRoleRow}
                editorPlugins={[roleEditorPlugin]}
                onBeforeEdit={() => !saving && !saveInFlightRef.current}
                allowAddRowInContextMenu={canWrite && !saving}
                allowDuplicateRowInContextMenu={canWrite && !saving}
                allowDeleteRowInContextMenu={canDelete && !saving}
                disableContextMenu={saving}
                onSelectionChange={handleRoleSelection}
                onChangesChange={handleRoleGridChanges}
                canExportExcel={canExportExcel}
                excelFileName="role-management-export"
                loading={roleGridLoading}
              />
            </Box>
          </CardContent>
        </Card>
        <Card
          sx={{
            boxShadow: 'none',
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            minHeight: 0,
            height: '100%',
            overflow: 'hidden',
          }}
        >
          <CardContent
            sx={{
              p: 1,
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              minHeight: 0,
              height: '100%',
              overflow: 'hidden',
              '&:last-child': {
                pb: 1,
              },
            }}
          >
            <Box
              sx={{
                px: 1,
                py: 1,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: { xs: 'flex-start', sm: 'center' },
                flexWrap: 'wrap',
                gap: 1,
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                권한별 사용자 매핑
              </Typography>
              {selectedRole ? (
                <Typography
                  variant="subtitle2"
                  color="text.secondary"
                  sx={{
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: '60%',
                    textAlign: 'right',
                  }}
                >
                  선택 역할: {selectedRole.name}
                </Typography>
              ) : null}
            </Box>
            {selectedRole || roleGridLoading ? (
              <>
                <Box
                  sx={{ flex: 1, height: '100%', overflow: 'hidden' }}
                  onClickCapture={blockGridInteractionWhileSaving}
                  onDoubleClickCapture={blockGridInteractionWhileSaving}
                  onKeyDownCapture={blockGridInteractionWhileSaving}
                  onPasteCapture={blockGridInteractionWhileSaving}
                >
                  {userError ? (
                    <Typography variant="body2" color="error.main">
                      {userError}
                    </Typography>
                  ) : (
                    <F1Grid
                      key={userGridKey}
                      ref={userGridRef}
                      rows={userRows}
                      columns={readOnlyColumns(
                        saving
                          ? userColumns.map((column) => ({
                              ...column,
                              editable: false,
                            }))
                          : userColumns,
                        canWrite,
                      )}
                      rowKey="id"
                      storageKey="settings-system-role-user-grid"
                      ariaLabel="F1-GRID 사용자 매핑"
                      height={'100%'}
                      rowHeight={32}
                      minRowHeight={32}
                      maxRowHeight={320}
                      showCheckbox={false}
                      editorPlugins={[
                        {
                          id: 'role-user-grid-editor',
                          enabled: true,
                          canEdit: () => !saving && !saveInFlightRef.current,
                        },
                      ]}
                      onBeforeEdit={() => !saving && !saveInFlightRef.current}
                      disableContextMenu={saving}
                      allowAddRowInContextMenu={false}
                      allowDuplicateRowInContextMenu={false}
                      allowDeleteRowInContextMenu={false}
                      onChangesChange={handleUserGridChanges}
                      loading={userLoading}
                    />
                  )}
                </Box>
              </>
            ) : (
              <Typography variant="body2" color="text.secondary">
                선택된 권한이 없습니다.
              </Typography>
            )}
          </CardContent>
        </Card>
      </Splitter>
      <Dialog
        open={userDialogOpen}
        onClose={() => setUserDialogOpen(false)}
        fullWidth
        maxWidth="sm"
        aria-labelledby="user-add-dialog-title"
      >
        <DialogTitle id="user-add-dialog-title">사용자 추가</DialogTitle>
        <DialogContent>
          <TextField
            margin="none"
            fullWidth
            size="small"
            label="사용자 검색"
            value={userSearchQuery}
            onChange={(event) => setUserSearchQuery(event.target.value)}
            sx={{ mt: 1 }}
          />
          <List aria-label="추가할 사용자 목록">
            {filteredCandidates.map((user) => (
              <ListItemButton
                key={user.id}
                selected={candidateLoginId === user.loginId}
                onClick={() => setCandidateLoginId(user.loginId)}
              >
                <Checkbox
                  checked={candidateLoginId === user.loginId}
                  tabIndex={-1}
                />
                <ListItemText
                  primary={`${user.userNm} (${user.loginId})`}
                  secondary={user.departmentNm}
                />
              </ListItemButton>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUserDialogOpen(false)}>취소</Button>
          <Button
            variant="contained"
            disabled={saving || !candidateLoginId}
            onClick={() => {
              if (saving || saveInFlightRef.current) return;
              userGridRef.current?.setCellValue(
                candidateLoginId,
                'assigned',
                true,
              );
              setUserDialogOpen(false);
            }}
          >
            추가
          </Button>
        </DialogActions>
      </Dialog>
      <UnsavedChangesConfirmDialog
        open={roleSwitchDialogOpen}
        title="저장하지 않은 변경사항"
        description="현재 변경사항을 유지하지 않고 선택한 권한으로 이동하시겠습니까?"
        cancelLabel="취소"
        continueLabel="계속"
        disableContinue={saving || userLoading}
        dialogTitleId="role-switch-dialog-title"
        onCancel={closeRoleSwitchDialog}
        onContinue={discardMappingAndMove}
      />
    </Box>
  );
});

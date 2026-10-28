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
  onRolesSaved?: (options?: { silent?: boolean }) => Promise<void> | void;
  onSaveSuccess?: (message: string) => void;
  onDirtyChange?: (dirty: boolean) => void;
  onError?: (message: string) => void;
  roleGridKey?: number;
  roleGridLoading?: boolean;
};

export type RoleManagementPanelHandle = {
  saveCurrentChanges: () => Promise<void>;
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
    onError,
    roleGridKey = 0,
    roleGridLoading = false,
  },
  ref,
) {
  const [selectedRoleId, setSelectedRoleId] = useState('');
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
  const roleGridRef = useRef<F1GridRef<RoleManagementRow>>(null);
  const userGridRef = useRef<F1GridRef<RoleUserRow>>(null);
  const userRequestIdRef = useRef(0);
  const selectedRoleIdRef = useRef(selectedRoleId);
  const userGridDirtyRef = useRef(false);
  const saveInFlightRef = useRef<Promise<void> | undefined>(undefined);
  const completedRoleOperationsRef = useRef(new Set<string>());
  const completedMappingOperationsRef = useRef(new Set<string>());

  useEffect(() => {
    selectedRoleIdRef.current = selectedRoleId;
  }, [selectedRoleId]);

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

  useEffect(() => {
    if (!filteredRoles.length) {
      setSelectedRoleId('');
      return;
    }
    if (!filteredRoles.some((role) => role.id === selectedRoleId)) {
      setSelectedRoleId(filteredRoles[0].id);
    }
  }, [filteredRoles, selectedRoleId]);

  const selectedRole = filteredRoles.find((role) => role.id === selectedRoleId);

  const loadUserRows = useCallback(
    async (roleId: string, options: { silent?: boolean } = {}) => {
      const requestId = ++userRequestIdRef.current;
      if (!roleId || roleId.startsWith('new-role-')) {
        setUserRows([]);
        setUnassignedUsers([]);
        setUserError('');
        userGridDirtyRef.current = false;
        setUserGridDirty(false);
        setUserGridKey((current) => current + 1);
        return;
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
          return;
        }
        setUserRows([...result.assignedUsers, ...result.unassignedUsers]);
        setUnassignedUsers(result.unassignedUsers);
        userGridDirtyRef.current = false;
        setUserGridDirty(false);
        setUserGridKey((current) => current + 1);
      } catch (error) {
        if (requestId !== userRequestIdRef.current) return;
        const message =
          error instanceof Error
            ? error.message
            : '사용자 매핑을 불러오지 못했습니다.';
        setUserRows([]);
        setUnassignedUsers([]);
        setUserError(message);
        onError?.(message);
      } finally {
        if (requestId === userRequestIdRef.current && !options.silent) {
          setUserLoading(false);
        }
      }
    },
    [onError],
  );

  useEffect(() => {
    void loadUserRows(selectedRoleId);
  }, [loadUserRows, selectedRoleId]);

  const handleRoleSelection = useCallback((rowIds: Array<string | number>) => {
    const nextRoleId = rowIds[0] == null ? '' : String(rowIds[0]);
    if (!nextRoleId || nextRoleId === selectedRoleIdRef.current) return;
    if (userGridDirtyRef.current) {
      setPendingRoleId(nextRoleId);
      setRoleSwitchDialogOpen(true);
      return;
    }
    setSelectedRoleId(nextRoleId);
  }, []);

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
    onDirtyChange?.(roleGridDirty || userGridDirty);
  }, [onDirtyChange, roleGridDirty, userGridDirty]);

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
      field === 'name' ||
      field === 'description' ||
      field === 'active' ||
      (field === 'group' && row.id.startsWith('new-role-')),
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
      editable: (row) => row.id.startsWith('new-role-'),
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

    const savePromise = (async () => {
      setSaving(true);
      const roleChanges =
        roleGridRef.current?.getChanges() ?? emptyChanges<RoleManagementRow>();
      const roleId = selectedRoleIdRef.current;
      const mappingChanges =
        userGridRef.current?.getChanges() ?? emptyChanges<RoleUserRow>();
      const mappingBaseline = userRows;

      try {
        if (roleChanges.deletedRows.length > 0) {
          throw new Error('기존 역할 삭제는 현재 지원되지 않습니다.');
        }
        for (const row of [
          ...roleChanges.insertedRows,
          ...roleChanges.updatedRows,
        ]) {
          if (!row.group.trim() || !row.name.trim()) {
            throw new Error('역할 코드와 역할명은 필수입니다.');
          }
        }
        for (const row of roleChanges.insertedRows) {
          const operationId = `create:${row.id}`;
          if (completedRoleOperationsRef.current.has(operationId)) continue;
          await onCreateRole?.({
            roleCode: row.group.trim(),
            roleNm: row.name.trim(),
            roleDc: row.description.trim(),
            useAt: row.active ? 'Y' : 'N',
          });
          completedRoleOperationsRef.current.add(operationId);
        }
        for (const row of roleChanges.updatedRows) {
          const operationId = `update:${row.id}`;
          if (completedRoleOperationsRef.current.has(operationId)) continue;
          await onUpdateRole?.(row.id, {
            roleCode: row.group.trim(),
            roleNm: row.name.trim(),
            roleDc: row.description.trim(),
            useAt: row.active ? 'Y' : 'N',
          });
          completedRoleOperationsRef.current.add(operationId);
        }
        if (roleChanges.insertedRows.length || roleChanges.updatedRows.length) {
          await onRolesSaved?.();
          completedRoleOperationsRef.current.clear();
        }

        if (!roleId || roleId.startsWith('new-role-')) return;
        for (const row of mappingChanges.updatedRows) {
          const originalRow = mappingBaseline.find(
            (item) => item.id === row.id,
          );
          if (!originalRow || originalRow.assigned === row.assigned) continue;
          const operationId = `${roleId}:${row.id}:${row.assigned ? 'assign' : 'remove'}`;
          if (completedMappingOperationsRef.current.has(operationId)) continue;
          if (row.assigned) await assignUserToRole(roleId, row.loginId);
          else await removeUserFromRole(roleId, row.loginId);
          completedMappingOperationsRef.current.add(operationId);
        }
        if (mappingChanges.updatedRows.length) {
          await loadUserRows(roleId, { silent: true });
          await onRolesSaved?.({ silent: true });
          completedMappingOperationsRef.current.clear();
        }

        if (
          roleChanges.insertedRows.length ||
          roleChanges.updatedRows.length ||
          mappingChanges.updatedRows.length
        ) {
          onSaveSuccess?.('역할을 저장했습니다.');
        }
        setRoleGridDirty(false);
        setUserGridDirty(false);
        userGridDirtyRef.current = false;
      } finally {
        setSaving(false);
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
    loadUserRows,
    onCreateRole,
    onRolesSaved,
    onSaveSuccess,
    onUpdateRole,
    userRows,
  ]);

  const closeRoleSwitchDialog = useCallback(() => {
    setRoleSwitchDialogOpen(false);
    setPendingRoleId(undefined);
  }, []);

  const discardMappingAndMove = useCallback(() => {
    if (!pendingRoleId) return;
    ++userRequestIdRef.current;
    userGridDirtyRef.current = false;
    setRoleGridDirty(false);
    setUserGridDirty(false);
    setUserGridKey((current) => current + 1);
    const nextRoleId = pendingRoleId;
    closeRoleSwitchDialog();
    setSelectedRoleId(nextRoleId);
  }, [closeRoleSwitchDialog, pendingRoleId]);

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
      deleteSelectedRows: () => {
        roleGridRef.current?.deleteSelectedRows();
      },
      exportCurrentRows,
    }),
    [exportCurrentRows, saveCurrentChanges],
  );

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
            <Box sx={{ flex: 1, height: '100%', overflow: 'hidden' }}>
              <F1Grid
                key={roleGridKey}
                ref={roleGridRef}
                rows={filteredRoles}
                columns={readOnlyColumns(roleColumns, canWrite)}
                rowKey="id"
                storageKey="settings-system-role-grid"
                ariaLabel="F1-GRID 권한 관리"
                height={'100%'}
                rowHeight={32}
                minRowHeight={32}
                maxRowHeight={320}
                showCheckbox={false}
                createRow={createRoleRow}
                editorPlugins={[roleEditorPlugin]}
                allowAddRowInContextMenu={canWrite}
                allowDeleteRowInContextMenu={canDelete}
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
                <Box sx={{ flex: 1, height: '100%', overflow: 'hidden' }}>
                  {userError ? (
                    <Typography variant="body2" color="error.main">
                      {userError}
                    </Typography>
                  ) : (
                    <F1Grid
                      key={userGridKey}
                      ref={userGridRef}
                      rows={userRows}
                      columns={readOnlyColumns(userColumns, canWrite)}
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
                          canEdit: () => true,
                        },
                      ]}
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
            disabled={!candidateLoginId}
            onClick={() => {
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

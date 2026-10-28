import { readOnlyColumns } from '../../../../../shared/utils/menuPermission';
import { Box, Card, CardContent } from '@mui/material';
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import {
  F1Tree,
  type F1GridChanges,
  type F1GridColumn,
  type F1TreeRef,
} from '../../../../../shared/components/f1-grid';
import {
  DEFAULT_PERMISSION_GROUPS,
  hasPermissionGroup,
  togglePermissionGroup,
} from '../../../../../shared/components/PermissionGroup';
import {
  createMenuSaveCheckpoint,
  replaceMenuPermissions,
  saveMenuChanges,
  saveRoleMenuPermissions,
  type MenuSaveCheckpoint,
} from '../services/menuManagement.service';
import type { MenuManagementRow } from '../types/menuManagement.types';
import type {
  MenuModuleOption,
  MenuPermissionDefinition,
} from '../types/menuManagement.types';

type MenuManagementPanelProps = {
  menus: MenuManagementRow[];
  selectedModule?: MenuModuleOption;
  selectedRoleId?: string;
  permissions: MenuPermissionDefinition[];
  canExportExcel?: boolean;
  // 메뉴 권한(2026-10-21): 쓰기 = 셀 편집 · 오른쪽 클릭 행 추가, 삭제 = 오른쪽 클릭 행 삭제. 안 주면 true
  canWrite?: boolean;
  canDelete?: boolean;
  menuGridLoading?: boolean;
  onRefresh?: (
    moduleId: number,
    bypassDirtyConfirmation?: boolean,
    showSkeleton?: boolean,
  ) => Promise<void>;
  onDirtyChange?: (dirty: boolean) => void;
  onSavingChange?: (saving: boolean) => void;
  onSaveSuccess?: (message: string) => void;
  onError?: (message: string) => void;
};

export type MenuManagementPanelHandle = {
  saveCurrentChanges: () => Promise<void>;
  deleteSelectedRows: () => void;
  exportCurrentRows: () => void;
};

export const MenuManagementPanel = forwardRef<
  MenuManagementPanelHandle,
  MenuManagementPanelProps
>(function MenuManagementPanel(
  {
    menus,
    selectedModule,
    selectedRoleId,
    canExportExcel = false,
    canWrite = true,
    canDelete = true,
    menuGridLoading = false,
    onRefresh,
    onDirtyChange,
    onSavingChange,
    onSaveSuccess,
    onError,
  },
  ref,
) {
  const treeRef = useRef<F1TreeRef<MenuManagementRow>>(null);
  const saveCheckpointRef = useRef<MenuSaveCheckpoint | undefined>(undefined);
  const completedPermissionRowIdsRef = useRef(new Set<string>());
  const [changes, setChanges] = useState<F1GridChanges<MenuManagementRow>>({
    insertedRows: [],
    updatedRows: [],
    deletedRows: [],
  });
  const [newMenuSequence, setNewMenuSequence] = useState(1);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [treeKey, setTreeKey] = useState(0);

  useImperativeHandle(ref, () => ({
    saveCurrentChanges: handleSave,
    deleteSelectedRows: () => {
      treeRef.current?.deleteSelectedRows();
    },
    exportCurrentRows: () => {
      const rows = treeRef.current?.getActiveRows() ?? [];
      if (rows.length === 0) return;
      const headers = columns.map((column) => column.headerName);
      const csvRows = rows.map((row) =>
        columns
          .map((column) => {
            const value = row[column.field as keyof MenuManagementRow];
            const stringValue = Array.isArray(value)
              ? value.join(';')
              : value == null
                ? ''
                : String(value);
            return `"${stringValue.replace(/"/g, '""')}"`;
          })
          .join(','),
      );
      const content = [headers.join(','), ...csvRows].join('\n');
      const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${selectedModule?.moduleName ?? 'menu'}-export.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    },
  }));

  useEffect(() => {
    onDirtyChange?.(
      changes.insertedRows.length > 0 ||
        changes.updatedRows.length > 0 ||
        changes.deletedRows.length > 0,
    );
  }, [changes, onDirtyChange]);

  function notifyError(nextMessage: string) {
    if (onError) {
      onError(nextMessage);
      return;
    }
    setMessage(nextMessage);
  }

  function notifySaveSuccess(nextMessage: string) {
    if (onSaveSuccess) {
      onSaveSuccess(nextMessage);
      return;
    }
    setMessage(nextMessage);
  }

  const permissionColumns = DEFAULT_PERMISSION_GROUPS.map(
    ({ key, label, codes }) => ({
      field: `${key}Permission` as keyof MenuManagementRow,
      headerName: label,
      headerGroup: '기본기능',
      width: 100,
      type: 'checkbox' as const,
      editable: (row: MenuManagementRow) => !row.hasChildren,
      getValue: (row: MenuManagementRow) =>
        hasPermissionGroup(row.permissionCodes, codes),
      onValueChange: (row: MenuManagementRow, checked: unknown) => ({
        permissionCodes: togglePermissionGroup(
          row.permissionCodes,
          codes,
          Boolean(checked),
        ),
      }),
      headerAlign: 'center' as const,
      align: 'center' as const,
    }),
  ) as F1GridColumn<MenuManagementRow>[];

  const isNewMenuRow = (rowId: string | number) =>
    String(rowId).startsWith('new-menu-');

  const menuEditorPlugin = {
    id: 'menu-editor-plugin',
    enabled: true,
    canEdit: ({
      row,
      field,
    }: {
      row: MenuManagementRow;
      field: keyof MenuManagementRow;
    }) => {
      if (field === 'code') {
        return isNewMenuRow(row.id);
      }
      return ['name', 'path', 'description', 'order'].includes(String(field));
    },
  };

  const columns: F1GridColumn<MenuManagementRow>[] = [
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
      field: 'name',
      headerName: '메뉴명',
      width: 220,
      editable: true,
      required: true,
      pinned: 'left',
    },
    {
      field: 'code',
      headerName: '메뉴코드',
      width: 140,
      editable: (row: MenuManagementRow) => isNewMenuRow(row.id),
      required: true,
      mergeRows: true,
      form: {
        targetField: 'code',
        targetLabel: '메뉴코드',
      },
    },
    {
      field: 'path',
      headerName: '경로',
      width: 220,
      form: {
        span: 2,
      },
      editable: true,
      required: true,
    },
    {
      field: 'description',
      headerName: '메뉴설명',
      width: 260,
      form: {
        span: 3,
      },
      editable: true,
      wrapText: true,
    },
    {
      field: 'order',
      headerName: '정렬',
      width: 80,
      editable: true,
      required: true,
      decimalPlaces: 0,
      type: 'number',
      align: 'center',
      headerAlign: 'center',
    },
    {
      field: 'enabled',
      headerName: '사용 여부',
      width: 120,
      editable: true,
      type: 'checkbox',
      headerCheckbox: true,
      syncWithTreeCheckbox: false,
      headerAlign: 'center',
      align: 'center',
    },
    ...permissionColumns,
  ];

  function createMenuRow(): MenuManagementRow {
    const sequence = newMenuSequence;
    setNewMenuSequence((current) => current + 1);
    return {
      id: `new-menu-${sequence}`,
      moduleId: selectedModule?.moduleId ?? 0,
      moduleName: selectedModule?.moduleName ?? '',
      parentMenuId: null,
      hasChildren: false,
      code: `NEW${sequence}`,
      name: '새 메뉴',
      path: '',
      iconName: null,
      parent: '루트',
      order: 0,
      enabled: true,
      status: 'draft',
      description: '',
      permissionGroup: '관리',
      permissionCodes: [],
    };
  }

  async function handleSave() {
    if (!selectedModule || !treeRef.current?.validate() || saving) return;
    setSaving(true);
    onSavingChange?.(true);
    notifyError('');
    try {
      const currentChanges = treeRef.current.getChanges();
      const currentRows = treeRef.current.getActiveRows();
      const saveCheckpoint =
        saveCheckpointRef.current ?? createMenuSaveCheckpoint();
      saveCheckpointRef.current = saveCheckpoint;
      const savedMenus = await saveMenuChanges(currentChanges, saveCheckpoint);
      const changedRowIds = new Set([
        ...currentChanges.insertedRows.map((row) => row.id),
        ...currentChanges.updatedRows.map((row) => row.id),
      ]);
      const structuralParentIds = new Set(
        currentRows
          .filter(
            (row) =>
              row.hasChildren ||
              currentRows.some((child) => child.parentMenuId === row.id),
          )
          .map((row) => row.id),
      );

      const permissionTargets = currentRows.filter(
        (row) =>
          changedRowIds.has(row.id) &&
          !structuralParentIds.has(row.id) &&
          !completedPermissionRowIdsRef.current.has(row.id),
      );

      if (permissionTargets.length > 0) {
        const permissionPayload = permissionTargets.map((row) => ({
          menuId: savedMenus.insertedMenuIds[row.id] ?? row.id,
          permissionCodes: row.permissionCodes ?? [],
        }));

        if (selectedRoleId && selectedRoleId.trim()) {
          await saveRoleMenuPermissions(selectedRoleId, permissionPayload);
        } else {
          for (const row of permissionTargets) {
            const menuId = savedMenus.insertedMenuIds[row.id] ?? row.id;
            await replaceMenuPermissions(menuId, row.permissionCodes);
          }
        }

        for (const row of permissionTargets) {
          completedPermissionRowIdsRef.current.add(row.id);
        }
      }

      await onRefresh?.(selectedModule.moduleId, true);
      saveCheckpointRef.current = undefined;
      completedPermissionRowIdsRef.current.clear();
      setChanges({ insertedRows: [], updatedRows: [], deletedRows: [] });
      setTreeKey((current) => current + 1);
      notifySaveSuccess('메뉴 변경사항을 저장했습니다.');
    } catch (error) {
      notifyError(
        error instanceof Error ? error.message : '메뉴 저장에 실패했습니다.',
      );
    } finally {
      setSaving(false);
      onSavingChange?.(false);
    }
  }

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
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: { xs: 'flex-start', sm: 'center' },
              flexWrap: 'wrap',
              gap: 1,
            }}
          >
            {/* <Typography sx={{ fontWeight: 700 }}>메뉴 관리</Typography> */}
            {/* <Box
              role="toolbar"
              aria-label="메뉴 그리드 제어"
              sx={{
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                gap: 0.5,
                ml: 'auto',
              }}
            >
              <IconButton
                size="small"
                aria-label="전체 펼치기"
                disabled={!selectedModule || saving}
                onClick={() => treeRef.current?.expandAll()}
              >
                <UnfoldMoreIcon fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                aria-label="전체 접기"
                disabled={!selectedModule || saving}
                onClick={() => treeRef.current?.collapseAll()}
              >
                <UnfoldLessIcon fontSize="small" />
              </IconButton>
            </Box> */}
          </Box>
          {message ? (
            <Box
              sx={{
                mb: 1.5,
                px: 1.5,
                py: 1,
                borderRadius: 1,
                bgcolor: 'error.light',
                color: 'error.contrastText',
                fontSize: '0.875rem',
                fontWeight: 500,
              }}
              role="status"
            >
              {message}
            </Box>
          ) : null}
          <Box
            sx={{
              flex: 1,
              height: '100%',
              overflow: 'hidden',
            }}
          >
            <F1Tree
              key={treeKey}
              ref={treeRef}
              rows={menus}
              columns={readOnlyColumns(columns, canWrite)}
              rowKey="id"
              parentKey="parentMenuId"
              treeColumn="name"
              storageKey="menu-management-tree"
              defaultExpandAll
              showCheckbox={false}
              treeCheckbox
              height={'100%'}
              getRowOrder={(row) => row.order}
              rowFormPlugin={{}}
              columnLine={true}
              ariaLabel="F1-TREE 메뉴 관리"
              canExportExcel={canExportExcel}
              excelFileName={`${selectedModule?.moduleName ?? 'menu'}-export`}
              createRow={createMenuRow}
              editorPlugins={[menuEditorPlugin]}
              allowAddRootInContextMenu={canWrite}
              allowAddRowInContextMenu={canWrite}
              allowDeleteRowInContextMenu={canDelete}
              loading={menuGridLoading}
              beforeEdit={({ row, field }) => {
                if (field === 'code' && !isNewMenuRow(row.id)) {
                  return false;
                }
                return true;
              }}
              onChangesChange={setChanges}
              onDeleteBlocked={() =>
                notifyError('하위 메뉴가 존재하는 메뉴는 삭제할 수 없습니다.')
              }
            />
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
});

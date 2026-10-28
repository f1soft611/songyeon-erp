import { readOnlyColumns } from '../../../../../shared/utils/menuPermission';
import { Box, Card, CardContent } from '@mui/material';
import DashboardOutlined from '@mui/icons-material/DashboardOutlined';
import SettingsOutlined from '@mui/icons-material/SettingsOutlined';
import FolderOutlined from '@mui/icons-material/FolderOutlined';
import Inventory2Outlined from '@mui/icons-material/Inventory2Outlined';
import PeopleOutlined from '@mui/icons-material/PeopleOutlined';
import BusinessOutlined from '@mui/icons-material/BusinessOutlined';
import AdminPanelSettingsOutlined from '@mui/icons-material/AdminPanelSettingsOutlined';
import ListAltOutlined from '@mui/icons-material/ListAltOutlined';
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined';
import FactCheckOutlined from '@mui/icons-material/FactCheckOutlined';
import CheckCircleOutlined from '@mui/icons-material/CheckCircleOutlined';
import NotificationsOutlined from '@mui/icons-material/NotificationsOutlined';
import AssignmentOutlined from '@mui/icons-material/AssignmentOutlined';
import SecurityOutlined from '@mui/icons-material/SecurityOutlined';
import CalendarMonthOutlined from '@mui/icons-material/CalendarMonthOutlined';
import ShoppingCartOutlined from '@mui/icons-material/ShoppingCartOutlined';
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import {
  F1Grid,
  type F1GridChanges,
  type F1GridColumn,
  type F1GridRef,
} from '../../../../../shared/components/f1-grid';
import type {
  ModuleManagementRow,
  ModuleSavePayload,
} from '../types/moduleManagement.types';
import {
  createModule,
  deleteModule,
  updateModule,
} from '../services/moduleManagement.service';

type ModuleManagementPanelProps = {
  modules: ModuleManagementRow[];
  canExportExcel?: boolean;
  // 메뉴 권한(2026-10-21): 쓰기 = 셀 편집 · 오른쪽 클릭 행 추가, 삭제 = 오른쪽 클릭 행 삭제. 안 주면 true
  canWrite?: boolean;
  canDelete?: boolean;
  onCreateModule?: (payload: ModuleSavePayload) => Promise<void> | void;
  onUpdateModule?: (
    moduleId: string,
    payload: ModuleSavePayload,
  ) => Promise<void> | void;
  onDeleteModule?: (moduleId: string) => Promise<void> | void;
  onModulesSaved?: (options?: { silent?: boolean }) => Promise<void> | void;
  onSaveSuccess?: (message: string) => void;
  onDirtyChange?: (dirty: boolean) => void;
  onError?: (message: string) => void;
  moduleGridKey?: number;
  moduleGridLoading?: boolean;
};

export type ModuleManagementPanelHandle = {
  saveCurrentChanges: () => Promise<void>;
  deleteSelectedRows: () => void;
  exportCurrentRows: () => void;
};

const emptyChanges = <T extends object>(): F1GridChanges<T> => ({
  insertedRows: [],
  updatedRows: [],
  deletedRows: [],
});

export const MODULE_ICON_OPTIONS = [
  { value: 'Settings', label: 'Settings' },
  { value: 'Folder', label: 'Folder' },
  { value: 'Dashboard', label: 'Dashboard' },
  { value: 'Inventory', label: 'Inventory' },
  { value: 'People', label: 'People' },
  { value: 'Business', label: 'Business' },
  { value: 'AdminPanelSettings', label: 'AdminPanelSettings' },
  { value: 'ListAlt', label: 'ListAlt' },
  { value: 'FileText', label: 'FileText' },
  { value: 'ClipboardCheck', label: 'ClipboardCheck' },
  { value: 'CheckCircle', label: 'CheckCircle' },
  { value: 'Notifications', label: 'Notifications' },
  { value: 'Assignment', label: 'Assignment' },
  { value: 'Security', label: 'Security' },
  { value: 'CalendarMonth', label: 'CalendarMonth' },
  { value: 'ShoppingCart', label: 'ShoppingCart' },
];

const moduleIconMap = {
  Settings: <SettingsOutlined fontSize="small" />,
  Folder: <FolderOutlined fontSize="small" />,
  Dashboard: <DashboardOutlined fontSize="small" />,
  Inventory: <Inventory2Outlined fontSize="small" />,
  People: <PeopleOutlined fontSize="small" />,
  Business: <BusinessOutlined fontSize="small" />,
  AdminPanelSettings: <AdminPanelSettingsOutlined fontSize="small" />,
  ListAlt: <ListAltOutlined fontSize="small" />,
  FileText: <DescriptionOutlined fontSize="small" />,
  ClipboardCheck: <FactCheckOutlined fontSize="small" />,
  CheckCircle: <CheckCircleOutlined fontSize="small" />,
  Notifications: <NotificationsOutlined fontSize="small" />,
  Assignment: <AssignmentOutlined fontSize="small" />,
  Security: <SecurityOutlined fontSize="small" />,
  CalendarMonth: <CalendarMonthOutlined fontSize="small" />,
  ShoppingCart: <ShoppingCartOutlined fontSize="small" />,
} as const;

const renderModuleOptionIcon = (option: {
  value: string | number | boolean;
  label: string;
}) => {
  const iconName = String(option.value);
  return moduleIconMap[iconName as keyof typeof moduleIconMap] ?? undefined;
};

export const canEditModuleCode = (row: ModuleManagementRow): boolean =>
  !row.id || String(row.id).startsWith('new-module-');

export const ModuleManagementPanel = forwardRef<
  ModuleManagementPanelHandle,
  ModuleManagementPanelProps
>(function ModuleManagementPanel(
  {
    modules,
    canExportExcel = false,
    canWrite = true,
    canDelete = true,
    onCreateModule = createModule,
    onUpdateModule = updateModule,
    onDeleteModule = deleteModule,
    onModulesSaved,
    onSaveSuccess,
    onDirtyChange,
    onError,
    moduleGridKey = 0,
    moduleGridLoading = false,
  },
  ref,
) {
  const gridRef = useRef<F1GridRef<ModuleManagementRow>>(null);
  const saveInFlightRef = useRef<Promise<void> | undefined>(undefined);
  const completedOperationsRef = useRef(new Set<string>());

  useEffect(() => {
    const nextChanges =
      gridRef.current?.getChanges() ?? emptyChanges<ModuleManagementRow>();

    onDirtyChange?.(
      nextChanges.insertedRows.length > 0 ||
        nextChanges.updatedRows.length > 0 ||
        nextChanges.deletedRows.length > 0,
    );
  }, [modules, onDirtyChange]);

  const columns = useMemo<F1GridColumn<ModuleManagementRow>[]>(
    () => [
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
        field: 'moduleCode',
        headerName: '모듈 코드',
        flex: 1,
        editable: (row) => canEditModuleCode(row),
        required: true,
        headerAlign: 'center',
        align: 'left',
      },
      {
        field: 'moduleName',
        headerName: '모듈명',
        flex: 1.2,
        editable: true,
        required: true,
        headerAlign: 'center',
      },
      {
        field: 'iconName',
        headerName: '아이콘명',
        flex: 1,
        editable: true,
        required: true,
        type: 'select',
        options: MODULE_ICON_OPTIONS,
        selectOptionIcon: renderModuleOptionIcon,
        headerAlign: 'center',
      },
      {
        field: 'moduleUrl',
        headerName: '루트 경로',
        flex: 1.2,
        editable: true,
        required: true,
        headerAlign: 'center',
      },
      {
        field: 'sortOrder',
        headerName: '정렬 순서',
        flex: 0.8,
        type: 'number',
        editable: true,
        required: true,
        align: 'center',
        headerAlign: 'center',
      },
      {
        field: 'menuCount',
        headerName: '메뉴 수',
        flex: 0.7,
        type: 'number',
        editable: false,
        align: 'center',
        headerAlign: 'center',
      },
      {
        field: 'use',
        headerName: '사용 여부',
        flex: 0.8,
        type: 'checkbox',
        editable: true,
        headerCheckbox: true,
        align: 'center',
        headerAlign: 'center',
      },
    ],
    [],
  );

  const createModuleRow = useCallback(
    (): ModuleManagementRow => ({
      id: `new-module-${Date.now()}`,
      moduleCode: '',
      moduleName: '',
      iconName: 'Folder',
      moduleUrl: '',
      sortOrder: 0,
      menuCount: 0,
      use: true,
    }),
    [],
  );

  const exportCurrentRows = useCallback(() => {
    const rows = gridRef.current?.getActiveRows() ?? [];
    if (!rows.length) return;

    const csv = [
      columns.map((column) => column.headerName).join(','),
      ...rows.map((row) =>
        columns
          .map((column) => {
            const value = row[column.field as keyof ModuleManagementRow];
            const stringValue = value == null ? '' : String(value);
            return `"${stringValue.replace(/"/g, '""')}"`;
          })
          .join(','),
      ),
    ].join('\n');

    const url = URL.createObjectURL(
      new Blob([csv], { type: 'text/csv;charset=utf-8;' }),
    );
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'module-management-export.csv';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }, [columns]);

  const toPayload = useCallback(
    (row: ModuleManagementRow): ModuleSavePayload => ({
      moduleCode: row.moduleCode.trim(),
      moduleNm: row.moduleName.trim(),
      iconNm: row.iconName.trim() || null,
      moduleUrl: row.moduleUrl.trim() || null,
      sortOrder: Number.isFinite(Number(row.sortOrder))
        ? Number(row.sortOrder)
        : 0,
      useAt: row.use ? 'Y' : 'N',
    }),
    [],
  );

  const saveCurrentChanges = useCallback(() => {
    if (saveInFlightRef.current) {
      return saveInFlightRef.current;
    }

    const savePromise = (async () => {
      const nextChanges =
        gridRef.current?.getChanges() ?? emptyChanges<ModuleManagementRow>();

      try {
        for (const row of [
          ...nextChanges.insertedRows,
          ...nextChanges.updatedRows,
        ]) {
          if (!row.moduleCode.trim() || !row.moduleName.trim()) {
            throw new Error('모듈 코드와 모듈명은 필수입니다.');
          }
        }

        for (const row of nextChanges.insertedRows) {
          const operationKey = `create:${row.id}`;
          if (completedOperationsRef.current.has(operationKey)) continue;
          await onCreateModule(toPayload(row));
          completedOperationsRef.current.add(operationKey);
        }

        for (const row of nextChanges.updatedRows) {
          const operationKey = `update:${row.id}`;
          if (completedOperationsRef.current.has(operationKey)) continue;
          await onUpdateModule(row.id, toPayload(row));
          completedOperationsRef.current.add(operationKey);
        }

        for (const row of nextChanges.deletedRows) {
          const operationKey = `delete:${row.id}`;
          if (completedOperationsRef.current.has(operationKey)) continue;
          if (!String(row.id).startsWith('new-module-')) {
            await onDeleteModule(String(row.id));
            completedOperationsRef.current.add(operationKey);
          }
        }

        if (
          nextChanges.insertedRows.length ||
          nextChanges.updatedRows.length ||
          nextChanges.deletedRows.length
        ) {
          await onModulesSaved?.();
          onSaveSuccess?.('모듈을 저장했습니다.');
          completedOperationsRef.current.clear();
        }
      } catch (error) {
        if (error instanceof Error) {
          onError?.(error.message);
        } else {
          onError?.('모듈 저장에 실패했습니다.');
        }
        throw error;
      } finally {
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
    onCreateModule,
    onDeleteModule,
    onError,
    onModulesSaved,
    onSaveSuccess,
    toPayload,
    onUpdateModule,
  ]);

  useImperativeHandle(
    ref,
    () => ({
      saveCurrentChanges,
      deleteSelectedRows: () => {
        gridRef.current?.deleteSelectedRows();
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
          <Box sx={{ flex: 1, height: '100%', overflow: 'hidden' }}>
            <F1Grid
              key={moduleGridKey}
              ref={gridRef}
              rows={modules}
              columns={readOnlyColumns(columns, canWrite)}
              rowKey="id"
              storageKey="settings-system-module-grid"
              ariaLabel="F1-GRID 모듈 관리"
              height={'100%'}
              rowHeight={32}
              minRowHeight={32}
              maxRowHeight={320}
              showCheckbox={false}
              createRow={createModuleRow}
              rowFormPlugin={{}}
              columnLine={true}
              editorPlugins={[
                {
                  id: 'module-grid-editor',
                  enabled: true,
                  canEdit: () => true,
                },
              ]}
              beforeEdit={({ row, field }) => {
                if (field === 'moduleCode' && !canEditModuleCode(row)) {
                  return false;
                }
                return true;
              }}
              canExportExcel={canExportExcel}
              excelFileName="module-management-export"
              loading={moduleGridLoading}
              allowAddRowInContextMenu={canWrite}
              allowDuplicateRowInContextMenu={false}
              allowDeleteRowInContextMenu={canDelete}
              onChangesChange={(changes) => {
                onDirtyChange?.(
                  (changes?.insertedRows?.length ?? 0) > 0 ||
                    (changes?.updatedRows?.length ?? 0) > 0 ||
                    (changes?.deletedRows?.length ?? 0) > 0,
                );
              }}
            />
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
});

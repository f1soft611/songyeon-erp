import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import { Box, Card, CardContent, Typography } from '@mui/material';
import {
  F1Grid,
  type F1GridChanges,
  type F1GridColumn,
  type F1GridRef,
} from '../../../../../shared/components/f1-grid';
import type {
  WarehouseManagementRow,
  WarehouseSavePayload,
} from '../types/warehouseManagement.types';
import {
  createWarehouse,
  deleteWarehouse,
  updateWarehouse,
} from '../services/warehouseManagement.service';

type WarehouseManagementPanelProps = {
  warehouses: WarehouseManagementRow[];
  searchQuery?: string;
  canExportExcel?: boolean;
  onCreateWarehouse?: (payload: WarehouseSavePayload) => Promise<void> | void;
  onUpdateWarehouse?: (
    warehouseId: string,
    payload: WarehouseSavePayload,
  ) => Promise<void> | void;
  onDeleteWarehouse?: (warehouseId: string) => Promise<void> | void;
  onWarehousesSaved?: (options?: { silent?: boolean }) => Promise<void> | void;
  onDirtyChange?: (dirty: boolean) => void;
  onError?: (message: string) => void;
  warehouseGridKey?: number;
  warehouseGridLoading?: boolean;
};

export type WarehouseManagementPanelHandle = {
  saveCurrentChanges: () => Promise<void>;
  deleteSelectedRows: () => void;
  exportCurrentRows: () => void;
};

const emptyChanges = <T extends object>(): F1GridChanges<T> => ({
  insertedRows: [],
  updatedRows: [],
  deletedRows: [],
});

export const canEditWarehouseName = (row: WarehouseManagementRow): boolean =>
  !row.id || String(row.id).startsWith('new-warehouse-');

export const WarehouseManagementPanel = forwardRef<
  WarehouseManagementPanelHandle,
  WarehouseManagementPanelProps
>(function WarehouseManagementPanel(
  {
    warehouses,
    searchQuery = '',
    canExportExcel = false,
    onCreateWarehouse = createWarehouse,
    onUpdateWarehouse = updateWarehouse,
    onDeleteWarehouse = deleteWarehouse,
    onWarehousesSaved,
    onDirtyChange,
    onError,
    warehouseGridKey = 0,
    warehouseGridLoading = false,
  },
  ref,
) {
  const gridRef = useRef<F1GridRef<WarehouseManagementRow>>(null);
  const saveInFlightRef = useRef<Promise<void> | undefined>(undefined);
  const completedOperationsRef = useRef(new Set<string>());

  const filteredWarehouses = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return warehouses;

    return warehouses.filter((warehouse) =>
      warehouse.warehouseName.toLowerCase().includes(query),
    );
  }, [warehouses, searchQuery]);

  useEffect(() => {
    const nextChanges =
      gridRef.current?.getChanges() ?? emptyChanges<WarehouseManagementRow>();

    onDirtyChange?.(
      nextChanges.insertedRows.length > 0 ||
        nextChanges.updatedRows.length > 0 ||
        nextChanges.deletedRows.length > 0,
    );
  }, [filteredWarehouses, onDirtyChange]);

  const columns: F1GridColumn<WarehouseManagementRow>[] = [
    {
      field: 'warehouseName',
      headerName: '창고명',
      flex: 1,
      editable: (row) => canEditWarehouseName(row),
      headerAlign: 'center',
      align: 'left',
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
  ];

  const createWarehouseRow = useCallback(
    (): WarehouseManagementRow => ({
      id: `new-warehouse-${Date.now()}`,
      warehouseName: '',
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
            const value = row[column.field as keyof WarehouseManagementRow];
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
    anchor.download = 'warehouse-management-export.csv';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }, [columns]);

  const toPayload = (row: WarehouseManagementRow): WarehouseSavePayload => ({
    warehouseNm: row.warehouseName.trim(),
    useAt: row.use ? 'Y' : 'N',
  });

  const saveCurrentChanges = useCallback(() => {
    if (saveInFlightRef.current) {
      return saveInFlightRef.current;
    }

    const savePromise = (async () => {
      const nextChanges =
        gridRef.current?.getChanges() ?? emptyChanges<WarehouseManagementRow>();

      try {
        for (const row of [
          ...nextChanges.insertedRows,
          ...nextChanges.updatedRows,
        ]) {
          if (!row.warehouseName.trim()) {
            throw new Error('창고명은 필수입니다.');
          }
        }

        for (const row of nextChanges.insertedRows) {
          const operationKey = `create:${row.id}`;
          if (completedOperationsRef.current.has(operationKey)) continue;
          await onCreateWarehouse(toPayload(row));
          completedOperationsRef.current.add(operationKey);
        }

        for (const row of nextChanges.updatedRows) {
          const operationKey = `update:${row.id}`;
          if (completedOperationsRef.current.has(operationKey)) continue;
          await onUpdateWarehouse(row.id, toPayload(row));
          completedOperationsRef.current.add(operationKey);
        }

        for (const row of nextChanges.deletedRows) {
          const operationKey = `delete:${row.id}`;
          if (completedOperationsRef.current.has(operationKey)) continue;
          if (!String(row.id).startsWith('new-warehouse-')) {
            await onDeleteWarehouse(String(row.id));
            completedOperationsRef.current.add(operationKey);
          }
        }

        if (
          nextChanges.insertedRows.length ||
          nextChanges.updatedRows.length ||
          nextChanges.deletedRows.length
        ) {
          await onWarehousesSaved?.();
          completedOperationsRef.current.clear();
        }
      } catch (error) {
        if (error instanceof Error) {
          onError?.(error.message);
        } else {
          onError?.('창고 관리 저장에 실패했습니다.');
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
    onCreateWarehouse,
    onDeleteWarehouse,
    onError,
    onWarehousesSaved,
    onUpdateWarehouse,
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
        p: { xs: 1.5, sm: 1 },
        minWidth: 0,
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      <Card
        sx={{
          borderRadius: 1,
          border: '1px solid rgba(148,163,184,0.18)',
          boxShadow: 'none',
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          height: '100%',
          overflow: 'hidden',
        }}
      >
        <CardContent
          sx={{
            p: 2.5,
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            height: '100%',
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: { xs: 'flex-start', sm: 'center' },
              flexWrap: 'wrap',
              gap: 1,
              mb: 2,
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              창고 관리
            </Typography>
          </Box>
          <Box sx={{ flex: 1, height: '100%', overflow: 'hidden' }}>
            <F1Grid
              key={warehouseGridKey}
              ref={gridRef}
              rows={filteredWarehouses}
              columns={columns}
              rowKey="id"
              storageKey="settings-system-warehouse-grid"
              ariaLabel="F1-GRID 창고 관리"
              height="100%"
              maxHeight="100%"
              rowHeight={32}
              minRowHeight={32}
              maxRowHeight={320}
              showCheckbox={false}
              createRow={createWarehouseRow}
              editorPlugins={[
                {
                  id: 'warehouse-grid-editor',
                  enabled: true,
                  canEdit: () => true,
                },
              ]}
              beforeEdit={({ row, field }) => {
                if (field === 'warehouseName' && !canEditWarehouseName(row)) {
                  return false;
                }
                return true;
              }}
              canExportExcel={canExportExcel}
              excelFileName="warehouse-management-export"
              loading={warehouseGridLoading}
              allowAddRowInContextMenu={true}
              allowDuplicateRowInContextMenu={false}
              allowDeleteRowInContextMenu={true}
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

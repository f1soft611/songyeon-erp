import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, TextField } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import SaveIcon from '@mui/icons-material/Save';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { type PermissionActionGroupDefinition } from '../../../../shared/components/PermissionGroup';
import { PageMessageArea } from '../../../../shared/components/PageMessageArea';
import { PageSearchArea } from '../../../../shared/components/PageSearchArea';
import type {
  ModuleItem,
  PageContent,
} from '../../../dashboard/types/dashboard';
import {
  WarehouseManagementPanel,
  type WarehouseManagementPanelHandle,
} from './components/WarehouseManagementPanel';
import {
  createWarehouse,
  deleteWarehouse,
  fetchWarehouseRows,
  updateWarehouse,
} from './services/warehouseManagement.service';
import type { WarehouseManagementRow } from './types/warehouseManagement.types';

type WarehouseManagementPageProps = {
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

export function WarehouseManagementPage({
  selectedModule,
  currentMenuName,
  content,
  breadcrumbItems,
  selectedMenuPermissions,
}: WarehouseManagementPageProps) {
  const warehousePanelRef = useRef<WarehouseManagementPanelHandle>(null);
  const [warehouses, setWarehouses] = useState<WarehouseManagementRow[]>([]);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [panelDirty, setPanelDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pageLoading, setPageLoading] = useState(false);
  const [warehouseGridKey, setWarehouseGridKey] = useState(0);
  const warehouseRequestIdRef = useRef(0);

  const filteredWarehouses = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return warehouses;
    return warehouses.filter((warehouse) =>
      warehouse.warehouseName.toLowerCase().includes(query),
    );
  }, [warehouses, searchQuery]);

  const pageActionPermissions = useMemo(
    () => ({
      read: Boolean(selectedMenuPermissions?.read ?? false),
      write: Boolean(
        selectedMenuPermissions?.create || selectedMenuPermissions?.update,
      ),
      excel: Boolean(selectedMenuPermissions?.excel ?? false),
    }),
    [selectedMenuPermissions],
  );

  const loadWarehouses = useCallback(
    async ({ showSkeleton = false }: { showSkeleton?: boolean } = {}) => {
      const requestId = ++warehouseRequestIdRef.current;
      setError('');
      if (showSkeleton) {
        setPageLoading(true);
      }

      try {
        const result = await fetchWarehouseRows();
        if (requestId === warehouseRequestIdRef.current) {
          setWarehouses(result);
        }
      } catch (requestError) {
        if (requestId === warehouseRequestIdRef.current) {
          setWarehouses([]);
          setError(
            requestError instanceof Error
              ? requestError.message
              : '창고 목록을 불러오지 못했습니다.',
          );
        }
        throw requestError;
      } finally {
        if (requestId === warehouseRequestIdRef.current && showSkeleton) {
          setPageLoading(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    void loadWarehouses({ showSkeleton: true }).catch(() => undefined);
  }, [loadWarehouses]);

  const handleWarehousesSaved = useCallback(async () => {
    await loadWarehouses();
    setWarehouseGridKey((current) => current + 1);
  }, [loadWarehouses]);

  const handleSaveChanges = useCallback(async () => {
    if (!warehousePanelRef.current) return;
    setSaving(true);
    try {
      await warehousePanelRef.current.saveCurrentChanges();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : '창고 저장에 실패했습니다.',
      );
    } finally {
      setSaving(false);
    }
  }, []);

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
            void loadWarehouses({ showSkeleton: true });
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
      <PageSearchArea>
        <TextField
          size="small"
          margin="none"
          placeholder="창고명 검색"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          slotProps={{
            htmlInput: { 'aria-label': '창고 검색' },
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
      <WarehouseManagementPanel
        ref={warehousePanelRef}
        warehouses={filteredWarehouses}
        searchQuery={searchQuery}
        canExportExcel={pageActionPermissions.excel}
        onCreateWarehouse={createWarehouse}
        onUpdateWarehouse={updateWarehouse}
        onDeleteWarehouse={deleteWarehouse}
        onWarehousesSaved={handleWarehousesSaved}
        onDirtyChange={setPanelDirty}
        onError={setError}
        warehouseGridKey={warehouseGridKey}
        warehouseGridLoading={pageLoading}
      />
    </Box>
  );
}

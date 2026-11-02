import { Box, Tab, Tabs } from '@mui/material';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { type PermissionActionGroupDefinition } from '../../../../shared/components/PermissionGroup';
import type { MenuPermission, ModuleItem, PageContent } from '../../../dashboard/types/dashboard';
import { MaterialAdjustTab } from './components/MaterialAdjustTab';
import { ProductAdjustTab } from './components/ProductAdjustTab';
import { MaterialAllDialog, MaterialUploadDialog, ProductAllDialog } from './components/StockAdjustDialogs';
import { WarehouseMoveTab } from './components/WarehouseMoveTab';
import { useStockAdjustManagement } from './hooks/useStockAdjustManagement';
import type { StockAdjustTabKey } from './types/stockAdjust.types';

type StockAdjustManagementPageProps = {
  selectedModule: ModuleItem;
  currentMenuName: string;
  content: PageContent;
  breadcrumbItems?: string[];
  selectedMenuPermissions?: MenuPermission;
};

// 구매관리 > 재고조정 (송연 #screen-stock · 18-stock.js · 30-warehouse-move.js)
// 탭 세 개: 원재료 재고조정 · 제품 재고조정(엑셀로 센 재고를 대기 → 반영일 확정) · 창고이동(완포장을 계량실로, 바코드).
// 송연은 탭마다 권한을 따로 봤지만 이 프로젝트는 권한 개념이 없어 세 탭을 모두 보인다.
export function StockAdjustManagementPage({
  selectedModule,
  currentMenuName,
  content,
  breadcrumbItems,
  selectedMenuPermissions,
}: StockAdjustManagementPageProps) {
  const management = useStockAdjustManagement();
  const { tab, warehouses } = management;

  const canRead = Boolean(selectedMenuPermissions?.read);
  const canWrite = Boolean(selectedMenuPermissions?.create || selectedMenuPermissions?.update);
  const pageActionGroups: PermissionActionGroupDefinition[] = {
    material: [
      {
        key: 'read',
        actions: [
          {
            label: '전체 재고 조회',
            icon: Inventory2Icon,
            visible: canRead,
            onClick: () => management.setMaterialAllOpen(true),
          },
        ],
      },
      {
        key: 'write',
        actions: [
          {
            label: '재고조사 엑셀 올리기',
            icon: UploadFileIcon,
            visible: canWrite,
            onClick: management.openUpload,
          },
        ],
      },
    ],
    product: [
      {
        key: 'read',
        actions: [
          {
            label: '전체 재고 조회 (로트별)',
            icon: Inventory2Icon,
            visible: canRead,
            onClick: () => management.setProductAllOpen(true),
          },
        ],
      },
    ],
    whmove: [],
  }[tab];

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%' }}>
      <PageHeader
        breadcrumbItems={breadcrumbItems && breadcrumbItems.length > 0 ? breadcrumbItems : [selectedModule.name, currentMenuName]}
        description={content.description}
        actionGroups={pageActionGroups}
      />
      <Box sx={{ px: { xs: 1.5, sm: 2 }, borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tab} onChange={(_event, value: StockAdjustTabKey) => management.setTab(value)} aria-label="재고조정 탭">
          <Tab value="material" label="원재료 재고조정" />
          <Tab value="product" label="제품 재고조정" />
          <Tab value="whmove" label="창고이동" />
        </Tabs>
      </Box>
      <Box sx={{ p: { xs: 1.5, sm: 1 }, flex: 1, minHeight: 0, overflow: 'auto' }}>
        {tab === 'material' && <MaterialAdjustTab refreshKey={management.materialRefresh} warehouses={warehouses} />}
        {tab === 'product' && <ProductAdjustTab />}
        {tab === 'whmove' && <WarehouseMoveTab />}
      </Box>
      <MaterialUploadDialog
        open={management.uploadOpen}
        warehouses={warehouses}
        onClose={() => management.setUploadOpen(false)}
        onUploaded={management.afterUploaded}
      />
      <MaterialAllDialog open={management.materialAllOpen} onClose={() => management.setMaterialAllOpen(false)} />
      <ProductAllDialog open={management.productAllOpen} onClose={() => management.setProductAllOpen(false)} />
    </Box>
  );
}

import { useEffect, useState } from 'react';
import { Box, Tab, Tabs } from '@mui/material';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { PageHeader } from '../../../shared/components/PageHeader';
import { type PermissionActionGroupDefinition } from '../../../shared/components/PermissionGroup';
import type { MenuPermission, ModuleItem, PageContent } from '../../dashboard/types/dashboard';
import { fetchWarehouseRows } from '../../co/master/warehouse/services/warehouse.service';
import { MaterialAdjustTab } from './components/MaterialAdjustTab';
import { ProductAdjustTab } from './components/ProductAdjustTab';
import { MaterialAllDialog, MaterialUploadDialog, ProductAllDialog } from './components/StockAdjustDialogs';
import { WarehouseMoveTab } from './components/WarehouseMoveTab';

type StockAdjustPageProps = {
  selectedModule: ModuleItem;
  currentMenuName: string;
  content: PageContent;
  breadcrumbItems?: string[];
  selectedMenuPermissions?: MenuPermission;
};
type TabKey = 'material' | 'product' | 'whmove';

// 구매관리 > 재고조정 (송연 #screen-stock · 18-stock.js · 30-warehouse-move.js)
// 탭 세 개: 원재료 재고조정 · 제품 재고조정(엑셀로 센 재고를 대기 → 반영일 확정) · 창고이동(완포장을 계량실로, 바코드).
// 송연은 탭마다 권한을 따로 봤지만 이 프로젝트는 권한 개념이 없어 세 탭을 모두 보인다.
export function StockAdjustPage({
  selectedModule,
  currentMenuName,
  content,
  breadcrumbItems,
  selectedMenuPermissions,
}: StockAdjustPageProps) {
  const [tab, setTab] = useState<TabKey>('material');
  const [warehouses, setWarehouses] = useState<string[]>([]);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [materialAllOpen, setMaterialAllOpen] = useState(false);
  const [productAllOpen, setProductAllOpen] = useState(false);
  const [materialRefresh, setMaterialRefresh] = useState(0);

  // 고를 수 있는 창고는 기초정보 > 창고등록에서 가져온다(창고를 방금 등록했을 수도 있어 올리기 창을 열 때마다 다시)
  const loadWarehouses = () => fetchWarehouseRows().then((rows) => setWarehouses(rows.map((w) => w.name).filter(Boolean))).catch(() => undefined);
  useEffect(() => {
    void loadWarehouses();
  }, []);

  const canRead = Boolean(selectedMenuPermissions?.read);
  const canWrite = Boolean(selectedMenuPermissions?.create || selectedMenuPermissions?.update);
  const pageActionGroups: PermissionActionGroupDefinition[] = {
    material: [
      { key: 'read', actions: [{ label: '전체 재고 조회', icon: Inventory2Icon, visible: canRead, onClick: () => setMaterialAllOpen(true) }] },
      {
        key: 'write',
        actions: [{ label: '재고조사 엑셀 올리기', icon: UploadFileIcon, visible: canWrite, onClick: () => { void loadWarehouses(); setUploadOpen(true); } }],
      },
    ],
    product: [{ key: 'read', actions: [{ label: '전체 재고 조회 (로트별)', icon: Inventory2Icon, visible: canRead, onClick: () => setProductAllOpen(true) }] }],
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
        <Tabs value={tab} onChange={(_event, value: TabKey) => setTab(value)} aria-label="재고조정 탭">
          <Tab value="material" label="원재료 재고조정" />
          <Tab value="product" label="제품 재고조정" />
          <Tab value="whmove" label="창고이동" />
        </Tabs>
      </Box>
      <Box sx={{ p: { xs: 1.5, sm: 1 }, flex: 1, minHeight: 0, overflow: 'auto' }}>
        {tab === 'material' && <MaterialAdjustTab refreshKey={materialRefresh} warehouses={warehouses} />}
        {tab === 'product' && <ProductAdjustTab />}
        {tab === 'whmove' && <WarehouseMoveTab active />}
      </Box>
      <MaterialUploadDialog open={uploadOpen} warehouses={warehouses} onClose={() => setUploadOpen(false)} onUploaded={() => setMaterialRefresh((v) => v + 1)} />
      <MaterialAllDialog open={materialAllOpen} onClose={() => setMaterialAllOpen(false)} />
      <ProductAllDialog open={productAllOpen} onClose={() => setProductAllOpen(false)} />
    </Box>
  );
}

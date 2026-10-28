import {
  Box,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  Stack,
  Typography,
  useTheme,
} from '@mui/material';
import FactCheckOutlined from '@mui/icons-material/FactCheckOutlined';
import { OverviewPage } from '../../groupware/OverviewPage';
import { CommunityNoticePage } from '../../groupware/community/notice/CommunityNoticePage';
import { ArchiveBoardPage } from '../../groupware/community/archive/ArchiveBoardPage';
import { DocumentWritePage } from '../../groupware/documents/write/DocumentWritePage';
import { DocumentStatusPage } from '../../groupware/documents/status/DocumentStatusPage';
import { MenuManagementPage } from '../../settings/system/menus/MenuManagementPage';
import { ModuleManagementPage } from '../../settings/system/modules/ModuleManagementPage';
import { RoleManagementPage } from '../../settings/system/roles/RoleManagementPage';
import { CommonCodeManagementPage } from '../../co/master/common-code/CommonCodeManagementPage';
import { DraftFormManagementPage } from '../../co/workflow/form/DraftFormManagementPage';
import { F1GridTestPage } from '../../settings/system/f1-grid-test/F1GridTestPage';
import { F1GridDocsPage } from '../../f1-grid-docs/F1GridDocsPage';
import DashboardHomePage from '../home/DashboardHomePage';
import { BoxTypeManagementPage } from '../../co/master/box-type/BoxTypeManagementPage';
import { WarehouseManagementPage } from '../../co/master/warehouse/WarehouseManagementPage';
import { ItemMasterManagementPage } from '../../co/master/item-master/ItemMasterManagementPage';
import { PartnerMasterManagementPage } from '../../co/master/partner-master/PartnerMasterManagementPage';
import { PartnerItemManagementPage } from '../../co/master/partner-item/PartnerItemManagementPage';
import { MaterialMasterManagementPage } from '../../co/master/material-master/MaterialMasterManagementPage';
import { SubMaterialMasterManagementPage } from '../../co/master/sub-material-master/SubMaterialMasterManagementPage';
import { ProductRegisterManagementPage } from '../../sa/product/ProductRegisterManagementPage';
import { PricingPage } from '../../sa/pricing/PricingPage';
import { QuotePage } from '../../sa/quote/QuotePage';
import { SalesOrderPage } from '../../sa/order/SalesOrderPage';
import { ShipmentPage } from '../../sa/shipment/ShipmentPage';
import { FeasibilityPage } from '../../sa/feasibility/FeasibilityPage';
import { ProductionConfirmPage } from '../../pd/confirm/ProductionConfirmPage';
import { ProductionActualPage } from '../../pd/actual/ProductionActualPage';
import { ProductionStatusPage } from '../../pd/status/ProductionStatusPage';
import { LabelPrintPage } from '../../pd/label/LabelPrintPage';
import { ProductStockPage } from '../../lg/stock/ProductStockPage';
import { ShipConfirmPage } from '../../lg/confirm/ShipConfirmPage';
import { ShipStatusPage } from '../../lg/status/ShipStatusPage';
import { SalesRegisterPage } from '../../sl/register/SalesRegisterPage';
import { SalesStatusPage } from '../../sl/status/SalesStatusPage';
import { SalesTotalPage } from '../../sl/total/SalesTotalPage';
import { PurchaseOrderPage } from '../../pu/order/PurchaseOrderPage';
import { ReceivingPage } from '../../pu/receiving/ReceivingPage';
import { MaterialSubstitutionPage } from '../../pu/substitution/MaterialSubstitutionPage';
import { StockLedgerPage } from '../../pu/ledger/StockLedgerPage';
import { StockAdjustPage } from '../../pu/stockadjust/StockAdjustPage';
import { StockStatusPage } from '../../pu/stockstatus/StockStatusPage';
import { DocumentBoxPage } from '../../pu/documents/DocumentBoxPage';
import { TemperatureMonitorPage } from '../../qm/temperature/TemperatureMonitorPage';
import { LabelRegisterPage } from '../../qm/labelregister/LabelRegisterPage';
import { RecipeWritePage } from '../../rd/recipe/RecipeWritePage';
import { RecipeSharePage } from '../../rd/recipeshare/RecipeSharePage';
import { RecipeLogPage } from '../../rd/recipelog/RecipeLogPage';
import { HrPage } from '../../ha/hr/HrPage';
import { AccBasicPage } from '../../ha/accbasic/AccBasicPage';
import { AccTxPage } from '../../ha/acctx/AccTxPage';
import { AccIoPage } from '../../ha/accio/AccIoPage';
import { AccSalesPage } from '../../ha/accsales/AccSalesPage';
import { AccLedgerPage } from '../../ha/accledger/AccLedgerPage';
import { TaxInvoicePage } from '../../ha/taxinvoice/TaxInvoicePage';
import { ProductionScheduleManagementPage } from '../../co/schedule/production-schedule/ProductionScheduleManagementPage';
import { LogisticsScheduleManagementPage } from '../../co/schedule/logistics-schedule/LogisticsScheduleManagementPage';
import { PageHeader } from '../../../shared/components/PageHeader';
import { pageContentMap } from '../services/dashboardData';
import type {
  MenuPermission,
  ModuleItem,
  PageContent,
} from '../types/dashboard';

type DashboardContentProps = {
  selectedModule: ModuleItem;
  currentMenuName: string;
  currentPageKey: string;
  breadcrumbItems: string[];
  content: PageContent;
  selectedMenuPermissions?: MenuPermission;
  isTenantAdmin?: boolean;
};

export function ComingSoonPage({
  title,
}: {
  title?: string;
  description?: string;
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 'calc(100vh - 220px)',
        bgcolor: theme.palette.background.default,
        color: theme.palette.text.primary,
        textAlign: 'center',
        px: 2,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1.5,
          maxWidth: 520,
        }}
      >
        <FactCheckOutlined
          sx={{
            fontSize: 40,
            color: isDark
              ? 'rgba(226, 232, 240, 0.7)'
              : 'rgba(15, 23, 42, 0.3)',
          }}
        />

        <Typography
          variant="h6"
          sx={{
            fontWeight: 700,
            fontSize: '1.05rem',
            lineHeight: 1.4,
            color: theme.palette.text.primary,
          }}
        >
          요청하신 페이지는 현재 준비 중입니다
        </Typography>

        <Typography
          variant="body2"
          sx={{
            color: theme.palette.text.secondary,
            fontSize: '0.78rem',
            lineHeight: 1.6,
          }}
        >
          {title
            ? `${title} 메뉴는 추후 서비스될 예정입니다.`
            : '추후 실제 화면이 연결됩니다.'}
        </Typography>
      </Box>
    </Box>
  );
}

function TrendIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ width: '1em', height: '1em', display: 'block' }}
    >
      <path d="M4 17.5 9 12l3 3 8-9" />
      <path d="M15 6h5v5" />
    </svg>
  );
}

export function DashboardContent({
  selectedModule,
  currentMenuName,
  currentPageKey,
  breadcrumbItems,
  content,
  selectedMenuPermissions,
  isTenantAdmin = false,
}: DashboardContentProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  if (selectedModule.id === 'groupware' && currentPageKey === 'overview') {
    return (
      <OverviewPage
        selectedModule={selectedModule}
        currentMenuName={currentMenuName}
        content={content}
      />
    );
  }

  // 그룹웨어 문서관리 · 커뮤니티: S_ERP 와 같게(2026-10-22 그룹웨어 이관)
  if (
    selectedModule.id === 'groupware' &&
    (currentPageKey === 'documents' || currentPageKey === 'read')
  ) {
    return (
      <DocumentStatusPage
        selectedModule={selectedModule}
        currentMenuName={currentMenuName}
        content={content}
        selectedMenuPermissions={selectedMenuPermissions}
      />
    );
  }

  if (selectedModule.id === 'groupware' && currentPageKey === 'write') {
    return (
      <DocumentWritePage
        selectedModule={selectedModule}
        currentMenuName={currentMenuName}
        content={content}
      />
    );
  }

  if (selectedModule.id === 'groupware' && currentPageKey === 'notice') {
    return (
      <CommunityNoticePage
        selectedModule={selectedModule}
        currentMenuName={currentMenuName}
        content={content}
      />
    );
  }

  if (selectedModule.id === 'groupware' && currentPageKey === 'archive') {
    return (
      <ArchiveBoardPage
        selectedModule={selectedModule}
        currentMenuName={currentMenuName}
        content={content}
        selectedMenuPermissions={selectedMenuPermissions}
        isTenantAdmin={isTenantAdmin}
      />
    );
  }

  if (selectedModule.id === 'settings' && currentPageKey === 'roles') {
    return (
      <RoleManagementPage
        selectedModule={selectedModule}
        currentMenuName={currentMenuName}
        content={content}
        breadcrumbItems={breadcrumbItems}
        selectedMenuPermissions={selectedMenuPermissions}
      />
    );
  }

  if (selectedModule.id === 'settings' && currentPageKey === 'menus') {
    return (
      <MenuManagementPage
        selectedModule={selectedModule}
        currentMenuName={currentMenuName}
        content={content}
        breadcrumbItems={breadcrumbItems}
        selectedMenuPermissions={selectedMenuPermissions}
      />
    );
  }

  if (selectedModule.id === 'settings' && currentPageKey === 'modules') {
    return (
      <ModuleManagementPage
        selectedModule={selectedModule}
        currentMenuName={currentMenuName}
        content={content}
        breadcrumbItems={breadcrumbItems}
        selectedMenuPermissions={selectedMenuPermissions}
      />
    );
  }

  // 공통코드 관리(S_ERP 기준정보 > 기준정보 관리 > 공통코드 관리). 송연은 공통관리 > 기초정보(분류) > 공통코드 관리(/co/master/cmncodes)
  if (
    selectedModule.id === 'co' &&
    (currentPageKey === 'common-code' || currentPageKey === 'cmncodes')
  ) {
    return (
      <CommonCodeManagementPage
        selectedModule={selectedModule}
        currentMenuName={currentMenuName}
        content={content}
        breadcrumbItems={breadcrumbItems}
        selectedMenuPermissions={selectedMenuPermissions}
      />
    );
  }

  if (selectedModule.id === 'co' && currentPageKey === 'form') {
    return (
      <DraftFormManagementPage
        selectedModule={selectedModule}
        currentMenuName={currentMenuName}
        content={content}
        breadcrumbItems={breadcrumbItems}
        selectedMenuPermissions={selectedMenuPermissions}
        isTenantAdmin={isTenantAdmin}
      />
    );
  }

  if (selectedModule.id === 'settings' && currentPageKey === 'f1-grid-test') {
    return (
      <F1GridTestPage
        selectedModule={selectedModule}
        currentMenuName={currentMenuName}
        content={content}
      />
    );
  }

  if (selectedModule.id === 'settings' && currentPageKey === 'f1-grid-docs') {
    return <F1GridDocsPage />;
  }

  // 공통관리 > 기초정보 > 부자재마스터 (화면ID BSSubMaterialMasterView, 예전 기초정보의 부자재BOM 탭)
  // 송연 기초정보(CM0001) 화면은 탭을 모두 화면으로 빼고 지웠다(서버관리 탭도 지움, 2026-10-19)
  if (selectedModule.id === 'co' && currentPageKey === 'BSSubMaterialMasterView') {
    return (
      <SubMaterialMasterManagementPage
        selectedModule={selectedModule}
        currentMenuName={currentMenuName}
        content={content}
        breadcrumbItems={breadcrumbItems}
        selectedMenuPermissions={selectedMenuPermissions}
      />
    );
  }

  // 공통관리 > 기초정보 > 원재료마스터 (화면ID BSMaterialMasterView, 예전 기초정보의 원재료BOM 탭)
  if (selectedModule.id === 'co' && currentPageKey === 'BSMaterialMasterView') {
    return (
      <MaterialMasterManagementPage
        selectedModule={selectedModule}
        currentMenuName={currentMenuName}
        content={content}
        breadcrumbItems={breadcrumbItems}
        selectedMenuPermissions={selectedMenuPermissions}
      />
    );
  }

  // 공통관리 > 기초정보 > 거래처별 제품조회 (화면ID BSPartnerItemView, 예전 기초정보의 거래처별 제품조회 탭)
  if (selectedModule.id === 'co' && currentPageKey === 'BSPartnerItemView') {
    return (
      <PartnerItemManagementPage
        selectedModule={selectedModule}
        currentMenuName={currentMenuName}
        content={content}
        breadcrumbItems={breadcrumbItems}
        selectedMenuPermissions={selectedMenuPermissions}
      />
    );
  }

  // 공통관리 > 기초정보 > 거래처마스터 (화면ID BSPartnerMasterView, 예전 기초정보의 거래처BOM 탭)
  if (selectedModule.id === 'co' && currentPageKey === 'BSPartnerMasterView') {
    return (
      <PartnerMasterManagementPage
        selectedModule={selectedModule}
        currentMenuName={currentMenuName}
        content={content}
        breadcrumbItems={breadcrumbItems}
        selectedMenuPermissions={selectedMenuPermissions}
      />
    );
  }

  // 공통관리 > 기초정보 > 제품마스터 (화면ID BSItemMasterView, 예전 기초정보의 제품BOM 탭)
  if (selectedModule.id === 'co' && currentPageKey === 'BSItemMasterView') {
    return (
      <ItemMasterManagementPage
        selectedModule={selectedModule}
        currentMenuName={currentMenuName}
        content={content}
        breadcrumbItems={breadcrumbItems}
        selectedMenuPermissions={selectedMenuPermissions}
      />
    );
  }

  // 공통관리 > 기초정보 > 창고등록 (화면ID BSWarehouseView, 예전 기초정보의 창고등록 탭)
  if (selectedModule.id === 'co' && currentPageKey === 'BSWarehouseView') {
    return (
      <WarehouseManagementPage
        selectedModule={selectedModule}
        currentMenuName={currentMenuName}
        content={content}
        breadcrumbItems={breadcrumbItems}
        selectedMenuPermissions={selectedMenuPermissions}
      />
    );
  }

  // 공통관리 > 기준정보 > 포장유형 (화면ID BSBoxTypeView, 예전 기초정보의 포장유형 탭)
  if (selectedModule.id === 'co' && currentPageKey === 'BSBoxTypeView') {
    return (
      <BoxTypeManagementPage
        selectedModule={selectedModule}
        currentMenuName={currentMenuName}
        content={content}
        breadcrumbItems={breadcrumbItems}
        selectedMenuPermissions={selectedMenuPermissions}
      />
    );
  }

  // 송연 영업관리 > 제품등록 (송연 SA0001)
  if (selectedModule.id === 'sa' && currentPageKey === 'product') {
    return (
      <ProductRegisterManagementPage
        selectedModule={selectedModule}
        currentMenuName={currentMenuName}
        content={content}
        breadcrumbItems={breadcrumbItems}
        selectedMenuPermissions={selectedMenuPermissions}
      />
    );
  }

  // 송연 영업관리 > 단가관리 (송연 SA0002)
  if (selectedModule.id === 'sa' && currentPageKey === 'pricing') {
    return (
      <PricingPage
        selectedModule={selectedModule}
        currentMenuName={currentMenuName}
        content={content}
        breadcrumbItems={breadcrumbItems}
        selectedMenuPermissions={selectedMenuPermissions}
      />
    );
  }

  // 송연 영업관리 > 견적 (송연 SA0003)
  if (selectedModule.id === 'sa' && currentPageKey === 'quote') {
    return (
      <QuotePage
        selectedModule={selectedModule}
        currentMenuName={currentMenuName}
        content={content}
        breadcrumbItems={breadcrumbItems}
        selectedMenuPermissions={selectedMenuPermissions}
      />
    );
  }

  // 송연 영업관리 > 수주등록 (송연 SA0004)
  if (selectedModule.id === 'sa' && currentPageKey === 'order') {
    return (
      <SalesOrderPage
        selectedModule={selectedModule}
        currentMenuName={currentMenuName}
        content={content}
        breadcrumbItems={breadcrumbItems}
        selectedMenuPermissions={selectedMenuPermissions}
      />
    );
  }

  // 송연 영업관리 > 생산가능확인 (송연 SA0006)
  if (selectedModule.id === 'sa' && currentPageKey === 'prod-check') {
    return (
      <FeasibilityPage
        selectedModule={selectedModule}
        currentMenuName={currentMenuName}
        content={content}
        breadcrumbItems={breadcrumbItems}
        selectedMenuPermissions={selectedMenuPermissions}
      />
    );
  }

  // 송연 영업관리 > 출하등록 (송연 SA0005)
  if (selectedModule.id === 'sa' && currentPageKey === 'shipment') {
    return (
      <ShipmentPage
        selectedModule={selectedModule}
        currentMenuName={currentMenuName}
        content={content}
        breadcrumbItems={breadcrumbItems}
        selectedMenuPermissions={selectedMenuPermissions}
      />
    );
  }

  // 공통관리 > 스케줄관리 > 생산스케줄 (화면ID SCProductionScheduleView, 송연 CM0002)
  if (selectedModule.id === 'co' && currentPageKey === 'SCProductionScheduleView') {
    return (
      <ProductionScheduleManagementPage
        selectedModule={selectedModule}
        currentMenuName={currentMenuName}
        content={content}
        breadcrumbItems={breadcrumbItems}
        selectedMenuPermissions={selectedMenuPermissions}
      />
    );
  }

  // 공통관리 > 스케줄관리 > 물류스케줄 (화면ID SCLogisticsScheduleView, 송연 CM0003)
  if (selectedModule.id === 'co' && currentPageKey === 'SCLogisticsScheduleView') {
    return (
      <LogisticsScheduleManagementPage
        selectedModule={selectedModule}
        currentMenuName={currentMenuName}
        content={content}
        breadcrumbItems={breadcrumbItems}
        selectedMenuPermissions={selectedMenuPermissions}
      />
    );
  }

  // 송연 생산관리 > 생산확정 (송연 PD0001)
  if (selectedModule.id === 'pd' && currentPageKey === 'prod-confirm') {
    return (
      <ProductionConfirmPage
        selectedModule={selectedModule}
        currentMenuName={currentMenuName}
        content={content}
        breadcrumbItems={breadcrumbItems}
        selectedMenuPermissions={selectedMenuPermissions}
      />
    );
  }

  // 송연 생산관리 > 생산입고 (송연 PD0002)
  if (selectedModule.id === 'pd' && currentPageKey === 'actual') {
    return (
      <ProductionActualPage
        selectedModule={selectedModule}
        currentMenuName={currentMenuName}
        content={content}
        breadcrumbItems={breadcrumbItems}
        selectedMenuPermissions={selectedMenuPermissions}
      />
    );
  }

  // 송연 생산관리 > 생산현황 (송연 PD0003)
  if (selectedModule.id === 'pd' && currentPageKey === 'prod-status') {
    return (
      <ProductionStatusPage
        selectedModule={selectedModule}
        currentMenuName={currentMenuName}
        content={content}
        breadcrumbItems={breadcrumbItems}
        selectedMenuPermissions={selectedMenuPermissions}
      />
    );
  }

  // 송연 생산관리 > 라벨출력 (송연 PD0004)
  if (selectedModule.id === 'pd' && currentPageKey === 'label-print') {
    return (
      <LabelPrintPage
        selectedModule={selectedModule}
        currentMenuName={currentMenuName}
        content={content}
        breadcrumbItems={breadcrumbItems}
        selectedMenuPermissions={selectedMenuPermissions}
      />
    );
  }

  // 송연 물류관리 > 제품재고관리 (송연 LG0001)
  if (selectedModule.id === 'lg' && currentPageKey === 'product-stock') {
    return (
      <ProductStockPage
        selectedModule={selectedModule}
        currentMenuName={currentMenuName}
        content={content}
        breadcrumbItems={breadcrumbItems}
        selectedMenuPermissions={selectedMenuPermissions}
      />
    );
  }

  // 송연 물류관리 > 출하확정 (송연 LG0002)
  if (selectedModule.id === 'lg' && currentPageKey === 'ship-confirm') {
    return (
      <ShipConfirmPage
        selectedModule={selectedModule}
        currentMenuName={currentMenuName}
        content={content}
        breadcrumbItems={breadcrumbItems}
        selectedMenuPermissions={selectedMenuPermissions}
      />
    );
  }

  // 송연 물류관리 > 출하현황 (송연 LG0003)
  if (selectedModule.id === 'lg' && currentPageKey === 'ship-status') {
    return (
      <ShipStatusPage
        selectedModule={selectedModule}
        currentMenuName={currentMenuName}
        content={content}
        breadcrumbItems={breadcrumbItems}
        selectedMenuPermissions={selectedMenuPermissions}
      />
    );
  }

  // 송연 판매관리 > 판매등록 (송연 sales.py · 36-sales.js)
  if (selectedModule.id === 'sl' && currentPageKey === 'sales-register') {
    return (
      <SalesRegisterPage
        selectedModule={selectedModule}
        currentMenuName={currentMenuName}
        content={content}
        breadcrumbItems={breadcrumbItems}
        selectedMenuPermissions={selectedMenuPermissions}
      />
    );
  }

  // 송연 판매관리 > 판매현황 (송연 sales.py · 36-sales.js)
  if (selectedModule.id === 'sl' && currentPageKey === 'sales-status') {
    return (
      <SalesStatusPage
        selectedModule={selectedModule}
        currentMenuName={currentMenuName}
        content={content}
        breadcrumbItems={breadcrumbItems}
        selectedMenuPermissions={selectedMenuPermissions}
      />
    );
  }

  // 송연 판매관리 > 토탈집계 (송연 sales.py · 36-sales.js)
  if (selectedModule.id === 'sl' && currentPageKey === 'sales-total') {
    return (
      <SalesTotalPage
        selectedModule={selectedModule}
        currentMenuName={currentMenuName}
        content={content}
        breadcrumbItems={breadcrumbItems}
        selectedMenuPermissions={selectedMenuPermissions}
      />
    );
  }

  // 송연 구매관리 > 발주관리 (송연 app.py purchase-order · 19-purchase.js · 38-po-status.js)
  if (selectedModule.id === 'pu' && currentPageKey === 'po') {
    return (
      <PurchaseOrderPage
        selectedModule={selectedModule}
        currentMenuName={currentMenuName}
        content={content}
        breadcrumbItems={breadcrumbItems}
        selectedMenuPermissions={selectedMenuPermissions}
      />
    );
  }
  if (selectedModule.id === 'pu' && currentPageKey === 'stock') {
    return (
      <StockAdjustPage
        selectedModule={selectedModule}
        currentMenuName={currentMenuName}
        content={content}
        breadcrumbItems={breadcrumbItems}
        selectedMenuPermissions={selectedMenuPermissions}
      />
    );
  }

  // 송연 상품개발 > 레시피 작성 (송연 recipe.py · 09-recipe.js 4~521)
  if (selectedModule.id === 'rd' && currentPageKey === 'recipe-write') {
    return (
      <RecipeWritePage
        selectedModule={selectedModule}
        currentMenuName={currentMenuName}
        content={content}
        breadcrumbItems={breadcrumbItems}
        selectedMenuPermissions={selectedMenuPermissions}
      />
    );
  }

  // 송연 상품개발 > 레시피 검색·공유 (송연 recipe.py · 09-recipe.js 523~642 · 713~812)
  if (selectedModule.id === 'rd' && currentPageKey === 'recipe-share') {
    return (
      <RecipeSharePage
        selectedModule={selectedModule}
        currentMenuName={currentMenuName}
        content={content}
        breadcrumbItems={breadcrumbItems}
        selectedMenuPermissions={selectedMenuPermissions}
      />
    );
  }

  // 송연 상품개발 > 레시피 공유 로그 (송연 recipe.py · 09-recipe.js 644~711)
  if (selectedModule.id === 'rd' && currentPageKey === 'recipe-log') {
    return (
      <RecipeLogPage
        selectedModule={selectedModule}
        currentMenuName={currentMenuName}
        content={content}
        breadcrumbItems={breadcrumbItems}
        selectedMenuPermissions={selectedMenuPermissions}
      />
    );
  }

  // 송연 인사·회계 > 세금계산서 (송연 app.py /api/tax-invoice/* · 12-tax-invoice.js)
  if (selectedModule.id === 'ha' && currentPageKey === 'tax-invoice') {
    return (
      <TaxInvoicePage
        selectedModule={selectedModule}
        currentMenuName={currentMenuName}
        content={content}
        breadcrumbItems={breadcrumbItems}
        selectedMenuPermissions={selectedMenuPermissions}
      />
    );
  }

  // 송연 인사·회계 > 거래처별관리대장 (송연 accounting.py /api/accounting/client-ledger · 33-acc-cash.js 304~541)
  if (selectedModule.id === 'ha' && currentPageKey === 'acc-receivable') {
    return (
      <AccLedgerPage
        selectedModule={selectedModule}
        currentMenuName={currentMenuName}
        content={content}
        breadcrumbItems={breadcrumbItems}
        selectedMenuPermissions={selectedMenuPermissions}
      />
    );
  }

  // 송연 인사·회계 > 매출·매입관리 (송연 accounting.py /api/accounting/trade-report · 10-accounting.js ACCM)
  if (selectedModule.id === 'ha' && currentPageKey === 'acc-sales') {
    return (
      <AccSalesPage
        selectedModule={selectedModule}
        currentMenuName={currentMenuName}
        content={content}
        breadcrumbItems={breadcrumbItems}
        selectedMenuPermissions={selectedMenuPermissions}
      />
    );
  }

  // 송연 인사·회계 > 입·출금관리 (송연 accounting.py /api/accounting/cash-report · 33-acc-cash.js 174~302)
  if (selectedModule.id === 'ha' && currentPageKey === 'acc-in-report') {
    return (
      <AccIoPage
        selectedModule={selectedModule}
        currentMenuName={currentMenuName}
        content={content}
        breadcrumbItems={breadcrumbItems}
        selectedMenuPermissions={selectedMenuPermissions}
      />
    );
  }

  // 송연 인사·회계 > 회계거래현황 (송연 accounting.py /api/accounting/transactions · 33-acc-cash.js 12~171)
  if (selectedModule.id === 'ha' && currentPageKey === 'acc-tx') {
    return (
      <AccTxPage
        selectedModule={selectedModule}
        currentMenuName={currentMenuName}
        content={content}
        breadcrumbItems={breadcrumbItems}
        selectedMenuPermissions={selectedMenuPermissions}
      />
    );
  }

  // 송연 인사·회계 > 기초회계정보 (송연 accounting.py 계정과목 · 계좌 · 카드 · 31-acc-basic.js)
  if (selectedModule.id === 'ha' && currentPageKey === 'acc-basic') {
    return (
      <AccBasicPage
        selectedModule={selectedModule}
        currentMenuName={currentMenuName}
        content={content}
        breadcrumbItems={breadcrumbItems}
        selectedMenuPermissions={selectedMenuPermissions}
      />
    );
  }

  // 송연 인사·회계 > 인사관리 (송연 app.py /api/employees · /api/hr/leave · 32-hr.js · 35-leave.js · 17-employee.js)
  if (selectedModule.id === 'ha' && currentPageKey === 'hr') {
    return (
      <HrPage
        selectedModule={selectedModule}
        currentMenuName={currentMenuName}
        content={content}
        breadcrumbItems={breadcrumbItems}
        selectedMenuPermissions={selectedMenuPermissions}
      />
    );
  }

  // 송연 품질관리 > 라벨등록 (송연 label.py · 07-label.js · 25~27)
  if (selectedModule.id === 'qm' && currentPageKey === 'label-register') {
    return (
      <LabelRegisterPage
        selectedModule={selectedModule}
        currentMenuName={currentMenuName}
        content={content}
        breadcrumbItems={breadcrumbItems}
        selectedMenuPermissions={selectedMenuPermissions}
      />
    );
  }

  // 송연 품질관리 > 실시간 온도 (송연 temperature.py · 13-delivery-statement.js 209~ · 14-temperature.js)
  if (selectedModule.id === 'qm' && currentPageKey === 'temp-monitor') {
    return (
      <TemperatureMonitorPage
        selectedModule={selectedModule}
        currentMenuName={currentMenuName}
        content={content}
        breadcrumbItems={breadcrumbItems}
        selectedMenuPermissions={selectedMenuPermissions}
      />
    );
  }

  // 송연 구매관리 > 문서함 (송연 28-documents.js · attachments.py)
  if (selectedModule.id === 'pu' && currentPageKey === 'documents') {
    return (
      <DocumentBoxPage
        selectedModule={selectedModule}
        currentMenuName={currentMenuName}
        content={content}
        breadcrumbItems={breadcrumbItems}
        selectedMenuPermissions={selectedMenuPermissions}
      />
    );
  }

  // 송연 구매관리 > 재고현황 (송연 29-stock-status.js)
  if (selectedModule.id === 'pu' && currentPageKey === 'stock-status') {
    return (
      <StockStatusPage
        selectedModule={selectedModule}
        currentMenuName={currentMenuName}
        content={content}
        breadcrumbItems={breadcrumbItems}
        selectedMenuPermissions={selectedMenuPermissions}
      />
    );
  }

  if (selectedModule.id === 'pu' && currentPageKey === 'purchase') {
    return (
      <StockLedgerPage
        selectedModule={selectedModule}
        currentMenuName={currentMenuName}
        content={content}
        breadcrumbItems={breadcrumbItems}
        selectedMenuPermissions={selectedMenuPermissions}
      />
    );
  }

  if (selectedModule.id === 'pu' && currentPageKey === 'mat-sub') {
    return (
      <MaterialSubstitutionPage
        selectedModule={selectedModule}
        currentMenuName={currentMenuName}
        content={content}
        breadcrumbItems={breadcrumbItems}
        selectedMenuPermissions={selectedMenuPermissions}
      />
    );
  }

  if (selectedModule.id === 'pu' && currentPageKey === 'recv') {
    return (
      <ReceivingPage
        selectedModule={selectedModule}
        currentMenuName={currentMenuName}
        content={content}
        breadcrumbItems={breadcrumbItems}
        selectedMenuPermissions={selectedMenuPermissions}
      />
    );
  }

  // 송연 대시보드(시작하기 안내 + 달력·메모)
  if (selectedModule.id === 'dash' && currentPageKey === 'dashboard') {
    return (
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <PageHeader
          breadcrumbItems={[selectedModule.name, currentMenuName]}
          description={content.description}
        />
        <Container maxWidth="xl" sx={{ py: 3 }}>
          <DashboardHomePage />
        </Container>
      </Box>
    );
  }

  const isUnknownPageKey =
    Boolean(currentPageKey) &&
    !Object.prototype.hasOwnProperty.call(pageContentMap, currentPageKey) &&
    currentPageKey !== 'approval' &&
    currentPageKey !== 'empty-access';

  if (isUnknownPageKey) {
    return (
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <PageHeader
          breadcrumbItems={[selectedModule.name, currentMenuName]}
          description={content.description}
        />
        <Container maxWidth="xl" sx={{ py: 4 }}>
          <ComingSoonPage
            title={currentMenuName || selectedModule.name}
            description="현재 준비 중인 메뉴입니다. 빠른 시일 내에 제공될 예정입니다."
          />
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <PageHeader
        breadcrumbItems={[selectedModule.name, currentMenuName]}
        description={content.description}
      />

      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
              gap: 2,
            }}
          >
            {content.cards.map((card) => (
              <Card
                key={card.label}
                sx={{
                  borderRadius: 3,
                  border: '1px solid rgba(148,163,184,0.18)',
                  boxShadow: 'none',
                  bgcolor: 'background.paper',
                }}
              >
                <CardContent sx={{ p: 2.5 }}>
                  <Box
                    sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      {card.label}
                    </Typography>
                    <Typography
                      variant="h5"
                      sx={{ fontWeight: 800, color: 'primary.main' }}
                    >
                      {card.value}
                    </Typography>
                    <Chip
                      label="상세 보기"
                      size="small"
                      sx={{
                        width: 'fit-content',
                        bgcolor: isDark
                          ? 'rgba(96, 165, 250, 0.18)'
                          : '#dbeafe',
                        color: isDark ? '#dbeafe' : '#1d4ed8',
                        fontWeight: 700,
                      }}
                    />
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>

          <Box
            sx={{ display: 'grid', gridTemplateColumns: '1.25fr 1fr', gap: 2 }}
          >
            <Card
              sx={{
                borderRadius: 3,
                border: '1px solid rgba(148,163,184,0.18)',
                boxShadow: 'none',
              }}
            >
              <CardContent sx={{ p: 2.5 }}>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 2,
                  }}
                >
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {currentMenuName} 현황
                  </Typography>
                  <Chip label="최근" size="small" color="primary" />
                </Box>
                <Stack spacing={1.5}>
                  {content.items.map((item) => (
                    <Box
                      key={item.title}
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 0.5,
                        border: '1px solid rgba(148,163,184,0.18)',
                        borderRadius: 2,
                        p: 1.5,
                      }}
                    >
                      <Typography sx={{ fontWeight: 700 }}>
                        {item.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {item.meta}
                      </Typography>
                      {item.status ? (
                        <Chip
                          label={item.status}
                          size="small"
                          sx={{
                            alignSelf: 'flex-start',
                            mt: 0.5,
                            bgcolor: 'rgba(45, 212, 191, 0.14)',
                            color: 'success.main',
                            fontWeight: 700,
                          }}
                        />
                      ) : null}
                    </Box>
                  ))}
                </Stack>
              </CardContent>
            </Card>

            <Card
              sx={{
                borderRadius: 3,
                border: '1px solid rgba(148,163,184,0.18)',
                boxShadow: 'none',
              }}
            >
              <CardContent sx={{ p: 2.5 }}>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 2,
                  }}
                >
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    업무 요약
                  </Typography>
                  <Box
                    component="span"
                    sx={{
                      display: 'flex',
                      fontSize: 18,
                      color: 'primary.main',
                    }}
                  >
                    <TrendIcon />
                  </Box>
                </Box>
                <Stack spacing={1.5}>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      진행 건수
                    </Typography>
                    <Typography sx={{ fontWeight: 700 }}>
                      {content.cards[0]?.value ?? '0'}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      검토 항목
                    </Typography>
                    <Typography sx={{ fontWeight: 700 }}>
                      {content.cards[1]?.value ?? '0'}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      완료율
                    </Typography>
                    <Typography sx={{ fontWeight: 700 }}>
                      {content.cards[3]?.value ?? '0%'}
                    </Typography>
                  </Box>
                  <Divider />
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Chip label="대시보드" size="small" />
                    <Chip label="업무 추적" size="small" />
                    <Chip label="일정" size="small" />
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}

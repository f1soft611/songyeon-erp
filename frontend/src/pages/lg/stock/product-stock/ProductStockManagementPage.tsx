import { useMemo, useState } from 'react';
import { Box, Button, Card, TextField, Typography } from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import SearchIcon from '@mui/icons-material/Search';
import SavingsIcon from '@mui/icons-material/Savings';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { type PermissionActionGroupDefinition } from '../../../../shared/components/PermissionGroup';
import { PageMessageArea } from '../../../../shared/components/PageMessageArea';
import { PageSearchArea } from '../../../../shared/components/PageSearchArea';
import { toPageSearchFields, type PageSearchField, type PageSearchFieldValue } from '../../../../shared/components/page-search/searchFields';
import { ConfirmDialog } from '../../../../shared/components/ConfirmDialog';
import type { MenuPermission, ModuleItem, PageContent } from '../../../dashboard/types/dashboard';
import { ProductStockGrid, createProductStockColumns } from './components/ProductStockGrid';
import { ProductStockLotGrid, createProductStockLotColumns } from './components/ProductStockLotGrid';
import { StockValueDialog } from './components/StockValueDialog';
import { useProductStockManagement } from './hooks/useProductStockManagement';
import type { StockSort } from './types/productStock.types';
import { formatQty, productLabel, totalStock } from './utils/productStock';

type ProductStockManagementPageProps = {
  selectedModule: ModuleItem;
  currentMenuName: string;
  content: PageContent;
  breadcrumbItems?: string[];
  selectedMenuPermissions?: MenuPermission;
};

const searchFieldSx = (theme: { palette: { mode: string } }) => ({
  height: 40,
  '& .MuiOutlinedInput-root': {
    height: '100%',
    borderRadius: '0 8px 8px 0',
    backgroundColor: theme.palette.mode === 'dark' ? 'rgba(15, 23, 42, 0.72)' : 'rgba(255,255,255,0.72)',
  },
});
const textOf = (value: PageSearchFieldValue | undefined) => (typeof value === 'string' ? value : '');
// 상세 조회(⌄) 정렬(칸이 아닌 조건). 비우면 품목명 오름차순
const SORT_FIELD: PageSearchField = {
  field: 'sort',
  label: '정렬',
  type: 'select',
  searchSpan: 1,
  options: [
    { value: 'name-asc', label: '품목명 오름차순' },
    { value: 'name-desc', label: '품목명 내림차순' },
  ],
};
const cardSx = { borderRadius: 1, border: '1px solid rgba(148,163,184,0.18)', boxShadow: 'none', minHeight: 0, display: 'flex', flexDirection: 'column', p: 1.5 };

// 물류관리 > 재고관리 > 제품재고관리 (화면ID STProductStockView, 송연 LG0001)
// 완제품 현재고와 생산예정을 보고, 줄마다 로트(생산일별 생산·출하·잔량)를 펼쳐 본다.
// 송연은 표 안에서 줄 아래로 펼쳤지만, 여기서는 펼친 품목들의 로트를 아래 로트 표에 모아 보여준다.
// 검색줄은 품목코드/명, 거래처 · 정렬은 상세 조회(⌄). 기준일은 엑셀 다운로드에만 써서 표 위 안내 옆에 둔다(2026-10-30).
export function ProductStockManagementPage({
  selectedModule,
  currentMenuName,
  content,
  breadcrumbItems,
  selectedMenuPermissions,
}: ProductStockManagementPageProps) {
  const management = useProductStockManagement();
  const { lots, openLot, closeLot, rows, openRows } = management;
  const columns = useMemo(() => createProductStockColumns({
    lots,
    onOpenLot: (code) => void openLot(code),
    onCloseLot: closeLot,
  }), [lots, openLot, closeLot]);
  const lotColumns = useMemo(() => createProductStockLotColumns(), []);
  const detailFields = useMemo(() => [...toPageSearchFields(columns), SORT_FIELD], [columns]);
  // 상세 조회(⌄): 고치는 중인 값(detailValues)과 [조회]로 적용한 값(appliedDetailValues, 조건 칩)
  const [detailValues, setDetailValues] = useState<Record<string, PageSearchFieldValue>>({});
  const [appliedDetailValues, setAppliedDetailValues] = useState<Record<string, PageSearchFieldValue>>({});

  const pageActionGroups: PermissionActionGroupDefinition[] = [
    {
      key: 'read',
      actions: [
        {
          label: '조회',
          icon: SearchIcon,
          visible: Boolean(selectedMenuPermissions?.read),
          disabled: management.loading,
          onClick: management.reload,
        },
        {
          label: '엑셀 다운로드',
          icon: FileDownloadIcon,
          visible: Boolean(selectedMenuPermissions?.excel || selectedMenuPermissions?.read),
          onClick: () => void management.exportExcel(),
        },
        {
          label: '재고금액 조회',
          icon: SavingsIcon,
          visible: Boolean(selectedMenuPermissions?.read),
          onClick: () => management.setValueOpen(true),
        },
      ],
    },
  ];

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%' }}>
      <PageHeader
        breadcrumbItems={breadcrumbItems && breadcrumbItems.length > 0 ? breadcrumbItems : [selectedModule.name, currentMenuName]}
        description={content.description}
        actionGroups={pageActionGroups}
      />
      <PageSearchArea
        searchField={
          <TextField
            size="small"
            margin="none"
            placeholder="품목코드/품목명 검색"
            value={management.search}
            onChange={(event) => management.setSearch(event.target.value)}
            slotProps={{ htmlInput: { 'aria-label': '품목코드/명 검색' } }}
            sx={(theme) => ({ width: '100%', ...searchFieldSx(theme) })}
          />
        }
        onDefaultSearch={management.reload}
        detailFields={detailFields}
        detailValues={detailValues}
        appliedDetailValues={appliedDetailValues}
        onDetailValuesChange={setDetailValues}
        onDetailSearch={(values) => {
          setAppliedDetailValues(values);
          management.applyDetail(textOf(values.clientName), textOf(values.sort) as StockSort | '');
        }}
        detailLoading={management.loading}
      />
      <PageMessageArea message={management.error} onClose={() => management.setError('')} />
      <Box sx={{ p: { xs: 1.5, sm: 1 }, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Card sx={{ ...cardSx, flex: openRows.length > 0 ? 1.1 : 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1.75, mb: 1 }}>
            {management.loaded && !management.loading && rows.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ mr: 'auto' }}>품목이 없습니다</Typography>
            )}
            <Typography variant="caption" color="text.secondary">기준일은 엑셀 다운로드에 쓰여요(그 날짜 기준 재고)</Typography>
            <TextField
              type="date"
              size="small"
              margin="none"
              value={management.exportDate}
              onChange={(event) => management.setExportDate(event.target.value)}
              title="엑셀 다운로드 기준일 (비워두면 오늘)"
              slotProps={{ htmlInput: { 'aria-label': '기준일' } }}
              sx={{ width: 160, '& .MuiOutlinedInput-root': { height: 32 } }}
            />
            <Button size="small" variant="outlined" disabled={rows.length === 0} onClick={() => void management.toggleAll()}>
              {management.allExpanded ? '📦 전체 로트접기' : '📦 전체 로트보기'}
            </Button>
            <Typography sx={{ fontSize: 13, fontWeight: 700 }}>
              합계현재고:{' '}
              <Box component="span" aria-label="합계현재고" sx={{ color: 'primary.main', fontSize: 16, fontVariantNumeric: 'tabular-nums' }}>
                {formatQty(totalStock(rows))}
              </Box>
            </Typography>
          </Box>
          <ProductStockGrid rows={rows} columns={columns} loading={management.loading} />
        </Card>
        {openRows.length > 0 && (
          <Card sx={{ ...cardSx, flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
              <Typography sx={{ fontSize: 14, fontWeight: 700 }}>로트</Typography>
              <Typography variant="body2" color="text.secondary">
                {management.loadingLots ? '불러오는 중...' : `${openRows.length}개 품목 · 잔량 = 생산량(생산입고 전이면 생산지시량) − 출하량`}
              </Typography>
              {management.noLotRows.length > 0 && (
                <Typography variant="body2" color="text.secondary">
                  · 등록된 로트가 없습니다: {management.noLotRows.map((row) => productLabel(row)).join(', ')}
                </Typography>
              )}
            </Box>
            <ProductStockLotGrid rows={management.lotRows} columns={lotColumns} loading={management.loadingLots} />
          </Card>
        )}
      </Box>
      <StockValueDialog open={management.valueOpen} onClose={() => management.setValueOpen(false)} onAlert={management.setAlertText} />
      <ConfirmDialog
        open={management.alertText != null}
        title="제품재고관리"
        message={management.alertText ?? ''}
        alertOnly
        onCancel={() => management.setAlertText(null)}
        onConfirm={() => management.setAlertText(null)}
      />
    </Box>
  );
}

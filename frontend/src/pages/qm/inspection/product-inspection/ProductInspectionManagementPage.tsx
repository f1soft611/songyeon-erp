import { useMemo, useState } from 'react';
import { Alert, Box, Card, Checkbox, FormControlLabel, MenuItem, Tab, Tabs, TextField, Typography } from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import SearchIcon from '@mui/icons-material/Search';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { type PermissionActionGroupDefinition } from '../../../../shared/components/PermissionGroup';
import { PageSearchArea } from '../../../../shared/components/PageSearchArea';
import { SearchResultMessage } from '../../../../shared/components/SearchResultMessage';
import type { PageSearchField, PageSearchFieldValue } from '../../../../shared/components/page-search/searchFields';
import type { MenuPermission, ModuleItem, PageContent } from '../../../dashboard/types/dashboard';
import { InspectionRecordDialog, type InspectionRecordTarget } from './components/InspectionRecordDialog';
import {
  InspectionLotGrid, InspectionTrendGrid, ProductSpecGrid,
  createInspectionLotColumns, createInspectionTrendColumns, createProductSpecColumns,
} from './components/ProductInspectionGrids';
import { ProductSpecDialog, type ProductSpecTarget } from './components/ProductSpecDialog';
import { useInspectionLots } from './hooks/useInspectionLots';
import { useProductSpecs } from './hooks/useProductSpecs';
import {
  DATE_BY_OPTIONS, INSPECTION_TABS, LOT_PLANNED_HINT, RECORD_FILTER_OPTIONS, SPEC_ONLY_OPTIONS, lotSummaryText, specSummaryText,
  type InspectionTab, type InspectionTrendRow,
} from './utils/productInspection';

type ProductInspectionManagementPageProps = {
  selectedModule: ModuleItem;
  currentMenuName: string;
  content: PageContent;
  breadcrumbItems?: string[];
  selectedMenuPermissions?: MenuPermission;
};

const cardSx = { borderRadius: 1, border: '1px solid rgba(148,163,184,0.18)', boxShadow: 'none', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', p: 1.5 };
const searchFieldSx = (theme: { palette: { mode: string } }) => ({
  width: '100%',
  height: 40,
  '& .MuiOutlinedInput-root': {
    height: '100%',
    borderRadius: '0 8px 8px 0',
    backgroundColor: theme.palette.mode === 'dark' ? 'rgba(15, 23, 42, 0.72)' : 'rgba(255,255,255,0.72)',
  },
});
const sideFieldSx = (theme: { palette: { mode: string } }) => ({
  '& .MuiOutlinedInput-root': {
    height: 40,
    borderRadius: '8px',
    backgroundColor: theme.palette.mode === 'dark' ? 'rgba(15, 23, 42, 0.72)' : 'rgba(255,255,255,0.72)',
  },
});

// 상세 조회(⌄). 처음엔 비어 있다
const SPEC_DETAIL_FIELDS: PageSearchField[] = [
  { field: 'only', label: '보기', type: 'select', searchSpan: 1, options: SPEC_ONLY_OPTIONS },
];
const TREND_DETAIL_FIELDS: PageSearchField[] = [
  { field: 'measuredOn', label: '측정일', type: 'date', searchSpan: 2 },
];

// 염도·BRIX 현황은 서버 연결 전이라 줄이 없다
const NO_TRENDS: InspectionTrendRow[] = [];

// 품질관리 > 품질검사 > 제품검사 (화면ID QIProductInspectionView, 송연 #screen-qdoc-spec · 41-qdoc-spec.js · 42-qdoc-pspec.js)
// 생산이 끝난 로트를 고르면 제품정보가 저절로 채워지고, 측정값만 넣으면 제품규격성적서로 발행된다.
// 탭: 검사 · 제품별 기준 · 염도·BRIX 현황. 원본의 식품유형 탭은 공통코드 FOOD_TYPE 으로 옮겨 뺐다.
// 2026-11-06 화면만 옮겼다. 제품별 기준 탭(20261106_002) · 검사 탭(20261106_003)은 조회까지 붙였다. 염도·BRIX 현황 조회 · 저장 · 결재 · 인쇄는 서버 연결 때 붙인다
export function ProductInspectionManagementPage({
  selectedModule,
  currentMenuName,
  content,
  breadcrumbItems,
  selectedMenuPermissions,
}: ProductInspectionManagementPageProps) {
  const [tab, setTab] = useState<InspectionTab>('check');
  // 검사 탭 조건(원본 qs-date-by · qs-start · qs-end · qs-filter · qs-planned)과 로트 조회
  const lots = useInspectionLots(tab === 'check');
  const [picked, setPicked] = useState<(string | number)[]>([]);
  // 제품별 기준 탭(조회 붙음) · 염도·BRIX 현황 검색줄과 상세 조회
  const specs = useProductSpecs(tab === 'spec');
  const [trendQ, setTrendQ] = useState('');
  const [trendDetail, setTrendDetail] = useState<Record<string, PageSearchFieldValue>>({});
  const [recordTarget, setRecordTarget] = useState<InspectionRecordTarget | null>(null);
  const [specTarget, setSpecTarget] = useState<ProductSpecTarget | null>(null);

  const lotColumns = useMemo(() => createInspectionLotColumns({
    onOpen: (row) => setRecordTarget({
      lotNo: row.lotNo, productName: row.productName, netWeight: row.netWeight, madeOn: row.madeOn,
      qty: row.qty, shippedOn: row.shippedOn, shipState: row.shipState, shelfLife: row.shelfLife,
    }),
    onPrint: () => undefined,
  }), []);
  const specColumns = useMemo(() => createProductSpecColumns({
    onOpen: (row) => setSpecTarget({ code: row.code, name: row.name, foodTypeName: row.foodTypeName }),
  }), []);
  const trendColumns = useMemo(() => createInspectionTrendColumns(), []);

  // 염도·BRIX 현황은 서버 연결 전이라 조회가 아무것도 하지 않는다
  const search = () => undefined;
  const searchTab = tab === 'check' ? lots.search : tab === 'spec' ? specs.search : search;
  const tabLoading = (tab === 'check' && lots.loading) || (tab === 'spec' && specs.loading);
  const canRead = Boolean(selectedMenuPermissions?.read);
  const pageActionGroups: PermissionActionGroupDefinition[] = [
    {
      key: 'read',
      actions: [
        { label: '조회', icon: SearchIcon, visible: canRead, disabled: tabLoading, onClick: searchTab },
        // 한 번 출고에 로트 여러 개가 나간다. 고른 성적서를 한 번에 뽑는다(검사 탭)
        { label: '선택한 것 인쇄', icon: PrintIcon, visible: canRead && tab === 'check', disabled: picked.length === 0, onClick: () => undefined },
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
      <Box sx={{ px: { xs: 1.5, sm: 2 }, borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tab} onChange={(_event, value: InspectionTab) => setTab(value)} aria-label="제품검사 탭" variant="scrollable" allowScrollButtonsMobile>
          {INSPECTION_TABS.map((item) => <Tab key={item.value} value={item.value} label={item.label} />)}
        </Tabs>
      </Box>

      {tab === 'check' && (
        <PageSearchArea
          // 검색줄 자리는 상태 고르기(원본에 글자 검색이 없다). 날짜 기준 · 기간 · 생산예정도는 옆에 둔다(재고현황과 같은 모양)
          searchField={
            <TextField
              select
              size="small"
              margin="none"
              value={lots.filter}
              onChange={(event) => lots.setFilter(event.target.value)}
              slotProps={{ select: { displayEmpty: true, SelectDisplayProps: { 'aria-label': '상태' } as object } }}
              sx={searchFieldSx}
            >
              {RECORD_FILTER_OPTIONS.map((option) => <MenuItem key={option.value || 'all'} value={option.value}>{option.label}</MenuItem>)}
            </TextField>
          }
          onDefaultSearch={lots.search}
        >
          <TextField
            select
            size="small"
            margin="none"
            value={lots.dateBy}
            onChange={(event) => lots.setDateBy(event.target.value)}
            slotProps={{ select: { SelectDisplayProps: { 'aria-label': '날짜 기준' } as object } }}
            sx={(theme) => ({ width: 110, ...sideFieldSx(theme) })}
          >
            {DATE_BY_OPTIONS.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
          </TextField>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 0.75 }}>
            <TextField type="date" size="small" margin="none" value={lots.start} onChange={(event) => lots.setStart(event.target.value)}
              slotProps={{ htmlInput: { 'aria-label': '시작일', max: '9999-12-31' } }} sx={(theme) => ({ width: 160, ...sideFieldSx(theme) })} />
            <Typography color="text.secondary">~</Typography>
            <TextField type="date" size="small" margin="none" value={lots.end} onChange={(event) => lots.setEnd(event.target.value)}
              slotProps={{ htmlInput: { 'aria-label': '종료일', max: '9999-12-31' } }} sx={(theme) => ({ width: 160, ...sideFieldSx(theme) })} />
          </Box>
          {/* 만든 날 바로 검사하고 실생산량은 저녁에 넣는 일이 있다 */}
          <FormControlLabel
            control={<Checkbox size="small" checked={lots.planned} onChange={(event) => lots.setPlanned(event.target.checked)} />}
            label="생산예정도 보기"
            sx={{ mr: 0, '& .MuiFormControlLabel-label': { fontSize: 13, whiteSpace: 'nowrap' } }}
          />
        </PageSearchArea>
      )}
      {tab === 'spec' && (
        <PageSearchArea
          searchField={
            <TextField size="small" margin="none" placeholder="제품명 또는 제품코드 검색" value={specs.q} onChange={(event) => specs.setQ(event.target.value)}
              slotProps={{ htmlInput: { 'aria-label': '제품명 또는 제품코드 검색' } }} sx={searchFieldSx} />
          }
          onDefaultSearch={specs.search}
          detailFields={SPEC_DETAIL_FIELDS}
          detailValues={specs.detailValues}
          appliedDetailValues={specs.detail}
          onDetailValuesChange={specs.setDetailValues}
          onDetailSearch={specs.applyDetail}
          detailLoading={specs.loading}
        />
      )}
      {tab === 'trend' && (
        <PageSearchArea
          searchField={
            <TextField size="small" margin="none" placeholder="제품명 또는 로트번호 검색" value={trendQ} onChange={(event) => setTrendQ(event.target.value)}
              slotProps={{ htmlInput: { 'aria-label': '제품명 또는 로트번호 검색' } }} sx={searchFieldSx} />
          }
          onDefaultSearch={search}
          detailFields={TREND_DETAIL_FIELDS}
          detailValues={trendDetail}
          appliedDetailValues={trendDetail}
          onDetailValuesChange={setTrendDetail}
          onDetailSearch={search}
        />
      )}

      {tab === 'check' && lots.loaded && !lots.loading && !lots.error && <SearchResultMessage resultCount={lots.rows.length} />}
      {tab === 'spec' && specs.loaded && !specs.loading && !specs.error && <SearchResultMessage resultCount={specs.rows.length} />}
      <Box sx={{ p: 1, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Card sx={cardSx}>
          {tab === 'check' && lots.error && <Alert severity="error" sx={{ mb: 1, py: 0 }}>{lots.error}</Alert>}
          {tab === 'check' && lots.loaded && !lots.loading && !lots.error && (
            <Box sx={{ mb: 1, display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 1 }}>
              <Typography variant="body2" color="warning.main">{lots.rows.length === 0 && !lots.planned ? LOT_PLANNED_HINT : ''}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto', textAlign: 'right' }}>{lotSummaryText(lots.lots)}</Typography>
            </Box>
          )}
          {tab === 'spec' && specs.error && <Alert severity="error" sx={{ mb: 1, py: 0 }}>{specs.error}</Alert>}
          {/* 유형이 없으면 기준을 넣을 수 없다. 가장 큰 걸림돌이라 숫자로 밝혀 둔다(원본 ps-summary) */}
          {tab === 'spec' && specs.stats && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1, textAlign: 'right' }}>{specSummaryText(specs.stats)}</Typography>
          )}
          {/* 탭마다 다른 표(key 다름): 같은 자리에서 바꿔 끼우면 칸 순서가 섞인다 */}
          {tab === 'check' && <InspectionLotGrid key="lot" rows={lots.rows} columns={lotColumns} loading={lots.loading} onSelectionChange={setPicked} />}
          {tab === 'spec' && <ProductSpecGrid key="spec" rows={specs.rows} columns={specColumns} loading={specs.loading} />}
          {tab === 'trend' && <InspectionTrendGrid key="trend" rows={NO_TRENDS} columns={trendColumns} loading={false} />}
        </Card>
      </Box>

      <InspectionRecordDialog target={recordTarget} onClose={() => setRecordTarget(null)} />
      <ProductSpecDialog target={specTarget} onClose={() => setSpecTarget(null)} />
    </Box>
  );
}

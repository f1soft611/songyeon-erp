import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Autocomplete,
  Box,
  Card,
  IconButton,
  MenuItem,
  TextField,
  Tooltip,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import SearchIcon from '@mui/icons-material/Search';
import { PageHeader } from '../../../shared/components/PageHeader';
import { type PermissionActionGroupDefinition } from '../../../shared/components/PermissionGroup';
import { PageMessageArea } from '../../../shared/components/PageMessageArea';
import { PageSearchArea } from '../../../shared/components/PageSearchArea';
import {
  F1Grid,
  type F1GridColumn,
  type F1GridRef,
} from '../../../shared/components/f1-grid';
import { downloadExcel, todayDash } from '../../../shared/utils/excelFile';
import { resetGridStorageIfColumnsChanged } from '../../../shared/utils/gridStorage';
import type { MenuPermission, ModuleItem, PageContent } from '../../dashboard/types/dashboard';
import type { BoxTypeRow } from '../../co/master/box-type/types/boxType.types';
import { fetchClientNames } from '../../co/master/item-master/services/itemMaster.service';
import { fetchBoxTypeRows } from '../../co/master/box-type/services/boxType.service';
import { formatPrice } from '../../../shared/utils/numberFormat';
import {
  fetchPricingDetail,
  fetchPricingRows,
  savePricing,
  type PricingBomLine,
  type PricingDetail,
  type PricingRow,
} from './services/pricing.service';
import {
  DIFF_OPTIONS,
  diffOf,
  filterPricingRows,
  PRICING_EXCEL_COLUMNS,
  type DiffOption,
} from './utils/pricing';
import { PricingDetailDialog } from './components/PricingDetailDialog';

const errorText = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;
const SEARCH_DELAY_MS = 250;

type PricingPageProps = {
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
    borderRadius: 2,
    backgroundColor: theme.palette.mode === 'dark' ? 'rgba(15, 23, 42, 0.72)' : 'rgba(255,255,255,0.72)',
  },
});

// 영업관리 > 단가관리 (송연 SA0002)
// 제품마다 원재료비 + 인건비·포장비·물류비·마진 등 원가 항목으로 제품단가를 계산하고, 실제 판매단가(현재단가)와의 차액을 본다.
// 차액금 뒤 [상세] 칸의 단추를 누르면 단가상세 창에서 원가 항목을 고친다(2026-10-27, 예전에는 줄을 누르면 열렸다).
const STORAGE_KEY = 'sa-pricing-grid';
// 저장된 칸 순서에 [상세] 칸이 없으면 맨 끝에 붙으므로 처음 순서로 되돌린다
const GRID_FIELDS = [
  'id', 'productCode', 'productName', 'spec', 'materialCost', 'laborCost', 'packagingCost', 'logisticsCost',
  'margin', 'totalPrice', 'currentPrice', 'clientName', 'diff', 'detailAction',
];

export function PricingPage({
  selectedModule,
  currentMenuName,
  content,
  breadcrumbItems,
  selectedMenuPermissions,
}: PricingPageProps) {
  const gridRef = useRef<F1GridRef<PricingRow>>(null);
  useState(() => resetGridStorageIfColumnsChanged(STORAGE_KEY, GRID_FIELDS));
  const requestIdRef = useRef(0);
  const detailRequestRef = useRef(0);
  const [rows, setRows] = useState<PricingRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [client, setClient] = useState('');
  const [diffOption, setDiffOption] = useState<DiffOption>('');
  const [clients, setClients] = useState<string[]>([]);
  const [packagingTypes, setPackagingTypes] = useState<BoxTypeRow[]>([]);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [detail, setDetail] = useState<{ detail: PricingDetail; bom: PricingBomLine[] } | null>(null);
  const [error, setError] = useState('');
  const searchRef = useRef(search);
  searchRef.current = search;

  // 송연 loadTable: 검색어로 서버에서 다시 받는다(거래처·차액금은 받은 목록 안에서 거른다). 마지막 요청의 응답만 쓴다
  const loadRows = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    try {
      const result = await fetchPricingRows(searchRef.current);
      if (requestId === requestIdRef.current) setRows(result);
    } catch (requestError) {
      if (requestId === requestIdRef.current) setError(errorText(requestError, '단가 목록을 불러오지 못했습니다.'));
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void loadRows(), search ? SEARCH_DELAY_MS : 0);
    return () => clearTimeout(timer);
  }, [search, loadRows]);

  // 송연 loadProductTypeDropdown·거래처 목록: 화면을 열 때 한 번
  useEffect(() => {
    fetchClientNames().then(setClients).catch(() => undefined);
    fetchBoxTypeRows().then(setPackagingTypes).catch(() => undefined);
  }, []);

  const visibleRows = useMemo(() => filterPricingRows(rows, client, diffOption), [rows, client, diffOption]);

  // 송연 selectProduct: [상세] 단추를 누르면 상세를 받아 창을 연다(못 받으면 창을 열지 않는다)
  const loadDetail = useCallback(async (code: string) => {
    const requestId = ++detailRequestRef.current;
    try {
      const result = await fetchPricingDetail(code);
      if (requestId === detailRequestRef.current) setDetail(result);
    } catch (requestError) {
      if (requestId === detailRequestRef.current) setError(errorText(requestError, '단가상세를 불러오지 못했습니다.'));
    }
  }, []);

  const openDetail = (code: string) => {
    setSelectedCode(code);
    setDetail(null);
    void loadDetail(code);
  };

  const closeDetail = () => {
    detailRequestRef.current++;
    setSelectedCode(null);
    setDetail(null);
  };

  // 송연 reg-save: 저장 → 목록 다시 조회 → 상세도 최신 값으로
  const save = async (body: Record<string, unknown>) => {
    if (!selectedCode) return;
    await savePricing(selectedCode, body);
    void loadRows();
    await loadDetail(selectedCode);
  };

  // 송연 export-excel: 지금 표에 보이는 줄(거래처·차액금 거른 뒤) 그대로
  const exportExcel = async () => {
    try {
      await downloadExcel(visibleRows, PRICING_EXCEL_COLUMNS, `단가관리_${todayDash()}.xlsx`, '단가관리');
    } catch (requestError) {
      setError(errorText(requestError, '엑셀을 만들지 못했어요'));
    }
  };

  const columns = useMemo<F1GridColumn<PricingRow>[]>(() => {
    const money = (field: keyof PricingRow, headerName: string, extra: Partial<F1GridColumn<PricingRow>> = {}): F1GridColumn<PricingRow> => ({
      field,
      headerName,
      width: 100,
      headerAlign: 'center',
      align: 'right',
      getValue: (row) => row[field],
      renderCell: ({ row }) => formatPrice(row[field] as number | null),
      ...extra,
    });
    return [
      { field: 'id', type: 'rownumber', width: 60, headerName: '순번', headerAlign: 'center', align: 'center', pinned: 'left' },
      { field: 'productCode', headerName: '제품코드', width: 90, headerAlign: 'center', align: 'center' },
      { field: 'productName', headerName: '제품명', flex: 1.4, width: 160, headerAlign: 'center', align: 'left' },
      { field: 'spec', headerName: '규격/단위', width: 110, headerAlign: 'center', align: 'left', getValue: (row) => row.spec || '' },
      money('materialCost', '원재료비'),
      money('laborCost', '인건비'),
      money('packagingCost', '포장비'),
      money('logisticsCost', '물류비'),
      money('margin', '마진'),
      money('totalPrice', '제품단가', {
        getCellStyle: () => ({ fontWeight: 700 }),
      }),
      money('currentPrice', '현재단가'),
      { field: 'clientName', headerName: '거래처', flex: 1, width: 130, headerAlign: 'center', align: 'left', getValue: (row) => row.clientName || '' },
      {
        field: 'diff',
        headerName: '차액금',
        width: 110,
        headerAlign: 'center',
        align: 'right',
        getValue: (row) => diffOf(row) ?? '',
        // 차액금 = 현재단가 − 제품단가: 초과는 파랑, 미달은 빨강
        getCellStyle: ({ row }) => {
          const diff = diffOf(row);
          if (diff == null || diff === 0) return undefined;
          return { color: diff < 0 ? '#dc2626' : '#2563eb', fontWeight: 700 };
        },
        renderCell: ({ row }) => {
          const diff = diffOf(row);
          if (diff == null) return '';
          return diff > 0 ? `+${formatPrice(diff)}` : formatPrice(diff);
        },
      },
      {
        field: 'detailAction',
        headerName: '상세',
        width: 60,
        headerAlign: 'center',
        align: 'center',
        editable: false,
        getValue: () => '',
        renderCell: ({ row }) => (
          <Box
            onClick={(event) => event.stopPropagation()}
            onDoubleClick={(event) => event.stopPropagation()}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <Tooltip title="단가상세">
              <IconButton size="small" aria-label={`${row.productName} 단가상세`} onClick={() => openDetail(row.id)}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        ),
      },
    ];
    // 단추는 누를 때의 openDetail 을 쓴다(상태 setter · 요청 번호 ref 만 쓰므로 처음 것으로 충분)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pageActionGroups: PermissionActionGroupDefinition[] = [
    {
      key: 'read',
      actions: [
        {
          label: '조회',
          icon: SearchIcon,
          visible: Boolean(selectedMenuPermissions?.read),
          disabled: loading,
          onClick: () => void loadRows(),
        },
        {
          label: '엑셀 다운로드',
          icon: FileDownloadIcon,
          visible: Boolean(selectedMenuPermissions?.excel || selectedMenuPermissions?.read),
          onClick: () => void exportExcel(),
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
            placeholder="제품명 · 제품코드 · 거래처 검색"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            slotProps={{ htmlInput: { 'aria-label': '제품 검색' } }}
            sx={(theme) => ({
              width: '100%',
              ...searchFieldSx(theme),
              '& .MuiOutlinedInput-root': { ...searchFieldSx(theme)['& .MuiOutlinedInput-root'], borderRadius: '0 8px 8px 0' },
            })}
          />
        }
        onDefaultSearch={() => void loadRows()}
      >
        <Autocomplete
          freeSolo
          options={clients}
          inputValue={client}
          onInputChange={(_, value) => setClient(value)}
          // 송연처럼 거래처·차액금은 검색줄 오른쪽 끝에 붙인다
          sx={{ flex: '0 1 220px', minWidth: { xs: '100%', sm: 200 }, ml: { sm: 'auto' } }}
          renderInput={(params) => (
            <TextField
              {...params}
              size="small"
              margin="none"
              placeholder="거래처 검색/선택"
              slotProps={{ ...params.slotProps, htmlInput: { ...params.slotProps.htmlInput, 'aria-label': '거래처 검색' } }}
              sx={searchFieldSx}
            />
          )}
        />
        <TextField
          select
          size="small"
          margin="none"
          value={diffOption}
          onChange={(event) => setDiffOption(event.target.value as DiffOption)}
          slotProps={{ select: { displayEmpty: true }, htmlInput: { 'aria-label': '차액금' } }}
          sx={(theme) => ({ flex: '0 1 170px', minWidth: { xs: '100%', sm: 160 }, ...searchFieldSx(theme) })}
        >
          {DIFF_OPTIONS.map((option) => (
            <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
          ))}
        </TextField>
      </PageSearchArea>
      <PageMessageArea message={error} onClose={() => setError('')} />
      <Box sx={{ p: { xs: 1.5, sm: 1 }, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Card sx={{ borderRadius: 1, border: '1px solid rgba(148,163,184,0.18)', boxShadow: 'none', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', p: 1.5 }}>
          <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
            <F1Grid
              ref={gridRef}
              rows={visibleRows}
              columns={columns}
              rowKey="id"
              storageKey={STORAGE_KEY}
              ariaLabel="F1-GRID 단가 목록"
              height="100%"
              maxHeight="100%"
              rowHeight={34}
              minRowHeight={34}
              maxRowHeight={320}
              showCheckbox={false}
              loading={loading}
              allowAddRowInContextMenu={false}
              allowDuplicateRowInContextMenu={false}
              allowDeleteRowInContextMenu={false}
            />
          </Box>
        </Card>
      </Box>
      {detail && selectedCode && (
        <PricingDetailDialog detail={detail.detail} bom={detail.bom} packagingTypes={packagingTypes} onSave={save} onClose={closeDetail} />
      )}
    </Box>
  );
}

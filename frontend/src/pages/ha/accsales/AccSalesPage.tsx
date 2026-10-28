import { useState, type ReactNode } from 'react';
import { Box, Card, Tab, Tabs, Typography } from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import SearchIcon from '@mui/icons-material/Search';
import { PageHeader } from '../../../shared/components/PageHeader';
import { type PermissionActionGroupDefinition } from '../../../shared/components/PermissionGroup';
import { F1Grid, type F1GridColumn } from '../../../shared/components/f1-grid';
import { useAsk } from '../../../shared/components/AskDialog/useAsk';
import { downloadExcel, type ExcelColumn } from '../../../shared/utils/excelFile';
import type { MenuPermission, ModuleItem, PageContent } from '../../dashboard/types/dashboard';
import { TradeSearchDialog } from './components/TradeSearchDialog';
import { fetchTradeOptions, fetchTradeReport } from './services/accSales.service';
import {
  ACC_SALES, UNIT_LABEL, conditionText, defaultPeriod, excelOf, moneyText, pctText, qtyText, searchError, signedMoney, sumMoney,
  type TradeCompare, type TradeKind, type TradePeriod, type TradeReport, type TradeRow, type TradeSearch, type TradeUnit, type TradeView,
} from './utils/accSales';

type AccSalesPageProps = {
  selectedModule: ModuleItem;
  currentMenuName: string;
  content: PageContent;
  breadcrumbItems?: string[];
  selectedMenuPermissions?: MenuPermission;
};
type Keyed<T> = T & { key: string };

const MONO = { fontFamily: 'ui-monospace, Consolas, monospace', fontSize: 12 } as const;
const TEAL = '#0f766e';
const RED = '#dc2626';
const ROW_HEIGHT = 36;
const gridProps = {
  height: '100%', maxHeight: '100%', rowHeight: ROW_HEIGHT, minRowHeight: ROW_HEIGHT, maxRowHeight: 320, columnLine: true, showCheckbox: false,
  resizableRows: false, allowAddRowInContextMenu: false, allowDeleteRowInContextMenu: false, allowDuplicateRowInContextMenu: false,
} as const;
// 줄 수만큼(많으면 maxRows 에서 그리드 안 스크롤) — 합계 줄이 마지막 줄 바로 아래 붙는다. 비어도 머리줄 있는 그리드를 두고 빈 표시가 다 들어가는 높이를 준다
const gridHeight = (rows: number, maxRows: number) => (rows === 0 ? Math.max(ROW_HEIGHT * 4, 120) : Math.min(maxRows, rows) * ROW_HEIGHT) + 36;
const cardSx = { borderRadius: 1, border: '1px solid rgba(148,163,184,0.18)', boxShadow: 'none', p: 1.5 } as const;
const emptySearch = (): TradeSearch => ({ start: '', end: '', view: 'summary', unit: 'month', clients: [], items: [] });
const mono = (text: string, sx: object = {}) => <Box component="span" sx={{ ...MONO, ...sx }}>{text}</Box>;
const colorOf = (d: number) => (d >= 0 ? TEAL : RED);

// 인사·회계 > 매출·매입관리 (송연 #screen-acc-sales · 10-accounting.js ACCM · accounting.py /api/accounting/trade-report)
// 매출은 확정된 출하 × 판매단가, 매입은 입고 기록이다. 여기서는 고치지 않고 기간 · 거래처 · 품목으로 묻고 집계 / 내역 / 전년동기간비교로 본다.
export function AccSalesPage({ selectedModule, currentMenuName, content, breadcrumbItems }: AccSalesPageProps) {
  const ask = useAsk('매출·매입관리');
  const [tab, setTab] = useState<TradeKind>('매출');
  const [search, setSearch] = useState<TradeSearch>(emptySearch);
  const [open, setOpen] = useState(false);
  // 고를 거리는 갈래마다 다르다(매출은 제품, 매입은 원재료). 한 번만 받아 담아둔다
  const [options, setOptions] = useState<Partial<Record<TradeKind, { clients: string[]; items: string[] }>>>({});
  const [data, setData] = useState<TradeReport | null>(null);
  const cfg = ACC_SALES[tab];
  const isSale = tab === '매출';

  const openSearch = async () => {
    if (!search.start) setSearch((s) => ({ ...s, ...defaultPeriod() }));
    setOpen(true);
    if (!options[tab]) {
      const kind = tab;
      const loaded = await fetchTradeOptions(kind).catch(() => ({ clients: [], items: [] }));
      setOptions((o) => ({ ...o, [kind]: loaded }));
    }
  };

  // 창 안의 조회. 막히면 창 안에 빨간 글씨로 남긴다(송연 accm-search-msg)
  const runSearch = async () => {
    const error = searchError(search);
    if (error) throw new Error(error);
    setData(await fetchTradeReport(tab, search));
    setOpen(false);
  };

  // 매출과 매입은 자료가 다르다. 탭을 바꾸면 앞의 결과를 지운다(남겨두면 매입 탭에서 매출 숫자를 보고 있게 된다).
  // 담은 거래처 · 품목도 갈래마다 뜻이 달라 비운다. 기간 · 보기 · 단위는 그대로 둔다
  const switchTab = (kind: TradeKind) => {
    setTab(kind);
    setData(null);
    setSearch((s) => ({ ...s, clients: [], items: [] }));
  };

  const exportExcel = async () => {
    if (!data) {
      await ask.alert('먼저 조회해주세요');
      return;
    }
    const sheet = excelOf(data);
    if (sheet.rows.length === 0) {
      await ask.alert('내려받을 내역이 없어요');
      return;
    }
    await downloadExcel(sheet.rows as never[], sheet.columns as ExcelColumn<never>[], sheet.fileName);
  };

  const pageActionGroups: PermissionActionGroupDefinition[] = [
    {
      key: 'acc-sales',
      actions: [
        { label: '조회', icon: SearchIcon, visible: true, onClick: () => void openSearch() },
        { label: '엑셀 다운로드', icon: FileDownloadIcon, visible: true, onClick: () => void exportExcel() },
      ],
    },
  ];

  // 조회하기 전에는 집계(월) 칸으로 빈 그리드를 둔다
  const view: TradeView = data?.view ?? 'summary';
  const unit: TradeUnit = data?.unit ?? 'month';
  const unitLabel = UNIT_LABEL[unit];
  const numCol = { headerAlign: 'center', align: 'right' } as const;
  const vatCols = <T extends { supplyAmount: number | null; vatAmount: number | null }>(money: (v: number | null) => string): F1GridColumn<Keyed<T>>[] => (isSale ? [] : [
    { field: 'supplyAmount', headerName: '공급가액', width: 130, ...numCol, renderCell: ({ row }) => mono(money(row.supplyAmount)) },
    { field: 'vatAmount', headerName: '부가세', width: 120, ...numCol, renderCell: ({ row }) => mono(money(row.vatAmount)) },
  ] as F1GridColumn<Keyed<T>>[]);

  const summaryColumns: F1GridColumn<Keyed<TradePeriod>>[] = [
    { field: 'key', type: 'rownumber', width: 60, headerName: '순번', headerAlign: 'center', align: 'center', pinned: 'left' },
    {
      field: 'period', headerName: unitLabel, width: 200, headerAlign: 'center', align: 'left',
      renderCell: ({ row }) => (
        <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
          {mono(row.period, { fontWeight: 700 })}
          {row.unpriced > 0 && <UnpricedTag count={row.unpriced} />}
        </Box>
      ),
    },
    { field: 'count', headerName: '건수', width: 80, ...numCol },
    { field: 'qty', headerName: '수량', width: 110, ...numCol, renderCell: ({ row }) => mono(qtyText(row.qty)) },
    ...vatCols<TradePeriod>(sumMoney),
    { field: 'amount', headerName: isSale ? '매출액' : '합계금액', width: 150, ...numCol, renderCell: ({ row }) => mono(sumMoney(row.amount), { fontWeight: 700 }) },
  ];

  const detailColumns: F1GridColumn<Keyed<TradeRow>>[] = [
    { field: 'key', type: 'rownumber', width: 60, headerName: '순번', headerAlign: 'center', align: 'center', pinned: 'left' },
    { field: 'date', headerName: cfg.dateLabel, width: 110, headerAlign: 'center', align: 'center', renderCell: ({ row }) => mono(row.date || '', { fontSize: 11.5 }) },
    { field: 'clientName', headerName: '거래처', width: 170, headerAlign: 'center', align: 'left', renderCell: ({ row }) => row.clientName || '' },
    { field: 'itemName', headerName: cfg.itemLabel, width: 220, headerAlign: 'center', align: 'left', renderCell: ({ row }) => row.itemName || '' },
    { field: 'qty', headerName: '수량', width: 100, ...numCol, renderCell: ({ row }) => mono(qtyText(row.qty)) },
    { field: 'unitPrice', headerName: isSale ? '판매단가' : '단가', width: 110, ...numCol, renderCell: ({ row }) => mono(moneyText(row.unitPrice)) },
    ...vatCols<TradeRow>(moneyText),
    { field: 'amount', headerName: isSale ? '매출액' : '합계', width: 140, ...numCol, renderCell: ({ row }) => mono(moneyText(row.amount), { fontWeight: 700 }) },
  ];

  const yoyColumns: F1GridColumn<Keyed<TradeCompare>>[] = [
    { field: 'key', type: 'rownumber', width: 60, headerName: '순번', headerAlign: 'center', align: 'center', pinned: 'left' },
    { field: 'period', headerName: unitLabel, width: 130, headerAlign: 'center', align: 'left', renderCell: ({ row }) => mono(row.period, { fontWeight: 700 }) },
    { field: 'cur', headerName: '올해', width: 150, ...numCol, renderCell: ({ row }) => mono(sumMoney(row.cur)) },
    { field: 'prev', headerName: '작년', width: 150, ...numCol, renderCell: ({ row }) => mono(sumMoney(row.prev), { color: 'text.secondary' }) },
    { field: 'diff', headerName: '증감', width: 150, ...numCol, renderCell: ({ row }) => mono(signedMoney(row.diff), { fontWeight: 700, color: colorOf(row.diff) }) },
    {
      field: 'pct', headerName: '증감률', width: 100, ...numCol,
      renderCell: ({ row }) => (row.pct == null
        ? <Box component="span" sx={{ fontSize: 12, color: 'text.secondary' }}>{pctText(row.pct, row.cur)}</Box>
        : mono(pctText(row.pct, row.cur), { fontWeight: 700, color: colorOf(row.pct) })),
    },
  ];

  const keyed = <T,>(list: T[] | undefined): Keyed<T>[] => (list || []).map((x, i) => ({ ...x, key: String(i) }));
  const kindKey = isSale ? 'sale' : 'purchase';
  const grid = (): { node: ReactNode; count: number; foot: ReactNode } => {
    if (view === 'detail') {
      const rows = keyed(data?.rows);
      return { count: rows.length, foot: null, node: <F1Grid key={`detail-${kindKey}`} rows={rows} columns={detailColumns} rowKey="key" storageKey={`ha-acc-sales-${kindKey}-detail-grid`} ariaLabel={`F1-GRID ${tab} 내역`} {...gridProps} /> };
    }
    if (view === 'yoy') {
      const rows = keyed(data?.compare);
      const d = data?.totalDiff ?? 0;
      return {
        count: rows.length,
        node: <F1Grid key={`yoy-${kindKey}`} rows={rows} columns={yoyColumns} rowKey="key" storageKey={`ha-acc-sales-${kindKey}-yoy-grid`} ariaLabel={`F1-GRID ${tab} 전년동기간비교`} {...gridProps} />,
        foot: data && rows.length > 0 && (
          <Foot items={[
            ['올해', mono(sumMoney(data.totalAmount), { fontWeight: 700, fontSize: 13.5 })],
            ['작년', mono(sumMoney(data.totalPrev), { fontWeight: 700, color: 'text.secondary' })],
            ['증감', mono(signedMoney(d), { fontWeight: 700, color: colorOf(d) })],
            ['증감률', data.totalPct == null
              ? <Box component="span" sx={{ fontSize: 12, color: 'text.secondary' }}>{pctText(null, data.totalAmount)}</Box>
              : mono(pctText(data.totalPct, data.totalAmount), { fontWeight: 700, color: colorOf(data.totalPct) })],
          ]} />
        ),
      };
    }
    const rows = keyed(data?.periods);
    const sum = (k: 'count' | 'qty' | 'supplyAmount' | 'vatAmount' | 'amount') => rows.reduce((a, p) => a + (p[k] || 0), 0);
    return {
      count: rows.length,
      node: <F1Grid key={`summary-${kindKey}`} rows={rows} columns={summaryColumns} rowKey="key" storageKey={`ha-acc-sales-${kindKey}-summary-grid`} ariaLabel={`F1-GRID ${tab} 집계`} {...gridProps} />,
      foot: data && rows.length > 0 && (
        <Foot items={[
          ['건수', <b key="c">{sum('count')}</b>],
          ['수량', mono(qtyText(sum('qty')), { fontWeight: 700 })],
          ...(isSale ? [] : [
            ['공급가액', mono(sumMoney(sum('supplyAmount')), { fontWeight: 700 })],
            ['부가세', mono(sumMoney(sum('vatAmount')), { fontWeight: 700 })],
          ] as [string, ReactNode][]),
          [isSale ? '매출액' : '합계금액', mono(sumMoney(sum('amount')), { fontWeight: 700, fontSize: 13.5 })],
        ]} />
      ),
    };
  };
  const g = grid();

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%' }}>
      <PageHeader
        breadcrumbItems={breadcrumbItems && breadcrumbItems.length > 0 ? breadcrumbItems : [selectedModule.name, currentMenuName]}
        // 송연과 같이 맨 위 설명이 탭에 따라 바뀐다(메뉴 설명이 비어 있다)
        description={cfg.meta || content.description}
        actionGroups={pageActionGroups}
      />
      <Box sx={{ px: { xs: 1.5, sm: 2 }, borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tab} onChange={(_event, value: TradeKind) => switchTab(value)} aria-label="매출·매입관리 탭">
          <Tab value="매출" label={ACC_SALES.매출.tab} />
          <Tab value="매입" label={ACC_SALES.매입.tab} />
        </Tabs>
      </Box>
      <Box sx={{ p: { xs: 1.5, sm: 1 }, flex: 1, minHeight: 0, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Card sx={cardSx}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            <Typography aria-label="조회 조건" sx={{ fontSize: 12.5, color: 'text.secondary' }}>
              {data ? conditionText(data) : '조회 조건을 정해주세요 — 오른쪽 위 [조회]를 눌러 기간과 조건을 골라주세요'}
            </Typography>
            <Box sx={{ flex: 1 }} />
            {/* 단가가 안 적힌 건은 금액에 못 넣는다. 몇 건인지 말해주지 않으면 합계가 왜 적은지 알 수 없다 */}
            {data && data.unpriced > 0 && <UnpricedTag count={data.unpriced} />}
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'text.secondary' }}>{cfg.totalLabel}:</Typography>
            <Typography role="status" aria-label={cfg.totalLabel} sx={{ ...MONO, fontSize: 16, fontWeight: 700, color: data ? TEAL : 'text.primary' }}>
              {data ? `${sumMoney(data.totalAmount)}원` : '-'}
            </Typography>
          </Box>
        </Card>
        <Card sx={cardSx}>
          <Box sx={{ height: gridHeight(g.count, 16) }}>{g.node}</Box>
          {g.foot}
        </Card>
      </Box>
      <TradeSearchDialog
        open={open}
        title={`${cfg.tab} 조회`}
        itemLabel={cfg.itemLabel}
        value={search}
        clients={options[tab]?.clients ?? []}
        items={options[tab]?.items ?? []}
        onChange={setSearch}
        onClose={() => setOpen(false)}
        onSearch={runSearch}
        onAlert={(message) => void ask.alert(message)}
      />
      {ask.node}
    </Box>
  );
}

function UnpricedTag({ count }: { count: number }) {
  return (
    <Box component="span" title="단가가 등록돼있지 않아 금액에서 빠진 건이에요"
      sx={{ fontSize: 11, fontWeight: 600, color: '#b45309', bgcolor: 'rgba(245,158,11,0.14)', borderRadius: 1, px: 0.75, py: 0.2, whiteSpace: 'nowrap' }}>
      단가누락 {count}건
    </Box>
  );
}

// 그리드 아래 합계 줄(송연은 표 맨 아래 '합계' 줄)
function Foot({ items }: { items: [string, ReactNode][] }) {
  return (
    <Box aria-label="합계" sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'baseline', gap: 2, mt: 1, fontSize: 12.5, flexWrap: 'wrap' }}>
      <b>합계</b>
      {items.map(([label, value]) => (
        <Box key={label} sx={{ display: 'inline-flex', gap: 0.75, alignItems: 'baseline' }}>
          <Box component="span" sx={{ color: 'text.secondary', fontSize: 11.5 }}>{label}</Box>
          {value}
        </Box>
      ))}
    </Box>
  );
}

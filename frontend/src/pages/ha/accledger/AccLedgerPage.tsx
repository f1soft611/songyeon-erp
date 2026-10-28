import { useState, type ReactNode } from 'react';
import { Box, Card, Link, Tab, Tabs, Typography } from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import PrintIcon from '@mui/icons-material/Print';
import SearchIcon from '@mui/icons-material/Search';
import { PageHeader } from '../../../shared/components/PageHeader';
import { type PermissionActionGroupDefinition } from '../../../shared/components/PermissionGroup';
import { F1Grid, type F1GridColumn } from '../../../shared/components/f1-grid';
import { useAsk } from '../../../shared/components/AskDialog/useAsk';
import { downloadExcel } from '../../../shared/utils/excelFile';
import type { MenuPermission, ModuleItem, PageContent } from '../../dashboard/types/dashboard';
import { defaultPeriod } from '../accsales/utils/accSales';
import { LedgerSearchDialog, type LedgerSearch } from './components/LedgerSearchDialog';
import { fetchClientLedger, fetchLedgerClients } from './services/accLedger.service';
import {
  LEDGER_TABS, ledgerCondition, ledgerExcel, ledgerMoney, ledgerQty, ledgerSearchError,
  type LedgerClient, type LedgerEntry, type LedgerKind, type LedgerReport,
} from './utils/accLedger';

type AccLedgerPageProps = {
  selectedModule: ModuleItem;
  currentMenuName: string;
  content: PageContent;
  breadcrumbItems?: string[];
  selectedMenuPermissions?: MenuPermission;
};
type ClientRow = LedgerClient & { key: string };
type EntryRow = LedgerEntry & { key: string };

const MONO = { fontFamily: 'ui-monospace, Consolas, monospace', fontSize: 12 } as const;
const TEAL = '#0f766e';
const ROW_HEIGHT = 36;
const gridProps = {
  height: '100%', maxHeight: '100%', rowHeight: ROW_HEIGHT, minRowHeight: ROW_HEIGHT, maxRowHeight: 320, columnLine: true, showCheckbox: false,
  resizableRows: false, allowAddRowInContextMenu: false, allowDeleteRowInContextMenu: false, allowDuplicateRowInContextMenu: false,
} as const;
// 줄 수만큼(많으면 maxRows 에서 그리드 안 스크롤) — 합계 줄이 마지막 줄 바로 아래 붙는다. 비어도 머리줄 있는 그리드를 두고 빈 표시가 다 들어가는 높이를 준다
const gridHeight = (rows: number, maxRows: number) => (rows === 0 ? Math.max(ROW_HEIGHT * 4, 120) : Math.min(maxRows, rows) * ROW_HEIGHT) + 36;
const cardSx = { borderRadius: 1, border: '1px solid rgba(148,163,184,0.18)', boxShadow: 'none', p: 1.5 } as const;
const mono = (text: string, sx: object = {}) => <Box component="span" sx={{ ...MONO, ...sx }}>{text}</Box>;
const tag = (text: string) => (
  <Box component="span" sx={{ fontSize: 11, fontWeight: 600, color: '#b45309', bgcolor: 'rgba(245,158,11,0.14)', borderRadius: 1, px: 0.75, py: 0.2, whiteSpace: 'nowrap' }}>{text}</Box>
);

// 인사·회계 > 거래처별관리대장 (송연 #screen-acc-receivable · 33-acc-cash.js 304~541 · accounting.py /api/accounting/client-ledger)
// 거래처를 여럿 골라 한 번에 본다. 위에 거래처별 목록이 나오고, 한 곳을 누르면 그 거래처의 품목별 내역(수금 · 지급을 날짜순으로 끼움)으로 들어간다
export function AccLedgerPage({ selectedModule, currentMenuName, content, breadcrumbItems }: AccLedgerPageProps) {
  const ask = useAsk('거래처별관리대장');
  const [tab, setTab] = useState<LedgerKind>('채권');
  const [search, setSearch] = useState<LedgerSearch>({ start: '', end: '', clients: [] });
  const [open, setOpen] = useState(false);
  const [clients, setClients] = useState<string[] | null>(null);
  const [data, setData] = useState<LedgerReport | null>(null);
  // 목록에서 고른 거래처(없으면 목록 화면)
  const [picked, setPicked] = useState<string | null>(null);
  const t = LEDGER_TABS[tab];

  const openSearch = async () => {
    if (!search.start) setSearch((s) => ({ ...s, ...defaultPeriod() }));
    setOpen(true);
    if (!clients || clients.length === 0) setClients(await fetchLedgerClients().catch(() => []));
  };
  const runSearch = async () => {
    const error = ledgerSearchError(search);
    if (error) throw new Error(error);
    setData(await fetchClientLedger(tab, search.start, search.end, search.clients));
    setPicked(null);
    setOpen(false);
  };
  // 채권과 채무는 자료가 다르다. 탭을 바꾸면 앞의 결과를 지운다(남겨두면 채무 탭에서 채권 숫자를 보고 있게 된다)
  const switchTab = (kind: LedgerKind) => {
    setTab(kind);
    setData(null);
    setPicked(null);
  };

  // 지금은 화면에 보이는 표를 그대로 찍는다. 목록에서 고른 거래처만 찍는다(펼치지도 않은 것을 종이로 받으면 무엇을 보라는 것인지 알 수 없다)
  const print = async () => {
    if (!data || data.clients.length === 0) {
      await ask.alert('인쇄할 내역이 없어요');
      return;
    }
    if (!picked) {
      await ask.alert('인쇄할 거래처를 먼저 골라주세요.\n\n목록에서 한 곳을 누르면 그 거래처가 찍힙니다.');
      return;
    }
    window.print();
  };
  const exportExcel = async () => {
    if (!data || data.clients.length === 0) {
      await ask.alert('내려받을 내역이 없어요');
      return;
    }
    const sheet = ledgerExcel(data);
    await downloadExcel(sheet.rows, sheet.columns, sheet.fileName);
  };

  const pageActionGroups: PermissionActionGroupDefinition[] = [
    {
      key: 'acc-ledger',
      actions: [
        { label: '조회', icon: SearchIcon, visible: true, onClick: () => void openSearch() },
        { label: '엑셀 다운로드', icon: FileDownloadIcon, visible: true, onClick: () => void exportExcel() },
        { label: '인쇄', icon: PrintIcon, visible: true, onClick: () => void print() },
      ],
    },
  ];

  const pickButton = (name: string, children: ReactNode) => (
    <Link component="button" type="button" underline="none" onClick={(event: { stopPropagation: () => void }) => { event.stopPropagation(); setPicked(name); }}
      sx={{ fontSize: 'inherit', textAlign: 'left', color: 'inherit' }}>{children}</Link>
  );
  const listColumns: F1GridColumn<ClientRow>[] = [
    { field: 'key', type: 'rownumber', width: 60, headerName: '순번', headerAlign: 'center', align: 'center', pinned: 'left' },
    {
      field: 'businessNo', headerName: '사업자등록번호', width: 150, headerAlign: 'center', align: 'left',
      renderCell: ({ row }) => (row.businessNo ? mono(row.businessNo, { fontSize: 11.5 }) : <Box component="span" sx={{ fontSize: 12, color: 'text.secondary' }}>안 적힘</Box>),
    },
    {
      field: 'clientName', headerName: '업체명', width: 260, headerAlign: 'center', align: 'left',
      renderCell: ({ row }) => pickButton(row.clientName, (
        <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, fontWeight: 700 }}>
          {row.clientName}{row.unpriced > 0 && tag(`단가 미입력 ${row.unpriced}건`)}
        </Box>
      )),
    },
    { field: 'openingBalance', headerName: '전월이월금액', width: 150, headerAlign: 'center', align: 'right', renderCell: ({ row }) => mono(ledgerMoney(row.openingBalance), { fontWeight: 700 }) },
    {
      field: 'closingBalance', headerName: '', width: 110, headerAlign: 'center', align: 'left',
      renderCell: ({ row }) => pickButton(row.clientName, <Box component="span" sx={{ color: 'primary.main', fontSize: 12 }}>내역 보기 ›</Box>),
    },
  ];

  const entryColumns: F1GridColumn<EntryRow>[] = [
    { field: 'key', type: 'rownumber', width: 60, headerName: '순번', headerAlign: 'center', align: 'center', pinned: 'left' },
    { field: 'date', headerName: t.dateLabel, width: 110, headerAlign: 'center', align: 'center', renderCell: ({ row }) => mono(row.date, { fontSize: 11.5 }) },
    {
      field: 'itemName', headerName: '품목명', width: 300, headerAlign: 'center', align: 'left',
      renderCell: ({ row }) => (
        <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
          {row.itemName || (row.paid != null ? <Box component="span" sx={{ color: TEAL, fontWeight: 700 }}>{t.payLabel}</Box> : '')}
          {row.note && <Box component="span" sx={{ color: 'text.secondary', fontSize: 11 }}>{row.note}</Box>}
          {row.unpriced && tag('금액 모름')}
        </Box>
      ),
    },
    { field: 'qty', headerName: '수량', width: 90, headerAlign: 'center', align: 'right', renderCell: ({ row }) => mono(ledgerQty(row.qty)) },
    { field: 'unitPrice', headerName: '단가', width: 110, headerAlign: 'center', align: 'right', renderCell: ({ row }) => mono(row.unitPrice != null ? ledgerMoney(row.unitPrice) : '') },
    { field: 'amount', headerName: '금액', width: 130, headerAlign: 'center', align: 'right', renderCell: ({ row }) => mono(row.amount != null ? ledgerMoney(row.amount) : '') },
    { field: 'balance', headerName: '잔액', width: 140, headerAlign: 'center', align: 'right', renderCell: ({ row }) => mono(ledgerMoney(row.balance), { fontWeight: 700 }) },
    { field: 'paid', headerName: t.payLabel, width: 130, headerAlign: 'center', align: 'right', renderCell: ({ row }) => mono(row.paid != null ? ledgerMoney(row.paid) : '', { fontWeight: 700, color: TEAL }) },
  ];

  const current = data && picked ? data.clients.find((c) => c.clientName === picked) ?? null : null;
  const kindKey = tab === '채권' ? 'rc' : 'pay';
  const listRows: ClientRow[] = (data?.clients ?? []).map((c, i) => ({ ...c, key: String(i) }));
  const entryRows: EntryRow[] = (current?.entries ?? []).map((e, i) => ({ ...e, key: String(i) }));

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%' }}>
      <PageHeader
        breadcrumbItems={breadcrumbItems && breadcrumbItems.length > 0 ? breadcrumbItems : [selectedModule.name, currentMenuName]}
        description={content.description}
        actionGroups={pageActionGroups}
      />
      <Box sx={{ px: { xs: 1.5, sm: 2 }, borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tab} onChange={(_event, value: LedgerKind) => switchTab(value)} aria-label="거래처별관리대장 탭">
          <Tab value="채권" label={LEDGER_TABS.채권.tab} />
          <Tab value="채무" label={LEDGER_TABS.채무.tab} />
        </Tabs>
      </Box>
      <Box sx={{ p: { xs: 1.5, sm: 1 }, flex: 1, minHeight: 0, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Card sx={cardSx}>
          <Typography aria-label="조회 조건" sx={{ fontSize: 12.5, color: 'text.secondary' }}>
            {data ? ledgerCondition(data) : '조회 조건을 정해주세요 — 오른쪽 위 [조회]를 눌러 기간과 거래처를 골라주세요'}
          </Typography>
        </Card>
        {current ? (
          // 2단계: 고른 거래처 하나의 내역
          <Card sx={cardSx}>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.25, mb: 1, flexWrap: 'wrap' }}>
              <Link component="button" type="button" underline="none" onClick={() => setPicked(null)} sx={{ fontWeight: 700, fontSize: 13 }}>← 목록으로</Link>
              <Typography sx={{ fontWeight: 700, fontSize: 14 }}>{current.clientName}</Typography>
              <Typography aria-label="거래처 요약" sx={{ fontSize: 11.5, color: 'text.secondary' }}>
                {current.businessNo || '사업자번호 안 적힘'} · 전월이월 {ledgerMoney(current.openingBalance)}원
              </Typography>
            </Box>
            <Box sx={{ height: gridHeight(entryRows.length, 16) }}>
              <F1Grid key={`entries-${kindKey}`} rows={entryRows} columns={entryColumns} rowKey="key" storageKey={`ha-acc-ledger-${kindKey}-entries-grid`} ariaLabel="F1-GRID 거래처 내역" {...gridProps} />
            </Box>
            <Box aria-label="합계" sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'baseline', gap: 2, mt: 1, fontSize: 12.5, flexWrap: 'wrap' }}>
              <b>합계</b>
              <Box component="span" sx={{ color: 'text.secondary', fontSize: 11.5 }}>금액</Box>{mono(ledgerMoney(current.tradeTotal), { fontWeight: 700 })}
              <Box component="span" sx={{ color: 'text.secondary', fontSize: 11.5 }}>잔액</Box>{mono(ledgerMoney(current.closingBalance), { fontWeight: 700, fontSize: 13.5 })}
              <Box component="span" sx={{ color: 'text.secondary', fontSize: 11.5 }}>{t.payLabel}</Box>{mono(ledgerMoney(current.paidTotal), { fontWeight: 700, color: TEAL })}
            </Box>
          </Card>
        ) : (
          // 1단계: 거래처 목록(남은 돈이 큰 곳부터)
          <Card sx={cardSx}>
            <Box sx={{ height: gridHeight(listRows.length, 12) }}>
              <F1Grid key={`clients-${kindKey}`} rows={listRows} columns={listColumns} rowKey="key" storageKey={`ha-acc-ledger-${kindKey}-clients-grid`} ariaLabel="F1-GRID 거래처 목록" {...gridProps} />
            </Box>
          </Card>
        )}
      </Box>
      <LedgerSearchDialog
        open={open}
        title={`거래처별관리대장 — ${tab} 조회`}
        value={search}
        clients={clients ?? []}
        onChange={setSearch}
        onClose={() => setOpen(false)}
        onSearch={runSearch}
        onAlert={(message) => void ask.alert(message)}
      />
      {ask.node}
    </Box>
  );
}

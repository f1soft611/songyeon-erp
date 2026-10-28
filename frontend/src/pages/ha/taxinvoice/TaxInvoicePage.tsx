import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Autocomplete, Box, Button, Card, Link, Tab, Tabs, TextField, Typography } from '@mui/material';
import DescriptionIcon from '@mui/icons-material/Description';
import { PageHeader } from '../../../shared/components/PageHeader';
import { F1Grid, type F1GridColumn, type F1GridRef } from '../../../shared/components/f1-grid';
import { useAsk } from '../../../shared/components/AskDialog/useAsk';
import type { MenuPermission, ModuleItem, PageContent } from '../../dashboard/types/dashboard';
import { defaultPeriod } from '../accsales/utils/accSales';
import { fetchLedgerClients } from '../accledger/services/accLedger.service';
import { fetchTaxBatch, fetchTaxSingle, fetchTaxStatus, issueBatch, issueSingle } from './services/taxInvoice.service';
import { pickedTotal, taxMoney, taxQty, toggleAll, type TaxBatch, type TaxBatchClient, type TaxSingle, type TaxSingleRow } from './utils/taxInvoice';

const errorText = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

type TaxInvoicePageProps = {
  selectedModule: ModuleItem;
  currentMenuName: string;
  content: PageContent;
  breadcrumbItems?: string[];
  selectedMenuPermissions?: MenuPermission;
};
type TabKey = 'single' | 'batch';
type Msg = { text: string; ok: boolean } | null;
type SingleRow = TaxSingleRow & { key: string };
type BatchRow = TaxBatchClient & { key: string };

const MONO = { fontFamily: 'ui-monospace, Consolas, monospace', fontSize: 12 } as const;
const TEAL = '#0f766e';
const ROW_HEIGHT = 36;
const gridProps = {
  height: '100%', maxHeight: '100%', rowHeight: ROW_HEIGHT, minRowHeight: ROW_HEIGHT, maxRowHeight: 320, columnLine: true,
  resizableRows: false, allowAddRowInContextMenu: false, allowDeleteRowInContextMenu: false, allowDuplicateRowInContextMenu: false,
} as const;
// 줄 수만큼(많으면 maxRows 에서 그리드 안 스크롤). 비어도 머리줄 있는 그리드를 두고 빈 표시가 다 들어가는 높이를 준다
const gridHeight = (rows: number, maxRows: number) => (rows === 0 ? Math.max(ROW_HEIGHT * 4, 120) : Math.min(maxRows, rows) * ROW_HEIGHT) + 36;
const cardSx = { borderRadius: 1, border: '1px solid rgba(148,163,184,0.18)', boxShadow: 'none', p: 1.5 } as const;
const mono = (text: string, sx: object = {}) => <Box component="span" sx={{ ...MONO, ...sx }}>{text}</Box>;

// 인사·회계 > 세금계산서 (송연 #screen-tax-invoice · 12-tax-invoice.js)
// 실제 발행은 송연도 아직 없다. 발급업체(팝빌) API 키가 없으면 그 안내, 있으면 '준비 중' 이 돌아온다
export function TaxInvoicePage({ selectedModule, currentMenuName, content, breadcrumbItems }: TaxInvoicePageProps) {
  const ask = useAsk('세금계산서');
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabKey>('single');
  const [configured, setConfigured] = useState(true);
  const [clients, setClients] = useState<string[]>([]);

  // 즉시 발행
  const [client, setClient] = useState('');
  const [sPeriod, setSPeriod] = useState(defaultPeriod);
  const [single, setSingle] = useState<TaxSingle | null>(null);
  const [singleHint, setSingleHint] = useState('');
  const [sMsg, setSMsg] = useState<Msg>(null);

  // 월단위 일괄발행
  const [bPeriod, setBPeriod] = useState(defaultPeriod);
  const [batch, setBatch] = useState<TaxBatch | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [bMsg, setBMsg] = useState<Msg>(null);
  const batchRef = useRef<F1GridRef<BatchRow>>(null);

  // 들어올 때 발급업체 연결 상태를 본다(송연 loadTaxInvoiceSetupStatus)
  useEffect(() => {
    fetchTaxStatus().then(setConfigured).catch(() => undefined);
    fetchLedgerClients().then(setClients).catch(() => undefined);
  }, []);

  const loadSingle = async () => {
    void fetchTaxStatus().then(setConfigured).catch(() => undefined);
    const name = client.trim();
    if (!name) {
      setSingle(null);
      setSingleHint('거래처를 선택해주세요');
      return;
    }
    try {
      const data = await fetchTaxSingle(name, sPeriod.start, sPeriod.end);
      // 일부만 적었으면 찾은 거래처 이름으로 바꿔 적는다
      if (data.resolvedClientName && data.resolvedClientName !== name) setClient(data.resolvedClientName);
      setSingle(data);
      setSingleHint(data.rows.length === 0 ? '이 기간에 매출이 없습니다' : '');
    } catch (requestError) {
      await ask.alert(errorText(requestError, '조회에 실패했어요'));
    }
  };
  const loadBatch = async (period = bPeriod) => {
    void fetchTaxStatus().then(setConfigured).catch(() => undefined);
    try {
      const data = await fetchTaxBatch(period.start, period.end);
      setBatch(data);
      setPicked([]);
      batchRef.current?.setSelectedRowIds([]);
    } catch (requestError) {
      await ask.alert(errorText(requestError, '조회에 실패했어요'));
    }
  };
  // 일괄발행 탭은 누르면 바로 부른다(송연과 같다)
  const switchTab = (next: TabKey) => {
    setTab(next);
    if (next === 'batch') void loadBatch();
  };

  const issueOne = async () => {
    const name = client.trim();
    if (!name || !single || single.rows.length === 0) {
      setSMsg({ text: '먼저 조회해주세요', ok: false });
      return;
    }
    try {
      await issueSingle(name, sPeriod.start, sPeriod.end);
      setSMsg({ text: '발행되었습니다', ok: true });
    } catch (requestError) {
      setSMsg({ text: errorText(requestError, '발행하지 못했어요'), ok: false });
    }
  };
  const issueMany = async () => {
    if (picked.length === 0) {
      setBMsg({ text: '발행할 거래처를 선택해주세요', ok: false });
      return;
    }
    try {
      await issueBatch(bPeriod.start, bPeriod.end, picked);
      setBMsg({ text: '발행되었습니다', ok: true });
    } catch (requestError) {
      setBMsg({ text: errorText(requestError, '발행하지 못했어요'), ok: false });
    }
  };
  const selectAll = () => {
    const next = toggleAll(batch?.clients ?? [], picked);
    setPicked(next);
    batchRef.current?.setSelectedRowIds(next);
  };

  const dates = (value: { start: string; end: string }, set: (v: { start: string; end: string }) => void, prefix: string) => (
    <>
      <TextField size="small" margin="none" type="date" value={value.start} onChange={(event) => set({ ...value, start: event.target.value })} sx={{ width: 160 }}
        slotProps={{ htmlInput: { max: '9999-12-31', 'aria-label': `${prefix}시작일` } }} />
      <Box component="span" sx={{ color: 'text.secondary' }}>~</Box>
      <TextField size="small" margin="none" type="date" value={value.end} onChange={(event) => set({ ...value, end: event.target.value })} sx={{ width: 160 }}
        slotProps={{ htmlInput: { max: '9999-12-31', 'aria-label': `${prefix}종료일` } }} />
    </>
  );
  const totalLine = (label: string, value: number, aria: string) => (
    <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'baseline', gap: 0.75, fontSize: 13, fontWeight: 700, color: 'text.secondary' }}>
      {label}:
      <Box component="span" role="status" aria-label={aria} sx={{ ...MONO, fontSize: 16, fontWeight: 700, color: TEAL }}>{taxMoney(value)}</Box>원
    </Box>
  );
  const message = (m: Msg) => m && <Typography role="alert" sx={{ fontSize: 12.5, color: m.ok ? TEAL : 'error.main' }}>{m.text}</Typography>;

  const singleColumns: F1GridColumn<SingleRow>[] = [
    { field: 'key', type: 'rownumber', width: 60, headerName: '순번', headerAlign: 'center', align: 'center', pinned: 'left' },
    { field: 'date', headerName: '출고일', width: 120, headerAlign: 'center', align: 'center', renderCell: ({ row }) => mono(row.date || '') },
    { field: 'itemName', headerName: '품목명', width: 260, headerAlign: 'center', align: 'left' },
    { field: 'qty', headerName: '수량', width: 100, headerAlign: 'center', align: 'right', renderCell: ({ row }) => mono(taxQty(row.qty)) },
    { field: 'unitPrice', headerName: '판매단가', width: 120, headerAlign: 'center', align: 'right', renderCell: ({ row }) => mono(taxMoney(row.unitPrice)) },
    { field: 'amount', headerName: '금액', width: 140, headerAlign: 'center', align: 'right', renderCell: ({ row }) => mono(taxMoney(row.amount), { fontWeight: 700 }) },
  ];
  const batchColumns: F1GridColumn<BatchRow>[] = [
    { field: 'key', type: 'rownumber', width: 60, headerName: '순번', headerAlign: 'center', align: 'center', pinned: 'left' },
    { field: 'clientName', headerName: '거래처', width: 260, headerAlign: 'center', align: 'left' },
    { field: 'qty', headerName: '출하수량', width: 120, headerAlign: 'center', align: 'right', renderCell: ({ row }) => mono(taxQty(row.qty)) },
    { field: 'amount', headerName: '매출액(발행금액)', width: 160, headerAlign: 'center', align: 'right', renderCell: ({ row }) => mono(taxMoney(row.amount), { fontWeight: 700 }) },
  ];
  const singleRows: SingleRow[] = (single?.rows ?? []).map((r, i) => ({ ...r, key: String(i) }));
  const batchClients = batch?.clients ?? [];
  // 거래처 이름이 줄 키다(고른 줄 = 발행할 거래처)
  const batchRows: BatchRow[] = batchClients.map((c) => ({ ...c, key: c.clientName }));

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%' }}>
      <PageHeader
        breadcrumbItems={breadcrumbItems && breadcrumbItems.length > 0 ? breadcrumbItems : [selectedModule.name, currentMenuName]}
        description={content.description || '거래처 요청이 오면 즉시 발행하거나, 월단위로 한번에 일괄발행할 수 있어요'}
        actionGroups={[]}
      />
      <Box sx={{ px: { xs: 1.5, sm: 2 }, borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tab} onChange={(_event, value: TabKey) => switchTab(value)} aria-label="세금계산서 탭">
          <Tab value="single" label="즉시 발행" />
          <Tab value="batch" label="월단위 일괄발행" />
        </Tabs>
      </Box>
      <Box sx={{ p: { xs: 1.5, sm: 1 }, flex: 1, minHeight: 0, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {!configured && (
          <Alert severity="warning">
            아직 전자세금계산서 발급업체(팝빌 등) API 키가 연결되지 않았어요.{' '}
            <Link component="button" onClick={() => navigate('/co/master/settings')} sx={{ fontWeight: 700, verticalAlign: 'baseline' }}>공통관리 &gt; 기준정보 &gt; 기초정보 &gt; 서버관리</Link>
            에서 등록해주세요.
          </Alert>
        )}
        {tab === 'single' ? (
          <Card sx={cardSx}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 1 }}>
              <Autocomplete
                freeSolo options={clients} value={client} inputValue={client} onInputChange={(_event, value) => setClient(value)} sx={{ width: 220 }}
                renderInput={(params) => (
                  <TextField {...params} size="small" margin="none" placeholder="거래처 선택"
                    onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void loadSingle(); } }}
                    slotProps={{ ...params.slotProps, htmlInput: { ...params.slotProps.htmlInput, 'aria-label': '거래처' } }} />
                )}
              />
              {dates(sPeriod, setSPeriod, '')}
              <Button variant="contained" onClick={() => void loadSingle()}>조회</Button>
            </Box>
            {totalLine('발행 예정 금액', single?.totalAmount ?? 0, '발행 예정 금액')}
            {singleHint && <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mt: 0.5 }}>{singleHint}</Typography>}
            <Box sx={{ height: gridHeight(singleRows.length, 14), mt: 1 }}>
              <F1Grid key="single" rows={singleRows} columns={singleColumns} rowKey="key" storageKey="ha-tax-invoice-single-grid" ariaLabel="F1-GRID 즉시 발행 내역" showCheckbox={false} {...gridProps} />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 1.5 }}>
              <Button variant="contained" startIcon={<DescriptionIcon />} onClick={() => void issueOne()}>이 내역으로 세금계산서 발행</Button>
              {message(sMsg)}
            </Box>
          </Card>
        ) : (
          <Card sx={cardSx}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 1 }}>
              {dates(bPeriod, setBPeriod, '일괄 ')}
              <Button variant="contained" onClick={() => void loadBatch()}>조회</Button>
              <Box sx={{ flex: 1 }} />
              <Button variant="outlined" onClick={selectAll}>전체선택</Button>
            </Box>
            {totalLine('선택한 거래처 합계', pickedTotal(batchClients, picked), '선택한 거래처 합계')}
            {batch && batchClients.length === 0 && <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mt: 0.5 }}>이 기간에 매출이 없습니다</Typography>}
            <Box sx={{ height: gridHeight(batchRows.length, 14), mt: 1 }}>
              <F1Grid
                key="batch" ref={batchRef} rows={batchRows} columns={batchColumns} rowKey="key" storageKey="ha-tax-invoice-batch-grid" ariaLabel="F1-GRID 일괄발행 거래처"
                showCheckbox onSelectionChange={(ids) => setPicked(ids.map(String))} {...gridProps}
              />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 1.5 }}>
              <Button variant="contained" startIcon={<DescriptionIcon />} onClick={() => void issueMany()}>선택한 거래처 일괄 발행</Button>
              {message(bMsg)}
            </Box>
          </Card>
        )}
      </Box>
      {ask.node}
    </Box>
  );
}

import { useCallback, useEffect, useState } from 'react';
import { Box, Button, Card, Chip, MenuItem, TextField, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import SearchIcon from '@mui/icons-material/Search';
import { PageHeader } from '../../../shared/components/PageHeader';
import { type PermissionActionGroupDefinition } from '../../../shared/components/PermissionGroup';
import { F1Grid, type F1GridColumn } from '../../../shared/components/f1-grid';
import { useAsk } from '../../../shared/components/AskDialog/useAsk';
import { downloadExcel } from '../../../shared/utils/excelFile';
import type { MenuPermission, ModuleItem, PageContent } from '../../dashboard/types/dashboard';
import { fetchAccBasic } from '../accbasic/services/accBasic.service';
import type { AccBank, AccCard, AccSubject } from '../accbasic/utils/accBasic';
import { todayText } from '../hr/utils/hr';
import { AccTxDialog, type TxTarget } from './components/AccTxDialog';
import { deleteTransaction, fetchTransactions } from './services/accTx.service';
import { TX_EXCEL_COLUMNS, deleteText, excelFileName, signedMoney, summaryParts, whereText, type AccTransaction, type TxFilter } from './utils/accTx';

const errorText = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

type AccTxPageProps = {
  selectedModule: ModuleItem;
  currentMenuName: string;
  content: PageContent;
  breadcrumbItems?: string[];
  selectedMenuPermissions?: MenuPermission;
};

const MONO = { fontFamily: 'ui-monospace, Consolas, monospace', fontSize: 12 } as const;
const smallBtn = { minWidth: 0, px: 1, py: 0.1, fontSize: 12, whiteSpace: 'nowrap' } as const;
const IN = '#0f766e';
const OUT = '#dc2626';
const empty = (text = '') => <Box component="span" sx={{ color: 'text.disabled' }}>{text}</Box>;

// 인사·회계 > 회계거래현황 (송연 #screen-acc-tx · 33-acc-cash.js 12~171 · accounting.py)
// 매일 들어오고 나간 돈을 적고, 지난 것을 찾아 고친다. 입금 · 출금은 한 표에 적히고 적는 곳은 이 화면 하나뿐이다.
export function AccTxPage({ selectedModule, currentMenuName, content, breadcrumbItems }: AccTxPageProps) {
  const ask = useAsk('회계거래현황');
  const [filter, setFilter] = useState<TxFilter>({ start: '', end: '', kind: '', clientName: '' });
  // 조회한 조건(엑셀 파일 이름 · 저장 뒤 다시 받기에 쓴다)
  const [shown, setShown] = useState<TxFilter | null>(null);
  const [rows, setRows] = useState<AccTransaction[]>([]);
  const [totals, setTotals] = useState<{ inTotal: number; outTotal: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [subjects, setSubjects] = useState<AccSubject[]>([]);
  const [banks, setBanks] = useState<AccBank[]>([]);
  const [cards, setCards] = useState<AccCard[]>([]);
  const [target, setTarget] = useState<TxTarget | null>(null);

  const loadMasters = useCallback(async () => {
    try {
      const m = await fetchAccBasic();
      setSubjects(m.subjects);
      setBanks(m.banks);
      setCards(m.cards);
    } catch {
      // 고르는 칸만 비고 적기는 된다
    }
  }, []);
  useEffect(() => {
    void loadMasters();
  }, [loadMasters]);

  const search = async (f: TxFilter) => {
    if (!f.start || !f.end) {
      await ask.alert('조회 기간을 골라주세요');
      return;
    }
    setLoading(true);
    try {
      const data = await fetchTransactions(f);
      setRows(data.rows);
      setTotals({ inTotal: data.inTotal, outTotal: data.outTotal });
      setShown(f);
    } catch (requestError) {
      await ask.alert(errorText(requestError, '조회하지 못했어요'));
    } finally {
      setLoading(false);
    }
  };

  const openWrite = async (row: AccTransaction | null) => {
    await loadMasters(); // 기초회계정보에서 방금 더한 계정과목도 고를 수 있게
    setTarget({ row, today: todayText() });
  };

  const onSaved = () => {
    setTarget(null);
    if (shown) void search(shown);
  };

  const remove = async (r: AccTransaction) => {
    if (!(await ask.confirm(deleteText(r), true))) return;
    try {
      await deleteTransaction(r.id);
    } catch {
      await ask.alert('지우지 못했어요');
      return;
    }
    if (shown) void search(shown);
  };

  const columns: F1GridColumn<AccTransaction>[] = [
    { field: 'id', type: 'rownumber', width: 60, headerName: '순번', headerAlign: 'center', align: 'center', pinned: 'left' },
    { field: 'txDate', headerName: '날짜', width: 100, headerAlign: 'center', align: 'center', renderCell: ({ row }) => <Box component="span" sx={MONO}>{row.txDate}</Box> },
    {
      field: 'kind', headerName: '구분', width: 70, headerAlign: 'center', align: 'center',
      renderCell: ({ row }) => <Chip size="small" variant="outlined" label={row.kind} sx={{ height: 20, fontSize: 11, color: row.kind === '입금' ? IN : OUT, borderColor: row.kind === '입금' ? IN : OUT }} />,
    },
    { field: 'clientName', headerName: '거래처', width: 130, headerAlign: 'center', align: 'left', renderCell: ({ row }) => row.clientName || empty() },
    {
      field: 'subjectName', headerName: '계정과목', width: 150, headerAlign: 'center', align: 'left',
      renderCell: ({ row }) => (row.subjectName
        ? <Box component="span">{row.subjectName}<Box component="span" sx={{ ml: 0.75, fontSize: 11, color: 'text.secondary' }}>{row.subjectCode}</Box></Box>
        : empty('안 정함')),
    },
    {
      field: 'amount', headerName: '금액', width: 120, headerAlign: 'center', align: 'right',
      renderCell: ({ row }) => <Box component="span" sx={{ ...MONO, fontWeight: 700, color: row.kind === '입금' ? IN : OUT }}>{signedMoney(row)}</Box>,
    },
    { field: 'method', headerName: '수단', width: 64, headerAlign: 'center', align: 'center', renderCell: ({ row }) => row.method || '' },
    { field: 'bankName', headerName: '계좌·카드', width: 160, headerAlign: 'center', align: 'left', renderCell: ({ row }) => <Box component="span" sx={{ fontSize: 12 }}>{whereText(row) || ''}</Box> },
    { field: 'note', headerName: '비고', flex: 1, width: 100, headerAlign: 'center', align: 'left', renderCell: ({ row }) => row.note || empty() },
    { field: 'createdBy', headerName: '적은 사람', width: 90, headerAlign: 'center', align: 'left', renderCell: ({ row }) => <Box component="span" sx={{ fontSize: 12, color: 'text.secondary' }}>{row.createdBy || ''}</Box> },
    {
      field: 'cardId', headerName: '', width: 130, headerAlign: 'center', align: 'center',
      renderCell: ({ row }) => (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Button size="small" variant="outlined" sx={smallBtn} onClick={() => void openWrite(row)}>고치기</Button>
          <Button size="small" variant="outlined" color="error" sx={smallBtn} onClick={() => void remove(row)}>삭제</Button>
        </Box>
      ),
    },
  ];

  const pageActionGroups: PermissionActionGroupDefinition[] = [
    {
      key: 'acc-tx',
      actions: [
        { label: '조회', icon: SearchIcon, visible: true, onClick: () => void search(filter) },
        {
          label: '엑셀 다운로드', icon: FileDownloadIcon, visible: true,
          onClick: () => void (rows.length === 0 || !shown ? ask.alert('내려받을 내역이 없어요') : downloadExcel(rows, TX_EXCEL_COLUMNS, excelFileName(shown.start, shown.end))),
        },
        { label: '입금·출금 적기', icon: AddIcon, visible: true, onClick: () => void openWrite(null) },
      ],
    },
  ];

  const set = (key: keyof TxFilter) => (event: { target: { value: string } }) => setFilter((f) => ({ ...f, [key]: event.target.value }));
  const enter = (event: { key: string; preventDefault: () => void }) => { if (event.key === 'Enter') { event.preventDefault(); void search(filter); } };
  const sum = totals ? summaryParts(totals.inTotal, totals.outTotal) : null;

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%' }}>
      <PageHeader
        breadcrumbItems={breadcrumbItems && breadcrumbItems.length > 0 ? breadcrumbItems : [selectedModule.name, currentMenuName]}
        description={content.description}
        actionGroups={pageActionGroups}
      />
      <Box sx={{ p: { xs: 1.5, sm: 1 }, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Card sx={{ borderRadius: 1, border: '1px solid rgba(148,163,184,0.18)', boxShadow: 'none', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', p: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 1 }}>
            <TextField size="small" margin="none" type="date" value={filter.start} onChange={set('start')} onKeyDown={enter} sx={{ width: 160 }}
              slotProps={{ htmlInput: { max: '9999-12-31', 'aria-label': '시작일' } }} />
            <Box component="span" sx={{ color: 'text.secondary' }}>~</Box>
            <TextField size="small" margin="none" type="date" value={filter.end} onChange={set('end')} onKeyDown={enter} sx={{ width: 160 }}
              slotProps={{ htmlInput: { max: '9999-12-31', 'aria-label': '종료일' } }} />
            <TextField select size="small" margin="none" value={filter.kind} onChange={set('kind')} sx={{ width: 140, flex: '0 0 auto' }}
              slotProps={{ select: { displayEmpty: true }, htmlInput: { 'aria-label': '입금·출금 거르기' } }}>
              <MenuItem value="">입금·출금</MenuItem>
              <MenuItem value="입금">입금만</MenuItem>
              <MenuItem value="출금">출금만</MenuItem>
            </TextField>
            <TextField size="small" margin="none" placeholder="거래처" value={filter.clientName} onChange={set('clientName')} onKeyDown={enter} sx={{ width: 160 }}
              slotProps={{ htmlInput: { 'aria-label': '거래처' } }} />
            <Box sx={{ flex: 1 }} />
            {sum && (
              <Typography role="status" sx={{ fontSize: 12.5 }}>
                입금 <b style={{ color: IN }}>{sum.inText}</b>원 · 출금 <b style={{ color: OUT }}>{sum.outText}</b>원 · 차이 <b>{sum.diffText}</b>원
              </Typography>
            )}
          </Box>
          <Box sx={{ flex: 1, minHeight: 200, overflow: 'hidden' }}>
            <F1Grid rows={rows} columns={columns} rowKey="id" storageKey="ha-acc-tx-grid" ariaLabel="F1-GRID 회계거래현황" loading={loading}
              height="100%" maxHeight="100%" rowHeight={38} minRowHeight={38} maxRowHeight={320} columnLine showCheckbox={false}
              resizableRows={false} allowAddRowInContextMenu={false} allowDuplicateRowInContextMenu={false} allowDeleteRowInContextMenu={false} />
          </Box>
        </Card>
      </Box>
      <AccTxDialog target={target} subjects={subjects} banks={banks} cards={cards} onClose={() => setTarget(null)} onSaved={onSaved} />
      {ask.node}
    </Box>
  );
}

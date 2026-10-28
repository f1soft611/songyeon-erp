import { useState } from 'react';
import { Box, Card, Tab, Tabs, TextField, Typography } from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import SearchIcon from '@mui/icons-material/Search';
import { PageHeader } from '../../../shared/components/PageHeader';
import { type PermissionActionGroupDefinition } from '../../../shared/components/PermissionGroup';
import { F1Grid, type F1GridColumn } from '../../../shared/components/f1-grid';
import { useAsk } from '../../../shared/components/AskDialog/useAsk';
import { downloadExcel } from '../../../shared/utils/excelFile';
import type { MenuPermission, ModuleItem, PageContent } from '../../dashboard/types/dashboard';
import { fetchCashReport } from '../acctx/services/accTx.service';
import { money, whereText, type AccTransaction, type TxKind } from '../acctx/utils/accTx';
import { ACC_REPORTS, REPORT_EXCEL_COLUMNS, reportFileName, type Bucket, type CashReport } from './utils/accIo';

const errorText = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

type AccIoPageProps = {
  selectedModule: ModuleItem;
  currentMenuName: string;
  content: PageContent;
  breadcrumbItems?: string[];
  selectedMenuPermissions?: MenuPermission;
};
type BucketRow = Bucket & { key: string };

const MONO = { fontFamily: 'ui-monospace, Consolas, monospace', fontSize: 12 } as const;
const ROW_HEIGHT = 36;
const gridProps = {
  height: '100%', maxHeight: '100%', rowHeight: ROW_HEIGHT, minRowHeight: ROW_HEIGHT, maxRowHeight: 320, columnLine: true, showCheckbox: false,
  resizableRows: false, allowAddRowInContextMenu: false, allowDuplicateRowInContextMenu: false, allowDeleteRowInContextMenu: false,
} as const;
// 줄 수만큼(많으면 maxRows 에서 그리드 안 스크롤). 비어도 머리줄 있는 그리드를 두고 빈 표시가 다 들어가는 높이를 준다
const gridHeight = (rows: number, maxRows: number) => (rows === 0 ? Math.max(ROW_HEIGHT * 4, 120) : Math.min(maxRows, rows) * ROW_HEIGHT) + 36;
const cardSx = { borderRadius: 1, border: '1px solid rgba(148,163,184,0.18)', boxShadow: 'none', p: 1.5 } as const;

// 인사·회계 > 입·출금관리 (송연 #screen-acc-in-report · 33-acc-cash.js 174~302 · accounting.py /api/accounting/cash-report)
// 회계거래현황과 같은 자료다. 여기서는 고치지 않고, 기간 안의 입금(또는 출금)을 묶음부터 보여준다.
export function AccIoPage({ selectedModule, currentMenuName, content, breadcrumbItems }: AccIoPageProps) {
  const ask = useAsk('입·출금관리');
  const [tab, setTab] = useState<TxKind>('입금');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [clientName, setClientName] = useState('');
  // 지금 화면에 떠 있는 것 하나만 들고 있는다(탭마다 담아두면 기간 칸은 같이 쓰는데 담긴 자료는 옛 기간 것이라 위아래가 어긋난다)
  const [data, setData] = useState<CashReport | null>(null);
  const [loading, setLoading] = useState(false);
  const cfg = ACC_REPORTS[tab];

  const load = async (kind: TxKind) => {
    if (!start || !end) {
      await ask.alert('조회 기간을 골라주세요');
      return;
    }
    setLoading(true);
    try {
      setData(await fetchCashReport(kind, start, end, clientName.trim()));
    } catch (requestError) {
      await ask.alert(errorText(requestError, '조회하지 못했어요'));
    } finally {
      setLoading(false);
    }
  };

  // 기간 · 거래처는 그대로 두고 그 조건으로 반대쪽을 바로 부른다(같은 달의 입금과 출금을 번갈아 보는 일이 많다)
  const switchTab = (kind: TxKind) => {
    setTab(kind);
    setData(null);
    if (start && end) void load(kind);
  };

  const bucketColumns = (title: string): F1GridColumn<BucketRow>[] => [
    { field: 'key', type: 'rownumber', width: 52, headerName: '순번', headerAlign: 'center', align: 'center', pinned: 'left' },
    { field: 'label', headerName: title, flex: 1, width: 120, headerAlign: 'center', align: 'left' },
    { field: 'amount', headerName: '금액', width: 110, headerAlign: 'center', align: 'right', renderCell: ({ row }) => <Box component="span" sx={MONO}>{money(row.amount)}</Box> },
    { field: 'count', headerName: '건수', width: 64, headerAlign: 'center', align: 'right', renderCell: ({ row }) => <Box component="span" sx={{ fontSize: 11.5, color: 'text.secondary' }}>{row.count}건</Box> },
  ];
  const bucketRows = (list: Bucket[] | undefined, prefix: string): BucketRow[] => (list || []).map((b, i) => ({ ...b, key: `${prefix}${i}` }));

  const rowColumns: F1GridColumn<AccTransaction>[] = [
    { field: 'id', type: 'rownumber', width: 60, headerName: '순번', headerAlign: 'center', align: 'center', pinned: 'left' },
    { field: 'txDate', headerName: '날짜', width: 110, headerAlign: 'center', align: 'center', renderCell: ({ row }) => <Box component="span" sx={MONO}>{row.txDate}</Box> },
    { field: 'clientName', headerName: '거래처', width: 170, headerAlign: 'center', align: 'left', renderCell: ({ row }) => row.clientName || '' },
    { field: 'subjectName', headerName: '계정과목', width: 160, headerAlign: 'center', align: 'left', renderCell: ({ row }) => row.subjectName || '' },
    { field: 'amount', headerName: '금액', width: 130, headerAlign: 'center', align: 'right', renderCell: ({ row }) => <Box component="span" sx={{ ...MONO, fontWeight: 700, color: cfg.color }}>{money(row.amount)}</Box> },
    { field: 'method', headerName: '수단', width: 70, headerAlign: 'center', align: 'center', renderCell: ({ row }) => row.method || '' },
    { field: 'bankName', headerName: '계좌·카드', width: 200, headerAlign: 'center', align: 'left', renderCell: ({ row }) => <Box component="span" sx={{ fontSize: 12 }}>{whereText(row) || ''}</Box> },
    { field: 'note', headerName: '비고', flex: 1, width: 160, headerAlign: 'center', align: 'left', renderCell: ({ row }) => row.note || '' },
  ];

  const pageActionGroups: PermissionActionGroupDefinition[] = [
    {
      key: 'acc-io',
      actions: [
        { label: '조회', icon: SearchIcon, visible: true, onClick: () => void load(tab) },
        {
          label: '엑셀 다운로드', icon: FileDownloadIcon, visible: true,
          onClick: () => void (!data || data.rows.length === 0 ? ask.alert('내려받을 내역이 없어요') : downloadExcel(data.rows, REPORT_EXCEL_COLUMNS, reportFileName(data))),
        },
      ],
    },
  ];

  const enter = (event: { key: string; preventDefault: () => void }) => { if (event.key === 'Enter') { event.preventDefault(); void load(tab); } };
  const chunk = (title: string, list: Bucket[] | undefined, prefix: string) => {
    const rows = bucketRows(list, prefix);
    return (
      <Card sx={{ ...cardSx, flex: '1 1 300px', minWidth: 260 }}>
        <Typography sx={{ fontWeight: 700, fontSize: 13.5, mb: 0.75 }}>{title}</Typography>
        <Box sx={{ height: gridHeight(rows.length, 6) }}>
          <F1Grid rows={rows} columns={bucketColumns(title.replace('별', ''))} rowKey="key" storageKey={`ha-acc-io-${prefix}-grid`} ariaLabel={`F1-GRID ${title}`} loading={loading} {...gridProps} />
        </Box>
      </Card>
    );
  };

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%' }}>
      <PageHeader
        breadcrumbItems={breadcrumbItems && breadcrumbItems.length > 0 ? breadcrumbItems : [selectedModule.name, currentMenuName]}
        // 송연과 같이 맨 위 설명이 탭에 따라 바뀐다(메뉴 설명은 입금 쪽 문구라 출금 탭에서는 맞지 않는다)
        description={cfg.meta || content.description}
        actionGroups={pageActionGroups}
      />
      <Box sx={{ px: { xs: 1.5, sm: 2 }, borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tab} onChange={(_event, value: TxKind) => switchTab(value)} aria-label="입·출금관리 탭">
          <Tab value="입금" label={ACC_REPORTS.입금.tab} />
          <Tab value="출금" label={ACC_REPORTS.출금.tab} />
        </Tabs>
      </Box>
      <Box sx={{ p: { xs: 1.5, sm: 1 }, flex: 1, minHeight: 0, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Card sx={cardSx}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <TextField size="small" margin="none" type="date" value={start} onChange={(event) => setStart(event.target.value)} onKeyDown={enter} sx={{ width: 160 }}
              slotProps={{ htmlInput: { max: '9999-12-31', 'aria-label': '시작일' } }} />
            <Box component="span" sx={{ color: 'text.secondary' }}>~</Box>
            <TextField size="small" margin="none" type="date" value={end} onChange={(event) => setEnd(event.target.value)} onKeyDown={enter} sx={{ width: 160 }}
              slotProps={{ htmlInput: { max: '9999-12-31', 'aria-label': '종료일' } }} />
            <TextField size="small" margin="none" placeholder="거래처 (안 적으면 전체)" value={clientName} onChange={(event) => setClientName(event.target.value)} onKeyDown={enter} sx={{ width: 200 }}
              slotProps={{ htmlInput: { 'aria-label': '거래처' } }} />
            <Box sx={{ flex: 1 }} />
            <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{tab} 합계</Typography>
            <Typography role="status" aria-label={`${tab} 합계`} sx={{ ...MONO, fontSize: 15, fontWeight: 700, color: data ? cfg.color : 'text.primary' }}>
              {data ? `${money(data.total)}원` : '-'}
            </Typography>
          </Box>
        </Card>
        {/* 묶음을 먼저 보여준다. 한 달치 줄만 늘어놓으면 '무엇에 얼마나' 를 손으로 세게 된다 */}
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          {chunk('계정과목별', data?.bySubject, 'subject')}
          {chunk('거래처별', data?.byClient, 'client')}
          {chunk('수단별', data?.byMethod, 'method')}
        </Box>
        <Card sx={cardSx}>
          <Typography sx={{ fontWeight: 700, fontSize: 13.5, mb: 0.75 }}>날짜별 내역</Typography>
          <Box sx={{ height: gridHeight(data?.rows.length ?? 0, 12) }}>
            <F1Grid rows={data?.rows ?? []} columns={rowColumns} rowKey="id" storageKey="ha-acc-io-rows-grid" ariaLabel="F1-GRID 날짜별 내역" loading={loading} {...gridProps} />
          </Box>
          {data && data.rows.length > 0 && (
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 1, fontSize: 13 }}>
              <b>합계</b>
              <Box component="span" sx={{ ...MONO, fontSize: 13, fontWeight: 700, color: cfg.color }}>{money(data.total)}</Box>
            </Box>
          )}
        </Card>
      </Box>
      {ask.node}
    </Box>
  );
}

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Box, Button, Card, Checkbox, FormControlLabel, Tab, Tabs, TextField, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { PageHeader } from '../../../shared/components/PageHeader';
import { type PermissionActionGroupDefinition } from '../../../shared/components/PermissionGroup';
import { F1Grid, type F1GridColumn } from '../../../shared/components/f1-grid';
import { useAsk } from '../../../shared/components/AskDialog/useAsk';
import type { MenuPermission, ModuleItem, PageContent } from '../../dashboard/types/dashboard';
import { AccBasicDialog, type AccTarget } from './components/AccBasicDialog';
import { deleteAcc, fetchAccBasic, saveAcc } from './services/accBasic.service';
import {
  KIND_LABEL, cardNumberText, deleteConfirmText, filterSubjects, payAccountText, rowName, toggledBody,
  type AccBank, type AccCard, type AccKind, type AccRow, type AccSubject,
} from './utils/accBasic';

const errorText = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

type AccBasicPageProps = {
  selectedModule: ModuleItem;
  currentMenuName: string;
  content: PageContent;
  breadcrumbItems?: string[];
  selectedMenuPermissions?: MenuPermission;
};

const MONO = { fontFamily: 'ui-monospace, Consolas, monospace', fontSize: 12 } as const;
const smallBtn = { minWidth: 0, px: 1, py: 0.1, fontSize: 12, whiteSpace: 'nowrap' } as const;
const gridProps = {
  height: '100%', maxHeight: '100%', rowHeight: 38, minRowHeight: 38, maxRowHeight: 320, columnLine: true, showCheckbox: false,
  resizableRows: false, allowAddRowInContextMenu: false, allowDuplicateRowInContextMenu: false, allowDeleteRowInContextMenu: false,
} as const;
const dim = (active: number) => (active ? undefined : { opacity: 0.55 });
const empty = (text = '') => <Box component="span" sx={{ color: 'text.disabled' }}>{text}</Box>;

// 인사·회계 > 기초회계정보 (송연 #screen-acc-basic · 31-acc-basic.js · accounting.py)
// 계정과목 · 계좌 · 카드를 미리 적어두면 입금 · 출금을 적을 때 골라 쓸 수 있다. 회계의 바닥이라 여기부터 만든다.
// 지우기보다 '사용안함': 쓰던 것을 지우면 그것으로 적어둔 지난 전표가 무엇이었는지 알 수 없게 된다.
export function AccBasicPage({ selectedModule, currentMenuName, content, breadcrumbItems }: AccBasicPageProps) {
  const ask = useAsk('기초회계정보');
  const [tab, setTab] = useState<AccKind>('subject');
  const [subjects, setSubjects] = useState<AccSubject[]>([]);
  const [banks, setBanks] = useState<AccBank[]>([]);
  const [cards, setCards] = useState<AccCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');
  const [hideOff, setHideOff] = useState(true);
  const [target, setTarget] = useState<AccTarget | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAccBasic();
      setSubjects(data.subjects);
      setBanks(data.banks);
      setCards(data.cards);
    } catch {
      setSubjects([]);
      setBanks([]);
      setCards([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // 켜고 끄는 것을 눌러서 바로 되게 한다(창을 열어 체크를 풀고 저장하게 하면 몇 개만 내리려 해도 그때마다 창을 여닫아야 한다)
  const toggle = async (kind: AccKind, r: AccRow) => {
    try {
      await saveAcc(kind, r.id, toggledBody(kind, r));
    } catch (requestError) {
      await ask.alert(errorText(requestError, '바꾸지 못했어요'));
      return;
    }
    void load();
  };

  const remove = async (kind: AccKind, r: AccRow) => {
    if (!(await ask.confirm(deleteConfirmText(rowName(kind, r)), true))) return;
    try {
      await deleteAcc(kind, r.id);
    } catch (requestError) {
      await ask.alert(errorText(requestError, '지우지 못했어요'));
      return;
    }
    void load();
  };

  const onOff = (kind: AccKind, r: AccRow) => (
    <Button size="small" variant="outlined" color={r.active ? 'success' : 'inherit'} sx={smallBtn} aria-label={`${rowName(kind, r)} 사용 켜고 끄기`}
      onClick={() => void toggle(kind, r)}>{r.active ? '사용' : '사용안함'}</Button>
  );
  const actions = (kind: AccKind, r: AccRow) => (
    <Box sx={{ display: 'flex', gap: 0.5 }}>
      <Button size="small" variant="outlined" sx={smallBtn} onClick={() => setTarget({ kind, row: r })}>고치기</Button>
      <Button size="small" variant="outlined" color="error" sx={smallBtn} onClick={() => void remove(kind, r)}>삭제</Button>
    </Box>
  );

  const shownSubjects = useMemo(() => filterSubjects(subjects, q, hideOff), [subjects, q, hideOff]);

  const subjectColumns: F1GridColumn<AccSubject>[] = [
    { field: 'id', type: 'rownumber', width: 60, headerName: '순번', headerAlign: 'center', align: 'center', pinned: 'left' },
    { field: 'code', headerName: '코드', width: 90, headerAlign: 'center', align: 'center', getCellStyle: ({ row }) => dim(row.active), renderCell: ({ row }) => <Box component="span" sx={MONO}>{row.code}</Box> },
    { field: 'name', headerName: '계정과목', width: 200, headerAlign: 'center', align: 'left', getCellStyle: ({ row }) => dim(row.active), renderCell: ({ row }) => <Box component="span" sx={{ fontWeight: 700 }}>{row.name}</Box> },
    { field: 'category', headerName: '구분', width: 90, headerAlign: 'center', align: 'center', getCellStyle: ({ row }) => dim(row.active), renderCell: ({ row }) => row.category || '' },
    { field: 'direction', headerName: '증가할 때', width: 100, headerAlign: 'center', align: 'center', getCellStyle: ({ row }) => dim(row.active), renderCell: ({ row }) => row.direction || '' },
    { field: 'note', headerName: '비고', flex: 1, width: 200, headerAlign: 'center', align: 'left', getCellStyle: ({ row }) => dim(row.active), renderCell: ({ row }) => row.note || empty() },
    { field: 'active', headerName: '사용', width: 100, headerAlign: 'center', align: 'center', renderCell: ({ row }) => onOff('subject', row) },
    { field: 'sortOrder', headerName: '', width: 130, headerAlign: 'center', align: 'center', renderCell: ({ row }) => actions('subject', row) },
  ];
  const bankColumns: F1GridColumn<AccBank>[] = [
    { field: 'id', type: 'rownumber', width: 60, headerName: '순번', headerAlign: 'center', align: 'center', pinned: 'left' },
    { field: 'bankName', headerName: '은행', width: 140, headerAlign: 'center', align: 'left', getCellStyle: ({ row }) => dim(row.active), renderCell: ({ row }) => <Box component="span" sx={{ fontWeight: 700 }}>{row.bankName}</Box> },
    { field: 'accountNo', headerName: '계좌번호', width: 180, headerAlign: 'center', align: 'left', getCellStyle: ({ row }) => dim(row.active), renderCell: ({ row }) => <Box component="span" sx={MONO}>{row.accountNo}</Box> },
    { field: 'holder', headerName: '예금주', width: 140, headerAlign: 'center', align: 'left', getCellStyle: ({ row }) => dim(row.active), renderCell: ({ row }) => row.holder || '' },
    { field: 'purpose', headerName: '용도', width: 180, headerAlign: 'center', align: 'left', getCellStyle: ({ row }) => dim(row.active), renderCell: ({ row }) => row.purpose || empty() },
    { field: 'note', headerName: '비고', flex: 1, width: 180, headerAlign: 'center', align: 'left', getCellStyle: ({ row }) => dim(row.active), renderCell: ({ row }) => row.note || empty() },
    { field: 'active', headerName: '사용', width: 100, headerAlign: 'center', align: 'center', renderCell: ({ row }) => onOff('bank', row) },
    { field: 'sortOrder', headerName: '', width: 130, headerAlign: 'center', align: 'center', renderCell: ({ row }) => actions('bank', row) },
  ];
  const cardColumns: F1GridColumn<AccCard>[] = [
    { field: 'id', type: 'rownumber', width: 60, headerName: '순번', headerAlign: 'center', align: 'center', pinned: 'left' },
    { field: 'issuer', headerName: '카드사', width: 120, headerAlign: 'center', align: 'left', getCellStyle: ({ row }) => dim(row.active), renderCell: ({ row }) => <Box component="span" sx={{ fontWeight: 700 }}>{row.issuer}</Box> },
    { field: 'last4', headerName: '카드번호', width: 180, headerAlign: 'center', align: 'left', getCellStyle: ({ row }) => dim(row.active), renderCell: ({ row }) => <Box component="span" sx={MONO}>{cardNumberText(row.last4)}</Box> },
    { field: 'nickname', headerName: '카드 이름', width: 180, headerAlign: 'center', align: 'left', getCellStyle: ({ row }) => dim(row.active), renderCell: ({ row }) => row.nickname || empty() },
    { field: 'holder', headerName: '명의', width: 130, headerAlign: 'center', align: 'left', getCellStyle: ({ row }) => dim(row.active), renderCell: ({ row }) => row.holder || '' },
    { field: 'payBank', headerName: '결제계좌', flex: 1, width: 220, headerAlign: 'center', align: 'left', getCellStyle: ({ row }) => dim(row.active), renderCell: ({ row }) => payAccountText(row) || empty('안 정함') },
    { field: 'active', headerName: '사용', width: 100, headerAlign: 'center', align: 'center', renderCell: ({ row }) => onOff('card', row) },
    { field: 'sortOrder', headerName: '', width: 130, headerAlign: 'center', align: 'center', renderCell: ({ row }) => actions('card', row) },
  ];

  const pageActionGroups: PermissionActionGroupDefinition[] = [
    { key: 'acc', actions: [{ label: `${KIND_LABEL[tab]} 추가`, icon: AddIcon, visible: true, onClick: () => setTarget({ kind: tab, row: null }) }] },
  ];

  const note = (children: ReactNode) => <Typography sx={{ fontSize: 12.5, mb: 1, lineHeight: 1.7 }}>{children}</Typography>;
  const cardSx = { borderRadius: 1, border: '1px solid rgba(148,163,184,0.18)', boxShadow: 'none', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', p: 1.5 } as const;
  const gridBox = { flex: 1, minHeight: 200, overflow: 'hidden' } as const;

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%' }}>
      <PageHeader
        breadcrumbItems={breadcrumbItems && breadcrumbItems.length > 0 ? breadcrumbItems : [selectedModule.name, currentMenuName]}
        description={content.description}
        actionGroups={pageActionGroups}
      />
      <Box sx={{ px: { xs: 1.5, sm: 2 }, borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tab} onChange={(_event, value: AccKind) => setTab(value)} aria-label="기초회계정보 탭">
          <Tab value="subject" label="계정과목등록" />
          <Tab value="bank" label="계좌등록" />
          <Tab value="card" label="카드등록" />
        </Tabs>
      </Box>
      <Box sx={{ p: { xs: 1.5, sm: 1 }, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Card sx={cardSx}>
          {tab === 'subject' && (
            <>
              {note(<>처음 켤 때 흔히 쓰는 것을 깔아뒀어요. 회사에 맞게 고치거나 더 넣어주세요. <b>한 번이라도 쓴 계정은 지우지 말고 '사용안함'</b> 으로 내려주세요 — 지우면 지난 전표가 어느 계정인지 알 수 없게 돼요.</>)}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <TextField size="small" margin="none" placeholder="계정과목 · 코드 검색" value={q} onChange={(event) => setQ(event.target.value)} sx={{ width: 200 }}
                  slotProps={{ htmlInput: { 'aria-label': '계정과목 · 코드 검색' } }} />
                <FormControlLabel sx={{ ml: 0.5 }} control={<Checkbox size="small" checked={hideOff} onChange={(event) => setHideOff(event.target.checked)} />}
                  label={<Typography sx={{ fontSize: 12.5 }}>사용안함 숨기기</Typography>} />
              </Box>
              <Box sx={gridBox}>
                <F1Grid rows={shownSubjects} columns={subjectColumns} rowKey="id" storageKey="ha-acc-subject-grid" ariaLabel="F1-GRID 계정과목" loading={loading} {...gridProps} />
              </Box>
            </>
          )}
          {tab === 'bank' && (
            <>
              {note('입금·출금을 적을 때 고를 계좌예요. 세금계산서·거래명세표에 찍히는 번호이기도 해요.')}
              <Box sx={gridBox}>
                <F1Grid rows={banks} columns={bankColumns} rowKey="id" storageKey="ha-acc-bank-grid" ariaLabel="F1-GRID 계좌" loading={loading} {...gridProps} />
              </Box>
            </>
          )}
          {tab === 'card' && (
            <>
              {note(<><b>카드번호는 뒤 4자리만 적어요.</b> 카드 매입명세를 맞춰볼 때 쓰는 것이 뒤 4자리라, 앞자리는 쓰지도 않으면서 새어나갈 위험만 있어서 아예 받지 않아요.</>)}
              <Box sx={gridBox}>
                <F1Grid rows={cards} columns={cardColumns} rowKey="id" storageKey="ha-acc-card-grid" ariaLabel="F1-GRID 카드" loading={loading} {...gridProps} />
              </Box>
            </>
          )}
        </Card>
      </Box>
      <AccBasicDialog target={target} banks={banks} onClose={() => setTarget(null)} onSaved={() => { setTarget(null); void load(); }} />
      {ask.node}
    </Box>
  );
}

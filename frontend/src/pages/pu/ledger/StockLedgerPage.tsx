import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Box, Card, Chip, IconButton, MenuItem, Popover, Tab, Tabs, TextField, Typography, styled } from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import NoteAddIcon from '@mui/icons-material/NoteAdd';
import PaidIcon from '@mui/icons-material/Paid';
import SearchIcon from '@mui/icons-material/Search';
import { PageHeader } from '../../../shared/components/PageHeader';
import { type PermissionActionGroupDefinition } from '../../../shared/components/PermissionGroup';
import { PageSearchArea } from '../../../shared/components/PageSearchArea';
import { F1Grid, type F1GridColumn } from '../../../shared/components/f1-grid';
import { downloadExcel, todayDash } from '../../../shared/utils/excelFile';
import { cellInputProps } from '../../../shared/utils/gridCellInput';
import type { MenuPermission, ModuleItem, PageContent } from '../../dashboard/types/dashboard';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { fetchVendors } from '../../co/master/material-master/services/materialMaster.service';
import { LedgerVendorDialog } from './components/LedgerVendorDialog';
import { StockValueDialog } from './components/StockValueDialog';
import { fetchLedger, fetchStockAsOf, registerLedgerOrders } from './services/stockLedger.service';
import {
  STOCK_AS_OF_EXCEL_COLUMNS, adjustTitle, dateRangeList, dayLabel, draftItems, draftKey, emptyText, filterRows, ledgerNum,
  orderCellValue, registeredMessage, whQtyText,
  type DraftItem, type LedgerFilter, type LedgerKind, type LedgerRow,
} from './utils/stockLedger';

const errorText = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

type StockLedgerPageProps = {
  selectedModule: ModuleItem;
  currentMenuName: string;
  content: PageContent;
  breadcrumbItems?: string[];
  selectedMenuPermissions?: MenuPermission;
};
// 표에 넣는 줄: 날짜별 칸을 'u{n}'(사용량) · 'o{n}'(발주량, 정렬용 숫자) · 'ot{n}'(발주량 칸 글자)로 펼친다.
// n 은 기간 안 몇 번째 날인지다 — 날짜를 칸 이름에 넣으면 기간을 바꿀 때 저장된 칸 순서와 어긋나 새 날짜 칸이 맨 뒤로 밀린다
type GridRow = LedgerRow & Record<string, unknown>;

const searchFieldSx = (theme: { palette: { mode: string } }) => ({
  height: 40,
  '& .MuiOutlinedInput-root': {
    height: '100%',
    borderRadius: '0 8px 8px 0',
    backgroundColor: theme.palette.mode === 'dark' ? 'rgba(15, 23, 42, 0.72)' : 'rgba(255,255,255,0.72)',
  },
});
const sideFieldSx = (theme: { palette: { mode: string } }) => ({
  ...searchFieldSx(theme),
  '& .MuiOutlinedInput-root': { ...searchFieldSx(theme)['& .MuiOutlinedInput-root'], borderRadius: '8px' },
});
const GOLD = 'rgba(245, 158, 11, 0.12)';

// 발주량 칸. 칸 수가 '줄 × 날짜' 만큼이라 칸마다 sx 를 만들지 않고 스타일을 한 번만 정의한다
const OrderCell = styled('span')({ display: 'flex', alignItems: 'center', gap: 2 });
const OrderInput = styled('input')(({ theme }) => ({
  width: 72,
  height: 26,
  boxSizing: 'border-box',
  padding: '3px 6px',
  fontSize: 12,
  textAlign: 'right',
  fontFamily: 'inherit',
  color: theme.palette.text.primary,
  background: theme.palette.background.paper,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 5,
  outline: 'none',
  '&:focus': { borderColor: theme.palette.primary.main, boxShadow: `0 0 0 1px ${theme.palette.primary.main}` },
  '&::placeholder': { color: theme.palette.text.disabled },
  // 숫자칸 위아래 단추는 좁은 칸을 가려서 숨긴다(송연 no-spin)
  '&::-webkit-outer-spin-button, &::-webkit-inner-spin-button': { WebkitAppearance: 'none', margin: 0 },
  MozAppearance: 'textfield',
}));
const OrderMark = styled('span')(({ theme }) => ({ width: 12, color: theme.palette.success.main, fontWeight: 700, fontSize: 12 }));
const LockedQty = styled('span')({ fontWeight: 700 });
const RED = '#dc2626';

// 구매관리 > 수불대장 (송연 #screen-purchase · 18-stock.js 600-1139)
// 탭 두 개(원재료수불대장 · 부자재수불대장)는 표 모양과 계산이 같고 어느 쪽을 보여줄지만 다르다 — 자료는 한 번만 받는다.
// 발주량 칸에 적고 [발주 등록] 을 누르면 업체별로 나눠 발주된다. 이미 발주한 칸은 잠긴다(지우려면 발주등록에서).
export function StockLedgerPage({
  selectedModule,
  currentMenuName,
  content,
  breadcrumbItems,
  selectedMenuPermissions,
}: StockLedgerPageProps) {
  const requestIdRef = useRef(0);
  const [kind, setKind] = useState<LedgerKind>('material');
  const [start, setStart] = useState(() => todayDash());
  const [end, setEnd] = useState(() => todayDash());
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<LedgerFilter>('used');
  const [exportDate, setExportDate] = useState('');
  const [dates, setDates] = useState<string[]>([]);
  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  // 적어둔 발주량(저장 전) · ✓ 표시. 키는 '원재료코드|날짜' — 검색어를 바꿔 다시 그려도 적던 숫자가 날아가지 않게 따로 든다
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [marked, setMarked] = useState<Record<string, boolean>>({});
  const [vendors, setVendors] = useState<string[]>([]);
  const [ordering, setOrdering] = useState<DraftItem[] | null>(null);
  const [valueOpen, setValueOpen] = useState(false);
  const [lens, setLens] = useState<{ anchor: HTMLElement; row: LedgerRow } | null>(null);
  const [alertText, setAlertText] = useState<string | null>(null);

  const load = useCallback(async (from: string, to: string) => {
    if (!from || !to) return;
    if (to < from) {
      setAlertText('종료일이 시작일보다 빠를 수 없어요');
      return;
    }
    const requestId = ++requestIdRef.current;
    setLoading(true);
    try {
      const list = await fetchLedger(from, to);
      if (requestId !== requestIdRef.current) return;
      setDates(dateRangeList(from, to));
      setRows(list);
      setLoaded(true);
    } catch (requestError) {
      if (requestId === requestIdRef.current) setAlertText(errorText(requestError, '수불대장을 불러오지 못했어요'));
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const today = todayDash();
    void load(today, today);
    fetchVendors().then((list) => setVendors(list.map((v) => v.name).filter(Boolean))).catch(() => undefined);
  }, [load]);

  const switchKind = (next: LedgerKind) => {
    setKind(next);
    // 부자재는 '생산스케줄 사용' 으로 걸러두면 거의 안 보인다(필름·파우치는 배합표에 없다) — 전체로 바꿔준다
    if (next === 'submaterial' && mode === 'used') setMode('all');
  };

  const gridRows = useMemo<GridRow[]>(() => filterRows(rows, kind, query, mode).map((row) => {
    const flat: GridRow = { ...row };
    dates.forEach((d, i) => {
      flat[`u${i}`] = row.usageByDate?.[d] ?? 0;
      const ordered = row.orderByDate?.[d];
      flat[`ot${i}`] = orderCellValue(row, d, i, drafts);
      flat[`o${i}`] = ordered != null && ordered !== 0 ? ordered : parseFloat(drafts[draftKey(row.code, d)] ?? '') || 0;
    });
    return flat;
  }), [rows, kind, query, mode, dates, drafts]);

  const setDraft = (key: string, value: string) => setDrafts((current) => {
    const next = { ...current };
    if (value.trim() === '') delete next[key];
    else next[key] = value;
    return next;
  });

  // ✓ 는 '이 칸은 다 적었다' 는 표시 — 칸에서 손을 떼는 순간 켜진다(엔터·마우스·탭 모두). 값이 비거나 0 이면 끈다
  const mark = (key: string, value: string) => setMarked((current) => {
    const next = { ...current };
    if (value.trim() !== '' && parseFloat(value) > 0) next[key] = true;
    else delete next[key];
    return next;
  });

  // 엔터: 표시를 켜고 엑셀처럼 같은 날짜 칸을 따라 아랫줄로 내려간다. 여기서 바로 발주를 내보내지는 않는다
  const onOrderKeyDown = (event: KeyboardEvent<HTMLInputElement>, key: string, date: string) => {
    event.stopPropagation();
    if (event.key !== 'Enter') return;
    event.preventDefault();
    const input = event.currentTarget;
    mark(key, input.value);
    const all = Array.from(document.querySelectorAll<HTMLInputElement>(`input[data-ledger-date="${date}"]`));
    const nextInput = all[all.indexOf(input) + 1];
    if (nextInput) {
      nextInput.focus();
      nextInput.select();
    }
  };

  const columns = useMemo<F1GridColumn<GridRow>[]>(() => {
    const dayColumns: F1GridColumn<GridRow>[] = dates.flatMap((d, i) => [
      {
        field: `u${i}`, headerName: '사용량', headerGroup: dayLabel(d), width: 80, headerAlign: 'center', align: 'right',
        renderCell: ({ row }) => ledgerNum(row[`u${i}`] as number),
        getCellStyle: ({ row }) => ((row[`u${i}`] as number) > 0 ? { color: RED } : undefined),
      } as F1GridColumn<GridRow>,
      {
        field: `o${i}`, headerName: '발주량', headerGroup: dayLabel(d), width: 100, headerAlign: 'center', align: 'right',
        getCellStyle: () => ({ backgroundColor: GOLD }),
        renderCell: ({ row }) => {
          const ordered = row.orderByDate?.[d];
          // 이미 발주한 칸은 잠근다 — 발주는 이미 업체에 나간 약속이라 여기서 고치면 실제 발주와 화면이 어긋난다
          if (ordered) {
            return <LockedQty title="이미 발주된 수량이에요. 발주등록 화면에서 지울 수 있어요.">{ledgerNum(ordered)} 🔒</LockedQty>;
          }
          const key = draftKey(row.code, d);
          const text = String(row[`ot${i}`] ?? '');
          // MUI TextField 대신 가벼운 input 을 쓴다 — 칸마다 TextField 를 두면 날짜가 길 때 그리기가 몇 초씩 걸려
          // 좌우로 스크롤하면 새 칸이 늦게 나타났다(스타일은 아래 OrderInput 에 한 번만 정의)
          return (
            <OrderCell {...cellInputProps}>
              <OrderInput
                type="number" step="0.01" value={text} placeholder="0"
                title="적고 엔터를 누르면 ✓ 가 켜지고 아랫줄로 내려가요"
                data-ledger-date={d} data-ledger-code={row.code} aria-label={`${row.name} ${d} 발주량`}
                onChange={(event) => setDraft(key, event.target.value)}
                onBlur={(event) => mark(key, event.target.value)}
                onKeyDown={(event) => onOrderKeyDown(event, key, d)}
              />
              <OrderMark>{marked[key] && text.trim() !== '' ? '✓' : ''}</OrderMark>
            </OrderCell>
          );
        },
      } as F1GridColumn<GridRow>,
    ]);
    return [
      { field: 'code', type: 'rownumber', width: 56, headerName: '순번', headerAlign: 'center', align: 'center', pinned: 'left' },
      {
        field: 'name', headerName: kind === 'submaterial' ? '부자재' : '원재료', width: 220, headerAlign: 'center', align: 'left', pinned: 'left',
        renderCell: ({ row }) => (
          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', minWidth: 0 }}>
            <span>{row.name || ''}</span>
            {row.belowSafety ? <Chip size="small" color="warning" variant="outlined" label="부족" /> : null}
          </Box>
        ),
      },
      { field: 'spec', headerName: '규격', width: 110, headerAlign: 'center', align: 'left', renderCell: ({ row }) => row.spec || '' },
      {
        field: 'safetyStock', headerName: '안전재고', width: 84, headerAlign: 'center', align: 'right', renderCell: ({ row }) => ledgerNum(row.safetyStock),
        getCellStyle: ({ row }) => (row.belowSafety ? { color: '#d97706', fontWeight: 700 } : undefined),
      },
      { field: 'baseStock', headerName: '전일재고', width: 90, headerAlign: 'center', align: 'right', renderCell: ({ row }) => ledgerNum(row.baseStock) },
      ...dayColumns,
      {
        field: 'totalReceiving', headerName: '총입고량', width: 90, headerAlign: 'center', align: 'right', renderCell: ({ row }) => ledgerNum(row.totalReceiving),
        getCellStyle: ({ row }) => ((row.totalReceiving || 0) > 0 ? { color: '#2563eb' } : undefined),
      },
      {
        field: 'remainingStock', headerName: '남은재고', width: 130, headerAlign: 'center', align: 'right',
        getCellStyle: ({ row }) => ({ fontWeight: 700, ...((row.remainingStock || 0) < 0 ? { color: RED } : {}) }),
        renderCell: ({ row }) => (
          <Box component="span" title={adjustTitle(row)} sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
            {ledgerNum(row.remainingStock)}
            {/* 그 날 재고조사를 했으면 남은재고가 조사한 값이 되고 '조사' 가 붙는다 */}
            {row.totalAdjust ? <Chip size="small" label="조사" sx={{ height: 18, fontSize: 10 }} /> : null}
            {/* 창고별로 얼마씩 있는지는 눌렀을 때만 편다(창고가 하나뿐이면 갈라 보여줄 것이 없다) */}
            {(row.warehouseStock?.length ?? 0) >= 2 && (
              <IconButton size="small" aria-label={`${row.name} 창고별로 보기`} title="창고별로 보기" sx={{ p: 0.25, fontSize: 12, opacity: 0.6 }}
                onClick={(event) => { event.stopPropagation(); setLens({ anchor: event.currentTarget, row }); }}>
                🔍
              </IconButton>
            )}
          </Box>
        ),
      },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dates, marked, kind]);

  const draftCount = useMemo(() => draftItems(drafts, rows).length, [drafts, rows]);

  const startOrder = () => {
    const items = draftItems(drafts, rows);
    if (items.length === 0) {
      setAlertText('발주량을 적은 품목이 없어요');
      return;
    }
    setOrdering(items);
  };

  const submitOrders = async (items: DraftItem[]) => {
    setOrdering(null);
    try {
      const registered = await registerLedgerOrders(items);
      // 넘어간 것만 지운다. 남은 것이 있으면 그 칸은 그대로 두어야 한다
      const keys = new Set(items.map((it) => draftKey(it.materialCode, it.orderDate)));
      setDrafts((current) => Object.fromEntries(Object.entries(current).filter(([key]) => !keys.has(key))));
      setMarked((current) => Object.fromEntries(Object.entries(current).filter(([key]) => !keys.has(key))));
      setAlertText(registeredMessage(registered));
      void load(start, end);
    } catch (requestError) {
      setAlertText(errorText(requestError, '발주 등록에 실패했어요'));
    }
  };

  const exportStock = async () => {
    try {
      const data = await fetchStockAsOf(exportDate);
      await downloadExcel(data.materials, STOCK_AS_OF_EXCEL_COLUMNS, `구매재고_${data.date}.xlsx`, '구매재고');
    } catch {
      setAlertText('재고 조회에 실패했어요');
    }
  };

  const canRead = Boolean(selectedMenuPermissions?.read);
  const pageActionGroups: PermissionActionGroupDefinition[] = [
    {
      key: 'read',
      actions: [
        { label: '조회', icon: SearchIcon, visible: canRead, disabled: loading, onClick: () => void load(start, end) },
        { label: '재고 내려받기', icon: FileDownloadIcon, visible: Boolean(selectedMenuPermissions?.excel || canRead), onClick: () => void exportStock() },
        { label: '재고금액 조회', icon: PaidIcon, visible: canRead, onClick: () => setValueOpen(true) },
      ],
    },
    {
      key: 'write',
      actions: [{ label: '발주 등록', icon: NoteAddIcon, visible: Boolean(selectedMenuPermissions?.create), onClick: startOrder }],
    },
  ];

  const lensRow = lens?.row;
  const lensSum = (lensRow?.warehouseStock ?? []).reduce((sum, w) => sum + Number(w.qty || 0), 0);

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%' }}>
      <PageHeader
        breadcrumbItems={breadcrumbItems && breadcrumbItems.length > 0 ? breadcrumbItems : [selectedModule.name, currentMenuName]}
        description={content.description}
        actionGroups={pageActionGroups}
      />
      <Box sx={{ px: { xs: 1.5, sm: 2 }, borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={kind} onChange={(_event, value: LedgerKind) => switchKind(value)} aria-label="수불대장 탭">
          <Tab value="material" label="원재료수불대장" />
          <Tab value="submaterial" label="부자재수불대장" />
        </Tabs>
      </Box>
      <PageSearchArea
        searchField={
          <TextField
            size="small" margin="none" placeholder={kind === 'submaterial' ? '부자재명 · 코드 검색' : '원재료명 · 코드 검색'}
            value={query} onChange={(event) => setQuery(event.target.value)}
            slotProps={{ htmlInput: { 'aria-label': '원재료 검색' } }} sx={(theme) => ({ width: '100%', ...searchFieldSx(theme) })}
          />
        }
        onDefaultSearch={() => void load(start, end)}
      >
        <TextField
          select size="small" margin="none" value={mode} onChange={(event) => setMode(event.target.value as LedgerFilter)}
          slotProps={{ htmlInput: { 'aria-label': '보기' } }} sx={(theme) => ({ width: { xs: '100%', sm: 200 }, ...sideFieldSx(theme) })}
        >
          <MenuItem value="used">생산스케줄 사용 원재료</MenuItem>
          <MenuItem value="nonzero">남은재고량 0 제외</MenuItem>
          <MenuItem value="all">전체</MenuItem>
        </TextField>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TextField type="date" size="small" margin="none" value={start} onChange={(event) => setStart(event.target.value)}
            slotProps={{ htmlInput: { 'aria-label': '시작일' } }} sx={(theme) => ({ width: 170, ...sideFieldSx(theme) })} />
          <Typography variant="body2" color="text.secondary">~</Typography>
          <TextField type="date" size="small" margin="none" value={end} onChange={(event) => setEnd(event.target.value)}
            slotProps={{ htmlInput: { 'aria-label': '종료일' } }} sx={(theme) => ({ width: 170, ...sideFieldSx(theme) })} />
        </Box>
        <TextField type="date" size="small" margin="none" value={exportDate} onChange={(event) => setExportDate(event.target.value)}
          title="재고 내려받기 기준일 (비워두면 오늘)"
          slotProps={{ htmlInput: { 'aria-label': '재고 기준일' } }} sx={(theme) => ({ width: 170, ...sideFieldSx(theme) })} />
      </PageSearchArea>
      <Box sx={{ p: { xs: 1.5, sm: 1 }, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Card sx={{ borderRadius: 1, border: '1px solid rgba(148,163,184,0.18)', boxShadow: 'none', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', p: 1.5 }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', mb: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
              발주량 칸에 수량을 적고 <b>발주 등록</b>을 누르면 업체별로 나눠 발주됩니다. 안전재고보다 적은 원재료는 기초발주량이 미리 채워집니다.
              <b> 이미 발주한 칸은 잠깁니다 — 지우려면 발주등록 화면에서 지워주세요.</b>
              <br />
              사용량은 쓴 양 그대로 적습니다(마이너스 없음). 남은재고 = 전일재고 − 사용량 + 입고량.
              그 날 재고조사를 했으면 남은재고가 <b>조사한 값</b>이 되고 &lsquo;조사&rsquo; 가 붙습니다.
            </Typography>
            <Typography sx={{ fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap' }} aria-label="적어둔 발주">{draftCount ? `${draftCount}건 적었어요` : ''}</Typography>
          </Box>
          {loaded && !loading && gridRows.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{emptyText(kind, mode)}</Typography>
          )}
          <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
            <F1Grid
              key={dates.join(',')}
              rows={gridRows} columns={columns} rowKey="code" storageKey={`pu-ledger-grid-${dates.length}`} ariaLabel="F1-GRID 수불대장"
              height="100%" maxHeight="100%" rowHeight={36} minRowHeight={36} maxRowHeight={320} columnLine showCheckbox={false}
              loading={loading} resizableRows={false} allowAddRowInContextMenu={false} allowDuplicateRowInContextMenu={false} allowDeleteRowInContextMenu={false}
              // 가로 가상화(보이는 칸만 그리기)를 끈다. 칸마다 발주량 입력칸이 있어 그리기가 무거워, 좌우로 스크롤하면
              // 새로 보이는 날짜 칸이 그려지기 전까지 잠깐 비어 보였다. 칸은 많아야 '날 수 × 2 + 7' 개라 처음에 다 그려둔다
              virtualizeColumns={false}
            />
          </Box>
        </Card>
      </Box>
      <Popover open={lens != null} anchorEl={lens?.anchor} onClose={() => setLens(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}>
        {lensRow && (
          <Box sx={{ p: 1.5, minWidth: 200, fontSize: 12 }} aria-label="창고별 재고">
            <Typography sx={{ fontWeight: 700, fontSize: 13, mb: 0.75 }}>{lensRow.name}</Typography>
            {(lensRow.warehouseStock ?? []).map((w) => (
              <Box key={w.name} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, py: 0.25 }}>
                <span>{w.name}</span>
                <Box component="span" sx={{ fontWeight: 700, color: Number(w.qty) ? 'text.primary' : 'text.secondary' }}>{whQtyText(w.qty)} {lensRow.unitNm || 'kg'}</Box>
              </Box>
            ))}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, pt: 0.75, mt: 0.75, borderTop: 1, borderColor: 'divider' }}>
              <Box component="span" sx={{ color: 'text.secondary' }}>합계</Box>
              <Box component="span" sx={{ fontWeight: 700 }}>{ledgerNum(lensSum)} {lensRow.unitNm || 'kg'}</Box>
            </Box>
          </Box>
        )}
      </Popover>
      <LedgerVendorDialog items={ordering} vendors={vendors} onClose={() => setOrdering(null)} onSubmit={(items) => void submitOrders(items)} />
      <StockValueDialog open={valueOpen} onClose={() => setValueOpen(false)} />
      <ConfirmDialog open={alertText != null} title="수불대장" message={alertText ?? ''} alertOnly
        onCancel={() => setAlertText(null)} onConfirm={() => setAlertText(null)} />
    </Box>
  );
}

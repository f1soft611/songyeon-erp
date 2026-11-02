import type { KeyboardEvent } from 'react';
import { Box, Chip, IconButton, styled } from '@mui/material';
import { F1Grid, type F1GridColumn } from '../../../../../shared/components/f1-grid';
import { cellInputProps } from '../../../../../shared/utils/gridCellInput';
import type { LedgerGridRow, LedgerKind, LedgerRow } from '../types/stockLedger.types';
import { adjustTitle, dayLabel, draftKey, ledgerNum } from '../utils/stockLedger';

const GOLD = 'rgba(245, 158, 11, 0.12)';
const RED = '#dc2626';

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

type StockLedgerColumnOptions = {
  dates: string[];
  kind: LedgerKind;
  marked: Record<string, boolean>;
  onDraftChange: (key: string, value: string) => void;
  onDraftBlur: (key: string, value: string) => void;
  onOrderKeyDown: (event: KeyboardEvent<HTMLInputElement>, key: string, date: string) => void;
  onOpenLens: (anchor: HTMLElement, row: LedgerRow) => void;
};

// 수불대장 칸: 품목 · 전일재고, 날짜마다 사용량 · 발주량, 총입고량 · 남은재고
export function createStockLedgerColumns({
  dates,
  kind,
  marked,
  onDraftChange,
  onDraftBlur,
  onOrderKeyDown,
  onOpenLens,
}: StockLedgerColumnOptions): F1GridColumn<LedgerGridRow>[] {
  const dayColumns = dates.flatMap((d, i): F1GridColumn<LedgerGridRow>[] => [
    {
      field: `u${i}`,
      headerName: '사용량',
      headerGroup: dayLabel(d),
      width: 80,
      headerAlign: 'center',
      align: 'right',
      renderCell: ({ row }) => ledgerNum(row[`u${i}`] as number),
      getCellStyle: ({ row }) => ((row[`u${i}`] as number) > 0 ? { color: RED } : undefined),
    },
    {
      field: `o${i}`,
      headerName: '발주량',
      headerGroup: dayLabel(d),
      width: 100,
      headerAlign: 'center',
      align: 'right',
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
        // 좌우로 스크롤하면 새 칸이 늦게 나타났다(스타일은 위 OrderInput 에 한 번만 정의)
        return (
          <OrderCell {...cellInputProps}>
            <OrderInput
              type="number"
              step="0.01"
              value={text}
              placeholder="0"
              title="적고 엔터를 누르면 ✓ 가 켜지고 아랫줄로 내려가요"
              data-ledger-date={d}
              data-ledger-code={row.code}
              aria-label={`${row.name} ${d} 발주량`}
              onChange={(event) => onDraftChange(key, event.target.value)}
              onBlur={(event) => onDraftBlur(key, event.target.value)}
              onKeyDown={(event) => onOrderKeyDown(event, key, d)}
            />
            <OrderMark>{marked[key] && text.trim() !== '' ? '✓' : ''}</OrderMark>
          </OrderCell>
        );
      },
    },
  ]);

  return [
    {
      field: 'code',
      type: 'rownumber',
      width: 56,
      headerName: 'No',
      align: 'center',
      pinned: 'left',
    },
    {
      field: 'name',
      headerName: kind === 'submaterial' ? '부자재' : '원재료',
      width: 220,
      align: 'left',
      pinned: 'left',
      renderCell: ({ row }) => (
        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', minWidth: 0 }}>
          <span>{row.name || ''}</span>
          {row.belowSafety ? <Chip size="small" color="warning" variant="outlined" label="부족" /> : null}
        </Box>
      ),
    },
    {
      field: 'spec',
      headerName: '규격',
      width: 110,
      align: 'left',
      renderCell: ({ row }) => row.spec || '',
    },
    {
      field: 'safetyStock',
      headerName: '안전재고',
      width: 84,
      headerAlign: 'center',
      align: 'right',
      renderCell: ({ row }) => ledgerNum(row.safetyStock),
      getCellStyle: ({ row }) => (row.belowSafety ? { color: '#d97706', fontWeight: 700 } : undefined),
    },
    {
      field: 'baseStock',
      headerName: '전일재고',
      width: 90,
      headerAlign: 'center',
      align: 'right',
      renderCell: ({ row }) => ledgerNum(row.baseStock),
    },
    ...dayColumns,
    {
      field: 'totalReceiving',
      headerName: '총입고량',
      width: 90,
      headerAlign: 'center',
      align: 'right',
      renderCell: ({ row }) => ledgerNum(row.totalReceiving),
      getCellStyle: ({ row }) => ((row.totalReceiving || 0) > 0 ? { color: '#2563eb' } : undefined),
    },
    {
      field: 'remainingStock',
      headerName: '남은재고',
      width: 130,
      headerAlign: 'center',
      align: 'right',
      getCellStyle: ({ row }) => ({ fontWeight: 700, ...((row.remainingStock || 0) < 0 ? { color: RED } : {}) }),
      renderCell: ({ row }) => (
        <Box component="span" title={adjustTitle(row)} sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
          {ledgerNum(row.remainingStock)}
          {/* 그 날 재고조사를 했으면 남은재고가 조사한 값이 되고 '조사' 가 붙는다 */}
          {row.totalAdjust ? <Chip size="small" label="조사" sx={{ height: 18, fontSize: 10 }} /> : null}
          {/* 창고별로 얼마씩 있는지는 눌렀을 때만 편다(창고가 하나뿐이면 갈라 보여줄 것이 없다) */}
          {(row.warehouseStock?.length ?? 0) >= 2 && (
            <IconButton
              size="small"
              aria-label={`${row.name} 창고별로 보기`}
              title="창고별로 보기"
              sx={{ p: 0.25, fontSize: 12, opacity: 0.6 }}
              onClick={(event) => {
                event.stopPropagation();
                onOpenLens(event.currentTarget, row);
              }}
            >
              🔍
            </IconButton>
          )}
        </Box>
      ),
    },
  ];
}

type StockLedgerGridProps = {
  rows: LedgerGridRow[];
  columns: F1GridColumn<LedgerGridRow>[];
  loading: boolean;
  dates: string[];
};

export function StockLedgerGrid({ rows, columns, loading, dates }: StockLedgerGridProps) {
  return (
    <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
      <F1Grid
        key={dates.join(',')}
        rows={rows}
        columns={columns}
        rowKey="code"
        storageKey={`pu-ledger-grid-${dates.length}`}
        ariaLabel="F1-GRID 수불대장"
        height="100%"
        maxHeight="100%"
        rowHeight={36}
        minRowHeight={36}
        maxRowHeight={320}
        columnLine
        showCheckbox={false}
        loading={loading}
        resizableRows={false}
        allowAddRowInContextMenu={false}
        allowDuplicateRowInContextMenu={false}
        allowDeleteRowInContextMenu={false}
        // 가로 가상화(보이는 칸만 그리기)를 끈다. 칸마다 발주량 입력칸이 있어 그리기가 무거워, 좌우로 스크롤하면
        // 새로 보이는 날짜 칸이 그려지기 전까지 잠깐 비어 보였다. 칸은 많아야 '날 수 × 2 + 7' 개라 처음에 다 그려둔다
        virtualizeColumns={false}
      />
    </Box>
  );
}

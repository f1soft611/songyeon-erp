import { Box, Button } from '@mui/material';
import { F1Grid, type F1GridColumn } from '../../../../../shared/components/f1-grid';
import type { StockStatusGridRow } from '../types/stockStatus.types';
import { ssPrice, ssQty } from '../utils/stockStatus';

const DANGER = '#dc2626';
// 긴 규격은 한 줄로 자르고 마우스를 올리면 전부 보인다
const ONE_LINE = { display: 'block', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } as const;

type StockStatusColumnOptions = {
  warehouses: string[];
  openCode: string | null;
  openTint: string;
  onToggle: (code: string) => void;
};

// 재고현황 칸: 품목, 창고별 수량, 재고 · 단가 · 재고금액, 입고 로트 펼치기
export function createStockStatusColumns({ warehouses, openCode, openTint, onToggle }: StockStatusColumnOptions): F1GridColumn<StockStatusGridRow>[] {
  // 펼친 줄은 아래 로트 칸과 같은 색으로 칠해 한 덩어리로 보이게 한다
  const tint = ({ row }: { row: StockStatusGridRow }) => (row.code === openCode ? { backgroundColor: openTint } : undefined);
  return [
    {
      field: 'rowNo',
      type: 'rownumber',
      width: 56,
      headerName: 'No',
      align: 'center',
      pinned: 'left',
      getCellStyle: tint,
    },
    {
      field: 'toggle',
      headerName: '',
      width: 36,
      align: 'center',
      pinned: 'left',
      getCellStyle: ({ row }) => ({ color: '#64748b', ...(row.code === openCode ? { backgroundColor: openTint, boxShadow: 'inset 3px 0 0 #2563eb' } : {}) }),
      renderCell: ({ row }) => (row.code === openCode ? '▾' : '▸'),
    },
    // 창고가 늘면 칸이 화면보다 넓어진다. 오른쪽 '입고 로트' 를 눌러도 어느 품목인지 보이게 코드·품목명을 왼쪽에 붙인다
    {
      field: 'code',
      headerName: '코드',
      width: 90,
      align: 'center',
      pinned: 'left',
      getCellStyle: tint,
    },
    {
      field: 'name',
      headerName: '품목명',
      width: 240,
      align: 'left',
      pinned: 'left',
      getCellStyle: (ctx) => ({ ...(ctx.row.code === openCode ? { fontWeight: 700 } : {}), ...tint(ctx) }),
    },
    {
      field: 'spec',
      headerName: '규격',
      width: 150,
      align: 'left',
      getCellStyle: tint,
      renderCell: ({ row }) => <Box component="span" title={row.spec || ''} sx={ONE_LINE}>{row.spec || ''}</Box>,
    },
    // 창고 칸: 0 은 '-' 가 아니라 0 으로 적는다('-' 는 '모른다' 로 읽히는데 여기서는 안다). 0 은 흐리게, 마이너스는 빨갛게
    ...warehouses.map((n, i): F1GridColumn<StockStatusGridRow> => ({
      field: `w${i}`,
      headerName: n,
      width: 90,
      headerAlign: 'center',
      align: 'right',
      renderCell: ({ row }) => ssQty(Number(row[`w${i}`] || 0)),
      getCellStyle: (ctx) => {
        const v = Number(ctx.row[`w${i}`] || 0);
        return { ...tint(ctx), ...(v === 0 ? { color: '#94a3b8' } : {}), ...(v < 0 ? { color: DANGER, fontWeight: 700 } : {}) };
      },
    })),
    {
      field: 'stockQty',
      headerName: '재고',
      width: 110,
      headerAlign: 'center',
      align: 'right',
      renderCell: ({ row }) => ssQty(row.stockQty),
      getCellStyle: (ctx) => ({ fontWeight: 700, ...tint(ctx), ...(Number(ctx.row.stockQty) < 0 ? { color: DANGER } : {}) }),
    },
    {
      field: 'unitPrice',
      headerName: '단가(원)',
      width: 100,
      headerAlign: 'center',
      align: 'right',
      getCellStyle: tint,
      renderCell: ({ row }) => ssPrice(row.unitPrice),
    },
    {
      field: 'amount',
      headerName: '재고금액',
      width: 130,
      headerAlign: 'center',
      align: 'right',
      getCellStyle: tint,
      renderCell: ({ row }) => (row.amount != null ? ssPrice(row.amount) : ''),
    },
    {
      field: 'lots',
      headerName: '입고 로트',
      width: 130,
      align: 'left',
      getCellStyle: tint,
      renderCell: ({ row }) => (
        <Button size="small" sx={{ minWidth: 0, px: 0.5, py: 0, fontWeight: row.code === openCode ? 700 : 400 }} onClick={() => onToggle(row.code)}>
          {row.code === openCode ? '▾ 접기' : '▸ 입고 로트 보기'}
        </Button>
      ),
    },
  ];
}

type StockStatusGridProps = {
  rows: StockStatusGridRow[];
  columns: F1GridColumn<StockStatusGridRow>[];
  loading: boolean;
  warehouses: string[];
};

export function StockStatusGrid({ rows, columns, loading, warehouses }: StockStatusGridProps) {
  return (
    <Box sx={{ flex: 1, minHeight: 160, overflow: 'hidden' }}>
      <F1Grid
        key={warehouses.join(',')}
        rows={rows}
        columns={columns}
        rowKey="code"
        storageKey={`pu-stock-status-grid-${warehouses.length}`}
        ariaLabel="F1-GRID 재고현황"
        height="100%"
        maxHeight="100%"
        rowHeight={34}
        minRowHeight={34}
        maxRowHeight={320}
        columnLine
        showCheckbox={false}
        loading={loading}
        resizableRows={false}
        allowAddRowInContextMenu={false}
        allowDuplicateRowInContextMenu={false}
        allowDeleteRowInContextMenu={false}
      />
    </Box>
  );
}

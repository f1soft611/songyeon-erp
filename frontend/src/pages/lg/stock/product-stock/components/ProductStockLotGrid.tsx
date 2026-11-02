import { Box, Chip } from '@mui/material';
import { F1Grid, type F1GridColumn } from '../../../../../shared/components/f1-grid';
import type { LotRow } from '../types/productStock.types';
import { formatQty, lotText } from '../utils/productStock';

// 로트 칸(보기 전용): 품목명(규격) · 로트번호(없으면 생산일, 생산예정 꼬리표) · 생산량 · 출하량 · 잔량
export function createProductStockLotColumns(): F1GridColumn<LotRow>[] {
  return [
    {
      field: 'key',
      type: 'rownumber',
      width: 56,
      headerName: 'No',
      align: 'center',
      pinned: 'left',
    },
    {
      field: 'productLabel',
      headerName: '품목명(규격)',
      flex: 1.5,
      width: 220,
      align: 'left',
    },
    {
      field: 'lotNo',
      headerName: '로트번호',
      width: 200,
      align: 'left',
      renderCell: ({ row }) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <span>{lotText(row)}</span>
          {row.status === 'planned' && <Chip size="small" color="warning" variant="outlined" label="생산예정" />}
        </Box>
      ),
    },
    {
      field: 'producedQty',
      headerName: '생산량',
      width: 120,
      type: 'number',
      decimalPlaces: 2,
      align: 'right',
      renderCell: ({ row }) => formatQty(row.producedQty),
    },
    {
      field: 'shippedQty',
      headerName: '출하량',
      width: 120,
      type: 'number',
      decimalPlaces: 2,
      align: 'right',
      renderCell: ({ row }) => formatQty(row.shippedQty),
    },
    {
      field: 'remainingQty',
      headerName: '잔량',
      width: 120,
      type: 'number',
      decimalPlaces: 2,
      align: 'right',
      renderCell: ({ row }) => formatQty(row.remainingQty),
      // 다 나간 로트는 흐리게(송연과 같음)
      getCellStyle: ({ row }) => ({ fontWeight: 700, ...(row.remainingQty <= 0 ? { color: '#94a3b8' } : {}) }),
    },
  ];
}

type ProductStockLotGridProps = {
  rows: LotRow[];
  columns: F1GridColumn<LotRow>[];
  loading: boolean;
};

export function ProductStockLotGrid({ rows, columns, loading }: ProductStockLotGridProps) {
  return (
    <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
      <F1Grid
        rows={rows}
        columns={columns}
        rowKey="key"
        storageKey="lg-product-stock-lot-grid"
        ariaLabel="F1-GRID 제품재고 로트"
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

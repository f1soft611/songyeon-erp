import { Box, Chip, Typography } from '@mui/material';
import { F1Grid, type F1GridColumn } from '../../../../../shared/components/f1-grid';
import type { ProductHistoryRow } from '../types/stockAdjust.types';
import { formatMoney, formatQty, kindColor } from '../utils/stockAdjust';

// 제품 입출고 내역 칸
export function createProductHistoryColumns(): F1GridColumn<ProductHistoryRow>[] {
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
      field: 'movedOn',
      headerName: '날짜',
      width: 110,
      align: 'center',
    },
    {
      field: 'productName',
      headerName: '품목명',
      flex: 1.4,
      width: 220,
      align: 'left',
    },
    {
      field: 'kind',
      headerName: '종류',
      width: 96,
      align: 'center',
      renderCell: ({ row }) => <Chip size="small" variant="outlined" color={kindColor(row.kind)} label={row.kind || ''} />,
    },
    {
      field: 'qty',
      headerName: '수량',
      width: 100,
      headerAlign: 'center',
      align: 'right',
      renderCell: ({ row }) => `${(row.qty || 0) > 0 ? '+' : ''}${formatQty(row.qty)}`,
      getCellStyle: ({ row }) => ({ color: (row.qty || 0) > 0 ? '#2563eb' : '#dc2626' }),
    },
    {
      field: 'balanceAfter',
      headerName: '이후 재고',
      width: 110,
      headerAlign: 'center',
      align: 'right',
      renderCell: ({ row }) => formatMoney(row.balanceAfter),
    },
    {
      field: 'clientName',
      headerName: '거래처',
      width: 150,
      align: 'left',
      renderCell: ({ row }) => row.clientName || '',
    },
    {
      field: 'note',
      headerName: '비고',
      flex: 1,
      width: 180,
      align: 'left',
      renderCell: ({ row }) => <Typography component="span" variant="body2" color="text.secondary">{row.note || ''}{row.createdByName ? ` (${row.createdByName})` : ''}</Typography>,
    },
  ];
}

type ProductHistoryGridProps = {
  rows: ProductHistoryRow[];
  columns: F1GridColumn<ProductHistoryRow>[];
};

export function ProductHistoryGrid({ rows, columns }: ProductHistoryGridProps) {
  return (
    <Box sx={{ height: 300 }}>
      <F1Grid
        key="product-history"
        rows={rows}
        columns={columns}
        rowKey="key"
        storageKey="pu-stockadjust-product-history-grid"
        ariaLabel="F1-GRID 제품 입출고 내역"
        height="100%"
        maxHeight="100%"
        rowHeight={34}
        minRowHeight={34}
        maxRowHeight={320}
        columnLine
        showCheckbox={false}
        resizableRows={false}
        allowAddRowInContextMenu={false}
        allowDuplicateRowInContextMenu={false}
        allowDeleteRowInContextMenu={false}
      />
    </Box>
  );
}

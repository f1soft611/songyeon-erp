import { useState } from 'react';
import { Box, Button } from '@mui/material';
import { F1Grid, type F1GridColumn } from '../../../../../shared/components/f1-grid';
import { resetGridStorageIfColumnsChanged } from '../../../../../shared/utils/gridStorage';
import type { LotState, StockRow } from '../types/productStock.types';
import { formatQty, plannedText } from '../utils/productStock';

const STORAGE_KEY = 'lg-product-stock-grid';
// 2026-10-30 [로트보기] 단추 칸을 lotAction 으로 바꿨다(예전엔 plannedCount 칸을 빌려 썼다). 저장된 칸 순서에 지금 칸이 없으면 처음 순서로
const GRID_FIELDS = [
  'code',
  'name',
  'spec',
  'clientName',
  'stockQty',
  'plannedQty',
  'lotAction',
];
const rowButton = { minWidth: 0, px: 1, py: 0 };

type ProductStockColumnOptions = {
  lots: LotState;
  onOpenLot: (code: string) => void;
  onCloseLot: (code: string) => void;
};

// 제품재고 칸(보기 전용): 품목명 · 규격 · 거래처 · 현재고 · 생산예정 · [로트보기](펼친 품목의 로트는 아래 로트 표에 모은다).
// 상세 조회(⌄)에는 거래처만 칸에서 나오고, 정렬은 화면이 더한다(2026-10-30)
export function createProductStockColumns({ lots, onOpenLot, onCloseLot }: ProductStockColumnOptions): F1GridColumn<StockRow>[] {
  return [
    {
      field: 'code',
      type: 'rownumber',
      width: 56,
      headerName: 'No',
      search: { hidden: true },
      align: 'center',
      pinned: 'left',
    },
    {
      field: 'name',
      headerName: '품목명',
      flex: 1.5,
      width: 300,
      search: { hidden: true },
      align: 'left',
      pinned: 'left',
    },
    {
      field: 'spec',
      headerName: '규격',
      width: 120,
      search: { hidden: true },
      align: 'left',
      renderCell: ({ row }) => row.spec || '',
    },
    {
      field: 'clientName',
      headerName: '거래처',
      flex: 1,
      width: 160,
      search: { label: '거래처', order: 1 },
      align: 'left',
      renderCell: ({ row }) => row.clientName || '',
    },
    {
      field: 'stockQty',
      headerName: '현재고',
      width: 120,
      type: 'number',
      decimalPlaces: 2,
      search: { hidden: true },
      align: 'right',
      renderCell: ({ row }) => formatQty(row.stockQty),
      getCellStyle: () => ({ fontWeight: 700 }),
    },
    {
      field: 'plannedQty',
      headerName: '생산예정',
      width: 140,
      type: 'number',
      decimalPlaces: 2,
      search: { hidden: true },
      align: 'right',
      renderCell: ({ row }) => plannedText(row),
      getCellStyle: ({ row }) => (row.plannedQty > 0 ? { color: '#0369a1' } : {}),
    },
    {
      field: 'lotAction',
      headerName: '',
      width: 100,
      search: { hidden: true },
      align: 'center',
      pinned: 'right',
      renderCell: ({ row }) => {
        const open = row.code in lots;
        return (
          <Button size="small" variant={open ? 'contained' : 'outlined'} sx={rowButton} onClick={() => (open ? onCloseLot(row.code) : onOpenLot(row.code))}>
            {open ? '로트접기' : '로트보기'}
          </Button>
        );
      },
    },
  ];
}

type ProductStockGridProps = {
  rows: StockRow[];
  columns: F1GridColumn<StockRow>[];
  loading: boolean;
};

export function ProductStockGrid({ rows, columns, loading }: ProductStockGridProps) {
  // 그리드를 그리기 전에 저장된 칸 순서를 맞춘다(처음 한 번)
  useState(() => resetGridStorageIfColumnsChanged(STORAGE_KEY, GRID_FIELDS));

  return (
    <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
      <F1Grid
        rows={rows}
        columns={columns}
        rowKey="code"
        storageKey="lg-product-stock-grid"
        ariaLabel="F1-GRID 제품재고"
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

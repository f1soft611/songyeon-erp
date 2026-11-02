import { useState } from 'react';
import { Box, Button } from '@mui/material';
import { F1Grid, type F1GridColumn } from '../../../../../shared/components/f1-grid';
import { resetGridStorageIfColumnsChanged } from '../../../../../shared/utils/gridStorage';
import type { StockSchedule } from '../types/stockAdjust.types';
import { diffColor, diffText, finalQty, formatQty } from '../utils/stockAdjust';

const STORAGE_KEY = 'pu-stockadjust-product-schedule-grid';
// 2026-11-02 [수정] · [취소] 단추 칸을 rowAction 으로 바꿨다(예전엔 newStockQty 칸을 빌려 썼다). 저장된 칸 순서에 지금 칸이 없으면 처음 순서로
const GRID_FIELDS = [
  'id',
  'name',
  'currentStockQty',
  'targetQty',
  'diff',
  'rowAction',
];
const rowButton = { minWidth: 0, px: 1, py: 0 };

type ProductScheduleColumnOptions = {
  onEdit: (row: StockSchedule) => void;
  onCancel: (row: StockSchedule) => void;
};

// 예정된 제품 재고조정 칸
export function createProductScheduleColumns({ onEdit, onCancel }: ProductScheduleColumnOptions): F1GridColumn<StockSchedule>[] {
  return [
    {
      field: 'id',
      type: 'rownumber',
      width: 56,
      headerName: 'No',
      align: 'center',
      pinned: 'left',
    },
    {
      field: 'name',
      headerName: '제품',
      flex: 1.4,
      width: 240,
      align: 'left',
      renderCell: ({ row }) => `${row.name || ''} (${row.code})`,
    },
    {
      field: 'currentStockQty',
      headerName: '이전',
      width: 110,
      headerAlign: 'center',
      align: 'right',
      renderCell: ({ row }) => formatQty(row.currentStockQty),
      getCellStyle: () => ({ color: '#64748b' }),
    },
    {
      field: 'targetQty',
      headerName: '이후',
      width: 140,
      headerAlign: 'center',
      align: 'right',
      renderCell: ({ row }) => `${formatQty(finalQty(row))}${row.editedQty != null ? ' (수정됨)' : ''}`,
      getCellStyle: ({ row }) => ({ fontWeight: 700, ...(row.editedQty != null ? { color: '#2563eb' } : {}) }),
    },
    {
      field: 'diff',
      headerName: '차이',
      width: 100,
      headerAlign: 'center',
      align: 'right',
      renderCell: ({ row }) => diffText(row.diff),
      getCellStyle: ({ row }) => ({ fontWeight: 700, color: diffColor(row.diff) }),
    },
    {
      field: 'rowAction',
      headerName: '',
      width: 120,
      align: 'center',
      pinned: 'right',
      renderCell: ({ row }) => (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Button size="small" variant="outlined" sx={rowButton} onClick={() => onEdit(row)}>수정</Button>
          <Button size="small" variant="outlined" color="error" sx={rowButton} onClick={() => onCancel(row)}>취소</Button>
        </Box>
      ),
    },
  ];
}

type ProductScheduleGridProps = {
  rows: StockSchedule[];
  columns: F1GridColumn<StockSchedule>[];
};

export function ProductScheduleGrid({ rows, columns }: ProductScheduleGridProps) {
  // 그리드를 그리기 전에 저장된 칸 순서를 맞춘다(처음 한 번)
  useState(() => resetGridStorageIfColumnsChanged(STORAGE_KEY, GRID_FIELDS));

  return (
    <Box sx={{ height: 240 }}>
      <F1Grid
        key="product-schedule"
        rows={rows}
        columns={columns}
        rowKey="id"
        storageKey="pu-stockadjust-product-schedule-grid"
        ariaLabel="F1-GRID 예정된 제품 재고조정"
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

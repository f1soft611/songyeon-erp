import { useState } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { F1Grid, type F1GridColumn } from '../../../../../shared/components/f1-grid';
import { resetGridStorageIfColumnsChanged } from '../../../../../shared/utils/gridStorage';
import type { WarehouseMove } from '../types/stockAdjust.types';
import { whmNum } from '../utils/stockAdjust';

const STORAGE_KEY = 'pu-stockadjust-warehouse-move-grid';
// 2026-11-02 [취소] 단추 칸을 rowAction 으로 바꿨다(예전엔 movedDate 칸을 빌려 썼다). 저장된 칸 순서에 지금 칸이 없으면 처음 순서로
const GRID_FIELDS = [
  'id',
  'materialName',
  'barcode',
  'packCount',
  'qty',
  'fromWarehouse',
  'toWarehouse',
  'movedBy',
  'rowAction',
];

type WarehouseMoveColumnOptions = {
  onCancel: (row: WarehouseMove) => void;
};

// 창고이동 기록 칸
export function createWarehouseMoveColumns({ onCancel }: WarehouseMoveColumnOptions): F1GridColumn<WarehouseMove>[] {
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
      field: 'materialName',
      headerName: '품목',
      flex: 1.3,
      width: 200,
      align: 'left',
      renderCell: ({ row }) => <span>{row.materialName || ''} <Typography component="span" sx={{ fontSize: 11, color: 'text.secondary' }}>({row.materialCode})</Typography></span>,
    },
    {
      field: 'barcode',
      headerName: '바코드(로트)',
      width: 150,
      align: 'left',
      renderCell: ({ row }) => (row.barcode
        ? <Box component="span" sx={{ fontFamily: 'monospace', fontSize: 11 }}>{row.barcode}</Box>
        : <Typography component="span" variant="body2" color="text.secondary">없음</Typography>),
    },
    {
      field: 'packCount',
      headerName: '봉수',
      width: 80,
      headerAlign: 'center',
      align: 'right',
      renderCell: ({ row }) => `${whmNum(row.packCount)}봉`,
    },
    {
      field: 'qty',
      headerName: '무게',
      width: 90,
      headerAlign: 'center',
      align: 'right',
      renderCell: ({ row }) => whmNum(row.qty),
      getCellStyle: () => ({ fontWeight: 700 }),
    },
    {
      field: 'fromWarehouse',
      headerName: '어디서',
      width: 100,
      align: 'left',
      renderCell: ({ row }) => row.fromWarehouse || '',
    },
    {
      field: 'toWarehouse',
      headerName: '어디로',
      width: 100,
      align: 'left',
      renderCell: ({ row }) => row.toWarehouse || '',
    },
    {
      field: 'movedBy',
      headerName: '찍은 사람',
      width: 100,
      align: 'left',
      renderCell: ({ row }) => row.movedBy || '',
    },
    {
      field: 'rowAction',
      headerName: '',
      width: 76,
      align: 'center',
      pinned: 'right',
      // 잘못 찍는 일이 잦다 — 지우는 길이 없으면 계량창고 숫자가 틀린 채로 계속 간다
      renderCell: ({ row }) => <Button size="small" variant="outlined" color="error" sx={{ minWidth: 0, px: 1, py: 0 }} onClick={() => onCancel(row)}>취소</Button>,
    },
  ];
}

type WarehouseMoveGridProps = {
  rows: WarehouseMove[];
  columns: F1GridColumn<WarehouseMove>[];
};

export function WarehouseMoveGrid({ rows, columns }: WarehouseMoveGridProps) {
  // 그리드를 그리기 전에 저장된 칸 순서를 맞춘다(처음 한 번)
  useState(() => resetGridStorageIfColumnsChanged(STORAGE_KEY, GRID_FIELDS));

  return (
    <Box sx={{ height: 320 }}>
      <F1Grid
        key="warehouse-move"
        rows={rows}
        columns={columns}
        rowKey="id"
        storageKey="pu-stockadjust-warehouse-move-grid"
        ariaLabel="F1-GRID 창고이동"
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

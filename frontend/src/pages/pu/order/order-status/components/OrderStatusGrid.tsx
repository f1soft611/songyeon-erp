import { useRef } from 'react';
import { Box, Chip, Typography } from '@mui/material';
import { F1Grid, type F1GridColumn, type F1GridRef } from '../../../../../shared/components/f1-grid';
import { restoreBlockedGridDeletes } from '../../../../../shared/utils/gridDelete';
import type { StatusRow } from '../types/orderStatus.types';

// 발주현황 칸(보기 전용): 금액칸이 없는 대신 입고여부를 보여준다
export function createOrderStatusColumns(): F1GridColumn<StatusRow>[] {
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
      field: 'orderDate',
      headerName: '발주일자',
      width: 120,
      align: 'center',
      mergeRows: true,
    },
    {
      field: 'clientName',
      headerName: '거래처',
      flex: 1,
      width: 180,
      align: 'left',
      mergeRows: true,
      renderCell: ({ row }) => (
        <span>
          {row.clientName || ''}
          {row.clientCount > 1 && <Typography component="span" variant="caption" color="text.secondary"> {row.clientCount}건</Typography>}
        </span>
      ),
    },
    {
      field: 'materialName',
      headerName: '발주품목',
      flex: 1.5,
      width: 220,
      align: 'left',
    },
    {
      field: 'qty',
      headerName: '수량',
      width: 110,
      type: 'number',
      decimalPlaces: 4,
      align: 'right',
    },
    {
      field: 'received',
      headerName: '입고여부',
      width: 110,
      align: 'center',
      renderCell: ({ row }) => (row.received
        ? <Chip size="small" color="success" variant="outlined" label="입고완료" />
        : <Chip size="small" color="warning" variant="outlined" label="미입고" />),
    },
  ];
}

type OrderStatusGridProps = {
  rows: StatusRow[];
  columns: F1GridColumn<StatusRow>[];
  loading: boolean;
  onDeleteBlocked: () => void;
};

// 보기만 하는 표다. Delete 키로 빠진 줄은 되살린다
export function OrderStatusGrid({ rows, columns, loading, onDeleteBlocked }: OrderStatusGridProps) {
  const gridRef = useRef<F1GridRef<StatusRow>>(null);

  return (
    <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
      <F1Grid
        ref={gridRef}
        rows={rows}
        columns={columns}
        rowKey="id"
        storageKey="pu-po-status-grid"
        ariaLabel="F1-GRID 발주현황"
        loading={loading}
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
        onChangesChange={() => {
          if (restoreBlockedGridDeletes(gridRef.current, false, () => false).length > 0) onDeleteBlocked();
        }}
      />
    </Box>
  );
}

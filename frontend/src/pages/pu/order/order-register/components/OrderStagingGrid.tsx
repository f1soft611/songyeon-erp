import type { RefObject } from 'react';
import { Box, Checkbox, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { F1Grid, type F1GridColumn, type F1GridRef } from '../../../../../shared/components/f1-grid';
import { restoreBlockedGridDeletes } from '../../../../../shared/utils/gridDelete';
import type { OrderStagingRow } from '../types/orderRegister.types';
import { formatQty } from '../utils/orderRegister';

type OrderStagingColumnOptions = {
  onCheck: (key: number, checked: boolean) => void;
  onRemove: (key: number) => void;
};

// 발주 등록 창의 품목 칸: 체크한 품목만 확정하고, 줄의 빼기 단추로 목록에서 뺀다
export function createOrderStagingColumns({ onCheck, onRemove }: OrderStagingColumnOptions): F1GridColumn<OrderStagingRow>[] {
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
      field: 'checked',
      headerName: '선택',
      width: 60,
      align: 'center',
      renderCell: ({ row }) => (
        <Checkbox
          size="small"
          checked={row.checked}
          onChange={(event) => onCheck(row.key, event.target.checked)}
          slotProps={{ input: { 'aria-label': `${row.materialName} 선택` } }}
        />
      ),
    },
    {
      field: 'clientName',
      headerName: '거래처',
      flex: 1,
      width: 140,
      align: 'left',
    },
    {
      field: 'materialName',
      headerName: '품목',
      flex: 1.4,
      width: 180,
      align: 'left',
    },
    {
      field: 'qty',
      headerName: '수량',
      width: 90,
      type: 'number',
      decimalPlaces: 4,
      align: 'right',
      renderCell: ({ row }) => formatQty(row.qty),
    },
    {
      field: 'removeAction',
      headerName: '',
      width: 56,
      align: 'center',
      renderCell: ({ row }) => (
        <IconButton size="small" color="error" aria-label={`${row.materialName} 빼기`} onClick={() => onRemove(row.key)}>
          <CloseIcon fontSize="small" />
        </IconButton>
      ),
    },
  ];
}

type OrderStagingGridProps = {
  rows: OrderStagingRow[];
  columns: F1GridColumn<OrderStagingRow>[];
  gridRef: RefObject<F1GridRef<OrderStagingRow> | null>;
  onDeleteBlocked: () => void;
};

// 품목은 줄의 빼기 단추로만 뺀다. Delete 키로 표에서만 빠지면 목록에 남아 그대로 확정되므로 되살린다
export function OrderStagingGrid({ rows, columns, gridRef, onDeleteBlocked }: OrderStagingGridProps) {
  return (
    <Box sx={{ height: 240 }}>
      <F1Grid
        ref={gridRef}
        rows={rows}
        columns={columns}
        rowKey="key"
        storageKey="pu-order-register-staging-grid"
        ariaLabel="F1-GRID 발주 등록 품목"
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

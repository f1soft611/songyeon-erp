import type { RefObject } from 'react';
import { Box, Button, Chip, Typography } from '@mui/material';
import { F1Tree, type F1GridColumn, type F1GridRowId, type F1TreeRef } from '../../../../../shared/components/f1-grid';
import { restoreBlockedGridDeletes } from '../../../../../shared/utils/gridDelete';
import type { OrderRegisterRow } from '../types/orderRegister.types';

type OrderRegisterColumnOptions = {
  onCancel: (row: OrderRegisterRow) => void;
};

// 발주내역 칸: 거래처로 묶고, 품목 줄에서 입고 전인 발주만 취소한다
export function createOrderRegisterColumns({ onCancel }: OrderRegisterColumnOptions): F1GridColumn<OrderRegisterRow>[] {
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
      field: 'label',
      headerName: '거래처 / 원재료',
      flex: 1.5,
      width: 260,
      align: 'left',
      getCellStyle: ({ row }) => (row.kind === 'group' ? { fontWeight: 700 } : {}),
    },
    {
      field: 'info',
      headerName: '품목 · 입고',
      width: 220,
      align: 'left',
      renderCell: ({ row }) => (row.kind === 'group' ? (
        <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center' }}>
          <span>{row.info}</span>
          {row.pending > 0
            ? <Chip size="small" color="warning" variant="outlined" label={`미입고 ${row.pending}건`} />
            : <Chip size="small" color="success" variant="outlined" label="모두 입고" />}
        </Box>
      ) : (
        <Chip size="small" variant="outlined" color={row.received ? 'success' : 'warning'} label={row.info} />
      )),
    },
    {
      field: 'qty',
      headerName: '수량',
      width: 120,
      type: 'number',
      decimalPlaces: 4,
      align: 'right',
    },
    {
      field: 'rowAction',
      headerName: '',
      width: 170,
      align: 'center',
      pinned: 'right',
      renderCell: ({ row }) => {
        if (row.kind === 'group') return '';
        if (row.received) return <Typography variant="caption" color="text.secondary">입고완료 — 취소불가</Typography>;
        return <Button size="small" variant="outlined" color="error" sx={{ minWidth: 0, px: 1, py: 0 }} onClick={() => onCancel(row)}>취소</Button>;
      },
    },
  ];
}

type OrderRegisterGridProps = {
  rows: OrderRegisterRow[];
  columns: F1GridColumn<OrderRegisterRow>[];
  loading: boolean;
  gridKey: number;
  treeRef: RefObject<F1TreeRef<OrderRegisterRow> | null>;
  defaultExpanded: F1GridRowId[];
  onDeleteBlocked: () => void;
};

// 발주는 줄의 [취소]로만 지운다. Delete 키로 표에서 빠진 줄은 되살린다
export function OrderRegisterGrid({ rows, columns, loading, gridKey, treeRef, defaultExpanded, onDeleteBlocked }: OrderRegisterGridProps) {
  return (
    <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
      <F1Tree
        key={gridKey}
        ref={treeRef}
        rows={rows}
        columns={columns}
        rowKey="id"
        parentKey="parentId"
        treeColumn="label"
        defaultExpanded={defaultExpanded}
        storageKey="pu-order-register-grid"
        ariaLabel="F1-TREE 발주내역"
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
          if (restoreBlockedGridDeletes(treeRef.current, false, () => false).length > 0) onDeleteBlocked();
        }}
      />
    </Box>
  );
}

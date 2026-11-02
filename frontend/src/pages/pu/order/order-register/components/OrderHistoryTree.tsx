import { useState, type RefObject } from 'react';
import { Box, Button, Chip, Typography } from '@mui/material';
import { F1Tree, type F1GridColumn, type F1GridRowId, type F1TreeRef } from '../../../../../shared/components/f1-grid';
import { restoreBlockedGridDeletes } from '../../../../../shared/utils/gridDelete';
import { resetGridStorageIfColumnsChanged } from '../../../../../shared/utils/gridStorage';
import type { HistoryRow } from '../types/purchaseOrder.types';
import { formatQty } from '../utils/purchaseOrder';

const STORAGE_KEY = 'pu-po-history-tree';
// 2026-11-02 [취소] 단추 칸을 rowAction 으로 바꿨다. 저장된 칸 순서에 지금 칸이 없으면 처음 순서로
const GRID_FIELDS = ['id', 'label', 'info', 'qty', 'rowAction'];

type OrderHistoryColumnOptions = {
  onCancel: (row: HistoryRow) => void;
};

// 발주내역 칸: 거래처로 묶고, 품목 줄에서 입고 전인 발주만 취소한다
export function createOrderHistoryColumns({ onCancel }: OrderHistoryColumnOptions): F1GridColumn<HistoryRow>[] {
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
      headerAlign: 'center',
      align: 'right',
      renderCell: ({ row }) => formatQty(row.qty),
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

type OrderHistoryTreeProps = {
  rows: HistoryRow[];
  columns: F1GridColumn<HistoryRow>[];
  loading: boolean;
  gridKey: number;
  treeRef: RefObject<F1TreeRef<HistoryRow> | null>;
  defaultExpanded: F1GridRowId[];
  onDeleteBlocked: () => void;
};

// 발주는 줄의 [취소]로만 지운다. Delete 키로 표에서 빠진 줄은 되살린다
export function OrderHistoryTree({ rows, columns, loading, gridKey, treeRef, defaultExpanded, onDeleteBlocked }: OrderHistoryTreeProps) {
  // 그리드를 그리기 전에 저장된 칸 순서를 맞춘다(처음 한 번)
  useState(() => resetGridStorageIfColumnsChanged(STORAGE_KEY, GRID_FIELDS));

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
        storageKey="pu-po-history-tree"
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

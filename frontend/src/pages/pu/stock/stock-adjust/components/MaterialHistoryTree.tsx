import { Box, Typography } from '@mui/material';
import { F1Tree, type F1GridColumn } from '../../../../../shared/components/f1-grid';
import type { HistoryNode } from '../types/stockAdjust.types';
import { diffColor, diffText, formatQty } from '../utils/stockAdjust';

// 적용된 원재료 재고조정 칸: 반영일로 묶고, 품목 줄에 이전 · 이후 · 차이
export function createMaterialHistoryColumns(): F1GridColumn<HistoryNode>[] {
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
      headerName: '반영일 / 원재료',
      flex: 1.4,
      width: 260,
      align: 'left',
      getCellStyle: ({ row }) => (row.kind === 'group' ? { fontWeight: 700 } : undefined),
    },
    {
      field: 'count',
      headerName: '변경 건수',
      width: 90,
      headerAlign: 'center',
      align: 'right',
      renderCell: ({ row }) => (row.kind === 'group' ? `${row.count}건` : ''),
    },
    {
      field: 'notes',
      headerName: '사유',
      flex: 1,
      width: 200,
      align: 'left',
      renderCell: ({ row }) => (row.kind !== 'group' ? '' : row.notes || <Typography component="span" variant="body2" color="text.secondary">사유 없음(예전 자료)</Typography>),
    },
    {
      field: 'oldQty',
      headerName: '이전',
      width: 100,
      headerAlign: 'center',
      align: 'right',
      renderCell: ({ row }) => (row.kind === 'item' ? formatQty(row.oldQty) : ''),
    },
    {
      field: 'newQty',
      headerName: '이후',
      width: 100,
      headerAlign: 'center',
      align: 'right',
      renderCell: ({ row }) => (row.kind === 'item' ? formatQty(row.newQty) : ''),
    },
    {
      field: 'diff',
      headerName: '차이',
      width: 100,
      headerAlign: 'center',
      align: 'right',
      renderCell: ({ row }) => (row.kind === 'item' ? diffText(row.diff) : ''),
      getCellStyle: ({ row }) => ({ fontWeight: 700, color: diffColor(row.diff) }),
    },
  ];
}

type MaterialHistoryTreeProps = {
  rows: HistoryNode[];
  columns: F1GridColumn<HistoryNode>[];
  treeVersion: number;
};

export function MaterialHistoryTree({ rows, columns, treeVersion }: MaterialHistoryTreeProps) {
  return (
    <Box sx={{ height: 280 }}>
      <F1Tree
        key={treeVersion}
        rows={rows}
        columns={columns}
        rowKey="id"
        parentKey="parentId"
        treeColumn="label"
        storageKey="pu-stockadjust-material-history-tree"
        ariaLabel="F1-TREE 적용된 원재료 재고조정"
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

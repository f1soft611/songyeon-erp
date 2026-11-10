import { useState } from 'react';
import { Box, Button, Chip } from '@mui/material';
import { F1Grid, type F1GridColumn } from '../../../../../shared/components/f1-grid';
import { resetGridStorageIfColumnsChanged } from '../../../../../shared/utils/gridStorage';
import type { SubstitutionSchedule } from '../types/materialSubstitution.types';

const STORAGE_KEY = 'pu-msub-grid';
// 2026-11-02 [상세보기] 단추 칸을 rowAction 으로 바꿨다. 저장된 칸 순서에 지금 칸이 없으면 처음 순서로
const GRID_FIELDS = ['id', 'productName', 'clientName', 'orderQty', 'lotNo', 'substitutionCount', 'rowAction'];

const GOLD = 'rgba(245, 158, 11, 0.12)';

type SubstitutionColumnOptions = {
  onOpenDetail: (row: SubstitutionSchedule) => void;
};

// 생산건 칸: 치환이 있는 줄은 금색으로 칠한다
export function createSubstitutionColumns({ onOpenDetail }: SubstitutionColumnOptions): F1GridColumn<SubstitutionSchedule>[] {
  const gold = ({ row }: { row: SubstitutionSchedule }) => (row.substitutionCount ? { backgroundColor: GOLD } : undefined);
  return [
    {
      field: 'id',
      type: 'rownumber',
      width: 56,
      headerName: 'No',
      align: 'center',
      pinned: 'left',
      getCellStyle: gold,
    },
    {
      field: 'productName',
      headerName: '품목명',
      flex: 1.6,
      width: 260,
      align: 'left',
      getCellStyle: (ctx) => ({ fontWeight: 700, ...gold(ctx) }),
    },
    {
      field: 'clientName',
      headerName: '거래처',
      flex: 1,
      width: 180,
      align: 'left',
      getCellStyle: gold,
    },
    {
      field: 'orderQty',
      headerName: '생산지시량',
      width: 120,
      type: 'number',
      align: 'right',
      getCellStyle: gold,
    },
    {
      field: 'lotNo',
      headerName: '로트번호',
      width: 130,
      align: 'center',
      getCellStyle: gold,
    },
    {
      field: 'substitutionCount',
      headerName: '원재료치환',
      width: 110,
      align: 'center',
      getCellStyle: gold,
      renderCell: ({ row }) => (row.substitutionCount ? <Chip size="small" color="warning" variant="outlined" label={`${row.substitutionCount}건`} /> : ''),
    },
    {
      field: 'rowAction',
      headerName: '',
      width: 100,
      align: 'center',
      pinned: 'right',
      getCellStyle: gold,
      renderCell: ({ row }) => <Button size="small" variant="outlined" sx={{ minWidth: 0, px: 1, py: 0 }} onClick={() => onOpenDetail(row)}>상세보기</Button>,
    },
  ];
}

type SubstitutionGridProps = {
  rows: SubstitutionSchedule[];
  columns: F1GridColumn<SubstitutionSchedule>[];
  loading: boolean;
};

export function SubstitutionGrid({ rows, columns, loading }: SubstitutionGridProps) {
  // 그리드를 그리기 전에 저장된 칸 순서를 맞춘다(처음 한 번)
  useState(() => resetGridStorageIfColumnsChanged(STORAGE_KEY, GRID_FIELDS));

  return (
    <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
      <F1Grid
        rows={rows}
        columns={columns}
        rowKey="id"
        storageKey="pu-msub-grid"
        ariaLabel="F1-GRID 재료 치환등록"
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

import { useRef, useState } from 'react';
import { Box, Chip } from '@mui/material';
import { F1Grid, type F1GridColumn, type F1GridRef } from '../../../../../shared/components/f1-grid';
import { restoreBlockedGridDeletes } from '../../../../../shared/utils/gridDelete';
import { resetGridStorageIfColumnsChanged } from '../../../../../shared/utils/gridStorage';
import type { TotalRow } from '../utils/salesTotal';

const STORAGE_KEY = 'sl-sales-total-grid';
// 2026-11-02 구분 칸을 directionLabel 에서 direction 으로 바꿨다. 저장된 칸 순서에 지금 칸이 하나라도 없으면 처음 순서로 다시 시작한다
const GRID_FIELDS = [
  'key',
  'saleDate',
  'direction',
  'clientName',
  'productName',
  'qty',
  'unitPrice',
  'amount',
  'sourceLabel',
  'note'
];

// 토탈집계 칸(보기 전용). 상세 조회(⌄)에는 품목코드/명 · 일자 기간 · 구분이 나온다
export function createSalesTotalColumns(): F1GridColumn<TotalRow>[] {
  return [
    {
      field: 'key',
      type: 'rownumber',
      width: 56,
      headerName: 'No',
      align: 'center',
      pinned: 'left',
      search: { hidden: true },
    },
    {
      field: 'saleDate',
      headerName: '일자',
      width: 120,
      type: 'date',
      align: 'center',
      search: { label: '일자', order: 2, span: 2, required: true },
    },
    {
      field: 'direction',
      headerName: '구분',
      width: 80,
      type: 'select',
      options: [
        { value: 'in', label: '입고' },
        { value: 'out', label: '출고' },
      ],
      align: 'center',
      renderCell: ({ row }) => <Chip size="small" variant="outlined" color={row.direction === 'in' ? 'success' : 'primary'} label={row.directionLabel} />,
      search: { label: '구분', order: 3 },
    },
    {
      field: 'clientName',
      headerName: '거래처',
      flex: 1,
      width: 150,
      align: 'left',
      search: { hidden: true },
    },
    {
      field: 'productName',
      headerName: '품목명',
      flex: 1.5,
      width: 220,
      align: 'left',
      search: { label: '품목코드/명', order: 1 },
    },
    {
      field: 'qty',
      headerName: '수량',
      type: 'number',
      decimalPlaces: 4,
      width: 100,
      align: 'right',
      search: { hidden: true },
    },
    {
      field: 'unitPrice',
      headerName: '단가',
      type: 'currency',
      decimalPlaces: 4,
      width: 110,
      align: 'right',
      search: { hidden: true },
    },
    {
      field: 'amount',
      headerName: '금액',
      type: 'currency',
      decimalPlaces: 4,
      width: 130,
      align: 'right',
      getCellStyle: () => ({ fontWeight: 700 }),
      search: { hidden: true },
    },
    {
      field: 'sourceLabel',
      headerName: '들어온 곳',
      width: 100,
      align: 'center',
      search: { hidden: true },
    },
    {
      field: 'note',
      headerName: '메모',
      flex: 1,
      width: 140,
      align: 'left',
      search: { hidden: true },
    },
  ];
}

type SalesTotalGridProps = {
  rows: TotalRow[];
  columns: F1GridColumn<TotalRow>[];
  loading: boolean;
  onDeleteBlocked: () => void;
};

// 보기만 하는 표다. Delete 키로 빠진 줄은 되살린다(줄이 빠지면 합계와 표가 어긋난다)
export function SalesTotalGrid({ rows, columns, loading, onDeleteBlocked }: SalesTotalGridProps) {
  const gridRef = useRef<F1GridRef<TotalRow>>(null);
  // 그리드를 그리기 전에 저장된 칸 순서를 맞춘다(처음 한 번)
  useState(() => resetGridStorageIfColumnsChanged(STORAGE_KEY, GRID_FIELDS));

  return (
    <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
      <F1Grid
        ref={gridRef}
        rows={rows}
        columns={columns}
        rowKey="key"
        storageKey="sl-sales-total-grid"
        ariaLabel="F1-GRID 토탈집계"
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
        onChangesChange={() => {
          if (restoreBlockedGridDeletes(gridRef.current, false, () => false).length > 0) onDeleteBlocked();
        }}
      />
    </Box>
  );
}

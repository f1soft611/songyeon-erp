import { useState, type RefObject } from 'react';
import { Box, Typography } from '@mui/material';
import { F1Grid, type F1GridColumn, type F1GridRef } from '../../../../../shared/components/f1-grid';
import { resetGridStorageIfColumnsChanged } from '../../../../../shared/utils/gridStorage';
import type { ProdActualRow } from '../types/prodActual.types';

const STORAGE_KEY = 'pd-actual-grid';
// 2026-10-30 줄 끝 단추 칸을 뺐다. 저장된 칸 순서에 지금 칸이 없으면 처음 순서로
const GRID_FIELDS = [
  'id',
  'clientName',
  'productName',
  'orderQty',
  'input',
];

// 생산입고 칸. 실생산량은 표에서 바로 고치고 제목줄 [저장]으로 보낸다. 입고취소는 줄을 고르고 제목줄 [입고취소](2026-10-30).
// 상세 조회(⌄)에는 거래처 · 품목코드/명만 나온다
export function createProdActualColumns(): F1GridColumn<ProdActualRow>[] {
  return [
    {
      field: 'id',
      type: 'rownumber',
      width: 56,
      headerName: 'No',
      search: { hidden: true },
      align: 'center',
      pinned: 'left',
    },
    {
      field: 'clientName',
      headerName: '거래처',
      flex: 1,
      width: 160,
      search: { label: '거래처', order: 1 },
      align: 'left',
    },
    {
      field: 'productName',
      headerName: '품목명(규격)',
      flex: 1.5,
      width: 220,
      search: { label: '품목코드/명', order: 2 },
      align: 'left',
    },
    {
      field: 'orderQty',
      headerName: '생산지시량(계획)',
      width: 140,
      search: { hidden: true },
      align: 'right',
      type: 'number',
      decimalPlaces: 2,
    },
    {
      field: 'input',
      headerName: '실생산량',
      width: 140,
      search: { hidden: true },
      align: 'right',
      type: 'number',
      decimalPlaces: 2,
      editable: true,
      // 아직 안 적은 줄은 예시를 흐리게 보여준다
      renderCell: ({ row }) => (row.input ? row.input : <Typography component="span" variant="body2" color="text.disabled">예: 980kg</Typography>),
      // 저장된 실생산량은 굵게, 아직 입고 안 한 줄은 적을 칸으로 옅은 파랑
      getCellStyle: ({ row }) => (row.saved ? { fontWeight: 700 } : { background: 'rgba(37, 99, 235, 0.06)' }),
    },
  ];
}

type ProdActualGridProps = {
  rows: ProdActualRow[];
  columns: F1GridColumn<ProdActualRow>[];
  loading: boolean;
  gridKey: number;
  gridRef: RefObject<F1GridRef<ProdActualRow> | null>;
  onChangesChange: () => void;
};

// 줄을 누르면 골라진다([입고취소] 대상). Delete 키로 지운 줄은 화면이 되살린다(이 화면은 줄을 지우지 않는다)
export function ProdActualGrid({ rows, columns, loading, gridKey, gridRef, onChangesChange }: ProdActualGridProps) {
  // 그리드를 그리기 전에 저장된 칸 순서를 맞춘다(처음 한 번)
  useState(() => resetGridStorageIfColumnsChanged(STORAGE_KEY, GRID_FIELDS));

  return (
    <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
      <F1Grid
        key={gridKey}
        ref={gridRef}
        rows={rows}
        columns={columns}
        rowKey="id"
        storageKey="pd-actual-grid"
        ariaLabel="F1-GRID 생산입고"
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
        onChangesChange={onChangesChange}
      />
    </Box>
  );
}

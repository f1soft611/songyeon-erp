import type { RefObject } from 'react';
import { Box, Chip } from '@mui/material';
import { F1Grid, type F1GridColumn, type F1GridRef } from '../../../../../shared/components/f1-grid';
import type { Receiving } from '../types/receiving.types';
import { formatMoney, formatQty, materialWithCode } from '../utils/receiving';

// 반품내역 칸
export function createReceivingReturnColumns(): F1GridColumn<Receiving>[] {
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
      field: 'receiveDate',
      headerName: '반품일',
      width: 110,
      align: 'center',
    },
    {
      field: 'clientName',
      headerName: '거래처',
      width: 140,
      align: 'left',
      renderCell: ({ row }) => row.clientName || '',
    },
    {
      field: 'materialName',
      headerName: '원재료',
      flex: 1.4,
      width: 200,
      align: 'left',
      renderCell: ({ row }) => materialWithCode(row),
    },
    {
      field: 'qty',
      headerName: '수량',
      width: 90,
      headerAlign: 'center',
      align: 'right',
      renderCell: ({ row }) => formatQty(row.qty),
      getCellStyle: () => ({ color: '#dc2626', fontWeight: 700 }),
    },
    {
      field: 'taxType',
      headerName: '과세',
      width: 76,
      align: 'center',
      renderCell: ({ row }) => <Chip size="small" variant="outlined" label={row.taxType || '과세'} />,
    },
    {
      field: 'unitPrice',
      headerName: '단가',
      width: 100,
      headerAlign: 'center',
      align: 'right',
      renderCell: ({ row }) => formatMoney(row.unitPrice),
    },
    {
      field: 'supplyAmount',
      headerName: '공급가액',
      width: 110,
      headerAlign: 'center',
      align: 'right',
      renderCell: ({ row }) => formatMoney(row.supplyAmount),
    },
    {
      field: 'vatAmount',
      headerName: '부가세',
      width: 100,
      headerAlign: 'center',
      align: 'right',
      renderCell: ({ row }) => formatMoney(row.vatAmount),
    },
    {
      field: 'totalAmount',
      headerName: '합계',
      width: 120,
      headerAlign: 'center',
      align: 'right',
      renderCell: ({ row }) => formatMoney(row.totalAmount),
      getCellStyle: () => ({ color: '#dc2626', fontWeight: 700 }),
    },
    {
      field: 'returnReason',
      headerName: '사유',
      flex: 1,
      width: 140,
      align: 'left',
      renderCell: ({ row }) => row.returnReason || '',
    },
  ];
}

type ReceivingReturnGridProps = {
  rows: Receiving[];
  columns: F1GridColumn<Receiving>[];
  loading: boolean;
  gridKey: number;
  gridRef: RefObject<F1GridRef<Receiving> | null>;
  canDelete: boolean;
  onChangesChange: () => void;
};

// 2026-10-26 오른쪽 클릭 [행 삭제]: 표에서 빼 두고 [저장] 때 지운다
export function ReceivingReturnGrid({ rows, columns, loading, gridKey, gridRef, canDelete, onChangesChange }: ReceivingReturnGridProps) {
  return (
    <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
      <F1Grid
        key={`return-${gridKey}`}
        ref={gridRef}
        rows={rows}
        columns={columns}
        rowKey="id"
        storageKey="pu-recv-return-grid"
        ariaLabel="F1-GRID 반품내역"
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
        allowDeleteRowInContextMenu={canDelete}
        selectRowOnContextMenu
        onChangesChange={onChangesChange}
      />
    </Box>
  );
}

import { Box, Chip, Typography } from '@mui/material';
import { F1Grid, type F1GridColumn } from '../../../../../shared/components/f1-grid';
import type { StatusRow } from '../../receiving-register/types/receiving.types';
import { formatMoney } from '../../receiving-register/utils/receiving';

const returnColor = ({ row }: { row: StatusRow }) => (row.isReturn ? { color: '#dc2626' } : undefined);

// 입고현황 칸
export function createReceivingStatusColumns(): F1GridColumn<StatusRow>[] {
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
      headerName: '입고일자',
      width: 100,
      align: 'center',
      mergeRows: true,
    },
    {
      field: 'clientName',
      headerName: '거래처',
      width: 160,
      align: 'left',
      mergeRows: true,
      renderCell: ({ row }) => (
        <span>
          {row.clientName || ''}
          {row.groupCount > 1 && <Typography component="span" variant="caption" color="text.secondary"> {row.groupCount}건</Typography>}
        </span>
      ),
    },
    // 덩어리의 값이라 거래처 칸과 같은 높이로 묶는다. 모든 줄에 단가가 없으면 0 이 아니라 빈칸
    {
      field: 'subtotal',
      headerName: '거래처 소계',
      width: 120,
      type: 'currency',
      align: 'right',
      mergeRows: true,
      renderCell: ({ row }) => formatMoney(row.subtotal),
      getCellStyle: () => ({ fontWeight: 700 }),
    },
    {
      field: 'materialKey',
      headerName: '입고품목',
      flex: 1,
      width: 170,
      align: 'left',
      mergeRows: true,
      renderCell: ({ row }) => (
        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', minWidth: 0 }}>
          <span>{row.materialName || ''}</span>
          {row.isReturn ? <Chip size="small" color="error" variant="outlined" label="반품" /> : null}
        </Box>
      ),
    },
    {
      field: 'qty',
      headerName: '수량',
      width: 90,
      type: 'number',
      decimalPlaces: 2,
      align: 'right',
      getCellStyle: returnColor,
    },
    {
      field: 'taxType',
      headerName: '과세',
      width: 70,
      align: 'center',
    },
    {
      field: 'unitPrice',
      headerName: '단가',
      width: 100,
      type: 'currency',
      decimalPlaces: 4,
      align: 'right',
    },
    {
      field: 'supplyAmount',
      headerName: '공급가액',
      width: 110,
      type: 'currency',
      decimalPlaces: 3,
      align: 'right',
    },
    {
      field: 'vatAmount',
      headerName: '부가세',
      width: 100,
      type: 'currency',
      decimalPlaces: 3,
      align: 'right',
    },
    {
      field: 'totalAmount',
      headerName: '합계금액',
      width: 120,
      type: 'currency',
      decimalPlaces: 3,
      align: 'right',
      getCellStyle: ({ row }) => ({ fontWeight: 700, ...(row.isReturn ? { color: '#dc2626' } : {}) }),
    },
  ];
}

type ReceivingStatusGridProps = {
  rows: StatusRow[];
  columns: F1GridColumn<StatusRow>[];
  loading: boolean;
};

export function ReceivingStatusGrid({ rows, columns, loading }: ReceivingStatusGridProps) {
  return (
    <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
      <F1Grid
        key="instatus"
        rows={rows}
        columns={columns}
        rowKey="id"
        storageKey="pu-recv-instatus-grid"
        ariaLabel="F1-GRID 입고현황"
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
      />
    </Box>
  );
}

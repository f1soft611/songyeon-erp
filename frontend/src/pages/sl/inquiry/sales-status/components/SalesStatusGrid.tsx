import type { RefObject } from 'react';
import { Box, Chip } from '@mui/material';
import { F1Grid, type F1GridColumn, type F1GridRef } from '../../../../../shared/components/f1-grid';
import type { SaleRow } from '../utils/salesStatus';

export function createSalesStatusColumns(): F1GridColumn<SaleRow>[] {
  return [
    {
      field: 'id',
      type: 'rownumber',
      width: 56,
      headerName: 'No',
      align: 'center',
      pinned: 'left',
      search: { hidden: true }
    },
    {
      field: 'saleDate',
      headerName: '판매일자',
      width: 120,
      type: 'date',
      align: 'center',
      search: { label: '판매일자', order: 2, span: 2, required: true }
    },
    {
      field: 'clientName',
      headerName: '거래처',
      flex: 1,
      width: 150,
      align: 'left',
      search: { hidden: true }
    },
    {
      field: 'productName',
      headerName: '품목명',
      flex: 1.5,
      width: 220,
      align: 'left',
      search: { label: '품목코드/명', order: 1 }
    },
    {
      field: 'qty',
      headerName: '수량',
      type: 'number',
      decimalPlaces: 4,
      width: 100,
      align: 'right',
      search: { hidden: true }
    },
    {
      field: 'unitPrice',
      headerName: '단가',
      type: 'currency',
      decimalPlaces: 4,
      width: 110,
      align: 'right',
      search: { hidden: true }
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
      width: 110,
      align: 'center',
      renderCell: ({ row }) => <Chip size="small" variant="outlined" label={row.sourceLabel || ''} />,
      search: { hidden: true },
    },
    {
      field: 'note',
      headerName: '메모',
      flex: 1,
      width: 150,
      align: 'left',
      search: { hidden: true }
    },
  ];
}

type SalesStatusGridProps = {
  rows: SaleRow[];
  columns: F1GridColumn<SaleRow>[];
  canDelete: boolean;
  loading: boolean;
  gridKey: number;
  gridRef: RefObject<F1GridRef<SaleRow> | null>;
  onChangesChange: () => void;
};

// 오른쪽 클릭 [행 삭제] · Delete 키: 표에서 빼 두고 [저장] 때 지운다. 삭제 권한이 없으면 메뉴를 끄고, Delete 키는 onChangesChange 에서 되살린다
export function SalesStatusGrid({ rows, columns, canDelete, loading, gridKey, gridRef, onChangesChange }: SalesStatusGridProps) {
  return (
    <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
      <F1Grid
        key={gridKey}
        ref={gridRef}
        rows={rows}
        columns={columns}
        rowKey="id"
        storageKey="sl-sales-status-grid"
        ariaLabel="F1-GRID 판매현황"
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
        allowDeleteRowInContextMenu={canDelete}
        selectRowOnContextMenu
        onChangesChange={onChangesChange}
      />
    </Box>
  );
}

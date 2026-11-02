import { Box } from '@mui/material';
import { F1Grid, type F1GridColumn } from '../../../../../shared/components/f1-grid';
import type { ProdStatusRow } from '../types/prodStatus.types';
import { noteText } from '../utils/prodStatus';

// 생산현황 칸(보기 전용): 생산일 · 거래처 · 품목명(규격) · 생산지시량 · 실생산량 · 비고.
// 상세 조회(⌄)에는 거래처 · 품목코드/명만 나온다(2026-10-30)
export function createProdStatusColumns(): F1GridColumn<ProdStatusRow>[] {
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
      field: 'scheduleDate',
      headerName: '생산일',
      type: 'date',
      width: 120,
      search: { hidden: true },
      align: 'center',
    },
    {
      field: 'clientName',
      headerName: '거래처',
      flex: 1,
      width: 140,
      search: { label: '거래처', order: 1 },
      align: 'left',
    },
    {
      field: 'productName',
      headerName: '품목명(규격)',
      flex: 1.5,
      width: 200,
      search: { label: '품목코드/명', order: 2 },
      align: 'left',
    },
    {
      field: 'orderQty',
      headerName: '생산지시량',
      width: 130,
      search: { hidden: true },
      align: 'right',
      type: 'number',
      decimalPlaces: 2,
    },
    {
      field: 'actualQty',
      headerName: '실생산량',
      width: 130,
      search: { hidden: true },
      align: 'right',
      type: 'number',
      decimalPlaces: 2,
      getCellStyle: () => ({ fontWeight: 700 }),
    },
    {
      field: 'note',
      headerName: '비고',
      flex: 1,
      width: 160,
      search: { hidden: true },
      align: 'left',
      renderCell: ({ row }) => noteText(row.note),
    },
  ];
}

type ProdStatusGridProps = {
  rows: ProdStatusRow[];
  columns: F1GridColumn<ProdStatusRow>[];
  loading: boolean;
};

export function ProdStatusGrid({ rows, columns, loading }: ProdStatusGridProps) {
  return (
    <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
      <F1Grid
        rows={rows}
        columns={columns}
        rowKey="id"
        storageKey="pd-status-grid"
        ariaLabel="F1-GRID 생산현황"
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

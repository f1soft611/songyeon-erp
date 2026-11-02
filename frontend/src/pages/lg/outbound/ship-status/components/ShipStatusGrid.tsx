import { Box, Chip } from '@mui/material';
import { F1Grid, type F1GridColumn } from '../../../../../shared/components/f1-grid';
import type { ShipStatusRow } from '../types/shipStatus.types';
import { carryoverText } from '../utils/shipStatus';

// 출하현황 칸(보기 전용). 금액만 다른 때로 넘긴(이월) 건은 물건이 이 날짜에 나갔으므로 빼지 않고 비고에 꼬리표를 단다.
// 상세 조회(⌄)에는 거래처 · 품목코드/명만 나온다(2026-10-30)
export function createShipStatusColumns(): F1GridColumn<ShipStatusRow>[] {
  return [
    {
      field: 'key',
      type: 'rownumber',
      width: 56,
      headerName: 'No',
      search: { hidden: true },
      align: 'center',
      pinned: 'left',
    },
    {
      field: 'scheduleDate',
      headerName: '출고일',
      width: 110,
      type: 'date',
      search: { hidden: true },
      align: 'center',
      pinned: 'left',
    },
    {
      field: 'clientName',
      headerName: '거래처',
      flex: 1,
      width: 170,
      search: { label: '거래처', order: 1 },
      align: 'left',
      pinned: 'left',
    },
    {
      field: 'productName',
      headerName: '품목명(규격)',
      flex: 1.5,
      width: 250,
      search: { label: '품목코드/명', order: 2 },
      align: 'left',
      pinned: 'left',
    },
    {
      field: 'storage',
      headerName: '보관방법',
      width: 120,
      search: { hidden: true },
      align: 'left',
    },
    {
      field: 'orderQty',
      headerName: '출하량',
      width: 90,
      search: { hidden: true },
      align: 'right',
      type: 'number',
      decimalPlaces: 2,
      getCellStyle: () => ({ fontWeight: 700 }),
    },
    {
      field: 'vehicle',
      headerName: '배차',
      width: 120,
      search: { hidden: true },
      align: 'left',
    },
    {
      field: 'driverName',
      headerName: '운행자',
      width: 90,
      search: { hidden: true },
      align: 'left',
    },
    {
      field: 'visitOrder',
      headerName: '순서',
      width: 60,
      search: { hidden: true },
      align: 'right',
    },
    {
      field: 'packingMethod',
      headerName: '포장방법',
      width: 100,
      search: { hidden: true },
      align: 'left',
    },
    {
      field: 'shipNote',
      headerName: '특이사항',
      flex: 1,
      width: 140,
      search: { hidden: true },
      align: 'left',
    },
    {
      field: 'carryoverLabel',
      headerName: '비고',
      width: 170,
      search: { hidden: true },
      align: 'left',
      renderCell: ({ row }) => (row.carriedOver ? <Chip size="small" color="warning" variant="outlined" label={carryoverText(row)} /> : ''),
    },
  ];
}

type ShipStatusGridProps = {
  rows: ShipStatusRow[];
  columns: F1GridColumn<ShipStatusRow>[];
  loading: boolean;
};

export function ShipStatusGrid({ rows, columns, loading }: ShipStatusGridProps) {
  return (
    <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
      <F1Grid
        rows={rows}
        columns={columns}
        rowKey="key"
        storageKey="lg-ship-status-grid"
        ariaLabel="F1-GRID 출하현황"
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

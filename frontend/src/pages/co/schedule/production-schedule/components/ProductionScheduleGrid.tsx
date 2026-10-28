import { Box } from '@mui/material';
import { F1Grid, type F1GridColumn } from '../../../../../shared/components/f1-grid';
import type { ProductionScheduleRow } from '../../types/schedule.types';

// 보기 전용(등록 · 수정은 수주등록 · 생산확정에서 한다)
export function createProductionScheduleColumns(): F1GridColumn<ProductionScheduleRow>[] {
  return [
    {
      field: 'id',
      headerName: 'No',
      type: 'rownumber',
      width: 56,
      align: 'center',
      pinned: 'left',
    },
    {
      field: 'clientName',
      headerName: '거래처',
      flex: 1,
      width: 160,
      align: 'left',
      editable: false
    },
    {
      field: 'productName',
      headerName: '품목명(규격)',
      flex: 1.5,
      width: 220,
      align: 'left',
      editable: false
    },
    {
      field: 'orderQty',
      headerName: '생산지시량',
      width: 120,
      align: 'right',
      type: 'decimal',
      decimalPlaces: 2,
      editable: false
    },
    {
      field: 'note',
      headerName: '비고',
      flex: 1,
      width: 140,
      headerAlign: 'center',
      align: 'left',
      editable: false,
      getValue: (row) => row.note || '',
    },
    {
      field: 'logisticsDate',
      headerName: '물류출고일',
      width: 120,
      type: 'date',
      align: 'center',
      editable: false,
      getValue: (row) => row.logisticsDate || '',
    },
  ];
}

type ProductionScheduleGridProps = {
  rows: ProductionScheduleRow[];
  columns: F1GridColumn<ProductionScheduleRow>[];
  loading: boolean;
};

// 엑셀은 제목줄 [엑셀 다운로드](송연 엑셀 칸)로만 내려받는다
export function ProductionScheduleGrid({ rows, columns, loading }: ProductionScheduleGridProps) {
  return (
    <Box sx={{ flex: 1, minHeight: 0, height: '100%', overflow: 'hidden' }}>
      <F1Grid
        ariaLabel="F1-GRID 생산스케줄"
        storageKey="cm-production-schedule-grid"
        rows={rows}
        columns={columns}
        rowKey="id"
        loading={loading}
        height="100%"
        maxHeight="100%"
        rowHeight={34}
        minRowHeight={34}
        maxRowHeight={320}
        showCheckbox={false}
        allowAddRowInContextMenu={false}
        allowDuplicateRowInContextMenu={false}
        allowDeleteRowInContextMenu={false}
      />
    </Box>
  );
}

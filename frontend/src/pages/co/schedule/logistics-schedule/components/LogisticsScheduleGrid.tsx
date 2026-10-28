import { Box, Chip } from '@mui/material';
import { F1Grid, type F1GridColumn } from '../../../../../shared/components/f1-grid';
import type { LogisticsScheduleRow } from '../../types/schedule.types';
import { logisticsStatus } from '../../utils/schedule';

const STATUS_COLOR = { 생산연동: 'success', 출하완료: 'success', 출하대기: 'warning' } as const;

// 보기 전용(등록 · 수정은 출하등록에서 한다). 출하등록 줄과 물류출고일이 있는 생산확정 줄(생산연동)을 함께 보여준다
export function createLogisticsScheduleColumns(): F1GridColumn<LogisticsScheduleRow>[] {
  return [
    {
      field: 'key',
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
      headerName: '출고량',
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
      align: 'left',
      editable: false
    },
    {
      field: 'shipped',
      headerName: '상태',
      width: 110,
      headerAlign: 'center',
      align: 'center',
      editable: false,
      getValue: (row) => logisticsStatus(row),
      renderCell: ({ row }) => {
        const status = logisticsStatus(row);
        return <Chip size="small" variant="outlined" color={STATUS_COLOR[status]} label={status} />;
      },
    },
  ];
}

type LogisticsScheduleGridProps = {
  rows: LogisticsScheduleRow[];
  columns: F1GridColumn<LogisticsScheduleRow>[];
  loading: boolean;
};

// 엑셀은 제목줄 [엑셀 다운로드](송연 엑셀 칸)로만 내려받는다
export function LogisticsScheduleGrid({ rows, columns, loading }: LogisticsScheduleGridProps) {
  return (
    <Box sx={{ flex: 1, minHeight: 0, height: '100%', overflow: 'hidden' }}>
      <F1Grid
        ariaLabel="F1-GRID 물류스케줄"
        storageKey="cm-logistics-schedule-grid"
        rows={rows}
        columns={columns}
        rowKey="key"
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

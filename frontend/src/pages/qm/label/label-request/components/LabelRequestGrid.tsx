import { Box, Button } from '@mui/material';
import { F1Grid, type F1GridColumn } from '../../../../../shared/components/f1-grid';
import { LABEL_GRID_PROPS, blockDeleteKey, smallBtn, stateChip } from '../../label-register/components/labelGridParts';
import { FILL_STATE_TEXT, dateTime16, requestStatusText, type LabelRequestRow } from '../../label-register/utils/labelRegister';

type LabelRequestColumnOptions = {
  onFill: (row: LabelRequestRow) => void;
  onMove: (row: LabelRequestRow) => void;
};

// 표시사항 요청 칸
export function createLabelRequestColumns({ onFill, onMove }: LabelRequestColumnOptions): F1GridColumn<LabelRequestRow>[] {
  return [
    {
      field: 'id',
      type: 'rownumber',
      width: 56,
      headerName: 'No',
      align: 'center',
      pinned: 'left'
    },
    {
      field: 'clientName',
      headerName: '업체명',
      width: 140,
      align: 'left',
    },
    {
      field: 'recipeName',
      headerName: '레시피명',
      flex: 1.2,
      width: 200,
      align: 'left',
      renderCell: ({ row }) => <>{row.recipeName || '(삭제된 레시피)'} <Box component="span" sx={{ color: 'text.secondary', fontSize: 11.5 }}>{row.versionLabel || ''}</Box></>,
    },
    {
      field: 'spec',
      headerName: '규격',
      width: 110,
      align: 'left',
    },
    {
      field: 'requestedByName',
      headerName: '요청자',
      width: 90,
      align: 'left',
    },
    {
      field: 'requestedAt',
      headerName: '요청일',
      width: 140,
      align: 'center',
      renderCell: ({ row }) => dateTime16(row.requestedAt) || ''
    },
    {
      field: 'fillState',
      headerName: '표시사항',
      width: 90,
      align: 'center',
      renderCell: ({ row }) => stateChip(row.fillState, FILL_STATE_TEXT[row.fillState])
    },
    { 
      field: 'status', 
      headerName: '상태',
      width: 170,
       align: 'left', 
       renderCell: ({ row }) => requestStatusText(row)
       },
    {
      field: 'movedProductCode',
       headerName: '',
        width: 230, 
         align: 'left',
      renderCell: ({ row }) => (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Button size="small" variant="contained" sx={smallBtn} onClick={() => onFill(row)}>🏷️ 표시사항</Button>
          {!row.movedProductCode && <Button size="small" variant="outlined" sx={smallBtn} onClick={() => onMove(row)}>제품으로 옮기기</Button>}
        </Box>
      ),
    },
  ];
}

type LabelRequestGridProps = {
  rows: LabelRequestRow[];
  columns: F1GridColumn<LabelRequestRow>[];
  loading: boolean;
};

// 줄 추가 · 삭제 기능이 없는 표: 오른쪽 클릭 [행 추가] · [행 삭제] 없음, Delete 키로 줄이 빠지지 않게 막는다
export function LabelRequestGrid({ rows, columns, loading }: LabelRequestGridProps) {
  return (
    <Box sx={{ flex: 1, minHeight: 160 }} onKeyDownCapture={blockDeleteKey}>
      <F1Grid rows={rows} columns={columns} rowKey="id" storageKey="qm-label-request-grid" ariaLabel="F1-GRID 표시사항 요청" loading={loading} {...LABEL_GRID_PROPS} />
    </Box>
  );
}

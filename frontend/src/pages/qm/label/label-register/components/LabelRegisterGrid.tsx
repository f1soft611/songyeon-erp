import { Box, Button } from '@mui/material';
import { F1Grid, type F1GridColumn } from '../../../../../shared/components/f1-grid';
import { LABEL_STATE_TEXT, type LabelProductRow } from '../utils/labelRegister';
import { LABEL_GRID_PROPS, blockDeleteKey, smallBtn, stateChip } from './labelGridParts';

type LabelRegisterColumnOptions = {
  onRegister: (row: LabelProductRow) => void;
};

// 라벨등록 칸
export function createLabelRegisterColumns({ onRegister }: LabelRegisterColumnOptions): F1GridColumn<LabelProductRow>[] {
  return [
    {
      field: 'labelState',
      type: 'rownumber',
      width: 56,
      headerName: 'No',
      align: 'center'
      , pinned: 'left'
    },
    {
      field: 'code',
      headerName: '제품코드',
      width: 100,
      align: 'center'
    },
    {
      field: 'name',
      headerName: '제품명',
      flex: 1.4,
      width: 240,
      align: 'left',
    },
    {
      field: 'spec',
      headerName: '규격단위',
      width: 140,
      align: 'left',
    },
    {
      field: 'versionCount',
      headerName: '라벨',
      width: 90,
      align: 'center',
      renderCell: ({ row }) => stateChip(row.labelState, LABEL_STATE_TEXT[row.labelState])
    },
    {
      field: 'currentVersion',
      headerName: '사용중 버전',
      width: 100,
      align: 'center',
      renderCell: ({ row }) => (
        <>{row.currentVersion || ''}{(row.versionCount || 0) > 1 && <Box component="span" sx={{ color: 'text.secondary', fontSize: 11.5, ml: 0.5 }}>(총 {row.versionCount}개)</Box>}</>
      ),
    },
    {
      field: 'lastEdited',
      headerName: '마지막 수정',
      width: 140,
      align: 'center', // 서버가 분까지 잘라 보낸다(2026-10-26 17:56)
    },
    {
      field: 'action' as keyof LabelProductRow,
      headerName: '',
      width: 120,
      headerAlign: 'center',
      align: 'center',
      renderCell: ({ row }) => <Button size="small" variant="contained" sx={smallBtn} onClick={() => onRegister(row)}>🏷️ 라벨등록</Button>,
    },
  ];
}

type LabelRegisterGridProps = {
  rows: LabelProductRow[];
  columns: F1GridColumn<LabelProductRow>[];
  loading: boolean;
};

// 줄 추가 · 삭제 기능이 없는 표: 오른쪽 클릭 [행 추가] · [행 삭제] 없음, Delete 키로 줄이 빠지지 않게 막는다
export function LabelRegisterGrid({ rows, columns, loading }: LabelRegisterGridProps) {
  return (
    <Box sx={{ flex: 1, minHeight: 160 }} onKeyDownCapture={blockDeleteKey}>
      <F1Grid rows={rows} columns={columns} rowKey="code" storageKey="qm-label-register-grid" ariaLabel="F1-GRID 라벨등록 제품" loading={loading} {...LABEL_GRID_PROPS} />
    </Box>
  );
}

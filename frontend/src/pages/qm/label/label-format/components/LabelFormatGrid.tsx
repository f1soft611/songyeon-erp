import { Box, Button } from '@mui/material';
import { F1Grid, type F1GridColumn } from '../../../../../shared/components/f1-grid';
import { LABEL_GRID_PROPS, blockDeleteKey, smallBtn } from '../../label-register/components/labelGridParts';
import { dateTime16, type LabelTemplateRow } from '../../label-register/utils/labelRegister';

// 양식 한 줄: 칸 · 줄 수를 함께 보인다
export type LabelFormatRow = LabelTemplateRow & { colCount: number; rowCount: number };

type LabelFormatColumnOptions = {
  onEdit: (row: LabelFormatRow) => void;
  onCopy: (row: LabelFormatRow) => void;
  onDelete: (row: LabelFormatRow) => void;
};

// 라벨양식 칸
export function createLabelFormatColumns({ onEdit, onCopy, onDelete }: LabelFormatColumnOptions): F1GridColumn<LabelFormatRow>[] {
  return [
    { field: 'id', type: 'rownumber', width: 56, headerName: 'No', headerAlign: 'center', align: 'center', pinned: 'left' },
    { field: 'name', headerName: '양식 이름', flex: 1, width: 220, headerAlign: 'center', align: 'left' },
    { field: 'size', headerName: '종이 크기', width: 110, headerAlign: 'center', align: 'center', renderCell: ({ row }) => row.size || '' },
    { field: 'colCount', headerName: '칸', width: 70, headerAlign: 'center', align: 'right' },
    { field: 'rowCount', headerName: '줄', width: 70, headerAlign: 'center', align: 'right' },
    { field: 'createdAt', headerName: '만든 날짜', width: 140, headerAlign: 'center', align: 'center', renderCell: ({ row }) => dateTime16(row.createdAt) },
    {
      field: 'action' as keyof LabelFormatRow, headerName: '', width: 200, headerAlign: 'center', align: 'center',
      renderCell: ({ row }) => (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Button size="small" variant="outlined" sx={smallBtn} onClick={() => onEdit(row)}>편집</Button>
          <Button size="small" variant="outlined" sx={smallBtn} onClick={() => onCopy(row)}>복사</Button>
          <Button size="small" variant="outlined" color="error" sx={smallBtn} onClick={() => onDelete(row)}>삭제</Button>
        </Box>
      ),
    },
  ];
}

type LabelFormatGridProps = {
  rows: LabelFormatRow[];
  columns: F1GridColumn<LabelFormatRow>[];
  loading: boolean;
};

// 줄 추가 · 삭제 기능이 없는 표(양식 삭제는 줄의 [삭제] 단추로, 쓰는 제품이 있으면 막음). Delete 키로 줄이 빠지지 않게 막는다
export function LabelFormatGrid({ rows, columns, loading }: LabelFormatGridProps) {
  return (
    <Box sx={{ flex: 1, minHeight: 160 }} onKeyDownCapture={blockDeleteKey}>
      <F1Grid rows={rows} columns={columns} rowKey="id" storageKey="qm-label-format-grid" ariaLabel="F1-GRID 라벨양식" loading={loading} {...LABEL_GRID_PROPS} />
    </Box>
  );
}

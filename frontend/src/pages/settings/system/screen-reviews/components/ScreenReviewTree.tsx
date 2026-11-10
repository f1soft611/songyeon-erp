import { Box, Tooltip } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { F1Tree, type F1GridColumn } from '../../../../../shared/components/f1-grid';
import { SUMMARY_STATUS_LABELS } from '../screenReviewManagement';
import type { ScreenReviewTreeRow } from '../types/screenReviewManagement.types';
import { STATUS_TONES } from './ScreenReviewSummaryCards';

type ScreenReviewTreeProps = {
  rows: ScreenReviewTreeRow[];
  loading: boolean;
};

// 비고: 마지막 이력 의견을 한 줄로(줄바꿈은 띄어쓰기로), 넘치면 말줄임 · 마우스를 올리면 전체
const oneLine = (text: string | null) => (text ?? '').replace(/\s*\n\s*/g, ' ').trim();

const columns: F1GridColumn<ScreenReviewTreeRow>[] = [
  { field: 'id', type: 'rownumber', width: 56, headerName: 'No', align: 'center', pinned: 'left' },
  {
    field: 'category',
    headerName: '메뉴구분',
    width: 160,
    pinned: 'left',
    getCellStyle: ({ row }) => (row.isModule ? { fontWeight: 700 } : undefined),
  },
  { field: 'menuName', headerName: '화면명', width: 150 },
  { field: 'menuCode', headerName: '화면코드', width: 170 },
  { field: 'developerName', headerName: '담당자', width: 84, align: 'center' },
  { field: 'reviewDate', headerName: '검수일', width: 100, align: 'center' },
  {
    field: 'displayStatus',
    headerName: '상태',
    width: 100,
    align: 'center',
    renderCell: ({ row }) =>
      row.displayStatus ? (
        <Box
          component="span"
          sx={(theme) => {
            const tone = STATUS_TONES[row.displayStatus!](theme);
            return {
              display: 'inline-block', minWidth: 76, px: 1, py: 0.25, borderRadius: 999, fontSize: 12, fontWeight: 700,
              textAlign: 'center', color: tone, bgcolor: alpha(tone, 0.14),
            };
          }}
        >
          {SUMMARY_STATUS_LABELS[row.displayStatus]}
        </Box>
      ) : null,
  },
  {
    field: 'lastComment',
    headerName: '비고',
    width: 220,
    flex: 1,
    renderCell: ({ row }) => {
      const text = oneLine(row.lastComment);
      return text ? (
        <Tooltip title={<Box sx={{ whiteSpace: 'pre-wrap' }}>{row.lastComment}</Box>}>
          <Box component="span" sx={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{text}</Box>
        </Tooltip>
      ) : null;
    },
  },
];

// 화면검수 관리 표: 모듈 묶음 줄 아래 화면 줄. 보기 전용(편집 · 행 추가 · 오른쪽 클릭 메뉴 없음)
export function ScreenReviewTree({ rows, loading }: ScreenReviewTreeProps) {
  return (
    <F1Tree
      rows={rows}
      columns={columns}
      rowKey="id"
      parentKey="parentId"
      treeColumn="category"
      storageKey="songyeon-erp:screen-review-management-tree"
      defaultExpandAll
      showCheckbox={false}
      height="100%"
      getRowOrder={(row) => row.order}
      columnLine
      disableContextMenu
      loading={loading}
      ariaLabel="화면검수 관리 목록"
    />
  );
}

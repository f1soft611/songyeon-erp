import type { KeyboardEvent } from 'react';
import { Box, Button } from '@mui/material';
import { F1Grid, type F1GridColumn } from '../../../../../shared/components/f1-grid';
import { recordScoreText, recordStatusText, type SurveyRecordRow } from '../utils/prerequisite';

// 현황 표(송연 qv-list-rows). 2026-11-09 서버 연결. 서류 이름을 누르면 표 아래에 보기 전용으로 연다(원본은 줄 아무 데나 — F1-Grid 는 줄 누르기 이벤트가 없어 제품검사처럼 이름 단추).
// 줄 추가 · 삭제 기능이 없는 표라 오른쪽 클릭 [행 추가] · [행 삭제] 와 Delete 키를 막는다
const GRID_PROPS = {
  height: '100%', maxHeight: '100%', rowHeight: 38, minRowHeight: 38, maxRowHeight: 320, columnLine: true,
  resizableRows: false, allowAddRowInContextMenu: false, allowDuplicateRowInContextMenu: false, allowDeleteRowInContextMenu: false,
} as const;

const blockDeleteKey = (event: KeyboardEvent<HTMLElement>) => {
  if (event.key === 'Delete') {
    event.preventDefault();
    event.stopPropagation();
  }
};

export function createSurveyRecordColumns({ onOpen }: { onOpen: (row: SurveyRecordRow) => void }): F1GridColumn<SurveyRecordRow>[] {
  return [
    { field: 'id', type: 'rownumber', width: 56, headerName: 'No', align: 'center', pinned: 'left' },
    { field: 'docDate', headerName: '점검일', width: 110, align: 'center' },
    {
      field: 'formName',
      headerName: '서류',
      flex: 1,
      width: 240,
      align: 'left',
      renderCell: ({ row }) => (
        <Button size="small" variant="text" sx={{ minWidth: 0, px: 0.5, py: 0, justifyContent: 'flex-start', textAlign: 'left' }} onClick={() => onOpen(row)}>{row.formName}</Button>
      ),
    },
    { field: 'bindName', headerName: '점검 대상', width: 170, align: 'left' },
    // 기간 이름(예: 2026년 45주차 (11.2~11.8)), 없으면 주기(수시)
    { field: 'period', headerName: '기간', width: 170, align: 'center', renderCell: ({ row }) => row.period || row.cycle },
    { field: 'score', headerName: '점수', width: 110, align: 'right', renderCell: ({ row }) => recordScoreText(row) },
    {
      field: 'status',
      headerName: '결재',
      width: 150,
      align: 'center',
      renderCell: ({ row }) => {
        const text = recordStatusText(row);
        if (row.status === '반려') return <Box component="span" sx={{ color: 'error.main' }}>{text}</Box>;
        if (row.status === '검토대기' && row.myTurn) return <b>{text}</b>;
        return text;
      },
    },
    { field: 'writtenBy', headerName: '쓴 사람', width: 95, align: 'center' },
  ];
}

type SurveyRecordGridProps = { rows: SurveyRecordRow[]; columns: F1GridColumn<SurveyRecordRow>[]; loading: boolean };

export function SurveyRecordGrid({ rows, columns, loading }: SurveyRecordGridProps) {
  return (
    <Box sx={{ flex: 1, minHeight: 160 }} onKeyDownCapture={blockDeleteKey}>
      <F1Grid rows={rows} columns={columns} rowKey="id" storageKey="qm-haccp-prerequisite-record-grid" ariaLabel="F1-GRID HACCP(선행) 현황" loading={loading} showCheckbox={false} {...GRID_PROPS} />
    </Box>
  );
}

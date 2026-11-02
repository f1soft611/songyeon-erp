import { useState } from 'react';
import { Box, Button } from '@mui/material';
import { F1Grid, type F1GridColumn } from '../../../../../shared/components/f1-grid';
import { resetGridStorageIfColumnsChanged } from '../../../../../shared/utils/gridStorage';
import type { ShareRow } from '../types/documentBox.types';
import { dateOnly } from '../utils/documentBox';
import { MONO, ROW_BTN, noteCell, until } from './docGridCells';

const STORAGE_KEY = 'pu-doc-shares-sent-grid';
// 2026-11-02 [공유취소] 단추 칸을 rowAction 으로 바꿨다. 저장된 칸 순서에 지금 칸이 없으면 처음 순서로
const GRID_FIELDS = ['key', 'origName', 'toName', 'note', 'createdAt', 'expiresAt', 'rowAction'];

type ShareSentColumnOptions = {
  onCancel: (row: ShareRow) => void;
};

// 보낸 문서 칸
export function createShareSentColumns({ onCancel }: ShareSentColumnOptions): F1GridColumn<ShareRow>[] {
  return [
    {
      field: 'key',
      type: 'rownumber',
      width: 56,
      headerName: 'No',
      align: 'center',
      pinned: 'left',
    },
    {
      field: 'origName',
      headerName: '문서',
      flex: 1,
      width: 300,
      align: 'left',
      renderCell: ({ row }) => `${row.folder ? '📁 ' : ''}${row.origName || ''}`,
    },
    {
      field: 'toName',
      headerName: '받는 사람',
      width: 110,
      align: 'left',
      renderCell: ({ row }) => row.toName || '',
    },
    {
      field: 'note',
      headerName: '한 마디',
      flex: 0.8,
      width: 200,
      align: 'left',
      renderCell: ({ row }) => noteCell(row),
    },
    {
      field: 'createdAt',
      headerName: '보낸 날',
      width: 110,
      align: 'center',
      renderCell: ({ row }) => <Box component="span" sx={MONO}>{dateOnly(row.createdAt)}</Box>,
    },
    {
      field: 'expiresAt',
      headerName: '기한',
      width: 110,
      align: 'center',
      renderCell: ({ row }) => <Box component="span" sx={MONO}>{until(row)}</Box>,
    },
    {
      field: 'rowAction',
      headerName: '',
      width: 100,
      align: 'center',
      renderCell: ({ row }) => <Button size="small" variant="outlined" color="error" sx={ROW_BTN} onClick={() => onCancel(row)}>공유취소</Button>,
    },
  ];
}

type ShareSentGridProps = {
  rows: ShareRow[];
  columns: F1GridColumn<ShareRow>[];
};

export function ShareSentGrid({ rows, columns }: ShareSentGridProps) {
  // 그리드를 그리기 전에 저장된 칸 순서를 맞춘다(처음 한 번)
  useState(() => resetGridStorageIfColumnsChanged(STORAGE_KEY, GRID_FIELDS));

  return (
    <Box sx={{ flex: 1, minHeight: 160, overflow: 'hidden' }}>
      <F1Grid
        key="sent"
        rows={rows}
        columns={columns}
        rowKey="key"
        storageKey="pu-doc-shares-sent-grid"
        ariaLabel="F1-GRID 보낸 문서"
        height="100%"
        maxHeight="100%"
        rowHeight={38}
        minRowHeight={38}
        maxRowHeight={320}
        columnLine
        showCheckbox={false}
        resizableRows={false}
        allowAddRowInContextMenu={false}
        allowDuplicateRowInContextMenu={false}
        allowDeleteRowInContextMenu={false}
      />
    </Box>
  );
}

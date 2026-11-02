import { Box, Link } from '@mui/material';
import { F1Grid, type F1GridColumn } from '../../../../../shared/components/f1-grid';
import type { ShareRow } from '../types/documentBox.types';
import { dateOnly, sizeText } from '../utils/documentBox';
import { MONO, noteCell, smallChip, until } from './docGridCells';

type ShareMineColumnOptions = {
  onOpenFolder: (id: number, name: string) => void;
  onDownload: (id: number, name: string) => void;
};

// 받은 문서 칸.
// 폴더로 온 것은 내려받는 것이 아니라 '열어보는' 것이다. 그래서 줄 모양이 다르다
export function createShareMineColumns({ onOpenFolder, onDownload }: ShareMineColumnOptions): F1GridColumn<ShareRow>[] {
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
      field: 'folder',
      headerName: '',
      width: 44,
      align: 'center',
      renderCell: ({ row }) => <Box component="span" sx={{ fontSize: 15 }}>{row.folder ? (row.locked && !row.unlocked ? '🔒' : '📁') : '📄'}</Box>,
    },
    {
      field: 'origName',
      headerName: '문서',
      flex: 1,
      width: 300,
      align: 'left',
      renderCell: ({ row }) => (row.folder ? (
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Link component="button" onClick={() => onOpenFolder(row.folderId as number, row.origName || '')} sx={{ fontWeight: 700, fontSize: 13 }}>{row.origName}</Link>
          <Box component="span" sx={{ fontSize: 11, color: 'text.secondary', ml: 0.75 }}>폴더 통째로</Box>
          {row.locked && smallChip(row.locked && !row.unlocked ? '비밀번호 필요' : '열어둠')}
        </Box>
      ) : (
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Link component="button" onClick={() => onDownload(row.attachmentId as number, row.origName || 'download')} sx={{ fontSize: 13 }}>{row.origName}</Link>
          <Box component="span" sx={{ fontSize: 11, color: 'text.secondary', ml: 0.75 }}>{sizeText(row.sizeBytes)}</Box>
        </Box>
      )),
    },
    {
      field: 'sharedByName',
      headerName: '보낸 사람',
      width: 110,
      align: 'left',
      renderCell: ({ row }) => row.sharedByName || '',
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
      headerName: '받은 날',
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
  ];
}

type ShareMineGridProps = {
  rows: ShareRow[];
  columns: F1GridColumn<ShareRow>[];
};

export function ShareMineGrid({ rows, columns }: ShareMineGridProps) {
  return (
    <Box sx={{ flex: 1, minHeight: 160, overflow: 'hidden' }}>
      <F1Grid
        key="mine"
        rows={rows}
        columns={columns}
        rowKey="key"
        storageKey="pu-doc-shares-mine-grid"
        ariaLabel="F1-GRID 받은 문서"
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

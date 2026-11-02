import { useState } from 'react';
import { Box, Button, Link } from '@mui/material';
import { F1Grid, type F1GridColumn } from '../../../../../shared/components/f1-grid';
import { resetGridStorageIfColumnsChanged } from '../../../../../shared/utils/gridStorage';
import type { BoxRow, DocFile, DocFolder, DocKind, ShareTarget } from '../types/documentBox.types';
import { deptTag, folderCounts } from '../utils/documentBox';
import { MONO, ROW_BTN, smallChip } from './docGridCells';

const STORAGE_KEY = 'pu-doc-box-grid';
// 2026-11-02 줄 끝 단추 칸을 rowAction 으로 바꿨다. 저장된 칸 순서에 지금 칸이 없으면 처음 순서로
const GRID_FIELDS = ['key', 'type', 'name', 'by', 'date', 'size', 'rowAction'];

type DocumentBoxColumnOptions = {
  kind: DocKind;
  peeking: boolean;
  onOpenFolder: (folder: DocFolder) => void;
  onDownload: (id: number, name: string) => void;
  onShare: (target: ShareTarget) => void;
  onLock: (folder: DocFolder) => void;
  onClearLock: (folder: DocFolder) => void;
  onRename: (folder: DocFolder) => void;
  onDeleteFolder: (folder: DocFolder) => void;
  onDeleteFile: (file: DocFile) => void;
};

// 폴더 · 파일 칸. 남의 것을 보는 중이면 줄 끝 단추를 내주지 않는다
export function createDocumentBoxColumns({
  kind,
  peeking,
  onOpenFolder,
  onDownload,
  onShare,
  onLock,
  onClearLock,
  onRename,
  onDeleteFolder,
  onDeleteFile,
}: DocumentBoxColumnOptions): F1GridColumn<BoxRow>[] {
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
      field: 'type',
      headerName: '',
      width: 44,
      align: 'center',
      renderCell: ({ row }) => <Box component="span" sx={{ fontSize: 16 }}>{row.folder ? (row.folder.locked && !row.folder.unlocked ? '🔒' : '📁') : '📄'}</Box>,
    },
    {
      field: 'name',
      headerName: '이름',
      flex: 1,
      width: 320,
      align: 'left',
      renderCell: ({ row }) => {
        if (row.folder) {
          const f = row.folder;
          const shut = Boolean(f.locked && !f.unlocked);
          const tag = deptTag(f);
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
              <Link component="button" underline="hover" onClick={() => onOpenFolder(f)} sx={{ fontWeight: 700, color: 'text.primary', fontSize: 13 }}>{f.name}</Link>
              {tag && smallChip(tag)}
              {f.locked && smallChip(shut ? '잠김' : '열어둠')}
              <Box component="span" sx={{ fontSize: 11, color: 'text.secondary', ml: 0.75, whiteSpace: 'nowrap' }}>{folderCounts(f)}</Box>
            </Box>
          );
        }
        const file = row.file as DocFile;
        return <Link component="button" onClick={() => onDownload(file.id, file.origName)} sx={{ fontSize: 13, textAlign: 'left' }}>{file.origName}</Link>;
      },
    },
    {
      field: 'by',
      headerName: '올린 사람',
      width: 110,
      align: 'left',
    },
    {
      field: 'date',
      headerName: '올린 날짜',
      width: 110,
      align: 'center',
      renderCell: ({ row }) => <Box component="span" sx={MONO}>{row.date}</Box>,
    },
    {
      field: 'size',
      headerName: '크기',
      width: 90,
      headerAlign: 'center',
      align: 'right',
    },
    {
      field: 'rowAction',
      headerName: '',
      width: 470,
      align: 'left',
      renderCell: ({ row }) => {
        if (peeking) return null;
        if (row.folder) {
          const f = row.folder;
          return (
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <Button size="small" variant="outlined" sx={ROW_BTN} onClick={() => onShare({ attachmentId: null, folderId: f.id, name: f.name })}>📤 공유</Button>
              <Button size="small" variant="outlined" sx={ROW_BTN} onClick={() => onLock(f)}>{f.locked ? '🔒 비밀번호 바꾸기' : '🔓 비밀번호 걸기'}</Button>
              {f.locked && <Button size="small" variant="outlined" sx={ROW_BTN} onClick={() => onClearLock(f)}>잠금해제</Button>}
              <Button size="small" variant="outlined" sx={ROW_BTN} onClick={() => onRename(f)}>이름변경</Button>
              <Button size="small" variant="outlined" color="error" sx={ROW_BTN} onClick={() => onDeleteFolder(f)}>삭제</Button>
            </Box>
          );
        }
        const file = row.file as DocFile;
        return (
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {/* 개인문서함 문서만 사람을 골라 보낸다. 공용함 문서는 그 부서 사람이 이미 본다 */}
            {kind === '개인' && (
              <Button size="small" variant="outlined" sx={ROW_BTN} onClick={() => onShare({ attachmentId: file.id, folderId: null, name: file.origName })}>
                공유{file.shareCount ? ` (${file.shareCount})` : ''}
              </Button>
            )}
            <Button size="small" variant="outlined" color="error" sx={ROW_BTN} onClick={() => onDeleteFile(file)}>삭제</Button>
          </Box>
        );
      },
    },
  ];
}

type DocumentBoxGridProps = {
  rows: BoxRow[];
  columns: F1GridColumn<BoxRow>[];
  loading: boolean;
};

export function DocumentBoxGrid({ rows, columns, loading }: DocumentBoxGridProps) {
  // 그리드를 그리기 전에 저장된 칸 순서를 맞춘다(처음 한 번)
  useState(() => resetGridStorageIfColumnsChanged(STORAGE_KEY, GRID_FIELDS));

  return (
    <Box sx={{ flex: 1, minHeight: 160, overflow: 'hidden' }}>
      <F1Grid
        key="box"
        rows={rows}
        columns={columns}
        rowKey="key"
        storageKey="pu-doc-box-grid"
        ariaLabel="F1-GRID 문서함"
        loading={loading}
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

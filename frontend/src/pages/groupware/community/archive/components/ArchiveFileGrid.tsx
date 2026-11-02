import { useMemo } from 'react';
import DeleteOutlined from '@mui/icons-material/DeleteOutlined';
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined';
import DownloadOutlined from '@mui/icons-material/DownloadOutlined';
import EditOutlined from '@mui/icons-material/EditOutlined';
import FolderOutlined from '@mui/icons-material/FolderOutlined';
import FolderZipOutlined from '@mui/icons-material/FolderZipOutlined';
import ImageOutlined from '@mui/icons-material/ImageOutlined';
import InsertDriveFileOutlined from '@mui/icons-material/InsertDriveFileOutlined';
import PictureAsPdfOutlined from '@mui/icons-material/PictureAsPdfOutlined';
import SlideshowOutlined from '@mui/icons-material/SlideshowOutlined';
import TableChartOutlined from '@mui/icons-material/TableChartOutlined';
import VideoFileOutlined from '@mui/icons-material/VideoFileOutlined';
import {
  Box,
  Button,
  Chip,
  IconButton,
  Stack,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  F1Tree,
  type F1GridColumn,
} from '../../../../../shared/components/f1-grid';
import type { ArchiveBrowserRow, ArchiveFileRow } from '../types/archive.types';

type ArchiveFileGridProps = {
  rows: ArchiveBrowserRow[];
  loading: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canExportExcel: boolean;
  onFolderOpen: (folderCode: string) => void;
  onDownload: (row: ArchiveFileRow) => void;
  onEdit: (row: ArchiveFileRow) => void;
  onDelete: (row: ArchiveFileRow) => void;
};

function formatSize(value?: number | string | null) {
  const size = Number(value ?? 0);
  if (!Number.isFinite(size) || size <= 0) return '—';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value?: string | Date | null) {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString('ko-KR');
}

function getFileIcon(file: ArchiveFileRow) {
  const mimeType = (file.mimeType ?? '').toLowerCase();
  const extension = file.fileName.split('.').pop()?.toLowerCase() ?? '';
  if (mimeType === 'application/pdf' || extension === 'pdf')
    return PictureAsPdfOutlined;
  if (mimeType.startsWith('image/')) return ImageOutlined;
  if (mimeType.startsWith('video/')) return VideoFileOutlined;
  if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz'].includes(extension)) {
    return FolderZipOutlined;
  }
  if (['xls', 'xlsx', 'xlsm', 'ods', 'csv'].includes(extension)) {
    return TableChartOutlined;
  }
  if (['ppt', 'pptx', 'odp'].includes(extension)) return SlideshowOutlined;
  if (
    ['doc', 'docx', 'hwp', 'hwpx', 'odt', 'rtf', 'txt', 'md'].includes(
      extension,
    )
  ) {
    return DescriptionOutlined;
  }
  return InsertDriveFileOutlined;
}

export function ArchiveFileGrid({
  rows,
  loading,
  canUpdate,
  canDelete,
  canExportExcel,
  onFolderOpen,
  onDownload,
  onEdit,
  onDelete,
}: ArchiveFileGridProps) {
  const theme = useTheme();
  const isNarrow = useMediaQuery(theme.breakpoints.down('sm'));
  const columns = useMemo<F1GridColumn<ArchiveBrowserRow>[]>(() => {
    const result: F1GridColumn<ArchiveBrowserRow>[] = [
      {
        field: 'name',
        headerName: '이름',
        flex: 1,
        width: 240,
        editable: false,
        search: { hidden: true },
        renderCell: ({ row }) => {
          if (row.rowType === 'section') {
            return (
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                {row.label}
              </Typography>
            );
          }
          if (row.rowType === 'folder') {
            return (
              <Stack
                direction="row"
                spacing={1}
                sx={{ alignItems: 'center', minWidth: 0 }}
              >
                <FolderOutlined color={row.active ? 'primary' : 'disabled'} />
                <Button
                  type="button"
                  variant="text"
                  onClick={() => onFolderOpen(row.folderCode)}
                  sx={{
                    minWidth: 0,
                    p: 0,
                    justifyContent: 'flex-start',
                    textAlign: 'left',
                    overflowWrap: 'anywhere',
                  }}
                >
                  {row.folderName}
                </Button>
                {!row.active && (
                  <Chip label="사용 중지" size="small" variant="outlined" />
                )}
              </Stack>
            );
          }
          const FileIcon = getFileIcon(row.file);
          return (
            <Stack
              direction="row"
              spacing={1}
              sx={{ alignItems: 'center', minWidth: 0 }}
            >
              <FileIcon fontSize="small" color="action" />
              <Stack sx={{ minWidth: 0 }}>
                <Button
                  type="button"
                  variant="text"
                  onClick={() => onDownload(row.file)}
                  sx={{
                    minWidth: 0,
                    p: 0,
                    justifyContent: 'flex-start',
                    textAlign: 'left',
                    overflowWrap: 'anywhere',
                  }}
                >
                  {row.file.fileName}
                </Button>
                {isNarrow && (
                  <Typography variant="caption" color="text.secondary">
                    {row.file.writerName ?? '—'} ·{' '}
                    {formatDate(row.file.uploadedAt)} ·{' '}
                    {formatSize(row.file.fileSize)}
                  </Typography>
                )}
              </Stack>
            </Stack>
          );
        },
        getCellStyle: ({ row }) =>
          row.rowType === 'section' ? { fontWeight: 700 } : undefined,
      },
    ];

    if (!isNarrow) {
      result.push(
        {
          field: 'ownerName',
          headerName: '소유자',
          align: 'center',
          width: 120,
          editable: false,
          search: { hidden: true },
          renderCell: ({ row }) =>
            row.rowType === 'file' ? (row.file.writerName ?? '—') : '—',
        },
        {
          field: 'uploadedAt',
          headerName: '올린 날짜',
          align: 'center',
          width: 130,
          editable: false,
          search: { hidden: true },
          renderCell: ({ row }) =>
            row.rowType === 'file' ? formatDate(row.file.uploadedAt) : '—',
        },
        {
          field: 'fileSize',
          headerName: '크기',
          align: 'right',
          width: 100,
          editable: false,
          search: { hidden: true },
          renderCell: ({ row }) =>
            row.rowType === 'file' ? formatSize(row.file.fileSize) : '—',
        },
      );
    }

    result.push({
      field: 'rowKey',
      headerName: '작업',
      width: isNarrow ? 112 : 120,
      align: 'center',
      editable: false,
      search: { hidden: true },
      renderCell: ({ row }) => {
        if (row.rowType !== 'file') return '—';
        return (
          <Stack direction="row" spacing={0.25}>
            <Tooltip title="다운로드">
              <IconButton
                type="button"
                size="small"
                aria-label="다운로드"
                onClick={() => onDownload(row.file)}
              >
                <DownloadOutlined fontSize="small" />
              </IconButton>
            </Tooltip>
            {row.active && canUpdate && (
              <Tooltip title="파일 정보 수정">
                <IconButton
                  type="button"
                  size="small"
                  aria-label="파일 정보 수정"
                  onClick={() => onEdit(row.file)}
                >
                  <EditOutlined fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {row.active && canDelete && (
              <Tooltip title="삭제">
                <IconButton
                  type="button"
                  size="small"
                  aria-label="삭제"
                  color="error"
                  onClick={() => onDelete(row.file)}
                >
                  <DeleteOutlined fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        );
      },
    });

    return result;
  }, [
    canDelete,
    canUpdate,
    isNarrow,
    onDelete,
    onDownload,
    onEdit,
    onFolderOpen,
  ]);

  return (
    <Box sx={{ flex: 1, minHeight: 320, minWidth: 0, overflow: 'hidden' }}>
      <F1Tree
        ariaLabel="자료실"
        rows={rows}
        columns={columns}
        rowKey="rowKey"
        parentKey="parentId"
        treeColumn="name"
        defaultExpandAll
        storageKey="groupware-community-archive-file-tree-v1"
        height="100%"
        minHeight={320}
        loading={loading}
        showCheckbox={false}
        disableSorting
        disableFiltering
        stripeRows
        canExportExcel={canExportExcel}
        allowAddRootInContextMenu={false}
        allowAddRowInContextMenu={false}
        allowDeleteRowInContextMenu={false}
        allowDuplicateRowInContextMenu={false}
        columnLine={false}
      />
    </Box>
  );
}

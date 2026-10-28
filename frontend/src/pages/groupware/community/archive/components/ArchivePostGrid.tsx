import { Box, Button } from '@mui/material';
import {
  F1Grid,
  type F1GridColumn,
  type F1GridDataSource,
} from '../../../../../shared/components/f1-grid';
import type { ArchiveCategory, ArchivePost } from '../types/archive.types';

type ArchivePostGridProps = {
  columns: F1GridColumn<ArchivePost>[];
  dataSource: F1GridDataSource<ArchivePost>;
  onDataSourceError: (error: Error) => void;
};

function formatDate(value?: string | Date | null) {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString('ko-KR');
}

export function createArchivePostColumns(
  categories: ArchiveCategory[],
  onSelect: (post: ArchivePost) => void,
): F1GridColumn<ArchivePost>[] {
  const categoryNames = new Map(
    categories.map((category) => [category.code, category.name]),
  );

  return [
    {
      field: 'title',
      headerName: '제목',
      flex: 1,
      width: 260,
      editable: false,
      search: { hidden: true },
      renderCell: ({ row }) => (
        <Button
          type="button"
          variant="text"
          onClick={() => onSelect(row)}
          sx={{
            minWidth: 0,
            maxWidth: '100%',
            p: 0,
            justifyContent: 'flex-start',
            textAlign: 'left',
            overflowWrap: 'anywhere',
          }}
        >
          {row.title}
        </Button>
      ),
    },
    {
      field: 'categoryCode',
      headerName: '분류',
      type: 'select',
      align: 'center',
      editable: false,
      options: categories.map((category) => ({
        value: category.code,
        label: category.name,
      })),
      search: { label: '분류', order: 1 },
      renderCell: ({ row }) =>
        categoryNames.get(row.categoryCode) ?? row.categoryCode,
    },
    {
      field: 'writerName',
      headerName: '작성자',
      align: 'center',
      editable: false,
      search: { hidden: true },
      renderCell: ({ row }) => row.writerName ?? row.writerId ?? '—',
    },
    {
      field: 'createdAt',
      headerName: '등록일',
      align: 'center',
      editable: false,
      search: { hidden: true },
      renderCell: ({ row }) => formatDate(row.createdAt),
    },
    {
      field: 'attachmentCount',
      headerName: '첨부 수',
      align: 'center',
      editable: false,
      search: { hidden: true },
      renderCell: ({ row }) => row.attachmentCount ?? 0,
    },
  ];
}

export function ArchivePostGrid({
  columns,
  dataSource,
  onDataSourceError,
}: ArchivePostGridProps) {
  return (
    <Box sx={{ flex: 1, minHeight: 320, minWidth: 0, overflow: 'hidden' }}>
      <F1Grid
        ariaLabel="자료실"
        columns={columns}
        rowKey="postId"
        dataSource={dataSource}
        onDataSourceError={onDataSourceError}
        storageKey="groupware-community-archive-grid-v1"
        height="100%"
        minHeight={320}
        stripeRows
        // disableContextMenu
        // showCheckbox={false}
        allowAddRowInContextMenu={false}
        allowDeleteRowInContextMenu={false}
        allowDuplicateRowInContextMenu={false}
        canExportExcel={false}
        columnLine={false}
      />
    </Box>
  );
}

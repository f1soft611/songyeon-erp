import type { RefObject } from 'react';
import { Box, Chip, Link, Typography } from '@mui/material';
import { F1Grid, type F1GridColumn, type F1GridRef } from '../../../../../shared/components/f1-grid';
import { downloadAttachment, type AttachmentFile } from '../../../../../shared/services/attachment.service';
import type { Receiving } from '../types/receiving.types';
import { errorText, formatMoney, formatQty, materialWithCode } from '../utils/receiving';

// 붙어있는 서류를 내려받기 링크로(송연 attachmentLinksHTML)
function FileLinks({ files, onError }: { files?: AttachmentFile[]; onError: (text: string) => void }) {
  if (!files || files.length === 0) return <Typography component="span" variant="body2" color="text.secondary">-</Typography>;
  return (
    <Box sx={{ display: 'flex', gap: 0.75, minWidth: 0, overflow: 'hidden' }}>
      {files.map((file) => (
        <Link
          key={file.id}
          component="button"
          type="button"
          underline="always"
          title={file.origName}
          sx={{ fontSize: 11.5, whiteSpace: 'nowrap' }}
          onClick={() => downloadAttachment(file).catch((requestError) => onError(errorText(requestError, '내려받지 못했어요')))}
        >
          📎 {file.origName}
        </Link>
      ))}
    </Box>
  );
}

type ReceivingHistoryColumnOptions = {
  onError: (text: string) => void;
};

// 입고내역 칸
export function createReceivingHistoryColumns({ onError }: ReceivingHistoryColumnOptions): F1GridColumn<Receiving>[] {
  return [
    {
      field: 'id',
      type: 'rownumber',
      width: 56,
      headerName: 'No',
      align: 'center',
      pinned: 'left',
    },
    {
      field: 'clientName',
      headerName: '거래처',
      width: 140,
      align: 'left',
      renderCell: ({ row }) => row.clientName || '',
    },
    {
      field: 'materialName',
      headerName: '원재료',
      flex: 1.4,
      width: 200,
      align: 'left',
      renderCell: ({ row }) => materialWithCode(row),
    },
    {
      field: 'barcode',
      headerName: '바코드',
      width: 130,
      align: 'left',
      renderCell: ({ row }) => <Box component="span" sx={{ fontFamily: 'monospace', fontSize: 11 }}>{row.barcode || ''}</Box>,
    },
    {
      field: 'qty',
      headerName: '수량',
      width: 90,
      headerAlign: 'center',
      align: 'right',
      renderCell: ({ row }) => formatQty(row.qty),
    },
    {
      field: 'taxType',
      headerName: '과세',
      width: 76,
      align: 'center',
      renderCell: ({ row }) => <Chip size="small" variant="outlined" label={row.taxType || '과세'} />,
    },
    {
      field: 'unitPrice',
      headerName: '단가',
      width: 100,
      headerAlign: 'center',
      align: 'right',
      renderCell: ({ row }) => formatMoney(row.unitPrice),
    },
    {
      field: 'supplyAmount',
      headerName: '공급가액',
      width: 110,
      headerAlign: 'center',
      align: 'right',
      renderCell: ({ row }) => formatMoney(row.supplyAmount),
    },
    {
      field: 'vatAmount',
      headerName: '부가세',
      width: 100,
      headerAlign: 'center',
      align: 'right',
      renderCell: ({ row }) => formatMoney(row.vatAmount),
    },
    {
      field: 'totalAmount',
      headerName: '합계',
      width: 120,
      headerAlign: 'center',
      align: 'right',
      renderCell: ({ row }) => formatMoney(row.totalAmount),
      getCellStyle: () => ({ fontWeight: 700 }),
    },
    {
      field: 'files',
      headerName: '서류',
      flex: 1,
      width: 180,
      align: 'left',
      renderCell: ({ row }) => <FileLinks files={row.files} onError={onError} />,
    },
  ];
}

type ReceivingHistoryGridProps = {
  rows: Receiving[];
  columns: F1GridColumn<Receiving>[];
  loading: boolean;
  gridKey: number;
  gridRef: RefObject<F1GridRef<Receiving> | null>;
  canDelete: boolean;
  onChangesChange: () => void;
};

// 2026-10-26 오른쪽 클릭 [행 삭제]: 표에서 빼 두고 [저장] 때 지운다
export function ReceivingHistoryGrid({ rows, columns, loading, gridKey, gridRef, canDelete, onChangesChange }: ReceivingHistoryGridProps) {
  return (
    <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
      <F1Grid
        key={`history-${gridKey}`}
        ref={gridRef}
        rows={rows}
        columns={columns}
        rowKey="id"
        storageKey="pu-recv-history-grid"
        ariaLabel="F1-GRID 입고내역"
        loading={loading}
        height="100%"
        maxHeight="100%"
        rowHeight={34}
        minRowHeight={34}
        maxRowHeight={320}
        columnLine
        showCheckbox={false}
        resizableRows={false}
        allowAddRowInContextMenu={false}
        allowDuplicateRowInContextMenu={false}
        allowDeleteRowInContextMenu={canDelete}
        selectRowOnContextMenu
        onChangesChange={onChangesChange}
      />
    </Box>
  );
}

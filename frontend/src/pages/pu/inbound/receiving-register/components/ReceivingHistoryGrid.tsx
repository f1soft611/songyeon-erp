import { useState, type KeyboardEvent, type RefObject } from 'react';
import { Box, Link, Typography } from '@mui/material';
import { F1Grid, type F1GridColumn, type F1GridRef, type F1GridRowId } from '../../../../../shared/components/f1-grid';
import { downloadAttachment, type AttachmentFile } from '../../../../../shared/services/attachment.service';
import type { Receiving } from '../types/receiving.types';
import { errorText, receivingDeleteBlockReason } from '../utils/receiving';

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
      width: 200,
      align: 'left',
      pinned: 'left',
    },
    {
      field: 'materialName',
      headerName: '원재료',
      flex: 1.4,
      width: 250,
      align: 'left',
      pinned: 'left',
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
      type: 'number',
      decimalPlaces: 2,
      align: 'right',
    },
    {
      field: 'taxType',
      headerName: '과세',
      width: 76,
      align: 'center',
    },
    {
      field: 'unitPrice',
      headerName: '단가',
      width: 100,
      type: 'currency',
      decimalPlaces: 4,
      align: 'right',
    },
    {
      field: 'supplyAmount',
      headerName: '공급가액',
      width: 110,
      type: 'currency',
      decimalPlaces: 3,
      align: 'right',
    },
    {
      field: 'vatAmount',
      headerName: '부가세',
      width: 100,
      type: 'currency',
      decimalPlaces: 3,
      align: 'right',
    },
    {
      field: 'totalAmount',
      headerName: '합계',
      width: 120,
      type: 'currency',
      decimalPlaces: 3,
      align: 'right',
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
  canCreate: boolean;
  canDelete: boolean;
  onAddRow: () => void;
  onDeleteBlocked: (reason: string) => void;
  onChangesChange: () => void;
};

// 2026-10-26 오른쪽 클릭 [행 삭제]: 표에서 빼 두고 [저장] 때 지운다
// 2026-11-05 오른쪽 클릭 [행 추가]: 표에 빈 줄을 넣지 않고 입고 등록 창을 연다(견적 화면과 같은 방식, F1-Grid 가 [행 추가]를 넘겨주는 길은 treeContextMenu 뿐).
// 지울 수 없는 입고(반품이 걸림 · 지우면 재고 마이너스)를 고르면 [행 삭제]를 끄고, Delete 키는 빼지 않고 이유를 알린다. 삭제 권한이 없으면 Delete 키도 막는다
export function ReceivingHistoryGrid({
  rows, columns, loading, gridKey, gridRef, canCreate, canDelete, onAddRow, onDeleteBlocked, onChangesChange,
}: ReceivingHistoryGridProps) {
  const [deleteBlocked, setDeleteBlocked] = useState(false);
  const blockReason = (selectedIds?: F1GridRowId[]) => {
    const grid = gridRef.current;
    const ids = new Set((selectedIds ?? grid?.getSelectedRowIds() ?? []).map(String));
    const selected = rows.filter((row) => ids.has(String(row.id)));
    return receivingDeleteBlockReason(selected, grid?.getChanges().deletedRows ?? []);
  };
  const handleKeyDownCapture = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Delete' || (gridRef.current?.getSelectedRowIds() ?? []).length === 0) return;
    const reason = canDelete ? blockReason() : null;
    if (!canDelete || reason) {
      event.preventDefault();
      event.stopPropagation();
      if (reason) onDeleteBlocked(reason);
    }
  };

  return (
    <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }} onKeyDownCapture={handleKeyDownCapture}>
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
        allowAddRowInContextMenu={canCreate}
        allowAddRootInContextMenu={false}
        treeContextMenu={canCreate ? { onAddRoot: onAddRow, onAddChild: () => onAddRow() } : undefined}
        allowDuplicateRowInContextMenu={false}
        allowDeleteRowInContextMenu={canDelete}
        deleteMenuDisabled={deleteBlocked}
        selectRowOnContextMenu
        onSelectionChange={(rowIds) => setDeleteBlocked(rowIds.length > 0 && blockReason(rowIds) != null)}
        onChangesChange={onChangesChange}
      />
    </Box>
  );
}

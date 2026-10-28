import { useState, type RefObject } from 'react';
import { Box, Chip, IconButton, Tooltip, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { F1Grid, type F1GridChanges, type F1GridColumn, type F1GridRef } from '../../../../../shared/components/f1-grid';
import { resetGridStorageIfColumnsChanged } from '../../../../../shared/utils/gridStorage';
import { formatPrice } from '../../../../../shared/utils/numberFormat';
import { quoteStatusLabel, type QuoteRow } from '../utils/quote';

const STORAGE_KEY = 'sa-quote-grid';
// 2026-10-28 관리 칸(수정 · 확정 · 삭제)을 빼고 [상세] 칸을 더했다. 저장된 칸 순서에 지금 칸이 하나라도 없으면 처음 순서로 다시 시작한다
const GRID_FIELDS = ['quoteId', 'productName', 'spec', 'clientName', 'totalPrice', 'status', 'detailAction'];

// 가견적 목록 칸. 작성 · 수정 · 확정은 [상세] 칸 연필 → 견적 창(제품마스터 · 단가관리 상세 칸과 같은 모양)
export function createQuoteColumns(onOpenDetail: (row: QuoteRow) => void): F1GridColumn<QuoteRow>[] {
  return [
    {
      field: 'quoteId',
      headerName: 'No',
      type: 'rownumber',
      width: 56,
      align: 'center',
      pinned: 'left',
      form: { hidden: true },
      search: { hidden: true },
    },
    {
      field: 'productName',
      headerName: '제품명',
      flex: 1.4,
      width: 200,
      align: 'left',
      editable: false,

      renderCell: ({ row }) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
          <Typography variant="body2" noWrap>{row.productName || ''}</Typography>
          {row.sourceKind && <Chip size="small" color="success" variant="outlined" label={`레시피·${row.sourceKind}`} title={row.sourceRecipe || ''} />}
        </Box>
      ),
    },
    {
      field: 'spec',
      headerName: '규격/단위',
      width: 120,
      align: 'left',
      editable: false,
      getValue: (row) => row.spec || ''
    },
    {
      field: 'clientName',
      headerName: '거래처',
      flex: 1,
      width: 150,
      align: 'left',
      editable: false,
      getValue: (row) => row.clientName || ''
    },
    {
      field: 'totalPrice',
      headerName: '견적단가',
      type: 'currency',
      decimalPlaces: 4,
      width: 120,
      align: 'right',
      editable: false,
      getValue: (row) => row.totalPrice ?? '',
      renderCell: ({ row }) => <b>{formatPrice(row.totalPrice ?? null)}</b>,
    },
    {
      field: 'status',
      headerName: '상태',
      width: 150,
      align: 'center',
      editable: false,
      getValue: (row) => quoteStatusLabel(row),
      renderCell: ({ row }) => (
        <Chip size="small" variant="outlined" color={row.status === 'confirmed' ? 'success' : 'warning'} label={quoteStatusLabel(row)} />
      ),
    },
    {
      // [상세]: 가견적은 수정 창(저장 · 확정), 확정된 견적은 상세보기(읽기 전용)
      field: 'detailAction', headerName: '상세', width: 60, headerAlign: 'center', align: 'center', editable: false, pinned: 'right',
      getValue: () => '',
      renderCell: ({ row }) => (
        <Box
          onClick={(event) => event.stopPropagation()}
          onDoubleClick={(event) => event.stopPropagation()}
          onMouseDown={(event) => event.stopPropagation()}
        >
          <Tooltip title={row.status === 'confirmed' ? '견적 상세보기' : '견적 수정'}>
            <IconButton size="small" aria-label={`${row.productName || '견적'} 상세`} onClick={() => onOpenDetail(row)}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];
}

type QuoteGridProps = {
  rows: QuoteRow[];
  columns: F1GridColumn<QuoteRow>[];
  loading: boolean;
  canDelete: boolean;
  gridKey: number;
  gridRef: RefObject<F1GridRef<QuoteRow> | null>;
  onSelectionChange: (quoteIds: number[]) => void;
  onChangesChange: (changes: F1GridChanges<QuoteRow>) => void;
  onAddRow?: () => void; // 오른쪽 클릭 [행 추가] → 새 가견적 작성 창
};

// 체크한 가견적: 견적서 출력 · 제목줄 [삭제]. 오른쪽 클릭 [행 추가]는 새 가견적 작성 창(제목줄 [새 가견적 작성]과 같음). 오른쪽 클릭 [행 삭제]도 삭제 표시만 하고 제목줄 [저장]으로 지운다
export function QuoteGrid({ rows, columns, loading, canDelete, gridKey, gridRef, onSelectionChange, onChangesChange, onAddRow }: QuoteGridProps) {
  // 그리드를 그리기 전에 저장된 칸 순서를 맞춘다(처음 한 번)
  useState(() => resetGridStorageIfColumnsChanged(STORAGE_KEY, GRID_FIELDS));

  return (
    <Box sx={{ flex: 1, minHeight: 0, height: '100%', overflow: 'hidden' }}>
      <F1Grid
        key={gridKey}
        ref={gridRef}
        rows={rows}
        columns={columns}
        rowKey="quoteId"
        storageKey="sa-quote-grid"
        ariaLabel="F1-GRID 가견적 목록"
        height="100%"
        maxHeight="100%"
        rowHeight={34}
        minRowHeight={34}
        maxRowHeight={320}
        showCheckbox
        loading={loading}
        // 오른쪽 클릭 [행 추가]: 표에 빈 줄을 넣지 않고 새 가견적 작성 창을 연다(견적 창은 배합비 표가 들어 있어 내장 상세 창을 쓸 수 없다).
        // F1-Grid 가 [행 추가]를 넘겨주는 길은 treeContextMenu 뿐이라 그것을 쓰고, 표가 아니므로 [루트 추가]는 숨긴다
        allowAddRowInContextMenu={Boolean(onAddRow)}
        allowAddRootInContextMenu={false}
        treeContextMenu={onAddRow ? { onAddRoot: onAddRow, onAddChild: () => onAddRow() } : undefined}
        allowDuplicateRowInContextMenu={false}
        allowDeleteRowInContextMenu={canDelete}
        onSelectionChange={(rowIds) => onSelectionChange(rowIds.map((id) => Number(id)))}
        onChangesChange={onChangesChange}
      />
    </Box>
  );
}

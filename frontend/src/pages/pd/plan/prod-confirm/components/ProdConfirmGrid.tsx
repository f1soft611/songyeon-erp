import { useState, type CSSProperties, type RefObject } from 'react';
import { Box, Button, Chip } from '@mui/material';
import { F1Grid, type F1GridColumn, type F1GridRef } from '../../../../../shared/components/f1-grid';
import { resetGridStorageIfColumnsChanged } from '../../../../../shared/utils/gridStorage';
import type { OrderProduct } from '../../../../sales/order/order-register/types/salesOrder.types';
import type { ScheduleRow } from '../types/prodConfirm.types';

const STORAGE_KEY = 'pd-confirm-grid';
// 2026-10-30 단추 칸을 rowAction 으로 바꿨다. 저장된 칸 순서에 지금 칸이 없으면 처음 순서로
const GRID_FIELDS = [
  'key',
  'clientName',
  'productName',
  'orderQty',
  'note',
  'scheduleDate',
  'rowAction'
];
const rowButton = { minWidth: 0, px: 1, py: 0 };
const toOptions = (values: string[]) =>
  [...new Set(values.filter(Boolean))].map((value) => ({ value, label: value }));

// 확정 전 줄은 빨간 바탕에 왼쪽 선(수주등록과 같음). F1-Grid 는 줄에 스타일을 달 수 없어 칸마다 준다
function scheduleCellStyle(row: ScheduleRow, first = false): CSSProperties {
  return row.id ? {} : { background: 'rgba(220, 38, 38, 0.08)', ...(first ? { boxShadow: 'inset 4px 0 0 #dc2626' } : {}) };
}

type ProdConfirmColumnOptions = {
  clients: string[];
  products: OrderProduct[];
  onConfirm: (key: number) => void;
  onBatchSheet: (row: ScheduleRow) => void;
  onLabel: (row: ScheduleRow) => void;
};

// 생산확정 칸. 상세 조회(⌄)에는 거래처 · 품목코드/명만 나온다(2026-10-30)
export function createProdConfirmColumns({ clients, products, onConfirm, onBatchSheet, onLabel }: ProdConfirmColumnOptions): F1GridColumn<ScheduleRow>[] {
  const style = (first = false) => ({ getCellStyle: ({ row }: { row: ScheduleRow }) => scheduleCellStyle(row, first) });
  const editable = () => true;
  return [
    {
      field: 'key',
      type: 'rownumber',
      width: 56,
      headerName: 'No',
      align: 'center',
      pinned: 'left',
      search: { hidden: true },
      ...style(true),
    },
    {
      field: 'clientName',
      headerName: '거래처',
      flex: 1,
      width: 140,
      align: 'left',
      type: 'autocomplete',
      options: toOptions(clients),
      editable,
      search: { label: '거래처', order: 1 },
      ...style(),
    },
    {
      field: 'productName',
      headerName: '품목명(규격)',
      flex: 1.4,
      width: 190,
      align: 'left',
      type: 'autocomplete',
      options: toOptions(products.map((product) => product.display)),
      editable,
      search: { label: '품목코드/명', order: 2 },
      ...style(),
    },
    {
      field: 'orderQty',
      headerName: '생산지시량',
      width: 100,
      type: 'number',
      decimalPlaces: 3,
      align: 'right',
      editable,
      search: { hidden: true },
      ...style(),
    },
    {
      field: 'note',
      headerName: '비고',
      flex: 1,
      width: 110,
      align: 'left',
      editable,
      search: { hidden: true },
      ...style(),
    },
    {
      field: 'scheduleDate',
      headerName: '생산예정일',
      type: 'date',
      width: 200,
      align: 'center',
      search: { hidden: true },
      ...style(),
      renderCell: ({ row }) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
          <span>{row.scheduleDate || ''}</span>
          {row.isStockProduction && <Chip size="small" variant="outlined" label="재고생산" />}
          {row.substitutionCount > 0 && <Chip size="small" color="warning" variant="outlined" label={`원재료치환 ${row.substitutionCount}건`} />}
        </Box>
      ),
    },
    {
      field: 'rowAction',
      headerName: '',
      width: 320,
      align: 'center',
      pinned: 'right',
      search: { hidden: true },
      ...style(),
      renderCell: ({ row }) => (
        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
          {/* 새 줄만 [확정]. 확정된 줄은 고친 뒤 제목줄 [저장](2026-10-26 [수정] · [삭제] 단추를 뺐다) */}
          <Button size="small" variant="contained" sx={rowButton} disabled={Boolean(row.id)} onClick={() => onConfirm(row.key)}>확정</Button>
          <Button size="small" variant="outlined" sx={rowButton} disabled={!row.id}
            title="이 생산건의 투입지시서를 인쇄해요 (배합비를 생산지시량에 맞춰 kg으로 환산)" onClick={() => onBatchSheet(row)}>📄 레시피</Button>
          <Button size="small" variant="outlined" sx={rowButton} disabled={!row.id}
            title="이 생산건의 제품 라벨을 인쇄해요 (제조년월일 = 생산일)" onClick={() => onLabel(row)}>🏷️ 라벨</Button>
        </Box>
      ),
    },
  ];
}

type ProdConfirmGridProps = {
  rows: ScheduleRow[];
  columns: F1GridColumn<ScheduleRow>[];
  loading: boolean;
  gridKey: number;
  gridRef: RefObject<F1GridRef<ScheduleRow> | null>;
  canDelete: boolean;
  deleteMenuDisabled: boolean;
  onSelectionChange: (ids: Array<string | number>) => void;
  onChangesChange: () => void;
};

// 오른쪽 클릭 [행 삭제]: 표에서 빼 두고 [저장] 때 지운다(2026-10-26). 실생산량이 적힌 줄을 고르면 꺼진다
export function ProdConfirmGrid({
  rows, columns, loading, gridKey, gridRef, canDelete, deleteMenuDisabled, onSelectionChange, onChangesChange,
}: ProdConfirmGridProps) {
  // 그리드를 그리기 전에 저장된 칸 순서를 맞춘다(처음 한 번)
  useState(() => resetGridStorageIfColumnsChanged(STORAGE_KEY, GRID_FIELDS));

  return (
    <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
      <F1Grid
        key={gridKey}
        ref={gridRef}
        rows={rows}
        columns={columns}
        rowKey="key"
        storageKey="pd-confirm-grid"
        ariaLabel="F1-GRID 생산확정"
        height="100%"
        maxHeight="100%"
        rowHeight={34}
        minRowHeight={34}
        maxRowHeight={320}
        columnLine
        showCheckbox={false}
        loading={loading}
        resizableRows={false}
        allowAddRowInContextMenu={false}
        allowDuplicateRowInContextMenu={false}
        allowDeleteRowInContextMenu={canDelete}
        selectRowOnContextMenu
        deleteMenuDisabled={deleteMenuDisabled}
        onSelectionChange={onSelectionChange}
        onChangesChange={onChangesChange}
      />
    </Box>
  );
}

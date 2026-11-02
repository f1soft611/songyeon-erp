import { useState, type CSSProperties, type RefObject } from 'react';
import { Box } from '@mui/material';
import { F1Grid, type F1GridColumn, type F1GridRef } from '../../../../../shared/components/f1-grid';
import { resetGridStorageIfColumnsChanged } from '../../../../../shared/utils/gridStorage';
import type { OrderRow } from '../types/salesOrder.types';
import { canEditOrder, importedLabel } from '../utils/salesOrder';

const STORAGE_KEY = 'sa-order-grid';
// 2026-10-23 마지막 단추 칸(key)을 빼고 가져감 칸을 더했다. 2026-10-29 품목코드 칸을 더했다. 저장된 칸 순서가 다르면 처음 순서로
const GRID_FIELDS = [
  'id',
  'clientName',
  'productCode',
  'productName',
  'orderQty',
  'note',
  'productionDate',
  'isStockProduction',
  'logisticsDate',
  'importedProduction',
];

// 송연 줄 색: 저장 전은 빨간 바탕에 왼쪽 선. F1-Grid 는 줄에 스타일을 달 수 없어 칸마다 준다.
// 생산확정에서 찾아온 줄은 잠깐 노랗게 밝힌다(송연 row-flash)
function orderCellStyle(row: OrderRow, flashId: number | null, first = false): CSSProperties {
  if (flashId != null && row.id === flashId) return { background: 'rgba(250, 204, 21, 0.35)', transition: 'background 0.4s ease' };
  if (row.id) return {};
  return {
    background: 'rgba(220, 38, 38, 0.08)',
    ...(first ? { boxShadow: 'inset 4px 0 0 #dc2626' } : {}),
  };
}

type PickHandler = (row: OrderRow, apply: (changes: Partial<OrderRow>) => void) => void;

type SalesOrderColumnOptions = {
  flashId: number | null;
  // 거래처 · 품목 칸 [선택]: 고르기 팝업을 연다(원재료마스터 납품업체와 같은 모양). 2026-10-29 코드로 저장한다
  onPickClient: PickHandler;
  onPickProduct: PickHandler;
};

// 수주 목록 칸. 표 안에서 바로 고치고 제목줄 [저장]으로 보낸다(S_ERP 품목관리와 같은 방식).
// 상세 조회(⌄)에는 거래처 · 품목코드/명만 나온다(2026-10-29)
export function createSalesOrderColumns({ flashId, onPickClient, onPickProduct }: SalesOrderColumnOptions): F1GridColumn<OrderRow>[] {
  const style = (first = false) => ({ getCellStyle: ({ row }: { row: OrderRow }) => orderCellStyle(row, flashId, first) });
  return [
    {
      field: 'id',
      headerName: 'No',
      type: 'rownumber',
      width: 56,
      align: 'center',
      pinned: 'left',
      form: { hidden: true },
      search: { hidden: true },
      ...style(),
    },
    {
      field: 'clientName',
      headerName: '거래처',
      flex: 1.2,
      width: 160,
      align: 'left',
      type: 'code',
      editable: canEditOrder,
      required: true,
      onOpenCodePicker: (row, apply) => {
        onPickClient(row, apply);
        return undefined;
      },
      onValueChange: () => {
        throw new Error('[선택]으로 거래처를 골라 주세요.');
      },
      search: { label: '거래처', order: 1 },
      ...style(),
    },
    {
      field: 'productCode',
      headerName: '품목코드',
      width: 100,
      align: 'center',
      editable: false,
      search: { hidden: true }, ...style(),
    },
    {
      field: 'productName',
      headerName: '품목명(규격)',
      flex: 1.5,
      width: 200,
      align: 'left',
      type: 'code',
      editable: canEditOrder,
      onOpenCodePicker: (row, apply) => {
        onPickProduct(row, apply);
        return undefined;
      },
      onValueChange: () => {
        throw new Error('[선택]으로 품목을 골라 주세요.');
      },
      search: { label: '품목코드/명', order: 2 },
      ...style(),
    },
    {
      field: 'orderQty',
      headerName: '수량',
      width: 100,
      headerAlign: 'center',
      align: 'right',
      type: 'number',
      decimalPlaces: 2,
      editable: canEditOrder,
      search: { hidden: true }, ...style(),
    },
    {
      field: 'note',
      headerName: '비고',
      flex: 1,
      width: 130,
      align: 'left',
      editable: canEditOrder,
      search: { hidden: true },
      ...style()
    },
    {
      field: 'productionDate',
      headerName: '생산예정일',
      width: 120,
      align: 'center',
      type: 'date',
      editable: canEditOrder
      , search: { hidden: true },
      ...style(),
    },
    // 재고생산에 체크하면 물류출고일을 비우고 잠근다. 물류출고일은 '재고생산' 과 둘 중 하나라 * 를 붙이지 않는다
    {
      field: 'isStockProduction',
      headerName: '재고생산',
      width: 90,
      align: 'center',
      type: 'checkbox',
      editable: canEditOrder,
      onValueChange: (_row, value) => (value ? { isStockProduction: true, logisticsDate: '' } : { isStockProduction: false }),
      search: { hidden: true },
      ...style(),
    },
    {
      field: 'logisticsDate',
      headerName: '물류출고일 (재고생산이면 비움)',
      width: 210,
      align: 'center',
      type: 'date',
      editable: (row) => canEditOrder(row) && !row.isStockProduction,
      search: { hidden: true },
      ...style(),
    },
    {
      field: 'importedProduction',
      headerName: '가져감',
      width: 150,
      align: 'center',
      editable: false,
      getValue: (row) => importedLabel(row),
      search: { hidden: true },
      ...style(),
    },
  ];
}

type SalesOrderGridProps = {
  rows: OrderRow[];
  columns: F1GridColumn<OrderRow>[];
  loading: boolean;
  gridKey: number;
  gridRef: RefObject<F1GridRef<OrderRow> | null>;
  canCreate: boolean;
  canDelete: boolean;
  deleteMenuDisabled: boolean;
  createRow: () => OrderRow;
  onSelectionChange: (ids: Array<string | number>) => void;
  onChangesChange: () => void;
};

// 오른쪽 클릭 [행 추가]는 제목줄 [수주 추가]와 같은 빈 줄, [행 삭제]는 표에서 빼 두고 [저장] 때 지운다(가져간 수주를 고르면 꺼진다)
export function SalesOrderGrid({
  rows, columns, loading, gridKey, gridRef, canCreate, canDelete, deleteMenuDisabled, createRow, onSelectionChange, onChangesChange,
}: SalesOrderGridProps) {
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
        storageKey="sa-order-grid"
        ariaLabel="F1-GRID 수주 목록"
        height="100%"
        maxHeight="100%"
        rowHeight={34}
        minRowHeight={34}
        maxRowHeight={320}
        columnLine
        showCheckbox={false}
        loading={loading}
        resizableRows={false}
        allowAddRowInContextMenu={canCreate}
        createRow={createRow}
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

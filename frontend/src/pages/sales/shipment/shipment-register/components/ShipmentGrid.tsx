import { useState, type CSSProperties, type RefObject } from 'react';
import { Box, Button, Chip, Typography } from '@mui/material';
import { F1Grid, type F1GridColumn, type F1GridRef } from '../../../../../shared/components/f1-grid';
import { resetGridStorageIfColumnsChanged } from '../../../../../shared/utils/gridStorage';
import type { ShipmentRow } from '../types/shipment.types';
import { isConfirmed, isProductionRow, lotText, shipLotText, shipmentStatus } from '../utils/shipment';

const STORAGE_KEY = 'sa-shipment-grid';
// 2026-10-23 줄 끝 단추 칸(sourceOrderId)을 빼고 상태 칸을 더했다. 2026-10-29 품목코드 칸을 더했다. 저장된 칸 순서가 다르면 처음 순서로
const GRID_FIELDS = ['key', 'clientName', 'productCode', 'productName', 'scheduleDate', 'orderQty', 'lotLabel', 'note', 'status'];

const rowButton = { minWidth: 0, px: 1, py: 0 };

// 저장 전 줄은 빨간 바탕에 왼쪽 선(수주등록과 같음)
function shipmentCellStyle(row: ShipmentRow, first = false): CSSProperties {
  if (row.record) return {};
  return { background: 'rgba(220, 38, 38, 0.08)', ...(first ? { boxShadow: 'inset 4px 0 0 #dc2626' } : {}) };
}

type PickHandler = (row: ShipmentRow, apply: (changes: Partial<ShipmentRow>) => void) => void;

type ShipmentColumnOptions = {
  // 로트 칸 [로트선택]: 누를 때 표의 값을 다시 읽어 로트 선택 창을 연다
  onOpenLot: (key: number) => void;
  // 거래처 · 품목 칸 [선택]: 고르기 팝업을 연다(수주등록과 같은 모양). 2026-10-29 코드로 저장한다
  onPickClient: PickHandler;
  onPickProduct: PickHandler;
};

// 출하 목록 칸. 새 줄은 모두 입력하고, 저장된 줄은 출하량만 고친다(출하확정된 줄은 못 고친다).
// 상세 조회(⌄)에는 거래처 · 품목코드/명만 나온다(2026-10-29)
export function createShipmentColumns({ onOpenLot, onPickClient, onPickProduct }: ShipmentColumnOptions): F1GridColumn<ShipmentRow>[] {
  const style = (first = false) => ({ getCellStyle: ({ row }: { row: ShipmentRow }) => shipmentCellStyle(row, first) });
  const isNew = (row: ShipmentRow) => !row.record;
  return [
    {
      field: 'key',
      type: 'rownumber',
      width: 56,
      headerName: 'No',
      align: 'center',
      pinned: 'left',
      search: { hidden: true },
      ...style(true)
    },
    // 2026-10-29 글자 입력 대신 [선택] → 거래처 고르기 팝업(분류에 '매출'인 거래처)
    {
      field: 'clientName',
      headerName: '거래처',
      flex: 1.1,
      width: 110,
      align: 'left',
      type: 'code',
      editable: isNew,
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
    // 2026-10-29 품목코드(보기만, 품목명 칸 [선택]으로 고르면 함께 들어간다)
    {
      field: 'productCode',
      headerName: '품목코드',
      width: 100,
      align: 'center',
      editable: false,
      search: { hidden: true },
      ...style(),
    },
    // 2026-10-29 글자 입력 대신 [선택] → 품목 고르기 팝업(사용 중인 제품, 코드 · 이름(규격)). 상세 조회는 품목코드 · 이름 일부로 찾는다
    {
      field: 'productName',
      headerName: '품목명(규격)',
      flex: 1.4,
      width: 170,
      align: 'left',
      type: 'code',
      editable: isNew,
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
      field: 'scheduleDate',
      headerName: '출고일',
      width: 110,
      align: 'center',
      type: 'date',
      editable: isNew,
      search: { hidden: true }, ...style(),
    },
    {
      field: 'orderQty',
      headerName: '출하량',
      width: 90,
      align: 'right',
      type: 'number',
      decimalPlaces: 2,
      editable: (row) => !isConfirmed(row),
      search: { hidden: true },
      ...style(),
    },
    {
      field: 'lotLabel',
      headerName: '로트',
      flex: 1.2,
      width: 100,
      align: 'left',
      search: { hidden: true }
      , ...style(),
      renderCell: ({ row }) => {
        if (isConfirmed(row) || isProductionRow(row)) {
          const text = row.record ? (isProductionRow(row) ? lotText(row.record.lotNo, row.record.lotDate) : shipLotText(row.record)) : '';
          return text ? <Chip size="small" color="success" variant="outlined" label={text} /> : '';
        }
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, width: '100%' }}>
            <Typography variant="body2" noWrap title={row.lotLabel.text}
              sx={{ flex: 1, minWidth: 0, fontWeight: row.lotLabel.bold ? 700 : 400, color: row.lotLabel.tone === 'teal' ? '#0f766e' : 'text.secondary' }}>
              {row.lotLabel.text}
            </Typography>
            <Button size="small" variant="outlined" sx={rowButton} onClick={() => onOpenLot(row.key)}>로트선택</Button>
          </Box>
        );
      },
    },
    {
      field: 'note',
      headerName: '비고',
      flex: 1,
      width: 200,
      align: 'left',
      editable: isNew,
      search: { hidden: true },
      ...style()
    },
    // 2026-10-23 상태(보기만): 출하확정된 줄 · 생산연동 줄. 예전 줄 끝 단추 칸의 '— 수정불가' 표시를 옮겼다
    {
      field: 'status' as keyof ShipmentRow,
      headerName: '상태',
      width: 110,
      align: 'center',
      editable: false,
      getValue: (row) => shipmentStatus(row),
      search: { hidden: true },
      ...style(),
    },
  ];
}

type ShipmentGridProps = {
  rows: ShipmentRow[];
  columns: F1GridColumn<ShipmentRow>[];
  loading: boolean;
  gridKey: number;
  gridRef: RefObject<F1GridRef<ShipmentRow> | null>;
  canCreate: boolean;
  canDelete: boolean;
  deleteMenuDisabled: boolean;
  createRow: () => ShipmentRow;
  onSelectionChange: (ids: Array<string | number>) => void;
  onChangesChange: () => void;
};

// 오른쪽 클릭 [행 추가]는 제목줄 [출하 추가]와 같은 빈 줄, [행 삭제]는 표에서 빼 두고 [저장] 때 지운다(출하확정 · 생산연동 줄을 고르면 꺼진다)
export function ShipmentGrid({
  rows, columns, loading, gridKey, gridRef, canCreate, canDelete, deleteMenuDisabled, createRow, onSelectionChange, onChangesChange,
}: ShipmentGridProps) {
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
        storageKey="sa-shipment-grid"
        ariaLabel="F1-GRID 출하 목록"
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

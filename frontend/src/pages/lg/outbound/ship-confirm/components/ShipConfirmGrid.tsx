import { useState, type CSSProperties, type RefObject } from 'react';
import { Box, Button } from '@mui/material';
import { F1Grid, type F1GridColumn, type F1GridRef } from '../../../../../shared/components/f1-grid';
import { resetGridStorageIfColumnsChanged } from '../../../../../shared/utils/gridStorage';
import type { ShipRow } from '../types/shipConfirm.types';
import { isConfirmed } from '../utils/shipConfirm';

const STORAGE_KEY = 'lg-ship-confirm-grid';
// 2026-10-30 [확정] · [확정취소] 단추 칸을 rowAction 으로 바꿨다(예전엔 source 칸을 빌려 썼다). 저장된 칸 순서에 지금 칸이 없으면 처음 순서로
const GRID_FIELDS = [
  'key',
  'vehicleGroup',
  'clientName',
  'productName',
  'storage',
  'plannedQty',
  'inputActual',
  'lotText',
  'inputBox',
  'inputPacking',
  'inputDriver',
  'inputVehicle',
  'inputOrder',
  'inputCharterInfo',
  'inputCharterAmount',
  'inputNote',
  'rowAction',
];
const rowButton = { minWidth: 0, px: 1, py: 0 };
const toOptions = (names: string[]) => [{ value: '', label: '선택' }, ...names.map((name) => ({ value: name, label: name }))];

// 확정 전 줄은 빨간 바탕에 왼쪽 선(생산확정과 같음). F1-Grid 는 줄에 스타일을 달 수 없어 칸마다 준다
function shipCellStyle(row: ShipRow, first = false): CSSProperties {
  return isConfirmed(row) ? {} : { background: 'rgba(220, 38, 38, 0.08)', ...(first ? { boxShadow: 'inset 4px 0 0 #dc2626' } : {}) };
}

type ShipConfirmColumnOptions = {
  sorted: boolean;
  packingNames: string[];
  vehicleNames: string[];
  // 운행자 칸 [선택]: 사원 팝업을 연다(2026-10-30, 콤보 → 팝업). 고르면 이름 · 사번을 넣는다
  onPickDriver: (row: ShipRow, apply: (changes: Partial<ShipRow>) => void) => void;
  onConfirm: (key: string) => void;
  onUnconfirm: (row: ShipRow) => void;
};

// 출하확정 칸. 확정 전 줄만 고친다. 칸마다 넣을 수 있는 글자(순서 · 박스는 숫자, 용차금액은 숫자와 점, 실출하량은 숫자 · 점 · kg)는
// 보여줄 때와 보낼 때 거른다. 🚚 배차 칸은 배차 · 순서로 정렬해서 볼 때만 보인다
export function createShipConfirmColumns({
  sorted, packingNames, vehicleNames, onPickDriver, onConfirm, onUnconfirm,
}: ShipConfirmColumnOptions): F1GridColumn<ShipRow>[] {
  const style = (first = false) => ({ getCellStyle: ({ row }: { row: ShipRow }) => shipCellStyle(row, first) });
  const editable = (row: ShipRow) => !isConfirmed(row);
  return [
    {
      field: 'key',
      type: 'rownumber',
      width: 56,
      headerName: 'No',
      search: { hidden: true },
      align: 'center',
      pinned: 'left',
      ...style(true),
    },
    {
      field: 'vehicleGroup',
      headerName: '🚚 배차',
      width: 110,
      search: { hidden: true },
      align: 'center',
      pinned: 'left',
      mergeRows: true,
      hidden: !sorted,
    },
    {
      field: 'clientName',
      headerName: '거래처',
      width: 140,
      search: { label: '거래처', order: 1 },
      align: 'left',
      pinned: 'left',
      ...style(),
    },
    {
      field: 'productName',
      headerName: '품목명(규격)',
      width: 200,
      search: { label: '품목코드/명', order: 2 },
      align: 'left',
      pinned: 'left',
      ...style(),
    },
    {
      field: 'storage',
      headerName: '보관방법',
      width: 120,
      search: { hidden: true },
      align: 'left',
      ...style(),
    },
    {
      field: 'plannedQty',
      headerName: '출하예정',
      width: 90,
      search: { hidden: true },
      align: 'right',
      type: 'number',
      decimalPlaces: 2,
      ...style(),
    },
    {
      // 2026-10-26 숫자 칸(글자는 들어가지 않는다, 소수 둘째 자리까지)
      field: 'inputActual',
      headerName: '실출하량',
      width: 100,
      search: { hidden: true },
      align: 'right',
      editable,
      type: 'number',
      decimalPlaces: 2,
      // renderCell: ({ row }) => (onlyQty(row.inputActual) ? onlyQty(row.inputActual)
      //   : <Typography component="span" variant="body2" color="text.disabled">실제 나간 양</Typography>),
      getCellStyle: ({ row }) => (isConfirmed(row) ? { fontWeight: 700 } : { ...shipCellStyle(row), background: 'rgba(37, 99, 235, 0.08)', fontWeight: 700 }),
    },
    {
      field: 'lotText',
      headerName: '로트번호',
      width: 140,
      search: { hidden: true },
      align: 'left',
      ...style(),
    },
    {
      // 2026-10-26 숫자 칸(글자는 들어가지 않는다). 입력한 그대로 보이고 저장한다
      field: 'inputBox',
      headerName: '박스수량',
      width: 80,
      search: { hidden: true },
      align: 'right',
      editable,
      type: 'number',
      ...style(),
    },
    {
      field: 'inputPacking',
      headerName: '포장방법',
      width: 110,
      search: { hidden: true },
      align: 'left',
      type: 'select',
      options: toOptions(packingNames),
      editable,
      ...style(),
    },
    {
      field: 'inputDriver',
      headerName: '운행자',
      width: 100,
      search: { hidden: true },
      align: 'left',
      type: 'code',
      editable,
      onOpenCodePicker: (row, apply) => {
        onPickDriver(row, apply);
        return undefined;
      },
      onValueChange: () => {
        throw new Error('[선택]으로 운행자를 골라 주세요.');
      },
      ...style(),
    },
    {
      field: 'inputVehicle',
      headerName: '배차',
      width: 100,
      search: { hidden: true },
      align: 'left',
      type: 'select',
      options: toOptions(vehicleNames),
      editable,
      ...style(),
    },
    {
      field: 'inputOrder',
      headerName: '순서',
      width: 60,
      type: 'number',
      search: { hidden: true },
      align: 'right',
      editable,
      ...style(),
    },
    {
      field: 'inputCharterInfo',
      headerName: '용차정보',
      width: 110,
      search: { hidden: true },
      align: 'left',
      editable,
      ...style(),
    },
    {
      // 2026-10-26 숫자 칸(글자는 들어가지 않는다). 입력한 그대로 보이고 저장한다
      field: 'inputCharterAmount',
      headerName: '용차금액',
      width: 100,
      headerAlign: 'center',
      search: { hidden: true },
      align: 'right',
      editable,
      type: 'currency',
      ...style(),
    },
    {
      field: 'inputNote',
      headerName: '특이사항',
      width: 150,
      search: { hidden: true },
      align: 'left',
      editable,
      ...style(),
    },
    {
      field: 'rowAction',
      headerName: '',
      width: 100,
      search: { hidden: true },
      align: 'center',
      pinned: 'right',
      ...style(),
      renderCell: ({ row }) => (isConfirmed(row) ? (
        <Button size="small" variant="outlined" color="error" sx={rowButton} onClick={() => onUnconfirm(row)}>확정취소</Button>
      ) : (
        <Button size="small" variant="contained" sx={rowButton} onClick={() => onConfirm(row.key)}>확정</Button>
      )),
    },
  ];
}

type ShipConfirmGridProps = {
  rows: ShipRow[];
  columns: F1GridColumn<ShipRow>[];
  loading: boolean;
  gridKey: number;
  gridRef: RefObject<F1GridRef<ShipRow> | null>;
};

export function ShipConfirmGrid({ rows, columns, loading, gridKey, gridRef }: ShipConfirmGridProps) {
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
        storageKey="lg-ship-confirm-grid"
        ariaLabel="F1-GRID 출하확정"
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
        allowDeleteRowInContextMenu={false}
      />
    </Box>
  );
}

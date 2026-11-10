import type { KeyboardEvent, RefObject } from 'react';
import { Box } from '@mui/material';
import { F1Grid, type F1GridColumn, type F1GridRef } from '../../../../../shared/components/f1-grid';
import type { Receiving } from '../../receiving-register/types/receiving.types';

// 반품내역 칸
export function createReceivingReturnColumns(): F1GridColumn<Receiving>[] {
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
      field: 'receiveDate',
      headerName: '반품일',
      type: 'date',
      width: 110,
      align: 'center',
    },
    {
      field: 'clientName',
      headerName: '거래처',
      width: 140,
      align: 'left',
    },
    {
      field: 'materialName',
      headerName: '원재료',
      flex: 1.4,
      width: 200,
      align: 'left',
    },
    {
      field: 'qty',
      headerName: '수량',
      width: 90,
      type: 'number',
      align: 'right',
      getCellStyle: () => ({ color: '#dc2626', fontWeight: 700 }),
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
      getCellStyle: () => ({ color: '#dc2626', fontWeight: 700 }),
    },
    {
      field: 'returnReason',
      headerName: '사유',
      flex: 1,
      width: 140,
      align: 'left',
    },
  ];
}

type ReceivingReturnGridProps = {
  rows: Receiving[];
  columns: F1GridColumn<Receiving>[];
  loading: boolean;
  gridKey: number;
  gridRef: RefObject<F1GridRef<Receiving> | null>;
  canCreate: boolean;
  canDelete: boolean;
  onAddRow: () => void;
  onChangesChange: () => void;
};

// 2026-10-26 오른쪽 클릭 [행 삭제]: 표에서 빼 두고 [저장] 때 지운다
// 2026-11-05 오른쪽 클릭 [행 추가]: 표에 빈 줄을 넣지 않고 반품 등록 창을 연다(입고등록과 같음, F1-Grid 가 [행 추가]를 넘겨주는 길은 treeContextMenu 뿐).
// 반품 줄은 지워도 막을 규칙이 없다(다른 줄이 참조하지 않고, 지우면 재고가 돌아온다). 삭제 권한이 없으면 Delete 키도 막는다
export function ReceivingReturnGrid({
  rows, columns, loading, gridKey, gridRef, canCreate, canDelete, onAddRow, onChangesChange,
}: ReceivingReturnGridProps) {
  const handleKeyDownCapture = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Delete' && !canDelete) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  return (
    <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }} onKeyDownCapture={handleKeyDownCapture}>
      <F1Grid
        key={`return-${gridKey}`}
        ref={gridRef}
        rows={rows}
        columns={columns}
        rowKey="id"
        storageKey="pu-recv-return-grid"
        ariaLabel="F1-GRID 반품내역"
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
        selectRowOnContextMenu
        onChangesChange={onChangesChange}
      />
    </Box>
  );
}

import type { RefObject } from 'react';
import { Box, Button, Chip } from '@mui/material';
import { F1Grid, type F1GridColumn, type F1GridRef } from '../../../../../shared/components/f1-grid';
import { formatQty } from '../../../../../shared/utils/numberFormat';
import type { LotPick, PlannedLotRow } from '../types/shipment.types';

const rowButton = { minWidth: 0, px: 1, py: 0 };

type PlannedLotColumnOptions = {
  alloc: boolean;
  onPick: (pick: LotPick) => void;
};

// 로트 선택 창 '생산예정 품목(생산입고 전)' 칸: 구분 · 로트번호(예정일) · 계획수량 · 출하량 · 잔량 · 보낼 수량(배분) 또는 [선택]
export function createPlannedLotColumns({ alloc, onPick }: PlannedLotColumnOptions): F1GridColumn<PlannedLotRow>[] {
  return [
    {
      field: 'id',
      headerName: 'No',
      type: 'rownumber',
      width: 56,
      align: 'center',
      pinned: 'left',
    },
    {
      field: 'kind',
      headerName: '구분',
      width: 90,
      align: 'center',
      renderCell: ({ row }) => <Chip size="small" variant="outlined" color={row.kind === '생산확정' ? 'success' : 'default'} label={row.kind} />,
    },
    {
      field: 'label',
      headerName: '로트번호(예정일)',
      flex: 1,
      width: 140,
      align: 'left',
    },
    {
      field: 'planned',
      headerName: '계획수량',
      type: 'number',
      width: 96,
      align: 'right',
    },
    {
      field: 'shipped',
      headerName: '출하량',
      type: 'number',
      width: 96,
      align: 'right',
    },
    {
      field: 'remaining',
      headerName: '잔량',
      type: 'number',
      width: 96,
      align: 'right',
      getCellStyle: () => ({ fontWeight: 700 }),
    },
    // 끝 칸: 로트 배분 모드면 보낼 수량(고침), 아니면 [선택]
    alloc
      ? {
        field: 'want',
        headerName: '보낼 수량',
        width: 110,
        headerAlign: 'center',
        align: 'right',
        type: 'number',
        decimalPlaces: 3,
        pinned: 'right',
        editable: (row) => row.lotId !== null,
        // 로트가 없는 수주등록 건은 나눠 적을 수 없어 선택만 한다(송연과 같다)
        renderCell: ({ row }) => (row.lotId === null
          ? <Button size="small" variant="outlined" sx={rowButton} onClick={() => onPick(row.pick)}>선택</Button>
          : row.want == null || row.want === 0 ? '' : formatQty(Number(row.want))),
        getCellStyle: ({ row }) => (row.lotId !== null && (Number(row.want) || 0) > row.remaining + 0.001 ? { color: '#dc2626', fontWeight: 700 } : undefined),
      }
      : {
        field: 'pickAction',
        headerName: '선택',
        width: 80,
        align: 'center',
        pinned: 'right',
        renderCell: ({ row }) => <Button size="small" variant="outlined" sx={rowButton} onClick={() => onPick(row.pick)}>선택</Button>,
      },
  ];
}

type PlannedLotGridProps = {
  rows: PlannedLotRow[];
  columns: F1GridColumn<PlannedLotRow>[];
  alloc: boolean;
  gridRef: RefObject<F1GridRef<PlannedLotRow> | null>;
  onChangesChange: () => void;
};

// 비어도 머리줄 있는 그리드를 둔다. 그때는 F1-Grid 빈 표시(max(행 높이×4, 120px))가 다 들어가는 높이를 준다
export function PlannedLotGrid({ rows, columns, alloc, gridRef, onChangesChange }: PlannedLotGridProps) {
  return (
    <Box sx={{ height: rows.length === 0 ? 36 + Math.max(34 * 4, 120) : Math.min(260, 40 + rows.length * 34) }}>
      <F1Grid
        ref={gridRef}
        rows={rows}
        columns={columns}
        rowKey="id"
        storageKey={`sa-shipment-lot-planned-${alloc ? 'alloc' : 'pick'}`}
        ariaLabel="F1-GRID 생산예정 품목"
        height="100%"
        maxHeight="100%"
        rowHeight={34}
        showCheckbox={false}
        resizableRows={false}
        allowAddRowInContextMenu={false}
        allowDuplicateRowInContextMenu={false}
        allowDeleteRowInContextMenu={false}
        onChangesChange={onChangesChange}
      />
    </Box>
  );
}

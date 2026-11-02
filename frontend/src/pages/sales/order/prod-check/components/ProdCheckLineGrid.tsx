import type { RefObject } from 'react';
import { Box, Button, Chip, Typography } from '@mui/material';
import { F1Grid, type F1GridColumn, type F1GridRef } from '../../../../../shared/components/f1-grid';
import type { ProdCheckLine, ProdCheckResult } from '../types/prodCheck.types';

const rowButton = { minWidth: 0, px: 1, py: 0 };

type ProdCheckLineColumnOptions = {
  data: ProdCheckResult | null;
  canDetail: boolean; // 제품이 둘 이상이면 제품마다 '상세보기'(그 제품만 만들 때)
  onDetail: (product: string) => void;
  onRemove: (product: string) => void;
};

// 만들 것 칸: 제품명(확인 뒤 제품마다 판정) · 생산수량(표 안에서 적는다) · 상세보기/빼기
export function createProdCheckLineColumns({ data, canDetail, onDetail, onRemove }: ProdCheckLineColumnOptions): F1GridColumn<ProdCheckLine>[] {
  return [
    {
      field: 'id' as keyof ProdCheckLine,
      type: 'rownumber',
      width: 56,
      headerName: 'No',
      align: 'center',
      pinned: 'left'
    },
    {
      field: 'product',
      headerName: '제품명',
      flex: 1,
      width: 240,
      align: 'left',
      renderCell: ({ row }) => {
        const p = canDetail ? data?.byProduct.find((item) => item.product === row.product) : undefined;
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
            <Typography variant="body2" noWrap sx={{ fontWeight: 700 }}>{row.product}</Typography>
            {p && (p.ok
              ? <Chip size="small" color="success" variant="outlined" label="이것만이면 넉넉" />
              : <Chip size="small" color="error" variant="outlined" label={`이것만 해도 ${p.shortageCount}가지 부족`} />)}
          </Box>
        );
      },
    },
    {
      field: 'qty',
      headerName: '생산수량 (kg)',
      width: 150,
      align: 'right',
      type: 'number',
      decimalPlaces: 3,
      editable: true,
      // 아직 안 적은 수량은 빈칸으로(F1-Grid 기본 숫자 표시는 빈 값을 0 으로 그린다)
      renderCell: ({ row }) => (row.qty === null || row.qty === undefined || row.qty === ''
        ? ''
        : Number(row.qty).toLocaleString('ko-KR', { maximumFractionDigits: 3 })),
    },
    {
      field: 'detail' as keyof ProdCheckLine,
      headerName: '',
      width: 170,
      align: 'center',
      pinned: 'right',
      renderCell: ({ row }) => (
        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
          {canDetail && <Button size="small" variant="outlined" sx={rowButton} onClick={() => onDetail(row.product)}>상세보기</Button>}
          <Button size="small" variant="outlined" color="error" sx={rowButton} aria-label={`${row.product} 빼기`}
            onClick={() => onRemove(row.product)}>빼기</Button>
        </Box>
      ),
    },
  ];
}

type ProdCheckLineGridProps = {
  lines: ProdCheckLine[];
  columns: F1GridColumn<ProdCheckLine>[];
  gridKey: number;
  gridRef: RefObject<F1GridRef<ProdCheckLine> | null>;
};

// 비어도 머리줄 있는 그리드를 둔다. 그때는 F1-Grid 빈 표시(max(행 높이×4, 120px))가 다 들어가는 높이를 준다
export function ProdCheckLineGrid({ lines, columns, gridKey, gridRef }: ProdCheckLineGridProps) {
  return (
    <Box sx={{ height: lines.length === 0 ? 36 + Math.max(34 * 4, 120) : Math.min(300, 44 + lines.length * 36) }}>
      <F1Grid
        key={gridKey}
        ref={gridRef}
        rows={lines}
        columns={columns}
        rowKey="product"
        storageKey="sa-prod-check-lines-grid"
        ariaLabel="F1-GRID 만들 것"
        height="100%"
        maxHeight="100%"
        rowHeight={34}
        showCheckbox={false}
        resizableRows={false}
        allowAddRowInContextMenu={false}
        allowDuplicateRowInContextMenu={false}
        allowDeleteRowInContextMenu={false}
      />
    </Box>
  );
}

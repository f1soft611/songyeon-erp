import { Box, Chip, Typography } from '@mui/material';
import { F1Grid, type F1GridColumn } from '../../../../../shared/components/f1-grid';
import type { ProdCheckGridRow, ProdCheckResult, ProdCheckRow } from '../types/prodCheck.types';
import { qtyText, toGridRows } from '../utils/prodCheck';

// 원재료 칸: 재고 · (제품이 둘 이상이면 제품마다 필요량) · 필요량 · 생산 후 재고 · 판정
export function createProdCheckResultColumns(data: ProdCheckResult | null, perCount: number): F1GridColumn<ProdCheckGridRow>[] {
  if (!data) return [];
  const num = (field: keyof ProdCheckGridRow, headerName: string, extra: Partial<F1GridColumn<ProdCheckGridRow>> = {}): F1GridColumn<ProdCheckGridRow> => ({
    field, headerName, width: 110, headerAlign: 'center', align: 'right',
    getValue: (row) => row[field] as number,
    renderCell: ({ row }) => qtyText(row[field] as number),
    ...extra,
  });
  return [
    {
      field: 'id',
      type: 'rownumber',
      width: 56,
      headerName: 'No',
      align: 'center',
      pinned: 'left'
    },
    {
      field: 'name',
      headerName: '원재료명',
      flex: 1,
      width: 170,
      align: 'left',
      renderCell: ({ row }) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
          <Typography variant="body2" noWrap sx={{ fontWeight: row.shortage > 0 ? 700 : 400 }}>{row.name || ''}</Typography>
          {!row.known && <Chip size="small" color="warning" variant="outlined" label="원재료 목록에 없음" />}
        </Box>
      ),
    },
    {
      field: 'spec',
      headerName: '규격',
      width: 90,
      align: 'left',
      getValue: (row) => row.spec || ''
    },
    num('stockQty', `${data.date} 재고`),
    ...Array.from({ length: perCount }, (_, i) =>
      num(`per${i}` as keyof ProdCheckGridRow, `필요량${i + 1} ${data.lines[i].product}`, {
        width: 130,
        renderCell: ({ row }) => (row[`per${i}`] ? qtyText(row[`per${i}`]) : ''),
      })),
    num('needQty', perCount ? '필요량 합계' : '필요량', { getCellStyle: () => (perCount ? { fontWeight: 700 } : undefined) }),
    num('afterQty', '생산 후 재고', { getCellStyle: ({ row }) => ({ fontWeight: 700, color: row.shortage > 0 ? '#dc2626' : '#15803d' }) }),
    {
      field: 'shortage',
      headerName: '판정',
      width: 130,
      align: 'center',
      pinned: 'right',
      getValue: (row) => row.shortage,
      renderCell: ({ row }) => (row.shortage > 0
        ? <Chip size="small" color="error" label={`${qtyText(row.shortage)}kg 부족`} />
        : <Chip size="small" color="success" variant="outlined" label="넉넉" />),
    },
  ];
}

type ProdCheckResultGridProps = {
  rows: ProdCheckRow[];
  columns: F1GridColumn<ProdCheckGridRow>[];
  gridKey: string;
  perCount: number; // 제품별 필요량 칸 수가 다르면 칸 순서를 따로 저장한다
};

export function ProdCheckResultGrid({ rows, columns, gridKey, perCount }: ProdCheckResultGridProps) {
  return (
    <Box sx={{ height: Math.min(520, 44 + rows.length * 36) }}>
      <F1Grid
        key={gridKey}
        rows={toGridRows(rows)}
        columns={columns}
        rowKey="id"
        storageKey={`sa-prod-check-result-grid-${perCount}`}
        ariaLabel="F1-GRID 원재료"
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

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Box, Button, Chip, Stack, Tooltip, Typography } from '@mui/material';
import { F1Grid, type F1GridColumn, type F1GridRef } from '../../../../shared/components/f1-grid';
import type { MaterialOption } from '../../../co/master/item-master/types/itemMaster.types';
import { calcRecipe, codeCell, emptyRecipeRow, emptyRecipeRows, fmt, fmtPrice, percentText, type RecipeBomRow } from '../utils/recipe';

export type RecipeBomGridHandle = {
  // 지금 그리드의 줄(숫자 칸은 숫자로)
  getRows: () => RecipeBomRow[];
};

// 계산 칸(배합비율·적용단가)과 ✕ 칸은 값이 없는 자리다. F1-Grid 는 field 로 칸을 가르므로 이름만 따로 둔다
type GridRow = RecipeBomRow & { percentCell?: null; amountCell?: null; deleteCell?: null };

const toNumber = (value: unknown): number | null =>
  value === null || value === undefined || String(value).trim() === '' || Number.isNaN(Number(value)) ? null : Number(value);

const normalize = (row: GridRow): RecipeBomRow => ({
  id: row.id,
  materialName: row.materialName ?? '',
  weight: toNumber(row.weight),
  unitPrice: toNumber(row.unitPrice),
  materialCode: row.materialCode || null,
});

// 레시피 배합표(송연 addRecipeBomRow · recalcRecipeBom). 중량을 적으면 배합비율(%)이 저절로 나온다.
// 원재료명을 등록된 이름으로 바꾸면 단가를 채우고, 이름을 고쳐 적으면 물고 있던 원재료코드를 버린다.
// locked 면(공유된 버전) 칸을 고치지 못하고 줄 추가·삭제도 숨긴다.
export const RecipeBomGrid = forwardRef<RecipeBomGridHandle, {
  materials: MaterialOption[];
  sourceRows: RecipeBomRow[];
  sourceKey: number;
  locked: boolean;
  height?: number | string;
}>(function RecipeBomGrid({ materials, sourceRows, sourceKey, locked, height = 300 }, ref) {
  const gridRef = useRef<F1GridRef<GridRow>>(null);
  const [rows, setRows] = useState<GridRow[]>(sourceRows);
  const [gridKey, setGridKey] = useState(0);
  const [current, setCurrent] = useState<RecipeBomRow[]>(sourceRows);
  // 줄마다 마지막 원재료명, 그리고 원재료코드를 물었을 때의 이름(이 이름과 달라지면 코드를 버린다)
  const namesRef = useRef(new Map<string, string>());
  const codeNamesRef = useRef(new Map<string, string>());
  const materialsRef = useRef<MaterialOption[]>([]);
  materialsRef.current = materials;

  useEffect(() => {
    namesRef.current = new Map(sourceRows.map((row) => [row.id, row.materialName]));
    codeNamesRef.current = new Map(sourceRows.map((row) => [row.id, row.materialCode ? row.materialName : '']));
    setRows(sourceRows);
    setCurrent(sourceRows);
    setGridKey((key) => key + 1);
    // sourceKey 가 바뀔 때만 다시 시작한다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceKey]);

  const calc = useMemo(() => calcRecipe(current), [current]);
  const materialNames = useMemo(
    () => [...new Set(materials.map((material) => material.name))].map((name) => ({ value: name, label: name })),
    [materials],
  );

  const removeRow = (id: string) => {
    const grid = gridRef.current;
    if (!grid) return;
    grid.setSelectedRowIds([id]);
    grid.deleteSelectedRows();
  };

  const columns = useMemo<F1GridColumn<GridRow>[]>(() => [
    { field: 'id', type: 'rownumber', width: 56, headerName: '순번', headerAlign: 'center', align: 'center', pinned: 'left' },
    {
      field: 'materialName', headerName: '원재료명', flex: 1.6, width: 200, type: 'autocomplete', options: materialNames, editable: true,
      headerAlign: 'center', align: 'left',
      // 송연 mat-match / mat-nomatch: 등록된 이름이면 파란, 다르면 빨간 글자
      getCellStyle: ({ row }) =>
        !String(row.materialName ?? '').trim() || !materialsRef.current.length
          ? undefined
          : { color: materialsRef.current.some((m) => m.name === String(row.materialName).trim()) ? '#1d4ed8' : '#b91c1c' },
    },
    {
      field: 'materialCode', headerName: '원재료코드', width: 104, editable: false, headerAlign: 'center', align: 'center',
      renderCell: ({ row }) => {
        const cell = codeCell(normalize(row), materialsRef.current);
        if (cell.overlap) {
          return (
            <Tooltip title={cell.overlap}>
              <Chip size="small" color="warning" variant="outlined" label="겹침" sx={{ height: 20, fontSize: 11 }} />
            </Tooltip>
          );
        }
        return <Box component="span" sx={{ fontFamily: 'ui-monospace, Consolas, monospace', fontSize: 11.5, color: 'text.secondary' }}>{cell.text}</Box>;
      },
    },
    {
      field: 'weight', headerName: '중량', width: 110, type: 'number', decimalPlaces: 3, editable: true, headerAlign: 'center', align: 'right',
      renderCell: ({ value }) => (toNumber(value) == null ? '' : fmt(toNumber(value))),
    },
    {
      field: 'percentCell', headerName: '배합비율 (%)', width: 110, editable: false, headerAlign: 'center', align: 'right',
      renderCell: ({ row }) => <Box component="span" sx={{ fontWeight: 700, color: 'success.dark' }}>{percentText(calc.percent(normalize(row)))}</Box>,
    },
    {
      field: 'unitPrice', headerName: '원재료단가', width: 120, type: 'number', decimalPlaces: 4, editable: true, headerAlign: 'center', align: 'right',
      renderCell: ({ value }) => (toNumber(value) == null ? '' : fmtPrice(toNumber(value))),
    },
    {
      field: 'amountCell', headerName: '적용단가', width: 110, editable: false, headerAlign: 'center', align: 'right',
      renderCell: ({ row }) => <Box component="span" sx={{ fontWeight: 700 }}>{fmtPrice(calc.amount(normalize(row)))}</Box>,
    },
    {
      field: 'deleteCell', headerName: '', width: 52, editable: false, headerAlign: 'center', align: 'center',
      renderCell: ({ row }) => (locked ? null : (
        <Button size="small" color="error" aria-label="행 삭제" title="행 삭제" sx={{ minWidth: 0, px: 0.75, py: 0 }} onClick={() => removeRow(row.id)}>✕</Button>
      )),
    },
  ], [materialNames, calc, locked]);

  // 원재료명이 바뀌면(송연 onNameChange) 코드를 버릴지 보고, 등록된 원재료면 단가를 채운다. 그리고 다시 계산
  const handleChanges = () => {
    const grid = gridRef.current;
    if (!grid) return;
    for (const row of grid.getActiveRows()) {
      const name = String(row.materialName ?? '');
      if (namesRef.current.get(row.id) === name) continue;
      namesRef.current.set(row.id, name);
      const n = name.trim();
      if (n !== (codeNamesRef.current.get(row.id) ?? '') && row.materialCode) {
        codeNamesRef.current.set(row.id, '');
        grid.setCellValue(row.id, 'materialCode', null);
      }
      const match = materialsRef.current.find((m) => m.name === n);
      if (match && match.unitPrice != null && toNumber(row.unitPrice) !== match.unitPrice) {
        grid.setCellValue(row.id, 'unitPrice', match.unitPrice);
      }
    }
    setCurrent(grid.getActiveRows().map(normalize));
  };

  useImperativeHandle(ref, () => ({
    getRows: () => (gridRef.current?.getActiveRows() ?? rows).map(normalize),
  }));

  return (
    <Box>
      <Box sx={{ height }}>
        <F1Grid
          key={gridKey}
          ref={gridRef}
          rows={rows}
          columns={columns}
          rowKey="id"
          storageKey="rd-recipe-bom-grid"
          ariaLabel="F1-GRID 레시피 배합표"
          height="100%"
          maxHeight="100%"
          rowHeight={34}
          columnLine
          showCheckbox={false}
          createRow={() => emptyRecipeRow()}
          editorPlugins={[{ id: 'rd-recipe-bom-editor', enabled: true, canEdit: () => !locked }]}
          allowAddRowInContextMenu={!locked}
          allowDuplicateRowInContextMenu={false}
          allowDeleteRowInContextMenu={!locked}
          onChangesChange={handleChanges}
        />
      </Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 1, alignItems: { sm: 'center' } }}>
        {!locked && <Button size="small" variant="outlined" onClick={() => gridRef.current?.addRow()}>+ 원재료 행 추가</Button>}
        {!locked && <Button size="small" variant="outlined" color="error" onClick={() => { const next = emptyRecipeRows(); namesRef.current = new Map(); codeNamesRef.current = new Map(); setRows(next); setCurrent(next); setGridKey((k) => k + 1); }}>전체 초기화</Button>}
        <Box sx={{ flex: 1 }} />
        <Typography variant="body2" aria-label="배합표 합계">
          적용단가 합계: <b>{fmtPrice(calc.totalAmount)}원</b>　중량 합계: <b>{fmt(calc.totalWeight)}</b>
        </Typography>
      </Stack>
    </Box>
  );
});

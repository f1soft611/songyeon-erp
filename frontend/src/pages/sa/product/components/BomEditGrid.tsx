import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import {
  F1Grid,
  type F1GridColumn,
  type F1GridRef,
} from '../../../../shared/components/f1-grid';
import type { BomEditRow, MaterialOption } from '../../../co/master/item-master/types/itemMaster.types';
import { appliedPrice, emptyBomEditRow, INITIAL_BOM_ROWS, materialNamePatch } from '../../../co/master/item-master/utils/productBom';
import { formatPrice } from '../../../../shared/utils/numberFormat';
import { formatOptionalNumber } from '../../../co/master/box-type/utils/boxType';

export type BomEditGridHandle = {
  // 지금 그리드의 줄(숫자 칸은 숫자로, 원재료 코드는 맞춘 값으로)
  getRows: () => BomEditRow[];
};

let nextBomRowId = 0;
export const newBomRowId = () => `bom-row-${nextBomRowId++}`;
export const emptyBomEditRows = (): BomEditRow[] =>
  Array.from({ length: INITIAL_BOM_ROWS }, () => emptyBomEditRow(newBomRowId()));

// 원재료 배합비 편집 그리드(송연 BomRowsTable). 제품BOM 창과 영업관리 제품등록이 같이 쓴다.
// 원재료명을 고르면 등록된 단가를 채우고(다른 이름이 되면 자동으로 채운 단가는 비움), 적용단가·배합비율 합계를 바로 보여준다.
// sourceRows 를 새로 주면(sourceKey 가 바뀌면) 그 줄로 다시 시작한다.
export const BomEditGrid = forwardRef<BomEditGridHandle, {
  materials: MaterialOption[];
  sourceRows: BomEditRow[];
  sourceKey: number;
  storageKey: string;
  height?: number | string;
  // 줄이 바뀔 때마다(이름·배합비율·단가) 지금 줄을 알려준다. 견적 창이 원재료비·견적단가를 바로 계산할 때 쓴다.
  onRowsChange?: (rows: BomEditRow[]) => void;
}>(function BomEditGrid({ materials, sourceRows, sourceKey, storageKey, height = 260, onRowsChange }, ref) {
  const gridRef = useRef<F1GridRef<BomEditRow>>(null);
  const [rows, setRows] = useState<BomEditRow[]>(sourceRows);
  const [gridKey, setGridKey] = useState(0);
  const [sum, setSum] = useState(0);
  // 그리드에 보이지 않는 값(줄마다): 마지막 원재료명, 맞춘 원재료 코드, 단가 자동 채움 여부, 마지막 단가
  const namesRef = useRef(new Map<string, string>());
  const codesRef = useRef(new Map<string, string | null>());
  const autoRef = useRef(new Map<string, boolean>());
  const pricesRef = useRef(new Map<string, number | null>());
  const materialsRef = useRef<MaterialOption[]>([]);
  materialsRef.current = materials;
  const onRowsChangeRef = useRef(onRowsChange);
  onRowsChangeRef.current = onRowsChange;

  const reset = (next: BomEditRow[]) => {
    namesRef.current = new Map(next.map((row) => [row.id, row.materialName]));
    codesRef.current = new Map(next.map((row) => [row.id, row.materialCode]));
    autoRef.current = new Map(next.map((row) => [row.id, row.autoPrice]));
    pricesRef.current = new Map(next.map((row) => [row.id, row.unitPrice]));
    setRows(next);
    setSum(next.reduce((total, row) => total + (row.ratioPercent ?? 0), 0));
    setGridKey((current) => current + 1);
    onRowsChangeRef.current?.(next);
  };

  useEffect(() => {
    reset(sourceRows);
    // sourceKey 가 바뀔 때만 다시 시작한다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceKey]);

  const materialNames = useMemo(
    () => [...new Set(materials.map((material) => material.name))].map((name) => ({ value: name, label: name })),
    [materials],
  );
  const columns = useMemo<F1GridColumn<BomEditRow>[]>(
    () => [
      {
        field: 'id',
        type: 'rownumber',
        width: 56,
        headerName: 'No',
        align: 'center',
        pinned: 'left'
      },
      {
        field: 'materialName',
        headerName: '원재료명',
        flex: 1.6,
        type: 'autocomplete',
        options: materialNames,
        editable: true,
        align: 'left',
        // 송연: 등록된 이름이면 파란, 다르면 빨간 글자
        getCellStyle: ({ row }) =>
          !row.materialName.trim() || !materialsRef.current.length
            ? undefined
            : { color: materialsRef.current.some((m) => m.name === row.materialName.trim()) ? '#1d4ed8' : '#b91c1c' },
      },
      // 빈 값은 빈칸으로(F1-Grid 기본 숫자 표시는 null 을 0 으로 그린다)
      {
        field: 'ratioPercent',
        headerName: '배합비율 (%)',
        flex: 0.9,
        type: 'decimal',
        decimalPlaces: 3,
        editable: true,
        align: 'right',
        renderCell: ({ value }) => formatOptionalNumber(value, 3),
      },
      {
        field: 'unitPrice',
        headerName: '원재료단가',
        flex: 0.9,
        type: 'currency',
        decimalPlaces: 4,
        editable: true,
        align: 'right',
        renderCell: ({ value }) => (value === null || value === undefined || value === '' ? '' : formatPrice(Number(value))),
      },
      {
        field: 'autoPrice',
        headerName: '적용단가',
        type: 'currency',
        decimalPlaces: 4,
        flex: 0.8,
        editable: false,
        align: 'right',
        renderCell: ({ row }) => appliedPrice(row.ratioPercent, row.unitPrice),
      },
    ],
    [materialNames],
  );

  // 원재료명을 바꾸면 단가를 채우거나 비우고(송연 onNameChange), 단가를 손으로 바꾸면 자동 채움 표시를 끈다
  const handleChanges = () => {
    const grid = gridRef.current;
    if (!grid) return;
    const active = grid.getActiveRows();
    for (const row of active) {
      const name = row.materialName ?? '';
      if (namesRef.current.get(row.id) !== name) {
        namesRef.current.set(row.id, name);
        const patch = materialNamePatch({ autoPrice: autoRef.current.get(row.id) ?? false }, name, materialsRef.current);
        codesRef.current.set(row.id, patch.materialCode ?? null);
        if (patch.autoPrice !== undefined) autoRef.current.set(row.id, patch.autoPrice);
        if (patch.unitPrice !== undefined && patch.unitPrice !== row.unitPrice) {
          pricesRef.current.set(row.id, patch.unitPrice);
          grid.setCellValue(row.id, 'unitPrice', patch.unitPrice);
        }
      } else if ((pricesRef.current.get(row.id) ?? null) !== (row.unitPrice ?? null)) {
        pricesRef.current.set(row.id, row.unitPrice ?? null);
        autoRef.current.set(row.id, false);
      }
    }
    setSum(active.reduce((total, row) => total + (Number(row.ratioPercent) || 0), 0));
    onRowsChangeRef.current?.(
      active.map((row) => ({
        ...row,
        ratioPercent: toNumber(row.ratioPercent),
        unitPrice: toNumber(grid.getActiveRows().find((item) => item.id === row.id)?.unitPrice),
        materialCode: codesRef.current.get(row.id) ?? null,
      })),
    );
  };

  const toNumber = (value: unknown): number | null =>
    value === null || value === undefined || String(value) === '' ? null : Number(value);

  useImperativeHandle(ref, () => ({
    getRows: () =>
      (gridRef.current?.getActiveRows() ?? rows).map((row) => ({
        ...row,
        materialName: row.materialName ?? '',
        ratioPercent: toNumber(row.ratioPercent),
        unitPrice: toNumber(row.unitPrice),
        materialCode: codesRef.current.get(row.id) ?? null,
      })),
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
          storageKey={storageKey}
          ariaLabel="F1-GRID 원재료 배합비"
          height="100%"
          maxHeight="100%"
          rowHeight={32}
          showCheckbox={false}
          createRow={() => emptyBomEditRow(newBomRowId())}
          editorPlugins={[{ id: `${storageKey}-editor`, enabled: true, canEdit: () => true }]}
          allowAddRowInContextMenu={true}
          allowDuplicateRowInContextMenu={false}
          allowDeleteRowInContextMenu={true}
          onChangesChange={handleChanges}
        />
      </Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 1, alignItems: { sm: 'center' } }}>
        <Button size="small" variant="outlined" onClick={() => gridRef.current?.addRow()}>+ 원재료 행 추가</Button>
        <Button size="small" variant="outlined" onClick={() => gridRef.current?.deleteSelectedRows()}>선택 행 삭제</Button>
        <Button size="small" variant="outlined" color="error" onClick={() => reset(emptyBomEditRows())}>전체 초기화</Button>
        <Box sx={{ flex: 1 }} />
        <Typography variant="body2">배합비율 합계: <b>{sum.toFixed(3)}%</b></Typography>
      </Stack>
    </Box>
  );
});

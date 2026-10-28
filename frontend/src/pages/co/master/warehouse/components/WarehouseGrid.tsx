import { useRef, useState, type RefObject } from 'react';
import {
  F1Grid,
  type F1GridChanges,
  type F1GridColumn,
  type F1GridRef,
} from '../../../../../shared/components/f1-grid';
import { resetGridStorageIfColumnsChanged } from '../../../../../shared/utils/gridStorage';
import { NEW_WAREHOUSE_TYPE, WAREHOUSE_TYPES, type WarehouseRow } from '../types/warehouse.types';
import { defaultRowsToClear, NEW_WAREHOUSE_ROW_PREFIX } from '../utils/warehouse';

// 그리드 storageKey 와 같은 값(JSX 에는 글자 그대로 쓴다: tests/f1-grid-storage-keys 가 JSX 의 글자 값을 본다)
const STORAGE_KEY = 'cm-basic-info-warehouse-grid';

// 저장된 칸 순서에 지금 칸이 하나라도 없으면(칸을 더하거나 바꿨을 때) 처음 순서로 다시 시작한다
const GRID_FIELDS = [
  'id',
  'name',
  'warehouseType',
  'isDefault',
  'remark',
  'materialCount',
  'useYn',
  'regUserNm',
  'regDt',
  'updUserNm',
  'updDt',
];

export function createWarehouseRow(): WarehouseRow {
  return {
    id: `${NEW_WAREHOUSE_ROW_PREFIX}${Date.now()}`,
    warehouseId: null,
    warehouseCd: '',
    name: '',
    warehouseType: NEW_WAREHOUSE_TYPE,
    isDefault: false,
    remark: '',
    materialCount: 0,
    regUserNm: '',
    regDt: '',
    updUserNm: '',
    updDt: '',
    useYn: 'Y',
  };
}

export function createWarehouseColumns(canEdit: boolean): F1GridColumn<WarehouseRow>[] {
  return [
    {
      field: 'id',
      headerName: 'No',
      type: 'rownumber',
      width: 56,
      align: 'center',
      pinned: 'left',
      search: { hidden: true },
      form: { hidden: true },
    },
    {
      field: 'name',
      search: { hidden: true },
      headerName: '창고명',
      flex: 1,
      editable: canEdit,
      required: true,
      headerAlign: 'center',
      align: 'left',
    },
    {
      field: 'warehouseType',
      search: { hidden: true },
      headerName: '창고유형',
      hidden: true,
      width: 115,
      type: 'select',
      options: WAREHOUSE_TYPES.map((value) => ({ value, label: value })),
      editable: canEdit,
      required: true,
      headerAlign: 'center',
      align: 'center',
    },
    {
      // 전체에서 한 곳. 들여온 원재료가 이 창고로 들어간다(입고창고)
      field: 'isDefault',
      search: { hidden: true },
      headerName: '기본창고',
      width: 90,
      type: 'checkbox',
      editable: canEdit,
      headerCheckbox: false,
      headerAlign: 'center',
      align: 'center',
    },
    {
      field: 'remark',
      search: { hidden: true },
      headerName: '설명',
      flex: 1,
      editable: canEdit,
      headerAlign: 'center',
      align: 'left',
      renderCell: ({ row }) => row.remark || '',
    },
    {
      field: 'materialCount',
      search: { hidden: true },
      headerName: '두고 있는 원재료',
      width: 130,
      editable: false,
      headerAlign: 'center',
      align: 'center',
      renderCell: ({ row }) => (row.materialCount ? `${row.materialCount}개` : ''),
    },
    {
      field: 'useYn',
      headerName: '사용여부',
      width: 80,
      type: 'select',
      align: 'center',
      options: [
        { value: 'Y', label: '사용' },
        { value: 'N', label: '미사용' },
      ],
      editable: canEdit,
      form: { group: '기본정보', order: 5 },
      search: { label: '사용여부', order: 1 },
    },
    {
      field: 'regUserNm',
      search: { hidden: true },
      headerName: '등록자',
      type: 'text',
      width: 100,
      align: 'center',
      editable: false,
    },
    {
      field: 'regDt',
      search: { hidden: true },
      headerName: '등록일시',
      type: 'datetime',
      width: 160,
      align: 'center',
      editable: false,
    },
    {
      field: 'updUserNm',
      search: { hidden: true },
      headerName: '수정자',
      type: 'text',
      width: 100,
      align: 'center',
      editable: false,
    },
    {
      field: 'updDt',
      search: { hidden: true },
      headerName: '수정일시',
      type: 'datetime',
      width: 160,
      align: 'center',
      editable: false,
    }
  ];
}

type WarehouseGridProps = {
  rows: WarehouseRow[];
  columns: F1GridColumn<WarehouseRow>[];
  canCreate: boolean;
  canExportExcel: boolean;
  loading: boolean;
  gridKey: number;
  gridRef: RefObject<F1GridRef<WarehouseRow> | null>;
  onChangesChange: (changes: F1GridChanges<WarehouseRow>) => void;
};

const rememberDefaults = (list: WarehouseRow[]) => new Map(list.map((row) => [row.id, row.isDefault]));

export function WarehouseGrid({
  rows,
  columns,
  canCreate,
  canExportExcel,
  loading,
  gridKey,
  gridRef,
  onChangesChange,
}: WarehouseGridProps) {
  // 그리드를 그리기 전에 저장된 칸 순서를 맞춘다(처음 한 번)
  useState(() => resetGridStorageIfColumnsChanged(STORAGE_KEY, GRID_FIELDS));
  // 줄별 기본창고 상태(다른 창고를 기본으로 켰을 때 원래 줄을 끄려고 기억해 둔다). 목록을 다시 받으면 그 값으로 시작한다
  const defaultRef = useRef(new Map<string, boolean>());
  const loadedKeyRef = useRef<number | null>(null);
  if (loadedKeyRef.current !== gridKey) {
    loadedKeyRef.current = gridKey;
    defaultRef.current = rememberDefaults(rows);
  }
  // 조회 조건(사용여부)을 바꿔 새로 보이는 줄은 지금 값을 기억한다(켜진 것으로 잘못 보지 않게)
  for (const row of rows) {
    if (!defaultRef.current.has(row.id)) defaultRef.current.set(row.id, row.isDefault);
  }

  // 기본창고는 한 곳: 어떤 줄을 켜면 원래 켜져 있던 줄을 바로 끈다
  const handleChangesChange = (changes: F1GridChanges<WarehouseRow>) => {
    const grid = gridRef.current;
    if (grid) {
      const activeRows = grid.getActiveRows();
      const toClear = defaultRowsToClear(defaultRef.current, activeRows);
      defaultRef.current = rememberDefaults(activeRows);
      for (const id of toClear) {
        defaultRef.current.set(id, false);
        grid.setCellValue(id, 'isDefault', false);
      }
    }
    onChangesChange(changes);
  };

  return (
    <F1Grid
      key={gridKey}
      ref={gridRef}
      ariaLabel="F1-GRID 창고"
      storageKey="cm-basic-info-warehouse-grid"
      rows={rows}
      columns={columns}
      rowKey="id"
      createRow={createWarehouseRow}
      onChangesChange={handleChangesChange}
      loading={loading}
      height="100%"
      maxHeight="100%"
      rowHeight={32}
      minRowHeight={32}
      maxRowHeight={320}
      showCheckbox={false}
      canExportExcel={canExportExcel}
      excelFileName="창고등록"
      allowAddRowInContextMenu={canCreate}
      allowDuplicateRowInContextMenu={false}
      allowDeleteRowInContextMenu={false}
    />
  );
}

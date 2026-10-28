import { useMemo, useState, type RefObject } from 'react';
import { Box, Chip, IconButton, Tooltip, Typography } from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';
import {
  F1Grid,
  type F1GridChanges,
  type F1GridColumn,
  type F1GridOption,
  type F1GridRef,
  type F1GridValidationError,
} from '../../../../../shared/components/f1-grid';
import { resetGridStorageIfColumnsChanged } from '../../../../../shared/utils/gridStorage';
import { formatPrice, formatQty } from '../../../../../shared/utils/numberFormat';
import {
  createMaterialMasterRow,
  supplierLabelsOf,
  supplierNamesOf,
  vendorNameMap,
  withRowValues,
} from '../../material-master/components/MaterialMasterGrid';
import type { MaterialMasterRow, VendorOption } from '../../material-master/types/materialMaster.types';
import { isLowStock } from '../../material-master/utils/materialMaster';

const STORAGE_KEY = 'cm-basic-info-sub-material-grid';
// 2026-10-27 내장 상세 창으로 바꾸며 창에만 보이는 칸(숨긴 칸)과 [이력] 칸을 더했다.
// 저장된 칸 순서에 지금 칸이 하나라도 없으면 처음 순서로 다시 시작한다
const GRID_FIELDS = [
  'id',
  'code',
  'name',
  'spec',
  'subCategory',
  'unit',
  'supplierCodes',
  'unitPrice',
  'priceDate',
  'stockQty',
  'safetyStock',
  'baseOrderQty',
  'unitWeight',
  'boxQty',
  'allergens',
  'usedByCount',
  'useYn',
  'regUserNm',
  'regDt',
  'updUserNm',
  'updDt',
  'historyAction',
];

const stopRowEvents = {
  onClick: (event: { stopPropagation: () => void }) => event.stopPropagation(),
  onDoubleClick: (event: { stopPropagation: () => void }) => event.stopPropagation(),
  onMouseDown: (event: { stopPropagation: () => void }) => event.stopPropagation(),
};

// 새 부자재 줄: 원재료와 같은 줄에 분류만 고른다(필수)
export const createSubMaterialMasterRow = (): MaterialMasterRow => ({
  ...createMaterialMasterRow(),
  id: `new-sub-material-${Date.now()}-${Math.random().toString(16).slice(2)}`,
});

// 등록 · 수정은 F1-Grid 내장 상세 창(오른쪽 클릭 [행 추가] · 제목줄 [신규 부자재 등록] · 줄 상세). 저장은 제목줄 [저장](원재료마스터와 같음)
export function createSubMaterialMasterColumns(
  canEdit: boolean,
  vendors: VendorOption[],
  unitOptions: F1GridOption[],
  categoryOptions: F1GridOption[],
  rows: MaterialMasterRow[],
  onHistory: (row: MaterialMasterRow) => void,
  onPickSupplier: F1GridColumn<MaterialMasterRow>['onOpenCodePicker'], // 납품업체 [선택] → 팝업
): F1GridColumn<MaterialMasterRow>[] {
  const vendorNames = vendorNameMap(vendors, rows);
  const units = [
    { value: '', label: '선택 안 함' },
    ...withRowValues(unitOptions, rows, (row) => [{ value: row.unit, label: row.unitNm || row.unit }]),
  ];
  // 분류: 공통코드 SUB_MATERIAL_CATEGORY(2026-10-23). 저장은 코드, 보이는 것은 짧은 이름(예: 필름)
  const categories = withRowValues(categoryOptions, rows, (row) => [{ value: row.subCategory, label: row.subCategoryNm || row.subCategory }]);
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
    },
    {
      field: 'code',
      headerName: '코드',
      width: 90,
      align: 'center',
      editable: false,
      pinned: 'left',
      form: { hidden: true },
      search: { hidden: true },
    },
    {
      field: 'name',
      headerName: '부자재명',
      flex: 1.4,
      width: 200,
      align: 'left',
      editable: canEdit,
      required: true,
      pinned: 'left',
      form: { group: '기본정보', order: 1 },
      search: { hidden: true },
    },
    {
      field: 'spec',
      headerName: '규격',
      width: 150,
      align: 'left',
      editable: canEdit,
      form: { group: '기본정보', order: 2 },
      search: { hidden: true },
    },
    {
      field: 'subCategory',
      headerName: '분류',
      type: 'select',
      options: categories,
      width: 90,
      align: 'center',
      editable: canEdit,
      required: true,
      form: { group: '기본정보', order: 3 },
      search: { label: '분류', order: 1 },
    },
    {
      // 단위: 공통코드 UNIT(2026-10-23). 저장은 코드, 비우면 비움
      field: 'unit',
      headerName: '단위',
      type: 'select',
      options: units,
      width: 80,
      align: 'center',
      editable: canEdit,
      renderCell: ({ row }) => units.find((option) => option.value === row.unit && row.unit)?.label || '',
      form: { group: '기본정보', order: 4 },
      search: { hidden: true },
    },
    {
      // 납품업체(2026-10-28): [선택] → 팝업에서 매입 거래처 한 곳을 고른다(원재료마스터와 같은 code 칸)
      field: 'supplierCodes',
      headerName: '납품업체',
      type: 'code',
      flex: 1,
      width: 120,
      align: 'left',
      editable: canEdit,
      onOpenCodePicker: onPickSupplier,
      onValueChange: () => {
        throw new Error('[선택]으로 납품업체를 골라 주세요.');
      },
      // 상세 창은 '코드 · 이름'(getValue), 표 칸은 이름만(renderCell)
      getValue: (row) => supplierLabelsOf(row, vendorNames).join(', '),
      renderCell: ({ row }) => supplierNamesOf(row, vendorNames).join(', '),
      form: { group: '기본정보', order: 5, span: 2 },
      // 상세 조회: 납품업체 이름 · 거래처코드 일부로 찾는다
      search: { label: '납품업체', order: 2 },
    },
    {
      field: 'unitPrice',
      headerName: '단가(원)',
      type: 'currency',
      decimalPlaces: 4,
      width: 100,
      align: 'right',
      editable: canEdit,
      // 단가가 없으면 빈칸(2026-10-28, '-' 를 보이지 않는다)
      renderCell: ({ row }) => (Number.isFinite(row.unitPrice) ? formatPrice(row.unitPrice) : ''),
      form: { group: '단가', order: 1, label: '단가 (원)' },
      search: { hidden: true },
    },
    {
      // 적용일자: 달력으로 고른다(원재료마스터와 같음)
      field: 'priceDate',
      headerName: '단가 적용일자',
      type: 'date',
      hidden: true,
      editable: canEdit,
      form: {
        hidden: false,
        group: '단가',
        order: 2,
        label: '적용일자 (비워두면 바로)',
      },
      search: { hidden: true },
    },
    {
      field: 'stockQty',
      headerName: '재고',
      width: 110,
      align: 'right',
      editable: false,
      getCellStyle: ({ row }) => (isLowStock(row) ? { color: '#d97706', fontWeight: 700 } : undefined),
      renderCell: ({ row }) => (
        <>
          {formatQty(row.stockQty)}
          {isLowStock(row) && <Chip size="small" color="warning" label="부족" sx={{ ml: 0.5, height: 20, fontSize: 11 }} />}
        </>
      ),
      form: { hidden: true },
      search: { hidden: true },
    },
    {
      field: 'safetyStock',
      headerName: '안전재고',
      type: 'decimal',
      width: 90,
      align: 'right',
      editable: canEdit,
      renderCell: ({ row }) => (row.safetyStock != null ? formatQty(row.safetyStock) : ''),
      form: { group: '재고', order: 1 },
      search: { hidden: true },
    },
    {
      field: 'baseOrderQty',
      headerName: '기초발주량',
      type: 'decimal',
      hidden: true,
      editable: canEdit,
      // 표에서 숨긴 칸은 form.hidden: false 를 적어야 창에 나온다(F1-Grid 규칙)
      form: { hidden: false, group: '재고', order: 2 },
      search: { hidden: true },
    },
    {
      field: 'unitWeight',
      headerName: '단위중량',
      type: 'decimal',
      hidden: true,
      editable: canEdit,
      form: { hidden: false, group: '포장', order: 1, label: '단위중량 (한 봉 kg)' },
      search: { hidden: true },
    },
    {
      field: 'boxQty',
      headerName: '박스 입수량',
      type: 'number',
      hidden: true,
      editable: canEdit,
      form: { hidden: false, group: '포장', order: 2, label: '박스 입수량 (몇 봉)' },
      search: { hidden: true },
    },
    {
      field: 'allergens',
      headerName: '알러지',
      hidden: true,
      editable: canEdit,
      form: { hidden: false, group: '기타', order: 1, label: '알러지유발물질', span: 2 },
      search: { hidden: true },
    },
    {
      field: 'usedByCount',
      headerName: '쓰는 제품',
      width: 100,
      align: 'center',
      editable: false,
      renderCell: ({ row }) =>
        row.usedByCount ? `${row.usedByCount}개 제품` : <Typography component="span" variant="body2" color="text.disabled">아직 없음</Typography>,
      form: { hidden: true },
      search: { hidden: true },
    },
    {
      field: 'useYn',
      headerName: '사용여부',
      width: 90,
      type: 'select',
      align: 'center',
      editable: canEdit,
      options: [
        { value: 'Y', label: '사용' },
        { value: 'N', label: '미사용' },
      ],
      form: { group: '기본정보', order: 6 },
      search: { label: '사용여부', order: 3 },
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
      width: 130,
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
      width: 130,
      align: 'center',
      editable: false,
    },
    {
      // [이력]: 단가 변경로그 · 예약된 단가변경(원재료마스터와 같은 창)
      field: 'historyAction',
      headerName: '이력',
      width: 60,
      align: 'center',
      editable: false,
      pinned: 'right',
      getValue: () => '',
      renderCell: ({ row }) =>
        row.code ? (
          <Box {...stopRowEvents}>
            <Tooltip title="단가 이력">
              <IconButton size="small" aria-label={`${row.name} 단가 이력`} onClick={() => onHistory(row)}>
                <HistoryIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        ) : null,
      form: { hidden: true },
      search: { hidden: true },
    },
  ];
}

type SubMaterialMasterGridProps = {
  rows: MaterialMasterRow[];
  columns: F1GridColumn<MaterialMasterRow>[];
  canCreate: boolean;
  canUpdate: boolean;
  canExportExcel: boolean;
  loading: boolean;
  gridKey: number;
  gridRef: RefObject<F1GridRef<MaterialMasterRow> | null>;
  onChangesChange: (changes: F1GridChanges<MaterialMasterRow>) => void;
  onValidationErrors?: (errors: F1GridValidationError[]) => void;
};

export function SubMaterialMasterGrid({
  rows,
  columns,
  canCreate,
  canUpdate,
  canExportExcel,
  loading,
  gridKey,
  gridRef,
  onChangesChange,
  onValidationErrors,
}: SubMaterialMasterGridProps) {
  // 그리드를 그리기 전에 저장된 칸 순서를 맞춘다(처음 한 번)
  useState(() => resetGridStorageIfColumnsChanged(STORAGE_KEY, GRID_FIELDS));

  // S_ERP MaterialGrid 와 같음: 등록 · 수정 권한이 없으면 상세 창을 끈다
  const rowFormPlugin = useMemo(() => {
    if (!canCreate && !canUpdate) return { enabled: false };
    return {
      getTitle: ({ mode }: { mode: 'create' | 'edit' }) => (mode === 'create' ? '부자재 등록' : '부자재 수정'),
      onBeforeApply: ({ mode }: { mode: 'create' | 'edit' }) => (mode === 'create' ? canCreate : canUpdate),
    };
  }, [canCreate, canUpdate]);

  return (
    <Box sx={{ flex: 1, minHeight: 0, height: '100%', overflow: 'hidden' }}>
      <F1Grid
        key={gridKey}
        ref={gridRef}
        ariaLabel="F1-GRID 부자재마스터"
        storageKey="cm-basic-info-sub-material-grid"
        rows={rows}
        columns={columns}
        rowKey="id"
        rowFormPlugin={rowFormPlugin}
        createRow={createSubMaterialMasterRow}
        onChangesChange={onChangesChange}
        onValidationErrors={onValidationErrors}
        loading={loading}
        height="100%"
        maxHeight="100%"
        rowHeight={34}
        minRowHeight={34}
        maxRowHeight={320}
        showCheckbox={false}
        canExportExcel={canExportExcel}
        excelFileName="부자재마스터"
        allowAddRowInContextMenu={canCreate}
        allowDuplicateRowInContextMenu={false}
        allowDeleteRowInContextMenu={false}
      />
    </Box>
  );
}

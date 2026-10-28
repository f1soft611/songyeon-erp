import { useMemo, useState, type RefObject } from 'react';
import { Box, Button, Chip, IconButton, Stack, Tooltip, Typography } from '@mui/material';
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
import type { MaterialMasterRow, VendorOption } from '../types/materialMaster.types';
import { isLowStock, isMinusStock } from '../utils/materialMaster';

const STORAGE_KEY = 'cm-basic-info-material-grid';
// 2026-10-27 내장 상세 창으로 바꾸며 창에만 보이는 칸(숨긴 칸)과 [작업] · [이력] 칸을 더했다.
// 저장된 칸 순서에 지금 칸이 하나라도 없으면 처음 순서로 다시 시작한다
const GRID_FIELDS = [
  'id',
  'code',
  'name',
  'spec',
  'unitWeight',
  'boxQty',
  'supplierCodes',
  'unit',
  'unitPrice',
  'priceDate',
  'stockQty',
  'safetyStock',
  'baseOrderQty',
  'allergens',
  'lastUsedDate',
  'useYn',
  'regUserNm',
  'regDt',
  'updUserNm',
  'updDt',
  'workAction',
  'historyAction',
];

const rowButton = { minWidth: 0, px: 1, py: 0 };
const stopRowEvents = {
  onClick: (event: { stopPropagation: () => void }) => event.stopPropagation(),
  onDoubleClick: (event: { stopPropagation: () => void }) => event.stopPropagation(),
  onMouseDown: (event: { stopPropagation: () => void }) => event.stopPropagation(),
};

export function createMaterialMasterRow(): MaterialMasterRow {
  return {
    id: `new-material-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    code: '',
    name: '',
    spec: '',
    unitPrice: null,
    stockQty: null,
    supplier: '',
    suppliers: [],
    supplierCodes: [],
    priceDate: '',
    safetyStock: null,
    baseOrderQty: null,
    allergens: '',
    subCategory: '',
    subCategoryNm: '',
    unit: '',
    unitNm: '',
    regUserNm: '',
    regDt: '',
    updUserNm: '',
    updDt: '',
    useYn: 'Y',
    unitWeight: null,
    boxQty: null,
    lastUsedDate: '',
    usedByCount: null,
  };
}

// 고르기 목록에 없는(사용안함이 된 · 매입 거래처가 아닌) 지금 값도 남겨 보여 준다(S_ERP MaterialGrid 와 같음)
export function withRowValues(
  base: F1GridOption[],
  rows: MaterialMasterRow[],
  valuesOf: (row: MaterialMasterRow) => { value: string; label: string }[],
): F1GridOption[] {
  const options = [...base];
  const known = new Set(options.map((option) => String(option.value)));
  rows.forEach((row) =>
    valuesOf(row).forEach(({ value, label }) => {
      if (value && !known.has(value)) {
        options.push({ value, label });
        known.add(value);
      }
    }),
  );
  return options;
}

// 거래처코드 → 업체명. 매입 거래처 목록에 없는(사용안함 등) 지금 값은 서버가 준 이름으로(원재료 · 부자재 같이 씀)
export function vendorNameMap(vendors: VendorOption[], rows: MaterialMasterRow[]): Map<string, string> {
  return new Map(
    [...rows.flatMap((row) => row.suppliers), ...vendors].flatMap((vendor) => (vendor.code ? [[vendor.code, vendor.name] as const] : [])),
  );
}

// 납품업체 상세 창 칸에 보일 글자: '000006 · (주)케이프라이드'(2026-10-28, 제품마스터 거래처 칸과 같은 모양).
// 거래처코드가 없는 옛 업체는 이름만
export function supplierLabelsOf(row: MaterialMasterRow, nameOf: Map<string, string>): string[] {
  if (row.supplierCodes.length === 0) return row.suppliers.map((vendor) => vendor.name).filter(Boolean);
  return row.supplierCodes.map((code) => {
    const name = nameOf.get(code);
    return name ? `${code} · ${name}` : code;
  });
}

// 납품업체 표 칸에 보일 글자: 업체명만(2026-10-28). 이름을 모르는 코드는 코드 그대로
export function supplierNamesOf(row: MaterialMasterRow, nameOf: Map<string, string>): string[] {
  if (row.supplierCodes.length === 0) return row.suppliers.map((vendor) => vendor.name).filter(Boolean);
  return row.supplierCodes.map((code) => nameOf.get(code) ?? code);
}

type MaterialMasterColumnHandlers = {
  onUsage: (row: MaterialMasterRow) => void; // 역전개
  onReplace: (row: MaterialMasterRow) => void; // 일괄적용
  onHistory: (row: MaterialMasterRow) => void; // 이력(단가 변경로그 · 예약)
  onPickSupplier: F1GridColumn<MaterialMasterRow>['onOpenCodePicker']; // 납품업체 [선택] → 팝업
};

// 등록 · 수정은 F1-Grid 내장 상세 창(오른쪽 클릭 [행 추가] · 제목줄 [신규 원재료 등록] · 줄 상세). 저장은 제목줄 [저장]
export function createMaterialMasterColumns(
  canEdit: boolean,
  canWrite: boolean,
  vendors: VendorOption[],
  unitOptions: F1GridOption[],
  rows: MaterialMasterRow[],
  handlers: MaterialMasterColumnHandlers,
): F1GridColumn<MaterialMasterRow>[] {
  const vendorNames = vendorNameMap(vendors, rows);
  const units = [
    { value: '', label: '선택 안 함' },
    ...withRowValues(unitOptions, rows, (row) => [{ value: row.unit, label: row.unitNm || row.unit }]),
  ];

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
      headerName: '원재료코드',
      width: 100,
      align: 'center',
      editable: false,
      pinned: 'left',
      form: { hidden: true },
      search: { hidden: true },
    },
    {
      field: 'name',
      headerName: '원재료명',
      flex: 1.4,
      width: 250,
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
      width: 130,
      align: 'left',
      editable: canEdit,
      form: { group: '기본정보', order: 2 },
      search: { hidden: true },
    },
    {
      // 송연 packText: 한 봉 몇 kg · 한 박스 몇 봉. 비어 있으면 '미입력' 으로 안 채운 것이 눈에 띄게 한다
      field: 'unitWeight',
      headerName: '단위중량',
      type: 'decimal',
      width: 120,
      align: 'left',
      editable: canEdit,
      renderCell: ({ row }) =>
        row.unitWeight == null ? (
          <Chip size="small" color="warning" variant="outlined" label="미입력" sx={{ height: 20, fontSize: 11 }} />
        ) : (
          <>
            {formatQty(row.unitWeight)}kg
            {row.boxQty && row.boxQty > 1 ? <Box component="span" sx={{ color: 'text.secondary' }}>&nbsp;× {row.boxQty}봉</Box> : null}
          </>
        ),
      form: { group: '포장', order: 1, label: '단위중량 (한 봉 kg)' },
      search: { hidden: true },
    },
    {
      field: 'boxQty',
      headerName: '박스 입수량',
      type: 'number',
      hidden: true,
      editable: canEdit,
      // 표에서 숨긴 칸은 form.hidden: false 를 적어야 창에 나온다(F1-Grid 규칙)
      form: { hidden: false, group: '포장', order: 2, label: '박스 입수량 (몇 봉)' },
      search: { hidden: true },
    },
    {
      // 납품업체(2026-10-28): [선택] → 팝업에서 매입 거래처 한 곳을 고른다(S_ERP 품목관리 품목분류 칸과 같은 code 칸).
      // DB materials.client_code 도 거래처코드 한 곳(20261028_001)
      field: 'supplierCodes',
      headerName: '납품업체',
      type: 'code',
      flex: 1.2,
      width: 160,
      align: 'left',
      editable: canEdit,
      onOpenCodePicker: handlers.onPickSupplier,
      onValueChange: () => {
        throw new Error('[선택]으로 납품업체를 골라 주세요.');
      },
      // 상세 창은 '코드 · 이름'(getValue), 표 칸은 이름만(renderCell)
      getValue: (row) => supplierLabelsOf(row, vendorNames).join(', '),
      renderCell: ({ row }) => supplierNamesOf(row, vendorNames).join(', '),
      form: { group: '기본정보', order: 4, span: 2 },
      // 상세 조회: 납품업체 이름 · 거래처코드 일부로 찾는다
      search: { label: '납품업체', order: 1 },
    },
    {
      // 입고단위: 공통코드 UNIT(2026-10-23). 저장은 코드, 비우면 비움
      field: 'unit',
      headerName: '입고단위',
      type: 'select',
      options: units,
      hidden: true,
      editable: canEdit,
      form: { hidden: false, group: '기본정보', order: 5 },
      search: { hidden: true },
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
      // 적용일자: 비우면 바로, 앞날이면 그날부터 적용되도록 예약한다(새 원재료도 같다).
      // 달력으로 고른다(2026-10-28)
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
      // 안전재고보다 적으면 눈에 띄게 해서 발주할 것을 알려준다
      getCellStyle: ({ row }) =>
        isMinusStock(row) ? { color: '#dc2626', fontWeight: 700 } : isLowStock(row) ? { color: '#d97706', fontWeight: 700 } : undefined,
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
      form: { hidden: false, group: '재고', order: 2 },
      search: { hidden: true },
    },
    {
      // 알러지유발물질은 이 원재료를 쓰는 제품 라벨에 자동으로 올라간다
      field: 'allergens',
      headerName: '알러지',
      width: 100,
      align: 'left',
      editable: canEdit,
      form: { group: '기타', order: 1, label: '알러지유발물질', span: 2 },
      search: { hidden: true },
    },
    {
      field: 'lastUsedDate',
      headerName: '마지막사용일',
      width: 120,
      align: 'center',
      editable: false,
      renderCell: ({ row }) =>
        row.lastUsedDate || <Typography component="span" variant="body2" color="text.disabled">사용이력없음</Typography>,
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
      form: { group: '기본정보', order: 3 },
      search: { label: '사용여부', order: 2 },
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
      // 메뉴 권한: 역전개 = 보기, 일괄적용 = 쓰기
      field: 'workAction',
      headerName: '작업',
      width: 150,
      align: 'center',
      editable: false,
      getValue: () => '',
      renderCell: ({ row }) =>
        row.code ? (
          <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'center' }} {...stopRowEvents}>
            <Button size="small" variant="outlined" sx={rowButton} onClick={() => handlers.onUsage(row)}>역전개</Button>
            {canWrite ? (
              <Button size="small" variant="outlined" sx={rowButton} onClick={() => handlers.onReplace(row)}>일괄적용</Button>
            ) : null}
          </Stack>
        ) : null,
      form: { hidden: true },
      search: { hidden: true },
    },
    {
      // 2026-10-27 [이력]: 단가 변경로그 · 예약된 단가변경(예전 원재료 창의 변경로그 탭)
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
              <IconButton size="small" aria-label={`${row.name} 단가 이력`} onClick={() => handlers.onHistory(row)}>
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

type MaterialMasterGridProps = {
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

export function MaterialMasterGrid({
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
}: MaterialMasterGridProps) {
  // 그리드를 그리기 전에 저장된 칸 순서를 맞춘다(처음 한 번)
  useState(() => resetGridStorageIfColumnsChanged(STORAGE_KEY, GRID_FIELDS));

  // S_ERP MaterialGrid 와 같음: 등록 · 수정 권한이 없으면 상세 창을 끈다
  const rowFormPlugin = useMemo(() => {
    if (!canCreate && !canUpdate) return { enabled: false };
    return {
      getTitle: ({ mode }: { mode: 'create' | 'edit' }) => (mode === 'create' ? '원재료 등록' : '원재료 수정'),
      onBeforeApply: ({ mode }: { mode: 'create' | 'edit' }) => (mode === 'create' ? canCreate : canUpdate),
    };
  }, [canCreate, canUpdate]);

  return (
    <Box sx={{ flex: 1, minHeight: 0, height: '100%', overflow: 'hidden' }}>
      <F1Grid
        key={gridKey}
        ref={gridRef}
        ariaLabel="F1-GRID 원재료마스터"
        storageKey="cm-basic-info-material-grid"
        rows={rows}
        columns={columns}
        rowKey="id"
        rowFormPlugin={rowFormPlugin}
        createRow={createMaterialMasterRow}
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
        excelFileName="원재료마스터"
        allowAddRowInContextMenu={canCreate}
        allowDuplicateRowInContextMenu={false}
        allowDeleteRowInContextMenu={false}
      />
    </Box>
  );
}

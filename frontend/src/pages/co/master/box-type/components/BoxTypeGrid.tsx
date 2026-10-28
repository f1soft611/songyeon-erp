import { useState, type RefObject } from 'react';
import {
  F1Grid,
  type F1GridChanges,
  type F1GridColumn,
  type F1GridRef,
} from '../../../../../shared/components/f1-grid';
import { resetGridStorageIfColumnsChanged } from '../../../../../shared/utils/gridStorage';
import type { BoxTypeRow } from '../types/boxType.types';

const NEW_ROW_PREFIX = 'new-packaging-';
const STORAGE_KEY = 'cm-basic-info-packaging-type-grid';

// 저장된 칸 순서에 지금 칸이 하나라도 없으면(칸을 더하거나 바꿨을 때) 처음 순서로 다시 시작한다
const GRID_FIELDS = [
  'id',
  'boxTypeNm',
  'fixedMarginRate',
  'lossRate',
  'laborCost',
  'packingCost',
  'logisticsCost',
  'useYn',
  'regUserNm',
  'regDt',
  'updUserNm',
  'updDt',
];

// 예전 순서(사용여부가 맨 끝)로 저장된 값은 지운다
function resetOldUseYnOrder() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const order: unknown = raw ? JSON.parse(raw)?.order : null;
    if (!Array.isArray(order)) return;
    const last = order.length - 1;
    if (order[last] === 'useYn' && order[last - 1] === 'updDt') window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // 저장값을 읽지 못하면 그대로 둔다
  }
}

export function createBoxTypeRow(): BoxTypeRow {
  return {
    id: `${NEW_ROW_PREFIX}${Date.now()}`,
    boxTypeId: null,
    boxTypeCd: '',
    boxTypeNm: '',
    fixedMarginRate: null,
    lossRate: null,
    laborCost: null,
    packingCost: null,
    logisticsCost: null,
    marginAmt: null,
    regUserId: '',
    regUserNm: '',
    regDt: '',
    updUserId: '',
    updUserNm: '',
    updDt: '',
    useYn: 'Y',
  };
}

export function createBoxTypeColumns(canEdit: boolean): F1GridColumn<BoxTypeRow>[] {
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
      field: 'boxTypeNm',
      search: { hidden: true },
      headerName: '포장유형',
      width: 180,
      editable: canEdit,
      required: true,
      headerAlign: 'center',
      align: 'left',
    },
    {
      field: 'fixedMarginRate',
      search: { hidden: true },
      headerName: '고정마진율(%)',
      type: 'decimal',
      decimalPlaces: 2,
      width: 130,
      align: 'right',
      editable: canEdit,
      min: 0
    },
    {
      field: 'lossRate',
      search: { hidden: true },
      headerName: '로스율(%)',
      type: 'decimal',
      decimalPlaces: 2,
      width: 130,
      align: 'right',
      editable: canEdit,
      min: 0
    },
    {
      field: 'laborCost',
      search: { hidden: true },
      headerName: '인건비(원)',
      type: 'decimal',
      decimalPlaces: 2,
      width: 130,
      align: 'right',
      editable: canEdit,
      min: 0
    },
    {
      field: 'packingCost',
      search: { hidden: true },
      headerName: '포장비(원)',
      type: 'decimal',
      decimalPlaces: 2,
      width: 130,
      align: 'right',
      editable: canEdit,
      min: 0
    },
    {
      field: 'logisticsCost',
      search: { hidden: true },
      headerName: '물류비(원)',
      type: 'decimal',
      decimalPlaces: 2,
      width: 130,
      align: 'right',
      editable: canEdit,
      min: 0
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
      // 상세 조회 조건은 사용여부 하나(S_ERP 거래처관리처럼 열의 search 설정으로 검색 칸을 만든다)
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
      width: 160,
      align: 'center',
      editable: false,
    }
  ];
}

type BoxTypeGridProps = {
  rows: BoxTypeRow[];
  columns: F1GridColumn<BoxTypeRow>[];
  canCreate: boolean;
  canExportExcel: boolean;
  loading: boolean;
  gridKey: number;
  gridRef: RefObject<F1GridRef<BoxTypeRow> | null>;
  onChangesChange: (changes: F1GridChanges<BoxTypeRow>) => void;
};

export function BoxTypeGrid({
  rows,
  columns,
  canCreate,
  canExportExcel,
  loading,
  gridKey,
  gridRef,
  onChangesChange,
}: BoxTypeGridProps) {
  // 그리드를 그리기 전에 저장된 칸 순서를 맞춘다(처음 한 번)
  useState(() => {
    resetOldUseYnOrder();
    return resetGridStorageIfColumnsChanged(STORAGE_KEY, GRID_FIELDS);
  });

  return (
    <F1Grid
      key={gridKey}
      ref={gridRef}
      ariaLabel="F1-GRID 포장유형"
      storageKey={STORAGE_KEY}
      rows={rows}
      columns={columns}
      rowKey="id"
      createRow={createBoxTypeRow}
      onChangesChange={onChangesChange}
      loading={loading}
      height="100%"
      maxHeight="100%"
      rowHeight={32}
      minRowHeight={32}
      maxRowHeight={320}
      showCheckbox={false}
      canExportExcel={canExportExcel}
      excelFileName="포장유형"
      allowAddRowInContextMenu={canCreate}
      allowDuplicateRowInContextMenu={false}
      allowDeleteRowInContextMenu={false}
    />
  );
}

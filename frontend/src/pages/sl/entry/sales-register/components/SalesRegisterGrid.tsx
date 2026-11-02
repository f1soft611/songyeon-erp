import { useMemo, useState, type RefObject } from 'react';
import { Box, Chip } from '@mui/material';
import {
  F1Grid,
  type F1GridChanges,
  type F1GridColumn,
  type F1GridRef,
  type F1GridValidationError,
} from '../../../../../shared/components/f1-grid';
import { resetGridStorageIfColumnsChanged } from '../../../../../shared/utils/gridStorage';
import { createManualRow, formatMoney, formatQty, statusOf, type ShippableRow } from '../utils/salesRegister';

// 2026-11-02 거래처 · 품목명 고정을 풀면서 v2 로 바꿨다. F1-Grid 는 고정 상태도 저장하므로 예전 키를 쓰면 고정이 그대로 남는다
const STORAGE_KEY = 'sl-sales-register-grid-v2';
// 2026-11-02 메모 칸(창에만 보임)을 더했다. 저장된 칸 순서에 지금 칸이 하나라도 없으면 처음 순서로 다시 시작한다
const GRID_FIELDS = ['key', 'saleDate', 'clientName', 'productName', 'qty', 'unitPrice', 'amount', 'already', 'note'];

type ColumnOptions = {
  canCreate: boolean;
  onPickClient: (row: ShippableRow, apply: (changes: Partial<ShippableRow>) => void) => void;
  onPickProduct: (row: ShippableRow, apply: (changes: Partial<ShippableRow>) => void) => void;
};

// 이미 판매로 들어간 줄은 흐리게(송연과 같음)
const fadedStyle = (row: ShippableRow) => (row.already ? { opacity: 0.5 } : {});

// 출하확정에서 온 줄은 고칠 수 없고, 직접 등록 새 줄만 고친다. 상세 조회(⌄)에는 판매일자 기간 · 품목코드/명이 나온다
export function createSalesRegisterColumns({ canCreate, onPickClient, onPickProduct }: ColumnOptions): F1GridColumn<ShippableRow>[] {
  const editable = (row: ShippableRow) => canCreate && row.isNew === true;
  const readOnly = (row: ShippableRow) => !row.isNew;
  return [
    {
      field: 'key',
      type: 'rownumber',
      width: 56,
      headerName: 'No',
      align: 'center',
      pinned: 'left',
      search: { hidden: true },
      form: { hidden: true }
    },
    {
      field: 'saleDate',
      headerName: '판매일자',
      width: 120,
      type: 'date',
      align: 'center',
      editable,
      required: true,
      pinned: 'left',
      form: { readOnly, order: 1 },
      search: { label: '판매일자', order: 2, span: 2, required: true },
      getCellStyle: ({ row }) => fadedStyle(row),
    },
    {
      field: 'clientName',
      headerName: '거래처',
      flex: 1,
      width: 250,
      type: 'code',
      align: 'left',
      editable,
      required: true,
      onOpenCodePicker: (row, apply) => {
        onPickClient(row, apply);
        return undefined;
      },
      onValueChange: () => {
        throw new Error('[선택]으로 거래처를 골라 주세요.');
      },
      form: { readOnly, order: 2 },
      search: { hidden: true },
      getCellStyle: ({ row }) => fadedStyle(row),
    },
    {
      field: 'productName',
      headerName: '품목명',
      flex: 1.5,
      width: 350,
      type: 'code',
      align: 'left',
      editable,
      required: true,
      onOpenCodePicker: (row, apply) => {
        onPickProduct(row, apply);
        return undefined;
      },
      onValueChange: () => {
        throw new Error('[선택]으로 품목을 골라 주세요.');
      },
      form: { readOnly, order: 3 },
      search: { label: '품목코드/명', order: 1 },
      getCellStyle: ({ row }) => fadedStyle(row),
    },
    {
      field: 'qty',
      headerName: '수량',
      width: 110,
      type: 'number',
      decimalPlaces: 2,
      align: 'right',
      editable,
      required: true,
      renderCell: ({ row }) => formatQty(row.qty),
      form: { readOnly, order: 4 },
      search: { hidden: true },
      getCellStyle: ({ row }) => fadedStyle(row),
    },
    {
      field: 'unitPrice',
      headerName: '단가',
      width: 120,
      type: 'currency',
      decimalPlaces: 4,
      align: 'right',
      editable,
      renderCell: ({ row }) => formatMoney(row.unitPrice),
      form: { readOnly, order: 5 },
      search: { hidden: true },
      getCellStyle: ({ row }) => fadedStyle(row),
    },
    {
      field: 'amount',
      headerName: '금액',
      width: 140,
      type: 'currency',
      decimalPlaces: 4,
      align: 'right',
      renderCell: ({ row }) => formatMoney(row.amount),
      form: { hidden: true },
      search: { hidden: true },
      getCellStyle: ({ row }) => ({ fontWeight: 700, ...fadedStyle(row) }),
    },
    {
      field: 'already',
      headerName: '상태',
      width: 120,
      align: 'center',
      renderCell: ({ row }) => {
        const status = statusOf(row);
        if (status === 'already') return <Chip size="small" variant="outlined" label="이미 등록됨" />;
        if (status === 'no-price') return <Chip size="small" color="warning" variant="outlined" label="단가 없음" />;
        return '';
      },
      form: { hidden: true },
      search: { hidden: true },
    },
    // 표에서 숨긴 칸은 form.hidden: false 를 적어야 창에 나온다(F1-Grid 규칙)
    { field: 'note', headerName: '메모', hidden: true, editable, form: { readOnly, hidden: false, order: 6, span: 2 }, search: { hidden: true } },
  ];
}

type SalesRegisterGridProps = {
  rows: ShippableRow[];
  columns: F1GridColumn<ShippableRow>[];
  canCreate: boolean;
  loading: boolean;
  gridKey: number;
  gridRef: RefObject<F1GridRef<ShippableRow> | null>;
  onChangesChange: (changes: F1GridChanges<ShippableRow>) => void;
  onValidationErrors: (errors: F1GridValidationError[]) => void;
};

// [직접 등록]과 오른쪽 클릭 [행 추가]는 같은 내장 상세 창('판매 직접 등록')을 연다. [적용]하면 표에 새 줄이 생기고 [저장]으로 넣는다
export function SalesRegisterGrid({
  rows, columns, canCreate, loading, gridKey, gridRef, onChangesChange, onValidationErrors,
}: SalesRegisterGridProps) {
  // 그리드를 그리기 전에 저장된 칸 순서를 맞춘다(처음 한 번)
  useState(() => resetGridStorageIfColumnsChanged(STORAGE_KEY, GRID_FIELDS));

  const rowFormPlugin = useMemo(() => {
    if (!canCreate) return { enabled: false };
    return {
      getTitle: ({ row }: { row: ShippableRow }) => (row.isNew ? '판매 직접 등록' : '판매 상세'),
      // 출하확정에서 온 줄은 창에서 보기만 한다(form.readOnly)
      getDescription: ({ row }: { row: ShippableRow }) => (row.isNew
        ? '출하등록을 거치지 않고 판 것을 적어요. 단가를 비우면 단가관리의 판매단가를 씁니다.'
        : '출하확정에서 온 줄은 보기만 할 수 있어요.'),
      onBeforeApply: ({ draftRow }: { draftRow: ShippableRow }) => draftRow.isNew === true,
    };
  }, [canCreate]);

  return (
    <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
      <F1Grid
        key={gridKey}
        ref={gridRef}
        rows={rows}
        columns={columns}
        rowKey="key"
        storageKey="sl-sales-register-grid-v2"
        ariaLabel="F1-GRID 판매등록"
        height="100%"
        maxHeight="100%"
        rowHeight={34}
        minRowHeight={34}
        maxRowHeight={320}
        columnLine
        showCheckbox
        loading={loading}
        resizableRows={false}
        rowFormPlugin={rowFormPlugin}
        createRow={createManualRow}
        allowAddRowInContextMenu={canCreate}
        allowDuplicateRowInContextMenu={false}
        allowDeleteRowInContextMenu={false}
        onChangesChange={onChangesChange}
        onValidationErrors={onValidationErrors}
      />
    </Box>
  );
}

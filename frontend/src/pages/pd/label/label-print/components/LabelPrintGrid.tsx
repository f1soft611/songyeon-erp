import { useState } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { F1Grid, type F1GridColumn } from '../../../../../shared/components/f1-grid';
import { barcodeSvgMarkup } from '../../../../../shared/components/LabelPrintDialog/labelHtml';
import { resetGridStorageIfColumnsChanged } from '../../../../../shared/utils/gridStorage';
import type { LabelPrintRow } from '../types/labelPrint.types';
import { NO_PRODUCT_CODE_MESSAGE, printQtyText } from '../utils/labelPrint';

const STORAGE_KEY = 'pd-label-print-grid';
// 2026-10-30 [인쇄] 단추 칸을 printAction 으로 바꿨다. 저장된 칸 순서에 지금 칸이 없으면 처음 순서로
const GRID_FIELDS = [
  'scheduleId',
  'productName',
  'spec',
  'orderQty',
  'productCode',
  'printAction'
];

type LabelPrintColumnOptions = {
  onPrint: (row: LabelPrintRow) => void;
};

// 라벨출력 칸: 품목명 · 규격단위 · 생산수량 · 바코드(CODE128) · 🏷️ 인쇄(제품코드가 없으면 막는다)
export function createLabelPrintColumns({ onPrint }: LabelPrintColumnOptions): F1GridColumn<LabelPrintRow>[] {
  return [
    {
      field: 'scheduleId',
      type: 'rownumber',
      width: 56,
      headerName: 'No',
      align: 'center',
      pinned: 'left',
    },
    {
      field: 'productName',
      headerName: '품목명',
      flex: 1.5,
      width: 220,
      align: 'left',
    },
    {
      field: 'spec',
      headerName: '규격단위',
      width: 130,
      align: 'left',
      renderCell: ({ row }) => row.spec || '',
    },
    {
      field: 'orderQty',
      headerName: '생산수량',
      width: 110,
      type: 'number',
      decimalPlaces: 3,
      align: 'right',
      renderCell: ({ row }) => printQtyText(row.orderQty),
    },
    {
      field: 'productCode',
      headerName: '바코드',
      flex: 1,
      width: 200,
      align: 'left',
      renderCell: ({ row }) => (row.productCode ? (
        <Box
          component="span"
          aria-label={`바코드 ${row.productCode}`}
          sx={{ display: 'inline-block', lineHeight: 0 }}
          dangerouslySetInnerHTML={{ __html: barcodeSvgMarkup(row.productCode, { width: 1.4, height: 32, fontSize: 11 }) }}
        />
      ) : (
        <Typography component="span" variant="body2" color="text.disabled">제품코드없음</Typography>
      )),
    },
    {
      field: 'printAction',
      headerName: '',
      width: 110,
      align: 'center',
      pinned: 'right',
      renderCell: ({ row }) => (
        <span title={row.productCode ? undefined : NO_PRODUCT_CODE_MESSAGE}>
          <Button size="small" variant="contained" sx={{ minWidth: 0, px: 1, py: 0 }} disabled={!row.productCode} onClick={() => onPrint(row)}>
            🏷️ 인쇄
          </Button>
        </span>
      ),
    },
  ];
}

type LabelPrintGridProps = {
  rows: LabelPrintRow[];
  columns: F1GridColumn<LabelPrintRow>[];
  loading: boolean;
};

export function LabelPrintGrid({ rows, columns, loading }: LabelPrintGridProps) {
  // 그리드를 그리기 전에 저장된 칸 순서를 맞춘다(처음 한 번)
  useState(() => resetGridStorageIfColumnsChanged(STORAGE_KEY, GRID_FIELDS));

  return (
    <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
      <F1Grid
        rows={rows}
        columns={columns}
        rowKey="scheduleId"
        storageKey="pd-label-print-grid"
        ariaLabel="F1-GRID 라벨출력"
        height="100%"
        maxHeight="100%"
        rowHeight={52}
        minRowHeight={52}
        maxRowHeight={320}
        columnLine
        showCheckbox={false}
        loading={loading}
        resizableRows={false}
        allowAddRowInContextMenu={false}
        allowDuplicateRowInContextMenu={false}
        allowDeleteRowInContextMenu={false}
      />
    </Box>
  );
}

import { useState } from 'react';
import { Box, IconButton, Tooltip } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { F1Grid, type F1GridColumn } from '../../../../../shared/components/f1-grid';
import { resetGridStorageIfColumnsChanged } from '../../../../../shared/utils/gridStorage';
import { formatPrice } from '../../../../../shared/utils/numberFormat';
import type { PricingRow } from '../types/pricing.types';
import { diffOf } from '../utils/pricing';

const STORAGE_KEY = 'sa-pricing-grid';
// 저장된 칸 순서에 지금 칸이 하나라도 없으면 처음 순서로 다시 시작한다
const GRID_FIELDS = [
  'id', 'productCode', 'productName', 'spec', 'materialCost', 'laborCost', 'packagingCost', 'logisticsCost',
  'margin', 'totalPrice', 'currentPrice', 'clientName', 'diff', 'detailAction',
];

// 보기 전용 칸. 원가 항목은 [상세] 칸 연필 → 단가상세 창에서 고친다(제품마스터 · 견적 상세 칸과 같은 모양)
// 거래처 칸은 상세 조회(⌄)에도 나온다(글자 일부로 찾는다). 차액금 조건은 화면이 따로 더한다
export function createPricingColumns(onOpenDetail: (row: PricingRow) => void): F1GridColumn<PricingRow>[] {

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
      field: 'productCode',
      headerName: '제품코드',
      width: 90,
      align: 'center',
      editable: false,
      search: { hidden: true }
    },
    {
      field: 'productName',
      headerName: '제품명',
      flex: 1.4,
      width: 160,
      align: 'left',
      editable: false,
      search: { hidden: true }
    },
    {
      field: 'spec',
      headerName: '규격/단위',
      width: 110,
      headerAlign: 'center',
      align: 'left',
      editable: false,
      getValue: (row) => row.spec || '',
      search: { hidden: true }
    },
    {
      field: 'materialCost',
      headerName: '원재료비',
      type: 'currency',
      decimalPlaces: 4,
      width: 100,
      align: 'right',
      editable: false,
      search: { hidden: true },
    },
    {
      field: 'laborCost',
      headerName: '인건비',
      type: 'currency',
      decimalPlaces: 4,
      width: 100,
      align: 'right',
      editable: false,
      search: { hidden: true },
    },
    {
      field: 'packagingCost',
      headerName: '포장비',
      type: 'currency',
      decimalPlaces: 4,
      width: 100,
      align: 'right',
      editable: false,
      search: { hidden: true },
    },
    {
      field: 'logisticsCost',
      headerName: '물류비',
      type: 'currency',
      decimalPlaces: 4,
      width: 100,
      align: 'right',
      editable: false,
      search: { hidden: true },
    },
    {
      field: 'margin',
      headerName: '마진',
      type: 'currency',
      decimalPlaces: 4,
      width: 100,
      align: 'right',
      editable: false,
      search: { hidden: true },
    },
    {
      field: 'totalPrice',
      headerName: '제품단가',
      type: 'currency',
      decimalPlaces: 4,
      width: 100,
      align: 'right',
      editable: false,
      getCellStyle: () => ({ fontWeight: 700 }),
      search: { hidden: true },
    },
    {
      field: 'currentPrice',
      headerName: '현재단가',
      type: 'currency',
      decimalPlaces: 4,
      width: 100,
      align: 'right',
      editable: false,
      search: { hidden: true },
    },

    {
      field: 'clientName',
      headerName: '거래처',
      flex: 1,
      width: 130,
      align: 'left',
      editable: false,
      getValue: (row) => row.clientName || '',
      search: { label: '거래처', order: 1 },
    },
    {
      field: 'diff',
      headerName: '차액금',
      width: 110,
      type: 'currency',
      decimalPlaces: 4,
      align: 'right',
      editable: false,
      getValue: (row) => diffOf(row) ?? '',
      // 차액금 = 현재단가 − 제품단가: 초과는 파랑, 미달은 빨강
      getCellStyle: ({ row }) => {
        const diff = diffOf(row);
        if (diff == null || diff === 0) return undefined;
        return { color: diff < 0 ? '#dc2626' : '#2563eb', fontWeight: 700 };
      },
      renderCell: ({ row }) => {
        const diff = diffOf(row);
        if (diff == null) return '';
        return diff > 0 ? `+${formatPrice(diff)}` : formatPrice(diff);
      },
      search: { hidden: true },
    },
    {
      // [상세]: 연필을 누르면 단가상세 창
      field: 'detailAction',
      headerName: '상세',
      width: 60,
      headerAlign: 'center',
      align: 'center',
      editable: false,
      pinned: 'right',
      getValue: () => '',
      search: { hidden: true },
      renderCell: ({ row }) => (
        <Box
          onClick={(event) => event.stopPropagation()}
          onDoubleClick={(event) => event.stopPropagation()}
          onMouseDown={(event) => event.stopPropagation()}
        >
          <Tooltip title="단가상세">
            <IconButton size="small" aria-label={`${row.productName} 단가상세`} onClick={() => onOpenDetail(row)}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];
}

type PricingGridProps = {
  rows: PricingRow[];
  columns: F1GridColumn<PricingRow>[];
  loading: boolean;
};

// 엑셀은 제목줄 [엑셀 다운로드](송연 엑셀 칸)로 내려받는다
export function PricingGrid({ rows, columns, loading }: PricingGridProps) {
  // 그리드를 그리기 전에 저장된 칸 순서를 맞춘다(처음 한 번)
  useState(() => resetGridStorageIfColumnsChanged(STORAGE_KEY, GRID_FIELDS));

  return (
    <Box sx={{ flex: 1, minHeight: 0, height: '100%', overflow: 'hidden' }}>
      <F1Grid
        ariaLabel="F1-GRID 단가 목록"
        storageKey="sa-pricing-grid"
        rows={rows}
        columns={columns}
        rowKey="id"
        loading={loading}
        height="100%"
        maxHeight="100%"
        rowHeight={34}
        minRowHeight={34}
        maxRowHeight={320}
        showCheckbox={false}
        allowAddRowInContextMenu={false}
        allowDuplicateRowInContextMenu={false}
        allowDeleteRowInContextMenu={false}
      />
    </Box>
  );
}

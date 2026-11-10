import type { KeyboardEvent } from 'react';
import { Box, Button, Chip } from '@mui/material';
import { F1Grid, type F1GridColumn } from '../../../../../shared/components/f1-grid';
import {
  RECORD_STATUS_TEXT, shipText,
  type InspectionLotRow, type InspectionTrendRow, type ProductSpecRow, type RecordStatus,
} from '../utils/productInspection';

// 제품검사 탭 3개의 표. 2026-11-06 검사 · 제품별 기준은 조회를 붙였고, 염도·BRIX 현황은 서버 연결 전이라 줄이 없다(데이터가 없습니다)

// 세 표 모두 줄 추가 · 삭제 기능이 없다(오른쪽 클릭 [행 추가] · [행 삭제] 없음)
const GRID_PROPS = {
  height: '100%', maxHeight: '100%', rowHeight: 38, minRowHeight: 38, maxRowHeight: 320, columnLine: true,
  resizableRows: false, allowAddRowInContextMenu: false, allowDuplicateRowInContextMenu: false, allowDeleteRowInContextMenu: false,
} as const;

// F1-Grid 는 고른 줄을 Delete 키로 표에서 뺀다. 지우는 기능이 없는 표라 표를 감싼 곳에서 막는다
const blockDeleteKey = (event: KeyboardEvent<HTMLElement>) => {
  if (event.key === 'Delete') {
    event.preventDefault();
    event.stopPropagation();
  }
};

const smallBtn = { minWidth: 0, px: 1, py: 0, fontSize: 12, whiteSpace: 'nowrap' } as const;
const STATUS_COLOR: Record<RecordStatus, 'success' | 'warning' | 'error' | 'default'> = {
  '': 'default', 작성중: 'warning', 검토대기: 'warning', 반려: 'error', 승인: 'success',
};
const statusChip = (status: RecordStatus) => (
  <Chip size="small" color={STATUS_COLOR[status]} variant={status ? 'filled' : 'outlined'} label={RECORD_STATUS_TEXT[status]} sx={{ height: 20, fontSize: 11, fontWeight: 700 }} />
);
const noType = <Box component="span" sx={{ color: 'error.main' }}>유형 없음</Box>;
const rowNumber = <T extends object>(field: keyof T): F1GridColumn<T> => ({ field, type: 'rownumber', width: 56, headerName: 'No', align: 'center', pinned: 'left' });

// 검사 탭
export function createInspectionLotColumns({ onOpen, onPrint }: { onOpen: (row: InspectionLotRow) => void; onPrint: (row: InspectionLotRow) => void }): F1GridColumn<InspectionLotRow>[] {
  return [
    rowNumber<InspectionLotRow>('lotId'),
    { field: 'lotNo', headerName: '로트번호', width: 130, align: 'center' },
    { field: 'madeOn', headerName: '제조일', width: 110, align: 'center' },
    {
      field: 'productName',
      headerName: '품목',
      flex: 1.4,
      width: 220,
      align: 'left',
      // 품목 이름을 누르면 제품 검사 창이 열린다(원본: 이름 옆 ▸ 를 누르면 그 줄 밑이 열림)
      renderCell: ({ row }) => (
        <Button size="small" variant="text" sx={{ ...smallBtn, justifyContent: 'flex-start' }} onClick={() => onOpen(row)}>▸ {row.productName}</Button>
      ),
    },
    { field: 'foodTypeName', headerName: '식품유형', width: 130, align: 'left', renderCell: ({ row }) => (row.foodTypeName ? row.foodTypeName : noType) },
    {
      field: 'qty',
      headerName: '생산량',
      width: 100,
      align: 'right',
      renderCell: ({ row }) => <>{row.qty}{!row.qtyIsActual && <Box component="span" sx={{ color: 'warning.main', fontSize: 11, ml: 0.5 }}>(예정)</Box>}</>,
    },
    { field: 'shippedOn', headerName: '출고일', width: 140, align: 'center', renderCell: ({ row }) => shipText(row.shippedOn, row.shipState) },
    { field: 'recordStatus', headerName: '성적서', width: 110, align: 'center', renderCell: ({ row }) => statusChip(row.recordStatus) },
    {
      field: 'recordId',
      headerName: '',
      width: 80,
      align: 'center',
      renderCell: ({ row }) => (row.recordId ? <Button size="small" variant="outlined" sx={smallBtn} onClick={() => onPrint(row)}>인쇄</Button> : null),
    },
  ];
}

// 제품별 기준 탭
export function createProductSpecColumns({ onOpen }: { onOpen: (row: ProductSpecRow) => void }): F1GridColumn<ProductSpecRow>[] {
  return [
    rowNumber<ProductSpecRow>('rowNo' as keyof ProductSpecRow),
    { field: 'code', headerName: '제품코드', width: 100, align: 'center' },
    { field: 'name', headerName: '제품명', flex: 1.2, width: 260, align: 'left' },
    { field: 'spec', headerName: '규격', width: 130, align: 'left' },
    {
      field: 'foodTypeName',
      headerName: '식품유형',
      width: 165,
      align: 'left',
      // 2026-11-06 원본의 '제품BOM에서 정하세요' 안내는 뺐다(사용자 결정). '유형 없음' 만
      renderCell: ({ row }) => (row.foodTypeName ? row.foodTypeName : noType),
    },
    {
      field: 'specs',
      headerName: '기준',
      flex: 1,
      width: 240,
      align: 'left',
      renderCell: ({ row }) => {
        if (!row.foodTypeName) return null;
        if (!row.specs.length) return <Box component="span" sx={{ color: 'text.secondary' }}>안 넣음</Box>;
        return row.specs.map((s) => `${s.label} 기준 ${s.text}`).join(' · ');
      },
    },
    {
      field: 'action' as keyof ProductSpecRow,
      headerName: '',
      width: 76,
      align: 'center',
      renderCell: ({ row }) => <Button size="small" variant="outlined" sx={smallBtn} onClick={() => onOpen(row)}>넣기</Button>,
    },
  ];
}

// 염도·BRIX 현황 탭
export function createInspectionTrendColumns(): F1GridColumn<InspectionTrendRow>[] {
  return [
    rowNumber<InspectionTrendRow>('recordId'),
    { field: 'measuredOn', headerName: '측정일', width: 100, align: 'center' },
    { field: 'lotNo', headerName: '제조일(로트번호)', width: 190, align: 'center', renderCell: ({ row }) => `${row.madeOn}${row.lotNo ? ` (${row.lotNo})` : ''}` },
    { field: 'productName', headerName: '품목', flex: 1, width: 220, align: 'left' },
    { field: 'saltSpec', headerName: '염도 기준', width: 130, align: 'center' },
    { field: 'saltResult', headerName: '염도 결과', width: 150, align: 'center' },
    { field: 'brixSpec', headerName: 'BRIX 기준', width: 130, align: 'center' },
    { field: 'brixResult', headerName: 'BRIX 결과', width: 150, align: 'center' },
  ];
}

type GridProps<T extends object> = { rows: T[]; columns: F1GridColumn<T>[]; loading: boolean };

export function InspectionLotGrid({ rows, columns, loading, onSelectionChange }: GridProps<InspectionLotRow> & { onSelectionChange: (ids: (string | number)[]) => void }) {
  return (
    <Box sx={{ flex: 1, minHeight: 160 }} onKeyDownCapture={blockDeleteKey}>
      <F1Grid rows={rows} columns={columns} rowKey="lotId" storageKey="qm-product-inspection-lot-grid" ariaLabel="F1-GRID 제품검사 로트" loading={loading} showCheckbox onSelectionChange={onSelectionChange} {...GRID_PROPS} />
    </Box>
  );
}

export function ProductSpecGrid({ rows, columns, loading }: GridProps<ProductSpecRow>) {
  return (
    <Box sx={{ flex: 1, minHeight: 160 }} onKeyDownCapture={blockDeleteKey}>
      <F1Grid rows={rows} columns={columns} rowKey="code" storageKey="qm-product-inspection-spec-grid" ariaLabel="F1-GRID 제품별 기준" loading={loading} showCheckbox={false} {...GRID_PROPS} />
    </Box>
  );
}

export function InspectionTrendGrid({ rows, columns, loading }: GridProps<InspectionTrendRow>) {
  return (
    <Box sx={{ flex: 1, minHeight: 160 }} onKeyDownCapture={blockDeleteKey}>
      <F1Grid rows={rows} columns={columns} rowKey="recordId" storageKey="qm-product-inspection-trend-grid" ariaLabel="F1-GRID 염도·BRIX 현황" loading={loading} showCheckbox={false} {...GRID_PROPS} />
    </Box>
  );
}

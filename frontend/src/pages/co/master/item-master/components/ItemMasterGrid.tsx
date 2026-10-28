import { useState, type RefObject } from 'react';
import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import HistoryIcon from '@mui/icons-material/History';
import {
  F1Grid,
  type F1GridChanges,
  type F1GridColumn,
  type F1GridOption,
  type F1GridRef,
} from '../../../../../shared/components/f1-grid';
import { resetGridStorageIfColumnsChanged } from '../../../../../shared/utils/gridStorage';
import type { ItemMasterRow } from '../utils/itemMaster';

const STORAGE_KEY = 'cm-basic-info-product-bom-grid';
// 2026-10-27 숨긴 단추 칸(상세보기 · 수정 · 변경로그)을 빼고 수정일시 뒤에 [이력] · [상세] 칸을 더했다.
// 저장된 칸 순서에 지금 칸이 하나라도 없으면 처음 순서로 다시 시작한다(예전 저장값은 모두 처음으로 돌아간다)
const GRID_FIELDS = [
  'id',
  'code',
  'name',
  'spec',
  'clientName',
  'storage',
  'materialCount',
  'lastProducedDate',
  'useYn',
  'regUserNm',
  'regDt',
  'updUserNm',
  'updDt',
  'historyAction',
  'detailAction',
];

// 사용여부만 표에서 고친다. 제품 내용(배합비 · 부자재)은 [상세] 칸 연필 → 제품BOM 창(단가관리 상세 칸과 같은 모양)
export function createItemMasterColumns(
  canEdit: boolean,
  onOpenDetail: (product: ItemMasterRow) => void,
  storageOptions: F1GridOption[] = [],
  onOpenHistory: (product: ItemMasterRow) => void = () => undefined,
): F1GridColumn<ItemMasterRow>[] {
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
      field: 'code',
      search: { hidden: true },
      headerName: '제품코드',
      width: 70,
      align: 'center',
      editable: false,
      pinned: 'left',
    },
    {
      field: 'name',
      search: { hidden: true },
      headerName: '제품명',
      flex: 1.4,
      width: 200,
      align: 'left',
      editable: false,
      pinned: 'left'
    },
    {
      field: 'spec',
      search: { hidden: true },
      headerName: '규격/단위',
      width: 80,
      align: 'center',
      editable: false
    },
    {
      field: 'clientName',
      headerName: '업체명',
      flex: 1,
      width: 140,
      align: 'left',
      editable: false,
      search: { label: '업체명', order: 1 },
    },
    {
      // 보관방법: 저장은 공통코드 STORAGE_METHOD 코드, 보이는 것은 이름. 고르기(select)라 상세 조회 칸도 고르기가 된다
      field: 'storage',
      headerName: '보관방법',
      type: 'select',
      options: storageOptions,
      width: 110,
      align: 'center',
      editable: false,
      search: { label: '보관방법', order: 2 },
      getValue: (row) => row.storageNm || row.storage,
    },
    {
      field: 'materialCount',
      search: { hidden: true },
      headerName: '원재료 수',
      width: 80,
      type: 'currency',
      align: 'right',
      editable: false
    },
    {
      field: 'lastProducedDate',
      search: { hidden: true },
      headerName: '마지막생산일',
      width: 120,
      align: 'center',
      editable: false,
      renderCell: ({ row }) =>
        row.lastProducedDate || (
          <Typography component="span" variant="body2" color="text.disabled">생산이력없음</Typography>
        ),
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
      // 2026-10-27 [이력]: 배합비 변경로그(예전 제품BOM 창의 변경로그 탭, 원재료마스터 이력 칸과 같음)
      field: 'historyAction',
      search: { hidden: true },
      headerName: '이력',
      width: 60,
      headerAlign: 'center',
      align: 'center',
      editable: false,
      pinned: 'right',
      getValue: () => '',
      renderCell: ({ row }) => (
        <Box
          onClick={(event) => event.stopPropagation()}
          onDoubleClick={(event) => event.stopPropagation()}
          onMouseDown={(event) => event.stopPropagation()}
        >
          <Tooltip title="배합비 이력">
            <IconButton size="small" aria-label={`${row.name} 배합비 이력`} onClick={() => onOpenHistory(row)}>
              <HistoryIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
    {
      // 2026-10-27 [상세]: 연필을 누르면 제품BOM 창(상세보기 탭, 창 안에서 수정 탭으로 옮긴다)
      field: 'detailAction',
      search: { hidden: true },
      headerName: '상세',
      width: 60,
      headerAlign: 'center',
      align: 'center',
      editable: false,
      pinned: 'right',
      getValue: () => '',
      renderCell: ({ row }) => (
        <Box
          onClick={(event) => event.stopPropagation()}
          onDoubleClick={(event) => event.stopPropagation()}
          onMouseDown={(event) => event.stopPropagation()}
        >
          <Tooltip title="제품마스터">
            <IconButton size="small" aria-label={`${row.name} 제품마스터`} onClick={() => onOpenDetail(row)}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];
}

type ItemMasterGridProps = {
  rows: ItemMasterRow[];
  columns: F1GridColumn<ItemMasterRow>[];
  canExportExcel: boolean;
  loading: boolean;
  gridKey: number;
  gridRef: RefObject<F1GridRef<ItemMasterRow> | null>;
  onChangesChange: (changes: F1GridChanges<ItemMasterRow>) => void;
};

export function ItemMasterGrid({
  rows,
  columns,
  canExportExcel,
  loading,
  gridKey,
  gridRef,
  onChangesChange,
}: ItemMasterGridProps) {
  // 그리드를 그리기 전에 저장된 칸 순서를 맞춘다(처음 한 번)
  useState(() => resetGridStorageIfColumnsChanged(STORAGE_KEY, GRID_FIELDS));

  return (
    <Box sx={{ flex: 1, minHeight: 0, height: '100%', overflow: 'hidden' }}>
      <F1Grid
        key={gridKey}
        ref={gridRef}
        ariaLabel="F1-GRID 제품마스터"
        storageKey="cm-basic-info-product-bom-grid"
        rows={rows}
        columns={columns}
        rowKey="id"
        onChangesChange={onChangesChange}
        loading={loading}
        height="100%"
        maxHeight="100%"
        rowHeight={34}
        minRowHeight={34}
        maxRowHeight={320}
        showCheckbox={false}
        canExportExcel={canExportExcel}
        excelFileName="제품마스터"
        allowAddRowInContextMenu={false}
        allowDuplicateRowInContextMenu={false}
        allowDeleteRowInContextMenu={false}
      />
    </Box>
  );
}

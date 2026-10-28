import { useState } from 'react';
import { Box, IconButton, Tooltip } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import HistoryIcon from '@mui/icons-material/History';
import { F1Grid, type F1GridColumn } from '../../../../../shared/components/f1-grid';
import { resetGridStorageIfColumnsChanged } from '../../../../../shared/utils/gridStorage';
import type { PartnerItemRow } from '../types/partnerItem.types';

const STORAGE_KEY = 'cm-basic-info-client-product-grid';
// 2026-10-27 이름 없는 [상세보기] 단추 칸을 빼고 맨 뒤에 [이력] · [상세] 칸을 더했다(제품마스터와 같은 모양).
// 저장된 칸 순서에 지금 칸이 하나라도 없으면 처음 순서로 다시 시작한다
const GRID_FIELDS = ['id', 'code', 'name', 'spec', 'clientName', 'historyAction', 'detailAction'];

// 보기 전용. 제품 내용은 [상세] 칸 연필 → 제품BOM 창, 배합비 변경로그는 [이력] 칸(제품마스터와 같이 쓴다)
export function createPartnerItemColumns(
  onOpenDetail: (product: PartnerItemRow) => void,
  onOpenHistory: (product: PartnerItemRow) => void,
): F1GridColumn<PartnerItemRow>[] {
  return [
    {
      field: 'id',
      headerName: 'No',
      type: 'rownumber',
      width: 56,
      align: 'center',
      pinned: 'left',
    },
    { field: 'code', headerName: '제품코드', width: 110, headerAlign: 'center', align: 'center', editable: false },
    { field: 'name', headerName: '품목명', flex: 1.4, headerAlign: 'center', align: 'left', editable: false },
    {
      field: 'spec',
      headerName: '규격/단위',
      width: 130,
      headerAlign: 'center',
      align: 'center',
      editable: false,
      getValue: (row) => row.spec || '',
    },
    { field: 'clientName', headerName: '거래처명', flex: 1, headerAlign: 'center', align: 'left', editable: false },
    {
      // 2026-10-27 [이력]: 배합비 변경로그(예전 제품BOM 창의 변경로그 탭, 원재료마스터 이력 칸과 같음)
      field: 'historyAction',
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
      // [상세]: 연필을 누르면 제품BOM 창(상세보기 탭)
      field: 'detailAction',
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
          <Tooltip title="제품BOM">
            <IconButton size="small" aria-label={`${row.name} 제품BOM`} onClick={() => onOpenDetail(row)}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];
}

type PartnerItemGridProps = {
  rows: PartnerItemRow[];
  columns: F1GridColumn<PartnerItemRow>[];
  canExportExcel: boolean;
  loading: boolean;
  gridKey: number;
};

export function PartnerItemGrid({ rows, columns, canExportExcel, loading, gridKey }: PartnerItemGridProps) {
  // 그리드를 그리기 전에 저장된 칸 순서를 맞춘다(처음 한 번)
  useState(() => resetGridStorageIfColumnsChanged(STORAGE_KEY, GRID_FIELDS));

  return (
    <Box sx={{ flex: 1, minHeight: 0, height: '100%', overflow: 'hidden' }}>
      <F1Grid
        key={gridKey}
        ariaLabel="F1-GRID 거래처별 제품"
        storageKey="cm-basic-info-client-product-grid"
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
        canExportExcel={canExportExcel}
        excelFileName="거래처별제품"
        allowAddRowInContextMenu={false}
        allowDuplicateRowInContextMenu={false}
        allowDeleteRowInContextMenu={false}
      />
    </Box>
  );
}

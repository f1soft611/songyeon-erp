import { useState } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { F1Grid, type F1GridColumn } from '../../../../../shared/components/f1-grid';
import { resetGridStorageIfColumnsChanged } from '../../../../../shared/utils/gridStorage';
import type { DocRow, DocTarget } from '../types/receiving.types';
import { formatQty } from '../utils/receiving';

const STORAGE_KEY = 'pu-recv-doc-grid';
// 2026-11-02 [상세보기] 단추 칸을 rowAction 으로 바꿨다. 저장된 칸 순서에 지금 칸이 없으면 처음 순서로
const GRID_FIELDS = ['key', 'materialName', 'entryCount', 'totalQty', 'fileCount', 'rowAction'];

type ReceivingDocColumnOptions = {
  onUpload: (target: DocTarget) => void;
  onView: (target: DocTarget) => void;
  onDetail: (target: DocTarget) => void;
};

// 서류등록 칸: 품목별로 서류 등록 · 보기 창과 입고 상세 창을 연다
export function createReceivingDocColumns({ onUpload, onView, onDetail }: ReceivingDocColumnOptions): F1GridColumn<DocRow>[] {
  return [
    {
      field: 'key',
      type: 'rownumber',
      width: 56,
      headerName: 'No',
      align: 'center',
      pinned: 'left',
    },
    {
      field: 'materialName',
      headerName: '원재료',
      flex: 1.4,
      width: 220,
      align: 'left',
    },
    {
      field: 'entryCount',
      headerName: '입고건수',
      width: 100,
      headerAlign: 'center',
      align: 'right',
    },
    {
      field: 'totalQty',
      headerName: '총 입고수량',
      width: 130,
      headerAlign: 'center',
      align: 'right',
      renderCell: ({ row }) => formatQty(row.totalQty),
      getCellStyle: () => ({ fontWeight: 700 }),
    },
    {
      field: 'fileCount',
      headerName: '서류',
      width: 260,
      align: 'left',
      renderCell: ({ row }) => {
        const target = { code: row.materialCode, name: row.materialName || '' };
        return (
          <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center', whiteSpace: 'nowrap' }}>
            <Button size="small" variant="outlined" sx={{ minWidth: 0, px: 1, py: 0, fontSize: 11.5 }} onClick={() => onUpload(target)}>📎 서류등록</Button>
            {row.fileCount
              ? <Button size="small" variant="outlined" sx={{ minWidth: 0, px: 1, py: 0, fontSize: 11.5 }} onClick={() => onView(target)}>📄 서류보기 ({row.fileCount})</Button>
              : <Typography component="span" variant="body2" color="text.secondary">아직 없음</Typography>}
          </Box>
        );
      },
    },
    {
      field: 'rowAction',
      headerName: '',
      width: 100,
      align: 'center',
      pinned: 'right',
      renderCell: ({ row }) => (
        <Button
          size="small"
          variant="outlined"
          sx={{ minWidth: 0, px: 1, py: 0 }}
          onClick={() => onDetail({ code: row.materialCode, name: row.materialName || '' })}
        >
          상세보기
        </Button>
      ),
    },
  ];
}

type ReceivingDocGridProps = {
  rows: DocRow[];
  columns: F1GridColumn<DocRow>[];
  loading: boolean;
};

export function ReceivingDocGrid({ rows, columns, loading }: ReceivingDocGridProps) {
  // 그리드를 그리기 전에 저장된 칸 순서를 맞춘다(처음 한 번)
  useState(() => resetGridStorageIfColumnsChanged(STORAGE_KEY, GRID_FIELDS));

  return (
    <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
      <F1Grid
        key="doc"
        rows={rows}
        columns={columns}
        rowKey="key"
        storageKey="pu-recv-doc-grid"
        ariaLabel="F1-GRID 서류등록"
        loading={loading}
        height="100%"
        maxHeight="100%"
        rowHeight={34}
        minRowHeight={34}
        maxRowHeight={320}
        columnLine
        showCheckbox={false}
        resizableRows={false}
        allowAddRowInContextMenu={false}
        allowDuplicateRowInContextMenu={false}
        allowDeleteRowInContextMenu={false}
      />
    </Box>
  );
}

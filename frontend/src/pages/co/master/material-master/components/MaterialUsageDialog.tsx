import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import {
  F1Grid,
  type F1GridColumn,
} from '../../../../../shared/components/f1-grid';
import type { MaterialUsageRow } from '../types/materialMaster.types';
import { fetchMaterialUsage } from '../services/materialMaster.service';

// 이 원재료를 쓰는 제품 표의 칸(역전개·일괄적용이 같이 쓴다)
export const usageColumns = (): F1GridColumn<MaterialUsageRow>[] => [
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
    width: 100,
    align: 'center'
  },
  {
    field: 'productName',
    headerName: '품목명',
    flex: 1.4,
    align: 'left'
  },
  {
    field: 'productSpec',
    headerName: '규격',
    width: 110,
    align: 'center',
    getValue: (row) => row.productSpec || ''
  },
  {
    field: 'ratio',
    headerName: '배합비율',
    type: 'decimal',
    decimalPlaces: 4,
    width: 110,
    align: 'right',
  },
];

// 배합비 역전개 창(송연 CM0001Tab08UsageModal): 이 원재료가 배합비로 쓰인 제품(배합비율 높은 순)
export function MaterialUsageDialog({ code, name, onClose }: { code: string; name: string; onClose: () => void }) {
  const [rows, setRows] = useState<MaterialUsageRow[]>([]);
  useEffect(() => {
    fetchMaterialUsage(code).then(setRows).catch(() => undefined);
  }, [code]);
  const columns = useMemo(usageColumns, []);
  const title = `배합비 역전개 — ${name}`;

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth aria-labelledby="material-usage-title">
      <DialogTitle id="material-usage-title" sx={{ pr: 6 }}>
        {title}
        <IconButton aria-label="닫기" onClick={onClose} sx={{ position: 'absolute', right: 12, top: 12 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          이 원재료가 배합비로 사용된 제품 목록이에요 (배합비율 높은 순).
        </Typography>
        {rows.length === 0 && (
          <Typography role="status" variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            이 원재료를 사용하는 제품이 없습니다
          </Typography>
        )}
        <Box sx={{ height: 320 }}>
          <F1Grid
            rows={rows}
            columns={columns}
            rowKey="id"
            storageKey="cm-basic-info-material-usage-grid"
            ariaLabel="F1-GRID 배합비 역전개"
            height="100%"
            maxHeight="100%"
            rowHeight={32}
            showCheckbox={false}
            allowAddRowInContextMenu={false}
            allowDuplicateRowInContextMenu={false}
            allowDeleteRowInContextMenu={false}
          />
        </Box>
      </DialogContent>
    </Dialog>
  );
}

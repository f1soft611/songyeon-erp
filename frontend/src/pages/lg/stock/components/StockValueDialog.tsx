import { useMemo, useState } from 'react';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { F1Grid, type F1GridColumn } from '../../../../shared/components/f1-grid';
import { todayDash } from '../../../../shared/utils/excelFile';
import { fetchStockAsOf } from '../services/productStock.service';
import { formatPrice, formatQty, stockedOnly, type StockAsOfRow } from '../utils/productStock';

const errorText = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

// 재고금액 조회 (송연 LG0001ValueModal, 기존 #pstock-value-overlay).
// 그 날짜 기준으로 남아 있었을 제품 재고금액을 원재료비로만 계산한다. 날짜는 오늘로 채워 두고, 조회를 눌러야 부른다.
export function StockValueDialog({ open, onClose, onAlert }: { open: boolean; onClose: () => void; onAlert: (message: string) => void }) {
  const [date, setDate] = useState(() => todayDash());
  const [total, setTotal] = useState<number | null>(null);
  const [rows, setRows] = useState<StockAsOfRow[] | null>(null);
  const [loading, setLoading] = useState(false);

  const search = async () => {
    if (!date) {
      onAlert('날짜를 선택해주세요');
      return;
    }
    setLoading(true);
    try {
      const data = await fetchStockAsOf(date);
      setTotal(data.totalAmount);
      setRows(stockedOnly(data.products));
    } catch (requestError) {
      onAlert(errorText(requestError, '재고 조회에 실패했어요'));
    } finally {
      setLoading(false);
    }
  };

  const columns = useMemo<F1GridColumn<StockAsOfRow>[]>(() => [
    { field: 'code', type: 'rownumber', width: 60, headerName: '순번', headerAlign: 'center', align: 'center', pinned: 'left' },
    { field: 'name', headerName: '품목명', width: 170, headerAlign: 'center', align: 'left' },
    { field: 'spec', headerName: '규격', width: 100, headerAlign: 'center', align: 'left', renderCell: ({ row }) => row.spec || '' },
    { field: 'stockQty', headerName: '재고수량', width: 100, headerAlign: 'center', align: 'right', renderCell: ({ row }) => formatQty(row.stockQty) },
    {
      field: 'materialCost', headerName: '원재료비(단위당)', width: 120, headerAlign: 'center', align: 'right',
      renderCell: ({ row }) => (row.materialCost != null ? formatPrice(row.materialCost) : ''),
    },
    {
      field: 'amount', headerName: '재고금액', width: 130, headerAlign: 'center', align: 'right',
      renderCell: ({ row }) => (row.amount != null ? formatPrice(row.amount) : ''), getCellStyle: () => ({ fontWeight: 700 }),
    },
  ], []);

  return (
    <Dialog open={open} onClose={onClose} maxWidth={false} slotProps={{ paper: { sx: { width: 'min(760px, 96vw)' } } }} aria-labelledby="stock-value-title">
      <DialogTitle id="stock-value-title" sx={{ fontSize: 16, fontWeight: 700 }}>재고금액 조회 (원재료비 기준)</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          날짜를 지정하면 그 날짜 기준으로 남아있었을 제품 재고금액을 원재료비로만 계산해서 보여줘요.
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1.5 }}>
          <TextField
            type="date" size="small" margin="none" value={date} onChange={(event) => setDate(event.target.value)}
            slotProps={{ htmlInput: { 'aria-label': '재고금액 기준일' } }} sx={{ width: 180 }}
            onKeyDown={(event) => { if (event.key === 'Enter') void search(); }}
          />
          <Button variant="contained" startIcon={<SearchIcon />} disabled={loading} onClick={() => void search()}>조회</Button>
        </Box>
        <Box
          aria-label="총 재고금액"
          sx={{ mb: 1.25, px: 1.75, py: 1.25, borderRadius: 1, bgcolor: 'rgba(22, 163, 74, 0.1)', color: 'success.dark', fontSize: 15, fontWeight: 800, textAlign: 'right' }}
        >
          총 재고금액: {total === null ? '-' : formatPrice(total)}원
        </Box>
        {rows?.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>이 날짜에 재고가 있는 품목이 없습니다</Typography>
        )}
        <Box sx={{ height: 320 }}>
          <F1Grid
            rows={rows ?? []}
            columns={columns}
            rowKey="code"
            storageKey="lg-stock-value-grid"
            ariaLabel="F1-GRID 재고금액"
            height="100%"
            maxHeight="100%"
            rowHeight={34}
            minRowHeight={34}
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
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>닫기</Button>
      </DialogActions>
    </Dialog>
  );
}

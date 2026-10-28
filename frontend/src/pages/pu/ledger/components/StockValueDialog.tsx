import { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography } from '@mui/material';
import { F1Grid, type F1GridColumn } from '../../../../shared/components/f1-grid';
import { todayDash } from '../../../../shared/utils/excelFile';
import { fetchStockAsOf } from '../services/stockLedger.service';
import { formatMoney, formatQty, type StockAsOf, type StockAsOfRow } from '../utils/stockLedger';

const errorText = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

// 재고금액 조회 창 (송연 #purchase-stock-value-overlay). 날짜를 지정하면 그 날짜 기준으로 남아있었을 원재료 재고금액을 계산한다.
export function StockValueDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [date, setDate] = useState(() => todayDash());
  const [data, setData] = useState<StockAsOf | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDate(todayDash());
    setData(null);
    setError('');
  }, [open]);

  const search = async () => {
    if (!date) {
      setError('날짜를 선택해주세요');
      return;
    }
    setLoading(true);
    setError('');
    try {
      setData(await fetchStockAsOf(date));
    } catch (requestError) {
      setError(errorText(requestError, '재고 조회에 실패했어요'));
    } finally {
      setLoading(false);
    }
  };

  // 재고가 있는 원재료만
  const rows = useMemo(() => (data?.materials ?? []).filter((m) => m.stockQty), [data]);
  const columns = useMemo<F1GridColumn<StockAsOfRow>[]>(() => [
    { field: 'code', type: 'rownumber', width: 56, headerName: '순번', headerAlign: 'center', align: 'center', pinned: 'left' },
    { field: 'name', headerName: '원재료명', flex: 1.4, width: 200, headerAlign: 'center', align: 'left' },
    { field: 'spec', headerName: '규격', width: 120, headerAlign: 'center', align: 'left', renderCell: ({ row }) => row.spec || '' },
    { field: 'stockQty', headerName: '재고수량', width: 110, headerAlign: 'center', align: 'right', renderCell: ({ row }) => formatQty(row.stockQty) },
    { field: 'unitPrice', headerName: '단가', width: 100, headerAlign: 'center', align: 'right', renderCell: ({ row }) => (row.unitPrice != null ? formatMoney(row.unitPrice) : '') },
    {
      field: 'amount', headerName: '재고금액', width: 130, headerAlign: 'center', align: 'right',
      renderCell: ({ row }) => (row.amount != null ? formatMoney(row.amount) : ''), getCellStyle: () => ({ fontWeight: 700 }),
    },
  ], []);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth aria-labelledby="ledger-stock-value-title">
      <DialogTitle id="ledger-stock-value-title" sx={{ fontSize: 16, fontWeight: 700 }}>재고금액 조회</DialogTitle>
      <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
        <Typography variant="body2" color="text.secondary">날짜를 지정하면 그 날짜 기준으로 남아있었을 원재료 재고금액을 계산해서 보여줘요.</Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <TextField type="date" size="small" margin="none" value={date} onChange={(event) => setDate(event.target.value)}
            slotProps={{ htmlInput: { 'aria-label': '재고금액 기준일' } }} sx={{ width: 180 }} />
          <Button variant="contained" disabled={loading} onClick={() => void search()}>조회</Button>
          <Typography sx={{ ml: 'auto', fontWeight: 700 }} aria-label="총 재고금액">
            총 재고금액: {data ? formatMoney(data.totalAmount) : '-'}원
          </Typography>
        </Box>
        {error && <Alert severity="error">{error}</Alert>}
        {data && rows.length === 0 && <Typography variant="body2" color="text.secondary">이 날짜에 재고가 있는 원재료가 없습니다</Typography>}
        <Box sx={{ height: 360 }}>
          <F1Grid rows={rows} columns={columns} rowKey="code" storageKey="pu-ledger-stock-value-grid" ariaLabel="F1-GRID 재고금액"
            height="100%" maxHeight="100%" rowHeight={34} minRowHeight={34} maxRowHeight={320} columnLine showCheckbox={false} loading={loading}
            resizableRows={false} allowAddRowInContextMenu={false} allowDuplicateRowInContextMenu={false} allowDeleteRowInContextMenu={false} />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>닫기</Button>
      </DialogActions>
    </Dialog>
  );
}

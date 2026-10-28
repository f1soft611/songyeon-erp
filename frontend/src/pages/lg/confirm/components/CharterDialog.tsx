import { useMemo, useState } from 'react';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { F1Grid, type F1GridColumn } from '../../../../shared/components/f1-grid';
import { todayDash } from '../../../../shared/utils/excelFile';
import { fetchCharterSummary } from '../services/shipConfirm.service';
import { formatPrice, type CharterRow } from '../utils/shipConfirm';

const errorText = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

type CharterGridRow = CharterRow & { key: number };

// 💰 용차 금액 확인 (송연 LG0002CharterModal, 기존 #shipc-charter-overlay). 기간은 오늘~오늘로 채워 두고 조회를 눌러야 부른다.
export function CharterDialog({ open, onClose, onAlert }: { open: boolean; onClose: () => void; onAlert: (message: string) => void }) {
  const [start, setStart] = useState(() => todayDash());
  const [end, setEnd] = useState(() => todayDash());
  const [total, setTotal] = useState<number | null>(null);
  const [rows, setRows] = useState<CharterGridRow[] | null>(null);
  const [loading, setLoading] = useState(false);

  const search = async () => {
    if (!start || !end) {
      onAlert('조회 기간을 선택해주세요');
      return;
    }
    setLoading(true);
    try {
      const data = await fetchCharterSummary(start, end);
      setTotal(data.totalAmount);
      setRows((data.rows || []).map((row, index) => ({ ...row, key: index + 1 })));
    } catch (requestError) {
      onAlert(errorText(requestError, '조회에 실패했어요'));
    } finally {
      setLoading(false);
    }
  };

  const columns = useMemo<F1GridColumn<CharterGridRow>[]>(() => [
    { field: 'key', type: 'rownumber', width: 60, headerName: '순번', headerAlign: 'center', align: 'center', pinned: 'left' },
    { field: 'scheduleDate', headerName: '일자', width: 120, headerAlign: 'center', align: 'center' },
    { field: 'charterInfo', headerName: '용차정보', width: 200, headerAlign: 'center', align: 'left', renderCell: ({ row }) => row.charterInfo || '' },
    {
      field: 'charterAmount', headerName: '용차금액', width: 130, headerAlign: 'center', align: 'right',
      renderCell: ({ row }) => (row.charterAmount != null ? formatPrice(row.charterAmount) : ''), getCellStyle: () => ({ fontWeight: 700 }),
    },
  ], []);

  return (
    <Dialog open={open} onClose={onClose} maxWidth={false} slotProps={{ paper: { sx: { width: 'min(600px, 96vw)' } } }} aria-labelledby="charter-title">
      <DialogTitle id="charter-title" sx={{ fontSize: 16, fontWeight: 700 }}>용차 금액 확인</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          기간을 지정하면 그 기간 동안 확정된 출하건 중 용차 사용 내역과 합계금액을 보여줘요.
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1.5, flexWrap: 'wrap' }}>
          <TextField type="date" size="small" margin="none" value={start} onChange={(event) => setStart(event.target.value)}
            slotProps={{ htmlInput: { 'aria-label': '용차 시작일' } }} sx={{ width: 170 }} />
          <Typography color="text.secondary">~</Typography>
          <TextField type="date" size="small" margin="none" value={end} onChange={(event) => setEnd(event.target.value)}
            slotProps={{ htmlInput: { 'aria-label': '용차 종료일' } }} sx={{ width: 170 }} />
          <Button variant="contained" startIcon={<SearchIcon />} disabled={loading} onClick={() => void search()}>조회</Button>
        </Box>
        <Box
          aria-label="용차 합계금액"
          sx={{ mb: 1.25, px: 1.75, py: 1.25, borderRadius: 1, bgcolor: 'rgba(22, 163, 74, 0.1)', color: 'success.dark', fontSize: 15, fontWeight: 800, textAlign: 'right' }}
        >
          용차 합계금액: {total === null ? '-' : formatPrice(total)}원
        </Box>
        {rows?.length === 0 && <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>이 기간에 용차 사용 내역이 없습니다</Typography>}
        <Box sx={{ height: 280 }}>
          <F1Grid
            rows={rows ?? []}
            columns={columns}
            rowKey="key"
            storageKey="lg-ship-charter-grid"
            ariaLabel="F1-GRID 용차 사용 내역"
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

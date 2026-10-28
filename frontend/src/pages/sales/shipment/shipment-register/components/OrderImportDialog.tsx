import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { F1Grid, type F1GridColumn } from '../../../../shared/components/f1-grid';
import type { PendingOrder } from '../utils/shipment';

// 수주등록 가져오기 창(송연 SA0005OrderImportModal)
// 물류출고일 기간의 아직 안 가져간 수주를 출하등록 줄로 담는다(저장은 줄마다 따로).
// 창을 열면 바로 조회하고, 기간이 비어 있으면 서버에 묻지 않는다.
export function OrderImportDialog({
  start,
  end,
  setStart,
  setEnd,
  load,
  onPull,
  onClose,
  onAlert,
}: {
  start: string;
  end: string;
  setStart: (value: string) => void;
  setEnd: (value: string) => void;
  load: (start: string, end: string) => Promise<PendingOrder[]>;
  onPull: (orders: PendingOrder[]) => void;
  onClose: () => void;
  onAlert: (message: string) => void;
}) {
  const [rows, setRows] = useState<PendingOrder[]>([]);
  const [searched, setSearched] = useState({ start, end });
  const [pulled, setPulled] = useState<number[]>([]);
  const [allPulled, setAllPulled] = useState(false);
  const latest = useRef(0);

  const run = useCallback(async (from: string, to: string) => {
    const request = ++latest.current;
    setPulled([]);
    setAllPulled(false);
    setSearched({ start: from, end: to });
    let result: PendingOrder[] = [];
    if (from && to) {
      try {
        result = await load(from, to);
      } catch {
        // 송연 화면도 조회 실패를 따로 알리지 않았다
      }
    }
    if (request === latest.current) setRows(result);
  }, [load]);

  // 창을 열 때 한 번(그때의 기간으로)
  const opened = useRef({ start, end });
  useEffect(() => {
    void run(opened.current.start, opened.current.end);
  }, [run]);

  const pullAll = () => {
    if (rows.length === 0) {
      onAlert('가져올 수주내역이 없어요');
      return;
    }
    onPull(rows);
    setRows([]);
    setAllPulled(true);
  };

  const hasRange = Boolean(searched.start && searched.end);
  const emptyText = allPulled
    ? '전체 가져오기 완료 — 담은 항목은 저장 버튼을 눌러야 실제 등록돼요'
    : hasRange ? '이 기간에 가져올 수주내역이 없습니다 — 물류출고일을 안 정한 건은 여기 안 나와요' : '조회 기간을 선택해주세요';

  const columns = useMemo<F1GridColumn<PendingOrder>[]>(() => [
    { field: 'id', type: 'rownumber', width: 56, headerName: '순번', headerAlign: 'center', align: 'center', pinned: 'left' },
    { field: 'logisticsDate', headerName: '물류출고일', width: 110, headerAlign: 'center', align: 'center', getValue: (row) => row.logisticsDate || '' },
    { field: 'clientName', headerName: '거래처', flex: 1, width: 140, headerAlign: 'center', align: 'left' },
    { field: 'productName', headerName: '품목명(규격)', flex: 1.4, width: 180, headerAlign: 'center', align: 'left' },
    { field: 'orderQty', headerName: '수량', type: 'number', decimalPlaces: 2, headerAlign: 'center', align: 'right' },
    {
      // 늘어나는 칸이 세로 스크롤바 자리까지 넓어져도 단추가 가려지지 않게 오른쪽에 고정
      field: 'note', headerName: '가져오기', width: 100, headerAlign: 'center', align: 'center', pinned: 'right',
      renderCell: ({ row }) => {
        const done = pulled.includes(row.id);
        return (
          <Button size="small" variant="outlined" disabled={done} sx={{ minWidth: 0, px: 1, py: 0 }}
            onClick={() => { onPull([row]); setPulled((previous) => [...previous, row.id]); }}>
            {done ? '가져옴' : '가져오기'}
          </Button>
        );
      },
    },
  ], [pulled, onPull]);

  const dateSx = { width: { xs: '100%', sm: 170 } };

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth aria-labelledby="order-import-title">
      <DialogTitle id="order-import-title" sx={{ pr: 6 }}>
        수주등록 가져오기
        <IconButton aria-label="닫기" onClick={onClose} sx={{ position: 'absolute', right: 12, top: 12 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          물류출고일 기준으로 수주등록된 건을 조회해서 가져와요. 생산확정을 거치지 않아도 바로 출하등록에 담을 수 있어요.<br />
          <b>수주등록에서 물류출고일을 안 정한 건은 여기 안 나와요.</b> 나갈 날이 정해진 게 아니라 재고로 두는 물량인 경우가 많아서예요.
          실제로 나갈 때 <b>출하 추가</b> 로 직접 넣어주세요.
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 1.5, alignItems: { sm: 'center' } }}>
          <TextField type="date" size="small" margin="none" value={start} onChange={(event) => setStart(event.target.value)}
            slotProps={{ htmlInput: { 'aria-label': '조회 시작일' } }} sx={dateSx} />
          <Typography sx={{ display: { xs: 'none', sm: 'block' } }}>~</Typography>
          <TextField type="date" size="small" margin="none" value={end} onChange={(event) => setEnd(event.target.value)}
            slotProps={{ htmlInput: { 'aria-label': '조회 종료일' } }} sx={dateSx} />
          <Button variant="contained" onClick={() => void run(start, end)}>조회</Button>
          <Button variant="outlined" onClick={pullAll}>전체 가져오기</Button>
        </Stack>
        {rows.length === 0 && <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{emptyText}</Typography>}
        <Box sx={{ height: 360 }}>
          <F1Grid
            rows={rows}
            columns={columns}
            rowKey="id"
            storageKey="sa-shipment-import-grid"
            ariaLabel="F1-GRID 가져올 수주"
            height="100%"
            maxHeight="100%"
            rowHeight={34}
            showCheckbox={false}
            resizableRows={false}
            allowAddRowInContextMenu={false}
            allowDuplicateRowInContextMenu={false}
            allowDeleteRowInContextMenu={false}
          />
        </Box>
      </DialogContent>
    </Dialog>
  );
}

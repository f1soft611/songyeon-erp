import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
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
import { fetchImportOrders } from '../services/productionConfirm.service';
import { importRange, type PendingOrder } from '../utils/productionConfirm';

const rowButton = { minWidth: 0, px: 1, py: 0 };

// 수주등록 가져오기 창(송연 PD0001ImportModal): 생산예정일로 수주를 찾아 생산확정 목록에 담는다
// (담기만 하고, 목록에서 '확정' 을 눌러야 실제 등록된다). 기본 기간은 대상 날짜의 3일 전 ~ 7일 뒤.
// 이미 담은 수주(확정 전이라도)는 다시 가져오지 못하게 뺀다.
export function ProductionImportDialog({
  targetDate,
  alreadyPulled,
  onPull,
  onGotoOrder,
  onAlert,
  onClose,
}: {
  targetDate: string;
  alreadyPulled: number[];
  onPull: (orders: PendingOrder[]) => void;
  onGotoOrder: (order: PendingOrder) => void;
  onAlert: (message: string) => void;
  onClose: () => void;
}) {
  const initial = importRange(targetDate);
  const [start, setStart] = useState(initial.start);
  const [end, setEnd] = useState(initial.end);
  const [rows, setRows] = useState<PendingOrder[]>([]);
  const [pulledAll, setPulledAll] = useState(false);

  const load = useCallback(async (from: string, to: string) => {
    if (!from || !to) {
      setRows([]);
      return;
    }
    try {
      setRows(await fetchImportOrders(from, to));
    } catch {
      setRows([]);
    }
  }, []);
  // 기간을 바꾸면 바로 다시 찾는다(송연과 같음)
  useEffect(() => {
    void load(start, end);
  }, [load, start, end]);

  const shown = useMemo(() => rows.filter((row) => !alreadyPulled.includes(row.id)), [rows, alreadyPulled]);

  const pullAll = () => {
    if (shown.length === 0) {
      onAlert('가져올 수주내역이 없어요');
      return;
    }
    onPull(shown);
    setPulledAll(true);
  };

  const emptyText = pulledAll
    ? '전체 가져오기 완료 — 담은 항목은 확정 버튼을 눌러야 실제 등록돼요'
    : start && end ? '이 기간에 가져올 수주내역이 없습니다' : '조회 기간을 선택해주세요';

  const columns = useMemo<F1GridColumn<PendingOrder>[]>(() => [
    { field: 'id', type: 'rownumber', width: 56, headerName: '순번', headerAlign: 'center', align: 'center', pinned: 'left' },
    {
      // 수주일과 '→' 를 앞에 둔다. 취소된 건을 지우려 해도 언제 등록했는지 몰라 수주등록 화면에서 못 찾는 일이 있었다(송연).
      field: 'orderDate', headerName: '수주일', width: 140, headerAlign: 'center', align: 'left',
      renderCell: ({ row }) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Button size="small" variant="outlined" sx={rowButton} title="이 수주를 등록한 날짜로 이동" aria-label={`수주 ${row.id} 로 이동`}
            onClick={() => onGotoOrder(row)}>→</Button>
          <span>{row.orderDate || ''}</span>
        </Box>
      ),
    },
    { field: 'productionDate', headerName: '생산예정일', width: 110, headerAlign: 'center', align: 'center', getValue: (row) => row.productionDate || '' },
    { field: 'clientName', headerName: '거래처', flex: 1, width: 140, headerAlign: 'center', align: 'left' },
    { field: 'productName', headerName: '품목명(규격)', flex: 1.3, width: 180, headerAlign: 'center', align: 'left' },
    { field: 'orderQty', headerName: '수량', width: 80, headerAlign: 'center', align: 'right' },
    {
      field: 'logisticsDate', headerName: '물류출고일', width: 110, headerAlign: 'center', align: 'center',
      renderCell: ({ row }) => (row.isStockProduction ? <Chip size="small" variant="outlined" label="재고생산" /> : row.logisticsDate || ''),
    },
    {
      field: 'note', headerName: '가져오기', width: 96, headerAlign: 'center', align: 'center', pinned: 'right',
      renderCell: ({ row }) => <Button size="small" variant="outlined" sx={rowButton} onClick={() => onPull([row])}>가져오기</Button>,
    },
  ], [onPull, onGotoOrder]);

  return (
    <Dialog open onClose={onClose} maxWidth="lg" fullWidth aria-labelledby="production-import-title">
      <DialogTitle id="production-import-title" sx={{ pr: 6 }}>
        수주등록 가져오기
        <IconButton aria-label="닫기" onClick={onClose} sx={{ position: 'absolute', right: 12, top: 12 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          생산예정일 기준으로 수주등록된 건을 조회해서 가져와요. 가져온 건은 생산확정({targetDate || '(날짜 미선택)'}) 목록에 담기고,
          목록에서 <b>확정</b>을 눌러야 실제 생산으로 반영돼요.
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 1.5, alignItems: { sm: 'center' } }}>
          <TextField type="date" size="small" margin="none" value={start} onChange={(event) => setStart(event.target.value)}
            slotProps={{ htmlInput: { 'aria-label': '가져오기 시작일' } }} sx={{ width: { xs: '100%', sm: 170 } }} />
          <Typography sx={{ display: { xs: 'none', sm: 'block' } }}>~</Typography>
          <TextField type="date" size="small" margin="none" value={end} onChange={(event) => setEnd(event.target.value)}
            slotProps={{ htmlInput: { 'aria-label': '가져오기 종료일' } }} sx={{ width: { xs: '100%', sm: 170 } }} />
          <Button variant="contained" onClick={() => void load(start, end)}>조회</Button>
          <Button variant="outlined" onClick={pullAll}>전체 가져오기</Button>
        </Stack>
        {shown.length === 0 && <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{emptyText}</Typography>}
        <Box sx={{ height: 360 }}>
          <F1Grid
            rows={shown}
            columns={columns}
            rowKey="id"
            storageKey="pd-confirm-import-grid"
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

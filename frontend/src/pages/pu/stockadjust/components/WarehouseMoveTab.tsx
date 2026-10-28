import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Box, Button, Card, MenuItem, TextField, Typography } from '@mui/material';
import { F1Grid, type F1GridColumn } from '../../../../shared/components/f1-grid';
import { todayDash } from '../../../../shared/utils/excelFile';
import { ConfirmDialog } from '../../../../shared/components/ConfirmDialog';
import { cancelMove, fetchMoveTargets, fetchMoves, lookupMove, moveWarehouse } from '../services/stockAdjust.service';
import { movedMessage, whmNum, type WarehouseLookup, type WarehouseMove } from '../utils/stockAdjust';

const errorText = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;
const gridProps = {
  height: '100%', maxHeight: '100%', rowHeight: 34, minRowHeight: 34, maxRowHeight: 320, columnLine: true, showCheckbox: false,
  resizableRows: false, allowAddRowInContextMenu: false, allowDuplicateRowInContextMenu: false, allowDeleteRowInContextMenu: false,
} as const;
const cardSx = { borderRadius: 1, border: '1px solid rgba(148,163,184,0.18)', boxShadow: 'none', display: 'flex', flexDirection: 'column', p: 1.5 };

type Message = { text: string; ok: boolean } | null;

// 창고이동 탭 (송연 #stock-tab-whmove · 30-warehouse-move.js)
// 완포장을 계량실로 가져갈 때 바코드를 찍는다. 한 번 찍으면 한 봉이고, 바코드가 입고 한 건(로트)마다 붙어 있어 어느 입고분을 뜯었는지 남는다.
// 옮겨도 총재고는 안 바뀌고 자리만 바뀐다. 바코드 리더는 다 읽고 엔터를 눌러주므로 엔터로 조회하고, 봉수 칸에서 엔터로 옮긴다.
export function WarehouseMoveTab({ active }: { active: boolean }) {
  const barcodeRef = useRef<HTMLInputElement>(null);
  const packsRef = useRef<HTMLInputElement>(null);
  const [barcode, setBarcode] = useState('');
  const [packs, setPacks] = useState('1');
  const [targets, setTargets] = useState<string[]>([]);
  const [to, setTo] = useState('');
  const [found, setFound] = useState<WarehouseLookup | null>(null);
  const [message, setMessage] = useState<Message>(null);
  const [date, setDate] = useState(() => todayDash());
  const [moves, setMoves] = useState<WarehouseMove[] | null>(null);
  const [cancelling, setCancelling] = useState<WarehouseMove | null>(null);
  const [alertText, setAlertText] = useState<string | null>(null);

  const loadMoves = useCallback(async (day: string) => {
    try {
      setMoves(await fetchMoves(day || todayDash()));
    } catch (requestError) {
      setAlertText(errorText(requestError, '이동 기록을 불러오지 못했어요'));
    }
  }, []);

  // 탭을 열 때마다 그 날 것을 다시 읽고 바코드 칸에 커서를 둔다(현장에서는 들어오자마자 바로 찍는다)
  useEffect(() => {
    if (!active) return;
    void loadMoves(date);
    fetchMoveTargets().then((list) => {
      setTargets(list);
      // 옮겨갈 창고가 하나뿐이면 그리로(송연과 같음)
      setTo((current) => (current && list.includes(current) ? current : list.length === 1 ? list[0] : current));
    }).catch(() => undefined);
    const timer = setTimeout(() => barcodeRef.current?.focus(), 80);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  // 찍으면 무엇을 몇 kg 씩 옮기는지 먼저 보여준다 — 바로 옮기면 잘못 찍었을 때 되돌릴 틈이 없다
  const lookup = async () => {
    const key = barcode.trim();
    setFound(null);
    if (!key) {
      setMessage(null);
      return;
    }
    try {
      setFound(await lookupMove(key));
      setMessage(null);
      setTimeout(() => { packsRef.current?.focus(); packsRef.current?.select(); }, 0);
    } catch (requestError) {
      setMessage({ text: errorText(requestError, '찾지 못했어요'), ok: false });
    }
  };

  const move = async () => {
    if (!found) {
      setMessage({ text: '먼저 바코드를 찍어주세요', ok: false });
      return;
    }
    const count = parseInt(packs, 10);
    if (!count || count < 1) {
      setMessage({ text: '봉수를 적어주세요', ok: false });
      return;
    }
    try {
      const result = await moveWarehouse({ materialCode: found.materialCode, barcode: found.barcode, packCount: String(count), movedDate: date || todayDash(), toWarehouse: to });
      setMessage({ text: movedMessage(found, count, result.qty, result.toWarehouse), ok: true });
      // 다음 것을 바로 찍을 수 있게 비우고 되돌아간다(현장에서는 손이 바쁘다)
      setBarcode('');
      setPacks('1');
      setFound(null);
      barcodeRef.current?.focus();
      void loadMoves(date);
    } catch (requestError) {
      setMessage({ text: errorText(requestError, '옮기지 못했어요'), ok: false });
    }
  };

  const cancel = async () => {
    const row = cancelling;
    setCancelling(null);
    if (!row) return;
    try {
      await cancelMove(row.id);
      void loadMoves(date);
    } catch (requestError) {
      setAlertText(errorText(requestError, '취소하지 못했어요'));
    }
  };

  const columns = useMemo<F1GridColumn<WarehouseMove>[]>(() => [
    { field: 'id', type: 'rownumber', width: 56, headerName: '순번', headerAlign: 'center', align: 'center', pinned: 'left' },
    {
      field: 'materialName', headerName: '품목', flex: 1.3, width: 200, headerAlign: 'center', align: 'left',
      renderCell: ({ row }) => <span>{row.materialName || ''} <Typography component="span" sx={{ fontSize: 11, color: 'text.secondary' }}>({row.materialCode})</Typography></span>,
    },
    {
      field: 'barcode', headerName: '바코드(로트)', width: 150, headerAlign: 'center', align: 'left',
      renderCell: ({ row }) => (row.barcode
        ? <Box component="span" sx={{ fontFamily: 'monospace', fontSize: 11 }}>{row.barcode}</Box>
        : <Typography component="span" variant="body2" color="text.secondary">없음</Typography>),
    },
    { field: 'packCount', headerName: '봉수', width: 80, headerAlign: 'center', align: 'right', renderCell: ({ row }) => `${whmNum(row.packCount)}봉` },
    { field: 'qty', headerName: '무게', width: 90, headerAlign: 'center', align: 'right', renderCell: ({ row }) => whmNum(row.qty), getCellStyle: () => ({ fontWeight: 700 }) },
    { field: 'fromWarehouse', headerName: '어디서', width: 100, headerAlign: 'center', align: 'left', renderCell: ({ row }) => row.fromWarehouse || '' },
    { field: 'toWarehouse', headerName: '어디로', width: 100, headerAlign: 'center', align: 'left', renderCell: ({ row }) => row.toWarehouse || '' },
    { field: 'movedBy', headerName: '찍은 사람', width: 100, headerAlign: 'center', align: 'left', renderCell: ({ row }) => row.movedBy || '' },
    {
      field: 'movedDate', headerName: '', width: 76, headerAlign: 'center', align: 'center', pinned: 'right',
      // 잘못 찍는 일이 잦다 — 지우는 길이 없으면 계량창고 숫자가 틀린 채로 계속 간다
      renderCell: ({ row }) => <Button size="small" variant="outlined" color="error" sx={{ minWidth: 0, px: 1, py: 0 }} onClick={() => setCancelling(row)}>취소</Button>,
    },
  ], []);

  const unit = found?.unit || 'kg';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Card sx={cardSx}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          완포장을 계량실로 가져갈 때 바코드를 찍어주세요. <b>한 번 찍으면 한 봉</b>이에요. 옮겨도 총재고는 안 바뀌고, 자재창고에서 계량창고로 자리만 바뀝니다.
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <TextField
            inputRef={barcodeRef} size="small" margin="none" placeholder="바코드를 찍으세요 (예: 000311_26090301)" value={barcode}
            onChange={(event) => setBarcode(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void lookup(); } }}
            slotProps={{ htmlInput: { 'aria-label': '바코드', autoComplete: 'off' } }} sx={{ width: 320 }}
          />
          <TextField
            inputRef={packsRef} size="small" margin="none" type="number" value={packs} title="옮길 봉수"
            onChange={(event) => setPacks(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void move(); } }}
            slotProps={{ htmlInput: { 'aria-label': '봉수', min: 1, step: 1 } }} sx={{ width: 90 }}
          />
          <Typography variant="body2">봉</Typography>
          {/* 송연은 입고창고가 아닌 창고가 하나뿐일 때만 자동으로 보낸다. 창고가 여럿이면 여기서 고른다 */}
          <TextField select size="small" margin="none" value={to} onChange={(event) => setTo(event.target.value)}
            slotProps={{ select: { displayEmpty: true }, htmlInput: { 'aria-label': '어디로' } }} sx={{ width: 150 }}>
            <MenuItem value="">어디로 (고르기)</MenuItem>
            {targets.map((name) => <MenuItem key={name} value={name}>{name}</MenuItem>)}
          </TextField>
          <Button variant="contained" onClick={() => void move()}>옮기기</Button>
        </Box>
        {found && (
          <Box aria-label="찍은 품목" sx={{ mt: 1.5, p: 1.5, borderRadius: 2, bgcolor: 'rgba(37, 99, 235, 0.08)', fontSize: 13, lineHeight: 1.7 }}>
            <Typography sx={{ fontWeight: 700, fontSize: 14, mb: 0.5 }}>{found.materialName}</Typography>
            <div>
              한 봉 <b>{whmNum(found.unitWeight)}{unit}</b>
              {found.boxQty && found.boxQty > 1 ? ` · 한 박스 ${found.boxQty}봉` : ''}
              {found.lotDate ? <Box component="span" sx={{ color: 'text.secondary' }}> · {found.lotDate} 입고분</Box> : null}
            </div>
            <div>
              지금 자재창고 <b>{whmNum(found.inMaterialWarehouse)}{unit}</b>
              <Box component="span" sx={{ color: 'text.secondary' }}> / 계량창고 {whmNum(found.inWeighingWarehouse)}{unit}</Box>
            </div>
            {!found.barcode && <Box sx={{ mt: 0.5, color: 'warning.main' }}>바코드가 아니라 품목으로 찾았어요. 어느 입고분인지는 안 남습니다.</Box>}
          </Box>
        )}
        {message && <Alert severity={message.ok ? 'success' : 'error'} sx={{ mt: 1 }}>{message.text}</Alert>}
      </Card>

      <Card sx={cardSx}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Typography sx={{ fontSize: 14, fontWeight: 700, mr: 'auto' }}>오늘 옮긴 것</Typography>
          <TextField type="date" size="small" margin="none" value={date}
            onChange={(event) => { setDate(event.target.value); void loadMoves(event.target.value); }}
            slotProps={{ htmlInput: { 'aria-label': '옮긴 날' } }} sx={{ width: 170 }} />
        </Box>
        {moves && moves.length === 0 && <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>이 날 옮긴 것이 없습니다</Typography>}
        <Box sx={{ height: 320 }}>
          <F1Grid rows={moves ?? []} columns={columns} rowKey="id" storageKey="pu-stockadjust-warehouse-move-grid" ariaLabel="F1-GRID 창고이동" {...gridProps} />
        </Box>
      </Card>

      <ConfirmDialog open={cancelling != null} title="창고이동 취소" message={cancelling ? `${cancelling.materialName || ''} 이동기록을 취소할까요?` : ''}
        confirmLabel="취소하기" danger onCancel={() => setCancelling(null)} onConfirm={() => void cancel()} />
      <ConfirmDialog open={alertText != null} title="창고이동" message={alertText ?? ''} alertOnly
        onCancel={() => setAlertText(null)} onConfirm={() => setAlertText(null)} />
    </Box>
  );
}

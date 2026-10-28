import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert, Autocomplete, Box, Button, Checkbox, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel,
  IconButton, MenuItem, TextField, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import { F1Grid, type F1GridColumn } from '../../../../shared/components/f1-grid';
import { cellInputProps } from '../../../../shared/utils/gridCellInput';
import { todayDash } from '../../../../shared/utils/excelFile';
import { fetchMaterialOptions } from '../../../co/master/item-master/services/itemMaster.service';
import { fetchVendors } from '../../../co/master/material-master/services/materialMaster.service';
import { ConfirmDialog } from '../../../../shared/components/ConfirmDialog';
import { fetchLastPrice, fetchReceivings, registerReceivings } from '../services/receiving.service';
import {
  TAX_TYPES, formatMoney, formatQty, itemCalc, returnQtyError, stagingTotal,
  type Receiving, type StagingItem, type TaxType,
} from '../utils/receiving';

const errorText = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

type Material = { code: string; name: string };
type Message = { text: string; ok: boolean } | null;
type PickRow = Receiving & { left: number; state: 'pick' | 'done' | 'staged' };

const inputSx = { '& .MuiInputBase-input': { py: 0.5, px: 0.75, fontSize: 13 } };
const leftOf = (row: Receiving) => (row.returnableQty != null ? row.returnableQty : Number(row.qty || 0));

// 반품 등록 창 (송연 #ret-modal-overlay · 19-purchase.js ret-open-btn~ret-confirm-btn)
// 되돌려 보낼 수량은 양수로 적고, 저장할 때 서버가 마이너스로 기록한다.
// 입고내역에서 가져오면 그 입고건의 거래처·단가·과세구분이 그대로 따라오고, 남은 수량까지만 반품할 수 있다.
export function ReturnDialog({ open, onClose, onRegistered }: {
  open: boolean;
  onClose: () => void;
  onRegistered: (returnDate: string) => void;
}) {
  const keyRef = useRef(0);
  const rowsRef = useRef<StagingItem[]>([]);
  const [vendors, setVendors] = useState<string[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [clientName, setClientName] = useState('');
  const [materialName, setMaterialName] = useState('');
  const [qty, setQty] = useState('');
  const [rows, setRowsState] = useState<StagingItem[]>([]);
  const [pickDate, setPickDate] = useState(() => todayDash());
  const [pickSource, setPickSource] = useState<Receiving[]>([]);
  const [returnDate, setReturnDate] = useState(() => todayDash());
  const [message, setMessage] = useState<Message>(null);
  const [ask, setAsk] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const setRows = (updater: (current: StagingItem[]) => StagingItem[]) => {
    const next = updater(rowsRef.current);
    rowsRef.current = next;
    setRowsState(next);
  };

  // 입고내역에서 가져오기(반품 줄은 빼고 입고만, 30줄까지)
  const loadPickList = useCallback(async (date: string) => {
    try {
      setPickSource((await fetchReceivings({ date, kind: 'receiving' })).slice(0, 30));
    } catch {
      setPickSource([]);
    }
  }, []);

  // 같은 입고를 두 번 담으면 각각은 남은 수량 안이어도 합치면 넘어간다 — 담아둔 것은 다시 못 담게 한다
  const pickRows = useMemo<PickRow[]>(() => {
    const staged = new Set(rows.filter((row) => row.returnOfId != null).map((row) => row.returnOfId));
    return pickSource.map((row) => {
      const left = leftOf(row);
      return { ...row, left, state: left <= 0 ? 'done' : staged.has(row.id) ? 'staged' : 'pick' };
    });
  }, [pickSource, rows]);

  useEffect(() => {
    if (!open) return;
    rowsRef.current = [];
    setRowsState([]);
    setClientName('');
    setMaterialName('');
    setQty('');
    const today = todayDash();
    setPickDate(today);
    setReturnDate(today);
    setMessage(null);
    fetchVendors().then((list) => setVendors(list.map((vendor) => vendor.name).filter(Boolean))).catch(() => undefined);
    fetchMaterialOptions().then((list) => setMaterials(list.map((m) => ({ code: m.code, name: m.name })))).catch(() => undefined);
    void loadPickList(today);
  }, [open, loadPickList]);

  const pick = (row: PickRow) => {
    keyRef.current += 1;
    // 기본은 남은 전량. 일부만 돌려보낼 때는 반품수량 칸을 고친다
    setRows((current) => [...current, {
      key: keyRef.current, materialCode: row.materialCode || '', materialName: row.materialName || '',
      qty: row.left, maxQty: row.left, returnOfId: row.id, unitPrice: row.unitPrice ?? null,
      taxType: ((row.taxType as TaxType) || '과세'), clientName: row.clientName || '', returnReason: '', checked: true,
    }]);
  };

  const addManual = async () => {
    if (!clientName.trim()) {
      setMessage({ text: '거래처를 먼저 입력해주세요', ok: false });
      return;
    }
    if (!materialName.trim() || !qty) {
      setMessage({ text: '품목과 수량을 입력해주세요', ok: false });
      return;
    }
    const material = materials.find((m) => m.name === materialName.trim());
    if (!material) {
      setMessage({ text: '등록된 원재료명과 일치하지 않아요', ok: false });
      return;
    }
    setMessage(null);
    keyRef.current += 1;
    const key = keyRef.current;
    const client = clientName.trim();
    setRows((current) => [...current, {
      key, materialCode: material.code, materialName: material.name, qty: parseFloat(qty), unitPrice: null,
      taxType: '과세', clientName: client, returnReason: '', checked: true,
    }]);
    setMaterialName('');
    setQty('');
    try {
      const price = await fetchLastPrice(material.code, client);
      if (price != null) setRows((current) => current.map((row) => (row.key === key && (row.unitPrice == null || row.unitPrice === '') ? { ...row, unitPrice: price } : row)));
    } catch {
      // 못 받아도 손으로 적는다
    }
  };

  const patch = (key: number, change: Partial<StagingItem>) =>
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...change } : row)));

  const submit = async () => {
    const chosen = rowsRef.current.filter((row) => row.checked);
    setSaving(true);
    try {
      const registered = await registerReceivings(returnDate, chosen, true);
      setMessage({ text: `${registered}건 반품 처리되었습니다`, ok: true });
      setRows((current) => current.filter((row) => !row.checked));
      onRegistered(returnDate);
      void loadPickList(pickDate); // 남은 반품가능 수량이 줄어든 것을 바로 보여준다
    } catch (requestError) {
      setMessage({ text: errorText(requestError, '등록 실패'), ok: false });
    } finally {
      setSaving(false);
    }
  };

  const confirm = () => {
    const chosen = rowsRef.current.filter((row) => row.checked);
    if (!returnDate) {
      setMessage({ text: '반품일을 선택해주세요', ok: false });
      return;
    }
    if (chosen.length === 0) {
      setMessage({ text: '선택된 품목이 없어요', ok: false });
      return;
    }
    const error = returnQtyError(chosen);
    if (error) {
      setMessage({ text: error, ok: false });
      return;
    }
    setAsk(`${chosen.length}건을 반품 처리할까요?\n재고가 줄고, 매입금액에서 ${formatMoney(stagingTotal(chosen))}원이 빠집니다.`);
  };

  const allChecked = rows.length > 0 && rows.every((row) => row.checked);
  const total = stagingTotal(rows);

  // 전량 반품된 입고는 흐리게
  const pickColumns = useMemo<F1GridColumn<PickRow>[]>(() => [
    ...([
    { field: 'id', type: 'rownumber', width: 56, headerName: '순번', headerAlign: 'center', align: 'center', pinned: 'left' },
    { field: 'receiveDate', headerName: '입고일', width: 110, headerAlign: 'center', align: 'center' },
    { field: 'clientName', headerName: '거래처', flex: 1, width: 140, headerAlign: 'center', align: 'left', renderCell: ({ row }) => row.clientName || '' },
    { field: 'materialName', headerName: '품목', flex: 1.3, width: 180, headerAlign: 'center', align: 'left' },
    {
      field: 'qty', headerName: '수량', width: 150, headerAlign: 'center', align: 'right',
      renderCell: ({ row }) => (row.returnedQty
        ? <span>{formatQty(row.qty)} <Typography component="span" sx={{ fontSize: 11, color: 'text.secondary' }}>(반품 {formatQty(row.returnedQty)} · 남음 {formatQty(row.left)})</Typography></span>
        : formatQty(row.qty)),
    },
    { field: 'unitPrice', headerName: '단가', width: 100, headerAlign: 'center', align: 'right', renderCell: ({ row }) => (row.unitPrice != null ? formatMoney(row.unitPrice) : '') },
    {
      field: 'state', headerName: '', width: 110, headerAlign: 'center', align: 'center', pinned: 'right',
      renderCell: ({ row }) => {
        if (row.state === 'done') return <Chip size="small" label="전량 반품됨" />;
        if (row.state === 'staged') return <Chip size="small" color="info" variant="outlined" label="담아둠" />;
        return <Button size="small" variant="outlined" sx={{ minWidth: 0, px: 1, py: 0 }} onClick={() => pick(row)}>가져오기</Button>;
      },
    },
  ] as F1GridColumn<PickRow>[]).map((column) => ({ ...column, getCellStyle: ({ row }: { row: PickRow }) => (row.left <= 0 ? { opacity: 0.5 } : undefined) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], []);

  const columns = useMemo<F1GridColumn<StagingItem>[]>(() => [
    { field: 'key', type: 'rownumber', width: 56, headerName: '순번', headerAlign: 'center', align: 'center', pinned: 'left' },
    {
      field: 'checked', headerName: '선택', width: 56, headerAlign: 'center', align: 'center',
      renderCell: ({ row }) => (
        <Checkbox size="small" checked={row.checked} onChange={(event) => patch(row.key, { checked: event.target.checked })}
          slotProps={{ input: { 'aria-label': `${row.materialName} 선택` } }} />
      ),
    },
    { field: 'clientName', headerName: '거래처', width: 120, headerAlign: 'center', align: 'left' },
    { field: 'materialName', headerName: '품목', flex: 1, width: 160, headerAlign: 'center', align: 'left' },
    {
      field: 'qty', headerName: '반품수량', width: 130, headerAlign: 'center', align: 'right',
      renderCell: ({ row }) => {
        // 남은 수량보다 많이 적으면 서버가 어차피 막지만, 확정을 누르기 전에 알려준다
        const over = row.maxQty != null && parseFloat(String(row.qty)) > row.maxQty + 1e-9;
        return (
          <TextField {...cellInputProps}
            size="small" margin="none" type="number" value={row.qty ?? ''} error={over}
            title={row.maxQty != null ? (over ? `최대 ${formatQty(row.maxQty)}` : `반품가능 ${formatQty(row.maxQty)}`) : ''}
            placeholder={row.maxQty != null ? `반품가능 ${formatQty(row.maxQty)}` : ''}
            slotProps={{ htmlInput: { step: '0.0001', min: 0, max: row.maxQty ?? undefined, 'aria-label': `${row.materialName} 반품수량` } }}
            sx={{ ...inputSx, width: 116 }}
            onChange={(event) => patch(row.key, { qty: event.target.value })}
          />
        );
      },
    },
    {
      field: 'unitPrice', headerName: '단가(입력)', width: 120, headerAlign: 'center', align: 'right',
      renderCell: ({ row }) => (
        <TextField {...cellInputProps} size="small" margin="none" type="number" placeholder="단가" value={row.unitPrice ?? ''}
          slotProps={{ htmlInput: { step: '0.0001', 'aria-label': `${row.materialName} 단가` } }} sx={{ ...inputSx, width: 106 }}
          onChange={(event) => patch(row.key, { unitPrice: event.target.value })} />
      ),
    },
    {
      field: 'taxType', headerName: '과세구분', width: 90, headerAlign: 'center', align: 'center',
      renderCell: ({ row }) => (
        <TextField {...cellInputProps} select size="small" margin="none" value={row.taxType} sx={{ ...inputSx, width: 76 }}
          slotProps={{ htmlInput: { 'aria-label': `${row.materialName} 과세구분` } }}
          onChange={(event) => patch(row.key, { taxType: event.target.value as TaxType })}>
          {TAX_TYPES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
        </TextField>
      ),
    },
    {
      field: 'maxQty', headerName: '합계', width: 110, headerAlign: 'center', align: 'right',
      renderCell: ({ row }) => {
        const value = itemCalc(row).total;
        return <Typography component="span" sx={{ fontSize: 13, fontWeight: 700, color: 'error.main' }}>{value != null ? `-${formatMoney(value)}` : ''}</Typography>;
      },
    },
    {
      field: 'returnReason', headerName: '사유', width: 130, headerAlign: 'center', align: 'left',
      renderCell: ({ row }) => (
        <TextField {...cellInputProps} size="small" margin="none" placeholder="예: 파손" value={row.returnReason ?? ''}
          slotProps={{ htmlInput: { 'aria-label': `${row.materialName} 사유` } }} sx={{ ...inputSx, width: 116 }}
          onChange={(event) => patch(row.key, { returnReason: event.target.value })} />
      ),
    },
    {
      field: 'returnOfId', headerName: '', width: 52, headerAlign: 'center', align: 'center', pinned: 'right',
      renderCell: ({ row }) => (
        <IconButton size="small" color="error" aria-label={`${row.materialName} 빼기`} onClick={() => setRows((current) => current.filter((x) => x.key !== row.key))}>
          <CloseIcon fontSize="small" />
        </IconButton>
      ),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], []);

  return (
    <Dialog open={open} onClose={onClose} maxWidth={false} slotProps={{ paper: { sx: { width: 'min(1100px, 96vw)' } } }} aria-labelledby="ret-dialog-title">
      <DialogTitle id="ret-dialog-title" sx={{ fontSize: 16, fontWeight: 700 }}>반품 등록</DialogTitle>
      <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
        <Typography variant="body2" color="text.secondary">
          되돌려 보낼 수량을 <b>양수</b>로 적어주세요. 저장할 때 마이너스로 기록돼 재고와 금액에서 함께 빠집니다.
        </Typography>
        <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.25 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
            <Typography sx={{ fontSize: 14, fontWeight: 700, mr: 'auto' }}>입고내역에서 가져오기</Typography>
            <TextField type="date" size="small" margin="none" value={pickDate} onChange={(event) => setPickDate(event.target.value)}
              slotProps={{ htmlInput: { 'aria-label': '가져올 입고일' } }} sx={{ width: 160 }} />
            <Button size="small" variant="contained" onClick={() => void loadPickList(pickDate)}>조회</Button>
          </Box>
          <Typography variant="caption" color="text.secondary">가져오면 그 입고건의 거래처·단가·과세구분이 그대로 따라와요.</Typography>
          {pickRows.length === 0 && <Typography variant="body2" color="text.secondary">이 날짜의 입고내역이 없습니다</Typography>}
          <Box sx={{ height: 170, mt: 0.5 }}>
            <F1Grid rows={pickRows} columns={pickColumns} rowKey="id" storageKey="pu-ret-pick-grid" ariaLabel="F1-GRID 반품할 입고내역"
              height="100%" maxHeight="100%" rowHeight={32} minRowHeight={32} maxRowHeight={320} columnLine showCheckbox={false}
              resizableRows={false} allowAddRowInContextMenu={false} allowDuplicateRowInContextMenu={false} allowDeleteRowInContextMenu={false} />
          </Box>
        </Box>

        <Autocomplete
          freeSolo options={vendors} value={clientName} inputValue={clientName}
          onInputChange={(_event, value) => setClientName(value)}
          renderInput={(params) => <TextField {...params} size="small" margin="none" label="거래처" placeholder="직접 추가할 품목의 거래처명" />}
        />
        <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr) auto', gap: 1, alignItems: 'center' }}>
          <Autocomplete
            freeSolo options={materials.map((m) => m.name)} value={materialName} inputValue={materialName}
            onInputChange={(_event, value) => setMaterialName(value)}
            renderInput={(params) => <TextField {...params} size="small" margin="none" label="품목" placeholder="원재료명 입력" />}
          />
          <TextField type="number" size="small" margin="none" label="반품수량" placeholder="예: 20" value={qty} onChange={(event) => setQty(event.target.value)} />
          <Button variant="outlined" startIcon={<AddIcon />} onClick={() => void addManual()}>목록에 추가</Button>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <FormControlLabel
            control={<Checkbox size="small" checked={allChecked} disabled={rows.length === 0}
              onChange={(event) => setRows((current) => current.map((row) => ({ ...row, checked: event.target.checked })))} />}
            label={<Typography variant="body2">전체 선택</Typography>} sx={{ m: 0 }}
          />
          <Typography sx={{ ml: 'auto', fontWeight: 700, fontSize: 13 }} aria-label="반품 합계">
            반품 합계: <Box component="span" sx={{ color: 'error.main' }}>{formatMoney(total)}</Box>원
          </Typography>
        </Box>
        {rows.length === 0 && <Typography variant="body2" color="text.secondary">추가된 품목이 없습니다</Typography>}
        <Box sx={{ height: 220 }}>
          <F1Grid rows={rows} columns={columns} rowKey="key" storageKey="pu-ret-staging-grid" ariaLabel="F1-GRID 반품 등록 품목"
            height="100%" maxHeight="100%" rowHeight={40} minRowHeight={40} maxRowHeight={320} columnLine showCheckbox={false}
            resizableRows={false} allowAddRowInContextMenu={false} allowDuplicateRowInContextMenu={false} allowDeleteRowInContextMenu={false} />
        </Box>
        <TextField type="date" size="small" margin="none" label="반품일" value={returnDate} onChange={(event) => setReturnDate(event.target.value)}
          slotProps={{ inputLabel: { shrink: true } }} sx={{ maxWidth: 220 }} />
        {message && <Alert severity={message.ok ? 'success' : 'error'}>{message.text}</Alert>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>닫기</Button>
        <Button variant="contained" color="error" disabled={saving} onClick={confirm}>선택 항목 반품 확정</Button>
      </DialogActions>
      <ConfirmDialog open={ask != null} title="반품 확정" message={ask ?? ''} confirmLabel="반품 처리"
        onCancel={() => setAsk(null)} onConfirm={() => { setAsk(null); void submit(); }} />
    </Dialog>
  );
}

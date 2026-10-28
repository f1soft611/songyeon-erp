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
import { fetchOrdersByDate } from '../../order/services/purchaseOrder.service';
import type { PurchaseOrder } from '../../order/utils/purchaseOrder';
import { fetchLastPrice, registerReceivings } from '../services/receiving.service';
import {
  TAX_TYPES, formatMoney, formatQty, itemCalc, noPriceMessage, priceDiffers, priceMismatchMessage, stagingTotal, unitPriceFromTotal,
  type StagingItem, type TaxType,
} from '../utils/receiving';

const errorText = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

type Material = { code: string; name: string; unitPrice: number | null };
type Row = StagingItem & { totalInput: string };
type Message = { text: string; ok: boolean } | null;
type PickRow = PurchaseOrder & { label: string };

const inputSx = { '& .MuiInputBase-input': { py: 0.5, px: 0.75, fontSize: 13 } };

// 입고 등록 창 (송연 #recv-modal-overlay · 19-purchase.js recv-open-btn~recv-confirm-btn)
// 발주내역에서 가져온 품목은 그 발주건의 거래처를 그대로 쓰고, 직접 추가할 때만 위쪽 거래처를 쓴다.
// 단가를 넣으면 공급가액·부가세·합계가 계산되고, 합계만 알면 합계칸에 적어도 단가가 역산된다.
// 서류는 여기서 붙이지 않는다 — 거래명세서는 며칠 뒤에 오는 일이 많아 서류등록 탭 한 곳에서만 다룬다.
export function ReceivingDialog({ open, onClose, onRegistered }: {
  open: boolean;
  onClose: () => void;
  onRegistered: (receiveDate: string) => void;
}) {
  const keyRef = useRef(0);
  const rowsRef = useRef<Row[]>([]);
  const [vendors, setVendors] = useState<string[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [clientName, setClientName] = useState('');
  const [materialName, setMaterialName] = useState('');
  const [qty, setQty] = useState('');
  const [rows, setRowsState] = useState<Row[]>([]);
  const [pickDate, setPickDate] = useState('');
  const [pickRows, setPickRows] = useState<PickRow[]>([]);
  const [receiveDate, setReceiveDate] = useState(() => todayDash());
  const [message, setMessage] = useState<Message>(null);
  const [alertText, setAlertText] = useState<string | null>(null);
  const [askMismatch, setAskMismatch] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const setRows = (updater: (current: Row[]) => Row[]) => {
    const next = updater(rowsRef.current);
    rowsRef.current = next;
    setRowsState(next);
  };
  const bomPriceOf = useCallback((code: string) => materials.find((m) => m.code === code)?.unitPrice ?? null, [materials]);

  // 발주내역에서 가져오기: 이미 입고된 발주, 이미 목록에 담은 발주는 뺀다(30줄까지 보인다)
  const loadPickList = useCallback(async (date: string) => {
    try {
      const list = await fetchOrdersByDate(date, '');
      const staged = new Set(rowsRef.current.filter((row) => row.poId).map((row) => row.poId));
      setPickRows(list.filter((order) => !order.received && !staged.has(order.id)).map((order) => ({ ...order, label: `${order.materialName || ''} (${order.materialCode || ''})` })));
    } catch {
      setPickRows([]);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    rowsRef.current = [];
    setRowsState([]);
    setClientName('');
    setMaterialName('');
    setQty('');
    setPickDate('');
    setReceiveDate(todayDash());
    setMessage(null);
    fetchVendors().then((list) => setVendors(list.map((vendor) => vendor.name).filter(Boolean))).catch(() => undefined);
    fetchMaterialOptions().then((list) => setMaterials(list.map((m) => ({ code: m.code, name: m.name, unitPrice: m.unitPrice })))).catch(() => undefined);
    void loadPickList('');
  }, [open, loadPickList]);

  // 마지막 입고 단가를 채운다(같은 거래처 기록 우선). 그 사이에 사람이 적은 단가는 덮지 않는다
  const fillLastPrice = async (key: number, code: string, client: string) => {
    try {
      const price = await fetchLastPrice(code, client);
      if (price == null) return;
      setRows((current) => current.map((row) => (row.key === key && (row.unitPrice == null || row.unitPrice === '')
        ? { ...row, unitPrice: price, totalInput: String(itemCalc({ ...row, unitPrice: price }).total ?? '') } : row)));
    } catch {
      // 못 받아도 손으로 적는다
    }
  };

  const addRow = (base: Omit<Row, 'key' | 'totalInput' | 'checked' | 'taxType' | 'unitPrice'>) => {
    keyRef.current += 1;
    const key = keyRef.current;
    setRows((current) => [...current, { ...base, key, checked: true, taxType: '과세', unitPrice: null, totalInput: '' }]);
    void fillLastPrice(key, base.materialCode, base.clientName);
  };

  const pick = (order: PickRow) => {
    addRow({ materialCode: order.materialCode || '', materialName: order.materialName || '', qty: Number(order.qty || 0), clientName: order.clientName || '', poId: order.id });
    void loadPickList(pickDate);
  };

  const pickAll = async () => {
    if (pickRows.length === 0) {
      setAlertText('가져올 발주내역이 없어요');
      return;
    }
    pickRows.forEach((order) => addRow({ materialCode: order.materialCode || '', materialName: order.materialName || '', qty: Number(order.qty || 0), clientName: order.clientName || '', poId: order.id }));
    await loadPickList(pickDate);
  };

  const addManual = () => {
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
    // 이 순간의 거래처를 품목에 함께 저장한다(발주등록과 같은 방식)
    addRow({ materialCode: material.code, materialName: material.name, qty: parseFloat(qty), clientName: clientName.trim(), poId: null });
    setMaterialName('');
    setQty('');
  };

  const patch = (key: number, change: (row: Row) => Partial<Row>) =>
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...change(row) } : row)));

  const removeRow = (key: number) => {
    setRows((current) => current.filter((row) => row.key !== key));
    void loadPickList(pickDate); // 발주연동이었다면 다시 가져올 수 있게
  };

  const submit = async () => {
    const chosen = rowsRef.current.filter((row) => row.checked);
    setSaving(true);
    try {
      const registered = await registerReceivings(receiveDate, chosen, false);
      setMessage({ text: `${registered}건 등록되었습니다 — 서류는 서류등록 탭에서 붙여주세요`, ok: true });
      setRows((current) => current.filter((row) => !row.checked));
      onRegistered(receiveDate);
      void loadPickList(pickDate);
    } catch (requestError) {
      setMessage({ text: errorText(requestError, '등록 실패'), ok: false });
    } finally {
      setSaving(false);
    }
  };

  const confirm = () => {
    const chosen = rowsRef.current.filter((row) => row.checked);
    if (!receiveDate) {
      setMessage({ text: '입고일을 선택해주세요', ok: false });
      return;
    }
    if (chosen.length === 0) {
      setMessage({ text: '선택된 품목이 없어요', ok: false });
      return;
    }
    // 단가가 없으면 등록하지 않는다(매입 합계·재고금액이 모르게 빠진다)
    const missing = noPriceMessage(chosen);
    if (missing) {
      setAlertText(missing);
      return;
    }
    // 원재료BOM 단가와 다른 품목이 있으면 확정 전에 알려준다
    const mismatch = priceMismatchMessage(chosen, bomPriceOf);
    if (mismatch) {
      setAskMismatch(mismatch);
      return;
    }
    void submit();
  };

  const allChecked = rows.length > 0 && rows.every((row) => row.checked);
  const total = stagingTotal(rows);

  const pickColumns = useMemo<F1GridColumn<PickRow>[]>(() => [
    { field: 'id', type: 'rownumber', width: 56, headerName: '순번', headerAlign: 'center', align: 'center', pinned: 'left' },
    { field: 'orderDate', headerName: '발주일', width: 110, headerAlign: 'center', align: 'center' },
    { field: 'clientName', headerName: '거래처', flex: 1, width: 140, headerAlign: 'center', align: 'left', renderCell: ({ row }) => row.clientName || '' },
    { field: 'label', headerName: '품목', flex: 1.4, width: 200, headerAlign: 'center', align: 'left' },
    { field: 'qty', headerName: '수량', width: 90, headerAlign: 'center', align: 'right', renderCell: ({ row }) => formatQty(row.qty) },
    {
      field: 'materialCode', headerName: '', width: 96, headerAlign: 'center', align: 'center', pinned: 'right',
      renderCell: ({ row }) => <Button size="small" variant="outlined" sx={{ minWidth: 0, px: 1, py: 0 }} onClick={() => pick(row)}>가져오기</Button>,
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [pickDate]);

  const columns = useMemo<F1GridColumn<Row>[]>(() => [
    { field: 'key', type: 'rownumber', width: 56, headerName: '순번', headerAlign: 'center', align: 'center', pinned: 'left' },
    {
      field: 'checked', headerName: '선택', width: 56, headerAlign: 'center', align: 'center',
      renderCell: ({ row }) => (
        <Checkbox size="small" checked={row.checked} onChange={(event) => patch(row.key, () => ({ checked: event.target.checked }))}
          slotProps={{ input: { 'aria-label': `${row.materialName} 선택` } }} />
      ),
    },
    { field: 'clientName', headerName: '거래처', width: 120, headerAlign: 'center', align: 'left' },
    {
      field: 'materialName', headerName: '품목', flex: 1, width: 170, headerAlign: 'center', align: 'left',
      renderCell: ({ row }) => (
        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', minWidth: 0 }}>
          <span>{row.materialName}</span>
          {row.poId ? <Chip size="small" color="success" variant="outlined" label="발주연동" /> : null}
        </Box>
      ),
    },
    { field: 'qty', headerName: '수량', width: 80, headerAlign: 'center', align: 'right', renderCell: ({ row }) => formatQty(Number(row.qty)) },
    {
      field: 'unitPrice', headerName: '단가(입력)', width: 130, headerAlign: 'center', align: 'right',
      renderCell: ({ row }) => {
        const bom = bomPriceOf(row.materialCode);
        const differs = priceDiffers(row.unitPrice, bom);
        return (
          <TextField {...cellInputProps}
            size="small" margin="none" type="number" placeholder="단가" value={row.unitPrice ?? ''}
            helperText={differs ? `BOM단가 ${formatMoney(bom)}원과 다름` : undefined}
            slotProps={{ htmlInput: { step: '0.0001', 'aria-label': `${row.materialName} 단가`, title: differs ? `원재료BOM단가(${formatMoney(bom)}원)와 달라요` : undefined }, formHelperText: { sx: { m: 0, fontSize: 10, lineHeight: 1.2, color: 'warning.main' } } }}
            sx={{ ...inputSx, width: 116, ...(differs ? { '& .MuiOutlinedInput-root': { bgcolor: 'rgba(245, 158, 11, 0.12)' }, '& fieldset': { borderColor: 'warning.main' } } : {}) }}
            onChange={(event) => patch(row.key, (current) => {
              const next = { ...current, unitPrice: event.target.value };
              return { unitPrice: event.target.value, totalInput: String(itemCalc(next).total ?? '') };
            })}
          />
        );
      },
    },
    {
      field: 'taxType', headerName: '과세구분', width: 90, headerAlign: 'center', align: 'center',
      renderCell: ({ row }) => (
        <TextField {...cellInputProps} select size="small" margin="none" value={row.taxType} sx={{ ...inputSx, width: 76 }}
          slotProps={{ htmlInput: { 'aria-label': `${row.materialName} 과세구분` } }}
          onChange={(event) => patch(row.key, (current) => {
            const next = { ...current, taxType: event.target.value as TaxType };
            return { taxType: next.taxType, totalInput: String(itemCalc(next).total ?? '') };
          })}>
          {TAX_TYPES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
        </TextField>
      ),
    },
    { field: 'poId', headerName: '공급가액', width: 100, headerAlign: 'center', align: 'right', renderCell: ({ row }) => formatMoney(itemCalc(row).supply) },
    { field: 'maxQty', headerName: '부가세', width: 90, headerAlign: 'center', align: 'right', renderCell: ({ row }) => formatMoney(itemCalc(row).vat) },
    {
      field: 'totalInput', headerName: '합계(입력)', width: 130, headerAlign: 'center', align: 'right',
      renderCell: ({ row }) => (
        <TextField {...cellInputProps}
          size="small" margin="none" type="number" placeholder="합계직접입력" value={row.totalInput}
          slotProps={{ htmlInput: { step: '1', 'aria-label': `${row.materialName} 합계` } }} sx={{ ...inputSx, width: 116 }}
          onChange={(event) => patch(row.key, (current) => {
            // 합계를 지우면 단가도 비운다. 숫자가 아니면 단가는 그대로 둔다
            const price = unitPriceFromTotal(event.target.value, current.qty);
            return { totalInput: event.target.value, ...(price === null ? {} : { unitPrice: price }) };
          })}
        />
      ),
    },
    {
      field: 'returnReason', headerName: '', width: 52, headerAlign: 'center', align: 'center', pinned: 'right',
      renderCell: ({ row }) => (
        <IconButton size="small" color="error" aria-label={`${row.materialName} 빼기`} onClick={() => removeRow(row.key)}>
          <CloseIcon fontSize="small" />
        </IconButton>
      ),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [bomPriceOf, pickDate]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth={false} slotProps={{ paper: { sx: { width: 'min(1100px, 96vw)' } } }} aria-labelledby="recv-dialog-title">
      <DialogTitle id="recv-dialog-title" sx={{ fontSize: 16, fontWeight: 700 }}>입고 등록</DialogTitle>
      <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
        <Autocomplete
          freeSolo options={vendors} value={clientName} inputValue={clientName}
          onInputChange={(_event, value) => setClientName(value)}
          renderInput={(params) => <TextField {...params} size="small" margin="none" label="거래처" placeholder="직접 추가할 품목의 거래처명 입력" />}
        />
        <Typography variant="caption" color="text.secondary" sx={{ mt: -0.75 }}>
          발주내역에서 가져온 품목은 그 발주건의 거래처를 그대로 사용해요. 직접 품목을 추가할 때만 이 칸의 거래처가 쓰여요.
        </Typography>

        <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.25 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
            <Typography sx={{ fontSize: 14, fontWeight: 700, mr: 'auto' }}>발주내역에서 가져오기</Typography>
            <TextField type="date" size="small" margin="none" value={pickDate} onChange={(event) => setPickDate(event.target.value)}
              slotProps={{ htmlInput: { 'aria-label': '가져올 발주일' } }} sx={{ width: 160 }} />
            <Button size="small" variant="contained" onClick={() => void loadPickList(pickDate)}>조회</Button>
            <Button size="small" variant="outlined" onClick={() => { setPickDate(''); void loadPickList(''); }}>전체보기</Button>
            <Button size="small" variant="contained" onClick={() => void pickAll()}>전체 가져오기</Button>
          </Box>
          {pickRows.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              {pickDate ? '이 날짜에 가져올 수 있는 발주내역이 없습니다' : '가져올 수 있는 발주내역이 없습니다'}
            </Typography>
          )}
          <Box sx={{ height: 170 }}>
            <F1Grid rows={pickRows.slice(0, 30)} columns={pickColumns} rowKey="id" storageKey="pu-recv-po-pick-grid" ariaLabel="F1-GRID 가져올 발주"
              height="100%" maxHeight="100%" rowHeight={32} minRowHeight={32} maxRowHeight={320} columnLine showCheckbox={false}
              resizableRows={false} allowAddRowInContextMenu={false} allowDuplicateRowInContextMenu={false} allowDeleteRowInContextMenu={false} />
          </Box>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr) auto', gap: 1, alignItems: 'center' }}>
          <Autocomplete
            freeSolo options={materials.map((m) => m.name)} value={materialName} inputValue={materialName}
            onInputChange={(_event, value) => setMaterialName(value)}
            renderInput={(params) => <TextField {...params} size="small" margin="none" label="품목" placeholder="원재료명 입력" />}
          />
          <TextField type="number" size="small" margin="none" label="수량" placeholder="예: 500" value={qty} onChange={(event) => setQty(event.target.value)} />
          <Button variant="outlined" startIcon={<AddIcon />} onClick={addManual}>목록에 추가</Button>
        </Box>
        <Typography variant="caption" color="text.secondary">
          단가를 입력하면 공급가액·부가세·합계가 자동 계산돼요. 반대로 합계금액만 알고 있다면 합계칸에 바로 입력해도 단가가 자동으로 역산돼요.
          과세구분이 면세·영세면 부가세는 0원이에요. 거래명세서 등 서류는 서류등록 탭에서 붙입니다 — 나중에 받는 일이 많아서예요.
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <FormControlLabel
            control={<Checkbox size="small" checked={allChecked} disabled={rows.length === 0}
              onChange={(event) => setRows((current) => current.map((row) => ({ ...row, checked: event.target.checked })))} />}
            label={<Typography variant="body2">전체 선택</Typography>} sx={{ m: 0 }}
          />
          <Typography sx={{ ml: 'auto', fontWeight: 700, fontSize: 13 }} aria-label="입고 선택 합계">선택 합계: {formatMoney(total)}원</Typography>
        </Box>
        {rows.length === 0 && <Typography variant="body2" color="text.secondary">추가된 품목이 없습니다</Typography>}
        <Box sx={{ height: 240 }}>
          <F1Grid rows={rows} columns={columns} rowKey="key" storageKey="pu-recv-staging-grid" ariaLabel="F1-GRID 입고 등록 품목"
            height="100%" maxHeight="100%" rowHeight={52} minRowHeight={52} maxRowHeight={320} columnLine showCheckbox={false}
            resizableRows={false} allowAddRowInContextMenu={false} allowDuplicateRowInContextMenu={false} allowDeleteRowInContextMenu={false} />
        </Box>
        <TextField type="date" size="small" margin="none" label="입고일" value={receiveDate} onChange={(event) => setReceiveDate(event.target.value)}
          slotProps={{ inputLabel: { shrink: true } }} sx={{ maxWidth: 220 }} />
        {message && <Alert severity={message.ok ? 'success' : 'error'}>{message.text}</Alert>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>닫기</Button>
        <Button variant="contained" disabled={saving} onClick={confirm}>선택 항목 확정</Button>
      </DialogActions>
      <ConfirmDialog open={alertText != null} title="입고 등록" message={alertText ?? ''} alertOnly
        onCancel={() => setAlertText(null)} onConfirm={() => setAlertText(null)} />
      <ConfirmDialog open={askMismatch != null} title="단가 확인" message={askMismatch ?? ''} confirmLabel="그대로 진행"
        onCancel={() => setAskMismatch(null)} onConfirm={() => { setAskMismatch(null); void submit(); }} />
    </Dialog>
  );
}

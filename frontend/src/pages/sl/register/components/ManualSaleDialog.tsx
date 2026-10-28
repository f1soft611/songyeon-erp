import { useEffect, useState } from 'react';
import { Alert, Autocomplete, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography } from '@mui/material';
import { todayDash } from '../../../../shared/utils/excelFile';
import { fetchClientNames } from '../../../co/master/item-master/services/itemMaster.service';
import { fetchOrderProducts } from '../../../sales/order/order-register/services/salesOrder.service';
import { createManualSale } from '../services/salesRegister.service';
import type { ManualSaleForm } from '../utils/salesRegister';

const errorText = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

const emptyForm = (): ManualSaleForm => ({ saleDate: todayDash(), clientName: '', productName: '', qty: '', unitPrice: '', note: '' });

// 판매 직접 등록 (송연 #sreg-manual-overlay). 출하등록을 거치지 않고 판 것을 적는다.
// 거래처·품목은 적어둔 것에서 고르게 돕는다. 손으로 적으면 이름이 조금씩 달라져서(㈜/(주)) 거래처별로 묶을 때 흩어진다.
// 그래도 목록에 없는 이름을 손으로 적을 수 있다(송연과 같음).
export function ManualSaleDialog({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<ManualSaleForm>(emptyForm);
  const [clients, setClients] = useState<string[]>([]);
  const [products, setProducts] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(emptyForm());
    setMessage('');
    // 목록을 못 받아도 손으로 적을 수 있다
    fetchClientNames().then(setClients).catch(() => undefined);
    fetchOrderProducts().then((list) => setProducts(list.map((item) => item.display).filter(Boolean))).catch(() => undefined);
  }, [open]);

  const set = (key: keyof ManualSaleForm) => (value: string) => setForm((current) => ({ ...current, [key]: value }));

  const save = async () => {
    setSaving(true);
    try {
      await createManualSale(form);
      onSaved();
    } catch (requestError) {
      setMessage(errorText(requestError, '등록하지 못했어요'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth={false} slotProps={{ paper: { sx: { width: 'min(480px, 96vw)' } } }} aria-labelledby="manual-sale-title">
      <DialogTitle id="manual-sale-title" sx={{ fontSize: 16, fontWeight: 700 }}>판매 직접 등록</DialogTitle>
      <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Typography variant="body2" color="text.secondary">출하등록을 거치지 않고 판 것을 적어요. 단가를 비우면 단가관리의 판매단가를 씁니다.</Typography>
        <TextField
          type="date" size="small" margin="none" label="판매일자" value={form.saleDate}
          onChange={(event) => set('saleDate')(event.target.value)} slotProps={{ inputLabel: { shrink: true } }}
        />
        <Autocomplete
          freeSolo options={clients} value={form.clientName} inputValue={form.clientName}
          onInputChange={(_event, value) => set('clientName')(value)}
          renderInput={(params) => <TextField {...params} size="small" margin="none" label="거래처" placeholder="거래처 이름" />}
        />
        <Autocomplete
          freeSolo options={products} value={form.productName} inputValue={form.productName}
          onInputChange={(_event, value) => set('productName')(value)}
          renderInput={(params) => <TextField {...params} size="small" margin="none" label="품목명" placeholder="품명(규격)" />}
        />
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1.5 }}>
          <TextField size="small" margin="none" label="수량" placeholder="예: 100" value={form.qty} onChange={(event) => set('qty')(event.target.value)} />
          <TextField size="small" margin="none" label="단가" placeholder="비우면 판매단가" value={form.unitPrice} onChange={(event) => set('unitPrice')(event.target.value)} />
        </Box>
        <TextField size="small" margin="none" label="메모" placeholder="비워도 돼요" value={form.note} onChange={(event) => set('note')(event.target.value)} />
        {message && <Alert severity="error">{message}</Alert>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>닫기</Button>
        <Button variant="contained" disabled={saving} onClick={() => void save()}>등록</Button>
      </DialogActions>
    </Dialog>
  );
}

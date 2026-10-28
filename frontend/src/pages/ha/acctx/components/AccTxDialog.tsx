import { useEffect, useState } from 'react';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, TextField, Typography } from '@mui/material';
import type { AccBank, AccCard, AccSubject } from '../../accbasic/utils/accBasic';
import { saveTransaction } from '../services/accTx.service';
import {
  TX_METHODS, bankOptions, cardOptions, emptyTxForm, subjectOptions, txBody, txFormOf, type AccTransaction, type TxForm,
} from '../utils/accTx';

const errorText = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;
const pair = { display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, columnGap: 1.5 } as const;

// 입금 · 출금 적기 / 고치기 (송연 acctx-modal)
export type TxTarget = { row: AccTransaction | null; today: string };
export function AccTxDialog({ target, subjects, banks, cards, onClose, onSaved }: {
  target: TxTarget | null;
  subjects: AccSubject[];
  banks: AccBank[];
  cards: AccCard[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<TxForm>(emptyTxForm(''));
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!target) return;
    setForm(target.row ? txFormOf(target.row) : emptyTxForm(target.today));
    setMsg('');
  }, [target]);

  const row = target?.row ?? null;
  const set = (key: keyof TxForm) => (event: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: event.target.value }));
  const select = (key: keyof TxForm, label: string, options: { value: number | string; label: string }[], none = true) => (
    <TextField select fullWidth size="small" margin="dense" label={label} value={form[key]} onChange={set(key)}
      slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }}>
      {none && <MenuItem value="">안 정함</MenuItem>}
      {options.map((o) => <MenuItem key={o.value} value={String(o.value)}>{o.label}</MenuItem>)}
    </TextField>
  );

  const save = async () => {
    setBusy(true);
    try {
      await saveTransaction(row ? row.id : null, txBody(form));
      onSaved();
    } catch (requestError) {
      setMsg(errorText(requestError, '저장하지 못했어요'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={Boolean(target)} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{row ? '입금·출금 고치기' : '입금·출금 적기'}</DialogTitle>
      <DialogContent>
        <Box sx={pair}>
          {select('kind', '구분', [{ value: '입금', label: '입금 (들어온 돈)' }, { value: '출금', label: '출금 (나간 돈)' }], false)}
          <TextField fullWidth size="small" margin="dense" type="date" label="날짜" value={form.txDate} onChange={set('txDate')}
            slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: '9999-12-31', 'aria-label': '날짜' } }} />
        </Box>
        <Box sx={pair}>
          <TextField fullWidth size="small" margin="dense" label="거래처" placeholder="공과금·급여처럼 없으면 비워두세요" value={form.clientName} onChange={set('clientName')}
            slotProps={{ inputLabel: { shrink: true }, htmlInput: { 'aria-label': '거래처' } }} />
          <TextField fullWidth size="small" margin="dense" type="number" label="금액" value={form.amount} onChange={set('amount')}
            slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: 0, step: 1, 'aria-label': '금액' } }} />
        </Box>
        {select('subjectId', '계정과목', subjectOptions(subjects, row?.subjectId))}
        <Box sx={pair}>
          {select('method', '수단', TX_METHODS.map((m) => ({ value: m, label: m })), false)}
          {select('bankAccountId', '계좌', bankOptions(banks, row?.bankAccountId))}
        </Box>
        {select('cardId', '카드', cardOptions(cards, row?.cardId))}
        <TextField fullWidth size="small" margin="dense" label="비고" placeholder="안 적어도 돼요" value={form.note} onChange={set('note')}
          slotProps={{ inputLabel: { shrink: true }, htmlInput: { 'aria-label': '비고' } }} />
        {msg && <Typography role="status" sx={{ mt: 1, fontSize: 12.5, fontWeight: 700, color: 'error.main' }}>{msg}</Typography>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>닫기</Button>
        <Button variant="contained" disabled={busy} onClick={() => void save()}>{row ? '저장' : '등록'}</Button>
      </DialogActions>
    </Dialog>
  );
}

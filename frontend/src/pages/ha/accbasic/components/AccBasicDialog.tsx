import { useEffect, useState } from 'react';
import { Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, MenuItem, TextField, Typography } from '@mui/material';
import { saveAcc } from '../services/accBasic.service';
import {
  KIND_LABEL, SUBJECT_CATEGORIES, accBody, accFormOf, directionOf, emptyAccForm, payAccountOptions,
  type AccBank, type AccCard, type AccForm, type AccKind, type AccRow,
} from '../utils/accBasic';

const errorText = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

// 송연: 셋이 하는 일이 같아서(적어두고 · 고치고 · 사용안함으로 내린다) 창은 하나만 두고 칸 묶음만 갈아끼운다.
// 창을 셋 만들면 고칠 때 세 곳을 똑같이 고쳐야 하고, 한 곳을 빠뜨리면 그 탭만 조용히 다르게 된다.
export type AccTarget = { kind: AccKind; row: AccRow | null };
export function AccBasicDialog({ target, banks, onClose, onSaved }: {
  target: AccTarget | null;
  banks: AccBank[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<AccForm>(emptyAccForm);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!target) return;
    setForm(accFormOf(target.kind, target.row));
    setMsg('');
  }, [target]);

  const kind = target?.kind ?? 'subject';
  const editing = Boolean(target?.row);
  const set = (key: keyof AccForm) => (event: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: event.target.value }));
  const field = (key: keyof AccForm, label: string, placeholder = '안 적어도 돼요', extra: Record<string, unknown> = {}) => (
    <TextField fullWidth size="small" margin="dense" label={label} placeholder={placeholder} value={form[key] as string} onChange={set(key)}
      slotProps={{ inputLabel: { shrink: true }, htmlInput: { 'aria-label': label, ...extra } }} />
  );
  const hint = (text: string) => <Typography sx={{ fontSize: 11.5, color: 'text.secondary', mb: 1 }}>{text}</Typography>;

  const save = async () => {
    if (!target) return;
    setBusy(true);
    try {
      await saveAcc(kind, target.row ? target.row.id : null, accBody(kind, form));
      onSaved();
    } catch (requestError) {
      setMsg(errorText(requestError, '저장하지 못했어요'));
    } finally {
      setBusy(false);
    }
  };

  const currentBank = target?.kind === 'card' && target.row ? (target.row as AccCard).bankAccountId : null;
  return (
    <Dialog open={Boolean(target)} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{`${KIND_LABEL[kind]} ${editing ? '고치기' : '추가'}`}</DialogTitle>
      <DialogContent>
        {kind === 'subject' && (
          <>
            {field('code', '계정코드', '예: 511')}
            {field('name', '계정과목', '예: 복리후생비')}
            <TextField select fullWidth size="small" margin="dense" label="구분" value={form.category} onChange={set('category')} slotProps={{ inputLabel: { shrink: true } }}>
              {SUBJECT_CATEGORIES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </TextField>
            {hint(`늘어날 때 차변인지 대변인지는 구분에서 따라 나와요. 따로 고르지 않아도 돼요. (${form.category}: ${directionOf(form.category)})`)}
            {field('note', '비고')}
          </>
        )}
        {kind === 'bank' && (
          <>
            {field('bankName', '은행', '예: 농협')}
            {field('accountNo', '계좌번호', '예: 301-1234-5678-91')}
            {field('holder', '예금주', '예: 송연에스와이')}
            {field('purpose', '용도', '예: 매출입금용 / 급여이체용')}
            {field('note', '비고')}
          </>
        )}
        {kind === 'card' && (
          <>
            {field('issuer', '카드사', '예: 신한')}
            {field('last4', '뒤 4자리', '예: 4821', { maxLength: 4, inputMode: 'numeric' })}
            {hint('앞자리는 받지 않아요. 카드 매입명세를 맞춰볼 때 쓰는 것이 뒤 4자리예요.')}
            {field('nickname', '카드 이름', '예: 영업부 법인카드')}
            {field('holder', '명의', '예: 송연에스와이')}
            <TextField select fullWidth size="small" margin="dense" label="결제계좌" value={form.bankAccountId} onChange={set('bankAccountId')}
              slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }}>
              <MenuItem value="">안 정함</MenuItem>
              {payAccountOptions(banks, currentBank).map((o) => <MenuItem key={o.value} value={String(o.value)}>{o.label}</MenuItem>)}
            </TextField>
            {field('note', '비고')}
          </>
        )}
        <FormControlLabel sx={{ mt: 1 }}
          control={<Checkbox size="small" checked={form.active} onChange={(event) => setForm((f) => ({ ...f, active: event.target.checked }))} />}
          label={<Typography sx={{ fontSize: 12.5 }}>사용함 (체크를 풀면 목록에서 내려가고, 고를 수 없게 돼요)</Typography>} />
        {msg && <Typography role="status" sx={{ mt: 0.5, fontSize: 12.5, fontWeight: 700, color: 'error.main' }}>{msg}</Typography>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>닫기</Button>
        <Button variant="contained" disabled={busy} onClick={() => void save()}>{editing ? '저장' : '등록'}</Button>
      </DialogActions>
    </Dialog>
  );
}

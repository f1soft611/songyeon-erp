import { useEffect, useState } from 'react';
import { Box, Button, Dialog, DialogContent, DialogTitle, IconButton, TextField, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { NamePicker } from '../../accsales/components/TradeSearchDialog';

const errorText = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

export type LedgerSearch = { start: string; end: string; clients: string[] };

// 거래처별관리대장 조회 창(송연 #ledger-search-overlay). 거래처를 검색해서 하나씩 담는다(매출·매입관리와 같은 칸).
// 여기는 매출·매입과 달리 한 곳 이상 반드시 담아야 한다
export function LedgerSearchDialog({ open, title, value, clients, onChange, onClose, onSearch, onAlert }: {
  open: boolean;
  title: string;
  value: LedgerSearch;
  clients: string[];
  onChange: (next: LedgerSearch) => void;
  onClose: () => void;
  onSearch: () => Promise<void>;
  onAlert: (message: string) => void;
}) {
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) setMsg('');
  }, [open]);
  const run = async () => {
    setMsg('');
    setBusy(true);
    try {
      await onSearch();
    } catch (requestError) {
      setMsg(errorText(requestError, '조회하지 못했어요'));
    } finally {
      setBusy(false);
    }
  };
  const date = (label: string, key: 'start' | 'end') => (
    <TextField size="small" margin="dense" type="date" label={label} value={value[key]} onChange={(event) => onChange({ ...value, [key]: event.target.value })}
      sx={{ flex: 1 }} slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: '9999-12-31', 'aria-label': label } }} />
  );

  return (
    <Dialog open={open} onClose={onClose} fullWidth slotProps={{ paper: { sx: { maxWidth: 560 } } }}>
      <DialogTitle sx={{ fontSize: 14.5, fontWeight: 700, pr: 6 }}>
        {title}
        <IconButton aria-label="닫기" onClick={onClose} size="small" sx={{ position: 'absolute', right: 10, top: 10 }}><CloseIcon fontSize="small" /></IconButton>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', gap: 1.5, mb: 1 }}>
          {date('시작일', 'start')}
          {date('종료일', 'end')}
        </Box>
        <NamePicker
          name="거래처" unit="곳" list={clients} picked={value.clients} onChange={(next) => onChange({ ...value, clients: next })} onAlert={onAlert}
          title={<>거래처 <Box component="span" sx={{ fontWeight: 400, color: 'text.secondary', fontSize: 11.5 }}>(한 곳 이상)</Box></>}
          emptyHint="거래처를 한 곳 이상 담아주세요" placeholder="거래처 검색" listHeight={170}
        />
        <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 1, mb: 1.5 }}>
          담은 거래처가 잔액이 큰 곳부터 줄줄이 나와요. 줄을 누르면 품목별 내역이 펼쳐집니다.
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Button variant="contained" disabled={busy} onClick={() => void run()}>조회</Button>
          <Typography role="alert" sx={{ fontSize: 12.5, color: 'error.main' }}>{msg}</Typography>
        </Box>
      </DialogContent>
    </Dialog>
  );
}

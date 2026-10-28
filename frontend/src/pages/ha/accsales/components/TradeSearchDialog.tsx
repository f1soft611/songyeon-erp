import { useEffect, useState, type ReactNode } from 'react';
import {
  Box, Button, Dialog, DialogContent, DialogTitle, FormControlLabel, IconButton, Radio, RadioGroup, TextField, Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { PICKER_LIMIT, UNIT_OPTIONS, VIEW_OPTIONS, josaIGa, type TradeSearch, type TradeUnit, type TradeView } from '../utils/accSales';

const errorText = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;
const smallBtn = { minWidth: 0, px: 1, py: 0.25, fontSize: 11, whiteSpace: 'nowrap' } as const;
const boxLine = { border: '1px solid', borderColor: 'divider', borderRadius: 1 } as const;

// 검색해서 하나씩 담는 칸(송연 01-core.js makePicker). 거래처가 천 곳, 제품이 천 개가 넘어서 체크만 해두면 무엇을 골랐는지 보려고
// 다시 천 줄을 훑어야 한다. 담은 것은 위에 모아 보여주고 거기서 바로 뺀다
export function NamePicker({ name, unit, list, picked, onChange, onAlert, title, emptyHint = '안 담으면 전체', placeholder = '검색', listHeight = 150 }: {
  name: string;
  title?: ReactNode;
  emptyHint?: string;
  placeholder?: string;
  listHeight?: number;
  unit: string;
  list: string[];
  picked: string[];
  onChange: (next: string[]) => void;
  onAlert: (message: string) => void;
}) {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const rows = list.filter((n) => !q || n.toLowerCase().includes(q));
  const has = new Set(picked);
  // '모두 담기' 는 지금 검색으로 걸러진 것만 담는다. 검색을 비운 채 누르면 다 담기는데, 다 담긴 것과 안 담은 것(전체)은 뜻이 다르다
  const addAll = () => {
    if (!q) {
      onAlert('먼저 검색해서 좁혀주세요.');
      return;
    }
    onChange([...picked, ...rows.filter((n, i) => !has.has(n) && rows.indexOf(n) === i)]);
  };
  return (
    <Box role="group" aria-label={`${name} 담기`}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 0.75 }}>
        <Typography sx={{ fontWeight: 700, fontSize: 13 }}>{title ?? name}</Typography>
        {/* 비우기는 담은 것이 있을 때만. 자리는 잡아둬야 제목 줄이 안 흔들린다 */}
        <Button variant="outlined" size="small" sx={{ ...smallBtn, visibility: picked.length ? 'visible' : 'hidden' }} onClick={() => onChange([])}>
          비우기 {picked.length}
        </Button>
      </Box>
      <Box aria-label={`담은 ${name}`} sx={{ ...boxLine, display: 'flex', flexWrap: 'wrap', gap: 0.6, alignItems: 'center', minHeight: 30, maxHeight: 76, overflowY: 'auto', px: 1, py: 0.75, mb: 0.75 }}>
        {picked.length === 0 ? (
          <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>{emptyHint}</Typography>
        ) : picked.map((n) => (
          <Box key={n} title={n} sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, bgcolor: 'rgba(15,118,110,0.1)', color: '#0f766e', borderRadius: 1, px: 0.9, py: 0.4, fontSize: 11, maxWidth: '100%' }}>
            <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n}</Box>
            <Box component="button" type="button" aria-label={`${n} 빼기`} title="빼기" onClick={() => onChange(picked.filter((x) => x !== n))}
              sx={{ border: 'none', background: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 700, p: 0, lineHeight: 1, flexShrink: 0 }}>✕</Box>
          </Box>
        ))}
      </Box>
      <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center', mb: 0.75 }}>
        <TextField size="small" margin="none" placeholder={placeholder} value={query} onChange={(event) => setQuery(event.target.value)} sx={{ flex: 1, minWidth: 0 }}
          slotProps={{ htmlInput: { 'aria-label': `${name} 검색` } }} />
        <Button variant="outlined" size="small" sx={{ ...smallBtn, py: 0.6 }} title="검색으로 걸러진 것을 모두 담아요" onClick={addAll}>모두 담기</Button>
      </Box>
      <Box aria-label={`${name} 목록`} sx={{ ...boxLine, height: listHeight, overflowY: 'auto', px: 0.9, py: 0.6 }}>
        {rows.length === 0 ? (
          <Typography sx={{ fontSize: 12, color: 'text.secondary', p: 0.5 }}>해당하는 {name}{josaIGa(name)} 없습니다</Typography>
        ) : (
          <>
            {rows.slice(0, PICKER_LIMIT).map((n, i) => {
              const on = has.has(n);
              return (
                <Box key={`${n}-${i}`} role="button" aria-label={`${n} ${on ? '담김' : '담기'}`} title={n} onClick={on ? undefined : () => onChange([...picked, n])}
                  sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 0.75, fontSize: 12, px: 0.6, py: 0.5, borderRadius: 1,
                    cursor: on ? 'default' : 'pointer', color: on ? 'text.secondary' : 'inherit', '&:hover': on ? undefined : { bgcolor: 'action.hover' } }}>
                  <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n}</Box>
                  <Box component="span" sx={{ fontSize: 11, whiteSpace: 'nowrap', color: on ? 'text.secondary' : 'primary.main' }}>{on ? '담김' : '담기'}</Box>
                </Box>
              );
            })}
            {/* 말 없이 잘라내면 없는 거래처(품목)로 읽힌다. 몇 개 중 몇 개인지 적어둔다 */}
            {rows.length > PICKER_LIMIT && (
              <Typography sx={{ fontSize: 11, color: 'text.secondary', p: 0.6 }}>{rows.length}{unit} 중 {PICKER_LIMIT}{unit} — 검색으로 좁혀주세요</Typography>
            )}
          </>
        )}
      </Box>
    </Box>
  );
}

// 매출관리 · 매입관리 조회 창(송연 #accm-search-overlay). 기간 · 보기 · 단위를 한 줄에 펴고 아래에 거래처 · 품목 담는 칸을 좌우로 둔다
// (위아래로 쌓으면 창이 화면보다 길어져 품목을 담으려면 스크롤을 내려야 한다)
export function TradeSearchDialog({ open, title, itemLabel, value, clients, items, onChange, onClose, onSearch, onAlert }: {
  open: boolean;
  title: string;
  itemLabel: string;
  value: TradeSearch;
  clients: string[];
  items: string[];
  onChange: (next: TradeSearch) => void;
  onClose: () => void;
  onSearch: () => Promise<void>;
  onAlert: (message: string) => void;
}) {
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (patch: Partial<TradeSearch>) => onChange({ ...value, ...patch });
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
  const radios = <T extends string>(label: string, current: T, options: { value: T; label: string }[], onPick: (v: T) => void) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>{label}</Typography>
      <RadioGroup row aria-label={label} value={current} onChange={(event) => onPick(event.target.value as T)}>
        {options.map((o) => (
          <FormControlLabel key={o.value} value={o.value} control={<Radio size="small" sx={{ p: 0.5 }} />} label={o.label}
            sx={{ mr: 1.25, ml: 0, '& .MuiFormControlLabel-label': { fontSize: 12.5 } }} />
        ))}
      </RadioGroup>
    </Box>
  );

  return (
    <Dialog open={open} onClose={onClose} fullWidth slotProps={{ paper: { sx: { maxWidth: 760 } } }}>
      <DialogTitle sx={{ fontSize: 14.5, fontWeight: 700, pr: 6 }}>
        {title}
        <IconButton aria-label="닫기" onClick={onClose} size="small" sx={{ position: 'absolute', right: 10, top: 10 }}><CloseIcon fontSize="small" /></IconButton>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', gap: 2.25, flexWrap: 'wrap', alignItems: 'center', pb: 1.5, borderBottom: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center' }}>
            <TextField size="small" margin="none" type="date" value={value.start} onChange={(event) => set({ start: event.target.value })} sx={{ width: 150 }}
              slotProps={{ htmlInput: { max: '9999-12-31', 'aria-label': '시작일' } }} />
            <Box component="span" sx={{ color: 'text.secondary' }}>~</Box>
            <TextField size="small" margin="none" type="date" value={value.end} onChange={(event) => set({ end: event.target.value })} sx={{ width: 150 }}
              slotProps={{ htmlInput: { max: '9999-12-31', 'aria-label': '종료일' } }} />
          </Box>
          {radios<TradeView>('보기', value.view, VIEW_OPTIONS, (view) => set({ view }))}
          {/* 기간 단위는 집계와 전년동기간비교에만 쓴다. 내역은 한 줄이 한 건이라 묶을 것이 없다 */}
          {value.view !== 'detail' && radios<TradeUnit>('단위', value.unit, UNIT_OPTIONS, (unit) => set({ unit }))}
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 2, mt: 1.5 }}>
          <NamePicker name="거래처" unit="곳" list={clients} picked={value.clients} onChange={(next) => set({ clients: next })} onAlert={onAlert} />
          <NamePicker name={itemLabel} unit="개" list={items} picked={value.items} onChange={(next) => set({ items: next })} onAlert={onAlert} />
        </Box>
        <Box sx={{ mt: 1.75, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Button variant="contained" disabled={busy} onClick={() => void run()}>조회</Button>
          <Typography role="alert" sx={{ fontSize: 12.5, color: 'error.main' }}>{msg}</Typography>
        </Box>
      </DialogContent>
    </Dialog>
  );
}

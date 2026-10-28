import { useCallback, useState, type ReactNode } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography } from '@mui/material';
import { ConfirmDialog } from '../ConfirmDialog';

// 묻기·확인·알림 (송연 01-core.js appPrompt · appPromptPassword · appPrompt2 · appConfirm · appAlert)
// '지금 비밀번호 → 새 비밀번호' 처럼 차례로 물어야 하는 흐름이 있어 기다릴 수 있게(Promise) 만든다.
// 문서함 · 실시간 온도 · 라벨등록이 함께 쓴다.
type Field = { label: string; value: string };
type Asking =
  | { type: 'prompt'; message: string; password: boolean; resolve: (value: string | null) => void }
  | { type: 'prompt2'; message: string; first: Field; second: Field; resolve: (value: { value: string; value2: string } | null) => void }
  | { type: 'confirm'; message: string; danger: boolean; resolve: (ok: boolean) => void }
  | { type: 'alert'; message: string; resolve: () => void };

export type Ask = {
  prompt: (message: string, initial?: string) => Promise<string | null>;
  promptPassword: (message: string) => Promise<string | null>;
  prompt2: (message: string, first: Field, second: Field) => Promise<{ value: string; value2: string } | null>;
  confirm: (message: string, danger?: boolean) => Promise<boolean>;
  alert: (message: string) => Promise<void>;
  node: ReactNode;
};

export function useAsk(title: string): Ask {
  const [asking, setAsking] = useState<Asking | null>(null);
  const [value, setValue] = useState('');
  const [value2, setValue2] = useState('');

  const prompt = useCallback((message: string, initial = '') => new Promise<string | null>((resolve) => {
    setValue(initial);
    setAsking({ type: 'prompt', message, password: false, resolve });
  }), []);
  const promptPassword = useCallback((message: string) => new Promise<string | null>((resolve) => {
    setValue('');
    setAsking({ type: 'prompt', message, password: true, resolve });
  }), []);
  const prompt2 = useCallback((message: string, first: Field, second: Field) => new Promise<{ value: string; value2: string } | null>((resolve) => {
    setValue(first.value);
    setValue2(second.value);
    setAsking({ type: 'prompt2', message, first, second, resolve });
  }), []);
  const confirm = useCallback((message: string, danger = false) => new Promise<boolean>((resolve) => {
    setAsking({ type: 'confirm', message, danger, resolve });
  }), []);
  const alert = useCallback((message: string) => new Promise<void>((resolve) => {
    setAsking({ type: 'alert', message, resolve });
  }), []);

  let node: ReactNode = null;
  if (asking?.type === 'prompt' || asking?.type === 'prompt2') {
    const current = asking;
    const done = (ok: boolean) => {
      setAsking(null);
      if (current.type === 'prompt') current.resolve(ok ? value : null);
      else current.resolve(ok ? { value, value2 } : null);
    };
    // 엔터로 닫은 뒤 같은 엔터가 포커스가 돌아간 단추를 다시 누르지 않게 기본 동작을 막는다
    const onEnter = (event: React.KeyboardEvent) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        done(true);
      }
    };
    node = (
      <Dialog open onClose={() => done(false)} maxWidth="xs" fullWidth aria-labelledby="ask-prompt-title">
        <DialogTitle id="ask-prompt-title">{title}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>{current.message}</Typography>
          {current.type === 'prompt' ? (
            <TextField
              autoFocus fullWidth size="small" margin="none" type={current.password ? 'password' : 'text'} value={value}
              onChange={(event) => setValue(event.target.value)} onKeyDown={onEnter}
              slotProps={{ htmlInput: { 'aria-label': current.message, autoComplete: current.password ? 'new-password' : 'off' } }}
            />
          ) : (
            <>
              <TextField autoFocus fullWidth size="small" margin="none" label={current.first.label} value={value}
                onChange={(event) => setValue(event.target.value)} onKeyDown={onEnter}
                slotProps={{ inputLabel: { shrink: true }, htmlInput: { 'aria-label': current.first.label } }} />
              <TextField fullWidth size="small" margin="none" label={current.second.label} value={value2}
                onChange={(event) => setValue2(event.target.value)} onKeyDown={onEnter}
                slotProps={{ inputLabel: { shrink: true }, htmlInput: { 'aria-label': current.second.label } }} />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => done(false)}>취소</Button>
          <Button variant="contained" onClick={() => done(true)}>확인</Button>
        </DialogActions>
      </Dialog>
    );
  } else if (asking?.type === 'confirm') {
    const current = asking;
    const done = (ok: boolean) => { setAsking(null); current.resolve(ok); };
    node = <ConfirmDialog open title={title} message={current.message} danger={current.danger} onCancel={() => done(false)} onConfirm={() => done(true)} />;
  } else if (asking?.type === 'alert') {
    const current = asking;
    const done = () => { setAsking(null); current.resolve(); };
    node = <ConfirmDialog open title={title} message={current.message} alertOnly onCancel={done} onConfirm={done} />;
  }
  return { prompt, promptPassword, prompt2, confirm, alert, node };
}

import { useEffect, useRef, useState } from 'react';
import {
  Box, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, MenuItem, TextField, Typography,
} from '@mui/material';
import { fetchSharePeople, shareDocument } from '../services/documentBox.service';
import { shareResultText, type DocPerson } from '../utils/documentBox';

const errorText = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

type Message = { text: string; ok: boolean } | null;

const MessageLine = ({ message }: { message: Message }) =>
  message ? (
    <Typography role="status" sx={{ fontSize: 12.5, color: message.ok ? 'success.main' : 'error.main', mt: 1, whiteSpace: 'pre-line' }}>{message.text}</Typography>
  ) : null;

// ===== 파일 끌어다 놓기 칸 (송연 doc-dropzone · attachFileDrop) =====
export function DocDropZone({ onFiles, inputRef }: { onFiles: (files: File[]) => void; inputRef: React.RefObject<HTMLInputElement | null> }) {
  const [over, setOver] = useState(false);
  return (
    <Box
      role="button" tabIndex={0} aria-label="파일 끌어다 놓기"
      onClick={() => inputRef.current?.click()}
      onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') inputRef.current?.click(); }}
      onDragOver={(event) => { event.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setOver(false);
        const files = Array.from(event.dataTransfer.files || []);
        if (files.length) onFiles(files);
      }}
      sx={{
        border: '1.5px dashed', borderColor: over ? 'primary.main' : 'divider', borderRadius: 2, p: 2, textAlign: 'center',
        fontSize: 12.5, color: 'text.secondary', cursor: 'pointer', bgcolor: over ? 'action.hover' : 'transparent', mb: 1,
      }}
    >
      여기로 파일을 끌어다 놓거나 눌러서 찾아보세요
    </Box>
  );
}

// ===== 새 폴더 창 (송연 doc-folder-modal) =====
// 최상위 공용 폴더를 만들 때만 부서를 묻는다. 관리자가 아니면 자기 부서만 만들 수 있어 고를 게 없으니 잠가둔다.
export function FolderDialog({ open, title, hint, showDept, admin, myDepartment, departments, onClose, onSave }: {
  open: boolean;
  title: string;
  hint: string;
  showDept: boolean;
  admin: boolean;
  myDepartment: string;
  departments: string[];
  onClose: () => void;
  onSave: (name: string, department: string) => Promise<string | null>;
}) {
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [message, setMessage] = useState<Message>(null);

  useEffect(() => {
    if (!open) return;
    setName('');
    setMessage(null);
    setDepartment(admin ? (myDepartment && departments.includes(myDepartment) ? myDepartment : departments[0] ?? '') : myDepartment);
  }, [open, admin, myDepartment, departments]);

  const save = async () => {
    if (!name.trim()) {
      setMessage({ text: '폴더명을 입력해주세요', ok: false });
      return;
    }
    const error = await onSave(name.trim(), department);
    if (error) setMessage({ text: error, ok: false });
  };

  const deptOptions = admin
    ? [...departments.map((d) => ({ value: d, label: d })), { value: '', label: '전사 공용 (누구나)' }]
    : [{ value: myDepartment, label: myDepartment || '(부서 없음)' }];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth aria-labelledby="doc-folder-title">
      <DialogTitle id="doc-folder-title" sx={{ fontSize: 15, fontWeight: 700 }}>{title}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pt: '8px !important' }}>
        <TextField
          autoFocus size="small" margin="none" label="폴더명" placeholder="예: 2026년 공문, 위생점검" value={name}
          onChange={(event) => setName(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void save(); } }}
          slotProps={{ htmlInput: { 'aria-label': '폴더명' } }}
        />
        {showDept && (
          <TextField
            select size="small" margin="none" label="어느 부서 것인가요" value={department} disabled={!admin}
            onChange={(event) => setDepartment(event.target.value)} slotProps={{ htmlInput: { 'aria-label': '부서' } }}
          >
            {deptOptions.map((d) => <MenuItem key={d.value || '(all)'} value={d.value}>{d.label}</MenuItem>)}
          </TextField>
        )}
        {hint && <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12 }}>{hint}</Typography>}
        <MessageLine message={message} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>닫기</Button>
        <Button variant="contained" onClick={() => void save()}>만들기</Button>
      </DialogActions>
    </Dialog>
  );
}

// ===== 공유 창 (송연 doc-share-modal) =====
// 문서 하나 또는 폴더 하나를 보낸다. 폴더를 보내면 그 아래 전부가 딸려가지만 비밀번호는 딸려가지 않는다.
export type ShareTarget = { attachmentId: number | null; folderId: number | null; name: string };

export function ShareDialog({ target, onClose, onShared }: { target: ShareTarget | null; onClose: () => void; onShared: () => void }) {
  const [people, setPeople] = useState<DocPerson[] | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [expiresAt, setExpiresAt] = useState('');
  const [note, setNote] = useState('');
  const [message, setMessage] = useState<Message>(null);
  const [saving, setSaving] = useState(false);
  const closeTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!target) return;
    setPeople(null);
    setPicked([]);
    setExpiresAt('');
    setNote('');
    setMessage(null);
    fetchSharePeople().then(setPeople).catch(() => setPeople([]));
  }, [target]);
  useEffect(() => () => { if (closeTimer.current) window.clearTimeout(closeTimer.current); }, []);

  const toggle = (id: string) => setPicked((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  const save = async () => {
    if (!target) return;
    if (picked.length === 0) {
      setMessage({ text: '받을 사람을 골라주세요', ok: false });
      return;
    }
    setSaving(true);
    try {
      const result = await shareDocument({
        attachmentId: target.folderId != null ? null : target.attachmentId, folderId: target.folderId, toEmployeeIds: picked, note: note.trim(), expiresAt,
      });
      setMessage({ text: shareResultText(result), ok: true });
      onShared();
      closeTimer.current = window.setTimeout(onClose, 2200);
    } catch (requestError) {
      setMessage({ text: errorText(requestError, '공유하지 못했어요'), ok: false });
    } finally {
      setSaving(false);
    }
  };

  const isFolder = target?.folderId != null;
  return (
    <Dialog open={target != null} onClose={onClose} maxWidth="sm" fullWidth aria-labelledby="doc-share-title">
      <DialogTitle id="doc-share-title" sx={{ fontSize: 15, fontWeight: 700 }}>문서 공유</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Typography variant="body2" color="text.secondary">
          {isFolder ? '📁' : '📄'} {target?.name}{isFolder ? ' (이 폴더 안에 든 것 전부)' : ''}
        </Typography>
        <Box>
          <Typography sx={{ fontSize: 12.5, fontWeight: 700, mb: 0.5 }}>받을 사람</Typography>
          <Box aria-label="받을 사람" sx={{ maxHeight: 200, overflow: 'auto', border: 1, borderColor: 'divider', borderRadius: 1, p: 1, display: 'flex', flexWrap: 'wrap', columnGap: 1.5 }}>
            {people == null && <Typography variant="body2" color="text.secondary">불러오는 중...</Typography>}
            {people != null && people.length === 0 && <Typography variant="body2" color="text.secondary">보낼 수 있는 사람이 없습니다</Typography>}
            {(people ?? []).map((p) => (
              <FormControlLabel
                key={p.id} sx={{ mr: 0, '& .MuiFormControlLabel-label': { fontSize: 12.5 } }}
                control={<Checkbox size="small" checked={picked.includes(p.id)} onChange={() => toggle(p.id)} />}
                label={<>{p.name}{p.department && <Box component="span" sx={{ color: 'text.secondary', fontSize: 11, ml: 0.5 }}>{p.department}</Box>}</>}
              />
            ))}
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          <TextField type="date" size="small" margin="none" label="기한" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)}
            slotProps={{ inputLabel: { shrink: true }, htmlInput: { 'aria-label': '기한', max: '9999-12-31' } }} sx={{ width: 180 }} helperText="비우면 기한 없음" />
          <TextField size="small" margin="none" label="한 마디" placeholder="안 적어도 돼요" value={note} onChange={(event) => setNote(event.target.value)}
            slotProps={{ htmlInput: { 'aria-label': '한 마디' } }} sx={{ flex: 1, minWidth: 200 }} />
        </Box>
        <MessageLine message={message} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>닫기</Button>
        <Button variant="contained" disabled={saving} onClick={() => void save()}>공유하고 메신저로 알리기</Button>
      </DialogActions>
    </Dialog>
  );
}

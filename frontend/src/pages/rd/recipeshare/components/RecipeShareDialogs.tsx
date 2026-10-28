import { useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, TextField, Typography } from '@mui/material';
import { fetchDraft, fetchDrafts, fetchSalesReps } from '../../recipe/services/recipe.service';
import type { RecipeDraft, RecipeSalesRep } from '../../recipe/utils/recipe';
import { createShare, handoffVersion } from '../services/recipeShare.service';
import { HANDOFF_WHERE, handoffRecipeName, handoffVersionOptions, shareVersionOptions, type HandoffKind } from '../utils/recipeShare';

const errorText = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

type Option = { value: number; label: string };
type Msg = { text: string; ok: boolean } | null;

const msgLine = (msg: Msg) => msg && (
  <Typography role="status" sx={{ mt: 1, fontSize: 12.5, fontWeight: 700, color: msg.ok ? 'success.dark' : 'error.main' }}>{msg.text}</Typography>
);

// ===== 다음 부서로 넘기기 (송연 openRecipeHandoffModal) =====
// 어느 버전을 넘기는지 반드시 고르게 한다. 넘긴 뒤 레시피가 바뀌면 받은 쪽이 보는 것과 달라지므로 넘긴 버전은 그 자리에서 잠근다
export type HandoffTarget = { draftId: number; kind: HandoffKind };
export function RecipeHandoffDialog({ target, onClose, onDone }: {
  target: HandoffTarget | null;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const [name, setName] = useState('');
  const [options, setOptions] = useState<Option[] | null>(null);
  const [versionId, setVersionId] = useState('');
  const [msg, setMsg] = useState<Msg>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!target) return;
    let alive = true;
    setName('');
    setOptions(null);
    setVersionId('');
    setMsg(null);
    fetchDraft(target.draftId)
      .then(({ draft, versions }) => {
        if (!alive) return;
        setName(handoffRecipeName(draft.clientName, draft.name));
        const opts = handoffVersionOptions(versions || []);
        setOptions(opts);
        setVersionId(opts.length ? String(opts[0].value) : '');
      })
      .catch((requestError) => { if (alive) { setOptions([]); setMsg({ text: errorText(requestError, '레시피를 불러오지 못했어요'), ok: false }); } });
    return () => { alive = false; };
  }, [target]);

  const save = async () => {
    if (!target) return;
    if (!versionId) {
      setMsg({ text: '넘길 버전을 골라주세요', ok: false });
      return;
    }
    setBusy(true);
    try {
      const done = await handoffVersion(Number(versionId), target.kind);
      onDone(done.message || '넘겼습니다');
    } catch (requestError) {
      setMsg({ text: errorText(requestError, '넘기지 못했어요'), ok: false });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={Boolean(target)} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ pb: 0.5 }}>{target ? `"${target.kind}" 로 넘기기` : ''}</DialogTitle>
      <DialogContent>
        <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 1.5 }}>{target ? HANDOFF_WHERE[target.kind] : ''}</Typography>
        <TextField fullWidth size="small" margin="dense" label="레시피" value={name} slotProps={{ htmlInput: { readOnly: true, 'aria-label': '레시피' }, inputLabel: { shrink: true } }} />
        <TextField
          select fullWidth size="small" margin="dense" label="버전 (이 버전의 배합표가 넘어갑니다)" value={versionId}
          onChange={(event) => setVersionId(event.target.value)}
          slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true }, htmlInput: { 'aria-label': '넘길 버전' } }}
        >
          {options == null && <MenuItem value="">불러오는 중...</MenuItem>}
          {options != null && options.length === 0 && <MenuItem value="">이 레시피에는 아직 버전이 없어요</MenuItem>}
          {(options || []).map((o) => <MenuItem key={o.value} value={String(o.value)}>{o.label}</MenuItem>)}
        </TextField>
        <Alert severity="warning" icon={false} sx={{ mt: 1, py: 0.25, fontSize: 12 }}>
          넘기면 이 버전은 <b>잠겨서 더 이상 고칠 수 없습니다.</b> 고쳐야 하면 레시피 작성에서 새 버전을 만들어 주세요.
        </Alert>
        {msgLine(msg)}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>닫기</Button>
        <Button variant="contained" disabled={busy} onClick={() => void save()}>넘기기</Button>
      </DialogActions>
    </Dialog>
  );
}

// ===== 레시피공유 등록 (송연 openRecipeShareModal) =====
// 버전을 못박아 둔다. 그러지 않으면 나중에 새 버전을 만들었을 때 공유받은 사람에게 보이는 내용이 슬그머니 바뀐다
// draftId 를 주면 그 레시피를 미리 골라둔 채로 연다(검색결과의 '공유' 단추)
export type ShareTarget = { draftId: number | null };
export function RecipeShareDialog({ target, onClose, onSaved }: {
  target: ShareTarget | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [drafts, setDrafts] = useState<RecipeDraft[]>([]);
  const [employees, setEmployees] = useState<RecipeSalesRep[]>([]);
  const [draftId, setDraftId] = useState('');
  const [versions, setVersions] = useState<Option[] | null | 'none'>('none');
  const [versionId, setVersionId] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [msg, setMsg] = useState<Msg>(null);
  const [busy, setBusy] = useState(false);
  const closeTimer = useRef<number | null>(null);

  const loadVersions = async (did: string) => {
    setVersionId('');
    if (!did) {
      setVersions('none');
      return;
    }
    setVersions(null);
    try {
      const opts = shareVersionOptions((await fetchDraft(Number(did))).versions || []);
      setVersions(opts);
      setVersionId(opts.length ? String(opts[0].value) : '');
    } catch {
      setVersions([]);
    }
  };

  useEffect(() => {
    if (!target) return;
    setMsg(null);
    setExpiresAt('');
    setEmployeeId('');
    setDraftId(target.draftId != null ? String(target.draftId) : '');
    void loadVersions(target.draftId != null ? String(target.draftId) : '');
    fetchDrafts({}).then(setDrafts).catch(() => setDrafts([]));
    fetchSalesReps().then(setEmployees).catch(() => setEmployees([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  useEffect(() => () => { if (closeTimer.current) window.clearTimeout(closeTimer.current); }, []);

  const save = async () => {
    if (!draftId || !employeeId || !expiresAt) {
      setMsg({ text: '레시피, 사원, 만료일을 모두 선택해주세요', ok: false });
      return;
    }
    if (!versionId) {
      setMsg({ text: '어느 버전을 줄지 골라주세요', ok: false });
      return;
    }
    setBusy(true);
    try {
      await createShare({ draftId: Number(draftId), versionId: Number(versionId), employeeId, expiresAt });
    } catch (requestError) {
      setMsg({ text: errorText(requestError, '등록에 실패했어요'), ok: false });
      setBusy(false);
      return;
    }
    setMsg({ text: '공유 등록되었습니다', ok: true });
    onSaved();
    closeTimer.current = window.setTimeout(() => { setBusy(false); onClose(); }, 500);
  };

  const versionPlaceholder = versions === 'none' ? '레시피를 먼저 고르세요' : versions == null ? '불러오는 중...' : versions.length === 0 ? '이 레시피에는 아직 버전이 없어요' : '';

  return (
    <Dialog open={Boolean(target)} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>레시피공유 등록</DialogTitle>
      <DialogContent>
        <TextField
          select fullWidth size="small" margin="dense" label="레시피" value={draftId}
          onChange={(event) => { setDraftId(event.target.value); void loadVersions(event.target.value); }}
          slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true }, htmlInput: { 'aria-label': '공유할 레시피' } }}
        >
          <MenuItem value="">선택</MenuItem>
          {drafts.map((d) => <MenuItem key={d.id} value={String(d.id)}>{handoffRecipeName(d.clientName, d.name)}</MenuItem>)}
        </TextField>
        <TextField
          select fullWidth size="small" margin="dense" label="버전 (이 버전이 그대로 보입니다)" value={versionId}
          onChange={(event) => setVersionId(event.target.value)}
          slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true }, htmlInput: { 'aria-label': '공유할 버전' } }}
        >
          {versionPlaceholder && <MenuItem value="">{versionPlaceholder}</MenuItem>}
          {Array.isArray(versions) && versions.map((o) => <MenuItem key={o.value} value={String(o.value)}>{o.label}</MenuItem>)}
        </TextField>
        <TextField
          select fullWidth size="small" margin="dense" label="공유대상 사원" value={employeeId}
          onChange={(event) => setEmployeeId(event.target.value)}
          slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true }, htmlInput: { 'aria-label': '공유대상 사원' } }}
        >
          <MenuItem value="">선택</MenuItem>
          {employees.map((e) => <MenuItem key={e.id} value={e.id}>{e.name} ({e.department || ''})</MenuItem>)}
        </TextField>
        <TextField
          fullWidth size="small" margin="dense" type="date" label="만료일 (이 날짜까지만 조회 가능)" value={expiresAt}
          onChange={(event) => setExpiresAt(event.target.value)}
          slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: '9999-12-31', 'aria-label': '만료일' } }}
        />
        {msgLine(msg)}
      </DialogContent>
      <DialogActions>
        <Box sx={{ flex: 1 }} />
        <Button onClick={onClose}>닫기</Button>
        <Button variant="contained" disabled={busy} onClick={() => void save()}>공유 등록</Button>
      </DialogActions>
    </Dialog>
  );
}

import { useEffect, useState, type ReactNode } from 'react';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, TextField, Typography } from '@mui/material';
import { createEmployee, createLeave, updateEmployee } from '../services/hr.service';
import { emptyHrForm, hrFormOf, leavePeopleOptions, trimForm, type HrEmployee, type HrForm, type LeaveSummary } from '../utils/hr';

const errorText = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

type Msg = { text: string; ok: boolean } | null;
const msgLine = (msg: Msg) => msg && (
  <Typography role="status" sx={{ mt: 1, fontSize: 12.5, fontWeight: 700, color: msg.ok ? 'success.dark' : 'error.main' }}>{msg.text}</Typography>
);
const note = (text: ReactNode) => <Typography sx={{ fontSize: 11.5, color: 'text.secondary', mt: 0.5, mb: 1, lineHeight: 1.7 }}>{text}</Typography>;
const pair = { display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, columnGap: 1.5 } as const;
const DATE_INPUT = { max: '9999-12-31' };

// ===== 사원 등록 · 인사정보 고치기 (송연 openHrModal) =====
// target: null 이면 닫힘, { employee: null } 이면 새로 등록
export type StaffTarget = { employee: HrEmployee | null };
export function HrStaffDialog({ target, onClose, onSaved }: { target: StaffTarget | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<HrForm>(emptyHrForm);
  const [msg, setMsg] = useState<Msg>(null);
  const [busy, setBusy] = useState(false);
  const employee = target?.employee ?? null;

  useEffect(() => {
    if (!target) return;
    setForm(target.employee ? hrFormOf(target.employee) : emptyHrForm());
    setMsg(null);
  }, [target]);

  const field = (key: keyof HrForm, label: string, extra: { placeholder?: string; type?: string; maxLength?: number } = {}) => (
    <TextField
      fullWidth size="small" margin="dense" label={label} value={form[key]} type={extra.type || 'text'} placeholder={extra.placeholder}
      onChange={(event) => setForm((f) => ({ ...f, [key]: event.target.value }))}
      slotProps={{ inputLabel: { shrink: true }, htmlInput: { 'aria-label': label, maxLength: extra.maxLength, ...(extra.type === 'date' ? DATE_INPUT : {}) } }}
    />
  );

  const save = async () => {
    const body = trimForm(form);
    if (!body.name) {
      setMsg({ text: '이름을 적어주세요', ok: false });
      return;
    }
    setBusy(true);
    try {
      if (employee) await updateEmployee(employee.id, body);
      else await createEmployee(body);
      onSaved();
    } catch (requestError) {
      setMsg({ text: errorText(requestError, '저장하지 못했어요'), ok: false });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={Boolean(target)} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{employee ? `${employee.name} 인사정보` : '사원 등록'}</DialogTitle>
      <DialogContent>
        <Box sx={pair}>{field('name', '이름')}{field('department', '부서', { placeholder: '예: 품질관리' })}</Box>
        <Box sx={pair}>{field('position', '직급', { placeholder: '예: 사원 / 대리' })}{field('phone', '연락처', { placeholder: '010-0000-0000' })}</Box>
        <Box sx={pair}>{field('birthDate', '생년월일', { type: 'date' })}{field('hireDate', '입사일', { type: 'date' })}</Box>
        {field('residentNo', '주민등록번호', { placeholder: '900101-1234567', maxLength: 14 })}
        {note(<>잠가서 보관해요(백업 파일이 새어나가도 못 읽어요). 목록에는 늘 가려서 보이고, 전체는 <b>전체보기</b>를 눌러야 나와요. 누가 언제 봤는지 서버에 남습니다. 안 적어도 되고, 비우면 지워져요.</>)}
        {field('address', '주소', { placeholder: '증명서 뗄 때 쓰여요' })}
        <Box sx={pair}>{field('resignDate', '퇴사일', { type: 'date' })}{field('memo', '비고', { placeholder: '안 적어도 돼요' })}</Box>
        {note('퇴사일을 적으면 목록에서 내려가요. 지우지 않는 까닭은, 지우면 그 사람이 만든 발주·입고·생산기록에 이름만 남고 누구인지 알 수 없게 되기 때문이에요.')}
        {/* 2026-10-21 등록하면 로그인 계정도 함께 만든다(서버: username = 이름, 첫 비밀번호 changeme, 일반 사용자 역할) */}
        {!employee && note(<>등록하면 로그인 계정이 함께 만들어져요. <b>사번</b>으로 로그인하고, 처음 비밀번호는 <b>changeme</b> 예요(로그인한 뒤 내 정보에서 바꾸세요). 같은 이름의 사원이 이미 있으면 이름 뒤에 구분을 붙여 주세요.</>)}
        {msgLine(msg)}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>닫기</Button>
        <Button variant="contained" disabled={busy} onClick={() => void save()}>{employee ? '저장' : '등록'}</Button>
      </DialogActions>
    </Dialog>
  );
}

// ===== 연차 등록 (송연 leave-modal) =====
export type LeaveTarget = { people: LeaveSummary[]; date: string };
export function LeaveDialog({ target, onClose, onSaved }: { target: LeaveTarget | null; onClose: () => void; onSaved: () => void }) {
  const [employeeId, setEmployeeId] = useState('');
  const [day, setDay] = useState('');
  const [kind, setKind] = useState('1');
  const [memo, setMemo] = useState('');
  const [msg, setMsg] = useState<Msg>(null);
  const [busy, setBusy] = useState(false);
  const options = target ? leavePeopleOptions(target.people) : [];

  useEffect(() => {
    if (!target) return;
    const opts = leavePeopleOptions(target.people);
    setEmployeeId(opts.length ? String(opts[0].value) : '');
    setDay(target.date);
    setKind('1');
    setMemo('');
    setMsg(null);
  }, [target]);

  const save = async () => {
    if (!employeeId) { setMsg({ text: '사원을 골라주세요', ok: false }); return; }
    if (!day) { setMsg({ text: '날짜를 골라주세요', ok: false }); return; }
    setBusy(true);
    try {
      await createLeave({ employeeId, leaveDate: day, days: Number(kind), note: memo.trim() });
      onSaved();
    } catch (requestError) {
      setMsg({ text: errorText(requestError, '등록하지 못했어요'), ok: false });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={Boolean(target)} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ pb: 0.5 }}>연차 등록</DialogTitle>
      <DialogContent>
        <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 1 }}>쓴 날을 하루씩 넣어요. 반차는 0.5일로 셉니다.</Typography>
        <TextField
          select fullWidth size="small" margin="dense" label="사원" value={employeeId} onChange={(event) => setEmployeeId(event.target.value)}
          slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }}
        >
          {options.length === 0 && <MenuItem value="">등록할 사원이 없어요</MenuItem>}
          {options.map((o) => <MenuItem key={o.value} value={String(o.value)}>{o.label}</MenuItem>)}
        </TextField>
        <TextField fullWidth size="small" margin="dense" type="date" label="날짜" value={day} onChange={(event) => setDay(event.target.value)}
          slotProps={{ inputLabel: { shrink: true }, htmlInput: { ...DATE_INPUT, 'aria-label': '날짜' } }} />
        <TextField select fullWidth size="small" margin="dense" label="종류" value={kind} onChange={(event) => setKind(event.target.value)} slotProps={{ inputLabel: { shrink: true } }}>
          <MenuItem value="1">연차 (하루)</MenuItem>
          <MenuItem value="0.5">반차 (반나절)</MenuItem>
        </TextField>
        <TextField fullWidth size="small" margin="dense" label="메모" placeholder="예: 개인사정 (비워도 돼요)" value={memo} onChange={(event) => setMemo(event.target.value)}
          slotProps={{ inputLabel: { shrink: true }, htmlInput: { 'aria-label': '메모' } }} />
        {msgLine(msg)}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>닫기</Button>
        <Button variant="contained" disabled={busy} onClick={() => void save()}>등록</Button>
      </DialogActions>
    </Dialog>
  );
}


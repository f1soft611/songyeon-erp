import { useEffect, useState } from 'react';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, TextField, Typography } from '@mui/material';
import { BIND_OPTIONS, CATEGORY_OPTIONS, CYCLES, cycleLabel, type SurveyFormSummary } from '../utils/prerequisite';

type NewSurveyFormDialogProps = {
  open: boolean;
  forms: SurveyFormSummary[];
  onClose: () => void;
  // 만들기. 실패하면 창에 보일 까닭을 돌려준다(없으면 [만들기] 가 눌리지 않는다)
  onCreate?: (info: { name: string; category: string; bindType: '' | 'client'; cycle: string; copyFrom: number | null }) => Promise<string | null>;
};

// 새 서류 만들기 창(송연 #qvf-modal). 제목만 받고 질문은 만든 뒤 편집 화면에서 넣는다.
// 2026-11-09 [만들기] 를 붙였다. 원본의 '결재선도 같이 베낍니다' · '만든 뒤 결재선을 정해야' 는
// 예전 설계의 흔적이라(지금은 올릴 때 결재선을 고른다) 옮기지 않는다
export function NewSurveyFormDialog({ open, forms, onClose, onCreate }: NewSurveyFormDialogProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('일반');
  const [bindType, setBindType] = useState('');
  const [cycle, setCycle] = useState('수시');
  const [copyFrom, setCopyFrom] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName('');
    setCategory('일반');
    setBindType('');
    setCycle('수시');
    setCopyFrom('');
    setError('');
  }, [open]);

  const create = async () => {
    if (!onCreate) return;
    if (!name.trim()) {
      setError('서류 제목을 적어주세요');
      return;
    }
    setSaving(true);
    const why = await onCreate({ name: name.trim(), category, bindType: bindType === 'client' ? 'client' : '', cycle, copyFrom: copyFrom ? Number(copyFrom) : null });
    setSaving(false);
    if (why) setError(why);
    else onClose();
  };

  // 빈 값('')을 고른 칸(대상 날짜마다 · 질문 가져오기 가져오지 않음)도 라벨을 위로 올린다. 안 올리면 라벨과 고른 글자가 겹친다
  const selectProps = (label: string) => ({
    select: { displayEmpty: true, SelectDisplayProps: { 'aria-label': label } as object },
    inputLabel: { shrink: true },
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth aria-labelledby="qv-new-form-title">
      <DialogTitle id="qv-new-form-title" sx={{ fontSize: 15, fontWeight: 700, pb: 0.5 }}>새 서류 만들기</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>제목을 적으면 빈 양식이 만들어집니다. 질문은 그 다음에 등록합니다</Typography>
        <TextField size="small" label="서류 제목" required value={name} onChange={(event) => setName(event.target.value)}
          placeholder="예: 협력업체 자체 위생점검 평가표" slotProps={{ htmlInput: { 'aria-label': '서류 제목' } }} sx={{ mt: 1 }} />
        <TextField select size="small" label="분류" value={category} onChange={(event) => setCategory(event.target.value)} slotProps={selectProps('분류')}>
          {CATEGORY_OPTIONS.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
        </TextField>
        <TextField select size="small" label="대상" value={bindType} onChange={(event) => setBindType(event.target.value)} slotProps={selectProps('대상')}>
          {BIND_OPTIONS.map((option) => <MenuItem key={option.value || 'date'} value={option.value}>{option.label}</MenuItem>)}
        </TextField>
        <TextField select size="small" label="기간" value={cycle} onChange={(event) => setCycle(event.target.value)} slotProps={selectProps('기간')}>
          {CYCLES.map((c) => <MenuItem key={c} value={c}>{cycleLabel(c)}</MenuItem>)}
        </TextField>
        <TextField select size="small" label="질문 가져오기" value={copyFrom} onChange={(event) => setCopyFrom(event.target.value)} slotProps={selectProps('질문 가져오기')}>
          <MenuItem value="">가져오지 않음 (빈 양식)</MenuItem>
          {forms.map((form) => <MenuItem key={form.id} value={String(form.id)}>{`${form.name} — 질문 ${form.questions}개`}</MenuItem>)}
        </TextField>
        <Box sx={{ fontSize: 11.5, color: 'text.secondary', lineHeight: 1.6 }}>
          이미 만든 서류에서 질문을 통째로 베껴 시작할 수 있습니다. 점검표는 앞부분(법적 요건 등)이 서로 비슷해서, 맨손으로 시작하는 것보다 고치는 편이 빠릅니다.<br />
          <b>기간</b>을 정해두면 그 기간에 한 장만 쓸 수 있고, 빠진 기간을 현황에서 짚어줍니다. <b>대상</b>은 한 장이라도 쓰고 나면 바꿀 수 없습니다.
        </Box>
        {error && <Typography role="alert" sx={{ fontSize: 13, color: 'error.main' }}>{error}</Typography>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>취소</Button>
        <Button variant="contained" disabled={!onCreate || saving} onClick={() => void create()}>만들기</Button>
      </DialogActions>
    </Dialog>
  );
}

import { useEffect, useState, type KeyboardEvent, type MouseEvent } from 'react';
import { Box, Button, Checkbox, FormControlLabel, MenuItem, TextField, Typography } from '@mui/material';
import type { SurveyChoiceDraft, SurveyFormInfo, SurveyItemInput } from '../services/prerequisite.service';
import { CATEGORY_OPTIONS, CYCLES, withIra, type SurveyFormDetail, type SurveyItem } from '../utils/prerequisite';

type SaveItem = (input: SurveyItemInput & { id?: number; afterId?: number | null }) => Promise<{ id: number | null; error?: string }>;

type SurveyFormEditorProps = {
  form: SurveyFormDetail;
  // 고치는 함수가 없으면 그 단추는 눌리지 않는다(모양만)
  onSaveInfo?: (info: SurveyFormInfo) => void;
  onToggleActive?: () => void;
  onSaveChoices?: (choices: SurveyChoiceDraft[], hasNote: boolean, hasDefect: boolean) => void;
  onSaveItem?: SaveItem;
  onDeleteItem?: (item: SurveyItem) => void;
  onMoveItem?: (item: SurveyItem, dir: 'up' | 'down') => void;
  busy?: boolean;
};

// 열려 있는 칸: 새로 넣기(after = 그 줄 밑, 없으면 맨 끝) 또는 고치기(id)
type Inline = { kind: 'single' | 'group'; id?: number; after?: number | null; topic: string };

const blockSx = { border: 1, borderColor: 'divider', borderRadius: 1, overflow: 'hidden' } as const;
const headSx = { display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 1, bgcolor: 'action.hover', fontSize: 13, fontWeight: 700 } as const;
const noteSx = { fontSize: 11.5, color: 'text.secondary', lineHeight: 1.6 } as const;
const smallBtn = { minWidth: 0, px: 0.75, py: 0, fontSize: 11.5, whiteSpace: 'nowrap' } as const;
const toDrafts = (form: SurveyFormDetail): SurveyChoiceDraft[] =>
  form.choices.length ? form.choices.map((c) => ({ label: c.label, mark: c.mark, score: c.score == null ? '' : String(c.score) })) : [{ label: '', mark: '', score: '' }];

// 질문 · 묶음 칸(송연 qvOpenInline · qvInlineSave). 창을 띄우지 않고 목록 그 자리에 연다.
// Enter 저장(새로 넣으면 바로 밑에 다음 칸) · Shift+Enter 줄바꿈 · Esc 닫기
function InlineItemEditor({ inline, item, onSave, onClose, busy }: { inline: Inline; item?: SurveyItem; onSave: SaveItem; onClose: () => void; busy: boolean }) {
  const isGroup = inline.kind === 'group';
  const what = isGroup ? '묶음' : '질문';
  const [label, setLabel] = useState(item?.label ?? '');
  const [topic, setTopic] = useState(item ? item.topic : inline.topic);
  const [required, setRequired] = useState(item ? item.required : true);
  const [error, setError] = useState('');

  const save = async () => {
    if (!label.trim()) {
      setError(isGroup ? '묶음 이름을 적어주세요' : '질문을 적어주세요');
      return;
    }
    const result = await onSave({ id: inline.id, afterId: inline.after ?? null, rowKind: inline.kind, label: label.trim(), topic: isGroup ? '' : topic.trim(), required });
    if (result.error) setError(result.error);
  };
  const onKey = (event: KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void save();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    }
  };

  return (
    <Box onClick={(event: MouseEvent) => event.stopPropagation()} sx={{ px: 1.5, py: 1, borderTop: 1, borderColor: 'primary.main', bgcolor: 'background.paper', display: 'flex', flexDirection: 'column', gap: 0.75 }}>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
        <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{`${what} ${inline.id ? '고치기' : '넣기'}`}</Typography>
        {!isGroup && (
          <>
            <TextField size="small" margin="none" placeholder="관리항목 (비워도 됩니다)" value={topic} onChange={(event) => setTopic(event.target.value)} onKeyDown={onKey}
              slotProps={{ htmlInput: { 'aria-label': '관리항목' } }} sx={{ width: 200 }} />
            <TextField select size="small" margin="none" value={required ? '1' : '0'} onChange={(event) => setRequired(event.target.value === '1')}
              slotProps={{ select: { SelectDisplayProps: { 'aria-label': '필수 여부' } as object } }} sx={{ width: 180 }}>
              <MenuItem value="1">꼭 답해야 함</MenuItem>
              <MenuItem value="0">비워도 넘길 수 있음</MenuItem>
            </TextField>
          </>
        )}
        <Typography sx={noteSx}>{inline.id ? 'Enter 저장 · Esc 취소' : 'Enter 로 저장하면 바로 밑에 다음 칸이 열립니다 · Esc 로 끝냅니다'}</Typography>
      </Box>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
        <TextField multiline minRows={2} size="small" margin="none" fullWidth autoFocus value={label} onChange={(event) => setLabel(event.target.value)} onKeyDown={onKey}
          placeholder={isGroup ? '예: 1. 법적 요건 점검' : '예: 자가품질검사의 기록을 유지하고 있는가?'} slotProps={{ htmlInput: { 'aria-label': what } }} />
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <Button variant="contained" size="small" disabled={busy} onClick={() => void save()}>저장</Button>
          <Button variant="outlined" size="small" onClick={onClose}>{inline.id ? '취소' : '끝'}</Button>
        </Box>
      </Box>
      {error && <Typography role="alert" sx={{ fontSize: 12, color: 'error.main' }}>{error}</Typography>}
    </Box>
  );
}

// 양식 편집(송연 qvEditorHtml · qvItemsHtml). 2026-11-09 고치기를 붙였다(고치는 함수를 주면 단추가 눌린다)
export function SurveyFormEditor({ form, onSaveInfo, onToggleActive, onSaveChoices, onSaveItem, onDeleteItem, onMoveItem, busy = false }: SurveyFormEditorProps) {
  const used = form.used > 0;
  const questionCount = form.items.filter((item) => item.rowKind === 'single').length;
  const mark = form.scoring ? form.fullMark : 0;

  const [name, setName] = useState(form.name);
  const [category, setCategory] = useState(form.category);
  const [bindType, setBindType] = useState<'' | 'client'>(form.bindType);
  const [cycle, setCycle] = useState(form.cycle);
  const [choices, setChoices] = useState<SurveyChoiceDraft[]>(() => toDrafts(form));
  const [hasNote, setHasNote] = useState(form.hasNote);
  const [hasDefect, setHasDefect] = useState(form.hasDefect);
  const [picked, setPicked] = useState<number | null>(null);
  const [inline, setInline] = useState<Inline | null>(null);

  // 다시 읽은 양식으로 맞춘다(같은 서류를 고친 뒤에도 칸이 새 값이 되게)
  useEffect(() => {
    setName(form.name);
    setCategory(form.category);
    setBindType(form.bindType);
    setCycle(form.cycle);
    setChoices(toDrafts(form));
    setHasNote(form.hasNote);
    setHasDefect(form.hasDefect);
  }, [form]);
  // 다른 서류로 바꾸면 고른 줄 · 열린 칸을 닫는다
  useEffect(() => {
    setPicked(null);
    setInline(null);
  }, [form.id]);

  const setChoice = (index: number, patch: Partial<SurveyChoiceDraft>) =>
    setChoices((prev) => prev.map((choice, i) => (i === index ? { ...choice, ...patch } : choice)));
  // 마지막 한 줄을 지우면 빈 줄 하나가 남는다
  const dropChoice = (index: number) => setChoices((prev) => {
    const next = prev.filter((_, i) => i !== index);
    return next.length ? next : [{ label: '', mark: '', score: '' }];
  });

  // 새 칸: 고른 줄 바로 밑(안 고르면 맨 끝)
  const openNew = (kind: 'single' | 'group') => setInline({ kind, after: picked, topic: '' });
  const saveInline: SaveItem = async (input) => {
    if (!onSaveItem) return { id: null };
    const result = await onSaveItem(input);
    if (result.id) {
      // 새로 넣었으면 바로 밑에 다음 칸을 연다(질문을 쭉 이어 적을 때). 관리항목은 물려받는다
      setInline(input.id ? null : { kind: input.rowKind, after: result.id, topic: input.topic });
    }
    return result;
  };

  let lastTopic: string | null = null;
  const inlineAt = (item: SurveyItem) => inline && (inline.id === item.id || (!inline.id && inline.after === item.id));
  const inlineEditor = (item?: SurveyItem) =>
    inline && onSaveItem ? <InlineItemEditor key={`inline-${inline.id ?? 'new'}-${inline.after ?? 'end'}`} inline={inline} item={item} onSave={saveInline} onClose={() => setInline(null)} busy={busy} /> : null;
  const anchored = inline && form.items.some((item) => inlineAt(item));

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, minWidth: 0 }}>
      {/* 서류: 제목 한 줄, 그 밑에 분류 · 대상 · 기간을 나란히(질문 작성이 아래로 밀리지 않게) */}
      <Box sx={blockSx}>
        <Box sx={headSx}>서류</Box>
        <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
          <TextField size="small" label="제목" value={name} onChange={(event) => setName(event.target.value)}
            slotProps={{ htmlInput: { 'aria-label': '제목', readOnly: !onSaveInfo } }} fullWidth />
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
            <TextField select size="small" label="분류" value={category} onChange={(event) => setCategory(event.target.value)} sx={{ width: 130 }}
              slotProps={{ select: { SelectDisplayProps: { 'aria-label': '분류' } as object } }}>
              {CATEGORY_OPTIONS.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </TextField>
            {/* 대상은 점검표를 한 장이라도 쓰고 나면 바꿀 수 없다. 날짜마다는 빈 값('')이라 라벨을 위로 올려 둔다 */}
            <TextField select size="small" label="대상" value={bindType} disabled={used} onChange={(event) => setBindType(event.target.value === 'client' ? 'client' : '')} sx={{ width: 150 }}
              slotProps={{ select: { displayEmpty: true, SelectDisplayProps: { 'aria-label': '대상' } as object }, inputLabel: { shrink: true } }}>
              <MenuItem value="">날짜마다</MenuItem>
              <MenuItem value="client">거래처마다</MenuItem>
            </TextField>
            <TextField select size="small" label="기간" value={cycle} onChange={(event) => setCycle(event.target.value)} sx={{ width: 120 }}
              slotProps={{ select: { SelectDisplayProps: { 'aria-label': '기간' } as object } }}>
              {CYCLES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </TextField>
            <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
              <Button variant="outlined" size="small" disabled={!onToggleActive || busy} onClick={onToggleActive}>{form.active ? '목록에서 내리기' : '다시 올리기'}</Button>
              <Button variant="contained" size="small" disabled={!onSaveInfo || busy} onClick={() => onSaveInfo?.({ name, category, bindType, cycle })}>저장</Button>
            </Box>
          </Box>
          <Typography component="div" sx={noteSx}>
            {used
              ? `이 판으로 쓴 점검표가 ${form.used}장 있습니다. 질문을 고치면 새 판이 떠서, 지난 점검표는 그때 질문 그대로 남습니다.`
              : '아직 이 판으로 쓴 점검표가 없습니다.'}
            {' '}지금은 <b>{form.versionLabel}</b>입니다.
            {!used && <><br />&apos;대상&apos; 은 점검표를 한 장이라도 쓰고 나면 바꿀 수 없습니다.</>}
            {form.cycle !== '수시' && <><br /><b>{withIra(form.cycle)}</b> 한 기간에 한 장만 쓸 수 있고, 빠진 기간은 현황에서 짚어줍니다.</>}
          </Typography>
        </Box>
      </Box>

      {/* 질문과 답변을 나란히: 질문은 아흔 줄이 넘고 답변은 네 줄뿐이다. 왼쪽 메뉴 · 서류 목록이 자리를 차지해, 아주 넓은 화면에서만 나란히(그 밖엔 위아래) */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', xl: 'minmax(0,1fr) 300px' }, gap: 1.5, alignItems: 'start' }}>
        <Box sx={blockSx}>
          <Box sx={headSx}>
            <span>{`질문 작성 · ${questionCount}개${form.scoring ? ` · 만점 ${questionCount * form.fullMark}점` : ''}`}</span>
            <Box sx={{ ml: 'auto', display: 'flex', gap: 0.75 }}>
              <Button variant="outlined" size="small" disabled={!onSaveItem || busy} onClick={() => openNew('group')}>+ 묶음</Button>
              <Button variant="contained" size="small" disabled={!onSaveItem || busy} onClick={() => openNew('single')}
                title={picked ? '고른 줄 바로 밑에 넣습니다' : '맨 끝에 붙입니다 (줄을 누르면 그 밑에 넣습니다)'}>+ 질문</Button>
            </Box>
          </Box>
          {form.items.length === 0 && !inline && (
            <Typography sx={{ p: 3, textAlign: 'center', fontSize: 12.5, color: 'text.secondary' }}>아직 질문이 없습니다. 위의 + 질문을 눌러 등록해주세요</Typography>
          )}
          {form.items.map((item) => {
            const isGroup = item.rowKind === 'group';
            if (isGroup) lastTopic = null;
            const topic = !isGroup && item.topic && item.topic !== lastTopic ? item.topic : '';
            if (!isGroup && item.topic) lastTopic = item.topic;
            const editing = inline?.id === item.id;
            const on = picked === item.id;
            return (
              <Box key={item.id}>
                {!editing && (
                  // 줄을 누르면 골라진다(다시 누르면 풀린다). 골라 둔 줄 밑에 새 질문 · 묶음이 들어간다
                  <Box data-testid={`qve-row-${item.id}`} onClick={() => setPicked(on ? null : item.id)}
                    sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, px: 1.5, py: 0.75, pl: 1.5 + item.depth * 2, borderTop: 1, borderColor: 'divider', fontSize: 13, cursor: onSaveItem ? 'pointer' : 'default',
                      bgcolor: on ? 'action.selected' : isGroup ? 'action.hover' : undefined, outline: on ? '1px solid' : 'none', outlineColor: 'primary.main' }}>
                    {isGroup ? (
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <b>{item.label}</b>
                        <Box component="span" sx={{ ml: 1, ...noteSx }}>{`질문 ${item.questions ?? 0}개${mark ? ` · ${(item.questions ?? 0) * mark}점` : ''}`}</Box>
                      </Box>
                    ) : (
                      <>
                        <Box sx={{ width: 110, color: 'text.secondary', fontSize: 12 }}>{topic}</Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          {item.label}
                          {!item.required && <Box component="span" sx={{ ml: 0.5, color: 'text.secondary', fontSize: 11.5 }}>(선택)</Box>}
                        </Box>
                      </>
                    )}
                    {/* 단추를 눌렀을 때 줄까지 고르지 않는다 */}
                    <Box sx={{ display: 'flex', gap: 0.5 }} onClick={(event) => event.stopPropagation()}>
                      <Button size="small" variant="text" sx={smallBtn} disabled={!onMoveItem || busy} aria-label="위로" onClick={() => onMoveItem?.(item, 'up')}>↑</Button>
                      <Button size="small" variant="text" sx={smallBtn} disabled={!onMoveItem || busy} aria-label="아래로" onClick={() => onMoveItem?.(item, 'down')}>↓</Button>
                      <Button size="small" variant="text" sx={smallBtn} disabled={!onSaveItem || busy} onClick={() => setInline({ kind: item.rowKind, id: item.id, topic: item.topic })}>고치기</Button>
                      <Button size="small" variant="text" color="error" sx={smallBtn} disabled={!onDeleteItem || busy} onClick={() => onDeleteItem?.(item)}>지우기</Button>
                    </Box>
                  </Box>
                )}
                {inlineAt(item) && inlineEditor(editing ? item : undefined)}
              </Box>
            );
          })}
          {/* 고른 줄이 없으면 맨 끝에 연다 */}
          {inline && !anchored && inlineEditor()}
        </Box>

        <Box sx={blockSx}>
          <Box sx={headSx}>답변 작성</Box>
          <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 64px 64px 52px', gap: 0.5, fontSize: 11.5, color: 'text.secondary' }}>
              <span>보기</span><span>기호</span><span>점수</span><span />
            </Box>
            {choices.map((choice, index) => (
              <Box key={index} sx={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 64px 64px 52px', gap: 0.5 }}>
                <TextField size="small" margin="none" placeholder="보기 이름 (예: 적합)" value={choice.label} onChange={(event) => setChoice(index, { label: event.target.value })}
                  slotProps={{ htmlInput: { 'aria-label': '보기 이름', readOnly: !onSaveChoices } }} />
                <TextField size="small" margin="none" placeholder="기호 (O)" value={choice.mark} onChange={(event) => setChoice(index, { mark: event.target.value })}
                  slotProps={{ htmlInput: { 'aria-label': '기호', readOnly: !onSaveChoices } }} />
                <TextField size="small" margin="none" placeholder="점수" value={choice.score} onChange={(event) => setChoice(index, { score: event.target.value })}
                  slotProps={{ htmlInput: { 'aria-label': '점수', readOnly: !onSaveChoices } }} />
                <Button size="small" variant="text" color="error" sx={smallBtn} disabled={!onSaveChoices} onClick={() => dropChoice(index)}>지우기</Button>
              </Box>
            ))}
            <Button variant="outlined" size="small" disabled={!onSaveChoices} fullWidth onClick={() => setChoices((prev) => [...prev, { label: '', mark: '', score: '' }])}>+ 보기 추가</Button>
            <FormControlLabel control={<Checkbox size="small" checked={hasNote} disabled={!onSaveChoices} onChange={(event) => setHasNote(event.target.checked)} />} label="세부내역 칸" sx={{ '& .MuiFormControlLabel-label': { fontSize: 13 } }} />
            <FormControlLabel control={<Checkbox size="small" checked={hasDefect} disabled={!onSaveChoices} onChange={(event) => setHasDefect(event.target.checked)} />} label="부적합내역 칸" sx={{ mt: -1, '& .MuiFormControlLabel-label': { fontSize: 13 } }} />
            <Button variant="contained" size="small" disabled={!onSaveChoices || busy} fullWidth onClick={() => onSaveChoices?.(choices, hasNote, hasDefect)}>답변 저장</Button>
            <Typography sx={noteSx}>점수를 비워두면 점수를 안 매깁니다 (O/X 만 고르는 점검표). <b>0점</b>짜리 보기는 부적합으로 셉니다.</Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

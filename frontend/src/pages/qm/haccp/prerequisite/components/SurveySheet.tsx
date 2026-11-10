import { useEffect, useMemo, useState } from 'react';
import { Box, Button, TextField, Typography } from '@mui/material';
import { tallySheet, type SurveyAnswer, type SurveySheetData } from '../utils/prerequisite';

type SurveySheetProps = {
  data: SurveySheetData;
  // 현황에서 연 장: 보기만(지난 기록을 들춰보다 칸을 잘못 눌러 답이 바뀌면 안 된다)
  view?: boolean;
  // [임시저장]: 답한 줄만 보낸다. 없으면 단추가 눌리지 않는다
  onSave?: (answers: Record<number, SurveyAnswer>) => void;
  saving?: boolean;
  // 저장 결과 · 막힌 까닭(점검표 아래에 보인다)
  message?: { severity: 'success' | 'error'; text: string } | null;
};

const emptyAnswer: SurveyAnswer = { value: '', note: '', defect: '' };
// 고른 답 · 세부내역 · 부적합내역 중 하나라도 있는 줄만 보낸다(원본 qvSend)
const answeredOnly = (answers: Record<number, SurveyAnswer>) =>
  Object.fromEntries(Object.entries(answers).filter(([, a]) => a.value || a.note || a.defect)) as Record<number, SurveyAnswer>;
const signBox = { width: 86, border: 1, borderColor: 'divider', textAlign: 'center', fontSize: 11.5 } as const;

// 점검표 한 장(송연 qvSheetHtml · qvSignsHtml · qvTally · qvSend).
// 2026-11-09 [임시저장] 을 붙였다. [결재 올리기] 는 결재 방식이 정해지면 붙인다(지금은 눌리지 않는다)
export function SurveySheet({ data, view = false, onSave, saving = false, message = null }: SurveySheetProps) {
  const [answers, setAnswers] = useState<Record<number, SurveyAnswer>>(() => data.answers ?? {});
  useEffect(() => setAnswers(data.answers ?? {}), [data]);
  const tally = useMemo(() => tallySheet(data, answers), [data, answers]);

  // 결재에 올라간 장과 끝난 장은 못 고친다. 까닭이 서로 달라 아예 못 고치는 까닭을 먼저 적는다
  const locked = data.status === '승인' || data.status === '검토대기';
  const frozen = locked || view;
  const lockMsg = data.status === '승인'
    ? '결재가 끝난 점검표라 고칠 수 없습니다'
    : data.status === '검토대기'
      ? '결재에 올라가 있어 고칠 수 없습니다 (돌려받으면 다시 열립니다)'
      : view ? "현황에서는 보기만 됩니다. 고치려면 '점검' 탭에서 그 날짜·거래처로 여세요" : '';

  const setAnswer = (id: number, patch: Partial<SurveyAnswer>) =>
    setAnswers((prev) => ({ ...prev, [id]: { ...(prev[id] ?? emptyAnswer), ...patch } }));
  // 같은 것을 다시 누르면 고른 것을 무른다(잘못 누른 칸을 되돌릴 길이 있어야 한다)
  const pick = (id: number, label: string) => setAnswer(id, { value: answers[id]?.value === label ? '' : label });

  const sub = [data.bindName, data.docDate, `양식 ${data.versionLabel}`].filter(Boolean).join(' · ');
  let lastTopic: string | null = null;

  return (
    <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'flex-start' }}>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography sx={{ fontSize: 15, fontWeight: 700 }}>{data.formName}</Typography>
          <Typography component="div" sx={{ fontSize: 12, color: 'text.secondary', display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            <span>{sub}</span>
            {data.status && <b>· {data.status}</b>}
            {data.rejectReason && <Box component="span" sx={{ color: 'error.main' }}>· <span>{`반려: ${data.rejectReason}`}</span></Box>}
          </Typography>
        </Box>
        <Box sx={{ textAlign: 'right' }}>
          <Typography data-testid="qv-score" sx={{ fontSize: 16, fontWeight: 700 }}>{tally.scoreText}</Typography>
          <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{tally.leftText}</Typography>
        </Box>
      </Box>

      {/* 결재란: 종이 결재란 그대로. 올린 장에 박힌 칸만 그린다 */}
      {data.signs.length > 0 && (
        <Box sx={{ display: 'flex', alignSelf: 'flex-end', border: 1, borderColor: 'divider' }}>
          <Box sx={{ width: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, borderRight: 1, borderColor: 'divider', writingMode: 'vertical-rl' }}>결 재</Box>
          {data.signs.map((sign) => (
            <Box key={sign.step} sx={signBox}>
              <Box sx={{ borderBottom: 1, borderColor: 'divider', py: 0.25 }}>{sign.label}</Box>
              <Box sx={{ height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: sign.state === '승인' ? 'success.main' : 'text.secondary' }}>
                {sign.state === '전결' ? '전결' : sign.state === '승인' ? sign.actedBy || sign.employeeName : ''}
              </Box>
              <Box sx={{ borderTop: 1, borderColor: 'divider', py: 0.25, color: 'text.secondary' }}>
                {sign.employeeName}{sign.actedAt && <><br />{sign.actedAt.slice(0, 10)}</>}
              </Box>
            </Box>
          ))}
        </Box>
      )}

      {/* 고를 답 설명. 줄마다 글자를 다 쓰면 표가 안 읽혀 줄에는 기호만, 뜻은 여기 한 번 */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, fontSize: 12, color: 'text.secondary' }}>
        {data.choices.map((choice) => (
          <span key={choice.label}>{`${choice.mark || choice.label} ${choice.label}${choice.score == null ? '' : ` (${choice.score}점)`}`}</span>
        ))}
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
        {data.items.map((item) => {
          if (item.rowKind === 'group') {
            lastTopic = null;
            return (
              <Box key={item.id} data-testid={`qv-group-${item.id}`}
                sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, px: 1, py: 0.75, pl: 1 + item.depth * 2, bgcolor: 'action.hover', fontWeight: 700, fontSize: 13, borderBottom: 1, borderColor: 'divider' }}>
                <span>{item.label}</span>
                <Box component="span" sx={{ fontWeight: 400, color: 'text.secondary' }}>{tally.groupText(item.id)}</Box>
              </Box>
            );
          }
          const answer = answers[item.id] ?? emptyAnswer;
          // 관리항목은 바로 위 줄과 같으면 비운다(엑셀 평가표와 같은 모양)
          const topic = item.topic && item.topic !== lastTopic ? item.topic : '';
          if (item.topic) lastTopic = item.topic;
          return (
            <Box key={item.id} data-testid={`qv-row-${item.id}`}
              sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '120px minmax(0,1fr) auto' }, gap: 0.75, alignItems: 'center', px: 1, py: 0.75, pl: { xs: 1, md: 1 + item.depth * 2 }, borderBottom: 1, borderColor: 'divider', fontSize: 13 }}>
              <Box sx={{ color: 'text.secondary', fontSize: 12 }}>{topic}</Box>
              <Box>
                {item.label}
                {!item.required && <Box component="span" sx={{ ml: 0.5, color: 'text.secondary', fontSize: 11.5 }}>(선택)</Box>}
              </Box>
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                {data.choices.map((choice) => {
                  const on = answer.value === choice.label;
                  return (
                    <Button key={choice.label} size="small" variant={on ? 'contained' : 'outlined'} disabled={frozen}
                      aria-label={choice.label} aria-pressed={on} title={choice.label} onClick={() => pick(item.id, choice.label)}
                      sx={{ minWidth: 36, px: 1, py: 0.25 }}>
                      {choice.mark || choice.label}
                    </Button>
                  );
                })}
              </Box>
              {(data.hasNote || data.hasDefect) && (
                <Box sx={{ gridColumn: { md: '2 / 4' }, display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                  {data.hasNote && (
                    <TextField size="small" margin="none" placeholder="세부내역" value={answer.note} disabled={frozen}
                      onChange={(event) => setAnswer(item.id, { note: event.target.value })}
                      slotProps={{ htmlInput: { 'aria-label': '세부내역' } }} sx={{ flex: 1, minWidth: 160 }} />
                  )}
                  {data.hasDefect && (
                    <TextField size="small" margin="none" placeholder="부적합내역" value={answer.defect} disabled={frozen}
                      onChange={(event) => setAnswer(item.id, { defect: event.target.value })}
                      slotProps={{ htmlInput: { 'aria-label': '부적합내역' } }} sx={{ flex: 1, minWidth: 160 }} />
                  )}
                </Box>
              )}
            </Box>
          );
        })}
      </Box>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'center', gap: 1 }}>
        {message && (
          <Typography role={message.severity === 'error' ? 'alert' : 'status'} sx={{ mr: 'auto', fontSize: 12.5, whiteSpace: 'pre-line', color: message.severity === 'error' ? 'error.main' : 'success.main' }}>
            {message.text}
          </Typography>
        )}
        {lockMsg ? (
          <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>{lockMsg}</Typography>
        ) : (
          <>
            <Button variant="outlined" disabled={!onSave || saving} onClick={() => onSave?.(answeredOnly(answers))}>임시저장</Button>
            <Button variant="contained" disabled title="결재 방식이 정해지면 올릴 수 있습니다">결재 올리기</Button>
          </>
        )}
      </Box>
    </Box>
  );
}

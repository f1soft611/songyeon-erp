import { useEffect, useRef, useState, type DragEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Alert, Box, Button, Chip, Divider, IconButton, Stack, TextField, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloseIcon from '@mui/icons-material/Close';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import WebOutlinedIcon from '@mui/icons-material/WebOutlined';
import {
  COMMENT_MAX, FILE_MAX_BYTES, OWNER_HISTORY, REVIEW_STATUSES, canChooseStatus, STATUS_COLORS, STATUS_LABELS, formatFileSize, historyStatusText, historyTime,
} from './screenReview';
import type { ReviewFile, ReviewStatus, ScreenReviewTarget } from './screenReview.types';
import { useScreenReviewDock } from './ScreenReviewDock';
import type { useScreenReview } from './useScreenReview';

type ScreenReviewPanelProps = {
  target: ScreenReviewTarget;
  review: ReturnType<typeof useScreenReview>;
};

export const PANEL_WIDTH = 480;

// 상태 고르기 칸의 동그라미 색
const STATUS_RING: Record<ReviewStatus, string> = {
  NOT_STARTED: 'grey.500',
  IN_PROGRESS: 'info.main',
  CHANGE_REQUESTED: 'warning.main',
  COMPLETED: 'success.main',
};

// 로그인 사용자 · 오늘로 정해지는 칸: 고칠 수 없게 회색으로
const fixedFieldSx = { '& .MuiOutlinedInput-root': { bgcolor: 'action.hover' } };

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Box>
      <Typography sx={{ fontSize: 14, fontWeight: 700, mb: 1 }}>{title}</Typography>
      {children}
    </Box>
  );
}

function FieldLabel({ label }: { label: string }) {
  return <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 0.5 }}>{label}</Typography>;
}

// 기본 정보 표: 한 줄에 [이름 | 값 | 이름 | 값]
function InfoTable({ rows }: { rows: [string, string, string, string][] }) {
  const cell = { px: 1.25, py: 0.75, display: 'flex', alignItems: 'center', borderBottom: '1px solid', borderColor: 'divider', minWidth: 0, wordBreak: 'keep-all', overflowWrap: 'anywhere' } as const;
  const head = { ...cell, bgcolor: 'action.hover', color: 'text.secondary', whiteSpace: 'nowrap', overflowWrap: 'normal' } as const;
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'auto minmax(0, 1fr) auto minmax(0, 1fr)', border: '1px solid', borderColor: 'divider', borderBottom: 0, fontSize: 13 }}>
      {rows.flatMap(([labelA, valueA, labelB, valueB]) => [
        <Box key={`${labelA}-l`} sx={head}>{labelA}</Box>,
        <Box key={`${labelA}-v`} sx={cell}>{valueA}</Box>,
        <Box key={`${labelB}-l`} sx={head}>{labelB}</Box>,
        <Box key={`${labelB}-v`} sx={cell}>{valueB}</Box>,
      ])}
    </Box>
  );
}

// 화면 오른쪽 칸에 붙는 검수 등록/수정 패널. 본문을 덮지 않고 옆으로 민다.
// [임시저장]은 의견 · 첨부만 남기고 검수 상태는 바꾸지 않는다.
// 개발담당 · 개발완료일은 개발사가 따로 넣고, 요청일은 수정요청을 저장한 날이라 여기서는 보기만 한다. 상태는 [저장]할 때만 바뀐다.
// 검수자는 로그인 사용자, 검수일은 오늘로 고정이라 고칠 수 없다.
export function ScreenReviewPanel({ target, review }: ScreenReviewPanelProps) {
  const { slot: dock } = useScreenReviewDock();
  const { data, form, changeForm, setMessage, setOpen } = review;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const current = data.review;

  useEffect(() => {
    if (!review.open) return undefined;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [review.open, setOpen]);

  if (!review.open || !dock) return null;

  const addFiles = (list: FileList | null) => {
    if (!list || list.length === 0) return;
    const files = Array.from(list);
    const tooBig = files.filter((file) => file.size > FILE_MAX_BYTES);
    if (tooBig.length > 0) setMessage({ text: `10MB가 넘는 파일은 첨부할 수 없어요: ${tooBig.map((file) => file.name).join(', ')}`, ok: false });
    const added: ReviewFile[] = files.filter((file) => file.size <= FILE_MAX_BYTES).map((file) => ({ name: file.name, size: file.size, file }));
    if (added.length > 0) review.addFiles(added);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    addFiles(event.dataTransfer.files);
  };

  const panel = (
    <Box
      component="aside"
      role="complementary"
      aria-label="화면 검수 등록/수정"
      sx={{
        width: { xs: '100vw', md: PANEL_WIDTH },
        position: { xs: 'fixed', md: 'static' },
        inset: { xs: 0, md: 'auto' },
        zIndex: { xs: 1300, md: 'auto' },
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        bgcolor: 'background.paper',
        borderLeft: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', px: 2.5, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Typography sx={{ fontSize: 16, fontWeight: 700, flex: 1 }}>화면 검수 등록/수정</Typography>
        <IconButton size="small" aria-label="화면 검수 닫기" onClick={() => setOpen(false)}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      <Stack spacing={2.5} sx={{ flex: 1, minHeight: 0, overflowY: 'auto', px: 2.5, py: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <Box sx={{ width: 40, height: 40, borderRadius: 1, bgcolor: 'action.hover', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
            <WebOutlinedIcon color="action" />
          </Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography sx={{ fontSize: 16, fontWeight: 800 }}>{target.screenName}</Typography>
              <Chip size="small" variant="outlined" label={target.screenCode} />
            </Box>
            <Typography variant="caption" color="text.secondary">{target.menuPath.join(' > ')}</Typography>
          </Box>
          <Chip size="small" color={STATUS_COLORS[current?.status ?? 'NOT_STARTED']} label={STATUS_LABELS[current?.status ?? 'NOT_STARTED']} />
        </Box>

        <Section title="1. 기본 정보">
          <InfoTable
            rows={[
              ['메뉴구분', target.menuPath.join(' > '), '화면명', target.screenName],
              ['화면코드', target.screenCode, '개발담당', current?.developerName ?? ''],
              ['요청일', current?.requestDate ?? '', '개발완료일', current?.devCompletedDate ?? ''],
            ]}
          />
        </Section>

        <Section title="2. 검수 상태">
          <Box role="radiogroup" aria-label="검수 상태" sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1 }}>
            {REVIEW_STATUSES.map((status) => {
              const selected = form.status === status;
              const allowed = canChooseStatus(current?.status ?? 'NOT_STARTED', status);
              return (
                <Box
                  key={status}
                  component="button"
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  disabled={!allowed}
                  onClick={() => changeForm('status', status)}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 0.75,
                    py: 1,
                    px: 0.5,
                    cursor: allowed ? 'pointer' : 'not-allowed',
                    opacity: allowed ? 1 : 0.4,
                    font: 'inherit',
                    fontSize: 13,
                    fontWeight: selected ? 700 : 500,
                    color: 'text.primary',
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: selected ? 'primary.main' : 'divider',
                    outline: selected ? '1px solid' : 'none',
                    outlineColor: 'primary.main',
                    bgcolor: selected ? 'action.selected' : 'background.paper',
                  }}
                >
                  {selected ? (
                    <CheckCircleIcon sx={{ fontSize: 22, color: STATUS_RING[status] }} />
                  ) : (
                    <Box component="span" aria-hidden sx={{ width: 18, height: 18, borderRadius: '50%', border: '3px solid', borderColor: STATUS_RING[status], flexShrink: 0 }} />
                  )}
                  <span>{STATUS_LABELS[status]}</span>
                </Box>
              );
            })}
          </Box>
          <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 0.75 }}>
            상태는 [저장]할 때만 바뀌어요. [임시저장]은 입력한 내용만 남기고 상태는 그대로 둡니다.
          </Typography>
        </Section>

        <Section title="3. 검수 내역">
          <Stack spacing={1.5}>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
              <Box>
                <FieldLabel label="검수자" />
                <TextField
                  fullWidth
                  size="small"
                  margin="none"
                  value={review.reviewer}
                  slotProps={{ htmlInput: { readOnly: true, 'aria-label': '검수자' } }}
                  sx={fixedFieldSx}
                />
              </Box>
              <Box>
                <FieldLabel label="검수일" />
                <TextField
                  fullWidth
                  size="small"
                  margin="none"
                  value={review.reviewDate}
                  slotProps={{ htmlInput: { readOnly: true, 'aria-label': '검수일' } }}
                  sx={fixedFieldSx}
                />
              </Box>
            </Box>
            <Box>
              <FieldLabel label="검수 의견 / 메모" />
              <TextField
                fullWidth
                multiline
                minRows={3}
                size="small"
                margin="none"
                value={form.comment}
                onChange={(event) => changeForm('comment', event.target.value)}
                error={form.comment.length > COMMENT_MAX}
                slotProps={{ htmlInput: { 'aria-label': '검수 의견 / 메모' } }}
              />
              <Typography variant="caption" color={form.comment.length > COMMENT_MAX ? 'error' : 'text.secondary'} component="div" sx={{ textAlign: 'right', mt: 0.25 }}>
                {form.comment.length}/{COMMENT_MAX}
              </Typography>
            </Box>
            <Box>
              <FieldLabel label="첨부 파일" />
              <Box
                role="button"
                tabIndex={0}
                aria-label="첨부 파일 추가"
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') fileInputRef.current?.click();
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                sx={{
                  border: '1px dashed',
                  borderColor: dragging ? 'primary.main' : 'divider',
                  borderRadius: 1,
                  py: 1.75,
                  textAlign: 'center',
                  cursor: 'pointer',
                  color: 'text.secondary',
                  bgcolor: dragging ? 'action.hover' : 'transparent',
                }}
              >
                <CloudUploadOutlinedIcon sx={{ color: 'primary.main' }} />
                <Typography variant="body2">파일을 드래그하거나 클릭하여 첨부하세요.</Typography>
                <Typography variant="caption">(최대 10MB, 이미지/문서 가능)</Typography>
              </Box>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                hidden
                onChange={(event) => {
                  addFiles(event.target.files);
                  event.target.value = '';
                }}
              />
              <Stack spacing={0.75} sx={{ mt: 1 }}>
                {form.files.map((file, index) => (
                  <Box
                    key={`${file.name}-${index}`}
                    sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.25, py: 0.5, border: '1px solid', borderColor: 'divider', borderRadius: 1, fontSize: 13 }}
                  >
                    <InsertDriveFileIcon fontSize="small" color="primary" />
                    <Box sx={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</Box>
                    <Typography variant="caption" color="text.secondary">{formatFileSize(file.size)}</Typography>
                    <IconButton
                      size="small"
                      aria-label={`${file.name} 빼기`}
                      onClick={() => void review.removeFile(index)}
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ))}
              </Stack>
            </Box>
          </Stack>
        </Section>

        <Section title={`4. 검수 이력 (${data.history.length})`}>
          {data.history.length === 0 && <Typography variant="body2" color="text.secondary">아직 검수 이력이 없습니다</Typography>}
          <Stack divider={<Divider flexItem />} spacing={1}>
            {data.history.map((item) => (
              <Box key={item.id} sx={{ fontSize: 13 }}>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 0.75 }}>
                  {item.requestNo != null && <b>요청 {item.requestNo}</b>}
                  <b>{historyTime(item.createdAt)}</b>
                  <span>{item.reviewerName}</span>
                  <span>{historyStatusText(item)}</span>
                </Box>
                {item.comment && <Box sx={{ mt: 0.5, whiteSpace: 'pre-wrap', color: 'text.secondary' }}>{item.comment}</Box>}
                {item.files.length > 0 && (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                    {item.files.map((file) => (
                      <Chip
                        key={file.fileId ?? file.name}
                        size="small"
                        variant="outlined"
                        icon={<InsertDriveFileIcon />}
                        label={file.name}
                        onClick={() => review.downloadFile(OWNER_HISTORY, item.id, file)}
                      />
                    ))}
                  </Box>
                )}
              </Box>
            ))}
          </Stack>
        </Section>
      </Stack>

      <Box sx={{ px: 2.5, py: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
        {review.message && (
          <Alert severity={review.message.ok ? 'success' : 'error'} onClose={() => setMessage(null)} sx={{ mb: 1 }}>
            {review.message.text}
          </Alert>
        )}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {review.hasDraft && <Typography variant="caption" color="text.secondary">임시저장된 내용을 불러왔어요</Typography>}
          <Box sx={{ flex: 1 }} />
          <Button onClick={() => setOpen(false)}>취소</Button>
          <Button variant="outlined" disabled={review.saving} onClick={() => void review.saveDraft()}>임시저장</Button>
          <Button variant="contained" disabled={review.saving} onClick={() => void review.save()}>저장</Button>
        </Box>
      </Box>
    </Box>
  );

  return createPortal(panel, dock);
}

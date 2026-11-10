import type { ElementType } from 'react';
import { Box, LinearProgress, Paper, Typography } from '@mui/material';
import { alpha, type Theme } from '@mui/material/styles';
import ViewListOutlinedIcon from '@mui/icons-material/ViewListOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ScheduleIcon from '@mui/icons-material/Schedule';
import EditNoteIcon from '@mui/icons-material/EditNote';
import RemoveCircleIcon from '@mui/icons-material/RemoveCircle';
import type { ReviewStatus } from '../../../../../shared/components/screen-review/screenReview.types';
import { SUMMARY_STATUS_LABELS, percentOf } from '../screenReviewManagement';
import type { ScreenReviewCounts } from '../types/screenReviewManagement.types';

type ScreenReviewSummaryCardsProps = {
  counts: ScreenReviewCounts;
  // 기준일(조회한 날, YYYY-MM-DD)
  baseDate: string;
};

export const STATUS_TONES: Record<ReviewStatus, (theme: Theme) => string> = {
  COMPLETED: (theme) => theme.palette.success.main,
  IN_PROGRESS: (theme) => theme.palette.info.main,
  CHANGE_REQUESTED: (theme) => theme.palette.warning.main,
  NOT_STARTED: (theme) => theme.palette.grey[600],
};

const STATUS_ICONS: Record<ReviewStatus, ElementType> = {
  COMPLETED: CheckCircleIcon,
  IN_PROGRESS: ScheduleIcon,
  CHANGE_REQUESTED: EditNoteIcon,
  NOT_STARTED: RemoveCircleIcon,
};

const cardSx = {
  display: 'flex',
  alignItems: 'center',
  gap: 1.25,
  minWidth: 0,
  px: 1.5,
  py: 1.5,
  borderRadius: 1,
  border: '1px solid rgba(148,163,184,0.18)',
  boxShadow: 'none',
};

function CountCard({ label, value, percent, Icon, tone }: {
  label: string;
  value: number;
  percent?: number;
  Icon: ElementType;
  tone: (theme: Theme) => string;
}) {
  return (
    <Paper aria-label={label} sx={{ ...cardSx, flex: '1 1 150px' }}>
      <Box
        sx={(theme) => ({
          width: 40, height: 40, flexShrink: 0, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: tone(theme), bgcolor: alpha(tone(theme), 0.14),
        })}
      >
        <Icon fontSize="small" />
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body2" color="text.secondary" noWrap>{label}</Typography>
        <Typography component="p" sx={{ fontSize: 20, fontWeight: 700, lineHeight: 1.3 }} noWrap>
          {value}개
          {percent !== undefined && (
            <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 0.5 }}>({percent}%)</Typography>
          )}
        </Typography>
      </Box>
    </Paper>
  );
}

// 위쪽 건수 카드 6개. 건수는 화면 수, 검색 조건과 상관없이 전체 화면 기준
export function ScreenReviewSummaryCards({ counts, baseDate }: ScreenReviewSummaryCardsProps) {
  const progress = percentOf(counts.COMPLETED, counts.total);
  return (
    <Box
      aria-label="화면검수 건수"
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 1,
        px: 1,
        pt: 1,
        // 본문 너비에 맞춰 줄바꿈(옆 메뉴를 펼쳐도 숫자가 잘리지 않게). 진행률 카드가 다음 줄로 내려가면 한 줄을 채운다
      }}
    >
      <CountCard label="전체 화면" value={counts.total} Icon={ViewListOutlinedIcon} tone={(theme) => theme.palette.text.secondary} />
      {(['COMPLETED', 'IN_PROGRESS', 'CHANGE_REQUESTED', 'NOT_STARTED'] as ReviewStatus[]).map((status) => (
        <CountCard
          key={status}
          label={SUMMARY_STATUS_LABELS[status]}
          value={counts[status]}
          percent={percentOf(counts[status], counts.total)}
          Icon={STATUS_ICONS[status]}
          tone={STATUS_TONES[status]}
        />
      ))}
      <Paper aria-label="전체 진행률" sx={{ ...cardSx, flexDirection: 'column', alignItems: 'stretch', gap: 0.5, flex: '2 1 260px' }}>
        <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>전체 진행률</Typography>
          <Typography sx={{ fontSize: 20, fontWeight: 700 }}>{progress}%</Typography>
        </Box>
        <LinearProgress variant="determinate" value={progress} color="success" aria-label="진행률 막대" sx={{ height: 8, borderRadius: 4 }} />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
          <Typography variant="caption" color="text.secondary">{counts.total}개 중 {counts.COMPLETED}개 완료</Typography>
          <Typography variant="caption" color="text.secondary">기준일: {baseDate}</Typography>
        </Box>
      </Paper>
    </Box>
  );
}

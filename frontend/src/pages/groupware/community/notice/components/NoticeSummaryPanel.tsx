import { Box, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import type {
  NoticeRecentIssue,
  NoticeSummaryStat,
} from '../data/noticeSummary';

type NoticeSummaryPanelProps = {
  stats: NoticeSummaryStat[];
  recentIssues: NoticeRecentIssue[];
  isDark: boolean;
};

export function NoticeSummaryPanel({
  stats,
  recentIssues,
  isDark,
}: NoticeSummaryPanelProps) {
  return (
    <Stack spacing={2}>
      <Card
        sx={{
          borderRadius: 3,
          border: `1px solid ${
            isDark ? 'rgba(148,163,184,0.18)' : 'rgba(148,163,184,0.18)'
          }`,
          boxShadow: 'none',
          bgcolor: isDark ? 'rgba(15, 23, 42, 0.75)' : '#ffffff',
        }}
      >
        <CardContent sx={{ p: 2.5 }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 2,
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              공지 요약
            </Typography>
            <Chip label="LIVE" size="small" color="warning" />
          </Box>

          <Stack spacing={1.5}>
            {stats.map((stat) => (
              <Box
                key={stat.label}
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  py: 1,
                  borderBottom: `1px solid ${
                    isDark ? 'rgba(148,163,184,0.12)' : 'rgba(148,163,184,0.16)'
                  }`,
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  {stat.label}
                </Typography>
                <Typography sx={{ fontWeight: 800 }}>{stat.value}</Typography>
              </Box>
            ))}
          </Stack>
        </CardContent>
      </Card>

      <Card
        sx={{
          borderRadius: 3,
          border: `1px solid ${
            isDark ? 'rgba(148,163,184,0.18)' : 'rgba(148,163,184,0.18)'
          }`,
          boxShadow: 'none',
          bgcolor: isDark ? 'rgba(15, 23, 42, 0.75)' : '#ffffff',
        }}
      >
        <CardContent sx={{ p: 2.5 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
            최근 이슈
          </Typography>
          <Stack spacing={1.5}>
            {recentIssues.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                최근 이슈가 없습니다.
              </Typography>
            ) : (
              recentIssues.map((issue) => (
                <Box
                  key={issue.id}
                  sx={{
                    display: 'grid',
                    gap: 0.5,
                    p: 1.2,
                    borderRadius: 2,
                    bgcolor: isDark ? 'rgba(148,163,184,0.06)' : '#f8fafc',
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 600, overflowWrap: 'anywhere' }}
                  >
                    {issue.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    조회 {issue.viewCount} · 댓글 {issue.commentCount} · 점수{' '}
                    {issue.score}
                  </Typography>
                </Box>
              ))
            )}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}

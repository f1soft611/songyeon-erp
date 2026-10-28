import type { ReactNode } from 'react';
import { Box, Card, CardContent, Stack, Typography } from '@mui/material';
import { ProfileAvatar } from '../ProfileAvatar';

export type FeedCardProps = {
  author: string;
  authorProfileImageUrl?: string | null;
  meta?: ReactNode;
  avatar?: ReactNode;
  badges?: ReactNode;
  actions?: ReactNode;
  title?: ReactNode;
  summary?: ReactNode;
  children?: ReactNode;
  isDark?: boolean;
  onClick?: () => void;
  testId?: string;
};

export function FeedCard({
  author,
  authorProfileImageUrl,
  meta,
  avatar,
  badges,
  actions,
  title,
  summary,
  children,
  isDark = false,
  onClick,
  testId = 'feed-card',
}: FeedCardProps) {
  return (
    <Card
      component={onClick ? 'button' : 'article'}
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      data-testid={testId}
      data-feed-card="true"
      sx={{
        width: '100%',
        minWidth: 0,
        boxSizing: 'border-box',
        borderRadius: 3,
        border: '1px solid rgba(148,163,184,0.18)',
        boxShadow: 'none',
        bgcolor: isDark ? 'rgba(15, 23, 42, 0.75)' : '#ffffff',
        color: 'inherit',
        textAlign: 'left',
        cursor: onClick ? 'pointer' : 'default',
        '&:hover': onClick ? { borderColor: 'primary.main' } : undefined,
      }}
    >
      <CardContent
        sx={{ p: { xs: 1.5, sm: 2.5 }, minWidth: 0, overflow: 'hidden' }}
      >
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 1.5,
            mb: title || summary || children ? 2 : 0,
            minWidth: 0,
          }}
        >
          <ProfileAvatar
            name={author}
            imageUrl={authorProfileImageUrl}
            fallback={avatar ?? author.slice(0, 1)}
            sx={{
              width: 36,
              height: 36,
              flexShrink: 0,
              fontSize: '0.8rem',
              fontWeight: 700,
              background: isDark
                ? 'linear-gradient(135deg, #60a5fa, #a78bfa)'
                : 'linear-gradient(135deg, #dbeafe, #ede9fe)',
              color: isDark ? '#eff6ff' : '#1f2937',
            }}
          />
          <Box sx={{ flex: '1 1 120px', minWidth: 0 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              {author}
            </Typography>
            {meta != null && (
              <Typography variant="caption" color="text.secondary">
                {meta}
              </Typography>
            )}
          </Box>
          {(badges || actions) && (
            <Stack
              direction="row"
              spacing={0.75}
              sx={{
                alignItems: 'center',
                flexWrap: 'wrap',
                justifyContent: { xs: 'flex-start', sm: 'flex-end' },
                flex: { xs: '1 0 100%', sm: '0 0 auto' },
              }}
            >
              {actions}
              {badges}
            </Stack>
          )}
        </Box>
        {title != null && (
          <Typography
            variant="h6"
            sx={{
              fontSize: '1.25rem',
              lineHeight: 1.4,
              fontWeight: 700,
              mb: summary != null || children ? 1.5 : 0,
              overflowWrap: 'anywhere',
            }}
          >
            {title}
          </Typography>
        )}
        {summary != null && (
          <Typography variant="body2" color="text.secondary">
            {summary}
          </Typography>
        )}
        {children}
      </CardContent>
    </Card>
  );
}

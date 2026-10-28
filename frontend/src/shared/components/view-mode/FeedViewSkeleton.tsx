import { Box, Card, CardContent, Skeleton, Stack } from '@mui/material';

export function FeedViewSkeleton() {
  return (
    <Stack
      spacing={2}
      data-testid="feed-view-skeleton"
      sx={{ width: '100%', boxSizing: 'border-box' }}
    >
      {Array.from({ length: 3 }).map((_, index) => (
        <Card
          key={index}
          sx={{
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: 'none',
          }}
        >
          <CardContent sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
              <Skeleton variant="circular" width={36} height={36} />
              <Box sx={{ flex: 1 }}>
                <Skeleton variant="text" width="30%" height={20} />
                <Skeleton variant="text" width="48%" height={18} />
              </Box>
              <Skeleton
                variant="rounded"
                width={72}
                height={24}
                sx={{ borderRadius: 999 }}
              />
            </Box>
            <Skeleton variant="text" width="65%" height={28} sx={{ mb: 1 }} />
            <Skeleton variant="text" width="100%" height={20} />
            <Skeleton variant="text" width="90%" height={20} />
            <Skeleton variant="text" width="82%" height={20} />
            <Skeleton
              variant="rounded"
              width={100}
              height={28}
              sx={{ mt: 1, borderRadius: 1 }}
            />
          </CardContent>
        </Card>
      ))}
    </Stack>
  );
}

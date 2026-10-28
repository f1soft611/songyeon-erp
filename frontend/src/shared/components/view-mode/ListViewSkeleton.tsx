import { Box, Skeleton, Stack } from '@mui/material';

export function ListViewSkeleton() {
  return (
    <Stack
      data-testid="list-view-skeleton"
      sx={{
        width: '100%',
        boxSizing: 'border-box',
        borderTop: '1px solid',
        borderColor: 'divider',
      }}
    >
      {Array.from({ length: 8 }).map((_, index) => (
        <Box
          key={index}
          sx={{
            display: 'grid',
            gridTemplateColumns: '24px minmax(0, 1fr)',
            gap: 1.5,
            alignItems: 'center',
            minHeight: 68,
            px: 1.5,
            py: 1,
            bgcolor: 'background.paper',
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Skeleton
            variant="rounded"
            width={18}
            height={20}
            sx={{ borderRadius: 0.5, bgcolor: 'action.hover' }}
          />
          <Box sx={{ minWidth: 0 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                minWidth: 0,
              }}
            >
              <Skeleton
                variant="text"
                width="70%"
                height={20}
                sx={{ flex: 1, bgcolor: 'action.hover' }}
              />
              <Skeleton
                variant="rounded"
                width={56}
                height={22}
                sx={{ flexShrink: 0, bgcolor: 'action.hover' }}
              />
            </Box>
            <Skeleton
              variant="text"
              width="48%"
              height={18}
              sx={{ bgcolor: 'action.hover' }}
            />
          </Box>
        </Box>
      ))}
    </Stack>
  );
}

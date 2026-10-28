import { useEffect, useRef } from 'react';
import { Alert, Box, Button, CircularProgress, Stack } from '@mui/material';

type ViewModePaginationProps = {
  scrollRoot: Element | null;
  hasNext: boolean;
  isLoadingMore: boolean;
  error?: string;
  onLoadMore: () => void;
  onRetry?: () => void;
  loadingLabel?: string;
  itemCount: number;
};

export function ViewModePagination({
  scrollRoot,
  hasNext,
  isLoadingMore,
  error,
  onLoadMore,
  onRetry,
  loadingLabel = '다음 문서 불러오는 중',
  itemCount,
}: ViewModePaginationProps) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (
      !sentinel
      || !hasNext
      || isLoadingMore
      || error
      || typeof IntersectionObserver === 'undefined'
    ) {
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        observer.disconnect();
        onLoadMore();
      }
    }, {
      root: scrollRoot,
      rootMargin: '200px 0px',
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [error, hasNext, isLoadingMore, itemCount, onLoadMore, scrollRoot]);

  if (!hasNext && !isLoadingMore && !error) return null;

  return (
    <Stack spacing={1} sx={{ width: '100%', py: 1.5 }}>
      {error ? (
        <Alert
          severity="error"
          action={
            onRetry ? (
              <Button color="inherit" size="small" onClick={onRetry}>
                다시 시도
              </Button>
            ) : undefined
          }
        >
          {error}
        </Alert>
      ) : null}
      {hasNext ? (
        <Box
          ref={sentinelRef}
          data-testid="view-mode-pagination-sentinel"
          aria-hidden="true"
          sx={{ width: '100%', minHeight: 1 }}
        />
      ) : null}
      {isLoadingMore ? (
        <Box
          role="status"
          aria-label={loadingLabel}
          sx={{ display: 'flex', justifyContent: 'center', width: '100%' }}
        >
          <CircularProgress size={22} />
        </Box>
      ) : null}
    </Stack>
  );
}

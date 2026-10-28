import type { ReactNode } from 'react';
import { Box, Button } from '@mui/material';

type FeedCommentsSectionProps = {
  children: ReactNode;
  showPrevious?: boolean;
  isLoadingPrevious?: boolean;
  remainingPreviousCount?: number;
  onLoadPrevious?: () => void;
};

export function FeedCommentsSection({
  children,
  showPrevious = false,
  isLoadingPrevious = false,
  remainingPreviousCount,
  onLoadPrevious,
}: FeedCommentsSectionProps) {
  const previousCommentsLabel =
    typeof remainingPreviousCount === 'number' &&
    Number.isFinite(remainingPreviousCount) &&
    remainingPreviousCount >= 0
      ? `이전 댓글 보기 (${remainingPreviousCount})`
      : '이전 댓글 보기';
  const hasNoRemainingPreviousComments =
    typeof remainingPreviousCount === 'number' &&
    Number.isFinite(remainingPreviousCount) &&
    remainingPreviousCount === 0;
  const showPreviousAction =
    showPrevious && (isLoadingPrevious || !hasNoRemainingPreviousComments);

  return (
    <Box data-testid="feed-comments-section">
      {showPreviousAction && (
        <Button
          size="small"
          variant="text"
          aria-label={previousCommentsLabel}
          disabled={isLoadingPrevious}
          onClick={() => void onLoadPrevious?.()}
          sx={{ mt: 1.5, whiteSpace: 'nowrap' }}
        >
          {isLoadingPrevious
            ? '이전 댓글 불러오는 중...'
            : previousCommentsLabel}
        </Button>
      )}
      {children}
    </Box>
  );
}

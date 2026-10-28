import {
  Box,
  Button,
  Stack,
  Typography,
} from '@mui/material';
import FavoriteBorderOutlinedIcon from '@mui/icons-material/FavoriteBorderOutlined';
import BookmarkBorderOutlinedIcon from '@mui/icons-material/BookmarkBorderOutlined';

type FeedReactionBarProps = {
  liked: boolean;
  likeCount: number;
  bookmarked: boolean;
  commentCount: number;
  onToggleLike: () => void;
  onToggleBookmark: () => void;
  isDark?: boolean;
};

export function FeedReactionBar({
  liked,
  likeCount,
  bookmarked,
  commentCount,
  onToggleLike,
  onToggleBookmark,
  isDark = false,
}: FeedReactionBarProps) {
  return (
    <Box
      data-testid="feed-reaction-bar"
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 1,
        flexWrap: 'wrap',
        color: 'text.secondary',
      }}
    >
      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
        <Button
          size="small"
          variant="text"
          startIcon={<FavoriteBorderOutlinedIcon fontSize="small" />}
          aria-pressed={liked}
          onClick={onToggleLike}
          sx={{
            minWidth: 0,
            px: 1,
            py: 0.5,
            borderRadius: 1.5,
            color: isDark ? '#cbd5e1' : '#475569',
            backgroundColor: 'transparent',
            transition: 'all 0.2s ease',
            '& .MuiButton-startIcon': {
              marginRight: 0.5,
              color: isDark ? '#f472b6' : '#ec4899',
            },
            '&:hover': {
              backgroundColor: isDark
                ? 'rgba(244, 114, 182, 0.12)'
                : 'rgba(236, 72, 153, 0.08)',
              color: isDark ? '#fce7f3' : '#be185d',
            },
          }}
        >
          {liked ? '좋아요 취소' : '좋아요'} {likeCount}
        </Button>
        <Button
          size="small"
          variant="text"
          startIcon={<BookmarkBorderOutlinedIcon fontSize="small" />}
          aria-pressed={bookmarked}
          onClick={onToggleBookmark}
          sx={{
            minWidth: 0,
            px: 1,
            py: 0.5,
            borderRadius: 1.5,
            color: isDark ? '#cbd5e1' : '#475569',
            backgroundColor: 'transparent',
            transition: 'all 0.2s ease',
            '& .MuiButton-startIcon': {
              marginRight: 0.5,
              color: isDark ? '#fbbf24' : '#f59e0b',
            },
            '&:hover': {
              backgroundColor: isDark
                ? 'rgba(251, 191, 36, 0.12)'
                : 'rgba(245, 158, 11, 0.08)',
              color: isDark ? '#fef3c7' : '#b45309',
            },
          }}
        >
          {bookmarked ? '북마크 취소' : '북마크'}
        </Button>
      </Stack>
      <Typography variant="body2">댓글 {commentCount}</Typography>
    </Box>
  );
}

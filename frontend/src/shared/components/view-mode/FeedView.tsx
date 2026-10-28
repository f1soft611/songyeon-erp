import { Box, Stack } from '@mui/material';
import type { CommonViewItemRenderer } from './commonViewTypes';
import { ViewModePagination } from './ViewModePagination';

type FeedViewProps<T> = {
  items: T[];
  renderItem: CommonViewItemRenderer<T>;
  pagination?: {
    scrollRoot: Element | null;
    hasNext: boolean;
    isLoadingMore: boolean;
    error?: string;
    onLoadMore: () => void;
    onRetry?: () => void;
    loadingLabel?: string;
  };
};

export function FeedView<T>({ items, renderItem, pagination }: FeedViewProps<T>) {
  return (
    <Stack spacing={2} sx={{ width: '100%', boxSizing: 'border-box' }}>
      {items.map((item, index) => (
        <Box key={index}>{renderItem(item, index)}</Box>
      ))}
      {pagination ? (
        <ViewModePagination {...pagination} itemCount={items.length} />
      ) : null}
    </Stack>
  );
}

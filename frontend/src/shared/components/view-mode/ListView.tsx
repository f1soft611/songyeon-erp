import type { ReactNode } from 'react';
import { Box, Chip, Stack, Typography } from '@mui/material';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import type { CommonViewItem } from './commonViewTypes';
import { ViewModePagination } from './ViewModePagination';

type ListViewProps<T extends CommonViewItem> = {
  items: T[];
  onItemClick?: (item: T) => void;
  renderItemHeaderAction?: (item: T) => ReactNode;
  renderItemToolbar?: (item: T) => ReactNode;
  renderItemAction?: (item: T) => ReactNode;
  renderItemIcon?: (item: T) => ReactNode;
  renderCategoryBadge?: (item: T) => ReactNode;
  ariaLabel?: string;
  badgeOrder?: 'category-status' | 'status-category';
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

export function ListView<T extends CommonViewItem>({
  items,
  onItemClick,
  renderItemHeaderAction,
  renderItemToolbar,
  renderItemAction,
  renderItemIcon,
  renderCategoryBadge,
  ariaLabel = '리스트형 목록',
  badgeOrder = 'category-status',
  pagination,
}: ListViewProps<T>) {
  return (
    <Stack
      component="section"
      aria-label={ariaLabel}
      sx={{
        width: '100%',
        boxSizing: 'border-box',
        borderTop: '1px solid',
        borderColor: 'divider',
      }}
    >
      {items.map((item) => {
        const categoryChip = renderCategoryBadge ? renderCategoryBadge(item) : item.categoryLabel ? (
          <Chip
            data-testid="list-category-chip"
            label={item.categoryLabel}
            size="small"
            color={item.categoryColor}
            sx={{
              flexShrink: 0,
              ml: 'auto',
              height: 22,
              fontWeight: 700,
              ...(item.categoryColor
                ? {}
                : {
                    bgcolor: 'rgba(59,130,246,0.18)',
                    color: '#2563eb',
                  }),
              ...(item.badgeBorderRadius
                ? { borderRadius: item.badgeBorderRadius }
                : {}),
            }}
          />
        ) : null;
        const statusChip = item.statusLabel ? (
          <Chip
            label={item.statusLabel}
            size="small"
            color={item.statusColor ?? 'default'}
            variant={item.statusVariant ?? 'outlined'}
            sx={{
              flexShrink: 0,
              height: 22,
              fontWeight: 700,
              ...(item.badgeBorderRadius
                ? { borderRadius: item.badgeBorderRadius }
                : {}),
            }}
          />
        ) : null;

        return (
          <Box
            data-testid="list-item-row"
            key={item.id}
            sx={{
              display: 'grid',
              gridTemplateColumns: renderItemToolbar
                ? { xs: 'minmax(0, 1fr)', sm: 'minmax(0, 1fr) auto' }
                : 'minmax(0, 1fr) auto',
              gridTemplateRows: 'auto auto',
              columnGap: 0.5,
              alignItems: 'center',
              width: '100%',
              minHeight: 68,
              px: 1.5,
              py: 1,
              textAlign: 'left',
              border: 0,
              borderBottom: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
              color: 'inherit',
              '&:hover': onItemClick ? { bgcolor: 'action.hover' } : undefined,
            }}
          >
            <Box
              component="button"
              type="button"
              onClick={() => onItemClick?.(item)}
              sx={{
                gridColumn: 1,
                gridRow: renderItemToolbar ? { xs: '1', sm: '1 / 3' } : '1 / 3',
                display: 'grid',
                gridTemplateColumns: renderItemIcon ? 'auto minmax(0, 1fr)' : '24px minmax(0, 1fr)',
                gap: 1.5,
                alignItems: 'center',
                width: '100%',
                p: 0,
                textAlign: 'left',
                border: 0,
                bgcolor: 'transparent',
                color: 'inherit',
                cursor: onItemClick ? 'pointer' : 'default',
              }}
            >
              {renderItemIcon ? renderItemIcon(item) : <DescriptionOutlinedIcon
                fontSize="small"
                sx={{ color: item.isPinned ? 'primary.main' : 'text.secondary' }}
              />}
              <Box sx={{ minWidth: 0 }}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    minWidth: 0,
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      minWidth: 0,
                      flex: 1,
                      fontWeight: 700,
                      color: item.isPinned ? 'primary.main' : 'text.primary',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {item.title}
                  </Typography>
                  {renderItemToolbar ? null : badgeOrder === 'status-category' ? (
                    <>
                      {statusChip}
                      {categoryChip}
                    </>
                  ) : (
                    <>
                      {categoryChip}
                      {statusChip}
                    </>
                  )}
                </Box>
                <Box sx={{ display: 'flex', gap: 0.75, minWidth: 0, alignItems: 'center' }}>
                  <Typography variant="caption" color="text.secondary" noWrap>
                    {item.authorLabel}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap>
                    {item.dateLabel}
                  </Typography>
                </Box>
              </Box>
            </Box>
            <Box
              sx={{
                gridColumn: renderItemToolbar ? { xs: 1, sm: 2 } : 2,
                gridRow: renderItemToolbar ? { xs: 2, sm: '1 / 3' } : 1,
                display: 'flex',
                alignItems: 'center',
                ...(renderItemToolbar ? { minWidth: 0, justifyContent: 'flex-end', mt: { xs: 0.5, sm: 0 } } : {}),
              }}
            >
              {renderItemToolbar ? renderItemToolbar(item) : renderItemHeaderAction?.(item)}
            </Box>
            {renderItemAction && (
              <Box
                sx={{
                  gridColumn: 2,
                  gridRow: 2,
                  display: 'flex',
                  justifyContent: 'flex-end',
                  alignItems: 'center',
                }}
              >
                {renderItemAction(item)}
              </Box>
            )}
          </Box>
        );
      })}
      {pagination ? (
        <ViewModePagination {...pagination} itemCount={items.length} />
      ) : null}
    </Stack>
  );
}

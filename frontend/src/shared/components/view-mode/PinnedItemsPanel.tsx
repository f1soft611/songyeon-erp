import type { ReactNode } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import type { CommonViewItem } from './commonViewTypes';

type PinnedItemsPanelProps<T extends CommonViewItem = CommonViewItem> = {
  items: T[];
  ariaLabel?: string;
  selectedItemId?: string | number | null;
  onItemClick?: (item: T) => void;
  renderItemAction?: (item: T) => ReactNode;
};

export function PinnedItemsPanel<T extends CommonViewItem>({
  items,
  ariaLabel = '상단 고정 항목',
  selectedItemId,
  onItemClick,
  renderItemAction,
}: PinnedItemsPanelProps<T>) {
  const theme = useTheme();
  const pinnedItems = items.filter((item) => item.isPinned);

  if (pinnedItems.length === 0) {
    return null;
  }

  return (
    <Box
      component="section"
      aria-label={ariaLabel}
      sx={{
        width: '100%',
      }}
    >
      <Stack spacing={1}>
        {pinnedItems.map((item) => (
          <Box
            key={item.id}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              minWidth: 0,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1.5,
              px: 1.5,
              py: 1,
              bgcolor: alpha(
                theme.palette.primary.main,
                theme.palette.mode === 'dark' ? 0.12 : 0.05,
              ),
              color: 'inherit',
              textAlign: 'left',
              cursor: onItemClick ? 'pointer' : 'default',
              ...(selectedItemId === item.id && {
                outline: `2px solid ${theme.palette.primary.main}`,
                outlineOffset: -2,
              }),
            }}
          >
            <Box
              component="button"
              type="button"
              aria-label={item.title}
              aria-pressed={selectedItemId === item.id}
              onClick={() => onItemClick?.(item)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                minWidth: 0,
                flex: 1,
                p: 0,
                border: 0,
                bgcolor: 'transparent',
                color: 'inherit',
                textAlign: 'left',
                cursor: onItemClick ? 'pointer' : 'default',
              }}
            >
              <PushPinOutlinedIcon fontSize="small" color="primary" />
              <Typography
                variant="body2"
                sx={{
                  minWidth: 0,
                  flex: 1,
                  fontWeight: 700,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {item.title}
              </Typography>
            </Box>
            {renderItemAction?.(item)}
          </Box>
        ))}
      </Stack>
    </Box>
  );
}

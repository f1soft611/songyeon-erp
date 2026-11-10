import type { SxProps, Theme } from '@mui/material/styles';

export const headerCounterBadgeSx: SxProps<Theme> = {
  '& .MuiBadge-badge': {
    height: 16,
    minWidth: 16,
    px: 0.5,
    fontSize: '0.625rem',
    fontWeight: 700,
    lineHeight: 1,
    top: 2,
    right: 2,
  },
};

import { Chip } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { getNoticeCategoryPresentation } from '../data/noticeCategoryPresentation';

type NoticeCategoryBadgeProps = {
  code?: string | null;
  label: string;
  compact?: boolean;
  isDark?: boolean;
};

export function NoticeCategoryBadge({ code, label, compact = false, isDark }: NoticeCategoryBadgeProps) {
  const theme = useTheme();
  const { backgroundColor } = getNoticeCategoryPresentation(code, isDark ?? theme.palette.mode === 'dark');
  return <Chip label={label} size="small"
    data-testid={compact ? 'list-category-chip' : undefined}
    sx={{
      bgcolor: backgroundColor,
      color: label === '필독' ? '#ffffff' : theme.palette.getContrastText(backgroundColor),
      height: compact ? 22 : 28, borderRadius: '8px', fontWeight: 700, flexShrink: 0,
      ...(compact ? { ml: 'auto' } : {}),
    }} />;
}

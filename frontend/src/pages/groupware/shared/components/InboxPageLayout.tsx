import {
  Box,
  ListItem,
  ListItemButton,
  Paper,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { formatInboxDateTime } from '../utils/formatInboxDateTime';

type InboxPageShellProps = {
  title: string;
  description: string;
  action?: ReactNode;
  toolbar?: ReactNode;
  children: ReactNode;
  fillHeight?: boolean;
};

export function InboxPageShell({
  title,
  description,
  action,
  toolbar,
  children,
  fillHeight = false,
}: InboxPageShellProps) {
  return (
    <Box
      data-testid={fillHeight ? 'message-inbox-shell' : undefined}
      sx={{
        p: { xs: 1.5, sm: 2.5 },
        width: '100%',
        minHeight: 0,
        overflow: fillHeight ? 'hidden' : 'auto',
        ...(fillHeight ? { height: '100%', flex: 1, display: 'flex', flexDirection: 'column' } : {}),
      }}
    >
      <Box
        sx={{
          maxWidth: 1200,
          mx: 'auto',
          width: '100%',
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 1.5,
          ...(fillHeight ? { flex: 1, overflow: 'hidden' } : {}),
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h5" component="h2" sx={{ fontWeight: 700 }}>{title}</Typography>
            <Typography variant="body2" color="text.secondary">{description}</Typography>
          </Box>
          {action ? <Box sx={{ flexShrink: 0 }}>{action}</Box> : null}
        </Box>
        {toolbar}
        {children}
      </Box>
    </Box>
  );
}

type InboxFilterOption<T extends string> = { value: T; label: string };

type InboxFilterToggleProps<T extends string> = {
  value: T;
  options: InboxFilterOption<T>[];
  ariaLabel: string;
  onChange: (value: T) => void;
};

export function InboxFilterToggle<T extends string>({ value, options, ariaLabel, onChange }: InboxFilterToggleProps<T>) {
  return (
    <ToggleButtonGroup
      exclusive
      size="small"
      value={value}
      aria-label={ariaLabel}
      onChange={(_, next: T | null) => {
        if (next) onChange(next);
      }}
      sx={{ alignSelf: 'flex-start' }}
    >
      {options.map((option) => (
        <ToggleButton key={option.value} value={option.value} sx={{ px: 2 }}>
          {option.label}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}

export function InboxPanel({
  children,
  sx,
  testId,
}: {
  children: ReactNode;
  sx?: SxProps<Theme>;
  testId?: string;
}) {
  return (
    <Paper
      data-testid={testId}
      variant="outlined"
      sx={[{ minWidth: 0, borderRadius: 2, overflow: 'auto' }, ...(Array.isArray(sx) ? sx : [sx])]}
    >
      {children}
    </Paper>
  );
}

export function InboxEmptyState({ children }: { children: ReactNode }) {
  return (
    <Typography color="text.secondary" sx={{ p: 4, textAlign: 'center' }}>
      {children}
    </Typography>
  );
}

type InboxListItemProps = {
  title: ReactNode;
  summary?: ReactNode;
  dateTime: string;
  unread: boolean;
  unreadCount?: number;
  category?: { label: string; icon: ReactNode };
  action?: ReactNode;
  selected?: boolean;
  ariaLabel?: string;
  onClick: () => void;
};

export function InboxListItem({
  title,
  summary,
  dateTime,
  unread,
  unreadCount,
  category,
  action,
  selected,
  ariaLabel,
  onClick,
}: InboxListItemProps) {
  return (
    <ListItem
      disablePadding
      divider
      secondaryAction={action}
    >
      <ListItemButton
        selected={selected}
        onClick={onClick}
        aria-label={ariaLabel}
        sx={{
          alignItems: 'center',
          gap: 1.5,
          py: 1.25,
          bgcolor: unread && !selected ? 'action.hover' : undefined,
          pr: action ? 7 : undefined,
        }}
      >
        {category ? (
          <Tooltip title={category.label}>
            <Box
              component="span"
              role="img"
              aria-label={category.label}
              sx={{
                width: 24,
                height: 24,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                color: 'text.secondary',
              }}
            >
              {category.icon}
            </Box>
          </Tooltip>
        ) : null}
        <Box
          aria-hidden
          sx={{
            width: 8,
            height: 8,
            mt: 0.875,
            flexShrink: 0,
            borderRadius: '50%',
            bgcolor: unread ? 'primary.main' : 'transparent',
          }}
        />
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
            <Typography
              component="span"
              sx={{
                fontWeight: unread ? 700 : 500,
                minWidth: 0,
                flex: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {title}
            </Typography>
            {unreadCount && unreadCount > 0 ? (
              <Box
                component="span"
                sx={{
                  flexShrink: 0,
                  px: 0.75,
                  minWidth: 20,
                  borderRadius: 10,
                  bgcolor: 'error.main',
                  color: 'error.contrastText',
                  fontSize: '0.75rem',
                  lineHeight: '20px',
                  textAlign: 'center',
                }}
              >
                {unreadCount}
              </Box>
            ) : null}
          </Box>
          {summary ? (
            <Typography
              component="span"
              variant="body2"
              color="text.secondary"
              sx={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            >
              {summary}
            </Typography>
          ) : null}
          <Typography component="span" variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
            {formatInboxDateTime(dateTime)}
          </Typography>
        </Box>
      </ListItemButton>
    </ListItem>
  );
}

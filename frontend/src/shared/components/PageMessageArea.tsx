import { Alert, Box, type AlertProps } from '@mui/material';
import type { ReactNode } from 'react';

type PageMessageAreaProps = {
  message: string;
  onClose?: () => void;
  severity?: AlertProps['severity'];
  action?: ReactNode;
  role?: 'alert' | 'status';
};

function normalizePageMessage(message: string): string {
  const lines = message
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  const deduped: string[] = [];
  for (const line of lines) {
    const previous = deduped[deduped.length - 1];
    if (previous === line) {
      continue;
    }
    deduped.push(line);
  }

  return deduped.join('\n');
}

export function PageMessageArea({
  message,
  onClose,
  severity = 'error',
  action,
  role = 'alert',
}: PageMessageAreaProps) {
  const normalizedMessage = normalizePageMessage(message);

  if (!normalizedMessage) return null;

  return (
    <Box sx={{ px: { xs: 1.5, sm: 3 }, pt: 2, pb: 2 }}>
      <Alert
        severity={severity}
        onClose={onClose}
        action={action}
        role={role}
        sx={{
          overflowWrap: 'anywhere',
          whiteSpace: 'pre-line',
          ...(action && {
            flexWrap: 'wrap',
            '& .MuiAlert-message': { flex: '1 1 240px', minWidth: 0 },
            '& .MuiAlert-action': { m: 0, p: 0, alignSelf: 'center' },
          }),
        }}
      >
        {normalizedMessage}
      </Alert>
    </Box>
  );
}

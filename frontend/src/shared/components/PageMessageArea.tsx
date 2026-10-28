import { Alert, Box, type AlertProps } from '@mui/material';

type PageMessageAreaProps = {
  message: string;
  onClose: () => void;
  severity?: AlertProps['severity'];
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
}: PageMessageAreaProps) {
  const normalizedMessage = normalizePageMessage(message);

  if (!normalizedMessage) return null;

  return (
    <Box sx={{ px: { xs: 1.5, sm: 3 }, pt: 2, pb: 2 }}>
      <Alert
        severity={severity}
        onClose={onClose}
        sx={{ overflowWrap: 'anywhere', whiteSpace: 'pre-line' }}
      >
        {normalizedMessage}
      </Alert>
    </Box>
  );
}

import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import { Box, Button, Typography } from '@mui/material';
import { useState } from 'react';

export function DocCodeBlock({ code }: { code: string }) {
  const [status, setStatus] = useState('');

  async function copyCode() {
    try {
      if (!navigator.clipboard) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(code);
      setStatus('Copied');
    } catch {
      setStatus('Copy failed');
    }
  }

  return (
    <Box className="f1-doc-code-block">
      <Button
        size="small"
        startIcon={<ContentCopyRoundedIcon />}
        onClick={copyCode}
        aria-label="Copy code"
      >
        {status || 'Copy code'}
      </Button>
      <Typography component="pre">{code}</Typography>
    </Box>
  );
}

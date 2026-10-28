import { Typography, useTheme } from '@mui/material';
import { useEffect, useState } from 'react';
import {
  getSessionRemainingLabel,
  getStoredAuth,
} from '../../../shared/services/authService';

export function SessionCountdownLabel() {
  const theme = useTheme();
  const [label, setLabel] = useState(() =>
    getSessionRemainingLabel(getStoredAuth()),
  );

  useEffect(() => {
    const updateLabel = () =>
      setLabel(getSessionRemainingLabel(getStoredAuth()));
    updateLabel();
    const intervalId = window.setInterval(updateLabel, 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <Typography
      variant="caption"
      sx={{
        px: 1,
        py: 0.5,
        borderRadius: 1,
        bgcolor: theme.palette.action.hover,
        color: theme.palette.text.secondary,
        fontWeight: 700,
      }}
    >
      로그인 유지 시간 {label}
    </Typography>
  );
}

import { Box, Container, Stack, useTheme } from '@mui/material';
import type { ReactNode } from 'react';

interface AuthLayoutProps {
  children: ReactNode;
}

function AuthLayout({ children }: AuthLayoutProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: isDark
          ? 'radial-gradient(circle at top, rgba(59,130,246,0.18), rgba(15,23,42,0.96) 42%, rgba(2,6,23,1) 100%)'
          : 'linear-gradient(135deg, rgba(14,116,144,0.08) 0%, rgba(37,99,235,0.06) 30%, rgba(15,23,42,0.03) 100%)',
        px: 2,
        py: 4,
      }}
    >
      <Container maxWidth="sm" disableGutters>
        <Stack spacing={0} sx={{ alignItems: 'center' }}>
          {children}
        </Stack>
      </Container>
    </Box>
  );
}

export default AuthLayout;

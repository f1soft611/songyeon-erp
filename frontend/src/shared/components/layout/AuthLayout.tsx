import { Box, Container, Stack, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import type { ReactNode } from 'react';

interface AuthLayoutProps {
  children: ReactNode;
}

function AuthLayout({ children }: AuthLayoutProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Box
      component="main"
      sx={{
        flex: '1 1 0%',
        minHeight: 0,
        width: '100%',
        display: 'flex',
        alignItems: 'stretch',
        justifyContent: 'center',
        overflowY: 'auto',
        boxSizing: 'border-box',
        bgcolor: 'background.default',
        backgroundImage: `radial-gradient(ellipse at 50% 0%, ${alpha(theme.palette.primary.main, isDark ? 0.14 : 0.07)}, transparent 62%)`,
        px: { xs: 2, sm: 3 },
        py: { xs: 2, sm: 3 },
      }}
    >
      <Container maxWidth="sm" disableGutters sx={{ my: 'auto' }}>
        <Stack spacing={0} sx={{ alignItems: 'center' }}>
          {children}
        </Stack>
      </Container>
    </Box>
  );
}

export default AuthLayout;

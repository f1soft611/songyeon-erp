import { Box, Button, Typography, useTheme } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { isAuthenticated } from '../../shared/services/authService';

export function NotFoundPage() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const handleBack = () => {
    navigate(isAuthenticated() ? '/' : '/login', { replace: true });
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: theme.palette.background.default,
        color: theme.palette.text.primary,
        px: 2,
        position: 'relative',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: 1.5,
          mb: 10,
        }}
      >
        <Typography
          variant="h6"
          sx={{
            fontWeight: 700,
            fontSize: '1.05rem',
            lineHeight: 1.4,
            color: theme.palette.text.primary,
          }}
        >
          요청하신 페이지를 찾을 수 없습니다
        </Typography>

        <Typography
          variant="body2"
          sx={{
            color: theme.palette.text.secondary,
            fontSize: '0.78rem',
            lineHeight: 1.6,
          }}
        >
          주소가 변경되었거나 페이지가 삭제되었을 수 있습니다.
        </Typography>

        <Button
          variant="contained"
          onClick={handleBack}
          sx={{
            mt: 0.5,
            minWidth: 92,
            height: 36,
            borderRadius: 1,
            bgcolor: isDark ? '#e2e8f0' : '#111827',
            color: isDark ? '#0f172a' : '#ffffff',
            fontWeight: 700,
            fontSize: '0.82rem',
            textTransform: 'none',
            boxShadow: 'none',
            '&:hover': {
              bgcolor: isDark ? '#f8fafc' : '#1f2937',
              boxShadow: 'none',
            },
          }}
        >
          돌아가기
        </Button>
      </Box>

      <Typography
        variant="caption"
        sx={{
          position: 'absolute',
          bottom: 20,
          color: theme.palette.text.secondary,
          fontSize: '0.72rem',
          letterSpacing: '0.01em',
        }}
      >
        © 2026 SONGYEON ERP · F1soft
      </Typography>
    </Box>
  );
}

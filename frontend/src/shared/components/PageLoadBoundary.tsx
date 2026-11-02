import ReplayOutlined from '@mui/icons-material/ReplayOutlined';
import { Box, IconButton, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import type { PageLoadError } from '../hooks/useInitialLoadState';

type PageLoadBoundaryProps = {
  error: PageLoadError | null;
  loading: boolean;
  label: string;
  onRetry: () => void;
  children?: ReactNode;
};

const messages: Record<PageLoadError, string> = {
  network: '서버에 연결하지 못했습니다. 네트워크 상태를 확인한 뒤 다시 시도해 주세요.',
  authentication: '로그인이 필요합니다. 다시 로그인해 주세요.',
  forbidden: '조회 권한이 없습니다. 접근 권한을 확인해 주세요.',
  server: '정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.',
};

export function PageLoadBoundary({
  error, loading, label, onRetry, children,
}: PageLoadBoundaryProps) {
  if (!error) return children;

  return (
    <Box
      role="alert"
      aria-busy={loading}
      sx={{
        flex: 1, minHeight: 240, minWidth: 0, width: '100%',
        boxSizing: 'border-box', p: { xs: 2, sm: 3 },
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', gap: 2, bgcolor: 'background.default',
        color: 'text.primary',
      }}
    >
      <Typography variant="body2" align="center" sx={{ overflowWrap: 'anywhere' }}>
        {messages[error]}
      </Typography>
      <IconButton
        aria-label={`${label} 다시 불러오기`}
        disabled={loading}
        onClick={onRetry}
      >
        <ReplayOutlined />
      </IconButton>
    </Box>
  );
}

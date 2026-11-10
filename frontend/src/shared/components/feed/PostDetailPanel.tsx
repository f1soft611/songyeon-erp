import {
  Box,
  IconButton,
  Paper,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import type { ReactNode } from 'react';
import { AppLoadingSpinner } from '../AppLoadingSpinner';

type PostDetailPanelProps = {
  title?: string;
  subtitle?: string;
  onClose: () => void;
  isLoading?: boolean;
  loadingLabel?: string;
  children: ReactNode;
};

export function PostDetailPanel({
  title = '게시글 상세',
  subtitle,
  onClose,
  isLoading = false,
  loadingLabel = '상세 불러오는 중',
  children,
}: PostDetailPanelProps) {
  return (
    <Paper
      component="section"
      aria-label={title}
      data-testid="post-detail-panel"
      data-layout="full-height-overlay"
      elevation={0}
      sx={{
        width: '100%',
        height: '100%',
        minHeight: 0,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 0,
        bgcolor: 'background.paper',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
          px: 1.5,
          py: 1,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography component="h2" variant="subtitle1" sx={{ fontWeight: 700 }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
        <IconButton size="small" aria-label="상세 닫기" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>
      <Box
        data-testid="post-detail-panel-content"
        data-scroll-container="true"
        role={isLoading ? 'status' : undefined}
        aria-label={isLoading ? loadingLabel : undefined}
        sx={{
          minWidth: 0,
          minHeight: 0,
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          p: 1.5,
          ...(isLoading && {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }),
        }}
      >
        {isLoading ? (
          <AppLoadingSpinner size={40} aria-label={loadingLabel} />
        ) : (
          children
        )}
      </Box>
    </Paper>
  );
}

import { Box } from '@mui/material';
import { useEffect, type ReactNode } from 'react';

type PageAreaOverlayProps = {
  children: ReactNode;
  onClose: () => void;
};

export function PageAreaOverlay({ children, onClose }: PageAreaOverlayProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <Box
      data-testid="page-area-overlay"
      data-overlay-scope="page-content"
      role="presentation"
      sx={{
        position: 'absolute',
        inset: 0,
        zIndex: 20,
        overflow: 'hidden',
      }}
    >
      <Box
        data-testid="page-area-overlay-backdrop"
        aria-hidden="true"
        onClick={onClose}
        sx={{
          position: 'absolute',
          inset: 0,
          bgcolor: 'rgba(15, 23, 42, 0.24)',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          justifyContent: 'flex-end',
          pointerEvents: 'none',
        }}
      >
        <Box
          sx={{
            width: 'min(975px, 72vw)',
            maxWidth: '100%',
            height: '100%',
            minHeight: 0,
            pointerEvents: 'auto',
            '@media (max-width: 767px)': {
              width: '100%',
            },
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}

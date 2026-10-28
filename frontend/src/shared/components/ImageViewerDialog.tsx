import { useEffect, useState } from 'react';
import CloseIcon from '@mui/icons-material/Close';
import {
  Box,
  Dialog,
  DialogContent,
  IconButton,
  Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';

export type ImageViewerDialogProps = {
  open: boolean;
  src: string;
  alt?: string;
  onClose: () => void;
  title?: string;
};

export function ImageViewerDialog({
  open,
  src,
  alt = '원본 이미지',
  onClose,
  title = '이미지 보기',
}: ImageViewerDialogProps) {
  const [displaySrc, setDisplaySrc] = useState(src);
  const theme = useTheme();
  const checkerColor = alpha(
    theme.palette.text.primary,
    theme.palette.mode === 'dark' ? 0.12 : 0.08,
  );

  useEffect(() => {
    setDisplaySrc(src);
    return undefined;
  }, [src]);

  if (!open || !src) {
    return null;
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      aria-labelledby="image-viewer-dialog-title"
      slotProps={{
        paper: {
          sx: {
            borderRadius: 2,
            overflow: 'hidden',
            bgcolor: 'background.paper',
            color: 'text.primary',
            border: '1px solid',
            borderColor: 'divider',
          },
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: 1.25,
          borderBottom: '1px solid',
          borderColor: 'divider',
          backgroundColor: 'background.paper',
        }}
      >
        <Typography
          id="image-viewer-dialog-title"
          variant="subtitle1"
          sx={{ fontWeight: 700, color: 'text.primary' }}
        >
          {title}
        </Typography>
        <IconButton
          aria-label="이미지 뷰어 닫기"
          onClick={onClose}
          sx={{ color: 'text.primary' }}
        >
          <CloseIcon />
        </IconButton>
      </Box>

      <DialogContent
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 1.5,
          backgroundColor: 'background.default',
          overflow: 'auto',
        }}
      >
        <Box
          data-testid="image-viewer-canvas"
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            minHeight: 'min(30vh, 200px)',
            maxHeight: '72vh',
            overflow: 'auto',
            backgroundColor: 'background.default',
            backgroundImage: `repeating-conic-gradient(${checkerColor} 0% 25%, transparent 0% 50%)`,
            backgroundSize: '16px 16px',
          }}
        >
          <Box
            component="img"
            src={displaySrc}
            alt={alt}
            role="img"
            aria-label={alt}
            sx={{
              display: 'block',
              maxWidth: '100%',
              maxHeight: '72vh',
              width: 'auto',
              height: 'auto',
              objectFit: 'contain',
              borderRadius: 1,
            }}
          />
        </Box>
      </DialogContent>
    </Dialog>
  );
}

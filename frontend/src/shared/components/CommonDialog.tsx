import CloseIcon from '@mui/icons-material/Close';
import {
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Tooltip,
  Typography,
  useMediaQuery,
} from '@mui/material';
import type { DialogProps } from '@mui/material/Dialog';
import { useTheme } from '@mui/material/styles';
import { useId } from 'react';
import type { CSSProperties, ReactNode } from 'react';

export type CommonDialogSize = 'xs' | 'md' | 'lg';
export type CommonDialogBodyMode = 'content' | 'fill';

export type CommonDialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  titleAside?: ReactNode;
  children: ReactNode;
  footerStart?: ReactNode;
  actions?: ReactNode;
  size?: CommonDialogSize;
  bodyMode?: CommonDialogBodyMode;
  paperHeight?: CSSProperties['height'];
  surfaceBackgroundColor?: CSSProperties['backgroundColor'];
  fullScreenOnMobile?: boolean;
  dialogProps?: Omit<
    DialogProps,
    'open' | 'onClose' | 'children' | 'fullWidth' | 'maxWidth' | 'fullScreen'
  > & { [key: `data-${string}`]: string | number | undefined };
};

export function CommonDialog({
  open,
  onClose,
  title,
  description,
  titleAside,
  children,
  footerStart,
  actions,
  size = 'md',
  bodyMode = 'content',
  paperHeight,
  surfaceBackgroundColor,
  fullScreenOnMobile = false,
  dialogProps,
}: CommonDialogProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const fullScreen = fullScreenOnMobile && isMobile;
  const titleId = useId();
  const descriptionId = useId();
  const maxWidth = size === 'xs' ? 480 : size === 'lg' ? 990 : 820;
  const hasFooter = Boolean(footerStart || actions);
  const surfaceBackground =
    surfaceBackgroundColor ??
    (theme.palette.mode === 'dark' ? '#1e293b' : '#ffffff');
  return (
    <Dialog
      {...dialogProps}
      open={open}
      onClose={onClose}
      fullScreen={fullScreen}
      fullWidth
      maxWidth={false}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      slotProps={{
        paper: {
          style: fullScreen
            ? undefined
            : {
                width: `min(${maxWidth}px, calc(100vw - 48px))`,
                maxWidth: `${maxWidth}px`,
                maxHeight: bodyMode === 'fill' ? '880px' : '85vh',
                ...(paperHeight !== undefined || bodyMode === 'fill'
                  ? { height: paperHeight ?? '90vh' }
                  : {}),
                ...(surfaceBackgroundColor !== undefined
                  ? { backgroundColor: surfaceBackgroundColor }
                  : {}),
              },
          sx: {
            bgcolor: surfaceBackground,
            border: fullScreen ? 0 : 1,
            borderColor: 'divider',
            borderRadius: fullScreen ? 0 : 1,
            boxShadow: fullScreen
              ? 'none'
              : '0 18px 50px rgba(15, 23, 42, 0.12)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            width: '100%',
          },
        },
      }}
    >
      <Box
        style={
          surfaceBackgroundColor !== undefined
            ? { backgroundColor: surfaceBackgroundColor }
            : undefined
        }
        sx={{
          alignItems: 'flex-start',
          borderBottom: 1,
          borderColor: 'divider',
          display: 'flex',
          flexShrink: 0,
          gap: 2,
          justifyContent: 'space-between',
          bgcolor: surfaceBackground,
          px: { xs: 2, sm: 3 },
          py: 1.75,
        }}
      >
        <Box sx={{
          minWidth: 0,
          width: '100%',
          ...(titleAside ? {
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) auto',
            alignItems: 'center',
            columnGap: 1.5,
          } : {}),
        }}>
          <DialogTitle
            component="h2"
            id={titleId}
            sx={{
              color: 'text.primary',
              fontSize: { xs: '1.1rem', sm: '1.25rem' },
              fontWeight: 700,
              lineHeight: 1.3,
              p: 0,
            }}
          >
            {title}
          </DialogTitle>
          {titleAside}
          {description && (
            <Typography
              id={descriptionId}
              component="p"
              variant="body2"
              sx={{ color: 'text.secondary', mt: 0.5, ...(titleAside ? { gridColumn: '1 / -1' } : {}) }}
            >
              {description}
            </Typography>
          )}
        </Box>
        <Tooltip title="닫기">
          <IconButton
            aria-label="닫기"
            onClick={onClose}
            size="small"
            sx={{ flexShrink: 0, mt: -0.25 }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      <DialogContent
        style={{
          flex: bodyMode === 'fill' ? '1 1 auto' : '0 1 auto',
          minHeight: 0,
          overflowY: 'auto',
          ...(surfaceBackgroundColor !== undefined
            ? { backgroundColor: surfaceBackgroundColor }
            : {}),
        }}
        sx={{
          bgcolor: surfaceBackground,
          px: { xs: 2, sm: 3 },
          py: 2,
        }}
      >
        {children}
      </DialogContent>

      {hasFooter && <Divider />}
      {hasFooter && (
        <DialogActions
          style={
            surfaceBackgroundColor !== undefined
              ? { backgroundColor: surfaceBackgroundColor }
              : undefined
          }
          sx={{
            alignItems: 'center',
            bgcolor: surfaceBackground,
            flexShrink: 0,
            flexWrap: 'wrap',
            gap: 1,
            justifyContent: footerStart ? 'space-between' : 'flex-end',
            px: { xs: 2, sm: 3 },
            py: 1.5,
          }}
        >
          {footerStart && (
            <Box
              data-testid="common-dialog-footer-start"
              sx={{
                alignItems: 'center',
                display: 'flex',
                flex: '1 1 auto',
                flexWrap: 'wrap',
                gap: 1,
                minWidth: 0,
              }}
            >
              {footerStart}
            </Box>
          )}
          {actions && (
            <Box
              data-testid="common-dialog-actions"
              sx={{ display: 'flex', flexShrink: 0, gap: 1 }}
            >
              {actions}
            </Box>
          )}
        </DialogActions>
      )}
    </Dialog>
  );
}

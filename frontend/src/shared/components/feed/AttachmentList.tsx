import type { ReactNode } from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import {
  getAttachmentExtension,
  getAttachmentIconMeta,
} from './attachmentIconMeta';

export type AttachmentListItem = {
  id: string;
  name: string;
  size?: number;
  extension?: string;
  mimeType?: string;
  previewUrl?: string;
};

export type AttachmentListProps = {
  files: AttachmentListItem[];
  isDark?: boolean;
  mode?: 'view' | 'edit';
  showActions?: boolean;
  showImagePreview?: boolean;
  onDownload?: (id: string) => void;
  onRemove?: (id: string) => void;
  statusBadge?: ReactNode;
  testId?: string;
};

export function AttachmentList({
  files,
  isDark = false,
  mode = 'view',
  showActions = true,
  showImagePreview = true,
  onDownload,
  onRemove,
  statusBadge,
  testId = 'notice-attachment-list',
}: AttachmentListProps) {
  if (files.length === 0) {
    return null;
  }

  return (
    <Box data-testid={testId} sx={{ display: 'grid', gap: 1 }}>
      {files.map((file, index) => {
        const iconMeta = getAttachmentIconMeta(file.name);
        const hasImagePreview =
          showImagePreview &&
          file.mimeType?.startsWith('image/') &&
          file.previewUrl?.startsWith('blob:');

        return (
          <Box
            key={`${file.id}-${index}`}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderRadius: 1.5,
              border: `1px solid ${
                isDark ? 'rgba(148,163,184,0.12)' : 'rgba(148,163,184,0.18)'
              }`,
              bgcolor: isDark ? 'rgba(30,41,59,0.8)' : '#ffffff',
              px: 1.25,
              py: 0.9,
              overflow: 'hidden',
            }}
          >
            {hasImagePreview && (
              <>
                <Box
                  component="img"
                  src={file.previewUrl}
                  alt={file.name}
                  sx={{
                    width: 48,
                    height: 40,
                    objectFit: 'cover',
                    borderRadius: 1,
                    flexShrink: 0,
                  }}
                />
                <Box
                  aria-hidden="true"
                  sx={{
                    width: '1px',
                    height: 24,
                    mx: 1,
                    bgcolor: 'divider',
                    flexShrink: 0,
                  }}
                />
              </>
              )}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                minWidth: 0,
                flex: 1,
              }}
            >
              <Box
                sx={{
                  width: 24,
                  height: 24,
                  borderRadius: 1,
                  backgroundColor: iconMeta.bg,
                  color: iconMeta.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.62rem',
                  fontWeight: 800,
                  flexShrink: 0,
                }}
                data-testid={`attachment-icon-${getAttachmentExtension(file.name)}`}
              >
                <iconMeta.icon
                  fontSize="small"
                  aria-label={`${iconMeta.label} 파일 아이콘`}
                />
              </Box>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 600,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  color: isDark ? '#e2e8f0' : '#0f172a',
                }}
              >
                {file.name}
              </Typography>
            </Box>

            {statusBadge}

            {showActions && (
              <IconButton
                size="small"
                aria-label={
                  mode === 'edit' ? '첨부 파일 삭제' : '첨부 파일 다운로드'
                }
                onClick={() => {
                  if (mode === 'edit') {
                    onRemove?.(file.id);
                    return;
                  }
                  onDownload?.(file.id);
                }}
                sx={{
                  minWidth: 0,
                  width: 32,
                  height: 32,
                  p: 0,
                  borderRadius: 1.5,
                  borderColor: isDark
                    ? 'rgba(148,163,184,0.28)'
                    : 'rgba(148,163,184,0.25)',
                  color: isDark ? '#e2e8f0' : '#475569',
                  backgroundColor: isDark ? 'rgba(15, 23, 42, 0.7)' : '#f8fafc',
                  '&:hover': {
                    borderColor: isDark
                      ? 'rgba(96,165,250,0.5)'
                      : 'rgba(59,130,246,0.35)',
                    backgroundColor: isDark ? 'rgba(30,41,59,0.9)' : '#f1f5f9',
                  },
                }}
              >
                {mode === 'edit' ? (
                  <DeleteOutlinedIcon
                    data-testid="DeleteIcon"
                    fontSize="small"
                  />
                ) : (
                  <FileDownloadOutlinedIcon
                    data-testid="FileDownloadOutlinedIcon"
                    fontSize="small"
                  />
                )}
              </IconButton>
            )}
          </Box>
        );
      })}
    </Box>
  );
}

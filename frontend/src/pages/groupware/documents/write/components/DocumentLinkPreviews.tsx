import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import { Box, Button, ButtonBase, Stack, Typography } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { extractDocumentShareIds, type DocumentShareReference } from '../data/documentShareLink';
import { getDocumentKindPresentation } from '../data/documentPresentation';
import { getSharedDocumentPreview, listDocumentApprovals } from '../services/documentApproval.service';
import { ApiResponseError } from '../../../../../shared/services/apiClient';
import type { DocumentApprovalRecord } from '../types/documentWrite.types';

export type DocumentLinkPreviewsProps = {
  html: string;
  onOpenDocument?: (documentId: number) => void;
};

function DocumentLinkPreview({ documentId, onOpenDocument }: {
  documentId: DocumentShareReference;
  onOpenDocument?: (documentId: number) => void;
}) {
  const [record, setRecord] = useState<DocumentApprovalRecord | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'unavailable' | 'error'>('loading');
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    let active = true;
    const request = typeof documentId === 'number'
      ? listDocumentApprovals('ALL', undefined, documentId).then((records) =>
        records.find((item) => item.electronicApprovalId === documentId) ?? null)
      : getSharedDocumentPreview(documentId);
    void request.then((next) => {
      if (!active) return;
      setRecord(next ?? null);
      setStatus(next ? 'ready' : 'unavailable');
    }).catch((error: unknown) => {
      if (active) setStatus(error instanceof ApiResponseError && [403, 404].includes(error.status)
        ? 'unavailable' : 'error');
    });
    return () => { active = false; };
  }, [documentId, retryToken]);

  const cardSx = {
    width: '100%', minWidth: 0, border: 1, borderColor: 'divider',
    borderRadius: 1.5, p: 1.5, textAlign: 'left', bgcolor: 'background.paper',
    overflowWrap: 'anywhere',
  } as const;
  if (status !== 'ready' || !record) {
    return (
      <Box sx={cardSx} role={status === 'loading' ? 'status' : undefined}>
        <Typography variant="body2" color="text.secondary">
          {status === 'loading' ? '문서 미리보기 불러오는 중…'
            : status === 'error' ? '문서 미리보기를 불러오지 못했습니다.'
              : '접근할 수 없거나 삭제된 문서입니다.'}
        </Typography>
        {status === 'error' && (
          <Button size="small" aria-label="미리보기 다시 시도" onClick={() => {
            setRecord(null);
            setStatus('loading');
            setRetryToken((token) => token + 1);
          }}>
            다시 시도
          </Button>
        )}
      </Box>
    );
  }
  return (
    <ButtonBase
      onClick={() => onOpenDocument?.(record.electronicApprovalId)}
      disabled={!onOpenDocument}
      aria-label={`문서 상세 열기: ${record.title}`}
      sx={{ ...cardSx, display: 'flex', justifyContent: 'flex-start', gap: 1.5,
        '&:hover': { bgcolor: 'action.hover' }, '&.Mui-focusVisible': { outline: '2px solid', outlineColor: 'primary.main' } }}
    >
      <DescriptionOutlinedIcon color="primary" sx={{ flexShrink: 0 }} />
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="caption" color="text.secondary">
          {getDocumentKindPresentation(record.documentType).label} · {record.drafterName}
        </Typography>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{record.title}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>{record.summary}</Typography>
      </Box>
    </ButtonBase>
  );
}

export function DocumentLinkPreviews({ html, onOpenDocument }: DocumentLinkPreviewsProps) {
  const ids = useMemo(() => extractDocumentShareIds(html), [html]);
  if (ids.length === 0) return null;
  return (
    <Stack spacing={1} sx={{ my: 1, minWidth: 0 }} data-testid="document-link-previews">
      {ids.map((id) => <DocumentLinkPreview key={id} documentId={id} onOpenDocument={onOpenDocument} />)}
    </Stack>
  );
}

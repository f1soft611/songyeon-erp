import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import CampaignOutlinedIcon from '@mui/icons-material/CampaignOutlined';
import { Box, Button, ButtonBase, Stack, Typography } from '@mui/material';
import { lazy, Suspense, useContext, useEffect, useMemo, useState } from 'react';
import { ContentDetailContext, type ContentDetailTarget } from './ContentDetailContext';
import { ApiResponseError } from '../../services/apiClient';
import { getExternalLinkPreview } from '../../services/contentLinkPreview.service';
import type { ExternalLinkPreview } from '../../services/contentLinkPreview.service';
import {
  extractContentShareLinks,
  type ContentShareLink,
  type DocumentShareReference,
} from './contentShareLinks';

const SharedContentDetailPanel = lazy(() =>
  import('../../../pages/groupware/shared/components/SharedContentDetailPanel'));

export type InternalContentPreview = {
  id: number;
  title: string;
  subtitle: string;
  description: string;
};

type FeedLinkPreviewsProps = {
  html: string;
  testId?: string;
  resolveDocument: (reference: DocumentShareReference) => Promise<InternalContentPreview | null>;
  resolveNotice: (token: string) => Promise<InternalContentPreview | null>;
  resolveExternal?: (url: string) => Promise<ExternalLinkPreview>;
  onOpenDocument?: (documentId: number) => void;
  onOpenNotice?: (noticeId: number) => void;
};

function InternalLinkPreview({
  link,
  resolveDocument,
  resolveNotice,
  onOpen,
}: {
  link: ContentShareLink;
  resolveDocument: FeedLinkPreviewsProps['resolveDocument'];
  resolveNotice: FeedLinkPreviewsProps['resolveNotice'];
  onOpen: (id: number) => void;
}) {
  const [record, setRecord] = useState<InternalContentPreview | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'unavailable' | 'error'>('loading');
  const [retryToken, setRetryToken] = useState(0);
  const isDocument = link.kind === 'document';
  const kindLabel = isDocument ? '시스템 문서' : '공지사항';
  const unavailableMessage = isDocument
    ? '접근할 수 없거나 삭제된 문서입니다.'
    : '접근할 수 없거나 삭제된 공지입니다.';

  useEffect(() => {
    let active = true;
    const request = link.kind === 'document'
      ? resolveDocument(link.reference)
      : resolveNotice(link.token);
    void request.then((next) => {
      if (!active) return;
      setRecord(next);
      setStatus(next ? 'ready' : 'unavailable');
    }).catch((error: unknown) => {
      if (!active) return;
      setStatus(error instanceof ApiResponseError && [403, 404].includes(error.status)
        ? 'unavailable' : 'error');
    });
    return () => { active = false; };
  }, [link, resolveDocument, resolveNotice, retryToken]);

  const cardSx = {
    width: '100%', minWidth: 0, border: 1, borderColor: 'divider',
    borderRadius: 1.5, p: 1.5, textAlign: 'left', bgcolor: 'background.paper',
    overflowWrap: 'anywhere',
  } as const;
  if (status !== 'ready' || !record) {
    return (
      <Box sx={cardSx} role={status === 'loading' ? 'status' : undefined}>
        <Typography variant="caption" color="text.secondary">{kindLabel}</Typography>
        <Typography variant="body2" color="text.secondary">
          {status === 'loading' ? `${isDocument ? '문서' : '공지'} 미리보기 불러오는 중…`
            : status === 'error' ? `${isDocument ? '문서' : '공지'} 미리보기를 불러오지 못했습니다.`
              : unavailableMessage}
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

  const content = (
    <>
      {isDocument
        ? <DescriptionOutlinedIcon color="primary" sx={{ flexShrink: 0 }} />
        : <CampaignOutlinedIcon color="primary" sx={{ flexShrink: 0 }} />}
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="caption" color="text.secondary">{kindLabel}</Typography>
        {record.subtitle && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
            {record.subtitle}
          </Typography>
        )}
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{record.title}</Typography>
        {record.description && (
          <Typography variant="body2" color="text.secondary" sx={{
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {record.description}
          </Typography>
        )}
      </Box>
    </>
  );
  const actionLabel = `${isDocument ? '문서' : '공지'} 상세 열기: ${record.title}`;
  return (
    <ButtonBase
      onClick={() => onOpen(record.id)}
      aria-label={actionLabel}
      sx={{
        ...cardSx, display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: 1.5,
        '&:hover': { bgcolor: 'action.hover' },
        '&.Mui-focusVisible': { outline: '2px solid', outlineColor: 'primary.main' },
      }}
    >
      {content}
    </ButtonBase>
  );
}

function ExternalLinkPreview({
  url,
  resolver,
}: {
  url: string;
  resolver: (url: string) => Promise<ExternalLinkPreview>;
}) {
  const [record, setRecord] = useState<ExternalLinkPreview | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    let active = true;
    void resolver(url).then((next) => {
      if (!active) return;
      setRecord(next);
      setStatus('ready');
    }).catch(() => {
      if (active) setStatus('error');
    });
    return () => { active = false; };
  }, [url, resolver]);

  const cardSx = {
    display: 'flex', alignItems: 'stretch', gap: 1.5, width: '100%', minWidth: 0,
    border: 1, borderColor: 'divider', borderRadius: 1.5, p: 1.5,
    color: 'inherit', textDecoration: 'none', bgcolor: 'background.paper',
    overflowWrap: 'anywhere',
    '&:hover': { bgcolor: 'action.hover' },
    '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main' },
  } as const;

  return (
    <Box sx={{ minWidth: 0 }}>
      <Box
        component="a"
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`외부 링크 열기: ${record?.title ?? url}`}
        sx={cardSx}
      >
        {record?.imageUrl && (
          <Box
            component="img"
            src={record.imageUrl}
            alt={record.title}
            loading="lazy"
            referrerPolicy="no-referrer"
            sx={{ width: 96, height: 72, flexShrink: 0, borderRadius: 1, objectFit: 'cover' }}
          />
        )}
        <Box sx={{ minWidth: 0 }}>
          {status === 'loading' && (
            <Typography variant="body2" color="text.secondary" role="status">
              웹 링크 미리보기 불러오는 중…
            </Typography>
          )}
          {status === 'error' && (
            <Typography variant="body2" color="text.secondary">
              웹 링크 미리보기를 불러오지 못했습니다.
            </Typography>
          )}
          {record && (
            <>
              <Typography variant="caption" color="text.secondary">{record.siteName}</Typography>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{record.title}</Typography>
              {record.description && (
                <Typography variant="body2" color="text.secondary" sx={{
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                }}>
                  {record.description}
                </Typography>
              )}
            </>
          )}
          {status === 'error' && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              {url}
            </Typography>
          )}
        </Box>
      </Box>
    </Box>
  );
}

export function FeedLinkPreviews({
  html,
  testId = 'feed-link-previews',
  resolveDocument,
  resolveNotice,
  resolveExternal = getExternalLinkPreview,
  onOpenDocument,
  onOpenNotice,
}: FeedLinkPreviewsProps) {
  const openContentDetail = useContext(ContentDetailContext);
  const [detailTarget, setDetailTarget] = useState<ContentDetailTarget | null>(null);
  const links = useMemo(() => extractContentShareLinks(html), [html]);
  if (links.length === 0) return null;
  return (
    <>
      <Stack spacing={1} sx={{ my: 1, minWidth: 0 }} data-testid={testId}>
        {links.map((link) => {
          if (link.kind === 'document') {
            return (
              <InternalLinkPreview
                key={`document:${link.href}`}
                link={link}
                resolveDocument={resolveDocument}
                resolveNotice={resolveNotice}
                onOpen={(id) => {
                  if (openContentDetail) openContentDetail({ kind: 'document', id });
                  else if (onOpenDocument) onOpenDocument(id);
                  else setDetailTarget({ kind: 'document', id });
                }}
              />
            );
          }
          if (link.kind === 'notice') {
            return (
              <InternalLinkPreview
                key={`notice:${link.href}`}
                link={link}
                resolveDocument={resolveDocument}
                resolveNotice={resolveNotice}
                onOpen={(id) => {
                  if (openContentDetail) openContentDetail({ kind: 'notice', id });
                  else if (onOpenNotice) onOpenNotice(id);
                  else setDetailTarget({ kind: 'notice', id });
                }}
              />
            );
          }
          return (
            <ExternalLinkPreview
              key={`external:${link.url}`}
              url={link.url}
              resolver={resolveExternal}
            />
          );
        })}
      </Stack>
      {detailTarget && (
        <Suspense fallback={null}>
          <SharedContentDetailPanel
            target={detailTarget}
            onOpen={setDetailTarget}
            onClose={() => setDetailTarget(null)}
          />
        </Suspense>
      )}
    </>
  );
}

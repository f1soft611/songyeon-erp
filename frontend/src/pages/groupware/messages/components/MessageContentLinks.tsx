import { Box, Link as MuiLink } from '@mui/material';
import { Fragment, useMemo } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { DocumentLinkPreviews } from '../../documents/write/components/DocumentLinkPreviews';

const URL_PATTERN = /https?:\/\/[^\s<>"']+/gi;
const TRAILING_PUNCTUATION = /[.,;!?)\]}]+$/;

type ContentPart = { kind: 'text'; value: string } | { kind: 'url'; value: string };

function splitContent(content: string): ContentPart[] {
  const parts: ContentPart[] = [];
  let cursor = 0;
  for (const match of content.matchAll(URL_PATTERN)) {
    const url = match[0].replace(TRAILING_PUNCTUATION, '');
    const start = match.index ?? 0;
    if (start > cursor) parts.push({ kind: 'text', value: content.slice(cursor, start) });
    parts.push({ kind: 'url', value: url });
    cursor = start + url.length;
  }
  if (cursor < content.length) parts.push({ kind: 'text', value: content.slice(cursor) });
  return parts;
}

function sameOriginPath(value: string): string | null {
  try {
    const url = new URL(value);
    return url.origin === window.location.origin ? `${url.pathname}${url.search}${url.hash}` : null;
  } catch {
    return null;
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function MessageLinkifiedText({ content }: { content: string }) {
  const parts = useMemo(() => splitContent(content), [content]);
  const linkSx = { color: 'inherit', textDecoration: 'underline', overflowWrap: 'anywhere' } as const;
  return (
    <>
      {parts.map((part, index) => {
        if (part.kind === 'text') return <Fragment key={index}>{part.value}</Fragment>;
        const internalPath = sameOriginPath(part.value);
        return internalPath ? (
          <MuiLink key={index} component={RouterLink} to={internalPath} sx={linkSx}>
            {part.value}
          </MuiLink>
        ) : (
          <MuiLink key={index} href={part.value} target="_blank" rel="noopener noreferrer" sx={linkSx}>
            {part.value}
          </MuiLink>
        );
      })}
    </>
  );
}

export function MessageLinkPreviews({ content }: { content: string }) {
  const hasUrl = useMemo(() => new RegExp(URL_PATTERN.source, 'i').test(content), [content]);
  const html = useMemo(() => escapeHtml(content), [content]);
  if (!hasUrl) return null;
  return (
    <Box sx={{ width: { xs: 240, sm: 300 }, maxWidth: '100%', '& > .MuiStack-root': { my: 0.5 } }}>
      <DocumentLinkPreviews html={html} testId="message-link-previews" />
    </Box>
  );
}

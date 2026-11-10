import { createDocumentShareToken, getSharedDocumentPreview } from '../services/documentApproval.service';
import {
  extractContentShareLinks,
  parseContentShareLink,
  type DocumentShareReference,
} from '../../../../../shared/components/feed/contentShareLinks';

const DOCUMENT_SHARE_PATH = '/groupware/doc/write';
export type { DocumentShareReference } from '../../../../../shared/components/feed/contentShareLinks';

export async function buildDocumentShareLink(documentId: number): Promise<string> {
  if (!Number.isSafeInteger(documentId) || documentId <= 0) {
    throw new Error('문서 ID가 올바르지 않습니다.');
  }
  const token = await createDocumentShareToken(documentId);
  return `${window.location.origin}${DOCUMENT_SHARE_PATH}?share=${encodeURIComponent(token)}`;
}

export function parseDocumentShareLink(value: string): DocumentShareReference | null {
  const parsed = parseContentShareLink(value);
  return parsed?.kind === 'document' ? parsed.reference : null;
}

export async function resolveDocumentShareReference(reference: DocumentShareReference): Promise<number> {
  return typeof reference === 'number' ? reference
    : (await getSharedDocumentPreview(reference)).electronicApprovalId;
}

export function extractDocumentShareIds(html: string): DocumentShareReference[] {
  return [...new Set(extractContentShareLinks(html)
    .filter((link): link is Extract<typeof link, { kind: 'document' }> => link.kind === 'document')
    .map((link) => link.reference))];
}

export function extractExternalLinkUrls(html: string): string[] {
  return [...new Set(extractContentShareLinks(html)
    .filter((link): link is Extract<typeof link, { kind: 'external' }> => link.kind === 'external')
    .map((link) => link.url))];
}

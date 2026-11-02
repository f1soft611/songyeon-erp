import { createDocumentShareToken, getSharedDocumentPreview } from '../services/documentApproval.service';

const DOCUMENT_SHARE_PATH = '/groupware/doc/write';
export type DocumentShareReference = number | string;

export async function buildDocumentShareLink(documentId: number): Promise<string> {
  if (!Number.isSafeInteger(documentId) || documentId <= 0) {
    throw new Error('문서 ID가 올바르지 않습니다.');
  }
  const token = await createDocumentShareToken(documentId);
  return `${window.location.origin}${DOCUMENT_SHARE_PATH}?share=${encodeURIComponent(token)}`;
}

export function parseDocumentShareLink(value: string): DocumentShareReference | null {
  try {
    const url = new URL(value, window.location.origin);
    if (url.origin !== window.location.origin || url.pathname !== DOCUMENT_SHARE_PATH
      || url.username || url.password) return null;
    if (url.searchParams.has('share')) {
      const token = url.searchParams.get('share') ?? '';
      return url.searchParams.getAll('share').length === 1 && !url.searchParams.has('documentId')
        && /^v1\.[A-Za-z0-9_-]{59}$/.test(token) ? token : null;
    }
    if (url.searchParams.getAll('documentId').length !== 1) return null;
    const rawId = url.searchParams.get('documentId') ?? '';
    if (!/^[1-9]\d*$/.test(rawId)) return null;
    const id = Number(rawId);
    return Number.isSafeInteger(id) ? id : null;
  } catch {
    return null;
  }
}

export async function resolveDocumentShareReference(reference: DocumentShareReference): Promise<number> {
  return typeof reference === 'number' ? reference
    : (await getSharedDocumentPreview(reference)).electronicApprovalId;
}

export function extractDocumentShareIds(html: string): DocumentShareReference[] {
  const document = new DOMParser().parseFromString(html, 'text/html');
  document.querySelectorAll('script, style').forEach((element) => element.remove());
  const candidates = [
    ...Array.from(document.querySelectorAll('a[href]'), (anchor) => anchor.getAttribute('href') ?? ''),
  ];
  const textNodes = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (textNodes.nextNode()) {
    if (textNodes.currentNode.parentElement?.closest('a')) continue;
    candidates.push(...((textNodes.currentNode.textContent ?? '').match(/https?:\/\/[^\s<>"']+/g) ?? [])
      .map((value) => value.replace(/[.,;!?)\]}]+$/, '')));
  }
  return [...new Set(candidates.map(parseDocumentShareLink).filter((id) => id !== null))];
}

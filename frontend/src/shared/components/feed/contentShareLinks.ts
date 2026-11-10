export type DocumentShareReference = number | string;

export type ContentShareLink =
  | { kind: 'document'; reference: DocumentShareReference; href: string }
  | { kind: 'notice'; token: string; href: string };

export type ContentLink =
  | ContentShareLink
  | { kind: 'external'; url: string };

const DOCUMENT_SHARE_PATH = '/groupware/doc/write';
const NOTICE_SHARE_PATH = '/groupware/community/notice';
const SHARE_TOKEN_PATTERN = /^v1\.[A-Za-z0-9_-]{59}$/;

export function parseContentShareLink(value: string): ContentShareLink | null {
  try {
    const url = new URL(value, window.location.origin);
    if (url.origin !== window.location.origin || url.username || url.password) return null;

    if (url.pathname === DOCUMENT_SHARE_PATH) {
      if (url.searchParams.has('share')) {
        const token = url.searchParams.get('share') ?? '';
        return url.searchParams.getAll('share').length === 1
          && !url.searchParams.has('documentId')
          && SHARE_TOKEN_PATTERN.test(token)
          ? { kind: 'document', reference: token, href: url.href }
          : null;
      }
      if (url.searchParams.getAll('documentId').length !== 1) return null;
      const rawId = url.searchParams.get('documentId') ?? '';
      if (!/^[1-9]\d*$/.test(rawId)) return null;
      const id = Number(rawId);
      return Number.isSafeInteger(id)
        ? { kind: 'document', reference: id, href: url.href }
        : null;
    }

    if (url.pathname === NOTICE_SHARE_PATH) {
      const token = url.searchParams.get('share') ?? '';
      return url.searchParams.getAll('share').length === 1
        && url.searchParams.size === 1
        && SHARE_TOKEN_PATTERN.test(token)
        ? { kind: 'notice', token, href: url.href }
        : null;
    }
    return null;
  } catch {
    return null;
  }
}

export function parseExternalLinkUrl(value: string): string | null {
  if (!/^https?:\/\//i.test(value)) return null;
  try {
    const url = new URL(value);
    if ((url.protocol !== 'http:' && url.protocol !== 'https:')
      || url.origin === window.location.origin || url.username || url.password) return null;
    const hostname = url.hostname.toLowerCase().replace(/\.$/, '');
    if (hostname === 'localhost' || hostname.endsWith('.localhost')
      || hostname.endsWith('.local') || hostname.endsWith('.internal')
      || hostname === '127.0.0.1' || hostname === '[::1]') return null;
    const defaultPort = url.protocol === 'https:' ? '443' : '80';
    if (url.port && url.port !== defaultPort) return null;
    url.hash = '';
    return url.href;
  } catch {
    return null;
  }
}

export function extractContentShareLinks(html: string): ContentLink[] {
  if (typeof DOMParser === 'undefined') return [];
  const document = new DOMParser().parseFromString(html, 'text/html');
  document.querySelectorAll('script, style').forEach((element) => element.remove());
  const candidates = [
    ...Array.from(document.querySelectorAll('a[href]'), (anchor) => anchor.getAttribute('href') ?? ''),
  ];
  const textNodes = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (textNodes.nextNode()) {
    if (textNodes.currentNode.parentElement?.closest('a')) continue;
    candidates.push(...((textNodes.currentNode.textContent ?? '').match(/https?:\/\/[^\s<>"']+/gi) ?? [])
      .map((value) => value.replace(/[.,;!?)\]}]+$/, '')));
  }

  const links = new Map<string, ContentLink>();
  candidates.forEach((candidate) => {
    const internal = parseContentShareLink(candidate);
    if (internal) {
      const key = `${internal.kind}:${internal.href}`;
      links.set(key, internal);
      return;
    }
    const external = parseExternalLinkUrl(candidate);
    if (external) links.set(`external:${external}`, { kind: 'external', url: external });
  });
  return Array.from(links.values());
}

export function extractExternalLinkUrls(html: string): string[] {
  return extractContentShareLinks(html)
    .filter((link): link is Extract<ContentLink, { kind: 'external' }> => link.kind === 'external')
    .map((link) => link.url);
}

import { apiPost } from './apiClient';

export type ExternalLinkPreview = {
  siteName: string;
  title: string;
  description: string;
  imageUrl: string | null;
};

export async function getExternalLinkPreview(url: string): Promise<ExternalLinkPreview> {
  const target = new URL(url);
  const hostname = target.hostname.toLowerCase().replace(/\.$/, '');
  if ((target.protocol !== 'http:' && target.protocol !== 'https:')
    || target.origin === window.location.origin || target.username || target.password
    || hostname === 'localhost' || hostname.endsWith('.localhost')
    || hostname.endsWith('.local') || hostname.endsWith('.internal')
    || hostname === '127.0.0.1' || hostname === '[::1]') {
    throw new Error('외부 링크 미리보기를 요청할 수 없습니다.');
  }
  const response = await apiPost<{ item?: unknown }>(
    '/api/v1/groupware/approvals/link-preview',
    { url },
  );
  const item = response.item;
  if (!isObject(item)
    || typeof item.siteName !== 'string'
    || typeof item.title !== 'string'
    || typeof item.description !== 'string'
    || !(item.imageUrl === null || typeof item.imageUrl === 'string')) {
    throw new Error('외부 링크 미리보기 응답을 확인할 수 없습니다.');
  }
  const imageUrl = item.imageUrl === null ? null : validateExternalPreviewImageUrl(item.imageUrl);
  return {
    siteName: item.siteName,
    title: item.title,
    description: item.description,
    imageUrl,
  };
}

function validateExternalPreviewImageUrl(value: string): string | null {
  try {
    const imageUrl = new URL(value);
    if ((imageUrl.protocol !== 'http:' && imageUrl.protocol !== 'https:')
      || imageUrl.username || imageUrl.password) return null;
    return imageUrl.href;
  } catch {
    return null;
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

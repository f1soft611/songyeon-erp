import {
  getStoredAuth,
  isAccessTokenExpiringSoon,
  isTokenExpired,
  logout,
  refreshAccessToken,
  resolveApiBaseUrl,
} from './authService';
import { ApiNetworkError, ApiResponseError, isRequestAborted } from './apiErrors';
export { ApiNetworkError, ApiResponseError } from './apiErrors';

const API_BASE_URL = resolveApiBaseUrl();

interface ApiEnvelope<T> {
  resultCode?: number | string;
  resultMessage?: string;
  result?: T;
  message?: string;
  code?: number | string;
}

async function receive<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (cause) {
    if (isRequestAborted(cause)) throw cause;
    throw new ApiNetworkError();
  }
}

export function normalizeApiErrorMessage(
  message: string | null | undefined,
): string {
  const raw = String(message ?? '').trim();
  if (!raw) {
    return '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.';
  }

  const lower = raw.toLowerCase();
  if (
    lower.includes('parent_menu_id') &&
    lower.includes('bigint') &&
    (lower.includes('character varying') || lower.includes('varchar'))
  ) {
    return '상위 메뉴 정보가 올바르지 않습니다. 상위 메뉴를 다시 선택한 뒤 저장해 주세요.';
  }

  const cleaned = raw
    .replace(/caused by:\s*/gi, '')
    .replace(
      /\b(org\.postgresql|org\.springframework|com\.mysql|java\.[^:]+):\s*/gi,
      '',
    )
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned || '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.';
}

async function getAuthorizedAuth() {
  let auth = getStoredAuth();

  if (!auth) {
    logout();
    throw new ApiResponseError('로그인이 필요합니다. 다시 로그인해주세요.', 401);
  }

  if (isTokenExpired(auth)) {
    const refreshedAuth = await refreshAccessToken();
    auth = refreshedAuth ?? getStoredAuth();

    if (!auth) {
      logout();
      throw new ApiResponseError('로그인이 만료되었습니다. 다시 로그인해주세요.', 401);
    }
  } else if (isAccessTokenExpiringSoon(auth)) {
    const refreshedAuth = await refreshAccessToken();
    auth = refreshedAuth ?? getStoredAuth();

    if (!auth) {
      logout();
      throw new ApiResponseError('세션을 갱신할 수 없어 로그아웃됩니다.', 401);
    }
  }

  return auth;
}

// 로그인 없이 여는 공개 화면(송연 현장 TV)이 쓰는 조회. 로그인 정보를 확인하지 않고(없어도 로그인 화면으로 보내지 않는다)
// 토큰도 붙이지 않는다. 서버 SecurityConfig 의 공개 GET 주소에만 쓴다.
export async function apiGetPublic<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, { headers: { 'Content-Type': 'application/json' } });
  const rawText = await response.text();
  const body = rawText ? ((JSON.parse(rawText) as ApiEnvelope<T>) ?? {}) : ({} as ApiEnvelope<T>);
  const resultCode = body.resultCode ?? body.code ?? '200';
  if (!response.ok || String(resultCode) !== '200') {
    throw new Error(normalizeApiErrorMessage(body.resultMessage || body.message || '요청이 실패했습니다.'));
  }
  return body.result ?? ({} as T);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const auth = await getAuthorizedAuth();

  const headers: Record<string, string> = {
    ...((init?.headers as Record<string, string>) ?? {}),
  };

  if (!(init?.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (auth.accessToken) {
    headers.Authorization = `Bearer ${auth.accessToken}`;
  }

  const response = await receive(() => fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  }));

  const rawText = await receive(() => response.text());
  let body: ApiEnvelope<T> = {};
  try {
    body = rawText ? ((JSON.parse(rawText) as ApiEnvelope<T>) ?? {}) : {};
  } catch (cause) {
    if (response.ok) throw cause;
    throw new ApiResponseError('요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.', response.status);
  }

  const resultCode = body.resultCode ?? body.code ?? '200';
  const resultMessage =
    body.resultMessage || body.message || '요청이 실패했습니다.';

  if (!response.ok || String(resultCode) !== '200') {
    throw new ApiResponseError(
      normalizeApiErrorMessage(resultMessage),
      response.status,
    );
  }

  return body.result ?? ({} as T);
}

export const apiGet = <T>(
  path: string,
  signal?: AbortSignal,
): Promise<T> => request<T>(path, signal ? { signal } : undefined);

export async function apiGetEventStream(path: string, signal: AbortSignal): Promise<Response> {
  const auth = await getAuthorizedAuth();
  if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
  const response = await receive(() => fetch(`${API_BASE_URL}${path}`, {
    signal,
    headers: { Accept: 'text/event-stream', Authorization: `Bearer ${auth.accessToken}` },
    cache: 'no-store',
  }));
  if (!response.ok) throw new ApiResponseError('실시간 연결을 시작할 수 없습니다.', response.status);
  return response;
}

export async function apiGetBlob(path: string): Promise<Blob> {
  const auth = await getAuthorizedAuth();
  const headers: Record<string, string> = {};
  if (auth.accessToken) {
    headers.Authorization = `Bearer ${auth.accessToken}`;
  }

  const requestUrl = /^https?:\/\//i.test(path)
    ? path
    : `${API_BASE_URL}${path}`;
  const response = await fetch(requestUrl, { headers });
  if (!response.ok) {
    throw new Error(normalizeApiErrorMessage(await response.text()));
  }

  return response.blob();
}

export async function apiDownload(
  path: string,
  downloadFileName?: string,
): Promise<void> {
  const auth = await getAuthorizedAuth();
  const headers: Record<string, string> = {};
  if (auth.accessToken) {
    headers.Authorization = `Bearer ${auth.accessToken}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, { headers });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(normalizeApiErrorMessage(message));
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  const contentDisposition = response.headers.get('Content-Disposition');
  const fileName = contentDisposition?.match(/filename="([^"]+)"/i)?.[1];
  anchor.download = downloadFileName || fileName || 'download';
  anchor.click();
  URL.revokeObjectURL(objectUrl);
}

export const apiPost = <T>(path: string, data: unknown): Promise<T> =>
  request<T>(path, { method: 'POST', body: JSON.stringify(data) });

export const apiPostFormData = <T>(
  path: string,
  formData: FormData,
): Promise<T> => request<T>(path, { method: 'POST', body: formData });

export const apiPut = <T>(path: string, data: unknown): Promise<T> =>
  request<T>(path, { method: 'PUT', body: JSON.stringify(data) });

export const apiDelete = <T>(path: string): Promise<T> =>
  request<T>(path, { method: 'DELETE' });

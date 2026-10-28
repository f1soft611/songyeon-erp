import type { LoginFormValues } from '../../pages/auth/types/auth';

export interface LoginRequest extends LoginFormValues {}

export interface AuthSession {
  popupSessionId?: string; // 공지 로그인 팝업이 로그인마다 한 번만 뜨게 쓰는 값(S_ERP 와 같음, 2026-10-22)
  tenantCode?: string; // 송연은 단일 회사라 로그인에 회사코드가 없다. S_ERP 그룹웨어 코드가 읽는 자리만 둔다(2026-10-22)
  userId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}

const AUTH_STORAGE_KEY = 'songyeon-erp-auth';
const AUTH_CHANGE_EVENT = 'songyeon-erp-auth-change';
const SESSION_NOTICE_KEY = 'songyeon-erp-session-notice';

export const resolveApiBaseUrl = (
  hostname: string = typeof window === 'undefined'
    ? 'localhost'
    : window.location.hostname,
  configuredBaseUrl: string | undefined = import.meta.env.VITE_API_BASE_URL,
): string => {
  const normalized = configuredBaseUrl?.trim();
  if (normalized) {
    return normalized.replace(/\/$/, '');
  }

  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '[::1]'
  ) {
    return 'http://localhost:8080';
  }

  return '';
};

const API_BASE_URL = resolveApiBaseUrl();
const ACCESS_TOKEN_VALIDITY_MS = 15 * 60 * 1000;
const ACCESS_TOKEN_REFRESH_BUFFER_MS = 60 * 1000;
const SESSION_WARNING_MESSAGE =
  '로그인 세션이 1분 후에 만료됩니다. 중요한 작업은 저장해 주세요.';
const SESSION_EXPIRED_MESSAGE =
  '세션이 만료되어 다시 로그인해야 합니다. 잠시 후 다시 시도해 주세요.';

const syncBrowserLocation = (nextPath: string): void => {
  if (typeof window === 'undefined') {
    return;
  }

  const currentPath = window.location.pathname;
  if (currentPath !== nextPath) {
    window.history.pushState({}, '', nextPath);
  }

  window.dispatchEvent(new PopStateEvent('popstate'));
};

const notifyAuthChange = (): void => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
  }
};

export const getStoredAuth = (): AuthSession | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const rawValue = window.localStorage.getItem(AUTH_STORAGE_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as AuthSession;
  } catch {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
};

export const isTokenExpired = (auth: AuthSession | null): boolean => {
  if (!auth?.expiresAt) {
    return true;
  }

  const expiresAt = Date.parse(auth.expiresAt);
  return Number.isNaN(expiresAt) || Date.now() >= expiresAt;
};

export const getSessionRemainingMs = (auth: AuthSession | null): number => {
  if (!auth?.expiresAt) {
    return 0;
  }

  const expiresAt = Date.parse(auth.expiresAt);
  if (Number.isNaN(expiresAt)) {
    return 0;
  }

  return Math.max(0, expiresAt - Date.now());
};

export const getSessionRemainingLabel = (auth: AuthSession | null): string => {
  const remainingMs = getSessionRemainingMs(auth);
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
};

export const isAccessTokenExpiringSoon = (
  auth: AuthSession | null,
  bufferMs: number = ACCESS_TOKEN_REFRESH_BUFFER_MS,
): boolean => {
  if (!auth?.expiresAt) {
    return true;
  }

  const expiresAt = Date.parse(auth.expiresAt);
  if (Number.isNaN(expiresAt)) {
    return true;
  }

  return Date.now() + bufferMs >= expiresAt;
};

export const setSessionNotice = (message: string | null): void => {
  if (typeof window === 'undefined') {
    return;
  }

  if (!message) {
    window.localStorage.removeItem(SESSION_NOTICE_KEY);
    return;
  }

  window.localStorage.setItem(SESSION_NOTICE_KEY, message);
};

export const readSessionNotice = (): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage.getItem(SESSION_NOTICE_KEY);
};

export const refreshAccessToken = async (): Promise<AuthSession | null> => {
  const auth = getStoredAuth();

  if (!auth?.refreshToken) {
    setSessionNotice(SESSION_EXPIRED_MESSAGE);
    logout();
    return null;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: auth.refreshToken }),
    });

    const body = (await response.json()) as {
      resultCode?: number | string;
      resultMessage?: string;
      jToken?: string;
      refreshToken?: string;
    };

    if (!response.ok || String(body.resultCode) !== '200' || !body.jToken) {
      const failureMessage = body.resultMessage || SESSION_EXPIRED_MESSAGE;
      setSessionNotice(failureMessage);
      logout();
      return null;
    }

    const nextSession: AuthSession = {
      ...auth,
      accessToken: body.jToken,
      refreshToken: body.refreshToken ?? auth.refreshToken,
      expiresAt: new Date(Date.now() + ACCESS_TOKEN_VALIDITY_MS).toISOString(),
    };

    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextSession));
    setSessionNotice(null);
    notifyAuthChange();
    return nextSession;
  } catch {
    setSessionNotice(SESSION_EXPIRED_MESSAGE);
    logout();
    return null;
  }
};

export { SESSION_WARNING_MESSAGE, SESSION_EXPIRED_MESSAGE };

export const isAuthenticated = (): boolean => {
  const auth = getStoredAuth();

  if (!auth) {
    return false;
  }

  if (isTokenExpired(auth)) {
    if (!auth.refreshToken) {
      setSessionNotice(SESSION_EXPIRED_MESSAGE);
      logout();
      return false;
    }

    return true;
  }

  return true;
};

interface LoginJwtResponse {
  resultCode: string;
  resultMessage: string;
  jToken?: string;
  refreshToken?: string;
  lockedSeconds?: number;
}

// 로그인 실패. resultCode '300' 아이디·비밀번호 불일치, '429' 시도 횟수 초과(lockedSeconds 동안 잠김)
export class LoginError extends Error {
  readonly resultCode: string;
  readonly lockedSeconds: number;

  constructor(message: string, resultCode: string, lockedSeconds = 0) {
    super(message);
    this.name = 'LoginError';
    this.resultCode = resultCode;
    this.lockedSeconds = lockedSeconds;
  }
}

export const login = async (
  credentials: LoginRequest,
): Promise<{ message: string; session: AuthSession }> => {
  if (!credentials.userId || !credentials.password) {
    throw new Error('필수 값이 누락되었습니다.');
  }

  const response = await fetch(`${API_BASE_URL}/auth/login-jwt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: credentials.userId,
      password: credentials.password,
    }),
  });

  const body = (await response.json()) as LoginJwtResponse;

  if (!response.ok || body.resultCode !== '200' || !body.jToken) {
    throw new LoginError(
      body.resultMessage || '로그인에 실패했습니다.',
      String(body.resultCode ?? response.status),
      Number(body.lockedSeconds) || 0,
    );
  }

  const session: AuthSession = {
    popupSessionId: Array.from(
      crypto.getRandomValues(new Uint32Array(4)),
      (value) => value.toString(16).padStart(8, '0'),
    ).join(''),
    userId: credentials.userId,
    accessToken: body.jToken,
    refreshToken: body.refreshToken ?? '',
    expiresAt: new Date(Date.now() + ACCESS_TOKEN_VALIDITY_MS).toISOString(),
  };

  setSessionNotice(null);
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  notifyAuthChange();

  return {
    message: body.resultMessage || '로그인 성공',
    session,
  };
};

export const logout = (): void => {
  // 공지 로그인 팝업 진행 정보 정리(S_ERP 와 같음)
  try {
    for (const key of Object.keys(window.sessionStorage)) {
      if (key.startsWith('s-erp-notice-popups:')) window.sessionStorage.removeItem(key);
    }
  } catch {
    console.warn('공지 팝업 진행 정보를 정리하지 못했습니다.');
  }
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
  setSessionNotice(null);
  syncBrowserLocation('/login');
  notifyAuthChange();
};

export const subscribeAuthChange = (listener: () => void): (() => void) => {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  window.addEventListener(AUTH_CHANGE_EVENT, listener);
  return () => {
    window.removeEventListener(AUTH_CHANGE_EVENT, listener);
  };
};

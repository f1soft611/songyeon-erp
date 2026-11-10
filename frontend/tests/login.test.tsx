import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../src/App';
import { apiGet } from '../src/shared/services/apiClient';
import {
  getSessionRemainingLabel,
  isAccessTokenExpiringSoon,
  readSessionNotice,
  resolveApiBaseUrl,
  setSessionNotice,
} from '../src/shared/services/authService';

// 로그인 공지 팝업은 이 테스트의 관심이 아니다(S_ERP 테스트와 같음)
vi.mock('../src/pages/groupware/community/notice/components/NoticeLoginPopupHost', () => ({
  NoticeLoginPopupHost: () => null,
}));

describe('Login page', () => {
  // S_ERP 테스트와 같은 준비: 토큰 갱신은 성공으로 답하고, 기본 메뉴 응답은 지금 메뉴 모양(모듈 아래 종합현황)으로 바꾼다
  beforeEach(() => {
    const defaultFetch = window.fetch;
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).includes('/auth/refresh')) {
        return new Response(JSON.stringify({
          resultCode: '200',
          jToken: 'refreshed-test-token',
        }), { status: 200 });
      }
      const response = await defaultFetch(input, init);
      if (String(input).includes('/api/v1/menus/my')) {
        const body = await response.json();
        for (const root of body.result.menus) {
          root.children = [{ ...root, menuId: 'dashboard-home', children: [] }];
        }
        return new Response(JSON.stringify(body), { status: 200 });
      }
      return response;
    }));
  });

  it('renders the enterprise login fields', () => {
    render(<App />);

    expect(screen.queryByLabelText(/업체코드/i)).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '송연' })).toBeInTheDocument();
    expect(screen.getByLabelText(/로그인아이디/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/비밀번호/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /로그인/i })).toBeInTheDocument();
  });

  it('shows validation errors when required values are missing', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /로그인/i }));

    expect(screen.getByText(/아이디와 비밀번호를 입력해주세요/i)).toBeInTheDocument();
  });

  it('keeps the Songyeon login screen when the app is in dark mode', () => {
    window.localStorage.setItem('erp-theme', 'dark');

    render(<App />);

    expect(document.documentElement.style.colorScheme).toBe('dark');
    expect(document.body.style.backgroundColor).toBe('rgb(15, 23, 42)');
    expect(screen.getByRole('heading', { name: '송연' })).toBeInTheDocument();
  });

  it('redirects to login when the stored JWT is expired and no refresh token exists', async () => {
    window.localStorage.setItem(
      'songyeon-erp-auth',
      JSON.stringify({
        tenantCode: 'T1358606250',
        userId: 'admin',
        accessToken: 'expired-token',
        refreshToken: '',
        expiresAt: new Date(Date.now() - 1000).toISOString(),
      }),
    );
    window.history.pushState({}, '', '/dashboard');

    render(<App />);

    expect(await screen.findByLabelText(/로그인아이디/i)).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: /^종합현황$/i }),
    ).not.toBeInTheDocument();
  });

  it('does not render the misleading session countdown or one-minute warning in the dashboard', async () => {
    window.localStorage.setItem(
      'songyeon-erp-auth',
      JSON.stringify({
        tenantCode: 'T1358606250',
        userId: 'admin',
        accessToken: 'expiring-token',
        refreshToken: 'refresh-token',
        expiresAt: new Date(Date.now() + 30_000).toISOString(),
      }),
    );
    window.history.pushState({}, '', '/dashboard');

    render(<App />);

    expect(
      await screen.findByRole('heading', { name: /^종합현황$/i, level: 1 }, { timeout: 10000 }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/로그인 유지 시간/i)).not.toBeInTheDocument();
    expect(
      screen.queryByText(/세션이 1분 후에 만료됩니다/i),
    ).not.toBeInTheDocument();
  });

  it('stores the refresh-failure message for the next login screen', () => {
    setSessionNotice('세션이 만료되어 다시 로그인해야 합니다.');

    expect(readSessionNotice()).toBe('세션이 만료되어 다시 로그인해야 합니다.');
  });

  it('does not silently fall back to localhost when the app runs on a Vercel production hostname', () => {
    expect(resolveApiBaseUrl('s-erp-chi.vercel.app', '')).toBe('');
    expect(resolveApiBaseUrl('localhost', '')).toBe('http://localhost:8080');
  });

  it('refreshes an expiring access token before making API requests', async () => {
    window.localStorage.setItem(
      'songyeon-erp-auth',
      JSON.stringify({
        tenantCode: 'T1358606250',
        userId: 'admin',
        accessToken: 'expiring-token',
        refreshToken: 'refresh-token',
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      }),
    );

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);

        if (url.includes('/auth/refresh')) {
          return new Response(
            JSON.stringify({
              resultCode: '200',
              resultMessage: '토큰 리프레쉬 성공',
              jToken: 'refreshed-token',
            }),
            { status: 200 },
          );
        }

        return new Response(
          JSON.stringify({
            resultCode: '200',
            resultMessage: '성공',
            result: { ok: true },
          }),
          { status: 200 },
        );
      }),
    );

    await expect(apiGet('/api/test')).resolves.toEqual({ ok: true });
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/auth/refresh'),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('navigates to the dashboard after successful login', async () => {
    render(<App />);

    fireEvent.change(screen.getByLabelText(/로그인아이디/i), {
      target: { value: 'admin' },
    });
    fireEvent.change(screen.getByLabelText(/비밀번호/i), {
      target: { value: 'f1soft@611' },
    });

    fireEvent.click(screen.getByRole('button', { name: /로그인/i }));

    expect(
      await screen.findByRole('heading', { name: /^종합현황$/i, level: 1 }, { timeout: 10000 }),
    ).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/auth/login-jwt'),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('shows an error message when the backend rejects the login', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({ resultCode: '300', resultMessage: '로그인 실패' }),
            { status: 200 },
          ),
      ),
    );

    render(<App />);

    fireEvent.change(screen.getByLabelText(/로그인아이디/i), {
      target: { value: 'admin' },
    });
    fireEvent.change(screen.getByLabelText(/비밀번호/i), {
      target: { value: 'wrong-password' },
    });

    fireEvent.click(screen.getByRole('button', { name: /로그인/i }));

    expect(
      await screen.findByText('아이디 또는 비밀번호가 올바르지 않습니다'),
    ).toBeInTheDocument();
  });
});

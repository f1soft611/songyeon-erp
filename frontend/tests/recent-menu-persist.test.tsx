import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../src/App';

// 2026-11-04 S_ERP 20261103_003 최근 사용 메뉴 PC 유지(dashboard-sidebar 'persistent recent menus' 와 같은 확인).
// 송연은 로그인 화면(로그인아이디 · 비밀번호)과 저장 키(songyeon-erp:)가 달라 송연에 맞춰 쓴다
const historyKey = 'songyeon-erp:recent-menu-history';

vi.mock('../src/pages/groupware/community/notice/components/NoticeLoginPopupHost', () => ({
  NoticeLoginPopupHost: () => null,
}));

async function login() {
  fireEvent.change(await screen.findByLabelText(/로그인아이디/i), { target: { value: 'admin' } });
  fireEvent.change(screen.getByLabelText(/비밀번호/i), { target: { value: 'test-only' } });
  fireEvent.click(screen.getByRole('button', { name: /로그인/i }));
  await screen.findByRole('button', { name: /프로필 메뉴 열기/i }, { timeout: 10000 });
}

const entry = (menuId: string, label: string, minutesAgo: number) => ({
  menuId, moduleId: 'dashboard', label, path: '/', visitedAt: Date.now() - minutesAgo * 60_000,
});

describe('최근 사용 메뉴 PC 유지', () => {
  beforeEach(() => {
    const defaultFetch = window.fetch;
    vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).includes('/auth/login-jwt')) {
        return new Response(JSON.stringify({
          resultCode: '200', jToken: 'test-token', refreshToken: 'refresh', userId: 'admin',
        }), { status: 200 });
      }
      if (String(input).includes('/api/v1/menus/my')) {
        return new Response(JSON.stringify({
          resultCode: '200',
          result: {
            user: { userId: 'admin', roles: [] },
            menus: [{
              menuId: 1, name: '그룹웨어', path: '/groupware',
              children: [{
                menuId: 2, name: '종합현황', path: '/groupware/overview',
                permissions: { read: true, create: false, update: false, delete: false },
              }],
            }],
          },
        }), { status: 200 });
      }
      return defaultFetch(input, init);
    });
  });

  it('로그아웃 · 다시 로그인 · 새 브라우저 세션에도 남는다', async () => {
    window.localStorage.setItem(historyKey, JSON.stringify([entry('previous-menu', '이전 메뉴', 1)]));
    const view = render(<App />);
    await login();

    expect(await screen.findByRole('button', { name: /이전 메뉴/i })).toBeInTheDocument();
    await waitFor(() => {
      const entries = JSON.parse(window.localStorage.getItem(historyKey) ?? '[]');
      expect(entries[0].path).toBe('/groupware/overview');
    });
    const savedHistory = window.localStorage.getItem(historyKey);
    fireEvent.click(screen.getByRole('button', { name: /프로필 메뉴 열기/i }));
    fireEvent.click(screen.getByText(/로그아웃/i));
    await screen.findByLabelText(/로그인아이디/i);
    expect(window.localStorage.getItem(historyKey)).toBe(savedHistory);

    await login();
    expect(await screen.findByRole('button', { name: /이전 메뉴/i })).toBeInTheDocument();
    view.unmount();
    window.sessionStorage.clear();
    render(<App />);
    expect(await screen.findByRole('button', { name: /이전 메뉴/i })).toBeInTheDocument();
  }, 30_000);

  it('예전 탭 세션 기록을 PC 저장소로 옮긴다', async () => {
    window.sessionStorage.setItem(historyKey, JSON.stringify([entry('previous-menu', '이관 메뉴', 1)]));
    render(<App />);
    await login();

    expect(await screen.findByRole('button', { name: /이관 메뉴/i })).toBeInTheDocument();
    await waitFor(() => expect(window.localStorage.getItem(historyKey)).toContain('이관 메뉴'));
    expect(window.sessionStorage.getItem(historyKey)).toBeNull();
  }, 30_000);

  it('PC 저장소 기록을 먼저 쓰고, 겹치지 않는 최근 5건만 둔다', async () => {
    window.sessionStorage.setItem(historyKey, JSON.stringify([entry('stale-menu', '과거 세션 메뉴', 1)]));
    window.localStorage.setItem(historyKey, JSON.stringify(
      Array.from({ length: 8 }, (_, index) => entry(`previous-${index}`, `저장 메뉴 ${index}`, index + 1)),
    ));
    render(<App />);
    await login();
    expect(await screen.findByRole('button', { name: /저장 메뉴 0/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /과거 세션 메뉴/i })).not.toBeInTheDocument();
    await waitFor(() => {
      const entries = JSON.parse(window.localStorage.getItem(historyKey) ?? '[]');
      expect(entries).toHaveLength(5);
      expect(new Set(entries.map((item: { menuId: string }) => item.menuId)).size).toBe(5);
      expect(entries[0].label).toBe('종합현황');
    });
  }, 30_000);

  it.each(['{broken', '{}', '[null, {"menuId":"invalid"}]'])(
    '깨진 기록이 있어도 화면이 멈추지 않는다: %s',
    async (rawHistory) => {
      window.localStorage.setItem(historyKey, rawHistory);
      render(<App />);
      await login();
      await waitFor(() => {
        const entries = JSON.parse(window.localStorage.getItem(historyKey) ?? '[]');
        expect(entries).toHaveLength(1);
        expect(entries[0].label).toBe('종합현황');
      });
    },
    30_000,
  );
});

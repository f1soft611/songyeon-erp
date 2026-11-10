import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../src/App';

// 2026-11-04 S_ERP 메뉴 즐겨찾기(d3f093a2)의 DashboardPage 연결 확인.
// S_ERP 는 이 연결 테스트가 없어 송연 로그인 화면(로그인아이디 · 비밀번호)에 맞춰 새로 쓴다
vi.mock('../src/pages/groupware/community/notice/components/NoticeLoginPopupHost', () => ({
  NoticeLoginPopupHost: () => null,
}));

async function login() {
  fireEvent.change(await screen.findByLabelText(/로그인아이디/i), { target: { value: 'admin' } });
  fireEvent.change(screen.getByLabelText(/비밀번호/i), { target: { value: 'test-only' } });
  fireEvent.click(screen.getByRole('button', { name: /로그인/i }));
  await screen.findByRole('button', { name: /프로필 메뉴 열기/i }, { timeout: 10000 });
}

let favoritesResponse: () => Response;

describe('대시보드 메뉴 즐겨찾기', () => {
  beforeEach(() => {
    const defaultFetch = window.fetch;
    favoritesResponse = () => new Response(JSON.stringify({
      resultCode: '200',
      result: { item: { folders: [], favorites: [{ favoriteId: 7, menuId: 2, folderId: null, favoriteName: '현황 바로가기' }] } },
    }), { status: 200 });
    vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/auth/login-jwt')) {
        return new Response(JSON.stringify({
          resultCode: '200', jToken: 'test-token', refreshToken: 'refresh', userId: 'admin',
        }), { status: 200 });
      }
      if (url.includes('/api/v1/menus/favorites')) {
        return favoritesResponse();
      }
      if (url.includes('/api/v1/menus/my')) {
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

  it('로그인하면 즐겨찾기를 불러와 메뉴에 별표와 즐겨찾기 모듈을 보여 준다', async () => {
    render(<App />);
    await login();

    expect(await screen.findByRole('button', { name: '즐겨찾기 편집: 종합현황' }))
      .toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: '즐겨찾기' }));
    expect(await screen.findByText('현황 바로가기')).toBeInTheDocument();
  }, 30_000);

  it('즐겨찾기를 못 불러오면 알림과 다시 시도를 보여 준다', async () => {
    favoritesResponse = () => new Response(JSON.stringify({ resultCode: '500', resultMessage: '즐겨찾기 오류' }), { status: 500 });
    render(<App />);
    await login();

    const retry = await screen.findByRole('button', { name: '다시 시도' }, { timeout: 10000 });
    favoritesResponse = () => new Response(JSON.stringify({
      resultCode: '200', result: { item: { folders: [], favorites: [] } },
    }), { status: 200 });
    fireEvent.click(retry);
    await waitFor(() => expect(screen.queryByRole('button', { name: '다시 시도' })).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: '즐겨찾기 추가: 종합현황' })).toBeInTheDocument();
  }, 30_000);
});

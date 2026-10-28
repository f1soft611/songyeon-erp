import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AppRouter from '../src/routes/AppRouter';
import { AppSettingsProvider } from '../src/shared/context/AppSettingsContext';

beforeEach(() => {
  window.localStorage.clear();
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes('/api/v1/menus/my')) {
        return new Response(
          JSON.stringify({
            resultCode: '200',
            resultMessage: 'OK',
            result: {
              user: { userId: 'admin', roles: [] },
              menus: [],
            },
          }),
          { status: 200 },
        );
      }

      if (url.includes('/api/v1/system/modules')) {
        return new Response(
          JSON.stringify({
            resultCode: '200',
            resultMessage: 'OK',
            result: { resultList: [] },
          }),
          { status: 200 },
        );
      }

      return new Response(
        JSON.stringify({
          resultCode: '200',
          resultMessage: 'OK',
          result: { ok: true },
        }),
        { status: 200 },
      );
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('AppRouter not found fallback', () => {
  it('renders the NotFound page for unknown routes', () => {
    render(
      <AppSettingsProvider>
        <MemoryRouter initialEntries={['/does-not-exist']}>
          <AppRouter />
        </MemoryRouter>
      </AppSettingsProvider>,
    );

    expect(
      screen.getByText('요청하신 페이지를 찾을 수 없습니다'),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: '돌아가기' })).toBeVisible();
  });

  it('keeps the dashboard root path valid while the menu list is loading', async () => {
    window.localStorage.setItem(
      'songyeon-erp-auth',
      JSON.stringify({
        tenantCode: 'tenant',
        userId: 'admin',
        accessToken: 'token',
        refreshToken: 'refresh',
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      }),
    );

    let resolveMenuResponse: ((value: Response) => void) | undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);

        if (url.includes('/api/v1/menus/my')) {
          return new Promise<Response>((resolve) => {
            resolveMenuResponse = resolve;
          });
        }

        if (url.includes('/api/v1/system/modules')) {
          return new Response(
            JSON.stringify({
              resultCode: '200',
              resultMessage: 'OK',
              result: { resultList: [] },
            }),
            { status: 200 },
          );
        }

        return new Response(
          JSON.stringify({ resultCode: '200', resultMessage: 'OK' }),
          { status: 200 },
        );
      }),
    );

    render(
      <AppSettingsProvider>
        <MemoryRouter initialEntries={['/dashboard']}>
          <AppRouter />
        </MemoryRouter>
      </AppSettingsProvider>,
    );

    expect(
      screen.queryByText('요청하신 페이지를 찾을 수 없습니다'),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeVisible();

    resolveMenuResponse?.(
      new Response(
        JSON.stringify({
          resultCode: '200',
          resultMessage: 'OK',
          result: {
            user: { userId: 'admin', roles: [] },
            menus: [
              {
                menuId: 'dashboard',
                name: '종합현황',
                path: '/',
                icon: 'Dashboard',
                children: [],
                permissions: {
                  read: true,
                  create: true,
                  update: true,
                  delete: true,
                  excel: true,
                },
              },
            ],
          },
        }),
        { status: 200 },
      ),
    );

    expect(
      await screen.findByRole('heading', { name: '종합현황' }),
    ).toBeVisible();
  });

  it('renders the NotFound page for invalid dashboard menu paths', async () => {
    window.localStorage.setItem(
      'songyeon-erp-auth',
      JSON.stringify({
        tenantCode: 'tenant',
        userId: 'admin',
        accessToken: 'token',
        refreshToken: 'refresh',
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      }),
    );

    render(
      <AppSettingsProvider>
        <MemoryRouter initialEntries={['/dashboard/group22ware/asdfasdf']}>
          <AppRouter />
        </MemoryRouter>
      </AppSettingsProvider>,
    );

    expect(
      await screen.findByText('요청하신 페이지를 찾을 수 없습니다'),
    ).toBeVisible();
  });
});

import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';

Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  configurable: true,
  value: vi.fn((contextId: string) =>
    contextId === '2d'
      ? {
          font: '',
          measureText: (text: string) => ({ width: text.length * 7 }),
        }
      : null,
  ),
});

// jsdom은 URL.createObjectURL/revokeObjectURL을 구현하지 않는다. 엑셀/CSV 다운로드 코드가 사용한다.
URL.createObjectURL = vi.fn(() => 'blob:test-url');
URL.revokeObjectURL = vi.fn();

beforeEach(() => {
  window.localStorage.clear();
  window.history.pushState({}, '', '/login');
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
              user: {
                userId: 'admin',
                name: '소크라710',
                email: 'admin@f1soft.com',
                departmentName: '플랫폼개발팀',
                levelId: 123,
                levelCode: '001',
                levelName: '사원',
                groupName: '플랫폼관리자',
                roleName: 'PLATFORM_ADMIN',
                roles: ['PLATFORM_ADMIN'],
              },
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
        );
      }

      if (url.includes('/api/v1/system/modules')) {
        return new Response(
          JSON.stringify({
            resultCode: '200',
            resultMessage: 'OK',
            result: {
              resultList: [
                {
                  moduleId: 1,
                  moduleCode: 'dashboard',
                  moduleNm: '종합현황',
                  moduleUrl: '/',
                  iconNm: 'Dashboard',
                  useAt: 'Y',
                },
              ],
            },
          }),
          { status: 200 },
        );
      }

      if (url.includes('/auth/login-jwt')) {
        return new Response(
          JSON.stringify({
            resultCode: '200',
            resultMessage: '로그인 성공',
            jToken: 'test-access-token',
            refreshToken: 'test-refresh-token',
          }),
          { status: 200 },
        );
      }

      return new Response(
        JSON.stringify({
          resultCode: '200',
          resultMessage: '성공 !!!',
          result: { ok: true },
        }),
        { status: 200 },
      );
    }),
  );
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  window.history.pushState({}, '', '/login');
  vi.unstubAllGlobals();
});

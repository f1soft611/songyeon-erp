import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MenuManagementPage } from '../src/pages/settings/system/menus/MenuManagementPage';

const apiMocks = vi.hoisted(() => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPut: vi.fn(),
  apiDelete: vi.fn(),
}));
vi.mock('../src/shared/services/apiClient', () => apiMocks);

beforeEach(() => {
  vi.resetAllMocks();
});

describe('debug', () => {
  it('debug render', async () => {
    apiMocks.apiGet.mockImplementation((path: string) => {
      if (path === '/api/v1/system/modules') {
        return Promise.resolve({
          resultList: [
            { moduleId: 1, moduleNm: '기본', useAt: 'Y' },
            { moduleId: 2, moduleNm: '환경설정', useAt: 'Y' },
          ],
        });
      }
      if (path === '/api/v1/system/permissions') {
        return Promise.resolve({
          resultList: [
            {
              permissionId: 1,
              permissionCode: 'READ',
              permissionName: '조회',
              sortOrder: 10,
            },
            {
              permissionId: 5,
              permissionCode: 'EXCEL',
              permissionName: '엑셀',
              sortOrder: 50,
            },
          ],
        });
      }
      if (path === '/api/v1/system/menus?moduleId=1') {
        return Promise.resolve({
          resultList: [
            {
              menuId: 1,
              moduleId: 1,
              moduleNm: '기본',
              parentMenuId: null,
              parentMenuNm: null,
              menuCode: 'DASH',
              menuNm: '대시보드',
              menuUrl: '/dashboard',
              iconNm: null,
              sortOrder: 1,
              useAt: 'Y',
              hasChildren: false,
              permissionCodes: ['READ'],
            },
          ],
        });
      }
      return Promise.reject(new Error(`unexpected ${path}`));
    });

    render(
      <MenuManagementPage
        selectedModule={{
          id: 'settings',
          name: '환경설정',
          icon: null,
          tree: [],
          menus: [],
        }}
        currentMenuName="메뉴 관리"
        content={{
          title: '메뉴 관리',
          description: '메뉴를 관리합니다.',
          cards: [],
          items: [],
        }}
      />,
    );

    await waitFor(
      () => {
        console.log('body', document.body.innerHTML.slice(0, 5000));
        expect(
          screen.getByRole('grid', { name: 'F1-TREE 메뉴 관리' }),
        ).toBeVisible();
      },
      { timeout: 5000 },
    );

    expect(
      await screen.findByRole('gridcell', { name: '대시보드' }),
    ).toBeVisible();
  });
});

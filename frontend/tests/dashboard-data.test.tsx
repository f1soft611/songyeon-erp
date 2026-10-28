import { describe, expect, it } from 'vitest';
import {
  buildPageContent,
  moduleItems,
} from '../src/pages/dashboard/services/dashboardData';
import { buildModuleDescriptors } from '../src/pages/dashboard/services/menuService';

describe('Dashboard data', () => {
  it('keeps dashboard module icons lightweight for fast login route startup', () => {
    expect(moduleItems[0].icon).toBeTruthy();
    expect(typeof (moduleItems[0].icon as { type?: unknown }).type).toBe(
      'function',
    );
  });

  it('keeps the saved menu path and description in dashboard tree nodes', () => {
    const descriptors = buildModuleDescriptors({
      user: { userId: 'admin', roles: ['TENANT_ADMIN'] },
      menus: [
        {
          menuId: 2,
          parentMenuId: null,
          name: '환경설정',
          path: '/settings',
          children: [
            {
              menuId: 12,
              parentMenuId: 2,
              name: '저장된 메뉴명',
              description: '저장된 메뉴 설명',
              path: '/settings/system/menus',
              permissions: {
                read: true,
                create: true,
                update: true,
                delete: true,
                excel: false,
              },
            },
          ],
        },
      ],
    });

    expect(descriptors[0].tree[0]).toEqual(
      expect.objectContaining({
        name: '저장된 메뉴명',
        description: '저장된 메뉴 설명',
        path: '/settings/system/menus',
        pageKey: 'menus',
      }),
    );
  });

  it('uses the saved menu name and description for page header content', () => {
    const content = buildPageContent(
      {
        title: '정적 메뉴명',
        description: '정적 설명',
        cards: [],
        items: [],
      },
      { name: '저장된 메뉴명', description: '저장된 메뉴 설명' },
    );

    expect(content.title).toBe('저장된 메뉴명');
    expect(content.description).toBe('저장된 메뉴 설명');
  });
});

import { describe, expect, it } from 'vitest';
import {
  buildModuleDescriptors,
  getMenuPermission,
  moduleDescriptors,
  userMenuResponse,
} from '../src/pages/dashboard/services/menuService';

describe('User menu mock data', () => {
  it('provides admin user with ADMIN role', () => {
    expect(userMenuResponse.user.userId).toBe('admin');
    expect(userMenuResponse.user.roles).toContain('ADMIN');
  });

  it('exposes groupware and settings modules only', () => {
    expect(moduleDescriptors.map((module) => module.id)).toEqual([
      'groupware',
      'settings',
    ]);
  });

  it('maps module root menus to their child menu tree', () => {
    const groupware = moduleDescriptors[0];
    const settings = moduleDescriptors[1];

    expect(groupware.tree.map((node) => node.name)).toEqual([
      '종합현황',
      '문서관리',
    ]);
    expect(settings.tree.map((node) => node.name)).toEqual(['시스템 관리']);
    expect(settings.tree[0].children?.map((node) => node.name)).toEqual([
      '권한관리',
      '메뉴관리',
      '모듈관리',
      'F1 Grid 테스트',
      'F1-Grid 문서',
    ]);
    expect(groupware.menus.map((menu) => menu.pageKey)).toEqual([
      'overview',
      'documents',
    ]);
    expect(settings.menus.map((menu) => menu.pageKey)).toEqual([
      'roles',
      'menus',
      'modules',
      'f1-grid-test',
      'f1-grid-docs',
    ]);
  });

  it('keeps parent-child relation from the source menu data', () => {
    const [groupwareRoot] = userMenuResponse.menus;

    expect(groupwareRoot.parentMenuId).toBeNull();
    expect(
      groupwareRoot.children?.every(
        (child) => child.parentMenuId === groupwareRoot.menuId,
      ),
    ).toBe(true);
  });

  it('grants every permission to admin on all menus', () => {
    const menuKeys = [
      ['groupware', 'overview'],
      ['groupware', 'documents'],
      ['settings', 'roles'],
      ['settings', 'menus'],
    ] as const;

    menuKeys.forEach(([moduleId, menuId]) => {
      expect(getMenuPermission(moduleId, menuId)).toEqual({
        read: true,
        create: true,
        update: true,
        delete: true,
      });
    });
  });

  it('returns undefined for an unknown menu', () => {
    expect(getMenuPermission('groupware', 'unknown')).toBeUndefined();
  });

  it('hides menu leaves whose effective permissions are all false', () => {
    const modules = buildModuleDescriptors({
      user: { userId: 'admin', roles: ['ADMIN'] },
      menus: [
        {
          menuId: 200,
          parentMenuId: null,
          name: '환경설정',
          icon: 'Settings',
          path: '/settings',
          children: [
            {
              menuId: 210,
              parentMenuId: 200,
              name: '시스템 관리',
              path: '/settings/system',
              children: [
                {
                  menuId: 211,
                  parentMenuId: 210,
                  name: '권한관리',
                  path: '/settings/system/roles',
                  permissions: {
                    read: false,
                    create: false,
                    update: false,
                    delete: false,
                    excel: false,
                  },
                },
                {
                  menuId: 212,
                  parentMenuId: 210,
                  name: '메뉴관리',
                  path: '/settings/system/menus',
                  permissions: {
                    read: true,
                    create: false,
                    update: false,
                    delete: false,
                    excel: false,
                  },
                },
              ],
            },
          ],
        },
      ],
    });

    expect(modules[0].menus.map((menu) => menu.name)).toEqual(['메뉴관리']);
    expect(modules[0].tree[0].children?.map((node) => node.name)).toEqual([
      '메뉴관리',
    ]);
  });
});

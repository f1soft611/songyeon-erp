import { describe, expect, it } from 'vitest';
import { roleRows } from '../src/pages/settings/system/roles/data/roleManagement.data';
import { menuRows } from '../src/pages/settings/system/menus/data/menuManagement.data';

describe('system management page ownership', () => {
  it('keeps role samples owned by the roles page', () => {
    expect(roleRows.length).toBeGreaterThanOrEqual(3);
    expect(roleRows.map((role) => role.name)).toEqual([
      'ADMIN',
      'MANAGER',
      'USER',
    ]);
  });

  it('keeps menu samples owned by the menus page', () => {
    expect(menuRows.length).toBeGreaterThanOrEqual(5);
    expect(menuRows.map((menu) => menu.id)).toContain('roles');
    expect(menuRows.map((menu) => menu.id)).toContain('menus');
  });
});

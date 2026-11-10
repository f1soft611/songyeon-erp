import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MenuManagementPanel } from '../src/pages/settings/system/menus/components/MenuManagementPanel';
import { menuRows } from '../src/pages/settings/system/menus/data/menuManagement.data';
import type { MenuPermissionDefinition } from '../src/pages/settings/system/menus/types/menuManagement.types';

vi.mock('../src/shared/services/apiClient', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPut: vi.fn(),
  apiDelete: vi.fn(),
  normalizeApiErrorMessage: (message: string) => message,
}));

// 송연 메뉴 권한(2026-10-21): 메뉴관리 화면은 S_ERP 최신본을 따르되, 쓰기 · 삭제 권한이 없으면 오른쪽 클릭 추가 · 삭제를 막는다.
// 2026-11-04 S_ERP 최신본으로 다시 맞추면서 이 처리를 다시 얹었다
const permissions: MenuPermissionDefinition[] = [
  { permissionId: 1, permissionCode: 'READ', permissionName: '조회', sortOrder: 10 },
];
const moduleRows = menuRows.filter((row) => row.moduleId === 1);
const renderPanel = (props: { canWrite?: boolean; canDelete?: boolean } = {}) =>
  render(
    <MenuManagementPanel
      menus={moduleRows}
      selectedModule={{ moduleId: 1, moduleName: '기본' }}
      permissions={permissions}
      {...props}
    />,
  );
const gridBody = () => screen.getByRole('grid', { name: 'F1-TREE 메뉴 관리' }).lastElementChild as HTMLElement;

describe('메뉴관리 송연 권한', () => {
  it('권한을 주지 않으면 S_ERP 와 같이 오른쪽 클릭으로 추가 · 삭제할 수 있다', () => {
    renderPanel();
    fireEvent.contextMenu(screen.getByText(moduleRows[0].name));
    expect(screen.getByRole('menuitem', { name: '행 추가' })).toBeVisible();
    expect(screen.getByRole('menuitem', { name: '행 삭제' })).toBeVisible();
  });

  it('쓰기 권한이 없으면 오른쪽 클릭 루트 추가 · 행 추가가 없다', () => {
    renderPanel({ canWrite: false });
    fireEvent.contextMenu(gridBody());
    expect(screen.queryByRole('menuitem', { name: '루트 추가' })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: '행 추가' })).not.toBeInTheDocument();
  });

  it('삭제 권한이 없으면 오른쪽 클릭 행 삭제가 없다(행 추가는 그대로)', () => {
    renderPanel({ canDelete: false });
    fireEvent.contextMenu(screen.getByText(moduleRows[0].name));
    expect(screen.getByRole('menuitem', { name: '행 추가' })).toBeVisible();
    expect(screen.queryByRole('menuitem', { name: '행 삭제' })).not.toBeInTheDocument();
  });
});

import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from '../src/App';
import { DashboardContent } from '../src/pages/dashboard/components/DashboardContent';
import { DashboardMenuTree } from '../src/pages/dashboard/components/DashboardMenuTree';
import { buildModuleDescriptors } from '../src/pages/dashboard/services/menuService';

async function loginAsAdmin() {
  fireEvent.change(screen.getByLabelText(/로그인아이디/i), {
    target: { value: 'admin' },
  });
  fireEvent.change(screen.getByLabelText(/비밀번호/i), {
    target: { value: '1234' },
  });
  fireEvent.click(screen.getByRole('button', { name: /로그인/i }));

  await screen.findByRole('button', { name: /프로필 메뉴 열기/i });
}

describe('Dashboard sidebar', () => {
  it('shows only the groupware and settings modules with their menus', async () => {
    render(<App />);
    await loginAsAdmin();

    expect(document.body).toHaveTextContent(/ERP/i);
    expect(await screen.findByText(/모듈 선택/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /그룹웨어/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /환경설정/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /영업관리/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /생산관리/i }),
    ).not.toBeInTheDocument();

    expect(
      await screen.findByRole('treeitem', { name: /^종합현황$/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('treeitem', { name: /^문서관리$/i }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('treeitem', { name: /^문서관리$/i }));

    expect(
      await screen.findByRole('heading', { name: /^문서관리$/i }),
    ).toBeInTheDocument();
  });

  it('switches menus when another module is selected', async () => {
    render(<App />);
    await loginAsAdmin();

    fireEvent.click(screen.getByRole('button', { name: /환경설정/i }));

    expect(
      await screen.findByRole('treeitem', { name: /^권한관리$/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('treeitem', { name: /^메뉴관리$/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /^권한관리$/i }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('treeitem', { name: /^메뉴관리$/i }));

    expect(
      await screen.findByRole('heading', { name: /^메뉴관리$/i }),
    ).toBeInTheDocument();
  });

  it('shows recent menu history in the sidebar footer', () => {
    render(
      <DashboardMenuTree
        selectedModule={{
          id: 'settings',
          name: '환경설정',
          icon: <span aria-hidden="true">S</span>,
          tree: [
            {
              id: 'system',
              name: '시스템 관리',
              children: [{ id: 'roles', name: '권한관리', pageKey: 'roles' }],
            },
          ],
          menus: [{ id: 'roles', name: '권한관리', pageKey: 'roles' }],
        }}
        expandedItemIds={['system']}
        selectedMenuId="roles"
        recentMenuItems={[
          {
            menuId: 'roles',
            moduleId: 'settings',
            moduleName: '환경설정',
            label: '권한관리',
            path: '/settings/roles',
            visitedAt: Date.now(),
          },
        ]}
        onMenuSelect={() => undefined}
        onRecentMenuSelect={() => undefined}
        onToggleMenu={() => undefined}
      />,
    );

    expect(screen.getByText(/최근 사용/i)).toBeInTheDocument();
    const recentRoleButton = screen.getByRole('button', { name: /권한관리/i });
    expect(recentRoleButton).toBeInTheDocument();
    expect(within(recentRoleButton).getByText(/환경설정/i)).toBeInTheDocument();
  });

  it('shows a compact profile action menu from the top app bar avatar control', async () => {
    render(<App />);
    await loginAsAdmin();

    fireEvent.click(screen.getByRole('button', { name: /프로필 메뉴 열기/i }));

    expect(await screen.findByText(/소크라710/i)).toBeInTheDocument();
    expect(screen.getByText(/플랫폼개발팀/i)).toBeInTheDocument();
    expect(screen.getByText(/사원/i)).toBeInTheDocument();
    expect(screen.queryByText(/플랫폼관리자/i)).not.toBeInTheDocument();
    expect(screen.getByText(/admin@f1soft.com/i)).toBeInTheDocument();
    expect(screen.getByText(/내 정보 관리/i)).toBeInTheDocument();
    expect(screen.getByText(/보안 설정/i)).toBeInTheDocument();
    expect(screen.getByText(/로그아웃/i)).toBeInTheDocument();

    const profileAvatars = screen.getAllByTestId('profile-avatar');
    expect(profileAvatars).toHaveLength(2);
    expect(getComputedStyle(profileAvatars[0]).backgroundColor).toBe(
      getComputedStyle(profileAvatars[1]).backgroundColor,
    );
  });

  it('shows a submenu indicator for menu groups that contain child items', () => {
    render(
      <DashboardMenuTree
        selectedModule={{
          id: 'settings',
          name: '환경설정',
          icon: <span aria-hidden="true">S</span>,
          tree: [
            {
              id: 'system',
              name: '시스템 관리',
              children: [
                { id: 'roles', name: '권한관리', pageKey: 'roles' },
                { id: 'menus', name: '메뉴관리', pageKey: 'menus' },
              ],
            },
          ],
          menus: [],
        }}
        expandedItemIds={['system']}
        selectedMenuId="roles"
        onMenuSelect={() => undefined}
        onToggleMenu={() => undefined}
      />,
    );

    const systemGroup = screen.getByRole('treeitem', { name: /시스템 관리/i });

    expect(
      within(systemGroup).getByTestId('ExpandMoreOutlinedIcon'),
    ).toBeVisible();
    const branchLines = within(systemGroup).getAllByTestId('submenu-branch');
    expect(branchLines).toHaveLength(2);
    branchLines.forEach((branchLine) => {
      expect(branchLine).toBeVisible();
      expect(branchLine).toHaveStyle({ borderTopWidth: '1px' });
    });
  });

  it('collapses only the menu panel while keeping module selection visible', async () => {
    render(<App />);
    await loginAsAdmin();

    const collapseButton = screen.getByRole('button', {
      name: /메뉴 패널 접기/i,
    });
    expect(collapseButton).toHaveAttribute('aria-expanded', 'true');
    expect(
      screen.getByRole('button', { name: /환경설정/i }),
    ).toBeInTheDocument();

    fireEvent.click(collapseButton);

    expect(
      screen.getByRole('button', { name: /메뉴 패널 펼치기/i }),
    ).toHaveAttribute('aria-expanded', 'false');
    expect(
      screen.getByRole('button', { name: /그룹웨어/i }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/모듈 선택/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /메뉴 패널 펼치기/i }));
    expect(screen.getByText(/모듈 선택/i)).toBeInTheDocument();
  });

  it('opens and closes only the menu panel on mobile', async () => {
    const originalMatchMedia = window.matchMedia;
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: (query: string) => ({
        matches: query === '(max-width: 767px)',
        media: query,
        onchange: null,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        addListener: () => undefined,
        removeListener: () => undefined,
        dispatchEvent: () => false,
      }),
    });

    try {
      render(<App />);
      await loginAsAdmin();

      expect(
        screen.getByRole('button', { name: /그룹웨어/i }),
      ).toBeInTheDocument();
      expect(screen.queryByRole('tree')).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /메뉴 열기/i }));
      expect(screen.getByRole('tree')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /메뉴 닫기/i }));
      expect(screen.queryByRole('tree')).not.toBeInTheDocument();
    } finally {
      Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        value: originalMatchMedia,
      });
    }
  });

  it('selects the routed leaf menu on direct dashboard navigation', async () => {
    window.localStorage.setItem(
      'songyeon-erp-auth',
      JSON.stringify({
        tenantCode: 'A001',
        userId: 'admin',
        accessToken: 'mock-token',
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      }),
    );
    window.history.pushState({}, '', '/groupware/documents');

    render(<App />);

    expect(
      await screen.findByRole('heading', { name: /^문서관리$/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('treeitem', { name: /^문서관리$/i }),
    ).toHaveAttribute('aria-checked', 'true');
  });

  it('shows the active menu title in the fixed header without duplicate page titles', async () => {
    render(<App />);
    await loginAsAdmin();

    fireEvent.click(screen.getByRole('button', { name: /환경설정/i }));
    fireEvent.click(screen.getByRole('treeitem', { name: /^메뉴관리$/i }));

    expect(
      await screen.findByRole('heading', { name: /^메뉴관리$/i }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole('heading', { name: /^메뉴관리$/i }),
    ).toHaveLength(1);
    expect(
      screen.queryByRole('heading', { name: /^대시보드$/i }),
    ).not.toBeInTheDocument();
  });

  it('renders a coming soon state when a menu exists but the page is not implemented yet', () => {
    render(
      <DashboardContent
        selectedModule={{
          id: 'sales',
          name: '영업관리',
          icon: <span aria-hidden="true">S</span>,
          tree: [],
          menus: [],
          path: '/sales',
        }}
        currentMenuName="수주 관리"
        currentPageKey="sales-order"
        breadcrumbItems={['영업관리', '수주 관리']}
        content={{
          title: '수주 관리',
          description: '수주 관리 화면입니다.',
          cards: [],
          items: [],
        }}
      />,
    );

    expect(
      screen.getByText(/요청하신 페이지는 현재 준비 중입니다/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/수주 관리 메뉴는 추후 서비스될 예정입니다/i),
    ).toBeInTheDocument();
  });

  it('keeps DB-backed leaf menus in the selectable list even without a mapped page key', () => {
    const descriptors = buildModuleDescriptors({
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
                  menuId: 220,
                  parentMenuId: 210,
                  name: '창고관리',
                  path: '/settings/system/warehouse',
                  permissions: {
                    read: true,
                    create: true,
                    update: true,
                    delete: true,
                  },
                },
              ],
            },
          ],
        },
      ],
    });

    expect(descriptors[0].menus).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'warehouse',
          name: '창고관리',
          pageKey: 'warehouse',
        }),
      ]),
    );
  });

  it('renders a coming soon state for an unimplemented leaf menu without a mapped page key', () => {
    render(
      <DashboardContent
        selectedModule={{
          id: 'sales',
          name: '영업관리',
          icon: <span aria-hidden="true">S</span>,
          tree: [
            {
              id: 'purchase-order',
              name: '발주 관리',
              pageKey: 'unmapped-leaf-menu',
            },
          ],
          menus: [
            {
              id: 'purchase-order',
              name: '발주 관리',
              pageKey: 'unmapped-leaf-menu',
            },
          ],
          path: '/sales',
        }}
        currentMenuName="발주 관리"
        currentPageKey="unmapped-leaf-menu"
        breadcrumbItems={['영업관리', '발주 관리']}
        content={{
          title: '발주 관리',
          description: '발주 관리 화면입니다.',
          cards: [],
          items: [],
        }}
      />,
    );

    expect(
      screen.getByText(/발주 관리 메뉴는 추후 서비스될 예정입니다\./i),
    ).toBeInTheDocument();
  });

  it('renders the ERP-style role and menu management screens', async () => {
    render(<App />);
    await loginAsAdmin();

    fireEvent.click(screen.getByRole('button', { name: /환경설정/i }));
    fireEvent.click(screen.getByRole('treeitem', { name: /^권한관리$/i }));

    expect(
      await screen.findByRole('heading', { name: /^권한관리$/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/역할 목록/i)).toBeInTheDocument();
    expect(screen.getAllByText(/ADMIN/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/권한 매핑/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('treeitem', { name: /^메뉴관리$/i }));

    expect(
      await screen.findByRole('heading', { name: /^메뉴관리$/i }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/메뉴 관리/i).length).toBeGreaterThan(0);
    expect(
      screen.getByRole('grid', { name: 'F1-TREE 메뉴 관리' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '루트 메뉴 추가' }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/사용 여부/i).length).toBeGreaterThan(0);
  });
});

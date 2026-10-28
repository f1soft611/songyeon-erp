import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MenuManagementPage } from '../src/pages/settings/system/menus/MenuManagementPage';
import { createAppTheme } from '../src/theme/theme';

const apiMocks = vi.hoisted(() => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPut: vi.fn(),
  apiDelete: vi.fn(),
}));

vi.mock('../src/shared/services/apiClient', () => apiMocks);

const modules = [
  { moduleId: 1, moduleName: '기본' },
  { moduleId: 2, moduleName: '환경설정' },
];

const roles = [
  { roleId: 1, roleNm: '관리자', useAt: 'Y', roleCode: 'ADMIN' },
  { roleId: 2, roleNm: '운영자', useAt: 'Y', roleCode: 'OPERATOR' },
];

const permissions = [
  {
    permissionId: 1,
    permissionCode: 'READ',
    permissionName: '조회',
    sortOrder: 10,
  },
  {
    permissionId: 2,
    permissionCode: 'CREATE',
    permissionName: '등록',
    sortOrder: 20,
  },
  {
    permissionId: 3,
    permissionCode: 'UPDATE',
    permissionName: '수정',
    sortOrder: 30,
  },
  {
    permissionId: 5,
    permissionCode: 'EXCEL',
    permissionName: '엑셀',
    sortOrder: 50,
  },
];

const pageProps = {
  selectedModule: {
    id: 'settings',
    name: '환경설정',
    icon: null,
    tree: [
      {
        id: 'menus',
        name: '메뉴관리',
        pageKey: 'menus',
        permissions: {
          read: true,
          create: true,
          update: true,
          delete: true,
          excel: false,
        },
      },
    ],
    menus: [],
  },
  currentMenuName: '메뉴 관리',
  content: {
    title: '메뉴 관리',
    description: '메뉴를 관리합니다.',
    cards: [],
    items: [],
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  apiMocks.apiGet.mockImplementation((path: string) => {
    if (path === '/api/v1/system/modules') {
      return Promise.resolve({
        resultList: modules.map((module) => ({
          ...module,
          moduleNm: module.moduleName,
          useAt: 'Y',
        })),
      });
    }
    if (path === '/api/v1/system/roles') {
      return Promise.resolve({ resultList: roles });
    }
    if (path === '/api/v1/system/permissions') {
      return Promise.resolve({ resultList: permissions });
    }
    if (path === '/api/v1/system/menus?moduleId=1&roleId=1') {
      return Promise.resolve({ resultList: [] });
    }
    return Promise.reject(new Error(`unexpected call: ${path}`));
  });
});

function renderPage() {
  return render(
    <ThemeProvider theme={createAppTheme()}>
      <MenuManagementPage {...pageProps} />
    </ThemeProvider>,
  );
}

describe('MenuManagementPage required selection', () => {
  it('blocks the menu query until both module and role are selected', async () => {
    renderPage();

    const moduleSelector = await screen.findByRole('combobox', {
      name: '모듈 선택',
    });
    await waitFor(() => {
      expect(moduleSelector).not.toBeDisabled();
    });
    expect(moduleSelector).toBeVisible();
    expect(screen.getByRole('combobox', { name: '권한 선택' })).toBeVisible();

    await waitFor(() => {
      expect(screen.getByText('모듈과 권한을 모두 선택하세요.')).toBeVisible();
    });

    expect(apiMocks.apiGet).not.toHaveBeenCalledWith(
      '/api/v1/system/menus?moduleId=1',
    );
    expect(apiMocks.apiGet).not.toHaveBeenCalledWith(
      '/api/v1/system/menus?moduleId=1&roleId=1',
    );

    fireEvent.mouseDown(screen.getByRole('combobox', { name: '모듈 선택' }));
    fireEvent.click(screen.getByRole('option', { name: '기본' }));
    fireEvent.mouseDown(screen.getByRole('combobox', { name: '권한 선택' }));
    fireEvent.click(screen.getByRole('option', { name: '관리자' }));

    await waitFor(() => {
      expect(apiMocks.apiGet).toHaveBeenCalledWith(
        '/api/v1/system/menus?moduleId=1&roleId=1',
      );
    });
  });

  it('shows the grid skeleton while the menu tree is loading on first entry', async () => {
    let resolveMenuRows: ((value: { resultList: [] }) => void) | undefined;
    apiMocks.apiGet.mockImplementation((path: string) => {
      if (path === '/api/v1/system/modules') {
        return Promise.resolve({
          resultList: modules.map((module) => ({
            ...module,
            moduleNm: module.moduleName,
            useAt: 'Y',
          })),
        });
      }
      if (path === '/api/v1/system/roles') {
        return Promise.resolve({ resultList: roles });
      }
      if (path === '/api/v1/system/permissions') {
        return Promise.resolve({ resultList: permissions });
      }
      if (path === '/api/v1/system/menus?moduleId=1&roleId=1') {
        return new Promise((resolve) => {
          resolveMenuRows = resolve;
        });
      }
      return Promise.resolve({ resultList: [] });
    });

    renderPage();

    const moduleSelector = await screen.findByRole('combobox', {
      name: '모듈 선택',
    });
    const roleSelector = await screen.findByRole('combobox', {
      name: '권한 선택',
    });

    await waitFor(() => {
      expect(moduleSelector).not.toBeDisabled();
      expect(roleSelector).not.toBeDisabled();
    });

    fireEvent.mouseDown(moduleSelector);
    fireEvent.click(screen.getByRole('option', { name: '기본' }));
    fireEvent.mouseDown(roleSelector);
    fireEvent.click(screen.getByRole('option', { name: '관리자' }));

    await waitFor(() => {
      expect(
        screen.getAllByTestId('grid-loading-row-skeleton').length,
      ).toBeGreaterThan(0);
    });

    resolveMenuRows?.({ resultList: [] });
  });

  it('shows the grid skeleton when the read action is triggered', async () => {
    let resolveMenuRows: ((value: { resultList: [] }) => void) | undefined;
    apiMocks.apiGet.mockImplementation((path: string) => {
      if (path === '/api/v1/system/modules') {
        return Promise.resolve({
          resultList: modules.map((module) => ({
            ...module,
            moduleNm: module.moduleName,
            useAt: 'Y',
          })),
        });
      }
      if (path === '/api/v1/system/roles') {
        return Promise.resolve({ resultList: roles });
      }
      if (path === '/api/v1/system/permissions') {
        return Promise.resolve({ resultList: permissions });
      }
      if (path === '/api/v1/system/menus?moduleId=1&roleId=1') {
        if (resolveMenuRows) {
          return new Promise((resolve) => {
            resolveMenuRows = resolve;
          });
        }
        return new Promise((resolve) => {
          resolveMenuRows = resolve;
        });
      }
      return Promise.resolve({ resultList: [] });
    });

    renderPage();

    const moduleSelector = await screen.findByRole('combobox', {
      name: '모듈 선택',
    });
    const roleSelector = await screen.findByRole('combobox', {
      name: '권한 선택',
    });

    await waitFor(() => {
      expect(moduleSelector).not.toBeDisabled();
      expect(roleSelector).not.toBeDisabled();
    });

    fireEvent.mouseDown(moduleSelector);
    fireEvent.click(screen.getByRole('option', { name: '기본' }));
    fireEvent.mouseDown(roleSelector);
    fireEvent.click(screen.getByRole('option', { name: '관리자' }));

    resolveMenuRows?.({ resultList: [] });
    await waitFor(() => {
      expect(screen.queryAllByTestId('grid-loading-skeleton')).toHaveLength(0);
    });

    fireEvent.click(screen.getByRole('button', { name: '조회' }));

    await waitFor(() => {
      expect(
        screen.getAllByTestId('grid-loading-row-skeleton').length,
      ).toBeGreaterThan(0);
    });
  });

  it('disables save while the module and role criteria are incomplete', async () => {
    renderPage();

    const saveButton = await screen.findByRole('button', { name: '저장' });
    expect(saveButton).toBeDisabled();
  });
});

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ModuleManagementPage } from '../src/pages/settings/system/modules/ModuleManagementPage';
import {
  MODULE_ICON_OPTIONS,
  canEditModuleCode,
} from '../src/pages/settings/system/modules/components/ModuleManagementPanel';
import {
  fetchModuleRows,
  updateModule,
} from '../src/pages/settings/system/modules/services/moduleManagement.service';
import { NotificationProvider } from '../src/shared/context/NotificationContext';

const apiMocks = vi.hoisted(() => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPut: vi.fn(),
  apiDelete: vi.fn(),
}));

vi.mock('../src/shared/services/apiClient', () => apiMocks);

const settingsModule = {
  id: 'settings',
  name: '환경설정',
  icon: null,
  tree: [],
  menus: [],
};

const content = {
  title: '모듈관리',
  description: '모듈을 관리합니다.',
  cards: [],
  items: [],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ModuleManagementPage', () => {
  it('renders module rows from the system module API', async () => {
    apiMocks.apiGet.mockResolvedValue({
      resultList: [
        {
          moduleId: 1,
          moduleCode: 'GROUPWARE',
          moduleNm: '그룹웨어',
          iconNm: 'FileText',
          moduleUrl: '/groupware',
          sortOrder: 1,
          useAt: 'Y',
          menuCount: 2,
        },
      ],
    });

    render(
      <ModuleManagementPage
        selectedModule={settingsModule}
        currentMenuName="모듈관리"
        content={content}
        selectedMenuPermissions={{
          read: true,
          create: true,
          update: true,
          delete: true,
          excel: true,
        }}
      />,
    );

    expect(
      await screen.findByRole('gridcell', { name: '그룹웨어' }),
    ).toBeVisible();
    expect(screen.getByText('/groupware')).toBeVisible();
  });

  it('guards a dirty module grid refresh with the shared confirmation dialog', async () => {
    let moduleListCalls = 0;
    apiMocks.apiGet.mockImplementation((path: string) => {
      if (path === '/api/v1/system/modules') {
        moduleListCalls += 1;
        return Promise.resolve({
          resultList: [
            {
              moduleId: 1,
              moduleCode: 'GROUPWARE',
              moduleNm: moduleListCalls === 1 ? '그룹웨어' : '그룹웨어 최신',
              iconNm: 'FileText',
              moduleUrl: '/groupware',
              sortOrder: 1,
              useAt: 'Y',
              menuCount: 2,
            },
          ],
        });
      }
      return Promise.reject(new Error(`Unexpected GET request: ${path}`));
    });

    render(
      <ModuleManagementPage
        selectedModule={settingsModule}
        currentMenuName="모듈관리"
        content={content}
        selectedMenuPermissions={{
          read: true,
          create: true,
          update: true,
          delete: true,
          excel: true,
        }}
      />,
    );

    const nameCell = await screen.findByRole('gridcell', { name: '그룹웨어' });
    fireEvent.doubleClick(nameCell);
    fireEvent.change(await screen.findByDisplayValue('그룹웨어'), {
      target: { value: '그룹웨어 편집' },
    });
    fireEvent.keyDown(screen.getByDisplayValue('그룹웨어 편집'), {
      key: 'Enter',
      code: 'Enter',
    });

    fireEvent.click(screen.getByRole('button', { name: '조회' }));
    expect(
      await screen.findByRole('dialog', { name: '저장하지 않은 변경사항' }),
    ).toHaveTextContent('변경사항을 버리고 모듈 목록을 다시 불러오시겠습니까?');
    fireEvent.click(screen.getByRole('button', { name: '취소' }));
    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: '저장하지 않은 변경사항' }),
      ).not.toBeInTheDocument(),
    );
    expect(moduleListCalls).toBe(1);
    expect(
      screen.getByRole('gridcell', { name: '그룹웨어 편집' }),
    ).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: '조회' }));
    fireEvent.click(await screen.findByRole('button', { name: '계속' }));
    await waitFor(() => expect(moduleListCalls).toBe(2));
    expect(
      await screen.findByRole('gridcell', { name: '그룹웨어 최신' }),
    ).toBeVisible();
  });

  it('clears the dirty state after confirming a refresh so the save button is re-disabled', async () => {
    let moduleListCalls = 0;
    apiMocks.apiGet.mockImplementation((path: string) => {
      if (path === '/api/v1/system/modules') {
        moduleListCalls += 1;
        return Promise.resolve({
          resultList: [
            {
              moduleId: 1,
              moduleCode: 'GROUPWARE',
              moduleNm: moduleListCalls === 1 ? '그룹웨어' : '그룹웨어 최신',
              iconNm: 'FileText',
              moduleUrl: '/groupware',
              sortOrder: 1,
              useAt: 'Y',
              menuCount: 2,
            },
          ],
        });
      }
      return Promise.reject(new Error(`Unexpected GET request: ${path}`));
    });

    render(
      <ModuleManagementPage
        selectedModule={settingsModule}
        currentMenuName="모듈관리"
        content={content}
        selectedMenuPermissions={{
          read: true,
          create: true,
          update: true,
          delete: true,
          excel: true,
        }}
      />,
    );

    const nameCell = await screen.findByRole('gridcell', { name: '그룹웨어' });
    fireEvent.doubleClick(nameCell);
    fireEvent.change(await screen.findByDisplayValue('그룹웨어'), {
      target: { value: '그룹웨어 편집' },
    });
    fireEvent.keyDown(screen.getByDisplayValue('그룹웨어 편집'), {
      key: 'Enter',
      code: 'Enter',
    });

    fireEvent.click(screen.getByRole('button', { name: '조회' }));
    fireEvent.click(await screen.findByRole('button', { name: '계속' }));

    await waitFor(() => expect(moduleListCalls).toBe(2));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: '저장' })).toBeDisabled();
    });
  });

  it('shows a success toast after saving module changes', async () => {
    apiMocks.apiGet.mockResolvedValue({
      resultList: [
        {
          moduleId: 1,
          moduleCode: 'GROUPWARE',
          moduleNm: '그룹웨어',
          iconNm: 'FileText',
          moduleUrl: '/groupware',
          sortOrder: 1,
          useAt: 'Y',
          menuCount: 2,
        },
      ],
    });
    apiMocks.apiPut.mockResolvedValue({});

    render(
      <NotificationProvider>
        <ModuleManagementPage
          selectedModule={settingsModule}
          currentMenuName="모듈관리"
          content={content}
          selectedMenuPermissions={{
            read: true,
            create: true,
            update: true,
            delete: true,
            excel: true,
          }}
        />
      </NotificationProvider>,
    );

    const nameCell = await screen.findByRole('gridcell', { name: '그룹웨어' });
    fireEvent.doubleClick(nameCell);
    fireEvent.change(await screen.findByDisplayValue('그룹웨어'), {
      target: { value: '그룹웨어 수정' },
    });
    fireEvent.keyDown(screen.getByDisplayValue('그룹웨어 수정'), {
      key: 'Enter',
      code: 'Enter',
    });

    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => {
      expect(apiMocks.apiPut).toHaveBeenCalled();
    });
    expect(await screen.findByText('모듈을 저장했습니다.')).toBeVisible();
  });

  it('normalizes api data and sends the write payload in the expected schema', async () => {
    apiMocks.apiGet.mockResolvedValue({
      resultList: [
        {
          moduleId: 7,
          moduleCode: 'QUALITY',
          moduleNm: '품질관리',
          iconNm: 'ClipboardCheck',
          moduleUrl: '/quality',
          sortOrder: '3',
          useAt: 'Y',
          menuCount: '4',
        },
      ],
    });

    const rows = await fetchModuleRows();
    expect(rows[0]).toMatchObject({
      id: '7',
      moduleCode: 'QUALITY',
      moduleName: '품질관리',
      iconName: 'ClipboardCheck',
      moduleUrl: '/quality',
      sortOrder: 3,
      menuCount: 4,
      use: true,
    });

    apiMocks.apiPut.mockResolvedValue({});
    await updateModule('7', {
      moduleCode: 'QUALITY',
      moduleNm: '품질관리',
      iconNm: 'ClipboardCheck',
      moduleUrl: '/quality',
      sortOrder: 3,
      useAt: 'Y',
    });

    expect(apiMocks.apiPut).toHaveBeenCalledWith('/api/v1/system/modules/7', {
      moduleCode: 'QUALITY',
      moduleNm: '품질관리',
      iconNm: 'ClipboardCheck',
      moduleUrl: '/quality',
      sortOrder: 3,
      useAt: 'Y',
    });
  });

  it('wraps the module panel in the same outer shell as the menu panel', async () => {
    apiMocks.apiGet.mockResolvedValue({ resultList: [] });

    render(
      <ModuleManagementPage
        selectedModule={settingsModule}
        currentMenuName="모듈관리"
        content={content}
        selectedMenuPermissions={{
          read: true,
          create: true,
          update: true,
          delete: true,
          excel: true,
        }}
      />,
    );

    const grid = await screen.findByRole('grid', { name: 'F1-GRID 모듈 관리' });
    const card = grid.closest('.MuiCard-root');
    const shell = card?.parentElement;

    expect(grid).toBeVisible();
    expect(shell).not.toBeNull();
    expect(shell?.className).toContain('MuiBox-root');
    expect(getComputedStyle(shell as HTMLElement).display).toBe('flex');
    expect(getComputedStyle(shell as HTMLElement).flexDirection).toBe('column');
    expect(getComputedStyle(shell as HTMLElement).overflow).toBe('hidden');
    expect(getComputedStyle(shell as HTMLElement).minHeight).toBe('0px');
    expect(getComputedStyle(card as HTMLElement).minHeight).toBe('0px');
  });

  it('shows a known icon select list and locks saved module codes from editing', () => {
    expect(MODULE_ICON_OPTIONS.length).toBeGreaterThan(0);
    expect(
      canEditModuleCode({
        id: '7',
        moduleCode: 'QUALITY',
        moduleName: '품질관리',
        iconName: 'ClipboardCheck',
        moduleUrl: '/quality',
        sortOrder: 3,
        menuCount: 4,
        use: true,
      }),
    ).toBe(false);
    expect(
      canEditModuleCode({
        id: 'new-module-1',
        moduleCode: '',
        moduleName: '신규 모듈',
        iconName: 'Folder',
        moduleUrl: '/new',
        sortOrder: 1,
        menuCount: 0,
        use: true,
      }),
    ).toBe(true);
  });
});

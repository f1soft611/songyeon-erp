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

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

const moduleList = (moduleName = '그룹웨어') => ({
  resultList: [
    {
      moduleId: 1,
      moduleCode: 'GROUPWARE',
      moduleNm: moduleName,
      iconNm: 'FileText',
      moduleUrl: '/groupware',
      sortOrder: 1,
      useAt: 'Y',
      menuCount: 2,
    },
  ],
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ModuleManagementPage', () => {
  it('replaces only the initial failed body and restores a normal empty result on retry', async () => {
    apiMocks.apiGet.mockRejectedValueOnce(new Error('initial failure'));
    render(
      <ModuleManagementPage selectedModule={settingsModule} currentMenuName="모듈관리"
        content={content} selectedMenuPermissions={{ read: true, create: true, update: true, delete: true }} />,
    );
    const retry = await screen.findByRole('button', { name: '모듈 목록 다시 불러오기' });
    expect(screen.queryByRole('textbox', { name: '모듈 검색' })).not.toBeInTheDocument();
    expect(screen.queryByRole('grid')).not.toBeInTheDocument();
    apiMocks.apiGet.mockResolvedValue({ resultList: [] });
    fireEvent.click(retry);
    expect(await screen.findByRole('textbox', { name: '모듈 검색' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '모듈 목록 다시 불러오기' })).not.toBeInTheDocument();
  });

  it('preserves loaded rows when a later manual query fails', async () => {
    apiMocks.apiGet.mockResolvedValueOnce(moduleList());
    render(
      <ModuleManagementPage selectedModule={settingsModule} currentMenuName="모듈관리"
        content={content} selectedMenuPermissions={{ read: true, create: true, update: true, delete: true }} />,
    );
    await screen.findByRole('gridcell', { name: '그룹웨어' });
    apiMocks.apiGet.mockRejectedValue(new Error('refresh failure'));
    fireEvent.click(screen.getByRole('button', { name: '조회', exact: true }));
    expect(await screen.findByText('refresh failure')).toBeInTheDocument();
    expect(screen.getByRole('gridcell', { name: '그룹웨어' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '모듈 목록 다시 불러오기' })).not.toBeInTheDocument();
  });

  it('protects dirty changes across failed saves and releases unload protection after a successful save', async () => {
    apiMocks.apiGet.mockResolvedValue(moduleList());
    apiMocks.apiPut.mockRejectedValueOnce(new Error('Save failed'));
    const view = render(
      <NotificationProvider>
        <ModuleManagementPage
          selectedModule={settingsModule}
          currentMenuName="모듈관리"
          content={content}
          selectedMenuPermissions={{ read: true, create: true, update: true, delete: true }}
        />
      </NotificationProvider>,
    );
    const unloadIsBlocked = () => {
      const event = new Event('beforeunload', { cancelable: true });
      window.dispatchEvent(event);
      return event.defaultPrevented;
    };
    const nameCell = await screen.findByRole('gridcell', { name: '그룹웨어' });
    expect(unloadIsBlocked()).toBe(false);
    fireEvent.doubleClick(nameCell);
    fireEvent.change(screen.getByDisplayValue('그룹웨어'), {
      target: { value: 'Edited module' },
    });
    fireEvent.keyDown(screen.getByDisplayValue('Edited module'), { key: 'Enter' });
    expect(unloadIsBlocked()).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    expect(await screen.findByText('Save failed')).toBeInTheDocument();
    expect(unloadIsBlocked()).toBe(true);

    apiMocks.apiPut.mockResolvedValue({});
    apiMocks.apiGet.mockResolvedValue(moduleList('Edited module'));
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => expect(unloadIsBlocked()).toBe(false));
    view.unmount();
    expect(unloadIsBlocked()).toBe(false);
  });

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

  it('retains ordinary loading for initial and manual module queries', async () => {
    const initialRequest = deferred<unknown>();
    const manualRequest = deferred<unknown>();
    let getCount = 0;
    apiMocks.apiGet.mockImplementation(() => {
      getCount += 1;
      return getCount === 1 ? initialRequest.promise : manualRequest.promise;
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
        }}
      />,
    );

    expect(
      await screen.findByRole('grid', { name: 'F1-GRID 모듈 관리' }),
    ).toBeVisible();
    expect(screen.getByTestId('f1-grid-loading-overlay')).toBeVisible();
    initialRequest.resolve(moduleList());
    expect(
      await screen.findByRole('gridcell', { name: '그룹웨어' }),
    ).toBeVisible();
    expect(screen.queryByTestId('f1-grid-loading-overlay')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '조회' }));
    await waitFor(() => expect(getCount).toBe(2));
    expect(screen.getByTestId('f1-grid-loading-overlay')).toBeVisible();
    manualRequest.resolve(moduleList('그룹웨어 최신'));
    expect(
      await screen.findByRole('gridcell', { name: '그룹웨어 최신' }),
    ).toBeVisible();
    expect(screen.queryByTestId('f1-grid-loading-overlay')).not.toBeInTheDocument();
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

  it('locks module edits, context actions, search, and refresh through the quiet save refresh', async () => {
    const saveRequest = deferred<unknown>();
    const refreshRequest = deferred<unknown>();
    let getCount = 0;
    apiMocks.apiGet.mockImplementation((path: string) => {
      if (path !== '/api/v1/system/modules') {
        return Promise.reject(new Error(`Unexpected GET request: ${path}`));
      }
      getCount += 1;
      return getCount === 1
        ? Promise.resolve(moduleList())
        : refreshRequest.promise;
    });
    apiMocks.apiPut.mockReturnValue(saveRequest.promise);

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
          }}
        />
      </NotificationProvider>,
    );

    const originalName = await screen.findByRole('gridcell', { name: '그룹웨어' });
    fireEvent.doubleClick(originalName);
    fireEvent.change(await screen.findByDisplayValue('그룹웨어'), {
      target: { value: '그룹웨어 수정' },
    });
    fireEvent.keyDown(screen.getByDisplayValue('그룹웨어 수정'), {
      key: 'Enter',
      code: 'Enter',
    });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => expect(apiMocks.apiPut).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('gridcell', { name: '그룹웨어 수정' })).toBeVisible();
    expect(screen.getByRole('progressbar', { name: '저장 중' })).toHaveStyle({ width: '16px' });
    expect(screen.queryByTestId('f1-grid-loading-overlay')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '저장' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '조회' })).toBeDisabled();
    expect(screen.getByRole('textbox', { name: '모듈 검색' })).toBeDisabled();
    expect(screen.queryByText('모듈을 저장했습니다.')).not.toBeInTheDocument();

    fireEvent.doubleClick(screen.getByRole('gridcell', { name: '그룹웨어 수정' }));
    expect(screen.queryByDisplayValue('그룹웨어 수정')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    expect(apiMocks.apiPut).toHaveBeenCalledTimes(1);
    expect(getCount).toBe(1);

    saveRequest.resolve({});
    await waitFor(() => expect(getCount).toBe(2));
    expect(screen.getByRole('progressbar', { name: '저장 중' })).toBeVisible();
    expect(screen.getByRole('gridcell', { name: '그룹웨어 수정' })).toBeVisible();
    expect(screen.queryByTestId('f1-grid-loading-overlay')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '조회' })).toBeDisabled();
    expect(screen.queryByRole('menuitem', { name: '행 추가' })).not.toBeInTheDocument();

    refreshRequest.resolve(moduleList('그룹웨어 저장됨'));
    expect(
      await screen.findByRole('gridcell', { name: '그룹웨어 저장됨' }),
    ).toBeVisible();
    await waitFor(() => expect(screen.getByRole('button', { name: '조회' })).toBeEnabled());
    expect(screen.queryByRole('progressbar', { name: '저장 중' })).not.toBeInTheDocument();
    expect(await screen.findByText('모듈을 저장했습니다.')).toBeVisible();
  });

  it('hides module add and delete context actions while saving', async () => {
    const saveRequest = deferred<unknown>();
    const refreshRequest = deferred<unknown>();
    let getCount = 0;
    apiMocks.apiGet.mockImplementation(() => {
      getCount += 1;
      return getCount === 1 ? Promise.resolve(moduleList()) : refreshRequest.promise;
    });
    apiMocks.apiPut.mockReturnValue(saveRequest.promise);

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
        }}
      />,
    );

    fireEvent.doubleClick(await screen.findByRole('gridcell', { name: '그룹웨어' }));
    fireEvent.change(await screen.findByDisplayValue('그룹웨어'), {
      target: { value: '그룹웨어 수정' },
    });
    fireEvent.keyDown(screen.getByDisplayValue('그룹웨어 수정'), {
      key: 'Enter',
      code: 'Enter',
    });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => expect(apiMocks.apiPut).toHaveBeenCalledTimes(1));

    fireEvent.contextMenu(screen.getByRole('gridcell', { name: '그룹웨어 수정' }));
    expect(screen.queryByRole('menuitem', { name: '행 추가' })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: '행 삭제' })).not.toBeInTheDocument();

    saveRequest.resolve({});
    await waitFor(() => expect(getCount).toBe(2));
    refreshRequest.resolve(moduleList('그룹웨어 저장됨'));
    await waitFor(() =>
      expect(document.body).toHaveTextContent('그룹웨어 저장됨'),
    );
  });

  it('retains module edits and permits retry after a write failure', async () => {
    apiMocks.apiGet.mockResolvedValue(moduleList());
    apiMocks.apiPut
      .mockRejectedValueOnce(new Error('모듈 저장 실패'))
      .mockResolvedValueOnce({});

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
          }}
        />
      </NotificationProvider>,
    );

    fireEvent.doubleClick(await screen.findByRole('gridcell', { name: '그룹웨어' }));
    fireEvent.change(await screen.findByDisplayValue('그룹웨어'), {
      target: { value: '그룹웨어 재시도' },
    });
    fireEvent.keyDown(screen.getByDisplayValue('그룹웨어 재시도'), {
      key: 'Enter',
      code: 'Enter',
    });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    expect(await screen.findByText('모듈 저장 실패')).toBeVisible();
    expect(screen.getByRole('gridcell', { name: '그룹웨어 재시도' })).toBeVisible();
    expect(screen.getByRole('button', { name: '저장' })).toBeEnabled();
    expect(screen.queryByText('모듈을 저장했습니다.')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => expect(apiMocks.apiPut).toHaveBeenCalledTimes(2));
  });

  it('preserves module changes and retry state when the quiet refresh fails', async () => {
    let getCount = 0;
    apiMocks.apiGet.mockImplementation(() => {
      getCount += 1;
      return getCount === 1
        ? Promise.resolve(moduleList())
        : Promise.reject(new Error('모듈 재조회 실패'));
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
          }}
        />
      </NotificationProvider>,
    );

    fireEvent.doubleClick(await screen.findByRole('gridcell', { name: '그룹웨어' }));
    fireEvent.change(await screen.findByDisplayValue('그룹웨어'), {
      target: { value: '그룹웨어 재조회 재시도' },
    });
    fireEvent.keyDown(screen.getByDisplayValue('그룹웨어 재조회 재시도'), {
      key: 'Enter',
      code: 'Enter',
    });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    expect(await screen.findByText('모듈 재조회 실패')).toBeVisible();
    expect(
      screen.getByRole('gridcell', { name: '그룹웨어 재조회 재시도' }),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: '저장' })).toBeEnabled();
    expect(screen.queryByText('모듈을 저장했습니다.')).not.toBeInTheDocument();
    expect(apiMocks.apiPut).toHaveBeenCalledTimes(1);
    fireEvent.doubleClick(
      screen.getByRole('gridcell', { name: '그룹웨어 재조회 재시도' }),
    );
    fireEvent.change(screen.getByDisplayValue('그룹웨어 재조회 재시도'), {
      target: { value: '그룹웨어 재조회 재수정' },
    });
    fireEvent.keyDown(screen.getByDisplayValue('그룹웨어 재조회 재수정'), {
      key: 'Enter',
      code: 'Enter',
    });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => expect(getCount).toBe(3));
    expect(apiMocks.apiPut).toHaveBeenCalledTimes(2);
    expect(apiMocks.apiPut).toHaveBeenNthCalledWith(
      2,
      '/api/v1/system/modules/1',
      expect.objectContaining({
        moduleNm: '그룹웨어 재조회 재수정',
      }),
    );
  });
});

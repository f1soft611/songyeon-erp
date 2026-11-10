import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { useRef, useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RoleManagementPage } from '../src/pages/settings/system/roles/RoleManagementPage';
import {
  RoleManagementPanel,
  type RoleManagementPanelHandle,
} from '../src/pages/settings/system/roles/components/RoleManagementPanel';
import type { RoleManagementRow } from '../src/pages/settings/system/roles/types/roleManagement.types';
import { F1Grid, type F1GridColumn } from '../src/shared/components/f1-grid';
import { NotificationProvider } from '../src/shared/context/NotificationContext';

const apiMocks = vi.hoisted(() => ({
  apiDelete: vi.fn(),
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPut: vi.fn(),
}));

vi.mock('../src/shared/services/apiClient', () => apiMocks);

const pageProps = {
  selectedModule: {
    id: 'settings',
    name: '환경설정',
    icon: null,
    tree: [],
    menus: [],
  },
  currentMenuName: '권한관리',
  content: {
    title: '권한관리',
    description: '역할을 관리합니다.',
    cards: [],
    items: [],
  },
  selectedMenuPermissions: {
    read: true,
    create: true,
    update: true,
    delete: true,
    excel: true,
  },
};

function renderPage(overrides: Partial<typeof pageProps> = {}) {
  return render(
    <NotificationProvider>
      <RoleManagementPage {...pageProps} {...overrides} />
    </NotificationProvider>,
  );
}

function createRole(roleId: number, roleNm: string) {
  return {
    roleId,
    roleCode: `ROLE_${roleId}`,
    roleNm,
    roleDc: `${roleNm} 역할`,
    useAt: 'Y',
  };
}

function createMapping(loginId: number, userNm: string, assigned = false) {
  return {
    loginId,
    userNm,
    departmentNm: '운영팀',
    assigned,
  };
}

function createDeferred<T>() {
  let resolve: (value: T) => void;
  let reject: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve: resolve!, reject: reject! };
}

describe('RoleManagementPage notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it('quietly locks both grids through role save and all post-save refreshes', async () => {
    const save = createDeferred<void>();
    const mappingSave = createDeferred<void>();
    const roleRefresh = createDeferred<unknown>();
    const userRefresh = createDeferred<unknown>();
    const finalRoleRefresh = createDeferred<unknown>();
    let roleReads = 0;
    let userReads = 0;
    const roles = [createRole(7, '운영자'), createRole(8, '검토자')];
    apiMocks.apiGet.mockImplementation((path: string) => {
      if (path === '/api/v1/system/roles') {
        roleReads += 1;
        return roleReads === 1
          ? Promise.resolve({ resultList: roles })
          : roleReads === 2
            ? roleRefresh.promise
            : finalRoleRefresh.promise;
      }
      if (path === '/api/v1/system/roles/7/users') {
        userReads += 1;
        return userReads === 1
          ? Promise.resolve({
              assignedUsers: [],
              unassignedUsers: [createMapping(12, '매핑 대상')],
            })
          : userRefresh.promise;
      }
      return Promise.reject(new Error(`Unexpected GET request: ${path}`));
    });
    apiMocks.apiPut.mockReturnValue(save.promise);
    apiMocks.apiPost.mockReturnValue(mappingSave.promise);
    renderPage();
    fireEvent.click(
      await screen.findByRole('checkbox', { name: '매핑 여부 12' }),
    );
    fireEvent.doubleClick(screen.getByRole('gridcell', { name: '운영자' }));
    fireEvent.change(await screen.findByDisplayValue('운영자'), {
      target: { value: '운영자 수정' },
    });
    fireEvent.keyDown(screen.getByDisplayValue('운영자 수정'), { key: 'Enter' });
    const saveButton = screen.getByRole('button', { name: '저장' });
    fireEvent.click(saveButton);
    await waitFor(() => expect(apiMocks.apiPut).toHaveBeenCalledTimes(1));

    const expectLocked = () => {
      const roleGrid = screen.getByRole('grid', { name: 'F1-GRID 권한 관리' });
      const userGrid = screen.getByRole('grid', { name: 'F1-GRID 사용자 매핑' });
      expect(roleGrid).toBeVisible();
      expect(userGrid).toBeVisible();
      expect(screen.getByRole('gridcell', { name: '매핑 대상' })).toBeVisible();
      expect(screen.queryAllByTestId('grid-loading-skeleton')).toHaveLength(0);
      expect(
        screen.queryAllByTestId('grid-loading-row-skeleton'),
      ).toHaveLength(0);
      expect(roleGrid.closest('[aria-busy="true"]')).toBeNull();
      expect(userGrid.closest('[aria-busy="true"]')).toBeNull();
      expect(saveButton).toBeDisabled();
      expect(screen.getByRole('button', { name: '조회' })).toBeDisabled();
      expect(screen.getByLabelText('역할 검색')).toBeDisabled();
      const rowCount = within(roleGrid).getAllByRole('row').length;
      const mapping = screen.getByRole('checkbox', { name: '매핑 여부 12' });
      expect(mapping).toBeDisabled();
      fireEvent.click(mapping);
      expect(mapping).toBeChecked();
      fireEvent.click(screen.getByRole('gridcell', { name: '검토자' }));
      expect(screen.getByText(/선택 역할: 운영자/)).toBeVisible();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      fireEvent.doubleClick(
        screen.getByRole('gridcell', { name: '운영자 수정' }),
      );
      expect(screen.queryByDisplayValue('운영자 수정')).not.toBeInTheDocument();
      for (const grid of [roleGrid, userGrid]) {
        for (const checkbox of within(grid).getAllByRole('checkbox')) {
          expect(checkbox).toBeDisabled();
        }
        fireEvent.contextMenu(grid);
        for (const name of ['행 추가', '행 복사', '행 삭제']) {
          expect(
            screen.queryByRole('menuitem', { name }),
          ).not.toBeInTheDocument();
        }
        for (const key of ['Insert', 'Delete', 'F2', 'Enter', ' ']) {
          fireEvent.keyDown(grid, { key });
        }
        fireEvent.keyDown(grid, { key: 'd', ctrlKey: true });
        fireEvent.keyDown(grid, { key: 'v', ctrlKey: true });
        fireEvent.paste(grid, {
          clipboardData: { getData: () => '저장 중 붙여넣기' },
        });
      }
      expect(within(roleGrid).getAllByRole('row')).toHaveLength(rowCount);
      expect(screen.getByRole('gridcell', { name: '운영자 수정' })).toBeVisible();
      expect(mapping).toBeChecked();
      const readCount = apiMocks.apiGet.mock.calls.length;
      fireEvent.click(saveButton);
      fireEvent.click(screen.getByRole('button', { name: '조회' }));
      expect(apiMocks.apiGet).toHaveBeenCalledTimes(readCount);
      expect(apiMocks.apiPut).toHaveBeenCalledTimes(1);
      expect(apiMocks.apiGet).not.toHaveBeenCalledWith(
        '/api/v1/system/roles/8/users',
      );
    };

    expectLocked();
    save.resolve();
    await waitFor(() => expect(roleReads).toBe(2));
    expectLocked();
    roleRefresh.resolve({
      resultList: [createRole(7, '운영자 수정'), roles[1]],
    });
    await waitFor(() => expect(apiMocks.apiPost).toHaveBeenCalledTimes(1));
    expectLocked();
    mappingSave.resolve();
    await waitFor(() => expect(userReads).toBe(2));
    expectLocked();
    userRefresh.resolve({
      assignedUsers: [createMapping(12, '매핑 대상', true)],
      unassignedUsers: [],
    });
    await waitFor(() => expect(roleReads).toBe(3));
    expectLocked();
    finalRoleRefresh.resolve({
      resultList: [createRole(7, '운영자 수정'), roles[1]],
    });
    await waitFor(() =>
      expect(screen.getByLabelText('역할 검색')).not.toBeDisabled(),
    );
    expect(apiMocks.apiPut).toHaveBeenCalledWith('/api/v1/system/roles/7', {
      roleCode: 'ROLE_7',
      roleNm: '운영자 수정',
      roleDc: '운영자 역할',
      useAt: 'Y',
    });
    expect(apiMocks.apiPost).toHaveBeenCalledTimes(1);
    expect(apiMocks.apiPost).toHaveBeenCalledWith(
      '/api/v1/system/roles/7/users',
      { loginId: '12' },
    );
    fireEvent.click(screen.getByRole('checkbox', { name: '매핑 여부 12' }));
    expect(
      screen.getByRole('checkbox', { name: '매핑 여부 12' }),
    ).not.toBeChecked();
    fireEvent.doubleClick(screen.getByRole('gridcell', { name: '운영자 수정' }));
    expect(await screen.findByDisplayValue('운영자 수정')).toBeVisible();
  }, 20000);

  it.each([false, true])(
    'defers automatic search selection during rename and mapping quiet refresh (other match: %s)',
    async (hasOtherMatch) => {
      const roleRefresh = createDeferred<unknown>();
      const userRefresh = createDeferred<unknown>();
      const finalRoleRefresh = createDeferred<unknown>();
      let roleReads = 0;
      let userReads = 0;
      const initialRoles = [
        { ...createRole(7, '검색 운영자'), roleDc: '운영 역할' },
        createRole(8, hasOtherMatch ? '검색 검토자' : '검토자'),
      ];
      const savedRoles = [
        { ...initialRoles[0], roleNm: '수정 운영자' },
        initialRoles[1],
      ];
      apiMocks.apiGet.mockImplementation((path: string) => {
        if (path === '/api/v1/system/roles') {
          roleReads += 1;
          return roleReads === 1
            ? Promise.resolve({ resultList: initialRoles })
            : roleReads === 2
              ? roleRefresh.promise
              : finalRoleRefresh.promise;
        }
        if (path === '/api/v1/system/roles/7/users') {
          userReads += 1;
          return userReads === 1
            ? Promise.resolve({
                assignedUsers: [],
                unassignedUsers: [createMapping(12, '기존 매핑 대상')],
              })
            : userRefresh.promise;
        }
        if (path === '/api/v1/system/roles/8/users') {
          return Promise.resolve({
            assignedUsers: [createMapping(13, '다른 역할 사용자', true)],
            unassignedUsers: [],
          });
        }
        return Promise.reject(new Error(`Unexpected GET request: ${path}`));
      });
      apiMocks.apiPut.mockResolvedValue(undefined);
      apiMocks.apiPost.mockResolvedValue(undefined);
      renderPage();
      fireEvent.click(
        await screen.findByRole('checkbox', { name: '매핑 여부 12' }),
      );
      fireEvent.change(screen.getByLabelText('역할 검색'), {
        target: { value: '검색' },
      });
      fireEvent.doubleClick(
        screen.getByRole('gridcell', { name: '검색 운영자' }),
      );
      fireEvent.change(await screen.findByDisplayValue('검색 운영자'), {
        target: { value: '수정 운영자' },
      });
      fireEvent.keyDown(screen.getByDisplayValue('수정 운영자'), {
        key: 'Enter',
      });
      fireEvent.click(screen.getByRole('button', { name: '저장' }));
      await waitFor(() => expect(roleReads).toBe(2));
      roleRefresh.resolve({ resultList: savedRoles });
      await waitFor(() => expect(userReads).toBe(2));

      const expectStableTarget = () => {
        expect(
          screen.getByRole('gridcell', { name: '기존 매핑 대상' }),
        ).toBeVisible();
        expect(
          screen.getByRole('gridcell', { name: '수정 운영자' }),
        ).toBeVisible();
        expect(screen.getByText('선택 역할: 수정 운영자')).toBeVisible();
        expect(screen.getByLabelText('역할 검색')).toBeDisabled();
        expect(
          screen.queryAllByTestId('grid-loading-row-skeleton'),
        ).toHaveLength(0);
        expect(
          screen.getByRole('checkbox', { name: '매핑 여부 12' }),
        ).toBeChecked();
        expect(apiMocks.apiGet).not.toHaveBeenCalledWith(
          '/api/v1/system/roles/8/users',
        );
      };
      expectStableTarget();
      userRefresh.resolve({
        assignedUsers: [createMapping(12, '기존 매핑 대상', true)],
        unassignedUsers: [],
      });
      await waitFor(() => expect(roleReads).toBe(3));
      expectStableTarget();
      finalRoleRefresh.resolve({ resultList: savedRoles });
      await waitFor(() =>
        expect(screen.getByLabelText('역할 검색')).not.toBeDisabled(),
      );
      if (hasOtherMatch) {
        expect(
          await screen.findByRole('gridcell', { name: '다른 역할 사용자' }),
        ).toBeVisible();
        expect(screen.getByText('선택 역할: 검색 검토자')).toBeVisible();
      } else {
        expect(await screen.findByText('선택된 권한이 없습니다.')).toBeVisible();
      }
      expect(apiMocks.apiPost).toHaveBeenCalledTimes(1);
      expect(apiMocks.apiPost).toHaveBeenCalledWith(
        '/api/v1/system/roles/7/users',
        { loginId: '12' },
      );
    },
    20000,
  );

  it('sends a new role payload after a completed write and failed refresh without duplicating completed writes', async () => {
    let roleReads = 0;
    let savedRoles = [createRole(7, '운영자'), createRole(8, '검토자')];
    apiMocks.apiGet.mockImplementation((path: string) => {
      if (path === '/api/v1/system/roles') {
        roleReads += 1;
        return roleReads === 2
          ? Promise.reject(new Error('저장 후 역할 조회 실패'))
          : Promise.resolve({ resultList: savedRoles });
      }
      if (/\/api\/v1\/system\/roles\/[78]\/users$/.test(path)) {
        return Promise.resolve({ assignedUsers: [], unassignedUsers: [] });
      }
      return Promise.reject(new Error(`Unexpected GET request: ${path}`));
    });
    apiMocks.apiPut.mockImplementation((path: string, payload: { roleNm: string }) => {
      const roleId = Number(path.split('/').at(-1));
      savedRoles = savedRoles.map((role) =>
        role.roleId === roleId ? { ...role, roleNm: payload.roleNm } : role,
      );
      return Promise.resolve();
    });
    renderPage();
    const editRole = async (name: string, nextName: string) => {
      fireEvent.doubleClick(
        await screen.findByRole('gridcell', { name }, { timeout: 5000 }),
      );
      const editor = await screen.findByDisplayValue(name);
      fireEvent.change(editor, { target: { value: nextName } });
      fireEvent.keyDown(editor, { key: 'Enter' });
    };
    await editRole('운영자', '운영자 첫 저장');
    await editRole('검토자', '검토자 첫 저장');
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('저장 후 역할 조회 실패');
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '조회' })).not.toBeDisabled(),
    );
    expect(apiMocks.apiPut).toHaveBeenCalledTimes(2);
    expect(screen.queryByText('역할을 저장했습니다.')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '조회' }));
    const continueButton = screen.queryByRole('button', { name: '계속' });
    if (continueButton) fireEvent.click(continueButton);
    await editRole('운영자 첫 저장', '운영자 두 번째 저장');
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    expect(await screen.findByText('역할을 저장했습니다.')).toBeVisible();
    expect(apiMocks.apiPut).toHaveBeenCalledTimes(3);
    expect(apiMocks.apiPut).toHaveBeenLastCalledWith('/api/v1/system/roles/7', {
      roleCode: 'ROLE_7',
      roleNm: '운영자 두 번째 저장',
      roleDc: '운영자 역할',
      useAt: 'Y',
    });
    expect(
      screen.getByRole('gridcell', { name: '운영자 두 번째 저장' }),
    ).toBeVisible();
    expect(screen.getByRole('gridcell', { name: '검토자 첫 저장' })).toBeVisible();
  }, 20000);

  it('does not repeat an unchanged successful role update when a later update fails', async () => {
    let secondRoleWrites = 0;
    const savedNames = new Map([[7, '운영자'], [8, '검토자']]);
    apiMocks.apiGet.mockImplementation((path: string) => {
      if (path === '/api/v1/system/roles') {
        return Promise.resolve({
          resultList: [...savedNames].map(([id, name]) => createRole(id, name)),
        });
      }
      if (/\/api\/v1\/system\/roles\/[78]\/users$/.test(path)) {
        return Promise.resolve({ assignedUsers: [], unassignedUsers: [] });
      }
      return Promise.reject(new Error(`Unexpected GET request: ${path}`));
    });
    apiMocks.apiPut.mockImplementation((path: string, payload: { roleNm: string }) => {
      const roleId = Number(path.split('/').at(-1));
      if (roleId === 8 && ++secondRoleWrites === 1) {
        return Promise.reject(new Error('두 번째 역할 저장 실패'));
      }
      savedNames.set(roleId, payload.roleNm);
      return Promise.resolve();
    });
    renderPage();
    for (const name of ['운영자', '검토자']) {
      fireEvent.doubleClick(
        await screen.findByRole('gridcell', { name }, { timeout: 5000 }),
      );
      const editor = await screen.findByDisplayValue(name);
      fireEvent.change(editor, { target: { value: `${name} 수정` } });
      fireEvent.keyDown(editor, { key: 'Enter' });
    }
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('두 번째 역할 저장 실패');
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '저장' })).not.toBeDisabled(),
    );
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    expect(await screen.findByText('역할을 저장했습니다.')).toBeVisible();
    expect(apiMocks.apiPut.mock.calls.map(([path]) => path)).toEqual([
      '/api/v1/system/roles/7',
      '/api/v1/system/roles/8',
      '/api/v1/system/roles/8',
    ]);
    expect(screen.getByRole('gridcell', { name: '운영자 수정' })).toBeVisible();
    expect(screen.getByRole('gridcell', { name: '검토자 수정' })).toBeVisible();
  }, 20000);

  it('retains role and mapping edits when the save-triggered role refresh fails, then retries', async () => {
    let roleReads = 0;
    let savedName = '운영자';
    apiMocks.apiGet.mockImplementation((path: string) => {
      if (path === '/api/v1/system/roles') {
        roleReads += 1;
        return roleReads === 2
          ? Promise.reject(new Error('저장 후 역할 조회 실패'))
          : Promise.resolve({
              resultList: [createRole(7, savedName), createRole(8, '검토자')],
            });
      }
      if (path === '/api/v1/system/roles/7/users') {
        return Promise.resolve({
          assignedUsers: [],
          unassignedUsers: [createMapping(12, '매핑 대상')],
        });
      }
      if (path === '/api/v1/system/roles/8/users') {
        return Promise.resolve({ assignedUsers: [], unassignedUsers: [] });
      }
      return Promise.reject(new Error(`Unexpected GET request: ${path}`));
    });
    apiMocks.apiPut.mockImplementation(
      (_path: string, payload: { roleNm: string }) => {
        savedName = payload.roleNm;
        return Promise.resolve();
      },
    );
    apiMocks.apiPost.mockResolvedValue(undefined);
    renderPage();
    fireEvent.click(
      await screen.findByRole(
        'checkbox',
        { name: '매핑 여부 12' },
        { timeout: 5000 },
      ),
    );
    fireEvent.doubleClick(screen.getByRole('gridcell', { name: '운영자' }));
    const editor = await screen.findByDisplayValue('운영자');
    fireEvent.change(editor, { target: { value: '운영자 수정' } });
    fireEvent.keyDown(editor, { key: 'Enter' });
    const saveButton = screen.getByRole('button', { name: '저장' });
    fireEvent.click(saveButton);

    await waitFor(() => expect(roleReads).toBe(2));
    await waitFor(() =>
      expect(screen.getByLabelText('역할 검색')).not.toBeDisabled(),
    );
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(screen.getByRole('alert')).toHaveTextContent(
      '저장 후 역할 조회 실패',
    );
    expect(screen.queryByText('역할을 저장했습니다.')).not.toBeInTheDocument();
    expect(screen.getByRole('gridcell', { name: '운영자 수정' })).toBeVisible();
    expect(screen.getByRole('gridcell', { name: '검토자' })).toBeVisible();
    expect(screen.getByText('선택 역할: 운영자 수정')).toBeVisible();
    expect(screen.getByRole('gridcell', { name: '매핑 대상' })).toBeVisible();
    expect(
      screen.getByRole('checkbox', { name: '매핑 여부 12' }),
    ).toBeChecked();
    expect(saveButton).not.toBeDisabled();
    expect(apiMocks.apiPost).not.toHaveBeenCalled();

    fireEvent.click(saveButton);
    expect(await screen.findByText('역할을 저장했습니다.')).toBeVisible();
    expect(apiMocks.apiPut).toHaveBeenCalledTimes(1);
    expect(apiMocks.apiPost).toHaveBeenCalledTimes(1);
    expect(apiMocks.apiPost).toHaveBeenCalledWith(
      '/api/v1/system/roles/7/users',
      { loginId: '12' },
    );
    await waitFor(() =>
      expect(screen.getByLabelText('역할 검색')).not.toBeDisabled(),
    );
  }, 20000);

  it('keeps the renamed mapping target when its quiet user refresh fails outside the active search', async () => {
    let userReads = 0;
    let savedName = '검색 운영자';
    apiMocks.apiGet.mockImplementation((path: string) => {
      if (path === '/api/v1/system/roles') {
        return Promise.resolve({
          resultList: [createRole(7, savedName), createRole(8, '검색 검토자')],
        });
      }
      if (path === '/api/v1/system/roles/7/users') {
        userReads += 1;
        return userReads === 2
          ? Promise.reject(new Error('매핑 재조회 실패'))
          : Promise.resolve({
              assignedUsers: [],
              unassignedUsers: [createMapping(12, '기존 매핑 대상')],
            });
      }
      if (path === '/api/v1/system/roles/8/users') {
        return Promise.resolve({
          assignedUsers: [createMapping(13, '다른 역할 사용자', true)],
          unassignedUsers: [],
        });
      }
      return Promise.reject(new Error(`Unexpected GET request: ${path}`));
    });
    apiMocks.apiPut.mockImplementation(
      (_path: string, payload: { roleNm: string }) => {
        savedName = payload.roleNm;
        return Promise.resolve();
      },
    );
    apiMocks.apiPost.mockResolvedValue(undefined);
    renderPage();
    fireEvent.click(
      await screen.findByRole(
        'checkbox',
        { name: '매핑 여부 12' },
        { timeout: 5000 },
      ),
    );
    fireEvent.change(screen.getByLabelText('역할 검색'), {
      target: { value: '검색' },
    });
    fireEvent.doubleClick(
      screen.getByRole('gridcell', { name: '검색 운영자' }),
    );
    const editor = await screen.findByDisplayValue('검색 운영자');
    fireEvent.change(editor, { target: { value: '수정 운영자' } });
    fireEvent.keyDown(editor, { key: 'Enter' });
    const saveButton = screen.getByRole('button', { name: '저장' });
    fireEvent.click(saveButton);

    await waitFor(() => expect(userReads).toBe(2));
    await waitFor(() =>
      expect(screen.getByLabelText('역할 검색')).not.toBeDisabled(),
    );
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(screen.getByRole('alert')).toHaveTextContent('매핑 재조회 실패');
    expect(screen.queryByText('역할을 저장했습니다.')).not.toBeInTheDocument();
    expect(screen.getByText('선택 역할: 수정 운영자')).toBeVisible();
    expect(
      screen.getByRole('gridcell', { name: '기존 매핑 대상' }),
    ).toBeVisible();
    expect(
      screen.getByRole('checkbox', { name: '매핑 여부 12' }),
    ).toBeChecked();
    expect(saveButton).not.toBeDisabled();
    expect(apiMocks.apiGet).not.toHaveBeenCalledWith(
      '/api/v1/system/roles/8/users',
    );
  }, 20000);
  it('keeps the retry affordance when a mapping save succeeds but the final role refresh fails', async () => {
    let roleReads = 0;
    let assigned = false;
    apiMocks.apiGet.mockImplementation((path: string) => {
      if (path === '/api/v1/system/roles') {
        roleReads += 1;
        return roleReads === 2
          ? Promise.reject(new Error('최종 역할 조회 실패'))
          : Promise.resolve({
              resultList: [createRole(7, '운영자'), createRole(8, '검토자')],
            });
      }
      if (path === '/api/v1/system/roles/7/users') {
        return Promise.resolve(
          assigned
            ? { assignedUsers: [createMapping(12, '매핑 대상', true)], unassignedUsers: [] }
            : { assignedUsers: [], unassignedUsers: [createMapping(12, '매핑 대상')] },
        );
      }
      return Promise.reject(new Error(`Unexpected GET request: ${path}`));
    });
    apiMocks.apiPost.mockImplementation(() => {
      assigned = true;
      return Promise.resolve();
    });
    renderPage();
    fireEvent.click(
      await screen.findByRole(
        'checkbox',
        { name: '매핑 여부 12' },
        { timeout: 5000 },
      ),
    );
    const saveButton = screen.getByRole('button', { name: '저장' });
    fireEvent.click(saveButton);

    await waitFor(() => expect(roleReads).toBe(2));
    await waitFor(() =>
      expect(screen.getByLabelText('역할 검색')).not.toBeDisabled(),
    );
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(screen.getByRole('alert')).toHaveTextContent('최종 역할 조회 실패');
    expect(screen.queryByText('역할을 저장했습니다.')).not.toBeInTheDocument();
    expect(screen.getByText('선택 역할: 운영자')).toBeVisible();
    expect(screen.getByRole('gridcell', { name: '매핑 대상' })).toBeVisible();
    expect(
      screen.getByRole('checkbox', { name: '매핑 여부 12' }),
    ).toBeChecked();
    expect(saveButton).not.toBeDisabled();

    fireEvent.click(saveButton);
    expect(await screen.findByText('역할을 저장했습니다.')).toBeVisible();
    expect(apiMocks.apiPost).toHaveBeenCalledTimes(1);
    expect(roleReads).toBe(3);
    await waitFor(() => expect(saveButton).toBeDisabled());
  }, 20000);

  it('sends a compensating role update when a written value is reverted after a failed refresh', async () => {
    let roleReads = 0;
    let savedName = '운영자';
    apiMocks.apiGet.mockImplementation((path: string) => {
      if (path === '/api/v1/system/roles') {
        roleReads += 1;
        return roleReads === 2
          ? Promise.reject(new Error('저장 후 역할 조회 실패'))
          : Promise.resolve({
              resultList: [
                { ...createRole(7, savedName), roleDc: '운영자 역할' },
                createRole(8, '검토자'),
              ],
            });
      }
      if (/\/api\/v1\/system\/roles\/[78]\/users$/.test(path)) {
        return Promise.resolve({ assignedUsers: [], unassignedUsers: [] });
      }
      return Promise.reject(new Error(`Unexpected GET request: ${path}`));
    });
    apiMocks.apiPut.mockImplementation(
      (_path: string, payload: { roleNm: string }) => {
        savedName = payload.roleNm;
        return Promise.resolve();
      },
    );
    renderPage();
    const editRole = async (name: string, nextName: string) => {
      fireEvent.doubleClick(
        await screen.findByRole('gridcell', { name }, { timeout: 5000 }),
      );
      const editor = await screen.findByDisplayValue(name);
      fireEvent.change(editor, { target: { value: nextName } });
      fireEvent.keyDown(editor, { key: 'Enter' });
    };
    await editRole('운영자', '운영자 수정');
    const saveButton = screen.getByRole('button', { name: '저장' });
    fireEvent.click(saveButton);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      '저장 후 역할 조회 실패',
    );
    await waitFor(() =>
      expect(screen.getByLabelText('역할 검색')).not.toBeDisabled(),
    );
    expect(apiMocks.apiPut).toHaveBeenCalledTimes(1);

    await editRole('운영자 수정', '운영자');
    expect(saveButton).not.toBeDisabled();
    fireEvent.click(saveButton);
    expect(await screen.findByText('역할을 저장했습니다.')).toBeVisible();
    expect(apiMocks.apiPut).toHaveBeenCalledTimes(2);
    expect(apiMocks.apiPut).toHaveBeenLastCalledWith('/api/v1/system/roles/7', {
      roleCode: 'ROLE_7',
      roleNm: '운영자',
      roleDc: '운영자 역할',
      useAt: 'Y',
    });
    expect(savedName).toBe('운영자');
    expect(screen.getByRole('gridcell', { name: '운영자' })).toBeVisible();
  }, 20000);
  it('sends a compensating unassign when a written mapping is reverted after a failed refresh', async () => {
    let userReads = 0;
    let assigned = false;
    apiMocks.apiGet.mockImplementation((path: string) => {
      if (path === '/api/v1/system/roles') {
        return Promise.resolve({ resultList: [createRole(7, '운영자')] });
      }
      if (path === '/api/v1/system/roles/7/users') {
        userReads += 1;
        if (userReads === 2) {
          return Promise.reject(new Error('매핑 재조회 실패'));
        }
        return Promise.resolve(
          assigned
            ? { assignedUsers: [createMapping(12, '매핑 대상', true)], unassignedUsers: [] }
            : { assignedUsers: [], unassignedUsers: [createMapping(12, '매핑 대상')] },
        );
      }
      return Promise.reject(new Error(`Unexpected GET request: ${path}`));
    });
    apiMocks.apiPost.mockImplementation(() => {
      assigned = true;
      return Promise.resolve();
    });
    apiMocks.apiDelete.mockImplementation(() => {
      assigned = false;
      return Promise.resolve();
    });
    renderPage();
    const mapping = await screen.findByRole(
      'checkbox',
      { name: '매핑 여부 12' },
      { timeout: 5000 },
    );
    fireEvent.click(mapping);
    const saveButton = screen.getByRole('button', { name: '저장' });
    fireEvent.click(saveButton);
    expect(await screen.findByRole('alert')).toHaveTextContent('매핑 재조회 실패');
    await waitFor(() => expect(saveButton).not.toBeDisabled());

    fireEvent.click(screen.getByRole('checkbox', { name: '매핑 여부 12' }));
    expect(screen.getByRole('checkbox', { name: '매핑 여부 12' })).not.toBeChecked();
    expect(saveButton).not.toBeDisabled();
    fireEvent.click(saveButton);
    expect(await screen.findByText('역할을 저장했습니다.')).toBeVisible();
    expect(apiMocks.apiPost).toHaveBeenCalledTimes(1);
    expect(apiMocks.apiDelete).toHaveBeenCalledTimes(1);
    expect(apiMocks.apiDelete).toHaveBeenCalledWith(
      '/api/v1/system/roles/7/users/12',
    );
    expect(assigned).toBe(false);
  }, 20000);

  it('reconciles mapping state on reload after a failed refresh without resending written mappings', async () => {
    let userReads = 0;
    let assigned = false;
    apiMocks.apiGet.mockImplementation((path: string) => {
      if (path === '/api/v1/system/roles') {
        return Promise.resolve({ resultList: [createRole(7, '운영자')] });
      }
      if (path === '/api/v1/system/roles/7/users') {
        userReads += 1;
        if (userReads === 2) {
          return Promise.reject(new Error('매핑 재조회 실패'));
        }
        return Promise.resolve(
          assigned
            ? { assignedUsers: [createMapping(12, '매핑 대상', true)], unassignedUsers: [] }
            : { assignedUsers: [], unassignedUsers: [createMapping(12, '매핑 대상')] },
        );
      }
      return Promise.reject(new Error(`Unexpected GET request: ${path}`));
    });
    apiMocks.apiPost.mockImplementation(() => {
      assigned = true;
      return Promise.resolve();
    });
    renderPage();
    fireEvent.click(
      await screen.findByRole(
        'checkbox',
        { name: '매핑 여부 12' },
        { timeout: 5000 },
      ),
    );
    const saveButton = screen.getByRole('button', { name: '저장' });
    fireEvent.click(saveButton);
    expect(await screen.findByRole('alert')).toHaveTextContent('매핑 재조회 실패');
    await waitFor(() => expect(saveButton).not.toBeDisabled());

    fireEvent.click(screen.getByRole('button', { name: '조회' }));
    fireEvent.click(await screen.findByRole('button', { name: '계속' }));
    await waitFor(() => expect(userReads).toBe(3));
    await waitFor(() =>
      expect(
        screen.getByRole('checkbox', { name: '매핑 여부 12' }),
      ).toBeChecked(),
    );
    await waitFor(() => expect(saveButton).toBeDisabled());
    fireEvent.click(saveButton);
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(apiMocks.apiPost).toHaveBeenCalledTimes(1);
  }, 20000);

  it('updates a created role with its persisted id when its payload changes after a failed refresh', async () => {
    let roleReads = 0;
    const serverRoles = [createRole(7, '운영자')];
    apiMocks.apiGet.mockImplementation((path: string) => {
      if (path === '/api/v1/system/roles') {
        roleReads += 1;
        return roleReads === 2
          ? Promise.reject(new Error('저장 후 역할 조회 실패'))
          : Promise.resolve({ resultList: [...serverRoles] });
      }
      if (/\/api\/v1\/system\/roles\/\d+\/users$/.test(path)) {
        return Promise.resolve({ assignedUsers: [], unassignedUsers: [] });
      }
      return Promise.reject(new Error(`Unexpected GET request: ${path}`));
    });
    apiMocks.apiPost.mockImplementation(
      (path: string, payload: { roleCode: string; roleNm: string }) => {
        if (path === '/api/v1/system/roles') {
          serverRoles.push({
            ...createRole(9, payload.roleNm),
            roleCode: payload.roleCode,
            roleDc: '',
          });
        }
        return Promise.resolve();
      },
    );
    apiMocks.apiPut.mockImplementation(
      (path: string, payload: { roleNm: string }) => {
        const roleId = Number(path.split('/').at(-1));
        const index = serverRoles.findIndex((role) => role.roleId === roleId);
        if (index >= 0) {
          serverRoles[index] = { ...serverRoles[index], roleNm: payload.roleNm };
        }
        return Promise.resolve();
      },
    );
    renderPage();
    const roleGrid = await screen.findByRole(
      'grid',
      { name: 'F1-GRID 권한 관리' },
      { timeout: 5000 },
    );
    await screen.findByRole('gridcell', { name: '운영자' }, { timeout: 5000 });
    fireEvent.contextMenu(screen.getByRole('gridcell', { name: '운영자' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: '행 추가' }));
    const newRow = await waitFor(() => {
      const row = within(roleGrid)
        .getAllByRole('row')
        .find(
          (candidate) =>
            within(candidate).queryAllByRole('gridcell').length > 0 &&
            !within(candidate).queryByRole('gridcell', { name: '운영자' }),
        );
      expect(row).toBeDefined();
      return row!;
    });
    const editCell = async (cellIndex: number, value: string) => {
      fireEvent.doubleClick(within(newRow).getAllByRole('gridcell')[cellIndex]);
      const editor = await waitFor(() => within(newRow).getByRole('textbox'));
      fireEvent.change(editor, { target: { value } });
      fireEvent.keyDown(editor, { key: 'Enter' });
    };
    await editCell(1, 'NEW_ROLE');
    await editCell(2, '신규 역할');
    const saveButton = screen.getByRole('button', { name: '저장' });
    fireEvent.click(saveButton);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      '저장 후 역할 조회 실패',
    );
    await waitFor(() => expect(saveButton).not.toBeDisabled());
    expect(apiMocks.apiPost).toHaveBeenCalledTimes(1);

    fireEvent.doubleClick(screen.getByRole('gridcell', { name: '신규 역할' }));
    const editor = await screen.findByDisplayValue('신규 역할');
    fireEvent.change(editor, { target: { value: '신규 역할 수정' } });
    fireEvent.keyDown(editor, { key: 'Enter' });
    fireEvent.click(saveButton);
    expect(await screen.findByText('역할을 저장했습니다.')).toBeVisible();
    await waitFor(() => expect(saveButton).toBeDisabled());
    expect(apiMocks.apiPost).toHaveBeenCalledTimes(1);
    expect(apiMocks.apiPut).toHaveBeenCalledTimes(1);
    expect(apiMocks.apiPut).toHaveBeenCalledWith('/api/v1/system/roles/9', {
      roleCode: 'NEW_ROLE',
      roleNm: '신규 역할 수정',
      roleDc: '',
      useAt: 'Y',
    });
    expect(
      await screen.findByRole('gridcell', { name: '신규 역할 수정' }),
    ).toBeVisible();
  }, 20000);
  it.each(['roles', 'mapping'] as const)(
    'keeps retry markers when the explicit reload %s GET fails after a failed save refresh',
    async (failingRead) => {
      let roleReads = 0;
      let failReload = false;
      let savedName = '운영자';
      apiMocks.apiGet.mockImplementation((path: string) => {
        if (path === '/api/v1/system/roles') {
          roleReads += 1;
          if (roleReads === 2 || (failReload && failingRead === 'roles')) {
            return Promise.reject(new Error('역할 조회 실패'));
          }
          return Promise.resolve({
            resultList: [
              { ...createRole(7, savedName), roleDc: '운영자 역할' },
              createRole(8, '검토자'),
            ],
          });
        }
        if (/\/api\/v1\/system\/roles\/[78]\/users$/.test(path)) {
          if (failReload && failingRead === 'mapping') {
            return Promise.reject(new Error('매핑 조회 실패'));
          }
          return Promise.resolve({ assignedUsers: [], unassignedUsers: [] });
        }
        return Promise.reject(new Error(`Unexpected GET request: ${path}`));
      });
      apiMocks.apiPut.mockImplementation(
        (_path: string, payload: { roleNm: string }) => {
          savedName = payload.roleNm;
          return Promise.resolve();
        },
      );
      renderPage();
      fireEvent.doubleClick(
        await screen.findByRole(
          'gridcell',
          { name: '운영자' },
          { timeout: 5000 },
        ),
      );
      const editor = await screen.findByDisplayValue('운영자');
      fireEvent.change(editor, { target: { value: '운영자 수정' } });
      fireEvent.keyDown(editor, { key: 'Enter' });
      const saveButton = screen.getByRole('button', { name: '저장' });
      fireEvent.click(saveButton);
      expect(await screen.findByRole('alert')).toHaveTextContent(
        '역할 조회 실패',
      );
      await waitFor(() =>
        expect(screen.getByLabelText('역할 검색')).not.toBeDisabled(),
      );
      expect(apiMocks.apiPut).toHaveBeenCalledTimes(1);

      failReload = true;
      fireEvent.click(screen.getByRole('button', { name: '조회' }));
      fireEvent.click(await screen.findByRole('button', { name: '계속' }));
      expect(
        (
          await screen.findAllByText(
            failingRead === 'roles' ? '역할 조회 실패' : '매핑 조회 실패',
          )
        )[0],
      ).toBeVisible();
      await waitFor(() => expect(saveButton).not.toBeDisabled());

      failReload = false;
      fireEvent.click(saveButton);
      expect(await screen.findByText('역할을 저장했습니다.')).toBeVisible();
      expect(apiMocks.apiPut).toHaveBeenCalledTimes(1);
      await waitFor(() => expect(saveButton).toBeDisabled());
    },
    20000,
  );

  it('locks a created role code after a failed refresh and retries editable fields as an update', async () => {
    let roleReads = 0;
    const serverRoles = [createRole(7, '운영자')];
    apiMocks.apiGet.mockImplementation((path: string) => {
      if (path === '/api/v1/system/roles') {
        roleReads += 1;
        return roleReads === 2
          ? Promise.reject(new Error('저장 후 역할 조회 실패'))
          : Promise.resolve({ resultList: [...serverRoles] });
      }
      if (/\/api\/v1\/system\/roles\/\d+\/users$/.test(path)) {
        return Promise.resolve({ assignedUsers: [], unassignedUsers: [] });
      }
      return Promise.reject(new Error(`Unexpected GET request: ${path}`));
    });
    apiMocks.apiPost.mockImplementation(
      (path: string, payload: { roleCode: string; roleNm: string }) => {
        if (path === '/api/v1/system/roles') {
          serverRoles.push({
            ...createRole(9, payload.roleNm),
            roleCode: payload.roleCode,
            roleDc: '',
          });
        }
        return Promise.resolve();
      },
    );
    apiMocks.apiPut.mockResolvedValue(undefined);
    renderPage();
    const roleGrid = await screen.findByRole(
      'grid',
      { name: 'F1-GRID 권한 관리' },
      { timeout: 5000 },
    );
    fireEvent.contextMenu(
      await screen.findByRole('gridcell', { name: '운영자' }, { timeout: 5000 }),
    );
    fireEvent.click(await screen.findByRole('menuitem', { name: '행 추가' }));
    const newRow = await waitFor(() => {
      const row = within(roleGrid)
        .getAllByRole('row')
        .find(
          (candidate) =>
            within(candidate).queryAllByRole('gridcell').length > 0 &&
            !within(candidate).queryByRole('gridcell', { name: '운영자' }),
        );
      expect(row).toBeDefined();
      return row!;
    });
    const editCell = async (cellIndex: number, value: string) => {
      fireEvent.doubleClick(within(newRow).getAllByRole('gridcell')[cellIndex]);
      const editor = await waitFor(() => within(newRow).getByRole('textbox'));
      fireEvent.change(editor, { target: { value } });
      fireEvent.keyDown(editor, { key: 'Enter' });
    };
    await editCell(1, 'NEW_ROLE');
    await editCell(2, '신규 역할');
    const saveButton = screen.getByRole('button', { name: '저장' });
    fireEvent.click(saveButton);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      '저장 후 역할 조회 실패',
    );
    await waitFor(() => expect(saveButton).not.toBeDisabled());

    fireEvent.doubleClick(screen.getByRole('gridcell', { name: 'NEW_ROLE' }));
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.queryByDisplayValue('NEW_ROLE')).not.toBeInTheDocument();
    expect(screen.getByRole('gridcell', { name: 'NEW_ROLE' })).toBeVisible();

    fireEvent.doubleClick(screen.getByRole('gridcell', { name: '신규 역할' }));
    const editor = await screen.findByDisplayValue('신규 역할');
    fireEvent.change(editor, { target: { value: '신규 역할 수정' } });
    fireEvent.keyDown(editor, { key: 'Enter' });
    fireEvent.click(saveButton);
    expect(await screen.findByText('역할을 저장했습니다.')).toBeVisible();
    expect(apiMocks.apiPost).toHaveBeenCalledTimes(1);
    expect(apiMocks.apiPut).toHaveBeenCalledTimes(1);
    expect(apiMocks.apiPut).toHaveBeenCalledWith('/api/v1/system/roles/9', {
      roleCode: 'NEW_ROLE',
      roleNm: '신규 역할 수정',
      roleDc: '',
      useAt: 'Y',
    });
  }, 20000);
  it.each(['save during reload', 'role switch during reload'] as const)(
    'guards explicit reload after a pending mapping sync: %s',
    async (scenario) => {
      let userReads = 0;
      let assigned = false;
      const reloadMapping = createDeferred<{
        assignedUsers: ReturnType<typeof createMapping>[];
        unassignedUsers: ReturnType<typeof createMapping>[];
      }>();
      apiMocks.apiGet.mockImplementation((path: string) => {
        if (path === '/api/v1/system/roles') {
          return Promise.resolve({
            resultList: [createRole(7, '운영자'), createRole(8, '검토자')],
          });
        }
        if (path === '/api/v1/system/roles/7/users') {
          userReads += 1;
          if (userReads === 2) {
            return Promise.reject(new Error('매핑 재조회 실패'));
          }
          if (userReads === 3) return reloadMapping.promise;
          return Promise.resolve(
            assigned
              ? { assignedUsers: [createMapping(12, '매핑 대상', true)], unassignedUsers: [] }
              : { assignedUsers: [], unassignedUsers: [createMapping(12, '매핑 대상')] },
          );
        }
        if (path === '/api/v1/system/roles/8/users') {
          return Promise.resolve({
            assignedUsers: [createMapping(13, '다른 역할 사용자', true)],
            unassignedUsers: [],
          });
        }
        return Promise.reject(new Error(`Unexpected GET request: ${path}`));
      });
      apiMocks.apiPost.mockImplementation(() => {
        assigned = true;
        return Promise.resolve();
      });
      apiMocks.apiDelete.mockResolvedValue(undefined);
      renderPage();
      fireEvent.click(
        await screen.findByRole(
          'checkbox',
          { name: '매핑 여부 12' },
          { timeout: 5000 },
        ),
      );
      const saveButton = screen.getByRole('button', { name: '저장' });
      fireEvent.click(saveButton);
      expect(await screen.findByRole('alert')).toHaveTextContent(
        '매핑 재조회 실패',
      );
      await waitFor(() => expect(saveButton).not.toBeDisabled());

      fireEvent.click(screen.getByRole('button', { name: '조회' }));
      fireEvent.click(await screen.findByRole('button', { name: '계속' }));
      await waitFor(() => expect(userReads).toBe(3));

      if (scenario === 'save during reload') {
        expect(saveButton).toBeDisabled();
        fireEvent.click(saveButton);
        await new Promise((resolve) => setTimeout(resolve, 100));
        expect(saveButton).toBeDisabled();
        expect(apiMocks.apiPost).toHaveBeenCalledTimes(1);
        expect(apiMocks.apiDelete).not.toHaveBeenCalled();
        reloadMapping.resolve({
          assignedUsers: [createMapping(12, '매핑 대상', true)],
          unassignedUsers: [],
        });
        await waitFor(() =>
          expect(
            screen.getByRole('checkbox', { name: '매핑 여부 12' }),
          ).toBeChecked(),
        );
        await waitFor(() => expect(saveButton).toBeDisabled());
        expect(apiMocks.apiDelete).not.toHaveBeenCalled();
        return;
      }

      fireEvent.click(
        await screen.findByRole('gridcell', { name: '검토자' }),
      );
      expect(
        await screen.findByRole('gridcell', { name: '다른 역할 사용자' }),
      ).toBeVisible();
      reloadMapping.resolve({
        assignedUsers: [createMapping(12, '매핑 대상', true)],
        unassignedUsers: [],
      });
      await waitFor(() => expect(saveButton).not.toBeDisabled());
      const role8Reads = apiMocks.apiGet.mock.calls.filter(
        ([path]) => path === '/api/v1/system/roles/8/users',
      ).length;
      fireEvent.click(saveButton);
      expect(await screen.findByText('역할을 저장했습니다.')).toBeVisible();
      expect(screen.getByText('선택 역할: 검토자')).toBeVisible();
      expect(apiMocks.apiPost).toHaveBeenCalledTimes(1);
      expect(apiMocks.apiDelete).not.toHaveBeenCalled();
      expect(
        apiMocks.apiGet.mock.calls.filter(
          ([path]) => path === '/api/v1/system/roles/8/users',
        ).length,
      ).toBe(role8Reads + 1);
      await waitFor(() => expect(saveButton).toBeDisabled());
    },
    20000,
  );
  it('keeps role A mapping retry records when role B is reloaded, then reconciles A on switch', async () => {
    let roleAReads = 0;
    let assigned = false;
    apiMocks.apiGet.mockImplementation((path: string) => {
      if (path === '/api/v1/system/roles') {
        return Promise.resolve({
          resultList: [createRole(7, '운영자'), createRole(8, '검토자')],
        });
      }
      if (path === '/api/v1/system/roles/7/users') {
        roleAReads += 1;
        if (roleAReads === 2) {
          return Promise.reject(new Error('매핑 재조회 실패'));
        }
        return Promise.resolve(
          assigned
            ? { assignedUsers: [createMapping(12, '매핑 대상', true)], unassignedUsers: [] }
            : { assignedUsers: [], unassignedUsers: [createMapping(12, '매핑 대상')] },
        );
      }
      if (path === '/api/v1/system/roles/8/users') {
        return Promise.resolve({
          assignedUsers: [createMapping(13, '다른 역할 사용자', true)],
          unassignedUsers: [],
        });
      }
      return Promise.reject(new Error(`Unexpected GET request: ${path}`));
    });
    apiMocks.apiPost.mockImplementation(() => {
      assigned = true;
      return Promise.resolve();
    });
    apiMocks.apiDelete.mockResolvedValue(undefined);
    renderPage();
    fireEvent.click(
      await screen.findByRole(
        'checkbox',
        { name: '매핑 여부 12' },
        { timeout: 5000 },
      ),
    );
    const saveButton = screen.getByRole('button', { name: '저장' });
    fireEvent.click(saveButton);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      '매핑 재조회 실패',
    );
    await waitFor(() => expect(saveButton).not.toBeDisabled());

    fireEvent.click(screen.getByRole('gridcell', { name: '검토자' }));
    fireEvent.click(await screen.findByRole('button', { name: '계속' }));
    expect(
      await screen.findByRole('gridcell', { name: '다른 역할 사용자' }),
    ).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '조회' }));
    fireEvent.click(await screen.findByRole('button', { name: '계속' }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '조회' })).not.toBeDisabled(),
    );
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(screen.getByText('선택 역할: 검토자')).toBeVisible();
    expect(roleAReads).toBe(2);
    expect(saveButton).not.toBeDisabled();

    fireEvent.click(screen.getByRole('gridcell', { name: '운영자' }));
    await waitFor(() => expect(roleAReads).toBe(3));
    await waitFor(() =>
      expect(
        screen.getByRole('checkbox', { name: '매핑 여부 12' }),
      ).toBeChecked(),
    );
    await waitFor(() => expect(saveButton).toBeDisabled());
    expect(apiMocks.apiPost).toHaveBeenCalledTimes(1);
    expect(apiMocks.apiDelete).not.toHaveBeenCalled();
  }, 20000);

  it('locks and handles a failed clean role reload without an unhandled rejection', async () => {
    const unhandled = vi.fn();
    process.on('unhandledRejection', unhandled);
    try {
      let roleReads = 0;
      const reload = createDeferred<{ resultList: ReturnType<typeof createRole>[] }>();
      apiMocks.apiGet.mockImplementation((path: string) => {
        if (path === '/api/v1/system/roles') {
          roleReads += 1;
          return roleReads === 1
            ? Promise.resolve({ resultList: [createRole(7, '운영자')] })
            : reload.promise;
        }
        if (path === '/api/v1/system/roles/7/users') {
          return Promise.resolve({ assignedUsers: [], unassignedUsers: [] });
        }
        return Promise.reject(new Error(`Unexpected GET request: ${path}`));
      });
      renderPage();
      await screen.findByRole('gridcell', { name: '운영자' }, { timeout: 5000 });
      const queryButton = screen.getByRole('button', { name: '조회' });
      fireEvent.click(queryButton);
      await waitFor(() => expect(roleReads).toBe(2));
      expect(queryButton).toBeDisabled();
      expect(screen.getByRole('button', { name: '저장' })).toBeDisabled();
      fireEvent.click(queryButton);
      expect(roleReads).toBe(2);
      reload.reject(new Error('조회 재시도 실패'));
      expect(await screen.findByRole('alert')).toHaveTextContent(
        '조회 재시도 실패',
      );
      await waitFor(() => expect(queryButton).not.toBeDisabled());
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(unhandled).not.toHaveBeenCalled();
    } finally {
      process.off('unhandledRejection', unhandled);
    }
  }, 20000);
  it('keeps created-role retry records until the post-save mapping refresh also succeeds', async () => {
    let failNextUserRead = false;
    let assigned = false;
    const serverRoles = [createRole(7, '운영자')];
    apiMocks.apiGet.mockImplementation((path: string) => {
      if (path === '/api/v1/system/roles') {
        return Promise.resolve({ resultList: [...serverRoles] });
      }
      if (path === '/api/v1/system/roles/7/users') {
        if (failNextUserRead) {
          failNextUserRead = false;
          return Promise.reject(new Error('매핑 재조회 실패'));
        }
        return Promise.resolve(
          assigned
            ? { assignedUsers: [createMapping(12, '매핑 대상', true)], unassignedUsers: [] }
            : { assignedUsers: [], unassignedUsers: [createMapping(12, '매핑 대상')] },
        );
      }
      if (/\/api\/v1\/system\/roles\/\d+\/users$/.test(path)) {
        return Promise.resolve({ assignedUsers: [], unassignedUsers: [] });
      }
      return Promise.reject(new Error(`Unexpected GET request: ${path}`));
    });
    apiMocks.apiPost.mockImplementation(
      (path: string, payload: { roleCode: string; roleNm: string }) => {
        if (path === '/api/v1/system/roles') {
          serverRoles.push({
            ...createRole(9, payload.roleNm),
            roleCode: payload.roleCode,
            roleDc: '',
          });
        } else {
          assigned = true;
          failNextUserRead = true;
        }
        return Promise.resolve();
      },
    );
    apiMocks.apiPut.mockResolvedValue(undefined);
    renderPage();
    await screen.findByRole(
      'checkbox',
      { name: '매핑 여부 12' },
      { timeout: 5000 },
    );
    const roleGrid = screen.getByRole('grid', { name: 'F1-GRID 권한 관리' });
    fireEvent.contextMenu(screen.getByRole('gridcell', { name: '운영자' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: '행 추가' }));
    const newRow = await waitFor(() => {
      const row = within(roleGrid)
        .getAllByRole('row')
        .find(
          (candidate) =>
            within(candidate).queryAllByRole('gridcell').length > 0 &&
            !within(candidate).queryByRole('gridcell', { name: '운영자' }),
        );
      expect(row).toBeDefined();
      return row!;
    });
    const editCell = async (cellIndex: number, value: string) => {
      fireEvent.doubleClick(within(newRow).getAllByRole('gridcell')[cellIndex]);
      const editor = await waitFor(() => within(newRow).getByRole('textbox'));
      fireEvent.change(editor, { target: { value } });
      fireEvent.keyDown(editor, { key: 'Enter' });
    };
    await editCell(1, 'NEW_ROLE');
    await editCell(2, '신규 역할');
    fireEvent.click(screen.getByRole('gridcell', { name: '운영자' }));
    fireEvent.click(await screen.findByRole('checkbox', { name: '매핑 여부 12' }));
    expect(screen.getByText('선택 역할: 운영자')).toBeVisible();
    const saveButton = screen.getByRole('button', { name: '저장' });
    fireEvent.click(saveButton);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      '매핑 재조회 실패',
    );
    await waitFor(() => expect(saveButton).not.toBeDisabled());
    expect(
      apiMocks.apiPost.mock.calls.filter(
        ([path]) => path === '/api/v1/system/roles',
      ),
    ).toHaveLength(1);

    fireEvent.doubleClick(screen.getByRole('gridcell', { name: 'NEW_ROLE' }));
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.queryByDisplayValue('NEW_ROLE')).not.toBeInTheDocument();
    fireEvent.doubleClick(screen.getByRole('gridcell', { name: '신규 역할' }));
    const editor = await screen.findByDisplayValue('신규 역할');
    fireEvent.change(editor, { target: { value: '신규 역할 수정' } });
    fireEvent.keyDown(editor, { key: 'Enter' });
    fireEvent.click(saveButton);
    expect(await screen.findByText('역할을 저장했습니다.')).toBeVisible();
    expect(apiMocks.apiPost).toHaveBeenCalledTimes(2);
    expect(apiMocks.apiPut).toHaveBeenCalledTimes(1);
    expect(apiMocks.apiPut).toHaveBeenCalledWith('/api/v1/system/roles/9', {
      roleCode: 'NEW_ROLE',
      roleNm: '신규 역할 수정',
      roleDc: '',
      useAt: 'Y',
    });
    await waitFor(() => expect(saveButton).toBeDisabled());
  }, 20000);
  it('keeps role-only retry records until the selected mapping refresh also succeeds', async () => {
    let savedName = '운영자';
    let failNextUserRead = false;
    let postSaveUserReads = 0;
    apiMocks.apiGet.mockImplementation((path: string) => {
      if (path === '/api/v1/system/roles') {
        return Promise.resolve({
          resultList: [
            { ...createRole(7, savedName), roleDc: '운영자 역할' },
            createRole(8, '검토자'),
          ],
        });
      }
      if (path === '/api/v1/system/roles/7/users') {
        if (apiMocks.apiPut.mock.calls.length > 0) postSaveUserReads += 1;
        if (failNextUserRead) {
          failNextUserRead = false;
          return Promise.reject(new Error('역할 저장 후 매핑 재조회 실패'));
        }
        return Promise.resolve({
          assignedUsers: [],
          unassignedUsers: [createMapping(12, '매핑 대상')],
        });
      }
      if (path === '/api/v1/system/roles/8/users') {
        return Promise.resolve({ assignedUsers: [], unassignedUsers: [] });
      }
      return Promise.reject(new Error(`Unexpected GET request: ${path}`));
    });
    apiMocks.apiPut.mockImplementation((_path: string, payload: { roleNm: string }) => {
      savedName = payload.roleNm;
      failNextUserRead = true;
      return Promise.resolve();
    });
    renderPage();
    fireEvent.doubleClick(
      await screen.findByRole('gridcell', { name: '운영자' }, { timeout: 5000 }),
    );
    const editor = await screen.findByDisplayValue('운영자');
    fireEvent.change(editor, { target: { value: '운영자 수정' } });
    fireEvent.keyDown(editor, { key: 'Enter' });
    const saveButton = screen.getByRole('button', { name: '저장' });
    fireEvent.click(saveButton);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      '역할 저장 후 매핑 재조회 실패',
    );
    await waitFor(() => expect(saveButton).not.toBeDisabled());
    expect(postSaveUserReads).toBe(1);
    expect(apiMocks.apiPut).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('역할을 저장했습니다.')).not.toBeInTheDocument();
    expect(screen.getByRole('gridcell', { name: '운영자 수정' })).toBeVisible();
    expect(
      await screen.findByRole('checkbox', { name: '매핑 여부 12' }),
    ).toBeInTheDocument();

    fireEvent.click(saveButton);
    expect(await screen.findByText('역할을 저장했습니다.')).toBeVisible();
    expect(apiMocks.apiPut).toHaveBeenCalledTimes(1);
    expect(postSaveUserReads).toBe(2);
    await waitFor(() => expect(saveButton).toBeDisabled());
  }, 20000);

  it('keeps mapping retry records for a target whose delayed refresh became stale', async () => {
    let assigned = false;
    let roleSevenReads = 0;
    const delayedRead = createDeferred<unknown>();
    const mappingResult = () =>
      assigned
        ? { assignedUsers: [createMapping(12, '매핑 대상', true)], unassignedUsers: [] }
        : { assignedUsers: [], unassignedUsers: [createMapping(12, '매핑 대상')] };
    apiMocks.apiGet.mockImplementation((path: string) => {
      if (path === '/api/v1/system/roles') {
        return Promise.resolve({
          resultList: [createRole(7, '운영자'), createRole(8, '검토자')],
        });
      }
      if (path === '/api/v1/system/roles/7/users') {
        roleSevenReads += 1;
        if (roleSevenReads === 2) {
          return Promise.reject(new Error('매핑 재조회 실패'));
        }
        if (roleSevenReads === 3) return delayedRead.promise;
        return Promise.resolve(mappingResult());
      }
      if (path === '/api/v1/system/roles/8/users') {
        return Promise.resolve({ assignedUsers: [], unassignedUsers: [] });
      }
      return Promise.reject(new Error(`Unexpected GET request: ${path}`));
    });
    apiMocks.apiPost.mockImplementation(() => {
      assigned = true;
      return Promise.resolve();
    });
    renderPage();
    fireEvent.click(
      await screen.findByRole('checkbox', { name: '매핑 여부 12' }, { timeout: 5000 }),
    );
    const saveButton = screen.getByRole('button', { name: '저장' });
    fireEvent.click(saveButton);
    expect(await screen.findByRole('alert')).toHaveTextContent('매핑 재조회 실패');
    await waitFor(() => expect(saveButton).not.toBeDisabled());
    expect(apiMocks.apiPost).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('gridcell', { name: '검토자' }));
    const discard = screen.queryByRole('button', { name: '계속' });
    if (discard) fireEvent.click(discard);
    expect(await screen.findByText('선택 역할: 검토자')).toBeVisible();

    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole('gridcell', { name: '운영자' }));
    await waitFor(() => expect(roleSevenReads).toBe(3));
    fireEvent.click(screen.getByRole('gridcell', { name: '검토자' }));
    expect(await screen.findByText('선택 역할: 검토자')).toBeVisible();
    await act(async () => {
      delayedRead.resolve(mappingResult());
      await delayedRead.promise;
    });
    expect(screen.getByText('선택 역할: 검토자')).toBeVisible();
    expect(saveButton).not.toBeDisabled();

    fireEvent.click(saveButton);
    expect(await screen.findByText('역할을 저장했습니다.')).toBeVisible();
    expect(roleSevenReads).toBe(4);
    expect(apiMocks.apiPost).toHaveBeenCalledTimes(1);
    expect(apiMocks.apiDelete).not.toHaveBeenCalled();
    await waitFor(() => expect(saveButton).toBeDisabled());
  }, 20000);
  it('fails without success and keeps role retry records when the save-time role refresh is superseded', async () => {
    const toRow = (name: string): RoleManagementRow => ({
      id: '7',
      group: 'ROLE_7',
      name,
      description: '운영자 역할',
      menuCount: 0,
      active: true,
      permissions: { read: true, create: true, update: true, delete: true },
    });
    let serverName = '운영자';
    const refreshStatuses: Array<'applied' | 'stale'> = ['stale', 'applied'];
    const onSaveSuccess = vi.fn();
    const onDirtyChange = vi.fn();
    apiMocks.apiGet.mockImplementation((path: string) =>
      path === '/api/v1/system/roles/7/users'
        ? Promise.resolve({ assignedUsers: [], unassignedUsers: [] })
        : Promise.reject(new Error(`Unexpected GET request: ${path}`)),
    );
    apiMocks.apiPut.mockImplementation((_path: string, payload: { roleNm: string }) => {
      serverName = payload.roleNm;
      return Promise.resolve();
    });
    function Harness() {
      const panelRef = useRef<RoleManagementPanelHandle>(null);
      const [roles, setRoles] = useState([toRow('운영자')]);
      const [roleGridKey, setRoleGridKey] = useState(0);
      const [error, setError] = useState('');
      return (
        <>
          <button
            type="button"
            onClick={() => {
              setError('');
              void panelRef.current
                ?.saveCurrentChanges()
                .catch((saveError: Error) => setError(saveError.message));
            }}
          >
            패널 저장
          </button>
          <div role="alert">{error}</div>
          <RoleManagementPanel
            ref={panelRef}
            roles={roles}
            roleGridKey={roleGridKey}
            onUpdateRole={(roleId, payload) =>
              apiMocks.apiPut(`/api/v1/system/roles/${roleId}`, payload)
            }
            onRolesSaved={async () => {
              // A superseded refresh resolves without applying the new list.
              const status = refreshStatuses.shift() ?? 'applied';
              if (status === 'applied') {
                setRoles([toRow(serverName)]);
                setRoleGridKey((current) => current + 1);
              }
              return status;
            }}
            onSaveSuccess={onSaveSuccess}
            onDirtyChange={onDirtyChange}
          />
        </>
      );
    }
    render(<Harness />);
    fireEvent.doubleClick(
      await screen.findByRole('gridcell', { name: '운영자' }, { timeout: 5000 }),
    );
    const editor = await screen.findByDisplayValue('운영자');
    fireEvent.change(editor, { target: { value: '운영자 수정' } });
    fireEvent.keyDown(editor, { key: 'Enter' });
    fireEvent.click(screen.getByRole('button', { name: '패널 저장' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/역할 목록/);
    expect(apiMocks.apiPut).toHaveBeenCalledTimes(1);
    expect(onSaveSuccess).not.toHaveBeenCalled();
    expect(onDirtyChange).toHaveBeenLastCalledWith(true);
    expect(screen.getByRole('gridcell', { name: '운영자 수정' })).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: '패널 저장' }));
    await waitFor(() =>
      expect(onSaveSuccess).toHaveBeenCalledWith('역할을 저장했습니다.'),
    );
    expect(apiMocks.apiPut).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('alert')).toHaveTextContent('');
    await waitFor(() => expect(onDirtyChange).toHaveBeenLastCalledWith(false));
  }, 20000);

  it('keeps a pending role mapping record until its fetched rows confirm the written assignment', async () => {
    let roleSevenAssignedOnServer = false;
    let roleSevenReadsConfirmWrite = false;
    let failRoleSevenRead = false;
    let savedReviewerName = '검토자';
    apiMocks.apiGet.mockImplementation((path: string) => {
      if (path === '/api/v1/system/roles') {
        return Promise.resolve({
          resultList: [
            createRole(7, '운영자'),
            { ...createRole(8, savedReviewerName), roleDc: '검토자 역할' },
          ],
        });
      }
      if (path === '/api/v1/system/roles/7/users') {
        if (failRoleSevenRead) {
          failRoleSevenRead = false;
          return Promise.reject(new Error('매핑 재조회 실패'));
        }
        // Reads can lag behind a successful write until the server confirms it.
        const assigned = roleSevenAssignedOnServer && roleSevenReadsConfirmWrite;
        return Promise.resolve(
          assigned
            ? { assignedUsers: [createMapping(12, '매핑 대상', true)], unassignedUsers: [] }
            : { assignedUsers: [], unassignedUsers: [createMapping(12, '매핑 대상')] },
        );
      }
      if (path === '/api/v1/system/roles/8/users') {
        return Promise.resolve({ assignedUsers: [], unassignedUsers: [] });
      }
      return Promise.reject(new Error(`Unexpected GET request: ${path}`));
    });
    apiMocks.apiPost.mockImplementation(() => {
      roleSevenAssignedOnServer = true;
      failRoleSevenRead = true;
      return Promise.resolve();
    });
    apiMocks.apiPut.mockImplementation((_path: string, payload: { roleNm: string }) => {
      savedReviewerName = payload.roleNm;
      return Promise.resolve();
    });
    renderPage();
    fireEvent.click(
      await screen.findByRole('checkbox', { name: '매핑 여부 12' }, { timeout: 5000 }),
    );
    const saveButton = screen.getByRole('button', { name: '저장' });
    fireEvent.click(saveButton);
    expect(await screen.findByRole('alert')).toHaveTextContent('매핑 재조회 실패');
    await waitFor(() => expect(saveButton).not.toBeDisabled());

    fireEvent.click(screen.getByRole('gridcell', { name: '검토자' }));
    const discard = screen.queryByRole('button', { name: '계속' });
    if (discard) fireEvent.click(discard);
    expect(await screen.findByText('선택 역할: 검토자')).toBeVisible();
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    fireEvent.doubleClick(screen.getByRole('gridcell', { name: '검토자' }));
    const editor = await screen.findByDisplayValue('검토자');
    fireEvent.change(editor, { target: { value: '검토자 수정' } });
    fireEvent.keyDown(editor, { key: 'Enter' });

    fireEvent.click(saveButton);
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/사용자 매핑/),
    );
    expect(screen.queryByText('역할을 저장했습니다.')).not.toBeInTheDocument();
    await waitFor(() => expect(saveButton).not.toBeDisabled());
    expect(screen.queryByText('역할을 저장했습니다.')).not.toBeInTheDocument();
    expect(apiMocks.apiPut).toHaveBeenCalledTimes(1);

    roleSevenReadsConfirmWrite = true;
    fireEvent.click(saveButton);
    expect(await screen.findByText('역할을 저장했습니다.')).toBeVisible();
    expect(apiMocks.apiPost).toHaveBeenCalledTimes(1);
    expect(apiMocks.apiPut).toHaveBeenCalledTimes(1);
    expect(apiMocks.apiDelete).not.toHaveBeenCalled();
    await waitFor(() => expect(saveButton).toBeDisabled());
  }, 20000);
  it('retains mapping rows and dirty changes when a delayed quiet user refresh fails', async () => {
    const userRefresh = createDeferred<unknown>();
    let userReads = 0;
    apiMocks.apiGet.mockImplementation((path: string) => {
      if (path === '/api/v1/system/roles') {
        return Promise.resolve({ resultList: [createRole(7, '운영자')] });
      }
      if (path === '/api/v1/system/roles/7/users') {
        userReads += 1;
        return userReads === 2
          ? userRefresh.promise
          : Promise.resolve({
              assignedUsers: userReads > 2
                ? [createMapping(12, '저장 대상', true)]
                : [],
              unassignedUsers: userReads > 2
                ? [createMapping(13, '미할당 사용자')]
                : [
                    createMapping(12, '저장 대상'),
                    createMapping(13, '미할당 사용자'),
                  ],
            });
      }
      return Promise.reject(new Error(`Unexpected GET request: ${path}`));
    });
    apiMocks.apiPost.mockResolvedValue(undefined);
    renderPage();
    fireEvent.click(
      await screen.findByRole(
        'checkbox',
        { name: '매핑 여부 12' },
        { timeout: 5000 },
      ),
    );
    const saveButton = screen.getByRole('button', { name: '저장' });
    fireEvent.click(saveButton);
    await waitFor(() => expect(userReads).toBe(2));
    expect(screen.getByLabelText('역할 검색')).toBeDisabled();
    expect(screen.getByRole('gridcell', { name: '저장 대상' })).toBeVisible();
    expect(screen.getByRole('gridcell', { name: '미할당 사용자' })).toBeVisible();
    expect(screen.queryAllByTestId('grid-loading-row-skeleton')).toHaveLength(0);
    userRefresh.reject(new Error('조용한 매핑 조회 실패'));
    await waitFor(() =>
      expect(screen.getByLabelText('역할 검색')).not.toBeDisabled(),
    );
    expect(screen.getByRole('gridcell', { name: '저장 대상' })).toBeVisible();
    expect(screen.getByRole('gridcell', { name: '미할당 사용자' })).toBeVisible();
    expect(screen.getByRole('alert')).toHaveTextContent('조용한 매핑 조회 실패');
    expect(screen.getByRole('checkbox', { name: '매핑 여부 12' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: '매핑 여부 12' })).not.toBeDisabled();
    expect(screen.queryByText('역할을 저장했습니다.')).not.toBeInTheDocument();
    expect(saveButton).not.toBeDisabled();
    expect(screen.getByRole('button', { name: '조회' })).not.toBeDisabled();
    expect(apiMocks.apiPost).toHaveBeenCalledTimes(1);
    // Retry the failed refresh without duplicating the completed mapping write.
    fireEvent.click(saveButton);
    expect(await screen.findByText('역할을 저장했습니다.')).toBeVisible();
    expect(userReads).toBe(3);
    expect(apiMocks.apiPost).toHaveBeenCalledTimes(1);
    expect(saveButton).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: '매핑 여부 12' })).toBeChecked();
  }, 20000);

  it.each(['save', 'role refresh', 'user refresh'])(
    'releases the quiet save lock after a failed %s and preserves the error policy',
    async (failure) => {
      const pending = createDeferred<unknown>();
      let roleReads = 0;
      let userReads = 0;
      apiMocks.apiGet.mockImplementation((path: string) => {
        if (path === '/api/v1/system/roles') {
          roleReads += 1;
          return failure === 'role refresh' && roleReads > 1
            ? pending.promise
            : Promise.resolve({ resultList: [createRole(7, '운영자')] });
        }
        if (path === '/api/v1/system/roles/7/users') {
          userReads += 1;
          return failure === 'user refresh' && userReads > 1
            ? pending.promise
            : Promise.resolve({
                assignedUsers: [],
                unassignedUsers: [createMapping(12, '매핑 대상')],
              });
        }
        return Promise.reject(new Error(`Unexpected GET request: ${path}`));
      });
      apiMocks.apiPost.mockImplementation(() =>
        failure === 'save' ? pending.promise : Promise.resolve(),
      );
      renderPage();
      fireEvent.click(
        await screen.findByRole('checkbox', { name: '매핑 여부 12' }),
      );
      fireEvent.click(screen.getByRole('button', { name: '저장' }));
      await waitFor(() => {
        expect(apiMocks.apiPost).toHaveBeenCalledTimes(1);
        if (failure === 'role refresh') expect(roleReads).toBe(2);
        if (failure === 'user refresh') expect(userReads).toBe(2);
      });
      expect(screen.getByLabelText('역할 검색')).toBeDisabled();
      expect(screen.getByRole('gridcell', { name: '운영자' })).toBeVisible();
      expect(screen.queryAllByTestId('grid-loading-skeleton')).toHaveLength(0);
      pending.reject(new Error(`${failure} 실패`));
      expect((await screen.findAllByText(`${failure} 실패`))[0]).toBeVisible();
      await waitFor(() =>
        expect(screen.getByLabelText('역할 검색')).not.toBeDisabled(),
      );
      expect(screen.getByRole('button', { name: '조회' })).not.toBeDisabled();
      if (failure === 'save') {
        expect(
          screen.getByRole('checkbox', { name: '매핑 여부 12' }),
        ).toBeChecked();
        expect(screen.getByRole('button', { name: '저장' })).not.toBeDisabled();
        fireEvent.click(
          screen.getByRole('checkbox', { name: '매핑 여부 12' }),
        );
        expect(
          screen.getByRole('checkbox', { name: '매핑 여부 12' }),
        ).not.toBeChecked();
      }
    },
  );

  it('fills the shared grid container when the loading skeleton is active', () => {
    const columns: F1GridColumn<{ id: number; roleNm: string }>[] = [
      { field: 'id', headerName: 'ID', width: 80 },
      { field: 'roleNm', headerName: '역할명', width: 220 },
    ];

    render(
      <div style={{ width: 600, height: 320 }}>
        <F1Grid
          rows={[{ id: 1, roleNm: '운영자' }]}
          columns={columns}
          rowKey="id"
          ariaLabel="F1-GRID 로딩 크기 검증"
          height={320}
          loading
        />
      </div>,
    );

    expect(screen.getByTestId('grid-loading-skeleton')).not.toHaveStyle({
      height: '100%',
    });
    expect(screen.getByTestId('grid-loading-skeleton')).not.toHaveStyle({
      overflow: 'hidden',
    });

    const rowSkeleton = screen.getAllByTestId('grid-loading-row-skeleton')[0];
    expect(rowSkeleton).toHaveStyle({
      gap: '0px',
      minHeight: '32px',
    });
    expect(screen.getAllByTestId('grid-loading-row-skeleton')).toHaveLength(5);
  });

  it('shows a page error when loading roles fails', async () => {
    apiMocks.apiGet.mockRejectedValueOnce(new Error('역할 목록 조회 실패'));

    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.',
    );
    expect(screen.getByRole('button', { name: '역할 목록 다시 불러오기' })).toBeEnabled();
    expect(screen.queryByRole('grid')).not.toBeInTheDocument();
  });

  it('keeps the grid header visible while only the body rows skeletonize during the real first fetch', async () => {
    let resolveRoles:
      | ((value: { resultList: ReturnType<typeof createRole>[] }) => void)
      | undefined;
    apiMocks.apiGet.mockImplementation((path: string) => {
      if (path === '/api/v1/system/roles') {
        return new Promise((resolve) => {
          resolveRoles = resolve;
        });
      }
      if (path === '/api/v1/system/roles/7/users') {
        return Promise.resolve({ assignedUsers: [], unassignedUsers: [] });
      }
      return Promise.reject(new Error(`Unexpected GET request: ${path}`));
    });

    renderPage();

    await waitFor(() => {
      expect(
        screen.getAllByTestId('grid-loading-row-skeleton').length,
      ).toBeGreaterThan(0);
    });
    expect(screen.getByText('역할 코드')).toBeVisible();
    expect(screen.getByText('역할명')).toBeVisible();

    resolveRoles?.({ resultList: [createRole(7, '운영자')] });

    await waitFor(() => {
      expect(screen.queryAllByTestId('grid-loading-skeleton')).toHaveLength(0);
    });
  });

  it('shows a page search area and F1Grid role layout', async () => {
    apiMocks.apiGet.mockResolvedValue({ resultList: [] });

    renderPage();

    expect(await screen.findByText('검색 조건')).toBeVisible();
    expect(screen.getByLabelText('역할 검색')).toBeVisible();
    expect(screen.getByLabelText('F1-GRID 권한 관리')).toBeVisible();
  });

  it('uses grid-based creation flow without a separate registration button', async () => {
    apiMocks.apiGet.mockResolvedValue({ resultList: [] });

    renderPage();

    expect(
      screen.queryByRole('button', { name: '권한 등록' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '저장' })).toBeVisible();
  });

  it('hides the manual read control and exposes row export from the common grid menu when excel is allowed', async () => {
    apiMocks.apiGet.mockResolvedValue({
      resultList: [
        {
          roleId: 7,
          roleCode: 'OPERATOR',
          roleNm: '운영자',
          roleDc: '운영 역할',
          useAt: 'Y',
          userCount: 3,
        },
      ],
    });

    renderPage({
      selectedMenuPermissions: {
        read: false,
        create: false,
        update: false,
        delete: false,
        excel: true,
      },
    });

    expect(
      screen.queryByRole('button', { name: '조회' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText('선택 행 삭제')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('현재 행 내보내기')).not.toBeInTheDocument();

    const roleGrid = await screen.findByRole('grid', {
      name: 'F1-GRID 권한 관리',
    });
    fireEvent.contextMenu(roleGrid);

    expect(
      await screen.findByRole('menuitem', { name: '엑셀 내보내기' }),
    ).toBeVisible();
  });

  it('shows the actual user count from the role payload', async () => {
    apiMocks.apiGet.mockResolvedValue({
      resultList: [
        {
          roleId: 7,
          roleCode: 'OPERATOR',
          roleNm: '운영자',
          roleDc: '운영 역할',
          useAt: 'Y',
          userCount: 12,
        },
      ],
    });

    renderPage();

    expect(await screen.findByRole('gridcell', { name: '12' })).toBeVisible();
  });

  it('updates a persisted role and resets the role grid baseline after refresh', async () => {
    let roleListCallCount = 0;
    apiMocks.apiGet.mockImplementation((path: string) => {
      if (path === '/api/v1/system/roles') {
        roleListCallCount += 1;
        return Promise.resolve({
          resultList: [
            {
              roleId: 7,
              roleCode: 'OPERATOR',
              roleNm: roleListCallCount === 1 ? '운영자' : '운영 담당자',
              roleDc: '운영 역할',
              useAt: 'Y',
            },
          ],
        });
      }
      if (path === '/api/v1/system/roles/7/users') {
        return Promise.resolve({ assignedUsers: [], unassignedUsers: [] });
      }
      return Promise.reject(new Error(`Unexpected GET request: ${path}`));
    });
    apiMocks.apiPut.mockResolvedValue(undefined);

    renderPage();

    const saveButton = await screen.findByRole('button', { name: '저장' });
    const nameCell = await screen.findByRole('gridcell', { name: '운영자' });
    fireEvent.doubleClick(nameCell);
    const editor = await screen.findByDisplayValue('운영자');
    fireEvent.change(editor, { target: { value: '운영 담당자' } });
    fireEvent.keyDown(editor, { key: 'Enter', code: 'Enter' });

    await waitFor(() => expect(saveButton).not.toBeDisabled());
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(apiMocks.apiPut).toHaveBeenCalledWith('/api/v1/system/roles/7', {
        roleCode: 'OPERATOR',
        roleNm: '운영 담당자',
        roleDc: '운영 역할',
        useAt: 'Y',
      });
    });
    await waitFor(() => expect(saveButton).toBeDisabled());
    expect(
      await screen.findByRole('gridcell', { name: '운영 담당자' }),
    ).toBeVisible();
  });

  it('does not show row add, copy, or delete entries in the user mapping grid context menu', async () => {
    apiMocks.apiGet.mockImplementation((path: string) => {
      if (path === '/api/v1/system/roles') {
        return Promise.resolve({ resultList: [createRole(7, '운영자')] });
      }
      if (path === '/api/v1/system/roles/7/users') {
        return Promise.resolve({
          assignedUsers: [],
          unassignedUsers: [
            { loginId: 12, userNm: '미할당 사용자', departmentNm: '운영팀' },
          ],
        });
      }
      return Promise.reject(new Error(`Unexpected GET request: ${path}`));
    });

    renderPage();

    const userGrid = await screen.findByRole('grid', {
      name: 'F1-GRID 사용자 매핑',
    });
    fireEvent.contextMenu(userGrid);

    await waitFor(() => {
      expect(
        screen.queryByRole('menuitem', { name: '행 추가' }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('menuitem', { name: '행 복사' }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('menuitem', { name: '행 삭제' }),
      ).not.toBeInTheDocument();
    });
  });

  it('hides row action entries from the shared F1Grid context menu when configured', async () => {
    type GridRow = { id: number; name: string };
    const columns: F1GridColumn<GridRow>[] = [
      { field: 'name', headerName: '이름', flex: 1 },
    ];

    render(
      <F1Grid
        rows={[{ id: 1, name: '테스트 사용자' }]}
        columns={columns}
        rowKey="id"
        ariaLabel="F1-GRID 설정 테스트"
        allowAddRowInContextMenu={false}
        allowDuplicateRowInContextMenu={false}
        allowDeleteRowInContextMenu={false}
      />,
    );

    fireEvent.contextMenu(
      await screen.findByRole('gridcell', { name: '테스트 사용자' }),
    );

    await waitFor(() => {
      expect(
        screen.queryByRole('menuitem', { name: '행 추가' }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('menuitem', { name: '행 복사' }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('menuitem', { name: '행 삭제' }),
      ).not.toBeInTheDocument();
    });
  });

  it('refreshes the role list when the read action is clicked', async () => {
    let roleListCalls = 0;
    apiMocks.apiGet.mockImplementation((path: string) => {
      if (path === '/api/v1/system/roles') {
        roleListCalls += 1;
        return Promise.resolve({
          resultList:
            roleListCalls === 1
              ? [createRole(7, '운영자')]
              : [createRole(7, '운영 담당자')],
        });
      }
      if (path === '/api/v1/system/roles/7/users') {
        return Promise.resolve({ assignedUsers: [], unassignedUsers: [] });
      }
      return Promise.reject(new Error(`Unexpected GET request: ${path}`));
    });

    renderPage();

    expect(
      await screen.findByRole('gridcell', { name: '운영자' }),
    ).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '조회' }));

    await waitFor(() => {
      expect(
        apiMocks.apiGet.mock.calls.filter(
          ([path]) => path === '/api/v1/system/roles',
        ),
      ).toHaveLength(2);
      expect(
        screen.getByRole('gridcell', { name: '운영 담당자' }),
      ).toBeVisible();
    });
  });

  it('guards a dirty role grid refresh with the shared confirmation dialog', async () => {
    let roleListCalls = 0;
    apiMocks.apiGet.mockImplementation((path: string) => {
      if (path === '/api/v1/system/roles') {
        roleListCalls += 1;
        return Promise.resolve({
          resultList: [
            createRole(7, roleListCalls === 1 ? '운영자' : '운영 담당자'),
          ],
        });
      }
      if (path === '/api/v1/system/roles/7/users') {
        return Promise.resolve({ assignedUsers: [], unassignedUsers: [] });
      }
      return Promise.reject(new Error(`Unexpected GET request: ${path}`));
    });

    renderPage();

    const nameCell = await screen.findByRole('gridcell', { name: '운영자' });
    fireEvent.doubleClick(nameCell);
    fireEvent.change(await screen.findByDisplayValue('운영자'), {
      target: { value: '운영자 편집' },
    });
    fireEvent.keyDown(screen.getByDisplayValue('운영자 편집'), {
      key: 'Enter',
      code: 'Enter',
    });

    fireEvent.click(screen.getByRole('button', { name: '조회' }));
    expect(
      await screen.findByRole('dialog', { name: '저장하지 않은 변경사항' }),
    ).toHaveTextContent('변경사항을 버리고 권한 목록을 다시 불러오시겠습니까?');
    fireEvent.click(screen.getByRole('button', { name: '취소' }));
    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: '저장하지 않은 변경사항' }),
      ).not.toBeInTheDocument(),
    );
    expect(roleListCalls).toBe(1);
    expect(screen.getByRole('gridcell', { name: '운영자 편집' })).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: '조회' }));
    fireEvent.click(await screen.findByRole('button', { name: '계속' }));
    await waitFor(() => expect(roleListCalls).toBe(2));
    expect(
      await screen.findByRole('gridcell', { name: '운영 담당자' }),
    ).toBeVisible();
  });

  it('clears the dirty state after confirming a refresh so the save button is re-disabled', async () => {
    let roleListCalls = 0;
    apiMocks.apiGet.mockImplementation((path: string) => {
      if (path === '/api/v1/system/roles') {
        roleListCalls += 1;
        return Promise.resolve({
          resultList: [
            createRole(7, roleListCalls === 1 ? '운영자' : '운영 담당자'),
          ],
        });
      }
      if (path === '/api/v1/system/roles/7/users') {
        return Promise.resolve({ assignedUsers: [], unassignedUsers: [] });
      }
      return Promise.reject(new Error(`Unexpected GET request: ${path}`));
    });

    renderPage();

    const nameCell = await screen.findByRole('gridcell', { name: '운영자' });
    fireEvent.doubleClick(nameCell);
    fireEvent.change(await screen.findByDisplayValue('운영자'), {
      target: { value: '운영자 편집' },
    });
    fireEvent.keyDown(screen.getByDisplayValue('운영자 편집'), {
      key: 'Enter',
      code: 'Enter',
    });

    fireEvent.click(screen.getByRole('button', { name: '조회' }));
    fireEvent.click(await screen.findByRole('button', { name: '계속' }));

    await waitFor(() => expect(roleListCalls).toBe(2));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: '저장' })).toBeDisabled();
    });
  });

  it('updates the role user count after a mapping save without showing a skeleton', async () => {
    let roleListCalls = 0;
    apiMocks.apiGet.mockImplementation((path: string) => {
      if (path === '/api/v1/system/roles') {
        roleListCalls += 1;
        return Promise.resolve({
          resultList: [
            {
              roleId: 7,
              roleCode: 'OPERATOR',
              roleNm: '운영자',
              roleDc: '운영 역할',
              useAt: 'Y',
              userCount: roleListCalls === 1 ? 1 : 2,
            },
          ],
        });
      }
      if (path === '/api/v1/system/roles/7/users') {
        return Promise.resolve({
          assignedUsers: [],
          unassignedUsers: [
            {
              loginId: 12,
              userNm: '미할당 사용자',
              departmentNm: '운영팀',
            },
          ],
        });
      }
      return Promise.reject(new Error(`Unexpected GET request: ${path}`));
    });
    apiMocks.apiPost.mockResolvedValue(undefined);

    renderPage();

    await screen.findByRole('grid', {
      name: 'F1-GRID 사용자 매핑',
    });
    const assignment = await screen.findByRole('gridcell', {
      name: '미할당 사용자',
    });
    fireEvent.doubleClick(assignment);
    fireEvent.click(
      await screen.findByRole('checkbox', { name: '매핑 여부 12' }),
    );
    const saveButton = await screen.findByRole('button', { name: '저장' });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(apiMocks.apiPost).toHaveBeenCalledWith(
        '/api/v1/system/roles/7/users',
        {
          loginId: '12',
        },
      );
      expect(apiMocks.apiGet).toHaveBeenCalledWith('/api/v1/system/roles');
      expect(screen.getByRole('gridcell', { name: '2' })).toBeVisible();
    });

    expect(screen.queryAllByTestId('grid-loading-row-skeleton')).toHaveLength(
      0,
    );
    expect(
      screen.queryByTestId('page-loading-skeleton'),
    ).not.toBeInTheDocument();
  });

  it('shows the shared success toast after a silent mapping save completes', async () => {
    apiMocks.apiGet.mockImplementation((path: string) => {
      if (path === '/api/v1/system/roles') {
        return Promise.resolve({ resultList: [createRole(7, '운영자')] });
      }
      if (path === '/api/v1/system/roles/7/users') {
        return Promise.resolve({
          assignedUsers: [],
          unassignedUsers: [
            {
              loginId: 12,
              userNm: '미할당 사용자',
              departmentNm: '운영팀',
            },
          ],
        });
      }
      return Promise.reject(new Error(`Unexpected GET request: ${path}`));
    });
    apiMocks.apiPost.mockResolvedValue(undefined);

    renderPage();

    const mappingCheckbox = await screen.findByRole('checkbox', {
      name: '매핑 여부 12',
    });
    fireEvent.click(mappingCheckbox);

    fireEvent.click(await screen.findByRole('button', { name: '저장' }));

    expect(await screen.findByText('역할을 저장했습니다.')).toBeVisible();
  });

  it('does not show a user-mapping skeleton while a save-triggered refresh is running silently', async () => {
    let userFetchCalls = 0;
    const pendingUserRefresh = createDeferred<{
      assignedUsers: Array<Record<string, unknown>>;
      unassignedUsers: Array<Record<string, unknown>>;
    }>();

    apiMocks.apiGet.mockImplementation((path: string) => {
      if (path === '/api/v1/system/roles') {
        return Promise.resolve({ resultList: [createRole(7, '운영자')] });
      }
      if (path === '/api/v1/system/roles/7/users') {
        userFetchCalls += 1;
        if (userFetchCalls === 1) {
          return Promise.resolve({
            assignedUsers: [],
            unassignedUsers: [
              {
                loginId: 12,
                userNm: '미할당 사용자',
                departmentNm: '운영팀',
              },
            ],
          });
        }
        return pendingUserRefresh.promise;
      }
      return Promise.reject(new Error(`Unexpected GET request: ${path}`));
    });
    apiMocks.apiPost.mockResolvedValue(undefined);

    renderPage();

    const saveButton = await screen.findByRole('button', { name: '저장' });
    fireEvent.click(
      await screen.findByRole('checkbox', { name: '매핑 여부 12' }),
    );
    await waitFor(() => expect(saveButton).not.toBeDisabled());

    fireEvent.click(saveButton);
    await waitFor(() => expect(apiMocks.apiPost).toHaveBeenCalledTimes(1));
    expect(screen.queryAllByTestId('grid-loading-row-skeleton')).toHaveLength(
      0,
    );

    pendingUserRefresh.resolve({
      assignedUsers: [
        { loginId: 12, userNm: '미할당 사용자', departmentNm: '운영팀' },
      ],
      unassignedUsers: [],
    });
  });

  it('keeps a user mapping toggle local and enables the header save action', async () => {
    apiMocks.apiGet.mockImplementation((path: string) => {
      if (path === '/api/v1/system/roles') {
        return Promise.resolve({ resultList: [createRole(7, '운영자')] });
      }
      if (path === '/api/v1/system/roles/7/users') {
        return Promise.resolve({
          assignedUsers: [],
          unassignedUsers: [
            {
              loginId: 12,
              userNm: '미할당 사용자',
              departmentNm: '운영팀',
            },
          ],
        });
      }
      return Promise.reject(new Error(`Unexpected GET request: ${path}`));
    });

    renderPage();

    const saveButton = await screen.findByRole('button', { name: '저장' });
    const mappingCheckbox = await screen.findByRole('checkbox', {
      name: '매핑 여부 12',
    });
    fireEvent.click(mappingCheckbox);

    await waitFor(() => expect(saveButton).not.toBeDisabled());
    expect(apiMocks.apiPost).not.toHaveBeenCalled();
    expect(apiMocks.apiDelete).not.toHaveBeenCalled();
  });

  it('persists a changed user mapping on header save and refetches it', async () => {
    apiMocks.apiGet.mockImplementation((path: string) => {
      if (path === '/api/v1/system/roles') {
        return Promise.resolve({ resultList: [createRole(7, '운영자')] });
      }
      if (path === '/api/v1/system/roles/7/users') {
        return Promise.resolve({
          assignedUsers: [],
          unassignedUsers: [
            {
              loginId: 12,
              userNm: '미할당 사용자',
              departmentNm: '운영팀',
            },
          ],
        });
      }
      return Promise.reject(new Error(`Unexpected GET request: ${path}`));
    });
    apiMocks.apiPost.mockResolvedValue(undefined);

    renderPage();

    const saveButton = await screen.findByRole('button', { name: '저장' });
    fireEvent.click(
      await screen.findByRole('checkbox', { name: '매핑 여부 12' }),
    );
    await waitFor(() => expect(saveButton).not.toBeDisabled());
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(apiMocks.apiPost).toHaveBeenCalledWith(
        '/api/v1/system/roles/7/users',
        { loginId: '12' },
      );
    });
    await waitFor(() => {
      expect(
        apiMocks.apiGet.mock.calls.filter(
          ([path]) => path === '/api/v1/system/roles/7/users',
        ),
      ).toHaveLength(2);
    });
    await waitFor(() => expect(saveButton).toBeDisabled());
  });

  it('does not show a stale user mapping response after selecting another role', async () => {
    let resolveFirstMapping: ((value: unknown) => void) | undefined;
    let resolveSecondMapping: ((value: unknown) => void) | undefined;
    apiMocks.apiGet.mockImplementation((path: string) => {
      if (path === '/api/v1/system/roles') {
        return Promise.resolve({
          resultList: [createRole(7, '운영자'), createRole(8, '검토자')],
        });
      }
      if (path === '/api/v1/system/roles/7/users') {
        return new Promise((resolve) => {
          resolveFirstMapping = resolve;
        });
      }
      if (path === '/api/v1/system/roles/8/users') {
        return new Promise((resolve) => {
          resolveSecondMapping = resolve;
        });
      }
      return Promise.reject(new Error(`Unexpected GET request: ${path}`));
    });

    renderPage();

    fireEvent.click(await screen.findByRole('gridcell', { name: '검토자' }));
    await waitFor(() => expect(resolveSecondMapping).toBeTypeOf('function'));
    resolveSecondMapping?.({
      assignedUsers: [
        { loginId: 8, userNm: '최신 사용자', departmentNm: '검토팀' },
      ],
      unassignedUsers: [],
    });
    expect(
      await screen.findByRole('gridcell', { name: '최신 사용자' }),
    ).toBeVisible();

    resolveFirstMapping?.({
      assignedUsers: [
        { loginId: 7, userNm: '이전 사용자', departmentNm: '운영팀' },
      ],
      unassignedUsers: [],
    });
    await waitFor(() => {
      expect(
        screen.queryByRole('gridcell', { name: '이전 사용자' }),
      ).not.toBeInTheDocument();
    });
  });

  it('keeps the current role and mapping changes when canceling a guarded role switch', async () => {
    apiMocks.apiGet.mockImplementation((path: string) => {
      if (path === '/api/v1/system/roles') {
        return Promise.resolve({
          resultList: [createRole(7, '운영자'), createRole(8, '검토자')],
        });
      }
      if (path === '/api/v1/system/roles/7/users') {
        return Promise.resolve({
          assignedUsers: [],
          unassignedUsers: [createMapping(12, '미할당 사용자')],
        });
      }
      if (path === '/api/v1/system/roles/8/users') {
        return Promise.resolve({ assignedUsers: [], unassignedUsers: [] });
      }
      return Promise.reject(new Error(`Unexpected GET request: ${path}`));
    });

    renderPage();

    fireEvent.click(
      await screen.findByRole('checkbox', { name: '매핑 여부 12' }),
    );
    fireEvent.click(await screen.findByRole('gridcell', { name: '검토자' }));

    expect(
      await screen.findByRole('dialog', { name: '저장하지 않은 변경사항' }),
    ).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '취소' }));

    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: '저장하지 않은 변경사항' }),
      ).not.toBeInTheDocument(),
    );

    expect(screen.getByText('선택 역할: 운영자')).toBeVisible();
    expect(
      screen.getByRole('checkbox', { name: '매핑 여부 12' }),
    ).toBeChecked();
    expect(apiMocks.apiGet).not.toHaveBeenCalledWith(
      '/api/v1/system/roles/8/users',
    );
  });

  it('discards the pending mapping and moves on the shared continue action', async () => {
    apiMocks.apiGet.mockImplementation((path: string) => {
      if (path === '/api/v1/system/roles') {
        return Promise.resolve({
          resultList: [createRole(7, '운영자'), createRole(8, '검토자')],
        });
      }
      if (path === '/api/v1/system/roles/7/users') {
        return Promise.resolve({
          assignedUsers: [],
          unassignedUsers: [createMapping(12, '미할당 사용자')],
        });
      }
      if (path === '/api/v1/system/roles/8/users') {
        return Promise.resolve({
          assignedUsers: [createMapping(8, '검토자 사용자', true)],
          unassignedUsers: [],
        });
      }
      return Promise.reject(new Error(`Unexpected GET request: ${path}`));
    });

    renderPage();

    fireEvent.click(
      await screen.findByRole('checkbox', { name: '매핑 여부 12' }),
    );
    fireEvent.click(await screen.findByRole('gridcell', { name: '검토자' }));
    fireEvent.click(screen.getByRole('button', { name: '계속' }));

    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: '저장하지 않은 변경사항' }),
      ).not.toBeInTheDocument(),
    );
    expect(await screen.findByText('선택 역할: 검토자')).toBeVisible();
    expect(apiMocks.apiPost).not.toHaveBeenCalled();
    expect(apiMocks.apiDelete).not.toHaveBeenCalled();
  });

  it('keeps the role switch action blocked until the pending save is finished', async () => {
    const saveForRoleA = createDeferred<void>();
    const refetchForRoleA = createDeferred<unknown>();
    let roleAMappingCallCount = 0;
    apiMocks.apiGet.mockImplementation((path: string) => {
      if (path === '/api/v1/system/roles') {
        return Promise.resolve({
          resultList: [createRole(7, '운영자'), createRole(8, '검토자')],
        });
      }
      if (path === '/api/v1/system/roles/7/users') {
        roleAMappingCallCount += 1;
        return roleAMappingCallCount === 1
          ? Promise.resolve({
              assignedUsers: [],
              unassignedUsers: [createMapping(12, '미할당 사용자')],
            })
          : refetchForRoleA.promise;
      }
      if (path === '/api/v1/system/roles/8/users') {
        return Promise.resolve({
          assignedUsers: [createMapping(8, 'B 역할 사용자', true)],
          unassignedUsers: [],
        });
      }
      return Promise.reject(new Error(`Unexpected GET request: ${path}`));
    });
    apiMocks.apiPost.mockReturnValueOnce(saveForRoleA.promise);

    renderPage();

    fireEvent.click(
      await screen.findByRole('checkbox', { name: '매핑 여부 12' }),
    );
    fireEvent.click(await screen.findByRole('gridcell', { name: '검토자' }));
    const continueButton = await screen.findByRole('button', {
      name: '계속',
    });
    // A confirmation opened before saving must also remain locked.
    fireEvent.click(screen.getByRole('button', { name: '저장', hidden: true }));
    await waitFor(() => expect(apiMocks.apiPost).toHaveBeenCalledTimes(1));
    expect(continueButton).toBeDisabled();

    saveForRoleA.resolve();
    await waitFor(() => expect(roleAMappingCallCount).toBe(2));
    refetchForRoleA.resolve({
      assignedUsers: [createMapping(7, 'A 역할 사용자', true)],
      unassignedUsers: [],
    });
    await waitFor(() => expect(continueButton).not.toBeDisabled());
    fireEvent.click(continueButton);
    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: '저장하지 않은 변경사항' }),
      ).not.toBeInTheDocument(),
    );
    expect(await screen.findByText('선택 역할: 검토자')).toBeVisible();
    expect(
      await screen.findByRole('gridcell', { name: 'B 역할 사용자' }),
    ).toBeVisible();
  });

  it('keeps role switching locked through a post-save refetch and then loads the selected role', async () => {
    const saveForRoleA = createDeferred<void>();
    const refetchForRoleA = createDeferred<unknown>();
    let roleAMappingCallCount = 0;
    apiMocks.apiGet.mockImplementation((path: string) => {
      if (path === '/api/v1/system/roles') {
        return Promise.resolve({
          resultList: [createRole(7, '운영자'), createRole(8, '검토자')],
        });
      }
      if (path === '/api/v1/system/roles/7/users') {
        roleAMappingCallCount += 1;
        return roleAMappingCallCount === 1
          ? Promise.resolve({
              assignedUsers: [],
              unassignedUsers: [createMapping(12, '미할당 사용자')],
            })
          : refetchForRoleA.promise;
      }
      if (path === '/api/v1/system/roles/8/users') {
        return Promise.resolve({
          assignedUsers: [createMapping(8, 'B 역할 사용자', true)],
          unassignedUsers: [],
        });
      }
      return Promise.reject(new Error(`Unexpected GET request: ${path}`));
    });
    apiMocks.apiPost.mockReturnValueOnce(saveForRoleA.promise);

    renderPage();

    fireEvent.click(
      await screen.findByRole('checkbox', { name: '매핑 여부 12' }),
    );
    fireEvent.click(await screen.findByRole('gridcell', { name: '검토자' }));
    const continueButton = await screen.findByRole('button', {
      name: '계속',
    });
    fireEvent.click(screen.getByRole('button', { name: '저장', hidden: true }));
    await waitFor(() => expect(apiMocks.apiPost).toHaveBeenCalledTimes(1));
    expect(continueButton).toBeDisabled();

    saveForRoleA.resolve();
    await waitFor(() => expect(roleAMappingCallCount).toBe(2));
    refetchForRoleA.resolve({
      assignedUsers: [createMapping(7, 'A 역할 사용자', true)],
      unassignedUsers: [],
    });
    await waitFor(() => expect(continueButton).not.toBeDisabled());
    fireEvent.click(continueButton);
    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: '저장하지 않은 변경사항' }),
      ).not.toBeInTheDocument(),
    );
    expect(await screen.findByText('선택 역할: 검토자')).toBeVisible();
    expect(
      await screen.findByRole('gridcell', { name: 'B 역할 사용자' }),
    ).toBeVisible();

    await waitFor(() => {
      expect(
        screen.queryByRole('gridcell', { name: 'A 역할 사용자' }),
      ).not.toBeInTheDocument();
    });
    expect(screen.getByText('선택 역할: 검토자')).toBeVisible();
  });

  it('preserves the user-mapping column layout across a role switch remount', async () => {
    apiMocks.apiGet.mockImplementation((path: string) => {
      if (path === '/api/v1/system/roles') {
        return Promise.resolve({
          resultList: [createRole(7, '운영자'), createRole(8, '검토자')],
        });
      }
      if (path === '/api/v1/system/roles/7/users') {
        return Promise.resolve({
          assignedUsers: [],
          unassignedUsers: [
            createMapping(12, '미할당 사용자'),
            createMapping(13, '다른 사용자'),
          ],
        });
      }
      if (path === '/api/v1/system/roles/8/users') {
        return Promise.resolve({ assignedUsers: [], unassignedUsers: [] });
      }
      return Promise.reject(new Error(`Unexpected GET request: ${path}`));
    });

    renderPage();

    fireEvent.click(
      screen.getByRole('button', { name: '로그인 ID 컬럼 메뉴' }),
    );
    fireEvent.click(screen.getByRole('menuitem', { name: '컬럼 목록' }));
    fireEvent.click(screen.getByRole('checkbox', { name: '로그인 ID 표시' }));

    expect(
      screen.queryByRole('columnheader', { name: /^로그인 ID$/ }),
    ).not.toBeInTheDocument();

    fireEvent.click(await screen.findByRole('gridcell', { name: '검토자' }));

    await waitFor(() => {
      expect(screen.getByText('선택 역할: 검토자')).toBeVisible();
    });

    expect(
      screen.queryByRole('columnheader', { name: /^로그인 ID$/ }),
    ).not.toBeInTheDocument();
  });

  it('does not duplicate a successful mapping operation when a later mapping save fails and retries', async () => {
    let postCount = 0;
    apiMocks.apiGet.mockImplementation((path: string) => {
      if (path === '/api/v1/system/roles') {
        return Promise.resolve({ resultList: [createRole(7, '운영자')] });
      }
      if (path === '/api/v1/system/roles/7/users') {
        return Promise.resolve({
          assignedUsers: [],
          unassignedUsers: [
            createMapping(12, '첫 번째 사용자'),
            createMapping(13, '두 번째 사용자'),
          ],
        });
      }
      return Promise.reject(new Error(`Unexpected GET request: ${path}`));
    });
    apiMocks.apiPost.mockImplementation(() => {
      postCount += 1;
      return postCount === 2
        ? Promise.reject(new Error('두 번째 저장 실패'))
        : Promise.resolve();
    });

    renderPage();

    fireEvent.click(
      await screen.findByRole('checkbox', { name: '매핑 여부 12' }),
    );
    fireEvent.click(screen.getByRole('checkbox', { name: '매핑 여부 13' }));
    const saveButton = screen.getByRole('button', { name: '저장' });
    fireEvent.click(saveButton);
    expect(await screen.findByText('두 번째 저장 실패')).toBeVisible();

    fireEvent.click(saveButton);
    await waitFor(() => expect(saveButton).toBeDisabled());
    expect(apiMocks.apiPost).toHaveBeenCalledTimes(3);
    expect(apiMocks.apiPost).toHaveBeenNthCalledWith(
      3,
      '/api/v1/system/roles/7/users',
      { loginId: '13' },
    );
  });
});

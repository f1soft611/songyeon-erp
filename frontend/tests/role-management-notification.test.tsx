import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RoleManagementPage } from '../src/pages/settings/system/roles/RoleManagementPage';
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
      '역할 목록 조회 실패',
    );
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
          loginId: 12,
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
        { loginId: 12 },
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
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => expect(apiMocks.apiPost).toHaveBeenCalledTimes(1));
    fireEvent.click(await screen.findByRole('gridcell', { name: '검토자' }));
    const continueButton = await screen.findByRole('button', {
      name: '계속',
    });
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
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => expect(apiMocks.apiPost).toHaveBeenCalledTimes(1));
    fireEvent.click(await screen.findByRole('gridcell', { name: '검토자' }));
    const continueButton = await screen.findByRole('button', {
      name: '계속',
    });
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
      { loginId: 13 },
    );
  });
});

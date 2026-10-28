import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardContent } from '../src/pages/dashboard/components/DashboardContent';
import {
  CommonCodeManagementPanel,
  getItemCodeValidationMessage,
  getGroupDeleteBlockedMessage,
  resolveCreatedGroupId,
  resolveCreatedGroupIdMap,
} from '../src/pages/co/master/common-code/components/CommonCodeManagementPanel';
import { saveCommonCodeBatch } from '../src/pages/co/master/common-code/services/commonCodeManagement.service';
import { RoleManagementPanel } from '../src/pages/settings/system/roles/components/RoleManagementPanel';
import { Splitter } from '../src/shared/components/Splitter';
import { NotificationProvider } from '../src/shared/context/NotificationContext';

const apiMocks = vi.hoisted(() => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPut: vi.fn(),
  apiDelete: vi.fn(),
}));

const treeRefState = vi.hoisted(() => ({
  current: null as {
    deleteSelectedRows?: () => void;
  } | null,
}));

vi.mock('../src/shared/services/apiClient', () => apiMocks);

vi.mock('../src/shared/components/f1-grid', async () => {
  const actual = await vi.importActual<
    typeof import('../src/shared/components/f1-grid')
  >('../src/shared/components/f1-grid');
  const React = await import('react');

  return {
    ...actual,
    F1Tree: React.forwardRef(function MockTree(props: any, ref) {
      React.useImperativeHandle(ref, () => ({
        getSelectedRows: () => [],
        getSelectedRowIds: () => ['1'],
        clearSelection: vi.fn(),
        addRow: vi.fn(),
        addChildRow: vi.fn(),
        deleteSelectedRows: () => {
          props.onDeleteBlocked?.(['1']);
        },
        restoreDeletedRows: vi.fn(),
        duplicateSelectedRows: vi.fn(),
        getRows: () => props.rows ?? [],
        getActiveRows: () => props.rows ?? [],
        getChanges: () => ({
          insertedRows: [],
          updatedRows: [],
          deletedRows: [],
        }),
        validate: () => true,
        startEdit: vi.fn(),
        stopEdit: vi.fn(),
        setCellValue: vi.fn(),
        expandRow: vi.fn(),
        collapseRow: vi.fn(),
        expandAll: vi.fn(),
        collapseAll: vi.fn(),
        isExpanded: () => true,
      }));

      treeRefState.current = {
        deleteSelectedRows: () => {
          props.onDeleteBlocked?.(['1']);
        },
      };

      return <div data-testid="mock-f1-tree" />;
    }),
  };
});

const commonCodeGroups = [
  {
    commonCodeGroupId: 1,
    tenantId: 1,
    groupCode: 'ATTACH_DOC',
    groupNm: '첨부문서업무',
    groupDc: '첨부문서 업무 공통코드',
    parentGroupId: null,
    sortOrder: 1,
    useAt: 'Y',
  },
  {
    commonCodeGroupId: 2,
    tenantId: 1,
    groupCode: 'DOC_TYPE',
    groupNm: '첨부문서구분',
    groupDc: '문서 유형 분류',
    parentGroupId: 1,
    sortOrder: 1,
    useAt: 'Y',
  },
];

const commonCodeItems = [
  {
    commonCodeItemId: 10,
    tenantId: 1,
    groupId: 1,
    itemCode: 'STATEMENT',
    itemNm: '거래명세서',
    parentItemId: null,
    parentItemNm: '',
    itemDc: '거래 명세서',
    sortOrder: 1,
    useAt: 'Y',
  },
  {
    commonCodeItemId: 11,
    tenantId: 1,
    groupId: 1,
    itemCode: 'LICENSE',
    itemNm: '사업자등록증',
    parentItemId: null,
    parentItemNm: '',
    itemDc: '사업자등록증',
    sortOrder: 2,
    useAt: 'Y',
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  apiMocks.apiGet.mockImplementation((path: string) => {
    if (path === '/api/v1/co/master/common-code/groups') {
      return Promise.resolve({ resultList: commonCodeGroups });
    }
    if (path === '/api/v1/co/master/common-code/groups/1/items') {
      return Promise.resolve({ resultList: commonCodeItems });
    }
    if (path === '/api/v1/co/master/common-code/groups/2/items') {
      return Promise.resolve({ resultList: [] });
    }
    return Promise.reject(new Error(`Unexpected GET request: ${path}`));
  });
});

describe('CommonCode management page', () => {
  it('allows an empty item code only for a new row that can be auto-generated', () => {
    expect(getItemCodeValidationMessage('', true)).toBeNull();
    expect(getItemCodeValidationMessage('', false)).toBe(
      '상세코드는 필수입니다.',
    );
  });

  it('sends group and detail changes in a single batch save request', async () => {
    apiMocks.apiPost.mockResolvedValue({ result: { success: true } });

    await saveCommonCodeBatch({
      groups: {
        insertedRows: [
          { id: 'new-group', groupCode: 'NEW', groupNm: '새그룹' },
        ],
        updatedRows: [],
        deletedRows: [],
      },
      items: {
        insertedRows: [
          {
            id: 'new-item',
            groupId: 'new-group',
            itemCode: 'A',
            itemNm: '테스트',
          },
        ],
        updatedRows: [],
        deletedRows: [],
      },
    });

    expect(apiMocks.apiPost).toHaveBeenCalledWith(
      '/api/v1/co/master/common-code/save-batch',
      {
        groups: {
          insertedRows: [
            { id: 'new-group', groupCode: 'NEW', groupNm: '새그룹' },
          ],
          updatedRows: [],
          deletedRows: [],
        },
        items: {
          insertedRows: [
            {
              id: 'new-item',
              groupId: 'new-group',
              itemCode: 'A',
              itemNm: '테스트',
            },
          ],
          updatedRows: [],
          deletedRows: [],
        },
      },
    );
  });

  it('reads the persisted common-code group id from the API item response shape', () => {
    expect(
      resolveCreatedGroupId({
        item: { commonCodeGroupId: 42 },
      }),
    ).toBe('42');

    expect(
      resolveCreatedGroupId({
        item: { id: '77' },
      }),
    ).toBe('77');
  });

  it('allows a group to be deleted when its detail rows are already marked for deletion in the same save batch', () => {
    const message = getGroupDeleteBlockedMessage({
      blockedGroupIds: ['1'],
      groups: [
        {
          id: '1',
          groupCode: 'ROOT',
          groupNm: '루트 그룹',
          parentGroupId: null,
          groupDc: '',
          sortOrder: 1,
          useAt: 'Y',
        },
      ],
      itemRows: [
        {
          id: '10',
          groupId: '1',
          itemCode: 'DOC',
          itemNm: '문서',
          parentItemId: null,
          parentItemNm: '',
          sortOrder: 1,
          useAt: 'Y',
          itemDc: '',
        },
      ],
      deletedGroupIds: [],
      deletedItemIds: ['10'],
    });

    expect(message).toBeNull();
  });

  it('shows an error when a group is blocked from deletion because it still has child content', async () => {
    const onError = vi.fn();

    render(
      <ThemeProvider theme={createTheme()}>
        <CommonCodeManagementPanel
          groups={[
            {
              id: '1',
              groupCode: 'ROOT',
              groupNm: '루트 그룹',
              parentGroupId: null,
              groupDc: '',
              sortOrder: 1,
              useAt: 'Y',
            },
            {
              id: '2',
              groupCode: 'CHILD',
              groupNm: '하위 그룹',
              parentGroupId: '1',
              groupDc: '',
              sortOrder: 2,
              useAt: 'Y',
            },
          ]}
          onError={onError}
        />
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(treeRefState.current).not.toBeNull();
    });

    act(() => {
      treeRefState.current?.deleteSelectedRows?.();
    });

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(
        '하위 그룹 또는 상세코드가 있는 그룹은 삭제할 수 없습니다.',
      );
    });
  });

  it('maps a newly created group temp id to the persisted group id after batch save', () => {
    expect(
      resolveCreatedGroupIdMap(
        {
          item: {
            groups: [
              { commonCodeGroupId: 42, groupCode: 'NEW', groupNm: '새그룹' },
            ],
          },
        },
        ['new-common-group-1'],
      ).get('new-common-group-1'),
    ).toBe('42');
  });

  it('renders a draggable horizontal splitter handle with the correct accessibility metadata', () => {
    render(
      <Splitter
        direction="horizontal"
        initialSize={320}
        minSize={200}
        maxSize={420}
        ariaLabel="공통코드 트리와 상세영역 분리기"
      >
        <div style={{ width: '100%', height: '100%' }}>left</div>
        <div style={{ width: '100%', height: '100%' }}>right</div>
      </Splitter>,
    );

    const separator = screen.getByRole('separator', {
      name: '공통코드 트리와 상세영역 분리기',
    });

    expect(separator).toHaveAttribute('aria-orientation', 'horizontal');
    expect(separator).toHaveAttribute('tabindex', '0');
  });

  it('reports the dragged split size for session persistence', () => {
    const onSizeChange = vi.fn();
    render(
      <Splitter
        direction="horizontal"
        initialSize={320}
        minSize={200}
        maxSize={420}
        onSizeChange={onSizeChange}
        ariaLabel="공통코드 트리와 상세영역 분리기"
      >
        <div style={{ width: '100%', height: '100%' }}>left</div>
        <div style={{ width: '100%', height: '100%' }}>right</div>
      </Splitter>,
    );

    const root = screen.getByRole('separator', {
      name: '공통코드 트리와 상세영역 분리기',
    }).parentElement as HTMLElement;
    Object.defineProperty(root, 'clientWidth', {
      configurable: true,
      value: 1000,
    });
    const separator = screen.getByRole('separator', {
      name: '공통코드 트리와 상세영역 분리기',
    });

    fireEvent.pointerDown(separator, { clientX: 320 });
    fireEvent.pointerMove(window, { clientX: 380 });
    fireEvent.pointerUp(window);

    expect(onSizeChange).toHaveBeenCalledWith(380);
  });

  it('switches to a stacked mobile layout and hides the separator on narrow widths', () => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: 375,
    });

    const { container } = render(
      <Splitter
        direction="horizontal"
        mobileBreakpoint={768}
        mobileMode="stacked"
        initialSize={320}
        minSize={180}
        ariaLabel="공통코드 트리와 상세영역 분리기"
      >
        <div style={{ width: '100%', height: '100%' }}>left</div>
        <div style={{ width: '100%', height: '100%' }}>right</div>
      </Splitter>,
    );

    const stackedRoot = container.firstElementChild as HTMLElement;

    expect(
      screen.queryByRole('separator', {
        name: '공통코드 트리와 상세영역 분리기',
      }),
    ).not.toBeInTheDocument();
    expect(stackedRoot).toHaveStyle({ overflowY: 'auto' });
    expect(stackedRoot).toHaveStyle({ height: 'auto' });
  });

  it('supports flex-based left and right widths on the split layout', () => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: 1200,
    });

    render(
      <Splitter
        direction="horizontal"
        leftFlex={3}
        rightFlex={2}
        ariaLabel="공통코드 트리와 상세영역 분리기"
      >
        <div style={{ width: '100%', height: '100%' }}>left</div>
        <div style={{ width: '100%', height: '100%' }}>right</div>
      </Splitter>,
    );

    const separator = screen.getByRole('separator', {
      name: '공통코드 트리와 상세영역 분리기',
    });
    const panes = separator.parentElement?.children as HTMLCollection;

    expect(separator).toHaveStyle({ display: 'flex' });
    expect(panes[0]).toHaveStyle({ flex: '3 1 0%' });
    expect(panes[2]).toHaveStyle({ flex: '2 1 0%' });
  });

  it('stacks the role management panels vertically on mobile screens', () => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: 375,
    });

    const { container } = render(
      <ThemeProvider theme={createTheme()}>
        <RoleManagementPanel
          roles={[
            {
              id: 'role-1',
              group: 'SYS',
              name: '시스템 관리자',
              description: '시스템 관리',
              menuCount: 1,
              active: true,
              permissions: {
                read: true,
                create: true,
                update: true,
                delete: true,
              },
            },
          ]}
          canExportExcel
        />
      </ThemeProvider>,
    );

    const stackedRoot = (container.firstElementChild as HTMLElement)
      .firstElementChild as HTMLElement;

    expect(
      screen.queryByRole('separator', {
        name: '권한 관리 영역 분리기',
      }),
    ).not.toBeInTheDocument();
    expect(stackedRoot).toHaveStyle({ overflowY: 'auto' });
  });

  it('renders the actual common code management page instead of the coming soon placeholder', () => {
    const theme = createTheme();

    render(
      <ThemeProvider theme={theme}>
        <NotificationProvider>
          <DashboardContent
            selectedModule={{
              id: 'co',
              name: '기준정보',
              icon: null,
              tree: [],
              menus: [],
            }}
            currentMenuName="공통코드 관리"
            currentPageKey="cmncodes"
            breadcrumbItems={['기준정보', '공통코드 관리']}
            content={{
              title: '공통코드 관리',
              description: '공통코드를 그룹과 상세코드로 관리합니다.',
              cards: [],
              items: [],
            }}
            selectedMenuPermissions={{
              read: true,
              create: true,
              update: true,
              delete: true,
              excel: true,
            }}
          />
        </NotificationProvider>
      </ThemeProvider>,
    );

    expect(screen.getAllByText(/공통코드 관리/).length).toBeGreaterThan(0);
    expect(
      screen.queryByText('요청하신 페이지는 현재 준비 중입니다'),
    ).not.toBeInTheDocument();
    expect(screen.getByText('공통코드 그룹 관리')).toBeInTheDocument();
  });

  it('does not reload the full group list when the selected group changes', async () => {
    const theme = createTheme();

    render(
      <ThemeProvider theme={theme}>
        <NotificationProvider>
          <DashboardContent
            selectedModule={{
              id: 'co',
              name: '기준정보',
              icon: null,
              tree: [],
              menus: [],
            }}
            currentMenuName="공통코드 관리"
            currentPageKey="cmncodes"
            breadcrumbItems={['기준정보', '공통코드 관리']}
            content={{
              title: '공통코드 관리',
              description: '공통코드를 그룹과 상세코드로 관리합니다.',
              cards: [],
              items: [],
            }}
            selectedMenuPermissions={{
              read: true,
              create: true,
              update: true,
              delete: true,
              excel: true,
            }}
          />
        </NotificationProvider>
      </ThemeProvider>,
    );

    await screen.findByRole('grid', { name: '공통코드 그룹 트리' });
    await waitFor(() => {
      expect(apiMocks.apiGet).toHaveBeenCalledTimes(2);
    });
    expect(apiMocks.apiGet).toHaveBeenNthCalledWith(
      1,
      '/api/v1/co/master/common-code/groups',
    );
    expect(apiMocks.apiGet).toHaveBeenNthCalledWith(
      2,
      '/api/v1/co/master/common-code/groups/1/items',
    );
  });

  it('renders the use flag as a checkbox and the sort order as a numeric field for detail rows', async () => {
    const theme = createTheme();

    render(
      <ThemeProvider theme={theme}>
        <NotificationProvider>
          <DashboardContent
            selectedModule={{
              id: 'co',
              name: '기준정보',
              icon: null,
              tree: [],
              menus: [],
            }}
            currentMenuName="공통코드 관리"
            currentPageKey="cmncodes"
            breadcrumbItems={['기준정보', '공통코드 관리']}
            content={{
              title: '공통코드 관리',
              description: '공통코드를 그룹과 상세코드로 관리합니다.',
              cards: [],
              items: [],
            }}
            selectedMenuPermissions={{
              read: true,
              create: true,
              update: true,
              delete: true,
              excel: true,
            }}
          />
        </NotificationProvider>
      </ThemeProvider>,
    );

    const grid = await screen.findByRole('grid', { name: '공통코드 상세코드' });
    expect(grid).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: '사용여부' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: '정렬순서' }),
    ).toBeInTheDocument();
  });

  it('renders the detail use flag as unchecked when the persisted value is N', async () => {
    apiMocks.apiGet.mockImplementation((path: string) => {
      if (path === '/api/v1/co/master/common-code/groups') {
        return Promise.resolve({ resultList: commonCodeGroups });
      }
      if (path === '/api/v1/co/master/common-code/groups/1/items') {
        return Promise.resolve({
          resultList: [
            {
              ...commonCodeItems[0],
              commonCodeItemId: 10,
              useAt: 'N',
            },
            {
              ...commonCodeItems[1],
              commonCodeItemId: 11,
              useAt: 'Y',
            },
          ],
        });
      }
      if (path === '/api/v1/co/master/common-code/groups/2/items') {
        return Promise.resolve({ resultList: [] });
      }
      return Promise.reject(new Error(`Unexpected GET request: ${path}`));
    });

    const theme = createTheme();

    render(
      <ThemeProvider theme={theme}>
        <NotificationProvider>
          <DashboardContent
            selectedModule={{
              id: 'co',
              name: '기준정보',
              icon: null,
              tree: [],
              menus: [],
            }}
            currentMenuName="공통코드 관리"
            currentPageKey="cmncodes"
            breadcrumbItems={['기준정보', '공통코드 관리']}
            content={{
              title: '공통코드 관리',
              description: '공통코드를 그룹과 상세코드로 관리합니다.',
              cards: [],
              items: [],
            }}
            selectedMenuPermissions={{
              read: true,
              create: true,
              update: true,
              delete: true,
              excel: true,
            }}
          />
        </NotificationProvider>
      </ThemeProvider>,
    );

    const uncheckedCheckbox = await screen.findByRole('checkbox', {
      name: '사용여부 10',
    });

    expect(uncheckedCheckbox).not.toBeChecked();
  });

  it('prompts before reloading a dirty common code page', async () => {
    const theme = createTheme();

    render(
      <ThemeProvider theme={theme}>
        <NotificationProvider>
          <DashboardContent
            selectedModule={{
              id: 'co',
              name: '기준정보',
              icon: null,
              tree: [],
              menus: [],
            }}
            currentMenuName="공통코드 관리"
            currentPageKey="cmncodes"
            breadcrumbItems={['기준정보', '공통코드 관리']}
            content={{
              title: '공통코드 관리',
              description: '공통코드를 그룹과 상세코드로 관리합니다.',
              cards: [],
              items: [],
            }}
            selectedMenuPermissions={{
              read: true,
              create: true,
              update: true,
              delete: true,
              excel: true,
            }}
          />
        </NotificationProvider>
      </ThemeProvider>,
    );

    const groupCell = await screen.findByRole('gridcell', {
      name: '첨부문서업무',
    });
    fireEvent.doubleClick(groupCell);
    const groupInput = await screen.findByDisplayValue('첨부문서업무');
    fireEvent.change(groupInput, { target: { value: '첨부문서업무 수정' } });
    fireEvent.keyDown(groupInput, { key: 'Enter', code: 'Enter' });

    fireEvent.click(screen.getByRole('button', { name: '조회' }));

    expect(
      await screen.findByRole('dialog', { name: '저장하지 않은 변경사항' }),
    ).toHaveTextContent(
      '변경사항을 버리고 공통코드 목록을 다시 불러오시겠습니까?',
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '취소' })).toBeVisible();
    });
  });

  it('does not block switching groups when only the tree itself is dirty', async () => {
    const theme = createTheme();

    render(
      <ThemeProvider theme={theme}>
        <NotificationProvider>
          <DashboardContent
            selectedModule={{
              id: 'co',
              name: '기준정보',
              icon: null,
              tree: [],
              menus: [],
            }}
            currentMenuName="공통코드 관리"
            currentPageKey="cmncodes"
            breadcrumbItems={['기준정보', '공통코드 관리']}
            content={{
              title: '공통코드 관리',
              description: '공통코드를 그룹과 상세코드로 관리합니다.',
              cards: [],
              items: [],
            }}
            selectedMenuPermissions={{
              read: true,
              create: true,
              update: true,
              delete: true,
              excel: true,
            }}
          />
        </NotificationProvider>
      </ThemeProvider>,
    );

    const firstGroupCell = await screen.findByRole('gridcell', {
      name: '첨부문서업무',
    });
    fireEvent.doubleClick(firstGroupCell);
    const groupInput = await screen.findByDisplayValue('첨부문서업무');
    fireEvent.change(groupInput, { target: { value: '첨부문서업무 수정' } });
    fireEvent.keyDown(groupInput, { key: 'Enter', code: 'Enter' });

    const secondGroupCell = await screen.findByRole('gridcell', {
      name: '첨부문서구분',
    });
    fireEvent.click(secondGroupCell);

    await waitFor(() => {
      expect(screen.getByText('선택 그룹: 첨부문서구분')).toBeInTheDocument();
    });

    expect(
      screen.queryByRole('dialog', { name: '저장하지 않은 변경사항' }),
    ).not.toBeInTheDocument();
    await waitFor(() => {
      expect(apiMocks.apiGet).toHaveBeenCalledWith(
        '/api/v1/co/master/common-code/groups/2/items',
      );
    });
  });

  it('keeps the current group selection when reloading a dirty page and does not reset to the first group', async () => {
    const theme = createTheme();

    render(
      <ThemeProvider theme={theme}>
        <NotificationProvider>
          <DashboardContent
            selectedModule={{
              id: 'co',
              name: '기준정보',
              icon: null,
              tree: [],
              menus: [],
            }}
            currentMenuName="공통코드 관리"
            currentPageKey="cmncodes"
            breadcrumbItems={['기준정보', '공통코드 관리']}
            content={{
              title: '공통코드 관리',
              description: '공통코드를 그룹과 상세코드로 관리합니다.',
              cards: [],
              items: [],
            }}
            selectedMenuPermissions={{
              read: true,
              create: true,
              update: true,
              delete: true,
              excel: true,
            }}
          />
        </NotificationProvider>
      </ThemeProvider>,
    );

    const secondGroupCell = await screen.findByRole('gridcell', {
      name: '첨부문서구분',
    });
    fireEvent.click(secondGroupCell);

    const groupCell = await screen.findByRole('gridcell', {
      name: '첨부문서구분',
    });
    fireEvent.doubleClick(groupCell);
    const groupInput = await screen.findByDisplayValue('첨부문서구분');
    fireEvent.change(groupInput, { target: { value: '첨부문서구분 수정' } });
    fireEvent.keyDown(groupInput, { key: 'Enter', code: 'Enter' });

    fireEvent.click(screen.getByRole('button', { name: '조회' }));

    expect(
      await screen.findByRole('dialog', { name: '저장하지 않은 변경사항' }),
    ).toHaveTextContent(
      '변경사항을 버리고 공통코드 목록을 다시 불러오시겠습니까?',
    );

    fireEvent.click(screen.getByRole('button', { name: '계속' }));

    await waitFor(() => {
      expect(apiMocks.apiGet).toHaveBeenCalledWith(
        '/api/v1/co/master/common-code/groups/2/items',
      );
    });

    expect(screen.getByText('선택 그룹: 첨부문서구분')).toBeInTheDocument();
  });

  it('loads the detail rows for the newly selected group after continuing from the detail-grid dirty-switch confirm', async () => {
    const theme = createTheme();

    render(
      <ThemeProvider theme={theme}>
        <NotificationProvider>
          <DashboardContent
            selectedModule={{
              id: 'co',
              name: '기준정보',
              icon: null,
              tree: [],
              menus: [],
            }}
            currentMenuName="공통코드 관리"
            currentPageKey="cmncodes"
            breadcrumbItems={['기준정보', '공통코드 관리']}
            content={{
              title: '공통코드 관리',
              description: '공통코드를 그룹과 상세코드로 관리합니다.',
              cards: [],
              items: [],
            }}
            selectedMenuPermissions={{
              read: true,
              create: true,
              update: true,
              delete: true,
              excel: true,
            }}
          />
        </NotificationProvider>
      </ThemeProvider>,
    );

    const detailCell = await screen.findByRole('gridcell', {
      name: '거래명세서',
    });
    fireEvent.doubleClick(detailCell);
    const detailInput = await screen.findByDisplayValue('거래명세서');
    fireEvent.change(detailInput, { target: { value: '거래명세서 수정' } });
    fireEvent.keyDown(detailInput, { key: 'Enter', code: 'Enter' });

    const secondGroupCell = await screen.findByRole('gridcell', {
      name: '첨부문서구분',
    });
    fireEvent.click(secondGroupCell);

    const dialog = await screen.findByRole('dialog', {
      name: '저장하지 않은 변경사항',
    });
    expect(dialog).toHaveTextContent(
      '현재 그룹의 변경사항을 유지하지 않고 다른 그룹으로 이동하시겠습니까?',
    );

    fireEvent.click(screen.getByRole('button', { name: '계속' }));

    await waitFor(() => {
      expect(apiMocks.apiGet).toHaveBeenCalledWith(
        '/api/v1/co/master/common-code/groups/2/items',
      );
    });
  });

  it('shows add root, add row, and delete actions in the common code context menu', async () => {
    const theme = createTheme();

    render(
      <ThemeProvider theme={theme}>
        <NotificationProvider>
          <DashboardContent
            selectedModule={{
              id: 'co',
              name: '기준정보',
              icon: null,
              tree: [],
              menus: [],
            }}
            currentMenuName="공통코드 관리"
            currentPageKey="cmncodes"
            breadcrumbItems={['기준정보', '공통코드 관리']}
            content={{
              title: '공통코드 관리',
              description: '공통코드를 그룹과 상세코드로 관리합니다.',
              cards: [],
              items: [],
            }}
            selectedMenuPermissions={{
              read: true,
              create: true,
              update: true,
              delete: true,
              excel: true,
            }}
          />
        </NotificationProvider>
      </ThemeProvider>,
    );

    const tree = await screen.findByRole('grid', {
      name: '공통코드 그룹 트리',
    });
    const body = tree.lastElementChild as HTMLElement;
    fireEvent.contextMenu(body);

    await waitFor(() => {
      expect(screen.getByRole('menuitem', { name: '루트 추가' })).toBeVisible();
      expect(screen.getByRole('menuitem', { name: '행 추가' })).toBeVisible();
      expect(screen.getByRole('menuitem', { name: '행 삭제' })).toBeVisible();
    });
  });

  it('clears the loading overlay when a group selection finishes loading its detail rows', async () => {
    let resolveItemLoad:
      | ((value: { resultList: unknown[] }) => void)
      | undefined;
    apiMocks.apiGet.mockImplementation((path: string) => {
      if (path === '/api/v1/co/master/common-code/groups') {
        return Promise.resolve({ resultList: commonCodeGroups });
      }
      if (path === '/api/v1/co/master/common-code/groups/1/items') {
        return Promise.resolve({ resultList: commonCodeItems });
      }
      if (path === '/api/v1/co/master/common-code/groups/2/items') {
        return new Promise((resolve) => {
          resolveItemLoad = resolve;
        });
      }
      return Promise.reject(new Error(`Unexpected GET request: ${path}`));
    });

    const theme = createTheme();

    render(
      <ThemeProvider theme={theme}>
        <NotificationProvider>
          <DashboardContent
            selectedModule={{
              id: 'co',
              name: '기준정보',
              icon: null,
              tree: [],
              menus: [],
            }}
            currentMenuName="공통코드 관리"
            currentPageKey="cmncodes"
            breadcrumbItems={['기준정보', '공통코드 관리']}
            content={{
              title: '공통코드 관리',
              description: '공통코드를 그룹과 상세코드로 관리합니다.',
              cards: [],
              items: [],
            }}
            selectedMenuPermissions={{
              read: true,
              create: true,
              update: true,
              delete: true,
              excel: true,
            }}
          />
        </NotificationProvider>
      </ThemeProvider>,
    );

    await screen.findByRole('grid', { name: '공통코드 그룹 트리' });

    const secondGroupCell = await screen.findByRole('gridcell', {
      name: '첨부문서구분',
    });
    fireEvent.click(secondGroupCell);

    await waitFor(() => {
      expect(screen.getByTestId('f1-grid-loading-overlay')).toBeInTheDocument();
    });

    resolveItemLoad?.({ resultList: [] });

    await waitFor(() => {
      expect(
        screen.queryByTestId('f1-grid-loading-overlay'),
      ).not.toBeInTheDocument();
    });
  });

  it('does not leave the detail grid stuck in a loading state after creating a blank group row', async () => {
    let resolveItemLoad:
      | ((value: { resultList: unknown[] }) => void)
      | undefined;
    apiMocks.apiGet.mockImplementation((path: string) => {
      if (path === '/api/v1/co/master/common-code/groups') {
        return Promise.resolve({ resultList: commonCodeGroups });
      }
      if (path === '/api/v1/co/master/common-code/groups/1/items') {
        return Promise.resolve({ resultList: commonCodeItems });
      }
      if (path === '/api/v1/co/master/common-code/groups/2/items') {
        return new Promise((resolve) => {
          resolveItemLoad = resolve;
        });
      }
      return Promise.reject(new Error(`Unexpected GET request: ${path}`));
    });

    const theme = createTheme();

    render(
      <ThemeProvider theme={theme}>
        <NotificationProvider>
          <DashboardContent
            selectedModule={{
              id: 'co',
              name: '기준정보',
              icon: null,
              tree: [],
              menus: [],
            }}
            currentMenuName="공통코드 관리"
            currentPageKey="cmncodes"
            breadcrumbItems={['기준정보', '공통코드 관리']}
            content={{
              title: '공통코드 관리',
              description: '공통코드를 그룹과 상세코드로 관리합니다.',
              cards: [],
              items: [],
            }}
            selectedMenuPermissions={{
              read: true,
              create: true,
              update: true,
              delete: true,
              excel: true,
            }}
          />
        </NotificationProvider>
      </ThemeProvider>,
    );

    await screen.findByRole('grid', { name: '공통코드 그룹 트리' });

    fireEvent.click(
      await screen.findByRole('gridcell', { name: '첨부문서구분' }),
    );

    await waitFor(() => {
      expect(screen.getByTestId('f1-grid-loading-overlay')).toBeTruthy();
    });

    const tree = screen.getByRole('grid', { name: '공통코드 그룹 트리' });
    const body = tree.lastElementChild as HTMLElement;
    fireEvent.contextMenu(body);
    fireEvent.click(await screen.findByRole('menuitem', { name: '루트 추가' }));

    await waitFor(() => {
      expect(
        screen.getByRole('grid', { name: '공통코드 상세코드' }),
      ).toBeTruthy();
      expect(screen.getByText('선택 그룹이 없습니다')).toBeTruthy();
      expect(screen.queryByRole('gridcell', { name: '거래명세서' })).toBeNull();
      expect(screen.queryByTestId('f1-grid-loading-overlay')).toBeNull();
    });

    resolveItemLoad?.({ resultList: [] });
  });

  it('does not reload the detail rows when the same group is clicked again', async () => {
    const theme = createTheme();

    render(
      <ThemeProvider theme={theme}>
        <NotificationProvider>
          <DashboardContent
            selectedModule={{
              id: 'co',
              name: '기준정보',
              icon: null,
              tree: [],
              menus: [],
            }}
            currentMenuName="공통코드 관리"
            currentPageKey="cmncodes"
            breadcrumbItems={['기준정보', '공통코드 관리']}
            content={{
              title: '공통코드 관리',
              description: '공통코드를 그룹과 상세코드로 관리합니다.',
              cards: [],
              items: [],
            }}
            selectedMenuPermissions={{
              read: true,
              create: true,
              update: true,
              delete: true,
              excel: true,
            }}
          />
        </NotificationProvider>
      </ThemeProvider>,
    );

    await screen.findByRole('grid', { name: '공통코드 그룹 트리' });

    const firstGroupCell = await screen.findByRole('gridcell', {
      name: '첨부문서업무',
    });
    fireEvent.click(firstGroupCell);

    await waitFor(() => {
      const itemFetchCalls = apiMocks.apiGet.mock.calls.filter(
        (call) => call[0] === '/api/v1/co/master/common-code/groups/1/items',
      );
      expect(itemFetchCalls.length).toBe(1);
    });
  });

  it('reloads the selected group from the server after a successful save on the same group', async () => {
    apiMocks.apiPost.mockResolvedValue({ result: { success: true } });

    const theme = createTheme();

    render(
      <ThemeProvider theme={theme}>
        <NotificationProvider>
          <DashboardContent
            selectedModule={{
              id: 'co',
              name: '기준정보',
              icon: null,
              tree: [],
              menus: [],
            }}
            currentMenuName="공통코드 관리"
            currentPageKey="cmncodes"
            breadcrumbItems={['기준정보', '공통코드 관리']}
            content={{
              title: '공통코드 관리',
              description: '공통코드를 그룹과 상세코드로 관리합니다.',
              cards: [],
              items: [],
            }}
            selectedMenuPermissions={{
              read: true,
              create: true,
              update: true,
              delete: true,
              excel: true,
            }}
          />
        </NotificationProvider>
      </ThemeProvider>,
    );

    await screen.findByRole('grid', { name: '공통코드 그룹 트리' });

    const groupCell = await screen.findByRole('gridcell', {
      name: '첨부문서업무',
    });
    fireEvent.doubleClick(groupCell);
    const groupInput = await screen.findByDisplayValue('첨부문서업무');
    fireEvent.change(groupInput, { target: { value: '첨부문서업무 수정' } });
    fireEvent.keyDown(groupInput, { key: 'Enter', code: 'Enter' });

    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => {
      expect(apiMocks.apiPost).toHaveBeenCalledWith(
        '/api/v1/co/master/common-code/save-batch',
        expect.any(Object),
      );
    });

    await waitFor(() => {
      const itemFetchCalls = apiMocks.apiGet.mock.calls.filter(
        (call) => call[0] === '/api/v1/co/master/common-code/groups/1/items',
      );
      expect(itemFetchCalls.length).toBeGreaterThanOrEqual(2);
    });
  });
});

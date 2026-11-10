import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
import { CommonCodeManagementPage } from '../src/pages/co/master/common-code/CommonCodeManagementPage';

const apiMocks = vi.hoisted(() => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPut: vi.fn(),
  apiDelete: vi.fn(),
}));

const treeRefState = vi.hoisted(() => ({
  useRealTree: false,
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
      if (treeRefState.useRealTree) {
        return <actual.F1Tree {...props} ref={ref} />;
      }
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
  treeRefState.useRealTree = false;
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
  const pageSessionKey = 'songyeon-erp:page:common-code-management';
  let previousPageSession: string | null | undefined;

  afterEach(() => {
    if (previousPageSession === undefined) return;
    if (previousPageSession === null) {
      window.sessionStorage.removeItem(pageSessionKey);
    } else {
      window.sessionStorage.setItem(pageSessionKey, previousPageSession);
    }
    previousPageSession = undefined;
  });

  function renderRealPage() {
    previousPageSession = window.sessionStorage.getItem(pageSessionKey);
    window.sessionStorage.removeItem(pageSessionKey);
    treeRefState.useRealTree = true;
    return render(
      <ThemeProvider theme={createTheme()}>
        <NotificationProvider>
          <CommonCodeManagementPage
            selectedModule={{
              id: 'co',
              name: '기준정보',
              icon: null,
              tree: [],
              menus: [],
            }}
            currentMenuName="공통코드 관리"
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
  }

  async function editDetailName(value: string) {
    const cell = await screen.findByRole('gridcell', { name: '거래명세서' });
    fireEvent.doubleClick(cell);
    const input = await screen.findByDisplayValue('거래명세서');
    fireEvent.change(input, { target: { value } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '저장' })).toBeEnabled(),
    );
  }

  it('locks common-code editing through save and quiet refresh without hiding current rows', async () => {
    let resolveSave!: (value: unknown) => void;
    let resolveGroups!: (value: unknown) => void;
    let resolveItems!: (value: unknown) => void;
    apiMocks.apiPost.mockImplementation(
      () => new Promise((resolve) => { resolveSave = resolve; }),
    );
    const initialGet = apiMocks.apiGet.getMockImplementation()!;
    apiMocks.apiGet.mockImplementation((path: string) => {
      if (path === '/api/v1/co/master/common-code/groups') {
        return Promise.resolve({ resultList: [...commonCodeGroups].reverse() });
      }
      if (path === '/api/v1/co/master/common-code/groups/2/items') {
        return Promise.resolve({
          resultList: commonCodeItems.map((item) => ({ ...item, groupId: 2 })),
        });
      }
      return initialGet(path);
    });
    const { container } = renderRealPage();
    await editDetailName('거래명세서 수정');
    const originalGet = apiMocks.apiGet.getMockImplementation()!;
    apiMocks.apiGet.mockImplementation((path: string) => {
      if (path === '/api/v1/co/master/common-code/groups') {
        return new Promise((resolve) => { resolveGroups = resolve; });
      }
      if (path === '/api/v1/co/master/common-code/groups/2/items') {
        return new Promise((resolve) => { resolveItems = resolve; });
      }
      return originalGet(path);
    });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => expect(apiMocks.apiPost).toHaveBeenCalledTimes(1));

    const assertLocked = () => {
      const tree = screen.getByRole('grid', { name: '공통코드 그룹 트리' });
      const detail = screen.getByRole('grid', { name: '공통코드 상세코드' });
      expect(within(tree).getByRole('gridcell', { name: '첨부문서업무' })).toBeVisible();
      expect(within(detail).getByRole('gridcell', { name: '거래명세서 수정' })).toBeVisible();
      expect(screen.queryByTestId('f1-grid-loading-overlay')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: '저장' })).toBeDisabled();
      expect(screen.getByRole('button', { name: '조회', exact: true })).toBeDisabled();
      expect(screen.getByRole('textbox', { name: '공통코드 검색' })).toBeDisabled();
      const callsBefore = apiMocks.apiGet.mock.calls.length;
      const rowCount = within(detail).getAllByRole('row').length;
      const treeRowCount = within(tree).getAllByRole('row').length;
      const selectedRows = container.querySelectorAll('[data-grid-selected="true"]').length;
      fireEvent.mouseDown(within(tree).getByRole('gridcell', { name: '첨부문서업무' }), { button: 0 });
      fireEvent.click(within(tree).getByRole('gridcell', { name: '첨부문서업무' }));
      fireEvent.mouseDown(within(detail).getAllByRole('gridcell', { name: '사업자등록증' })[0], { button: 0 });
      fireEvent.focus(within(tree).getByRole('gridcell', { name: '첨부문서업무' }));
      for (const grid of [tree, detail]) {
        for (const key of ['Insert', 'Delete', 'F2']) {
          fireEvent.keyDown(grid, { key, code: key });
        }
        fireEvent.keyDown(grid, { key: 'd', code: 'KeyD', ctrlKey: true });
        fireEvent.contextMenu(grid.lastElementChild as HTMLElement);
      }
      fireEvent.doubleClick(within(detail).getByRole('gridcell', { name: '거래명세서 수정' }));
      fireEvent.doubleClick(within(tree).getByRole('gridcell', { name: '첨부문서업무' }));
      const parentCodeCell = within(detail).getAllByRole('row')[1]
        .querySelectorAll('[role="gridcell"]')[3];
      fireEvent.doubleClick(parentCodeCell);
      const useCheckbox = within(detail).getAllByRole('checkbox')[1];
      expect(useCheckbox).toBeDisabled();
      fireEvent.click(useCheckbox.closest('[role="gridcell"]') as HTMLElement);
      fireEvent.click(within(detail).getByRole('columnheader', { name: '사용여부' }));
      fireEvent.click(screen.getByRole('button', { name: '조회', exact: true }));
      fireEvent.keyDown(screen.getByRole('textbox', { name: '공통코드 검색' }), { key: 'Enter' });
      fireEvent.click(screen.getByRole('button', { name: '저장' }));
      expect(screen.queryByRole('menuitem', { name: /추가|삭제/ })).not.toBeInTheDocument();
      expect(screen.queryByDisplayValue('거래명세서 수정')).not.toBeInTheDocument();
      expect(screen.queryByDisplayValue('첨부문서업무')).not.toBeInTheDocument();
      expect(useCheckbox).toBeChecked();
      expect(within(detail).getAllByRole('row')).toHaveLength(rowCount);
      expect(within(tree).getAllByRole('row')).toHaveLength(treeRowCount);
      expect(container.querySelectorAll('[data-grid-selected="true"]')).toHaveLength(selectedRows);
      expect(apiMocks.apiGet).toHaveBeenCalledTimes(callsBefore);
      expect(apiMocks.apiPost).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    };
    assertLocked();
    await act(async () => { resolveSave({ result: { success: true } }); });
    await waitFor(() => expect(resolveGroups).toBeTypeOf('function'));
    assertLocked();
    await act(async () => { resolveGroups({ resultList: commonCodeGroups }); });
    await waitFor(() => expect(resolveItems).toBeTypeOf('function'));
    assertLocked();
    await act(async () => {
      resolveItems({
        resultList: commonCodeItems.map((item, index) =>
          index === 0
            ? { ...item, groupId: 2, itemNm: '저장된 거래명세서' }
            : { ...item, groupId: 2 },
        ),
      });
    });
    expect(await screen.findByRole('gridcell', { name: '저장된 거래명세서' })).toBeVisible();
    expect(screen.getByRole('button', { name: '조회', exact: true })).toBeEnabled();
    expect(screen.getByRole('textbox', { name: '공통코드 검색' })).toBeEnabled();
    fireEvent.doubleClick(screen.getByRole('gridcell', { name: '저장된 거래명세서' }));
    expect(await screen.findByDisplayValue('저장된 거래명세서')).toBeVisible();
  }, 15000);

  it.each(['save', 'group refresh', 'detail refresh'] as const)(
    'releases the common-code quiet-save lock after a %s failure',
    async (phase) => {
      let resolveSave!: (value: unknown) => void;
      let rejectRequest!: (error: Error) => void;
      apiMocks.apiPost.mockImplementation(
        () => new Promise((resolve, reject) => {
          resolveSave = resolve;
          if (phase === 'save') rejectRequest = reject;
        }),
      );
      renderRealPage();
      await editDetailName('실패 후 유지할 수정');
      const originalGet = apiMocks.apiGet.getMockImplementation()!;
      apiMocks.apiGet.mockImplementation((path: string) => {
        if (
          (phase === 'group refresh' && path === '/api/v1/co/master/common-code/groups') ||
          (phase === 'detail refresh' && path === '/api/v1/co/master/common-code/groups/1/items')
        ) {
          return new Promise((_resolve, reject) => { rejectRequest = reject; });
        }
        return originalGet(path);
      });
      fireEvent.click(screen.getByRole('button', { name: '저장' }));
      await waitFor(() => expect(apiMocks.apiPost).toHaveBeenCalledTimes(1));
      if (phase !== 'save') {
        await act(async () => { resolveSave({ result: { success: true } }); });
      }
      await waitFor(() => expect(rejectRequest).toBeTypeOf('function'));
      expect(screen.getByRole('button', { name: '조회', exact: true })).toBeDisabled();
      expect(screen.queryByTestId('f1-grid-loading-overlay')).not.toBeInTheDocument();
      await act(async () => { rejectRequest(new Error(`${phase} failed`)); });
      expect((await screen.findAllByText(`${phase} failed`)).length).toBeGreaterThan(0);
      expect(screen.getByRole('button', { name: '조회', exact: true })).toBeEnabled();
      expect(screen.getByRole('textbox', { name: '공통코드 검색' })).toBeEnabled();
      if (phase === 'save') {
        expect(screen.getByRole('gridcell', { name: '실패 후 유지할 수정' })).toBeVisible();
        expect(screen.getByRole('button', { name: '저장' })).toBeEnabled();
        apiMocks.apiPost.mockResolvedValue({ result: { success: true } });
        fireEvent.click(screen.getByRole('button', { name: '저장' }));
        await waitFor(() => expect(apiMocks.apiPost).toHaveBeenCalledTimes(2));
        expect(apiMocks.apiPost.mock.calls[1][1].items.updatedRows[0].itemNm).toBe('실패 후 유지할 수정');
        await waitFor(() =>
          expect(screen.getByRole('button', { name: '조회', exact: true })).toBeEnabled(),
        );
      }
    },
    15000,
  );

  it('retains details and reports failure without success notification when quiet detail refresh rejects', async () => {
    let resolveSave!: (value: unknown) => void;
    let rejectRefresh!: (error: Error) => void;
    apiMocks.apiPost.mockImplementation(
      () => new Promise((resolve) => { resolveSave = resolve; }),
    );
    renderRealPage();
    await editDetailName('재조회 실패 후 유지할 상세');
    const originalGet = apiMocks.apiGet.getMockImplementation()!;
    apiMocks.apiGet.mockImplementation((path: string) => {
      if (path === '/api/v1/co/master/common-code/groups/1/items') {
        return new Promise((_resolve, reject) => { rejectRefresh = reject; });
      }
      return originalGet(path);
    });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => expect(apiMocks.apiPost).toHaveBeenCalledTimes(1));
    await act(async () => { resolveSave({ result: { success: true } }); });
    await waitFor(() => expect(rejectRefresh).toBeTypeOf('function'));
    expect(screen.getByRole('gridcell', { name: '재조회 실패 후 유지할 상세' })).toBeVisible();
    expect(screen.getByRole('button', { name: '조회', exact: true })).toBeDisabled();
    expect(screen.queryByTestId('f1-grid-loading-overlay')).not.toBeInTheDocument();

    await act(async () => { rejectRefresh(new Error('상세 재조회 실패')); });

    expect((await screen.findAllByText('상세 재조회 실패'))[0]).toBeVisible();
    expect(screen.getByRole('grid', { name: '공통코드 상세코드' })).toBeVisible();
    expect(screen.getByRole('gridcell', { name: '재조회 실패 후 유지할 상세' })).toBeVisible();
    expect(screen.getAllByRole('gridcell', { name: '사업자등록증' })).toHaveLength(2);
    expect(screen.queryByText('공통코드를 저장했습니다.')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '조회', exact: true })).toBeEnabled();
    expect(screen.getByRole('textbox', { name: '공통코드 검색' })).toBeEnabled();
    fireEvent.doubleClick(screen.getByRole('gridcell', { name: '재조회 실패 후 유지할 상세' }));
    expect(await screen.findByDisplayValue('재조회 실패 후 유지할 상세')).toBeVisible();
  }, 15000);

  it('does not resubmit a saved detail insert after quiet refresh failure and a new edit', async () => {
    let rejectRefresh!: (error: Error) => void;
    renderRealPage();
    await screen.findByRole('gridcell', { name: '거래명세서' });
    const detail = screen.getByRole('grid', { name: '공통코드 상세코드' });
    fireEvent.contextMenu(detail.lastElementChild as HTMLElement);
    fireEvent.click(await screen.findByRole('menuitem', { name: '행 추가' }));
    const newRow = within(detail).getAllByRole('row').at(-1)!;
    const nameCell = within(newRow).getAllByRole('gridcell')[2];
    fireEvent.doubleClick(nameCell);
    const input = within(newRow).getByRole('textbox');
    fireEvent.change(input, { target: { value: '새 상세코드' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    apiMocks.apiPost.mockResolvedValue({
      item: {
        groups: [],
        items: [{
          ...commonCodeItems[0],
          commonCodeItemId: 12,
          itemCode: 'NEW_DETAIL',
          itemNm: '새 상세코드',
        }],
      },
    });
    const originalGet = apiMocks.apiGet.getMockImplementation()!;
    apiMocks.apiGet.mockImplementation((path: string) => {
      if (path === '/api/v1/co/master/common-code/groups/1/items') {
        return new Promise((_resolve, reject) => { rejectRefresh = reject; });
      }
      return originalGet(path);
    });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => expect(rejectRefresh).toBeTypeOf('function'));
    expect(apiMocks.apiPost.mock.calls[0][1].items.insertedRows).toHaveLength(1);
    await act(async () => { rejectRefresh(new Error('저장 후 재조회 실패')); });
    expect((await screen.findAllByText('저장 후 재조회 실패'))[0]).toBeVisible();
    expect(screen.getByRole('gridcell', { name: '새 상세코드' })).toBeVisible();
    expect(screen.queryByText('공통코드를 저장했습니다.')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '조회', exact: true })).toBeEnabled();
    expect(screen.getByRole('button', { name: '저장' })).toBeDisabled();

    expect(screen.getByRole('gridcell', { name: 'NEW_DETAIL' })).toBeVisible();
    fireEvent.doubleClick(screen.getByRole('gridcell', { name: '새 상세코드' }));
    const savedInput = await screen.findByDisplayValue('새 상세코드');
    fireEvent.change(savedInput, { target: { value: '두 번째 저장 수정' } });
    fireEvent.keyDown(savedInput, { key: 'Enter', code: 'Enter' });
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '저장' })).toBeEnabled(),
    );
    apiMocks.apiGet.mockImplementation(originalGet);
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => expect(apiMocks.apiPost).toHaveBeenCalledTimes(2));
    expect(apiMocks.apiPost.mock.calls[1][1].items.insertedRows).toEqual([]);
    expect(apiMocks.apiPost.mock.calls[1][1].items.updatedRows).toEqual([
      expect.objectContaining({ id: '12', itemNm: '두 번째 저장 수정' }),
    ]);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '조회', exact: true })).toBeEnabled(),
    );
  }, 15000);

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

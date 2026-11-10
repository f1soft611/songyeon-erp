import { createRef } from 'react';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardContent } from '../src/pages/dashboard/components/DashboardContent';
import { NotificationProvider } from '../src/shared/context/NotificationContext';
import {
  createDraftFormColumns,
  DraftFormGrid,
} from '../src/pages/co/workflow/form/components/DraftFormGrid';
import { fetchDraftFormUsers } from '../src/pages/co/workflow/form/services/draftFormManagement.service';
import { F1Grid, type F1GridRef } from '../src/shared/components/f1-grid';
import type { DraftFormRow } from '../src/pages/co/workflow/form/types/draftFormManagement.types';

const apiMocks = vi.hoisted(() => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPut: vi.fn(),
}));

vi.mock('../src/shared/services/apiClient', () => apiMocks);

beforeEach(() => {
  vi.clearAllMocks();
  window.sessionStorage.clear();
  apiMocks.apiGet.mockImplementation((path: string) => {
    if (path === '/api/v1/co/master/common-code/groups') {
      return Promise.resolve({
        resultList: [
          {
            commonCodeGroupId: 11,
            groupCode: 'WF_FORM_CATEGORY',
            groupNm: '기안양식 분류',
            useAt: 'Y',
          },
          {
            commonCodeGroupId: 12,
            groupCode: 'WF_FORM_CYCLE',
            groupNm: '기안양식 등록주기',
            useAt: 'Y',
          },
        ],
      });
    }
    if (path === '/api/v1/co/master/common-code/groups/11/items') {
      return Promise.resolve({
        resultList: [
          {
            commonCodeItemId: 101,
            groupId: 11,
            itemCode: 'INSPECTION',
            itemNm: '점검',
            sortOrder: 10,
            useAt: 'Y',
          },
        ],
      });
    }
    if (path === '/api/v1/co/master/common-code/groups/12/items') {
      return Promise.resolve({
        resultList: [
          {
            commonCodeItemId: 201,
            groupId: 12,
            itemCode: 'MONTH',
            itemNm: '월',
            sortOrder: 30,
            useAt: 'Y',
          },
        ],
      });
    }
    if (path === '/api/v1/co/workflow/forms/users') {
      return Promise.resolve({
        resultList: [
          {
            userId: '00000110',
            loginId: '00000110',
            userNm: '홍길동',
            departmentNm: '운영팀',
          },
        ],
      });
    }
    return Promise.resolve({ resultList: [] });
  });
});

describe('Draft form management page', () => {
  it('hides Excel export when the grid does not have Excel permission', async () => {
    render(
      <DraftFormGrid
        rows={[]}
        columns={[]}
        canCreate={false}
        canUpdate={false}
        canExportExcel={false}
        saving={false}
        loading={false}
        gridKey={0}
        gridRef={createRef<F1GridRef<DraftFormRow>>()}
        onChangesChange={vi.fn()}
      />,
    );
    fireEvent.contextMenu(
      await screen.findByRole('grid', { name: '기안양식 목록' }),
    );

    const menu = await screen.findByRole('menu');
    expect(
      within(menu).queryByRole('menuitem', { name: '엑셀 내보내기' }),
    ).not.toBeInTheDocument();
  });

  it('shows Excel export when the grid has Excel permission', async () => {
    render(
      <DraftFormGrid
        rows={[]}
        columns={[]}
        canCreate={false}
        canUpdate={false}
        canExportExcel
        saving={false}
        loading={false}
        gridKey={0}
        gridRef={createRef<F1GridRef<DraftFormRow>>()}
        onChangesChange={vi.fn()}
      />,
    );
    fireEvent.contextMenu(
      await screen.findByRole('grid', { name: '기안양식 목록' }),
    );

    const menu = await screen.findByRole('menu');
    expect(
      within(menu).getByRole('menuitem', { name: '엑셀 내보내기' }),
    ).toBeInTheDocument();
  });

  it('blocks applying an open draft row form while saving', async () => {
    const row: DraftFormRow = {
      draftingWorkCategoryId: 71,
      cataTypeCode: '007',
      codeName: '정기점검',
      categoryItemId: 101,
      categoryName: '점검',
      regTermId: 201,
      regTerm: '월',
      reviewerId: null,
      reviewerName: '',
      approverId: null,
      approverName: '',
      assigneeIds: [],
      assigneeSummary: '-',
      createdByName: '관리자',
      createdAt: '2026-10-01 09:00',
      hasDocument: false,
      useAt: 'Y',
    };
    const onChangesChange = vi.fn();
    const props = {
      rows: [row],
      columns: createDraftFormColumns(
        [
          {
            id: '101',
            groupId: '11',
            itemCode: 'INSPECTION',
            itemNm: '점검',
            parentItemId: null,
            parentItemNm: '',
            sortOrder: 10,
            useAt: 'Y',
            itemDc: '',
          },
        ],
        [
          {
            id: '201',
            groupId: '12',
            itemCode: 'MONTH',
            itemNm: '월',
            parentItemId: null,
            parentItemNm: '',
            sortOrder: 30,
            useAt: 'Y',
            itemDc: '',
          },
        ],
        [],
        true,
      ),
      canCreate: true,
      canUpdate: true,
      canExportExcel: false,
      saving: false,
      loading: false,
      gridKey: 0,
      gridRef: createRef<F1GridRef<DraftFormRow>>(),
      onChangesChange,
    };
    const { rerender } = render(<DraftFormGrid {...props} />);

    fireEvent.click(
      await screen.findByRole('button', { name: '71 행 정보 수정' }),
    );
    const formDialog = await screen.findByRole('dialog', {
      name: '기안양식 수정',
    });
    fireEvent.change(
      within(formDialog).getByRole('textbox', { name: '양식명' }),
      { target: { value: '저장 중 변경 시도' } },
    );

    rerender(
      <DraftFormGrid
        {...props}
        canCreate={false}
        canUpdate={false}
        saving
      />,
    );
    fireEvent.click(within(formDialog).getByRole('button', { name: '적용' }));

    expect(
      onChangesChange.mock.calls.some(
        ([changes]) => changes.updatedRows.length > 0,
      ),
    ).toBe(false);
    expect(screen.getByRole('gridcell', { name: '정기점검' })).toBeVisible();
    expect(
      screen.queryByRole('gridcell', { name: '저장 중 변경 시도' }),
    ).not.toBeInTheDocument();
  });

  it('defines each F1-Grid data column field once with row numbering first', () => {
    const columns = createDraftFormColumns([], [], [], true);
    const fields = columns.map((column) => String(column.field));

    expect(fields[0]).toBe('draftingWorkCategoryId');
    expect(columns[0].type).toBe('rownumber');
    expect(new Set(fields).size).toBe(fields.length);
  });

  it('normalizes optional profile and level fields from the user API', async () => {
    apiMocks.apiGet.mockResolvedValueOnce({
      resultList: [
        {
          userId: '00000110',
          loginId: '00000110',
          userNm: '홍길동',
          departmentNm: '운영팀',
          profileImage: '/profiles/fixture.png',
          levelNm: '부장',
        },
      ],
    });

    await expect(fetchDraftFormUsers()).resolves.toEqual([
      {
        userId: '00000110',
        loginId: '00000110',
        userNm: '홍길동',
        departmentNm: '운영팀',
        profileImage: '/profiles/fixture.png',
        levelNm: '부장',
      },
    ]);
  });

  it('maps reviewer, approver, and assignee IDs into user column options', () => {
    const columns = createDraftFormColumns(
      [],
      [],
      [
        {
          userId: '00000110',
          loginId: '00000110',
          userNm: '홍길동',
          departmentNm: '운영팀',
          profileImage: '/profiles/fixture.png',
          levelNm: '부장',
        },
      ],
      true,
    );
    const reviewer = columns.find((column) => column.field === 'reviewerId');
    const approver = columns.find((column) => column.field === 'approverId');
    const assignee = columns.find((column) => column.field === 'assigneeIds');

    expect(reviewer?.type).toBe('user');
    expect(reviewer?.userOptions).toEqual([
      {
        value: '00000110',
        label: '홍길동',
        avatarUrl: '/profiles/fixture.png',
        positionName: '부장',
        departmentName: '운영팀',
      },
    ]);
    expect(approver?.type).toBe('user');
    expect(approver?.userOptions?.[0].value).toBe('00000110');
    expect(assignee?.type).toBe('user');
    expect(assignee?.userOptions?.[0].value).toBe('00000110');
    expect(assignee?.form?.multiple).toBe(true);
  });

  it('applies a selected reviewer to the draft form grid row', async () => {
    const users = [
      {
        userId: '00000110',
        loginId: '00000110',
        userNm: '홍길동',
        departmentNm: '운영팀',
        profileImage: null,
        levelNm: '부장',
      },
      {
        userId: '00000111',
        loginId: '00000111',
        userNm: '김민지',
        departmentNm: '기획팀',
        profileImage: null,
        levelNm: '과장',
      },
    ];
    const row: DraftFormRow = {
      draftingWorkCategoryId: 1,
      cataTypeCode: '007',
      codeName: '정기점검',
      categoryItemId: 101,
      categoryName: '점검',
      regTermId: 201,
      regTerm: '월',
      reviewerId: '00000110',
      reviewerName: '홍길동',
      approverId: null,
      approverName: '',
      assigneeIds: [],
      assigneeSummary: '',
      createdByName: '홍길동',
      createdAt: '2026-10-01 09:00',
      hasDocument: false,
      useAt: 'Y',
    };
    const onChangesChange = vi.fn();

    render(
      <F1Grid
        rows={[row]}
        columns={createDraftFormColumns([], [], users, true)}
        rowKey="draftingWorkCategoryId"
        onChangesChange={onChangesChange}
      />,
    );

    fireEvent.doubleClick(
      screen.getByRole('gridcell', { name: '홍길동 (운영팀)' }),
    );
    const userOption = await screen.findByRole('option', { name: /김민지/ });
    fireEvent.mouseDown(userOption);
    fireEvent.mouseUp(userOption);
    fireEvent.click(userOption);

    expect(
      await screen.findByRole('gridcell', { name: '김민지 (기획팀)' }),
    ).toBeInTheDocument();
    await waitFor(() => expect(onChangesChange).toHaveBeenCalled());
    expect(onChangesChange.mock.lastCall?.[0].updatedRows).toEqual([
      expect.objectContaining({ reviewerId: '00000111' }),
    ]);
  });

  it('renders from the co/form dashboard route with one unified search field', async () => {
    render(
      <ThemeProvider theme={createTheme()}>
        <NotificationProvider>
          <DashboardContent
            selectedModule={{
              id: 'co',
              name: '기준정보',
              icon: null,
              tree: [],
              menus: [],
            }}
            currentMenuName="기안양식관리"
            currentPageKey="form"
            breadcrumbItems={['기준정보', '전자결재관리', '기안양식관리']}
            content={{
              title: '기안양식관리',
              description: '기안양식 기준정보를 관리합니다.',
              cards: [],
              items: [],
            }}
            selectedMenuPermissions={{
              read: true,
              create: true,
              update: true,
              delete: false,
            }}
          />
        </NotificationProvider>
      </ThemeProvider>,
    );

    expect(
      await screen.findByRole('textbox', { name: '기안양식 검색' }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('textbox')).toHaveLength(1);

    const grid = screen.getByRole('grid', { name: '기안양식 목록' });
    expect(grid.parentElement).toHaveStyle({
      paddingTop: '8px',
      paddingRight: '8px',
      paddingBottom: '8px',
      paddingLeft: '8px',
    });
  });

  it('clears the unified search query from its clear action', async () => {
    render(
      <ThemeProvider theme={createTheme()}>
        <NotificationProvider>
          <DashboardContent
            selectedModule={{
              id: 'co',
              name: '기준정보',
              icon: null,
              tree: [],
              menus: [],
            }}
            currentMenuName="기안양식관리"
            currentPageKey="form"
            breadcrumbItems={['기준정보', '전자결재관리', '기안양식관리']}
            content={{
              title: '기안양식관리',
              description: '기안양식 기준정보를 관리합니다.',
              cards: [],
              items: [],
            }}
            selectedMenuPermissions={{
              read: true,
              create: true,
              update: true,
              delete: false,
            }}
            isTenantAdmin
          />
        </NotificationProvider>
      </ThemeProvider>,
    );

    const searchInput = await screen.findByRole('textbox', {
      name: '기안양식 검색',
    });
    fireEvent.change(searchInput, { target: { value: '점검' } });
    fireEvent.click(
      screen.getByRole('button', { name: '기안양식 검색어 초기화' }),
    );

    expect(searchInput).toHaveValue('');
  });

  it('creates detailed search fields from grid metadata', async () => {
    render(
      <ThemeProvider theme={createTheme()}>
        <NotificationProvider>
          <DashboardContent
            selectedModule={{
              id: 'co',
              name: '기준정보',
              icon: null,
              tree: [],
              menus: [],
            }}
            currentMenuName="기안양식관리"
            currentPageKey="form"
            breadcrumbItems={['기준정보', '전자결재관리', '기안양식관리']}
            content={{
              title: '기안양식관리',
              description: '기안양식 기준정보를 관리합니다.',
              cards: [],
              items: [],
            }}
            selectedMenuPermissions={{
              read: true,
              create: true,
              update: true,
              delete: false,
            }}
            isTenantAdmin
          />
        </NotificationProvider>
      </ThemeProvider>,
    );

    await screen.findByRole('textbox', { name: '기안양식 검색' });
    fireEvent.click(screen.getByRole('button', { name: '상세 검색 열기' }));

    expect(screen.getByRole('combobox', { name: '분류' })).toBeInTheDocument();
    expect(
      screen.getByRole('combobox', { name: '등록주기' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('combobox', { name: '사용여부' }),
    ).toBeInTheDocument();
  });

  it('restores the executed draft-form search from the tab session', async () => {
    window.sessionStorage.setItem(
      'songyeon-erp:page:draft-form-management',
      JSON.stringify({
        version: 1,
        value: {
          keyword: '점검',
          detailValues: { categoryItemId: '101', useAt: 'Y' },
        },
      }),
    );
    render(
      <ThemeProvider theme={createTheme()}>
        <NotificationProvider>
          <DashboardContent
            selectedModule={{
              id: 'co',
              name: '기준정보',
              icon: null,
              tree: [],
              menus: [],
            }}
            currentMenuName="기안양식관리"
            currentPageKey="form"
            breadcrumbItems={['기준정보', '전자결재관리', '기안양식관리']}
            content={{
              title: '기안양식관리',
              description: '기안양식 기준정보를 관리합니다.',
              cards: [],
              items: [],
            }}
            selectedMenuPermissions={{
              read: true,
              create: true,
              update: true,
              delete: false,
            }}
            isTenantAdmin
          />
        </NotificationProvider>
      </ThemeProvider>,
    );

    expect(await screen.findByRole('textbox', { name: '기안양식 검색' })).toHaveValue('점검');
    await waitFor(() =>
      expect(apiMocks.apiGet).toHaveBeenCalledWith(
        '/api/v1/co/workflow/forms?keyword=%EC%A0%90%EA%B2%80&categoryItemId=101&useAt=Y',
      ),
    );
    const toggle = screen.getByRole('button', { name: '상세 검색 열기' });
    expect(toggle).toHaveAttribute('aria-description', '적용된 상세 검색 조건 2개');
    fireEvent.click(toggle);
    expect(screen.getByRole('combobox', { name: '분류' })).toHaveTextContent('점검');
    expect(screen.getByRole('combobox', { name: '사용여부' })).toHaveTextContent('사용');
  });

  it('opens the classification helper without navigating away from the page', async () => {
    render(
      <ThemeProvider theme={createTheme()}>
        <NotificationProvider>
          <DashboardContent
            selectedModule={{
              id: 'co',
              name: '기준정보',
              icon: null,
              tree: [],
              menus: [],
            }}
            currentMenuName="기안양식관리"
            currentPageKey="form"
            breadcrumbItems={['기준정보', '전자결재관리', '기안양식관리']}
            content={{
              title: '기안양식관리',
              description: '기안양식 기준정보를 관리합니다.',
              cards: [],
              items: [],
            }}
            selectedMenuPermissions={{
              read: true,
              create: true,
              update: true,
              delete: false,
            }}
            isTenantAdmin
          />
        </NotificationProvider>
      </ThemeProvider>,
    );

    await screen.findByRole('textbox', { name: '기안양식 검색' });
    fireEvent.click(screen.getAllByRole('button', { name: '분류 설정' })[0]);

    expect(
      await screen.findByRole('dialog', { name: '기안양식 분류 설정' }),
    ).toBeInTheDocument();
  });

  it('waits for classification options before showing the empty notice', async () => {
    const originalApiGet = apiMocks.apiGet.getMockImplementation();
    let resolveCategoryItems: ((value: unknown) => void) | undefined;
    apiMocks.apiGet.mockImplementation((path: string) => {
      if (path === '/api/v1/co/master/common-code/groups/11/items') {
        return new Promise((resolve) => {
          resolveCategoryItems = resolve;
        });
      }
      return originalApiGet?.(path);
    });

    render(
      <ThemeProvider theme={createTheme()}>
        <NotificationProvider>
          <DashboardContent
            selectedModule={{
              id: 'co',
              name: '기준정보',
              icon: null,
              tree: [],
              menus: [],
            }}
            currentMenuName="기안양식관리"
            currentPageKey="form"
            breadcrumbItems={['기준정보', '전자결재관리', '기안양식관리']}
            content={{
              title: '기안양식관리',
              description: '기안양식 기준정보를 관리합니다.',
              cards: [],
              items: [],
            }}
            selectedMenuPermissions={{
              read: true,
              create: true,
              update: true,
              delete: false,
            }}
            isTenantAdmin
          />
        </NotificationProvider>
      </ThemeProvider>,
    );

    await screen.findByRole('textbox', { name: '기안양식 검색' });
    expect(
      screen.queryByText(
        '분류 항목이 없습니다. 분류를 추가한 뒤 기안양식을 등록할 수 있습니다.',
      ),
    ).not.toBeInTheDocument();

    resolveCategoryItems?.({ resultList: [] });
    expect(
      await screen.findByText(
        '분류 항목이 없습니다. 분류를 추가한 뒤 기안양식을 등록할 수 있습니다.',
      ),
    ).toBeInTheDocument();
  });

  it('validates required classification values before calling the create API', async () => {
    render(
      <ThemeProvider theme={createTheme()}>
        <NotificationProvider>
          <DashboardContent
            selectedModule={{
              id: 'co',
              name: '기준정보',
              icon: null,
              tree: [],
              menus: [],
            }}
            currentMenuName="기안양식관리"
            currentPageKey="form"
            breadcrumbItems={['기준정보', '전자결재관리', '기안양식관리']}
            content={{
              title: '기안양식관리',
              description: '기안양식 기준정보를 관리합니다.',
              cards: [],
              items: [],
            }}
            selectedMenuPermissions={{
              read: true,
              create: true,
              update: true,
              delete: false,
            }}
            isTenantAdmin
          />
        </NotificationProvider>
      </ThemeProvider>,
    );

    fireEvent.click(await screen.findByRole('button', { name: '분류 설정' }));
    const dialog = await screen.findByRole('dialog', {
      name: '기안양식 분류 설정',
    });
    fireEvent.click(within(dialog).getByRole('button', { name: '분류 추가' }));
    fireEvent.click(within(dialog).getByRole('button', { name: '저장' }));

    expect(
      await within(dialog).findByText('필수 입력 항목을 확인해 주세요.'),
    ).toBeInTheDocument();
    expect(apiMocks.apiPost).not.toHaveBeenCalled();
    expect(screen.getAllByText('필수 입력 항목을 확인해 주세요.')).toHaveLength(
      1,
    );
  });

  it('keeps classification save errors inside the helper dialog', async () => {
    apiMocks.apiPut.mockRejectedValue(new Error('분류 저장 실패'));
    render(
      <ThemeProvider theme={createTheme()}>
        <NotificationProvider>
          <DashboardContent
            selectedModule={{
              id: 'co',
              name: '기준정보',
              icon: null,
              tree: [],
              menus: [],
            }}
            currentMenuName="기안양식관리"
            currentPageKey="form"
            breadcrumbItems={['기준정보', '전자결재관리', '기안양식관리']}
            content={{
              title: '기안양식관리',
              description: '기안양식 기준정보를 관리합니다.',
              cards: [],
              items: [],
            }}
            selectedMenuPermissions={{
              read: true,
              create: true,
              update: true,
              delete: false,
            }}
            isTenantAdmin
          />
        </NotificationProvider>
      </ThemeProvider>,
    );

    fireEvent.click(await screen.findByRole('button', { name: '분류 설정' }));
    const dialog = await screen.findByRole('dialog', {
      name: '기안양식 분류 설정',
    });
    fireEvent.doubleClick(
      within(dialog).getByRole('gridcell', { name: '점검' }),
    );
    const editor = within(dialog).getByDisplayValue('점검');
    fireEvent.change(editor, { target: { value: '정기점검' } });
    fireEvent.keyDown(editor, { key: 'Enter', code: 'Enter' });
    fireEvent.click(within(dialog).getByRole('button', { name: '저장' }));

    expect(
      await within(dialog).findByText('분류 저장 실패'),
    ).toBeInTheDocument();
    expect(screen.getAllByText('분류 저장 실패')).toHaveLength(1);
  });

  it('keeps the form grid quiet while classification save reloads its rows', async () => {
    const sourceRow = {
      draftingWorkCategoryId: 71,
      cataTypeCode: '007',
      codeName: '정기점검',
      categoryItemId: 101,
      categoryName: '점검',
      regTermId: 201,
      regTerm: '월',
      reviewerId: null,
      reviewerName: '',
      approverId: null,
      approverName: '',
      assigneeIds: [],
      assigneeSummary: '-',
      createdByName: '관리자',
      createdAt: '2026-10-01 09:00',
      hasDocument: false,
      useAt: 'Y',
    };
    const originalApiGet = apiMocks.apiGet.getMockImplementation();
    let formRequestCount = 0;
    let resolveReload: ((value: unknown) => void) | undefined;
    apiMocks.apiGet.mockImplementation((path: string) => {
      if (path !== '/api/v1/co/workflow/forms') {
        return originalApiGet?.(path);
      }
      formRequestCount += 1;
      if (formRequestCount === 1) {
        return Promise.resolve({ resultList: [sourceRow] });
      }
      return new Promise((resolve) => {
        resolveReload = resolve;
      });
    });
    apiMocks.apiPut.mockResolvedValue({});

    render(
      <ThemeProvider theme={createTheme()}>
        <NotificationProvider>
          <DashboardContent
            selectedModule={{
              id: 'co',
              name: '기준정보',
              icon: null,
              tree: [],
              menus: [],
            }}
            currentMenuName="기안양식관리"
            currentPageKey="form"
            breadcrumbItems={['기준정보', '전자결재관리', '기안양식관리']}
            content={{
              title: '기안양식관리',
              description: '기안양식 기준정보를 관리합니다.',
              cards: [],
              items: [],
            }}
            selectedMenuPermissions={{
              read: true,
              create: true,
              update: true,
              delete: false,
            }}
            isTenantAdmin
          />
        </NotificationProvider>
      </ThemeProvider>,
    );

    expect(
      await screen.findByRole('gridcell', { name: '정기점검' }),
    ).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '분류 설정' }));
    const categoryDialog = await screen.findByRole('dialog', {
      name: '기안양식 분류 설정',
    });
    fireEvent.doubleClick(
      within(categoryDialog).getByRole('gridcell', { name: '점검' }),
    );
    const categoryEditor = within(categoryDialog).getByDisplayValue('점검');
    fireEvent.change(categoryEditor, { target: { value: '정기점검 분류' } });
    fireEvent.keyDown(categoryEditor, { key: 'Enter', code: 'Enter' });
    fireEvent.click(
      within(categoryDialog).getByRole('button', { name: '저장' }),
    );

    await waitFor(() => expect(apiMocks.apiPut).toHaveBeenCalled());
    await waitFor(() => expect(formRequestCount).toBe(2));
    expect(
      screen.queryByTestId('f1-grid-loading-overlay'),
    ).not.toBeInTheDocument();

    resolveReload?.({ resultList: [sourceRow] });
    await waitFor(() =>
      expect(screen.getByText('공통코드를 저장했습니다.')).toBeInTheDocument(),
    );
    expect(
      screen.queryByTestId('f1-grid-loading-overlay'),
    ).not.toBeInTheDocument();
  });

  it('shows the missing-category callout in the shared info message area', async () => {
    const originalApiGet = apiMocks.apiGet.getMockImplementation();
    apiMocks.apiGet.mockImplementation((path: string) =>
      path === '/api/v1/co/master/common-code/groups/11/items'
        ? Promise.resolve({ resultList: [] })
        : originalApiGet?.(path),
    );

    render(
      <ThemeProvider theme={createTheme()}>
        <NotificationProvider>
          <DashboardContent
            selectedModule={{
              id: 'co',
              name: '기준정보',
              icon: null,
              tree: [],
              menus: [],
            }}
            currentMenuName="기안양식관리"
            currentPageKey="form"
            breadcrumbItems={['기준정보', '전자결재관리', '기안양식관리']}
            content={{
              title: '기안양식관리',
              description: '기안양식 기준정보를 관리합니다.',
              cards: [],
              items: [],
            }}
            selectedMenuPermissions={{
              read: true,
              create: true,
              update: true,
              delete: false,
            }}
            isTenantAdmin
          />
        </NotificationProvider>
      </ThemeProvider>,
    );

    const message = await screen.findByRole('alert');
    expect(message).toHaveTextContent('분류 항목이 없습니다.');
    expect(message).toHaveClass('MuiAlert-colorInfo');
    expect(screen.getByRole('button', { name: '양식 추가' })).toBeDisabled();
  });

  it('opens the F1-Grid create form for a create-only menu permission', async () => {
    render(
      <ThemeProvider theme={createTheme()}>
        <NotificationProvider>
          <DashboardContent
            selectedModule={{
              id: 'co',
              name: '기준정보',
              icon: null,
              tree: [],
              menus: [],
            }}
            currentMenuName="기안양식관리"
            currentPageKey="form"
            breadcrumbItems={['기준정보', '전자결재관리', '기안양식관리']}
            content={{
              title: '기안양식관리',
              description: '기안양식 기준정보를 관리합니다.',
              cards: [],
              items: [],
            }}
            selectedMenuPermissions={{
              read: true,
              create: true,
              update: false,
              delete: false,
            }}
            isTenantAdmin
          />
        </NotificationProvider>
      </ThemeProvider>,
    );

    fireEvent.click(await screen.findByRole('button', { name: '양식 추가' }));

    expect(
      await screen.findByRole('dialog', { name: '기안양식 등록' }),
    ).toBeInTheDocument();
  });

  it('asks before refreshing a dirty grid and keeps the unsaved row when canceled', async () => {
    render(
      <ThemeProvider theme={createTheme()}>
        <NotificationProvider>
          <DashboardContent
            selectedModule={{
              id: 'co',
              name: '기준정보',
              icon: null,
              tree: [],
              menus: [],
            }}
            currentMenuName="기안양식관리"
            currentPageKey="form"
            breadcrumbItems={['기준정보', '전자결재관리', '기안양식관리']}
            content={{
              title: '기안양식관리',
              description: '기안양식 기준정보를 관리합니다.',
              cards: [],
              items: [],
            }}
            selectedMenuPermissions={{
              read: true,
              create: true,
              update: true,
              delete: false,
            }}
            isTenantAdmin
          />
        </NotificationProvider>
      </ThemeProvider>,
    );

    const initialListCallCount = apiMocks.apiGet.mock.calls.filter(
      ([path]) => path === '/api/v1/co/workflow/forms',
    ).length;
    fireEvent.click(await screen.findByRole('button', { name: '양식 추가' }));
    const formDialog = await screen.findByRole('dialog', {
      name: '기안양식 등록',
    });
    fireEvent.change(
      within(formDialog).getByRole('textbox', { name: '구분명' }),
      { target: { value: '미저장 양식' } },
    );
    fireEvent.mouseDown(
      within(formDialog).getByRole('combobox', { name: '분류' }),
    );
    fireEvent.click(await screen.findByRole('option', { name: '점검' }));
    fireEvent.mouseDown(
      within(formDialog).getByRole('combobox', { name: '등록주기' }),
    );
    fireEvent.click(await screen.findByRole('option', { name: '월' }));
    fireEvent.click(within(formDialog).getByRole('button', { name: '적용' }));

    fireEvent.click(screen.getByRole('button', { name: '조회' }));

    expect(
      await screen.findByRole('dialog', { name: '저장하지 않은 변경사항' }),
    ).toHaveTextContent(
      '변경사항을 버리고 기안양식 목록을 다시 불러오시겠습니까?',
    );
    fireEvent.click(screen.getByRole('button', { name: '취소' }));

    expect(
      await screen.findByRole('gridcell', { name: '미저장 양식' }),
    ).toBeVisible();
    expect(
      apiMocks.apiGet.mock.calls.filter(
        ([path]) => path === '/api/v1/co/workflow/forms',
      ),
    ).toHaveLength(initialListCallCount);

    fireEvent.click(screen.getByRole('button', { name: '상세 검색 열기' }));
    const detailDialog = await screen.findByRole('dialog', {
      name: '상세 검색',
    });
    fireEvent.mouseDown(
      within(detailDialog).getByRole('combobox', { name: '분류' }),
    );
    fireEvent.click(await screen.findByRole('option', { name: '점검' }));
    fireEvent.click(within(detailDialog).getByRole('button', { name: '조회' }));

    expect(
      await screen.findByRole('dialog', { name: '저장하지 않은 변경사항' }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '취소' }));
    expect(
      await screen.findByRole('gridcell', { name: '미저장 양식' }),
    ).toBeVisible();
    expect(
      apiMocks.apiGet.mock.calls.filter(
        ([path]) => path === '/api/v1/co/workflow/forms',
      ),
    ).toHaveLength(initialListCallCount);

    fireEvent.click(screen.getByRole('button', { name: '조회' }));
    await screen.findByRole('dialog', { name: '저장하지 않은 변경사항' });
    fireEvent.click(screen.getByRole('button', { name: '계속' }));

    await waitFor(() =>
      expect(
        apiMocks.apiGet.mock.calls.filter(
          ([path]) => path === '/api/v1/co/workflow/forms',
        ),
      ).toHaveLength(initialListCallCount + 1),
    );
    expect(
      screen.queryByRole('gridcell', { name: '미저장 양식' }),
    ).not.toBeInTheDocument();
  }, 15000);

  it('combines the unified keyword and applied category ID in one list request', async () => {
    render(
      <ThemeProvider theme={createTheme()}>
        <NotificationProvider>
          <DashboardContent
            selectedModule={{
              id: 'co',
              name: '기준정보',
              icon: null,
              tree: [],
              menus: [],
            }}
            currentMenuName="기안양식관리"
            currentPageKey="form"
            breadcrumbItems={['기준정보', '전자결재관리', '기안양식관리']}
            content={{
              title: '기안양식관리',
              description: '기안양식 기준정보를 관리합니다.',
              cards: [],
              items: [],
            }}
            selectedMenuPermissions={{
              read: true,
              create: true,
              update: true,
              delete: false,
            }}
            isTenantAdmin
          />
        </NotificationProvider>
      </ThemeProvider>,
    );

    fireEvent.change(
      await screen.findByRole('textbox', { name: '기안양식 검색' }),
      {
        target: { value: '정기' },
      },
    );
    fireEvent.click(screen.getByRole('button', { name: '상세 검색 열기' }));
    const categorySelect = screen.getByRole('combobox', { name: '분류' });
    fireEvent.mouseDown(categorySelect);
    fireEvent.click(await screen.findByRole('option', { name: '점검' }));
    const detailDialog = screen.getByRole('dialog', { name: '상세 검색' });
    fireEvent.click(within(detailDialog).getByRole('button', { name: '조회' }));

    await waitFor(() => {
      expect(
        apiMocks.apiGet.mock.calls.some(([path]) => {
          if (
            typeof path !== 'string' ||
            !path.startsWith('/api/v1/co/workflow/forms?')
          )
            return false;
          const params = new URLSearchParams(path.split('?')[1]);
          return (
            params.get('keyword') === '정기' &&
            params.get('categoryItemId') === '101'
          );
        }),
      ).toBe(true);
    });
  });

  it('saves the form with common-code IDs and optional reviewer fields', async () => {
    apiMocks.apiPost.mockResolvedValue({
      item: { draftingWorkCategoryId: 1, cataTypeCode: '007' },
    });
    render(
      <ThemeProvider theme={createTheme()}>
        <NotificationProvider>
          <DashboardContent
            selectedModule={{
              id: 'co',
              name: '기준정보',
              icon: null,
              tree: [],
              menus: [],
            }}
            currentMenuName="기안양식관리"
            currentPageKey="form"
            breadcrumbItems={['기준정보', '전자결재관리', '기안양식관리']}
            content={{
              title: '기안양식관리',
              description: '기안양식 기준정보를 관리합니다.',
              cards: [],
              items: [],
            }}
            selectedMenuPermissions={{
              read: true,
              create: true,
              update: true,
              delete: false,
            }}
            isTenantAdmin
          />
        </NotificationProvider>
      </ThemeProvider>,
    );

    fireEvent.click(await screen.findByRole('button', { name: '양식 추가' }));
    const formDialog = await screen.findByRole('dialog', {
      name: '기안양식 등록',
    });
    fireEvent.change(
      within(formDialog).getByRole('textbox', { name: '구분명' }),
      {
        target: { value: '정기점검' },
      },
    );
    fireEvent.mouseDown(
      within(formDialog).getByRole('combobox', { name: '분류' }),
    );
    fireEvent.click(await screen.findByRole('option', { name: '점검' }));
    fireEvent.mouseDown(
      within(formDialog).getByRole('combobox', { name: '등록주기' }),
    );
    fireEvent.click(await screen.findByRole('option', { name: '월' }));
    fireEvent.click(within(formDialog).getByRole('button', { name: '적용' }));
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() =>
      expect(apiMocks.apiPost).toHaveBeenCalledWith(
        '/api/v1/co/workflow/forms',
        expect.objectContaining({
          cataTypeCode: '',
          codeName: '정기점검',
          categoryItemId: 101,
          regTermId: 201,
          reviewerId: null,
          approverId: null,
          assigneeIds: [],
          useAt: 'Y',
        }),
      ),
    );
  });

  it('updates the selected form through the tenant-scoped PUT endpoint', async () => {
    const sourceRow = {
      draftingWorkCategoryId: 71,
      cataTypeCode: '007',
      codeName: '정기점검',
      categoryItemId: 101,
      categoryName: '점검',
      regTermId: 201,
      regTerm: '월',
      reviewerId: '00000110',
      reviewerName: '홍길동',
      approverId: null,
      approverName: '',
      assigneeIds: ['00000110'],
      assigneeSummary: '홍길동',
      createdByName: '관리자',
      createdAt: '2026-10-01 09:00',
      hasDocument: false,
      useAt: 'Y',
    };
    const originalApiGet = apiMocks.apiGet.getMockImplementation();
    apiMocks.apiGet.mockImplementation((path: string) =>
      path === '/api/v1/co/workflow/forms'
        ? Promise.resolve({ resultList: [sourceRow] })
        : path === '/api/v1/co/workflow/forms/users'
          ? Promise.resolve({
              resultList: [
                {
                  userId: '00000110',
                  loginId: '00000110',
                  userNm: '홍길동',
                  departmentNm: '운영팀',
                  profileImage: '/profiles/fixture.png',
                  levelNm: '부장',
                },
              ],
            })
          : originalApiGet?.(path),
    );
    apiMocks.apiPut.mockResolvedValue({
      item: { ...sourceRow, codeName: '수정양식' },
    });

    render(
      <ThemeProvider theme={createTheme()}>
        <NotificationProvider>
          <DashboardContent
            selectedModule={{
              id: 'co',
              name: '기준정보',
              icon: null,
              tree: [],
              menus: [],
            }}
            currentMenuName="기안양식관리"
            currentPageKey="form"
            breadcrumbItems={['기준정보', '전자결재관리', '기안양식관리']}
            content={{
              title: '기안양식관리',
              description: '기안양식 기준정보를 관리합니다.',
              cards: [],
              items: [],
            }}
            selectedMenuPermissions={{
              read: true,
              create: true,
              update: true,
              delete: false,
            }}
            isTenantAdmin
          />
        </NotificationProvider>
      </ThemeProvider>,
    );

    expect(
      await screen.findByRole('gridcell', { name: '홍길동 (운영팀)' }),
    ).toBeVisible();
    fireEvent.click(
      await screen.findByRole('button', { name: '71 행 정보 수정' }),
    );
    const formDialog = await screen.findByRole('dialog', {
      name: '기안양식 수정',
    });
    expect(apiMocks.apiGet).toHaveBeenCalledWith(
      '/api/v1/co/workflow/forms/users',
    );
    const reviewerField = within(formDialog).getByTestId(
      'f1-grid-form-field-reviewerId',
    );
    const reviewerChip = within(reviewerField)
      .getByText('홍길동')
      .closest('.MuiChip-root');
    const reviewerDeleteIcon = reviewerChip?.querySelector(
      '.MuiChip-deleteIcon',
    );
    expect(reviewerDeleteIcon).not.toBeNull();
    fireEvent.click(reviewerDeleteIcon!);
    fireEvent.change(
      within(formDialog).getByRole('textbox', { name: '구분명' }),
      {
        target: { value: '수정양식' },
      },
    );
    fireEvent.click(within(formDialog).getByRole('button', { name: '적용' }));
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() =>
      expect(apiMocks.apiPut).toHaveBeenCalledWith(
        '/api/v1/co/workflow/forms/71',
        expect.objectContaining({
          cataTypeCode: '007',
          codeName: '수정양식',
          categoryItemId: 101,
          regTermId: 201,
          reviewerId: null,
          assigneeIds: ['00000110'],
          useAt: 'Y',
        }),
      ),
    );
  });

  it('shows user labels and keeps unchanged cell and form editors clean', async () => {
    const sourceRow = {
      draftingWorkCategoryId: 71,
      cataTypeCode: '007',
      codeName: '정기점검',
      categoryItemId: 101,
      categoryName: '점검',
      regTermId: 201,
      regTerm: '월',
      reviewerId: null,
      reviewerName: '',
      approverId: null,
      approverName: '',
      assigneeIds: [],
      assigneeSummary: '-',
      createdByName: '관리자',
      createdAt: '2026-10-01 09:00',
      hasDocument: false,
      useAt: 'Y',
    };
    const originalApiGet = apiMocks.apiGet.getMockImplementation();
    apiMocks.apiGet.mockImplementation((path: string) =>
      path === '/api/v1/co/workflow/forms'
        ? Promise.resolve({ resultList: [sourceRow] })
        : originalApiGet?.(path),
    );

    render(
      <ThemeProvider theme={createTheme()}>
        <NotificationProvider>
          <DashboardContent
            selectedModule={{
              id: 'co',
              name: '기준정보',
              icon: null,
              tree: [],
              menus: [],
            }}
            currentMenuName="기안양식관리"
            currentPageKey="form"
            breadcrumbItems={['기준정보', '전자결재관리', '기안양식관리']}
            content={{
              title: '기안양식관리',
              description: '기안양식 기준정보를 관리합니다.',
              cards: [],
              items: [],
            }}
            selectedMenuPermissions={{
              read: true,
              create: true,
              update: true,
              delete: false,
            }}
            isTenantAdmin
          />
        </NotificationProvider>
      </ThemeProvider>,
    );

    expect(await screen.findByRole('gridcell', { name: '점검' })).toBeVisible();
    expect(
      screen.getAllByRole('gridcell', { name: '' }).length,
    ).toBeGreaterThanOrEqual(2);

    fireEvent.doubleClick(screen.getByRole('gridcell', { name: '점검' }));
    const cellEditor = screen.getByRole('combobox');
    expect(cellEditor).toHaveTextContent('점검');
    fireEvent.keyDown(cellEditor, { key: 'Escape', code: 'Escape' });
    expect(screen.getByRole('button', { name: '저장' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: '71 행 정보 수정' }));
    const formDialog = await screen.findByRole('dialog', {
      name: '기안양식 수정',
    });
    expect(
      within(formDialog).getByRole('combobox', { name: '분류' }),
    ).toHaveTextContent('점검');
    fireEvent.click(within(formDialog).getByRole('button', { name: '적용' }));

    expect(screen.getByRole('button', { name: '저장' })).toBeDisabled();

    fireEvent.doubleClick(screen.getByRole('gridcell', { name: '점검' }));
    fireEvent.click(screen.getByRole('gridcell', { name: '정기점검' }));

    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '저장' })).toBeDisabled();
  });

  it('keeps the form grid visible and shows quiet progress while saving', async () => {
    const sourceRow = {
      draftingWorkCategoryId: 71,
      cataTypeCode: '007',
      codeName: '정기점검',
      categoryItemId: 101,
      categoryName: '점검',
      regTermId: 201,
      regTerm: '월',
      reviewerId: null,
      reviewerName: '',
      approverId: null,
      approverName: '',
      assigneeIds: [],
      assigneeSummary: '-',
      createdByName: '관리자',
      createdAt: '2026-10-01 09:00',
      hasDocument: false,
      useAt: 'Y',
    };
    const originalApiGet = apiMocks.apiGet.getMockImplementation();
    let formRequestCount = 0;
    let resolveRefresh: ((value: unknown) => void) | undefined;
    apiMocks.apiGet.mockImplementation((path: string) => {
      if (path !== '/api/v1/co/workflow/forms') {
        return originalApiGet?.(path);
      }
      formRequestCount += 1;
      if (formRequestCount === 1) {
        return Promise.resolve({ resultList: [sourceRow] });
      }
      return new Promise((resolve) => {
        resolveRefresh = resolve;
      });
    });
    let resolveUpdate: ((value: unknown) => void) | undefined;
    apiMocks.apiPut.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveUpdate = resolve;
        }),
    );

    render(
      <ThemeProvider theme={createTheme()}>
        <NotificationProvider>
          <DashboardContent
            selectedModule={{
              id: 'co',
              name: '기준정보',
              icon: null,
              tree: [],
              menus: [],
            }}
            currentMenuName="기안양식관리"
            currentPageKey="form"
            breadcrumbItems={['기준정보', '전자결재관리', '기안양식관리']}
            content={{
              title: '기안양식관리',
              description: '기안양식 기준정보를 관리합니다.',
              cards: [],
              items: [],
            }}
            selectedMenuPermissions={{
              read: true,
              create: true,
              update: true,
              delete: false,
            }}
            isTenantAdmin
          />
        </NotificationProvider>
      </ThemeProvider>,
    );

    fireEvent.click(
      await screen.findByRole('button', { name: '71 행 정보 수정' }),
    );
    const formDialog = await screen.findByRole('dialog', {
      name: '기안양식 수정',
    });
    fireEvent.change(
      within(formDialog).getByRole('textbox', { name: '구분명' }),
      { target: { value: '수정양식' } },
    );
    fireEvent.click(within(formDialog).getByRole('button', { name: '적용' }));
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => expect(apiMocks.apiPut).toHaveBeenCalled());
    expect(screen.getByRole('button', { name: '저장' })).toBeDisabled();
    expect(
      screen.getByRole('progressbar', { name: '기안양식 저장 중' }),
    ).toBeVisible();
    expect(
      screen.queryByTestId('f1-grid-loading-overlay'),
    ).not.toBeInTheDocument();

    resolveUpdate?.({ item: { ...sourceRow, codeName: '수정양식' } });
    await waitFor(() => expect(formRequestCount).toBe(2));
    expect(
      screen.queryByTestId('f1-grid-loading-overlay'),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('progressbar', { name: '기안양식 저장 중' }),
    ).toBeVisible();

    resolveRefresh?.({ resultList: [{ ...sourceRow, codeName: '수정양식' }] });
    await waitFor(() =>
      expect(
        screen.queryByRole('progressbar', { name: '기안양식 저장 중' }),
      ).not.toBeInTheDocument(),
    );
  });

  it.each([
    { key: 'Insert', ctrlKey: false },
    { key: 'd', ctrlKey: true },
    { key: 'Delete', ctrlKey: false },
  ])('blocks draft form edits during save and quiet refresh ($key)', async (shortcut) => {
    const sourceRow = {
      draftingWorkCategoryId: 71,
      cataTypeCode: '007',
      codeName: '정기점검',
      categoryItemId: 101,
      categoryName: '점검',
      regTermId: 201,
      regTerm: '월',
      reviewerId: null,
      reviewerName: '',
      approverId: null,
      approverName: '',
      assigneeIds: [],
      assigneeSummary: '-',
      createdByName: '관리자',
      createdAt: '2026-10-01 09:00',
      hasDocument: false,
      useAt: 'Y',
    };
    const originalApiGet = apiMocks.apiGet.getMockImplementation();
    let formRequestCount = 0;
    let resolveRefresh: ((value: unknown) => void) | undefined;
    apiMocks.apiGet.mockImplementation((path: string) => {
      if (path !== '/api/v1/co/workflow/forms') {
        return originalApiGet?.(path);
      }
      formRequestCount += 1;
      if (formRequestCount === 1) {
        return Promise.resolve({ resultList: [sourceRow] });
      }
      return new Promise((resolve) => {
        resolveRefresh = resolve;
      });
    });
    let resolveUpdate: ((value: unknown) => void) | undefined;
    apiMocks.apiPut.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveUpdate = resolve;
        }),
    );

    render(
      <ThemeProvider theme={createTheme()}>
        <NotificationProvider>
          <DashboardContent
            selectedModule={{
              id: 'co',
              name: '기준정보',
              icon: null,
              tree: [],
              menus: [],
            }}
            currentMenuName="기안양식관리"
            currentPageKey="form"
            breadcrumbItems={['기준정보', '전자결재관리', '기안양식관리']}
            content={{
              title: '기안양식관리',
              description: '기안양식 기준정보를 관리합니다.',
              cards: [],
              items: [],
            }}
            selectedMenuPermissions={{
              read: true,
              create: true,
              update: true,
              delete: false,
            }}
            isTenantAdmin
          />
        </NotificationProvider>
      </ThemeProvider>,
    );

    expect(
      await screen.findByRole('gridcell', { name: '정기점검' }),
    ).toBeVisible();
    fireEvent.click(
      screen.getByRole('button', { name: '71 행 정보 수정' }),
    );
    const formDialog = await screen.findByRole('dialog', {
      name: '기안양식 수정',
    });
    fireEvent.mouseDown(
      within(formDialog).getByRole('combobox', { name: '검토자' }),
    );
    fireEvent.click(await screen.findByRole('option', { name: /홍길동/ }));
    fireEvent.click(within(formDialog).getByRole('button', { name: '적용' }));
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => expect(apiMocks.apiPut).toHaveBeenCalledTimes(1));
    await screen.findByRole('progressbar', { name: '기안양식 저장 중' });

    const expectLocked = () => {
      expect(
        screen.getByRole('gridcell', { name: '정기점검' }),
      ).toBeVisible();
      expect(
        screen.getByRole('progressbar', { name: '기안양식 저장 중' }),
      ).toBeVisible();
      expect(
        screen.queryByTestId('f1-grid-loading-overlay'),
      ).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: '조회' })).toBeDisabled();
      expect(
        screen.getByRole('textbox', { name: '기안양식 검색' }),
      ).toBeDisabled();
      expect(
        screen.getByRole('button', { name: '분류 설정' }),
      ).toBeDisabled();
      expect(
        screen.getByRole('button', { name: '양식 추가' }),
      ).toBeDisabled();
      expect(
        screen.getByRole('button', { name: '상세 검색 열기' }),
      ).toBeDisabled();
      expect(
        screen.queryByRole('button', { name: '71 행 정보 수정' }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: '문서 작성: 정기점검' }),
      ).not.toBeInTheDocument();

      const cell = screen.getByRole('gridcell', { name: '정기점검' });
      fireEvent.click(cell);
      fireEvent.contextMenu(cell);
      const rowMenu = screen.getByRole('menu');
      fireEvent.keyDown(rowMenu, { key: 'Escape', code: 'Escape' });
      const grid = screen.getByRole('grid', { name: '기안양식 목록' });
      const rowCount = within(grid).getAllByRole('row').length;
      fireEvent.keyDown(cell, shortcut);
      expect(within(grid).getAllByRole('row')).toHaveLength(rowCount);
      expect(
        within(grid).getByRole('gridcell', { name: '정기점검' }),
      ).toBeVisible();
      expect(
        screen.queryByRole('dialog', { name: '기안양식 등록' }),
      ).not.toBeInTheDocument();
    };

    const saveButton = screen
      .getByRole('progressbar', { name: '기안양식 저장 중' })
      .closest('button');
    expect(saveButton).not.toBeNull();
    fireEvent.click(saveButton!);
    expect(apiMocks.apiPut).toHaveBeenCalledTimes(1);
    expectLocked();
    fireEvent.doubleClick(screen.getByRole('gridcell', { name: '정기점검' }));
    expect(screen.getAllByRole('textbox')).toHaveLength(1);
    fireEvent.contextMenu(screen.getByRole('grid', { name: '기안양식 목록' }));
    const menu = screen.queryByRole('menu');
    expect(
      menu && within(menu).queryByRole('menuitem', { name: '행 추가' }),
    ).not.toBeInTheDocument();
    expect(
      menu && within(menu).queryByRole('menuitem', { name: '행 복사' }),
    ).not.toBeInTheDocument();
    if (menu) fireEvent.keyDown(menu, { key: 'Escape', code: 'Escape' });
    expect(screen.getByRole('gridcell', { name: '정기점검' })).toBeVisible();
    resolveUpdate?.({ item: { ...sourceRow, reviewerId: 210 } });
    await waitFor(() => expect(formRequestCount).toBe(2));
    expectLocked();

    resolveRefresh?.({
      resultList: [{ ...sourceRow, reviewerId: 210, reviewerName: '홍길동' }],
    });
    await waitFor(() =>
      expect(
        screen.queryByRole('progressbar', { name: '기안양식 저장 중' }),
      ).not.toBeInTheDocument(),
    );
    expect(screen.getByRole('button', { name: '조회' })).toBeEnabled();
    expect(
      screen.getByRole('textbox', { name: '기안양식 검색' }),
    ).toBeEnabled();
    expect(screen.getByRole('button', { name: '분류 설정' })).toBeEnabled();
    expect(screen.getByRole('button', { name: '양식 추가' })).toBeEnabled();
    const restoredCell = screen.getByRole('gridcell', { name: '정기점검' });
    fireEvent.click(restoredCell);
    fireEvent.contextMenu(restoredCell);
    fireEvent.keyDown(screen.getByRole('menu'), {
      key: 'Escape',
      code: 'Escape',
    });
    fireEvent.keyDown(restoredCell, shortcut);
    if (shortcut.key === 'Insert') {
      expect(
        await screen.findByRole('dialog', { name: '기안양식 등록' }),
      ).toBeInTheDocument();
    } else if (shortcut.key === 'd') {
      expect(
        await screen.findByRole('gridcell', { name: '정기점검 복사' }),
      ).toBeVisible();
    } else {
      expect(
        screen.queryByRole('gridcell', { name: '정기점검' }),
      ).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: '저장' })).toBeEnabled();
    }
  }, 15000);

  it('releases the draft form lock after save and refresh failures', async () => {
    const sourceRow = {
      draftingWorkCategoryId: 71,
      cataTypeCode: '007',
      codeName: '정기점검',
      categoryItemId: 101,
      categoryName: '점검',
      regTermId: 201,
      regTerm: '월',
      reviewerId: null,
      reviewerName: '',
      approverId: null,
      approverName: '',
      assigneeIds: [],
      assigneeSummary: '-',
      createdByName: '관리자',
      createdAt: '2026-10-01 09:00',
      hasDocument: false,
      useAt: 'Y',
    };
    const originalApiGet = apiMocks.apiGet.getMockImplementation();
    let formRequestCount = 0;
    apiMocks.apiGet.mockImplementation((path: string) => {
      if (path !== '/api/v1/co/workflow/forms') {
        return originalApiGet?.(path);
      }
      formRequestCount += 1;
      if (formRequestCount === 1) {
        return Promise.resolve({ resultList: [sourceRow] });
      }
      return Promise.reject(new Error('목록 새로고침 실패'));
    });
    apiMocks.apiPut
      .mockRejectedValueOnce(new Error('기안양식 저장 실패'))
      .mockResolvedValueOnce({});

    render(
      <ThemeProvider theme={createTheme()}>
        <NotificationProvider>
          <DashboardContent
            selectedModule={{
              id: 'co',
              name: '기준정보',
              icon: null,
              tree: [],
              menus: [],
            }}
            currentMenuName="기안양식관리"
            currentPageKey="form"
            breadcrumbItems={['기준정보', '전자결재관리', '기안양식관리']}
            content={{
              title: '기안양식관리',
              description: '기안양식 기준정보를 관리합니다.',
              cards: [],
              items: [],
            }}
            selectedMenuPermissions={{
              read: true,
              create: true,
              update: true,
              delete: false,
            }}
            isTenantAdmin
          />
        </NotificationProvider>
      </ThemeProvider>,
    );

    expect(
      await screen.findByRole('gridcell', { name: '정기점검' }),
    ).toBeVisible();
    fireEvent.click(
      screen.getByRole('button', { name: '71 행 정보 수정' }),
    );
    const formDialog = await screen.findByRole('dialog', {
      name: '기안양식 수정',
    });
    fireEvent.change(
      within(formDialog).getByRole('textbox', { name: '양식명' }),
      { target: { value: '수정양식' } },
    );
    fireEvent.click(within(formDialog).getByRole('button', { name: '적용' }));
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    expect(await screen.findByText('기안양식 저장 실패')).toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen.queryByRole('progressbar', { name: '기안양식 저장 중' }),
      ).not.toBeInTheDocument(),
    );
    expect(
      screen.getByRole('gridcell', { name: '수정양식' }),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: '저장' })).toBeEnabled();
    expect(screen.getByRole('button', { name: '조회' })).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => expect(apiMocks.apiPut).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('목록 새로고침 실패')).toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen.queryByRole('progressbar', { name: '기안양식 저장 중' }),
      ).not.toBeInTheDocument(),
    );
    expect(
      screen.getByRole('gridcell', { name: '수정양식' }),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: '저장' })).toBeEnabled();
    expect(screen.getByRole('button', { name: '조회' })).toBeEnabled();
  });

  it('soft-disables a deleted Grid row by saving useAt N', async () => {
    const sourceRow = {
      draftingWorkCategoryId: 71,
      cataTypeCode: '007',
      codeName: '정기점검',
      categoryItemId: 101,
      categoryName: '점검',
      regTermId: 201,
      regTerm: '월',
      reviewerId: null,
      reviewerName: '',
      approverId: null,
      approverName: '',
      assigneeIds: [],
      assigneeSummary: '-',
      createdByName: '관리자',
      createdAt: '2026-10-01 09:00',
      hasDocument: false,
      useAt: 'Y',
    };
    const originalApiGet = apiMocks.apiGet.getMockImplementation();
    apiMocks.apiGet.mockImplementation((path: string) =>
      path === '/api/v1/co/workflow/forms'
        ? Promise.resolve({ resultList: [sourceRow] })
        : originalApiGet?.(path),
    );
    apiMocks.apiPut.mockResolvedValue({ item: { ...sourceRow, useAt: 'N' } });

    render(
      <ThemeProvider theme={createTheme()}>
        <NotificationProvider>
          <DashboardContent
            selectedModule={{
              id: 'co',
              name: '기준정보',
              icon: null,
              tree: [],
              menus: [],
            }}
            currentMenuName="기안양식관리"
            currentPageKey="form"
            breadcrumbItems={['기준정보', '전자결재관리', '기안양식관리']}
            content={{
              title: '기안양식관리',
              description: '기안양식 기준정보를 관리합니다.',
              cards: [],
              items: [],
            }}
            selectedMenuPermissions={{
              read: true,
              create: true,
              update: true,
              delete: false,
            }}
            isTenantAdmin
          />
        </NotificationProvider>
      </ThemeProvider>,
    );

    fireEvent.contextMenu(
      await screen.findByRole('gridcell', { name: '정기점검' }),
    );
    expect(screen.getByRole('menuitem', { name: '행 추가' })).toBeVisible();
    expect(screen.getByRole('menuitem', { name: '행 복사' })).toBeVisible();
    expect(screen.getByRole('menuitem', { name: '행 삭제' })).toBeVisible();
    fireEvent.click(screen.getByRole('menuitem', { name: '행 삭제' }));
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() =>
      expect(apiMocks.apiPut).toHaveBeenCalledWith(
        '/api/v1/co/workflow/forms/71',
        expect.objectContaining({ useAt: 'N' }),
      ),
    );
  });
});

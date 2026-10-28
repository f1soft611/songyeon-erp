import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { useRef, type ComponentProps } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  MenuManagementPanel as MenuManagementPanelView,
  type MenuManagementPanelHandle,
} from '../src/pages/settings/system/menus/components/MenuManagementPanel';
import { MenuManagementPage } from '../src/pages/settings/system/menus/MenuManagementPage';
import { menuRows } from '../src/pages/settings/system/menus/data/menuManagement.data';
import { F1Grid } from '../src/shared/components/f1-grid';
import {
  fetchActivePermissions,
  fetchMenuRows,
  fetchModules,
  replaceMenuPermissions,
  saveMenuChanges,
  saveRoleMenuPermissions,
} from '../src/pages/settings/system/menus/services/menuManagement.service';
import { normalizeApiErrorMessage } from '../src/shared/services/apiClient';
import type {
  MenuManagementRow,
  MenuModuleOption,
  MenuPermissionDefinition,
} from '../src/pages/settings/system/menus/types/menuManagement.types';
import { createAppTheme } from '../src/theme/theme';

const apiMocks = vi.hoisted(() => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPut: vi.fn(),
  apiDelete: vi.fn(),
  normalizeApiErrorMessage: vi.fn((message: string | null | undefined) => {
    const raw = String(message ?? '').trim();
    if (!raw) {
      return '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.';
    }

    const lower = raw.toLowerCase();
    if (
      lower.includes('parent_menu_id') &&
      lower.includes('bigint') &&
      (lower.includes('character varying') || lower.includes('varchar'))
    ) {
      return '상위 메뉴 정보가 올바르지 않습니다. 상위 메뉴를 다시 선택한 뒤 저장해 주세요.';
    }

    return raw
      .replace(/caused by:\s*/gi, '')
      .replace(
        /\b(org\.postgresql|org\.springframework|com\.mysql|java\.[^:]+):\s*/gi,
        '',
      )
      .replace(/\s+/g, ' ')
      .trim();
  }),
}));

vi.mock('../src/shared/services/apiClient', () => apiMocks);

function MenuManagementPanel(
  props: ComponentProps<typeof MenuManagementPanelView>,
) {
  const panelRef = useRef<MenuManagementPanelHandle>(null);
  return (
    <>
      <button onClick={() => void panelRef.current?.saveCurrentChanges()}>
        저장
      </button>
      <button onClick={() => panelRef.current?.deleteSelectedRows()}>
        삭제
      </button>
      <MenuManagementPanelView ref={panelRef} {...props} />
    </>
  );
}

function getTreeGridBody(name = 'F1-TREE 메뉴 관리') {
  const grid = screen.getByRole('grid', { name });
  return grid.lastElementChild as HTMLElement;
}

/** 그리드 빈 영역을 우클릭한 뒤 컨텍스트 메뉴의 "루트 추가"를 클릭한다. */
function addRootMenuViaContextMenu(name?: string) {
  fireEvent.contextMenu(getTreeGridBody(name));
  fireEvent.click(screen.getByRole('menuitem', { name: '루트 추가' }));
}

/** 특정 행을 우클릭한 뒤 컨텍스트 메뉴의 "행 추가"를 클릭해 그 행의 자식으로 추가한다. */
function addChildMenuViaContextMenu(targetCell: HTMLElement) {
  fireEvent.contextMenu(targetCell);
  fireEvent.click(screen.getByRole('menuitem', { name: '행 추가' }));
}

function mockMenuPageRequests({
  failModuleOneReload = false,
}: { failModuleOneReload?: boolean } = {}) {
  let moduleOneRequestCount = 0;
  apiMocks.apiGet.mockImplementation((path: string) => {
    if (path === '/api/v1/system/roles')
      return Promise.resolve({
        resultList: [
          { roleId: 1, roleNm: '관리자', useAt: 'Y', roleCode: 'ADMIN' },
          { roleId: 2, roleNm: '운영자', useAt: 'Y', roleCode: 'OPERATOR' },
        ],
      });
    if (path === '/api/v1/system/modules')
      return Promise.resolve({
        resultList: modules.map((module) => ({
          ...module,
          moduleNm: module.moduleName,
          useAt: 'Y',
        })),
      });
    if (path === '/api/v1/system/permissions')
      return Promise.resolve({ resultList: permissions });
    if (
      path === '/api/v1/system/menus?moduleId=1' ||
      path === '/api/v1/system/menus?moduleId=1&roleId=1'
    ) {
      moduleOneRequestCount += 1;
      if (failModuleOneReload && moduleOneRequestCount > 1) {
        return Promise.reject(new Error('메뉴 목록 요청 실패'));
      }
      return Promise.resolve({
        resultList: moduleOneRows.map((row) => ({
          menuId: Number(row.id),
          moduleId: row.moduleId,
          moduleNm: row.moduleName,
          parentMenuId: row.parentMenuId,
          parentMenuNm: row.parent,
          menuCode: row.code,
          menuNm: row.name,
          menuUrl: row.path,
          iconNm: row.iconName,
          sortOrder: row.order,
          useAt: 'Y',
          hasChildren: row.hasChildren,
          permissionCodes: row.permissionCodes,
        })),
      });
    }
    if (
      path === '/api/v1/system/menus?moduleId=2' ||
      path === '/api/v1/system/menus?moduleId=2&roleId=1'
    )
      return Promise.resolve({
        resultList: moduleTwoRows.map((row) => ({
          menuId: Number(row.id),
          moduleId: row.moduleId,
          moduleNm: row.moduleName,
          parentMenuId: row.parentMenuId,
          parentMenuNm: row.parent,
          menuCode: row.code,
          menuNm: row.name,
          menuUrl: row.path,
          iconNm: row.iconName,
          sortOrder: row.order,
          useAt: 'Y',
          hasChildren: row.hasChildren,
          permissionCodes: row.permissionCodes,
        })),
      });
    return Promise.reject(new Error(`unexpected ${path}`));
  });
}

beforeEach(() => {
  vi.resetAllMocks();
});

const modules: MenuModuleOption[] = [
  { moduleId: 1, moduleName: '기본' },
  { moduleId: 2, moduleName: '환경설정' },
];

const permissions: MenuPermissionDefinition[] = [
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

const moduleOneRows: MenuManagementRow[] = [
  {
    ...menuRows[0],
    id: '1',
    moduleId: 1,
    moduleName: '기본',
    name: '대시보드',
    permissionCodes: ['READ'],
  },
];

const moduleTwoRows: MenuManagementRow[] = [
  {
    ...menuRows[1],
    id: '4',
    moduleId: 2,
    moduleName: '환경설정',
    name: '시스템 관리',
    hasChildren: true,
    permissionCodes: [],
  },
  {
    ...menuRows[4],
    id: '10',
    moduleId: 2,
    moduleName: '환경설정',
    parentMenuId: null,
    name: '메뉴관리',
    permissionCodes: ['READ'],
  },
];

describe('MenuManagementPanel F1Tree integration', () => {
  it('blocks editing of persisted menu codes through the beforeEdit hook', () => {
    render(
      <MenuManagementPanel
        menus={moduleOneRows}
        selectedModule={{ moduleId: 1, moduleName: '기본' }}
        permissions={permissions}
      />,
    );

    const codeCell = screen.getByText('DASH');
    fireEvent.doubleClick(codeCell);

    expect(screen.queryByDisplayValue('DASH')).not.toBeInTheDocument();
  });

  it('allows editing of newly created menu codes while keeping saved rows read-only', async () => {
    render(
      <MenuManagementPanel
        menus={moduleOneRows}
        selectedModule={{ moduleId: 1, moduleName: '기본' }}
        permissions={permissions}
      />,
    );

    addRootMenuViaContextMenu();

    await waitFor(() => {
      expect(screen.getByText('새 메뉴')).toBeInTheDocument();
    });

    fireEvent.doubleClick(screen.getByText('NEW1'));

    expect(screen.getByDisplayValue('NEW1')).toBeInTheDocument();
  });

  it('filters visible menu rows by the entered search text', async () => {
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
      if (path === '/api/v1/system/permissions') {
        return Promise.resolve({ resultList: permissions });
      }
      if (path === '/api/v1/system/menus?moduleId=1') {
        return Promise.resolve({
          resultList: moduleOneRows.map((row) => ({
            menuId: Number(row.id),
            moduleId: row.moduleId,
            moduleNm: row.moduleName,
            parentMenuId: row.parentMenuId,
            parentMenuNm: row.parent,
            menuCode: row.code,
            menuNm: row.name,
            menuUrl: row.path,
            iconNm: row.iconName,
            sortOrder: row.order,
            useAt: 'Y',
            hasChildren: row.hasChildren,
            permissionCodes: row.permissionCodes,
          })),
        });
      }
      return Promise.reject(new Error(`unexpected ${path}`));
    });

    render(
      <MenuManagementPage
        selectedModule={pageProps.selectedModule}
        currentMenuName={pageProps.currentMenuName}
        content={pageProps.content}
        breadcrumbItems={['환경설정', '시스템관리', '메뉴관리']}
      />,
    );

    const searchInput = await screen.findByRole('textbox', {
      name: '메뉴 검색',
    });
    fireEvent.change(searchInput, { target: { value: 'DASH' } });

    expect(
      await screen.findByRole('gridcell', { name: '대시보드' }),
    ).toBeVisible();
    expect(
      screen.queryByRole('gridcell', { name: '시스템 관리' }),
    ).not.toBeInTheDocument();
  });

  it('shows a red marker on changed cells after an edit', async () => {
    render(
      <MenuManagementPanel
        menus={moduleOneRows}
        selectedModule={{ moduleId: 1, moduleName: '기본' }}
        permissions={permissions}
      />,
    );

    const nameCell = screen.getByRole('gridcell', { name: '대시보드' });
    fireEvent.doubleClick(nameCell);
    const editor = await screen.findByDisplayValue('대시보드');
    fireEvent.change(editor, { target: { value: '대시보드 수정' } });
    fireEvent.keyDown(editor, { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      expect(document.querySelector('[data-dirty-cell="true"]')).not.toBeNull();
    });
  });

  it('shows a red marker on a permission checkbox cell after a toggle', () => {
    render(
      <MenuManagementPanel
        menus={moduleOneRows}
        selectedModule={{ moduleId: 1, moduleName: '기본' }}
        permissions={permissions}
      />,
    );

    const writeCheckbox = screen.getByRole('checkbox', { name: '쓰기 1' });
    fireEvent.click(writeCheckbox);

    const writeCell = writeCheckbox.closest('[role="gridcell"]');
    expect(writeCell).toHaveAttribute('data-dirty-cell', 'true');
  });

  it('clears the dirty marker and change count when a permission checkbox is reverted to its original value', () => {
    render(
      <MenuManagementPanel
        menus={moduleOneRows}
        selectedModule={{ moduleId: 1, moduleName: '기본' }}
        permissions={permissions}
      />,
    );

    const writeCheckbox = screen.getByRole('checkbox', { name: '쓰기 1' });
    const writeCell = writeCheckbox.closest('[role="gridcell"]');

    fireEvent.click(writeCheckbox);
    expect(writeCell).toHaveAttribute('data-dirty-cell', 'true');
    expect(screen.getByText(/수정 1건/)).toBeVisible();

    fireEvent.click(writeCheckbox);
    expect(writeCell).toHaveAttribute('data-dirty-cell', 'false');
    expect(screen.getByText(/수정 0건/)).toBeVisible();
  });

  it('clears the dirty marker when an edited cell is reverted back to its original value', async () => {
    render(
      <MenuManagementPanel
        menus={moduleOneRows}
        selectedModule={{ moduleId: 1, moduleName: '기본' }}
        permissions={permissions}
      />,
    );

    const nameCell = screen.getByRole('gridcell', { name: '대시보드' });
    fireEvent.doubleClick(nameCell);
    const editor = await screen.findByDisplayValue('대시보드');
    fireEvent.change(editor, { target: { value: '대시보드 수정' } });
    fireEvent.keyDown(editor, { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      expect(nameCell).toHaveAttribute('data-dirty-cell', 'true');
    });

    fireEvent.doubleClick(nameCell);
    const revertEditor = await screen.findByDisplayValue('대시보드 수정');
    fireEvent.change(revertEditor, { target: { value: '대시보드' } });
    fireEvent.keyDown(revertEditor, { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      expect(nameCell).toHaveAttribute('data-dirty-cell', 'false');
    });
  });

  it('clears the dirty marker when an edited empty-able cell is reverted to empty', async () => {
    render(
      <MenuManagementPanel
        menus={moduleOneRows}
        selectedModule={{ moduleId: 1, moduleName: '기본' }}
        permissions={permissions}
      />,
    );

    const descriptionCell = screen.getByRole('gridcell', {
      name: moduleOneRows[0].description,
    });
    fireEvent.doubleClick(descriptionCell);
    const editor = await screen.findByDisplayValue(
      moduleOneRows[0].description,
    );
    fireEvent.change(editor, { target: { value: '' } });
    fireEvent.keyDown(editor, { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      expect(descriptionCell).toHaveAttribute('data-dirty-cell', 'true');
    });

    fireEvent.doubleClick(descriptionCell);
    const revertEditor = await screen.findByDisplayValue('');
    fireEvent.change(revertEditor, {
      target: { value: moduleOneRows[0].description },
    });
    fireEvent.keyDown(revertEditor, { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      expect(descriptionCell).toHaveAttribute('data-dirty-cell', 'false');
    });
  });

  it('disables the save button when the edited value is reverted back to the original value', async () => {
    mockMenuPageRequests();
    render(
      <MenuManagementPage
        selectedModule={pageProps.selectedModule}
        currentMenuName={pageProps.currentMenuName}
        content={pageProps.content}
        breadcrumbItems={['환경설정', '시스템관리', '메뉴관리']}
      />,
    );

    const saveButton = await screen.findByRole('button', { name: '저장' });
    const nameCell = await screen.findByRole('gridcell', { name: '대시보드' });

    fireEvent.doubleClick(nameCell);
    const editor = await screen.findByDisplayValue('대시보드');
    fireEvent.change(editor, { target: { value: '대시보드 수정' } });
    fireEvent.keyDown(editor, { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      expect(saveButton).not.toBeDisabled();
    });

    fireEvent.doubleClick(nameCell);
    const revertEditor = await screen.findByDisplayValue('대시보드 수정');
    fireEvent.change(revertEditor, { target: { value: '대시보드' } });
    fireEvent.keyDown(revertEditor, { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      expect(saveButton).toBeDisabled();
    });
  });

  it('shows a red marker on a non-tree text column after an edit', async () => {
    render(
      <MenuManagementPanel
        menus={moduleOneRows}
        selectedModule={{ moduleId: 1, moduleName: '기본' }}
        permissions={permissions}
      />,
    );

    const pathCell = screen.getByRole('gridcell', { name: '/dashboard' });
    fireEvent.doubleClick(pathCell);
    const editor = await screen.findByDisplayValue('/dashboard');
    fireEvent.change(editor, { target: { value: '/dashboard-updated' } });
    fireEvent.keyDown(editor, { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      expect(pathCell).toHaveAttribute('data-dirty-cell', 'true');
    });
  });

  it('shows a red marker on a non-tree text column after editing and clicking away (blur)', async () => {
    render(
      <MenuManagementPanel
        menus={moduleOneRows}
        selectedModule={{ moduleId: 1, moduleName: '기본' }}
        permissions={permissions}
      />,
    );

    const pathCell = screen.getByRole('gridcell', { name: '/dashboard' });
    fireEvent.doubleClick(pathCell);
    const editor = await screen.findByDisplayValue('/dashboard');
    fireEvent.change(editor, { target: { value: '/groupware/documents222' } });
    fireEvent.blur(editor);

    await waitFor(() => {
      expect(pathCell).toHaveAttribute('data-dirty-cell', 'true');
    });

    // The dirty marker is absolutely positioned and only renders visibly
    // when the cell itself establishes a positioning context. A non-pinned
    // cell must not fall back to the browser default 'static' position.
    expect(getComputedStyle(pathCell).position).not.toBe('static');
  });

  it('resets dirty cell state and removes unsaved rows when the module is reloaded', async () => {
    let menuCallCount = 0;
    apiMocks.apiGet.mockImplementation((path: string) => {
      if (path === '/api/v1/system/roles') {
        return Promise.resolve({
          resultList: [
            { roleId: 1, roleNm: '관리자', useAt: 'Y', roleCode: 'ADMIN' },
            { roleId: 2, roleNm: '운영자', useAt: 'Y', roleCode: 'OPERATOR' },
          ],
        });
      }
      if (path === '/api/v1/system/modules') {
        return Promise.resolve({
          resultList: modules.map((module) => ({
            ...module,
            moduleNm: module.moduleName,
            useAt: 'Y',
          })),
        });
      }
      if (path === '/api/v1/system/permissions') {
        return Promise.resolve({ resultList: permissions });
      }
      if (path === '/api/v1/system/menus?moduleId=1') {
        menuCallCount += 1;
        if (menuCallCount === 1) {
          return Promise.resolve({
            resultList: moduleOneRows.map((row) => ({
              menuId: Number(row.id),
              moduleId: row.moduleId,
              moduleNm: row.moduleName,
              parentMenuId: row.parentMenuId,
              parentMenuNm: row.parent,
              menuCode: row.code,
              menuNm: row.name,
              menuUrl: row.path,
              iconNm: row.iconName,
              sortOrder: row.order,
              useAt: 'Y',
              hasChildren: row.hasChildren,
              permissionCodes: row.permissionCodes,
            })),
          });
        }
        return Promise.resolve({
          resultList: [
            {
              menuId: 1,
              moduleId: 1,
              moduleNm: '기본',
              parentMenuId: null,
              parentMenuNm: null,
              menuCode: 'DASH',
              menuNm: '대시보드',
              menuUrl: '/dashboard',
              iconNm: 'Dashboard',
              sortOrder: 1,
              useAt: 'Y',
              hasChildren: false,
              permissionCodes: ['READ'],
            },
          ],
        });
      }
      return Promise.reject(new Error(`unexpected ${path}`));
    });

    render(
      <MenuManagementPage
        selectedModule={pageProps.selectedModule}
        currentMenuName={pageProps.currentMenuName}
        content={pageProps.content}
        breadcrumbItems={['환경설정', '시스템관리', '메뉴관리']}
      />,
    );

    const nameCell = await screen.findByRole('gridcell', { name: '대시보드' });
    fireEvent.doubleClick(nameCell);
    const editor = await screen.findByDisplayValue('대시보드');
    fireEvent.change(editor, { target: { value: '대시보드 수정' } });
    fireEvent.keyDown(editor, { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      expect(document.querySelector('[data-dirty-cell="true"]')).not.toBeNull();
    });

    fireEvent.keyDown(screen.getByRole('textbox', { name: '메뉴 검색' }), {
      key: 'Enter',
      code: 'Enter',
    });

    expect(screen.getByRole('dialog')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '계속' }));

    await waitFor(() => {
      expect(document.querySelector('[data-dirty-cell="true"]')).toBeNull();
      expect(screen.getByRole('gridcell', { name: '대시보드' })).toBeVisible();
    });
  });

  it('allows the shared grid to fill its container height and scroll rows vertically', () => {
    render(
      <div style={{ width: 900, height: 320 }}>
        <F1Grid
          rows={Array.from({ length: 40 }, (_, index) => ({
            id: String(index + 1),
            name: `메뉴 ${index + 1}`,
          }))}
          columns={[
            { field: 'id', headerName: 'ID', width: 80 },
            { field: 'name', headerName: '메뉴명', width: 200 },
          ]}
          rowKey="id"
          height={320}
          maxHeight={320}
          ariaLabel="테스트 그리드"
        />
      </div>,
    );

    const grid = screen.getByRole('grid', { name: '테스트 그리드' });
    const body = grid.lastElementChild as HTMLElement;

    expect(grid).toHaveStyle({
      height: '320px',
      overflowX: 'auto',
      overflowY: 'hidden',
    });
    expect(body).toHaveStyle({ overflowY: 'auto', overflowX: 'auto' });
  });

  it('uses dark-theme surfaces for the menu search controls', () => {
    render(
      <ThemeProvider theme={createAppTheme('dark')}>
        <MenuManagementPage
          selectedModule={pageProps.selectedModule}
          selectedModuleId={2}
          modules={modules}
          menus={moduleTwoRows}
          permissions={permissions}
          selectedMenuId={null}
          loading={false}
          saving={false}
          dirty={false}
          searchQuery=""
          setSearchQuery={() => undefined}
          onRefresh={() => undefined}
          onSave={async () => undefined}
          onDelete={async () => undefined}
          onModuleChange={() => undefined}
          statusMessage=""
          error=""
          setError={() => undefined}
          setDirty={() => undefined}
          setSaving={() => undefined}
          setSelectedModuleId={() => undefined}
          setSelectedMenuId={() => undefined}
          loadMenus={async () => undefined}
          requestRefresh={async () => undefined}
          requestChangeModule={async () => undefined}
          currentMenuName={pageProps.currentMenuName}
          content={pageProps.content}
          dashboardModule={{ id: 'dashboard', name: '대시보드' }}
          breadcrumbItems={[]}
          pageActionGroups={[]}
        />
      </ThemeProvider>,
    );

    const moduleSelect = screen.getByRole('combobox', { name: '모듈 선택' });
    const searchInput = screen.getByRole('textbox', { name: '메뉴 검색' });

    expect(moduleSelect).not.toHaveStyle({
      backgroundColor: 'rgba(255,255,255,0.72)',
    });
    expect(searchInput).not.toHaveStyle({
      backgroundColor: 'rgba(255,255,255,0.72)',
    });
    expect(moduleSelect.closest('.MuiOutlinedInput-root')).toHaveStyle({
      backgroundColor: 'rgba(15, 23, 42, 0.72)',
    });
    expect(searchInput.closest('.MuiOutlinedInput-root')).toHaveStyle({
      backgroundColor: 'rgba(15, 23, 42, 0.72)',
    });
  });

  it('shows the menu description returned by the API as an editable column', () => {
    render(
      <MenuManagementPanel
        menus={[{ ...moduleTwoRows[1], description: '저장된 메뉴 설명' }]}
        selectedModule={modules[1]}
        permissions={permissions}
      />,
    );

    expect(
      screen.getByRole('columnheader', { name: /메뉴설명/ }),
    ).toBeVisible();
    expect(
      screen.getByRole('gridcell', { name: '저장된 메뉴 설명' }),
    ).toBeVisible();
  });

  it('renders the existing menu rows through F1Tree with tree commands', () => {
    render(
      <MenuManagementPanel
        menus={menuRows}
        selectedModule={modules[1]}
        permissions={permissions}
      />,
    );

    expect(
      screen.getByRole('grid', { name: 'F1-TREE 메뉴 관리' }),
    ).toBeVisible();
    expect(screen.getByRole('gridcell', { name: 'DASH' })).toBeVisible();
    expect(
      screen.getByRole('toolbar', { name: '메뉴 그리드 제어' }),
    ).toBeVisible();
    expect(
      screen.queryByRole('toolbar', { name: '메뉴 업무 액션' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: '루트 메뉴 추가' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: '하위 메뉴 추가' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '삭제' })).toBeVisible();
    expect(screen.getByRole('button', { name: '저장' })).toBeVisible();
    expect(screen.getByRole('button', { name: '전체 펼치기' })).toBeVisible();
    expect(screen.getByRole('button', { name: '전체 접기' })).toBeVisible();

    const title = screen.getByRole('heading', { name: '메뉴 관리' });
    const headerRow = title.parentElement;
    expect(headerRow).toContainElement(
      screen.getByRole('toolbar', { name: '메뉴 그리드 제어' }),
    );

    fireEvent.contextMenu(getTreeGridBody());
    expect(screen.getByRole('menuitem', { name: '루트 추가' })).toBeVisible();
    expect(screen.getByRole('menuitem', { name: '행 추가' })).toBeVisible();
  });

  it('adds a root menu and updates the inserted count', () => {
    render(
      <MenuManagementPanel
        menus={menuRows}
        selectedModule={modules[1]}
        permissions={permissions}
      />,
    );

    addRootMenuViaContextMenu();

    expect(screen.getByRole('gridcell', { name: 'NEW1' })).toBeVisible();
    expect(screen.getByText(/신규 1건/)).toBeVisible();
  });

  it('renders grouped read/write/delete/excel permission columns, allows leaf edits, and persists grouped permission codes', () => {
    render(
      <MenuManagementPanel
        menus={moduleTwoRows}
        selectedModule={modules[1]}
        permissions={permissions}
      />,
    );

    expect(
      screen
        .getAllByRole('columnheader')
        .map((header) => header.textContent)
        .slice(-4),
    ).toEqual(['읽기', '쓰기', '삭제', '엑셀']);
    expect(screen.getByLabelText('읽기 10')).toBeChecked();
    expect(screen.getByLabelText('쓰기 10')).not.toBeChecked();
    expect(screen.getByLabelText('삭제 10')).not.toBeChecked();
    expect(screen.getByLabelText('엑셀 10')).not.toBeChecked();
    expect(screen.getByLabelText('읽기 4')).toBeDisabled();

    fireEvent.click(screen.getByLabelText('엑셀 10'));
    expect(screen.getByLabelText('엑셀 10')).toBeChecked();
    expect(screen.getByText(/수정 1건/)).toBeVisible();

    fireEvent.click(screen.getByLabelText('쓰기 10'));
    expect(screen.getByLabelText('쓰기 10')).toBeChecked();
    expect(screen.getByText(/수정 1건/)).toBeVisible();

    addRootMenuViaContextMenu();
    expect(screen.getByLabelText('읽기 new-menu-1')).not.toBeChecked();
    expect(screen.getByLabelText('쓰기 new-menu-1')).not.toBeChecked();
  });
});

describe('menu management API integration', () => {
  it('converts PostgreSQL parent menu type errors into a friendly message', () => {
    expect(
      normalizeApiErrorMessage(
        'Caused by: org.postgresql.util.PSQLException: 오류: 열 "parent_menu_id"은(는) bigint 자료형인데 표현식은 character varying 자료형입니다. Hint: 다시 정의하거나 형변환자를 사용해보십시오',
      ),
    ).toBe(
      '상위 메뉴 정보가 올바르지 않습니다. 상위 메뉴를 다시 선택한 뒤 저장해 주세요.',
    );
  });

  it('normalizes module and active permission definitions', async () => {
    apiMocks.apiGet.mockImplementation((path: string) => {
      if (path === '/api/v1/system/modules') {
        return Promise.resolve({
          resultList: [{ moduleId: 2, moduleNm: '환경설정', useAt: 'Y' }],
        });
      }
      if (path === '/api/v1/system/permissions') {
        return Promise.resolve({
          resultList: [
            {
              permissionId: 1,
              permissionCode: 'READ',
              permissionName: '조회',
              sortOrder: 10,
            },
          ],
        });
      }
      return Promise.reject(new Error(`unexpected ${path}`));
    });

    await expect(fetchModules()).resolves.toEqual([
      { moduleId: 2, moduleName: '환경설정' },
    ]);
    await expect(fetchActivePermissions()).resolves.toEqual(
      permissions.slice(0, 1),
    );
  });

  it('maps menu identity and hierarchy fields returned by the API', async () => {
    apiMocks.apiGet.mockResolvedValue({
      resultList: [
        {
          menuId: 10,
          moduleId: 2,
          moduleNm: '환경설정',
          parentMenuId: 4,
          parentMenuNm: '시스템 관리',
          menuCode: 'MENU',
          menuNm: '메뉴관리',
          menuDc: '모듈별 메뉴와 권한을 관리합니다.',
          menuUrl: '/settings/system/menus',
          iconNm: 'Menu',
          sortOrder: 2,
          useAt: 'Y',
          hasChildren: true,
          permissionCodes: ['READ'],
        },
      ],
    });

    await expect(fetchMenuRows(2)).resolves.toEqual([
      expect.objectContaining({
        id: '10',
        moduleId: 2,
        parentMenuId: '4',
        hasChildren: true,
        description: '모듈별 메뉴와 권한을 관리합니다.',
        permissionCodes: ['READ'],
      }),
    ]);
    expect(apiMocks.apiGet).toHaveBeenCalledWith(
      '/api/v1/system/menus?moduleId=2',
    );
  });

  it('sends inserted, updated, then deleted menu changes using their API routes', async () => {
    apiMocks.apiPost.mockResolvedValue({ item: { menuId: 12 } });
    apiMocks.apiPut.mockResolvedValue({});
    apiMocks.apiDelete.mockResolvedValue({});

    await expect(
      saveMenuChanges({
        insertedRows: [
          {
            ...menuRows[0],
            id: 'new-menu-1',
            parentMenuId: null,
            moduleId: 2,
          },
        ],
        updatedRows: [
          { ...menuRows[1], id: '10', parentMenuId: null, moduleId: 2 },
        ],
        deletedRows: [
          { ...menuRows[2], id: '11', parentMenuId: '10', moduleId: 2 },
        ],
      }),
    ).resolves.toEqual({ insertedMenuIds: { 'new-menu-1': '12' } });

    expect(apiMocks.apiPost).toHaveBeenCalledWith('/api/v1/system/menus', {
      moduleId: 2,
      parentMenuId: null,
      menuCode: 'DASH',
      menuNm: '대시보드',
      menuDc: '업무 현황과 알림 확인',
      menuUrl: '/dashboard',
      iconNm: null,
      sortOrder: 1,
      useAt: 'Y',
    });
    expect(apiMocks.apiPut).toHaveBeenCalledWith('/api/v1/system/menus/10', {
      moduleId: 2,
      parentMenuId: null,
      menuCode: 'SET',
      menuNm: '환경설정',
      menuDc: '시스템 관리와 권한 설정',
      menuUrl: '/settings',
      iconNm: null,
      sortOrder: 2,
      useAt: 'Y',
    });
    expect(apiMocks.apiDelete).toHaveBeenCalledWith('/api/v1/system/menus/11');
  });

  it('saves selected role menu permissions through the role-scoped endpoint', async () => {
    apiMocks.apiPut.mockResolvedValue({});

    await expect(
      saveRoleMenuPermissions('2', [
        { menuId: '10', permissionCodes: ['READ', 'CREATE'] },
        { menuId: '11', permissionCodes: [] },
      ]),
    ).resolves.toBeUndefined();

    expect(apiMocks.apiPut).toHaveBeenCalledWith(
      '/api/v1/system/roles/2/menu-permissions',
      {
        menuPermissions: [
          { menuId: 10, permissionCodes: ['READ', 'CREATE'] },
          { menuId: 11, permissionCodes: [] },
        ],
      },
    );
  });

  it('uses the server ID of an inserted parent when saving its new child', async () => {
    apiMocks.apiPost
      .mockResolvedValueOnce({ item: { menuId: 21 } })
      .mockResolvedValueOnce({ item: { menuId: 22 } });

    await expect(
      saveMenuChanges({
        insertedRows: [
          { ...menuRows[0], id: 'new-parent', parentMenuId: null, moduleId: 2 },
          {
            ...menuRows[1],
            id: 'new-child',
            parentMenuId: 'new-parent',
            moduleId: 2,
          },
        ],
        updatedRows: [],
        deletedRows: [],
      }),
    ).resolves.toEqual({
      insertedMenuIds: { 'new-parent': '21', 'new-child': '22' },
    });

    expect(apiMocks.apiPost).toHaveBeenLastCalledWith('/api/v1/system/menus', {
      moduleId: 2,
      parentMenuId: 21,
      menuCode: 'SET',
      menuNm: '환경설정',
      menuDc: '시스템 관리와 권한 설정',
      menuUrl: '/settings',
      iconNm: null,
      sortOrder: 2,
      useAt: 'Y',
    });
  });

  it('uses the server ID of an inserted parent when updating a child in the same save batch', async () => {
    apiMocks.apiPost.mockResolvedValue({ item: { menuId: 21 } });
    apiMocks.apiPut.mockResolvedValue({});

    await expect(
      saveMenuChanges(
        {
          insertedRows: [
            {
              ...menuRows[0],
              id: 'new-parent',
              parentMenuId: null,
              moduleId: 2,
            },
          ],
          updatedRows: [
            {
              ...menuRows[1],
              id: '10',
              parentMenuId: 'new-parent',
              moduleId: 2,
            },
          ],
          deletedRows: [],
        },
        {
          completedOperations: new Set(),
          insertedMenuIds: { 'new-parent': '21' },
        },
      ),
    ).resolves.toEqual({ insertedMenuIds: { 'new-parent': '21' } });

    expect(apiMocks.apiPut).toHaveBeenCalledWith('/api/v1/system/menus/10', {
      moduleId: 2,
      parentMenuId: 21,
      menuCode: 'SET',
      menuNm: '환경설정',
      menuDc: '시스템 관리와 권한 설정',
      menuUrl: '/settings',
      iconNm: null,
      sortOrder: 2,
      useAt: 'Y',
    });
  });
});

describe('MenuManagementPanel F1Tree workflow', () => {
  it('notifies its page after saving menu changes', async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    const onSaveSuccess = vi.fn();
    apiMocks.apiPut.mockResolvedValue({});
    render(
      <MenuManagementPanel
        menus={moduleTwoRows}
        selectedModule={modules[1]}
        permissions={permissions}
        onRefresh={onRefresh}
        onSaveSuccess={onSaveSuccess}
      />,
    );

    fireEvent.click(screen.getByLabelText('엑셀 10'));
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => expect(onRefresh).toHaveBeenCalledWith(2, true));
    expect(apiMocks.apiPut).toHaveBeenCalledWith(
      '/api/v1/system/menus/10/permissions',
      { permissionCodes: ['READ', 'EXCEL'] },
    );
    expect(onSaveSuccess).toHaveBeenCalledWith('메뉴 변경사항을 저장했습니다.');
  });

  it('saves permissions for an edited leaf after its ancestor is collapsed', async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    const nestedRows: MenuManagementRow[] = [
      {
        ...moduleTwoRows[0],
        id: '4',
        name: '시스템 관리',
        parentMenuId: null,
        hasChildren: true,
      },
      {
        ...moduleTwoRows[1],
        id: '10',
        name: '메뉴관리',
        parentMenuId: '4',
        hasChildren: false,
      },
    ];
    apiMocks.apiPut.mockResolvedValue({});
    render(
      <MenuManagementPanel
        menus={nestedRows}
        selectedModule={modules[1]}
        permissions={permissions}
        onRefresh={onRefresh}
      />,
    );

    fireEvent.click(screen.getByLabelText('엑셀 10'));
    fireEvent.click(screen.getByRole('button', { name: '시스템 관리 접기' }));
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => expect(onRefresh).toHaveBeenCalledWith(2, true));
    expect(apiMocks.apiPut).toHaveBeenCalledWith(
      '/api/v1/system/menus/10/permissions',
      { permissionCodes: ['READ', 'EXCEL'] },
    );
  });

  it('does not repeat a completed menu creation when permission save is retried', async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    apiMocks.apiPost.mockResolvedValue({ item: { menuId: 77 } });
    apiMocks.apiPut
      .mockRejectedValueOnce(new Error('권한 저장 실패'))
      .mockResolvedValueOnce({});
    render(
      <MenuManagementPanel
        menus={moduleTwoRows}
        selectedModule={modules[1]}
        permissions={permissions}
        onRefresh={onRefresh}
      />,
    );

    addRootMenuViaContextMenu();
    fireEvent.click(screen.getByLabelText('읽기 new-menu-1'));
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    expect(await screen.findByText('권한 저장 실패')).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => expect(onRefresh).toHaveBeenCalledWith(2, true));
    expect(apiMocks.apiPost).toHaveBeenCalledOnce();
    expect(apiMocks.apiPut).toHaveBeenCalledWith(
      '/api/v1/system/menus/77/permissions',
      { permissionCodes: ['READ'] },
    );
    expect(apiMocks.apiPut).toHaveBeenCalledTimes(2);
  });

  it('does not repeat completed menu or permission requests when automatic refresh is retried', async () => {
    const onRefresh = vi
      .fn()
      .mockRejectedValueOnce(new Error('메뉴 목록 요청 실패'))
      .mockResolvedValueOnce(undefined);
    apiMocks.apiPost.mockResolvedValue({ item: { menuId: 77 } });
    apiMocks.apiPut.mockResolvedValue({});
    render(
      <MenuManagementPanel
        menus={moduleTwoRows}
        selectedModule={modules[1]}
        permissions={permissions}
        onRefresh={onRefresh}
      />,
    );

    addRootMenuViaContextMenu();
    fireEvent.click(screen.getByLabelText('읽기 new-menu-1'));
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    expect(await screen.findByText('메뉴 목록 요청 실패')).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => expect(onRefresh).toHaveBeenCalledTimes(2));
    expect(apiMocks.apiPost).toHaveBeenCalledOnce();
    expect(apiMocks.apiPut).toHaveBeenCalledOnce();
  });

  it('adds a child, blocks parent deletion, and refreshes after saving changes', async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    apiMocks.apiPost.mockResolvedValue({ item: { menuId: 12 } });
    render(
      <MenuManagementPanel
        menus={menuRows}
        selectedModule={modules[1]}
        permissions={permissions}
        onRefresh={onRefresh}
      />,
    );

    fireEvent.click(screen.getByRole('gridcell', { name: 'SYS' }));
    fireEvent.click(screen.getByRole('button', { name: '삭제' }));
    expect(
      screen.getByText('하위 메뉴가 존재하는 메뉴는 삭제할 수 없습니다.'),
    ).toBeVisible();

    addChildMenuViaContextMenu(screen.getByRole('gridcell', { name: 'SYS' }));
    expect(screen.getByRole('gridcell', { name: '새 메뉴' })).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => expect(onRefresh).toHaveBeenCalledOnce());
  });

  it('saves a new leaf menu before its permissions and then refreshes the selected module', async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    apiMocks.apiPost.mockResolvedValue({ item: { menuId: 77 } });
    apiMocks.apiPut.mockResolvedValue({});
    render(
      <MenuManagementPanel
        menus={moduleTwoRows}
        selectedModule={modules[1]}
        permissions={permissions}
        onRefresh={onRefresh}
      />,
    );

    addRootMenuViaContextMenu();
    fireEvent.click(screen.getByLabelText('읽기 new-menu-1'));
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => expect(onRefresh).toHaveBeenCalledWith(2, true));
    expect(apiMocks.apiPost).toHaveBeenCalledWith(
      '/api/v1/system/menus',
      expect.any(Object),
    );
    expect(apiMocks.apiPut).toHaveBeenCalledWith(
      '/api/v1/system/menus/77/permissions',
      { permissionCodes: ['READ'] },
    );
    expect(apiMocks.apiPost.mock.invocationCallOrder[0]).toBeLessThan(
      apiMocks.apiPut.mock.invocationCallOrder[0],
    );
    expect(apiMocks.apiPut.mock.invocationCallOrder[0]).toBeLessThan(
      onRefresh.mock.invocationCallOrder[0],
    );
  });

  it('replaces permissions for an updated existing leaf', async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    apiMocks.apiPut.mockResolvedValue({});
    render(
      <MenuManagementPanel
        menus={moduleTwoRows}
        selectedModule={modules[1]}
        permissions={permissions}
        onRefresh={onRefresh}
      />,
    );

    fireEvent.click(screen.getByLabelText('엑셀 10'));
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => expect(onRefresh).toHaveBeenCalledWith(2, true));
    expect(apiMocks.apiPut).toHaveBeenCalledWith(
      '/api/v1/system/menus/10/permissions',
      { permissionCodes: ['READ', 'EXCEL'] },
    );
  });

  it('keeps changed permissions visible and does not refresh when permission save fails', async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    apiMocks.apiPut.mockRejectedValue(new Error('권한 저장 실패'));
    render(
      <MenuManagementPanel
        menus={moduleTwoRows}
        selectedModule={modules[1]}
        permissions={permissions}
        onRefresh={onRefresh}
      />,
    );

    fireEvent.click(screen.getByLabelText('엑셀 10'));
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    expect(await screen.findByText('권한 저장 실패')).toBeVisible();
    expect(screen.getByLabelText('엑셀 10')).toBeChecked();
    expect(screen.getByText(/수정 1건/)).toBeVisible();
    expect(onRefresh).not.toHaveBeenCalled();
  });

  it('keeps local changes when the automatic refresh fails after menu and permission saves', async () => {
    const onRefresh = vi
      .fn()
      .mockRejectedValue(new Error('메뉴 목록 요청 실패'));
    apiMocks.apiPut.mockResolvedValue({});
    render(
      <MenuManagementPanel
        menus={moduleTwoRows}
        selectedModule={modules[1]}
        permissions={permissions}
        onRefresh={onRefresh}
      />,
    );

    fireEvent.click(screen.getByLabelText('엑셀 10'));
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    expect(await screen.findByText('메뉴 목록 요청 실패')).toBeVisible();
    expect(screen.getByLabelText('엑셀 10')).toBeChecked();
    expect(screen.getByText(/수정 1건/)).toBeVisible();
    expect(apiMocks.apiPut).toHaveBeenCalledWith(
      '/api/v1/system/menus/10/permissions',
      { permissionCodes: ['READ', 'EXCEL'] },
    );
    expect(onRefresh).toHaveBeenCalledWith(2, true);
  });

  it('does not replace permissions for a deleted menu', async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    apiMocks.apiDelete.mockResolvedValue({});
    render(
      <MenuManagementPanel
        menus={moduleTwoRows}
        selectedModule={modules[1]}
        permissions={permissions}
        onRefresh={onRefresh}
      />,
    );

    fireEvent.click(screen.getByRole('gridcell', { name: 'MENU' }));
    fireEvent.click(screen.getByRole('button', { name: '삭제' }));
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => expect(onRefresh).toHaveBeenCalledWith(2, true));
    expect(apiMocks.apiDelete).toHaveBeenCalledWith('/api/v1/system/menus/10');
    expect(apiMocks.apiPut).not.toHaveBeenCalled();
  });
});

describe('MenuManagementPage module selection', () => {
  it('shows the full saved menu hierarchy in the page breadcrumb', async () => {
    apiMocks.apiGet.mockImplementation((path: string) => {
      if (path === '/api/v1/system/modules') {
        return Promise.resolve({ resultList: [] });
      }
      if (path === '/api/v1/system/permissions') {
        return Promise.resolve({ resultList: [] });
      }
      return Promise.reject(new Error(`unexpected ${path}`));
    });

    render(
      <MenuManagementPage
        {...pageProps}
        currentMenuName="메뉴관리"
        breadcrumbItems={['환경설정', '시스템관리', '메뉴관리']}
      />,
    );

    expect(
      await screen.findByText('환경설정 > 시스템관리 > 메뉴관리'),
    ).toBeVisible();
    const hiddenBreadcrumb = screen
      .getAllByText('환경설정 > 시스템관리 > 메뉴관리')
      .find((element) => element.getAttribute('aria-hidden') === 'true');
    expect(hiddenBreadcrumb).toHaveStyle({ width: '1px', height: '1px' });
    expect(
      screen
        .getByText('환경설정 > 시스템관리 > 메뉴관리')
        .closest('.MuiTypography-root'),
    ).toHaveStyle({ overflowWrap: 'anywhere' });
  });

  it('shows only query, save, and delete for read, write, and delete permissions', async () => {
    apiMocks.apiGet.mockImplementation((path: string) => {
      if (path === '/api/v1/system/modules') {
        return Promise.resolve({
          resultList: modules.map((module) => ({
            moduleId: module.moduleId,
            moduleNm: module.moduleName,
            useAt: 'Y',
          })),
        });
      }
      if (path === '/api/v1/system/permissions') {
        return Promise.resolve({ resultList: permissions });
      }
      if (path === '/api/v1/system/menus?moduleId=1') {
        return Promise.resolve({ resultList: [] });
      }
      return Promise.reject(new Error(`unexpected ${path}`));
    });

    render(<MenuManagementPage {...pageProps} />);

    expect(await screen.findByRole('button', { name: '조회' })).toBeVisible();
    expect(screen.getByRole('button', { name: '저장' })).toBeVisible();
    expect(screen.getByRole('button', { name: '삭제' })).toBeVisible();
    expect(
      screen.queryByRole('button', { name: '등록' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: '수정' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: '새로고침' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: '엑셀' }),
    ).not.toBeInTheDocument();
  });

  it('aligns the module selector and search field on the same baseline', async () => {
    apiMocks.apiGet.mockImplementation((path: string) => {
      if (path === '/api/v1/system/modules') {
        return Promise.resolve({
          resultList: modules.map((module) => ({
            moduleId: module.moduleId,
            moduleNm: module.moduleName,
            useAt: 'Y',
          })),
        });
      }
      if (path === '/api/v1/system/permissions') {
        return Promise.resolve({ resultList: permissions });
      }
      if (path === '/api/v1/system/menus?moduleId=1') {
        return Promise.resolve({ resultList: [] });
      }
      return Promise.reject(new Error(`unexpected ${path}`));
    });

    render(<MenuManagementPage {...pageProps} />);

    await screen.findByRole('combobox', { name: '모듈 선택' });

    const moduleSelector = screen.getByRole('combobox', { name: '모듈 선택' });
    const searchField = screen.getByRole('textbox', { name: '메뉴 검색' });
    const searchFieldRoot = searchField.closest('.MuiFormControl-root');

    expect(moduleSelector).toBeVisible();
    expect(searchField).toBeVisible();
    expect(moduleSelector).toHaveAccessibleName('모듈 선택');
    expect(searchFieldRoot).toHaveStyle({ margin: '0px' });
  });

  it('shows the role selector and loads role-scoped menu data', async () => {
    const roleRows = [
      { roleId: 1, roleNm: '관리자', useAt: 'Y', roleCode: 'ADMIN' },
      { roleId: 2, roleNm: '운영자', useAt: 'Y', roleCode: 'OPERATOR' },
    ];

    apiMocks.apiGet.mockImplementation((path: string) => {
      if (path === '/api/v1/system/modules') {
        return Promise.resolve({
          resultList: modules.map((module) => ({
            moduleId: module.moduleId,
            moduleNm: module.moduleName,
            useAt: 'Y',
          })),
        });
      }
      if (path === '/api/v1/system/roles') {
        return Promise.resolve({ resultList: roleRows });
      }
      if (path === '/api/v1/system/permissions') {
        return Promise.resolve({ resultList: permissions });
      }
      if (path === '/api/v1/system/menus?moduleId=1&roleId=1') {
        return Promise.resolve({ resultList: [] });
      }
      return Promise.reject(new Error(`unexpected ${path}`));
    });

    render(<MenuManagementPage {...pageProps} />);

    const roleSelector = await screen.findByRole('combobox', {
      name: '권한 선택',
    });
    expect(roleSelector).toBeVisible();

    fireEvent.mouseDown(roleSelector);
    fireEvent.click(screen.getByRole('option', { name: '운영자' }));

    await waitFor(() => {
      expect(apiMocks.apiGet).toHaveBeenCalledWith(
        '/api/v1/system/menus?moduleId=1&roleId=2',
      );
    });
  });

  it('handles search input change, enter key search, and clear button', async () => {
    apiMocks.apiGet.mockImplementation((path: string) => {
      if (path === '/api/v1/system/modules') {
        return Promise.resolve({
          resultList: modules.map((module) => ({
            moduleId: module.moduleId,
            moduleNm: module.moduleName,
            useAt: 'Y',
          })),
        });
      }
      if (path === '/api/v1/system/permissions') {
        return Promise.resolve({ resultList: permissions });
      }
      if (path === '/api/v1/system/menus?moduleId=1') {
        return Promise.resolve({ resultList: [] });
      }
      return Promise.reject(new Error(`unexpected ${path}`));
    });

    render(<MenuManagementPage {...pageProps} />);

    const searchInput = await screen.findByRole('textbox', {
      name: '메뉴 검색',
    });
    fireEvent.change(searchInput, { target: { value: '대시보드' } });
    expect(searchInput).toHaveValue('대시보드');

    const clearButton = screen.getByRole('button', { name: '검색어 초기화' });
    expect(clearButton).toBeVisible();

    fireEvent.keyDown(searchInput, { key: 'Enter', code: 'Enter' });
    await waitFor(() => {
      expect(apiMocks.apiGet).toHaveBeenCalledWith(
        '/api/v1/system/menus?moduleId=1',
      );
    });

    fireEvent.click(clearButton);
    expect(searchInput).toHaveValue('');
    expect(
      screen.queryByRole('button', { name: '검색어 초기화' }),
    ).not.toBeInTheDocument();
  });

  function mockMenuPageRequests({
    failModuleOneReload = false,
  }: { failModuleOneReload?: boolean } = {}) {
    let moduleOneRequestCount = 0;
    apiMocks.apiGet.mockImplementation((path: string) => {
      if (path === '/api/v1/system/roles')
        return Promise.resolve({
          resultList: [
            { roleId: 1, roleNm: '관리자', useAt: 'Y', roleCode: 'ADMIN' },
            { roleId: 2, roleNm: '운영자', useAt: 'Y', roleCode: 'OPERATOR' },
          ],
        });
      if (path === '/api/v1/system/modules')
        return Promise.resolve({
          resultList: modules.map((module) => ({
            ...module,
            moduleNm: module.moduleName,
            useAt: 'Y',
          })),
        });
      if (path === '/api/v1/system/permissions')
        return Promise.resolve({ resultList: permissions });
      if (
        path === '/api/v1/system/menus?moduleId=1' ||
        path === '/api/v1/system/menus?moduleId=1&roleId=1'
      ) {
        moduleOneRequestCount += 1;
        if (failModuleOneReload && moduleOneRequestCount > 1) {
          return Promise.reject(new Error('메뉴 목록 요청 실패'));
        }
        return Promise.resolve({
          resultList: moduleOneRows.map((row) => ({
            menuId: Number(row.id),
            moduleId: row.moduleId,
            moduleNm: row.moduleName,
            parentMenuId: row.parentMenuId,
            parentMenuNm: row.parent,
            menuCode: row.code,
            menuNm: row.name,
            menuUrl: row.path,
            iconNm: row.iconName,
            sortOrder: row.order,
            useAt: 'Y',
            hasChildren: row.hasChildren,
            permissionCodes: row.permissionCodes,
          })),
        });
      }
      if (
        path === '/api/v1/system/menus?moduleId=2' ||
        path === '/api/v1/system/menus?moduleId=2&roleId=1'
      )
        return Promise.resolve({
          resultList: moduleTwoRows.map((row) => ({
            menuId: Number(row.id),
            moduleId: row.moduleId,
            moduleNm: row.moduleName,
            parentMenuId: row.parentMenuId,
            parentMenuNm: row.parent,
            menuCode: row.code,
            menuNm: row.name,
            menuUrl: row.path,
            iconNm: row.iconName,
            sortOrder: row.order,
            useAt: 'Y',
            hasChildren: row.hasChildren,
            permissionCodes: row.permissionCodes,
          })),
        });
      return Promise.reject(new Error(`unexpected ${path}`));
    });
  }

  it('shows only permission-gated page actions at the top-right and keeps the grid toolbar to tree controls', async () => {
    mockMenuPageRequests();
    render(<MenuManagementPage {...pageProps} />);

    expect(
      await screen.findByRole('gridcell', { name: '대시보드' }),
    ).toBeVisible();
    expect(screen.getByRole('combobox', { name: '모듈 선택' })).toBeVisible();
    expect(screen.getByRole('button', { name: '조회' })).toBeVisible();
    expect(
      screen.queryByRole('button', { name: '등록' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: '수정' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '삭제' })).toBeVisible();
    expect(screen.getByRole('button', { name: '저장' })).toBeVisible();
    expect(
      screen.queryByRole('button', { name: '루트 메뉴 추가' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: '하위 메뉴 추가' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '전체 펼치기' })).toBeVisible();
    expect(screen.getByRole('button', { name: '전체 접기' })).toBeVisible();
  });

  it('keeps the completed creation checkpoint after a confirmed same-module refresh', async () => {
    mockMenuPageRequests();
    apiMocks.apiPost.mockResolvedValue({ item: { menuId: 77 } });
    apiMocks.apiPut
      .mockRejectedValueOnce(new Error('권한 저장 실패'))
      .mockResolvedValueOnce({});
    render(<MenuManagementPage {...pageProps} />);

    expect(
      await screen.findByRole('gridcell', { name: '대시보드' }),
    ).toBeVisible();
    addRootMenuViaContextMenu();
    fireEvent.click(screen.getByLabelText('읽기 new-menu-1'));
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    expect(await screen.findByText('권한 저장 실패')).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: '조회' }));
    fireEvent.click(screen.getByRole('button', { name: '계속' }));
    await waitFor(() =>
      expect(apiMocks.apiGet).toHaveBeenCalledWith(
        '/api/v1/system/menus?moduleId=1',
      ),
    );
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => expect(apiMocks.apiPost).toHaveBeenCalledOnce());
    expect(apiMocks.apiPut).toHaveBeenLastCalledWith(
      '/api/v1/system/menus/77/permissions',
      { permissionCodes: ['READ'] },
    );
  });

  it('fetches and switches the menu tree for the selected module', async () => {
    mockMenuPageRequests();

    render(<MenuManagementPage {...pageProps} />);

    expect(
      await screen.findByRole('gridcell', { name: '대시보드' }),
    ).toBeVisible();
    fireEvent.mouseDown(screen.getByRole('combobox', { name: '모듈 선택' }));
    fireEvent.click(screen.getByRole('option', { name: '환경설정' }));

    expect(
      await screen.findByRole('gridcell', { name: '메뉴관리' }),
    ).toBeVisible();
    expect(
      screen.queryByRole('gridcell', { name: '대시보드' }),
    ).not.toBeInTheDocument();
    expect(apiMocks.apiGet).toHaveBeenCalledWith(
      '/api/v1/system/menus?moduleId=2',
    );
  });

  it('hides previous module rows while the next module menu request is pending', async () => {
    let resolveModuleTwo:
      | ((value: { resultList: unknown[] }) => void)
      | undefined;
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
      if (path === '/api/v1/system/permissions') {
        return Promise.resolve({ resultList: permissions });
      }
      if (path === '/api/v1/system/menus?moduleId=1') {
        return Promise.resolve({
          resultList: moduleOneRows.map((row) => ({
            menuId: Number(row.id),
            moduleId: row.moduleId,
            moduleNm: row.moduleName,
            parentMenuId: row.parentMenuId,
            parentMenuNm: row.parent,
            menuCode: row.code,
            menuNm: row.name,
            menuUrl: row.path,
            iconNm: row.iconName,
            sortOrder: row.order,
            useAt: 'Y',
            hasChildren: row.hasChildren,
            permissionCodes: row.permissionCodes,
          })),
        });
      }
      if (path === '/api/v1/system/menus?moduleId=2') {
        return new Promise((resolve) => {
          resolveModuleTwo = resolve;
        });
      }
      return Promise.reject(new Error(`unexpected ${path}`));
    });
    render(<MenuManagementPage {...pageProps} />);

    expect(
      await screen.findByRole('gridcell', { name: '대시보드' }),
    ).toBeVisible();
    fireEvent.mouseDown(screen.getByRole('combobox', { name: '모듈 선택' }));
    fireEvent.click(screen.getByRole('option', { name: '환경설정' }));

    await waitFor(() =>
      expect(
        screen.queryByRole('gridcell', { name: '대시보드' }),
      ).not.toBeInTheDocument(),
    );

    resolveModuleTwo?.({
      resultList: moduleTwoRows.map((row) => ({
        menuId: Number(row.id),
        moduleId: row.moduleId,
        moduleNm: row.moduleName,
        parentMenuId: row.parentMenuId,
        parentMenuNm: row.parent,
        menuCode: row.code,
        menuNm: row.name,
        menuUrl: row.path,
        iconNm: row.iconName,
        sortOrder: row.order,
        useAt: 'Y',
        hasChildren: row.hasChildren,
        permissionCodes: row.permissionCodes,
      })),
    });

    expect(
      await screen.findByRole('gridcell', { name: '메뉴관리' }),
    ).toBeVisible();
  });

  it('disables module selection during a deferred save and prevents stale module requests', async () => {
    mockMenuPageRequests();
    let resolveSave:
      | ((value: { item: { menuId: number } }) => void)
      | undefined;
    apiMocks.apiPost.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSave = resolve;
        }),
    );
    render(<MenuManagementPage {...pageProps} />);

    expect(
      await screen.findByRole('gridcell', { name: '대시보드' }),
    ).toBeVisible();
    addRootMenuViaContextMenu();
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => expect(apiMocks.apiPost).toHaveBeenCalledOnce());
    const moduleSelector = screen.getByRole('combobox', { name: '모듈 선택' });
    expect(moduleSelector).toHaveAttribute('aria-disabled', 'true');
    fireEvent.mouseDown(moduleSelector);
    expect(
      screen.queryByRole('option', { name: '환경설정' }),
    ).not.toBeInTheDocument();
    expect(apiMocks.apiGet).not.toHaveBeenCalledWith(
      '/api/v1/system/menus?moduleId=2',
    );

    resolveSave?.({ item: { menuId: 12 } });

    await waitFor(() =>
      expect(moduleSelector).not.toHaveAttribute('aria-disabled', 'true'),
    );
    expect(screen.getByRole('gridcell', { name: '대시보드' })).toBeVisible();
    expect(
      screen.queryByRole('gridcell', { name: '시스템 관리' }),
    ).not.toBeInTheDocument();
  });

  it('disables module selection while a clean refresh is loading', async () => {
    let resolveReload: ((value: { resultList: unknown[] }) => void) | undefined;
    let moduleOneRequestCount = 0;
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
      if (path === '/api/v1/system/permissions') {
        return Promise.resolve({ resultList: permissions });
      }
      if (path === '/api/v1/system/menus?moduleId=1') {
        moduleOneRequestCount += 1;
        if (moduleOneRequestCount === 1)
          return Promise.resolve({ resultList: [] });
        return new Promise((resolve) => {
          resolveReload = resolve;
        });
      }
      return Promise.resolve({ resultList: [] });
    });
    render(<MenuManagementPage {...pageProps} />);

    await screen.findByRole('grid', { name: 'F1-TREE 메뉴 관리' });
    fireEvent.click(screen.getByRole('button', { name: '조회' }));

    await waitFor(() =>
      expect(
        screen.getByRole('combobox', { name: '모듈 선택' }),
      ).toHaveAttribute('aria-disabled', 'true'),
    );

    resolveReload?.({ resultList: [] });
    await waitFor(() =>
      expect(
        screen.getByRole('combobox', { name: '모듈 선택' }),
      ).not.toHaveAttribute('aria-disabled', 'true'),
    );
  });

  it('keeps the active module and local menu when a dirty module switch is cancelled, then reloads the confirmed module', async () => {
    mockMenuPageRequests();
    render(<MenuManagementPage {...pageProps} />);

    expect(
      await screen.findByRole('gridcell', { name: '대시보드' }),
    ).toBeVisible();
    addRootMenuViaContextMenu();
    fireEvent.mouseDown(screen.getByRole('combobox', { name: '모듈 선택' }));
    fireEvent.click(screen.getByRole('option', { name: '환경설정' }));

    expect(screen.getByRole('dialog')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '취소' }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect(screen.getByRole('gridcell', { name: '대시보드' })).toBeVisible();
    expect(screen.getByRole('gridcell', { name: 'NEW1' })).toBeVisible();
    expect(apiMocks.apiGet).not.toHaveBeenCalledWith(
      '/api/v1/system/menus?moduleId=2',
    );

    fireEvent.mouseDown(screen.getByRole('combobox', { name: '모듈 선택' }));
    fireEvent.click(screen.getByRole('option', { name: '환경설정' }));
    fireEvent.click(screen.getByRole('button', { name: '계속' }));

    expect(
      await screen.findByRole('gridcell', { name: '메뉴관리' }),
    ).toBeVisible();
    expect(apiMocks.apiGet).toHaveBeenCalledWith(
      '/api/v1/system/menus?moduleId=2',
    );
  });

  it('reloads active permissions after confirming a dirty module switch while keeping common permission columns', async () => {
    let permissionRequestCount = 0;
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
      if (path === '/api/v1/system/permissions') {
        permissionRequestCount += 1;
        return Promise.resolve({
          resultList:
            permissionRequestCount === 1 ? [permissions[0]] : [permissions[1]],
        });
      }
      if (path === '/api/v1/system/menus?moduleId=1') {
        return Promise.resolve({ resultList: [] });
      }
      if (path === '/api/v1/system/menus?moduleId=2') {
        return Promise.resolve({ resultList: [] });
      }
      return Promise.reject(new Error(`unexpected ${path}`));
    });
    render(<MenuManagementPage {...pageProps} />);

    await screen.findByRole('columnheader', { name: /읽기/ });
    addRootMenuViaContextMenu();
    fireEvent.mouseDown(screen.getByRole('combobox', { name: '모듈 선택' }));
    fireEvent.click(screen.getByRole('option', { name: '환경설정' }));
    fireEvent.click(screen.getByRole('button', { name: '취소' }));

    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect(apiMocks.apiGet).toHaveBeenCalledTimes(4);
    expect(screen.getByRole('columnheader', { name: /읽기/ })).toBeVisible();

    fireEvent.mouseDown(screen.getByRole('combobox', { name: '모듈 선택' }));
    fireEvent.click(screen.getByRole('option', { name: '환경설정' }));
    fireEvent.click(screen.getByRole('button', { name: '계속' }));

    await waitFor(() => expect(apiMocks.apiGet).toHaveBeenCalledTimes(6));
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect(apiMocks.apiGet).toHaveBeenCalledTimes(6);
    expect(screen.getByRole('columnheader', { name: /읽기/ })).toBeVisible();
    expect(screen.getByRole('columnheader', { name: /엑셀/ })).toBeVisible();
  });

  it('keeps local changes when a dirty refresh is cancelled and reloads after confirmation', async () => {
    mockMenuPageRequests();
    render(<MenuManagementPage {...pageProps} />);

    expect(
      await screen.findByRole('gridcell', { name: '대시보드' }),
    ).toBeVisible();
    addRootMenuViaContextMenu();
    fireEvent.click(screen.getByRole('button', { name: '조회' }));

    expect(screen.getByRole('dialog')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '취소' }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect(screen.getByRole('gridcell', { name: 'NEW1' })).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: '조회' }));
    fireEvent.click(screen.getByRole('button', { name: '계속' }));
    await waitFor(() => expect(apiMocks.apiGet).toHaveBeenCalledTimes(5));
    expect(
      screen.queryByRole('gridcell', { name: 'NEW1' }),
    ).not.toBeInTheDocument();
  });

  it('shows a menu reload error while retaining local visible changes', async () => {
    mockMenuPageRequests({ failModuleOneReload: true });
    render(<MenuManagementPage {...pageProps} />);

    expect(
      await screen.findByRole('gridcell', { name: '대시보드' }),
    ).toBeVisible();
    addRootMenuViaContextMenu();
    fireEvent.click(screen.getByRole('button', { name: '조회' }));
    fireEvent.click(screen.getByRole('button', { name: '계속' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '메뉴 목록 요청 실패',
    );
    expect(screen.getByRole('gridcell', { name: 'NEW1' })).toBeVisible();
  });

  it('shows a clean refresh error without leaving its rejection unhandled', async () => {
    mockMenuPageRequests({ failModuleOneReload: true });
    render(<MenuManagementPage {...pageProps} />);

    expect(
      await screen.findByRole('gridcell', { name: '대시보드' }),
    ).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '조회' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '메뉴 목록 요청 실패',
    );
  });
});

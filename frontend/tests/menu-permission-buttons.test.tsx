import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { F1GridColumn } from '../src/shared/components/f1-grid';
import { readOnlyColumns, screenPermissionsOf } from '../src/shared/utils/menuPermission';
import { ModuleManagementPage } from '../src/pages/settings/system/modules/ModuleManagementPage';

const apiMocks = vi.hoisted(() => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPut: vi.fn(),
  apiDelete: vi.fn(),
}));
vi.mock('../src/shared/services/apiClient', () => apiMocks);

const ALL = { read: true, create: true, update: true, delete: true, excel: true };
const READ_ONLY = { read: true, create: false, update: false, delete: false, excel: false };

beforeEach(() => {
  vi.clearAllMocks();
});

describe('메뉴 권한 도우미 (2026-10-21)', () => {
  it('기본기능 4칸: 쓰기 = 등록 또는 수정', () => {
    expect(screenPermissionsOf(undefined)).toEqual({ read: false, write: false, delete: false, excel: false });
    expect(screenPermissionsOf({ ...READ_ONLY, update: true })).toMatchObject({ read: true, write: true, delete: false });
    expect(screenPermissionsOf(ALL)).toEqual({ read: true, write: true, delete: true, excel: true });
  });

  it('쓰기가 없으면 모든 칸(체크 칸 포함)을 고칠 수 없다. 순번 칸 · 쓰기 있음은 그대로', () => {
    type Row = { id: string; name: string; on: boolean };
    const columns: F1GridColumn<Row>[] = [
      { field: 'id', type: 'rownumber', headerName: '순번' },
      { field: 'name', headerName: '이름', editable: true },
      { field: 'on', headerName: '사용', type: 'checkbox' },
    ];
    expect(readOnlyColumns(columns, true)).toBe(columns);
    const locked = readOnlyColumns(columns, false);
    expect(locked[0]).toBe(columns[0]);
    expect(locked.slice(1).map((column) => column.editable)).toEqual([false, false]);
    // 같은 칸 정의에는 같은 배열(렌더마다 새 배열이 그리드로 가지 않게)
    expect(readOnlyColumns(columns, false)).toBe(locked);
  });
});

describe('모듈관리: 메뉴 권한에 따라 단추 · 오른쪽 클릭 메뉴', () => {
  const renderPage = (permissions: typeof ALL) => {
    apiMocks.apiGet.mockResolvedValue({
      resultList: [{ moduleId: 1, moduleCode: 'GROUPWARE', moduleNm: '그룹웨어', iconNm: 'FileText', moduleUrl: '/groupware', sortOrder: 1, useAt: 'Y', menuCount: 2 }],
    });
    render(
      <ModuleManagementPage
        selectedModule={{ id: 'settings', name: '환경설정', icon: null, tree: [], menus: [] }}
        currentMenuName="모듈관리"
        content={{ title: '모듈관리', description: '모듈을 관리합니다.', cards: [], items: [] }}
        selectedMenuPermissions={permissions}
      />,
    );
  };

  it('읽기만: [저장] 없음, 오른쪽 클릭 [행 추가] · [행 삭제] 없음', async () => {
    renderPage(READ_ONLY);
    const cell = await screen.findByRole('gridcell', { name: '그룹웨어' });
    expect(screen.queryByRole('button', { name: '저장' })).not.toBeInTheDocument();
    fireEvent.contextMenu(cell);
    await waitFor(() => {
      expect(screen.queryByRole('menuitem', { name: '행 추가' })).not.toBeInTheDocument();
      expect(screen.queryByRole('menuitem', { name: '행 삭제' })).not.toBeInTheDocument();
    });
  });

  it('모든 권한: [저장] · 오른쪽 클릭 [행 추가] · [행 삭제] 있음(지금과 같음)', async () => {
    renderPage(ALL);
    const cell = await screen.findByRole('gridcell', { name: '그룹웨어' });
    expect(screen.getByRole('button', { name: '저장' })).toBeInTheDocument();
    fireEvent.contextMenu(cell);
    expect(await screen.findByRole('menuitem', { name: '행 추가' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: '행 삭제' })).toBeInTheDocument();
  });
});

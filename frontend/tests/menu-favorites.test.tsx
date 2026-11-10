import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({
  apiDelete: vi.fn(),
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPut: vi.fn(),
}));

vi.mock('../src/shared/services/apiClient', () => api);

import {
  createMenuFavorite,
  createMenuFavoriteFolder,
  deleteMenuFavorite,
  deleteMenuFavoriteFolder,
  fetchMenuFavorites,
  moveMenuFavorite,
  renameMenuFavoriteFolder,
} from '../src/pages/dashboard/services/menuFavorite.service';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { DashboardMenuTree } from '../src/pages/dashboard/components/DashboardMenuTree';
import { MenuFavoritesTree } from '../src/pages/dashboard/components/MenuFavoritesTree';

describe('menu favorites service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses the favorites list endpoint and propagates errors', async () => {
    api.apiGet.mockRejectedValueOnce(new Error('forbidden'));
    await expect(fetchMenuFavorites()).rejects.toThrow('forbidden');
    expect(api.apiGet).toHaveBeenCalledWith('/api/v1/menus/favorites');
  });

  it('creates a root favorite with an explicit null folder', async () => {
    api.apiPost.mockResolvedValue({ item: { folders: [], favorites: [] } });

    await expect(createMenuFavorite(210, null, '공지 바로가기')).resolves.toEqual({
      folders: [],
      favorites: [],
    });

    expect(api.apiPost).toHaveBeenCalledWith('/api/v1/menus/favorites', {
      menuId: 210,
      folderId: null,
      favoriteName: '공지 바로가기',
    });
  });

  it('maps folder and favorite changes to the documented endpoints', async () => {
    const response = { item: { folders: [], favorites: [] } };
    api.apiPost.mockResolvedValue(response);
    api.apiPut.mockResolvedValue(response);
    api.apiDelete.mockResolvedValue(response);

    await createMenuFavoriteFolder('업무');
    await renameMenuFavoriteFolder(12, '결재');
    await deleteMenuFavoriteFolder(12);
    await moveMenuFavorite(5, null, '결재 메뉴');
    await deleteMenuFavorite(5);

    expect(api.apiPost).toHaveBeenCalledWith(
      '/api/v1/menus/favorites/folders',
      { folderName: '업무' },
    );
    expect(api.apiPut).toHaveBeenNthCalledWith(
      1,
      '/api/v1/menus/favorites/folders/12',
      { folderName: '결재' },
    );
    expect(api.apiDelete).toHaveBeenNthCalledWith(
      1,
      '/api/v1/menus/favorites/folders/12',
    );
    expect(api.apiPut).toHaveBeenNthCalledWith(
      2,
      '/api/v1/menus/favorites/5/location',
      { folderId: null, favoriteName: '결재 메뉴' },
    );
    expect(api.apiDelete).toHaveBeenNthCalledWith(
      2,
      '/api/v1/menus/favorites/5',
    );
  });

  it('registers a root favorite before opening its editor without selecting the menu', async () => {
    api.apiPost.mockResolvedValue({
      item: {
        folders: [],
        favorites: [{ favoriteId: 31, menuId: 210, folderId: null, favoriteName: '공지사항' }],
      },
    });
    const onMenuSelect = vi.fn();
    const onFavoritesRefresh = vi.fn().mockResolvedValue(undefined);

    render(
      <DashboardMenuTree
        selectedModule={{
          id: 'groupware',
          name: '그룹웨어',
          icon: null,
          tree: [
            {
              id: 'notice',
              menuId: 210,
              name: '공지사항',
              path: '/groupware/notice',
              permissions: { read: true, create: false, update: false, delete: false },
            },
          ],
          menus: [],
        }}
        expandedItemIds={[]}
        selectedMenuId="notice"
        favorites={{ folders: [], favorites: [] }}
        onFavoritesRefresh={onFavoritesRefresh}
        onMenuSelect={onMenuSelect}
      />,
    );

    const addButton = screen.getByRole('button', { name: '즐겨찾기 추가: 공지사항' });
    expect(addButton).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(addButton);

    expect(await screen.findByRole('dialog', { name: '즐겨찾기 편집' })).toBeInTheDocument();
    expect(api.apiPost).toHaveBeenCalledWith('/api/v1/menus/favorites', {
      menuId: 210,
      folderId: null,
      favoriteName: '공지사항',
    });
    expect(screen.getByLabelText('이름')).toHaveValue('공지사항');
    expect(screen.getByLabelText('URL')).toHaveValue('/groupware/notice');
    expect(screen.getByLabelText('폴더')).toHaveTextContent('즐겨찾기 루트');
    expect(screen.queryByRole('button', { name: '새 폴더' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /즐겨찾기 더보기/ })).not.toBeInTheDocument();
    expect(onMenuSelect).not.toHaveBeenCalled();
  });

  it('removes an existing favorite from its editor without selecting the menu', async () => {
    api.apiDelete.mockResolvedValue({ item: { folders: [], favorites: [] } });
    const onMenuSelect = vi.fn();

    render(
      <DashboardMenuTree
        selectedModule={{
          id: 'groupware',
          name: '그룹웨어',
          icon: null,
          tree: [
            {
              id: 'notice',
              menuId: 210,
              name: '공지사항',
              path: '/groupware/notice',
              permissions: { read: true, create: false, update: false, delete: false },
            },
          ],
          menus: [],
        }}
        expandedItemIds={[]}
        selectedMenuId="notice"
        favorites={{
          folders: [],
          favorites: [{ favoriteId: 17, menuId: 210, folderId: null, favoriteName: null }],
        }}
        onFavoritesRefresh={vi.fn().mockResolvedValue(undefined)}
        onMenuSelect={onMenuSelect}
      />,
    );

    const removeButton = screen.getByRole('button', { name: '즐겨찾기 편집: 공지사항' });
    expect(removeButton).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(removeButton);

    expect(await screen.findByRole('dialog', { name: '즐겨찾기 편집' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '제거' }));
    await waitFor(() => {
      expect(api.apiDelete).toHaveBeenCalledWith('/api/v1/menus/favorites/17');
    });
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: '즐겨찾기 편집' })).not.toBeInTheDocument();
    });
    expect(onMenuSelect).not.toHaveBeenCalled();
  });

  it('keeps the editor open with its draft when saving a favorite fails', async () => {
    api.apiPut.mockRejectedValueOnce(new Error('저장 실패'));
    render(
      <DashboardMenuTree
        selectedModule={{
          id: 'groupware',
          name: '그룹웨어',
          icon: null,
          tree: [
            {
              id: 'notice',
              menuId: 210,
              name: '공지사항',
              path: '/groupware/notice',
              permissions: { read: true, create: false, update: false, delete: false },
            },
          ],
          menus: [],
        }}
        expandedItemIds={[]}
        selectedMenuId="notice"
        favorites={{
          folders: [],
          favorites: [{ favoriteId: 17, menuId: 210, folderId: null, favoriteName: '공지사항' }],
        }}
        onFavoritesRefresh={vi.fn().mockResolvedValue(undefined)}
        onMenuSelect={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '즐겨찾기 편집: 공지사항' }));
    fireEvent.change(screen.getByLabelText('이름'), { target: { value: '중요 공지' } });
    fireEvent.click(screen.getByRole('button', { name: '완료' }));

    expect(await screen.findByText('저장 실패')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: '즐겨찾기 편집' })).toBeInTheDocument();
    expect(screen.getByLabelText('이름')).toHaveValue('중요 공지');
    expect(api.apiPut).toHaveBeenCalledWith('/api/v1/menus/favorites/17/location', {
      folderId: null,
      favoriteName: '중요 공지',
    });
  });

  it('saves a custom name and selected favorite folder', async () => {
    api.apiPut.mockResolvedValue({ item: { folders: [], favorites: [] } });
    render(
      <DashboardMenuTree
        selectedModule={{
          id: 'groupware',
          name: '그룹웨어',
          icon: null,
          tree: [
            {
              id: 'notice',
              menuId: 210,
              name: '공지사항',
              path: '/groupware/notice',
              permissions: { read: true, create: false, update: false, delete: false },
            },
          ],
          menus: [],
        }}
        expandedItemIds={[]}
        selectedMenuId="notice"
        favorites={{
          folders: [{ folderId: 11, folderName: '업무' }],
          favorites: [{ favoriteId: 17, menuId: 210, folderId: null, favoriteName: null }],
        }}
        onFavoritesRefresh={vi.fn().mockResolvedValue(undefined)}
        onMenuSelect={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '즐겨찾기 편집: 공지사항' }));
    fireEvent.change(screen.getByLabelText('이름'), { target: { value: '중요 공지' } });
    fireEvent.mouseDown(screen.getByRole('combobox', { name: '폴더' }));
    fireEvent.click(await screen.findByRole('option', { name: '업무' }));
    fireEvent.click(screen.getByRole('button', { name: '완료' }));

    await waitFor(() => {
      expect(api.apiPut).toHaveBeenCalledWith('/api/v1/menus/favorites/17/location', {
        folderId: 11,
        favoriteName: '중요 공지',
      });
    });
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: '즐겨찾기 편집' })).not.toBeInTheDocument();
    });
  });

  it('does not expose favorite controls for a leaf without read permission', () => {
    render(
      <DashboardMenuTree
        selectedModule={{
          id: 'groupware',
          name: '그룹웨어',
          icon: null,
          tree: [
            {
              id: 'restricted',
              menuId: 211,
              name: '비공개 메뉴',
              path: '/groupware/restricted',
              permissions: { read: false, create: false, update: false, delete: false },
            },
          ],
          menus: [],
        }}
        expandedItemIds={[]}
        selectedMenuId=""
        favorites={{ folders: [], favorites: [] }}
        onMenuSelect={vi.fn()}
      />,
    );

    expect(screen.queryByRole('button', { name: /즐겨찾기/ })).not.toBeInTheDocument();
  });

  it('opens the favorite module from the editor more action', async () => {
    api.apiPost.mockResolvedValue({
      item: {
        folders: [],
        favorites: [{ favoriteId: 31, menuId: 210, folderId: null, favoriteName: '공지사항' }],
      },
    });
    const onFavoritesMore = vi.fn();
    const onMenuSelect = vi.fn();
    render(
      <DashboardMenuTree
        selectedModule={{
          id: 'groupware',
          name: '그룹웨어',
          icon: null,
          tree: [
            {
              id: 'notice',
              menuId: 210,
              name: '공지사항',
              path: '/groupware/notice',
              permissions: { read: true, create: false, update: false, delete: false },
            },
          ],
          menus: [],
        }}
        expandedItemIds={[]}
        selectedMenuId="notice"
        favorites={{ folders: [], favorites: [] }}
        onFavoritesMore={onFavoritesMore}
        onMenuSelect={onMenuSelect}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '즐겨찾기 추가: 공지사항' }));

    expect(await screen.findByRole('dialog', { name: '즐겨찾기 편집' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '더보기' }));

    expect(onFavoritesMore).toHaveBeenCalledOnce();
    expect(onMenuSelect).not.toHaveBeenCalled();
  });

  it('keeps folder management available from a menu context menu', () => {
    render(
      <DashboardMenuTree
        selectedModule={{
          id: 'groupware',
          name: '그룹웨어',
          icon: null,
          tree: [
            {
              id: 'notice',
              menuId: 210,
              name: '공지사항',
              path: '/groupware/notice',
              permissions: { read: true, create: false, update: false, delete: false },
            },
          ],
          menus: [],
        }}
        expandedItemIds={[]}
        selectedMenuId=""
        favorites={{
          folders: [{ folderId: 11, folderName: '업무' }],
          favorites: [],
        }}
        onMenuSelect={vi.fn()}
      />,
    );

    fireEvent.contextMenu(screen.getByText('공지사항'));

    expect(screen.getByRole('menuitem', { name: '폴더 만들기' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: '업무 이름 변경' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: '업무 삭제' })).toBeInTheDocument();

    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole('treeitem', { name: '공지사항' }), {
      key: 'F10',
      shiftKey: true,
    });

    expect(screen.getByRole('menuitem', { name: '폴더 만들기' })).toBeInTheDocument();
  });

  it('shows a custom display name in the favorites module', () => {
    render(
      <MenuFavoritesTree
        favorites={{
          folders: [],
          favorites: [{
            favoriteId: 25,
            menuId: 210,
            folderId: null,
            favoriteName: '중요 공지',
          }],
        }}
        moduleItems={[{
          id: 'groupware',
          name: '그룹웨어',
          icon: null,
          tree: [{
            id: 'notice',
            menuId: 210,
            name: '공지사항',
            path: '/groupware/notice',
            permissions: { read: true, create: false, update: false, delete: false },
          }],
          menus: [],
        }]}
        onMenuSelect={vi.fn()}
        onRefresh={vi.fn().mockResolvedValue(undefined)}
        onError={vi.fn()}
      />,
    );

    expect(screen.getByText('중요 공지')).toBeInTheDocument();
    expect(screen.queryByText('공지사항')).not.toBeInTheDocument();
  });

  it('creates a folder directly from the favorites module header', async () => {
    api.apiPost.mockResolvedValue({
      item: { folders: [{ folderId: 25, folderName: '업무' }], favorites: [] },
    });
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    render(
      <MenuFavoritesTree
        favorites={{ folders: [], favorites: [] }}
        moduleItems={[]}
        onMenuSelect={vi.fn()}
        onRefresh={onRefresh}
        onError={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '새 폴더' }));
    expect(screen.getByRole('dialog', { name: '즐겨찾기 폴더 만들기' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('폴더명'), { target: { value: '업무' } });
    fireEvent.click(screen.getByRole('button', { name: '만들기' }));

    await waitFor(() => expect(api.apiPost).toHaveBeenCalledWith(
      '/api/v1/menus/favorites/folders',
      { folderName: '업무' },
    ));
    await waitFor(() => expect(onRefresh).toHaveBeenCalledOnce());
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: '즐겨찾기 폴더 만들기' })).not.toBeInTheDocument();
    });
  });

  it('distinguishes folders from same-name menus without changing tree actions', () => {
    const onMenuSelect = vi.fn();
    render(
      <MenuFavoritesTree
        favorites={{
          folders: [
            { folderId: 11, folderName: '공지사항' },
            { folderId: 12, folderName: '빈 폴더' },
          ],
          favorites: [
            { favoriteId: 25, menuId: 210, folderId: null, favoriteName: null },
            { favoriteId: 26, menuId: 211, folderId: 11, favoriteName: '결재 바로가기' },
          ],
        }}
        moduleItems={[{
          id: 'groupware',
          name: '그룹웨어',
          icon: null,
          tree: [
            { id: 'notice', menuId: 210, name: '공지사항', path: '/groupware/notice' },
            { id: 'approval', menuId: 211, name: '결재', path: '/groupware/approval' },
          ],
          menus: [],
        }]}
        onMenuSelect={onMenuSelect}
        onRefresh={vi.fn().mockResolvedValue(undefined)}
        onError={vi.fn()}
      />,
    );

    const rootMenu = screen.getByRole('treeitem', { name: '메뉴: 공지사항' });
    const folder = screen.getByRole('treeitem', { name: '폴더: 공지사항' });
    expect(within(rootMenu).getByTestId('ArticleOutlinedIcon')).toBeInTheDocument();
    expect(within(rootMenu).queryByText('폴더')).not.toBeInTheDocument();
    expect(within(folder).getByTestId('FolderOutlinedIcon')).toBeInTheDocument();
    expect(within(folder).getByText('폴더')).toBeInTheDocument();

    fireEvent.click(within(rootMenu).getByTestId('ArticleOutlinedIcon'));
    expect(onMenuSelect).toHaveBeenLastCalledWith('groupware', 'notice');
    onMenuSelect.mockClear();

    fireEvent.click(within(folder).getByText('공지사항'));
    expect(folder).toHaveAttribute('aria-expanded', 'true');
    expect(onMenuSelect).not.toHaveBeenCalled();
    const childMenu = screen.getByRole('treeitem', { name: '메뉴: 결재 바로가기' });
    expect(within(childMenu).getByTestId('ArticleOutlinedIcon')).toBeInTheDocument();
    fireEvent.click(within(childMenu).getByText('결재 바로가기'));
    expect(onMenuSelect).toHaveBeenLastCalledWith('groupware', 'approval');
    onMenuSelect.mockClear();

    fireEvent.click(within(folder).getByRole('button', { name: '즐겨찾기 작업: 공지사항' }));
    expect(screen.getByRole('menuitem', { name: '폴더 이름 변경' })).toBeInTheDocument();
    expect(onMenuSelect).not.toHaveBeenCalled();
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });

    const emptyFolder = screen.getByRole('treeitem', { name: '폴더: 빈 폴더' });
    expect(within(emptyFolder).getByText('폴더')).toBeInTheDocument();
    fireEvent.click(within(emptyFolder).getByText('빈 폴더'));
    expect(screen.getByText('폴더가 비어 있습니다.')).toBeInTheDocument();
  });
});

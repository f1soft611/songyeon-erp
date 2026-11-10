import {
  apiDelete,
  apiGet,
  apiPost,
  apiPut,
} from '../../../shared/services/apiClient';
import type { MenuFavoritesResponse } from '../types/menuFavorite.types';

const FAVORITES_PATH = '/api/v1/menus/favorites';

const unwrap = (
  response: { item?: MenuFavoritesResponse },
): MenuFavoritesResponse => {
  if (!response.item) {
    throw new Error('즐겨찾기 응답을 확인할 수 없습니다.');
  }
  return response.item;
};

export const fetchMenuFavorites = (): Promise<MenuFavoritesResponse> =>
  apiGet<{ item?: MenuFavoritesResponse }>(FAVORITES_PATH).then(unwrap);

export const createMenuFavoriteFolder = (
  folderName: string,
): Promise<MenuFavoritesResponse> =>
  apiPost<{ item?: MenuFavoritesResponse }>(`${FAVORITES_PATH}/folders`, {
    folderName,
  }).then(unwrap);

export const renameMenuFavoriteFolder = (
  folderId: number,
  folderName: string,
): Promise<MenuFavoritesResponse> =>
  apiPut<{ item?: MenuFavoritesResponse }>(`${FAVORITES_PATH}/folders/${folderId}`, {
    folderName,
  }).then(unwrap);

export const deleteMenuFavoriteFolder = (
  folderId: number,
): Promise<MenuFavoritesResponse> =>
  apiDelete<{ item?: MenuFavoritesResponse }>(`${FAVORITES_PATH}/folders/${folderId}`).then(
    unwrap,
  );

export const createMenuFavorite = (
  menuId: number,
  folderId: number | null,
  favoriteName?: string,
): Promise<MenuFavoritesResponse> =>
  apiPost<{ item?: MenuFavoritesResponse }>(FAVORITES_PATH, {
    menuId,
    folderId,
    ...(favoriteName !== undefined ? { favoriteName } : {}),
  }).then(unwrap);

export const moveMenuFavorite = (
  favoriteId: number,
  folderId: number | null,
  favoriteName?: string,
): Promise<MenuFavoritesResponse> =>
  apiPut<{ item?: MenuFavoritesResponse }>(
    `${FAVORITES_PATH}/${favoriteId}/location`,
    { folderId, ...(favoriteName !== undefined ? { favoriteName } : {}) },
  ).then(unwrap);

export const deleteMenuFavorite = (
  favoriteId: number,
): Promise<MenuFavoritesResponse> =>
  apiDelete<{ item?: MenuFavoritesResponse }>(
    `${FAVORITES_PATH}/${favoriteId}`,
  ).then(unwrap);

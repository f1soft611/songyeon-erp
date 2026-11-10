export type FavoriteFolder = {
  folderId: number;
  folderName: string;
};

export type FavoriteMenu = {
  favoriteId: number;
  menuId: number;
  folderId: number | null;
  favoriteName: string | null;
};

export type MenuFavoritesResponse = {
  folders: FavoriteFolder[];
  favorites: FavoriteMenu[];
};

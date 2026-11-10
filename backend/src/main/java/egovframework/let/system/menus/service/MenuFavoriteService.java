package egovframework.let.system.menus.service;

import egovframework.com.cmm.LoginVO;
import egovframework.let.system.menus.domain.model.MenuFavoriteCreateRequestVO;
import egovframework.let.system.menus.domain.model.MenuFavoriteFolderRequestVO;
import egovframework.let.system.menus.domain.model.MenuFavoriteLocationRequestVO;
import egovframework.let.system.menus.domain.model.MenuFavoritesResponseVO;

public interface MenuFavoriteService {
    MenuFavoritesResponseVO list(LoginVO user) throws Exception;

    MenuFavoritesResponseVO createFolder(LoginVO user, MenuFavoriteFolderRequestVO request) throws Exception;

    MenuFavoritesResponseVO renameFolder(LoginVO user, Long folderId, MenuFavoriteFolderRequestVO request)
            throws Exception;

    MenuFavoritesResponseVO deleteFolder(LoginVO user, Long folderId) throws Exception;

    MenuFavoritesResponseVO createFavorite(LoginVO user, MenuFavoriteCreateRequestVO request) throws Exception;

    MenuFavoritesResponseVO moveFavorite(LoginVO user, Long favoriteId, MenuFavoriteLocationRequestVO request)
            throws Exception;

    MenuFavoritesResponseVO deleteFavorite(LoginVO user, Long favoriteId) throws Exception;
}

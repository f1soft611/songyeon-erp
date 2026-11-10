package egovframework.let.system.menus.domain.repository;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.egovframe.rte.psl.dataaccess.EgovAbstractMapper;
import org.springframework.stereotype.Repository;

import egovframework.let.system.menus.domain.model.MenuFavoriteFolderVO;
import egovframework.let.system.menus.domain.model.MenuFavoriteVO;

@Repository("menuFavoriteDAO")
public class MenuFavoriteDAO extends EgovAbstractMapper {

    public List<MenuFavoriteFolderVO> selectFolders(Long tenantId, String userId) {
        return selectList("MenuFavoriteDAO.selectFolders", owner(tenantId, userId));
    }

    public List<MenuFavoriteVO> selectFavorites(Long tenantId, String userId) {
        return selectList("MenuFavoriteDAO.selectFavorites", owner(tenantId, userId));
    }

    public MenuFavoriteFolderVO selectFolder(Long tenantId, String userId, Long folderId) {
        Map<String, Object> params = owner(tenantId, userId);
        params.put("folderId", folderId);
        return selectOne("MenuFavoriteDAO.selectFavoriteFolder", params);
    }

    public int countFavoritesInFolder(Long tenantId, String userId, Long folderId) {
        Map<String, Object> params = owner(tenantId, userId);
        params.put("folderId", folderId);
        Integer count = selectOne("MenuFavoriteDAO.countFavoritesInFolder", params);
        return count == null ? 0 : count;
    }

    public Long insertFolder(Long tenantId, String userId, String folderName) {
        Map<String, Object> params = owner(tenantId, userId);
        params.put("folderName", folderName);
        insert("MenuFavoriteDAO.insertFolder", params);
        return (Long) params.get("folderId");
    }

    public int renameFolder(Long tenantId, String userId, Long folderId, String folderName) {
        Map<String, Object> params = owner(tenantId, userId);
        params.put("folderId", folderId);
        params.put("folderName", folderName);
        return update("MenuFavoriteDAO.renameFolder", params);
    }

    public int deleteFolder(Long tenantId, String userId, Long folderId) {
        Map<String, Object> params = owner(tenantId, userId);
        params.put("folderId", folderId);
        return delete("MenuFavoriteDAO.deleteFolder", params);
    }

    public Long insertFavorite(Long tenantId, String userId, Long menuId, Long folderId, String favoriteName) {
        Map<String, Object> params = owner(tenantId, userId);
        params.put("menuId", menuId);
        params.put("folderId", folderId);
        params.put("favoriteName", favoriteName);
        insert("MenuFavoriteDAO.insertFavorite", params);
        return (Long) params.get("favoriteId");
    }

    public int moveFavorite(
            Long tenantId, String userId, Long favoriteId, Long folderId, String favoriteName) {
        Map<String, Object> params = owner(tenantId, userId);
        params.put("favoriteId", favoriteId);
        params.put("folderId", folderId);
        params.put("favoriteName", favoriteName);
        return update("MenuFavoriteDAO.moveFavorite", params);
    }

    public int deleteFavorite(Long tenantId, String userId, Long favoriteId) {
        Map<String, Object> params = owner(tenantId, userId);
        params.put("favoriteId", favoriteId);
        return delete("MenuFavoriteDAO.deleteFavorite", params);
    }

    private Map<String, Object> owner(Long tenantId, String userId) {
        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", tenantId);
        params.put("userId", userId);
        return params;
    }
}

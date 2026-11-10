package egovframework.let.system.menus.service.impl;

import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import egovframework.com.cmm.LoginVO;
import egovframework.let.system.menus.domain.model.MenuFavoriteCreateRequestVO;
import egovframework.let.system.menus.domain.model.MenuFavoriteFolderRequestVO;
import egovframework.let.system.menus.domain.model.MenuFavoriteFolderVO;
import egovframework.let.system.menus.domain.model.MenuFavoriteLocationRequestVO;
import egovframework.let.system.menus.domain.model.MenuFavoriteVO;
import egovframework.let.system.menus.domain.model.MenuFavoritesResponseVO;
import egovframework.let.system.menus.domain.model.MenuTreeNodeVO;
import egovframework.let.system.menus.domain.model.MyMenuResponseVO;
import egovframework.let.system.menus.domain.repository.MenuFavoriteDAO;
import egovframework.let.system.menus.service.MenuFavoriteService;
import egovframework.let.system.menus.service.SystemMenuService;

@Service("menuFavoriteService")
public class MenuFavoriteServiceImpl implements MenuFavoriteService {
    private final MenuFavoriteDAO menuFavoriteDAO;
    private final SystemMenuService systemMenuService;

    public MenuFavoriteServiceImpl(MenuFavoriteDAO menuFavoriteDAO, SystemMenuService systemMenuService) {
        this.menuFavoriteDAO = menuFavoriteDAO;
        this.systemMenuService = systemMenuService;
    }

    @Override
    @Transactional(readOnly = true)
    public MenuFavoritesResponseVO list(LoginVO user) throws Exception {
        Owner owner = owner(user);
        Set<Long> readableMenuIds = accessibleMenuIds(user, owner.tenantId);
        List<MenuFavoriteVO> favorites = menuFavoriteDAO.selectFavorites(owner.tenantId, owner.userId).stream()
                .filter(favorite -> readableMenuIds.contains(favorite.getMenuId()))
                .collect(Collectors.toList());
        return new MenuFavoritesResponseVO(
                menuFavoriteDAO.selectFolders(owner.tenantId, owner.userId), favorites);
    }

    @Override
    @Transactional
    public MenuFavoritesResponseVO createFolder(LoginVO user, MenuFavoriteFolderRequestVO request) throws Exception {
        Owner owner = owner(user);
        String folderName = validateFolderName(request);
        menuFavoriteDAO.insertFolder(owner.tenantId, owner.userId, folderName);
        return list(user);
    }

    @Override
    @Transactional
    public MenuFavoritesResponseVO renameFolder(
            LoginVO user, Long folderId, MenuFavoriteFolderRequestVO request) throws Exception {
        Owner owner = owner(user);
        requirePositiveId(folderId, "폴더 ID가 올바르지 않습니다.");
        String folderName = validateFolderName(request);
        requireOwnedFolder(owner, folderId);
        menuFavoriteDAO.renameFolder(owner.tenantId, owner.userId, folderId, folderName);
        return list(user);
    }

    @Override
    @Transactional
    public MenuFavoritesResponseVO deleteFolder(LoginVO user, Long folderId) throws Exception {
        Owner owner = owner(user);
        requirePositiveId(folderId, "폴더 ID가 올바르지 않습니다.");
        requireOwnedFolder(owner, folderId);
        if (menuFavoriteDAO.countFavoritesInFolder(owner.tenantId, owner.userId, folderId) > 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "메뉴가 들어 있는 폴더는 삭제할 수 없습니다.");
        }
        if (menuFavoriteDAO.deleteFolder(owner.tenantId, owner.userId, folderId) == 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "폴더가 사용 중이거나 삭제되었습니다.");
        }
        return list(user);
    }

    @Override
    @Transactional
    public MenuFavoritesResponseVO createFavorite(LoginVO user, MenuFavoriteCreateRequestVO request)
            throws Exception {
        Owner owner = owner(user);
        if (request == null || request.getMenuId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "메뉴 ID가 필요합니다.");
        }
        String favoriteName = normalizeFavoriteName(request.getFavoriteName());
        requirePositiveId(request.getMenuId(), "메뉴 ID가 올바르지 않습니다.");
        validateAccessibleMenu(user, owner.tenantId, request.getMenuId());
        if (request.getFolderId() != null) {
            requirePositiveId(request.getFolderId(), "폴더 ID가 올바르지 않습니다.");
            requireOwnedFolder(owner, request.getFolderId());
        }
        try {
            menuFavoriteDAO.insertFavorite(
                    owner.tenantId, owner.userId, request.getMenuId(), request.getFolderId(), favoriteName);
        } catch (DataIntegrityViolationException exception) {
            if (hasSqlState(exception, "23505")) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 즐겨찾기에 등록된 메뉴입니다.", exception);
            }
            if (hasSqlState(exception, "23503")) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT, "즐겨찾기 대상 또는 폴더가 변경되었습니다. 다시 시도해 주세요.", exception);
            }
            throw exception;
        }
        return list(user);
    }

    @Override
    @Transactional
    public MenuFavoritesResponseVO moveFavorite(
            LoginVO user, Long favoriteId, MenuFavoriteLocationRequestVO request) throws Exception {
        Owner owner = owner(user);
        requirePositiveId(favoriteId, "즐겨찾기 ID가 올바르지 않습니다.");
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "이동 위치가 필요합니다.");
        }
        String favoriteName = normalizeFavoriteName(request.getFavoriteName());
        MenuFavoriteVO favorite = menuFavoriteDAO.selectFavorites(owner.tenantId, owner.userId).stream()
                .filter(item -> favoriteId.equals(item.getFavoriteId()))
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "즐겨찾기를 찾을 수 없습니다."));
        validateAccessibleMenu(user, owner.tenantId, favorite.getMenuId());
        Long folderId = request.getFolderId();
        if (folderId != null) {
            requirePositiveId(folderId, "폴더 ID가 올바르지 않습니다.");
            requireOwnedFolder(owner, folderId);
        }
        try {
            if (menuFavoriteDAO.moveFavorite(
                    owner.tenantId, owner.userId, favoriteId, folderId, favoriteName) == 0) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "즐겨찾기를 찾을 수 없습니다.");
            }
        } catch (DataIntegrityViolationException exception) {
            if (hasSqlState(exception, "23503")) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT, "즐겨찾기 폴더가 변경되었습니다. 다시 시도해 주세요.", exception);
            }
            throw exception;
        }
        return list(user);
    }

    @Override
    @Transactional
    public MenuFavoritesResponseVO deleteFavorite(LoginVO user, Long favoriteId) throws Exception {
        Owner owner = owner(user);
        requirePositiveId(favoriteId, "즐겨찾기 ID가 올바르지 않습니다.");
        if (menuFavoriteDAO.deleteFavorite(owner.tenantId, owner.userId, favoriteId) == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "즐겨찾기를 찾을 수 없습니다.");
        }
        return list(user);
    }

    private Set<Long> accessibleMenuIds(LoginVO user, Long tenantId) throws Exception {
        MyMenuResponseVO response = systemMenuService.getMyMenuTree(
                tenantId, user.getId(), user.getRoleId(), user.getRoleCode());
        if (response == null || response.getMenus() == null) {
            return java.util.Collections.emptySet();
        }
        Set<Long> result = new java.util.HashSet<>();
        for (MenuTreeNodeVO root : response.getMenus()) {
            collectAccessibleMenuIds(root.getChildren(), result);
        }
        return result;
    }

    private void collectAccessibleMenuIds(List<MenuTreeNodeVO> nodes, Set<Long> result) {
        if (nodes == null) {
            return;
        }
        for (MenuTreeNodeVO node : nodes) {
            if (node.getChildren() != null && !node.getChildren().isEmpty()) {
                collectAccessibleMenuIds(node.getChildren(), result);
            } else if (node.getMenuId() != null && StringUtils.hasText(node.getPath())
                    && node.getPermissions() != null && node.getPermissions().isRead()) {
                result.add(node.getMenuId());
            }
        }
    }

    private void validateAccessibleMenu(LoginVO user, Long tenantId, Long menuId) throws Exception {
        if (!accessibleMenuIds(user, tenantId).contains(menuId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "접근 권한이 있는 활성 메뉴가 아닙니다.");
        }
    }

    private void requireOwnedFolder(Owner owner, Long folderId) {
        if (menuFavoriteDAO.selectFolder(owner.tenantId, owner.userId, folderId) == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "즐겨찾기 폴더를 찾을 수 없습니다.");
        }
    }

    private String validateFolderName(MenuFavoriteFolderRequestVO request) {
        if (request == null || request.getFolderName() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "폴더명이 필요합니다.");
        }
        String folderName = request.getFolderName().trim();
        if (folderName.isEmpty() || folderName.length() > 40) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "폴더명은 공백을 제외한 1~40자여야 합니다.");
        }
        return folderName;
    }

    private String normalizeFavoriteName(String favoriteName) {
        if (favoriteName == null) {
            return null;
        }
        String normalized = favoriteName.trim();
        if (normalized.isEmpty() || normalized.length() > 100) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "즐겨찾기 이름은 공백 제외 1~100자여야 합니다.");
        }
        return normalized;
    }

    private Owner owner(LoginVO user) {
        if (user == null || user.getTenantId() == null || user.getTenantId() <= 0
                || !StringUtils.hasText(user.getUniqId())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다.");
        }
        return new Owner(user.getTenantId(), user.getUniqId().trim());
    }

    private void requirePositiveId(Long id, String message) {
        if (id == null || id <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
        }
    }

    private boolean hasSqlState(Throwable error, String sqlState) {
        Throwable current = error;
        while (current != null) {
            if (current instanceof SQLException && sqlState.equals(((SQLException) current).getSQLState())) {
                return true;
            }
            current = current.getCause();
        }
        return false;
    }

    private static class Owner {
        private final Long tenantId;
        private final String userId;

        private Owner(Long tenantId, String userId) {
            this.tenantId = tenantId;
            this.userId = userId;
        }
    }
}

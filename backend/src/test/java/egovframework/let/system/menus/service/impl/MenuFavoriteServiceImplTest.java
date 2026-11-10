package egovframework.let.system.menus.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.ArrayList;
import java.util.List;
import java.sql.SQLException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import egovframework.com.cmm.LoginVO;
import egovframework.let.system.menus.domain.model.MenuFavoriteCreateRequestVO;
import egovframework.let.system.menus.domain.model.MenuFavoriteFolderRequestVO;
import egovframework.let.system.menus.domain.model.MenuFavoriteFolderVO;
import egovframework.let.system.menus.domain.model.MenuFavoriteLocationRequestVO;
import egovframework.let.system.menus.domain.model.MenuFavoriteVO;
import egovframework.let.system.menus.domain.model.MenuTreeNodeVO;
import egovframework.let.system.menus.domain.repository.MenuFavoriteDAO;
import egovframework.let.system.menus.service.SystemMenuService;

class MenuFavoriteServiceImplTest {
    private MenuFavoriteDAO dao;
    private SystemMenuService menuService;
    private MenuFavoriteServiceImpl service;
    private LoginVO user;

    @BeforeEach
    void setUp() {
        dao = org.mockito.Mockito.mock(MenuFavoriteDAO.class);
        menuService = org.mockito.Mockito.mock(SystemMenuService.class);
        service = new MenuFavoriteServiceImpl(dao, menuService);
        user = new LoginVO();
        user.setTenantId(4L);
        user.setUniqId("9");
        user.setId("login-code");
        user.setRoleId(2L);
        user.setRoleCode("TENANT_USER");
    }

    @Test
    void createFavoriteRequiresReadPermissionOnAnActiveLeaf() throws Exception {
        MenuFavoriteCreateRequestVO request = new MenuFavoriteCreateRequestVO();
        request.setMenuId(210L);
        MenuTreeNodeVO unauthorized = menu(210L, "/groupware/secret", false);
        when(menuService.getMyMenuTree(4L, "login-code", 2L, "TENANT_USER"))
                .thenReturn(tree(unauthorized));

        assertThrows(ResponseStatusException.class, () -> service.createFavorite(user, request));
        verify(dao, never()).insertFavorite(4L, "9", 210L, null, null);
    }

    @Test
    void createFavoriteUsesAuthenticatedTenantAndUserAndTrimsFolderName() throws Exception {
        MenuFavoriteCreateRequestVO request = new MenuFavoriteCreateRequestVO();
        request.setMenuId(210L);
        request.setFolderId(12L);
        when(menuService.getMyMenuTree(4L, "login-code", 2L, "TENANT_USER"))
                .thenReturn(tree(menu(210L, "/groupware/notice", true)));
        when(dao.selectFolder(4L, "9", 12L)).thenReturn(new MenuFavoriteFolderVO());
        when(dao.selectFolders(4L, "9")).thenReturn(new ArrayList<>());
        when(dao.selectFavorites(4L, "9")).thenReturn(new ArrayList<>());

        service.createFavorite(user, request);

        verify(dao).insertFavorite(4L, "9", 210L, 12L, null);
    }

    @Test
    void createFavoriteTrimsAndPersistsCustomName() throws Exception {
        MenuFavoriteCreateRequestVO request = new MenuFavoriteCreateRequestVO();
        request.setMenuId(210L);
        request.setFavoriteName("  공지 바로가기  ");
        when(menuService.getMyMenuTree(4L, "login-code", 2L, "TENANT_USER"))
                .thenReturn(tree(menu(210L, "/groupware/notice", true)));
        when(dao.selectFolders(4L, "9")).thenReturn(List.of());
        when(dao.selectFavorites(4L, "9")).thenReturn(List.of());

        service.createFavorite(user, request);

        verify(dao).insertFavorite(4L, "9", 210L, null, "공지 바로가기");
    }

    @Test
    void createFavoriteRejectsBlankOrOverlongCustomName() throws Exception {
        MenuFavoriteCreateRequestVO request = new MenuFavoriteCreateRequestVO();
        request.setMenuId(210L);
        request.setFavoriteName("   ");
        when(menuService.getMyMenuTree(4L, "login-code", 2L, "TENANT_USER"))
                .thenReturn(tree(menu(210L, "/groupware/notice", true)));

        assertThrows(ResponseStatusException.class, () -> service.createFavorite(user, request));
        request.setFavoriteName("a".repeat(101));
        assertThrows(ResponseStatusException.class, () -> service.createFavorite(user, request));
        verify(dao, never()).insertFavorite(4L, "9", 210L, null, null);
    }

    @Test
    void moveFavoriteUpdatesNameAndLocationTogether() throws Exception {
        MenuFavoriteVO favorite = new MenuFavoriteVO();
        favorite.setFavoriteId(17L);
        favorite.setMenuId(210L);
        favorite.setFolderId(11L);
        when(dao.selectFavorites(4L, "9")).thenReturn(List.of(favorite));
        when(dao.moveFavorite(4L, "9", 17L, null, "공지")).thenReturn(1);
        when(menuService.getMyMenuTree(4L, "login-code", 2L, "TENANT_USER"))
                .thenReturn(tree(menu(210L, "/groupware/notice", true)));
        when(dao.selectFolders(4L, "9")).thenReturn(List.of());
        MenuFavoriteLocationRequestVO request = new MenuFavoriteLocationRequestVO();
        request.setFolderId(null);
        request.setFavoriteName("  공지  ");

        service.moveFavorite(user, 17L, request);

        verify(dao).moveFavorite(4L, "9", 17L, null, "공지");
    }

    @Test
    void createFavoriteMapsConcurrentFolderDeletionToConflict() throws Exception {
        MenuFavoriteCreateRequestVO request = new MenuFavoriteCreateRequestVO();
        request.setMenuId(210L);
        when(menuService.getMyMenuTree(4L, "login-code", 2L, "TENANT_USER"))
                .thenReturn(tree(menu(210L, "/groupware/notice", true)));
        when(dao.insertFavorite(4L, "9", 210L, null, null))
                .thenThrow(new DataIntegrityViolationException(
                        "folder reference changed", new SQLException("foreign key violation", "23503")));

        ResponseStatusException exception =
                assertThrows(ResponseStatusException.class, () -> service.createFavorite(user, request));

        assertEquals(HttpStatus.CONFLICT, exception.getStatus());
    }

    @Test
    void createFolderTrimsNameAndRejectsWhitespaceOnlyName() throws Exception {
        MenuFavoriteFolderRequestVO request = new MenuFavoriteFolderRequestVO();
        request.setFolderName("  업무  ");
        when(dao.insertFolder(4L, "9", "업무")).thenReturn(12L);
        when(dao.selectFolders(4L, "9")).thenReturn(List.of());
        when(dao.selectFavorites(4L, "9")).thenReturn(List.of());

        service.createFolder(user, request);
        verify(dao).insertFolder(4L, "9", "업무");

        request.setFolderName("  ");
        assertThrows(ResponseStatusException.class, () -> service.createFolder(user, request));
    }

    @Test
    void ownerKeepsEmployeeNumberWithLeadingZeros() throws Exception {
        user.setUniqId(" 00123 ");
        MenuFavoriteFolderRequestVO request = new MenuFavoriteFolderRequestVO();
        request.setFolderName("업무");
        when(dao.selectFolders(4L, "00123")).thenReturn(List.of());
        when(dao.selectFavorites(4L, "00123")).thenReturn(List.of());

        service.createFolder(user, request);

        verify(dao).insertFolder(4L, "00123", "업무");
    }

    @Test
    void ownerRequiresEmployeeNumber() {
        user.setUniqId("  ");

        ResponseStatusException exception =
                assertThrows(ResponseStatusException.class, () -> service.list(user));

        assertEquals(HttpStatus.UNAUTHORIZED, exception.getStatus());
    }

    private MenuTreeNodeVO menu(Long id, String path, boolean canRead) {
        MenuTreeNodeVO node = new MenuTreeNodeVO();
        node.setMenuId(id);
        node.setPath(path);
        node.setChildren(new ArrayList<>());
        node.setPermissions(new egovframework.let.system.menus.domain.model.MenuPermissionVO(
                canRead, false, false, false));
        return node;
    }

    private egovframework.let.system.menus.domain.model.MyMenuResponseVO tree(MenuTreeNodeVO child) {
        egovframework.let.system.menus.domain.model.MyMenuResponseVO response =
                new egovframework.let.system.menus.domain.model.MyMenuResponseVO();
        MenuTreeNodeVO module = new MenuTreeNodeVO();
        module.setChildren(List.of(child));
        response.setMenus(List.of(module));
        return response;
    }
}

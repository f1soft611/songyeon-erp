package egovframework.let.system.menus.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Arrays;
import java.util.Collections;

import org.junit.jupiter.api.Test;

import egovframework.let.system.menus.domain.model.SystemMenuSaveRequestVO;
import egovframework.let.system.menus.domain.model.SystemMenuVO;
import egovframework.let.system.menus.domain.repository.SystemMenuDAO;
import egovframework.let.system.menus.service.impl.SystemMenuServiceImpl;
import egovframework.let.system.modules.domain.model.SystemModuleVO;
import egovframework.let.system.modules.service.SystemModuleService;

class SystemMenuTenantValidationServiceTest {

    private static final Long TENANT_ID = 1L;
    private static final Long MODULE_ID = 10L;

    @Test
    void createMenuRejectsModuleOutsideRequestingTenantBeforeInsert() throws Exception {
        SystemMenuDAO menuDAO = mock(SystemMenuDAO.class);
        SystemModuleService moduleService = mock(SystemModuleService.class);
        SystemMenuServiceImpl service = new SystemMenuServiceImpl(menuDAO, moduleService);
        when(moduleService.listModules(TENANT_ID)).thenReturn(Collections.emptyList());
        when(menuDAO.selectMenuIdByCode(anyMap())).thenReturn(null);

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class,
                () -> service.createMenu(TENANT_ID, request(MODULE_ID, null)));

        assertEquals("유효하지 않은 모듈입니다.", exception.getMessage());
        verify(menuDAO, never()).insertMenu(anyMap());
    }

    @Test
    void createMenuRejectsModuleNotOwnedByRequestingTenantBeforeInsert() throws Exception {
        SystemMenuDAO menuDAO = mock(SystemMenuDAO.class);
        SystemModuleService moduleService = mock(SystemModuleService.class);
        SystemMenuServiceImpl service = new SystemMenuServiceImpl(menuDAO, moduleService);
        when(moduleService.listModules(TENANT_ID)).thenReturn(Collections.singletonList(module(11L)));
        when(menuDAO.selectMenuIdByCode(anyMap())).thenReturn(null);

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class,
                () -> service.createMenu(TENANT_ID, request(MODULE_ID, null)));

        assertEquals("유효하지 않은 모듈입니다.", exception.getMessage());
        verify(menuDAO, never()).insertMenu(anyMap());
    }

    @Test
    void createMenuRejectsParentFromDifferentModuleBeforeInsert() throws Exception {
        SystemMenuDAO menuDAO = mock(SystemMenuDAO.class);
        SystemModuleService moduleService = mock(SystemModuleService.class);
        SystemMenuServiceImpl service = new SystemMenuServiceImpl(menuDAO, moduleService);
        when(moduleService.listModules(TENANT_ID)).thenReturn(Collections.singletonList(module(MODULE_ID)));
        when(menuDAO.selectMenuById(anyMap())).thenReturn(menu(20L, 11L));
        when(menuDAO.selectMenuIdByCode(anyMap())).thenReturn(null);

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class,
                () -> service.createMenu(TENANT_ID, request(MODULE_ID, 20L)));

        assertEquals("상위 메뉴는 같은 모듈에 속해야 합니다.", exception.getMessage());
        verify(menuDAO, never()).insertMenu(anyMap());
    }

    @Test
    void updateMenuRejectsParentFromDifferentModuleBeforeUpdate() throws Exception {
        SystemMenuDAO menuDAO = mock(SystemMenuDAO.class);
        SystemModuleService moduleService = mock(SystemModuleService.class);
        SystemMenuServiceImpl service = new SystemMenuServiceImpl(menuDAO, moduleService);
        when(menuDAO.selectMenuById(anyMap())).thenReturn(menu(30L, MODULE_ID), menu(20L, 11L));
        when(moduleService.listModules(TENANT_ID)).thenReturn(Collections.singletonList(module(MODULE_ID)));
        when(menuDAO.selectMenuIdByCode(anyMap())).thenReturn(null);

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class,
                () -> service.updateMenu(TENANT_ID, 30L, request(MODULE_ID, 20L)));

        assertEquals("상위 메뉴는 같은 모듈에 속해야 합니다.", exception.getMessage());
        verify(menuDAO, never()).updateMenu(anyMap());
    }

    @Test
    void updateMenuRejectsExistingMenuModuleOutsideRequestingTenantBeforeUpdate() throws Exception {
        SystemMenuDAO menuDAO = mock(SystemMenuDAO.class);
        SystemModuleService moduleService = mock(SystemModuleService.class);
        SystemMenuServiceImpl service = new SystemMenuServiceImpl(menuDAO, moduleService);
        when(menuDAO.selectMenuById(anyMap())).thenReturn(menu(30L, MODULE_ID));
        when(moduleService.listModules(TENANT_ID)).thenReturn(Collections.singletonList(module(11L)));

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class,
                () -> service.updateMenu(TENANT_ID, 30L, request(MODULE_ID, null)));

        assertEquals("유효하지 않은 모듈입니다.", exception.getMessage());
        verify(menuDAO, never()).updateMenu(anyMap());
    }

    @Test
    void createMenuAllowsRootMenuWhenParentMenuIsNull() throws Exception {
        SystemMenuDAO menuDAO = mock(SystemMenuDAO.class);
        SystemModuleService moduleService = mock(SystemModuleService.class);
        SystemMenuServiceImpl service = new SystemMenuServiceImpl(menuDAO, moduleService);
        when(moduleService.listModules(TENANT_ID)).thenReturn(Collections.singletonList(module(MODULE_ID)));
        when(menuDAO.insertMenu(anyMap())).thenReturn(31L);
        when(menuDAO.selectMenuIdByCode(anyMap())).thenReturn(null);
        when(menuDAO.selectMenuById(anyMap())).thenReturn(menu(31L, MODULE_ID));
        when(menuDAO.selectMenuPermissionCodes(31L)).thenReturn(Collections.emptyList());

        SystemMenuVO created = service.createMenu(TENANT_ID, request(MODULE_ID, null));

        assertEquals(31L, created.getMenuId());
        verify(menuDAO).insertMenu(anyMap());
    }

    @Test
    void createMenuInsertsWhenModuleAndParentBelongToTenantAndModule() throws Exception {
        SystemMenuDAO menuDAO = mock(SystemMenuDAO.class);
        SystemModuleService moduleService = mock(SystemModuleService.class);
        SystemMenuServiceImpl service = new SystemMenuServiceImpl(menuDAO, moduleService);
        when(moduleService.listModules(TENANT_ID)).thenReturn(Collections.singletonList(module(MODULE_ID)));
        when(menuDAO.selectMenuById(anyMap())).thenReturn(menu(20L, MODULE_ID), menu(31L, MODULE_ID));
        when(menuDAO.insertMenu(anyMap())).thenReturn(31L);
        when(menuDAO.selectMenuIdByCode(anyMap())).thenReturn(null);
        when(menuDAO.selectMenuPermissionCodes(31L)).thenReturn(Collections.emptyList());

        service.createMenu(TENANT_ID, request(MODULE_ID, 20L));

        verify(menuDAO).insertMenu(anyMap());
    }

    private SystemMenuSaveRequestVO request(Long moduleId, Long parentMenuId) {
        SystemMenuSaveRequestVO request = new SystemMenuSaveRequestVO();
        request.setModuleId(moduleId);
        request.setParentMenuId(parentMenuId);
        request.setMenuCode("MENU_CODE");
        request.setMenuNm("메뉴");
        request.setUseAt("Y");
        return request;
    }

    private SystemModuleVO module(Long moduleId) {
        SystemModuleVO module = new SystemModuleVO();
        module.setModuleId(moduleId);
        return module;
    }

    private SystemMenuVO menu(Long menuId, Long moduleId) {
        SystemMenuVO menu = new SystemMenuVO();
        menu.setMenuId(menuId);
        menu.setModuleId(moduleId);
        return menu;
    }
}
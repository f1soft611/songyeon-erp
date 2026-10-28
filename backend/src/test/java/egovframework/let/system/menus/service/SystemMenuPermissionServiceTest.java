package egovframework.let.system.menus.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.mockito.InOrder;

import egovframework.let.system.menus.domain.model.MyMenuResponseVO;
import egovframework.let.system.menus.domain.model.MenuTreeNodeVO;
import egovframework.let.system.menus.domain.model.SystemMenuPermissionEntry;
import egovframework.let.system.menus.domain.model.SystemMenuPermissionSaveRequestVO;
import egovframework.let.system.menus.domain.model.SystemMenuSearchConditionVO;
import egovframework.let.system.menus.domain.model.SystemMenuVO;
import egovframework.let.system.menus.domain.repository.SystemMenuDAO;
import egovframework.let.system.menus.service.impl.SystemMenuServiceImpl;
import egovframework.let.system.modules.domain.model.SystemModuleVO;
import egovframework.let.system.modules.service.SystemModuleService;

class SystemMenuPermissionServiceTest {

    private final Long tenantId = 1L;
    private final Long menuId = 11L;

    @Test
    void replaceMenuPermissionsReplacesNormalizedCodesForLeafMenu() throws Exception {
        SystemMenuDAO systemMenuDAO = mock(SystemMenuDAO.class);
        SystemMenuServiceImpl service = new SystemMenuServiceImpl(systemMenuDAO, mock(SystemModuleService.class));
        SystemMenuVO menu = menu(menuId);
        when(systemMenuDAO.selectMenuById(anyMap())).thenReturn(menu);
        when(systemMenuDAO.countChildMenus(anyMap())).thenReturn(0);
        when(systemMenuDAO.countActivePermissionCodes(Arrays.asList("READ", "CREATE"))).thenReturn(2);
        when(systemMenuDAO.selectMenuPermissionCodes(menuId)).thenReturn(Arrays.asList("READ", "CREATE"));

        SystemMenuVO result = service.replaceMenuPermissions(
                tenantId, menuId, request(" READ ", "CREATE", "READ", " "));

        assertEquals(Arrays.asList("READ", "CREATE"), result.getPermissionCodes());
        verify(systemMenuDAO).deleteMenuPermissions(menuId);
        verify(systemMenuDAO).insertMenuPermissions(menuId, Arrays.asList("READ", "CREATE"));
    }

    @Test
    void replaceMenuPermissionsRejectsGroupMenu() throws Exception {
        SystemMenuDAO systemMenuDAO = mock(SystemMenuDAO.class);
        SystemMenuServiceImpl service = new SystemMenuServiceImpl(systemMenuDAO, mock(SystemModuleService.class));
        when(systemMenuDAO.selectMenuById(anyMap())).thenReturn(menu(menuId));
        when(systemMenuDAO.countChildMenus(anyMap())).thenReturn(1);

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class,
                () -> service.replaceMenuPermissions(tenantId, menuId, request("READ")));

        assertEquals("하위 메뉴가 있는 메뉴에는 버튼 권한을 설정할 수 없습니다.", exception.getMessage());
    }

    @Test
    void replaceMenuPermissionsRejectsUnknownOrInactiveCodes() throws Exception {
        SystemMenuDAO systemMenuDAO = mock(SystemMenuDAO.class);
        SystemMenuServiceImpl service = new SystemMenuServiceImpl(systemMenuDAO, mock(SystemModuleService.class));
        when(systemMenuDAO.selectMenuById(anyMap())).thenReturn(menu(menuId));
        when(systemMenuDAO.countChildMenus(anyMap())).thenReturn(0);
        when(systemMenuDAO.countActivePermissionCodes(Arrays.asList("READ", "UNKNOWN"))).thenReturn(1);

        assertThrows(IllegalArgumentException.class,
                () -> service.replaceMenuPermissions(tenantId, menuId, request("READ", "UNKNOWN")));
    }

        @Test
        void replaceMenuPermissionsRejectsInactiveCodeWithoutChangingMappings() throws Exception {
        SystemMenuDAO systemMenuDAO = mock(SystemMenuDAO.class);
        SystemMenuServiceImpl service = new SystemMenuServiceImpl(systemMenuDAO, mock(SystemModuleService.class));
        when(systemMenuDAO.selectMenuById(anyMap())).thenReturn(menu(menuId));
        when(systemMenuDAO.countChildMenus(anyMap())).thenReturn(0);
        when(systemMenuDAO.countActivePermissionCodes(Arrays.asList("READ", "INACTIVE"))).thenReturn(1);

        assertThrows(IllegalArgumentException.class,
            () -> service.replaceMenuPermissions(tenantId, menuId, request("READ", "INACTIVE", "READ")));

        verify(systemMenuDAO, never()).deleteMenuPermissions(menuId);
        verify(systemMenuDAO, never()).insertMenuPermissions(
            org.mockito.ArgumentMatchers.anyLong(), org.mockito.ArgumentMatchers.anyList());
        }

    @Test
    void listMenusUsesOneBulkPermissionQueryAndPopulatesCodesInDaoOrder() throws Exception {
        SystemMenuDAO systemMenuDAO = mock(SystemMenuDAO.class);
        SystemMenuServiceImpl service = new SystemMenuServiceImpl(systemMenuDAO, mock(SystemModuleService.class));
        SystemMenuVO firstMenu = menu(menuId);
        SystemMenuVO secondMenu = menu(12L);
        when(systemMenuDAO.selectMenuList(org.mockito.ArgumentMatchers.any(SystemMenuSearchConditionVO.class)))
            .thenReturn(Arrays.asList(firstMenu, secondMenu));
        when(systemMenuDAO.selectMenuPermissionCodeRows(
                org.mockito.ArgumentMatchers.any(SystemMenuSearchConditionVO.class)))
                .thenReturn(Arrays.asList(
                    permissionCodeRow(menuId, "READ"),
                    permissionCodeRow(menuId, "EXCEL"),
                    permissionCodeRow(12L, "CREATE")));

        List<SystemMenuVO> result = service.listMenus(tenantId, 2L);

        verify(systemMenuDAO).selectMenuList(argThat(condition -> tenantId.equals(condition.getTenantId())
            && Long.valueOf(2L).equals(condition.getModuleId())));
        verify(systemMenuDAO, times(1)).selectMenuPermissionCodeRows(argThat(condition -> tenantId.equals(condition.getTenantId())
            && Long.valueOf(2L).equals(condition.getModuleId())));
        verify(systemMenuDAO, never()).selectMenuPermissionCodes(org.mockito.ArgumentMatchers.anyLong());
        assertEquals(Arrays.asList("READ", "EXCEL"), result.get(0).getPermissionCodes());
        assertEquals(Collections.singletonList("CREATE"), result.get(1).getPermissionCodes());
    }

    @Test
    void listMenusWithRoleIdLoadsRoleSpecificPermissionCodesAndEnabledState() throws Exception {
        SystemMenuDAO systemMenuDAO = mock(SystemMenuDAO.class);
        SystemMenuServiceImpl service = new SystemMenuServiceImpl(systemMenuDAO, mock(SystemModuleService.class));
        SystemMenuVO firstMenu = menu(menuId);
        when(systemMenuDAO.selectMenuList(org.mockito.ArgumentMatchers.any(SystemMenuSearchConditionVO.class)))
            .thenReturn(Collections.singletonList(firstMenu));
        when(systemMenuDAO.selectRoleMenuPermissionCodeRows(
                org.mockito.ArgumentMatchers.any(SystemMenuSearchConditionVO.class)))
                .thenReturn(Arrays.asList(
                    permissionCodeRow(menuId, "READ"),
                    permissionCodeRow(menuId, "CREATE")));

        List<SystemMenuVO> result = service.listMenus(tenantId, 2L, 7L);

        verify(systemMenuDAO).selectRoleMenuPermissionCodeRows(argThat(condition -> tenantId.equals(condition.getTenantId())
            && Long.valueOf(2L).equals(condition.getModuleId())
            && Long.valueOf(7L).equals(condition.getRoleId())));
        assertEquals(Arrays.asList("READ", "CREATE"), result.get(0).getPermissionCodes());
        assertEquals("Y", result.get(0).getUseAt());
    }

    @Test
    void replaceRoleMenuPermissionsPersistsSelectedRoleMappings() throws Exception {
        SystemMenuDAO systemMenuDAO = mock(SystemMenuDAO.class);
        SystemMenuServiceImpl service = new SystemMenuServiceImpl(systemMenuDAO, mock(SystemModuleService.class));
        SystemMenuVO menu = menu(menuId);
        menu.setModuleId(2L);
        when(systemMenuDAO.selectMenuById(anyMap())).thenReturn(menu);
        when(systemMenuDAO.countActivePermissionCodes(Arrays.asList("READ", "CREATE"))).thenReturn(2);

        service.replaceRoleMenuPermissions(tenantId, 7L, Arrays.asList(
            new SystemMenuPermissionEntry("READ", "CREATE", true)
        ));

        verify(systemMenuDAO).deleteRoleMenuPermissions(7L, menuId);
        verify(systemMenuDAO).insertRoleMenuPermissions(7L, menuId, Arrays.asList("READ", "CREATE"));
    }

    @Test
    // 송연(2026-10-21): 역할이 없는 계정은 메뉴 권한이 없다(S_ERP 는 메뉴 권한 정의 전체를 줌)
    void myMenuTreeWithoutRoleHasNoPermissionsButKeepsDescription() throws Exception {
        SystemMenuDAO systemMenuDAO = mock(SystemMenuDAO.class);
        SystemModuleService systemModuleService = mock(SystemModuleService.class);
        SystemMenuServiceImpl service = new SystemMenuServiceImpl(systemMenuDAO, systemModuleService);
        SystemModuleVO module = new SystemModuleVO();
        module.setModuleId(2L);
        module.setModuleNm("환경설정");
        module.setModuleUrl("/settings");
        module.setUseAt("Y");
        SystemMenuVO menu = menu(menuId);
        menu.setModuleId(2L);
        menu.setMenuNm("메뉴관리");
        menu.setMenuDc("저장된 메뉴 설명");
        menu.setMenuUrl("/settings/system/menus");
        when(systemModuleService.listModules(tenantId)).thenReturn(Collections.singletonList(module));
        when(systemMenuDAO.selectActiveMenusForTenant(tenantId)).thenReturn(Collections.singletonList(menu));
        when(systemMenuDAO.selectMenuPermissionCodeRows(
                org.mockito.ArgumentMatchers.any(SystemMenuSearchConditionVO.class)))
                .thenReturn(Arrays.asList(
                    permissionCodeRow(menuId, "READ"),
                    permissionCodeRow(menuId, "CREATE"),
                    permissionCodeRow(menuId, "UPDATE"),
                    permissionCodeRow(menuId, "DELETE")));

        MyMenuResponseVO response = service.getMyMenuTree(tenantId, "admin", "TENANT_ADMIN");
        MenuTreeNodeVO node = response.getMenus().get(0).getChildren().get(0);

        assertEquals("저장된 메뉴 설명", node.getDescription());
        assertEquals(false, node.getPermissions().isRead());
        assertEquals(false, node.getPermissions().isCreate());
        assertEquals(false, node.getPermissions().isUpdate());
        assertEquals(false, node.getPermissions().isDelete());
        assertEquals(false, node.getPermissions().isExcel());
    }

    @Test
    void myMenuTreeUsesRoleScopedPermissionsWhenRoleIdIsAvailable() throws Exception {
        SystemMenuDAO systemMenuDAO = mock(SystemMenuDAO.class);
        SystemModuleService systemModuleService = mock(SystemModuleService.class);
        SystemMenuServiceImpl service = new SystemMenuServiceImpl(systemMenuDAO, systemModuleService);

        SystemModuleVO module = new SystemModuleVO();
        module.setModuleId(2L);
        module.setModuleNm("환경설정");
        module.setModuleUrl("/settings");
        module.setUseAt("Y");

        SystemMenuVO parentMenu = menu(3L);
        parentMenu.setModuleId(2L);
        parentMenu.setMenuNm("시스템 관리");
        parentMenu.setMenuDc("시스템 관리");
        parentMenu.setMenuUrl("/settings/system");
        parentMenu.setParentMenuId(null);

        SystemMenuVO leafMenu = menu(9L);
        leafMenu.setModuleId(2L);
        leafMenu.setMenuNm("모듈관리");
        leafMenu.setMenuDc("모듈 관리");
        leafMenu.setMenuUrl("/settings/system/modules");
        leafMenu.setParentMenuId(parentMenu.getMenuId());

        when(systemModuleService.listModules(tenantId)).thenReturn(Collections.singletonList(module));
        when(systemMenuDAO.selectActiveMenusForTenant(tenantId)).thenReturn(Arrays.asList(parentMenu, leafMenu));
        when(systemMenuDAO.selectRoleMenuPermissionCodeRows(
                org.mockito.ArgumentMatchers.any(SystemMenuSearchConditionVO.class)))
                .thenReturn(Collections.singletonList(permissionCodeRow(leafMenu.getMenuId(), "READ")));

        MyMenuResponseVO response = service.getMyMenuTree(tenantId, "admin", 7L, "PLATFORM_ADMIN");

        assertEquals(true, response.getMenus().get(0).getChildren().get(0).getChildren().get(0).getPermissions().isRead());
        assertEquals(false, response.getMenus().get(0).getChildren().get(0).getChildren().get(0).getPermissions().isCreate());
        verify(systemMenuDAO).selectRoleMenuPermissionCodeRows(argThat(condition ->
                tenantId.equals(condition.getTenantId())
                        && Long.valueOf(7L).equals(condition.getRoleId())
                        && "Y".equalsIgnoreCase(condition.getUseAt())));
    }

    @Test
    void myMenuTreeUsesUnionOfAllAssignedUserRolesWhenMultipleRolePermissionsExist() throws Exception {
        SystemMenuDAO systemMenuDAO = mock(SystemMenuDAO.class);
        SystemModuleService systemModuleService = mock(SystemModuleService.class);
        SystemMenuServiceImpl service = new SystemMenuServiceImpl(systemMenuDAO, systemModuleService);

        SystemModuleVO module = new SystemModuleVO();
        module.setModuleId(2L);
        module.setModuleNm("환경설정");
        module.setModuleUrl("/settings");
        module.setUseAt("Y");

        SystemMenuVO parentMenu = menu(3L);
        parentMenu.setModuleId(2L);
        parentMenu.setMenuNm("시스템 관리");
        parentMenu.setMenuDc("시스템 관리");
        parentMenu.setMenuUrl("/settings/system");
        parentMenu.setParentMenuId(null);

        SystemMenuVO leafMenu = menu(9L);
        leafMenu.setModuleId(2L);
        leafMenu.setMenuNm("모듈관리");
        leafMenu.setMenuDc("모듈 관리");
        leafMenu.setMenuUrl("/settings/system/modules");
        leafMenu.setParentMenuId(parentMenu.getMenuId());

        when(systemModuleService.listModules(tenantId)).thenReturn(Collections.singletonList(module));
        when(systemMenuDAO.selectActiveMenusForTenant(tenantId)).thenReturn(Arrays.asList(parentMenu, leafMenu));
        when(systemMenuDAO.selectRoleIdsByUserAccount(tenantId, "admin")).thenReturn(Arrays.asList(7L, 9L));
        when(systemMenuDAO.selectRoleMenuPermissionCodeRows(org.mockito.ArgumentMatchers.any(SystemMenuSearchConditionVO.class)))
                .thenAnswer(invocation -> {
                    SystemMenuSearchConditionVO condition = invocation.getArgument(0);
                    Long roleId = condition.getRoleId();
                    if (Long.valueOf(7L).equals(roleId)) {
                        return Collections.singletonList(permissionCodeRow(leafMenu.getMenuId(), "READ"));
                    }
                    if (Long.valueOf(9L).equals(roleId)) {
                        return Collections.singletonList(permissionCodeRow(leafMenu.getMenuId(), "DELETE"));
                    }
                    return Collections.emptyList();
                });

        MyMenuResponseVO response = service.getMyMenuTree(tenantId, "admin", 7L, "PLATFORM_ADMIN");

        assertEquals(true, response.getMenus().get(0).getChildren().get(0).getChildren().get(0).getPermissions().isRead());
        assertEquals(true, response.getMenus().get(0).getChildren().get(0).getChildren().get(0).getPermissions().isDelete());
        assertEquals(false, response.getMenus().get(0).getChildren().get(0).getChildren().get(0).getPermissions().isCreate());
    }

    @Test
    void deleteMenuDeletesPermissionMappingsBeforeMenu() throws Exception {
        SystemMenuDAO systemMenuDAO = mock(SystemMenuDAO.class);
        SystemMenuServiceImpl service = new SystemMenuServiceImpl(systemMenuDAO, mock(SystemModuleService.class));
        when(systemMenuDAO.selectMenuById(anyMap())).thenReturn(menu(menuId));
        when(systemMenuDAO.countChildMenus(anyMap())).thenReturn(0);

        service.deleteMenu(tenantId, menuId);

        InOrder inOrder = inOrder(systemMenuDAO);
        inOrder.verify(systemMenuDAO).deleteMenuPermissions(menuId);
        inOrder.verify(systemMenuDAO).deleteMenu(anyMap());
    }

    private SystemMenuPermissionSaveRequestVO request(String... codes) {
        SystemMenuPermissionSaveRequestVO request = new SystemMenuPermissionSaveRequestVO();
        request.setPermissionCodes(Arrays.asList(codes));
        return request;
    }

    private SystemMenuVO menu(Long id) {
        SystemMenuVO menu = new SystemMenuVO();
        menu.setMenuId(id);
        return menu;
    }

    private Map<String, Object> permissionCodeRow(Long menuId, String permissionCode) {
        Map<String, Object> row = new HashMap<>();
        row.put("menuId", menuId);
        row.put("permissionCode", permissionCode);
        return row;
    }
}
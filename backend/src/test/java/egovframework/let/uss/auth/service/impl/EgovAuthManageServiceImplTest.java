package egovframework.let.uss.auth.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.InOrder;
import org.springframework.test.util.ReflectionTestUtils;

import egovframework.let.uss.auth.service.MenuInfoVO;

class EgovAuthManageServiceImplTest {

    @DisplayName("메뉴 삭제 시 권한-메뉴 매핑을 먼저 삭제한다")
    @Test
    void deleteMenuRemovesRoleMenuMappingsFirst() throws Exception {
        EgovAuthManageServiceImpl service = new EgovAuthManageServiceImpl();
        AuthManageDAO authManageDAO = mock(AuthManageDAO.class);
        ReflectionTestUtils.setField(service, "authManageDAO", authManageDAO);

        MenuInfoVO menuInfoVO = new MenuInfoVO();
        menuInfoVO.setMenuCode("MENU_1");

        when(authManageDAO.deleteRoleMenuPermissionsByMenuId("MENU_1")).thenReturn(1);
        when(authManageDAO.deleteMenu(any(MenuInfoVO.class))).thenReturn(1);

        int deletedCount = service.deleteMenu(menuInfoVO);

        assertEquals(1, deletedCount);

        InOrder inOrder = inOrder(authManageDAO);
        inOrder.verify(authManageDAO).deleteRoleMenuPermissionsByMenuId("MENU_1");
        inOrder.verify(authManageDAO).deleteMenu(menuInfoVO);
        verifyNoMoreInteractions(authManageDAO);
    }

    @DisplayName("메뉴 권한 확인 시 tenantId를 함께 전달한다")
    @Test
    void checkUserMenuPermission_passesTenantId() throws Exception {
        EgovAuthManageServiceImpl service = new EgovAuthManageServiceImpl();
        AuthManageDAO authManageDAO = mock(AuthManageDAO.class);
        ReflectionTestUtils.setField(service, "authManageDAO", authManageDAO);

        when(authManageDAO.checkUserMenuPermission(any())).thenReturn("write");

        String permission = service.checkUserMenuPermission("TENANT_ADMIN", 101L, "/org/roles");

        assertEquals("write", permission);
        org.mockito.Mockito.verify(authManageDAO).checkUserMenuPermission(argThat((Object param) -> {
            if (!(param instanceof java.util.Map)) {
                return false;
            }
            @SuppressWarnings("unchecked")
            java.util.Map<String, Object> map = (java.util.Map<String, Object>) param;
            return "TENANT_ADMIN".equals(map.get("roleCode"))
                    && Long.valueOf(101L).equals(map.get("tenantId"))
                    && "/org/roles".equals(map.get("menuUrl"));
        }));
    }
}

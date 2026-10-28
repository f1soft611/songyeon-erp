package egovframework.com.cmm.util;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import egovframework.com.cmm.LoginVO;

class EgovAccessControlHelperTest {

    private static LoginVO user(String roleCode) {
        LoginVO user = new LoginVO();
        user.setRoleCode(roleCode);
        return user;
    }

    @DisplayName("관리자 역할(PLATFORM_ADMIN · TENANT_ADMIN · ADMIN)만 관리자다. 역할이 없으면 관리자가 아니다(2026-10-21)")
    @Test
    void isTenantAdmin_onlyAdminRoles() {
        assertTrue(EgovAccessControlHelper.isTenantAdmin(user("PLATFORM_ADMIN")));
        assertTrue(EgovAccessControlHelper.isTenantAdmin(user("TENANT_ADMIN")));
        assertTrue(EgovAccessControlHelper.isTenantAdmin(user(" ADMIN ")));
        assertFalse(EgovAccessControlHelper.isTenantAdmin(user("DEFAULT_USER")));
        assertFalse(EgovAccessControlHelper.isTenantAdmin(user(null)));
        assertFalse(EgovAccessControlHelper.isTenantAdmin(null));
    }
}

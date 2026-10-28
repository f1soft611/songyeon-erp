package egovframework.let.uss.auth.service;

import static org.junit.jupiter.api.Assertions.assertThrows;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class RoleInfoPolicyTest {

    @DisplayName("PLATFORM_ADMIN 권한은 비활성화할 수 없다")
    @Test
    void preventPlatformAdminDeactivation() {
        RoleInfoVO target = new RoleInfoVO();
        target.setRoleCode("PLATFORM_ADMIN");
        target.setUseAt("N");

        assertThrows(IllegalArgumentException.class, () -> RoleInfoVO.validateUpdatePolicy(target));
    }
}
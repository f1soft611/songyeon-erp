package egovframework.let.uat.uia.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import org.junit.jupiter.api.Test;

import egovframework.com.cmm.LoginVO;

class LoginEmployeeResolverTest {

    private final LoginEmployeeResolver resolver = new LoginEmployeeResolver();

    private static LoginVO user(String uniqId) {
        LoginVO vo = new LoginVO();
        vo.setUniqId(uniqId);
        vo.setTenantId(7L);
        return vo;
    }

    @Test
    void uniqIdIsEmployeeIdAsIs() {
        // 2026-11-03: 로그인 uniqId 가 사번이다. 모양(0 으로 시작하는지)으로 짐작하지 않는다
        assertEquals("00000001", resolver.employeeId(user(" 00000001 ")));
        assertEquals("0000", resolver.employeeId(user("0000")));
        assertEquals("12345678", resolver.employeeId(user("12345678")));
    }

    @Test
    void missingUniqIdGivesNull() {
        assertNull(resolver.employeeId(user("  ")));
        assertNull(resolver.employeeId(user(null)));
        assertNull(resolver.employeeId(null));
    }
}

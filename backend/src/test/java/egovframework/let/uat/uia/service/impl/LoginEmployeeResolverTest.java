package egovframework.let.uat.uia.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import egovframework.com.cmm.LoginVO;

class LoginEmployeeResolverTest {

    private LoginDAO loginDAO;
    private LoginEmployeeResolver resolver;

    @BeforeEach
    void setUp() {
        loginDAO = mock(LoginDAO.class);
        resolver = new LoginEmployeeResolver();
        ReflectionTestUtils.setField(resolver, "loginDAO", loginDAO);
    }

    private static LoginVO user(String uniqId) {
        LoginVO vo = new LoginVO();
        vo.setUniqId(uniqId);
        vo.setTenantId(7L);
        return vo;
    }

    @Test
    void userNumberIsTurnedIntoEmployeeId() throws Exception {
        when(loginDAO.selectEmployeeIdByUserId(7L, 12L)).thenReturn("00000003");

        assertEquals("00000003", resolver.employeeId(user("12")));
    }

    @Test
    void employeeIdWithLeadingZeroIsUsedAsIs() {
        // tb_user 가 없는 계정 · 바꾸기 전에 받은 토큰은 uniqId 가 사번이다
        assertEquals("00000001", resolver.employeeId(user(" 00000001 ")));
        assertEquals("0000", resolver.employeeId(user("0000")));
        verifyNoInteractions(loginDAO);
    }

    @Test
    void missingUserGivesNull() throws Exception {
        when(loginDAO.selectEmployeeIdByUserId(7L, 99L)).thenReturn(null);

        assertNull(resolver.employeeId(user("99")));
        assertNull(resolver.employeeId(user("  ")));
        assertNull(resolver.employeeId(null));
    }
}

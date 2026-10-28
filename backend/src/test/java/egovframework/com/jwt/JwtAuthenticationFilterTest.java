package egovframework.com.jwt;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import javax.servlet.FilterChain;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.util.ReflectionTestUtils;

import egovframework.com.cmm.LoginVO;

public class JwtAuthenticationFilterTest {

    private JwtAuthenticationFilter filter;
    private EgovJwtTokenUtil jwtTokenUtil;
    private MockHttpServletRequest request;
    private MockHttpServletResponse response;
    private FilterChain filterChain;

    @BeforeEach
    public void setUp() {
        jwtTokenUtil = mock(EgovJwtTokenUtil.class);
        filter = new JwtAuthenticationFilter();
        ReflectionTestUtils.setField(filter, "jwtTokenUtil", jwtTokenUtil);
        request = new MockHttpServletRequest();
        response = new MockHttpServletResponse();
        filterChain = mock(FilterChain.class);
        SecurityContextHolder.clearContext();
    }

    @AfterEach
    public void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @DisplayName("유효한 토큰이 주어지면 인증 객체가 설정된다")
    @Test
    public void testValidTokenSetsAuthentication() throws Exception {
        String fakeToken = "valid.jwt.token";

        LoginVO loginVO = new LoginVO();
        loginVO.setId("admin");
        loginVO.setRoleCode("PLATFORM_ADMIN");

        request.addHeader("Authorization", fakeToken);
        when(jwtTokenUtil.getLoginVOFromToken(fakeToken)).thenReturn(loginVO);

        filter.doFilterInternal(request, response, filterChain);

        assertNotNull(SecurityContextHolder.getContext().getAuthentication());
        assertEquals("admin", ((LoginVO) SecurityContextHolder.getContext().getAuthentication().getPrincipal()).getId());
        assertTrue(SecurityContextHolder.getContext().getAuthentication().getAuthorities().stream()
                .anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority())));
    }

    @DisplayName("업체 관리자 roleCode는 ROLE_TENANT_ADMIN 권한으로 매핑된다")
    @Test
    public void testTenantAdminRoleMapped() throws Exception {
        String fakeToken = "tenant.admin.jwt";

        LoginVO loginVO = new LoginVO();
        loginVO.setId("tenant-admin-1");
        loginVO.setRoleCode("TENANT_ADMIN");

        request.addHeader("Authorization", fakeToken);
        when(jwtTokenUtil.getLoginVOFromToken(fakeToken)).thenReturn(loginVO);

        filter.doFilterInternal(request, response, filterChain);

        assertNotNull(SecurityContextHolder.getContext().getAuthentication());
        assertTrue(SecurityContextHolder.getContext().getAuthentication().getAuthorities().stream()
                .anyMatch(a -> "ROLE_TENANT_ADMIN".equals(a.getAuthority())));
    }

    @DisplayName("ADMIN roleCode는 PLATFORM_ADMIN과 동일하게 ROLE_ADMIN으로 매핑된다")
    @Test
    public void testLegacyAdminRoleMappedToRoleAdmin() throws Exception {
        String fakeToken = "legacy.admin.jwt";

        LoginVO loginVO = new LoginVO();
        loginVO.setId("legacy-admin");
        loginVO.setRoleCode("ADMIN");

        request.addHeader("Authorization", fakeToken);
        when(jwtTokenUtil.getLoginVOFromToken(fakeToken)).thenReturn(loginVO);

        filter.doFilterInternal(request, response, filterChain);

        assertNotNull(SecurityContextHolder.getContext().getAuthentication());
        assertTrue(SecurityContextHolder.getContext().getAuthentication().getAuthorities().stream()
                .anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority())));
    }

    @DisplayName("유효하지 않은 토큰이 주어지면 인증 객체가 설정되지 않는다")
    @Test
    public void testInvalidTokenDoesNotSetAuthentication() throws Exception {
        String invalidToken = "invalid.jwt.token";
        request.addHeader("Authorization", invalidToken);

        when(jwtTokenUtil.getLoginVOFromToken(invalidToken))
                .thenThrow(new InvalidJwtException("Invalid token"));

        filter.doFilterInternal(request, response, filterChain);

        assertNull(SecurityContextHolder.getContext().getAuthentication());
    }
}


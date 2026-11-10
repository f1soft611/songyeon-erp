package egovframework.com.cmm.interceptor;

import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import egovframework.com.cmm.LoginVO;

class AuthenticInterceptorTest {

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void refreshRequestWithContextPathBypassesSessionAuthentication() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setContextPath("/s-erp-backend");
        request.setServletPath("/auth/refresh");
        request.setRequestURI("/s-erp-backend/auth/refresh");

        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(new LoginVO(), null));

        assertTrue(new AuthenticInterceptor().preHandle(
                request, new MockHttpServletResponse(), new Object()));
    }
}

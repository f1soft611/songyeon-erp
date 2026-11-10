package egovframework.let.groupware.realtime;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.time.Clock;
import javax.servlet.AsyncEvent;
import javax.servlet.AsyncListener;
import org.springframework.mock.web.MockAsyncContext;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.mock.web.MockServletContext;
import org.springframework.security.web.FilterChainProxy;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.support.AnnotationConfigWebApplicationContext;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import egovframework.com.jwt.EgovJwtTokenUtil;
import egovframework.com.jwt.InvalidJwtException;
import egovframework.com.security.SecurityConfig;

// S_ERP RealtimeSecurityTest(2026-11-02 알림 · 쪽지 실시간)와 같은 확인. 송연은 사람을 사번 문자열로 가리킨다(20261103_003)
class RealtimeSecurityTest {

    private AnnotationConfigWebApplicationContext context;
    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        context = new AnnotationConfigWebApplicationContext();
        context.setServletContext(new MockServletContext());
        context.register(Config.class);
        context.refresh();
        mvc = MockMvcBuilders.webAppContextSetup(context)
                .addFilters(context.getBean(FilterChainProxy.class)).build();
    }

    @AfterEach
    void close() {
        context.close();
    }

    @Test
    void missingOrInvalidBearerIsRejectedByExistingSecurityChain() throws Exception {
        when(context.getBean(EgovJwtTokenUtil.class).getLoginVOFromToken("invalid"))
                .thenThrow(new InvalidJwtException("invalid"));
        mvc.perform(get("/api/v1/groupware/realtime")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/groupware/realtime").header("Authorization", "Bearer invalid"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void authenticatedStreamCanCompleteAsyncWithoutReauthenticationOrAccessDenied() throws Exception {
        when(context.getBean(EgovJwtTokenUtil.class).getLoginVOFromToken("valid"))
                .thenReturn(RealtimeStreamServiceTest.user(4L, "12"));
        MvcResult result = mvc.perform(get("/api/v1/groupware/realtime")
                .header("Authorization", "Bearer valid"))
                .andExpect(status().isOk()).andExpect(request().asyncStarted())
                .andExpect(content().string("event:ready\ndata:{}\n\n")).andReturn();

        context.getBean(SseEmitter.class).complete();
        mvc.perform(asyncDispatch(result)).andExpect(status().isOk());
        verify(context.getBean(EgovJwtTokenUtil.class), times(1)).getLoginVOFromToken("valid");
    }

    @Test
    void servletTimeoutCompletesNormallyInsteadOfReturningAsyncTimeoutError() throws Exception {
        when(context.getBean(EgovJwtTokenUtil.class).getLoginVOFromToken("valid"))
                .thenReturn(RealtimeStreamServiceTest.user(4L, "12"));
        MvcResult result = mvc.perform(get("/api/v1/groupware/realtime")
                .header("Authorization", "Bearer valid"))
                .andExpect(status().isOk()).andExpect(request().asyncStarted()).andReturn();
        MockAsyncContext async = (MockAsyncContext) result.getRequest().getAsyncContext();
        for (AsyncListener listener : async.getListeners()) {
            listener.onTimeout(new AsyncEvent(async));
        }
        mvc.perform(asyncDispatch(result)).andExpect(status().isOk());
    }

    @Configuration
    @EnableWebMvc
    @Import(SecurityConfig.class)
    static class Config {
        @Bean
        EgovJwtTokenUtil tokenUtil() {
            return mock(EgovJwtTokenUtil.class);
        }

        @Bean
        SseEmitter emitter() {
            return new SseEmitter(45000L);
        }

        @Bean
        RealtimeStreamService streams() {
            return new RealtimeStreamService(Clock.systemUTC(), timeout -> emitter());
        }

        @Bean
        RealtimeApiController controller() {
            return new RealtimeApiController(streams());
        }
    }
}

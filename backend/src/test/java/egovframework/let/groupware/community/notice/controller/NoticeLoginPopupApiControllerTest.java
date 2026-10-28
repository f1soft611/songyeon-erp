package egovframework.let.groupware.community.notice.controller;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.util.Collections;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.core.MethodParameter;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.groupware.community.notice.domain.model.NoticeBoardPostVO;
import egovframework.let.groupware.community.notice.service.NoticeLoginPopupService;

class NoticeLoginPopupApiControllerTest {
    private static final String ROOT = "/api/v1/groupware/boards/notice/login-popups";
    private NoticeLoginPopupService service;
    private MockMvc mvc;
    private LoginVO user;

    @BeforeEach
    void setUp() {
        service = mock(NoticeLoginPopupService.class);
        user = new LoginVO();
        user.setTenantId(7L);
        user.setId("synthetic-reader");
        mvc = MockMvcBuilders.standaloneSetup(
                new NoticeLoginPopupApiController(service, new ResultVoHelper()))
                .setCustomArgumentResolvers(new HandlerMethodArgumentResolver() {
                    public boolean supportsParameter(MethodParameter parameter) {
                        return parameter.getParameterType() == LoginVO.class;
                    }
                    public Object resolveArgument(MethodParameter parameter, ModelAndViewContainer container,
                            NativeWebRequest request, WebDataBinderFactory factory) {
                        return user;
                    }
                }).build();
    }

    @Test
    void pathsReturnExistingEnvelopeAndIgnoreClientSuppliedIdentity() throws Exception {
        NoticeBoardPostVO post = new NoticeBoardPostVO();
        post.setPostId(42L);
        when(service.list(7L, "synthetic-reader")).thenReturn(Collections.singletonList(post));
        when(service.detail(7L, 42L, "synthetic-reader")).thenReturn(post);
        mvc.perform(get(ROOT).param("tenantId", "99").param("loginId", "99"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.resultCode").value(200))
                .andExpect(jsonPath("$.result.resultList[0].postId").value(42));
        mvc.perform(get(ROOT + "/42")).andExpect(status().isOk())
                .andExpect(jsonPath("$.result.item.postId").value(42));
        mvc.perform(put(ROOT + "/42/dismiss-today").param("tenantId", "99"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.result.message").exists());
        verify(service).list(7L, "synthetic-reader");
        verify(service).detail(7L, 42L, "synthetic-reader");
        verify(service).dismissToday(7L, 42L, "synthetic-reader");
    }

    @Test
    void everyEndpointRejectsMissingAuthenticationBeforeCallingService() throws Exception {
        user = null;
        mvc.perform(get(ROOT)).andExpect(status().isUnauthorized());
        mvc.perform(get(ROOT + "/42")).andExpect(status().isUnauthorized());
        mvc.perform(put(ROOT + "/42/dismiss-today")).andExpect(status().isUnauthorized());
        verifyNoInteractions(service);
    }
}

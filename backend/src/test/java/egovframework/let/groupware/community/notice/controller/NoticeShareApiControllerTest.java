package egovframework.let.groupware.community.notice.controller;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

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
import egovframework.let.groupware.community.notice.service.NoticeShareService;

class NoticeShareApiControllerTest {
    private static final String ROOT = "/api/v1/groupware/boards/notice";
    private NoticeShareService service;
    private MockMvc mvc;
    private LoginVO user;

    @BeforeEach
    void setUp() {
        service = mock(NoticeShareService.class);
        user = new LoginVO();
        user.setTenantId(7L);
        user.setId("synthetic-reader");
        mvc = MockMvcBuilders.standaloneSetup(
                new NoticeShareApiController(service, new ResultVoHelper()))
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
    void issueAndResolveUseTheAuthenticatedPrincipalAndExistingEnvelope() throws Exception {
        String token = "v1." + new String(new char[59]).replace('\0', 'A');
        NoticeBoardPostVO post = new NoticeBoardPostVO();
        post.setPostId(42L);
        when(service.issue(user, 42L)).thenReturn(token);
        when(service.resolve(user, token)).thenReturn(post);

        mvc.perform(post(ROOT + "/posts/42/share-link"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result.item.token").value(token));
        mvc.perform(get(ROOT + "/shared-post").param("token", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result.item.postId").value(42));

        verify(service).issue(user, 42L);
        verify(service).resolve(user, token);
    }

    @Test
    void bothShareEndpointsRejectMissingAuthenticationBeforeCallingService() throws Exception {
        user = null;

        mvc.perform(post(ROOT + "/posts/42/share-link"))
                .andExpect(status().isUnauthorized());
        mvc.perform(get(ROOT + "/shared-post").param("token", "invalid"))
                .andExpect(status().isUnauthorized());

        verifyNoInteractions(service);
    }
}

package egovframework.let.search;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.core.MethodParameter;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;
import org.springframework.web.bind.support.WebDataBinderFactory;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.search.controller.UnifiedSearchApiController;
import egovframework.let.search.domain.model.SearchResponseVO;
import egovframework.let.search.domain.model.SearchGroupVO;
import egovframework.let.search.domain.model.SearchItemVO;
import egovframework.let.search.service.UnifiedSearchService;

class UnifiedSearchApiControllerTest {
    private final UnifiedSearchService service = mock(UnifiedSearchService.class);
    private MockMvc mvc;
    private LoginVO user;

    @BeforeEach
    void setUp() {
        user = new LoginVO();
        user.setTenantId(4L);
        mvc = MockMvcBuilders.standaloneSetup(new UnifiedSearchApiController(new ResultVoHelper(), service))
                .setCustomArgumentResolvers(new HandlerMethodArgumentResolver() {
                    public boolean supportsParameter(MethodParameter parameter) {
                        return parameter.getParameterType() == LoginVO.class;
                    }
                    public Object resolveArgument(MethodParameter parameter, ModelAndViewContainer container,
                            NativeWebRequest request, WebDataBinderFactory binder) {
                        return user;
                    }
                }).build();
    }

    @Test
    void exposesBoundedDefaultSearchWithMetadataEnvelope() throws Exception {
        when(service.search(user, "검색", "ALL", 0, 5)).thenReturn(new SearchResponseVO(List.of(
                new SearchGroupVO("MENU", List.of(new SearchItemVO(2L, "MENU", "검색", "모듈", "/test")), 1, 0, 5))));

        mvc.perform(get("/api/v1/search").param("keyword", "검색"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result.item.groups[0].items[0].path").value("/test"))
                .andExpect(jsonPath("$.result.item.groups[0].totalCount").value(1));
        verify(service).search(user, "검색", "ALL", 0, 5);
    }

    @Test
    void forwardsTypeAndPageButNotClientTenant() throws Exception {
        when(service.search(user, "공지", "NOTICE", 10, 10)).thenReturn(new SearchResponseVO(List.of()));
        mvc.perform(get("/api/v1/search").param("keyword", "공지").param("type", "NOTICE")
                .param("offset", "10").param("limit", "10").param("tenantId", "999"))
                .andExpect(status().isOk());
        verify(service).search(user, "공지", "NOTICE", 10, 10);
    }

    @Test
    void rejectsMissingKeywordAndInvalidPageSyntax() throws Exception {
        mvc.perform(get("/api/v1/search")).andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/search").param("keyword", "공지").param("offset", "x"))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(service);
    }
}

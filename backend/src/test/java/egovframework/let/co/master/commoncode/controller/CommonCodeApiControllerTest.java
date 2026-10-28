package egovframework.let.co.master.commoncode.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Collections;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.MethodParameter;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.ResponseCode;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.co.master.commoncode.domain.model.CommonCodeGroupSearchCondition;
import egovframework.let.co.master.commoncode.domain.model.CommonCodeGroupVO;
import egovframework.let.co.master.commoncode.domain.model.CommonCodeItemVO;
import egovframework.let.co.master.commoncode.service.CommonCodeBatchService;
import egovframework.let.co.master.commoncode.service.CommonCodeGroupService;
import egovframework.let.co.master.commoncode.service.CommonCodeItemService;

@ExtendWith(MockitoExtension.class)
class CommonCodeApiControllerTest {

    @Mock
    private CommonCodeGroupService commonCodeGroupService;

    @Mock
    private CommonCodeItemService commonCodeItemService;

    @Mock
    private CommonCodeBatchService commonCodeBatchService;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        CommonCodeGroupApiController controller =
                new CommonCodeGroupApiController(new ResultVoHelper(), commonCodeBatchService, commonCodeGroupService, commonCodeItemService);
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setCustomArgumentResolvers(new AuthenticationPrincipalResolver())
                .build();
    }

    @Test
    void listGroupsReturnsGroupsForTenant() throws Exception {
        CommonCodeGroupVO group = new CommonCodeGroupVO();
        group.setCommonCodeGroupId(1L);
        group.setGroupCode("ATTACH_DOC");
        group.setGroupNm("첨부문서업무");
        when(commonCodeGroupService.listGroups(eq(1L))).thenReturn(Collections.singletonList(group));

        mockMvc.perform(get("/api/v1/co/master/common-code/groups")
                .principal(authenticationFor()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result.resultList[0].commonCodeGroupId").value(1))
                .andExpect(jsonPath("$.result.resultList[0].groupCode").value("ATTACH_DOC"));
    }

        @Test
        void listGroupsPassesSearchConditionsToService() throws Exception {
        when(commonCodeGroupService.listGroups(eq(1L), any(CommonCodeGroupSearchCondition.class)))
            .thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/v1/co/master/common-code/groups")
            .param("keyword", "공통")
            .param("groupCode", "DOC")
            .param("groupNm", "문서")
            .principal(authenticationFor()))
            .andExpect(status().isOk());

        verify(commonCodeGroupService).listGroups(eq(1L), org.mockito.ArgumentMatchers.argThat(condition ->
            "공통".equals(condition.getKeyword())
                && "DOC".equals(condition.getGroupCode())
                && "문서".equals(condition.getGroupNm())
                && condition.getGroupDc() == null));
        }

    @Test
    void createItemRejectsParentOnDifferentGroup() throws Exception {
        CommonCodeItemVO item = new CommonCodeItemVO();
        item.setCommonCodeItemId(11L);
        item.setItemCode("STATEMENT");
        when(commonCodeItemService.createItem(eq(1L), eq(2L), any())).thenThrow(new IllegalArgumentException("상위 상세코드는 현재 그룹의 부모 그룹 상세코드만 선택할 수 있습니다."));

        mockMvc.perform(post("/api/v1/co/master/common-code/groups/2/items")
                .principal(authenticationFor())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"itemCode\":\"STATEMENT\",\"itemNm\":\"거래명세서\",\"parentItemId\":99,\"sortOrder\":1,\"useAt\":\"Y\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.result.message").value("상위 상세코드는 현재 그룹의 부모 그룹 상세코드만 선택할 수 있습니다."));
    }

            @Test
                void saveBatchReturnsDuplicateCodeMessageAsResultMessage() throws Exception {
            String duplicateMessage = "이미 사용 중인 상세 코드입니다.";
                when(commonCodeBatchService.saveBatch(eq(1L), any()))
                .thenThrow(new IllegalArgumentException(duplicateMessage));

                mockMvc.perform(post("/api/v1/co/master/common-code/save-batch")
                .principal(authenticationFor())
                .contentType(MediaType.APPLICATION_JSON)
                    .content("{}"))
                .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.resultCode").value(ResponseCode.INPUT_CHECK_ERROR.getCode()))
                .andExpect(jsonPath("$.resultMessage").value(duplicateMessage))
                .andExpect(jsonPath("$.result.message").value(duplicateMessage));
            }

    private UsernamePasswordAuthenticationToken authenticationFor() {
        LoginVO user = new LoginVO();
        user.setTenantId(1L);
        user.setRoleCode("PLATFORM_ADMIN");
        return new UsernamePasswordAuthenticationToken(user, null, Collections.emptyList());
    }

    private static class AuthenticationPrincipalResolver implements HandlerMethodArgumentResolver {
        @Override
        public boolean supportsParameter(MethodParameter parameter) {
            return parameter.hasParameterAnnotation(AuthenticationPrincipal.class);
        }

        @Override
        public Object resolveArgument(
                MethodParameter parameter,
                ModelAndViewContainer modelAndViewContainer,
                NativeWebRequest webRequest,
                org.springframework.web.bind.support.WebDataBinderFactory binderFactory) {
            return ((UsernamePasswordAuthenticationToken) webRequest.getUserPrincipal()).getPrincipal();
        }
    }
}

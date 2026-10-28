package egovframework.let.co.workflow.form.controller;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.argThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Collections;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.MethodParameter;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.http.MediaType;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.co.workflow.form.domain.model.DraftingWorkUserOptionVO;
import egovframework.let.co.workflow.form.domain.model.DraftingWorkSaveRequestVO;
import egovframework.let.co.workflow.form.domain.model.DraftingWorkVO;
import egovframework.let.co.workflow.form.service.DraftingWorkService;

@ExtendWith(MockitoExtension.class)
class DraftingWorkApiControllerTest {

    @Mock
    private DraftingWorkService draftingWorkService;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        DraftingWorkApiController controller =
                new DraftingWorkApiController(new ResultVoHelper(), draftingWorkService);
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setCustomArgumentResolvers(new AuthenticationPrincipalResolver())
                .build();
    }

    @Test
    void listUserOptionsUsesAuthenticatedTenantAndReturnsLoginAndUserIds() throws Exception {
        DraftingWorkUserOptionVO user = new DraftingWorkUserOptionVO();
        user.setUserId(110L);
        user.setLoginId(210L);
        user.setUserNm("홍길동");
        user.setDepartmentNm("운영팀");
        user.setProfileImage("/profiles/fixture.png");
        user.setLevelNm("부장");
        when(draftingWorkService.listUserOptions(1L))
                .thenReturn(Collections.singletonList(user));

        mockMvc.perform(get("/api/v1/co/workflow/forms/users")
                        .principal(authenticationForTenant(1L)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result.resultList[0].userId").value(110))
                .andExpect(jsonPath("$.result.resultList[0].loginId").value(210))
                .andExpect(jsonPath("$.result.resultList[0].userNm").value("홍길동"))
                .andExpect(jsonPath("$.result.resultList[0].departmentNm").value("운영팀"))
                .andExpect(jsonPath("$.result.resultList[0].profileImage").value("/profiles/fixture.png"))
                .andExpect(jsonPath("$.result.resultList[0].levelNm").value("부장"));

        verify(draftingWorkService).listUserOptions(1L);
    }

    @Test
    void listWorksPassesUnifiedAndDetailedFiltersWithAuthenticatedTenant() throws Exception {
        when(draftingWorkService.listWorks(eq(1L), eq("점검"), eq(31L), eq(42L), eq("Y")))
                .thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/v1/co/workflow/forms")
                        .param("keyword", "점검")
                        .param("categoryItemId", "31")
                        .param("regTermId", "42")
                        .param("useAt", "Y")
                        .principal(authenticationForTenant(1L)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result.resultList").isArray());

        verify(draftingWorkService).listWorks(1L, "점검", 31L, 42L, "Y");
    }

        @Test
        void createWorkRequiresTenantAdminPassesTenantAndActorAndReturnsCreatedRow() throws Exception {
        DraftingWorkVO saved = new DraftingWorkVO();
        saved.setDraftingWorkCategoryId(71L);
        saved.setCataTypeCode("007");
        saved.setCodeName("정기점검");
        when(draftingWorkService.createWork(
            eq(1L), eq(101L), argThat(payload ->
                "정기점검".equals(payload.getCodeName())
                    && Long.valueOf(31L).equals(payload.getCategoryItemId())
                    && Long.valueOf(42L).equals(payload.getRegTermId())
                    && payload.getAssigneeIds() == null)))
            .thenReturn(saved);

        mockMvc.perform(post("/api/v1/co/workflow/forms")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"codeName\":\"정기점검\",\"categoryItemId\":31,\"regTermId\":42,\"assigneeIds\":null,\"useAt\":\"Y\"}")
                .principal(authenticationForTenant(1L, "TENANT_ADMIN", "101")))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.result.item.draftingWorkCategoryId").value(71))
            .andExpect(jsonPath("$.result.item.cataTypeCode").value("007"));

        verify(draftingWorkService).createWork(
            eq(1L), eq(101L), argThat(payload ->
                "정기점검".equals(payload.getCodeName())
                    && Long.valueOf(31L).equals(payload.getCategoryItemId())
                        && Long.valueOf(42L).equals(payload.getRegTermId())
                        && payload.getAssigneeIds() == null));
        }

    @Test
    void createWorkReturnsBadRequestWhenTheCodeInsertConflicts() throws Exception {
        when(draftingWorkService.createWork(eq(1L), eq(101L), org.mockito.ArgumentMatchers.any()))
                .thenThrow(new IllegalArgumentException("이미 사용 중인 구분코드입니다."));

        mockMvc.perform(post("/api/v1/co/workflow/forms")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"cataTypeCode\":\"007\",\"codeName\":\"정기점검\",\"categoryItemId\":31,\"regTermId\":42}")
                .principal(authenticationForTenant(1L, "TENANT_ADMIN", "101")))
            .andExpect(status().isBadRequest());
    }

    @Test
    void updateWorkRequiresTenantAdminAndReturnsUpdatedRow() throws Exception {
        DraftingWorkVO saved = new DraftingWorkVO();
        saved.setDraftingWorkCategoryId(71L);
        saved.setCataTypeCode("007");
        saved.setCodeName("수정양식");
        when(draftingWorkService.updateWork(
                eq(1L), eq(101L), eq(71L), argThat(payload ->
                    "수정양식".equals(payload.getCodeName())
                        && Long.valueOf(31L).equals(payload.getCategoryItemId())
                        && Long.valueOf(42L).equals(payload.getRegTermId()))))
            .thenReturn(saved);

        mockMvc.perform(put("/api/v1/co/workflow/forms/71")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"codeName\":\"수정양식\",\"categoryItemId\":31,\"regTermId\":42}")
                .principal(authenticationForTenant(1L, "TENANT_ADMIN", "101")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.result.item.draftingWorkCategoryId").value(71))
            .andExpect(jsonPath("$.result.item.cataTypeCode").value("007"));

        verify(draftingWorkService).updateWork(
                eq(1L), eq(101L), eq(71L), argThat(payload ->
                    "수정양식".equals(payload.getCodeName())
                        && Long.valueOf(31L).equals(payload.getCategoryItemId())
                        && Long.valueOf(42L).equals(payload.getRegTermId())));
    }

        @Test
        void createWorkRejectsNonAdminBeforeCallingService() throws Exception {
        mockMvc.perform(post("/api/v1/co/workflow/forms")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"codeName\":\"정기점검\",\"categoryItemId\":31,\"regTermId\":42}")
                .principal(authenticationForTenant(1L)))
            .andExpect(status().isForbidden());

        org.mockito.Mockito.verifyNoInteractions(draftingWorkService);
        }

    @Test
    void updateWorkRejectsNonAdminBeforeCallingService() throws Exception {
        mockMvc.perform(put("/api/v1/co/workflow/forms/71")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"codeName\":\"수정양식\",\"categoryItemId\":31,\"regTermId\":42}")
                .principal(authenticationForTenant(1L)))
            .andExpect(status().isForbidden());

        org.mockito.Mockito.verifyNoInteractions(draftingWorkService);
    }

    private UsernamePasswordAuthenticationToken authenticationForTenant(Long tenantId) {
        return authenticationForTenant(tenantId, "TENANT_USER", null);
    }

    private UsernamePasswordAuthenticationToken authenticationForTenant(
            Long tenantId,
            String roleCode,
            String userId) {
        LoginVO user = new LoginVO();
        user.setTenantId(tenantId);
        user.setRoleCode(roleCode);
        user.setUniqId(userId);
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
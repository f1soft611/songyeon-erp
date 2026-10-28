package egovframework.let.co.workflow.form.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Collections;
import java.util.NoSuchElementException;

import com.fasterxml.jackson.databind.ObjectMapper;
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
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.co.workflow.form.domain.model.DraftingWorkTemplateSaveRequestVO;
import egovframework.let.co.workflow.form.domain.model.DraftingWorkTemplateVO;
import egovframework.let.co.workflow.form.service.DraftingWorkService;

@ExtendWith(MockitoExtension.class)
class DraftingWorkTemplateApiControllerTest {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

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
    void getTemplateRoutesThroughAuthenticatedTenantAndReturnsJsonAndHtml() throws Exception {
        when(draftingWorkService.getTemplate(9L, 77L)).thenReturn(template());

        mockMvc.perform(get("/api/v1/co/workflow/forms/77/template")
                        .principal(authenticationForTenant(9L)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result.item.draftingWorkCategoryId").value(77))
                .andExpect(jsonPath("$.result.item.templateJson.type").value("doc"))
                .andExpect(jsonPath("$.result.item.templateHtml").value("<p>점검 내용</p>"));

        verify(draftingWorkService).getTemplate(9L, 77L);
    }

    @Test
    void putTemplateRequiresTenantAdminAndPassesAuthenticatedTenantAndBody() throws Exception {
        when(draftingWorkService.saveTemplate(
                eq(9L), eq(77L), eq("actor-9"), org.mockito.ArgumentMatchers.any()))
                .thenReturn(template());

        mockMvc.perform(put("/api/v1/co/workflow/forms/77/template")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"templateJson\":{\"type\":\"doc\",\"content\":[]},"
                                + "\"templateHtml\":\"<p>저장 본문</p>\","
                                + "\"embeddedImages\":[{\"uploadToken\":\"upload-token\","
                                + "\"fileName\":\"image.png\",\"objectKey\":\"untrusted/key\","
                                + "\"bucketName\":\"untrusted-bucket\",\"mimeType\":\"image/svg+xml\","
                                + "\"fileSize\":999999}]}")
                        .principal(authenticationForTenant(9L, "TENANT_ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result.item.draftingWorkCategoryId").value(77));

        org.mockito.ArgumentCaptor<DraftingWorkTemplateSaveRequestVO> payloadCaptor =
                org.mockito.ArgumentCaptor.forClass(DraftingWorkTemplateSaveRequestVO.class);
        verify(draftingWorkService).saveTemplate(
                eq(9L), eq(77L), eq("actor-9"), payloadCaptor.capture());
        com.fasterxml.jackson.databind.JsonNode boundPayload =
                OBJECT_MAPPER.valueToTree(payloadCaptor.getValue());
        assertEquals("upload-token", boundPayload.path("embeddedImages").path(0).path("uploadToken").asText());
        assertEquals("image.png", boundPayload.path("embeddedImages").path(0).path("fileName").asText());
        assertFalse(boundPayload.path("embeddedImages").path(0).has("objectKey"));
        assertFalse(boundPayload.path("embeddedImages").path(0).has("bucketName"));
        assertFalse(boundPayload.path("embeddedImages").path(0).has("mimeType"));
        assertFalse(boundPayload.path("embeddedImages").path(0).has("fileSize"));
    }

    @Test
    void putTemplateRejectsNonAdminBeforeCallingService() throws Exception {
        mockMvc.perform(put("/api/v1/co/workflow/forms/77/template")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"templateJson\":{\"type\":\"doc\",\"content\":[]},"
                                + "\"templateHtml\":\"<p>본문</p>\"}")
                        .principal(authenticationForTenant(9L, "TENANT_USER")))
                .andExpect(status().isForbidden());

        verifyNoInteractions(draftingWorkService);
    }

    @Test
    void getTemplateReturnsNotFoundWhenFormIsOutsideTenantOrDeleted() throws Exception {
        when(draftingWorkService.getTemplate(9L, 77L))
                .thenThrow(new NoSuchElementException("기안양식을 찾을 수 없습니다."));

        mockMvc.perform(get("/api/v1/co/workflow/forms/77/template")
                        .principal(authenticationForTenant(9L)))
                .andExpect(status().isNotFound());

        verify(draftingWorkService).getTemplate(9L, 77L);
    }

    @Test
    void putTemplateReturnsNotFoundWhenFormIsOutsideTenantOrDeleted() throws Exception {
        when(draftingWorkService.saveTemplate(
                eq(9L), eq(77L), eq("actor-9"), org.mockito.ArgumentMatchers.any()))
                .thenThrow(new NoSuchElementException("기안양식을 찾을 수 없습니다."));

        mockMvc.perform(put("/api/v1/co/workflow/forms/77/template")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"templateJson\":{\"type\":\"doc\",\"content\":[]},"
                                + "\"templateHtml\":\"<p>본문</p>\"}")
                        .principal(authenticationForTenant(9L, "TENANT_ADMIN")))
                .andExpect(status().isNotFound());
    }

        @Test
        void putTemplateRejectsMalformedJsonRequest() throws Exception {
                mockMvc.perform(put("/api/v1/co/workflow/forms/77/template")
                                                .contentType(MediaType.APPLICATION_JSON)
                                                .content("{\"templateJson\":"))
                                .andExpect(status().isBadRequest());

                verifyNoInteractions(draftingWorkService);
        }

    private DraftingWorkTemplateVO template() throws Exception {
        DraftingWorkTemplateVO template = new DraftingWorkTemplateVO();
        template.setDraftingWorkCategoryId(77L);
        template.setCataTypeCode("007");
        template.setCodeName("정기점검");
        template.setHasDocument(true);
        template.setTemplateJson(OBJECT_MAPPER.readTree("{\"type\":\"doc\",\"content\":[]}"));
        template.setTemplateHtml("<p>점검 내용</p>");
        return template;
    }

    private UsernamePasswordAuthenticationToken authenticationForTenant(Long tenantId) {
        return authenticationForTenant(tenantId, "TENANT_USER");
    }

    private UsernamePasswordAuthenticationToken authenticationForTenant(Long tenantId, String roleCode) {
        LoginVO user = new LoginVO();
        user.setTenantId(tenantId);
        user.setRoleCode(roleCode);
        user.setId("actor-9");
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
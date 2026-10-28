package egovframework.let.co.workflow.form.controller;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Collections;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.MethodParameter;
import org.springframework.http.MediaType;
import javax.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.co.workflow.form.domain.model.DraftingWorkTemplateUploadVO;
import egovframework.let.co.workflow.form.service.DraftingWorkTemplateImageService;

@ExtendWith(MockitoExtension.class)
class DraftingWorkTemplateImageApiControllerTest {

    @Mock
    private DraftingWorkTemplateImageService imageService;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        DraftingWorkTemplateImageApiController controller =
                new DraftingWorkTemplateImageApiController(new ResultVoHelper(), imageService);
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setCustomArgumentResolvers(new AuthenticationPrincipalResolver())
                .build();
    }

    @Test
    void uploadReturnsCreatedAndUsesAuthenticatedTenantAndForm() throws Exception {
        DraftingWorkTemplateUploadVO upload = new DraftingWorkTemplateUploadVO();
        upload.setUploadToken("bde1fdec-5d22-487a-a254-2b9547cd32b3");
        upload.setFileName("pasted.png");
        upload.setFileSize(8L);
        upload.setMimeType("image/png");
        when(imageService.uploadTemporaryImage(eq(9L), eq(77L), org.mockito.ArgumentMatchers.any()))
                .thenReturn(upload);

        mockMvc.perform(multipart("/api/v1/co/workflow/forms/77/template-images/temp")
                        .file("file", new byte[] {(byte) 0x89, 'P', 'N', 'G', 13, 10, 26, 10})
                        .contentType(MediaType.MULTIPART_FORM_DATA)
                        .principal(authenticationForTenant(9L, "TENANT_ADMIN")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.result.item.uploadToken").value(upload.getUploadToken()))
                .andExpect(jsonPath("$.result.item.fileName").value("pasted.png"))
                .andExpect(jsonPath("$.result.item.fileSize").value(8))
                .andExpect(jsonPath("$.result.item.mimeType").value("image/png"));

        verify(imageService).uploadTemporaryImage(eq(9L), eq(77L), org.mockito.ArgumentMatchers.any());
    }

    @Test
    void uploadRejectsNonAdminBeforeCallingService() throws Exception {
        mockMvc.perform(multipart("/api/v1/co/workflow/forms/77/template-images/temp")
                        .file("file", new byte[] {(byte) 0x89, 'P', 'N', 'G', 13, 10, 26, 10})
                        .principal(authenticationForTenant(9L, "TENANT_USER")))
                .andExpect(status().isForbidden());

        verifyNoInteractions(imageService);
    }

    @Test
    void uploadRejectsMissingAuthentication() throws Exception {
        mockMvc.perform(multipart("/api/v1/co/workflow/forms/77/template-images/temp")
                        .file("file", new byte[] {(byte) 0x89, 'P', 'N', 'G', 13, 10, 26, 10}))
                .andExpect(status().isUnauthorized());

        verifyNoInteractions(imageService);
    }

    @Test
    void uploadMapsImageValidationErrorsToHttpStatus() throws Exception {
        when(imageService.uploadTemporaryImage(eq(9L), eq(77L), org.mockito.ArgumentMatchers.any()))
                .thenThrow(new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE));

        mockMvc.perform(multipart("/api/v1/co/workflow/forms/77/template-images/temp")
                        .file("file", new byte[] {(byte) 0x89, 'P', 'N', 'G', 13, 10, 26, 10})
                        .principal(authenticationForTenant(9L, "TENANT_ADMIN")))
                .andExpect(status().isPayloadTooLarge());
    }

    @Test
    void deleteUsesAuthenticatedTenantAndServerScopedTokenAndFileName() throws Exception {
        mockMvc.perform(delete("/api/v1/co/workflow/forms/77/template-images/temp/"
                        + "bde1fdec-5d22-487a-a254-2b9547cd32b3")
                        .param("fileName", "pasted.png")
                        .principal(authenticationForTenant(9L, "TENANT_ADMIN")))
                .andExpect(status().isOk());

        verify(imageService).deleteTemporaryImage(
                9L, 77L, "bde1fdec-5d22-487a-a254-2b9547cd32b3", "pasted.png");
    }

    @Test
    void deleteRejectsNonAdminBeforeCallingService() throws Exception {
        mockMvc.perform(delete("/api/v1/co/workflow/forms/77/template-images/temp/"
                        + "bde1fdec-5d22-487a-a254-2b9547cd32b3")
                        .param("fileName", "pasted.png")
                        .principal(authenticationForTenant(9L, "TENANT_USER")))
                .andExpect(status().isForbidden());

        verifyNoInteractions(imageService);
    }

    @Test
    void imageStreamRequiresAuthenticationButNotTenantAdmin() throws Exception {
        mockMvc.perform(get("/api/v1/co/workflow/forms/77/template-images/901")
                        .principal(authenticationForTenant(9L, "TENANT_USER")))
                .andExpect(status().isOk());

        verify(imageService).streamTemplateImage(eq(9L), eq(77L), eq(901L),
                org.mockito.ArgumentMatchers.any(HttpServletResponse.class));
    }

    @Test
    void imageStreamRejectsMissingAuthentication() throws Exception {
        mockMvc.perform(get("/api/v1/co/workflow/forms/77/template-images/901"))
                .andExpect(status().isUnauthorized());

        verifyNoInteractions(imageService);
    }

    private UsernamePasswordAuthenticationToken authenticationForTenant(Long tenantId, String roleCode) {
        LoginVO user = new LoginVO();
        user.setTenantId(tenantId);
        user.setRoleCode(roleCode);
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
            if (webRequest.getUserPrincipal() == null) {
                return null;
            }
            return ((UsernamePasswordAuthenticationToken) webRequest.getUserPrincipal()).getPrincipal();
        }
    }
}
package egovframework.let.groupware.approval.shared.controller;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.util.Collections;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.method.annotation.AuthenticationPrincipalArgumentResolver;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.groupware.approval.shared.service.DocumentLinkPreviewService;
import egovframework.let.groupware.approval.shared.service.DocumentLinkPreviewVO;

class DocumentLinkPreviewApiControllerTest {
    private final DocumentLinkPreviewService previews = mock(DocumentLinkPreviewService.class);
    private final MockMvc mvc = MockMvcBuilders.standaloneSetup(
            new DocumentLinkPreviewApiController(previews, new ResultVoHelper()))
            .setCustomArgumentResolvers(new AuthenticationPrincipalArgumentResolver()).build();

    @BeforeEach
    void setUp() {
        LoginVO user = new LoginVO();
        user.setId("test-user");
        user.setTenantId(4L);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(user, null, Collections.emptyList()));
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void returnsOnlyTheMetadataDtoInTheStandardEnvelope() throws Exception {
        DocumentLinkPreviewVO preview = new DocumentLinkPreviewVO();
        preview.setSiteName("Example");
        preview.setTitle("Example title");
        preview.setDescription("Description");
        preview.setImageUrl("https://example.test/preview.png");
        when(previews.preview("https://example.test/article")).thenReturn(preview);

        mvc.perform(post("/api/v1/groupware/approvals/link-preview")
                .contentType("application/json")
                .content("{\"url\":\"https://example.test/article\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result.item.siteName").value("Example"))
                .andExpect(jsonPath("$.result.item.title").value("Example title"))
                .andExpect(jsonPath("$.result.item.description").value("Description"))
                .andExpect(jsonPath("$.result.item.imageUrl").value("https://example.test/preview.png"));
        verify(previews).preview(anyString());
    }

    @Test
    void rejectsUnauthenticatedRequestsBeforeFetchingRemoteMetadata() throws Exception {
        SecurityContextHolder.clearContext();
        mvc.perform(post("/api/v1/groupware/approvals/link-preview")
                .contentType("application/json")
                .content("{\"url\":\"https://example.test/article\"}"))
                .andExpect(status().isUnauthorized());
        verifyNoInteractions(previews);
    }
}

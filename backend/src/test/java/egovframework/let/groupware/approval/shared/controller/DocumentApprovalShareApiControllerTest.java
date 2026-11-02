package egovframework.let.groupware.approval.shared.controller;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.util.Collections;

import com.fasterxml.jackson.databind.ObjectMapper;
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
import egovframework.let.groupware.approval.domain.model.DocumentApprovalListItemVO;
import egovframework.let.groupware.approval.shared.service.DocumentApprovalShareService;
import egovframework.let.groupware.approval.write.service.DocumentApprovalWriteService;

class DocumentApprovalShareApiControllerTest {
    private final DocumentApprovalWriteService documents = mock(DocumentApprovalWriteService.class);
    private final DocumentApprovalShareService sharing =
            new DocumentApprovalShareService(documents, "unit-test-share-key-not-for-production-12345");
    private final MockMvc mvc = MockMvcBuilders.standaloneSetup(
            new DocumentApprovalShareApiController(sharing, new ResultVoHelper()))
            .setCustomArgumentResolvers(new AuthenticationPrincipalArgumentResolver()).build();

    @BeforeEach
    void setUp() throws Exception {
        LoginVO user = new LoginVO();
        user.setId("test-user");
        user.setTenantId(4L);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(user, null, Collections.emptyList()));
        DocumentApprovalListItemVO document = new DocumentApprovalListItemVO();
        document.setElectronicApprovalId(42L);
        document.setTitle("Readable document");
        when(documents.listDocuments(any(), eq("ALL"), isNull(), eq(42L)))
                .thenReturn(Collections.singletonList(document));
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void issuesAndResolvesAnEncryptedLinkUsingTheExistingEnvelope() throws Exception {
        String body = mvc.perform(post("/api/v1/groupware/approvals/documents/42/share-link"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        String token = new ObjectMapper().readTree(body).path("result").path("item").path("token").asText();
        mvc.perform(get("/api/v1/groupware/approvals/shared-document").param("token", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result.item.electronicApprovalId").value(42));
    }

    @Test
    void rejectsUnauthenticatedAndMalformedRequests() throws Exception {
        mvc.perform(get("/api/v1/groupware/approvals/shared-document").param("token", "42"))
                .andExpect(status().isNotFound());
        SecurityContextHolder.clearContext();
        mvc.perform(post("/api/v1/groupware/approvals/documents/42/share-link"))
                .andExpect(status().isUnauthorized());
        verifyNoInteractions(documents);
    }
}

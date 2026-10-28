package egovframework.let.groupware.approval.status.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.lang.reflect.Method;
import java.util.Collections;

import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.service.ResultVO;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalListPageVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalListQueryVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalStatusListItemVO;
import egovframework.let.groupware.approval.status.service.DocumentApprovalStatusService;

class DocumentApprovalStatusApiControllerTest {

    private final DocumentApprovalStatusService statusService = mock(DocumentApprovalStatusService.class);
    private final DocumentApprovalStatusApiController controller =
            new DocumentApprovalStatusApiController(new ResultVoHelper(), statusService);

    @Test
    void bindsExistingSearchFiltersAndReturnsTheExistingResultEnvelope() throws Exception {
        DocumentApprovalStatusListItemVO row = new DocumentApprovalStatusListItemVO();
        row.setElectronicApprovalId(77L);
        DocumentApprovalListPageVO page = new DocumentApprovalListPageVO();
        page.setResultList(Collections.singletonList(row));
        page.setTotalRowCount(42L);
        when(statusService.searchDocuments(any(LoginVO.class), eq("ALL"), any(DocumentApprovalListQueryVO.class)))
                .thenReturn(page);

        Method searchMethod = DocumentApprovalStatusApiController.class.getMethod(
                "searchDocuments", String.class, DocumentApprovalListQueryVO.class, LoginVO.class);
        assertThat(searchMethod.getAnnotation(GetMapping.class).value()).containsExactly("/documents/search");

        MockMvc mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
        mockMvc.perform(get("/api/v1/groupware/approvals/documents/search")
                .param("keyword", "annual")
                .param("documentType", "DRAFTING")
                .param("documentStatus", "COMPLETED")
                .param("submittedAtFrom", "2026-09-16")
                .param("submittedAtTo", "2026-10-16")
                .param("drafterName", "Morgan")
                .param("drafterDepartmentName", "Finance")
                .param("participantName", "Sam")
                .param("updatedAtFrom", "2026-10-01")
                .param("updatedAtTo", "2026-10-16")
                .param("offset", "0")
                .param("limit", "25")
                .param("sortField", "submittedAt")
                .param("sortDirection", "ASC"))
                .andExpect(status().isOk());

        verify(statusService).searchDocuments(any(LoginVO.class), eq("ALL"), argThat(query ->
                "annual".equals(query.getKeyword())
                        && "DRAFTING".equals(query.getDocumentType())
                        && "COMPLETED".equals(query.getDocumentStatus())
                        && "2026-09-16".equals(query.getSubmittedAtFrom())
                        && "2026-10-16".equals(query.getSubmittedAtTo())
                        && "Morgan".equals(query.getDrafterName())
                        && "Finance".equals(query.getDrafterDepartmentName())
                        && "Sam".equals(query.getParticipantName())
                        && "2026-10-01".equals(query.getUpdatedAtFrom())
                        && "2026-10-16".equals(query.getUpdatedAtTo())
                        && Integer.valueOf(0).equals(query.getOffset())
                        && Integer.valueOf(25).equals(query.getLimit())
                        && "submittedAt".equals(query.getSortField())
                        && "ASC".equals(query.getSortDirection())));

        ResultVO response = controller.searchDocuments("ALL", new DocumentApprovalListQueryVO(), new LoginVO());
        assertThat(response.getResult())
                .containsEntry("resultList", page.getResultList())
                .containsEntry("totalRowCount", 42L);
    }
}

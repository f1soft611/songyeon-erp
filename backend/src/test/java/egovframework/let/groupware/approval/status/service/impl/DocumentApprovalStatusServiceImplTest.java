package egovframework.let.groupware.approval.status.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.util.Collections;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import egovframework.com.cmm.LoginVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalListPageVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalListQueryVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalStatusListItemVO;
import egovframework.let.groupware.approval.domain.repository.DocumentApprovalDAO;
import egovframework.let.groupware.approval.common.service.impl.DocumentApprovalAccessServiceImpl;

class DocumentApprovalStatusServiceImplTest {

    private final DocumentApprovalDAO approvalDAO = mock(DocumentApprovalDAO.class);
    private final DocumentApprovalAccessServiceImpl accessService =
            new DocumentApprovalAccessServiceImpl(approvalDAO);
    private final DocumentApprovalStatusServiceImpl service =
            new DocumentApprovalStatusServiceImpl(approvalDAO, accessService);
    private final LoginVO author = author();

    @Test
    void searchForwardsFiltersAndKeepsAuthenticatedActorScope() throws Exception {
        DocumentApprovalListQueryVO query = new DocumentApprovalListQueryVO();
        query.setKeyword("annual");
        query.setElectronicApprovalId(77L);
        query.setDocumentNo("EA-20261010-0001");
        query.setEabusNo("001");
        query.setTitle("budget");
        query.setDocumentType("DRAFTING");
        query.setDocumentStatus("COMPLETED");
        query.setSubmittedAtFrom("2026-09-16");
        query.setSubmittedAtTo("2026-10-16");
        query.setDrafterName("Morgan");
        query.setDrafterDepartmentName("Finance");
        query.setParticipantName("Sam");
        query.setMyParticipantType("DRAFTER");
        query.setMyActionStatus("PENDING");
        query.setCurrentApproverName("Alex");
        query.setOffset(25);
        query.setLimit(100);
        query.setSortField("approvalProgress");
        query.setSortDirection("ASC");

        DocumentApprovalStatusListItemVO item = new DocumentApprovalStatusListItemVO();
        item.setElectronicApprovalId(77L);
        when(approvalDAO.selectRelatedDocumentPage(anyMap())).thenReturn(Collections.singletonList(item));
        when(approvalDAO.countRelatedDocuments(anyMap())).thenReturn(321L);

        DocumentApprovalListPageVO page = service.searchDocuments(author, "ALL", query);

        assertThat(page.getResultList()).containsExactly(item);
        assertThat(page.getTotalRowCount()).isEqualTo(321L);
        verify(approvalDAO).selectRelatedDocumentPage(argThat(params ->
                "annual".equals(params.get("keyword"))
                        && Long.valueOf(77L).equals(params.get("electronicApprovalIdFilter"))
                        && "EA-20261010-0001".equals(params.get("documentNoFilter"))
                        && "001".equals(params.get("eabusNoFilter"))
                        && "budget".equals(params.get("titleFilter"))
                        && "DRAFTING".equals(params.get("documentType"))
                        && "COMPLETED".equals(params.get("documentStatus"))
                        && "2026-09-16".equals(params.get("submittedAtFrom"))
                        && "2026-10-16".equals(params.get("submittedAtTo"))
                        && "Morgan".equals(params.get("drafterNameFilter"))
                        && "작성자".equals(params.get("drafterName"))
                        && "Finance".equals(params.get("drafterDepartmentName"))
                        && "Sam".equals(params.get("participantName"))
                        && "DRAFTER".equals(params.get("myParticipantType"))
                        && "PENDING".equals(params.get("myActionStatus"))
                        && "Alex".equals(params.get("currentApproverName"))
                        && Integer.valueOf(25).equals(params.get("offset"))
                        && Integer.valueOf(100).equals(params.get("limit"))
                        && "approvalProgress".equals(params.get("sortField"))
                        && "ASC".equals(params.get("sortDirection"))
                        && Long.valueOf(4L).equals(params.get("tenantId"))
                        && "login-author".equals(params.get("drafterId"))
                        && "101".equals(params.get("participantUserId"))));
        verify(approvalDAO).countRelatedDocuments(argThat(params ->
                Long.valueOf(4L).equals(params.get("tenantId"))
                        && "login-author".equals(params.get("drafterId"))
                        && "101".equals(params.get("participantUserId"))
                        && "COMPLETED".equals(params.get("documentStatus"))));
    }

    @Test
    void acceptsDocumentNumberAsAnExactSearchAndSortField() throws Exception {
        DocumentApprovalListQueryVO query = new DocumentApprovalListQueryVO();
        query.setDocumentNo(" EA-20261010-0001 ");
        query.setSortField("documentNo");
        when(approvalDAO.selectRelatedDocumentPage(anyMap())).thenReturn(Collections.emptyList());
        when(approvalDAO.countRelatedDocuments(anyMap())).thenReturn(0L);

        service.searchDocuments(author, "ALL", query);

        verify(approvalDAO).selectRelatedDocumentPage(argThat(params ->
                "EA-20261010-0001".equals(params.get("documentNoFilter"))
                        && "documentNo".equals(params.get("sortField"))));
        verify(approvalDAO).countRelatedDocuments(argThat(params ->
                "EA-20261010-0001".equals(params.get("documentNoFilter"))));
    }

    @Test
    void searchWithoutPagingLoadsAllMatchingDocuments() throws Exception {
        DocumentApprovalListQueryVO query = new DocumentApprovalListQueryVO();
        query.setSubmittedAtFrom("2026-09-20");
        query.setSubmittedAtTo("2026-10-20");
        query.setDocumentStatus("COMPLETED");

        DocumentApprovalStatusListItemVO item = new DocumentApprovalStatusListItemVO();
        item.setElectronicApprovalId(77L);
        when(approvalDAO.selectRelatedDocumentPage(anyMap()))
                .thenReturn(Collections.singletonList(item));
        when(approvalDAO.countRelatedDocuments(anyMap())).thenReturn(1L);

        DocumentApprovalListPageVO page = service.searchDocuments(author, "ALL", query);

        assertThat(page.getResultList()).containsExactly(item);
        assertThat(page.getTotalRowCount()).isEqualTo(1L);
        verify(approvalDAO).selectRelatedDocumentPage(argThat(params ->
                "2026-09-20".equals(params.get("submittedAtFrom"))
                        && "2026-10-20".equals(params.get("submittedAtTo"))
                        && "COMPLETED".equals(params.get("documentStatus"))
                        && !params.containsKey("limit")
                        && !params.containsKey("offset")));
    }

    @Test
    void rejectsInvalidPagingSortingAndDateRangesBeforeQuerying() throws Exception {
        DocumentApprovalListQueryVO negativeOffset = new DocumentApprovalListQueryVO();
        negativeOffset.setOffset(-1);
        assertBadRequest(negativeOffset);

        DocumentApprovalListQueryVO excessiveLimit = new DocumentApprovalListQueryVO();
        excessiveLimit.setLimit(201);
        assertBadRequest(excessiveLimit);

        DocumentApprovalListQueryVO unsafeSort = new DocumentApprovalListQueryVO();
        unsafeSort.setSortField("submittedAt; DROP TABLE tb_user");
        assertBadRequest(unsafeSort);

        DocumentApprovalListQueryVO reversedDateRange = new DocumentApprovalListQueryVO();
        reversedDateRange.setSubmittedAtFrom("2026-10-17");
        reversedDateRange.setSubmittedAtTo("2026-10-16");
        assertBadRequest(reversedDateRange);

        DocumentApprovalListQueryVO invalidDocumentId = new DocumentApprovalListQueryVO();
        invalidDocumentId.setElectronicApprovalId(0L);
        assertBadRequest(invalidDocumentId);

        DocumentApprovalListQueryVO invalidParticipantType = new DocumentApprovalListQueryVO();
        invalidParticipantType.setMyParticipantType("UNSAFE");
        assertBadRequest(invalidParticipantType);

        DocumentApprovalListQueryVO invalidActionStatus = new DocumentApprovalListQueryVO();
        invalidActionStatus.setMyActionStatus("UNSAFE");
        assertBadRequest(invalidActionStatus);

        verifyNoInteractions(approvalDAO);
    }

    private void assertBadRequest(DocumentApprovalListQueryVO query) {
        assertThatThrownBy(() -> service.searchDocuments(author, "ALL", query))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        exception -> assertThat(exception.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST));
    }

    private LoginVO author() {
        LoginVO user = new LoginVO();
        user.setTenantId(4L);
        user.setId("login-author");
        user.setUniqId("101");
        user.setName("작성자");
        user.setDepartmentName("기획팀");
        return user;
    }
}

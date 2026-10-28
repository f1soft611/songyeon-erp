package egovframework.let.groupware.approval.shared.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import java.lang.reflect.Method;
import java.lang.reflect.InvocationTargetException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import com.fasterxml.jackson.databind.ObjectMapper;
import egovframework.com.cmm.LoginVO;
import egovframework.com.common.domain.model.CommonFileVO;
import egovframework.com.common.domain.model.CommonCommentPageVO;
import egovframework.com.common.domain.model.CommonCommentVO;
import egovframework.com.common.domain.model.EmbeddedImageUploadVO;
import egovframework.com.common.domain.repository.CommonCommentDAO;
import egovframework.com.common.service.EmbeddedImageStorageService;
import egovframework.com.common.service.RichTextDocumentSanitizer;
import egovframework.com.common.service.CommonFileService;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalDraftSaveRequestVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalDraftVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalActionRequestVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalDetailVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalFeedItemVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalLineBatchVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalLineVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalListItemVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalListPageVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalListQueryVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalPinStateVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalStatusListItemVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalSummaryVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalWorkflowDocumentVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalEmbeddedImageVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalParticipantVO;
import egovframework.let.groupware.approval.domain.repository.DocumentApprovalDAO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalFileItemVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalFilePageVO;
import egovframework.let.groupware.approval.common.service.DocumentApprovalAccessService;
import egovframework.let.groupware.approval.common.service.DocumentApprovalCommentSupportService;
import egovframework.let.groupware.approval.common.service.DocumentApprovalDraftSupportService;
import egovframework.let.groupware.approval.common.service.impl.DocumentApprovalAccessServiceImpl;
import egovframework.let.groupware.approval.common.service.impl.DocumentApprovalCommentSupportServiceImpl;
import egovframework.let.groupware.approval.common.service.impl.DocumentApprovalDraftSupportServiceImpl;
import egovframework.let.groupware.approval.write.service.impl.DocumentApprovalWriteServiceImpl;
import egovframework.let.groupware.approval.shared.service.impl.DocumentApprovalInteractionServiceImpl;

class DocumentApprovalInteractionServiceImplTest {

    private final CommonCommentDAO commentDAO = mock(CommonCommentDAO.class);
    private final CommonFileService fileService = mock(CommonFileService.class);
    private final DocumentApprovalDAO approvalDAO = mock(DocumentApprovalDAO.class);
    private final EmbeddedImageStorageService imageStorageService = mock(EmbeddedImageStorageService.class);
    private final LoginVO author = author();
    private final RichTextDocumentSanitizer documentSanitizer = new RichTextDocumentSanitizer();

    @Test
    void filePageReturnsTwentyItemsAndUsesLastVisibleFileAsCursor() throws Exception {
        List<DocumentApprovalFileItemVO> files = new ArrayList<>();
        for (long id = 45; id >= 25; id--) {
            DocumentApprovalFileItemVO file = new DocumentApprovalFileItemVO();
            file.setFileId(id);
            files.add(file);
        }
        when(approvalDAO.selectRelatedFilePage(anyMap())).thenReturn(files);
        DocumentApprovalFilePageVO page = sharedService().listFiles(author, "ALL", null, null, null);
        assertThat(page.getResultList()).hasSize(20);
        assertThat(page.isHasNext()).isTrue();
        assertThat(page.getNextBeforeFileId()).isEqualTo(26L);
        verify(approvalDAO).selectRelatedFilePage(argThat(params ->
                !params.containsKey("documentStatus")
                && author.getTenantId().equals(params.get("tenantId"))
                && author.getId().equals(params.get("drafterId"))
                && author.getUniqId().equals(params.get("participantUserId"))));
    }

    @Test
    void filePageStopsAtLastPageAndRejectsInvalidOrInaccessibleCursor() throws Exception {
        when(approvalDAO.selectRelatedFilePage(anyMap())).thenReturn(Collections.emptyList());
        when(approvalDAO.selectRelatedFileCursor(anyMap())).thenReturn(null);
        DocumentApprovalFilePageVO page = sharedService().listFiles(author, "ALL", null, null, null);
        assertThat(page.isHasNext()).isFalse();
        assertThat(page.getNextBeforeFileId()).isNull();
        assertThatThrownBy(() -> sharedService().listFiles(author, "INVALID", null, null, null))
                .isInstanceOf(ResponseStatusException.class).hasMessageContaining("400");
        assertThatThrownBy(() -> sharedService().listFiles(author, "ALL", null, null, -1L))
                .isInstanceOf(ResponseStatusException.class).hasMessageContaining("400");
        assertThatThrownBy(() -> sharedService().listFiles(author, "ALL", null, null, 55L))
                .isInstanceOf(ResponseStatusException.class).hasMessageContaining("400");
    }

    @Test
    void filePageWithExactlyTwentyFilesEndsAndPassesTheValidatedCursor() throws Exception {
        List<DocumentApprovalFileItemVO> files = new ArrayList<>();
        for (long id = 25; id >= 6; id--) {
            DocumentApprovalFileItemVO file = new DocumentApprovalFileItemVO();
            file.setFileId(id);
            files.add(file);
        }
        when(approvalDAO.selectRelatedFileCursor(anyMap())).thenReturn(26L);
        when(approvalDAO.selectRelatedFilePage(anyMap())).thenReturn(files);
        DocumentApprovalFilePageVO page = sharedService().listFiles(author, "DRAFT", "DRAFTING", 77L, 26L);
        assertThat(page.getResultList()).hasSize(20);
        assertThat(page.isHasNext()).isFalse();
        assertThat(page.getNextBeforeFileId()).isNull();
        verify(approvalDAO).selectRelatedFilePage(argThat(params ->
                !params.containsKey("documentStatus")
                && "DRAFT".equals(params.get("scope"))
                && "DRAFTING".equals(params.get("documentType"))
                && Long.valueOf(77).equals(params.get("electronicApprovalId"))
                && Long.valueOf(26).equals(params.get("beforeFileId"))));
        verify(approvalDAO).selectRelatedFileCursor(argThat(params -> !params.containsKey("documentStatus")));
    }

    @Test
    void businessContactSendCompletesImmediatelyWithOnlyReferenceLines() throws Exception {
        DocumentApprovalDraftSaveRequestVO request = request();
        request.setDocumentType("BUSINESS_CONTACT");
        request.setApprovalLines(Collections.singletonList(line(1, 1, "REFERENCE", "202")));
        when(approvalDAO.selectDocumentApprovalForUpdate(anyMap())).thenReturn(workflowDocument("DRAFT"));
        when(approvalDAO.selectActiveParticipants(anyMap()))
            .thenReturn(Collections.singletonList(participant("202", "참조자", "기획팀")));
        when(approvalDAO.updateDocumentApprovalMain(anyMap())).thenReturn(1);
        when(approvalDAO.insertDocumentApprovalLine(anyMap())).thenReturn(1);
        when(approvalDAO.updateDocumentApprovalStatus(anyMap())).thenReturn(1);
        when(commentDAO.insertSystemComment(anyMap())).thenReturn(91L);
        when(approvalDAO.selectDraftDocumentStatus(anyMap())).thenReturn(draftResponse("COMPLETED"));

        assertThat(sharedService().submit(author, 77L, request).getDocumentStatus()).isEqualTo("COMPLETED");
        verify(approvalDAO).insertDocumentApprovalLine(argThat(params ->
            "REFERENCE".equals(params.get("participantType"))
                && params.get("actionStatus") == null && params.get("pendingAt") == null
                && params.get("actionAt") == null && params.get("actionComment") == null));
        verify(approvalDAO).updateDocumentApprovalStatus(argThat(params ->
            "COMPLETED".equals(params.get("nextDocumentStatus"))));
        verify(commentDAO).insertSystemComment(argThat(params ->
            "COMPLETED".equals(params.get("eventType"))
                && "업무연락이 발송되었습니다.".equals(params.get("content"))));
    }

    @Test
    void businessContactSendRequiresAReference() throws Exception {
        DocumentApprovalDraftSaveRequestVO request = request();
        request.setDocumentType("BUSINESS_CONTACT");
        request.setApprovalLines(Collections.emptyList());
        when(approvalDAO.selectDocumentApprovalForUpdate(anyMap())).thenReturn(workflowDocument("DRAFT"));
        assertThatThrownBy(() -> sharedService().submit(author, 77L, request))
            .isInstanceOf(ResponseStatusException.class).hasMessageContaining("참조자");
        verify(approvalDAO, never()).updateDocumentApprovalMain(anyMap());
    }

    @Test
    void businessContactRejectsApprovalLinesAndSelfReferences() throws Exception {
        DocumentApprovalDraftSaveRequestVO request = request();
        request.setDocumentType("BUSINESS_CONTACT");
        assertThatThrownBy(() -> writeService().saveDraft(author, request))
            .isInstanceOf(ResponseStatusException.class).hasMessageContaining("참조");
        request.setApprovalLines(Collections.singletonList(line(1, 1, "REFERENCE", "101")));
        assertThatThrownBy(() -> writeService().saveDraft(author, request))
            .isInstanceOf(ResponseStatusException.class).hasMessageContaining("작성자");
        verify(approvalDAO, never()).insertDocumentApprovalMain(anyMap());
    }

    @Test
    void businessContactRejectsDuplicateUnorderedAndUnavailableReferences() throws Exception {
        DocumentApprovalDraftSaveRequestVO request = request();
        request.setDocumentType("BUSINESS_CONTACT");
        request.setApprovalLines(Arrays.asList(
            line(1, 1, "REFERENCE", "202"), line(1, 2, "REFERENCE", "202")));
        assertThatThrownBy(() -> writeService().saveDraft(author, request))
            .isInstanceOf(ResponseStatusException.class).hasMessageContaining("중복");
        request.setApprovalLines(Collections.singletonList(line(2, 1, "REFERENCE", "202")));
        assertThatThrownBy(() -> writeService().saveDraft(author, request))
            .isInstanceOf(ResponseStatusException.class).hasMessageContaining("참조");
        request.setApprovalLines(Collections.singletonList(line(1, 1, "REFERENCE", "202")));
        when(approvalDAO.selectActiveParticipants(anyMap())).thenReturn(Collections.emptyList());
        assertThatThrownBy(() -> writeService().saveDraft(author, request))
            .isInstanceOf(ResponseStatusException.class).hasMessageContaining("사용할 수 없는");
        verify(approvalDAO, never()).insertDocumentApprovalMain(anyMap());
    }

    @Test
    void detailIncrementsViewCountForFirstAuthorizedView() throws Exception {
        when(approvalDAO.selectDocumentApprovalDetail(anyMap())).thenReturn(detail(0), detail(1));
        when(approvalDAO.selectLoginIdByLoginCode(anyMap())).thenReturn(201L);
        when(approvalDAO.insertElectronicApprovalViewHistory(anyMap())).thenReturn(401L);
        when(approvalDAO.incrementElectronicApprovalViewCount(anyMap())).thenReturn(1);
        when(fileService.listFiles(4L, "APPROVAL", 77L)).thenReturn(Collections.<CommonFileVO>emptyList());
        when(approvalDAO.selectApprovalLines(anyMap())).thenReturn(Collections.<DocumentApprovalLineVO>emptyList());
        when(commentDAO.selectApprovalSystemEvents(anyMap())).thenReturn(Collections.<CommonCommentVO>emptyList());

        DocumentApprovalDetailVO result = sharedService().getDetail(author, 77L);

        assertThat(result.getViewCount()).isEqualTo(1);
        verify(approvalDAO, org.mockito.Mockito.times(2)).selectDocumentApprovalDetail(anyMap());
        verify(approvalDAO).selectLoginIdByLoginCode(argThat(params ->
            Long.valueOf(4L).equals(params.get("tenantId"))
                && "login-author".equals(params.get("loginCode"))));
        verify(approvalDAO).insertElectronicApprovalViewHistory(argThat(params ->
            Long.valueOf(4L).equals(params.get("tenantId"))
                && Long.valueOf(77L).equals(params.get("electronicApprovalId"))
                && Long.valueOf(201L).equals(params.get("loginId"))));
        verify(approvalDAO).incrementElectronicApprovalViewCount(argThat(params ->
            Long.valueOf(4L).equals(params.get("tenantId"))
                && Long.valueOf(77L).equals(params.get("electronicApprovalId"))));
    }

    @Test
    void detailDoesNotIncrementViewCountForRepeatedView() throws Exception {
        when(approvalDAO.selectDocumentApprovalDetail(anyMap())).thenReturn(detail(2), detail(2));
        when(approvalDAO.selectLoginIdByLoginCode(anyMap())).thenReturn(201L);
        when(approvalDAO.insertElectronicApprovalViewHistory(anyMap())).thenReturn(null);
        when(fileService.listFiles(4L, "APPROVAL", 77L)).thenReturn(Collections.<CommonFileVO>emptyList());
        when(approvalDAO.selectApprovalLines(anyMap())).thenReturn(Collections.<DocumentApprovalLineVO>emptyList());
        when(commentDAO.selectApprovalSystemEvents(anyMap())).thenReturn(Collections.<CommonCommentVO>emptyList());

        DocumentApprovalDetailVO result = sharedService().getDetail(author, 77L);

        assertThat(result.getViewCount()).isEqualTo(2);
        verify(approvalDAO, org.mockito.Mockito.times(2)).selectDocumentApprovalDetail(anyMap());
        verify(approvalDAO, never()).incrementElectronicApprovalViewCount(anyMap());
    }

    @Test
    void detailRecordsAnotherLoginAsSeparateViewer() throws Exception {
        LoginVO anotherUser = participantUser("login-other", "202", "다른 사용자");
        when(approvalDAO.selectDocumentApprovalDetail(anyMap())).thenReturn(detail(3), detail(4));
        when(approvalDAO.selectLoginIdByLoginCode(anyMap())).thenReturn(202L);
        when(approvalDAO.insertElectronicApprovalViewHistory(anyMap())).thenReturn(402L);
        when(approvalDAO.incrementElectronicApprovalViewCount(anyMap())).thenReturn(1);
        when(fileService.listFiles(4L, "APPROVAL", 77L)).thenReturn(Collections.<CommonFileVO>emptyList());
        when(approvalDAO.selectApprovalLines(anyMap())).thenReturn(Collections.<DocumentApprovalLineVO>emptyList());
        when(commentDAO.selectApprovalSystemEvents(anyMap())).thenReturn(Collections.<CommonCommentVO>emptyList());

        DocumentApprovalDetailVO result = sharedService().getDetail(anotherUser, 77L);

        assertThat(result.getViewCount()).isEqualTo(4);
        verify(approvalDAO).selectLoginIdByLoginCode(argThat(params ->
            Long.valueOf(4L).equals(params.get("tenantId"))
                && "login-other".equals(params.get("loginCode"))));
        verify(approvalDAO).insertElectronicApprovalViewHistory(argThat(params ->
            Long.valueOf(202L).equals(params.get("loginId"))));
    }

    @Test
    void detailDoesNotRecordViewWhenDocumentIsUnavailable() throws Exception {
        when(approvalDAO.selectDocumentApprovalDetail(anyMap())).thenReturn(null);

        assertThatThrownBy(() -> sharedService().getDetail(author, 77L))
            .isInstanceOfSatisfying(ResponseStatusException.class,
                exception -> assertThat(exception.getStatus()).isEqualTo(HttpStatus.NOT_FOUND));

        verify(approvalDAO, never()).selectLoginIdByLoginCode(anyMap());
        verify(approvalDAO, never()).insertElectronicApprovalViewHistory(anyMap());
        verify(approvalDAO, never()).incrementElectronicApprovalViewCount(anyMap());
        verifyNoInteractions(commentDAO, fileService);
    }

    @Test
    void detailFailsWhenAuthenticatedLoginCannotBeResolved() throws Exception {
        when(approvalDAO.selectDocumentApprovalDetail(anyMap())).thenReturn(detail(0));
        when(approvalDAO.selectLoginIdByLoginCode(anyMap())).thenReturn(null);

        assertThatThrownBy(() -> sharedService().getDetail(author, 77L))
            .isInstanceOf(IllegalStateException.class)
            .hasMessage("인증된 로그인 계정을 찾을 수 없습니다.");

        verify(approvalDAO, never()).insertElectronicApprovalViewHistory(anyMap());
        verify(approvalDAO, never()).incrementElectronicApprovalViewCount(anyMap());
        verifyNoInteractions(commentDAO, fileService);
    }

    @Test
    void detailFailsWhenFirstViewCannotUpdateDocumentCounter() throws Exception {
        when(approvalDAO.selectDocumentApprovalDetail(anyMap())).thenReturn(detail(0));
        when(approvalDAO.selectLoginIdByLoginCode(anyMap())).thenReturn(201L);
        when(approvalDAO.insertElectronicApprovalViewHistory(anyMap())).thenReturn(401L);
        when(approvalDAO.incrementElectronicApprovalViewCount(anyMap())).thenReturn(0);

        assertThatThrownBy(() -> sharedService().getDetail(author, 77L))
            .isInstanceOf(IllegalStateException.class)
            .hasMessage("전자결재 문서 조회수를 갱신할 수 없습니다.");

        verifyNoInteractions(commentDAO, fileService);
        verify(approvalDAO, never()).selectApprovalLines(anyMap());
    }

    @Test
    void deleteDraftSoftDeletesAndWritesDeletedEvent() throws Exception {
        when(approvalDAO.selectDocumentApprovalForUpdate(anyMap()))
            .thenReturn(workflowDocument("DRAFT"));
        when(approvalDAO.softDeleteDocumentApproval(anyMap())).thenReturn(1);
        when(commentDAO.insertSystemComment(anyMap())).thenReturn(91L);

        sharedService().deleteDocumentApproval(author, 77L);

        ArgumentCaptor<Map<String, Object>> deleteParams = mapCaptor();
        verify(approvalDAO).softDeleteDocumentApproval(deleteParams.capture());
        assertThat(deleteParams.getValue())
            .containsEntry("tenantId", 4L)
            .containsEntry("electronicApprovalId", 77L)
            .containsEntry("drafterId", "login-author")
            .containsEntry("actorId", "login-author");
        verify(commentDAO).insertSystemComment(argThat(params ->
            "DELETED".equals(params.get("eventType"))
                && Long.valueOf(77L).equals(params.get("ownerId"))));
    }

    @Test
    void deletePendingDocumentRequiresEligibleApprovalLines() throws Exception {
        when(approvalDAO.selectDocumentApprovalForUpdate(anyMap()))
            .thenReturn(workflowDocument("PENDING"));
        when(approvalDAO.selectCanDeletePendingDocumentApproval(anyMap())).thenReturn(false);

        assertThatThrownBy(() -> sharedService().deleteDocumentApproval(author, 77L))
            .isInstanceOfSatisfying(ResponseStatusException.class,
                exception -> assertThat(exception.getStatus()).isEqualTo(HttpStatus.CONFLICT));
        verify(approvalDAO, never()).softDeleteDocumentApproval(anyMap());
        verifyNoInteractions(commentDAO);
    }

    @Test
    void deletePendingDocumentUsesAuthenticatedParticipantIdWhenEligible() throws Exception {
        when(approvalDAO.selectDocumentApprovalForUpdate(anyMap()))
            .thenReturn(workflowDocument("PENDING"));
        when(approvalDAO.selectCanDeletePendingDocumentApproval(anyMap())).thenReturn(true);
        when(approvalDAO.softDeleteDocumentApproval(anyMap())).thenReturn(1);
        when(commentDAO.insertSystemComment(anyMap())).thenReturn(91L);

        sharedService().deleteDocumentApproval(author, 77L);

        verify(approvalDAO).selectCanDeletePendingDocumentApproval(argThat(params ->
            "101".equals(params.get("participantUserId"))));
        verify(commentDAO).insertSystemComment(argThat(params ->
            "DELETED".equals(params.get("eventType"))));
    }

    @Test
    void deleteDocumentHidesOwnershipMismatch() throws Exception {
        DocumentApprovalWorkflowDocumentVO document = workflowDocument("DRAFT");
        document.setDrafterId("another-author");
        when(approvalDAO.selectDocumentApprovalForUpdate(anyMap())).thenReturn(document);

        assertThatThrownBy(() -> sharedService().deleteDocumentApproval(author, 77L))
            .isInstanceOfSatisfying(ResponseStatusException.class,
                exception -> assertThat(exception.getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
        verify(approvalDAO, never()).softDeleteDocumentApproval(anyMap());
        verifyNoInteractions(commentDAO);
    }

    @Test
    void drafterCanCancelPendingSubmissionAndRestoreDraft() throws Exception {
        when(approvalDAO.selectDocumentApprovalForUpdate(anyMap()))
            .thenReturn(workflowDocument("PENDING"));
        when(approvalDAO.resetSubmittedDocumentToDraft(anyMap())).thenReturn(1);
        when(approvalDAO.resetSubmittedApprovalLines(anyMap())).thenReturn(3);
        when(commentDAO.insertSystemComment(anyMap())).thenReturn(93L);

        DocumentApprovalDraftVO result = sharedService().cancelSubmission(author, 77L);

        assertThat(result.getDocumentStatus()).isEqualTo("DRAFT");
        verify(approvalDAO).resetSubmittedDocumentToDraft(argThat(params ->
            Long.valueOf(4L).equals(params.get("tenantId"))
                && Long.valueOf(77L).equals(params.get("electronicApprovalId"))
                && "login-author".equals(params.get("drafterId"))));
        verify(approvalDAO).resetSubmittedApprovalLines(argThat(params ->
            Long.valueOf(4L).equals(params.get("tenantId"))
                && Long.valueOf(77L).equals(params.get("electronicApprovalId"))));
        verify(commentDAO).insertSystemComment(argThat(params ->
            "SUBMISSION_CANCELED".equals(params.get("eventType"))
                && Long.valueOf(77L).equals(params.get("ownerId"))));
    }

    @Test
    void drafterCannotCancelSubmissionAfterAnApprovalHasStarted() throws Exception {
        when(approvalDAO.selectDocumentApprovalForUpdate(anyMap()))
            .thenReturn(workflowDocument("IN_PROGRESS"));

        assertThatThrownBy(() -> sharedService().cancelSubmission(author, 77L))
            .isInstanceOfSatisfying(ResponseStatusException.class,
                exception -> assertThat(exception.getStatus()).isEqualTo(HttpStatus.CONFLICT));

        verify(approvalDAO, never()).resetSubmittedDocumentToDraft(anyMap());
        verify(approvalDAO, never()).resetSubmittedApprovalLines(anyMap());
        verifyNoInteractions(commentDAO);
    }

    @Test
    void drafterCannotCancelAnotherUsersSubmission() throws Exception {
        DocumentApprovalWorkflowDocumentVO document = workflowDocument("PENDING");
        document.setDrafterId("another-author");
        when(approvalDAO.selectDocumentApprovalForUpdate(anyMap())).thenReturn(document);

        assertThatThrownBy(() -> sharedService().cancelSubmission(author, 77L))
            .isInstanceOfSatisfying(ResponseStatusException.class,
                exception -> assertThat(exception.getStatus()).isEqualTo(HttpStatus.NOT_FOUND));

        verify(approvalDAO, never()).resetSubmittedDocumentToDraft(anyMap());
        verifyNoInteractions(commentDAO);
    }

    @Test
    void approverCanCancelOwnApprovalBeforeLaterStageProcessing() throws Exception {
        LoginVO approver = participantUser("login-202", "202", "결재자");
        when(approvalDAO.selectDocumentApprovalForUpdate(anyMap()))
            .thenReturn(workflowDocument("IN_PROGRESS"));
        when(approvalDAO.selectUserApprovedApprovalLineForUpdate(anyMap()))
            .thenReturn(approvedLine(22L, 2, "AGREEMENT", "202"));
        when(approvalDAO.selectProcessedLaterApprovalStage(anyMap())).thenReturn(false);
        when(approvalDAO.resetApprovalLineToPending(anyMap())).thenReturn(1);
        when(approvalDAO.resetUntouchedLaterApprovalStages(anyMap())).thenReturn(2);
        when(approvalDAO.countProcessedApprovalLines(anyMap())).thenReturn(0L);
        when(approvalDAO.updateDocumentApprovalStatus(anyMap())).thenReturn(1);
        when(commentDAO.insertSystemComment(anyMap())).thenReturn(94L);

        DocumentApprovalDraftVO result = sharedService().cancelApproval(approver, 77L);

        assertThat(result.getDocumentStatus()).isEqualTo("PENDING");
        verify(approvalDAO).selectUserApprovedApprovalLineForUpdate(argThat(params ->
            Long.valueOf(4L).equals(params.get("tenantId"))
                && Long.valueOf(77L).equals(params.get("electronicApprovalId"))
                && "202".equals(params.get("participantUserId"))));
        verify(approvalDAO).resetApprovalLineToPending(argThat(params ->
            Long.valueOf(22L).equals(params.get("electronicApprovalLineId"))
                && "202".equals(params.get("participantUserId"))));
        verify(approvalDAO).resetUntouchedLaterApprovalStages(argThat(params ->
            Integer.valueOf(2).equals(params.get("stageOrder"))));
        verify(approvalDAO).updateDocumentApprovalStatus(argThat(params ->
            "IN_PROGRESS".equals(params.get("expectedDocumentStatus"))
                && "PENDING".equals(params.get("nextDocumentStatus"))));
        verify(commentDAO).insertSystemComment(argThat(params ->
            "APPROVAL_CANCELED".equals(params.get("eventType"))));
    }

    @Test
    void approverCannotCancelTheAutomaticFirstStageDrafterApproval() throws Exception {
        LoginVO approver = participantUser("login-101", "101", "기안자");
        when(approvalDAO.selectDocumentApprovalForUpdate(anyMap()))
            .thenReturn(workflowDocument("PENDING"));
        when(approvalDAO.selectUserApprovedApprovalLineForUpdate(anyMap()))
            .thenReturn(approvedLine(21L, 1, "APPROVAL", "101"));

        assertThatThrownBy(() -> sharedService().cancelApproval(approver, 77L))
            .isInstanceOfSatisfying(ResponseStatusException.class,
                exception -> assertThat(exception.getStatus()).isEqualTo(HttpStatus.CONFLICT));

        verify(approvalDAO, never()).resetApprovalLineToPending(anyMap());
        verifyNoInteractions(commentDAO);
    }

    @Test
    void approverCannotCancelApprovalAfterLaterStageProcessing() throws Exception {
        LoginVO approver = participantUser("login-202", "202", "결재자");
        when(approvalDAO.selectDocumentApprovalForUpdate(anyMap()))
            .thenReturn(workflowDocument("IN_PROGRESS"));
        when(approvalDAO.selectUserApprovedApprovalLineForUpdate(anyMap()))
            .thenReturn(approvedLine(22L, 2, "APPROVAL", "202"));
        when(approvalDAO.selectProcessedLaterApprovalStage(anyMap())).thenReturn(true);

        assertThatThrownBy(() -> sharedService().cancelApproval(approver, 77L))
            .isInstanceOfSatisfying(ResponseStatusException.class,
                exception -> assertThat(exception.getStatus()).isEqualTo(HttpStatus.CONFLICT));

        verify(approvalDAO, never()).resetApprovalLineToPending(anyMap());
        verify(approvalDAO, never()).updateDocumentApprovalStatus(anyMap());
        verifyNoInteractions(commentDAO);
    }

    @Test
    void approverCannotCancelFinalApprovalOrAnotherUsersLine() throws Exception {
        LoginVO approver = participantUser("login-202", "202", "결재자");
        when(approvalDAO.selectDocumentApprovalForUpdate(anyMap()))
            .thenReturn(workflowDocument("COMPLETED"));

        assertThatThrownBy(() -> sharedService().cancelApproval(approver, 77L))
            .isInstanceOfSatisfying(ResponseStatusException.class,
                exception -> assertThat(exception.getStatus()).isEqualTo(HttpStatus.CONFLICT));
        verify(approvalDAO, never()).selectUserApprovedApprovalLineForUpdate(anyMap());

        when(approvalDAO.selectDocumentApprovalForUpdate(anyMap()))
            .thenReturn(workflowDocument("IN_PROGRESS"));
        when(approvalDAO.selectUserApprovedApprovalLineForUpdate(anyMap())).thenReturn(null);

        assertThatThrownBy(() -> sharedService().cancelApproval(approver, 77L))
            .isInstanceOfSatisfying(ResponseStatusException.class,
                exception -> assertThat(exception.getStatus()).isEqualTo(HttpStatus.CONFLICT));
        verify(approvalDAO, never()).resetApprovalLineToPending(anyMap());
        verifyNoInteractions(commentDAO);
    }

    @Test
    void listApprovalCommentsRequiresDocumentParticipation() throws Exception {
        when(approvalDAO.selectIsDocumentParticipant(anyMap())).thenReturn(false);

        assertThatThrownBy(() -> invokeApprovalMethod(
                "listApprovalComments",
                new Class<?>[] {LoginVO.class, Long.class, Integer.class, Long.class},
                author, 77L, 3, null))
            .isInstanceOfSatisfying(ResponseStatusException.class,
                exception -> assertThat(exception.getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
        verifyNoInteractions(commentDAO);
    }

    @Test
    void listApprovalCommentsIncludesSystemMessagesInThePagedResponse() throws Exception {
        when(approvalDAO.selectIsDocumentParticipant(anyMap())).thenReturn(true);
        CommonCommentVO comment = approvalComment(55L, "login-author", "USER");
        CommonCommentVO systemEvent = approvalComment(56L, "login-author", "SYSTEM");
        systemEvent.setEventType("SUBMITTED");
        systemEvent.setContent("문서가 결재신청되었습니다.");
        systemEvent.setCreatedAt(new java.util.Date(1_792_119_600_000L));
        when(commentDAO.selectApprovalCommentStreamPagesByOwnerIds(anyMap()))
            .thenReturn(Arrays.asList(systemEvent, comment));
        Map<String, Object> count = new HashMap<>();
        count.put("ownerId", 77L);
        count.put("totalCount", 2L);
        when(commentDAO.selectApprovalCommentStreamCountsByOwnerIds(anyMap()))
            .thenReturn(Collections.singletonList(count));
        when(commentDAO.selectApprovalUserCommentThreadsByRootIds(anyMap()))
            .thenReturn(Collections.singletonList(comment));
        when(fileService.listFilesByOwnerIds(eq(4L), eq("APPROVAL_COMMENT"), org.mockito.ArgumentMatchers.anyList()))
            .thenReturn(Collections.<Long, List<CommonFileVO>>emptyMap());

        Object page = invokeApprovalMethod(
                "listApprovalComments",
                new Class<?>[] {LoginVO.class, Long.class, Integer.class, Long.class},
                author, 77L, 3, null);
        com.fasterxml.jackson.databind.JsonNode json = new ObjectMapper().valueToTree(page);

        assertThat(json.path("comments").size()).isEqualTo(1);
        assertThat(json.path("systemEvents").path(0).path("commentId").asLong()).isEqualTo(56L);
        assertThat(json.path("resultCnt").asLong()).isEqualTo(2L);
        verify(commentDAO).selectApprovalCommentStreamPagesByOwnerIds(argThat(params ->
            params.get("tenantId").equals(4L)
                && ((List<?>) params.get("ownerIds")).contains(77L)
                && params.get("limit").equals(4)));
        verify(commentDAO).selectApprovalCommentStreamCountsByOwnerIds(anyMap());
    }

    @Test
    void listApprovalCommentsCountsDeletedRootWhenAVisibleReplyRemains() throws Exception {
        when(approvalDAO.selectIsDocumentParticipant(anyMap())).thenReturn(true);
        CommonCommentVO deletedRoot = approvalComment(55L, "login-author", "USER");
        deletedRoot.setDeletedYn("Y");
        CommonCommentVO visibleReply = approvalComment(56L, "other-writer", "USER");
        visibleReply.setParentCommentId(55L);
        when(commentDAO.selectApprovalCommentStreamPagesByOwnerIds(anyMap()))
            .thenReturn(Collections.singletonList(deletedRoot));
        Map<String, Object> count = new HashMap<>();
        count.put("ownerId", 77L);
        count.put("totalCount", 1L);
        when(commentDAO.selectApprovalCommentStreamCountsByOwnerIds(anyMap()))
            .thenReturn(Collections.singletonList(count));
        when(commentDAO.selectApprovalUserCommentThreadsByRootIds(anyMap()))
            .thenReturn(Arrays.asList(deletedRoot, visibleReply));
        when(fileService.listFilesByOwnerIds(eq(4L), eq("APPROVAL_COMMENT"), org.mockito.ArgumentMatchers.anyList()))
            .thenReturn(Collections.<Long, List<CommonFileVO>>emptyMap());

        Object page = invokeApprovalMethod(
                "listApprovalComments",
                new Class<?>[] {LoginVO.class, Long.class, Integer.class, Long.class},
                author, 77L, 3, null);
        com.fasterxml.jackson.databind.JsonNode json = new ObjectMapper().valueToTree(page);

        assertThat(json.path("comments").size()).isEqualTo(2);
        assertThat(json.path("resultCnt").asLong()).isEqualTo(1L);
    }

    @Test
    void listApprovalCommentsAcceptsSystemCursorForAnOlderMixedPage() throws Exception {
        when(approvalDAO.selectIsDocumentParticipant(anyMap())).thenReturn(true);
        CommonCommentVO cursor = approvalComment(103L, "system", "SYSTEM");
        when(commentDAO.selectApprovalCommentStreamCursor(anyMap())).thenReturn(cursor);
        CommonCommentVO olderUserRoot = approvalComment(102L, "other-writer", "USER");
        CommonCommentVO olderSystemEvent = approvalComment(101L, "system", "SYSTEM");
        olderSystemEvent.setEventType("APPROVED");
        when(commentDAO.selectApprovalCommentStreamPagesByOwnerIds(anyMap()))
            .thenReturn(Arrays.asList(olderUserRoot, olderSystemEvent));
        Map<String, Object> count = new HashMap<>();
        count.put("ownerId", 77L);
        count.put("totalCount", 4L);
        when(commentDAO.selectApprovalCommentStreamCountsByOwnerIds(anyMap()))
            .thenReturn(Collections.singletonList(count));
        when(commentDAO.selectApprovalUserCommentThreadsByRootIds(anyMap()))
            .thenReturn(Collections.singletonList(olderUserRoot));
        when(fileService.listFilesByOwnerIds(eq(4L), eq("APPROVAL_COMMENT"), org.mockito.ArgumentMatchers.anyList()))
            .thenReturn(Collections.<Long, List<CommonFileVO>>emptyMap());

        Object page = invokeApprovalMethod(
                "listApprovalComments",
                new Class<?>[] {LoginVO.class, Long.class, Integer.class, Long.class},
                author, 77L, 20, 103L);
        com.fasterxml.jackson.databind.JsonNode json = new ObjectMapper().valueToTree(page);

        assertThat(json.path("comments").get(0).path("commentId").asLong()).isEqualTo(102L);
        assertThat(json.path("systemEvents").get(0).path("commentId").asLong()).isEqualTo(101L);
        assertThat(json.path("resultCnt").asLong()).isEqualTo(4L);
        assertThat(json.path("hasPrevious").asBoolean()).isFalse();
        assertThat(json.path("nextBeforeCommentId").isNull()).isTrue();
        verify(commentDAO).selectApprovalCommentStreamCursor(argThat(params ->
            params.get("tenantId").equals(4L)
                && params.get("ownerId").equals(77L)
                && params.get("commentId").equals(103L)));
        verify(commentDAO).selectApprovalCommentStreamPagesByOwnerIds(argThat(params ->
            params.get("beforeCommentId").equals(103L)
                && params.get("limit").equals(21)));
    }

    @Test
    void listApprovalCommentsRejectsCursorOutsideVisibleApprovalStream() throws Exception {
        when(approvalDAO.selectIsDocumentParticipant(anyMap())).thenReturn(true);

        assertThatThrownBy(() -> invokeApprovalMethod(
                "listApprovalComments",
                new Class<?>[] {LoginVO.class, Long.class, Integer.class, Long.class},
                author, 77L, 20, 999L))
            .isInstanceOfSatisfying(ResponseStatusException.class,
                exception -> assertThat(exception.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST));
    }

    @Test
    void createApprovalCommentUsesAuthenticatedWriterAndApprovalOwner() throws Exception {
        when(approvalDAO.selectIsDocumentParticipant(anyMap())).thenReturn(true);
        when(commentDAO.insertCommonComment(anyMap())).thenReturn(55L);
        when(commentDAO.selectApprovalUserCommentById(anyMap()))
            .thenReturn(approvalComment(55L, "login-author", "USER"));

        CommonCommentVO created = (CommonCommentVO) invokeApprovalMethod(
                "createApprovalComment",
                new Class<?>[] {LoginVO.class, Long.class, String.class, Long.class},
                author, 77L, "문서 댓글", null);

        assertThat(created.getCommentId()).isEqualTo(55L);
        ArgumentCaptor<Map<String, Object>> params = mapCaptor();
        verify(commentDAO).insertCommonComment(params.capture());
        assertThat(params.getValue())
            .containsEntry("tenantId", 4L)
            .containsEntry("ownerType", "APPROVAL")
            .containsEntry("ownerId", 77L)
            .containsEntry("commentType", "USER")
            .containsEntry("writerId", "login-author")
            .containsEntry("writerName", "작성자")
            .containsEntry("content", "문서 댓글");
    }

    @Test
    void uploadApprovalCommentAttachmentUsesCommentOwnerAndAuthenticatedUploader() throws Exception {
        when(approvalDAO.selectIsDocumentParticipant(anyMap())).thenReturn(true);
        when(commentDAO.selectApprovalUserCommentById(anyMap()))
            .thenReturn(approvalComment(55L, "login-author", "USER"));
        MockMultipartFile file = new MockMultipartFile("file", "evidence.txt", "text/plain", new byte[] {1});

        sharedService().uploadApprovalCommentAttachment(author, 77L, 55L, file);

        verify(fileService).uploadFile(4L, "APPROVAL_COMMENT", 55L, file, "login-author");
    }

    @Test
    void uploadApprovalCommentAttachmentRejectsAnotherAuthorsComment() throws Exception {
        when(approvalDAO.selectIsDocumentParticipant(anyMap())).thenReturn(true);
        when(commentDAO.selectApprovalUserCommentById(anyMap()))
            .thenReturn(approvalComment(55L, "someone-else", "USER"));

        assertThatThrownBy(() -> sharedService().uploadApprovalCommentAttachment(
                author, 77L, 55L, new MockMultipartFile("file", "evidence.txt", "text/plain", new byte[] {1})))
            .isInstanceOfSatisfying(ResponseStatusException.class,
                exception -> assertThat(exception.getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
        verifyNoInteractions(fileService);
    }

    @Test
    void downloadApprovalCommentAttachmentRejectsFileOutsideComment() throws Exception {
        when(approvalDAO.selectIsDocumentParticipant(anyMap())).thenReturn(true);
        when(commentDAO.selectApprovalUserCommentById(anyMap()))
            .thenReturn(approvalComment(55L, "login-author", "USER"));
        CommonFileVO file = approvalCommentFile(91L, 56L);
        when(fileService.listFiles(4L, "APPROVAL_COMMENT", 55L)).thenReturn(Collections.singletonList(file));

        assertThatThrownBy(() -> sharedService().downloadApprovalCommentAttachment(
                author, 77L, 55L, 91L, mock(javax.servlet.http.HttpServletResponse.class)))
            .isInstanceOfSatisfying(ResponseStatusException.class,
                exception -> assertThat(exception.getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
        verify(fileService, never()).downloadFile(
            org.mockito.ArgumentMatchers.anyLong(),
            org.mockito.ArgumentMatchers.anyString(),
            org.mockito.ArgumentMatchers.anyLong(),
            org.mockito.ArgumentMatchers.anyLong(),
            org.mockito.ArgumentMatchers.any());
    }

    @Test
    void deleteApprovalCommentAttachmentRequiresCommentAuthorAndOwnedFile() throws Exception {
        when(approvalDAO.selectIsDocumentParticipant(anyMap())).thenReturn(true);
        when(commentDAO.selectApprovalUserCommentById(anyMap()))
            .thenReturn(approvalComment(55L, "someone-else", "USER"));

        assertThatThrownBy(() -> sharedService().deleteApprovalCommentAttachment(author, 77L, 55L, 91L))
            .isInstanceOfSatisfying(ResponseStatusException.class,
                exception -> assertThat(exception.getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
        verify(fileService, never()).deleteFile(
            org.mockito.ArgumentMatchers.anyLong(),
            org.mockito.ArgumentMatchers.anyString(),
            org.mockito.ArgumentMatchers.anyLong(),
            org.mockito.ArgumentMatchers.anyLong());
    }

    @Test
    void createApprovalCommentRejectsParentOutsideTheApproval() throws Exception {
        when(approvalDAO.selectIsDocumentParticipant(anyMap())).thenReturn(true);
        when(commentDAO.selectApprovalUserCommentById(anyMap())).thenReturn(null);

        assertThatThrownBy(() -> invokeApprovalMethod(
                "createApprovalComment",
                new Class<?>[] {LoginVO.class, Long.class, String.class, Long.class},
                author, 77L, "답글", 99L))
            .isInstanceOfSatisfying(ResponseStatusException.class,
                exception -> assertThat(exception.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST));
        verify(commentDAO, never()).insertCommonComment(anyMap());
    }

    @Test
    void updateApprovalCommentRejectsAnotherAuthorsComment() throws Exception {
        when(approvalDAO.selectIsDocumentParticipant(anyMap())).thenReturn(true);
        when(commentDAO.selectApprovalUserCommentById(anyMap()))
            .thenReturn(approvalComment(55L, "someone-else", "USER"));

        assertThatThrownBy(() -> invokeApprovalMethod(
                "updateApprovalComment",
                new Class<?>[] {LoginVO.class, Long.class, Long.class, String.class},
                author, 77L, 55L, "수정"))
            .isInstanceOfSatisfying(ResponseStatusException.class,
                exception -> assertThat(exception.getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
        verify(commentDAO, never()).updateApprovalUserComment(anyMap());
    }

    @Test
    void submitApprovesDrafterAndActivatesOnlyTheFirstRealApprovalStage() throws Exception {
        when(approvalDAO.selectDocumentApprovalForUpdate(anyMap()))
            .thenReturn(workflowDocument("DRAFT"));
        when(approvalDAO.selectActiveParticipants(anyMap())).thenReturn(Arrays.asList(
            participant("101", "작성자", "기획팀"),
            participant("202", "결재자", "재무팀")));
        when(approvalDAO.updateDocumentApprovalMain(anyMap())).thenReturn(1);
        when(approvalDAO.deleteDocumentApprovalLines(anyMap())).thenReturn(2);
        when(approvalDAO.insertDocumentApprovalLine(anyMap())).thenReturn(1);
        when(approvalDAO.updateDocumentApprovalStatus(anyMap())).thenReturn(1);
        when(commentDAO.insertSystemComment(anyMap())).thenReturn(91L);
        DocumentApprovalDraftVO persisted = new DocumentApprovalDraftVO();
        persisted.setElectronicApprovalId(77L);
        persisted.setEabusNo("001");
        persisted.setDocumentStatus("PENDING");
        java.util.Date submittedAt = new java.util.Date();
        persisted.setSubmittedAt(submittedAt);
        when(approvalDAO.selectDraftDocumentStatus(anyMap())).thenReturn(persisted);

        DocumentApprovalDraftVO submitted = sharedService().submit(author, 77L, request());

        assertThat(submitted.getDocumentStatus()).isEqualTo("PENDING");
        assertThat(submitted.getEabusNo()).isEqualTo("001");
        assertThat(submitted.getSubmittedAt()).isEqualTo(submittedAt);
        ArgumentCaptor<Map<String, Object>> lineParams = mapCaptor();
        verify(approvalDAO, org.mockito.Mockito.times(2)).insertDocumentApprovalLine(lineParams.capture());
        assertThat(lineParams.getAllValues()).extracting(params -> params.get("actionStatus"))
            .containsExactly("APPROVED", "PENDING");
        assertThat(lineParams.getAllValues().get(0).get("actionAt")).isNotNull();
        assertThat(lineParams.getAllValues().get(0).get("pendingAt")).isNull();
        assertThat(lineParams.getAllValues().get(1).get("pendingAt")).isNotNull();

        verify(approvalDAO).updateDocumentApprovalStatus(argThat(params ->
            "DRAFT".equals(params.get("expectedDocumentStatus"))
                && "PENDING".equals(params.get("nextDocumentStatus"))));
        verify(commentDAO).insertSystemComment(argThat(params ->
            "SUBMITTED".equals(params.get("eventType")) && Long.valueOf(77L).equals(params.get("ownerId"))));
    }

    @Test
    void approvingCurrentStageActivatesNextStageAndKeepsDocumentInProgress() throws Exception {
        LoginVO approver = participantUser("login-202", "202", "결재자");
        DocumentApprovalActionRequestVO request = new DocumentApprovalActionRequestVO();
        request.setAction("APPROVED");
        when(approvalDAO.selectDocumentApprovalForUpdate(anyMap()))
            .thenReturn(workflowDocument("PENDING"));
        when(approvalDAO.selectCurrentPendingApprovalLine(anyMap()))
            .thenReturn(pendingLine(22L, 2, "APPROVAL", "202"));
        when(approvalDAO.updateApprovalLineAction(anyMap())).thenReturn(1);
        when(approvalDAO.selectPendingApprovalCountForStage(anyMap())).thenReturn(0L);
        when(approvalDAO.selectNextWaitingApprovalStage(anyMap())).thenReturn(3);
        when(approvalDAO.activateApprovalStage(anyMap())).thenReturn(1);
        when(approvalDAO.updateDocumentApprovalStatus(anyMap())).thenReturn(1);
        when(commentDAO.insertSystemComment(anyMap())).thenReturn(92L);

        DocumentApprovalDraftVO result = sharedService().processAction(approver, 77L, request);

        assertThat(result.getDocumentStatus()).isEqualTo("IN_PROGRESS");
        verify(approvalDAO).activateApprovalStage(argThat(params ->
            Integer.valueOf(3).equals(params.get("stageOrder"))));
        verify(approvalDAO).updateDocumentApprovalStatus(argThat(params ->
            "PENDING".equals(params.get("expectedDocumentStatus"))
                && "IN_PROGRESS".equals(params.get("nextDocumentStatus"))));
        verify(commentDAO).insertSystemComment(argThat(params ->
            "APPROVED".equals(params.get("eventType"))));
    }

    @Test
    void actionRequiresCurrentPendingApprovalLine() throws Exception {
        DocumentApprovalActionRequestVO request = new DocumentApprovalActionRequestVO();
        request.setAction("APPROVED");
        when(approvalDAO.selectDocumentApprovalForUpdate(anyMap()))
            .thenReturn(workflowDocument("PENDING"));
        when(approvalDAO.selectCurrentPendingApprovalLine(anyMap())).thenReturn(null);

        assertThatThrownBy(() -> sharedService().processAction(author, 77L, request))
            .isInstanceOfSatisfying(ResponseStatusException.class,
                exception -> assertThat(exception.getStatus()).isEqualTo(HttpStatus.CONFLICT));
        verifyNoInteractions(commentDAO);
        verify(approvalDAO, never()).updateApprovalLineAction(anyMap());
    }

    @Test
    void attachmentsAreUnavailableToAnotherDraftAuthor() throws Exception {
        when(approvalDAO.selectDraftDrafterId(anyMap())).thenReturn("other-login");

        assertThatThrownBy(() -> sharedService().listAttachments(author, 77L))
            .isInstanceOfSatisfying(ResponseStatusException.class,
                exception -> assertThat(exception.getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
        verifyNoInteractions(fileService);
    }

    @Test
    void embeddedImageStreamRequiresDraftOwnerBeforeStorageLookup() throws Exception {
        when(approvalDAO.selectDraftDrafterId(anyMap())).thenReturn("other-login");

        assertThatThrownBy(() -> sharedService(imageStorageService).streamEmbeddedImage(author, 77L, 91L, null))
            .isInstanceOfSatisfying(ResponseStatusException.class,
                exception -> assertThat(exception.getStatus()).isEqualTo(HttpStatus.NOT_FOUND));

        verifyNoInteractions(imageStorageService);
    }

    @Test
    void embeddedImageStreamUsesApprovalOwnerAfterDraftOwnerCheck() throws Exception {
        when(approvalDAO.selectIsDocumentParticipant(anyMap())).thenReturn(true);

        sharedService(imageStorageService).streamEmbeddedImage(author, 77L, 91L, null);

        verify(imageStorageService).streamOwnedImage(4L, "APPROVAL", 77L, 91L, null);
    }



    private DocumentApprovalAccessServiceImpl accessService() {
        return new DocumentApprovalAccessServiceImpl(approvalDAO);
    }

    private DocumentApprovalDraftSupportServiceImpl draftSupportService(EmbeddedImageStorageService storage,
            DocumentApprovalAccessServiceImpl access) {
        return new DocumentApprovalDraftSupportServiceImpl(approvalDAO, commentDAO, documentSanitizer, storage, access);
    }

    private DocumentApprovalCommentSupportServiceImpl commentSupportService() {
        return new DocumentApprovalCommentSupportServiceImpl(commentDAO, fileService);
    }

    private DocumentApprovalWriteServiceImpl writeService() { return writeService(imageStorageService); }

    private DocumentApprovalWriteServiceImpl writeService(EmbeddedImageStorageService storage) {
        DocumentApprovalAccessServiceImpl access = accessService();
        return new DocumentApprovalWriteServiceImpl(approvalDAO, fileService, storage, access,
                draftSupportService(storage, access), commentSupportService());
    }

    private DocumentApprovalInteractionServiceImpl sharedService() { return sharedService(imageStorageService); }

    private DocumentApprovalInteractionServiceImpl sharedService(EmbeddedImageStorageService storage) {
        DocumentApprovalAccessServiceImpl access = accessService();
        return new DocumentApprovalInteractionServiceImpl(approvalDAO, commentDAO, fileService, storage, access,
                draftSupportService(storage, access), commentSupportService());
    }

    private DocumentApprovalDetailVO detail(int viewCount) {
        DocumentApprovalDetailVO detail = new DocumentApprovalDetailVO();
        detail.setElectronicApprovalId(77L);
        detail.setViewCount(viewCount);
        return detail;
    }

    private Object invokeApprovalMethod(String name, Class<?>[] parameterTypes, Object... arguments) throws Exception {
        Method method = java.util.stream.Stream.of(DocumentApprovalWriteServiceImpl.class, DocumentApprovalInteractionServiceImpl.class).flatMap(type -> Arrays.stream(type.getMethods()))
            .filter(candidate -> candidate.getName().equals(name))
            .filter(candidate -> Arrays.equals(candidate.getParameterTypes(), parameterTypes))
            .findFirst()
            .orElse(null);
        assertThat(method).as("DocumentApproval feature service method %s is implemented", name).isNotNull();
        try {
            return method.invoke(DocumentApprovalWriteServiceImpl.class.isAssignableFrom(method.getDeclaringClass())
                    ? writeService() : sharedService(), arguments);
        } catch (InvocationTargetException exception) {
            Throwable cause = exception.getCause();
            if (cause instanceof Exception) {
                throw (Exception) cause;
            }
            if (cause instanceof Error) {
                throw (Error) cause;
            }
            throw new IllegalStateException(cause);
        }
    }

    private CommonCommentVO approvalComment(Long commentId, String writerId, String commentType) {
        CommonCommentVO comment = new CommonCommentVO();
        comment.setCommentId(commentId);
        comment.setTenantId(4L);
        comment.setOwnerType("APPROVAL");
        comment.setOwnerId(77L);
        comment.setContent("문서 댓글");
        comment.setCommentType(commentType);
        comment.setWriterId(writerId);
        comment.setWriterName("작성자");
        comment.setDeletedYn("N");
        return comment;
    }

    private CommonFileVO approvalCommentFile(Long fileId, Long ownerId) {
        CommonFileVO file = new CommonFileVO();
        file.setFileId(fileId);
        file.setTenantId(4L);
        file.setOwnerType("APPROVAL_COMMENT");
        file.setOwnerId(ownerId);
        file.setFileUsageType("ATTACHMENT");
        return file;
    }

    private DocumentApprovalDraftSaveRequestVO request() throws Exception {
        DocumentApprovalDraftSaveRequestVO request = new DocumentApprovalDraftSaveRequestVO();
        request.setDocumentType("DRAFTING");
        request.setTitle("기안 요청");
        request.setContentsJson(new ObjectMapper().readTree("{\"type\":\"doc\",\"content\":[]}"));
        request.setContentsHtml("<script>unsafe()</script><p>본문</p>");
        request.setContentsText("본문");
        request.setApprovalLines(Arrays.asList(
            line(1, 1, "APPROVAL", "101"),
            line(2, 1, "AGREEMENT", "202")));
        return request;
    }

    private DocumentApprovalDraftSaveRequestVO.ApprovalLineVO line(
            int stageOrder, int participantOrder, String participantType, String participantUserId) {
        DocumentApprovalDraftSaveRequestVO.ApprovalLineVO line =
            new DocumentApprovalDraftSaveRequestVO.ApprovalLineVO();
        line.setStageOrder(stageOrder);
        line.setParticipantOrder(participantOrder);
        line.setParticipantType(participantType);
        line.setParticipantUserId(participantUserId);
        return line;
    }

    private DocumentApprovalParticipantVO participant(String userId, String name, String departmentName) {
        DocumentApprovalParticipantVO participant = new DocumentApprovalParticipantVO();
        participant.setUserId(userId);
        participant.setUserName(name);
        participant.setDepartmentName(departmentName);
        return participant;
    }

    private DocumentApprovalWorkflowDocumentVO workflowDocument(String status) {
        DocumentApprovalWorkflowDocumentVO document = new DocumentApprovalWorkflowDocumentVO();
        document.setElectronicApprovalId(77L);
        document.setDocumentType("DRAFTING");
        document.setDocumentStatus(status);
        document.setDrafterId("login-author");
        return document;
    }

    private DocumentApprovalDraftVO draftResponse(String status) {
        DocumentApprovalDraftVO response = new DocumentApprovalDraftVO();
        response.setElectronicApprovalId(77L);
        response.setEabusNo("001");
        response.setDocumentStatus(status);
        return response;
    }

    private DocumentApprovalLineVO pendingLine(Long id, int stageOrder, String participantType, String userId) {
        DocumentApprovalLineVO line = new DocumentApprovalLineVO();
        line.setElectronicApprovalLineId(id);
        line.setStageOrder(stageOrder);
        line.setParticipantOrder(1);
        line.setParticipantType(participantType);
        line.setParticipantUserId(userId);
        line.setParticipantName("결재자");
        line.setActionStatus("PENDING");
        return line;
    }

    private DocumentApprovalLineVO approvedLine(Long id, int stageOrder, String participantType, String userId) {
        DocumentApprovalLineVO line = pendingLine(id, stageOrder, participantType, userId);
        line.setActionStatus("APPROVED");
        return line;
    }

    private LoginVO participantUser(String id, String uniqId, String name) {
        LoginVO user = author();
        user.setId(id);
        user.setUniqId(uniqId);
        user.setName(name);
        return user;
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

    private DocumentApprovalDraftSaveRequestVO requestWithTemporaryImage(boolean includeSession) throws Exception {
        DocumentApprovalDraftSaveRequestVO request = request();
        String imageHtml = "<p><img src=\"https://temporary.example/image.png\" alt=\"image.png\" "
            + "data-upload-token=\"token\" data-object-key=\"temporary-key\" "
            + "data-file-size=\"4\" data-mime-type=\"image/png\"></p>";
        request.setContentsHtml(imageHtml);
        request.setContentsJson(new ObjectMapper().readTree(
            "{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\",\"content\":[{\"type\":\"image\","
                + "\"attrs\":{\"src\":\"https://temporary.example/image.png\",\"alt\":\"image.png\","
                + "\"data-upload-token\":\"token\",\"data-object-key\":\"temporary-key\","
                + "\"data-file-size\":4,\"data-mime-type\":\"image/png\"}}]}]}"));
        DocumentApprovalEmbeddedImageVO image = new DocumentApprovalEmbeddedImageVO();
        image.setUploadToken("token");
        image.setFileName("image.png");
        image.setImageUrl("https://temporary.example/image.png");
        image.setObjectKey("temporary-key");
        image.setFileSize(4L);
        image.setMimeType("image/png");
        request.setEmbeddedImages(Collections.singletonList(image));
        request.setTemporaryImages(includeSession
            ? Collections.singletonList(image) : Collections.<DocumentApprovalEmbeddedImageVO>emptyList());
        return request;
    }

    private CommonFileVO ownedEmbeddedImage(Long ownerId, Long fileId) {
        CommonFileVO image = new CommonFileVO();
        image.setFileId(fileId);
        image.setTenantId(4L);
        image.setOwnerType("APPROVAL");
        image.setOwnerId(ownerId);
        image.setFileName("image.png");
        image.setObjectKey("tenant/4/embedded-images/approval/77/token/image.png");
        image.setFileUsageType("EMBEDDED");
        image.setDeletedYn("N");
        return image;
    }

    @SuppressWarnings("unchecked")
    private ArgumentCaptor<Map<String, Object>> mapCaptor() {
        return ArgumentCaptor.forClass((Class<Map<String, Object>>) (Class<?>) Map.class);
    }
}
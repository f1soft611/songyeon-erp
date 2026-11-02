package egovframework.let.groupware.approval.write.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.anyString;
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
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
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
import egovframework.let.common.idsequence.service.IdSequenceService;

class DocumentApprovalWriteServiceImplTest {

    private final CommonCommentDAO commentDAO = mock(CommonCommentDAO.class);
    private final CommonFileService fileService = mock(CommonFileService.class);
    private final DocumentApprovalDAO approvalDAO = mock(DocumentApprovalDAO.class);
    private final IdSequenceService idSequenceService = mock(IdSequenceService.class, invocation -> 1L);
    private final EmbeddedImageStorageService imageStorageService = mock(EmbeddedImageStorageService.class);
    private final LoginVO author = author();
    private final RichTextDocumentSanitizer documentSanitizer = new RichTextDocumentSanitizer();

    @Test
    void businessContactDraftAllowsNoReferences() throws Exception {
        DocumentApprovalDraftSaveRequestVO request = request();
        request.setDocumentType("BUSINESS_CONTACT");
        request.setApprovalLines(Collections.emptyList());
        when(approvalDAO.insertDocumentApprovalMain(anyMap())).thenReturn(77L);
        when(approvalDAO.updateDocumentApprovalMain(anyMap())).thenReturn(1);
        when(commentDAO.insertSystemComment(anyMap())).thenReturn(91L);

        assertThat(writeService().saveDraft(author, request).getDocumentStatus()).isEqualTo("DRAFT");
        verify(approvalDAO, never()).selectActiveParticipants(anyMap());
        verify(approvalDAO, never()).insertDocumentApprovalLine(anyMap());
    }

    @Test
    void feedListHydratesDocumentWithoutRecordingView() throws Exception {
        DocumentApprovalListItemVO firstItem = new DocumentApprovalListItemVO();
        firstItem.setElectronicApprovalId(77L);
        firstItem.setDocumentNo("EA-20261028-0077");
        firstItem.setTitle("첫 피드 문서");
        firstItem.setSummary("첫 요약");
        DocumentApprovalListItemVO secondItem = new DocumentApprovalListItemVO();
        secondItem.setElectronicApprovalId(78L);
        secondItem.setDocumentNo("EA-20261028-0078");
        secondItem.setTitle("둘째 피드 문서");
        secondItem.setSummary("둘째 요약");
        when(approvalDAO.selectRelatedDocumentList(anyMap())).thenReturn(Arrays.asList(firstItem, secondItem));

        DocumentApprovalDetailVO firstDetail = detail(8);
        firstDetail.setDrafterProfileImage("profile-image");
        firstDetail.setContentsJson("{\"type\":\"doc\"}");
        firstDetail.setContentsHtml("<p>첫 본문</p>");
        firstDetail.setContentsText("첫 본문");
        DocumentApprovalDetailVO secondDetail = detail(6);
        secondDetail.setElectronicApprovalId(78L);
        secondDetail.setContentsHtml("<p>둘째 본문</p>");
        when(approvalDAO.selectDocumentApprovalDetailsByIds(argThat(params ->
            Long.valueOf(4L).equals(params.get("tenantId"))
                && "login-author".equals(params.get("drafterId"))
                && "101".equals(params.get("participantUserId"))
                && ((List<?>) params.get("ownerIds")).containsAll(Arrays.asList(77L, 78L)))))
            .thenReturn(Arrays.asList(firstDetail, secondDetail));

        CommonFileVO attachment = new CommonFileVO();
        attachment.setFileId(91L);
        attachment.setOwnerId(77L);
        Map<Long, List<CommonFileVO>> attachmentsByOwnerId = new HashMap<>();
        attachmentsByOwnerId.put(77L, Collections.singletonList(attachment));
        attachmentsByOwnerId.put(78L, Collections.<CommonFileVO>emptyList());
        when(fileService.listFilesByOwnerIds(4L, "APPROVAL", Arrays.asList(77L, 78L)))
            .thenReturn(attachmentsByOwnerId);
        DocumentApprovalLineBatchVO firstLine = new DocumentApprovalLineBatchVO();
        firstLine.setElectronicApprovalId(77L);
        firstLine.setElectronicApprovalLineId(501L);
        DocumentApprovalLineBatchVO secondLine = new DocumentApprovalLineBatchVO();
        secondLine.setElectronicApprovalId(78L);
        secondLine.setElectronicApprovalLineId(502L);
        when(approvalDAO.selectApprovalLinesByOwnerIds(anyMap()))
            .thenReturn(Arrays.asList(firstLine, secondLine));

        CommonCommentVO newestSystemEvent = approvalComment(57L, "login-author", "SYSTEM");
        newestSystemEvent.setEventType("SUBMITTED");
        newestSystemEvent.setCreatedAt(new java.util.Date(6_000L));
        CommonCommentVO newestRoot = approvalComment(55L, "login-author", "USER");
        newestRoot.setCreatedAt(new java.util.Date(5_000L));
        CommonCommentVO newestReply = approvalComment(56L, "login-author", "USER");
        newestReply.setParentCommentId(55L);
        newestReply.setCreatedAt(new java.util.Date(5_500L));
        CommonCommentVO secondSystemEvent = approvalComment(54L, "login-author", "SYSTEM");
        secondSystemEvent.setEventType("APPROVED");
        secondSystemEvent.setCreatedAt(new java.util.Date(4_000L));
        CommonCommentVO thirdRoot = approvalComment(53L, "login-author", "USER");
        CommonCommentVO otherDocumentRoot = approvalComment(81L, "login-author", "USER");
        newestSystemEvent.setOwnerId(77L);
        newestRoot.setOwnerId(77L);
        newestReply.setOwnerId(77L);
        secondSystemEvent.setOwnerId(77L);
        thirdRoot.setOwnerId(77L);
        otherDocumentRoot.setOwnerId(78L);
        when(commentDAO.selectApprovalCommentStreamPagesByOwnerIds(anyMap()))
            .thenReturn(Arrays.asList(
                newestSystemEvent, newestRoot, secondSystemEvent, thirdRoot, otherDocumentRoot));
        Map<String, Object> firstOwnerCount = new HashMap<>();
        firstOwnerCount.put("ownerId", 77L);
        firstOwnerCount.put("totalCount", 5L);
        Map<String, Object> secondOwnerCount = new HashMap<>();
        secondOwnerCount.put("ownerId", 78L);
        secondOwnerCount.put("totalCount", 1L);
        when(commentDAO.selectApprovalCommentStreamCountsByOwnerIds(anyMap()))
            .thenReturn(Arrays.asList(firstOwnerCount, secondOwnerCount));
        when(commentDAO.selectApprovalUserCommentThreadsByRootIds(anyMap()))
            .thenReturn(Arrays.asList(newestRoot, newestReply, otherDocumentRoot));
        CommonFileVO commentAttachment = approvalCommentFile(601L, 55L);
        when(fileService.listFilesByOwnerIds(4L, "APPROVAL_COMMENT", Arrays.asList(55L, 56L, 81L)))
            .thenReturn(Collections.singletonMap(55L, Collections.singletonList(commentAttachment)));

        List<DocumentApprovalFeedItemVO> result = writeService().listFeedDocuments(author, "ALL", null, null);

        assertThat(result).hasSize(2);
        assertThat(result.get(0).getElectronicApprovalId()).isEqualTo(77L);
        assertThat(result).extracting(DocumentApprovalFeedItemVO::getDocumentNo)
            .containsExactly("EA-20261028-0077", "EA-20261028-0078");
        assertThat(result.get(0).getSummary()).isEqualTo("첫 요약");
        assertThat(result.get(0).getDrafterProfileImage()).isEqualTo("profile-image");
        assertThat(result.get(0).getContentsHtml()).isEqualTo("<p>첫 본문</p>");
        assertThat(result.get(0).getApprovalLines()).extracting(DocumentApprovalLineVO::getElectronicApprovalLineId)
            .containsExactly(501L);
        assertThat(result.get(0).getApprovalLines().get(0))
            .isExactlyInstanceOf(DocumentApprovalLineVO.class);
        assertThat(result.get(0).getAttachments()).containsExactly(attachment);
        assertThat(result.get(0).getComments())
            .extracting(CommonCommentVO::getCommentId).containsExactly(55L, 56L);
        assertThat(result.get(0).getComments().get(0).getAttachments())
            .containsExactly(commentAttachment);
        assertThat(result.get(0).getSystemEvents())
            .extracting(CommonCommentVO::getCommentId).containsExactly(54L, 57L);
        assertThat(result.get(0).getCommentCount()).isEqualTo(5L);
        assertThat(result.get(0).isHasPreviousComments()).isTrue();
        assertThat(result.get(0).getNextBeforeCommentId()).isEqualTo(54L);
        assertThat(result.get(1).getElectronicApprovalId()).isEqualTo(78L);
        assertThat(result.get(1).getContentsHtml()).isEqualTo("<p>둘째 본문</p>");
        assertThat(result.get(1).getApprovalLines()).extracting(DocumentApprovalLineVO::getElectronicApprovalLineId)
            .containsExactly(502L);
        assertThat(result.get(1).getComments()).containsExactly(otherDocumentRoot);
        assertThat(result.get(1).getSystemEvents()).isEmpty();
        assertThat(result.get(1).getCommentCount()).isEqualTo(1L);
        assertThat(result.get(1).isHasPreviousComments()).isFalse();
        verify(approvalDAO).selectDocumentApprovalDetailsByIds(anyMap());
        verify(approvalDAO).selectApprovalLinesByOwnerIds(anyMap());
        verify(commentDAO).selectApprovalCommentStreamPagesByOwnerIds(argThat(params ->
            params.get("ownerIds") != null && ((List<?>) params.get("ownerIds")).containsAll(Arrays.asList(77L, 78L))
                && params.get("limit").equals(4)));
        verify(commentDAO).selectApprovalCommentStreamCountsByOwnerIds(anyMap());
        verify(commentDAO).selectApprovalUserCommentThreadsByRootIds(argThat(params ->
            ((List<?>) params.get("rootIds")).containsAll(Arrays.asList(55L, 81L))));
        verify(fileService).listFilesByOwnerIds(4L, "APPROVAL", Arrays.asList(77L, 78L));
        verify(fileService).listFilesByOwnerIds(4L, "APPROVAL_COMMENT", Arrays.asList(55L, 56L, 81L));
        verify(approvalDAO, never()).selectLoginIdByLoginCode(anyMap());
        verify(approvalDAO, never()).insertElectronicApprovalViewHistory(anyMap());
        verify(approvalDAO, never()).incrementElectronicApprovalViewCount(anyMap());
        verify(approvalDAO, never()).selectDocumentApprovalDetail(anyMap());
        verify(approvalDAO, never()).selectApprovalLines(anyMap());
        verify(approvalDAO, never()).selectIsDocumentParticipant(anyMap());
        verify(commentDAO, never()).selectApprovalUserCommentPage(anyMap());
        verify(commentDAO, never()).countApprovalUserComments(anyMap());
        verify(fileService, never()).listFiles(eq(4L), eq("APPROVAL"), eq(77L));
        verify(fileService, never()).listFiles(eq(4L), eq("APPROVAL_COMMENT"), eq(55L));

        when(approvalDAO.selectPinnedRelatedDocumentList(anyMap())).thenReturn(Arrays.asList(firstItem, secondItem));
        assertThat(writeService().listPinnedFeedDocuments(author, "ALL", null, null))
            .extracting(DocumentApprovalFeedItemVO::getDocumentNo)
            .containsExactly("EA-20261028-0077", "EA-20261028-0078");
    }

    @Test
    void feedListStopsWhenBatchDetailDoesNotAuthorizeAListedDocument() throws Exception {
        DocumentApprovalListItemVO listItem = new DocumentApprovalListItemVO();
        listItem.setElectronicApprovalId(77L);
        when(approvalDAO.selectRelatedDocumentList(anyMap())).thenReturn(Collections.singletonList(listItem));
        when(approvalDAO.selectDocumentApprovalDetailsByIds(anyMap()))
            .thenReturn(Collections.<DocumentApprovalDetailVO>emptyList());

        assertThatThrownBy(() -> writeService().listFeedDocuments(author, "ALL", null, null))
            .isInstanceOfSatisfying(ResponseStatusException.class,
                exception -> assertThat(exception.getStatus()).isEqualTo(HttpStatus.NOT_FOUND));

        verify(approvalDAO, never()).selectApprovalLinesByOwnerIds(anyMap());
        verifyNoInteractions(commentDAO, fileService);
    }

    @Test
    void ordinaryListDoesNotHydrateDetails() throws Exception {
        DocumentApprovalListItemVO listItem = new DocumentApprovalListItemVO();
        listItem.setElectronicApprovalId(77L);
        when(approvalDAO.selectRelatedDocumentList(anyMap())).thenReturn(Collections.singletonList(listItem));

        List<DocumentApprovalListItemVO> result = writeService().listDocuments(author, "ALL", null, null);

        assertThat(result).containsExactly(listItem);
        verify(approvalDAO, never()).selectDocumentApprovalDetail(anyMap());
        verify(approvalDAO, never()).selectApprovalLines(anyMap());
        verifyNoInteractions(commentDAO, fileService);
    }

    @Test
    void pinAndUnpinUseAuthenticatedActorScopeAndAllowIdempotentMutations() throws Exception {
        when(approvalDAO.insertDocumentApprovalPin(anyMap())).thenReturn(0);
        when(approvalDAO.deleteDocumentApprovalPin(anyMap())).thenReturn(0);

        DocumentApprovalPinStateVO pinned = writeService().pinDocument(author, 77L);
        DocumentApprovalPinStateVO unpinned = writeService().unpinDocument(author, 77L);

        assertThat(pinned.getElectronicApprovalId()).isEqualTo(77L);
        assertThat(pinned.isPinned()).isTrue();
        assertThat(unpinned.getElectronicApprovalId()).isEqualTo(77L);
        assertThat(unpinned.isPinned()).isFalse();

        verify(approvalDAO).insertDocumentApprovalPin(argThat(params ->
            Long.valueOf(4L).equals(params.get("tenantId"))
                && Long.valueOf(101L).equals(params.get("userId"))
                && "login-author".equals(params.get("drafterId"))
                && "101".equals(params.get("participantUserId"))
                && Long.valueOf(77L).equals(params.get("electronicApprovalId"))));
        verify(approvalDAO).deleteDocumentApprovalPin(argThat(params ->
            Long.valueOf(4L).equals(params.get("tenantId"))
                && Long.valueOf(101L).equals(params.get("userId"))
                && "login-author".equals(params.get("drafterId"))
                && "101".equals(params.get("participantUserId"))
                && Long.valueOf(77L).equals(params.get("electronicApprovalId"))));
    }

    @Test
    void pinRejectsNonNumericAuthenticatedUserId() throws Exception {
        LoginVO malformedActor = participantUser("login-author", "not-a-number", "작성자");

        assertThatThrownBy(() -> writeService().pinDocument(malformedActor, 77L))
            .isInstanceOfSatisfying(ResponseStatusException.class,
                exception -> assertThat(exception.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST));
        verify(approvalDAO, never()).insertDocumentApprovalPin(anyMap());
    }

    @Test
    void pinnedListUsesScopeAndFilterWithCurrentAuthenticatedIdentityOnly() throws Exception {
        DocumentApprovalListItemVO listItem = new DocumentApprovalListItemVO();
        listItem.setElectronicApprovalId(77L);
        when(approvalDAO.selectPinnedRelatedDocumentList(anyMap())).thenReturn(Collections.singletonList(listItem));

        List<DocumentApprovalListItemVO> result = writeService().listPinnedDocuments(author, "MY_PENDING", "DRAFTING", 77L);

        assertThat(result).containsExactly(listItem);
        verify(approvalDAO).selectPinnedRelatedDocumentList(argThat(params ->
            Long.valueOf(4L).equals(params.get("tenantId"))
                && Long.valueOf(101L).equals(params.get("userId"))
                && "login-author".equals(params.get("drafterId"))
                && "101".equals(params.get("participantUserId"))
                && "MY_PENDING".equals(params.get("scope"))
                && "DRAFTING".equals(params.get("documentType"))
                && Long.valueOf(77L).equals(params.get("electronicApprovalId"))
                && !params.containsKey("documentStatus")));
    }

    @Test
    void writePageRejectsLimitsAboveTwenty() {
        DocumentApprovalListQueryVO query = new DocumentApprovalListQueryVO();
        query.setLimit(21);

        assertThatThrownBy(() -> invokeApprovalMethod(
                "searchWriteDocuments",
                new Class<?>[] { LoginVO.class, String.class, DocumentApprovalListQueryVO.class },
                author, "ALL", query))
            .isInstanceOfSatisfying(ResponseStatusException.class,
                exception -> assertThat(exception.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST));
    }

    @Test
    void relatedDocumentListAndSummaryUseAuthenticatedParticipantId() throws Exception {
        when(approvalDAO.selectRelatedDocumentList(anyMap())).thenReturn(Collections.<DocumentApprovalListItemVO>emptyList());

        writeService().listDocuments(author, "ALL", null, null);

        verify(approvalDAO).selectRelatedDocumentList(argThat(params ->
            "101".equals(params.get("participantUserId"))));

        when(approvalDAO.selectDocumentApprovalSummary(anyMap())).thenReturn(new DocumentApprovalSummaryVO());
        when(approvalDAO.selectApprovalNotices(anyMap())).thenReturn(Collections.<DocumentApprovalListItemVO>emptyList());

        writeService().getSummary(author);

        verify(approvalDAO).selectDocumentApprovalSummary(argThat(params ->
            "101".equals(params.get("participantUserId"))));
        verify(approvalDAO).selectApprovalNotices(argThat(params ->
            "101".equals(params.get("participantUserId"))));
    }

    @Test
    void saveDraftPersistsAuthenticatedAuthorOrderedLinesAndSystemEvent() throws Exception {
        when(approvalDAO.selectActiveParticipants(anyMap())).thenReturn(Arrays.asList(
            participant("101", "작성자", "기획팀"),
            participant("202", "결재자", "재무팀")));
        when(approvalDAO.insertDocumentApprovalMain(anyMap())).thenReturn(77L);
        when(approvalDAO.updateDocumentApprovalMain(anyMap())).thenReturn(1);
        when(approvalDAO.insertDocumentApprovalLine(anyMap())).thenReturn(1);
        when(commentDAO.insertSystemComment(anyMap())).thenReturn(91L);

        DocumentApprovalDraftVO saved = writeService().saveDraft(author, request());

        assertThat(saved.getElectronicApprovalId()).isEqualTo(77L);
        assertThat(saved.getDocumentNo()).matches("EA-\\d{8}-0001");
        assertThat(saved.getDocumentStatus()).isEqualTo("DRAFT");
        verify(idSequenceService).nextValue(
            eq("ELECTRONIC_APPROVAL_NO"),
            eq("4"),
            eq(LocalDate.now().format(DateTimeFormatter.BASIC_ISO_DATE)));

        ArgumentCaptor<Map<String, Object>> documentParams = mapCaptor();
        verify(approvalDAO).insertDocumentApprovalMain(documentParams.capture());
        assertThat(documentParams.getValue())
            .containsEntry("tenantId", 4L)
            .containsEntry("drafterId", "login-author")
            .containsEntry("drafterName", "작성자")
            .containsEntry("drafterDepartmentName", "기획팀")
            .containsEntry("documentStatus", "DRAFT")
            .containsEntry("documentNo", saved.getDocumentNo())
            .containsEntry("documentType", "DRAFTING")
            .containsEntry("eabusNo", "001")
            .containsEntry("title", "기안 요청")
            .containsEntry("contentsHtml", "<p>본문</p>")
            .containsEntry("contentsText", "본문");

        ArgumentCaptor<Map<String, Object>> lineParams = mapCaptor();
        verify(approvalDAO, org.mockito.Mockito.times(2)).insertDocumentApprovalLine(lineParams.capture());
        assertThat(lineParams.getAllValues())
            .extracting(params -> params.get("participantUserId"))
            .containsExactly("101", "202");
        assertThat(lineParams.getAllValues())
            .extracting(params -> params.get("participantName"))
            .containsExactly("작성자", "결재자");

        ArgumentCaptor<Map<String, Object>> eventParams = mapCaptor();
        verify(commentDAO).insertSystemComment(eventParams.capture());
        assertThat(eventParams.getValue())
            .containsEntry("tenantId", 4L)
            .containsEntry("ownerType", "APPROVAL")
            .containsEntry("ownerId", 77L)
            .containsEntry("commentType", "SYSTEM")
            .containsEntry("eventType", "DRAFT_SAVED")
            .containsEntry("writerId", "login-author")
            .containsEntry("writerName", "작성자");
    }

    @Test
    void saveDraftKeepsSequenceValuesWiderThanFourDigits() throws Exception {
        when(idSequenceService.nextValue(eq("ELECTRONIC_APPROVAL_NO"), eq("4"), anyString()))
            .thenReturn(10_000L);
        when(approvalDAO.selectActiveParticipants(anyMap())).thenReturn(Arrays.asList(
            participant("101", "작성자", "기획팀"),
            participant("202", "결재자", "재무팀")));
        when(approvalDAO.insertDocumentApprovalMain(anyMap())).thenReturn(77L);
        when(approvalDAO.updateDocumentApprovalMain(anyMap())).thenReturn(1);
        when(approvalDAO.insertDocumentApprovalLine(anyMap())).thenReturn(1);
        when(commentDAO.insertSystemComment(anyMap())).thenReturn(91L);

        DocumentApprovalDraftVO saved = writeService().saveDraft(author, request());

        assertThat(saved.getDocumentNo()).matches("EA-\\d{8}-10000");
    }

    @Test
    void saveDraftStopsWhenDocumentNumberCannotBeGenerated() throws Exception {
        when(idSequenceService.nextValue(eq("ELECTRONIC_APPROVAL_NO"), eq("4"), anyString()))
            .thenThrow(new IllegalStateException("sequence unavailable"));
        when(approvalDAO.selectActiveParticipants(anyMap())).thenReturn(Arrays.asList(
            participant("101", "작성자", "기획팀"),
            participant("202", "결재자", "재무팀")));

        assertThatThrownBy(() -> writeService().saveDraft(author, request()))
            .isInstanceOf(IllegalStateException.class)
            .hasMessage("sequence unavailable");
        verify(approvalDAO, never()).insertDocumentApprovalMain(anyMap());
    }

    @Test
    void saveDraftRejectsInvalidParticipantBeforeWritingAnything() throws Exception {
        when(approvalDAO.selectActiveParticipants(anyMap()))
            .thenReturn(Collections.singletonList(participant("101", "작성자", "기획팀")));
        DocumentApprovalDraftSaveRequestVO request = request();
        request.setApprovalLines(new ArrayList<>(request.getApprovalLines()));
        request.getApprovalLines().add(line(2, 1, "APPROVAL", "999"));

        assertThatThrownBy(() -> writeService().saveDraft(author, request))
            .isInstanceOfSatisfying(ResponseStatusException.class,
                exception -> assertThat(exception.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST));
        verify(approvalDAO, never()).insertDocumentApprovalMain(anyMap());
        verifyNoInteractions(commentDAO);
    }

    @Test
    void saveDraftUsesConditionalUpdateForExistingDraft() throws Exception {
        when(approvalDAO.selectDraftDrafterId(anyMap())).thenReturn("login-author");
        when(approvalDAO.selectActiveParticipants(anyMap())).thenReturn(Arrays.asList(
            participant("101", "작성자", "기획팀"),
            participant("202", "결재자", "재무팀")));
        when(approvalDAO.updateDocumentApprovalMain(anyMap())).thenReturn(1);
        when(approvalDAO.deleteDocumentApprovalLines(anyMap())).thenReturn(2);
        when(approvalDAO.insertDocumentApprovalLine(anyMap())).thenReturn(1);
        when(commentDAO.insertSystemComment(anyMap())).thenReturn(92L);
        when(approvalDAO.selectDraftDocumentStatus(anyMap())).thenReturn(draftResponse("DRAFT"));

        DocumentApprovalDraftVO saved = writeService().saveDraft(author, 77L, request());

        assertThat(saved.getElectronicApprovalId()).isEqualTo(77L);
        assertThat(saved.getDocumentNo()).isEqualTo("EA-20261010-0001");
        verify(approvalDAO, never()).insertDocumentApprovalMain(anyMap());
        verifyNoInteractions(idSequenceService);
        verify(approvalDAO).updateDocumentApprovalMain(org.mockito.ArgumentMatchers.argThat(
            params -> params.get("tenantId").equals(4L)
                && params.get("drafterId").equals("login-author")
                && params.get("documentStatus").equals("DRAFT")
                && params.get("electronicApprovalId").equals(77L)));
        verify(commentDAO).insertSystemComment(org.mockito.ArgumentMatchers.argThat(
            params -> params.get("ownerId").equals(77L)
                && params.get("eventType").equals("DRAFT_SAVED")));
    }

    @Test
    void saveDraftPreservesRevisionRequestedStatusAndReturnsPersistedDocumentMetadata() throws Exception {
        java.util.Date submittedAt = new java.util.Date();
        DocumentApprovalDraftVO persisted = new DocumentApprovalDraftVO();
        persisted.setElectronicApprovalId(77L);
        persisted.setEabusNo("001");
        persisted.setDocumentStatus("REVISION_REQUESTED");
        persisted.setSubmittedAt(submittedAt);
        when(approvalDAO.selectDraftDrafterId(anyMap())).thenReturn("login-author");
        when(approvalDAO.selectActiveParticipants(anyMap())).thenReturn(Arrays.asList(
            participant("101", "작성자", "기획팀"),
            participant("202", "결재자", "재무팀")));
        when(approvalDAO.updateDocumentApprovalMain(anyMap())).thenReturn(1);
        when(approvalDAO.deleteDocumentApprovalLines(anyMap())).thenReturn(2);
        when(approvalDAO.insertDocumentApprovalLine(anyMap())).thenReturn(1);
        when(commentDAO.insertSystemComment(anyMap())).thenReturn(92L);
        when(approvalDAO.selectDraftDocumentStatus(anyMap())).thenReturn(persisted);

        DocumentApprovalDraftVO saved = writeService().saveDraft(author, 77L, request());

        assertThat(saved.getDocumentStatus()).isEqualTo("REVISION_REQUESTED");
        assertThat(saved.getEabusNo()).isEqualTo("001");
        assertThat(saved.getSubmittedAt()).isEqualTo(submittedAt);
    }

    @Test
    void saveDraftStopsWhenAnApprovalLineCannotBePersisted() throws Exception {
        when(approvalDAO.selectActiveParticipants(anyMap())).thenReturn(Arrays.asList(
            participant("101", "작성자", "기획팀"),
            participant("202", "결재자", "재무팀")));
        when(approvalDAO.insertDocumentApprovalMain(anyMap())).thenReturn(77L);
        when(approvalDAO.updateDocumentApprovalMain(anyMap())).thenReturn(1);
        when(approvalDAO.insertDocumentApprovalLine(anyMap())).thenReturn(0);

        assertThatThrownBy(() -> writeService().saveDraft(author, request()))
            .isInstanceOf(IllegalStateException.class)
            .hasMessage("결재선 저장에 실패했습니다.");
        verifyNoInteractions(commentDAO);
    }

    @Test
    void saveDraftFailsWhenSystemEventPersistenceReturnsNoIdentity() throws Exception {
        when(approvalDAO.selectActiveParticipants(anyMap())).thenReturn(Arrays.asList(
            participant("101", "작성자", "기획팀"),
            participant("202", "결재자", "재무팀")));
        when(approvalDAO.insertDocumentApprovalMain(anyMap())).thenReturn(77L);
        when(approvalDAO.updateDocumentApprovalMain(anyMap())).thenReturn(1);
        when(approvalDAO.insertDocumentApprovalLine(anyMap())).thenReturn(1);
        when(commentDAO.insertSystemComment(anyMap())).thenReturn(null);

        assertThatThrownBy(() -> writeService().saveDraft(author, request()))
            .isInstanceOf(IllegalStateException.class)
            .hasMessage("임시저장 시스템 이력 기록에 실패했습니다.");
    }

    @Test
    void saveDraftRejectsUpdatingAnotherAuthorsDraft() throws Exception {
        when(approvalDAO.selectDraftDrafterId(anyMap())).thenReturn("other-login");

        assertThatThrownBy(() -> writeService().saveDraft(author, 77L, request()))
            .isInstanceOfSatisfying(ResponseStatusException.class,
                exception -> assertThat(exception.getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
        verify(approvalDAO, never()).deleteDocumentApprovalLines(anyMap());
        verifyNoInteractions(commentDAO);
    }

    @Test
    void saveDraftRequiresTransactionalBoundary() throws Exception {
        Method method = DocumentApprovalWriteServiceImpl.class.getMethod(
            "saveDraft", LoginVO.class, Long.class, DocumentApprovalDraftSaveRequestVO.class);

        assertThat(method.getAnnotation(Transactional.class)).isNotNull();
    }

    @Test
    void temporaryEmbeddedImagesUseAuthenticatedTenant() throws Exception {
        EmbeddedImageUploadVO uploaded = new EmbeddedImageUploadVO();
        when(imageStorageService.uploadTemporaryImage(4L, null)).thenReturn(uploaded);

        assertThat(writeService(imageStorageService).uploadTemporaryEmbeddedImage(author, null)).isSameAs(uploaded);

        verify(imageStorageService).uploadTemporaryImage(4L, null);
    }

    @Test
    void temporaryEmbeddedImageDeletionUsesAuthenticatedTenant() throws Exception {
        writeService(imageStorageService).deleteTemporaryEmbeddedImage(author, "token", "image.png");

        verify(imageStorageService).deleteTemporaryImage(4L, "token", "image.png");
    }

    @Test
    void saveDraftPromotesReferencedTemporaryImagesAndPersistsStableBody() throws Exception {
        when(approvalDAO.selectActiveParticipants(anyMap())).thenReturn(Arrays.asList(
            participant("101", "작성자", "기획팀"),
            participant("202", "결재자", "재무팀")));
        when(approvalDAO.insertDocumentApprovalMain(anyMap())).thenReturn(77L);
        when(approvalDAO.updateDocumentApprovalMain(anyMap())).thenReturn(1);
        when(approvalDAO.insertDocumentApprovalLine(anyMap())).thenReturn(1);
        when(commentDAO.insertSystemComment(anyMap())).thenReturn(91L);
        when(imageStorageService.listOwnedImages(4L, "APPROVAL", 77L)).thenReturn(Collections.emptyList());
        when(imageStorageService.promoteTemporaryImage(4L, "APPROVAL", 77L, "token", "image.png", "login-author"))
            .thenReturn(ownedEmbeddedImage(77L, 91L));

        DocumentApprovalDraftSaveRequestVO request = requestWithTemporaryImage(true);
        DocumentApprovalDraftVO saved = writeService(imageStorageService).saveDraft(author, request);

        assertThat(saved.getElectronicApprovalId()).isEqualTo(77L);
        ArgumentCaptor<Map<String, Object>> updateParams = mapCaptor();
        verify(approvalDAO).updateDocumentApprovalMain(updateParams.capture());
        assertThat(updateParams.getValue().get("contentsHtml").toString())
            .contains("/api/v1/groupware/approvals/77/embedded-images/91")
            .doesNotContain("data-upload-token");
        assertThat(updateParams.getValue().get("contentsJson").toString())
            .contains("/api/v1/groupware/approvals/77/embedded-images/91")
            .doesNotContain("data-upload-token");
        verify(imageStorageService).completeOwnerSave(
            eq(4L),
            eq("APPROVAL"),
            eq(77L),
            argThat(uploads -> uploads.size() == 1
                && "token".equals(uploads.get(0).getUploadToken())
                && "image.png".equals(uploads.get(0).getFileName())),
            argThat(fileIds -> fileIds.contains(91L)));
        verify(approvalDAO, org.mockito.Mockito.times(2)).insertDocumentApprovalLine(anyMap());
        verify(commentDAO).insertSystemComment(anyMap());
    }

    @Test
    void updateDraftPromotesImagesUnderExistingApprovalOwner() throws Exception {
        when(approvalDAO.selectDraftDrafterId(anyMap())).thenReturn("login-author");
        when(approvalDAO.selectActiveParticipants(anyMap())).thenReturn(Arrays.asList(
            participant("101", "작성자", "기획팀"),
            participant("202", "결재자", "재무팀")));
        when(approvalDAO.updateDocumentApprovalMain(anyMap())).thenReturn(1);
        when(approvalDAO.deleteDocumentApprovalLines(anyMap())).thenReturn(2);
        when(approvalDAO.insertDocumentApprovalLine(anyMap())).thenReturn(1);
        when(commentDAO.insertSystemComment(anyMap())).thenReturn(92L);
        when(imageStorageService.listOwnedImages(4L, "APPROVAL", 77L)).thenReturn(Collections.emptyList());
        when(approvalDAO.selectDraftDocumentStatus(anyMap())).thenReturn(draftResponse("DRAFT"));
        when(imageStorageService.promoteTemporaryImage(4L, "APPROVAL", 77L, "token", "image.png", "login-author"))
            .thenReturn(ownedEmbeddedImage(77L, 91L));

        DocumentApprovalDraftVO saved =
            writeService(imageStorageService).saveDraft(author, 77L, requestWithTemporaryImage(true));

        assertThat(saved.getElectronicApprovalId()).isEqualTo(77L);
        verify(imageStorageService).promoteTemporaryImage(
            4L, "APPROVAL", 77L, "token", "image.png", "login-author");
        verify(imageStorageService).completeOwnerSave(
            eq(4L),
            eq("APPROVAL"),
            eq(77L),
            argThat(uploads -> uploads.size() == 1
                && "token".equals(uploads.get(0).getUploadToken())),
            argThat(fileIds -> fileIds.contains(91L)));
        verify(approvalDAO).updateDocumentApprovalMain(org.mockito.ArgumentMatchers.argThat(
            params -> params.get("contentsHtml").toString()
                .contains("/api/v1/groupware/approvals/77/embedded-images/91")));
    }

    @Test
    void saveDraftRejectsImageOutsideTemporarySessionBeforeWritingLinesOrSystemEvent() throws Exception {
        when(approvalDAO.selectActiveParticipants(anyMap())).thenReturn(Arrays.asList(
            participant("101", "작성자", "기획팀"),
            participant("202", "결재자", "재무팀")));
        when(approvalDAO.insertDocumentApprovalMain(anyMap())).thenReturn(77L);
        DocumentApprovalDraftSaveRequestVO request = requestWithTemporaryImage(false);

        assertThatThrownBy(() -> writeService(imageStorageService).saveDraft(author, request))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage("본문 이미지가 현재 임시 업로드 세션에 속하지 않습니다.");

        verify(approvalDAO, never()).insertDocumentApprovalLine(anyMap());
        verifyNoInteractions(commentDAO);
        verify(imageStorageService, never()).completeOwnerSave(
            org.mockito.ArgumentMatchers.anyLong(),
            org.mockito.ArgumentMatchers.anyString(),
            org.mockito.ArgumentMatchers.anyLong(),
            org.mockito.ArgumentMatchers.anyList(),
            org.mockito.ArgumentMatchers.anySet());
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
                draftSupportService(storage, access), commentSupportService(), idSequenceService);
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
        response.setDocumentNo("EA-20261010-0001");
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
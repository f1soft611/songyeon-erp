package egovframework.let.groupware.approval.write.service.impl;

import egovframework.let.groupware.approval.common.service.DocumentApprovalAccessService;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import egovframework.com.cmm.LoginVO;
import egovframework.com.common.domain.model.CommonFileVO;
import egovframework.com.common.domain.model.EmbeddedImageUploadVO;
import egovframework.com.common.service.EmbeddedImageDocumentProcessor;
import egovframework.com.common.service.EmbeddedImageStorageService;
import egovframework.com.common.service.CommonFileService;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalDraftSaveRequestVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalDraftVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalCommentPageVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalDetailVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalFeedItemVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalLineBatchVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalLineVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalListItemVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalListQueryVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalPinStateVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalWritePageVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalParticipantVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalSummaryVO;
import egovframework.let.groupware.approval.domain.repository.DocumentApprovalDAO;
import egovframework.let.groupware.approval.write.service.DocumentApprovalWriteService;
import egovframework.let.groupware.approval.common.service.DocumentApprovalDraftSupportService;
import egovframework.let.groupware.approval.common.service.DocumentApprovalCommentSupportService;
import egovframework.let.common.idsequence.service.IdSequenceService;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

@Service("documentApprovalWriteService")
public class DocumentApprovalWriteServiceImpl extends EgovAbstractServiceImpl
        implements DocumentApprovalWriteService {

    private static final String OWNER_TYPE = "APPROVAL";
    private static final String DOCUMENT_NO_GENERATOR_KEY = "ELECTRONIC_APPROVAL_NO";
    private static final DateTimeFormatter DOCUMENT_NO_DATE_FORMAT = DateTimeFormatter.BASIC_ISO_DATE;
    private static final Set<String> DOCUMENT_TYPES = Collections.unmodifiableSet(new HashSet<>(Arrays.asList(
            "DRAFTING", "BUSINESS_CONTACT", "EXPENSE_RESOLUTION", "ATTENDANCE_APPLICATION")));
    private static final Set<String> DOCUMENT_SCOPES = Collections.unmodifiableSet(new HashSet<>(Arrays.asList(
            "ALL", "MY_PENDING", "IN_PROGRESS", "DRAFT", "COMPLETED", "REVISION_REQUESTED", "REJECTED")));
    private final DocumentApprovalDAO documentApprovalDAO;
    private final CommonFileService commonFileService;
    private final EmbeddedImageStorageService imageStorageService;
    private final DocumentApprovalAccessService documentApprovalAccessService;
    private final DocumentApprovalDraftSupportService draftSupportService;
    private final DocumentApprovalCommentSupportService commentSupportService;
    private final IdSequenceService idSequenceService;
    public DocumentApprovalWriteServiceImpl(DocumentApprovalDAO documentApprovalDAO,
            CommonFileService commonFileService, EmbeddedImageStorageService imageStorageService,
            DocumentApprovalAccessService documentApprovalAccessService,
            DocumentApprovalDraftSupportService draftSupportService,
            DocumentApprovalCommentSupportService commentSupportService,
            IdSequenceService idSequenceService) {
        this.documentApprovalDAO = documentApprovalDAO;
        this.commonFileService = commonFileService;
        this.imageStorageService = imageStorageService;
        this.documentApprovalAccessService = documentApprovalAccessService;
        this.draftSupportService = draftSupportService;
        this.commentSupportService = commentSupportService;
        this.idSequenceService = idSequenceService;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public DocumentApprovalDraftVO saveDraft(LoginVO user, DocumentApprovalDraftSaveRequestVO request) throws Exception {
        documentApprovalAccessService.validateAuthenticatedUser(user);
        draftSupportService.validateDraftRequest(request);
        Map<String, Object> actor = documentApprovalAccessService.actorParams(user);
        draftSupportService.validateCategory(request.getDraftingWorkCategoryId(), user.getTenantId());
        Map<String, DocumentApprovalParticipantVO> participants = draftSupportService.validateParticipants(request, user);

        Map<String, Object> documentParams = draftSupportService.documentParams(user, request, actor);
        String documentNo = generateDocumentNo(user.getTenantId());
        documentParams.put("documentNo", documentNo);
        Long approvalId = documentApprovalDAO.insertDocumentApprovalMain(documentParams);
        if (approvalId == null) {
            throw new IllegalStateException("전자결재 문서 ID를 확인할 수 없습니다.");
        }
        EmbeddedImageDocumentProcessor.Result imageSave = draftSupportService.processEmbeddedImages(user, approvalId, request);
        draftSupportService.applyProcessedBody(documentParams, imageSave);
        documentParams.put("electronicApprovalId", approvalId);
        if (documentApprovalDAO.updateDocumentApprovalMain(documentParams) != 1) {
            throw new IllegalStateException("본문 이미지 저장에 실패했습니다.");
        }

        draftSupportService.replaceApprovalLines(user, approvalId, request.getApprovalLines(), participants);
        draftSupportService.insertDraftSavedMessage(user, approvalId);
        imageStorageService.completeOwnerSave(user.getTenantId(), OWNER_TYPE, approvalId,
                draftSupportService.toStorageUploads(request.getTemporaryImages()), imageSave.getRetainedFileIds());
        return draftSupportService.draftResponse(approvalId, documentNo);
    }

    private String generateDocumentNo(Long tenantId) throws Exception {
        String issueDate = LocalDate.now().format(DOCUMENT_NO_DATE_FORMAT);
        Long sequence = idSequenceService.nextValue(
                DOCUMENT_NO_GENERATOR_KEY, tenantId.toString(), issueDate);
        return String.format(Locale.ROOT, "EA-%s-%04d", issueDate, sequence);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public DocumentApprovalDraftVO saveDraft(LoginVO user, Long electronicApprovalId,
            DocumentApprovalDraftSaveRequestVO request) throws Exception {
        documentApprovalAccessService.validateAuthenticatedUser(user);
        draftSupportService.validateDraftRequest(request);
        if (electronicApprovalId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "문서 ID가 없습니다.");
        }
        Map<String, Object> actor = documentApprovalAccessService.actorParams(user);
        actor.put("electronicApprovalId", electronicApprovalId);
        String drafterId = documentApprovalDAO.selectDraftDrafterId(actor);
        if (drafterId == null || !drafterId.equals(user.getId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "임시저장 문서를 찾을 수 없습니다.");
        }

        draftSupportService.validateCategory(request.getDraftingWorkCategoryId(), user.getTenantId());
        Map<String, DocumentApprovalParticipantVO> participants = draftSupportService.validateParticipants(request, user);
        Map<String, Object> documentParams = draftSupportService.documentParams(user, request, actor);
        EmbeddedImageDocumentProcessor.Result imageSave = draftSupportService.processEmbeddedImages(user, electronicApprovalId, request);
        draftSupportService.applyProcessedBody(documentParams, imageSave);
        if (documentApprovalDAO.updateDocumentApprovalMain(documentParams) != 1) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "임시저장 문서를 찾을 수 없습니다.");
        }

        draftSupportService.replaceApprovalLines(user, electronicApprovalId, request.getApprovalLines(), participants);
        draftSupportService.insertDraftSavedMessage(user, electronicApprovalId);
        imageStorageService.completeOwnerSave(user.getTenantId(), OWNER_TYPE, electronicApprovalId,
                draftSupportService.toStorageUploads(request.getTemporaryImages()), imageSave.getRetainedFileIds());
        return draftSupportService.persistedDraftResponse(user, electronicApprovalId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<DocumentApprovalListItemVO> listDocuments(LoginVO user, String scope, String documentType,
            Long electronicApprovalId) throws Exception {
        documentApprovalAccessService.validateAuthenticatedUser(user);
        String effectiveScope = scope == null ? "ALL" : scope;
        if (!DOCUMENT_SCOPES.contains(effectiveScope)
                || (documentType != null && !DOCUMENT_TYPES.contains(documentType))
                || (electronicApprovalId != null && electronicApprovalId <= 0)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "문서 조회 조건이 올바르지 않습니다.");
        }
        Map<String, Object> params = documentApprovalAccessService.actorParams(user);
        params.put("scope", effectiveScope);
        params.put("documentType", documentType);
        params.put("electronicApprovalId", electronicApprovalId);
        List<DocumentApprovalListItemVO> documents = documentApprovalDAO.selectRelatedDocumentList(params);
        return documents == null ? Collections.<DocumentApprovalListItemVO>emptyList() : documents;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public DocumentApprovalPinStateVO pinDocument(LoginVO user, Long electronicApprovalId) throws Exception {
        documentApprovalAccessService.validateAuthenticatedUser(user);
        if (electronicApprovalId == null || electronicApprovalId <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "문서 ID가 올바르지 않습니다.");
        }
        Map<String, Object> params = documentApprovalAccessService.actorParams(user);
        params.put("userId", documentApprovalAccessService.authenticatedUserId(user));
        params.put("electronicApprovalId", electronicApprovalId);
        documentApprovalDAO.insertDocumentApprovalPin(params);
        return pinState(electronicApprovalId, true);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public DocumentApprovalPinStateVO unpinDocument(LoginVO user, Long electronicApprovalId) throws Exception {
        documentApprovalAccessService.validateAuthenticatedUser(user);
        if (electronicApprovalId == null || electronicApprovalId <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "문서 ID가 올바르지 않습니다.");
        }
        Map<String, Object> params = documentApprovalAccessService.actorParams(user);
        params.put("userId", documentApprovalAccessService.authenticatedUserId(user));
        params.put("electronicApprovalId", electronicApprovalId);
        documentApprovalDAO.deleteDocumentApprovalPin(params);
        return pinState(electronicApprovalId, false);
    }

    @Override
    @Transactional(readOnly = true)
    public List<DocumentApprovalListItemVO> listPinnedDocuments(LoginVO user, String scope, String documentType,
            Long electronicApprovalId) throws Exception {
        documentApprovalAccessService.validateAuthenticatedUser(user);
        String effectiveScope = scope == null ? "ALL" : scope;
        if (!DOCUMENT_SCOPES.contains(effectiveScope)
                || (documentType != null && !DOCUMENT_TYPES.contains(documentType))
                || (electronicApprovalId != null && electronicApprovalId <= 0)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "문서 조회 조건이 올바르지 않습니다.");
        }
        Map<String, Object> params = documentApprovalAccessService.actorParams(user);
        params.remove("documentStatus");
        params.put("userId", documentApprovalAccessService.authenticatedUserId(user));
        params.put("scope", effectiveScope);
        params.put("documentType", documentType);
        params.put("electronicApprovalId", electronicApprovalId);
        List<DocumentApprovalListItemVO> documents = documentApprovalDAO.selectPinnedRelatedDocumentList(params);
        return documents == null ? Collections.<DocumentApprovalListItemVO>emptyList() : documents;
    }

    @Override
    @Transactional(readOnly = true)
    public DocumentApprovalWritePageVO<DocumentApprovalListItemVO> searchWriteDocuments(
            LoginVO user, String scope, DocumentApprovalListQueryVO query) throws Exception {
        return loadWriteDocumentPage(user, scope, query);
    }

    @Override
    @Transactional(readOnly = true)
    public DocumentApprovalWritePageVO<DocumentApprovalFeedItemVO> searchWriteFeedDocuments(
            LoginVO user, String scope, DocumentApprovalListQueryVO query) throws Exception {
        DocumentApprovalWritePageVO<DocumentApprovalListItemVO> documentPage =
                loadWriteDocumentPage(user, scope, query);
        DocumentApprovalWritePageVO<DocumentApprovalFeedItemVO> feedPage = new DocumentApprovalWritePageVO<>();
        feedPage.setResultList(buildFeedDocuments(user, documentPage.getResultList()));
        feedPage.setTotalRowCount(documentPage.getTotalRowCount());
        return feedPage;
    }

    private DocumentApprovalWritePageVO<DocumentApprovalListItemVO> loadWriteDocumentPage(
            LoginVO user, String scope, DocumentApprovalListQueryVO query) throws Exception {
        documentApprovalAccessService.validateAuthenticatedUser(user);
        String effectiveScope = scope == null ? "ALL" : scope;
        if (!DOCUMENT_SCOPES.contains(effectiveScope) || query == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "문서 조회 조건이 올바르지 않습니다.");
        }

        String documentType = normalizeText(query.getDocumentType());
        Long electronicApprovalId = query.getElectronicApprovalId();
        if ((documentType != null && !DOCUMENT_TYPES.contains(documentType))
                || (electronicApprovalId != null && electronicApprovalId <= 0)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "문서 조회 조건이 올바르지 않습니다.");
        }

        int offset = query.getOffset() == null ? 0 : query.getOffset();
        int limit = query.getLimit() == null ? 20 : query.getLimit();
        if (offset < 0 || limit < 1 || limit > 20) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "문서 조회 범위가 올바르지 않습니다.");
        }

        Map<String, Object> params = documentApprovalAccessService.actorParams(user);
        params.put("userId", documentApprovalAccessService.authenticatedUserId(user));
        params.put("scope", effectiveScope);
        params.put("documentType", documentType);
        params.put("electronicApprovalId", electronicApprovalId);
        params.put("offset", offset);
        params.put("limit", limit);

        List<DocumentApprovalListItemVO> resultList =
                documentApprovalDAO.selectRelatedDocumentWritePage(params);
        Long totalRowCount = documentApprovalDAO.countRelatedWriteDocuments(params);
        if (resultList == null || totalRowCount == null) {
            throw new IllegalStateException("전자결재 문서 페이지 조회 결과를 확인할 수 없습니다.");
        }

        DocumentApprovalWritePageVO<DocumentApprovalListItemVO> page = new DocumentApprovalWritePageVO<>();
        page.setResultList(resultList);
        page.setTotalRowCount(totalRowCount);
        return page;
    }

    @Override
    @Transactional(readOnly = true)
    public List<DocumentApprovalFeedItemVO> listFeedDocuments(LoginVO user, String scope, String documentType,
            Long electronicApprovalId) throws Exception {
        List<DocumentApprovalListItemVO> documents = listDocuments(user, scope, documentType, electronicApprovalId);
        return buildFeedDocuments(user, documents);
    }

    @Override
    @Transactional(readOnly = true)
    public List<DocumentApprovalFeedItemVO> listPinnedFeedDocuments(LoginVO user, String scope, String documentType,
            Long electronicApprovalId) throws Exception {
        List<DocumentApprovalListItemVO> documents = listPinnedDocuments(user, scope, documentType, electronicApprovalId);
        return buildFeedDocuments(user, documents);
    }

    private List<DocumentApprovalFeedItemVO> buildFeedDocuments(LoginVO user, List<DocumentApprovalListItemVO> documents)
            throws Exception {
        if (documents == null || documents.isEmpty()) {
            return Collections.emptyList();
        }

        Set<Long> distinctApprovalIds = new LinkedHashSet<>();
        for (DocumentApprovalListItemVO listItem : documents) {
            if (listItem != null) {
                if (listItem.getElectronicApprovalId() == null) {
                    throw new IllegalStateException("전자결재 목록 항목에 문서 ID가 없습니다.");
                }
                distinctApprovalIds.add(listItem.getElectronicApprovalId());
            }
        }
        if (distinctApprovalIds.isEmpty()) {
            return Collections.emptyList();
        }
        List<Long> approvalIds = new ArrayList<>(distinctApprovalIds);
        Map<String, Object> detailParams = documentApprovalAccessService.actorParams(user);
        detailParams.put("participantUserId", user.getUniqId());
        detailParams.put("ownerIds", approvalIds);
        List<DocumentApprovalDetailVO> details = documentApprovalDAO.selectDocumentApprovalDetailsByIds(detailParams);
        Map<Long, DocumentApprovalDetailVO> detailsByApprovalId = new HashMap<>();
        if (details != null) {
            for (DocumentApprovalDetailVO detail : details) {
                if (detail != null && detail.getElectronicApprovalId() != null) {
                    detailsByApprovalId.put(detail.getElectronicApprovalId(), detail);
                }
            }
        }
        for (Long approvalId : approvalIds) {
            if (!detailsByApprovalId.containsKey(approvalId)) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "문서를 찾을 수 없습니다.");
            }
        }

        Map<String, Object> lineParams = new HashMap<>();
        lineParams.put("tenantId", user.getTenantId());
        lineParams.put("ownerIds", approvalIds);
        List<DocumentApprovalLineBatchVO> batchLines =
            documentApprovalDAO.selectApprovalLinesByOwnerIds(lineParams);
        Map<Long, List<DocumentApprovalLineVO>> approvalLinesByApprovalId = new HashMap<>();
        if (batchLines != null) {
            for (DocumentApprovalLineBatchVO batchLine : batchLines) {
                if (batchLine == null || batchLine.getElectronicApprovalId() == null) {
                    continue;
                }
                approvalLinesByApprovalId.computeIfAbsent(
                    batchLine.getElectronicApprovalId(), key -> new ArrayList<>())
                    .add(copyApprovalLine(batchLine));
            }
        }

        Map<Long, List<CommonFileVO>> attachmentsByApprovalId =
                commonFileService.listFilesByOwnerIds(user.getTenantId(), OWNER_TYPE, approvalIds);
        Map<Long, DocumentApprovalCommentPageVO> commentPagesByApprovalId =
            commentSupportService.listApprovalCommentStreamPagesByOwnerIds(user, approvalIds, 3, null);

        List<DocumentApprovalFeedItemVO> feedItems = new ArrayList<>();
        for (DocumentApprovalListItemVO listItem : documents) {
            if (listItem == null) {
                continue;
            }
            Long approvalId = listItem.getElectronicApprovalId();
            DocumentApprovalDetailVO detail = detailsByApprovalId.get(approvalId);
            if (detail == null) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "문서를 찾을 수 없습니다.");
            }
            DocumentApprovalCommentPageVO commentPage = commentPagesByApprovalId.get(approvalId);
            if (commentPage == null) {
                throw new IllegalStateException("전자결재 댓글 페이지 조회 결과가 없습니다.");
            }

            DocumentApprovalFeedItemVO feedItem = new DocumentApprovalFeedItemVO();
            feedItem.setElectronicApprovalId(listItem.getElectronicApprovalId());
            feedItem.setDocumentNo(listItem.getDocumentNo());
            feedItem.setEabusNo(listItem.getEabusNo());
            feedItem.setDocumentType(listItem.getDocumentType());
            feedItem.setDocumentStatus(listItem.getDocumentStatus());
            feedItem.setTitle(listItem.getTitle());
            feedItem.setDrafterName(listItem.getDrafterName());
            feedItem.setCreatedAt(listItem.getCreatedAt());
            feedItem.setUpdatedAt(listItem.getUpdatedAt());
            feedItem.setSubmittedAt(listItem.getSubmittedAt());
            feedItem.setSummary(listItem.getSummary());
            feedItem.setNoticeType(listItem.getNoticeType());
            feedItem.setDraftingWorkCategoryId(detail.getDraftingWorkCategoryId());
            feedItem.setContentsJson(detail.getContentsJson());
            feedItem.setContentsHtml(detail.getContentsHtml());
            feedItem.setContentsText(detail.getContentsText());
            feedItem.setDrafterProfileImage(detail.getDrafterProfileImage());
            feedItem.setViewCount(detail.getViewCount());
            feedItem.setDrafter(detail.isDrafter());
            feedItem.setApprovalLines(approvalLinesByApprovalId.getOrDefault(
                approvalId, Collections.emptyList()));
            feedItem.setAttachments(attachmentsByApprovalId.getOrDefault(approvalId, Collections.emptyList()));
            feedItem.setSystemEvents(commentPage.getSystemEvents());
            feedItem.setComments(commentPage.getComments());
            feedItem.setCommentCount(commentPage.getResultCnt());
            feedItem.setHasPreviousComments(commentPage.isHasPrevious());
            feedItem.setNextBeforeCommentId(commentPage.getNextBeforeCommentId());
            feedItems.add(feedItem);
        }

        return feedItems;
    }

    private DocumentApprovalLineVO copyApprovalLine(DocumentApprovalLineBatchVO batchLine) {
        DocumentApprovalLineVO line = new DocumentApprovalLineVO();
        line.setElectronicApprovalLineId(batchLine.getElectronicApprovalLineId());
        line.setStageOrder(batchLine.getStageOrder());
        line.setParticipantOrder(batchLine.getParticipantOrder());
        line.setParticipantType(batchLine.getParticipantType());
        line.setParticipantUserId(batchLine.getParticipantUserId());
        line.setParticipantName(batchLine.getParticipantName());
        line.setParticipantDepartmentName(batchLine.getParticipantDepartmentName());
        line.setParticipantProfileImage(batchLine.getParticipantProfileImage());
        line.setParticipantStampImage(batchLine.getParticipantStampImage());
        line.setActionStatus(batchLine.getActionStatus());
        line.setPendingAt(batchLine.getPendingAt());
        line.setActionAt(batchLine.getActionAt());
        line.setActionComment(batchLine.getActionComment());
        return line;
    }

    @Override
    @Transactional(readOnly = true)
    public DocumentApprovalSummaryVO getSummary(LoginVO user) throws Exception {
        documentApprovalAccessService.validateAuthenticatedUser(user);
        Map<String, Object> params = documentApprovalAccessService.actorParams(user);
        DocumentApprovalSummaryVO summary = documentApprovalDAO.selectDocumentApprovalSummary(params);
        if (summary == null) {
            throw new IllegalStateException("전자결재 요약을 조회할 수 없습니다.");
        }
        List<DocumentApprovalListItemVO> notices = documentApprovalDAO.selectApprovalNotices(params);
        summary.setNotices(notices == null ? Collections.<DocumentApprovalListItemVO>emptyList() : notices);
        return summary;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public EmbeddedImageUploadVO uploadTemporaryEmbeddedImage(LoginVO user, MultipartFile file) throws Exception {
        documentApprovalAccessService.validateAuthenticatedUser(user);
        return imageStorageService.uploadTemporaryImage(user.getTenantId(), file);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void deleteTemporaryEmbeddedImage(LoginVO user, String uploadToken, String fileName) throws Exception {
        documentApprovalAccessService.validateAuthenticatedUser(user);
        imageStorageService.deleteTemporaryImage(user.getTenantId(), uploadToken, fileName);
    }

    private DocumentApprovalPinStateVO pinState(Long electronicApprovalId, boolean pinned) {
        DocumentApprovalPinStateVO state = new DocumentApprovalPinStateVO();
        state.setElectronicApprovalId(electronicApprovalId);
        state.setPinned(pinned);
        return state;
    }

    private String normalizeText(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        return value.trim();
    }
}

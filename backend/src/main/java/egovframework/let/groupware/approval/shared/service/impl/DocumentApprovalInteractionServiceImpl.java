package egovframework.let.groupware.approval.shared.service.impl;

import egovframework.let.groupware.approval.common.service.DocumentApprovalAccessService;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalFileItemVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalFilePageVO;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import javax.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import egovframework.com.cmm.LoginVO;
import egovframework.com.common.domain.model.CommonFileVO;
import egovframework.com.common.domain.model.CommonCommentVO;
import egovframework.com.common.domain.repository.CommonCommentDAO;
import egovframework.com.common.service.EmbeddedImageDocumentProcessor;
import egovframework.com.common.service.EmbeddedImageStorageService;
import egovframework.com.common.service.CommonFileService;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalDraftSaveRequestVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalDraftVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalActionRequestVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalCommentPageVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalDetailVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalLineVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalParticipantVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalWorkflowDocumentVO;
import egovframework.let.groupware.approval.domain.repository.DocumentApprovalDAO;
import egovframework.let.groupware.approval.shared.service.DocumentApprovalInteractionService;
import egovframework.let.groupware.approval.common.service.DocumentApprovalDraftSupportService;
import egovframework.let.groupware.approval.common.service.DocumentApprovalCommentSupportService;

@Service("documentApprovalInteractionService")
public class DocumentApprovalInteractionServiceImpl extends EgovAbstractServiceImpl
        implements DocumentApprovalInteractionService {

    private static final String OWNER_TYPE = "APPROVAL";
    private static final String COMMENT_FILE_OWNER_TYPE = "APPROVAL_COMMENT";
    private static final String USER_COMMENT_TYPE = "USER";
    private static final String SYSTEM_COMMENT_TYPE = "SYSTEM";
    private static final Set<String> DOCUMENT_TYPES = Collections.unmodifiableSet(new HashSet<>(Arrays.asList(
            "DRAFTING", "BUSINESS_CONTACT", "EXPENSE_RESOLUTION", "ATTENDANCE_APPLICATION")));
    private static final Set<String> DOCUMENT_SCOPES = Collections.unmodifiableSet(new HashSet<>(Arrays.asList(
            "ALL", "MY_PENDING", "IN_PROGRESS", "DRAFT", "COMPLETED", "REVISION_REQUESTED", "REJECTED")));
    private final DocumentApprovalDAO documentApprovalDAO;
    private final CommonCommentDAO commonCommentDAO;
    private final CommonFileService commonFileService;
    private final EmbeddedImageStorageService imageStorageService;
    private final DocumentApprovalAccessService documentApprovalAccessService;
    private final DocumentApprovalDraftSupportService draftSupportService;
    private final DocumentApprovalCommentSupportService commentSupportService;
    public DocumentApprovalInteractionServiceImpl(DocumentApprovalDAO documentApprovalDAO, CommonCommentDAO commonCommentDAO,
            CommonFileService commonFileService, EmbeddedImageStorageService imageStorageService,
            DocumentApprovalAccessService documentApprovalAccessService,
            DocumentApprovalDraftSupportService draftSupportService,
            DocumentApprovalCommentSupportService commentSupportService) {
        this.documentApprovalDAO = documentApprovalDAO;
        this.commonCommentDAO = commonCommentDAO;
        this.commonFileService = commonFileService;
        this.imageStorageService = imageStorageService;
        this.documentApprovalAccessService = documentApprovalAccessService;
        this.draftSupportService = draftSupportService;
        this.commentSupportService = commentSupportService;
    }

    @Override
    @Transactional(readOnly = true)
    public DocumentApprovalFilePageVO listFiles(LoginVO user, String scope, String documentType,
            Long electronicApprovalId, Long beforeFileId) throws Exception {
        documentApprovalAccessService.validateAuthenticatedUser(user);
        String effectiveScope = scope == null ? "ALL" : scope;
        if (!DOCUMENT_SCOPES.contains(effectiveScope)
                || (documentType != null && !DOCUMENT_TYPES.contains(documentType))
                || (electronicApprovalId != null && (electronicApprovalId <= 0 || electronicApprovalId > 9007199254740991L))
                || (beforeFileId != null && (beforeFileId <= 0 || beforeFileId > 9007199254740991L))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "파일 조회 조건이 올바르지 않습니다.");
        }
        Map<String, Object> params = documentApprovalAccessService.actorParams(user);
        params.remove("documentStatus");
        params.put("scope", effectiveScope);
        params.put("documentType", documentType);
        params.put("electronicApprovalId", electronicApprovalId);
        params.put("beforeFileId", beforeFileId);
        if (beforeFileId != null && documentApprovalDAO.selectRelatedFileCursor(params) == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "파일 목록이 변경되었습니다. 목록을 새로고침해 주세요.");
        }
        List<DocumentApprovalFileItemVO> files = documentApprovalDAO.selectRelatedFilePage(params);
        if (files == null) {
            throw new IllegalStateException("전자결재 파일 조회 결과를 확인할 수 없습니다.");
        }
        boolean hasNext = files.size() > 20;
        List<DocumentApprovalFileItemVO> visible = new ArrayList<>(files.subList(0, Math.min(20, files.size())));
        DocumentApprovalFilePageVO page = new DocumentApprovalFilePageVO();
        page.setResultList(visible);
        page.setHasNext(hasNext);
        page.setNextBeforeFileId(hasNext ? visible.get(19).getFileId() : null);
        return page;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public DocumentApprovalDraftVO submit(LoginVO user, Long electronicApprovalId,
            DocumentApprovalDraftSaveRequestVO request) throws Exception {
        documentApprovalAccessService.validateAuthenticatedUser(user);
        draftSupportService.validateDraftRequest(request);
        if (electronicApprovalId == null || electronicApprovalId <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "문서 ID가 올바르지 않습니다.");
        }

        Map<String, Object> params = documentApprovalAccessService.actorParams(user);
        params.put("electronicApprovalId", electronicApprovalId);
        DocumentApprovalWorkflowDocumentVO document =
                documentApprovalDAO.selectDocumentApprovalForUpdate(params);
        if (document == null || !user.getId().equals(document.getDrafterId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "결재신청할 문서를 찾을 수 없습니다.");
        }
        String previousStatus = document.getDocumentStatus();
        if (!"DRAFT".equals(previousStatus) && !"REVISION_REQUESTED".equals(previousStatus)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "현재 상태에서는 결재신청할 수 없습니다.");
        }

        draftSupportService.validateCategory(request.getDraftingWorkCategoryId(), user.getTenantId());
        boolean businessContact = "BUSINESS_CONTACT".equals(request.getDocumentType().trim());
        Map<String, DocumentApprovalParticipantVO> participants = draftSupportService.validateParticipants(request, user);
        if (businessContact) {
            if (request.getApprovalLines().isEmpty()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "발송할 참조자를 선택해 주세요.");
            }
        } else {
            draftSupportService.validateSubmissionLines(request.getApprovalLines(), user);
        }

        Map<String, Object> documentParams = draftSupportService.documentParams(user, request, params);
        EmbeddedImageDocumentProcessor.Result imageSave = draftSupportService.processEmbeddedImages(user, electronicApprovalId, request);
        draftSupportService.applyProcessedBody(documentParams, imageSave);
        if (documentApprovalDAO.updateDocumentApprovalMain(documentParams) != 1) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "문서가 변경되어 결재신청할 수 없습니다.");
        }

        if (businessContact) {
            draftSupportService.replaceApprovalLines(user, electronicApprovalId, request.getApprovalLines(), participants);
        } else {
            draftSupportService.replaceApprovalLinesForSubmission(user, electronicApprovalId, request.getApprovalLines(), participants);
        }
        Map<String, Object> statusParams = new HashMap<>(params);
        statusParams.put("expectedDocumentStatus", previousStatus);
        statusParams.put("nextDocumentStatus", businessContact ? "COMPLETED" : "PENDING");
        statusParams.put("actorId", user.getId());
        if (documentApprovalDAO.updateDocumentApprovalStatus(statusParams) != 1) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "문서 상태가 변경되어 결재신청할 수 없습니다.");
        }

        String eventType = businessContact ? "COMPLETED"
                : "REVISION_REQUESTED".equals(previousStatus) ? "RESUBMITTED" : "SUBMITTED";
        draftSupportService.insertSystemEvent(user, electronicApprovalId, eventType,
                businessContact ? "업무연락이 발송되었습니다."
                    : "RESUBMITTED".equals(eventType) ? "문서가 재상신되었습니다." : "문서가 결재신청되었습니다.");
        imageStorageService.completeOwnerSave(user.getTenantId(), OWNER_TYPE, electronicApprovalId,
                draftSupportService.toStorageUploads(request.getTemporaryImages()), imageSave.getRetainedFileIds());
        return draftSupportService.persistedDraftResponse(user, electronicApprovalId);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public DocumentApprovalDraftVO processAction(LoginVO user, Long electronicApprovalId,
            DocumentApprovalActionRequestVO request) throws Exception {
        documentApprovalAccessService.validateAuthenticatedUser(user);
        if (electronicApprovalId == null || electronicApprovalId <= 0 || request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "결재 처리 정보가 올바르지 않습니다.");
        }
        String action = request.getAction();
        if (!"APPROVED".equals(action) && !"REJECTED".equals(action) && !"RETURNED".equals(action)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "지원하지 않는 결재 처리입니다.");
        }
        String actionComment = request.getActionComment() == null ? null : request.getActionComment().trim();
        if (("REJECTED".equals(action) || "RETURNED".equals(action)) && !StringUtils.hasText(actionComment)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "반려 또는 보완요청 사유를 입력해 주세요.");
        }
        if (!StringUtils.hasText(actionComment)) {
            actionComment = null;
        }

        Map<String, Object> params = documentApprovalAccessService.actorParams(user);
        params.put("electronicApprovalId", electronicApprovalId);
        DocumentApprovalWorkflowDocumentVO document =
                documentApprovalDAO.selectDocumentApprovalForUpdate(params);
        if (document == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "결재 문서를 찾을 수 없습니다.");
        }
        String previousStatus = document.getDocumentStatus();
        if (!"PENDING".equals(previousStatus) && !"IN_PROGRESS".equals(previousStatus)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "현재 상태에서는 결재 처리할 수 없습니다.");
        }

        params.put("participantUserId", user.getUniqId());
        DocumentApprovalLineVO currentLine = documentApprovalDAO.selectCurrentPendingApprovalLine(params);
        if (currentLine == null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "현재 처리할 수 있는 결재선이 없습니다.");
        }

        Map<String, Object> lineParams = new HashMap<>(params);
        lineParams.put("electronicApprovalLineId", currentLine.getElectronicApprovalLineId());
        lineParams.put("participantUserId", user.getUniqId());
        lineParams.put("actionStatus", action);
        lineParams.put("actionComment", actionComment);
        if (documentApprovalDAO.updateApprovalLineAction(lineParams) != 1) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "결재선이 변경되어 처리할 수 없습니다.");
        }

        String nextStatus;
        boolean completed = false;
        if ("REJECTED".equals(action)) {
            nextStatus = "REJECTED";
        } else if ("RETURNED".equals(action)) {
            nextStatus = "REVISION_REQUESTED";
        } else {
            Map<String, Object> stageParams = new HashMap<>(params);
            stageParams.put("stageOrder", currentLine.getStageOrder());
            Long pendingCount = documentApprovalDAO.selectPendingApprovalCountForStage(stageParams);
            if (pendingCount == null) {
                throw new IllegalStateException("현재 결재 단계 정보를 확인할 수 없습니다.");
            }
            if (pendingCount > 0) {
                nextStatus = "IN_PROGRESS";
            } else {
                Integer nextStage = documentApprovalDAO.selectNextWaitingApprovalStage(params);
                if (nextStage == null) {
                    nextStatus = "COMPLETED";
                    completed = true;
                } else {
                    stageParams.put("stageOrder", nextStage);
                    if (documentApprovalDAO.activateApprovalStage(stageParams) <= 0) {
                        throw new ResponseStatusException(HttpStatus.CONFLICT, "다음 결재 단계를 활성화할 수 없습니다.");
                    }
                    nextStatus = "IN_PROGRESS";
                }
            }
        }

        Map<String, Object> statusParams = new HashMap<>(params);
        statusParams.put("expectedDocumentStatus", previousStatus);
        statusParams.put("nextDocumentStatus", nextStatus);
        statusParams.put("actorId", user.getId());
        if (documentApprovalDAO.updateDocumentApprovalStatus(statusParams) != 1) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "문서 상태가 변경되어 처리할 수 없습니다.");
        }

        String actionText = "APPROVED".equals(action) ? "문서가 승인되었습니다."
                : "REJECTED".equals(action) ? "문서가 반려되었습니다." : "문서 보완이 요청되었습니다.";
        draftSupportService.insertSystemEvent(user, electronicApprovalId, action,
                StringUtils.hasText(actionComment) ? actionText + " 사유: " + actionComment : actionText);
        if (completed) {
            draftSupportService.insertSystemEvent(user, electronicApprovalId, "COMPLETED", "문서 결재가 완료되었습니다.");
        }
        return draftSupportService.workflowResponse(electronicApprovalId, nextStatus);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public DocumentApprovalDraftVO cancelSubmission(LoginVO user, Long electronicApprovalId) throws Exception {
        documentApprovalAccessService.validateAuthenticatedUser(user);
        if (electronicApprovalId == null || electronicApprovalId <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "문서 ID가 올바르지 않습니다.");
        }

        Map<String, Object> params = documentApprovalAccessService.actorParams(user);
        params.put("electronicApprovalId", electronicApprovalId);
        DocumentApprovalWorkflowDocumentVO document =
                documentApprovalDAO.selectDocumentApprovalForUpdate(params);
        if (document == null || !user.getId().equals(document.getDrafterId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "결재신청할 문서를 찾을 수 없습니다.");
        }
        if (!"PENDING".equals(document.getDocumentStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "현재 상태에서는 결재신청을 취소할 수 없습니다.");
        }

        Map<String, Object> documentParams = new HashMap<>(params);
        documentParams.put("actorId", user.getId());
        if (documentApprovalDAO.resetSubmittedDocumentToDraft(documentParams) != 1
                || documentApprovalDAO.resetSubmittedApprovalLines(params) <= 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "문서 상태가 변경되어 결재신청을 취소할 수 없습니다.");
        }
        draftSupportService.insertSystemEvent(user, electronicApprovalId, "SUBMISSION_CANCELED", "결재신청이 취소되었습니다.");
        return draftSupportService.workflowResponse(electronicApprovalId, "DRAFT");
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public DocumentApprovalDraftVO cancelApproval(LoginVO user, Long electronicApprovalId) throws Exception {
        documentApprovalAccessService.validateAuthenticatedUser(user);
        if (electronicApprovalId == null || electronicApprovalId <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "문서 ID가 올바르지 않습니다.");
        }

        Map<String, Object> params = documentApprovalAccessService.actorParams(user);
        params.put("electronicApprovalId", electronicApprovalId);
        params.put("participantUserId", user.getUniqId());
        DocumentApprovalWorkflowDocumentVO document =
                documentApprovalDAO.selectDocumentApprovalForUpdate(params);
        if (document == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "결재 문서를 찾을 수 없습니다.");
        }
        String previousStatus = document.getDocumentStatus();
        if (!"PENDING".equals(previousStatus) && !"IN_PROGRESS".equals(previousStatus)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "현재 상태에서는 승인을 취소할 수 없습니다.");
        }

        DocumentApprovalLineVO approvedLine =
                documentApprovalDAO.selectUserApprovedApprovalLineForUpdate(params);
        if (approvedLine == null || approvedLine.getStageOrder() == null
                || approvedLine.getStageOrder() <= 1) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "취소할 본인의 승인 결재선이 없습니다.");
        }
        params.put("stageOrder", approvedLine.getStageOrder());
        if (!Boolean.FALSE.equals(documentApprovalDAO.selectProcessedLaterApprovalStage(params))) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "다음 결재 단계가 처리되어 승인을 취소할 수 없습니다.");
        }

        Map<String, Object> lineParams = new HashMap<>(params);
        lineParams.put("electronicApprovalLineId", approvedLine.getElectronicApprovalLineId());
        if (documentApprovalDAO.resetApprovalLineToPending(lineParams) != 1) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "결재선이 변경되어 승인을 취소할 수 없습니다.");
        }
        documentApprovalDAO.resetUntouchedLaterApprovalStages(params);

        Long processedCount = documentApprovalDAO.countProcessedApprovalLines(params);
        if (processedCount == null) {
            throw new IllegalStateException("남은 결재 처리 상태를 확인할 수 없습니다.");
        }
        String nextStatus = processedCount > 0 ? "IN_PROGRESS" : "PENDING";
        Map<String, Object> statusParams = new HashMap<>(params);
        statusParams.put("expectedDocumentStatus", previousStatus);
        statusParams.put("nextDocumentStatus", nextStatus);
        statusParams.put("actorId", user.getId());
        if (documentApprovalDAO.updateDocumentApprovalStatus(statusParams) != 1) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "문서 상태가 변경되어 승인을 취소할 수 없습니다.");
        }
        draftSupportService.insertSystemEvent(user, electronicApprovalId, "APPROVAL_CANCELED", "결재 승인이 취소되었습니다.");
        return draftSupportService.workflowResponse(electronicApprovalId, nextStatus);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public DocumentApprovalDetailVO getDetail(LoginVO user, Long electronicApprovalId) throws Exception {
        documentApprovalAccessService.validateAuthenticatedUser(user);
        if (electronicApprovalId == null || electronicApprovalId <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "문서 ID가 올바르지 않습니다.");
        }
        Map<String, Object> params = documentApprovalAccessService.actorParams(user);
        params.put("electronicApprovalId", electronicApprovalId);
        DocumentApprovalDetailVO detail = documentApprovalDAO.selectDocumentApprovalDetail(params);
        if (detail == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "문서를 찾을 수 없습니다.");
        }

        Map<String, Object> loginParams = new HashMap<>();
        loginParams.put("tenantId", user.getTenantId());
        loginParams.put("loginCode", user.getId());
        Long loginId = documentApprovalDAO.selectLoginIdByLoginCode(loginParams);
        if (loginId == null) {
            throw new IllegalStateException("인증된 로그인 계정을 찾을 수 없습니다.");
        }

        Map<String, Object> viewParams = new HashMap<>();
        viewParams.put("tenantId", user.getTenantId());
        viewParams.put("electronicApprovalId", electronicApprovalId);
        viewParams.put("loginId", loginId);
        Long viewHistoryId = documentApprovalDAO.insertElectronicApprovalViewHistory(viewParams);
        if (viewHistoryId != null
                && documentApprovalDAO.incrementElectronicApprovalViewCount(viewParams) != 1) {
            throw new IllegalStateException("전자결재 문서 조회수를 갱신할 수 없습니다.");
        }

        detail = documentApprovalDAO.selectDocumentApprovalDetail(params);
        if (detail == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "문서를 찾을 수 없습니다.");
        }
        detail.setAttachments(commonFileService.listFiles(user.getTenantId(), OWNER_TYPE, electronicApprovalId));
        detail.setApprovalLines(documentApprovalDAO.selectApprovalLines(params));
        Map<String, Object> commentParams = new HashMap<>();
        commentParams.put("tenantId", user.getTenantId());
        commentParams.put("ownerId", electronicApprovalId);
        List<CommonCommentVO> events = commonCommentDAO.selectApprovalSystemEvents(commentParams);
        detail.setSystemEvents(events == null ? Collections.<CommonCommentVO>emptyList() : events);
        return detail;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void deleteDocumentApproval(LoginVO user, Long electronicApprovalId) throws Exception {
        documentApprovalAccessService.validateAuthenticatedUser(user);
        if (electronicApprovalId == null || electronicApprovalId <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "문서 ID가 올바르지 않습니다.");
        }
        Map<String, Object> params = documentApprovalAccessService.actorParams(user);
        params.put("electronicApprovalId", electronicApprovalId);
        params.put("participantUserId", user.getUniqId());
        DocumentApprovalWorkflowDocumentVO document =
                documentApprovalDAO.selectDocumentApprovalForUpdate(params);
        if (document == null || !user.getId().equals(document.getDrafterId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "삭제할 문서를 찾을 수 없습니다.");
        }
        boolean canDelete = "DRAFT".equals(document.getDocumentStatus())
                || ("PENDING".equals(document.getDocumentStatus())
                        && Boolean.TRUE.equals(
                                documentApprovalDAO.selectCanDeletePendingDocumentApproval(params)));
        if (!canDelete) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "현재 상태에서는 문서를 삭제할 수 없습니다.");
        }
        params.put("actorId", user.getId());
        if (documentApprovalDAO.softDeleteDocumentApproval(params) != 1) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "문서 상태가 변경되어 삭제할 수 없습니다.");
        }
        draftSupportService.insertSystemEvent(user, electronicApprovalId, "DELETED", "문서가 삭제되었습니다.");
    }

    @Override
    @Transactional(readOnly = true)
    public DocumentApprovalCommentPageVO listApprovalComments(LoginVO user, Long electronicApprovalId,
            Integer limit, Long beforeCommentId) throws Exception {
        documentApprovalAccessService.requireRelatedDocument(user, electronicApprovalId);
        int safeLimit = limit == null ? 3 : limit;
        if (safeLimit < 1 || safeLimit > 100 || (beforeCommentId != null && beforeCommentId <= 0)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "댓글 조회 조건이 올바르지 않습니다.");
        }

        if (beforeCommentId != null) {
            Map<String, Object> cursorParams =
                commentSupportService.approvalCommentParams(user, electronicApprovalId, beforeCommentId);
            if (commonCommentDAO.selectApprovalCommentStreamCursor(cursorParams) == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "댓글 조회 cursor가 올바르지 않습니다.");
            }
        }

        DocumentApprovalCommentPageVO page = commentSupportService.listApprovalCommentStreamPagesByOwnerIds(
            user, Collections.singletonList(electronicApprovalId), safeLimit, beforeCommentId)
            .get(electronicApprovalId);
        if (page == null) {
            throw new IllegalStateException("전자결재 댓글 페이지 조회 결과가 없습니다.");
        }
        return page;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public CommonCommentVO createApprovalComment(LoginVO user, Long electronicApprovalId,
            String content, Long parentCommentId) throws Exception {
        documentApprovalAccessService.requireRelatedDocument(user, electronicApprovalId);
        String normalizedContent = normalizeApprovalCommentContent(content);
        if (parentCommentId != null) {
            if (parentCommentId <= 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "상위 댓글 ID가 올바르지 않습니다.");
            }
            CommonCommentVO parent = commonCommentDAO.selectApprovalUserCommentById(
                    commentSupportService.approvalCommentParams(user, electronicApprovalId, parentCommentId));
            if (parent == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "상위 댓글을 찾을 수 없습니다.");
            }
        }

        Map<String, Object> params = commentSupportService.approvalCommentParams(user, electronicApprovalId, null);
        params.put("parentCommentId", parentCommentId);
        params.put("content", normalizedContent);
        params.put("commentType", USER_COMMENT_TYPE);
        params.put("writerId", user.getId());
        params.put("writerName", user.getName());
        params.put("deletedYn", "N");
        Long commentId = commonCommentDAO.insertCommonComment(params);
        if (commentId == null) {
            throw new IllegalStateException("등록된 댓글 ID를 확인할 수 없습니다.");
        }
        CommonCommentVO created = commonCommentDAO.selectApprovalUserCommentById(
                commentSupportService.approvalCommentParams(user, electronicApprovalId, commentId));
        if (created == null) {
            throw new IllegalStateException("등록된 댓글을 다시 조회할 수 없습니다.");
        }
        return created;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public CommonCommentVO updateApprovalComment(LoginVO user, Long electronicApprovalId,
            Long commentId, String content) throws Exception {
        CommonCommentVO comment = requireApprovalUserComment(user, electronicApprovalId, commentId);
        requireApprovalCommentAuthor(user, comment);
        String normalizedContent = normalizeApprovalCommentContent(content);
        Map<String, Object> params = commentSupportService.approvalCommentParams(user, electronicApprovalId, commentId);
        params.put("content", normalizedContent);
        params.put("actorId", user.getId());
        params.put("actorName", user.getName());
        if (commonCommentDAO.updateApprovalUserComment(params) != 1) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "댓글을 찾을 수 없습니다.");
        }
        comment.setContent(normalizedContent);
        comment.setLastModifiedBy(user.getId());
        comment.setLastModifiedByName(user.getName());
        return comment;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void deleteApprovalComment(LoginVO user, Long electronicApprovalId, Long commentId) throws Exception {
        CommonCommentVO comment = requireApprovalUserComment(user, electronicApprovalId, commentId);
        requireApprovalCommentAuthor(user, comment);
        Map<String, Object> params = commentSupportService.approvalCommentParams(user, electronicApprovalId, commentId);
        params.put("actorId", user.getId());
        params.put("actorName", user.getName());
        if (commonCommentDAO.softDeleteApprovalUserComment(params) != 1) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "댓글을 찾을 수 없습니다.");
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<CommonFileVO> listApprovalCommentAttachments(LoginVO user, Long electronicApprovalId,
            Long commentId) throws Exception {
        requireApprovalUserComment(user, electronicApprovalId, commentId);
        return listOwnedApprovalCommentFiles(user, commentId);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public CommonFileVO uploadApprovalCommentAttachment(LoginVO user, Long electronicApprovalId,
            Long commentId, MultipartFile file) throws Exception {
        CommonCommentVO comment = requireApprovalUserComment(user, electronicApprovalId, commentId);
        requireApprovalCommentAuthor(user, comment);
        return commonFileService.uploadFile(
                user.getTenantId(), COMMENT_FILE_OWNER_TYPE, commentId, file, user.getId());
    }

    @Override
    @Transactional(readOnly = true)
    public void downloadApprovalCommentAttachment(LoginVO user, Long electronicApprovalId,
            Long commentId, Long fileId, HttpServletResponse response) throws Exception {
        requireApprovalUserComment(user, electronicApprovalId, commentId);
        requireOwnedApprovalCommentFile(user, commentId, fileId);
        commonFileService.downloadFile(user.getTenantId(), COMMENT_FILE_OWNER_TYPE, commentId, fileId, response);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void deleteApprovalCommentAttachment(LoginVO user, Long electronicApprovalId,
            Long commentId, Long fileId) throws Exception {
        CommonCommentVO comment = requireApprovalUserComment(user, electronicApprovalId, commentId);
        requireApprovalCommentAuthor(user, comment);
        requireOwnedApprovalCommentFile(user, commentId, fileId);
        commonFileService.deleteFile(user.getTenantId(), COMMENT_FILE_OWNER_TYPE, commentId, fileId);
    }

    @Override
    @Transactional(readOnly = true)
    public void streamEmbeddedImage(LoginVO user, Long electronicApprovalId, Long fileId,
            HttpServletResponse response) throws Exception {
        documentApprovalAccessService.requireRelatedDocument(user, electronicApprovalId);
        imageStorageService.streamOwnedImage(
                user.getTenantId(), OWNER_TYPE, electronicApprovalId, fileId, response);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CommonFileVO> listAttachments(LoginVO user, Long electronicApprovalId) throws Exception {
        documentApprovalAccessService.requireRelatedDocument(user, electronicApprovalId);
        return commonFileService.listFiles(user.getTenantId(), OWNER_TYPE, electronicApprovalId);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public CommonFileVO uploadAttachment(LoginVO user, Long electronicApprovalId, MultipartFile file) throws Exception {
        documentApprovalAccessService.requireDraftOwner(user, electronicApprovalId);
        return commonFileService.uploadFile(user.getTenantId(), OWNER_TYPE, electronicApprovalId, file, user.getId());
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void deleteAttachment(LoginVO user, Long electronicApprovalId, Long fileId) throws Exception {
        documentApprovalAccessService.requireDraftOwner(user, electronicApprovalId);
        List<CommonFileVO> files = commonFileService.listFiles(user.getTenantId(), OWNER_TYPE, electronicApprovalId);
        boolean ownedFileExists = files != null && files.stream()
                .anyMatch(file -> fileId != null && fileId.equals(file.getFileId()));
        if (!ownedFileExists) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "첨부파일을 찾을 수 없습니다.");
        }
        commonFileService.deleteFile(user.getTenantId(), OWNER_TYPE, electronicApprovalId, fileId);
    }

    @Override
    @Transactional(readOnly = true)
    public void downloadAttachment(LoginVO user, Long electronicApprovalId, Long fileId,
            HttpServletResponse response) throws Exception {
        documentApprovalAccessService.requireRelatedDocument(user, electronicApprovalId);
        commonFileService.downloadFile(user.getTenantId(), OWNER_TYPE, electronicApprovalId, fileId, response);
    }

    private CommonCommentVO requireApprovalUserComment(LoginVO user, Long electronicApprovalId,
            Long commentId) throws Exception {
        documentApprovalAccessService.requireRelatedDocument(user, electronicApprovalId);
        if (commentId == null || commentId <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "댓글 ID가 올바르지 않습니다.");
        }
        CommonCommentVO comment = commonCommentDAO.selectApprovalUserCommentById(
                commentSupportService.approvalCommentParams(user, electronicApprovalId, commentId));
        if (comment == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "댓글을 찾을 수 없습니다.");
        }
        return comment;
    }

    private void requireApprovalCommentAuthor(LoginVO user, CommonCommentVO comment) {
        if (!user.getId().equals(comment.getWriterId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "댓글을 찾을 수 없습니다.");
        }
    }

    private String normalizeApprovalCommentContent(String content) {
        String normalizedContent = content == null ? "" : content.trim();
        if (!StringUtils.hasText(normalizedContent)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "댓글 내용을 입력해 주세요.");
        }
        return normalizedContent;
    }

    private List<CommonFileVO> listOwnedApprovalCommentFiles(LoginVO user, Long commentId) throws Exception {
        List<CommonFileVO> files = commonFileService.listFiles(
                user.getTenantId(), COMMENT_FILE_OWNER_TYPE, commentId);
        return files == null ? Collections.<CommonFileVO>emptyList() : files;
    }

    private void requireOwnedApprovalCommentFile(LoginVO user, Long commentId, Long fileId) throws Exception {
        if (fileId == null || fileId <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "첨부파일 ID가 올바르지 않습니다.");
        }
        boolean ownedFileExists = listOwnedApprovalCommentFiles(user, commentId).stream()
                .anyMatch(file -> fileId.equals(file.getFileId())
                        && user.getTenantId().equals(file.getTenantId())
                        && COMMENT_FILE_OWNER_TYPE.equals(file.getOwnerType())
                        && commentId.equals(file.getOwnerId())
                        && "ATTACHMENT".equals(file.getFileUsageType()));
        if (!ownedFileExists) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "첨부파일을 찾을 수 없습니다.");
        }
    }
}

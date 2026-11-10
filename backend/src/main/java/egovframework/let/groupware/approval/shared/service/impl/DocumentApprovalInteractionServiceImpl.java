package egovframework.let.groupware.approval.shared.service.impl;

import egovframework.let.groupware.approval.common.service.DocumentApprovalAccessService;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalFileItemVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalFilePageVO;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
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
import egovframework.let.groupware.approval.domain.model.DocumentApprovalReferenceConfirmationVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalFinalConfirmationVO;
import egovframework.let.groupware.approval.domain.repository.DocumentApprovalDAO;
import egovframework.let.groupware.approval.shared.service.DocumentApprovalInteractionService;
import egovframework.let.groupware.approval.common.service.DocumentApprovalDraftSupportService;
import egovframework.let.groupware.approval.common.service.DocumentApprovalCommentSupportService;
import egovframework.let.groupware.notification.service.NotificationService;

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
    private final NotificationService notificationService;
    public DocumentApprovalInteractionServiceImpl(DocumentApprovalDAO documentApprovalDAO, CommonCommentDAO commonCommentDAO,
            CommonFileService commonFileService, EmbeddedImageStorageService imageStorageService,
            DocumentApprovalAccessService documentApprovalAccessService,
            DocumentApprovalDraftSupportService draftSupportService,
            DocumentApprovalCommentSupportService commentSupportService,
            NotificationService notificationService) {
        this.documentApprovalDAO = documentApprovalDAO;
        this.commonCommentDAO = commonCommentDAO;
        this.commonFileService = commonFileService;
        this.imageStorageService = imageStorageService;
        this.documentApprovalAccessService = documentApprovalAccessService;
        this.draftSupportService = draftSupportService;
        this.commentSupportService = commentSupportService;
        this.notificationService = notificationService;
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
            if ("DRAFTING".equals(request.getDocumentType().trim())) {
                insertFinalConfirmationLine(user, electronicApprovalId, request, participants);
            }
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
        boolean drafterFinalConfirmationRequired = "DRAFTING".equals(document.getDocumentType());

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
        if (drafterFinalConfirmationRequired
                && ("COMPLETED".equals(nextStatus) || "REJECTED".equals(nextStatus))) {
            int activated = documentApprovalDAO.activateFinalConfirmationLine(params);
            if (activated == 0) {
                activated = documentApprovalDAO.insertFinalConfirmationLineForExistingDocument(params);
            }
            if (activated != 1) {
                throw new IllegalStateException("기안자 최종확인 결재선을 활성화할 수 없습니다.");
            }
        }
        if (completed && !drafterFinalConfirmationRequired) {
            draftSupportService.insertSystemEvent(user, electronicApprovalId, "COMPLETED", "문서 결재가 완료되었습니다.");
        }
        return draftSupportService.workflowResponse(electronicApprovalId, nextStatus);
    }

    private void insertFinalConfirmationLine(LoginVO user, Long electronicApprovalId,
            DocumentApprovalDraftSaveRequestVO request,
            Map<String, DocumentApprovalParticipantVO> participants) throws Exception {
        DocumentApprovalParticipantVO drafter = participants.get(user.getUniqId());
        if (drafter == null) {
            throw new IllegalStateException("기안자 최종확인 정보를 확인할 수 없습니다.");
        }
        int lastStageOrder = request.getApprovalLines().stream()
                .mapToInt(DocumentApprovalDraftSaveRequestVO.ApprovalLineVO::getStageOrder)
                .max()
                .orElseThrow(() -> new IllegalStateException("최종확인 순번을 확인할 수 없습니다."));
        Map<String, Object> lineParams = new HashMap<>(documentApprovalAccessService.actorParams(user));
        lineParams.put("electronicApprovalId", electronicApprovalId);
        lineParams.put("stageOrder", Math.addExact(lastStageOrder, 1));
        lineParams.put("participantOrder", 1);
        lineParams.put("participantType", "FINAL_CONFIRMATION");
        lineParams.put("participantUserId", drafter.getUserId());
        lineParams.put("participantName", drafter.getUserName());
        lineParams.put("participantDepartmentName", drafter.getDepartmentName());
        lineParams.put("actionStatus", "WAITING");
        lineParams.put("pendingAt", null);
        lineParams.put("actionAt", null);
        lineParams.put("actionComment", null);
        if (documentApprovalDAO.insertDocumentApprovalLine(lineParams) != 1) {
            throw new IllegalStateException("기안자 최종확인 결재선 생성에 실패했습니다.");
        }
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public DocumentApprovalReferenceConfirmationVO confirmReference(LoginVO user, Long electronicApprovalId)
            throws Exception {
        documentApprovalAccessService.validateAuthenticatedUser(user);
        if (electronicApprovalId == null || electronicApprovalId <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "문서 ID가 올바르지 않습니다.");
        }

        Map<String, Object> params = documentApprovalAccessService.actorParams(user);
        params.put("electronicApprovalId", electronicApprovalId);
        DocumentApprovalWorkflowDocumentVO document =
                documentApprovalDAO.selectDocumentApprovalForUpdate(params);
        if (document == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "결재 문서를 찾을 수 없습니다.");
        }
        if ("DRAFT".equals(document.getDocumentStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "임시저장 문서는 확인할 수 없습니다.");
        }
        if (!"DRAFTING".equals(document.getDocumentType())
                && !"BUSINESS_CONTACT".equals(document.getDocumentType())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "참조 확인을 지원하지 않는 문서 종류입니다.");
        }

        params.put("participantUserId", user.getUniqId());
        DocumentApprovalLineVO referenceLine =
                documentApprovalDAO.selectUserReferenceApprovalLineForUpdate(params);
        if (referenceLine == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "확인할 참조 문서를 찾을 수 없습니다.");
        }
        params.put("electronicApprovalLineId", referenceLine.getElectronicApprovalLineId());
        if ("CONFIRMED".equals(referenceLine.getActionStatus())) {
            return referenceConfirmationResponse(electronicApprovalId, referenceLine);
        }
        if (referenceLine.getActionStatus() != null
                || referenceLine.getPendingAt() != null
                || referenceLine.getActionAt() != null
                || referenceLine.getActionComment() != null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "참조 확인 상태가 변경되어 처리할 수 없습니다.");
        }

        int updatedRows = documentApprovalDAO.confirmReferenceApprovalLine(params);
        if (updatedRows == 0) {
            DocumentApprovalLineVO latestLine = documentApprovalDAO.selectUserReferenceApprovalLine(params);
            if (latestLine != null && "CONFIRMED".equals(latestLine.getActionStatus())) {
                return referenceConfirmationResponse(electronicApprovalId, latestLine);
            }
            throw new ResponseStatusException(HttpStatus.CONFLICT, "참조 확인 상태가 변경되어 처리할 수 없습니다.");
        }
        if (updatedRows != 1) {
            throw new IllegalStateException("참조 확인 처리 건수를 확인할 수 없습니다.");
        }

        DocumentApprovalLineVO confirmedLine = documentApprovalDAO.selectUserReferenceApprovalLine(params);
        if (confirmedLine == null || !"CONFIRMED".equals(confirmedLine.getActionStatus())
                || confirmedLine.getActionAt() == null) {
            throw new IllegalStateException("참조 확인 결과를 확인할 수 없습니다.");
        }
        draftSupportService.insertSystemEvent(user, electronicApprovalId,
                "REFERENCE_CONFIRMED", "문서를 확인했습니다.");
        return referenceConfirmationResponse(electronicApprovalId, confirmedLine);
    }

    private DocumentApprovalReferenceConfirmationVO referenceConfirmationResponse(
            Long electronicApprovalId, DocumentApprovalLineVO line) {
        if (!"CONFIRMED".equals(line.getActionStatus()) || line.getActionAt() == null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "참조 확인 상태가 변경되어 처리할 수 없습니다.");
        }
        DocumentApprovalReferenceConfirmationVO response = new DocumentApprovalReferenceConfirmationVO();
        response.setElectronicApprovalId(electronicApprovalId);
        response.setActionStatus(line.getActionStatus());
        response.setActionAt(line.getActionAt());
        return response;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public DocumentApprovalFinalConfirmationVO confirmFinalConfirmation(LoginVO user, Long electronicApprovalId)
            throws Exception {
        documentApprovalAccessService.validateAuthenticatedUser(user);
        if (electronicApprovalId == null || electronicApprovalId <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "문서 ID가 올바르지 않습니다.");
        }

        Map<String, Object> params = documentApprovalAccessService.actorParams(user);
        params.put("electronicApprovalId", electronicApprovalId);
        DocumentApprovalWorkflowDocumentVO document =
                documentApprovalDAO.selectDocumentApprovalForUpdate(params);
        if (document == null || !user.getId().equals(document.getDrafterId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "최종 확인할 문서를 찾을 수 없습니다.");
        }
        if (!"DRAFTING".equals(document.getDocumentType())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "기안서만 최종 확인할 수 있습니다.");
        }
        if (!"COMPLETED".equals(document.getDocumentStatus())
                && !"REJECTED".equals(document.getDocumentStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "최종 결재가 완료된 문서만 확인할 수 있습니다.");
        }

        params.put("participantUserId", user.getUniqId());
        DocumentApprovalLineVO confirmationLine =
                documentApprovalDAO.selectFinalConfirmationLineForUpdate(params);
        if (confirmationLine == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "최종 확인할 문서를 찾을 수 없습니다.");
        }
        params.put("electronicApprovalLineId", confirmationLine.getElectronicApprovalLineId());
        if ("CONFIRMED".equals(confirmationLine.getActionStatus())) {
            return finalConfirmationResponse(electronicApprovalId, confirmationLine);
        }
        if (!"PENDING".equals(confirmationLine.getActionStatus())
                || confirmationLine.getPendingAt() == null
                || confirmationLine.getActionAt() != null
                || confirmationLine.getActionComment() != null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "최종 확인 대기 상태가 아닙니다.");
        }

        int updatedRows = documentApprovalDAO.confirmFinalConfirmationLine(params);
        if (updatedRows == 0) {
            DocumentApprovalLineVO latestLine = documentApprovalDAO.selectFinalConfirmationLine(params);
            if (latestLine != null && "CONFIRMED".equals(latestLine.getActionStatus())) {
                return finalConfirmationResponse(electronicApprovalId, latestLine);
            }
            throw new ResponseStatusException(HttpStatus.CONFLICT, "최종 확인 상태가 변경되어 처리할 수 없습니다.");
        }
        if (updatedRows != 1) {
            throw new IllegalStateException("기안자 최종 확인 처리 건수를 확인할 수 없습니다.");
        }

        DocumentApprovalLineVO confirmedLine = documentApprovalDAO.selectFinalConfirmationLine(params);
        if (confirmedLine == null || !"CONFIRMED".equals(confirmedLine.getActionStatus())
                || confirmedLine.getPendingAt() == null || confirmedLine.getActionAt() == null) {
            throw new IllegalStateException("기안자 최종 확인 결과를 확인할 수 없습니다.");
        }
        draftSupportService.insertSystemEvent(user, electronicApprovalId,
                "FINAL_CONFIRMATION_CONFIRMED", "기안자가 최종 확인을 완료했습니다.");
        return finalConfirmationResponse(electronicApprovalId, confirmedLine);
    }

    private DocumentApprovalFinalConfirmationVO finalConfirmationResponse(
            Long electronicApprovalId, DocumentApprovalLineVO line) {
        if (!"CONFIRMED".equals(line.getActionStatus()) || line.getActionAt() == null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "최종 확인 상태가 변경되어 처리할 수 없습니다.");
        }
        DocumentApprovalFinalConfirmationVO response = new DocumentApprovalFinalConfirmationVO();
        response.setElectronicApprovalId(electronicApprovalId);
        response.setActionStatus(line.getActionStatus());
        response.setActionAt(line.getActionAt());
        return response;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public int addDocumentReferences(LoginVO user, Long electronicApprovalId,
            List<String> participantUserIds) throws Exception {
        documentApprovalAccessService.validateAuthenticatedUser(user);
        if (electronicApprovalId == null || electronicApprovalId <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "문서 ID가 올바르지 않습니다.");
        }
        if (participantUserIds == null || participantUserIds.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "추가할 참조자를 선택해 주세요.");
        }

        List<String> requestedUserIds = new ArrayList<>();
        Set<String> uniqueUserIds = new HashSet<>();
        for (String userId : participantUserIds) {
            if (!StringUtils.hasText(userId)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "참조자 ID가 올바르지 않습니다.");
            }
            String normalizedUserId = userId.trim();
            if (!uniqueUserIds.add(normalizedUserId)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "중복된 참조자가 포함되어 있습니다.");
            }
            requestedUserIds.add(normalizedUserId);
        }

        documentApprovalAccessService.requireRelatedDocument(user, electronicApprovalId);
        Map<String, Object> params = documentApprovalAccessService.actorParams(user);
        params.put("electronicApprovalId", electronicApprovalId);
        DocumentApprovalWorkflowDocumentVO document =
                documentApprovalDAO.selectDocumentApprovalForUpdate(params);
        if (document == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "참조자를 추가할 문서를 찾을 수 없습니다.");
        }
        if ("DRAFT".equals(document.getDocumentStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "결재신청된 문서에만 참조자를 추가할 수 있습니다.");
        }

        params.put("participantUserIds", requestedUserIds);
        List<DocumentApprovalParticipantVO> activeParticipants =
                documentApprovalDAO.selectActiveParticipants(params);
        if (activeParticipants == null || activeParticipants.size() != requestedUserIds.size()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "참조자로 추가할 사용자를 확인할 수 없습니다.");
        }
        Map<String, DocumentApprovalParticipantVO> participantsById = new HashMap<>();
        for (DocumentApprovalParticipantVO participant : activeParticipants) {
            if (participant == null || !StringUtils.hasText(participant.getUserId())
                    || participantsById.put(participant.getUserId(), participant) != null) {
                throw new IllegalStateException("활성 참조자 조회 결과가 올바르지 않습니다.");
            }
        }
        if (!participantsById.keySet().containsAll(requestedUserIds)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "참조자로 추가할 사용자를 확인할 수 없습니다.");
        }

        List<DocumentApprovalLineVO> approvalLines = documentApprovalDAO.selectApprovalLines(params);
        if (approvalLines == null) {
            throw new IllegalStateException("결재 참여자 조회 결과를 확인할 수 없습니다.");
        }
        Set<String> existingParticipantIds = new HashSet<>();
        List<DocumentApprovalLineVO> referenceLines = new ArrayList<>();
        int maximumActionStage = 0;
        for (DocumentApprovalLineVO line : approvalLines) {
            if (line == null) {
                throw new IllegalStateException("결재 참여자 조회 결과가 올바르지 않습니다.");
            }
            if (StringUtils.hasText(line.getParticipantUserId())) {
                existingParticipantIds.add(line.getParticipantUserId());
            }
            if ("REFERENCE".equals(line.getParticipantType())) {
                referenceLines.add(line);
            } else if ("APPROVAL".equals(line.getParticipantType())
                    || "AGREEMENT".equals(line.getParticipantType())) {
                if (line.getStageOrder() == null || line.getStageOrder() < 1) {
                    throw new IllegalStateException("결재 단계 조회 결과가 올바르지 않습니다.");
                }
                maximumActionStage = Math.max(maximumActionStage, line.getStageOrder());
            }
        }

        List<DocumentApprovalParticipantVO> newParticipants = new ArrayList<>();
        for (String userId : requestedUserIds) {
            if (!existingParticipantIds.contains(userId)) {
                newParticipants.add(participantsById.get(userId));
            }
        }
        if (newParticipants.isEmpty()) {
            return 0;
        }

        int referenceStage;
        int nextParticipantOrder = 1;
        if (referenceLines.isEmpty()) {
            if (maximumActionStage < 1) {
                throw new IllegalStateException("참조자를 추가할 결재 단계를 확인할 수 없습니다.");
            }
            referenceStage = Math.addExact(maximumActionStage, 1);
        } else {
            Integer existingReferenceStage = referenceLines.get(0).getStageOrder();
            if (existingReferenceStage == null || existingReferenceStage < 1) {
                throw new IllegalStateException("참조 단계 조회 결과가 올바르지 않습니다.");
            }
            int maximumReferenceOrder = 0;
            for (DocumentApprovalLineVO referenceLine : referenceLines) {
                if (!existingReferenceStage.equals(referenceLine.getStageOrder())
                        || referenceLine.getParticipantOrder() == null
                        || referenceLine.getParticipantOrder() < 1) {
                    throw new IllegalStateException("참조 순서 조회 결과가 올바르지 않습니다.");
                }
                maximumReferenceOrder = Math.max(maximumReferenceOrder, referenceLine.getParticipantOrder());
            }
            referenceStage = existingReferenceStage;
            nextParticipantOrder = Math.addExact(maximumReferenceOrder, 1);
        }

        List<String> addedNames = new ArrayList<>();
        for (DocumentApprovalParticipantVO participant : newParticipants) {
            Map<String, Object> lineParams = new HashMap<>(params);
            lineParams.put("stageOrder", referenceStage);
            lineParams.put("participantOrder", nextParticipantOrder++);
            lineParams.put("participantType", "REFERENCE");
            lineParams.put("participantUserId", participant.getUserId());
            lineParams.put("participantName", participant.getUserName());
            lineParams.put("participantDepartmentName", participant.getDepartmentName());
            lineParams.put("actionStatus", null);
            lineParams.put("pendingAt", null);
            lineParams.put("actionAt", null);
            lineParams.put("actionComment", null);
            if (documentApprovalDAO.insertDocumentApprovalLine(lineParams) != 1) {
                throw new IllegalStateException("참조자 추가에 실패했습니다.");
            }
            addedNames.add(participant.getUserName());
        }

        String content = user.getName() + "님이 참조자(" + String.join(", ", addedNames) + ")를 추가했습니다.";
        draftSupportService.insertSystemEvent(user, electronicApprovalId, "REFERENCE_ADDED", content);
        return newParticipants.size();
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
        String loginId = documentApprovalDAO.selectLoginIdByLoginCode(loginParams);
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
        return createApprovalComment(user, electronicApprovalId, content, parentCommentId,
                Collections.emptyList(), false);
    }

    // 2026-11-04 S_ERP 결재 댓글 멘션: 멘션한 사람(문서를 볼 수 있는 사람만)에게 알림. @ALL 은 문서를 볼 수 있는 사람 모두, 작성자는 뺀다
    @Override
    @Transactional(rollbackFor = Exception.class)
    public CommonCommentVO createApprovalComment(LoginVO user, Long electronicApprovalId,
            String content, Long parentCommentId, List<String> mentionedUserIds, boolean mentionAll) throws Exception {
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

        List<String> recipients = resolveApprovalCommentRecipients(
                user, electronicApprovalId, mentionedUserIds, mentionAll);
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
        String summary = org.jsoup.Jsoup.parse(normalizedContent).text();
        if (summary.length() > 500) {
            summary = summary.substring(0, 497) + "...";
        }
        for (String recipientUserId : recipients) {
            notificationService.createEvent(user.getTenantId(), recipientUserId,
                    "APPROVAL_COMMENT_MENTION", "APPROVAL_COMMENT", commentId,
                    "전자결재 댓글에 언급되었습니다.", summary.isEmpty() ? "댓글이 등록되었습니다." : summary);
        }
        return created;
    }

    private List<String> resolveApprovalCommentRecipients(LoginVO user, Long electronicApprovalId,
            List<String> mentionedUserIds, boolean mentionAll) throws Exception {
        List<String> requested = new ArrayList<>();
        for (String userId : mentionedUserIds == null ? Collections.<String>emptyList() : mentionedUserIds) {
            if (userId == null || userId.trim().isEmpty() || userId.trim().length() > 20) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "멘션 사용자 정보가 올바르지 않습니다.");
            }
            requested.add(userId.trim());
        }
        if (requested.size() > 500) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "멘션 사용자 정보가 올바르지 않습니다.");
        }
        if (!mentionAll && requested.isEmpty()) {
            return Collections.emptyList();
        }

        Map<String, Object> params = documentApprovalAccessService.actorParams(user);
        params.put("electronicApprovalId", electronicApprovalId);
        List<String> audience = documentApprovalDAO.selectApprovalCommentRecipientUserIds(params);
        if (audience == null) {
            throw new IllegalStateException("전자결재 댓글 멘션 대상 조회 결과가 없습니다.");
        }
        Set<String> allowed = new HashSet<>(audience);
        for (String userId : requested) {
            if (!allowed.contains(userId)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "문서에 접근할 수 없는 사용자는 멘션할 수 없습니다.");
            }
        }
        Set<String> recipients = new LinkedHashSet<>();
        if (mentionAll) {
            recipients.addAll(audience);
        }
        recipients.addAll(requested);
        recipients.remove(documentApprovalAccessService.authenticatedUserId(user));
        return new ArrayList<>(recipients);
    }

    @Override
    @Transactional(readOnly = true)
    public List<String> listApprovalCommentMentionUserIds(LoginVO user, Long electronicApprovalId) throws Exception {
        documentApprovalAccessService.requireRelatedDocument(user, electronicApprovalId);
        String authorId = documentApprovalAccessService.authenticatedUserId(user);
        Map<String, Object> params = documentApprovalAccessService.actorParams(user);
        params.put("electronicApprovalId", electronicApprovalId);
        List<String> audience = documentApprovalDAO.selectApprovalCommentRecipientUserIds(params);
        if (audience == null) {
            return Collections.emptyList();
        }
        List<String> mentionable = new ArrayList<>();
        for (String userId : audience) {
            if (userId != null && !userId.equals(authorId)) {
                mentionable.add(userId);
            }
        }
        return mentionable;
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

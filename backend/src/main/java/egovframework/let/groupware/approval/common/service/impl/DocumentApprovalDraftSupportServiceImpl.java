package egovframework.let.groupware.approval.common.service.impl;

import egovframework.let.groupware.approval.common.service.DocumentApprovalAccessService;
import java.net.URI;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.jsoup.Jsoup;
import egovframework.com.cmm.LoginVO;
import egovframework.com.common.domain.model.CommonFileVO;
import egovframework.com.common.domain.model.EmbeddedImageUploadVO;
import egovframework.com.common.domain.repository.CommonCommentDAO;
import egovframework.com.common.service.EmbeddedImageDocumentProcessor;
import egovframework.com.common.service.EmbeddedImageStorageService;
import egovframework.com.common.service.RichTextDocumentSanitizer;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalDraftSaveRequestVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalDraftSaveRequestVO.ApprovalLineVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalDraftVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalEmbeddedImageVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalParticipantVO;
import egovframework.let.groupware.approval.domain.repository.DocumentApprovalDAO;
import egovframework.let.groupware.approval.common.service.DocumentApprovalDraftSupportService;

@Service("documentApprovalDraftSupportService")
public class DocumentApprovalDraftSupportServiceImpl extends EgovAbstractServiceImpl
        implements DocumentApprovalDraftSupportService {

    private static final String OWNER_TYPE = "APPROVAL";
    private static final String SYSTEM_COMMENT_TYPE = "SYSTEM";
    private static final String DRAFT_SAVED_EVENT = "DRAFT_SAVED";
    private static final Set<String> DOCUMENT_TYPES = Collections.unmodifiableSet(new HashSet<>(Arrays.asList(
            "DRAFTING", "BUSINESS_CONTACT", "EXPENSE_RESOLUTION", "ATTENDANCE_APPLICATION")));
    private static final Set<String> PARTICIPANT_TYPES = Collections.unmodifiableSet(
            new HashSet<>(Arrays.asList("APPROVAL", "AGREEMENT", "REFERENCE")));
    private final DocumentApprovalDAO documentApprovalDAO;
    private final CommonCommentDAO commonCommentDAO;
    private final RichTextDocumentSanitizer documentSanitizer;
    private final EmbeddedImageDocumentProcessor imageDocumentProcessor;
    private final DocumentApprovalAccessService documentApprovalAccessService;

    public DocumentApprovalDraftSupportServiceImpl(DocumentApprovalDAO documentApprovalDAO,
            CommonCommentDAO commonCommentDAO, RichTextDocumentSanitizer documentSanitizer,
            EmbeddedImageStorageService imageStorageService,
            DocumentApprovalAccessService documentApprovalAccessService) {
        this.documentApprovalDAO = documentApprovalDAO;
        this.commonCommentDAO = commonCommentDAO;
        this.documentSanitizer = documentSanitizer;
        this.imageDocumentProcessor = new EmbeddedImageDocumentProcessor(imageStorageService, documentSanitizer);
        this.documentApprovalAccessService = documentApprovalAccessService;
    }

    @Override
    public void validateDraftRequest(DocumentApprovalDraftSaveRequestVO request) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "임시저장 문서 정보가 올바르지 않습니다.");
        }
        String title = request.getTitle() == null ? "" : request.getTitle().trim();
        if (!StringUtils.hasText(request.getDocumentType())
                || !DOCUMENT_TYPES.contains(request.getDocumentType().trim())
                || !StringUtils.hasText(title)
                || title.codePointCount(0, title.length()) > 300
                || request.getContentsJson() == null || !request.getContentsJson().isObject()
                || !"doc".equals(request.getContentsJson().path("type").asText())
                || request.getApprovalLines() == null
                || (!"BUSINESS_CONTACT".equals(request.getDocumentType().trim())
                    && request.getApprovalLines().isEmpty())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "임시저장 문서 정보가 올바르지 않습니다.");
        }
    }

    @Override
    public void validateCategory(Long categoryId, Long tenantId) throws Exception {
        if (categoryId == null) {
            return;
        }
        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", tenantId);
        params.put("draftingWorkCategoryId", categoryId);
        if (!Boolean.TRUE.equals(documentApprovalDAO.selectActiveDraftingCategory(params))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "사용할 수 없는 기안 업무 구분입니다.");
        }
    }

    @Override
    public Map<String, DocumentApprovalParticipantVO> validateParticipants(DocumentApprovalDraftSaveRequestVO request,
            LoginVO user) throws Exception {
        List<ApprovalLineVO> approvalLines = request.getApprovalLines();
        boolean businessContact = "BUSINESS_CONTACT".equals(request.getDocumentType().trim());
        Set<String> userIds = new HashSet<>();
        Set<String> positions = new HashSet<>();
        boolean drafterIsFirstApprover = false;
        boolean hasApprovalAction = false;
        List<String> participantUserIds = new ArrayList<>();

        for (ApprovalLineVO line : approvalLines) {
            if (line == null || line.getStageOrder() == null || line.getStageOrder() < 1
                    || line.getParticipantOrder() == null || line.getParticipantOrder() < 1
                    || !StringUtils.hasText(line.getParticipantType())
                    || !PARTICIPANT_TYPES.contains(line.getParticipantType())
                    || !StringUtils.hasText(line.getParticipantUserId())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "결재선 정보가 올바르지 않습니다.");
            }
            String userId = line.getParticipantUserId().trim();
            if (businessContact) {
                if (!"REFERENCE".equals(line.getParticipantType())
                        || line.getStageOrder() != 1
                        || line.getParticipantOrder() != participantUserIds.size() + 1) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "업무연락은 순서대로 배치된 참조자만 지정할 수 있습니다.");
                }
                if (userId.equals(user.getUniqId())) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "작성자는 참조자로 지정할 수 없습니다.");
                }
            }
            if (userId.codePointCount(0, userId.length()) > 100) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "결재선 참여자 ID가 올바르지 않습니다.");
            }
            String position = line.getStageOrder() + ":" + line.getParticipantOrder();
            if (!userIds.add(userId) || !positions.add(position)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "결재선 참여자는 중복될 수 없습니다.");
            }
            participantUserIds.add(userId);
            if ("APPROVAL".equals(line.getParticipantType())) {
                hasApprovalAction = true;
                drafterIsFirstApprover |= line.getStageOrder() == 1 && userId.equals(user.getUniqId());
            }
        }

        if (!businessContact && (!hasApprovalAction || !drafterIsFirstApprover)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "결재선에 기안자의 1단계 결재가 필요합니다.");
        }

        if (participantUserIds.isEmpty()) {
            return Collections.emptyMap();
        }
        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", user.getTenantId());
        params.put("participantUserIds", participantUserIds);
        List<DocumentApprovalParticipantVO> activeParticipants =
                documentApprovalDAO.selectActiveParticipants(params);
        Map<String, DocumentApprovalParticipantVO> participantsById = new HashMap<>();
        if (activeParticipants != null) {
            for (DocumentApprovalParticipantVO participant : activeParticipants) {
                participantsById.put(participant.getUserId(), participant);
            }
        }
        if (participantsById.size() != userIds.size() || !participantsById.keySet().containsAll(userIds)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "결재선에 사용할 수 없는 사용자가 포함되어 있습니다.");
        }
        return participantsById;
    }

    @Override
    public Map<String, Object> documentParams(LoginVO user, DocumentApprovalDraftSaveRequestVO request,
            Map<String, Object> actor) {
        Map<String, Object> params = new HashMap<>(actor);
        params.put("draftingWorkCategoryId", request.getDraftingWorkCategoryId());
        String documentType = request.getDocumentType().trim();
        params.put("documentType", documentType);
        params.put("eabusNo", eabusNo(documentType));
        String title = request.getTitle().trim();
        params.put("title", title);
        params.put("contentsJson", documentSanitizer.sanitizeJson(request.getContentsJson()).toString());
        String safeHtml = documentSanitizer.sanitizeHtml(request.getContentsHtml());
        params.put("contentsHtml", safeHtml);
        params.put("contentsText", Jsoup.parseBodyFragment(safeHtml).text());
        params.put("drafterDepartmentName", user.getDepartmentName());
        return params;
    }

    private String eabusNo(String documentType) {
        switch (documentType) {
            case "DRAFTING":
                return "001";
            case "BUSINESS_CONTACT":
                return "008";
            case "EXPENSE_RESOLUTION":
                return "004";
            case "ATTENDANCE_APPLICATION":
                return "031";
            default:
                throw new IllegalArgumentException("지원하지 않는 문서 유형입니다.");
        }
    }

    @Override
    public EmbeddedImageDocumentProcessor.Result processEmbeddedImages(
            LoginVO user, Long approvalId, DocumentApprovalDraftSaveRequestVO request) throws Exception {
        return imageDocumentProcessor.process(
                user.getTenantId(),
                OWNER_TYPE,
                approvalId,
                request.getContentsHtml(),
                request.getContentsJson(),
                toStorageUploads(request.getEmbeddedImages()),
                toStorageUploads(request.getTemporaryImages()),
                user.getId(),
                approvalImageUrlResolver(approvalId));
    }

    @Override
    public void applyProcessedBody(
            Map<String, Object> documentParams, EmbeddedImageDocumentProcessor.Result imageSave) {
        documentParams.put("contentsHtml", imageSave.getHtml());
        documentParams.put("contentsJson", imageSave.getJson());
        documentParams.put("contentsText", Jsoup.parseBodyFragment(imageSave.getHtml()).text());
    }

    @Override
    public List<EmbeddedImageUploadVO> toStorageUploads(List<DocumentApprovalEmbeddedImageVO> images) {
        List<EmbeddedImageUploadVO> uploads = new ArrayList<EmbeddedImageUploadVO>();
        if (images != null) {
            for (DocumentApprovalEmbeddedImageVO image : images) {
                if (image == null) {
                    continue;
                }
                EmbeddedImageUploadVO upload = new EmbeddedImageUploadVO();
                upload.setUploadToken(image.getUploadToken());
                upload.setFileName(image.getFileName());
                uploads.add(upload);
            }
        }
        return uploads;
    }

    private EmbeddedImageDocumentProcessor.StableImageUrlResolver approvalImageUrlResolver(final Long approvalId) {
        return new EmbeddedImageDocumentProcessor.StableImageUrlResolver() {
            @Override
            public String toStableUrl(CommonFileVO image) {
                if (image == null || image.getFileId() == null) {
                    throw new IllegalStateException("본문 이미지 ID를 확인할 수 없습니다.");
                }
                return "/api/v1/groupware/approvals/" + approvalId
                        + "/embedded-images/" + image.getFileId();
            }

            @Override
            public CommonFileVO resolveOwnedImage(String source, List<CommonFileVO> ownedImages) {
                URI uri;
                try {
                    uri = URI.create(source);
                } catch (IllegalArgumentException exception) {
                    throw new IllegalArgumentException("본문 이미지 경로가 올바르지 않습니다.", exception);
                }
                if (uri.isAbsolute()) {
                    return null;
                }
                String path = uri.getPath();
                if (path == null || !path.startsWith("/api/")) {
                    return null;
                }
                String expectedPrefix = "/api/v1/groupware/approvals/" + approvalId + "/embedded-images/";
                if (!path.startsWith(expectedPrefix) || uri.getRawQuery() != null || uri.getRawFragment() != null) {
                    throw new IllegalArgumentException("현재 문서에서 사용할 수 없는 본문 이미지 경로입니다.");
                }
                String fileIdValue = path.substring(expectedPrefix.length());
                if (!fileIdValue.matches("[1-9][0-9]*")) {
                    throw new IllegalArgumentException("본문 이미지 경로가 올바르지 않습니다.");
                }
                Long fileId;
                try {
                    fileId = Long.valueOf(fileIdValue);
                } catch (NumberFormatException exception) {
                    throw new IllegalArgumentException("본문 이미지 경로가 올바르지 않습니다.", exception);
                }
                if (ownedImages != null) {
                    for (CommonFileVO image : ownedImages) {
                        if (image != null && fileId.equals(image.getFileId())) {
                            return image;
                        }
                    }
                }
                throw new IllegalArgumentException("현재 문서가 소유하지 않은 본문 이미지입니다.");
            }
        };
    }

    @Override
    public void replaceApprovalLines(LoginVO user, Long approvalId, List<ApprovalLineVO> approvalLines,
            Map<String, DocumentApprovalParticipantVO> participants) throws Exception {
        Map<String, Object> deleteParams = new HashMap<>();
        deleteParams.put("tenantId", user.getTenantId());
        deleteParams.put("electronicApprovalId", approvalId);
        documentApprovalDAO.deleteDocumentApprovalLines(deleteParams);

        for (ApprovalLineVO line : approvalLines) {
            DocumentApprovalParticipantVO participant = participants.get(line.getParticipantUserId().trim());
            Map<String, Object> params = new HashMap<>(deleteParams);
            params.put("stageOrder", line.getStageOrder());
            params.put("participantOrder", line.getParticipantOrder());
            params.put("participantType", line.getParticipantType());
            params.put("participantUserId", participant.getUserId());
            params.put("participantName", participant.getUserName());
            params.put("participantDepartmentName", participant.getDepartmentName());
            params.put("actionStatus", "REFERENCE".equals(line.getParticipantType()) ? null : "WAITING");
            if (documentApprovalDAO.insertDocumentApprovalLine(params) != 1) {
                throw new IllegalStateException("결재선 저장에 실패했습니다.");
            }
        }
    }

    @Override
    public void replaceApprovalLinesForSubmission(LoginVO user, Long approvalId, List<ApprovalLineVO> approvalLines,
            Map<String, DocumentApprovalParticipantVO> participants) throws Exception {
        Map<Integer, List<ApprovalLineVO>> stages = new TreeMap<>();
        for (ApprovalLineVO line : approvalLines) {
            if (!"REFERENCE".equals(line.getParticipantType())) {
                stages.computeIfAbsent(line.getStageOrder(), key -> new ArrayList<>()).add(line);
            }
        }
        int firstRealStage = stages.keySet().stream()
                .filter(stage -> stage != 1 || !stages.get(stage).get(0).getParticipantUserId()
                        .trim().equals(user.getUniqId()))
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "기안자 외 결재자가 필요합니다."));

        Map<String, Object> deleteParams = new HashMap<>();
        deleteParams.put("tenantId", user.getTenantId());
        deleteParams.put("electronicApprovalId", approvalId);
        documentApprovalDAO.deleteDocumentApprovalLines(deleteParams);

        for (ApprovalLineVO line : approvalLines) {
            DocumentApprovalParticipantVO participant = participants.get(line.getParticipantUserId().trim());
            Map<String, Object> params = new HashMap<>(deleteParams);
            params.put("stageOrder", line.getStageOrder());
            params.put("participantOrder", line.getParticipantOrder());
            params.put("participantType", line.getParticipantType());
            params.put("participantUserId", participant.getUserId());
            params.put("participantName", participant.getUserName());
            params.put("participantDepartmentName", participant.getDepartmentName());
            if ("REFERENCE".equals(line.getParticipantType())) {
                params.put("actionStatus", null);
                params.put("pendingAt", null);
                params.put("actionAt", null);
            } else if (line.getStageOrder() == 1 && participant.getUserId().equals(user.getUniqId())) {
                params.put("actionStatus", "APPROVED");
                params.put("pendingAt", null);
                params.put("actionAt", new java.util.Date());
            } else if (line.getStageOrder() == firstRealStage) {
                params.put("actionStatus", "PENDING");
                params.put("pendingAt", new java.util.Date());
                params.put("actionAt", null);
            } else {
                params.put("actionStatus", "WAITING");
                params.put("pendingAt", null);
                params.put("actionAt", null);
            }
            params.put("actionComment", null);
            if (documentApprovalDAO.insertDocumentApprovalLine(params) != 1) {
                throw new IllegalStateException("결재선 저장에 실패했습니다.");
            }
        }
    }

    @Override
    public void validateSubmissionLines(List<ApprovalLineVO> approvalLines, LoginVO user) {
        Map<Integer, List<ApprovalLineVO>> stages = new TreeMap<>();
        int maximumActionStage = 0;
        Integer referenceStage = null;
        int nonDrafterActionCount = 0;
        boolean hasDrafterFirst = false;

        for (ApprovalLineVO line : approvalLines) {
            stages.computeIfAbsent(line.getStageOrder(), key -> new ArrayList<>()).add(line);
            if ("REFERENCE".equals(line.getParticipantType())) {
                if (referenceStage == null) {
                    referenceStage = line.getStageOrder();
                } else if (!referenceStage.equals(line.getStageOrder())) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "참조자는 마지막 한 단계에 배치해야 합니다.");
                }
            } else {
                maximumActionStage = Math.max(maximumActionStage, line.getStageOrder());
                if (!user.getUniqId().equals(line.getParticipantUserId().trim())) {
                    nonDrafterActionCount++;
                }
                if (line.getStageOrder() == 1 && line.getParticipantOrder() == 1
                        && "APPROVAL".equals(line.getParticipantType())
                        && user.getUniqId().equals(line.getParticipantUserId().trim())) {
                    hasDrafterFirst = true;
                }
            }
        }

        int expectedStage = 1;
        for (Map.Entry<Integer, List<ApprovalLineVO>> entry : stages.entrySet()) {
            if (entry.getKey() != expectedStage++) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "결재 단계 순서는 연속되어야 합니다.");
            }
            List<ApprovalLineVO> stageLines = entry.getValue();
            stageLines.sort((left, right) -> left.getParticipantOrder().compareTo(right.getParticipantOrder()));
            String stageType = stageLines.get(0).getParticipantType();
            for (int index = 0; index < stageLines.size(); index++) {
                ApprovalLineVO line = stageLines.get(index);
                if (line.getParticipantOrder() != index + 1
                        || !stageType.equals(line.getParticipantType())) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "단계 내 결재선 순서가 올바르지 않습니다.");
                }
            }
            if ("APPROVAL".equals(stageType) && stageLines.size() != 1) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "일반 결재자는 한 단계에 한 명만 배치할 수 있습니다.");
            }
            if ("REFERENCE".equals(stageType) && entry.getKey() <= maximumActionStage) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "참조자는 모든 결재 단계 뒤에 배치해야 합니다.");
            }
        }

        if (!hasDrafterFirst || nonDrafterActionCount == 0
                || (referenceStage != null && referenceStage != maximumActionStage + 1)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "결재선 순서 또는 참여자가 올바르지 않습니다.");
        }
    }

    @Override
    public void insertSystemEvent(LoginVO user, Long approvalId, String eventType, String content) throws Exception {
        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", user.getTenantId());
        params.put("ownerType", OWNER_TYPE);
        params.put("ownerId", approvalId);
        params.put("commentType", SYSTEM_COMMENT_TYPE);
        params.put("eventType", eventType);
        params.put("content", content);
        params.put("writerId", user.getId());
        params.put("writerName", user.getName());
        if (commonCommentDAO.insertSystemComment(params) == null) {
            throw new IllegalStateException("결재 시스템 이력 기록에 실패했습니다.");
        }
    }

    @Override
    public void insertDraftSavedMessage(LoginVO user, Long approvalId) throws Exception {
        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", user.getTenantId());
        params.put("ownerType", OWNER_TYPE);
        params.put("ownerId", approvalId);
        params.put("commentType", SYSTEM_COMMENT_TYPE);
        params.put("eventType", DRAFT_SAVED_EVENT);
        params.put("content", "문서가 임시저장되었습니다.");
        params.put("writerId", user.getId());
        params.put("writerName", user.getName());
        if (commonCommentDAO.insertSystemComment(params) == null) {
            throw new IllegalStateException("임시저장 시스템 이력 기록에 실패했습니다.");
        }
    }

    @Override
    public DocumentApprovalDraftVO draftResponse(Long approvalId) {
        DocumentApprovalDraftVO response = workflowResponse(approvalId, "DRAFT");
        return response;
    }

    @Override
    public DocumentApprovalDraftVO persistedDraftResponse(LoginVO user, Long approvalId) throws Exception {
        Map<String, Object> params = documentApprovalAccessService.actorParams(user);
        params.put("electronicApprovalId", approvalId);
        DocumentApprovalDraftVO response = documentApprovalDAO.selectDraftDocumentStatus(params);
        if (response == null) {
            throw new IllegalStateException("저장된 전자결재 문서 정보를 확인할 수 없습니다.");
        }
        return response;
    }

    @Override
    public DocumentApprovalDraftVO workflowResponse(Long approvalId, String status) {
        DocumentApprovalDraftVO response = new DocumentApprovalDraftVO();
        response.setElectronicApprovalId(approvalId);
        response.setDocumentStatus(status);
        return response;
    }
}

package egovframework.let.groupware.approval.service.impl;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;

import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import egovframework.com.cmm.LoginVO;
import egovframework.let.groupware.approval.domain.model.ApprovalLineTemplateLineVO;
import egovframework.let.groupware.approval.domain.model.ApprovalLineTemplateRenameRequestVO;
import egovframework.let.groupware.approval.domain.model.ApprovalLineTemplateSaveRequestVO;
import egovframework.let.groupware.approval.domain.model.ApprovalLineTemplateVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalParticipantVO;
import egovframework.let.groupware.approval.domain.repository.ApprovalLineTemplateDAO;
import egovframework.let.groupware.approval.domain.repository.DocumentApprovalDAO;
import egovframework.let.groupware.approval.service.ApprovalLineTemplateService;

@Service("approvalLineTemplateService")
public class ApprovalLineTemplateServiceImpl implements ApprovalLineTemplateService {

    private static final Set<String> EABUS_NOS = Collections.unmodifiableSet(
            new HashSet<>(Arrays.asList("001", "008", "004", "031")));
    private static final Set<String> PARTICIPANT_TYPES = Collections.unmodifiableSet(
            new HashSet<>(Arrays.asList("APPROVAL", "AGREEMENT", "REFERENCE")));

    private final ApprovalLineTemplateDAO templateDAO;
    private final DocumentApprovalDAO documentApprovalDAO;

    public ApprovalLineTemplateServiceImpl(ApprovalLineTemplateDAO templateDAO,
            DocumentApprovalDAO documentApprovalDAO) {
        this.templateDAO = templateDAO;
        this.documentApprovalDAO = documentApprovalDAO;
    }

    @Override
    public List<ApprovalLineTemplateVO> listTemplates(LoginVO user, String eabusNo) throws Exception {
        validateAuthenticatedUser(user);
        validateEabusNo(eabusNo);
        return templateDAO.selectOwnedTemplates(ownerParams(user, eabusNo));
    }

    @Override
    public ApprovalLineTemplateVO getTemplate(LoginVO user, Long templateId) throws Exception {
        validateAuthenticatedUser(user);
        Map<String, Object> params = ownerParams(user, null);
        params.put("templateId", requireTemplateId(templateId));
        ApprovalLineTemplateVO template = templateDAO.selectOwnedTemplate(params);
        if (template == null) {
            throw notFound();
        }
        List<ApprovalLineTemplateLineVO> lines = templateDAO.selectOwnedTemplateLines(params);
        if (lines == null) {
            lines = Collections.emptyList();
        }
        validateActiveParticipants(lines, user, HttpStatus.CONFLICT);
        template.setApprovalLines(lines);
        return template;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ApprovalLineTemplateVO createTemplate(LoginVO user, ApprovalLineTemplateSaveRequestVO request)
            throws Exception {
        validateAuthenticatedUser(user);
        if (request == null) {
            throw badRequest("결재선 템플릿 정보가 올바르지 않습니다.");
        }
        String eabusNo = normalizeEabusNo(request.getEabusNo());
        String name = normalizeName(request.getName());
        List<ApprovalLineTemplateLineVO> lines = validateAndCopyLines(request.getApprovalLines());
        Map<String, Object> params = ownerParams(user, eabusNo);
        params.put("name", name);
        ensureNameAvailable(params);
        validateActiveParticipants(lines, user, HttpStatus.BAD_REQUEST);
        Long templateId;
        try {
            templateId = templateDAO.insertTemplate(params);
        } catch (DuplicateKeyException error) {
            throw conflict("같은 이름의 결재선 템플릿이 이미 있습니다.");
        }
        if (templateId == null || templateId <= 0) {
            throw new IllegalStateException("결재선 템플릿 ID를 확인할 수 없습니다.");
        }
        if (!lines.isEmpty()) {
            params.put("templateId", templateId);
            params.put("approvalLines", lines);
            try {
                int insertedCount = templateDAO.insertTemplateLines(params);
                if (insertedCount != lines.size()) {
                    throw new IllegalStateException("결재선 템플릿 참여자 저장에 실패했습니다.");
                }
            } catch (DuplicateKeyException error) {
                throw badRequest("결재선 템플릿 참여자는 중복될 수 없습니다.");
            }
        }
        ApprovalLineTemplateVO saved = new ApprovalLineTemplateVO();
        saved.setTemplateId(templateId);
        saved.setName(name);
        saved.setEabusNo(eabusNo);
        saved.setApprovalLines(lines);
        return saved;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ApprovalLineTemplateVO renameTemplate(LoginVO user, Long templateId,
            ApprovalLineTemplateRenameRequestVO request) throws Exception {
        validateAuthenticatedUser(user);
        Long id = requireTemplateId(templateId);
        Map<String, Object> params = ownerParams(user, null);
        params.put("templateId", id);
        ApprovalLineTemplateVO existing = templateDAO.selectOwnedTemplate(params);
        if (existing == null) {
            throw notFound();
        }
        if (request == null) {
            throw badRequest("결재선 템플릿 이름이 올바르지 않습니다.");
        }
        String name = normalizeName(request.getName());
        params.put("eabusNo", existing.getEabusNo());
        params.put("name", name);
        params.put("excludeTemplateId", id);
        ensureNameAvailable(params);
        try {
            if (templateDAO.updateOwnedTemplateName(params) != 1) {
                throw notFound();
            }
        } catch (DuplicateKeyException error) {
            throw conflict("같은 이름의 결재선 템플릿이 이미 있습니다.");
        }
        ApprovalLineTemplateVO renamed = templateDAO.selectOwnedTemplate(params);
        if (renamed == null) {
            throw new IllegalStateException("수정된 결재선 템플릿을 확인할 수 없습니다.");
        }
        return renamed;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void deleteTemplate(LoginVO user, Long templateId) throws Exception {
        validateAuthenticatedUser(user);
        Map<String, Object> params = ownerParams(user, null);
        params.put("templateId", requireTemplateId(templateId));
        if (templateDAO.deleteOwnedTemplate(params) != 1) {
            throw notFound();
        }
    }

    private List<ApprovalLineTemplateLineVO> validateAndCopyLines(
            List<ApprovalLineTemplateLineVO> requestLines) {
        if (requestLines == null) {
            throw badRequest("결재선 템플릿 참여자 목록이 올바르지 않습니다.");
        }
        List<ApprovalLineTemplateLineVO> lines = new ArrayList<>();
        Set<String> userIds = new HashSet<>();
        Set<String> positions = new HashSet<>();
        Map<Integer, List<ApprovalLineTemplateLineVO>> stages = new TreeMap<>();
        for (ApprovalLineTemplateLineVO line : requestLines) {
            if (line == null || line.getStageOrder() == null || line.getStageOrder() < 2
                    || line.getParticipantOrder() == null || line.getParticipantOrder() < 1
                    || !StringUtils.hasText(line.getParticipantType())
                    || !PARTICIPANT_TYPES.contains(line.getParticipantType().trim())
                    || !StringUtils.hasText(line.getParticipantUserId())) {
                throw badRequest("결재선 템플릿 참여자 정보가 올바르지 않습니다.");
            }
            String userId = line.getParticipantUserId().trim();
            if (userId.codePointCount(0, userId.length()) > 100
                    || !userIds.add(userId)
                    || !positions.add(line.getStageOrder() + ":" + line.getParticipantOrder())) {
                throw badRequest("결재선 템플릿 참여자 또는 순서가 중복되거나 올바르지 않습니다.");
            }
            ApprovalLineTemplateLineVO copy = new ApprovalLineTemplateLineVO();
            copy.setStageOrder(line.getStageOrder());
            copy.setParticipantOrder(line.getParticipantOrder());
            copy.setParticipantType(line.getParticipantType().trim());
            copy.setParticipantUserId(userId);
            lines.add(copy);
            stages.computeIfAbsent(copy.getStageOrder(), key -> new ArrayList<>()).add(copy);
        }
        validateStageOrdering(stages);
        return lines;
    }

    private void validateStageOrdering(Map<Integer, List<ApprovalLineTemplateLineVO>> stages) {
        long expectedStage = 2;
        boolean referencesStarted = false;
        for (Map.Entry<Integer, List<ApprovalLineTemplateLineVO>> entry : stages.entrySet()) {
            int stageOrder = entry.getKey();
            List<ApprovalLineTemplateLineVO> stageLines = entry.getValue();
            Set<String> kinds = new HashSet<>();
            for (ApprovalLineTemplateLineVO line : stageLines) {
                kinds.add(line.getParticipantType());
                if (referencesStarted && !"REFERENCE".equals(line.getParticipantType())) {
                    throw badRequest("참조자는 결재선 단계 뒤에 배치해야 합니다.");
                }
            }
            if (kinds.contains("REFERENCE")) {
                if (kinds.size() != 1 || stageOrder != expectedStage) {
                    throw badRequest("참조자는 마지막 단계에 순서대로 배치해야 합니다.");
                }
                referencesStarted = true;
            } else {
                if (stageOrder != expectedStage || kinds.size() != 1) {
                    throw badRequest("결재선 템플릿 단계 순서가 올바르지 않습니다.");
                }
                if ("APPROVAL".equals(kinds.iterator().next()) && stageLines.size() != 1) {
                    throw badRequest("결재 단계에는 한 명만 지정할 수 있습니다.");
                }
                expectedStage++;
            }
            stageLines.sort((left, right) -> left.getParticipantOrder().compareTo(right.getParticipantOrder()));
            for (int index = 0; index < stageLines.size(); index++) {
                if (stageLines.get(index).getParticipantOrder() != index + 1) {
                    throw badRequest("결재선 템플릿 참여자 순서가 올바르지 않습니다.");
                }
            }
        }
    }

    private void validateActiveParticipants(List<ApprovalLineTemplateLineVO> lines, LoginVO user, HttpStatus status)
            throws Exception {
        if (lines.isEmpty()) {
            return;
        }
        List<String> participantUserIds = new ArrayList<>();
        for (ApprovalLineTemplateLineVO line : lines) {
            participantUserIds.add(line.getParticipantUserId());
        }
        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", user.getTenantId());
        params.put("participantUserIds", participantUserIds);
        List<DocumentApprovalParticipantVO> activeParticipants =
                documentApprovalDAO.selectActiveParticipants(params);
        Set<String> activeUserIds = new HashSet<>();
        if (activeParticipants != null) {
            for (DocumentApprovalParticipantVO participant : activeParticipants) {
                activeUserIds.add(participant.getUserId());
            }
        }
        if (activeUserIds.size() != participantUserIds.size()
                || !activeUserIds.containsAll(participantUserIds)) {
            throw new ResponseStatusException(status, "결재선 템플릿에 사용할 수 없는 사용자가 포함되어 있습니다.");
        }
    }

    private void ensureNameAvailable(Map<String, Object> params) throws Exception {
        if (Boolean.TRUE.equals(templateDAO.selectOwnedTemplateNameExists(params))) {
            throw conflict("같은 이름의 결재선 템플릿이 이미 있습니다.");
        }
    }

    private String normalizeEabusNo(String eabusNo) {
        String normalized = eabusNo == null ? "" : eabusNo.trim();
        validateEabusNo(normalized);
        return normalized;
    }

    private void validateEabusNo(String eabusNo) {
        if (!StringUtils.hasText(eabusNo) || !EABUS_NOS.contains(eabusNo.trim())) {
            throw badRequest("문서 구분 코드가 올바르지 않습니다.");
        }
    }

    private String normalizeName(String name) {
        String normalized = name == null ? "" : name.trim();
        if (!StringUtils.hasText(normalized) || normalized.codePointCount(0, normalized.length()) > 100) {
            throw badRequest("결재선 템플릿 이름은 1자 이상 100자 이하여야 합니다.");
        }
        return normalized;
    }

    private void validateAuthenticatedUser(LoginVO user) {
        if (user == null || user.getTenantId() == null || !StringUtils.hasText(user.getId())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 없습니다.");
        }
    }

    private Long requireTemplateId(Long templateId) {
        if (templateId == null || templateId <= 0) {
            throw badRequest("결재선 템플릿 ID가 올바르지 않습니다.");
        }
        return templateId;
    }

    private Map<String, Object> ownerParams(LoginVO user, String eabusNo) {
        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", user.getTenantId());
        params.put("ownerUserId", user.getId());
        if (eabusNo != null) {
            params.put("eabusNo", eabusNo);
        }
        return params;
    }

    private ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }

    private ResponseStatusException conflict(String message) {
        return new ResponseStatusException(HttpStatus.CONFLICT, message);
    }

    private ResponseStatusException notFound() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "결재선 템플릿을 찾을 수 없습니다.");
    }
}

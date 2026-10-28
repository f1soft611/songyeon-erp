package egovframework.let.groupware.approval.common.service.impl;

import java.util.HashMap;
import java.util.Map;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import egovframework.com.cmm.LoginVO;
import egovframework.let.groupware.approval.domain.repository.DocumentApprovalDAO;
import egovframework.let.groupware.approval.common.service.DocumentApprovalAccessService;

@Service("documentApprovalAccessService")
public class DocumentApprovalAccessServiceImpl extends EgovAbstractServiceImpl
        implements DocumentApprovalAccessService {

    private final DocumentApprovalDAO documentApprovalDAO;

    public DocumentApprovalAccessServiceImpl(DocumentApprovalDAO documentApprovalDAO) {
        this.documentApprovalDAO = documentApprovalDAO;
    }

    @Override
    public void validateAuthenticatedUser(LoginVO user) {
        if (user == null || user.getTenantId() == null || !StringUtils.hasText(user.getId())
                || !StringUtils.hasText(user.getUniqId()) || !StringUtils.hasText(user.getName())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 없습니다.");
        }
    }

    @Override
    public void requireDraftOwner(LoginVO user, Long electronicApprovalId) throws Exception {
        validateAuthenticatedUser(user);
        if (electronicApprovalId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "문서 ID가 없습니다.");
        }
        Map<String, Object> params = actorParams(user);
        params.put("electronicApprovalId", electronicApprovalId);
        String drafterId = documentApprovalDAO.selectDraftDrafterId(params);
        if (drafterId == null || !drafterId.equals(user.getId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "임시저장 문서를 찾을 수 없습니다.");
        }
    }

    @Override
    public void requireRelatedDocument(LoginVO user, Long electronicApprovalId) throws Exception {
        validateAuthenticatedUser(user);
        if (electronicApprovalId == null || electronicApprovalId <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "문서 ID가 올바르지 않습니다.");
        }
        Map<String, Object> params = actorParams(user);
        params.put("electronicApprovalId", electronicApprovalId);
        if (!Boolean.TRUE.equals(documentApprovalDAO.selectIsDocumentParticipant(params))) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "문서를 찾을 수 없습니다.");
        }
    }

    @Override
    public Map<String, Object> actorParams(LoginVO user) {
        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", user.getTenantId());
        params.put("drafterId", user.getId());
        params.put("drafterUserId", user.getUniqId());
        params.put("participantUserId", user.getUniqId());
        params.put("drafterName", user.getName());
        params.put("documentStatus", "DRAFT");
        return params;
    }

    @Override
    public Long authenticatedUserId(LoginVO user) {
        try {
            return Long.valueOf(user.getUniqId());
        } catch (NumberFormatException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "인증 사용자 ID가 올바르지 않습니다.", exception);
        }
    }
}

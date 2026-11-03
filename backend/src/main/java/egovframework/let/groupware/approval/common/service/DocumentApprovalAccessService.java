package egovframework.let.groupware.approval.common.service;

import java.util.Map;

import egovframework.com.cmm.LoginVO;

public interface DocumentApprovalAccessService {

    void validateAuthenticatedUser(LoginVO user);

    void requireDraftOwner(LoginVO user, Long electronicApprovalId) throws Exception;

    void requireRelatedDocument(LoginVO user, Long electronicApprovalId) throws Exception;

    Map<String, Object> actorParams(LoginVO user);

    /** 로그인 사원 사번(2026-11-03, 앞자리 0 그대로) */
    String authenticatedUserId(LoginVO user);
}

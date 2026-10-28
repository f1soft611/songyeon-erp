package egovframework.let.groupware.approval.common.service;

import java.util.Map;

import egovframework.com.cmm.LoginVO;

public interface DocumentApprovalAccessService {

    void validateAuthenticatedUser(LoginVO user);

    void requireDraftOwner(LoginVO user, Long electronicApprovalId) throws Exception;

    void requireRelatedDocument(LoginVO user, Long electronicApprovalId) throws Exception;

    Map<String, Object> actorParams(LoginVO user);

    Long authenticatedUserId(LoginVO user);
}

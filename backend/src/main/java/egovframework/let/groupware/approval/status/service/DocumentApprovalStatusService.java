package egovframework.let.groupware.approval.status.service;

import egovframework.com.cmm.LoginVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalListPageVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalListQueryVO;

public interface DocumentApprovalStatusService {

    DocumentApprovalListPageVO searchDocuments(LoginVO user, String scope,
            DocumentApprovalListQueryVO query) throws Exception;
}

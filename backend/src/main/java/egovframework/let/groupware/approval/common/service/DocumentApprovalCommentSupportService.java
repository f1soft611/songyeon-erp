package egovframework.let.groupware.approval.common.service;

import java.util.List;
import java.util.Map;

import egovframework.com.cmm.LoginVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalCommentPageVO;

public interface DocumentApprovalCommentSupportService {

    Map<Long, DocumentApprovalCommentPageVO> listApprovalCommentStreamPagesByOwnerIds(
            LoginVO user, List<Long> approvalIds, int limit, Long beforeCommentId) throws Exception;

    Map<String, Object> approvalCommentParams(
            LoginVO user, Long electronicApprovalId, Long commentId);
}

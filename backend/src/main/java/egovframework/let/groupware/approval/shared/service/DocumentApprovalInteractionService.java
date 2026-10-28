package egovframework.let.groupware.approval.shared.service;

import java.util.List;

import javax.servlet.http.HttpServletResponse;

import org.springframework.web.multipart.MultipartFile;

import egovframework.com.cmm.LoginVO;
import egovframework.com.common.domain.model.CommonCommentVO;
import egovframework.com.common.domain.model.CommonFileVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalActionRequestVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalCommentPageVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalDetailVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalDraftSaveRequestVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalDraftVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalFilePageVO;

public interface DocumentApprovalInteractionService {

    DocumentApprovalFilePageVO listFiles(LoginVO user, String scope, String documentType,
            Long electronicApprovalId, Long beforeFileId) throws Exception;

    DocumentApprovalDraftVO submit(LoginVO user, Long electronicApprovalId,
            DocumentApprovalDraftSaveRequestVO request) throws Exception;

    DocumentApprovalDraftVO processAction(LoginVO user, Long electronicApprovalId,
            DocumentApprovalActionRequestVO request) throws Exception;

    DocumentApprovalDraftVO cancelSubmission(LoginVO user, Long electronicApprovalId) throws Exception;

    DocumentApprovalDraftVO cancelApproval(LoginVO user, Long electronicApprovalId) throws Exception;

    DocumentApprovalDetailVO getDetail(LoginVO user, Long electronicApprovalId) throws Exception;

    void deleteDocumentApproval(LoginVO user, Long electronicApprovalId) throws Exception;

    DocumentApprovalCommentPageVO listApprovalComments(LoginVO user, Long electronicApprovalId,
            Integer limit, Long beforeCommentId) throws Exception;

    CommonCommentVO createApprovalComment(LoginVO user, Long electronicApprovalId,
            String content, Long parentCommentId) throws Exception;

    CommonCommentVO updateApprovalComment(LoginVO user, Long electronicApprovalId,
            Long commentId, String content) throws Exception;

    void deleteApprovalComment(LoginVO user, Long electronicApprovalId, Long commentId) throws Exception;

    List<CommonFileVO> listApprovalCommentAttachments(LoginVO user, Long electronicApprovalId,
            Long commentId) throws Exception;

    CommonFileVO uploadApprovalCommentAttachment(LoginVO user, Long electronicApprovalId,
            Long commentId, MultipartFile file) throws Exception;

    void downloadApprovalCommentAttachment(LoginVO user, Long electronicApprovalId,
            Long commentId, Long fileId, HttpServletResponse response) throws Exception;

    void deleteApprovalCommentAttachment(LoginVO user, Long electronicApprovalId,
            Long commentId, Long fileId) throws Exception;

    List<CommonFileVO> listAttachments(LoginVO user, Long electronicApprovalId) throws Exception;

    CommonFileVO uploadAttachment(LoginVO user, Long electronicApprovalId, MultipartFile file) throws Exception;

    void deleteAttachment(LoginVO user, Long electronicApprovalId, Long fileId) throws Exception;

    void downloadAttachment(LoginVO user, Long electronicApprovalId, Long fileId,
            HttpServletResponse response) throws Exception;

    void streamEmbeddedImage(LoginVO user, Long electronicApprovalId, Long fileId,
            HttpServletResponse response) throws Exception;
}

package egovframework.let.groupware.approval.common.service;

import java.util.List;
import java.util.Map;

import egovframework.com.cmm.LoginVO;
import egovframework.com.common.domain.model.EmbeddedImageUploadVO;
import egovframework.com.common.service.EmbeddedImageDocumentProcessor;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalDraftSaveRequestVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalDraftSaveRequestVO.ApprovalLineVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalDraftVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalEmbeddedImageVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalParticipantVO;

public interface DocumentApprovalDraftSupportService {

    void validateDraftRequest(DocumentApprovalDraftSaveRequestVO request);

    void validateCategory(Long categoryId, Long tenantId) throws Exception;

    Map<String, DocumentApprovalParticipantVO> validateParticipants(
            DocumentApprovalDraftSaveRequestVO request, LoginVO user) throws Exception;

    Map<String, Object> documentParams(LoginVO user, DocumentApprovalDraftSaveRequestVO request,
            Map<String, Object> actor);

    EmbeddedImageDocumentProcessor.Result processEmbeddedImages(
            LoginVO user, Long approvalId, DocumentApprovalDraftSaveRequestVO request) throws Exception;

    void applyProcessedBody(Map<String, Object> documentParams,
            EmbeddedImageDocumentProcessor.Result imageSave);

    List<EmbeddedImageUploadVO> toStorageUploads(List<DocumentApprovalEmbeddedImageVO> images);

    void replaceApprovalLines(LoginVO user, Long approvalId, List<ApprovalLineVO> approvalLines,
            Map<String, DocumentApprovalParticipantVO> participants) throws Exception;

    void replaceApprovalLinesForSubmission(LoginVO user, Long approvalId, List<ApprovalLineVO> approvalLines,
            Map<String, DocumentApprovalParticipantVO> participants) throws Exception;

    void validateSubmissionLines(List<ApprovalLineVO> approvalLines, LoginVO user);

    void insertSystemEvent(LoginVO user, Long approvalId, String eventType, String content) throws Exception;

    void insertDraftSavedMessage(LoginVO user, Long approvalId) throws Exception;

    DocumentApprovalDraftVO draftResponse(Long approvalId);

    DocumentApprovalDraftVO persistedDraftResponse(LoginVO user, Long approvalId) throws Exception;

    DocumentApprovalDraftVO workflowResponse(Long approvalId, String status);
}

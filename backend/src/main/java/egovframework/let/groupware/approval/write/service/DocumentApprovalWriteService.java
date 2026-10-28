package egovframework.let.groupware.approval.write.service;

import java.util.List;

import org.springframework.web.multipart.MultipartFile;

import egovframework.com.cmm.LoginVO;
import egovframework.com.common.domain.model.EmbeddedImageUploadVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalDraftSaveRequestVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalDraftVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalFeedItemVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalListItemVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalListQueryVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalPinStateVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalSummaryVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalWritePageVO;

public interface DocumentApprovalWriteService {

    DocumentApprovalDraftVO saveDraft(LoginVO user, DocumentApprovalDraftSaveRequestVO request) throws Exception;

    DocumentApprovalDraftVO saveDraft(LoginVO user, Long electronicApprovalId,
            DocumentApprovalDraftSaveRequestVO request) throws Exception;

    DocumentApprovalWritePageVO<DocumentApprovalListItemVO> searchWriteDocuments(LoginVO user, String scope,
            DocumentApprovalListQueryVO query) throws Exception;

    DocumentApprovalWritePageVO<DocumentApprovalFeedItemVO> searchWriteFeedDocuments(LoginVO user, String scope,
            DocumentApprovalListQueryVO query) throws Exception;

    List<DocumentApprovalListItemVO> listDocuments(LoginVO user, String scope, String documentType,
            Long electronicApprovalId) throws Exception;

    List<DocumentApprovalFeedItemVO> listFeedDocuments(LoginVO user, String scope, String documentType,
            Long electronicApprovalId) throws Exception;

    DocumentApprovalPinStateVO pinDocument(LoginVO user, Long electronicApprovalId) throws Exception;

    DocumentApprovalPinStateVO unpinDocument(LoginVO user, Long electronicApprovalId) throws Exception;

    List<DocumentApprovalListItemVO> listPinnedDocuments(LoginVO user, String scope, String documentType,
            Long electronicApprovalId) throws Exception;

    List<DocumentApprovalFeedItemVO> listPinnedFeedDocuments(LoginVO user, String scope, String documentType,
            Long electronicApprovalId) throws Exception;

    DocumentApprovalSummaryVO getSummary(LoginVO user) throws Exception;

    EmbeddedImageUploadVO uploadTemporaryEmbeddedImage(LoginVO user, MultipartFile file) throws Exception;

    void deleteTemporaryEmbeddedImage(LoginVO user, String uploadToken, String fileName) throws Exception;
}

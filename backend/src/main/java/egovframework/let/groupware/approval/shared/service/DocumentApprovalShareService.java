package egovframework.let.groupware.approval.shared.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import egovframework.com.cmm.LoginVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalListItemVO;
import egovframework.let.groupware.approval.write.service.DocumentApprovalWriteService;
import egovframework.let.groupware.shared.service.ShareTokenCodec;
import egovframework.let.groupware.shared.service.ShareTokenCodec.ContentType;
import egovframework.let.groupware.shared.service.ShareTokenCodec.ShareReference;

@Service
public class DocumentApprovalShareService {
    private final DocumentApprovalWriteService documents;
    private final ShareTokenCodec tokens;

    @Autowired
    public DocumentApprovalShareService(DocumentApprovalWriteService documents, ShareTokenCodec tokens) {
        this.documents = documents;
        this.tokens = tokens;
    }

    public DocumentApprovalShareService(DocumentApprovalWriteService documents,
            @Value("${DOCUMENT_SHARE_SECRET:${Globals.jwt.secret:}}") String secret) {
        this(documents, new ShareTokenCodec(secret));
    }

    public String issue(LoginVO user, Long documentId) throws Exception {
        validateUser(user);
        readableDocument(user, documentId);
        return tokens.issue(ContentType.DOCUMENT, user.getTenantId(), documentId);
    }

    public DocumentApprovalListItemVO resolve(LoginVO user, String token) throws Exception {
        validateUser(user);
        ShareReference reference = tokens.resolve(ContentType.DOCUMENT, token);
        if (reference.getTenantId() != user.getTenantId()) throw unavailable();
        return readableDocument(user, reference.getContentId());
    }

    private DocumentApprovalListItemVO readableDocument(LoginVO user, Long documentId) throws Exception {
        if (documentId == null || documentId <= 0 || documentId > 9_007_199_254_740_991L) throw unavailable();
        return documents.listDocuments(user, "ALL", null, documentId).stream()
                .filter(item -> documentId.equals(item.getElectronicApprovalId()))
                .findFirst().orElseThrow(DocumentApprovalShareService::unavailable);
    }

    private void validateUser(LoginVO user) {
        if (user == null || user.getId() == null || user.getId().trim().isEmpty()
                || user.getTenantId() == null || user.getTenantId() <= 0) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다.");
        }
    }

    private static ResponseStatusException unavailable() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "접근할 수 없거나 삭제된 문서입니다.");
    }
}

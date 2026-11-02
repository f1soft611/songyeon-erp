package egovframework.let.groupware.approval.shared.service;

import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.util.Base64;

import javax.crypto.Cipher;
import javax.crypto.Mac;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import egovframework.com.cmm.LoginVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalListItemVO;
import egovframework.let.groupware.approval.write.service.DocumentApprovalWriteService;

@Service
public class DocumentApprovalShareService {
    private static final byte[] CONTEXT = "s-erp/document-share/v1".getBytes(StandardCharsets.UTF_8);
    private static final SecureRandom RANDOM = new SecureRandom();
    private final DocumentApprovalWriteService documents;
    private final String secret;

    public DocumentApprovalShareService(DocumentApprovalWriteService documents,
            @Value("${DOCUMENT_SHARE_SECRET:${Globals.jwt.secret:}}") String secret) {
        this.documents = documents;
        this.secret = secret;
    }

    public String issue(LoginVO user, Long documentId) throws Exception {
        validateUser(user);
        SecretKeySpec key = encryptionKey();
        readableDocument(user, documentId);
        byte[] iv = new byte[12];
        RANDOM.nextBytes(iv);
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(128, iv));
        cipher.updateAAD(CONTEXT);
        byte[] payload = ByteBuffer.allocate(16).putLong(user.getTenantId()).putLong(documentId).array();
        byte[] ciphertext = cipher.doFinal(payload);
        return "v1." + Base64.getUrlEncoder().withoutPadding().encodeToString(
                ByteBuffer.allocate(iv.length + ciphertext.length).put(iv).put(ciphertext).array());
    }

    public DocumentApprovalListItemVO resolve(LoginVO user, String token) throws Exception {
        validateUser(user);
        SecretKeySpec key = encryptionKey();
        long tenantId;
        long documentId;
        try {
            if (token == null || !token.matches("v1\\.[A-Za-z0-9_-]{59}")) throw unavailable();
            byte[] encoded = Base64.getUrlDecoder().decode(token.substring(3));
            if (!Base64.getUrlEncoder().withoutPadding().encodeToString(encoded).equals(token.substring(3))) {
                throw unavailable();
            }
            ByteBuffer input = ByteBuffer.wrap(encoded);
            byte[] iv = new byte[12];
            input.get(iv);
            byte[] ciphertext = new byte[input.remaining()];
            input.get(ciphertext);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(128, iv));
            cipher.updateAAD(CONTEXT);
            ByteBuffer payload = ByteBuffer.wrap(cipher.doFinal(ciphertext));
            tenantId = payload.getLong();
            documentId = payload.getLong();
        } catch (GeneralSecurityException | IllegalArgumentException error) {
            throw unavailable();
        }
        if (tenantId != user.getTenantId()) throw unavailable();
        return readableDocument(user, documentId);
    }

    private DocumentApprovalListItemVO readableDocument(LoginVO user, Long documentId) throws Exception {
        if (documentId == null || documentId <= 0 || documentId > 9_007_199_254_740_991L) throw unavailable();
        return documents.listDocuments(user, "ALL", null, documentId).stream()
                .filter(item -> documentId.equals(item.getElectronicApprovalId()))
                .findFirst().orElseThrow(DocumentApprovalShareService::unavailable);
    }

    private SecretKeySpec encryptionKey() throws GeneralSecurityException {
        if (secret == null || secret.trim().length() < 32) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "문서 공유 설정을 확인해 주세요.");
        }
        Mac derivation = Mac.getInstance("HmacSHA256");
        derivation.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        return new SecretKeySpec(derivation.doFinal(CONTEXT), "AES");
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

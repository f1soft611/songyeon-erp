package egovframework.let.groupware.shared.service;

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

@Service
public class ShareTokenCodec {
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final String TOKEN_PREFIX = "v1.";
    private static final int IV_BYTES = 12;

    public enum ContentType {
        DOCUMENT("s-erp/document-share/v1"),
        NOTICE("s-erp/notice-share/v1");

        private final byte[] context;

        ContentType(String context) {
            this.context = context.getBytes(StandardCharsets.UTF_8);
        }

        private byte[] context() {
            return context.clone();
        }
    }

    public static final class ShareReference {
        private final long tenantId;
        private final long contentId;

        private ShareReference(long tenantId, long contentId) {
            this.tenantId = tenantId;
            this.contentId = contentId;
        }

        public long getTenantId() {
            return tenantId;
        }

        public long getContentId() {
            return contentId;
        }
    }

    private final String secret;

    public ShareTokenCodec(
            @Value("${DOCUMENT_SHARE_SECRET:${Globals.jwt.secret:}}") String secret) {
        this.secret = secret;
    }

    public String issue(ContentType contentType, long tenantId, long contentId) {
        if (contentType == null || tenantId <= 0 || contentId <= 0) {
            throw new IllegalArgumentException("Invalid share reference.");
        }
        try {
            byte[] iv = new byte[IV_BYTES];
            RANDOM.nextBytes(iv);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, encryptionKey(contentType),
                    new GCMParameterSpec(128, iv));
            cipher.updateAAD(contentType.context());
            byte[] payload = ByteBuffer.allocate(16)
                    .putLong(tenantId)
                    .putLong(contentId)
                    .array();
            byte[] ciphertext = cipher.doFinal(payload);
            byte[] encoded = ByteBuffer.allocate(iv.length + ciphertext.length)
                    .put(iv)
                    .put(ciphertext)
                    .array();
            return TOKEN_PREFIX + Base64.getUrlEncoder().withoutPadding().encodeToString(encoded);
        } catch (GeneralSecurityException error) {
            throw new IllegalStateException("Unable to issue share token.", error);
        }
    }

    public ShareReference resolve(ContentType contentType, String token) {
        if (contentType == null || token == null || !token.matches("v1\\.[A-Za-z0-9_-]{59}")) {
            throw unavailable();
        }
        try {
            String encodedValue = token.substring(TOKEN_PREFIX.length());
            byte[] encoded = Base64.getUrlDecoder().decode(encodedValue);
            if (!Base64.getUrlEncoder().withoutPadding().encodeToString(encoded).equals(encodedValue)) {
                throw unavailable();
            }
            ByteBuffer input = ByteBuffer.wrap(encoded);
            byte[] iv = new byte[IV_BYTES];
            input.get(iv);
            byte[] ciphertext = new byte[input.remaining()];
            input.get(ciphertext);

            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, encryptionKey(contentType),
                    new GCMParameterSpec(128, iv));
            cipher.updateAAD(contentType.context());
            byte[] plaintext = cipher.doFinal(ciphertext);
            if (plaintext.length != 16) {
                throw unavailable();
            }
            ByteBuffer payload = ByteBuffer.wrap(plaintext);
            long tenantId = payload.getLong();
            long contentId = payload.getLong();
            if (tenantId <= 0 || contentId <= 0) {
                throw unavailable();
            }
            return new ShareReference(tenantId, contentId);
        } catch (GeneralSecurityException | IllegalArgumentException error) {
            throw unavailable();
        }
    }

    private SecretKeySpec encryptionKey(ContentType contentType) throws GeneralSecurityException {
        if (secret == null || secret.trim().length() < 32) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "공유 링크 설정을 확인해 주세요.");
        }
        Mac derivation = Mac.getInstance("HmacSHA256");
        derivation.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        return new SecretKeySpec(derivation.doFinal(contentType.context()), "AES");
    }

    private static ResponseStatusException unavailable() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "접근할 수 없거나 삭제된 공유 항목입니다.");
    }
}

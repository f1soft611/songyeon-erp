package egovframework.com.cmm.util;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * 외부 서비스 API 키를 잠가서 보관한다(송연 secrets_store.py · 변환본 SecretsStore 와 같은 규칙).
 * DB 백업 파일만 새어나가도 키를 읽을 수 없게 한다. 잠금장치(프로그램 비밀키)는 DB 밖(환경변수)에 둔다.
 * 비밀키는 SONGYEON_SECRET_KEY, 없으면 SONGYEON_SECRET_KEY_PATH 가 가리키는 파일에서 읽는다.
 * 송연과 같은 비밀키를 쓰면 서로 잠근 값을 읽을 수 있다. 비밀키가 없으면 잠글 수 없으므로 저장을 막는다(평문 저장 안 함).
 * @author SONGYEON ERP
 * @since 2026.10.02
 * @version 1.0
 */
@Component
public class SecretsStore {

    private static final String PREFIX = "enc:";

    private final String secretKey;

    public SecretsStore(@Value("${Globals.songyeon.secretKey:}") String fromProperty,
            @Value("${Globals.songyeon.secretKeyPath:}") String keyPath) {
        String key = fromProperty == null ? "" : fromProperty.trim();
        if (key.isEmpty() && keyPath != null && !keyPath.trim().isEmpty()) {
            try {
                key = new String(Files.readAllBytes(Paths.get(keyPath.trim())), StandardCharsets.UTF_8).trim();
            } catch (Exception ignore) {
                key = "";
            }
        }
        this.secretKey = key;
    }

    public boolean available() {
        return !secretKey.isEmpty();
    }

    /** 잠근다. 비어 있으면 그대로 둔다. 이미 잠긴 값은 다시 잠그지 않는다. */
    public String lock(String text) {
        if (text == null || text.isEmpty() || text.startsWith(PREFIX)) {
            return text;
        }
        if (!available()) {
            throw new IllegalStateException("프로그램 비밀키가 없어 값을 잠글 수 없습니다");
        }
        return PREFIX + Fernet.encrypt(secretKey, text);
    }

    /**
     * 'enc:' 로 시작하지 않으면 예전에 평문으로 저장된 값이므로 그대로 돌려준다.
     * 풀지 못하면(비밀키가 없거나 바뀐 경우) 빈 값을 준다 — 엉뚱한 키로 외부에 접속하면 원인을 찾기 어렵다.
     */
    public String unlock(String text) {
        if (text == null || text.isEmpty()) {
            return "";
        }
        if (!text.startsWith(PREFIX)) {
            return text;
        }
        if (!available()) {
            return "";
        }
        String plain = Fernet.decrypt(secretKey, text.substring(PREFIX.length()));
        return plain == null ? "" : plain;
    }
}

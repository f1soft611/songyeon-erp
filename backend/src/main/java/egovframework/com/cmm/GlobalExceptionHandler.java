package egovframework.com.cmm;

import egovframework.com.cmm.exception.BizException;
import org.springframework.dao.DataAccessException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final String FRIENDLY_PARENT_MENU_ERROR =
            "상위 메뉴 정보가 올바르지 않습니다. 상위 메뉴를 다시 선택한 뒤 저장해 주세요.";

    @ExceptionHandler(BizException.class)
    public ResponseEntity<Map<String, Object>> handleBizException(BizException e) {
        Map<String, Object> res = new HashMap<>();
        res.put("resultCode", "FAIL");
        res.put("resultMessage", e.getMessage());
        res.put("message", e.getMessage());
        return ResponseEntity.status(400).body(res);
    }

    @ExceptionHandler(DataAccessException.class)
    public ResponseEntity<Map<String, Object>> handleDataAccessException(DataAccessException e) {
        String message = normalizeDataAccessMessage(e);

        Map<String, Object> res = new HashMap<>();
        res.put("resultCode", "FAIL");
        res.put("message", message);
        res.put("resultMessage", message);
        return ResponseEntity.status(500).body(res);
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalStateException(IllegalStateException e) {
        Map<String, Object> res = new HashMap<>();
        res.put("resultCode", "FAIL");
        res.put("message", e.getMessage());
        res.put("resultMessage", e.getMessage());
        return ResponseEntity.status(500).body(res);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalArgumentException(IllegalArgumentException e) {
        String message = (e.getMessage() == null || e.getMessage().trim().isEmpty())
                ? "요청 값이 올바르지 않습니다."
                : e.getMessage();

        Map<String, Object> res = new HashMap<>();
        res.put("resultCode", "FAIL");
        res.put("message", message);
        res.put("resultMessage", message);
        return ResponseEntity.status(400).body(res);
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, Object>> handleResponseStatusException(ResponseStatusException e) {
        String reason = e.getReason() == null || e.getReason().trim().isEmpty()
                ? "요청을 처리할 수 없습니다."
                : e.getReason();

        Map<String, Object> res = new HashMap<>();
        res.put("resultCode", "FAIL");
        res.put("message", reason);
        res.put("resultMessage", reason);
        return ResponseEntity.status(e.getStatus()).body(res);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleException(Exception e) {
        Map<String, Object> res = new HashMap<>();
        res.put("resultCode", "FAIL");
        res.put("message", "서버 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
        res.put("resultMessage", "서버 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
        return ResponseEntity.status(500).body(res);
    }

    private String normalizeDataAccessMessage(DataAccessException e) {
        String rawMessage = extractThrowableMessage(e);
        if (rawMessage == null || rawMessage.trim().isEmpty()) {
            return "데이터 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
        }

        String normalized = rawMessage.toLowerCase();
        if (normalized.contains("parent_menu_id")
                && normalized.contains("bigint")
                && (normalized.contains("character varying") || normalized.contains("varchar"))) {
            return FRIENDLY_PARENT_MENU_ERROR;
        }

        if (normalized.contains("parent_menu_id")
                && normalized.contains("bigint")
                && normalized.contains("numeric")) {
            return FRIENDLY_PARENT_MENU_ERROR;
        }

        return "데이터 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
    }

    private String extractThrowableMessage(Throwable throwable) {
        Throwable cursor = throwable;
        while (cursor != null) {
            String message = cursor.getMessage();
            if (message != null && !message.trim().isEmpty()) {
                return message;
            }
            cursor = cursor.getCause();
        }
        return null;
    }
}

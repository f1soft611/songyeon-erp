package egovframework.let.pu.documents.service;

import java.util.Collections;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Component;

/**
 * 문서함 폴더를 비밀번호로 열어둔 기록 (송연 session["doc_unlocked"]).
 * 송연은 한 번 풀면 로그아웃할 때까지 열려 있었다(폴더를 옮겨 다닐 때마다 다시 묻게 하면 아무도 안 쓴다).
 * 이 프로젝트는 서버 세션 없이 JWT 로 로그인하므로 사원 번호별로 서버 메모리에 적어두고, 로그아웃하면 지운다.
 * 서버를 다시 켜면 모두 다시 잠긴다.
 * @author SONGYEON ERP
 * @since 2026.10.13
 * @version 1.0
 */
@Component("documentUnlockStore")
public class DocumentUnlockStore {

    private final Map<String, Set<Long>> opened = new ConcurrentHashMap<>();

    public Set<Long> openedBy(String employeeId) {
        Set<Long> ids = opened.get(employeeId);
        if (ids == null) {
            return Collections.emptySet();
        }
        synchronized (ids) {
            return new HashSet<>(ids);
        }
    }

    public void open(String employeeId, long folderId) {
        Set<Long> ids = opened.computeIfAbsent(employeeId, k -> new HashSet<Long>());
        synchronized (ids) {
            ids.add(folderId);
        }
    }

    /** 로그아웃: 열어둔 폴더를 모두 다시 잠근다 */
    public void forget(String employeeId) {
        opened.remove(employeeId);
    }
}

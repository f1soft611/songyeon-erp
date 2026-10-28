package egovframework.let.common.attachment.service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.regex.Pattern;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * 첨부 파일을 디스크에 두는 곳 (송연 attachments.py 의 UPLOAD_DIR · _scope_dir · _safe_name).
 * 송연 원본과 같은 모양으로 둔다: {보관폴더}/{scope}/{refId}/{epoch_ms}_{안전한이름}
 * 보관폴더(Globals.songyeon.uploadDir)를 송연 원본의 data/uploads 로 맞추면 두 프로그램이 서로 올린 파일을 같이 연다.
 *
 * ■ 파일 이름을 그대로 쓰지 않는 이유
 * 사람이 올린 이름에는 슬래시나 점만 잔뜩 든 이름이 섞여 들어올 수 있다. 그대로 경로에 붙이면 엉뚱한 폴더에 써진다(경로 탈출).
 * 그래서 저장할 때는 안전한 이름을 쓰고, 원래 이름은 표에만 적어뒀다가 내려받을 때 다시 씌운다.
 * @author SONGYEON ERP
 * @since 2026.10.08
 * @version 1.0
 */
@Component("attachmentStorage")
public class AttachmentStorage {

    private static final Pattern UNSAFE = Pattern.compile("[^\\w.\\-가-힣 ()]", Pattern.UNICODE_CHARACTER_CLASS);
    private static final Pattern SAFE_PART = Pattern.compile("[\\w\\-]+", Pattern.UNICODE_CHARACTER_CLASS);

    private final Path root;

    public AttachmentStorage(@Value("${Globals.songyeon.uploadDir:./data/uploads}") String uploadDir) {
        this.root = Paths.get(uploadDir).toAbsolutePath().normalize();
    }

    public Path root() {
        return root;
    }

    /** 저장용 이름의 뒤쪽: 한글은 남기고 경로가 될 수 있는 글자는 밑줄로, 120자까지(송연 _safe_name) */
    public static String safeName(String name) {
        String base = name == null ? "file" : name;
        int slash = Math.max(base.lastIndexOf('/'), base.lastIndexOf('\\'));
        if (slash >= 0) {
            base = base.substring(slash + 1);
        }
        base = UNSAFE.matcher(base).replaceAll("_");
        if (base.length() > 120) {
            base = base.substring(0, 120);
        }
        return base.isEmpty() ? "file" : base;
    }

    /** scope·refId 폴더(없으면 만든다). scope·refId 는 글자·숫자만 받는다 — 경로를 벗어나지 못하게. */
    public Path dir(String scope, String refId) throws IOException {
        if (scope == null || !SAFE_PART.matcher(scope).matches() || refId == null || !SAFE_PART.matcher(refId).matches()) {
            throw new IllegalArgumentException("첨부할 대상이 올바르지 않습니다");
        }
        Path dir = root.resolve(scope).resolve(refId).normalize();
        if (!dir.startsWith(root)) {
            throw new IllegalArgumentException("첨부할 대상이 올바르지 않습니다");
        }
        Files.createDirectories(dir);
        return dir;
    }

    /** 저장한 파일의 경로. 저장이름에 경로 글자가 섞여 있으면 막는다. */
    public Path file(String scope, String refId, String storedName) throws IOException {
        Path path = dir(scope, refId).resolve(storedName == null ? "" : storedName).normalize();
        if (!path.getParent().equals(dir(scope, refId))) {
            throw new IllegalArgumentException("파일을 찾을 수 없습니다");
        }
        return path;
    }

    /** 파일을 쓰고 저장이름을 돌려준다 */
    public String write(String scope, String refId, String origName, byte[] content) throws IOException {
        String stored = System.currentTimeMillis() + "_" + safeName(origName);
        Files.write(dir(scope, refId).resolve(stored), content);
        return stored;
    }

    /** 파일을 지운다. 이미 없어도 그냥 넘어간다(표에서는 지운다) */
    public void deleteQuietly(String scope, String refId, String storedName) {
        try {
            Files.deleteIfExists(file(scope, refId, storedName));
        } catch (IOException | IllegalArgumentException ex) {
            // 파일이 이미 없거나 경로가 이상해도 표에서는 지운다(송연과 같음)
        }
    }
}

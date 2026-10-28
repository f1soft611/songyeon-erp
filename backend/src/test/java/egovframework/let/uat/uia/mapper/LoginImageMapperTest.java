package egovframework.let.uat.uia.mapper;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Objects;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

// 2026-10-23 프로필 · 도장 이미지는 S_ERP 와 같이 계정 표(tb_login_account)에 둔다.
// 전자결재 결재선이 tb_login_account.stamp_image 를 읽기 때문에, 저장 · 조회가 employees 로 가면 도장이 안 보인다
class LoginImageMapperTest {

    private static final String LOGIN_MAPPER = "egovframework/mapper/let/uat/uia/EgovLoginUsr_SQL_postgresql.xml";
    private static final String APPROVAL_MAPPER = "egovframework/mapper/let/groupware/approval/DocumentApproval_SQL_postgresql.xml";

    @DisplayName("내 정보 이미지 저장은 계정 표에 한다")
    @Test
    void updateLoginImagesWritesLoginAccount() throws Exception {
        String update = statement(readResource(LOGIN_MAPPER), "<update id=\"updateLoginImages\"", "</update>");

        assertThat(update).contains("UPDATE tb_login_account");
        assertThat(update).contains("login_code = #{loginCode}");
        assertThat(update).doesNotContain("employees");
    }

    @DisplayName("내 정보 조회 · 로그인은 계정 표의 이미지를 읽고, 결재선 도장도 같은 칸을 읽는다")
    @Test
    void profileLoginAndApprovalReadLoginAccountImages() throws Exception {
        String xml = readResource(LOGIN_MAPPER);
        String profile = statement(xml, "<select id=\"selectMyProfile\"", "</select>");
        String login = statement(xml, "<select id=\"actionLoginEmployee\"", "</select>");

        assertThat(profile).contains("la.stamp_image AS stampImage").doesNotContain("e.stamp_image");
        assertThat(login).contains("li.stamp_image AS stampImage").doesNotContain("e.stamp_image");
        assertThat(readResource(APPROVAL_MAPPER)).contains("THEN la.stamp_image");
    }

    private String statement(String xml, String start, String end) {
        int from = xml.indexOf(start);
        assertThat(from).isGreaterThanOrEqualTo(0);
        return xml.substring(from, xml.indexOf(end, from));
    }

    private String readResource(String path) throws IOException {
        try (InputStream stream = getClass().getClassLoader().getResourceAsStream(path)) {
            assertThat(stream).isNotNull();
            byte[] buffer = new byte[4096];
            ByteArrayOutputStream output = new ByteArrayOutputStream();
            int read;
            while ((read = Objects.requireNonNull(stream).read(buffer)) != -1) {
                output.write(buffer, 0, read);
            }
            return output.toString(StandardCharsets.UTF_8.name());
        }
    }
}

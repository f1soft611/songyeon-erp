package egovframework.let.utl.sim.service;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Base64;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class EgovFileScrtyTest {

    @Test
    @DisplayName("비밀번호 해시 함수는 loginCode를 salt처럼 포함해 계산한다")
    void encryptPassword_usesLoginCodeInHashInput() throws Exception {
        String password = "Welcome123!";
        String loginCode = "tenant.admin.menucheck";

        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        digest.update(loginCode.getBytes(StandardCharsets.UTF_8));
        digest.update(password.getBytes(StandardCharsets.UTF_8));
        String expected = Base64.getEncoder().encodeToString(digest.digest());

        assertEquals(expected, EgovFileScrty.encryptPassword(password, loginCode));
    }
}

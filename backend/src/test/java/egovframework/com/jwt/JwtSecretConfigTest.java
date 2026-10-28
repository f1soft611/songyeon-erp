package egovframework.com.jwt;

import egovframework.com.cmm.service.EgovProperties;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;

class JwtSecretConfigTest {

    @Test
    void jwtSecretMustNotUsePlaceholderDefaults() {
        String secret = EgovProperties.getProperty("Globals.jwt.secret");

        assertNotNull(secret);
        assertFalse(secret.trim().isEmpty());
        assertFalse("CHANGE_ME".equals(secret), "JWT secret cannot use the placeholder dev default");
        assertFalse("YOUR_JWT_SECRET_KEY_HERE".equals(secret), "JWT secret cannot use the fallback placeholder");
    }
}

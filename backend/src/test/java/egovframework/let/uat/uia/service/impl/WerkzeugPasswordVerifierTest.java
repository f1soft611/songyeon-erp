package egovframework.let.uat.uia.service.impl;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class WerkzeugPasswordVerifierTest {

	// 송연 venv 의 werkzeug.security.generate_password_hash('test-pass-1234', ...) 로 만든 시험용 해시
	private static final String SCRYPT_HASH = "scrypt:32768:8:1$EytJMItJujTjo2h5$"
			+ "1670a16994ade9968a647e3a3581bd06d38525fa60aee5796649005bc0b37e7e"
			+ "610e08e76047e1d6c3c3f161f6106326b3df1ffc3f3bc8c60615911e0ef265ab";
	private static final String PBKDF2_HASH = "pbkdf2:sha256:1000$ZPVWsS2ThqJMSN5m$"
			+ "a53013ffb0927b8bd4d6f6f26c6adda6087e8926cfc7842e59c8bd89d9222a55";

	private final WerkzeugPasswordVerifier verifier = new WerkzeugPasswordVerifier();

	@Test
	@DisplayName("Werkzeug scrypt 해시를 검증한다")
	void matchesScrypt() {
		assertTrue(verifier.matches("test-pass-1234", SCRYPT_HASH));
		assertFalse(verifier.matches("wrong-pass", SCRYPT_HASH));
	}

	@Test
	@DisplayName("Werkzeug pbkdf2:sha256 해시를 검증한다")
	void matchesPbkdf2() {
		assertTrue(verifier.matches("test-pass-1234", PBKDF2_HASH));
		assertFalse(verifier.matches("wrong-pass", PBKDF2_HASH));
	}

	@Test
	@DisplayName("형식이 맞지 않거나 값이 없으면 실패한다")
	void rejectsInvalidInput() {
		assertFalse(verifier.matches(null, SCRYPT_HASH));
		assertFalse(verifier.matches("test-pass-1234", null));
		assertFalse(verifier.matches("test-pass-1234", "plain-text"));
		assertFalse(verifier.matches("test-pass-1234", "md5$salt$abcd"));
		assertFalse(verifier.matches("not-a-user-password-x", WerkzeugPasswordVerifier.DUMMY_HASH));
	}
}

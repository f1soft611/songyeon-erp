package egovframework.let.uat.uia.service.impl;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;

import org.bouncycastle.crypto.generators.SCrypt;
import org.bouncycastle.util.encoders.Hex;
import org.springframework.stereotype.Component;

/**
 * 송연 employees.password_hash(Werkzeug 형식) 비밀번호 검증
 * - scrypt:N:r:p$salt$hex, pbkdf2:sha256:iterations$salt$hex 두 형식을 지원한다.
 * - 송연 변환본(kr.co.songyeon.mes.auth.WerkzeugPasswordVerifier)과 같은 규칙이다.
 * @author SONGYEON ERP
 * @since 2026.10.02
 * @version 1.0
 */
@Component("werkzeugPasswordVerifier")
public class WerkzeugPasswordVerifier {

	/** 없는 계정도 같은 종류의 연산을 하도록 쓰는 해시. 로그인 가능한 계정이 아니다. */
	public static final String DUMMY_HASH = "scrypt:32768:8:1$dummy-salt$" + Hex.toHexString(
			SCrypt.generate("not-a-user-password".getBytes(StandardCharsets.UTF_8),
					"dummy-salt".getBytes(StandardCharsets.UTF_8), 32768, 8, 1, 64));

	private static final String SALT_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	private static final java.security.SecureRandom RANDOM = new java.security.SecureRandom();

	/**
	 * 송연 파이썬 werkzeug generate_password_hash 기본값과 같은 형식으로 만든다: scrypt:32768:8:1$소금16자$hex.
	 * 송연 원본과 이 프로그램 모두 같은 비밀번호로 로그인된다.
	 */
	public String encode(String password) {
		StringBuilder salt = new StringBuilder(16);
		for (int i = 0; i < 16; i++) {
			salt.append(SALT_CHARS.charAt(RANDOM.nextInt(SALT_CHARS.length())));
		}
		byte[] hash = SCrypt.generate(password.getBytes(StandardCharsets.UTF_8),
				salt.toString().getBytes(StandardCharsets.UTF_8), 32768, 8, 1, 64);
		return "scrypt:32768:8:1$" + salt + "$" + Hex.toHexString(hash);
	}

	public boolean matches(String password, String encoded) {
		if (password == null || encoded == null || password.length() > 1024) {
			return false;
		}
		try {
			String[] parts = encoded.split("\\$", -1);
			if (parts.length != 3 || parts[1].isEmpty()) {
				return false;
			}
			String[] method = parts[0].split(":");
			byte[] expected = Hex.decode(parts[2]);
			byte[] actual;
			if (method.length == 4 && "scrypt".equals(method[0])) {
				int n = Integer.parseInt(method[1]);
				int r = Integer.parseInt(method[2]);
				int p = Integer.parseInt(method[3]);
				if (n < 2 || n > 65536 || (n & (n - 1)) != 0 || r < 1 || r > 16 || p < 1 || p > 4 || expected.length != 64) {
					return false;
				}
				actual = SCrypt.generate(password.getBytes(StandardCharsets.UTF_8),
						parts[1].getBytes(StandardCharsets.UTF_8), n, r, p, 64);
			} else if (method.length == 3 && "pbkdf2".equals(method[0]) && "sha256".equals(method[1])) {
				int iterations = Integer.parseInt(method[2]);
				if (iterations < 1 || iterations > 2000000 || expected.length != 32) {
					return false;
				}
				PBEKeySpec spec = new PBEKeySpec(password.toCharArray(), parts[1].getBytes(StandardCharsets.UTF_8), iterations, 256);
				try {
					actual = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(spec).getEncoded();
				} finally {
					spec.clearPassword();
				}
			} else {
				return false;
			}
			return MessageDigest.isEqual(expected, actual);
		} catch (Exception ex) {
			return false;
		}
	}
}

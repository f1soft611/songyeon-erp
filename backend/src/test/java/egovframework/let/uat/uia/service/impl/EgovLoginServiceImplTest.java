package egovframework.let.uat.uia.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import egovframework.com.cmm.LoginVO;

class EgovLoginServiceImplTest {

	// 송연 venv 의 werkzeug 로 'test-pass-1234' 를 해시한 시험값 (WerkzeugPasswordVerifierTest 와 같음)
	private static final String SCRYPT_HASH = "scrypt:32768:8:1$EytJMItJujTjo2h5$"
			+ "1670a16994ade9968a647e3a3581bd06d38525fa60aee5796649005bc0b37e7e"
			+ "610e08e76047e1d6c3c3f161f6106326b3df1ffc3f3bc8c60615911e0ef265ab";

	private EgovLoginServiceImpl newService(LoginDAO loginDAO) {
		EgovLoginServiceImpl service = new EgovLoginServiceImpl();
		ReflectionTestUtils.setField(service, "loginDAO", loginDAO);
		ReflectionTestUtils.setField(service, "passwordVerifier", new WerkzeugPasswordVerifier());
		ReflectionTestUtils.setField(service, "songyeonTenantCode", "SONGYEON");
		return service;
	}

	private LoginVO request(String id, String password) {
		LoginVO requestVO = new LoginVO();
		requestVO.setId(id);
		requestVO.setPassword(password);
		return requestVO;
	}

	@DisplayName("송연 employees 비밀번호(Werkzeug)가 맞으면 사용자 정보를 반환하고 해시는 비운다")
	@Test
	void actionLogin_verifiesWerkzeugHashAndReturnsUser() throws Exception {
		LoginDAO loginDAO = mock(LoginDAO.class);
		LoginVO stored = new LoginVO();
		stored.setId("songyeon-user");
		stored.setTenantId(1L);
		stored.setPassword(SCRYPT_HASH);
		when(loginDAO.actionLoginEmployee("SONGYEON", "songyeon-user")).thenReturn(stored);

		LoginVO result = newService(loginDAO).actionLogin(request(" songyeon-user ", "test-pass-1234"));

		assertEquals("songyeon-user", result.getId());
		assertNull(result.getPassword());
		assertNull(result.getRoleCode());
	}

	@DisplayName("비밀번호가 틀리면 빈 LoginVO를 반환한다")
	@Test
	void actionLogin_returnsEmptyVoWhenPasswordWrong() throws Exception {
		LoginDAO loginDAO = mock(LoginDAO.class);
		LoginVO stored = new LoginVO();
		stored.setId("songyeon-user");
		stored.setTenantId(1L);
		stored.setPassword(SCRYPT_HASH);
		when(loginDAO.actionLoginEmployee("SONGYEON", "songyeon-user")).thenReturn(stored);

		LoginVO result = newService(loginDAO).actionLogin(request("songyeon-user", "wrong-pass"));

		assertNotNull(result);
		assertNull(result.getId());
	}

	@DisplayName("없는 아이디면 빈 LoginVO를 반환한다")
	@Test
	void actionLogin_returnsEmptyVoWhenUserNotFound() throws Exception {
		LoginDAO loginDAO = mock(LoginDAO.class);
		when(loginDAO.actionLoginEmployee("SONGYEON", "unknown")).thenReturn(null);

		LoginVO result = newService(loginDAO).actionLogin(request("unknown", "plain-password"));

		assertNotNull(result);
		assertNull(result.getId());
	}

	@DisplayName("계정 표에서 고른 역할을 그대로 돌려준다(역할이 없어도 로그인은 된다)")
	@Test
	void actionLogin_keepsRoleFromAccount() throws Exception {
		LoginDAO loginDAO = mock(LoginDAO.class);
		LoginVO stored = new LoginVO();
		stored.setId("songyeon-user");
		stored.setTenantId(1L);
		stored.setPassword(SCRYPT_HASH);
		stored.setRoleCode("ADMIN");
		stored.setRoleId(6L);
		when(loginDAO.actionLoginEmployee("SONGYEON", "0000")).thenReturn(stored);

		LoginVO result = newService(loginDAO).actionLogin(request("0000", "test-pass-1234"));

		assertEquals("ADMIN", result.getRoleCode());
		assertEquals(6L, result.getRoleId());
	}

	@DisplayName("송연 로그인 SQL 은 S_ERP 계정 표(login_code = 사번)와 역할을 읽고, 역할이 없어도 줄을 돌려준다")
	@Test
	void actionLoginEmployee_sql_readsLoginAccountAndOptionalRole() throws IOException {
		try (InputStream inputStream = getClass().getClassLoader()
				.getResourceAsStream("egovframework/mapper/let/uat/uia/EgovLoginUsr_SQL_postgresql.xml")) {
			String xml = new String(readAllBytes(inputStream), StandardCharsets.UTF_8);
			String sql = xml.substring(xml.indexOf("<select id=\"actionLoginEmployee\""), xml.indexOf("<!-- 일반 로그인 -->"));
			assertTrue(sql.contains("FROM tb_login_account li"));
			assertTrue(sql.contains("ON e.id = li.login_code"));
			assertTrue(sql.contains("li.password_hash AS password"));
			assertTrue(sql.contains("LEFT JOIN LATERAL"));
			assertTrue(sql.contains("WHERE li.login_code = #{username}"));
		}
	}

	@DisplayName("tenantId가 없으면 PostgreSQL 로그인 SQL은 tenant 조건을 건너뛴다")
	@Test
	void actionLogin_sql_skipsTenantFilterWhenTenantIdMissing() throws IOException {
		try (InputStream inputStream = getClass().getClassLoader()
				.getResourceAsStream("egovframework/mapper/let/uat/uia/EgovLoginUsr_SQL_postgresql.xml")) {
			assertNotNull(inputStream, "로그인 SQL XML 리소스가 존재해야 합니다.");
			String xml = new String(readAllBytes(inputStream), StandardCharsets.UTF_8);
			assertTrue(xml.contains("<if test=\"tenantId != null\">"), "tenantId가 있을 때만 테넌트 조건을 추가해야 합니다.");
			assertTrue(xml.contains("<if test=\"tenantId == null and tenantCode != null and tenantCode != ''\">"), "tenantCode 기반 fallback 조건이 필요합니다.");
		}
	}

	private byte[] readAllBytes(InputStream inputStream) throws IOException {
		ByteArrayOutputStream buffer = new ByteArrayOutputStream();
		byte[] data = new byte[4096];
		int bytesRead;
		while ((bytesRead = inputStream.read(data)) != -1) {
			buffer.write(data, 0, bytesRead);
		}
		return buffer.toByteArray();
	}

	@DisplayName("tenantId는 Long 값으로 유지된다")
	@Test
	void setTenantId_keepsLongValue() {
		LoginVO loginVO = new LoginVO();
		loginVO.setTenantId(42L);

		assertEquals(42L, loginVO.getTenantId());
	}
}
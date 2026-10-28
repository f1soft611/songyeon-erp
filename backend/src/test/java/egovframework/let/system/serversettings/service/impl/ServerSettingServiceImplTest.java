package egovframework.let.system.serversettings.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;


import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import egovframework.com.cmm.util.Fernet;
import egovframework.com.cmm.util.SecretsStore;
import egovframework.let.system.serversettings.domain.model.ServerSettingVO;
import egovframework.let.system.serversettings.domain.repository.ServerSettingDAO;

class ServerSettingServiceImplTest {

	private static final String TEST_SECRET = "test-only-secret";

	private static ServerSettingVO setting(String key, String name, String apiKey, String apiSecret) {
		ServerSettingVO row = new ServerSettingVO();
		row.setServiceKey(key);
		row.setServiceName(name);
		row.setApiKey(apiKey);
		row.setApiSecret(apiSecret);
		row.setBaseUrl("https://example.invalid");
		return row;
	}

	@DisplayName("Fernet: 송연 파이썬(cryptography.fernet)이 잠근 값을 풀고, 여기서 잠근 값은 다시 풀린다")
	@Test
	void fernet_compatibleWithPython() {
		// 파이썬: Fernet(urlsafe_b64encode(sha256(b'test-only-secret').digest())).encrypt('sk-테스트-1234567890')
		String pythonToken = "gAAAAABqv1T6M_ww3l7EpK8IOoTGrQWGUCc-qsnuLWn5-nuqLFO7SR2BH9z7M924c4QQrHAss76pAT5Hu2dn0-XqenFJlgCI42sb2aILCJfkE5B-E6BAj-0=";
		assertEquals("sk-테스트-1234567890", Fernet.decrypt(TEST_SECRET, pythonToken));
		assertNull(Fernet.decrypt("wrong-secret", pythonToken));
		assertEquals("값", Fernet.decrypt(TEST_SECRET, Fernet.encrypt(TEST_SECRET, "값")));
	}

	@DisplayName("SecretsStore: 비밀키가 없으면 잠글 수 없고, 잠긴 값은 빈 값으로, 평문으로 남은 옛 값은 그대로 읽는다")
	@Test
	void secretsStore_rules() {
		SecretsStore none = new SecretsStore("", "");
		assertFalse(none.available());
		assertEquals("", none.unlock("enc:abc"));
		assertEquals("plain-old", none.unlock("plain-old"));
		assertThrows(IllegalStateException.class, () -> none.lock("x"));

		SecretsStore store = new SecretsStore(TEST_SECRET, "");
		String locked = store.lock("sk-abc");
		assertTrue(locked.startsWith("enc:"));
		assertEquals(locked, store.lock(locked)); // 이미 잠긴 값은 다시 잠그지 않는다
		assertEquals("sk-abc", store.unlock(locked));
	}

	@DisplayName("접속 정보: 잠긴 키 · SECRET 을 풀어 주고, 등록된 줄이 없으면 빈 값(2026-10-27 목록 · 저장 기능은 부르는 곳이 없어 뺐다)")
	@Test
	void credentialOf_unlocks() throws Exception {
		SecretsStore store = new SecretsStore(TEST_SECRET, "");
		ServerSettingDAO dao = mock(ServerSettingDAO.class);
		when(dao.selectServerSetting("popbill")).thenReturn(setting("popbill", "팝빌", store.lock("key-123"), store.lock("secret-9")));
		ServerSettingServiceImpl service = new ServerSettingServiceImpl(dao, store);

		ServerSettingVO found = service.credentialOf("popbill");
		assertEquals("key-123", found.getApiKey());
		assertEquals("secret-9", found.getApiSecret());
		assertEquals("https://example.invalid", found.getBaseUrl());

		ServerSettingVO missing = service.credentialOf("nope");
		assertEquals("", missing.getApiKey());
		assertEquals("", missing.getApiSecret());
		assertEquals("", missing.getBaseUrl());
	}
}

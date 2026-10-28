package egovframework.let.qm.temperature.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import egovframework.let.system.serversettings.domain.model.ServerSettingVO;
import egovframework.let.system.serversettings.service.ServerSettingService;
import egovframework.let.qm.temperature.domain.model.TempReadingVO;
import egovframework.let.qm.temperature.domain.model.TempSensorVO;
import egovframework.let.qm.temperature.domain.model.TempSettingsVO;
import egovframework.let.qm.temperature.domain.repository.TemperatureDAO;
import egovframework.let.qm.temperature.service.RadionodeClient;

class TemperatureServiceImplTest {

	/** 외부를 부르지 않고 정해둔 답을 돌려주는 타파쿨로365 */
	static class FakeClient extends RadionodeClient {
		int calls;
		long clock = 1_000_000L;
		int status = 200;
		String body;

		FakeClient(ServerSettingService settings) {
			super(settings);
		}

		@Override
		protected long now() {
			return clock;
		}

		@Override
		protected HttpReply post(String url, String form) {
			calls++;
			return new HttpReply(status, body);
		}
	}

	private static ServerSettingService settings(String key, String secret) throws Exception {
		ServerSettingService service = mock(ServerSettingService.class);
		ServerSettingVO vo = new ServerSettingVO();
		vo.setApiKey(key);
		vo.setApiSecret(secret);
		vo.setBaseUrl("");
		when(service.credentialOf("radionode")).thenReturn(vo);
		return service;
	}

	private static final String ROWS = "{\"status\":true,\"rows\":["
			+ "{\"device_mac\":\"D1\",\"sensor_mac\":\"S1\",\"ch_no\":1,\"device_name\":\"1번 냉장고\",\"ch_name\":\"온도\",\"ch_unit\":\"°C\",\"ch_value\":3.5,\"battery\":80,\"last_update\":\"2026-10-13 15:00:00\",\"sensor_model\":\"TM\"},"
			+ "{\"device_mac\":\"D1\",\"sensor_mac\":\"S2\",\"ch_no\":1,\"device_name\":\"냉동고\",\"ch_name\":\"온도\",\"ch_unit\":\"°C\",\"ch_value\":-12.0}]}";

	private static TempSensorVO sensor(long id, String name, String sensorId, Double min, Double max, String group) {
		TempSensorVO s = new TempSensorVO();
		s.setId(id);
		s.setName(name);
		s.setSensorId(sensorId);
		s.setMinTemp(min);
		s.setMaxTemp(max);
		s.setGroupName(group);
		return s;
	}

	@DisplayName("타파쿨로365: 20초 안에는 다시 부르지 않는다(force 면 부른다). 키가 없거나 막히면 송연 문구")
	@Test
	void client() throws Exception {
		FakeClient client = new FakeClient(settings("abcdef", "sec"));
		client.body = ROWS;
		assertEquals(2, client.channelList(false).getRows().size());
		client.clock += 19_000;
		client.channelList(false);
		assertEquals(1, client.calls);
		client.channelList(true);
		assertEquals(2, client.calls);
		client.clock += 21_000;
		client.channelList(false);
		assertEquals(3, client.calls);
		assertEquals("D1|S1|1", RadionodeClient.channelKey(client.channelList(false).getRows().get(0)));

		assertEquals("타파쿨로365 API 키/시크릿이 설정되지 않았어요", new FakeClient(settings("", "")).channelList(false).getError());
		FakeClient limited = new FakeClient(settings("k", "s"));
		limited.status = 429;
		limited.body = "{\"errcode\":\"common-938\"}";
		assertTrue(limited.channelList(false).getError().startsWith("타파쿨로365 쪽에서 짧은 시간에 접속이 너무 많다고"));
		limited.body = "nope";
		assertEquals("타파쿨로365 응답 오류(429): nope", limited.channelList(false).getError());
		FakeClient wrong = new FakeClient(settings("k", "s"));
		wrong.body = "{\"status\":false}";
		assertEquals("타파쿨로365 조회 실패 (API 키/시크릿을 확인해주세요)", wrong.channelList(false).getError());
	}

	@DisplayName("지금 값: 채널을 찾으면 값·배터리·기준 벗어남, 못 찾으면 그 문구, 타파쿨로365 실패면 모두 같은 오류")
	@Test
	void readings() throws Exception {
		TemperatureDAO dao = mock(TemperatureDAO.class);
		when(dao.selectSensors()).thenReturn(Arrays.asList(
				sensor(1, "1번 냉장고", "D1|S1|1", 0.0, 3.0, "냉장"),
				sensor(2, "냉동고", "D1|S2|1", -25.0, -15.0, null),
				sensor(3, "없어진 센서", "X|Y|1", null, null, null)));
		FakeClient client = new FakeClient(settings("k", "s"));
		client.body = ROWS;
		List<TempReadingVO> rows = new TemperatureServiceImpl(dao, client).readings(false);
		assertTrue(rows.get(0).isOk());
		assertEquals(3.5, rows.get(0).getValue(), 1e-9);
		assertEquals(80, rows.get(0).getBattery());
		assertTrue(rows.get(0).isOutOfRange());
		assertTrue(rows.get(1).isOutOfRange());
		assertFalse(rows.get(2).isOk());
		assertEquals("이 채널을 타파쿨로365에서 더이상 찾을 수 없어요 (센서가 삭제되었거나 통신 문제일 수 있어요)", rows.get(2).getError());

		List<TempReadingVO> failed = new TemperatureServiceImpl(dao, new FakeClient(settings("", ""))).readings(true);
		assertEquals(3, failed.size());
		assertEquals("타파쿨로365 API 키/시크릿이 설정되지 않았어요", failed.get(1).getError());

		TemperatureDAO empty = mock(TemperatureDAO.class);
		when(empty.selectSensors()).thenReturn(Collections.<TempSensorVO>emptyList());
		FakeClient untouched = new FakeClient(settings("k", "s"));
		assertTrue(new TemperatureServiceImpl(empty, untouched).readings(false).isEmpty());
		assertEquals(0, untouched.calls);

		assertFalse(TemperatureServiceImpl.outOfRange(null, 0.0, 1.0));
		assertFalse(TemperatureServiceImpl.outOfRange(5.0, null, null));
		assertFalse(TemperatureServiceImpl.outOfRange(3.0, 0.0, 3.0));
	}

	@DisplayName("연동 여부: 키와 시크릿이 다 있어야, 키는 앞 3글자 ... 뒤 2글자만")
	@Test
	void settingsPreview() throws Exception {
		TempSettingsVO on = new TemperatureServiceImpl(mock(TemperatureDAO.class), new FakeClient(settings("abcdefgh", "s"))).settings();
		assertTrue(on.isConfigured());
		assertEquals("abc...gh", on.getKeyPreview());
		TempSettingsVO half = new TemperatureServiceImpl(mock(TemperatureDAO.class), new FakeClient(settings("abcdefgh", ""))).settings();
		assertFalse(half.isConfigured());
		assertEquals("", new TemperatureServiceImpl(mock(TemperatureDAO.class), new FakeClient(settings("", ""))).settings().getKeyPreview());
	}

	@DisplayName("센서 일괄등록·수정·옮기기: 이름·ID 없는 줄은 건너뛰고, 그룹은 없으면 만든다")
	@Test
	void sensors() throws Exception {
		TemperatureDAO dao = mock(TemperatureDAO.class);
		TemperatureServiceImpl service = new TemperatureServiceImpl(dao, new FakeClient(settings("k", "s")));
		assertEquals("등록할 채널을 선택해주세요", assertThrows(IllegalArgumentException.class, () -> service.createSensors(new ArrayList<TempSensorVO>())).getMessage());
		assertEquals(1, service.createSensors(Arrays.asList(sensor(0, " 1번 냉장고 - 온도 ", "D1|S1|1", null, null, "냉장"), sensor(0, "", "D1|S2|1", null, null, null))));
		ArgumentCaptor<TempSensorVO> saved = ArgumentCaptor.forClass(TempSensorVO.class);
		verify(dao).insertSensor(saved.capture());
		assertEquals("1번 냉장고 - 온도", saved.getValue().getName());
		verify(dao).ensureGroup("냉장");

		assertEquals("센서 이름과 센서 ID는 필수입니다", assertThrows(IllegalArgumentException.class,
				() -> service.updateSensor(1, sensor(0, " ", "D1|S1|1", null, null, null))).getMessage());
		service.updateSensor(1, sensor(0, "냉장고A", "D1|S1|1", 0.0, 5.0, " "));
		ArgumentCaptor<TempSensorVO> updated = ArgumentCaptor.forClass(TempSensorVO.class);
		verify(dao).updateSensor(updated.capture());
		assertEquals(Long.valueOf(1), updated.getValue().getId());
		assertNull(updated.getValue().getGroupName());

		service.moveSensor(1, " ");
		verify(dao).updateSensorGroup(1L, null);
		service.moveSensor(1, "냉동");
		verify(dao).ensureGroup("냉동");
		verify(dao).updateSensorGroup(1L, "냉동");
	}

	@DisplayName("그룹: 빈 이름 막기, 예전 센서 그룹명 채우기, 이름 바꾸면 주기와 센서가 따라감, 같은 이름은 막기, 지우면 센서는 미분류")
	@Test
	void groups() throws Exception {
		TemperatureDAO dao = mock(TemperatureDAO.class);
		TemperatureServiceImpl service = new TemperatureServiceImpl(dao, new FakeClient(settings("k", "s")));
		assertEquals("그룹명을 입력해주세요", assertThrows(IllegalArgumentException.class, () -> service.createGroup(" ")).getMessage());
		when(dao.selectUsedGroupNames()).thenReturn(Arrays.asList("옛그룹"));
		service.listGroups();
		verify(dao).ensureGroup("옛그룹");

		assertEquals("새 그룹명을 입력해주세요", assertThrows(IllegalArgumentException.class, () -> service.renameGroup("냉장", " ")).getMessage());
		when(dao.selectGroupInterval("냉동")).thenReturn(0);
		assertEquals("이미 있는 그룹명이에요", assertThrows(IllegalArgumentException.class, () -> service.renameGroup("냉장", "냉동")).getMessage());
		when(dao.selectGroupInterval("냉장")).thenReturn(180);
		when(dao.selectGroupInterval("1번 냉장고")).thenReturn(null);
		service.renameGroup("냉장", "1번 냉장고");
		verify(dao).deleteGroup("냉장");
		verify(dao).insertGroup("1번 냉장고", 180);
		verify(dao).renameSensorsGroup("냉장", "1번 냉장고");

		service.setRefreshInterval("냉동", null);
		verify(dao).updateGroupInterval("냉동", 0);
		service.deleteGroup("냉동");
		verify(dao).ungroupSensors("냉동");
		verify(dao, times(1)).deleteGroup("냉동");
		verify(dao, never()).deleteSensor(any(Long.class));
	}
}

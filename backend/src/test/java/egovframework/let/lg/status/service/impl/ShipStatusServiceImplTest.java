package egovframework.let.lg.status.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import egovframework.let.lg.status.domain.model.ShipStatusVO;
import egovframework.let.lg.status.domain.repository.ShipStatusDAO;

class ShipStatusServiceImplTest {

	private static ShipStatusVO shipped(long id, String date, String client, String product) {
		ShipStatusVO row = new ShipStatusVO();
		row.setId(id);
		row.setScheduleDate(date);
		row.setClientName(client);
		row.setProductName(product);
		return row;
	}

	private static ShipStatusVO carryover(String type, long scheduleId, double qty, String month, String date) {
		ShipStatusVO co = new ShipStatusVO();
		co.setScheduleType(type);
		co.setScheduleId(scheduleId);
		co.setQty(qty);
		co.setTargetMonth(month);
		co.setTargetDate(date);
		return co;
	}

	@DisplayName("기간이 비면 막고(DB 안 읽음), 조건은 앞뒤 공백을 떼고 빈 조건은 null")
	@Test
	void period() throws Exception {
		ShipStatusDAO dao = mock(ShipStatusDAO.class);
		ShipStatusServiceImpl service = new ShipStatusServiceImpl(dao);
		assertEquals("조회 기간을 선택해주세요", assertThrows(IllegalArgumentException.class, () -> service.listStatus(" ", "2026-10-07", null, null)).getMessage());
		verify(dao, never()).selectShipped(anyBoolean(), any(), any(), any(), any());
		service.listStatus(" 2026-10-01 ", "2026-10-07", " 소스 ", " ");
		verify(dao).selectShipped(false, "2026-10-01", "2026-10-07", "소스", null);
		verify(dao).selectShipped(true, "2026-10-01", "2026-10-07", "소스", null);
	}

	@DisplayName("두 곳을 합쳐 출고일·거래처 순, 이월은 양을 더하고 넘긴 때(날짜 우선, 없으면 달)를 모은다, 보관방법을 붙인다")
	@Test
	void mergeAndCarryover() throws Exception {
		ShipStatusDAO dao = mock(ShipStatusDAO.class);
		ShipStatusServiceImpl service = new ShipStatusServiceImpl(dao);
		when(dao.selectShipped(false, "2026-10-01", "2026-10-07", null, null)).thenReturn(Arrays.asList(
				shipped(7, "2026-10-06", "나", "로제파스타소스(5kg*4ea)"), shipped(3, "2026-10-02", "가", "김치찌개분말")));
		when(dao.selectShipped(true, "2026-10-01", "2026-10-07", null, null)).thenReturn(Collections.singletonList(
				shipped(7, "2026-10-06", "가", "국물")));
		when(dao.selectCarryovers()).thenReturn(Arrays.asList(
				carryover("logistics", 7, 100, "2026-11", "2026-11-05"), carryover("logistics", 7, 35, "2026-10", null),
				carryover("production", 99, 1, null, null)));
		ShipStatusVO rose = new ShipStatusVO();
		rose.setName("로제파스타소스");
		rose.setSpec("5kg*4ea");
		rose.setStorage("냉동");
		when(dao.selectProductStorage()).thenReturn(Collections.singletonList(rose));

		List<ShipStatusVO> rows = service.listStatus("2026-10-01", "2026-10-07", null, null);
		assertEquals(Arrays.asList(3L, 7L, 7L), Arrays.asList(rows.get(0).getId(), rows.get(1).getId(), rows.get(2).getId()));
		assertEquals("production", rows.get(1).getScheduleType()); // 같은 날 '가' 가 '나' 보다 앞
		assertEquals(Boolean.FALSE, rows.get(1).getCarriedOver()); // 생산확정 7 은 이월이 없다
		ShipStatusVO carried = rows.get(2);
		assertEquals("logistics", carried.getScheduleType());
		assertEquals(Boolean.TRUE, carried.getCarriedOver());
		assertEquals(135.0, carried.getCarryoverQty());
		assertEquals("이월(2026-10, 2026-11-05)", carried.getCarryoverLabel());
		assertEquals("냉동", carried.getStorage());
		assertEquals("", rows.get(0).getCarryoverLabel());
	}
}

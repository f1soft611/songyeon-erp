package egovframework.let.co.schedule.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
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

import egovframework.let.co.schedule.domain.model.LogisticsScheduleVO;
import egovframework.let.co.schedule.domain.model.ProductionScheduleVO;
import egovframework.let.co.schedule.domain.model.TvScheduleRowVO;
import egovframework.let.co.schedule.domain.repository.ScheduleDAO;

class ScheduleServiceImplTest {

	private static LogisticsScheduleVO row(long id, String source) {
		LogisticsScheduleVO r = new LogisticsScheduleVO();
		r.setId(id);
		r.setSource(source);
		return r;
	}

	@DisplayName("날짜가 없으면 생산·물류 모두 막고 DB 를 읽지 않는다")
	@Test
	void dateRequired() throws Exception {
		ScheduleDAO dao = mock(ScheduleDAO.class);
		ScheduleServiceImpl service = new ScheduleServiceImpl(dao);
		assertEquals("date 파라미터가 필요합니다", assertThrows(IllegalArgumentException.class, () -> service.listProductionSchedule(" ")).getMessage());
		assertEquals("date 파라미터가 필요합니다", assertThrows(IllegalArgumentException.class, () -> service.listLogisticsSchedule(null)).getMessage());
		verify(dao, never()).selectProductionSchedule(any());
		verify(dao, never()).selectManualLogistics(any());
	}

	@DisplayName("물류스케줄은 출하등록 줄 다음에 생산연동 줄을 붙이고, 날짜 앞뒤 공백은 뗀다")
	@Test
	void logisticsManualThenProduction() throws Exception {
		ScheduleDAO dao = mock(ScheduleDAO.class);
		when(dao.selectManualLogistics("2026-09-21")).thenReturn(Arrays.asList(row(3, "manual"), row(4, "manual")));
		when(dao.selectProductionLogistics("2026-09-21")).thenReturn(Collections.singletonList(row(2, "production")));
		List<LogisticsScheduleVO> rows = new ScheduleServiceImpl(dao).listLogisticsSchedule(" 2026-09-21 ");
		assertEquals(3, rows.size());
		assertEquals("production", rows.get(2).getSource());
	}

	@DisplayName("현장 TV(공개)는 거래처·품목명·수량·비고만 내려주고, 날짜가 없으면 막는다")
	@Test
	void tvRowsOnlyVisibleFields() throws Exception {
		ScheduleDAO dao = mock(ScheduleDAO.class);
		ProductionScheduleVO p = new ProductionScheduleVO();
		p.setId(2L);
		p.setClientName("A");
		p.setProductName("P");
		p.setOrderQty("1000");
		p.setActualQty("980");
		p.setNote("n");
		p.setLogisticsDate("2026-09-21");
		when(dao.selectProductionSchedule("2026-09-21")).thenReturn(Collections.singletonList(p));
		ScheduleServiceImpl service = new ScheduleServiceImpl(dao);
		List<TvScheduleRowVO> rows = service.listProductionScheduleForTv("2026-09-21");
		assertEquals(1, rows.size());
		TvScheduleRowVO row = rows.get(0);
		assertEquals("A|P|1000|n", row.getClientName() + "|" + row.getProductName() + "|" + row.getOrderQty() + "|" + row.getNote());
		assertThrows(IllegalArgumentException.class, () -> service.listLogisticsScheduleForTv(""));
	}
}

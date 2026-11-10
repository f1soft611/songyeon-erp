package egovframework.let.qm.inspection.productinspection.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Collections;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import egovframework.let.qm.inspection.productinspection.domain.model.InspectionLotVO;
import egovframework.let.qm.inspection.productinspection.domain.model.ProductSpecRowVO;
import egovframework.let.qm.inspection.productinspection.domain.model.ProductSpecStatsVO;
import egovframework.let.qm.inspection.productinspection.domain.repository.ProductInspectionDAO;

class ProductInspectionServiceImplTest {

	private ProductInspectionDAO dao;
	private ProductInspectionServiceImpl service;

	@BeforeEach
	void setUp() {
		dao = mock(ProductInspectionDAO.class);
		service = new ProductInspectionServiceImpl(dao);
	}

	private static ProductSpecRowVO row(String code) {
		ProductSpecRowVO r = new ProductSpecRowVO();
		r.setCode(code);
		return r;
	}

	@DisplayName("보기 조건: 빈 값 · 규격없음 = 전체, 유형있음 = Y, 유형없음 = N. 검색어는 앞뒤 공백을 지우고 비면 null")
	@Test
	void listProductSpecs_filters() throws Exception {
		List<ProductSpecRowVO> rows = Collections.singletonList(row("000007"));
		when(dao.selectProductSpecs(any(), any())).thenReturn(rows);

		assertEquals(rows, service.listProductSpecs("  간장 ", ""));
		verify(dao).selectProductSpecs("간장", null);
		service.listProductSpecs("   ", null);
		verify(dao).selectProductSpecs(null, null);
		service.listProductSpecs(null, "규격없음");
		verify(dao, times(2)).selectProductSpecs(null, null);
		service.listProductSpecs(null, "유형있음");
		verify(dao).selectProductSpecs(null, "Y");
		service.listProductSpecs(null, "유형없음");
		verify(dao).selectProductSpecs(null, "N");
	}

	@DisplayName("규격있음: 제품별 기준 표가 아직 없어 넣은 기준이 하나도 없다 → 0줄(DB 를 읽지 않음)")
	@Test
	void listProductSpecs_withSpecIsEmpty() throws Exception {
		assertTrue(service.listProductSpecs("간장", "규격있음").isEmpty());
		verify(dao, never()).selectProductSpecs(any(), any());
	}

	@DisplayName("모르는 보기 조건은 거절한다")
	@Test
	void listProductSpecs_rejectsUnknownOnly() {
		IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> service.listProductSpecs(null, "아무거나"));
		assertEquals("보기 조건이 올바르지 않습니다", ex.getMessage());
	}

	@DisplayName("요약: 제품 수 · 식품유형 정한 수는 DB, 규격 넣은 수는 0")
	@Test
	void specStats() throws Exception {
		ProductSpecStatsVO stats = new ProductSpecStatsVO();
		stats.setTotal(6);
		stats.setTyped(2);
		stats.setWithSpec(5);
		when(dao.selectSpecStats()).thenReturn(stats);

		ProductSpecStatsVO out = service.specStats();
		assertEquals(6, out.getTotal());
		assertEquals(2, out.getTyped());
		assertEquals(0, out.getWithSpec());
	}

	private static InspectionLotVO lot() {
		InspectionLotVO l = new InspectionLotVO();
		l.setLotId(1);
		l.setMadeOn("2026-11-05");
		return l;
	}

	private InspectionLotVO only(InspectionLotVO l) throws Exception {
		when(dao.selectLots(any(), any(), anyBoolean(), anyBoolean())).thenReturn(Collections.singletonList(l));
		return service.listLots(null, null, null, false).get(0);
	}

	@DisplayName("로트 조건: 날짜 기준 빈 값 = 제조일, ship = 출고일. 기간은 둘 다 있을 때만, 생산예정도는 그대로 넘긴다")
	@Test
	void listLots_filters() throws Exception {
		when(dao.selectLots(any(), any(), anyBoolean(), anyBoolean())).thenReturn(Collections.emptyList());

		service.listLots(" 2026-11-01 ", "2026-11-30", null, false);
		verify(dao).selectLots("2026-11-01", "2026-11-30", false, false);
		service.listLots("2026-11-01", "2026-11-30", "ship", true);
		verify(dao).selectLots("2026-11-01", "2026-11-30", true, true);
		service.listLots("2026-11-01", "", "made", false);
		verify(dao).selectLots(null, null, false, false);
	}

	@DisplayName("모르는 날짜 기준은 거절한다")
	@Test
	void listLots_rejectsUnknownDateBy() {
		IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> service.listLots(null, null, "아무거나", false));
		assertEquals("날짜 기준이 올바르지 않습니다", ex.getMessage());
	}

	@DisplayName("생산량: 실생산량이 있으면 그것, 없으면 주문량(예정)")
	@Test
	void listLots_qty() throws Exception {
		InspectionLotVO done = lot();
		done.setActualQty("120");
		done.setOrderQty("100");
		InspectionLotVO out = only(done);
		assertEquals("120", out.getQty());
		assertTrue(out.getQtyIsActual());

		InspectionLotVO plan = lot();
		plan.setActualQty("  ");
		plan.setOrderQty("100");
		out = only(plan);
		assertEquals("100", out.getQty());
		assertFalse(out.getQtyIsActual());
	}

	@DisplayName("출고일: 확정 출하줄 → 확정, 확정 안 된 출하줄 → 예정, 없으면 물류출고일 → 예정, 둘 다 없으면 미정(재고생산이면 재고생산)")
	@Test
	void listLots_shipState() throws Exception {
		InspectionLotVO a = lot();
		a.setDoneShipDates("2026-11-06 / 2026-11-07");
		a.setPlannedShipDates("2026-11-09");
		a.setLogisticsDate("2026-11-10");
		InspectionLotVO out = only(a);
		assertEquals("2026-11-06 / 2026-11-07", out.getShippedOn());
		assertEquals("확정", out.getShipState());

		InspectionLotVO b = lot();
		b.setPlannedShipDates("2026-11-09");
		b.setLogisticsDate("2026-11-10");
		out = only(b);
		assertEquals("2026-11-09", out.getShippedOn());
		assertEquals("예정", out.getShipState());

		InspectionLotVO c = lot();
		c.setLogisticsDate("2026-11-10");
		out = only(c);
		assertEquals("2026-11-10", out.getShippedOn());
		assertEquals("예정", out.getShipState());

		InspectionLotVO d = lot();
		d.setLogisticsDate(" ");
		out = only(d);
		assertEquals("미정", out.getShippedOn());
		assertEquals("미정", out.getShipState());

		InspectionLotVO e = lot();
		e.setStockProduction(1);
		out = only(e);
		assertEquals("미정", out.getShippedOn());
		assertEquals("재고생산", out.getShipState());
	}

	@DisplayName("소비기한: 제조일로부터 N단위(없으면 개월)까지 [보관방법]. 개월수가 없으면 비움. 성적서는 늘 없음")
	@Test
	void listLots_shelfLifeAndRecord() throws Exception {
		InspectionLotVO a = lot();
		a.setShelfLifeMonths(12);
		a.setStorage("냉장");
		InspectionLotVO out = only(a);
		assertEquals("제조일로부터 12개월까지 [냉장]", out.getShelfLife());
		assertNull(out.getRecordId());
		assertNull(out.getRecordStatus());

		InspectionLotVO b = lot();
		b.setShelfLifeMonths(30);
		b.setShelfLifeUnit("일");
		assertEquals("제조일로부터 30일까지", only(b).getShelfLife());

		assertEquals("", only(lot()).getShelfLife());
	}
}

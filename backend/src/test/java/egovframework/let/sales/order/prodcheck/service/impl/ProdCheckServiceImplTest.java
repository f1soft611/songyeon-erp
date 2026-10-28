package egovframework.let.sa.feasibility.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import egovframework.let.sa.feasibility.domain.model.FeasibilityDataVO;
import egovframework.let.sa.feasibility.domain.model.FeasibilityLineVO;
import egovframework.let.sa.feasibility.domain.model.FeasibilityRequestVO;
import egovframework.let.sa.feasibility.domain.model.FeasibilityResultVO;
import egovframework.let.sa.feasibility.domain.model.FeasibilityRowVO;
import egovframework.let.sa.feasibility.domain.repository.FeasibilityDAO;

class FeasibilityServiceImplTest {

	private static FeasibilityDataVO product(String code, String name, String spec) {
		FeasibilityDataVO p = new FeasibilityDataVO();
		p.setCode(code);
		p.setName(name);
		p.setSpec(spec);
		return p;
	}

	private static FeasibilityDataVO bom(String code, String name, Double ratio) {
		FeasibilityDataVO b = new FeasibilityDataVO();
		b.setMaterialCode(code);
		b.setMaterialName(name);
		b.setRatioPercent(ratio);
		return b;
	}

	private static FeasibilityDataVO stock(String code, String name, double qty) {
		FeasibilityDataVO m = new FeasibilityDataVO();
		m.setCode(code);
		m.setName(name);
		m.setStockQty(qty);
		return m;
	}

	private static FeasibilityDataVO delta(String code, double qty) {
		FeasibilityDataVO d = new FeasibilityDataVO();
		d.setCode(code);
		d.setQty(qty);
		return d;
	}

	private static FeasibilityLineVO line(String product, String qty) {
		FeasibilityLineVO l = new FeasibilityLineVO();
		l.setProduct(product);
		l.setQty(qty);
		return l;
	}

	private static FeasibilityRequestVO request(String date, FeasibilityLineVO... lines) {
		FeasibilityRequestVO r = new FeasibilityRequestVO();
		r.setDate(date);
		r.setLines(Arrays.asList(lines));
		return r;
	}

	private static FeasibilityDAO dao() throws Exception {
		FeasibilityDAO dao = mock(FeasibilityDAO.class);
		when(dao.selectProductNameSpecs()).thenReturn(Arrays.asList(product("000001", "A소스", "1kg"), product("000002", "B소스", null), product("000003", "빈BOM", null)));
		// A소스: 양파 50%, 설탕 50% / B소스: 설탕 30%, 목록에 없는 원재료 70%
		when(dao.selectBomLines("000001")).thenReturn(Arrays.asList(bom("M1", "양파", 0.5), bom("M2", "설탕", 0.5)));
		when(dao.selectBomLines("000002")).thenReturn(Arrays.asList(bom("M2", "설탕", 0.3), bom("M9", "없는원재료", 0.7)));
		when(dao.selectBomLines("000003")).thenReturn(Collections.<FeasibilityDataVO>emptyList());
		when(dao.selectMaterialStocks()).thenReturn(Arrays.asList(stock("M1", "양파", 1000), stock("M2", "설탕", 800)));
		when(dao.selectReceivingAfter(anyString())).thenReturn(Collections.singletonList(delta("M1", 200))); // 그 뒤에 들어온 200
		when(dao.selectUsageAfter(anyString())).thenReturn(Collections.singletonList(delta("M2", 100))); // 그 뒤에 쓴 100
		when(dao.selectMovementAfter(anyString())).thenReturn(Collections.<FeasibilityDataVO>emptyList());
		when(dao.selectAdjustmentAfter(anyString())).thenReturn(Collections.<FeasibilityDataVO>emptyList());
		return dao;
	}

	@DisplayName("만들 것이 없거나 수량이 비면 막는다(쉼표 수량은 읽는다)")
	@Test
	void validation() throws Exception {
		FeasibilityServiceImpl service = new FeasibilityServiceImpl(dao());
		assertEquals("제품을 하나 이상 골라주세요", assertThrows(IllegalArgumentException.class, () -> service.check(request("2026-10-06"))).getMessage());
		assertEquals("'A소스(1kg)' 의 생산수량을 적어주세요",
				assertThrows(IllegalArgumentException.class, () -> service.check(request("2026-10-06", line("A소스(1kg)", "")))).getMessage());
		assertEquals(1000.0, FeasibilityServiceImpl.parseQty("1,000kg"), 1e-9);
	}

	@DisplayName("합계: 필요량 = 생산량 × 비율, 그 날짜 재고 = 지금 - 뒤의 증감, 목록에 없는 원재료는 재고 0, 모자란 것이 위로")
	@Test
	void totals() throws Exception {
		FeasibilityResultVO r = new FeasibilityServiceImpl(dao()).check(request("2026-10-01", line("A소스(1kg)", "1,000"), line("B소스", "1000")));
		// 양파 필요 500, 재고 1000-200=800 / 설탕 필요 500+300=800, 재고 800+100=900 / 없는원재료 필요 700, 재고 0
		List<FeasibilityRowVO> rows = r.getRows();
		assertEquals(3, rows.size());
		assertEquals("M9", rows.get(0).getCode());
		assertFalse(rows.get(0).getKnown());
		assertEquals(700.0, rows.get(0).getShortage(), 1e-9);
		FeasibilityRowVO sugar = rows.stream().filter(x -> "M2".equals(x.getCode())).findFirst().get();
		assertEquals(800.0, sugar.getNeedQty(), 1e-9);
		assertEquals(900.0, sugar.getStockQty(), 1e-9);
		assertEquals(100.0, sugar.getAfterQty(), 1e-9);
		assertEquals(Arrays.asList(500.0, 300.0), sugar.getPer());
		FeasibilityRowVO onion = rows.stream().filter(x -> "M1".equals(x.getCode())).findFirst().get();
		assertEquals(800.0, onion.getStockQty(), 1e-9);
		assertEquals(1, r.getShortageCount());
		assertFalse(r.getOk());
		assertTrue(r.getUnknownProducts().isEmpty());
		// 제품 하나씩: A소스만이면 넉넉, B소스만이면 1가지 부족
		assertTrue(r.getByProduct().get(0).getOk());
		assertEquals(1, r.getByProduct().get(1).getShortageCount());
		assertFalse(r.getByProduct().get(1).getOk());
		assertEquals(1000.0, r.getLines().get(0).getQtyKg(), 1e-9);
	}

	@DisplayName("배합비를 못 찾은 제품(없는 이름·빈 배합비)은 unknown, 판정은 넉넉이 아니다")
	@Test
	void unknownProducts() throws Exception {
		FeasibilityResultVO r = new FeasibilityServiceImpl(dao()).check(request("2026-10-01", line("A소스(1kg)", "10"), line("빈BOM", "10"), line("없는제품", "5")));
		assertEquals(Arrays.asList("빈BOM", "없는제품"), r.getUnknownProducts());
		assertEquals(0, r.getShortageCount());
		assertFalse(r.getOk());
		assertFalse(r.getByProduct().get(1).getOk());
	}

	@DisplayName("제품 목록은 이름(규격)을 가나다 순으로")
	@Test
	void productsSorted() throws Exception {
		FeasibilityDAO dao = mock(FeasibilityDAO.class);
		when(dao.selectBomProducts()).thenReturn(Arrays.asList(product("1", "하소스", null), product("2", "가소스", "2kg")));
		assertEquals(Arrays.asList("가소스(2kg)", "하소스"), new FeasibilityServiceImpl(dao).listProducts());
	}
}

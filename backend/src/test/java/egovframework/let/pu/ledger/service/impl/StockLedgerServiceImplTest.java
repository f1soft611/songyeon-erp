package egovframework.let.pu.ledger.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import egovframework.let.common.inventory.service.MaterialStockSnapshotService;
import egovframework.let.common.inventory.service.WarehouseSplit;
import egovframework.let.pu.ledger.domain.model.LedgerDataVO;
import egovframework.let.pu.ledger.domain.model.LedgerRowVO;
import egovframework.let.pu.ledger.domain.model.StockAsOfVO;
import egovframework.let.pu.ledger.domain.repository.StockLedgerDAO;

class StockLedgerServiceImplTest {

	private static LedgerDataVO material(String code, String name, double stock, Double safety, Double baseOrder, Double price, String... suppliers) {
		LedgerDataVO m = new LedgerDataVO();
		m.setCode(code);
		m.setName(name);
		m.setStockQty(stock);
		m.setSafetyStock(safety);
		m.setBaseOrderQty(baseOrder);
		m.setUnitPrice(price);
		m.setSuppliers(suppliers.length == 0 ? null : suppliers);
		return m;
	}

	private static LedgerDataVO daily(String code, String d, Double qty) {
		LedgerDataVO r = new LedgerDataVO();
		r.setCode(code);
		r.setD(d);
		r.setQty(qty);
		return r;
	}

	private static LedgerDataVO movement(String code, String d, double in, double out) {
		LedgerDataVO r = new LedgerDataVO();
		r.setCode(code);
		r.setD(d);
		r.setInQty(in);
		r.setOutQty(out);
		return r;
	}

	private static Map<String, Double> map(Object... pairs) {
		Map<String, Double> m = new HashMap<>();
		for (int i = 0; i < pairs.length; i += 2) {
			m.put((String) pairs[i], (Double) pairs[i + 1]);
		}
		return m;
	}

	private static MaterialStockSnapshotService snapshot() throws Exception {
		MaterialStockSnapshotService s = mock(MaterialStockSnapshotService.class);
		when(s.warehouseSplit(anyString())).thenReturn(new WarehouseSplit(Arrays.asList("자재창고", "계량창고"), "자재창고",
				Collections.singletonMap("M1", Collections.singletonMap("계량창고", 10.0))));
		return s;
	}

	@DisplayName("기간 필수(송연 문구), 날짜 형식이 틀려도 같은 문구로 막고 아무것도 읽지 않는다")
	@Test
	void periodRequired() throws Exception {
		StockLedgerDAO dao = mock(StockLedgerDAO.class);
		StockLedgerServiceImpl service = new StockLedgerServiceImpl(dao, snapshot());
		assertEquals("start, end 파라미터가 필요합니다", assertThrows(IllegalArgumentException.class, () -> service.ledger("2026-10-01", " ")).getMessage());
		assertEquals("start, end 파라미터가 필요합니다", assertThrows(IllegalArgumentException.class, () -> service.ledger("10/01", "2026-10-13")).getMessage());
		verify(dao, never()).selectMaterials();
	}

	@DisplayName("수불 한 줄: 전일재고(시작 전날 끝)·남은재고(끝날 끝)는 공통 되감기로, 날짜별 사용·입고에 손으로 고친 것도 더한다, 조사·발주·창고 나누기")
	@Test
	void ledgerRow() throws Exception {
		StockLedgerDAO dao = mock(StockLedgerDAO.class);
		MaterialStockSnapshotService snapshot = snapshot();
		when(snapshot.deltaAfter("2026-10-05")).thenReturn(map("M1", 40.0));
		when(snapshot.deltaAfter("2026-10-07")).thenReturn(map("M1", 5.0));
		when(dao.selectMaterials()).thenReturn(Arrays.asList(material("M1", "백설탕", 100, 120.0, 50.0, 1000.0, "대한상사"), material("M2", "소금", 10, null, null, null)));
		when(dao.selectOrders("2026-10-06", "2026-10-07")).thenReturn(Collections.singletonList(daily("M1", "2026-10-07", 300.0)));
		when(dao.selectUsage("2026-10-06", "2026-10-07")).thenReturn(Collections.singletonList(daily("M1", "2026-10-06", 20.0)));
		when(dao.selectReceiving("2026-10-06", "2026-10-07")).thenReturn(Collections.singletonList(daily("M1", "2026-10-07", 30.0)));
		when(dao.selectMovements("2026-10-06", "2026-10-07")).thenReturn(Arrays.asList(movement("M1", "2026-10-06", 0, 1.5), movement("M1", "2026-10-07", 2.0, 0)));
		LedgerDataVO adjust = daily("M1", null, -3.0);
		adjust.setNotes("실사,파손");
		when(dao.selectAdjustments("2026-10-06", "2026-10-07")).thenReturn(Collections.singletonList(adjust));

		List<LedgerRowVO> rows = new StockLedgerServiceImpl(dao, snapshot).ledger(" 2026-10-06 ", "2026-10-07");
		LedgerRowVO m1 = rows.get(0);
		assertEquals(60.0, m1.getBaseStock(), 1e-9);
		assertEquals(95.0, m1.getRemainingStock(), 1e-9);
		assertEquals(21.5, m1.getUsageByDate().get("2026-10-06"), 1e-9);
		assertEquals(32.0, m1.getReceivingByDate().get("2026-10-07"), 1e-9);
		assertEquals(21.5, m1.getTotalUsage(), 1e-9);
		assertEquals(32.0, m1.getTotalReceiving(), 1e-9);
		assertEquals(300.0, m1.getOrderByDate().get("2026-10-07"), 1e-9);
		assertEquals(-3.0, m1.getTotalAdjust(), 1e-9);
		assertEquals("실사,파손", m1.getAdjustNote());
		assertEquals(50.0, m1.getSuggestedOrderQty(), 1e-9);
		assertTrue(m1.isBelowSafety());
		assertEquals(Collections.singletonList("대한상사"), m1.getSuppliers());
		assertEquals(85.0, m1.getWarehouseStock().get(0).getQty(), 1e-9);
		assertEquals(10.0, m1.getWarehouseStock().get(1).getQty(), 1e-9);

		LedgerRowVO m2 = rows.get(1);
		assertEquals(10.0, m2.getBaseStock(), 1e-9);
		assertEquals(10.0, m2.getRemainingStock(), 1e-9);
		assertTrue(m2.getUsageByDate().isEmpty());
		assertEquals(0.0, m2.getTotalAdjust(), 1e-9);
		assertEquals("", m2.getAdjustNote());
		assertNull(m2.getSuggestedOrderQty());
		assertFalse(m2.isBelowSafety());
		assertTrue(m2.getSuppliers().isEmpty());
	}

	@DisplayName("미리 채울 발주량: 기초발주량이 없거나 0 이면 모자란 만큼, 안전재고 이상이면 없음")
	@Test
	void suggestedOrder() throws Exception {
		StockLedgerDAO dao = mock(StockLedgerDAO.class);
		MaterialStockSnapshotService snapshot = snapshot();
		when(snapshot.deltaAfter(anyString())).thenReturn(new HashMap<String, Double>());
		when(dao.selectMaterials()).thenReturn(Arrays.asList(material("A", "가", 30, 100.0, null, null), material("B", "나", 30, 100.0, 0.0, null), material("C", "다", 100, 100.0, 5.0, null)));
		List<LedgerRowVO> rows = new StockLedgerServiceImpl(dao, snapshot).ledger("2026-10-01", "2026-10-01");
		assertEquals(70.0, rows.get(0).getSuggestedOrderQty(), 1e-9);
		assertEquals(70.0, rows.get(1).getSuggestedOrderQty(), 1e-9);
		assertNull(rows.get(2).getSuggestedOrderQty());
	}

	@DisplayName("기준일 재고: 되감은 재고 × 단가, 단가 없으면 금액 비우고 합계에서 뺀다, 날짜를 비우면 오늘")
	@Test
	void stockAsOf() throws Exception {
		StockLedgerDAO dao = mock(StockLedgerDAO.class);
		MaterialStockSnapshotService snapshot = snapshot();
		when(snapshot.deltaAfter("2026-10-10")).thenReturn(map("M1", 20.0));
		when(dao.selectMaterials()).thenReturn(Arrays.asList(material("M1", "백설탕", 100, null, null, 1000.0), material("M2", "소금", 10, null, null, null)));
		StockAsOfVO result = new StockLedgerServiceImpl(dao, snapshot).stockAsOf("2026-10-10");
		assertEquals("2026-10-10", result.getDate());
		assertEquals(80.0, result.getMaterials().get(0).getStockQty(), 1e-9);
		assertEquals(80000.0, result.getMaterials().get(0).getAmount(), 1e-9);
		assertNull(result.getMaterials().get(1).getAmount());
		assertEquals(80000.0, result.getTotalAmount(), 1e-9);
		assertEquals(Arrays.asList("자재창고", "계량창고"), result.getWarehouses());
		when(snapshot.deltaAfter(anyString())).thenReturn(new HashMap<String, Double>());
		assertTrue(new StockLedgerServiceImpl(dao, snapshot).stockAsOf(" ").getDate().matches("\\d{4}-\\d{2}-\\d{2}"));
	}
}

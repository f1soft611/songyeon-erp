package egovframework.let.sales.shipment.shipmentregister.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
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
import org.mockito.ArgumentCaptor;

import egovframework.let.sales.order.orderregister.domain.model.OrderProductVO;
import egovframework.let.sales.order.orderregister.service.SalesOrderService;
import egovframework.let.sales.shipment.shipmentregister.domain.model.LotAllocationVO;
import egovframework.let.sales.shipment.shipmentregister.domain.model.LotRowVO;
import egovframework.let.sales.shipment.shipmentregister.domain.model.ProductLotListVO;
import egovframework.let.sales.shipment.shipmentregister.domain.model.ShipmentVO;
import egovframework.let.sales.shipment.shipmentregister.domain.repository.ShipmentDAO;

class ShipmentServiceImplTest {

	private static final String CLIENT = "(주) 디에이치식품";
	private static final String PRODUCT = "국물두루치기분말(1kg*10ea)";

	private static SalesOrderService orders() throws Exception {
		SalesOrderService orders = mock(SalesOrderService.class);
		when(orders.resolveSalesClient(CLIENT)).thenReturn(CLIENT);
		when(orders.resolveProductCode(eq(PRODUCT), any(), any())).thenReturn("000001");
		when(orders.requireProductCode(eq(PRODUCT), any(), any())).thenReturn("000001");
		when(orders.requireClientCode(CLIENT)).thenReturn("000005");
		OrderProductVO product = new OrderProductVO();
		product.setCode("000001");
		product.setName("국물두루치기분말");
		product.setSpec("1kg*10ea");
		when(orders.listProductCandidates()).thenReturn(Collections.singletonList(product));
		return orders;
	}

	private static ShipmentVO request() {
		ShipmentVO r = new ShipmentVO();
		r.setScheduleDate("2026-10-06");
		r.setClientName(CLIENT);
		r.setProductName(PRODUCT);
		r.setOrderQty("500");
		return r;
	}

	private static ShipmentVO state(Integer confirmed, Long sourceOrderId) {
		ShipmentVO s = new ShipmentVO();
		s.setId(3L);
		s.setShipConfirmed(confirmed);
		s.setSourceOrderId(sourceOrderId);
		return s;
	}

	private static Map<String, Object> item(Object lotId, Object qty) {
		Map<String, Object> m = new HashMap<>();
		m.put("lotId", lotId);
		m.put("qty", qty);
		return m;
	}

	@DisplayName("목록: 날짜 필수, 출하등록 줄에 로트 배분을 붙이고 생산연동 줄을 뒤에 둔다")
	@Test
	void listsManualThenProduction() throws Exception {
		ShipmentDAO dao = mock(ShipmentDAO.class);
		ShipmentServiceImpl service = new ShipmentServiceImpl(dao, orders());
		assertEquals("date 파라미터가 필요합니다", assertThrows(IllegalArgumentException.class, () -> service.listShipments(" ")).getMessage());

		ShipmentVO manual = new ShipmentVO();
		manual.setId(3L);
		ShipmentVO other = new ShipmentVO();
		other.setId(4L);
		ShipmentVO production = new ShipmentVO();
		production.setId(2L);
		production.setSource("production");
		LotAllocationVO allocation = new LotAllocationVO();
		allocation.setShipmentId(3L);
		allocation.setQty(100.0);
		when(dao.selectManualShipments("2026-09-21")).thenReturn(Arrays.asList(manual, other));
		when(dao.selectAllocationsByDate("2026-09-21")).thenReturn(Collections.singletonList(allocation));
		when(dao.selectProductionShipments("2026-09-21")).thenReturn(Collections.singletonList(production));

		List<ShipmentVO> rows = service.listShipments("2026-09-21");
		assertEquals(3, rows.size());
		assertEquals(1, rows.get(0).getLotAllocations().size());
		assertTrue(rows.get(1).getLotAllocations().isEmpty());
		assertEquals("production", rows.get(2).getSource());
	}

	@DisplayName("추가: 날짜·거래처를 확인하고, 같은 날 순서 +1, 제품코드를 찾는다")
	@Test
	void createsShipment() throws Exception {
		ShipmentDAO dao = mock(ShipmentDAO.class);
		when(dao.selectMaxSortOrder("2026-10-06")).thenReturn(4);
		doAnswer(inv -> {
			((ShipmentVO) inv.getArgument(0)).setId(9L);
			return null;
		}).when(dao).insertShipment(any());
		ShipmentServiceImpl service = new ShipmentServiceImpl(dao, orders());

		ShipmentVO noDate = request();
		noDate.setScheduleDate("");
		assertEquals("날짜가 필요합니다", assertThrows(IllegalArgumentException.class, () -> service.createShipment(noDate)).getMessage());

		assertEquals(Long.valueOf(9L), service.createShipment(request()));
		ArgumentCaptor<ShipmentVO> saved = ArgumentCaptor.forClass(ShipmentVO.class);
		verify(dao).insertShipment(saved.capture());
		assertEquals(5, saved.getValue().getSortOrder());
		assertEquals("000001", saved.getValue().getProductCode());
		assertEquals("000005", saved.getValue().getClientCode());
		assertNull(saved.getValue().getLotId());
		verify(dao, never()).updateOrderImportedShipment(anyLong(), any(Integer.class));
	}

	@DisplayName("수주에서 가져온 줄: 같은 수주의 로트를 자동 연결하고 로트 출하량에 더하고, 수주에 가져감 표시")
	@Test
	void createFromOrderLinksLot() throws Exception {
		ShipmentDAO dao = mock(ShipmentDAO.class);
		when(dao.selectLotIdBySourceOrder(2L)).thenReturn(7L);
		when(dao.selectLotLogisticsActualQty(7L)).thenReturn("1,000kg");
		ShipmentServiceImpl service = new ShipmentServiceImpl(dao, orders());
		ShipmentVO r = request();
		r.setSourceOrderId(2L);
		service.createShipment(r);
		ArgumentCaptor<ShipmentVO> saved = ArgumentCaptor.forClass(ShipmentVO.class);
		verify(dao).insertShipment(saved.capture());
		assertEquals(Long.valueOf(7L), saved.getValue().getLotId());
		verify(dao).updateLotLogisticsActualQty(7L, "1500kg");
		verify(dao).updateOrderImportedShipment(2L, 1);
	}

	@DisplayName("거래처가 막히면 아무것도 넣지 않는다")
	@Test
	void clientRejectedBeforeInsert() throws Exception {
		ShipmentDAO dao = mock(ShipmentDAO.class);
		SalesOrderService orders = orders();
		when(orders.resolveSalesClient("다온")).thenThrow(new IllegalArgumentException("'다온' 은 매입거래처로 등록되어 있어 수주를 받을 수 없습니다."));
		ShipmentServiceImpl service = new ShipmentServiceImpl(dao, orders);
		ShipmentVO r = request();
		r.setClientName("다온");
		assertThrows(IllegalArgumentException.class, () -> service.createShipment(r));
		verify(dao, never()).insertShipment(any());
	}

	@DisplayName("실출하량: 없는 줄·출하확정된 줄은 막고, 빈 값·숫자 0 은 비운다")
	@Test
	void actualQtyRules() throws Exception {
		ShipmentDAO dao = mock(ShipmentDAO.class);
		when(dao.selectShipmentState(3L)).thenReturn(state(0, null));
		when(dao.selectShipmentState(5L)).thenReturn(state(1, null));
		when(dao.selectProductionShipConfirmed(2L)).thenReturn(1);
		when(dao.selectProductionShipConfirmed(98L)).thenReturn(null);
		ShipmentServiceImpl service = new ShipmentServiceImpl(dao, orders());
		assertEquals("물류스케줄 항목을 찾을 수 없습니다", assertThrows(IllegalArgumentException.class, () -> service.updateActualQty(99L, "1")).getMessage());
		assertEquals("출하확정된 건은 수정할 수 없습니다", assertThrows(IllegalArgumentException.class, () -> service.updateActualQty(5L, "1")).getMessage());
		assertEquals("생산스케줄 항목을 찾을 수 없습니다", assertThrows(IllegalArgumentException.class, () -> service.updateProductionActualQty(98L, "1")).getMessage());
		assertEquals("출하확정된 건은 수정할 수 없습니다", assertThrows(IllegalArgumentException.class, () -> service.updateProductionActualQty(2L, "1")).getMessage());
		service.updateActualQty(3L, " 950kg ");
		verify(dao).updateActualQty(3L, "950kg");
		service.updateActualQty(3L, 0);
		service.updateActualQty(3L, "");
		verify(dao, org.mockito.Mockito.times(2)).updateActualQty(3L, null);
	}

	@DisplayName("삭제: 출하확정된 줄은 막고, 가져온 수주는 다시 가져올 수 있게 되돌리고 배분도 지운다")
	@Test
	void deleteRules() throws Exception {
		ShipmentDAO dao = mock(ShipmentDAO.class);
		when(dao.selectShipmentState(3L)).thenReturn(state(0, 2L));
		when(dao.selectShipmentState(5L)).thenReturn(state(1, null));
		ShipmentServiceImpl service = new ShipmentServiceImpl(dao, orders());
		assertEquals("출하확정된 건은 삭제할 수 없습니다", assertThrows(IllegalArgumentException.class, () -> service.deleteShipment(5L)).getMessage());
		service.deleteShipment(99L); // 없는 줄은 조용히 넘어간다
		verify(dao, never()).deleteShipment(99L);
		service.deleteShipment(3L);
		verify(dao).updateOrderImportedShipment(2L, 0);
		verify(dao).deleteAllocations(3L);
		verify(dao).deleteShipment(3L);
	}

	@DisplayName("로트 배분 저장: 숫자가 아니면·같은 로트 두 번이면 막고, 0 은 빼고, 하나면 예전 칸(lot_id)도 채운다")
	@Test
	void saveAllocationRules() throws Exception {
		ShipmentDAO dao = mock(ShipmentDAO.class);
		when(dao.selectShipmentState(3L)).thenReturn(state(0, null));
		when(dao.selectShipmentState(5L)).thenReturn(state(1, null));
		ShipmentServiceImpl service = new ShipmentServiceImpl(dao, orders());
		assertEquals("출하확정된 건은 로트를 바꿀 수 없습니다. 확정취소 후 고쳐주세요",
				assertThrows(IllegalArgumentException.class, () -> service.saveAllocations(5L, Collections.<Map<String, Object>>emptyList())).getMessage());
		assertEquals("로트와 수량을 숫자로 정해주세요",
				assertThrows(IllegalArgumentException.class, () -> service.saveAllocations(3L, Collections.singletonList(item("x", 1)))).getMessage());
		assertEquals("같은 로트를 두 번 적었습니다. 한 줄로 합쳐주세요",
				assertThrows(IllegalArgumentException.class, () -> service.saveAllocations(3L, Arrays.asList(item(7, 1), item("7", "2")))).getMessage());
		verify(dao, never()).deleteAllocations(anyLong());

		assertEquals(1, service.saveAllocations(3L, Arrays.asList(item(7, "300"), item(8, 0))));
		verify(dao).insertAllocation(eq(3L), eq(7L), eq(300.0), anyString());
		verify(dao).updateShipmentLot(3L, 7L);
		assertEquals(2, service.saveAllocations(3L, Arrays.asList(item(7, 200), item(8, 100.5))));
		verify(dao).updateShipmentLot(3L, null);
	}

	@DisplayName("로트 배분 조회: 배분이 없고 로트 하나만 걸려 있으면 그 연결을 한 줄로")
	@Test
	void legacyAllocation() throws Exception {
		ShipmentDAO dao = mock(ShipmentDAO.class);
		ShipmentVO s = state(0, null);
		s.setLotId(7L);
		s.setOrderQty("1,000kg");
		s.setLotNo("20260921-01");
		when(dao.selectAllocations(3L)).thenReturn(Collections.<LotAllocationVO>emptyList());
		when(dao.selectShipmentState(3L)).thenReturn(s);
		ShipmentServiceImpl service = new ShipmentServiceImpl(dao, orders());
		List<LotAllocationVO> rows = service.getAllocations(3L);
		assertEquals(1, rows.size());
		assertEquals(1000.0, rows.get(0).getQty());
		assertEquals("20260921-01", rows.get(0).getLotNo());
	}

	@DisplayName("로트 목록: 잔량 = 생산량(입고 전이면 계획수량) - 출하량. 출하등록 줄이 가리키는 로트의 생산연동 출하는 두 번 세지 않는다")
	@Test
	void lotRemaining() throws Exception {
		ShipmentDAO dao = mock(ShipmentDAO.class);
		LotRowVO produced = new LotRowVO();
		produced.setId(2L);
		produced.setScheduleDate("2026-09-21");
		produced.setActualQty("1000");
		produced.setOrderQty("1000");
		produced.setLotNo("20260921-01");
		LotRowVO planned = new LotRowVO();
		planned.setId(6L);
		planned.setOrderQty("300kg");
		when(dao.selectLotsByProduct(PRODUCT)).thenReturn(Arrays.asList(produced, planned));
		LotRowVO linked = new LotRowVO();
		linked.setLotId(2L);
		linked.setOrderQty("1000");
		linked.setAllocated(false);
		when(dao.selectLinkedShipmentsByProduct(PRODUCT)).thenReturn(Collections.singletonList(linked));
		LotRowVO self = new LotRowVO();
		self.setId(2L);
		self.setOrderQty("1000");
		self.setShipConfirmed(0);
		when(dao.selectLotShipmentsByProduct(PRODUCT)).thenReturn(Collections.singletonList(self));
		ShipmentServiceImpl service = new ShipmentServiceImpl(dao, orders());

		ProductLotListVO result = service.listLots(PRODUCT);
		assertEquals("000001", result.getProductCode());
		assertEquals("produced", result.getLots().get(0).getStatus());
		assertEquals(1000.0, result.getLots().get(0).getShippedQty());
		assertEquals(0.0, result.getLots().get(0).getRemainingQty());
		assertEquals("planned", result.getLots().get(1).getStatus());
		assertEquals(300.0, result.getLots().get(1).getRemainingQty());

		ProductLotListVO none = service.listLots("없는 품목");
		assertNull(none.getProductCode());
		assertTrue(none.getLots().isEmpty());
	}

	@DisplayName("수량 글자 읽기·표시는 송연과 같다")
	@Test
	void qtyHelpers() {
		assertEquals(1500.0, ShipmentServiceImpl.parseQty("1,500kg"));
		assertEquals(0.0, ShipmentServiceImpl.parseQty("미정"));
		assertEquals("1500", ShipmentServiceImpl.formatG(1500.0));
		assertEquals("0.5", ShipmentServiceImpl.formatG(0.5));
		assertNull(ShipmentServiceImpl.qtyText(0));
		assertEquals("12", ShipmentServiceImpl.qtyText(" 12 "));
	}
}

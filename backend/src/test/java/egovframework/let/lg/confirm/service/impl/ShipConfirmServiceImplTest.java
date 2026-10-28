package egovframework.let.lg.confirm.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.AdditionalMatchers.eq;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import egovframework.let.common.inventory.domain.model.ProductStockMovementVO;
import egovframework.let.common.inventory.service.InventoryService;
import egovframework.let.lg.confirm.domain.model.CharterSummaryVO;
import egovframework.let.lg.confirm.domain.model.ShipConfirmRequestVO;
import egovframework.let.lg.confirm.domain.model.ShipConfirmVO;
import egovframework.let.lg.confirm.domain.model.ShipLotAllocationVO;
import egovframework.let.lg.confirm.domain.repository.ShipConfirmDAO;

class ShipConfirmServiceImplTest {

	private static ShipConfirmVO shipment(long id, Integer confirmed, String actualQty, String orderQty, Long lotId) {
		ShipConfirmVO row = new ShipConfirmVO();
		row.setId(id);
		row.setShipConfirmed(confirmed);
		row.setProductCode("000006");
		row.setProductName("로제파스타소스(5kg*4ea)");
		row.setClientName("(주)달구지푸드");
		row.setMovedOn("2026-10-06");
		row.setActualQty(actualQty);
		row.setOrderQty(orderQty);
		row.setLotId(lotId);
		return row;
	}

	// 2026-10-26 배차 · 포장방법은 공통코드 코드로 저장한다
	private static ShipConfirmDAO shipDao() throws Exception {
		ShipConfirmDAO dao = mock(ShipConfirmDAO.class);
		when(dao.selectCommonCodeByName("VEHICLE_INFO", "1톤")).thenReturn("001");
		when(dao.selectCommonCodeByName("PACKING_TYPE", "박스")).thenReturn("002");
		when(dao.selectEmployeeIdByName("홍길동")).thenReturn("E0001"); // 2026-10-26 운행자는 사번으로
		return dao;
	}

	private static ShipConfirmRequestVO request(String actualQty) {
		ShipConfirmRequestVO body = new ShipConfirmRequestVO();
		body.setActualQty(actualQty);
		body.setBoxQty("4");
		body.setVehicle("1톤");
		body.setDriverName("홍길동");
		body.setPackingMethod("박스");
		body.setNote("오전");
		body.setVisitOrder("2");
		body.setCharterInfo("용차A");
		body.setCharterAmount("50000");
		return body;
	}

	private static ShipLotAllocationVO allocation(long lotId, double qty, String lotNo) {
		ShipLotAllocationVO a = new ShipLotAllocationVO();
		a.setShipmentId(7L);
		a.setLotId(lotId);
		a.setQty(qty);
		a.setLotNo(lotNo);
		return a;
	}

	@DisplayName("목록: 출하등록 줄(배분 붙임) + 생산확정 줄. 출하등록이 그 로트를 가리키면 확정 전 생산확정 줄은 숨기고, 보관방법·재고를 붙인다")
	@Test
	void listSchedule() throws Exception {
		ShipConfirmDAO dao = shipDao();
		ShipConfirmServiceImpl service = new ShipConfirmServiceImpl(dao, mock(InventoryService.class));
		assertEquals("date 파라미터가 필요합니다", assertThrows(IllegalArgumentException.class, () -> service.listSchedule(" ")).getMessage());

		ShipConfirmVO manual = shipment(7, 0, "135", "135", null);
		when(dao.selectManualRows("2026-10-06")).thenReturn(Collections.singletonList(manual));
		when(dao.selectAllocations()).thenReturn(Collections.singletonList(allocation(4, 135, null)));
		ShipConfirmVO hidden = shipment(5, 0, null, "300", 5L);
		ShipConfirmVO kept = shipment(2, 1, "1000", "1000", 2L);
		ShipConfirmVO own = shipment(9, 0, null, "50", 9L);
		when(dao.selectProductionRows("2026-10-06")).thenReturn(Arrays.asList(hidden, kept, own));
		when(dao.selectLinkedLotIds()).thenReturn(Arrays.asList(5L, 2L));
		ShipConfirmVO product = new ShipConfirmVO();
		product.setName("로제파스타소스");
		product.setSpec("5kg*4ea");
		product.setStorage("냉장");
		product.setStockQty(135.0);
		when(dao.selectProductsForDisplay()).thenReturn(Collections.singletonList(product));

		List<ShipConfirmVO> rows = service.listSchedule(" 2026-10-06 ");
		assertEquals(3, rows.size());
		assertEquals("manual", rows.get(0).getSource());
		assertEquals(Boolean.TRUE, rows.get(0).getShipped());
		assertEquals(1, rows.get(0).getLotAllocations().size());
		assertEquals("", rows.get(0).getLotAllocations().get(0).getLotNo());
		assertEquals("냉장", rows.get(0).getStorage());
		assertEquals(135.0, rows.get(0).getStockQty());
		assertEquals(Long.valueOf(2), rows.get(1).getId()); // 확정된 생산확정 줄은 그대로
		assertEquals("production", rows.get(1).getSource());
		assertEquals(Long.valueOf(9), rows.get(2).getId());
		assertEquals(Boolean.FALSE, rows.get(2).getShipped());
	}

	@DisplayName("확정: 실출하량 필수. 저장→박스→생산입고 전 로트 자동입고(계획 한도)→재고 빼기(로트번호 비고)→배차 등 저장")
	@Test
	void confirmManual() throws Exception {
		ShipConfirmDAO dao = shipDao();
		InventoryService inventory = mock(InventoryService.class);
		ShipConfirmServiceImpl service = new ShipConfirmServiceImpl(dao, inventory);
		when(dao.selectShipment(false, 7L)).thenReturn(shipment(7, 0, null, "135", 4L), shipment(7, 0, "140kg", "135", 4L));
		assertEquals("실출하량을 입력해주세요. 이 수량만큼 재고가 빠져요.",
				assertThrows(IllegalArgumentException.class, () -> service.confirm("manual", 7L, request(" "), "관리자")).getMessage());
		assertEquals("출하 항목을 찾을 수 없습니다",
				assertThrows(IllegalArgumentException.class, () -> service.confirm("etc", 7L, request("1"), "관리자")).getMessage());

		when(dao.selectAllocationsOf(7L)).thenReturn(Collections.<ShipLotAllocationVO>emptyList());
		ShipConfirmVO lot = new ShipConfirmVO();
		lot.setProductCode("000006");
		lot.setProductName("로제파스타소스(5kg*4ea)");
		lot.setOrderQty("135");
		lot.setScheduleDate("2026-10-06");
		when(dao.selectLot(4L)).thenReturn(lot);
		when(dao.selectLotNo(4L)).thenReturn("20261006-01");
		service.confirm("manual", 7L, request(" 140kg "), "관리자");

		verify(dao).updateActualQty(false, 7L, "140kg");
		verify(dao).updateBoxQty(false, 7L, 4.0);
		verify(dao).updateLotActualQty(4L, "135kg");
		ArgumentCaptor<ProductStockMovementVO> received = ArgumentCaptor.forClass(ProductStockMovementVO.class);
		verify(inventory).moveProductStock(anyString(), eq(135.0, 0.0001), org.mockito.ArgumentMatchers.eq("생산입고"), received.capture());
		assertEquals("출하확정 때 자동으로 잡음", received.getValue().getNote());
		assertEquals("관리자", received.getValue().getCreatedBy());
		ArgumentCaptor<ProductStockMovementVO> out = ArgumentCaptor.forClass(ProductStockMovementVO.class);
		verify(inventory).moveProductStock(org.mockito.ArgumentMatchers.eq("000006"), eq(-140.0, 0.0001), org.mockito.ArgumentMatchers.eq("출하"), out.capture());
		assertEquals("로트 20261006-01", out.getValue().getNote());
		assertEquals("logistics_schedule", out.getValue().getSourceTable());
		assertEquals(Long.valueOf(7), out.getValue().getSourceId());
		assertEquals("2026-10-06", out.getValue().getMovedOn());
		ArgumentCaptor<ShipConfirmVO> fields = ArgumentCaptor.forClass(ShipConfirmVO.class);
		verify(dao).updateConfirm(org.mockito.ArgumentMatchers.eq(false), org.mockito.ArgumentMatchers.eq(7L), fields.capture());
		assertEquals("001", fields.getValue().getVehicle());
		assertEquals("002", fields.getValue().getPackingMethod());
		assertEquals("E0001", fields.getValue().getDriverId());
		assertEquals(Integer.valueOf(2), fields.getValue().getVisitOrder());
		assertEquals(50000.0, fields.getValue().getCharterAmount());
		assertEquals("오전", fields.getValue().getShipNote());
	}

	@DisplayName("로트 배분: 합계가 실출하량과 다르면 막고, 같으면 로트마다 한 줄씩 뺀다")
	@Test
	void confirmWithAllocations() throws Exception {
		ShipConfirmDAO dao = shipDao();
		InventoryService inventory = mock(InventoryService.class);
		ShipConfirmServiceImpl service = new ShipConfirmServiceImpl(dao, inventory);
		when(dao.selectShipment(false, 7L)).thenReturn(shipment(7, 0, "100", "100", null));
		when(dao.selectAllocationsOf(7L)).thenReturn(Arrays.asList(allocation(2, 60, "A-1"), allocation(4, 30, "B-1")));
		assertEquals("로트 배분 합계 90 가 실출하량 100 과 다릅니다. 로트선택에서 수량을 맞춰주세요.",
				assertThrows(IllegalArgumentException.class, () -> service.confirm("manual", 7L, request("100"), null)).getMessage());

		when(dao.selectAllocationsOf(7L)).thenReturn(Arrays.asList(allocation(2, 60, "A-1"), allocation(4, 40, "B-1")));
		ShipConfirmVO producedLot = new ShipConfirmVO();
		producedLot.setActualQty("1000");
		when(dao.selectLot(anyLong())).thenReturn(producedLot);
		service.confirm("manual", 7L, request("100"), null);
		verify(inventory).moveProductStock(anyString(), eq(-60.0, 0.0001), org.mockito.ArgumentMatchers.eq("출하"), any());
		verify(inventory).moveProductStock(anyString(), eq(-40.0, 0.0001), org.mockito.ArgumentMatchers.eq("출하"), any());
		verify(dao, never()).updateLotActualQty(anyLong(), anyString()); // 이미 생산입고된 로트는 건드리지 않는다
	}

	@DisplayName("확정된 생산확정 줄의 수량을 고치면 차이만큼 출하정정, 확정취소는 되돌리고 자동입고는 그대로")
	@Test
	void repriceAndUnconfirm() throws Exception {
		ShipConfirmDAO dao = shipDao();
		InventoryService inventory = mock(InventoryService.class);
		ShipConfirmServiceImpl service = new ShipConfirmServiceImpl(dao, inventory);
		ShipConfirmVO confirmedRow = shipment(2, 1, "1000", "1000", 2L);
		confirmedRow.setLogisticsActualQty("1000");
		when(dao.selectShipment(true, 2L)).thenReturn(confirmedRow);
		service.confirm("production", 2L, request("980"), "관리자");
		ArgumentCaptor<ProductStockMovementVO> fix = ArgumentCaptor.forClass(ProductStockMovementVO.class);
		verify(inventory).moveProductStock(org.mockito.ArgumentMatchers.eq("000006"), eq(20.0, 0.0001), org.mockito.ArgumentMatchers.eq("출하정정"), fix.capture());
		assertEquals("출하수량 1000 -> 980", fix.getValue().getNote());
		assertEquals("production_schedule", fix.getValue().getSourceTable());
		verify(dao).updateActualQty(true, 2L, "980");

		ShipConfirmDAO dao2 = shipDao();
		InventoryService inventory2 = mock(InventoryService.class);
		ShipConfirmServiceImpl service2 = new ShipConfirmServiceImpl(dao2, inventory2);
		ShipConfirmVO row = shipment(7, 1, "135", "135", 4L);
		row.setBoxQty(4.0);
		when(dao2.selectShipment(false, 7L)).thenReturn(row);
		when(dao2.selectAllocationsOf(7L)).thenReturn(Collections.<ShipLotAllocationVO>emptyList());
		service2.unconfirm("manual", 7L, "관리자");
		verify(inventory2).applyBoxUsage("000006", -4.0, "출하취소 로제파스타소스(5kg*4ea)");
		verify(inventory2).moveProductStock(org.mockito.ArgumentMatchers.eq("000006"), eq(135.0, 0.0001), org.mockito.ArgumentMatchers.eq("출하취소"), any());
		verify(dao2, never()).updateLotActualQty(anyLong(), anyString());
		verify(dao2).updateUnconfirm(false, 7L);

		// 확정 전 줄을 확정취소해도 재고는 움직이지 않는다(두 번 되돌리지 않는다)
		ShipConfirmDAO dao3 = shipDao();
		InventoryService inventory3 = mock(InventoryService.class);
		when(dao3.selectShipment(false, 7L)).thenReturn(shipment(7, 0, "135", "135", 4L));
		new ShipConfirmServiceImpl(dao3, inventory3).unconfirm("manual", 7L, null);
		verify(inventory3, never()).moveProductStock(anyString(), anyDouble(), anyString(), any());
	}

	@DisplayName("용차: 기간 필수, 두 곳을 합쳐 일자 순, 합계")
	@Test
	void charterSummary() throws Exception {
		ShipConfirmDAO dao = shipDao();
		ShipConfirmServiceImpl service = new ShipConfirmServiceImpl(dao, mock(InventoryService.class));
		assertEquals("조회 기간을 선택해주세요", assertThrows(IllegalArgumentException.class, () -> service.charterSummary("2026-10-01", "")).getMessage());
		ShipConfirmVO a = new ShipConfirmVO();
		a.setScheduleDate("2026-10-05");
		a.setCharterAmount(30000.0);
		ShipConfirmVO b = new ShipConfirmVO();
		b.setScheduleDate("2026-10-02");
		b.setCharterInfo("용차B");
		when(dao.selectCharterRows(false, "2026-10-01", "2026-10-06")).thenReturn(Collections.singletonList(a));
		when(dao.selectCharterRows(true, "2026-10-01", "2026-10-06")).thenReturn(Collections.singletonList(b));
		CharterSummaryVO result = service.charterSummary("2026-10-01", "2026-10-06");
		assertEquals("2026-10-02", result.getRows().get(0).getScheduleDate());
		assertEquals(30000.0, result.getTotalAmount());
	}

	@DisplayName("수량 읽기·표시(송연 parse_qty_number · formatG)")
	@Test
	void numbers() {
		assertEquals(1000.0, ShipConfirmServiceImpl.parseQty("1,000kg"));
		assertEquals(0.0, ShipConfirmServiceImpl.parseQty("없음"));
		assertEquals(135.0, ShipConfirmServiceImpl.shippedQtyOf(null, " ", "135"));
		assertEquals("135", ShipConfirmServiceImpl.formatG(135.0));
		assertEquals("0.5", ShipConfirmServiceImpl.formatG(0.5));
	}

	@DisplayName("2026-10-26 배차 · 포장방법: 공통코드에 없는 이름은 재고를 움직이기 전에 막고, 비우면 null")
	@Test
	void confirmChecksCommonCodes() throws Exception {
		ShipConfirmDAO dao = shipDao();
		InventoryService inventory = mock(InventoryService.class);
		ShipConfirmServiceImpl service = new ShipConfirmServiceImpl(dao, inventory);
		when(dao.selectShipment(false, 7L)).thenReturn(shipment(7, 0, null, "135", 4L));
		ShipConfirmRequestVO badVehicle = request("100");
		badVehicle.setVehicle("없는차");
		assertEquals(ShipConfirmServiceImpl.VEHICLE_MESSAGE,
				assertThrows(IllegalArgumentException.class, () -> service.confirm("manual", 7L, badVehicle, "관리자")).getMessage());
		ShipConfirmRequestVO badPacking = request("100");
		badPacking.setPackingMethod("없는포장");
		assertEquals(ShipConfirmServiceImpl.PACKING_MESSAGE,
				assertThrows(IllegalArgumentException.class, () -> service.confirm("manual", 7L, badPacking, "관리자")).getMessage());
		ShipConfirmRequestVO badDriver = request("100");
		badDriver.setDriverName("외부기사");
		assertEquals(ShipConfirmServiceImpl.DRIVER_MESSAGE,
				assertThrows(IllegalArgumentException.class, () -> service.confirm("manual", 7L, badDriver, "관리자")).getMessage());
		verify(dao, never()).updateActualQty(org.mockito.ArgumentMatchers.anyBoolean(), anyLong(), anyString());
		verify(inventory, never()).moveProductStock(anyString(), anyDouble(), anyString(), any());
	}
}

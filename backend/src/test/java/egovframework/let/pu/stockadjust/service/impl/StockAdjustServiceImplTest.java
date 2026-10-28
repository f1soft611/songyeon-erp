package egovframework.let.pu.stockadjust.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.inOrder;
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
import org.mockito.AdditionalMatchers;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;

import egovframework.let.common.inventory.domain.model.ProductStockMovementVO;
import egovframework.let.common.inventory.service.InventoryService;
import egovframework.let.common.inventory.service.MaterialStockSnapshotService;
import egovframework.let.pu.stockadjust.domain.model.MaterialStockVO;
import egovframework.let.pu.stockadjust.domain.model.MovementRequestVO;
import egovframework.let.pu.stockadjust.domain.model.StockConfirmRequestVO;
import egovframework.let.pu.stockadjust.domain.model.StockScheduleVO;
import egovframework.let.pu.stockadjust.domain.model.StockUploadRequestVO;
import egovframework.let.pu.stockadjust.domain.model.StockUploadResultVO;
import egovframework.let.pu.stockadjust.domain.model.WarehouseLookupVO;
import egovframework.let.pu.stockadjust.domain.model.WarehouseMoveRequestVO;
import egovframework.let.pu.stockadjust.domain.model.WarehouseMoveVO;
import egovframework.let.pu.stockadjust.domain.repository.StockAdjustDAO;

class StockAdjustServiceImplTest {

	private final StockAdjustDAO dao = mock(StockAdjustDAO.class);
	private final MaterialStockSnapshotService snapshot = mock(MaterialStockSnapshotService.class);
	private final InventoryService inventory = mock(InventoryService.class);
	private final StockAdjustServiceImpl service = new StockAdjustServiceImpl(dao, snapshot, inventory);

	private static StockScheduleVO pending(long id, String code, Double qty, Double edited, String warehouse) {
		StockScheduleVO s = new StockScheduleVO();
		s.setId(id);
		s.setCode(code);
		s.setNewStockQty(qty);
		s.setEditedQty(edited);
		s.setWarehouse(warehouse);
		return s;
	}

	private static MaterialStockVO material(String code, String name, double stock, Double unitWeight) {
		MaterialStockVO m = new MaterialStockVO();
		m.setCode(code);
		m.setName(name);
		m.setStockQty(stock);
		m.setUnitWeight(unitWeight);
		return m;
	}

	private static StockConfirmRequestVO confirm(String date, String note) {
		StockConfirmRequestVO r = new StockConfirmRequestVO();
		r.setEffectiveDate(date);
		r.setNote(note);
		return r;
	}

	@DisplayName("엑셀 올리기: 머리줄 건너뜀, 코드 빈 줄은 넘김, 수량(넷째 칸)을 못 읽거나 없는 코드면 건너뜀(건수), 창고는 파일 전체에")
	@Test
	void uploadMaterial() throws Exception {
		when(dao.selectWarehouseNames()).thenReturn(Arrays.asList("계량창고", "자재창고"));
		when(dao.existsMaterial("M1")).thenReturn(true);
		when(dao.existsMaterial("M2")).thenReturn(true);
		StockUploadRequestVO request = new StockUploadRequestVO();
		request.setWarehouse(" 계량창고 ");
		request.setRows(Arrays.asList(
				Arrays.asList("원재료코드", "원재료명", "규격", "재고수량"),
				Arrays.asList(" M1 ", "설탕", "25kg", "120.5"),
				Arrays.asList("", "빈코드", "", "3"),
				Arrays.asList("M2", "소금", "", "많음"),
				Arrays.asList("M9", "없는것", "", "5"),
				Arrays.asList("M2", "소금"),
				Collections.<String>emptyList()));
		StockUploadResultVO result = service.uploadMaterial(request);
		assertEquals(1, result.getStaged());
		assertEquals(3, result.getSkipped());
		ArgumentCaptor<StockScheduleVO> row = ArgumentCaptor.forClass(StockScheduleVO.class);
		verify(dao).insertMaterialSchedule(row.capture());
		assertEquals("M1", row.getValue().getCode());
		assertEquals("설탕", row.getValue().getName());
		assertEquals(120.5, row.getValue().getNewStockQty(), 1e-9);
		assertEquals("계량창고", row.getValue().getWarehouse());

		// 2026-10-26 원재료마스터 엑셀 그대로: 칸 이름으로 찾는다(넷째 칸은 납품업체, 재고는 아홉째, 안전재고와 헷갈리지 않는다)
		when(dao.existsMaterial("M3")).thenReturn(true);
		request.setRows(Arrays.asList(
				Arrays.asList("원재료코드", "원재료명", "규격", "납품업체", "단위", "단위중량(한 봉 kg)", "박스입수량(몇 봉)", "단가(원)", "재고", "안전재고"),
				Arrays.asList("M3", "고춧가루", "1kg", "예시상사", "kg", "", "", "1000", "33", "5")));
		assertEquals(1, service.uploadMaterial(request).getStaged());
		verify(dao, org.mockito.Mockito.times(2)).insertMaterialSchedule(row.capture());
		assertEquals("M3", row.getValue().getCode());
		assertEquals("고춧가루", row.getValue().getName());
		assertEquals(33.0, row.getValue().getNewStockQty(), 1e-9);

		request.setWarehouse("냉동창고");
		assertEquals("'냉동창고'는 등록된 창고가 아닙니다. 기초정보 > 창고등록에서 먼저 등록해주세요",
				assertThrows(IllegalArgumentException.class, () -> service.uploadMaterial(request)).getMessage());
		request.setWarehouse("실온창고1");
		assertTrue(assertThrows(IllegalArgumentException.class, () -> service.uploadMaterial(request)).getMessage().startsWith("'실온창고1'은 "));
	}

	@DisplayName("원재료 확정: 반영일·사유 필수, 대기 없으면 막음. 센 값 + 반영일 뒤 증감을 넣고, 창고가 있으면 옮기고, 이력에 이전·이후·사유")
	@Test
	void confirmMaterial() throws Exception {
		assertEquals("반영일을 선택해주세요", assertThrows(IllegalArgumentException.class, () -> service.confirmMaterial(confirm(" ", "실사"))).getMessage());
		assertEquals("조정 사유를 적어주세요 (예: 9월 정기 재고조사)", assertThrows(IllegalArgumentException.class, () -> service.confirmMaterial(confirm("2026-10-10", " "))).getMessage());
		Map<String, Double> delta = new HashMap<>();
		delta.put("M1", -30.0);
		when(snapshot.deltaAfter("2026-10-10")).thenReturn(delta);
		when(dao.selectMaterialPending()).thenReturn(Collections.<StockScheduleVO>emptyList());
		assertEquals("확정할 재고조정 내역이 없습니다", assertThrows(IllegalArgumentException.class, () -> service.confirmMaterial(confirm("2026-10-10", "실사"))).getMessage());

		when(dao.selectMaterialPending()).thenReturn(Arrays.asList(pending(1, "M1", 800.0, null, "계량창고"), pending(2, "M2", 50.0, 45.0, null), pending(3, "M3", null, null, null)));
		when(dao.selectMaterialStock("M1")).thenReturn(900.0);
		when(dao.selectMaterialStock("M2")).thenReturn(40.0);
		when(dao.selectMaterialStock("M3")).thenReturn(null);
		assertEquals(3, service.confirmMaterial(confirm("2026-10-10", " 9월 정기 재고조사 ")).getConfirmed());
		verify(dao).updateMaterialStock("M1", 770.0);
		verify(dao).updateMaterialWarehouse("M1", "계량창고");
		verify(dao).applyMaterialSchedule(1L, "2026-10-10", 770.0, 900.0, "9월 정기 재고조사");
		verify(dao).updateMaterialStock("M2", 45.0);
		verify(dao, never()).updateMaterialWarehouse(eq("M2"), any());
		verify(dao).applyMaterialSchedule(2L, "2026-10-10", 45.0, 40.0, "9월 정기 재고조사");
		verify(dao).applyMaterialSchedule(3L, "2026-10-10", 0.0, null, "9월 정기 재고조사");
	}

	@DisplayName("목록: 목표 = 고친 값 또는 엑셀 값, 차이 = 목표 - 지금. 이력 차이 = 이후 - 이전, 기간은 둘 다 있을 때만")
	@Test
	void listsAndDiff() throws Exception {
		StockScheduleVO a = pending(1, "M1", 100.0, 90.0, null);
		a.setCurrentStockQty(95.0);
		StockScheduleVO b = pending(2, "M2", null, null, null);
		when(dao.selectMaterialSchedule()).thenReturn(Arrays.asList(a, b));
		List<StockScheduleVO> rows = service.listMaterialSchedule();
		assertEquals(90.0, rows.get(0).getTargetQty(), 1e-9);
		assertEquals(-5.0, rows.get(0).getDiff(), 1e-9);
		assertNull(rows.get(1).getDiff());
		StockScheduleVO h = pending(0, "M1", 120.0, null, null);
		h.setOldStockQty(100.0);
		when(dao.selectMaterialHistory(null, null)).thenReturn(Collections.singletonList(h));
		assertEquals(20.0, service.listMaterialHistory("2026-10-01", " ").get(0).getDiff(), 1e-9);
		verify(dao).selectMaterialHistory(null, null);
	}

	@DisplayName("고치기: 숫자가 아니면 막고, 대기 줄이 없으면 막는다")
	@Test
	void editSchedule() throws Exception {
		assertEquals("수정할 수량은 숫자여야 합니다", assertThrows(IllegalArgumentException.class, () -> service.editMaterialSchedule(1, "abc")).getMessage());
		when(dao.updateMaterialScheduleEdited(1, 12.5)).thenReturn(0);
		assertEquals("대기중인 재고조정 항목을 찾을 수 없습니다", assertThrows(IllegalArgumentException.class, () -> service.editMaterialSchedule(1, "12.5")).getMessage());
		when(dao.updateProductScheduleEdited(2, 3.0)).thenReturn(1);
		service.editProductSchedule(2, " 3 ");
		verify(dao).updateProductScheduleEdited(2, 3.0);
	}

	@DisplayName("손으로 고치기: 적용재고는 그 값으로 맞추고 차이를 입고·출고로 남김(사유 기본값), 입고·출고는 둘 다 한 줄에, 출고는 사유 필수")
	@Test
	void moveMaterial() throws Exception {
		MovementRequestVO r = new MovementRequestVO();
		assertEquals("원재료를 찾을 수 없습니다", assertThrows(IllegalArgumentException.class, () -> service.moveMaterial("M9", r)).getMessage());
		when(dao.selectMaterial("M1")).thenReturn(material("M1", "설탕", 100, null));
		r.setSetQty("abc");
		assertEquals("적용재고는 숫자여야 합니다", assertThrows(IllegalArgumentException.class, () -> service.moveMaterial("M1", r)).getMessage());
		r.setSetQty("80");
		service.moveMaterial("M1", r);
		verify(dao).updateMaterialStock("M1", 80.0);
		verify(dao).insertMaterialMovement(eq("M1"), eq("설탕"), eq(0.0), eq(20.0), eq("적용재고 직접수정"), anyString());

		MovementRequestVO io = new MovementRequestVO();
		io.setInQty("x");
		io.setOutQty("");
		assertEquals("입고, 출고, 적용재고 중 하나는 입력해주세요", assertThrows(IllegalArgumentException.class, () -> service.moveMaterial("M1", io)).getMessage());
		io.setInQty("5");
		io.setOutQty("3");
		assertEquals("출고는 사유(비고)를 꼭 적어주세요", assertThrows(IllegalArgumentException.class, () -> service.moveMaterial("M1", io)).getMessage());
		io.setNote(" 파손 ");
		service.moveMaterial("M1", io);
		verify(dao).addMaterialStockInOut("M1", 5.0, 3.0);
		verify(dao).insertMaterialMovement(eq("M1"), eq("설탕"), eq(5.0), eq(3.0), eq("파손"), anyString());
	}

	@DisplayName("제품 확정: 원장 증감(이후 재고는 센 값 + 반영일 뒤 원장 증감)으로 남기고, 비고는 '이전 -> 이후'(:g), 처리자·출처")
	@Test
	void confirmProduct() throws Exception {
		StockScheduleVO delta = new StockScheduleVO();
		delta.setCode("P1");
		delta.setDiff(-20.0);
		when(dao.selectProductDeltaAfter("2026-10-10")).thenReturn(Collections.singletonList(delta));
		when(dao.selectProductPending()).thenReturn(Arrays.asList(pending(7, "P1", 100.0, 110.5, null), pending(8, "P2", 5.0, null, null)));
		when(dao.selectProductStock("P1")).thenReturn(95.0);
		when(dao.selectProductStock("P2")).thenReturn(null);
		assertEquals("2026-10-10", service.confirmProduct(confirm("2026-10-10", null), "관리자").getEffectiveDate());
		ArgumentCaptor<ProductStockMovementVO> options = ArgumentCaptor.forClass(ProductStockMovementVO.class);
		InOrder order = inOrder(inventory, dao);
		order.verify(inventory).moveProductStock(eq("P1"), AdditionalMatchers.eq(-4.5, 1e-9), eq("재고조정"), options.capture());
		order.verify(dao).applyProductSchedule(7L, "2026-10-10", 90.5, 95.0);
		ProductStockMovementVO o = options.getValue();
		assertEquals("2026-10-10", o.getMovedOn());
		assertEquals("product_stock_schedule", o.getSourceTable());
		assertEquals(7L, o.getSourceId());
		assertEquals("95 -> 90.5", o.getNote());
		assertEquals("관리자", o.getCreatedBy());
		verify(dao).applyProductSchedule(8L, "2026-10-10", 5.0, null);
		assertEquals("반영일을 선택해주세요", assertThrows(IllegalArgumentException.class, () -> service.confirmProduct(confirm("", null), "관리자")).getMessage());
	}

	@DisplayName("창고이동 조회: 바코드면 그 입고분, 아니면 원재료코드. 단위중량 없으면 막음. 자재·계량 창고에 있는 양")
	@Test
	void lookup() throws Exception {
		assertEquals("바코드를 찍어주세요", assertThrows(IllegalArgumentException.class, () -> service.lookupWarehouseMove(" ")).getMessage());
		assertEquals("'X1' 로 찾을 수 있는 입고건이나 원재료가 없어요", assertThrows(IllegalArgumentException.class, () -> service.lookupWarehouseMove("X1")).getMessage());
		WarehouseMoveVO recv = new WarehouseMoveVO();
		recv.setBarcode("000311_26090301");
		recv.setMaterialCode("M1");
		recv.setReceiveDate("2026-09-03");
		when(dao.selectReceivingByBarcode("000311_26090301")).thenReturn(recv);
		when(dao.selectMaterial("M1")).thenReturn(material("M1", "양파", 100, 20.0));
		when(snapshot.movedOutOfReceiving()).thenReturn(Collections.singletonMap("M1", 40.0));
		WarehouseLookupVO found = service.lookupWarehouseMove("000311_26090301");
		assertEquals("000311_26090301", found.getBarcode());
		assertEquals("2026-09-03", found.getLotDate());
		assertEquals(60.0, found.getInMaterialWarehouse(), 1e-9);
		assertEquals(40.0, found.getInWeighingWarehouse(), 1e-9);
		assertEquals("kg", found.getUnit());
		when(dao.existsMaterial("M2")).thenReturn(true);
		when(dao.selectMaterial("M2")).thenReturn(material("M2", "소금", 10, null));
		assertEquals("소금의 단위중량이 아직 없어요. 기초정보 > 원재료BOM에서 한 봉이 몇 kg 인지 먼저 적어주세요",
				assertThrows(IllegalArgumentException.class, () -> service.lookupWarehouseMove("M2")).getMessage());
	}

	@DisplayName("창고이동: 봉수 필수, 자재창고에 있는 것보다 많이 못 옮김, 목적 창고는 고른 곳 · 없으면 입고창고 아닌 창고가 하나일 때만")
	@Test
	void moveWarehouse() throws Exception {
		WarehouseMoveRequestVO r = new WarehouseMoveRequestVO();
		r.setMaterialCode("M1");
		r.setPackCount("0");
		assertEquals("옮길 품목과 봉수가 필요합니다", assertThrows(IllegalArgumentException.class, () -> service.moveWarehouse(r, "현장")).getMessage());
		when(dao.selectMaterial("M1")).thenReturn(material("M1", "양파", 100, 20.0));
		when(snapshot.movedOutOfReceiving()).thenReturn(Collections.singletonMap("M1", 40.0));
		r.setPackCount("4");
		assertEquals("자재창고에 60밖에 없어요 (4봉 = 80)", assertThrows(IllegalArgumentException.class, () -> service.moveWarehouse(r, "현장")).getMessage());
		r.setPackCount("3");
		when(dao.selectOtherWarehouseNames()).thenReturn(Arrays.asList("계량창고", "냉동창고"));
		assertEquals("어느 창고로 옮길지 골라주세요", assertThrows(IllegalArgumentException.class, () -> service.moveWarehouse(r, "현장")).getMessage());
		verify(dao, never()).insertWarehouseMove(any());
		r.setToWarehouse("계량창고");
		r.setBarcode(" ");
		when(dao.selectReceivingWarehouseName()).thenReturn("자재창고");
		assertEquals(60.0, service.moveWarehouse(r, "현장").getQty(), 1e-9);
		ArgumentCaptor<WarehouseMoveVO> row = ArgumentCaptor.forClass(WarehouseMoveVO.class);
		verify(dao).insertWarehouseMove(row.capture());
		assertEquals("자재창고", row.getValue().getFromWarehouse());
		assertEquals("계량창고", row.getValue().getToWarehouse());
		assertNull(row.getValue().getBarcode());
		assertEquals("현장", row.getValue().getMovedBy());
		assertTrue(row.getValue().getMovedDate().matches("\\d{4}-\\d{2}-\\d{2}"));
		r.setToWarehouse(null);
		when(dao.selectOtherWarehouseNames()).thenReturn(Collections.singletonList("계량창고"));
		assertEquals("계량창고", service.moveWarehouse(r, "현장").getToWarehouse());
		verify(dao, never()).deleteWarehouseMove(anyLong());
		verify(dao, never()).updateMaterialStock(anyString(), anyDouble());
	}

	@DisplayName("숫자 표기: 파이썬 :g · fmt_qty 와 같다")
	@Test
	void formats() {
		assertEquals("95", StockAdjustServiceImpl.fmtG(95.0));
		assertEquals("90.5", StockAdjustServiceImpl.fmtG(90.5));
		assertEquals("0.333333", StockAdjustServiceImpl.fmtG(1.0 / 3));
		assertEquals("1.23457e+06", StockAdjustServiceImpl.fmtG(1234567));
		assertEquals("1e-05", StockAdjustServiceImpl.fmtG(0.00001));
		assertEquals("-2.5", StockAdjustServiceImpl.fmtG(-2.5));
		assertEquals("60", StockAdjustServiceImpl.fmtQty(60.0));
		assertEquals("12.5", StockAdjustServiceImpl.fmtQty(12.5));
	}
}

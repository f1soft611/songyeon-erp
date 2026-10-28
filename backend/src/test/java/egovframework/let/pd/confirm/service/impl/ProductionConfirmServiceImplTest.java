package egovframework.let.pd.confirm.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.AdditionalMatchers;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;

import egovframework.let.co.master.itemmaster.service.ItemMasterService;
import egovframework.let.pd.confirm.domain.model.BatchSheetVO;
import egovframework.let.pd.confirm.domain.model.MaterialLineVO;
import egovframework.let.pd.confirm.domain.model.ProductionSaveRequestVO;
import egovframework.let.pd.confirm.domain.model.ProductionScheduleVO;
import egovframework.let.pd.confirm.domain.repository.ProductionConfirmDAO;

class ProductionConfirmServiceImplTest {

	private static final String PRODUCT = "국물두루치기분말(1kg*10ea)";

	private static MaterialLineVO bom(String code, String name, double ratio) {
		MaterialLineVO l = new MaterialLineVO();
		l.setMaterialCode(code);
		l.setMaterialName(name);
		l.setRatioPercent(ratio);
		return l;
	}

	private static MaterialLineVO sub(String from, String to, String toName, String reason) {
		MaterialLineVO s = new MaterialLineVO();
		s.setFromMaterialCode(from);
		s.setToMaterialCode(to);
		s.setToMaterialName(toName);
		s.setReason(reason);
		return s;
	}

	private static MaterialLineVO usage(String code, double qty) {
		MaterialLineVO u = new MaterialLineVO();
		u.setMaterialCode(code);
		u.setQtyUsed(qty);
		return u;
	}

	private static ProductionSaveRequestVO request(Long sourceOrderId) {
		ProductionSaveRequestVO r = new ProductionSaveRequestVO();
		r.setScheduleDate("2026-10-06");
		r.setClientName("(주) 디에이치식품");
		r.setProductName(PRODUCT);
		r.setOrderQty("1,000kg");
		r.setSourceOrderId(sourceOrderId);
		r.setIsStockProduction(0);
		return r;
	}

	private static ProductionConfirmDAO dao() throws Exception {
		ProductionConfirmDAO dao = mock(ProductionConfirmDAO.class);
		when(dao.selectProductCodeByDisplayName(PRODUCT)).thenReturn("000001");
		when(dao.selectClientCodeByName("(주) 디에이치식품")).thenReturn("000007");
		when(dao.selectBom("000001")).thenReturn(Arrays.asList(bom("M1", "MSG", 0.0599), bom("M2", "고춧가루", 0.027)));
		when(dao.selectSubstitutions(anyLong())).thenReturn(Collections.<MaterialLineVO>emptyList());
		when(dao.selectMaterialUsage(anyLong())).thenReturn(Collections.<MaterialLineVO>emptyList());
		when(dao.selectLotNos(anyString(), anyString(), any())).thenReturn(Collections.<String>emptyList());
		doAnswer(inv -> {
			((ProductionScheduleVO) inv.getArgument(0)).setId(30L);
			return null;
		}).when(dao).insertSchedule(any());
		return dao;
	}

	private static ItemMasterService clients() throws Exception {
		ItemMasterService bom = mock(ItemMasterService.class);
		when(bom.resolveRegisteredClient("(주) 디에이치식품")).thenReturn("(주) 디에이치식품");
		return bom;
	}

	@DisplayName("확정: 날짜 필수, 거래처BOM 확인에서 막히면 아무것도 넣지 않는다")
	@Test
	void createValidation() throws Exception {
		ProductionConfirmDAO dao = dao();
		ItemMasterService bom = clients();
		when(bom.resolveRegisteredClient("부산")).thenThrow(new IllegalArgumentException("'부산' 은 거래처BOM에 없는 거래처입니다."));
		ProductionConfirmServiceImpl service = new ProductionConfirmServiceImpl(dao, bom);
		ProductionSaveRequestVO noDate = request(null);
		noDate.setScheduleDate(" ");
		assertEquals("날짜가 필요합니다", assertThrows(IllegalArgumentException.class, () -> service.create(noDate)).getMessage());
		ProductionSaveRequestVO badClient = request(null);
		badClient.setClientName("부산");
		assertThrows(IllegalArgumentException.class, () -> service.create(badClient));
		// 2026-10-26 제품명은 코드로만 남으므로 제품마스터에 없는 품목명은 막는다
		ProductionSaveRequestVO badProduct = request(null);
		badProduct.setProductName("없는 품목");
		assertEquals("제품마스터에 등록된 품목을 골라주세요", assertThrows(IllegalArgumentException.class, () -> service.create(badProduct)).getMessage());
		verify(dao, never()).insertSchedule(any());
		verify(dao, never()).addMaterialStock(anyString(), anyDouble());
	}

	@DisplayName("확정: 로트번호 발번, 배합비대로 원재료를 깎고 사용 기록, 수주 가져감 표시와 출하줄 로트 연결")
	@Test
	void createFromOrder() throws Exception {
		ProductionConfirmDAO dao = dao();
		when(dao.selectLotNos("2026-10-06", "000001", null)).thenReturn(Arrays.asList("20261006-01", "20261006-x", "20261006-03"));
		ProductionScheduleVO saved = new ProductionConfirmServiceImpl(dao, clients()).create(request(6L));
		assertEquals(30L, saved.getId());
		assertEquals("20261006-04", saved.getLotNo());
		ArgumentCaptor<ProductionScheduleVO> row = ArgumentCaptor.forClass(ProductionScheduleVO.class);
		verify(dao).insertSchedule(row.capture());
		assertEquals("000001", row.getValue().getProductCode());
		assertEquals("000007", row.getValue().getClientCode());
		assertEquals(0, row.getValue().getIsStockProduction());
		verify(dao).addMaterialStock(eq("M1"), AdditionalMatchers.eq(-59.9, 1e-9));
		verify(dao).addMaterialStock(eq("M2"), AdditionalMatchers.eq(-27.0, 1e-9));
		ArgumentCaptor<MaterialLineVO> used = ArgumentCaptor.forClass(MaterialLineVO.class);
		verify(dao, org.mockito.Mockito.times(2)).insertMaterialUsage(used.capture());
		assertEquals(30L, used.getAllValues().get(0).getScheduleId());
		verify(dao).updateOrderImportedProduction(6L, 1);
		verify(dao).linkShipmentsToLot(6L, 30L);
	}

	@DisplayName("수주에서 온 게 아니면 재고생산, 치환 쪽지가 있으면 바꿀 원재료를 깎는다")
	@Test
	void stockProductionAndSubstitution() throws Exception {
		ProductionConfirmDAO dao = dao();
		when(dao.selectSubstitutions(30L)).thenReturn(Collections.singletonList(sub("M1", "M9", "MSG(국산)", "수급")));
		new ProductionConfirmServiceImpl(dao, clients()).create(request(null));
		ArgumentCaptor<ProductionScheduleVO> row = ArgumentCaptor.forClass(ProductionScheduleVO.class);
		verify(dao).insertSchedule(row.capture());
		assertEquals(1, row.getValue().getIsStockProduction());
		verify(dao).addMaterialStock(eq("M9"), AdditionalMatchers.eq(-59.9, 1e-9));
		verify(dao, never()).addMaterialStock(eq("M1"), anyDouble());
		verify(dao, never()).updateOrderImportedProduction(anyLong(), any(Integer.class));
	}

	@DisplayName("수정: 깎았던 원재료를 먼저 되돌리고 다시 깎는다. 품목이 바뀌면 로트 회차를 다시 뽑는다")
	@Test
	void updateReversesThenReapplies() throws Exception {
		ProductionConfirmDAO dao = dao();
		ProductionScheduleVO current = new ProductionScheduleVO();
		current.setId(30L);
		current.setScheduleDate("2026-10-06");
		current.setProductName("다른 품목");
		current.setProductCode("000099");
		when(dao.selectScheduleRow(30L)).thenReturn(current);
		when(dao.selectMaterialUsage(30L)).thenReturn(Arrays.asList(usage("M1", 10), usage("M2", 5)));
		new ProductionConfirmServiceImpl(dao, clients()).update(30L, request(null));
		InOrder order = inOrder(dao);
		order.verify(dao).addMaterialStock("M1", 10.0);
		order.verify(dao).addMaterialStock("M2", 5.0);
		order.verify(dao).deleteMaterialUsage(30L);
		order.verify(dao).updateLotNo(30L, "20261006-01");
		order.verify(dao).updateSchedule(any());
		order.verify(dao).addMaterialStock(eq("M1"), AdditionalMatchers.eq(-59.9, 1e-9));
		assertThrows(IllegalArgumentException.class, () -> new ProductionConfirmServiceImpl(dao, clients()).update(99L, request(null)));
	}

	@DisplayName("삭제: 실생산량이 있거나 출하확정된 건은 막고, 아니면 원재료를 되돌리고 수주를 풀고 치환 쪽지도 지운다")
	@Test
	void deleteRules() throws Exception {
		ProductionConfirmDAO dao = dao();
		ProductionScheduleVO produced = new ProductionScheduleVO();
		produced.setActualQty("1000");
		ProductionScheduleVO shipped = new ProductionScheduleVO();
		shipped.setShipConfirmed(1);
		ProductionScheduleVO plain = new ProductionScheduleVO();
		plain.setSourceOrderId(6L);
		when(dao.selectScheduleRow(1L)).thenReturn(produced);
		when(dao.selectScheduleRow(2L)).thenReturn(shipped);
		when(dao.selectScheduleRow(3L)).thenReturn(plain);
		when(dao.selectMaterialUsage(3L)).thenReturn(Collections.singletonList(usage("M1", 59.9)));
		ProductionConfirmServiceImpl service = new ProductionConfirmServiceImpl(dao, clients());
		assertEquals(ProductionConfirmServiceImpl.DELETE_BLOCKED_MESSAGE, assertThrows(IllegalArgumentException.class, () -> service.delete(1L)).getMessage());
		assertThrows(IllegalArgumentException.class, () -> service.delete(2L));
		verify(dao, never()).deleteSchedule(anyLong());
		service.delete(3L);
		verify(dao).addMaterialStock("M1", 59.9);
		verify(dao).updateOrderImportedProduction(6L, 0);
		verify(dao).deleteSchedule(3L);
		verify(dao).deleteSubstitutions(3L);
	}

	@DisplayName("투입지시서: 생산지시량 × 배합비율(kg, 소수 셋째 자리), 바꿔 쓰는 원재료는 바뀐 이름과 원래 이름")
	@Test
	void batchSheet() throws Exception {
		ProductionConfirmDAO dao = dao();
		ProductionScheduleVO row = new ProductionScheduleVO();
		row.setId(2L);
		row.setProductName(PRODUCT);
		row.setOrderQty("1000");
		row.setLotNo("20260921-01");
		when(dao.selectScheduleRow(2L)).thenReturn(row);
		when(dao.selectBatchLines("000001")).thenReturn(Arrays.asList(bom("M1", "MSG", 0.0599), bom("M2", "고춧가루", 0.02701234)));
		when(dao.selectSubstitutions(2L)).thenReturn(Collections.singletonList(sub("M2", "M8", "고춧가루(국산)", "산지 변경")));
		BatchSheetVO sheet = new ProductionConfirmServiceImpl(dao, clients()).batchSheet(2L);
		assertEquals("000001", sheet.getHeader().getProductCode());
		assertEquals(1, sheet.getHeader().getSubstitutionCount());
		assertEquals(59.9, sheet.getRows().get(0).getQty(), 1e-9);
		assertFalse(sheet.getRows().get(0).getSubstituted());
		assertEquals(27.012, sheet.getRows().get(1).getQty(), 1e-9);
		assertTrue(sheet.getRows().get(1).getSubstituted());
		assertEquals("고춧가루(국산)", sheet.getRows().get(1).getMaterialName());
		assertEquals("고춧가루", sheet.getRows().get(1).getOriginName());
		assertEquals("산지 변경", sheet.getRows().get(1).getReason());
	}

	@DisplayName("목록은 날짜 필수, 가져오기는 기간이 비면 빈 목록")
	@Test
	void listRules() throws Exception {
		ProductionConfirmDAO dao = dao();
		ProductionConfirmServiceImpl service = new ProductionConfirmServiceImpl(dao, clients());
		assertEquals("date 파라미터가 필요합니다", assertThrows(IllegalArgumentException.class, () -> service.listSchedule("")).getMessage());
		List<?> none = service.listImportOrders("2026-10-01", " ");
		assertTrue(none.isEmpty());
		verify(dao, never()).selectImportOrders(anyString(), anyString());
	}

	@DisplayName("다시 계산(재료 치환등록): 깎았던 것을 되돌리고 쪽지대로 다시 깎는다. 제품코드가 없으면 이름으로 찾고, 없는 건은 막는다")
	@Test
	void reapplyMaterialUsage() throws Exception {
		ProductionConfirmDAO dao = dao();
		ProductionScheduleVO current = new ProductionScheduleVO();
		current.setId(30L);
		current.setProductName(PRODUCT);
		current.setOrderQty("1,000kg");
		when(dao.selectScheduleRow(30L)).thenReturn(current);
		when(dao.selectMaterialUsage(30L)).thenReturn(Arrays.asList(usage("M1", 59.9), usage("M2", 27)));
		when(dao.selectSubstitutions(30L)).thenReturn(Collections.singletonList(sub("M1", "M9", "MSG(국산)", "수급")));
		ProductionConfirmServiceImpl service = new ProductionConfirmServiceImpl(dao, clients());
		service.reapplyMaterialUsage(30L);
		InOrder order = inOrder(dao);
		order.verify(dao).addMaterialStock("M1", 59.9);
		order.verify(dao).addMaterialStock("M2", 27.0);
		order.verify(dao).deleteMaterialUsage(30L);
		order.verify(dao).addMaterialStock(eq("M9"), AdditionalMatchers.eq(-59.9, 1e-9));
		order.verify(dao).addMaterialStock(eq("M2"), AdditionalMatchers.eq(-27.0, 1e-9));
		verify(dao, never()).updateSchedule(any());
		assertEquals("생산스케줄 항목을 찾을 수 없습니다", assertThrows(IllegalArgumentException.class, () -> service.reapplyMaterialUsage(99L)).getMessage());
	}
}

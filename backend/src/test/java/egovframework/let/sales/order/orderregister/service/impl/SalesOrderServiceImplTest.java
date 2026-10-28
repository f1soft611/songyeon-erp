package egovframework.let.sa.order.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Arrays;
import java.util.Collections;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import egovframework.let.co.master.itemmaster.service.ItemMasterService;
import egovframework.let.sa.order.domain.model.OrderProductVO;
import egovframework.let.sa.order.domain.model.SalesOrderVO;
import egovframework.let.sa.order.domain.repository.SalesOrderDAO;

class SalesOrderServiceImplTest {

	private static final String CLIENT = "(주) 디에이치식품";

	private static SalesOrderVO request() {
		SalesOrderVO r = new SalesOrderVO();
		r.setOrderDate("2026-10-06");
		r.setClientName(" " + CLIENT + " ");
		r.setProductName("국물두루치기분말(1kg*10ea)");
		r.setOrderQty("100");
		r.setProductionDate("2026-10-07");
		r.setLogisticsDate("2026-10-08");
		r.setIsStockProduction(0);
		return r;
	}

	private static OrderProductVO product(String code, String name, String spec) {
		OrderProductVO p = new OrderProductVO();
		p.setCode(code);
		p.setName(name);
		p.setSpec(spec);
		return p;
	}

	private static SalesOrderDAO salesDao() throws Exception {
		SalesOrderDAO dao = mock(SalesOrderDAO.class);
		when(dao.selectClientType(CLIENT)).thenReturn("매출");
		when(dao.selectClientCodeByName(CLIENT)).thenReturn("000005");
		when(dao.selectProductCodesByName(any())).thenReturn(Collections.<String>emptyList());
		when(dao.selectProductNameSpecs()).thenReturn(Arrays.asList(product("000001", "국물두루치기분말", "1kg*10ea")));
		return dao;
	}

	private static ItemMasterService bomService() throws Exception {
		ItemMasterService bom = mock(ItemMasterService.class);
		when(bom.resolveRegisteredClient(CLIENT)).thenReturn(CLIENT);
		return bom;
	}

	@DisplayName("수주일이 없으면 막는다")
	@Test
	void dateRequired() throws Exception {
		SalesOrderDAO dao = salesDao();
		SalesOrderServiceImpl service = new SalesOrderServiceImpl(dao, bomService());
		SalesOrderVO r = request();
		r.setOrderDate(" ");
		assertEquals("날짜가 필요합니다", assertThrows(IllegalArgumentException.class, () -> service.createOrder(r)).getMessage());
		verify(dao, never()).insertOrder(any());
	}

	@DisplayName("재고생산이 아니면 물류출고일이 있어야 한다")
	@Test
	void shippingRequired() throws Exception {
		SalesOrderDAO dao = salesDao();
		SalesOrderServiceImpl service = new SalesOrderServiceImpl(dao, bomService());
		SalesOrderVO r = request();
		r.setLogisticsDate("");
		assertEquals(SalesOrderServiceImpl.SHIPPING_REQUIRED_MESSAGE,
				assertThrows(IllegalArgumentException.class, () -> service.createOrder(r)).getMessage());
		verify(dao, never()).insertOrder(any());
	}

	@DisplayName("거래처는 필수, 거래처BOM 확인을 거치고, 매입 거래처면 막는다")
	@Test
	void salesClientRules() throws Exception {
		SalesOrderDAO dao = salesDao();
		ItemMasterService bom = bomService();
		when(bom.resolveRegisteredClient("다온")).thenReturn("다온");
		when(dao.selectClientType("다온")).thenReturn("매입");
		when(bom.resolveRegisteredClient("부산")).thenThrow(new IllegalArgumentException("'부산' 은 거래처BOM에 없는 거래처입니다."));
		SalesOrderServiceImpl service = new SalesOrderServiceImpl(dao, bom);

		SalesOrderVO empty = request();
		empty.setClientName("  ");
		assertEquals("거래처를 입력해주세요.", assertThrows(IllegalArgumentException.class, () -> service.createOrder(empty)).getMessage());

		SalesOrderVO unknown = request();
		unknown.setClientName("부산");
		assertEquals("'부산' 은 거래처BOM에 없는 거래처입니다.",
				assertThrows(IllegalArgumentException.class, () -> service.createOrder(unknown)).getMessage());

		SalesOrderVO purchase = request();
		purchase.setClientName("다온");
		assertEquals("'다온' 은 매입거래처로 등록되어 있어 수주를 받을 수 없습니다. 거래처BOM에서 분류를 '매출' 또는 '매입+매출' 로 바꿔주세요.",
				assertThrows(IllegalArgumentException.class, () -> service.createOrder(purchase)).getMessage());
		verify(dao, never()).insertOrder(any());
	}

	@DisplayName("추가: 같은 날 순서 +1, '이름(규격)' 으로 제품코드를 찾고 거래처는 거래처BOM 철자로 저장")
	@Test
	void createsWithNextSortOrderAndProductCode() throws Exception {
		SalesOrderDAO dao = salesDao();
		when(dao.selectMaxSortOrder("2026-10-06")).thenReturn(2);
		doAnswer(inv -> {
			((SalesOrderVO) inv.getArgument(0)).setId(41L);
			return null;
		}).when(dao).insertOrder(any());
		SalesOrderServiceImpl service = new SalesOrderServiceImpl(dao, bomService());

		assertEquals(Long.valueOf(41L), service.createOrder(request()));
		ArgumentCaptor<SalesOrderVO> saved = ArgumentCaptor.forClass(SalesOrderVO.class);
		verify(dao).insertOrder(saved.capture());
		assertEquals(3, saved.getValue().getSortOrder());
		assertEquals("000001", saved.getValue().getProductCode());
		assertEquals(CLIENT, saved.getValue().getClientName());
		assertEquals("000005", saved.getValue().getClientCode());
		assertEquals("2026-10-08", saved.getValue().getLogisticsDate());
		assertEquals(0, saved.getValue().getIsStockProduction());
	}

	@DisplayName("2026-10-26 코드로만 저장하므로 제품마스터에 없는 품목 · 거래처코드 없는 거래처는 막는다")
	@Test
	void rejectsWhatCannotBecomeCode() throws Exception {
		SalesOrderDAO dao = salesDao();
		SalesOrderServiceImpl service = new SalesOrderServiceImpl(dao, bomService());
		SalesOrderVO unknown = request();
		unknown.setProductName("없는 품목");
		assertEquals(SalesOrderServiceImpl.PRODUCT_MESSAGE,
				assertThrows(IllegalArgumentException.class, () -> service.createOrder(unknown)).getMessage());
		when(dao.selectClientCodeByName(CLIENT)).thenReturn(null);
		assertEquals(SalesOrderServiceImpl.CLIENT_CODE_MESSAGE,
				assertThrows(IllegalArgumentException.class, () -> service.createOrder(request())).getMessage());
		verify(dao, never()).insertOrder(any());
	}

	@DisplayName("재고생산이면 화면에 남은 물류출고일을 비우고, 빈 생산예정일은 null")
	@Test
	void stockProductionClearsLogisticsDate() throws Exception {
		SalesOrderDAO dao = salesDao();
		SalesOrderServiceImpl service = new SalesOrderServiceImpl(dao, bomService());
		SalesOrderVO r = request();
		r.setIsStockProduction(1);
		r.setProductionDate("");
		service.createOrder(r);
		ArgumentCaptor<SalesOrderVO> saved = ArgumentCaptor.forClass(SalesOrderVO.class);
		verify(dao).insertOrder(saved.capture());
		assertNull(saved.getValue().getLogisticsDate());
		assertNull(saved.getValue().getProductionDate());
		assertEquals(1, saved.getValue().getIsStockProduction());
		assertEquals(1, saved.getValue().getSortOrder());
	}

	@DisplayName("수량(2026-10-23): 숫자만(쉼표는 빼고, 비우면 null), 글자가 섞이면 막는다")
	@Test
	void qtyRules() {
		assertEquals("1000", SalesOrderServiceImpl.qtyOf(" 1,000 "));
		assertEquals("12.5", SalesOrderServiceImpl.qtyOf("12.5"));
		assertNull(SalesOrderServiceImpl.qtyOf(" "));
		assertEquals(SalesOrderServiceImpl.QTY_MESSAGE,
				assertThrows(IllegalArgumentException.class, () -> SalesOrderServiceImpl.qtyOf("100kg")).getMessage());
	}

	@DisplayName("삭제(2026-10-23): 가져간 수주 · 없는 수주는 막고, 아니면 지운다")
	@Test
	void deleteRules() throws Exception {
		SalesOrderDAO dao = salesDao();
		when(dao.selectOrderImported(1L)).thenReturn(0);
		when(dao.deleteOrder(1L)).thenReturn(1);
		when(dao.selectOrderImported(2L)).thenReturn(1);
		when(dao.selectOrderImported(3L)).thenReturn(null);
		SalesOrderServiceImpl service = new SalesOrderServiceImpl(dao, bomService());
		service.deleteOrder(1L);
		verify(dao).deleteOrder(1L);
		assertEquals(SalesOrderServiceImpl.IMPORTED_DELETE_MESSAGE,
				assertThrows(IllegalArgumentException.class, () -> service.deleteOrder(2L)).getMessage());
		assertEquals(SalesOrderServiceImpl.NOT_FOUND_MESSAGE,
				assertThrows(IllegalArgumentException.class, () -> service.deleteOrder(3L)).getMessage());
		verify(dao, never()).deleteOrder(2L);
	}

	@DisplayName("수정: 고친 줄이 없으면(옆자리에서 지움) 성공이라 하지 않는다")
	@Test
	void updateMissingRow() throws Exception {
		SalesOrderDAO dao = salesDao();
		when(dao.updateOrder(any())).thenReturn(0);
		SalesOrderServiceImpl service = new SalesOrderServiceImpl(dao, bomService());
		assertEquals("수주 항목을 찾을 수 없습니다",
				assertThrows(IllegalArgumentException.class, () -> service.updateOrder(7L, request())).getMessage());
	}

	@DisplayName("제품코드: 같은 이름(규격)이 둘이면 정하지 않는다. 2026-10-26 코드로만 저장하므로 막는다(제품코드를 함께 보내면 그 코드로)")
	@Test
	void ambiguousProductCodeIsRejected() throws Exception {
		SalesOrderDAO dao = salesDao();
		when(dao.selectProductNameSpecs()).thenReturn(Arrays.asList(
				product("000001", "국물두루치기분말", "1kg*10ea"), product("000009", "국물두루치기분말", "1kg*10ea")));
		when(dao.updateOrder(any())).thenReturn(1);
		SalesOrderServiceImpl service = new SalesOrderServiceImpl(dao, bomService());
		assertEquals(SalesOrderServiceImpl.PRODUCT_MESSAGE,
				assertThrows(IllegalArgumentException.class, () -> service.updateOrder(7L, request())).getMessage());
		verify(dao, never()).updateOrder(any());
		when(dao.selectProductCode("000009")).thenReturn("000009");
		SalesOrderVO picked = request();
		picked.setProductCode("000009");
		service.updateOrder(7L, picked);
		ArgumentCaptor<SalesOrderVO> saved = ArgumentCaptor.forClass(SalesOrderVO.class);
		verify(dao).updateOrder(saved.capture());
		assertEquals("000009", saved.getValue().getProductCode());
		assertEquals(Long.valueOf(7L), saved.getValue().getId());
	}
}

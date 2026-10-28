package egovframework.let.pu.order.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Arrays;
import java.util.Collections;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import egovframework.let.pu.order.domain.model.PurchaseOrderBulkRequestVO;
import egovframework.let.pu.order.domain.model.PurchaseOrderItemVO;
import egovframework.let.pu.order.domain.model.PurchaseOrderVO;
import egovframework.let.pu.order.domain.repository.PurchaseOrderDAO;

class PurchaseOrderServiceImplTest {

	private static PurchaseOrderItemVO item(String code, String client, String qty, String orderDate) {
		PurchaseOrderItemVO it = new PurchaseOrderItemVO();
		it.setMaterialCode(code);
		it.setClientName(client);
		it.setQty(qty);
		it.setOrderDate(orderDate);
		return it;
	}

	@DisplayName("목록: 빈 조건은 null, 기간은 시작·끝이 다 있을 때만, 입고여부는 0·1 만")
	@Test
	void list() throws Exception {
		PurchaseOrderDAO dao = mock(PurchaseOrderDAO.class);
		PurchaseOrderServiceImpl service = new PurchaseOrderServiceImpl(dao);
		service.listOrders(" 2026-10-07 ", "2026-10-01", " ", " 대한 ", "", "2");
		verify(dao).selectOrders("2026-10-07", null, null, "대한", null, null);
		service.listOrders(null, "2026-10-01", "2026-10-07", null, " 설탕 ", " 0 ");
		verify(dao).selectOrders(null, "2026-10-01", "2026-10-07", null, "설탕", "0");
	}

	@DisplayName("등록: 발주일·품목 검사, 거래처 없음·수량 못 읽음은 건너뛰고, 원재료 표의 이름으로, 품목 발주일이 있으면 그것. 2026-10-26 등록 안 된 거래처·원재료는 한 건도 넣지 않고 막는다")
	@Test
	void bulk() throws Exception {
		PurchaseOrderDAO dao = mock(PurchaseOrderDAO.class);
		PurchaseOrderServiceImpl service = new PurchaseOrderServiceImpl(dao);
		PurchaseOrderBulkRequestVO empty = new PurchaseOrderBulkRequestVO();
		empty.setItems(Collections.singletonList(item("M1", "대한", "1", " ")));
		assertEquals("발주일이 필요합니다", assertThrows(IllegalArgumentException.class, () -> service.registerBulk(empty)).getMessage());
		PurchaseOrderBulkRequestVO noItems = new PurchaseOrderBulkRequestVO();
		noItems.setOrderDate("2026-10-07");
		assertEquals("등록할 품목이 없습니다", assertThrows(IllegalArgumentException.class, () -> service.registerBulk(noItems)).getMessage());
		verify(dao, never()).insertOrder(any());

		when(dao.selectMaterialName("M1")).thenReturn("설탕");
		when(dao.selectMaterialName("M2")).thenReturn("소금");
		when(dao.selectVendorCodeByName("대한상사")).thenReturn("000001");
		when(dao.selectVendorCodeByName("삼양")).thenReturn("000002");
		PurchaseOrderBulkRequestVO badVendor = new PurchaseOrderBulkRequestVO();
		badVendor.setOrderDate("2026-10-07");
		badVendor.setItems(Arrays.asList(item("M1", "대한상사", "1", null), item("M1", "없는상사", "1", null)));
		assertEquals(PurchaseOrderServiceImpl.VENDOR_MESSAGE + "없는상사", assertThrows(IllegalArgumentException.class, () -> service.registerBulk(badVendor)).getMessage());
		PurchaseOrderBulkRequestVO badMaterial = new PurchaseOrderBulkRequestVO();
		badMaterial.setOrderDate("2026-10-07");
		badMaterial.setItems(Arrays.asList(item("M1", "대한상사", "1", null), item("NOPE", "대한상사", "1", null)));
		assertEquals(PurchaseOrderServiceImpl.MATERIAL_MESSAGE + "NOPE", assertThrows(IllegalArgumentException.class, () -> service.registerBulk(badMaterial)).getMessage());
		verify(dao, never()).insertOrder(any());
		PurchaseOrderBulkRequestVO body = new PurchaseOrderBulkRequestVO();
		body.setOrderDate("2026-10-07");
		body.setItems(Arrays.asList(
				item(" M1 ", " 대한상사 ", "500", null),
				item("M2", " ", "10", null),
				item("M2", "대한상사", "열개", null),
				item("M2", "삼양", "12.5", "2026-10-09")));
		assertEquals(2, service.registerBulk(body));
		ArgumentCaptor<PurchaseOrderVO> saved = ArgumentCaptor.forClass(PurchaseOrderVO.class);
		verify(dao, times(2)).insertOrder(saved.capture());
		PurchaseOrderVO first = saved.getAllValues().get(0);
		assertEquals("M1", first.getMaterialCode());
		assertEquals("설탕", first.getMaterialName());
		assertEquals(500.0, first.getQty());
		assertEquals("2026-10-07", first.getOrderDate());
		assertEquals("대한상사", first.getClientName());
		assertEquals("000001", first.getClientCode());
		assertNull(first.getSource());
		assertNull(first.getNeedDate());
		assertEquals("2026-10-09", saved.getAllValues().get(1).getOrderDate());
		assertEquals(12.5, saved.getAllValues().get(1).getQty());

		// 품목마다 발주일이 있으면(수불대장) 위쪽 발주일이 없어도 된다
		PurchaseOrderBulkRequestVO ledger = new PurchaseOrderBulkRequestVO();
		ledger.setSource("ledger");
		ledger.setItems(Collections.singletonList(item("M1", "대한상사", "3", "2026-10-10")));
		assertEquals(1, service.registerBulk(ledger));
	}

	@DisplayName("취소: 입고가 연결된 발주는 막고, 아니면 지운다")
	@Test
	void cancel() throws Exception {
		PurchaseOrderDAO dao = mock(PurchaseOrderDAO.class);
		PurchaseOrderServiceImpl service = new PurchaseOrderServiceImpl(dao);
		when(dao.countReceiving(1L)).thenReturn(1);
		assertEquals(PurchaseOrderServiceImpl.RECEIVED_MESSAGE, assertThrows(IllegalArgumentException.class, () -> service.cancel(1L)).getMessage());
		verify(dao, never()).deleteOrder(anyLong());
		when(dao.countReceiving(2L)).thenReturn(0);
		service.cancel(2L);
		verify(dao).deleteOrder(2L);
	}
}

package egovframework.let.pd.actual.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import egovframework.let.common.inventory.domain.model.ProductStockMovementVO;
import egovframework.let.common.inventory.service.InventoryService;
import egovframework.let.pd.actual.domain.model.ProductionActualVO;
import egovframework.let.pd.actual.domain.repository.ProductionActualDAO;

class ProductionActualServiceImplTest {

	private static ProductionActualVO row(String actualQty, String productCode) {
		ProductionActualVO r = new ProductionActualVO();
		r.setId(4L);
		r.setScheduleDate("2026-10-06");
		r.setClientName("(주)달구지푸드");
		r.setProductName("로제파스타소스(5kg*4ea)");
		r.setProductCode(productCode);
		r.setOrderQty("135");
		r.setActualQty(actualQty);
		return r;
	}

	@DisplayName("처음 넣으면 '생산입고': 제품 재고 +, 원장(그 생산일·출처·거래처·누가), 필름·파우치 사용, 실생산량 저장")
	@Test
	void firstEntry() throws Exception {
		ProductionActualDAO dao = mock(ProductionActualDAO.class);
		InventoryService inventory = mock(InventoryService.class);
		when(dao.selectScheduleRow(4L)).thenReturn(row(null, "000006"));
		new ProductionActualServiceImpl(dao, inventory).saveActualQty(4L, " 132kg ", "관리자");
		ArgumentCaptor<ProductStockMovementVO> options = ArgumentCaptor.forClass(ProductStockMovementVO.class);
		verify(inventory).moveProductStock(eq("000006"), eq(132.0), eq("생산입고"), options.capture());
		assertEquals("2026-10-06", options.getValue().getMovedOn());
		assertEquals("production_schedule", options.getValue().getSourceTable());
		assertEquals(4L, options.getValue().getSourceId());
		assertEquals("(주)달구지푸드", options.getValue().getClientName());
		assertEquals("관리자", options.getValue().getCreatedBy());
		assertNull(options.getValue().getNote());
		verify(inventory).applyFilmPouchUsage("000006", 132.0, "생산입고 로제파스타소스(5kg*4ea)");
		verify(dao).updateActualQty(4L, "132kg");
	}

	@DisplayName("고치면 '생산정정'(차이만), 비우면 '입고취소'(넣었던 만큼 되돌림, 실생산량 null)")
	@Test
	void correctAndCancel() throws Exception {
		ProductionActualDAO dao = mock(ProductionActualDAO.class);
		InventoryService inventory = mock(InventoryService.class);
		when(dao.selectScheduleRow(4L)).thenReturn(row("1,000", "000006"));
		ProductionActualServiceImpl service = new ProductionActualServiceImpl(dao, inventory);
		service.saveActualQty(4L, "980", null);
		ArgumentCaptor<ProductStockMovementVO> options = ArgumentCaptor.forClass(ProductStockMovementVO.class);
		verify(inventory).moveProductStock(eq("000006"), eq(-20.0), eq("생산정정"), options.capture());
		assertEquals("1000 -> 980", options.getValue().getNote());
		verify(inventory).applyFilmPouchUsage("000006", -20.0, "생산정정 로제파스타소스(5kg*4ea)");

		service.saveActualQty(4L, "  ", null);
		verify(inventory).moveProductStock(eq("000006"), eq(-1000.0), eq("입고취소"), options.capture());
		assertEquals("1000 취소", options.getValue().getNote());
		verify(dao).updateActualQty(4L, null);
	}

	@DisplayName("같은 양이면 재고는 안 움직이고 글자만 저장, 제품코드가 없으면 품목명(규격)으로 찾는다, 없는 줄은 막는다")
	@Test
	void sameQtyAndLookup() throws Exception {
		ProductionActualDAO dao = mock(ProductionActualDAO.class);
		InventoryService inventory = mock(InventoryService.class);
		when(dao.selectScheduleRow(4L)).thenReturn(row("135", "000006"));
		when(dao.selectScheduleRow(5L)).thenReturn(row(null, null));
		when(dao.selectProductCodeByDisplayName("로제파스타소스(5kg*4ea)")).thenReturn("000006");
		ProductionActualServiceImpl service = new ProductionActualServiceImpl(dao, inventory);
		service.saveActualQty(4L, "135kg", null);
		verify(inventory, never()).moveProductStock(anyString(), anyDouble(), anyString(), any());
		verify(dao).updateActualQty(4L, "135kg");
		service.saveActualQty(5L, "100", null);
		verify(inventory).moveProductStock(eq("000006"), eq(100.0), eq("생산입고"), any());
		assertEquals("생산스케줄 항목을 찾을 수 없습니다", assertThrows(IllegalArgumentException.class, () -> service.saveActualQty(9L, "1", null)).getMessage());
		assertEquals("date 파라미터가 필요합니다", assertThrows(IllegalArgumentException.class, () -> service.listSchedule(" ")).getMessage());
	}
}

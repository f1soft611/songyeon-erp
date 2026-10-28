package egovframework.let.lg.stock.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import egovframework.let.lg.stock.domain.model.ProductStockVO;
import egovframework.let.lg.stock.domain.model.StockAsOfVO;
import egovframework.let.lg.stock.domain.repository.ProductStockDAO;
import egovframework.let.sa.shipment.domain.model.ProductLotListVO;
import egovframework.let.sa.shipment.service.ShipmentService;

class ProductStockServiceImplTest {

	private static ProductStockVO product(String code, String name, String spec, Double stock) {
		ProductStockVO row = new ProductStockVO();
		row.setCode(code);
		row.setName(name);
		row.setSpec(spec);
		row.setStockQty(stock);
		return row;
	}

	private static ProductStockVO pending(String productName, String orderQty) {
		ProductStockVO row = new ProductStockVO();
		row.setProductName(productName);
		row.setOrderQty(orderQty);
		return row;
	}

	@DisplayName("생산예정: 실생산량 없는 생산확정 지시량을 '이름(규격)' 으로 맞춰 합치고 건수를 센다. 정렬·빈 조건")
	@Test
	void listStock() throws Exception {
		ProductStockDAO dao = mock(ProductStockDAO.class);
		ProductStockServiceImpl service = new ProductStockServiceImpl(dao, mock(ShipmentService.class));
		when(dao.selectStock(null, "푸드", true)).thenReturn(Arrays.asList(
				product("6", "로제파스타소스", "5kg*4ea", 135.0), product("3", "김치찌개분말", null, 0.0)));
		when(dao.selectPendingProduction()).thenReturn(Arrays.asList(
				pending("로제파스타소스(5kg*4ea)", "1,000kg"), pending("로제파스타소스(5kg*4ea)", "200"), pending("김치찌개분말", "50"),
				pending("로제파스타소스", "999")));
		List<ProductStockVO> rows = service.listStock(" ", " 푸드 ", "name-desc");
		assertEquals(1200.0, rows.get(0).getPlannedQty());
		assertEquals(Integer.valueOf(2), rows.get(0).getPlannedCount());
		assertEquals(50.0, rows.get(1).getPlannedQty());
		assertEquals(Integer.valueOf(1), rows.get(1).getPlannedCount());
		verify(dao).selectStock(null, "푸드", true);
	}

	@DisplayName("날짜 기준 재고: 그 날짜 뒤 원장만큼 되감고, 원재료비가 있는 제품만 금액을 더한다")
	@Test
	void stockAsOf() throws Exception {
		ProductStockDAO dao = mock(ProductStockDAO.class);
		ProductStockServiceImpl service = new ProductStockServiceImpl(dao, mock(ShipmentService.class));
		ProductStockVO moved = new ProductStockVO();
		moved.setProductCode("6");
		moved.setQty(135.0);
		when(dao.selectProductDeltaAfter("2026-10-05")).thenReturn(Collections.singletonList(moved));
		ProductStockVO cost = new ProductStockVO();
		cost.setProductCode("1");
		cost.setMaterialCost(500.0);
		when(dao.selectMaterialCosts()).thenReturn(Collections.singletonList(cost));
		when(dao.selectProductsForAsOf(null)).thenReturn(Arrays.asList(product("1", "국물", "1kg", 1000.0), product("6", "로제", "5kg", 135.0)));
		StockAsOfVO result = service.stockAsOf("2026-10-05", "");
		assertEquals("2026-10-05", result.getDate());
		assertEquals(1000.0, result.getProducts().get(0).getStockQty());
		assertEquals(500000.0, result.getProducts().get(0).getAmount());
		assertEquals(0.0, result.getProducts().get(1).getStockQty());
		assertNull(result.getProducts().get(1).getAmount());
		assertEquals(500000.0, result.getTotalAmount());
	}

	@DisplayName("로트: 없는 제품은 막고, 있으면 '이름(규격)' 으로 출하등록의 로트 계산을 부른다")
	@Test
	void lots() throws Exception {
		ProductStockDAO dao = mock(ProductStockDAO.class);
		ShipmentService shipmentService = mock(ShipmentService.class);
		ProductStockServiceImpl service = new ProductStockServiceImpl(dao, shipmentService);
		assertEquals("제품을 찾을 수 없습니다", assertThrows(IllegalArgumentException.class, () -> service.listLots("X")).getMessage());
		when(dao.selectProduct("6")).thenReturn(product("6", "로제파스타소스", "5kg*4ea", null));
		when(shipmentService.listLots("로제파스타소스(5kg*4ea)")).thenReturn(new ProductLotListVO());
		assertEquals(0, service.listLots("6").size());
		verify(shipmentService).listLots("로제파스타소스(5kg*4ea)");
	}
}

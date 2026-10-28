package egovframework.let.common.inventory.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.AdditionalMatchers;
import org.mockito.ArgumentCaptor;

import egovframework.let.common.inventory.domain.model.InventoryItemVO;
import egovframework.let.common.inventory.domain.model.MaterialStockMovementVO;
import egovframework.let.common.inventory.domain.model.ProductStockMovementVO;
import egovframework.let.common.inventory.domain.repository.InventoryDAO;

class InventoryServiceImplTest {

	@DisplayName("제품 재고: 지금 재고 + qty 로 고치고, 원장에 이름(없으면 이름(규격))·일자·움직인 뒤 재고를 남긴다")
	@Test
	void moveProductStock() throws Exception {
		InventoryDAO dao = mock(InventoryDAO.class);
		InventoryItemVO product = new InventoryItemVO();
		product.setName("로제파스타소스");
		product.setSpec("5kg*4ea");
		product.setStockQty(10.0);
		when(dao.selectProduct("000006")).thenReturn(product);
		InventoryServiceImpl service = new InventoryServiceImpl(dao);
		ProductStockMovementVO options = new ProductStockMovementVO();
		options.setMovedOn("2026-10-06");
		options.setSourceId(4L);
		assertEquals(142.0, service.moveProductStock("000006", 132, "생산입고", options));
		verify(dao).updateProductStock("000006", 142.0);
		ArgumentCaptor<ProductStockMovementVO> movement = ArgumentCaptor.forClass(ProductStockMovementVO.class);
		verify(dao).insertProductMovement(movement.capture());
		assertEquals("로제파스타소스(5kg*4ea)", movement.getValue().getProductName());
		assertEquals("2026-10-06", movement.getValue().getMovedOn());
		assertEquals(132.0, movement.getValue().getQty());
		assertEquals(142.0, movement.getValue().getBalanceAfter());
		assertEquals(4L, movement.getValue().getSourceId());
		// 0 이거나 없는 제품이면 움직이지 않는다
		assertNull(service.moveProductStock("000006", 0, "생산입고", options));
		assertNull(service.moveProductStock("999999", 5, "생산입고", options));
	}

	@DisplayName("필름·파우치: 봉지 수 = kg / 한 봉 내용량, 필름 M·파우치 수만큼 빼고 수불을 남긴다(내용량이 없으면 건너뜀)")
	@Test
	void filmPouch() throws Exception {
		InventoryDAO dao = mock(InventoryDAO.class);
		InventoryItemVO sub = new InventoryItemVO();
		sub.setPouchNetWeightKg(5.0);
		sub.setPouchLengthM(0.3);
		sub.setPouchPerUnit(2.0);
		sub.setFilmMaterialCode("F1");
		sub.setPouchMaterialCode("P1");
		when(dao.selectSubMaterials("000006")).thenReturn(sub);
		when(dao.selectSubMaterials("000001")).thenReturn(new InventoryItemVO());
		when(dao.selectMaterialName("F1")).thenReturn("필름");
		when(dao.selectMaterialName("P1")).thenReturn("파우치");
		InventoryServiceImpl service = new InventoryServiceImpl(dao);
		service.applyFilmPouchUsage("000006", 100, "생산입고 로제");
		// 20봉 → 필름 6M, 파우치 40개
		verify(dao).addMaterialStock(org.mockito.ArgumentMatchers.eq("F1"), AdditionalMatchers.eq(-6.0, 1e-9));
		verify(dao).addMaterialStock(org.mockito.ArgumentMatchers.eq("P1"), AdditionalMatchers.eq(-40.0, 1e-9));
		ArgumentCaptor<MaterialStockMovementVO> movement = ArgumentCaptor.forClass(MaterialStockMovementVO.class);
		verify(dao, org.mockito.Mockito.times(2)).insertMaterialMovement(movement.capture());
		assertEquals("생산입고 로제 (필름)", movement.getAllValues().get(0).getNote());
		assertEquals(6.0, movement.getAllValues().get(0).getOutQty(), 1e-9);
		assertNull(movement.getAllValues().get(0).getInQty());
		service.applyFilmPouchUsage("000001", 100, "x");
		verify(dao, never()).addMaterialStock(org.mockito.ArgumentMatchers.eq("x"), anyDouble());
		verify(dao, never()).selectMaterialName(org.mockito.ArgumentMatchers.startsWith("000"));
		verify(dao, never()).addMaterialStock(anyString(), AdditionalMatchers.eq(0.0, 1e-12));
	}

	@DisplayName("박스: 연결된 박스 재고를 박스 수만큼 빼고(되돌리면 더하고), 연결이 없으면 건너뛴다")
	@Test
	void boxUsage() throws Exception {
		InventoryDAO dao = mock(InventoryDAO.class);
		InventoryServiceImpl service = new InventoryServiceImpl(dao);
		InventoryItemVO product = new InventoryItemVO();
		product.setBoxMaterialCode("B1");
		when(dao.selectSubMaterials("000006")).thenReturn(product);
		when(dao.selectMaterialName("B1")).thenReturn("박스");
		service.applyBoxUsage("000006", 4, "출하 로제");
		verify(dao).addMaterialStock("B1", -4.0);
		ArgumentCaptor<MaterialStockMovementVO> movement = ArgumentCaptor.forClass(MaterialStockMovementVO.class);
		verify(dao).insertMaterialMovement(movement.capture());
		assertEquals(4.0, movement.getValue().getOutQty());
		assertEquals("출하 로제 (박스)", movement.getValue().getNote());
		service.applyBoxUsage("000006", -4, "출하취소 로제");
		verify(dao).addMaterialStock("B1", 4.0);

		when(dao.selectSubMaterials("000001")).thenReturn(new InventoryItemVO());
		service.applyBoxUsage("000001", 4, "출하");
		verify(dao, never()).addMaterialStock(org.mockito.ArgumentMatchers.eq("000001"), anyDouble());
	}
}

package egovframework.let.common.inventory.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import egovframework.let.common.inventory.domain.model.StockDeltaVO;
import egovframework.let.common.inventory.domain.model.WarehouseQtyVO;
import egovframework.let.common.inventory.domain.repository.MaterialStockSnapshotDAO;
import egovframework.let.common.inventory.service.WarehouseSplit;

class MaterialStockSnapshotServiceImplTest {

	private static StockDeltaVO row(String code, String warehouse, Double qty) {
		StockDeltaVO r = new StockDeltaVO();
		r.setCode(code);
		r.setWarehouse(warehouse);
		r.setQty(qty);
		return r;
	}

	@DisplayName("그 날짜 뒤 증감: 입고(+) · 생산 사용(−) · 손으로 고침(+/−) · 재고조정(새−옛) 네 갈래를 더한다. 빈 코드·0 은 뺀다")
	@Test
	void deltaAfter() throws Exception {
		MaterialStockSnapshotDAO dao = mock(MaterialStockSnapshotDAO.class);
		when(dao.selectReceivingAfter("2026-10-05")).thenReturn(Arrays.asList(row("M1", null, 100.0), row("M2", null, -5.0), row("", null, 9.0)));
		when(dao.selectUsageAfter("2026-10-05")).thenReturn(Arrays.asList(row("M1", null, 30.0), row("M3", null, 0.0)));
		when(dao.selectMovementAfter("2026-10-05")).thenReturn(Collections.singletonList(row("M2", null, -2.5)));
		when(dao.selectAdjustmentAfter("2026-10-05")).thenReturn(Arrays.asList(row("M1", null, 7.0), row("M4", null, null)));
		Map<String, Double> delta = new MaterialStockSnapshotServiceImpl(dao).deltaAfter("2026-10-05");
		assertEquals(77.0, delta.get("M1"), 1e-9);
		assertEquals(-7.5, delta.get("M2"), 1e-9);
		assertFalse(delta.containsKey("M3"));
		assertFalse(delta.containsKey("M4"));
		assertFalse(delta.containsKey(""));
	}

	@DisplayName("창고별 나누기: 옮겨간 만큼만 다른 창고, 나머지는 입고창고가 떠안아 합이 남은재고와 같다. 창고가 빈 이동은 뺀다")
	@Test
	void warehouseSplit() throws Exception {
		MaterialStockSnapshotDAO dao = mock(MaterialStockSnapshotDAO.class);
		when(dao.selectWarehouseNames()).thenReturn(Arrays.asList("자재창고", "계량창고", "냉동창고"));
		when(dao.selectReceivingWarehouseName()).thenReturn("자재창고");
		when(dao.selectMovedStock("2026-10-13")).thenReturn(Arrays.asList(row("M1", "계량창고", 12.5), row("M1", "", 3.0), row("M1", "냉동창고", 2.0)));
		WarehouseSplit split = new MaterialStockSnapshotServiceImpl(dao).warehouseSplit("2026-10-13");
		List<WarehouseQtyVO> m1 = split.split("M1", 100);
		assertEquals(Arrays.asList("자재창고", "계량창고", "냉동창고"), Arrays.asList(m1.get(0).getName(), m1.get(1).getName(), m1.get(2).getName()));
		assertEquals(85.5, m1.get(0).getQty(), 1e-9);
		assertEquals(12.5, m1.get(1).getQty(), 1e-9);
		assertEquals(2.0, m1.get(2).getQty(), 1e-9);
		List<WarehouseQtyVO> other = split.split("M9", 40);
		assertEquals(40.0, other.get(0).getQty(), 1e-9);
		assertEquals(0.0, other.get(1).getQty(), 1e-9);
		// 입고창고가 정해져 있지 않으면 어느 창고도 나머지를 떠안지 않는다(송연과 같다)
		when(dao.selectReceivingWarehouseName()).thenReturn(null);
		assertEquals(0.0, new MaterialStockSnapshotServiceImpl(dao).warehouseSplit("2026-10-13").split("M9", 40).get(0).getQty(), 1e-9);
	}
}

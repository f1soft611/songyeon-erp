package egovframework.let.sl.status.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import egovframework.let.sl.status.domain.model.SaleRowVO;
import egovframework.let.sl.status.domain.model.SalesStatusVO;
import egovframework.let.sl.status.domain.model.SalesTotalVO;
import egovframework.let.sl.status.domain.repository.SalesStatusDAO;

class SalesStatusServiceImplTest {

	private static SaleRowVO sale(long id, String date, String client, String product, double qty, Double unitPrice, String sourceType) {
		SaleRowVO row = new SaleRowVO();
		row.setId(id);
		row.setSaleDate(date);
		row.setClientName(client);
		row.setProductName(product);
		row.setQty(qty);
		row.setUnitPrice(unitPrice);
		row.setAmount(unitPrice == null ? null : qty * unitPrice);
		row.setSourceType(sourceType);
		return row;
	}

	private static SaleRowVO receipt(String date, String client, String product, String qtyText) {
		SaleRowVO row = new SaleRowVO();
		row.setSaleDate(date);
		row.setClientName(client);
		row.setProductName(product);
		row.setQtyText(qtyText);
		return row;
	}

	@DisplayName("판매현황: 기간 필수(DB 안 읽음), 들어온 곳 이름, 수량·금액 합계와 단가 없는 줄 수")
	@Test
	void status() throws Exception {
		SalesStatusDAO dao = mock(SalesStatusDAO.class);
		SalesStatusServiceImpl service = new SalesStatusServiceImpl(dao);
		assertEquals("조회 기간을 선택해주세요", assertThrows(IllegalArgumentException.class, () -> service.listStatus(" ", "2026-10-07", null, null)).getMessage());
		verify(dao, never()).selectRecords(any(), any(), any(), any());
		when(dao.selectRecords("2026-10-01", "2026-10-07", "달", null)).thenReturn(Arrays.asList(
				sale(1, "2026-10-06", "달구지", "로제", 135, 4960.0, "logistics"), sale(2, "2026-10-07", "달구지", "샘플", 10, null, "manual")));
		SalesStatusVO result = service.listStatus(" 2026-10-01 ", "2026-10-07", " 달 ", " ");
		assertEquals(2, result.getCount());
		assertEquals(145.0, result.getTotalQty());
		assertEquals(669600.0, result.getTotalAmount());
		assertEquals(1, result.getNoPriceCount());
		assertEquals("출하확정", result.getRows().get(0).getSourceLabel());
		assertEquals("직접등록", result.getRows().get(1).getSourceLabel());
	}

	@DisplayName("토탈집계: 입고는 실생산량을 숫자로·단가 없음, 같은 날이면 입고 먼저, 입고·출고 수량 따로, 금액·단가 없는 줄은 출고만")
	@Test
	void total() throws Exception {
		SalesStatusDAO dao = mock(SalesStatusDAO.class);
		SalesStatusServiceImpl service = new SalesStatusServiceImpl(dao);
		assertEquals("조회 기간을 선택해주세요", assertThrows(IllegalArgumentException.class, () -> service.total("2026-10-01", null, null, null)).getMessage());
		when(dao.selectReceipts("2026-10-01", "2026-10-07", null, null)).thenReturn(Arrays.asList(
				receipt("2026-10-06", "달구지", "로제", "135kg"), receipt("2026-10-05", "케이", "돼지왕구이", "3,000")));
		when(dao.selectRecords("2026-10-01", "2026-10-07", null, null)).thenReturn(Arrays.asList(
				sale(1, "2026-10-06", "가나", "로제", 135, 4960.0, "logistics"), sale(2, "2026-10-07", "달구지", "샘플", 10, null, "manual")));
		SalesTotalVO result = service.total("2026-10-01", "2026-10-07", "", null);
		List<SaleRowVO> rows = result.getRows();
		assertEquals(Arrays.asList("in", "in", "out", "out"), Arrays.asList(rows.get(0).getDirection(), rows.get(1).getDirection(), rows.get(2).getDirection(), rows.get(3).getDirection()));
		assertEquals(3000.0, rows.get(0).getQty()); // 10/5 입고
		assertEquals("2026-10-06", rows.get(1).getSaleDate()); // 10/6 은 입고(달구지)가 출고(가나)보다 먼저
		assertEquals("생산입고", rows.get(1).getSourceLabel());
		assertEquals("입고", rows.get(1).getDirectionLabel());
		assertNull(rows.get(1).getUnitPrice());
		assertNull(rows.get(1).getAmount());
		assertEquals("출고", rows.get(2).getDirectionLabel());
		assertEquals(4, result.getCount());
		assertEquals(2, result.getInCount());
		assertEquals(2, result.getOutCount());
		assertEquals(3135.0, result.getInQty());
		assertEquals(145.0, result.getOutQty());
		assertEquals(669600.0, result.getTotalAmount());
		assertEquals(1, result.getNoPriceCount());
	}

	@DisplayName("빈 기간 데이터면 합계 0")
	@Test
	void empty() throws Exception {
		SalesStatusDAO dao = mock(SalesStatusDAO.class);
		when(dao.selectReceipts(any(), any(), any(), any())).thenReturn(Collections.<SaleRowVO>emptyList());
		when(dao.selectRecords(any(), any(), any(), any())).thenReturn(Collections.<SaleRowVO>emptyList());
		SalesTotalVO result = new SalesStatusServiceImpl(dao).total("2026-09-01", "2026-09-30", null, null);
		assertEquals(0, result.getCount());
		assertEquals(0.0, result.getTotalAmount());
	}
}

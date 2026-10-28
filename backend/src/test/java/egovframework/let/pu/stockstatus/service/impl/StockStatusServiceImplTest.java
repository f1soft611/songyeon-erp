package egovframework.let.pu.stockstatus.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.matches;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import egovframework.let.pu.ledger.domain.model.StockAsOfVO;
import egovframework.let.pu.ledger.service.StockLedgerService;
import egovframework.let.pu.stockstatus.domain.model.MaterialLotVO;
import egovframework.let.pu.stockstatus.domain.repository.StockStatusDAO;

class StockStatusServiceImplTest {

	private static MaterialLotVO lot(Double qty, Double returned) {
		MaterialLotVO l = new MaterialLotVO();
		l.setQty(qty);
		l.setReturnedQty(returned);
		return l;
	}

	@DisplayName("기준일 재고는 수불대장과 같은 계산을 그대로 돌려준다")
	@Test
	void stockAsOfDelegates() throws Exception {
		StockLedgerService ledger = mock(StockLedgerService.class);
		StockAsOfVO vo = new StockAsOfVO();
		when(ledger.stockAsOf("2026-10-06")).thenReturn(vo);
		assertSame(vo, new StockStatusServiceImpl(mock(StockStatusDAO.class), ledger).stockAsOf("2026-10-06"));
	}

	@DisplayName("입고 로트: 실입고 = 입고량 - 반품(비면 0), 날짜를 비우면 오늘까지")
	@Test
	void lots() throws Exception {
		StockStatusDAO dao = mock(StockStatusDAO.class);
		when(dao.selectLots("M1", "2026-10-06")).thenReturn(Arrays.asList(lot(500.0, 20.0), lot(null, null)));
		List<MaterialLotVO> lots = new StockStatusServiceImpl(dao, mock(StockLedgerService.class)).listLots("M1", " 2026-10-06 ");
		assertEquals(480.0, lots.get(0).getNetQty(), 1e-9);
		assertEquals(0.0, lots.get(1).getNetQty(), 1e-9);
		StockStatusDAO today = mock(StockStatusDAO.class);
		when(today.selectLots(eq("M1"), matches("\\d{4}-\\d{2}-\\d{2}"))).thenReturn(Collections.<MaterialLotVO>emptyList());
		new StockStatusServiceImpl(today, mock(StockLedgerService.class)).listLots("M1", "");
		verify(today).selectLots(eq("M1"), matches("\\d{4}-\\d{2}-\\d{2}"));
	}
}

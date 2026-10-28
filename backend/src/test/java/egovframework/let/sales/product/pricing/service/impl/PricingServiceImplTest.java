package egovframework.let.sa.pricing.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.HashMap;
import java.util.Map;
import java.util.Set;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import egovframework.let.sa.pricing.domain.model.PricingVO;
import egovframework.let.sa.pricing.domain.repository.PricingDAO;

class PricingServiceImplTest {

	private static PricingVO pricing(Double materialCost, Double markupCost) {
		PricingVO row = new PricingVO();
		row.setProductCode("000001");
		row.setMaterialCost(materialCost);
		row.setMarkupCost(markupCost);
		return row;
	}

	@DisplayName("고정마진율·로스율을 보내면 금액을 다시 계산(로스는 원재료비+고정마진 기준), 보낸 칸만 고치고 제품단가를 다시 합한다")
	@Test
	@SuppressWarnings("unchecked")
	void updateRecalculatesMarkupAndLoss() throws Exception {
		PricingDAO dao = mock(PricingDAO.class);
		when(dao.selectPricing("000001")).thenReturn(pricing(1000d, null));
		Map<String, Object> body = new HashMap<>();
		body.put("markupRate", "10");
		body.put("lossRate", 5);
		body.put("laborCost", "250");
		body.put("margin", null);
		body.put("clientName", "(주) 디에이치식품");
		new PricingServiceImpl(dao).updatePricing("000001", body);

		ArgumentCaptor<PricingVO> row = ArgumentCaptor.forClass(PricingVO.class);
		ArgumentCaptor<Set<String>> fields = ArgumentCaptor.forClass(Set.class);
		verify(dao).updatePricingFields(row.capture(), fields.capture());
		assertEquals(10d, row.getValue().getMarkupRate());
		assertEquals(100d, row.getValue().getMarkupCost());
		assertEquals(5d, row.getValue().getLossRate());
		assertEquals(55d, row.getValue().getLossCost()); // (1000 + 100) × 5%
		assertEquals(250d, row.getValue().getLaborCost());
		assertNull(row.getValue().getMargin());
		assertTrue(fields.getValue().contains("margin")); // 비우려고 보낸 칸은 null 로 고친다
		assertFalse(fields.getValue().contains("packagingCost")); // 안 보낸 칸은 건드리지 않는다
		verify(dao).updatePricingTotal("000001");
	}

	@DisplayName("로스율만 보내면 지금 적힌 고정마진으로 계산하고, 고정마진율을 비우면 고정마진도 비운다")
	@Test
	void lossUsesCurrentMarkup_andBlankRateClears() throws Exception {
		PricingDAO dao = mock(PricingDAO.class);
		when(dao.selectPricing("000001")).thenReturn(pricing(1000d, 200d));
		Map<String, Object> body = new HashMap<>();
		body.put("lossRate", "10");
		new PricingServiceImpl(dao).updatePricing("000001", body);
		ArgumentCaptor<PricingVO> row = ArgumentCaptor.forClass(PricingVO.class);
		verify(dao).updatePricingFields(row.capture(), any());
		assertEquals(120d, row.getValue().getLossCost()); // (1000 + 200) × 10%

		PricingDAO dao2 = mock(PricingDAO.class);
		when(dao2.selectPricing("000001")).thenReturn(pricing(1000d, 200d));
		Map<String, Object> clear = new HashMap<>();
		clear.put("markupRate", "");
		new PricingServiceImpl(dao2).updatePricing("000001", clear);
		ArgumentCaptor<PricingVO> cleared = ArgumentCaptor.forClass(PricingVO.class);
		verify(dao2).updatePricingFields(cleared.capture(), any());
		assertNull(cleared.getValue().getMarkupRate());
		assertNull(cleared.getValue().getMarkupCost());
	}

	@DisplayName("없는 제품·고칠 항목 없음은 막는다")
	@Test
	void rejects() throws Exception {
		PricingDAO dao = mock(PricingDAO.class);
		PricingServiceImpl service = new PricingServiceImpl(dao);
		assertEquals("단가표를 찾을 수 없습니다",
				assertThrows(IllegalArgumentException.class, () -> service.updatePricing("999999", new HashMap<String, Object>())).getMessage());
		when(dao.selectPricing("000001")).thenReturn(pricing(1000d, null));
		Map<String, Object> unknown = new HashMap<>();
		unknown.put("totalPrice", 1);
		assertEquals("고칠 항목이 없습니다",
				assertThrows(IllegalArgumentException.class, () -> service.updatePricing("000001", unknown)).getMessage());
		verify(dao, never()).updatePricingTotal(anyString());
	}
}

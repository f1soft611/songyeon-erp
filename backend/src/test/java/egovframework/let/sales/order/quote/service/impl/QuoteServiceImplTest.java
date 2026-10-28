package egovframework.let.sa.quote.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Arrays;
import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import com.fasterxml.jackson.databind.ObjectMapper;

import egovframework.let.co.master.itemmaster.domain.model.MaterialOptionVO;
import egovframework.let.co.master.itemmaster.domain.repository.ItemMasterDAO;
import egovframework.let.co.master.itemmaster.service.ItemMasterService;
import egovframework.let.sa.quote.domain.model.QuoteBomLineVO;
import egovframework.let.sa.quote.domain.model.QuoteSaveRequestVO;
import egovframework.let.sa.quote.domain.model.QuoteVO;
import egovframework.let.sa.quote.domain.repository.QuoteDAO;

class QuoteServiceImplTest {

	private static QuoteBomLineVO line(String name, Double ratio, Double unitPrice, String code) {
		QuoteBomLineVO l = new QuoteBomLineVO();
		l.setMaterialName(name);
		l.setRatioPercent(ratio);
		l.setUnitPrice(unitPrice);
		l.setMaterialCode(code);
		return l;
	}

	private static MaterialOptionVO material(String code, Double price) {
		MaterialOptionVO m = new MaterialOptionVO();
		m.setCode(code);
		m.setUnitPrice(price);
		return m;
	}

	private static QuoteServiceImpl service(QuoteDAO dao, ItemMasterDAO bomDao, ItemMasterService bomService) {
		return new QuoteServiceImpl(dao, bomDao, bomService, new ObjectMapper());
	}

	@DisplayName("작성: 제품명 필수, 거래처BOM 확인에서 막히면 넣지 않는다")
	@Test
	void createValidation() throws Exception {
		QuoteDAO dao = mock(QuoteDAO.class);
		ItemMasterService bomService = mock(ItemMasterService.class);
		when(bomService.resolveClientCode("999999", null)).thenThrow(new IllegalArgumentException("거래처를 목록에서 다시 골라주세요"));
		QuoteServiceImpl service = service(dao, mock(ItemMasterDAO.class), bomService);
		QuoteSaveRequestVO noName = new QuoteSaveRequestVO();
		noName.setProductName(" ");
		assertEquals("제품명은 필수입니다", assertThrows(IllegalArgumentException.class, () -> service.createQuote(noName)).getMessage());
		QuoteSaveRequestVO badClient = new QuoteSaveRequestVO();
		badClient.setProductName("떡볶이소스");
		badClient.setClientCode("999999"); // 2026-10-23 견적도 거래처코드
		assertThrows(IllegalArgumentException.class, () -> service.createQuote(badClient));
		verify(dao, never()).insertQuote(any());
	}

	@DisplayName("작성: 원재료비(화면 단가 우선, 없으면 등록 단가) → 고정마진 → 로스 → 원가 합계가 견적단가, 상태 draft")
	@Test
	void createComputesCost() throws Exception {
		QuoteDAO dao = mock(QuoteDAO.class);
		ItemMasterDAO bomDao = mock(ItemMasterDAO.class);
		when(bomDao.selectMaterialByName("설탕", "000012")).thenReturn(material("000012", 1000.0));
		ItemMasterService bomService = mock(ItemMasterService.class);
		when(bomService.resolveClientCode("000003", null)).thenReturn("000003");
		QuoteSaveRequestVO r = new QuoteSaveRequestVO();
		r.setProductName(" 떡볶이소스 ");
		r.setClientCode("000003");
		// 원재료비 = 50% × 2000 + 50% × 1000(등록 단가) = 1500
		r.setBom(Arrays.asList(line("양파", 50.0, 2000.0, null), line("설탕", 50.0, null, "000012"), line(" ", 10.0, 9.0, null)));
		r.setMarkupRate(10.0); // 150
		r.setLossRate(2.0); // (1500 + 150) × 2% = 33
		r.setLaborCost(100.0);
		r.setOtherCost1(17.0);
		service(dao, bomDao, bomService).createQuote(r);
		ArgumentCaptor<QuoteVO> saved = ArgumentCaptor.forClass(QuoteVO.class);
		verify(dao).insertQuote(saved.capture());
		QuoteVO q = saved.getValue();
		assertEquals("떡볶이소스", q.getProductName());
		assertEquals(1500.0, q.getMaterialCost(), 1e-9);
		assertEquals(150.0, q.getMarkupCost(), 1e-9);
		assertEquals(33.0, q.getLossCost(), 1e-9);
		assertEquals(1800.0, q.getTotalPrice(), 1e-9);
		assertEquals("draft", q.getStatus());
		// 송연(파이썬)과 같은 모양의 bom_json
		assertTrue(q.getBomJson().startsWith("[{\"material_name\":\"양파\",\"ratio_percent\":50.0,\"unit_price\":2000.0}"));
		assertTrue(q.getBomJson().contains("\"material_code\":\"000012\""));
	}

	@DisplayName("확정단가가 있으면 그 값이 견적단가, 율이 비면 고정마진·로스는 0")
	@Test
	void currentPriceWins() throws Exception {
		QuoteDAO dao = mock(QuoteDAO.class);
		QuoteSaveRequestVO r = new QuoteSaveRequestVO();
		r.setProductName("A");
		r.setBom(Arrays.asList(line("양파", 100.0, 1000.0, null)));
		r.setCurrentPrice(2500.0);
		service(dao, mock(ItemMasterDAO.class), mock(ItemMasterService.class)).createQuote(r);
		ArgumentCaptor<QuoteVO> saved = ArgumentCaptor.forClass(QuoteVO.class);
		verify(dao).insertQuote(saved.capture());
		assertEquals(2500.0, saved.getValue().getTotalPrice(), 1e-9);
		assertEquals(0.0, saved.getValue().getMarkupCost(), 1e-9);
		assertEquals(0.0, saved.getValue().getLossCost(), 1e-9);
	}

	@DisplayName("수정: 없는 견적·확정된 견적은 막는다")
	@Test
	void updateRules() throws Exception {
		QuoteDAO dao = mock(QuoteDAO.class);
		when(dao.selectQuoteStatus(1L)).thenReturn("confirmed");
		when(dao.selectQuoteStatus(2L)).thenReturn("draft");
		QuoteServiceImpl service = service(dao, mock(ItemMasterDAO.class), mock(ItemMasterService.class));
		QuoteSaveRequestVO r = new QuoteSaveRequestVO();
		r.setProductName("A");
		assertEquals("견적을 찾을 수 없습니다", assertThrows(IllegalArgumentException.class, () -> service.updateQuote(9L, r)).getMessage());
		assertEquals("이미 확정된 견적은 수정할 수 없습니다", assertThrows(IllegalArgumentException.class, () -> service.updateQuote(1L, r)).getMessage());
		service.updateQuote(2L, r);
		verify(dao).updateQuote(any());
	}

	@DisplayName("상세: 송연(파이썬)이 글자로 적은 배합비율·단가도 읽고, 깨진 JSON 은 빈 배합비")
	@Test
	void readsPythonBomJson() throws Exception {
		QuoteDAO dao = mock(QuoteDAO.class);
		QuoteVO stored = new QuoteVO();
		stored.setQuoteId(3L);
		stored.setBomJson("[{\"material_name\": \"양파\", \"ratio_percent\": \"18.69\", \"unit_price\": null}, {\"material_name\": \"설탕\", \"ratio_percent\": 5, \"unit_price\": \"900\", \"material_code\": \"000012\"}]");
		when(dao.selectQuote(3L)).thenReturn(stored);
		QuoteVO broken = new QuoteVO();
		broken.setBomJson("not json");
		when(dao.selectQuote(4L)).thenReturn(broken);
		QuoteServiceImpl service = service(dao, mock(ItemMasterDAO.class), mock(ItemMasterService.class));
		List<QuoteBomLineVO> bom = service.getQuote(3L).getBom();
		assertEquals(2, bom.size());
		assertEquals(18.69, bom.get(0).getRatioPercent(), 1e-9);
		assertNull(bom.get(0).getUnitPrice());
		assertEquals(900.0, bom.get(1).getUnitPrice(), 1e-9);
		assertEquals("000012", bom.get(1).getMaterialCode());
		assertTrue(service.getQuote(4L).getBom().isEmpty());
		assertThrows(IllegalArgumentException.class, () -> service.getQuote(99L));
		verify(dao, never()).deleteQuote(eq(3L));
	}
}

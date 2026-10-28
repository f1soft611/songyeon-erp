package egovframework.let.sales.product.productregister.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Arrays;
import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;

import egovframework.let.co.master.itemmaster.domain.model.BomLineInputVO;
import egovframework.let.co.master.itemmaster.domain.model.BomLineVO;
import egovframework.let.co.master.itemmaster.domain.repository.ItemMasterDAO;
import egovframework.let.co.master.itemmaster.service.ItemMasterService;
import egovframework.let.sales.product.productregister.domain.model.ProductRegisterRequestVO;
import egovframework.let.sales.product.productregister.domain.model.ProductRegisterVO;
import egovframework.let.sales.product.productregister.domain.repository.ProductRegisterDAO;

class ProductRegisterServiceImplTest {

	private static BomLineVO line(String name, Double amount) {
		BomLineVO row = new BomLineVO();
		row.setMaterialName(name);
		row.setAmountPerKg(amount);
		return row;
	}

	@DisplayName("제품명은 필수이고, 막히면 아무것도 넣지 않는다")
	@Test
	void nameRequired() throws Exception {
		ProductRegisterDAO dao = mock(ProductRegisterDAO.class);
		ProductRegisterServiceImpl service = new ProductRegisterServiceImpl(dao, mock(ItemMasterDAO.class), mock(ItemMasterService.class));
		ProductRegisterRequestVO request = new ProductRegisterRequestVO();
		request.setProductName("  ");
		assertEquals("제품명은 필수입니다", assertThrows(IllegalArgumentException.class, () -> service.registerProduct(request)).getMessage());
		verify(dao, never()).insertProduct(any());
	}

	@DisplayName("거래처코드는 사용 중 거래처 확인을 거치고, 아니면 제품을 넣기 전에 막는다(2026-10-23 이름 → 코드)")
	@Test
	void unknownClientBlocksBeforeInsert() throws Exception {
		ProductRegisterDAO dao = mock(ProductRegisterDAO.class);
		ItemMasterService bomService = mock(ItemMasterService.class);
		when(bomService.resolveClientCode("999999", null)).thenThrow(new IllegalArgumentException("거래처를 목록에서 다시 골라주세요"));
		ProductRegisterServiceImpl service = new ProductRegisterServiceImpl(dao, mock(ItemMasterDAO.class), bomService);
		ProductRegisterRequestVO request = new ProductRegisterRequestVO();
		request.setProductName("떡볶이소스");
		request.setClientCode("999999");
		assertThrows(IllegalArgumentException.class, () -> service.registerProduct(request));
		verify(dao, never()).insertProduct(any());
	}

	@DisplayName("제품(발번) → 배합비 → 단가표 순서로 넣고, 원재료비 = 적용단가 합. 빈 칸은 null")
	@Test
	void registersProductBomAndPricing() throws Exception {
		ProductRegisterDAO dao = mock(ProductRegisterDAO.class);
		ItemMasterDAO bomDao = mock(ItemMasterDAO.class);
		ItemMasterService bomService = mock(ItemMasterService.class);
		when(bomService.resolveStorageCode("002")).thenReturn("002");
		when(bomService.resolveClientCode("000003", null)).thenReturn("000003"); // 2026-10-23 고른 거래처코드 그대로
		List<BomLineVO> lines = Arrays.asList(line("고춧가루", 450.5), line("소금", null), line("설탕", 100d));
		when(bomService.resolveBomLines(any())).thenReturn(lines);
		doAnswer(invocation -> {
			((ProductRegisterVO) invocation.getArgument(0)).setProductCode("000003");
			return null;
		}).when(dao).insertProduct(any());

		ProductRegisterRequestVO request = new ProductRegisterRequestVO();
		request.setProductName(" 떡볶이소스 2kg ");
		request.setSpec(" ");
		request.setProductType("레토르트");
		request.setStorage("002"); // 2026-10-23 공통코드 STORAGE_METHOD 코드(냉장)
		request.setClientCode("000003");
		request.setRegUserId("00000002"); // 컨트롤러가 로그인 사원 사번으로 채운다(2026-10-23)
		BomLineInputVO input = new BomLineInputVO();
		input.setMaterialName("고춧가루");
		request.setBom(Arrays.asList(input));

		ProductRegisterVO saved = new ProductRegisterServiceImpl(dao, bomDao, bomService).registerProduct(request);

		assertEquals("000003", saved.getProductCode());
		assertEquals(550.5d, saved.getMaterialCost());
		ArgumentCaptor<ProductRegisterVO> product = ArgumentCaptor.forClass(ProductRegisterVO.class);
		InOrder order = inOrder(dao, bomDao);
		order.verify(dao).insertProduct(product.capture());
		order.verify(bomDao).insertBomLine("000003", lines.get(0));
		order.verify(bomDao).insertBomLine("000003", lines.get(1));
		order.verify(bomDao).insertBomLine("000003", lines.get(2));
		order.verify(dao).insertPricing(any());
		assertEquals("떡볶이소스 2kg", product.getValue().getProductName());
		assertEquals("00000002", product.getValue().getRegUserId());
		assertNull(product.getValue().getSpec());
		assertEquals("레토르트", product.getValue().getProductType());
		assertEquals("002", product.getValue().getStorage());
		assertEquals("000003", product.getValue().getClientCode());
		verify(bomService).resolveStorageCode("002");
		verify(bomService).resolveBomLines(request.getBom());
		verify(bomService).resolveClientCode("000003", null);
	}

	@DisplayName("견적 확정: 견적의 원가 항목을 단가표에 반영하고(제품단가 = 원가 합계, 확정단가는 따로) 견적을 확정한다")
	@Test
	void registerFromQuoteConfirmsQuote() throws Exception {
		ProductRegisterDAO dao = mock(ProductRegisterDAO.class);
		ItemMasterDAO bomDao = mock(ItemMasterDAO.class);
		ItemMasterService bomService = mock(ItemMasterService.class);
		when(bomService.resolveBomLines(any())).thenReturn(Arrays.asList(line("양파", 1000d)));
		doAnswer(invocation -> {
			((ProductRegisterVO) invocation.getArgument(0)).setProductCode("000007");
			return null;
		}).when(dao).insertProduct(any());
		when(dao.updateQuoteConfirmed(5L, "000007")).thenReturn(1);
		ProductRegisterRequestVO request = new ProductRegisterRequestVO();
		request.setProductName("떡볶이소스");
		request.setQuoteId(5L);
		egovframework.let.sales.order.quote.domain.model.QuoteCostsVO costs = new egovframework.let.sales.order.quote.domain.model.QuoteCostsVO();
		costs.setMarkupRate(10d); // 100
		costs.setLossRate(1d); // (1000 + 100) × 1% = 11
		costs.setLaborCost(50d);
		costs.setOtherCost2Note("특별포장");
		costs.setCurrentPrice(2000d);
		request.setQuoteCosts(costs);

		new ProductRegisterServiceImpl(dao, bomDao, bomService).registerProduct(request);

		ArgumentCaptor<ProductRegisterVO> pricing = ArgumentCaptor.forClass(ProductRegisterVO.class);
		verify(dao).insertPricing(pricing.capture());
		assertEquals(100d, pricing.getValue().getMarkupCost(), 1e-9);
		assertEquals(11d, pricing.getValue().getLossCost(), 1e-9);
		assertEquals(1161d, pricing.getValue().getTotalPrice(), 1e-9);
		assertEquals(2000d, pricing.getValue().getCurrentPrice(), 1e-9);
		assertEquals("특별포장", pricing.getValue().getOtherCost2Note());
		verify(dao).updateQuoteConfirmed(5L, "000007");
	}

	@DisplayName("견적 확정: 이미 확정됐거나 없는 견적이면(0줄) 예외로 등록 전체가 취소된다")
	@Test
	void registerFromConfirmedQuoteFails() throws Exception {
		ProductRegisterDAO dao = mock(ProductRegisterDAO.class);
		ItemMasterService bomService = mock(ItemMasterService.class);
		when(bomService.resolveBomLines(any())).thenReturn(java.util.Collections.<BomLineVO>emptyList());
		when(dao.updateQuoteConfirmed(any(Long.class), any())).thenReturn(0);
		ProductRegisterRequestVO request = new ProductRegisterRequestVO();
		request.setProductName("떡볶이소스");
		request.setQuoteId(5L);
		assertEquals(ProductRegisterServiceImpl.QUOTE_NOT_CONFIRMABLE_MESSAGE,
				assertThrows(IllegalArgumentException.class, () -> new ProductRegisterServiceImpl(dao, mock(ItemMasterDAO.class), bomService).registerProduct(request)).getMessage());
	}

	@DisplayName("견적 없이 등록하면 단가표는 송연과 같이 로스·고정마진 0, 제품단가 = 원재료비")
	@Test
	void plainPricing() {
		ProductRegisterVO p = new ProductRegisterVO();
		p.setMaterialCost(550.5d);
		ProductRegisterServiceImpl.fillPricing(p, null);
		assertEquals(0d, p.getLossCost(), 1e-9);
		assertEquals(0d, p.getMarkupCost(), 1e-9);
		assertEquals(550.5d, p.getTotalPrice(), 1e-9);
		assertNull(p.getCurrentPrice());
	}

	@DisplayName("삭제(2026-10-28): 없는 제품 · 재고 있는 제품 · 수주 · 생산 등에 쓰인 제품은 막고, 아니면 견적을 가견적으로 돌리고 배합비 · 이력 · 단가표 · 제품을 지운다")
	@Test
	void deleteProduct() throws Exception {
		ProductRegisterDAO dao = mock(ProductRegisterDAO.class);
		ProductRegisterServiceImpl service = new ProductRegisterServiceImpl(dao, mock(ItemMasterDAO.class), mock(ItemMasterService.class));
		assertEquals("제품을 찾을 수 없습니다", assertThrows(IllegalArgumentException.class, () -> service.deleteProduct("999999")).getMessage());

		for (String code : Arrays.asList("000010", "000011", "000012")) {
			when(dao.existsProduct(code)).thenReturn(true);
		}
		when(dao.selectProductStockQty("000010")).thenReturn(5d);
		assertEquals("재고가 있는 제품은 삭제할 수 없어요. 제품마스터에서 사용안함으로 바꿔주세요",
				assertThrows(IllegalArgumentException.class, () -> service.deleteProduct("000010")).getMessage());

		when(dao.selectProductStockQty("000011")).thenReturn(0d);
		when(dao.countProductUsage("000011")).thenReturn(2);
		assertEquals("이미 수주 · 생산 · 출하 등에 쓰인 제품이라 삭제할 수 없어요. 제품마스터에서 사용안함으로 바꿔주세요",
				assertThrows(IllegalArgumentException.class, () -> service.deleteProduct("000011")).getMessage());
		verify(dao, never()).deleteProduct(any());

		when(dao.selectProductStockQty("000012")).thenReturn(null); // 재고 칸이 비어 있어도 0 으로 본다
		when(dao.countProductUsage("000012")).thenReturn(0);
		service.deleteProduct(" 000012 ");
		InOrder order = inOrder(dao);
		order.verify(dao).revertConfirmedQuotes("000012");
		order.verify(dao).deleteProductBom("000012");
		order.verify(dao).deleteProductBomLog("000012");
		order.verify(dao).deleteProductPricing("000012");
		order.verify(dao).deleteProduct("000012");
	}
}

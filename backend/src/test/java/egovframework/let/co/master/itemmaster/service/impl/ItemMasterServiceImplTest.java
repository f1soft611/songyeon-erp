package egovframework.let.co.master.itemmaster.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import egovframework.let.co.master.itemmaster.domain.model.BomLineInputVO;
import egovframework.let.co.master.itemmaster.domain.model.BomLineVO;
import egovframework.let.co.master.itemmaster.domain.model.MaterialOptionVO;
import egovframework.let.co.master.itemmaster.domain.model.PricingCostsVO;
import egovframework.let.co.master.itemmaster.domain.model.ProductBomVO;
import egovframework.let.co.master.itemmaster.domain.model.ProductInfoSaveRequestVO;
import egovframework.let.co.master.itemmaster.domain.model.SubMaterialsSaveRequestVO;
import egovframework.let.co.master.itemmaster.domain.repository.ItemMasterDAO;

class ItemMasterServiceImplTest {

	private final ObjectMapper mapper = new ObjectMapper();

	private static ProductBomVO product(String code, String name, double stock, String client) {
		ProductBomVO p = new ProductBomVO();
		p.setCode(code);
		p.setName(name);
		p.setStockQty(stock);
		p.setClientName(client);
		return p;
	}

	private static MaterialOptionVO material(String code, String name, Double price, String sub) {
		MaterialOptionVO m = new MaterialOptionVO();
		m.setCode(code);
		m.setName(name);
		m.setUnitPrice(price);
		// 2026-10-23 분류는 공통코드 SUB_MATERIAL_CATEGORY 코드(001 필름 · 002 파우치 · 003 박스)로 저장하고 이름을 함께 읽는다
		m.setSubCategory(sub == null ? null : ("필름".equals(sub) ? "001" : "파우치".equals(sub) ? "002" : "003"));
		m.setSubCategoryNm(sub);
		return m;
	}

	private static BomLineInputVO input(String name, Double ratioPercent, Double unitPrice) {
		BomLineInputVO line = new BomLineInputVO();
		line.setMaterialName(name);
		line.setRatioPercent(ratioPercent);
		line.setUnitPrice(unitPrice);
		return line;
	}

	@DisplayName("배합비 저장: 퍼센트 → 비율, 단가는 직접 넣은 값 우선, 원재료비·단가표 합계를 다시 계산하고 변경로그를 송연 JSON 형식으로 남긴다")
	@Test
	void saveBom_recalculatesAndLogs() throws Exception {
		ItemMasterDAO dao = mock(ItemMasterDAO.class);
		when(dao.selectProduct("P1")).thenReturn(product("P1", "고추장", 0, null));
		BomLineVO old = new BomLineVO();
		old.setMaterialCode("M-OLD");
		old.setMaterialName("양파");
		old.setRatioPercent(0.5);
		when(dao.selectBom("P1")).thenReturn(Collections.singletonList(old));
		// 양파는 원래 물던 코드(M-OLD)를 먼저 찾는다
		when(dao.selectMaterialByName("양파", "M-OLD")).thenReturn(material("M-OLD", "양파", 1000.0, null));
		when(dao.selectMaterialByName("마늘", null)).thenReturn(material("M2", "마늘", 3000.0, null));
		PricingCostsVO costs = new PricingCostsVO();
		costs.setLaborCost(100.0);
		costs.setMargin(50.0);
		when(dao.selectPricingCosts("P1")).thenReturn(costs);

		double materialCost = new ItemMasterServiceImpl(dao, mapper).saveBom("P1", Arrays.asList(
				input("양파", 60.0, null),          // 원재료BOM 단가 1000 → 600
				input(" 마늘 ", 40.0, 2500.0),      // 직접 넣은 단가 2500 우선 → 1000
				input("  ", 10.0, 1.0)));           // 이름 없는 줄은 버린다

		assertEquals(1600.0, materialCost, 1e-9);
		verify(dao).deleteBom("P1");
		ArgumentCaptor<BomLineVO> lines = ArgumentCaptor.forClass(BomLineVO.class);
		verify(dao, org.mockito.Mockito.times(2)).insertBomLine(eq("P1"), lines.capture());
		BomLineVO first = lines.getAllValues().get(0);
		assertEquals("M-OLD", first.getMaterialCode());
		assertEquals(0.6, first.getRatioPercent(), 1e-12);
		assertEquals(600.0, first.getAmountPerKg(), 1e-9);
		assertEquals(Integer.valueOf(1), first.getRank());
		BomLineVO second = lines.getAllValues().get(1);
		assertEquals("마늘", second.getMaterialName());
		assertEquals(2500.0, second.getUnitPricePerKg(), 1e-9);
		verify(dao).updatePricingMaterialCost("P1", 1600.0, 1750.0);

		ArgumentCaptor<String> oldJson = ArgumentCaptor.forClass(String.class);
		ArgumentCaptor<String> newJson = ArgumentCaptor.forClass(String.class);
		verify(dao).insertBomLog(eq("P1"), anyString(), oldJson.capture(), newJson.capture());
		List<Map<String, Object>> logged = mapper.readValue(newJson.getValue(), new TypeReference<List<Map<String, Object>>>() { });
		assertEquals("양파", logged.get(0).get("material_name"));
		assertEquals(0.6, ((Number) logged.get(0).get("ratio_percent")).doubleValue(), 1e-12);
		assertTrue(logged.get(0).containsKey("unit_price_per_kg"));
		assertTrue(oldJson.getValue().contains("\"material_code\":\"M-OLD\""));
	}

	@DisplayName("단가표가 없으면 원재료비를 다시 계산해 넣지 않는다")
	@Test
	void saveBom_withoutPricing() throws Exception {
		ItemMasterDAO dao = mock(ItemMasterDAO.class);
		when(dao.selectProduct("P1")).thenReturn(product("P1", "고추장", 0, null));
		when(dao.selectBom("P1")).thenReturn(Collections.<BomLineVO>emptyList());
		new ItemMasterServiceImpl(dao, mapper).saveBom("P1", Collections.singletonList(input("새원재료", 100.0, null)));
		verify(dao, never()).updatePricingMaterialCost(anyString(), anyDouble(), anyDouble());
	}

	@DisplayName("변경로그는 파이썬·변환본이 적은 snake_case JSON 도 읽는다")
	@Test
	void readBom_readsSongyeonJson() {
		ItemMasterServiceImpl service = new ItemMasterServiceImpl(mock(ItemMasterDAO.class), mapper);
		List<BomLineVO> lines = service.readBom(
				"[{\"material_name\":\"양파\",\"ratio_percent\":0.25,\"unit_price_per_kg\":1000,\"amount_per_kg\":250,\"material_code\":\"M1\"}]");
		assertEquals("양파", lines.get(0).getMaterialName());
		assertEquals(0.25, lines.get(0).getRatioPercent(), 1e-12);
		assertEquals("M1", lines.get(0).getMaterialCode());
		assertTrue(service.readBom("not json").isEmpty());
	}

	@DisplayName("사용안함: 재고가 남아 있으면 송연 문구(%g 표시)로 막고, 없으면 바꾼 사람·시각을 남긴다")
	@Test
	void setDiscontinued_rules() throws Exception {
		ItemMasterDAO dao = mock(ItemMasterDAO.class);
		when(dao.selectProduct("P1")).thenReturn(product("P1", "고추장", 12.5, null));
		IllegalArgumentException error = assertThrows(IllegalArgumentException.class,
				() -> new ItemMasterServiceImpl(dao, mapper).setDiscontinued("P1", true, null, "관리자"));
		assertEquals("'고추장' 은 재고가 12.5 남아있어 사용안함으로 바꿀 수 없습니다. 재고를 0으로 맞춘 뒤에 해주세요.", error.getMessage());

		when(dao.selectProduct("P2")).thenReturn(product("P2", "된장", 0, null));
		new ItemMasterServiceImpl(dao, mapper).setDiscontinued("P2", true, " ", "관리자");
		ArgumentCaptor<ProductBomVO> saved = ArgumentCaptor.forClass(ProductBomVO.class);
		verify(dao).updateProductDiscontinued(saved.capture());
		assertEquals(Integer.valueOf(1), saved.getValue().getDiscontinued());
		assertEquals("관리자", saved.getValue().getDiscontinuedBy());
		assertNull(saved.getValue().getDiscontinuedNote());
		assertTrue(saved.getValue().getDiscontinuedAt().matches("\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}"));
	}

	@DisplayName("되돌리기는 재고가 있어도 된다")
	@Test
	void setDiscontinued_restoreAllowedWithStock() throws Exception {
		ItemMasterDAO dao = mock(ItemMasterDAO.class);
		when(dao.selectProduct("P1")).thenReturn(product("P1", "고추장", 12.5, null));
		new ItemMasterServiceImpl(dao, mapper).setDiscontinued("P1", false, null, null);
		verify(dao).updateProductDiscontinued(any(ProductBomVO.class));
	}

	@DisplayName("기본정보: 제품명 필수, 거래처는 고른 거래처코드 그대로(사용 중만, 지금 코드는 통과), 보관방법은 공통코드 코드만, 단가표 제품명도 바꾼다")
	@Test
	void saveProductInfo_rules() throws Exception {
		ItemMasterDAO dao = mock(ItemMasterDAO.class);
		ProductBomVO p1 = product("P1", "고추장", 0, "옛거래처");
		p1.setClientCode("000009"); // 지금 거래처(사용안함이 됐어도 그대로 둔다)
		when(dao.selectProduct("P1")).thenReturn(p1);
		when(dao.selectStorageCodes()).thenReturn(Arrays.asList("001", "002", "003"));
		when(dao.selectActiveClientCode("000003")).thenReturn("000003");
		when(dao.selectRegisteredClientCode("000009")).thenReturn("000009");
		when(dao.selectRegisteredClientCode("000003")).thenReturn("000003");
		ItemMasterServiceImpl service = new ItemMasterServiceImpl(dao, mapper);

		ProductInfoSaveRequestVO empty = new ProductInfoSaveRequestVO();
		empty.setName(" ");
		assertEquals("제품명은 필수입니다", assertThrows(IllegalArgumentException.class, () -> service.saveProductInfo("P1", empty)).getMessage());

		// 2026-10-23 사용 중이 아닌(없는) 거래처코드는 막는다
		ProductInfoSaveRequestVO unknown = new ProductInfoSaveRequestVO();
		unknown.setName("고추장");
		unknown.setClientCode("999999");
		assertEquals(ItemMasterServiceImpl.CLIENT_CODE_MESSAGE,
				assertThrows(IllegalArgumentException.class, () -> service.saveProductInfo("P1", unknown)).getMessage());

		ProductInfoSaveRequestVO keep = new ProductInfoSaveRequestVO();
		keep.setName(" 고추장(신) ");
		keep.setStorage(" 002 ");
		keep.setClientCode("000009");
		service.saveProductInfo("P1", keep);
		verify(dao).updateProductInfo("P1", "고추장(신)", "002", "000009");

		ProductInfoSaveRequestVO change = new ProductInfoSaveRequestVO();
		change.setName("고추장");
		change.setClientCode(" 000003 ");
		service.saveProductInfo("P1", change);
		verify(dao).updateProductInfo("P1", "고추장", null, "000003");

		// 2026-10-23 보관방법은 공통코드 STORAGE_METHOD 코드만(예전 글자는 막는다)
		ProductInfoSaveRequestVO oldText = new ProductInfoSaveRequestVO();
		oldText.setName("고추장");
		oldText.setStorage("냉장");
		oldText.setClientCode("000009");
		assertEquals(ItemMasterServiceImpl.STORAGE_MESSAGE,
				assertThrows(IllegalArgumentException.class, () -> service.saveProductInfo("P1", oldText)).getMessage());
		verify(dao).updatePricingProductName("P1", "고추장(신)");

		// 2026-10-27 거래처는 필수이고, 지금 값을 그대로 두어도 거래처마스터에 없으면 막는다
		ProductInfoSaveRequestVO noClient = new ProductInfoSaveRequestVO();
		noClient.setName("고추장");
		noClient.setClientCode(" ");
		assertEquals(ItemMasterServiceImpl.CLIENT_REQUIRED_MESSAGE,
				assertThrows(IllegalArgumentException.class, () -> service.saveProductInfo("P1", noClient)).getMessage());
		ProductBomVO p2 = product("P2", "된장", 0, "지운거래처");
		p2.setClientCode("000777");
		when(dao.selectProduct("P2")).thenReturn(p2);
		ProductInfoSaveRequestVO gone = new ProductInfoSaveRequestVO();
		gone.setName("된장");
		gone.setClientCode("000777");
		assertEquals(ItemMasterServiceImpl.CLIENT_NOT_REGISTERED_MESSAGE,
				assertThrows(IllegalArgumentException.class, () -> service.saveProductInfo("P2", gone)).getMessage());
		verify(dao, never()).updateProductInfo(eq("P2"), any(), any(), any());
	}

	@DisplayName("부자재: 그 분류로 등록된 원재료만 받고, 송연 문구(조사 포함)로 막는다")
	@Test
	void saveSubMaterials_rules() throws Exception {
		ItemMasterDAO dao = mock(ItemMasterDAO.class);
		when(dao.selectProduct("P1")).thenReturn(product("P1", "고추장", 0, null));
		when(dao.selectMaterialByCodeOrName("PE필름")).thenReturn(material("F1", "PE필름", 10.0, "필름"));
		when(dao.selectMaterialByCodeOrName("스탠드파우치")).thenReturn(material("F2", "스탠드파우치", 10.0, "파우치"));
		when(dao.selectMaterialByCodeOrName("없는것")).thenReturn(null);
		ItemMasterServiceImpl service = new ItemMasterServiceImpl(dao, mapper);

		SubMaterialsSaveRequestVO wrong = new SubMaterialsSaveRequestVO();
		wrong.setFilmMaterial("스탠드파우치");
		assertEquals("'스탠드파우치'는 필름으로 등록된 부자재가 아닙니다. 원재료BOM에서 부자재 분류를 필름으로 바꿔주세요.",
				assertThrows(IllegalArgumentException.class, () -> service.saveSubMaterials("P1", wrong)).getMessage());

		SubMaterialsSaveRequestVO missing = new SubMaterialsSaveRequestVO();
		missing.setBoxMaterial("없는것");
		assertEquals("박스로 지정한 '없는것'을 원재료BOM에서 찾을 수 없습니다",
				assertThrows(IllegalArgumentException.class, () -> service.saveSubMaterials("P1", missing)).getMessage());

		SubMaterialsSaveRequestVO ok = new SubMaterialsSaveRequestVO();
		ok.setFilmMaterial("PE필름");
		ok.setPouchNetWeightKg(1.0);
		service.saveSubMaterials("P1", ok);
		verify(dao).updateSubMaterials(eq("P1"), any());
	}

	@DisplayName("원재료명 확인: 같으면 exact, 다르면 비슷한 이름")
	@Test
	void checkMaterials() throws Exception {
		ItemMasterDAO dao = mock(ItemMasterDAO.class);
		when(dao.selectMaterialOptions()).thenReturn(Arrays.asList(material("M1", "양파", 1.0, null), material("M2", "양파분말", 1.0, null)));
		List<egovframework.let.co.master.itemmaster.domain.model.MaterialCheckVO> result =
				new ItemMasterServiceImpl(dao, mapper).checkMaterials(Arrays.asList("양파", " 양파가루 "));
		assertTrue(result.get(0).isExact());
		assertEquals("양파가루", result.get(1).getInput());
		assertEquals(Arrays.asList("양파", "양파분말"), result.get(1).getSuggestions());
	}

	@DisplayName("%g 표시: 파이썬과 같다")
	@Test
	void formatG() {
		assertEquals("12.5", ItemMasterServiceImpl.formatG(12.5));
		assertEquals("0.0001234", ItemMasterServiceImpl.formatG(0.0001234));
		assertEquals("1.23457e+06", ItemMasterServiceImpl.formatG(1234567.0));
		assertEquals("3", ItemMasterServiceImpl.formatG(3.0));
	}

	@DisplayName("부자재가 모두 비어 있는 제품은 빈 부자재를 돌려준다(없는 제품만 막는다)")
	@Test
	void getSubMaterials_emptyRow() throws Exception {
		ItemMasterDAO dao = mock(ItemMasterDAO.class);
		when(dao.selectSubMaterials("P1")).thenReturn(null);
		when(dao.selectProduct("P1")).thenReturn(product("P1", "고추장", 0, null));
		assertNull(new ItemMasterServiceImpl(dao, mapper).getSubMaterials("P1").getFilmMaterialCode());
		assertThrows(IllegalArgumentException.class, () -> new ItemMasterServiceImpl(dao, mapper).getSubMaterials("NOPE"));
	}

	@DisplayName("없는 제품은 막는다")
	@Test
	void unknownProduct() throws Exception {
		ItemMasterDAO dao = mock(ItemMasterDAO.class);
		assertThrows(IllegalArgumentException.class,
				() -> new ItemMasterServiceImpl(dao, mapper).saveBom("NOPE", Collections.<BomLineInputVO>emptyList()));
		verify(dao, never()).deleteBom(anyString());
	}

	// 수정자 · 수정일시(2026-10-23): 제품 창 · 사용여부 저장 뒤 사번으로 남기고, 코드가 비면 하지 않는다
	@Test
	void markProductUpdated_records_employee() throws Exception {
		ItemMasterDAO dao = mock(ItemMasterDAO.class);
		ItemMasterServiceImpl service = new ItemMasterServiceImpl(dao, mapper);
		service.markProductUpdated(" P1 ", "00000002");
		verify(dao).updateProductAudit("P1", "00000002");
		service.markProductUpdated("  ", "00000002");
		verify(dao, never()).updateProductAudit("", "00000002");
	}
}

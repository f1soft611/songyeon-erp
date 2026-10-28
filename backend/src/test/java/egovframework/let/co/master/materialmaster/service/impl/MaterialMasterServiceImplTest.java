package egovframework.let.co.master.materialmaster.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import egovframework.let.co.master.materialmaster.domain.model.MaterialCreateRequestVO;
import egovframework.let.co.master.materialmaster.domain.model.MaterialInfoSaveResultVO;
import egovframework.let.co.master.materialmaster.domain.model.MaterialMasterVO;
import egovframework.let.co.master.materialmaster.domain.model.MaterialPriceRequestVO;
import egovframework.let.co.master.materialmaster.domain.model.MaterialPriceSaveResultVO;
import egovframework.let.co.master.materialmaster.domain.model.MaterialPriceScheduleVO;
import egovframework.let.co.master.materialmaster.domain.model.MaterialReplaceRequestVO;
import egovframework.let.co.master.materialmaster.domain.model.MaterialSupplierVO;
import egovframework.let.co.master.itemmaster.domain.model.PricingCostsVO;
import egovframework.let.co.master.materialmaster.domain.repository.MaterialMasterDAO;
import egovframework.let.co.master.itemmaster.domain.repository.ItemMasterDAO;

class MaterialMasterServiceImplTest {

	private static MaterialMasterVO material(String code, String name, Double price) {
		MaterialMasterVO row = new MaterialMasterVO();
		row.setCode(code);
		row.setName(name);
		row.setUnitPrice(price);
		return row;
	}

	private static String today() {
		return LocalDate.now(ZoneId.of("Asia/Seoul")).toString();
	}

	@DisplayName("목록: 납품업체를 줄마다 붙이고, 보기 전에 적용일자가 된 예약 단가를 반영한다")
	@Test
	void list_attachesSuppliers_andAppliesDueSchedules() throws Exception {
		MaterialMasterDAO dao = mock(MaterialMasterDAO.class);
		ItemMasterDAO bomDao = mock(ItemMasterDAO.class);
		// 납품업체는 목록 쿼리가 거래처와 조인해 한 줄로 모아(업체코드·업체명 배열) 준다
		MaterialMasterVO salt = material("000001", "소금", 800d);
		salt.setSupplier("000003"); // 2026-10-28 거래처코드 한 곳(예전 배열)
		salt.setSupplierName("가나상회");
		salt.setSupplierCodes(new String[] {"000003"});
		salt.setSupplierNames(new String[] {"가나상회"});
		when(dao.selectMaterialList("소금")).thenReturn(Arrays.asList(salt, material("000002", "설탕", 900d)));
		MaterialPriceScheduleVO due = new MaterialPriceScheduleVO();
		due.setId(7L);
		due.setMaterialCode("000002");
		due.setMaterialName("설탕");
		due.setNewPrice(1000d);
		when(dao.selectDueMaterialPriceSchedules(today())).thenReturn(Arrays.asList(due));
		when(dao.selectMaterial("000002")).thenReturn(material("000002", "설탕", 900d));
		when(dao.selectBomProductCodesByMaterial("000002", null)).thenReturn(Collections.<String>emptyList());

		List<MaterialMasterVO> rows = new MaterialMasterServiceImpl(dao, bomDao).listMaterials(" 소금 ");
		assertEquals(1, rows.get(0).getSuppliers().size());
		assertEquals("가나상회", rows.get(0).getSuppliers().get(0).getClientName());
		assertEquals("000003", rows.get(0).getSuppliers().get(0).getClientCode());
		assertTrue(rows.get(1).getSuppliers().isEmpty());
		verify(dao).updateMaterialPrice("000002", 1000d);
		verify(dao).insertMaterialPriceLog(eq("000002"), eq("설탕"), anyString(), eq(900d), eq(1000d));
		verify(dao).markMaterialPriceScheduleApplied(7L);
	}

	@DisplayName("납품업체 칸: 거래처코드 한 곳을 그대로 넣고(2026-10-28), 코드 · 예전 코드 배열이 아닌 옛 업체명은 그 이름 그대로 보여준다")
	@Test
	void supplierCodeText_andLegacyName() throws Exception {
		MaterialSupplierVO a = new MaterialSupplierVO();
		a.setClientCode("000003");
		assertEquals("000003", MaterialMasterServiceImpl.supplierCodeText(Arrays.asList(a)));
		assertNull(MaterialMasterServiceImpl.supplierCodeText(Collections.<MaterialSupplierVO>emptyList()));
		assertTrue(MaterialMasterServiceImpl.isSupplierCodeText("000003"));
		assertTrue(MaterialMasterServiceImpl.isSupplierCodeText("[\"000003\"]")); // 바꾸기 전 배열도 코드로 본다
		assertTrue(MaterialMasterServiceImpl.isSupplierCodeText("[]"));
		assertFalse(MaterialMasterServiceImpl.isSupplierCodeText("다온"));
		assertFalse(MaterialMasterServiceImpl.isSupplierCodeText("[3,5]")); // 예전 id 배열은 아니다

		MaterialMasterDAO dao = mock(MaterialMasterDAO.class);
		MaterialMasterVO legacy = material("000009", "옛원재료", null);
		legacy.setSupplier("옛업체");
		MaterialMasterVO empty = material("000010", "빈원재료", null);
		empty.setSupplier("[]");
		when(dao.selectMaterialList("")).thenReturn(Arrays.asList(legacy, empty));
		List<MaterialMasterVO> rows = new MaterialMasterServiceImpl(dao, mock(ItemMasterDAO.class)).listMaterials(null);
		assertEquals("옛업체", rows.get(0).getSuppliers().get(0).getClientName());
		assertNull(rows.get(0).getSuppliers().get(0).getClientCode());
		assertTrue(rows.get(1).getSuppliers().isEmpty());
	}

	@DisplayName("같은 원재료(이름·규격 같음)는 확인 없이 저장하지 않고, '그래도 저장'이면 저장한다. 이름·규격을 안 바꾸면 묻지 않는다")
	@Test
	void sameMaterialNeedsConfirmation() throws Exception {
		MaterialMasterDAO dao = mock(MaterialMasterDAO.class);
		MaterialMasterServiceImpl service = new MaterialMasterServiceImpl(dao, mock(ItemMasterDAO.class));
		MaterialMasterVO existing = material("000005", "흑후추분말", 7500d);
		existing.setSpec("20kg");
		when(dao.selectSameMaterials("흑후추 분말", "20KG", null)).thenReturn(Arrays.asList(existing));

		MaterialCreateRequestVO request = new MaterialCreateRequestVO();
		request.setName("흑후추 분말");
		request.setSpec("20KG");
		assertEquals("같은 이름·규격의 원재료가 이미 있어요: 흑후추분말 20kg (000005)",
				assertThrows(IllegalArgumentException.class, () -> service.createMaterial(request)).getMessage());
		verify(dao, never()).insertMaterial(any());

		request.setAllowDuplicate(Boolean.TRUE);
		service.createMaterial(request);
		verify(dao).insertMaterial(any());

		// 기존 원재료: 이름·규격을 안 바꾸면 같은 원재료가 있어도 묻지 않는다
		MaterialMasterVO current = material("000015", "흑후추분말", 7500d);
		current.setSpec("20kg");
		when(dao.selectMaterial("000015")).thenReturn(current);
		Map<String, Object> unchanged = new HashMap<>();
		unchanged.put("name", "흑후추분말");
		unchanged.put("spec", "20kg");
		unchanged.put("safetyStock", "10");
		service.saveMaterialInfo("000015", unchanged);
		verify(dao, never()).selectSameMaterials(eq("흑후추분말"), anyString(), eq("000015"));

		// 규격을 바꿔 다른 원재료와 같아지면 묻는다(자기 자신은 빼고 찾음)
		MaterialMasterVO other = material("000016", "흑후추분말", 1000d);
		other.setSpec("1kg");
		when(dao.selectSameMaterials("흑후추분말", "1kg", "000015")).thenReturn(Arrays.asList(other));
		Map<String, Object> changed = new HashMap<>();
		changed.put("name", "흑후추분말");
		changed.put("spec", "1kg");
		assertThrows(IllegalArgumentException.class, () -> service.saveMaterialInfo("000015", changed));
		changed.put("allowDuplicate", Boolean.TRUE);
		service.saveMaterialInfo("000015", changed);
	}

	@DisplayName("부자재 분류(2026-10-23): 공통코드 SUB_MATERIAL_CATEGORY 의 사용 중 코드만 받고, 비우면 원재료, 안 보내면 그대로")
	@Test
	void saveMaterialInfo_subCategoryCode() throws Exception {
		MaterialMasterDAO dao = mock(MaterialMasterDAO.class);
		MaterialMasterServiceImpl service = new MaterialMasterServiceImpl(dao, mock(ItemMasterDAO.class));
		when(dao.selectMaterial("000020")).thenReturn(material("000020", "PE필름", 10d));
		when(dao.selectSubCategoryCodes()).thenReturn(Arrays.asList("001", "002", "003"));

		Map<String, Object> wrong = new HashMap<>();
		wrong.put("name", "PE필름");
		wrong.put("subCategory", "필름"); // 예전 글자는 받지 않는다
		assertEquals("부자재 분류를 다시 골라주세요(공통코드 부자재분류에 없는 값입니다)",
				assertThrows(IllegalArgumentException.class, () -> service.saveMaterialInfo("000020", wrong)).getMessage());
		verify(dao, never()).updateMaterialInfo(any(), any());

		Map<String, Object> ok = new HashMap<>();
		ok.put("name", "PE필름");
		ok.put("subCategory", "001");
		service.saveMaterialInfo("000020", ok);
		ArgumentCaptor<MaterialMasterVO> saved = ArgumentCaptor.forClass(MaterialMasterVO.class);
		verify(dao).updateMaterialInfo(saved.capture(), any());
		assertEquals("001", saved.getValue().getSubCategory());
	}

	@DisplayName("단위(2026-10-23): 공통코드 UNIT 의 사용 중 코드만 받고, 예전 글자(kg)는 막는다")
	@Test
	void saveMaterialInfo_unitCode() throws Exception {
		MaterialMasterDAO dao = mock(MaterialMasterDAO.class);
		MaterialMasterServiceImpl service = new MaterialMasterServiceImpl(dao, mock(ItemMasterDAO.class));
		when(dao.selectMaterial("000021")).thenReturn(material("000021", "설탕", 10d));
		when(dao.selectUnitCodes()).thenReturn(Arrays.asList("001", "002", "003", "004"));

		Map<String, Object> wrong = new HashMap<>();
		wrong.put("name", "설탕");
		wrong.put("unit", "kg");
		assertEquals("단위를 다시 골라주세요(공통코드 단위에 없는 값입니다)",
				assertThrows(IllegalArgumentException.class, () -> service.saveMaterialInfo("000021", wrong)).getMessage());
		verify(dao, never()).updateMaterialInfo(any(), any());

		Map<String, Object> ok = new HashMap<>();
		ok.put("name", "설탕");
		ok.put("unit", "001");
		service.saveMaterialInfo("000021", ok);
		ArgumentCaptor<MaterialMasterVO> saved = ArgumentCaptor.forClass(MaterialMasterVO.class);
		verify(dao).updateMaterialInfo(saved.capture(), any());
		assertEquals("001", saved.getValue().getUnit());
	}

	@DisplayName("신규 등록: 이름 필수, 발번한 코드를 돌려주고, 단가가 있으면 변경로그를 남긴다")
	@Test
	void create_rules() throws Exception {
		MaterialMasterDAO dao = mock(MaterialMasterDAO.class);
		MaterialMasterServiceImpl service = new MaterialMasterServiceImpl(dao, mock(ItemMasterDAO.class));
		MaterialCreateRequestVO empty = new MaterialCreateRequestVO();
		empty.setName(" ");
		assertEquals("원재료명은 필수입니다", assertThrows(IllegalArgumentException.class, () -> service.createMaterial(empty)).getMessage());

		doAnswer(invocation -> {
			((MaterialMasterVO) invocation.getArgument(0)).setCode("000007");
			return null;
		}).when(dao).insertMaterial(any());
		MaterialCreateRequestVO request = new MaterialCreateRequestVO();
		request.setName(" 정제소금 ");
		request.setSpec(" ");
		request.setUnitPrice("850");
		request.setRegUserId("00000002"); // 컨트롤러가 로그인 사원 사번으로 채운다(2026-10-23)
		assertEquals("000007", service.createMaterial(request));
		ArgumentCaptor<MaterialMasterVO> saved = ArgumentCaptor.forClass(MaterialMasterVO.class);
		verify(dao).insertMaterial(saved.capture());
		assertEquals("정제소금", saved.getValue().getName());
		assertNull(saved.getValue().getSpec());
		assertEquals("00000002", saved.getValue().getRegUserId());
		verify(dao).insertMaterialPriceLog(eq("000007"), eq("정제소금"), anyString(), isNull(), eq(850d));
	}

	@DisplayName("수정자 · 수정일시(2026-10-23): 사번으로 남기고, 코드가 비면 하지 않는다")
	@Test
	void markMaterialUpdated_records_employee() throws Exception {
		MaterialMasterDAO dao = mock(MaterialMasterDAO.class);
		MaterialMasterServiceImpl service = new MaterialMasterServiceImpl(dao, mock(ItemMasterDAO.class));
		service.markMaterialUpdated(" 000007 ", "00000002");
		verify(dao).updateMaterialAudit("000007", "00000002");
		service.markMaterialUpdated(" ", "00000002");
		verify(dao, never()).updateMaterialAudit("", "00000002");
	}

	@DisplayName("사용여부(2026-10-23): Y/N 만 받아 사번과 함께 남기고, 다른 값 · 없는 원재료는 막는다")
	@Test
	void updateMaterialUseYn_validates_and_records_employee() throws Exception {
		MaterialMasterDAO dao = mock(MaterialMasterDAO.class);
		MaterialMasterServiceImpl service = new MaterialMasterServiceImpl(dao, mock(ItemMasterDAO.class));
		when(dao.selectMaterial("000007")).thenReturn(new MaterialMasterVO());

		service.updateMaterialUseYn(" 000007 ", " n ", "00000002");
		verify(dao).updateMaterialUseYn("000007", "N", "00000002");

		IllegalArgumentException badValue = assertThrows(IllegalArgumentException.class,
				() -> service.updateMaterialUseYn("000007", "X", "00000002"));
		assertEquals(MaterialMasterServiceImpl.USE_YN_MESSAGE, badValue.getMessage());
		IllegalArgumentException missing = assertThrows(IllegalArgumentException.class,
				() -> service.updateMaterialUseYn("999999", "Y", "00000002"));
		assertEquals(MaterialMasterServiceImpl.NOT_FOUND_MESSAGE, missing.getMessage());
		verify(dao, never()).updateMaterialUseYn(eq("999999"), anyString(), anyString());
	}

	@DisplayName("기본정보: 보낸 칸만 고치고, 이름을 바꾸면 제품BOM·레시피가 따라가며, 같은 이름 원재료가 더 있으면 옛 레시피는 손대지 않는다")
	@Test
	@SuppressWarnings("unchecked")
	void saveInfo_partialFields_andRenameCascade() throws Exception {
		MaterialMasterDAO dao = mock(MaterialMasterDAO.class);
		MaterialMasterServiceImpl service = new MaterialMasterServiceImpl(dao, mock(ItemMasterDAO.class));
		when(dao.selectMaterial("000001")).thenReturn(material("000001", "계피분말", 100d));
		when(dao.updateBomMaterialName("000001", "계피가루")).thenReturn(3);
		when(dao.updateRecipeBomMaterialName("000001", "계피가루")).thenReturn(2);
		when(dao.countNamelessRecipeBom("계피분말")).thenReturn(4L);
		when(dao.countMaterialsByName("계피분말")).thenReturn(1L);

		Map<String, Object> body = new LinkedHashMap<>();
		body.put("name", "계피가루");
		body.put("spec", " ");
		body.put("safetyStock", "12.5");
		body.put("boxQty", "2.6");
		// 납품업체는 거래처코드로 온다(같은 코드는 한 번만, 빈 값은 건너뜀. 2026-10-23 id → 코드)
		body.put("supplierCodes", Arrays.<Object>asList("000003", " ", "000003"));
		when(dao.selectClientNameByCode("000003")).thenReturn("가나상회");
		when(dao.selectClientNameByCode("000005")).thenReturn("다라상사");
		MaterialInfoSaveResultVO result = service.saveMaterialInfo("000001", body);

		ArgumentCaptor<MaterialMasterVO> row = ArgumentCaptor.forClass(MaterialMasterVO.class);
		ArgumentCaptor<Set<String>> fields = ArgumentCaptor.forClass(Set.class);
		verify(dao).updateMaterialInfo(row.capture(), fields.capture());
		assertTrue(fields.getValue().contains("spec"));
		assertFalse(fields.getValue().contains("unit")); // 안 보낸 칸은 건드리지 않는다
		assertNull(row.getValue().getSpec());
		assertEquals(12.5d, row.getValue().getSafetyStock());
		assertEquals(Integer.valueOf(3), row.getValue().getBoxQty());
		assertEquals("계피분말", result.getRenamedFrom());
		assertEquals(Integer.valueOf(3), result.getCascadedBom());
		assertEquals(Integer.valueOf(2), result.getCascadedRecipeVersion());
		assertEquals(Integer.valueOf(1), result.getCascadedRecipeSkipped());
		verify(dao, never()).updateNamelessRecipeBom(anyString(), anyString(), anyString());
		// 납품업체는 materials.client_code 에 거래처코드 한 곳 그대로(빈 값 · 같은 코드는 한 번, 2026-10-28)
		assertEquals("000003", row.getValue().getSupplier());

		// 두 곳 이상이면 아무것도 고치지 않고 막는다
		Map<String, Object> two = new HashMap<>();
		two.put("name", "계피가루");
		two.put("supplierCodes", Arrays.<Object>asList("000003", "000005"));
		assertEquals("납품업체는 한 곳만 고를 수 있어요",
				assertThrows(IllegalArgumentException.class, () -> service.saveMaterialInfo("000001", two)).getMessage());

		// 거래처BOM 에 없는 업체코드면 아무것도 고치지 않고 막는다
		Map<String, Object> unknown = new HashMap<>();
		unknown.put("name", "계피가루");
		unknown.put("supplierCodes", Arrays.<Object>asList("999999"));
		assertEquals("거래처BOM에 없는 납품업체입니다. 새로고침 후 다시 골라주세요",
				assertThrows(IllegalArgumentException.class, () -> service.saveMaterialInfo("000001", unknown)).getMessage());

		Map<String, Object> missing = new HashMap<>();
		missing.put("name", "x");
		assertEquals("원재료를 찾을 수 없습니다",
				assertThrows(IllegalArgumentException.class, () -> service.saveMaterialInfo("999999", missing)).getMessage());
	}

	@DisplayName("단가: 숫자가 아니면 막고, 앞날이면 예약만, 아니면 바로 바꾸고 쓰는 제품 단가표를 다시 계산한다")
	@Test
	void savePrice_scheduleOrApply() throws Exception {
		MaterialMasterDAO dao = mock(MaterialMasterDAO.class);
		ItemMasterDAO bomDao = mock(ItemMasterDAO.class);
		MaterialMasterServiceImpl service = new MaterialMasterServiceImpl(dao, bomDao);
		when(dao.selectMaterial("000001")).thenReturn(material("000001", "소금", 800d));

		MaterialPriceRequestVO bad = new MaterialPriceRequestVO();
		bad.setUnitPrice("abc");
		assertEquals("단가는 숫자여야 합니다", assertThrows(IllegalArgumentException.class, () -> service.saveMaterialPrice("000001", bad)).getMessage());

		MaterialPriceRequestVO later = new MaterialPriceRequestVO();
		later.setUnitPrice("900");
		later.setEffectiveDate("2999-01-01");
		MaterialPriceSaveResultVO scheduled = service.saveMaterialPrice("000001", later);
		assertTrue(scheduled.getScheduled());
		assertEquals("2999-01-01", scheduled.getEffectiveDate());
		verify(dao).insertMaterialPriceSchedule(eq("000001"), eq("소금"), eq(900d), eq("2999-01-01"), anyString());
		verify(dao, never()).updateMaterialPrice(anyString(), anyDouble());

		when(dao.selectBomProductCodesByMaterial("000001", null)).thenReturn(Arrays.asList("P1", "P2"));
		PricingCostsVO costs = new PricingCostsVO();
		costs.setLaborCost(100d);
		costs.setMargin(50d);
		when(bomDao.selectPricingCosts("P1")).thenReturn(costs);
		when(bomDao.selectPricingCosts("P2")).thenReturn(null); // 단가표가 없으면 건너뛴다
		when(dao.selectBomAmountSum("P1")).thenReturn(1000d);
		MaterialPriceRequestVO now = new MaterialPriceRequestVO();
		now.setUnitPrice("950");
		MaterialPriceSaveResultVO applied = service.saveMaterialPrice("000001", now);
		assertFalse(applied.getScheduled());
		assertEquals(Integer.valueOf(2), applied.getAffectedProducts());
		verify(dao).updateMaterialPrice("000001", 950d);
		verify(dao).updateBomPriceByMaterial("000001", 950d);
		verify(bomDao).updatePricingMaterialCost("P1", 1000d, 1150d);
		verify(bomDao, never()).updatePricingMaterialCost(eq("P2"), anyDouble(), anyDouble());
	}

	@DisplayName("일괄적용: 대상 필수, 같은 원재료 불가, 고른 제품만 바꾸고 단가표를 다시 계산한다")
	@Test
	void replace_rules() throws Exception {
		MaterialMasterDAO dao = mock(MaterialMasterDAO.class);
		ItemMasterDAO bomDao = mock(ItemMasterDAO.class);
		MaterialMasterServiceImpl service = new MaterialMasterServiceImpl(dao, bomDao);
		MaterialReplaceRequestVO request = new MaterialReplaceRequestVO();
		assertEquals("교체할 원재료를 선택해주세요", assertThrows(IllegalArgumentException.class, () -> service.replaceMaterial("000001", request)).getMessage());
		request.setNewMaterialCode("000001");
		assertEquals("같은 원재료로는 교체할 수 없습니다", assertThrows(IllegalArgumentException.class, () -> service.replaceMaterial("000001", request)).getMessage());
		request.setNewMaterialCode("000002");
		assertEquals("원재료를 찾을 수 없습니다", assertThrows(IllegalArgumentException.class, () -> service.replaceMaterial("000001", request)).getMessage());

		when(dao.selectMaterial("000001")).thenReturn(material("000001", "계피분말", 100d));
		MaterialMasterVO target = material("000002", "계피분말", 120d);
		when(dao.selectMaterial("000002")).thenReturn(target);
		request.setProductCodes(Arrays.asList("P1"));
		when(dao.selectBomProductCodesByMaterial("000001", Arrays.asList("P1"))).thenReturn(Arrays.asList("P1"));
		assertEquals(1, service.replaceMaterial("000001", request));
		verify(dao).updateBomMaterial("000001", target, Arrays.asList("P1"));
	}
}

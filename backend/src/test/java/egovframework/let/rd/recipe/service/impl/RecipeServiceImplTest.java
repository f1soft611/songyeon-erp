package egovframework.let.rd.recipe.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import egovframework.let.rd.recipe.domain.model.RecipeBomInputVO;
import egovframework.let.rd.recipe.domain.model.RecipeDraftVO;
import egovframework.let.rd.recipe.domain.model.RecipeSaveVO;
import egovframework.let.rd.recipe.domain.model.RecipeVersionVO;
import egovframework.let.rd.recipe.domain.repository.RecipeDAO;

class RecipeServiceImplTest {

	private static RecipeBomInputVO bom(String name, Object percent, Object weight, Object unitPrice, String code) {
		RecipeBomInputVO b = new RecipeBomInputVO();
		b.setMaterialName(name);
		b.setRatioPercent(percent);
		b.setWeight(weight);
		b.setUnitPrice(unitPrice);
		b.setMaterialCode(code);
		return b;
	}

	private static Map<String, Object> material(String code, Double price) {
		Map<String, Object> m = new HashMap<>();
		m.put("code", code);
		m.put("unitPrice", price);
		return m;
	}

	private static Map<String, Object> label(long id, String label) {
		Map<String, Object> m = new HashMap<>();
		m.put("id", id);
		m.put("versionLabel", label);
		return m;
	}

	@DisplayName("업체 폴더: 이름은 필수, 담당자는 사번(비우면 나중에), 없는 사원은 막고, 있으면 담당자만 바꾼다")
	@Test
	void clients() throws Exception {
		RecipeDAO dao = mock(RecipeDAO.class);
		RecipeServiceImpl service = new RecipeServiceImpl(dao);
		assertEquals("업체명을 입력해주세요", assertThrows(IllegalArgumentException.class, () -> service.saveClient(" ", null, "0000")).getMessage());
		assertEquals("그런 사원이 없습니다", assertThrows(IllegalArgumentException.class, () -> service.saveClient("태화분식", "0009", "0000")).getMessage());
		when(dao.selectClientId("태화분식")).thenReturn(null);
		assertEquals("태화분식", service.saveClient(" 태화분식 ", "", "0000"));
		verify(dao).insertClient(eq("태화분식"), isNull(), eq("0000"), anyString(), anyString());
		when(dao.countEmployee("0003")).thenReturn(1);
		when(dao.selectClientId("태화분식")).thenReturn(5L);
		service.saveClient("태화분식", " 0003 ", "0000");
		verify(dao).updateClientRep(eq(5L), eq("0003"), anyString());
	}

	@DisplayName("새 레시피: 이름·업체 필수, 폴더 줄을 챙기고 '초안' 버전과 배합표를 만든다")
	@Test
	void createDraft() throws Exception {
		RecipeDAO dao = mock(RecipeDAO.class);
		RecipeServiceImpl service = new RecipeServiceImpl(dao);
		RecipeSaveVO r = new RecipeSaveVO();
		r.setClientName("태화분식");
		assertEquals("레시피명은 필수입니다", assertThrows(IllegalArgumentException.class, () -> service.createDraft(r, "0000")).getMessage());
		r.setName("떡볶이소스 개발A");
		r.setClientName(" ");
		assertEquals("업체명은 필수입니다", assertThrows(IllegalArgumentException.class, () -> service.createDraft(r, "0000")).getMessage());
		r.setClientName("태화분식");
		r.setBom(Arrays.asList(bom("설탕", "40", "400", "", null)));
		when(dao.insertDraft(any())).thenReturn(11L);
		when(dao.insertVersion(eq(11L), eq("초안"), isNull(), anyString())).thenReturn(21L);
		when(dao.selectOldBomCodes(21L)).thenReturn(Collections.<Map<String, Object>>emptyList());
		when(dao.selectMaterialByName("설탕")).thenReturn(material("000012", 1500.0));
		Map<String, Object> made = service.createDraft(r, "0000");
		assertEquals(11L, made.get("id"));
		assertEquals(21L, made.get("versionId"));
		verify(dao).insertClient(eq("태화분식"), isNull(), eq("0000"), anyString(), isNull());
		verify(dao).insertBom(21L, "000012", "설탕", 400.0, 0.4, 1500.0, 600.0, 0);
	}

	@DisplayName("배합표: 이름 없거나 비율이 숫자가 아니면 건너뛰고, 물고 있던 코드를 지키며, 단가를 비우면 원재료단가")
	@Test
	void bomRules() throws Exception {
		RecipeDAO dao = mock(RecipeDAO.class);
		RecipeServiceImpl service = new RecipeServiceImpl(dao);
		RecipeVersionVO v = new RecipeVersionVO();
		v.setId(21L);
		v.setDraftId(11L);
		when(dao.selectVersion(21L)).thenReturn(v);
		Map<String, Object> old = new HashMap<>();
		old.put("name", "표고버섯분말");
		old.put("code", "000099");
		when(dao.selectOldBomCodes(21L)).thenReturn(Collections.singletonList(old));
		when(dao.selectMaterialByCodeAndName("000099", "표고버섯분말")).thenReturn(material("000099", 30000.0));
		when(dao.selectMaterialByName("정제수")).thenReturn(null);
		RecipeSaveVO r = new RecipeSaveVO();
		r.setBom(Arrays.asList(
				bom("", "10", null, null, null),
				bom("정제수", "abc", null, null, null),
				bom("표고버섯분말", 25, "", "x", null),
				bom("정제수", "75", 750, "2", null)));
		service.saveVersion(21L, r, null);
		verify(dao).deleteVersionBom(21L);
		verify(dao).insertBom(21L, "000099", "표고버섯분말", null, 0.25, 30000.0, 7500.0, 2);
		verify(dao).insertBom(21L, null, "정제수", 750.0, 0.75, 2.0, 1.5, 3);
		verify(dao, never()).selectMaterialByName("표고버섯분말");
		verify(dao).touchDraft(eq(11L), anyString());
	}

	@DisplayName("공유된 버전은 고치지 못하고 새 test 버전을 만들라고 한다, 없는 버전은 그 문구")
	@Test
	void lockedVersion() throws Exception {
		RecipeDAO dao = mock(RecipeDAO.class);
		RecipeServiceImpl service = new RecipeServiceImpl(dao);
		RecipeVersionVO v = new RecipeVersionVO();
		v.setStage("견적공유");
		when(dao.selectVersion(21L)).thenReturn(v);
		assertEquals("\"견적공유\"로 공유된 버전은 수정할 수 없습니다. 새 test버전을 만들어서 수정해주세요.",
				assertThrows(IllegalArgumentException.class, () -> service.saveVersion(21L, new RecipeSaveVO(), null)).getMessage());
		verify(dao, never()).deleteVersionBom(anyLong());
		assertEquals("버전을 찾을 수 없습니다", assertThrows(IllegalArgumentException.class, () -> service.saveVersion(99L, new RecipeSaveVO(), null)).getMessage());
	}

	@DisplayName("test 버전: test 로 시작하는 버전 수 + 1, 최신 버전 배합표를 베낀다")
	@Test
	void addVersion() throws Exception {
		RecipeDAO dao = mock(RecipeDAO.class);
		RecipeServiceImpl service = new RecipeServiceImpl(dao);
		assertEquals("레시피를 찾을 수 없습니다", assertThrows(IllegalArgumentException.class, () -> service.addVersion(11L, null)).getMessage());
		when(dao.selectDraft(11L)).thenReturn(new RecipeDraftVO());
		List<Map<String, Object>> versions = new ArrayList<>(Arrays.asList(label(21L, "초안"), label(22L, "test1"), label(23L, "확정본")));
		when(dao.selectVersionLabels(11L)).thenReturn(versions);
		when(dao.insertVersion(eq(11L), eq("test2"), isNull(), anyString())).thenReturn(30L);
		Map<String, Object> made = service.addVersion(11L, null);
		assertEquals("test2", made.get("versionLabel"));
		assertEquals(30L, made.get("versionId"));
		verify(dao).copyBom(23L, 30L);
		verify(dao).touchDraft(eq(11L), anyString());
	}

	@DisplayName("목록: stage 가 있으면 버전 단위, 없으면 레시피 단위. 찾는 글자는 앞뒤 공백을 뗀다")
	@Test
	void listing() throws Exception {
		RecipeDAO dao = mock(RecipeDAO.class);
		RecipeServiceImpl service = new RecipeServiceImpl(dao);
		Map<String, String> f = new HashMap<>();
		f.put("clientName", " 태화분식 ");
		service.listDrafts(f);
		@SuppressWarnings("unchecked")
		ArgumentCaptor<Map<String, Object>> cap = ArgumentCaptor.forClass(Map.class);
		verify(dao).selectDrafts(cap.capture());
		assertEquals("태화분식", cap.getValue().get("clientName"));
		assertEquals("", cap.getValue().get("q"));
		f.put("stage", "신규확정");
		service.listDrafts(f);
		verify(dao).selectDraftsByStage(any());
		assertEquals("레시피를 찾을 수 없습니다", assertThrows(IllegalArgumentException.class, () -> service.getDraft(1L)).getMessage());
		assertEquals("버전을 찾을 수 없습니다", assertThrows(IllegalArgumentException.class, () -> service.getVersion(1L)).getMessage());
		assertNull(RecipeServiceImpl.toDouble(" "));
		assertEquals(18.69, RecipeServiceImpl.toDouble("18.69"), 1e-9);
		verify(dao, never()).insertBom(anyLong(), anyString(), anyString(), any(), any(Double.class), any(), any(), anyInt());
	}
}

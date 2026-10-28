package egovframework.let.qm.label.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
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

import com.fasterxml.jackson.databind.ObjectMapper;

import egovframework.let.qm.label.domain.model.LabelVO;
import egovframework.let.qm.label.domain.repository.LabelDAO;

class LabelServiceImplTest {

	private static LabelVO allergenRow(String material, String allergens) {
		LabelVO row = new LabelVO();
		row.setMaterialName(material);
		row.setAllergens(allergens);
		return row;
	}

	@DisplayName("버전: 없는 제품은 막고, 옛 products 라벨이 있으면 v1(사용중)을 만들고, 사용중이 없으면 최근 것을 사용중으로")
	@Test
	void versions() throws Exception {
		LabelDAO dao = mock(LabelDAO.class);
		// Mockito 는 Long 을 0 으로 돌려주므로 '버전 없음' 을 null 로 적어 둔다
		when(dao.selectCurrentVersionId(any())).thenReturn(null);
		when(dao.selectLatestVersionId(any())).thenReturn(null);
		LabelServiceImpl service = new LabelServiceImpl(dao, new ObjectMapper());
		assertEquals("제품을 찾을 수 없습니다", assertThrows(IllegalArgumentException.class, () -> service.listVersions("X", "0001")).getMessage());

		// 보관방법만 있는 제품: 버전을 만들지 않는다, 버전이 없으니 currentId 도 없다
		when(dao.countProduct("P1")).thenReturn(1);
		LabelVO storageOnly = new LabelVO();
		storageOnly.setStorage("냉장");
		when(dao.selectProductLabel("P1")).thenReturn(storageOnly);
		assertNull(service.listVersions("P1", "0001").get("currentId"));
		verify(dao, never()).insertVersion(any());
		verify(dao, never()).updateVersionCurrent(anyLong());

		// 옛 라벨(식품유형)이 있는 제품: v1 사용중
		when(dao.countProduct("P2")).thenReturn(1);
		LabelVO legacy = new LabelVO();
		legacy.setFoodType("소스");
		when(dao.selectProductLabel("P2")).thenReturn(legacy);
		when(dao.selectLatestVersionId("P2")).thenReturn(7L);
		Map<String, Object> result = service.listVersions("P2", "0001");
		ArgumentCaptor<LabelVO> saved = ArgumentCaptor.forClass(LabelVO.class);
		verify(dao).insertVersion(saved.capture());
		assertEquals("P2", saved.getValue().getProductCode());
		assertEquals("v1", saved.getValue().getVersionLabel());
		assertEquals(Integer.valueOf(1), saved.getValue().getIsCurrent());
		assertEquals("0001", saved.getValue().getCreatedBy()); // 2026-10-26 만든 사람 사번
		verify(dao).updateVersionCurrent(7L);
		assertEquals(7L, result.get("currentId"));
	}

	@DisplayName("버전 한 개: layout·extra JSON 을 풀고(깨지면 빈 값), 단위가 없으면 '월'")
	@Test
	void version() throws Exception {
		LabelDAO dao = mock(LabelDAO.class);
		LabelServiceImpl service = new LabelServiceImpl(dao, new ObjectMapper());
		LabelVO row = new LabelVO();
		row.setLayoutJson("{\"size\":\"100x130\",\"recycle\":{\"mark_id\":3}}");
		row.setExtraJson("{broken");
		row.setShelfLifeMonths(6);
		when(dao.selectVersion(1L)).thenReturn(row);
		LabelVO version = service.getVersion(1L);
		assertEquals("100x130", version.getLayout().get("size"));
		assertEquals(Collections.emptyMap(), version.getExtra());
		assertEquals("월", version.getShelfLifeUnit());
		assertEquals("라벨 버전을 찾을 수 없습니다", assertThrows(IllegalArgumentException.class, () -> service.getVersion(2L)).getMessage());
	}

	@DisplayName("알러지: 쉼표·가운뎃점·빗금으로 나누고 겹치면 한 번만, 원재료별 출처")
	@Test
	@SuppressWarnings("unchecked")
	void bomAllergens() throws Exception {
		LabelDAO dao = mock(LabelDAO.class);
		LabelServiceImpl service = new LabelServiceImpl(dao, new ObjectMapper());
		when(dao.selectBomAllergens("P")).thenReturn(Arrays.asList(
				allergenRow("간장", "대두, 밀"), allergenRow("굴소스", "조개류(굴)·대두"), allergenRow("소금", " ")));
		Map<String, Object> result = service.getBomAllergens("P");
		assertEquals(Arrays.asList("대두", "밀", "조개류(굴)"), result.get("allergens"));
		assertEquals("대두, 밀, 조개류(굴)", result.get("text"));
		List<Map<String, Object>> sources = (List<Map<String, Object>>) result.get("sources");
		assertEquals(2, sources.size());
		assertEquals("굴소스", sources.get(1).get("materialName"));
		assertEquals(Arrays.asList("조개류(굴)", "대두"), sources.get(1).get("allergens"));
	}
}

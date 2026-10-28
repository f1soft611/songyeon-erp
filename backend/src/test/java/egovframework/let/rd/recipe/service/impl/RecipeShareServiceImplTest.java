package egovframework.let.rd.recipe.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import com.fasterxml.jackson.databind.ObjectMapper;

import egovframework.let.rd.recipe.domain.model.RecipeShareSaveVO;
import egovframework.let.rd.recipe.domain.model.RecipeShareVO;
import egovframework.let.rd.recipe.domain.repository.RecipeDAO;
import egovframework.let.rd.recipe.domain.repository.RecipeShareDAO;

class RecipeShareServiceImplTest {

    private static Map<String, Object> bomLine(String name, Double ratio, Double price, String code) {
        Map<String, Object> m = new HashMap<>();
        m.put("materialName", name);
        m.put("ratio", ratio);
        m.put("unitPrice", price);
        m.put("materialCode", code);
        return m;
    }

    private static Map<String, Object> source() {
        Map<String, Object> m = new HashMap<>();
        m.put("draftId", 11L);
        m.put("versionLabel", "test1");
        m.put("draftName", "떡볶이소스");
        m.put("draftSpec", "1kg");
        m.put("clientName", "태화분식");
        return m;
    }

    @DisplayName("넘기기 검사: 처리구분 · 버전 · 없는 버전 · 두 번 넘기기 · 빈 배합표")
    @Test
    void handoffChecks() throws Exception {
        RecipeShareDAO dao = mock(RecipeShareDAO.class);
        RecipeShareServiceImpl service = new RecipeShareServiceImpl(dao, mock(RecipeDAO.class), new ObjectMapper());
        assertEquals("확정/견적/기타 중 하나여야 합니다", assertThrows(IllegalArgumentException.class, () -> service.handoff(1, "신규", "0000", "관리자")).getMessage());
        assertEquals("어느 버전을 넘길지 골라주세요", assertThrows(IllegalArgumentException.class, () -> service.handoff("", "견적", "0000", "관리자")).getMessage());
        when(dao.selectHandoffSource(21L)).thenReturn(null);
        assertEquals("버전을 찾을 수 없습니다", assertThrows(IllegalArgumentException.class, () -> service.handoff(21, "견적", "0000", "관리자")).getMessage());
        when(dao.selectHandoffSource(21L)).thenReturn(source());
        when(dao.countHandoff(21L, "견적")).thenReturn(1);
        assertEquals("이 버전(test1)은 이미 \"견적\" 로 넘겼습니다.", assertThrows(IllegalArgumentException.class, () -> service.handoff("21", "견적", "0000", "관리자")).getMessage());
        when(dao.selectHandoffBom(21L)).thenReturn(Collections.singletonList(bomLine("", 1.0, null, null)));
        assertEquals("test1 의 배합표가 비어 있습니다. 레시피 작성에서 원재료를 넣은 뒤에 넘겨주세요.",
                assertThrows(IllegalArgumentException.class, () -> service.handoff(21, "확정", "0000", "관리자")).getMessage());
        verify(dao, never()).insertHandoff(any());
        verify(dao, never()).lockVersion(anyLong(), anyString());
    }

    @SuppressWarnings("unchecked")
    @DisplayName("견적으로 넘기기: 가견적(비율×100, 단가 비면 원재료단가, 원재료비=견적단가) · 넘긴 기록 · 잠금 · 공유로그")
    @Test
    void handoffQuote() throws Exception {
        RecipeShareDAO dao = mock(RecipeShareDAO.class);
        RecipeDAO recipeDAO = mock(RecipeDAO.class);
        RecipeShareServiceImpl service = new RecipeShareServiceImpl(dao, recipeDAO, new ObjectMapper());
        when(dao.selectHandoffSource(21L)).thenReturn(source());
        when(dao.selectHandoffBom(21L)).thenReturn(Arrays.asList(bomLine("정제수", 0.6, 2.0, null), bomLine("설탕", 0.4, null, "000012")));
        Map<String, Object> sugar = new HashMap<>();
        sugar.put("code", "000012");
        sugar.put("unitPrice", 1500.0);
        when(recipeDAO.selectMaterialByCodeAndName("000012", "설탕")).thenReturn(sugar);
        when(dao.insertQuote(any())).thenReturn(7L);
        when(dao.selectUsername("0000")).thenReturn("admin");
        when(dao.insertHandoff(any())).thenReturn(30L);
        Map<String, Object> made = service.handoff(21, "견적", "0000", "관리자");
        assertEquals(7L, made.get("quoteId"));
        assertEquals("\"견적\" 로 넘겼습니다. 영업관리 > 견적 에서 확인하세요.", made.get("message"));
        ArgumentCaptor<Map<String, Object>> quote = ArgumentCaptor.forClass(Map.class);
        verify(dao).insertQuote(quote.capture());
        assertEquals(601.2, (Double) quote.getValue().get("materialCost"), 1e-9);
        assertEquals("[태화분식] 떡볶이소스 test1", quote.getValue().get("sourceRecipe"));
        assertEquals("견적", quote.getValue().get("kind"));
        String json = (String) quote.getValue().get("bomJson");
        assertTrue(json.contains("\"material_name\":\"설탕\",\"material_code\":\"000012\",\"ratio_percent\":40.0,\"unit_price\":null"), json);
        ArgumentCaptor<Map<String, Object>> handoff = ArgumentCaptor.forClass(Map.class);
        verify(dao).insertHandoff(handoff.capture());
        assertEquals(7L, handoff.getValue().get("quoteId"));
        assertEquals("admin", handoff.getValue().get("requestedByUsername"));
        assertEquals("관리자", handoff.getValue().get("requestedByName"));
        verify(dao).lockVersion(21L, "견적공유");
        verify(dao).insertStageLog(any());
        verify(dao).touchDraft(eq(11L), anyString());
        verify(dao, never()).insertLabelRequest(anyLong(), anyString(), anyString());
    }

    @DisplayName("기타로 넘기기: 견적 없이 표시사항 요청(원재료명 및 함량 초안), 분류는 기타공유")
    @Test
    void handoffLabel() throws Exception {
        RecipeShareDAO dao = mock(RecipeShareDAO.class);
        RecipeShareServiceImpl service = new RecipeShareServiceImpl(dao, mock(RecipeDAO.class), new ObjectMapper());
        when(dao.selectHandoffSource(21L)).thenReturn(source());
        List<Map<String, Object>> bom = Arrays.asList(bomLine("정제수", 0.6, null, null), bomLine("설탕", 0.18694, null, null), bomLine("후추", null, null, null));
        when(dao.selectHandoffBom(21L)).thenReturn(bom);
        when(dao.insertHandoff(any())).thenReturn(30L);
        Map<String, Object> made = service.handoff(21, "기타", "0000", "관리자");
        assertNull(made.get("quoteId"));
        assertEquals("\"기타\" 로 넘겼습니다. 품질관리 > 라벨등록 > 표시사항 요청 에서 확인하세요.", made.get("message"));
        verify(dao, never()).insertQuote(any());
        verify(dao).insertLabelRequest(eq(30L), eq("정제수 60.0%, 설탕 18.69%, 후추"), anyString());
        verify(dao).lockVersion(21L, "기타공유");
        assertEquals("40.0", RecipeShareServiceImpl.pythonRound2(0.4 * 100));
        assertEquals("0.05", RecipeShareServiceImpl.pythonRound2(0.05));
    }

    @DisplayName("공유: 필수 칸, 남의 레시피 버전 막기, 버전을 안 고르면 최신 버전을 못박는다, 만료 여부")
    @Test
    void shares() throws Exception {
        RecipeShareDAO dao = mock(RecipeShareDAO.class);
        RecipeShareServiceImpl service = new RecipeShareServiceImpl(dao, mock(RecipeDAO.class), new ObjectMapper());
        RecipeShareSaveVO r = new RecipeShareSaveVO();
        r.setDraftId("11");
        r.setEmployeeId("00000002");
        assertEquals("레시피, 사원, 만료일은 모두 필수입니다", assertThrows(IllegalArgumentException.class, () -> service.createShare(r, "0000")).getMessage());
        r.setExpiresAt("2026-12-31");
        r.setVersionId(99);
        when(dao.selectVersionDraftId(99L)).thenReturn(12L);
        assertEquals("이 레시피의 버전이 아닙니다", assertThrows(IllegalArgumentException.class, () -> service.createShare(r, "0000")).getMessage());
        r.setVersionId(null);
        when(dao.selectLatestVersionId(11L)).thenReturn(23L);
        service.createShare(r, "0000");
        @SuppressWarnings("unchecked")
        ArgumentCaptor<Map<String, Object>> cap = ArgumentCaptor.forClass(Map.class);
        verify(dao).insertShare(cap.capture());
        assertEquals(23L, cap.getValue().get("versionId"));
        assertEquals("00000002", cap.getValue().get("employeeId"));
        assertEquals("0000", cap.getValue().get("createdBy"));
        RecipeShareVO old = new RecipeShareVO();
        old.setExpiresAt("2000-01-01");
        RecipeShareVO future = new RecipeShareVO();
        future.setExpiresAt("2999-01-01");
        when(dao.selectShares()).thenReturn(Arrays.asList(old, future));
        List<RecipeShareVO> rows = service.listShares();
        assertTrue(rows.get(0).isExpired());
        assertFalse(rows.get(1).isExpired());
        Map<String, String> f = new HashMap<>();
        f.put("draftId", "x");
        f.put("kind", " 견적 ");
        service.listHandoffs(f);
        @SuppressWarnings("unchecked")
        ArgumentCaptor<Map<String, Object>> fc = ArgumentCaptor.forClass(Map.class);
        verify(dao).selectHandoffs(fc.capture());
        assertNull(fc.getValue().get("draftId"));
        assertEquals("견적", fc.getValue().get("kind"));
    }
}

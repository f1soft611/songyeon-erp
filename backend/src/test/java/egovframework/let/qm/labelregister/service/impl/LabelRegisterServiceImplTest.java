package egovframework.let.qm.labelregister.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import egovframework.let.qm.label.domain.model.LabelVO;
import egovframework.let.qm.label.domain.repository.LabelDAO;
import egovframework.let.qm.labelregister.domain.model.LabelContentVO;
import egovframework.let.qm.labelregister.domain.model.LabelMarkSaveVO;
import egovframework.let.qm.labelregister.domain.model.LabelProductRowVO;
import egovframework.let.qm.labelregister.domain.model.LabelRequestVO;
import egovframework.let.qm.labelregister.domain.model.LabelTemplateSaveVO;
import egovframework.let.qm.labelregister.domain.model.LabelVersionRequestVO;
import egovframework.let.qm.labelregister.domain.repository.LabelRegisterDAO;

class LabelRegisterServiceImplTest {

	private static final ObjectMapper JSON = new ObjectMapper();
	// 송연 07-label.js LABEL_FORMAT_BASIC
	private static final String BASIC = "{\"paper\":{\"w\":100,\"h\":150},\"cols\":[22,34,19,2,10,13],\"rows\":["
			+ "{\"cells\":[{\"type\":\"title\",\"span\":3},{\"type\":\"blank\",\"span\":3,\"rowspan\":3,\"cls\":\"haccp-space\"}]},"
			+ "{\"cells\":[{\"type\":\"label\",\"span\":1,\"text\":\"식품유형\"},{\"type\":\"field\",\"span\":2,\"field\":\"food_type\"}]},"
			+ "{\"cells\":[{\"type\":\"label\",\"span\":1,\"text\":\"제조년월일\"},{\"type\":\"date\",\"span\":2}]},"
			+ "{\"cells\":[{\"type\":\"label\",\"span\":1},{\"type\":\"expiry\",\"span\":2},{\"type\":\"label\",\"span\":2},{\"type\":\"field\",\"span\":1,\"field\":\"net_weight\"}]}]}";

	private LabelRegisterDAO dao;
	private LabelDAO labelDAO;
	private LabelRegisterServiceImpl service;

	private static Map<String, Object> json(String text) throws Exception {
		return JSON.readValue(text, new TypeReference<LinkedHashMap<String, Object>>() { });
	}

	private static Map<String, Object> meta(String code, int current) {
		Map<String, Object> m = new HashMap<>();
		m.put("productCode", code);
		m.put("isCurrent", current);
		return m;
	}

	@BeforeEach
	void setUp() {
		dao = mock(LabelRegisterDAO.class);
		labelDAO = mock(LabelDAO.class);
		service = new LabelRegisterServiceImpl(dao, labelDAO, JSON);
	}

	@DisplayName("JSON 글자는 송연 json.dumps 와 같은 모양(', ' · ': ', 한글 그대로, 9.0 은 9.0)")
	@Test
	void pythonJson() throws Exception {
		Map<String, Object> layout = json("{\"size\":\"100x150\",\"format_id\":3,\"recycle\":{\"mark_id\":2,\"width_mm\":9.0},\"note\":\"따옴표\\\"줄\\n\",\"cols\":[22,34.5],\"x\":null,\"b\":true}");
		assertEquals("{\"size\": \"100x150\", \"format_id\": 3, \"recycle\": {\"mark_id\": 2, \"width_mm\": 9.0}, \"note\": \"따옴표\\\"줄\\n\", \"cols\": [22, 34.5], \"x\": null, \"b\": true}",
				PythonJson.dumps(layout));
	}

	@DisplayName("양식 검사: 기본 양식은 통과, 합계·넘침·빈자리·겹침·숫자 아님은 송연 문구")
	@Test
	void formatCheck() throws Exception {
		assertNull(LabelFormatValidator.check(json(BASIC)));
		assertEquals("양식 내용이 올바르지 않습니다", LabelFormatValidator.check("x"));
		assertEquals("칸 나누기(cols)가 없습니다", LabelFormatValidator.check(json("{\"cols\":[]}")));
		assertEquals("칸 폭은 숫자여야 합니다", LabelFormatValidator.check(json("{\"cols\":[\"a\"]}")));
		assertEquals("칸 폭은 0보다 커야 합니다", LabelFormatValidator.check(json("{\"cols\":[0]}")));
		assertEquals("종이 가로 크기가 없습니다", LabelFormatValidator.check(json("{\"cols\":[10]}")));
		assertEquals("칸 폭 합계(99mm)가 종이 가로(100mm)와 다릅니다", LabelFormatValidator.check(json("{\"paper\":{\"w\":100},\"cols\":[49,50]}")));
		// 0.5mm 까지는 봐준다
		assertNull(LabelFormatValidator.check(json("{\"paper\":{\"w\":100},\"cols\":[49.5,50],\"rows\":[{\"cells\":[{\"span\":2}]}]}")));
		assertEquals("줄이 하나도 없습니다", LabelFormatValidator.check(json("{\"paper\":{\"w\":100},\"cols\":[50,50],\"rows\":[]}")));
		assertEquals("1번째 줄의 칸이 오른쪽으로 넘칩니다", LabelFormatValidator.check(json("{\"paper\":{\"w\":100},\"cols\":[50,50],\"rows\":[{\"cells\":[{\"span\":3}]}]}")));
		assertEquals("1번째 줄의 칸이 아래로 넘칩니다", LabelFormatValidator.check(json("{\"paper\":{\"w\":100},\"cols\":[50,50],\"rows\":[{\"cells\":[{\"span\":2,\"rowspan\":2}]}]}")));
		assertEquals("2번째 줄에 채워지지 않은 자리가 1칸 있습니다", LabelFormatValidator.check(json("{\"paper\":{\"w\":100},\"cols\":[50,50],\"rows\":[{\"cells\":[{\"span\":2}]},{\"cells\":[{\"span\":1}]}]}")));
		assertEquals("2번째 줄에 칸이 없습니다", LabelFormatValidator.check(json("{\"paper\":{\"w\":100},\"cols\":[50,50],\"rows\":[{\"cells\":[{\"span\":2}]},{\"cells\":[]}]}")));
		assertEquals("1번째 줄에 크기가 이상한 칸이 있습니다", LabelFormatValidator.check(json("{\"paper\":{\"w\":100},\"cols\":[50,50],\"rows\":[{\"cells\":[{\"span\":-1}]}]}")));
		// 위에서 내려온 칸이 차지한 자리는 건너뛴다(해썹 자리처럼)
		assertNull(LabelFormatValidator.check(json("{\"paper\":{\"w\":100},\"cols\":[50,50],\"rows\":[{\"cells\":[{\"span\":1},{\"rowspan\":2}]},{\"cells\":[{\"span\":1}]}]}")));
	}

	@DisplayName("버전 이름: 비우면 쓴 번호 중 가장 큰 것 다음, 30자·중복 막기")
	@Test
	void versionNames() {
		assertEquals("v1", LabelRegisterServiceImpl.nextVersionLabel(Collections.<String>emptyList()));
		assertEquals("v4", LabelRegisterServiceImpl.nextVersionLabel(Arrays.asList("v1", "V3", "2026 개정", null)));
		assertEquals("버전 이름은 30자까지 넣을 수 있어요", LabelRegisterServiceImpl.checkVersionLabel(new String(new char[31]).replace('\0', 'a'), Collections.<String>emptyList()));
		assertEquals("\"v2\" 은 이미 있는 버전 이름이에요. 다른 이름으로 해주세요.", LabelRegisterServiceImpl.checkVersionLabel("v2", Arrays.asList("v1", "v2")));
		assertNull(LabelRegisterServiceImpl.checkVersionLabel("v3", Arrays.asList("v1", "v2")));
		assertEquals(Integer.valueOf(6), LabelRegisterServiceImpl.intOrNull(6.7));
		assertEquals(Integer.valueOf(6), LabelRegisterServiceImpl.intOrNull(" 6 "));
		assertNull(LabelRegisterServiceImpl.intOrNull("6.5"));
		assertNull(LabelRegisterServiceImpl.intOrNull(""));
	}

	@DisplayName("내용 저장: 버전이 없으면 처음 저장할 때 v1 을 만들고, 남의 버전이면 막고, 사용중이면 products 에도")
	@Test
	void saveLabel() throws Exception {
		when(dao.countProduct("P1")).thenReturn(1);
		when(labelDAO.countVersions("P1")).thenReturn(0);
		when(labelDAO.selectProductLabel("P1")).thenReturn(new LabelVO());
		when(labelDAO.selectCurrentVersionId("P1")).thenReturn(7L);
		when(dao.selectVersionMeta(7L)).thenReturn(meta("P1", 1));
		LabelContentVO c = new LabelContentVO();
		c.setFoodType("소스");
		c.setShelfLifeMonths("12");
		c.setShelfLifeUnit("");
		c.setExtra(new LinkedHashMap<String, Object>(Collections.singletonMap("유통전문판매원", "송연")));
		Map<String, Object> result = service.saveLabel("P1", c, "관리자");
		assertEquals(7L, result.get("versionId"));
		assertEquals(true, result.get("isCurrent"));
		ArgumentCaptor<LabelVO> v1 = ArgumentCaptor.forClass(LabelVO.class);
		verify(labelDAO).insertVersion(v1.capture());
		assertEquals("v1", v1.getValue().getVersionLabel());
		assertEquals("관리자", v1.getValue().getCreatedBy()); // 2026-10-26 v1 도 만든 사람을 남긴다(컨트롤러가 사번을 넘긴다)
		@SuppressWarnings("unchecked")
		ArgumentCaptor<Map<String, Object>> values = ArgumentCaptor.forClass(Map.class);
		verify(dao).updateVersionContent(values.capture());
		assertEquals(12, values.getValue().get("shelfLifeMonths"));
		assertNull(values.getValue().get("shelfLifeUnit"));
		assertEquals("{\"유통전문판매원\": \"송연\"}", values.getValue().get("extraJson"));
		verify(dao).copyVersionToProducts(7L);

		when(dao.selectVersionMeta(9L)).thenReturn(meta("P2", 0));
		c.setVersionId(9L);
		assertEquals("이 제품의 라벨 버전이 아닙니다", assertThrows(IllegalArgumentException.class, () -> service.saveLabel("P1", c, "관리자")).getMessage());
		assertEquals("제품을 찾을 수 없습니다", assertThrows(IllegalArgumentException.class, () -> service.saveLabel("NOPE", c, "관리자")).getMessage());
	}

	@DisplayName("모양 저장: versionId 는 빼고 송연 JSON 으로, 사용중이 아닌 버전이면 products 는 그대로")
	@Test
	void saveLayout() throws Exception {
		when(dao.countProduct("P1")).thenReturn(1);
		when(labelDAO.countVersions("P1")).thenReturn(2);
		when(dao.selectVersionMeta(8L)).thenReturn(meta("P1", 0));
		service.saveLayout("P1", json("{\"versionId\":8,\"size\":\"100x130\",\"format_id\":null,\"recycle\":{\"mark_id\":2,\"width_mm\":9}}"), "0001");
		verify(dao).updateVersionLayout(8L, "{\"size\": \"100x130\", \"format_id\": null, \"recycle\": {\"mark_id\": 2, \"width_mm\": 9}}");
		verify(dao, never()).updateProductLabelStyle(anyString(), anyString());
	}

	@DisplayName("새 버전 · 이름 바꾸기 · 사용 · 삭제(사용중·마지막은 막음)")
	@Test
	void versions() throws Exception {
		when(dao.countProduct("P1")).thenReturn(1);
		when(labelDAO.countVersions("P1")).thenReturn(2);
		when(labelDAO.selectCurrentVersionId("P1")).thenReturn(7L);
		when(dao.selectVersionMeta(7L)).thenReturn(meta("P1", 1));
		when(dao.selectVersionMeta(8L)).thenReturn(meta("P1", 0));
		when(dao.selectVersionLabels("P1", null)).thenReturn(Arrays.asList("v1", "v2"));
		when(dao.insertVersionCopy(eq(7L), eq("v3"), isNull(), anyString(), eq("관리자"))).thenReturn(11L);
		LabelVersionRequestVO req = new LabelVersionRequestVO();
		req.setNote(" ");
		Map<String, Object> made = service.newVersion("P1", req, "관리자");
		assertEquals(11L, made.get("id"));
		assertEquals("v3", made.get("versionLabel"));
		req.setVersionLabel("v2");
		assertTrue(assertThrows(IllegalArgumentException.class, () -> service.newVersion("P1", req, "관리자")).getMessage().startsWith("\"v2\" 은 이미 있는"));
		req.setFromVersionId(99L);
		assertEquals("복사할 라벨 버전을 찾을 수 없습니다", assertThrows(IllegalArgumentException.class, () -> service.newVersion("P1", req, "관리자")).getMessage());

		LabelVersionRequestVO rename = new LabelVersionRequestVO();
		assertEquals("버전 이름을 넣어주세요", assertThrows(IllegalArgumentException.class, () -> service.renameVersion(8L, rename)).getMessage());
		when(dao.selectVersionLabels("P1", 8L)).thenReturn(Arrays.asList("v1"));
		rename.setVersionLabel("2026 개정");
		rename.setNote("알러지 표기");
		service.renameVersion(8L, rename);
		verify(dao).updateVersionInfo(8L, "2026 개정", "알러지 표기");

		service.useVersion(8L);
		verify(dao).clearCurrent("P1");
		verify(dao).setCurrent(8L);
		verify(dao).copyVersionToProducts(8L);

		assertEquals("사용중인 버전은 지울 수 없습니다. 다른 버전을 사용중으로 지정한 뒤 지워주세요.",
				assertThrows(IllegalArgumentException.class, () -> service.deleteVersion(7L)).getMessage());
		when(labelDAO.countVersions("P1")).thenReturn(1);
		assertEquals("마지막 남은 버전은 지울 수 없습니다", assertThrows(IllegalArgumentException.class, () -> service.deleteVersion(8L)).getMessage());
		when(dao.selectVersionMeta(1L)).thenReturn(null);
		assertEquals("라벨 버전을 찾을 수 없습니다", assertThrows(IllegalArgumentException.class, () -> service.deleteVersion(1L)).getMessage());
	}

	@DisplayName("양식 저장: 이름 · 검사 · 중복, 크기 기본 100x150, 새로 만들면 번호")
	@Test
	void templates() throws Exception {
		LabelTemplateSaveVO t = new LabelTemplateSaveVO();
		assertEquals("양식 이름을 넣어주세요", assertThrows(IllegalArgumentException.class, () -> service.saveTemplate(null, t)).getMessage());
		t.setName("소스류");
		t.setLayout(json("{\"paper\":{\"w\":100},\"cols\":[50]}"));
		assertEquals("칸 폭 합계(50mm)가 종이 가로(100mm)와 다릅니다", assertThrows(IllegalArgumentException.class, () -> service.saveTemplate(null, t)).getMessage());
		t.setLayout(json(BASIC));
		when(dao.countTemplateName("소스류", null)).thenReturn(1);
		assertEquals("\"소스류\" 은 이미 있는 양식 이름이에요", assertThrows(IllegalArgumentException.class, () -> service.saveTemplate(null, t)).getMessage());
		when(dao.countTemplateName("소스류", null)).thenReturn(0);
		when(dao.insertTemplate(eq("소스류"), eq("100x150"), anyString(), anyString())).thenReturn(5L);
		assertEquals(5L, service.saveTemplate(null, t));
		assertEquals("양식을 찾을 수 없습니다", assertThrows(IllegalArgumentException.class, () -> service.saveTemplate(9L, t)).getMessage());
		when(dao.selectTemplateUsage(5L)).thenReturn(Arrays.<Map<String, Object>>asList(new HashMap<String, Object>(), new HashMap<String, Object>()));
		assertEquals(2, service.templateUsage(5L).get("count"));
	}

	@DisplayName("마크: 이름 · 30자 · 그림 종류 · 크기 · 중복, 폭은 1~100(없으면 9). 쓰는 라벨이 있으면 못 지움")
	@Test
	void marks() throws Exception {
		LabelMarkSaveVO m = new LabelMarkSaveVO();
		assertEquals("마크 이름을 넣어주세요", assertThrows(IllegalArgumentException.class, () -> service.addMark(m)).getMessage());
		m.setName("비닐류");
		m.setDataUrl("data:text/html;base64,AAA");
		assertEquals("PNG, JPG, GIF, SVG 그림만 넣을 수 있어요", assertThrows(IllegalArgumentException.class, () -> service.addMark(m)).getMessage());
		m.setDataUrl("data:image/png;base64," + new String(new char[400 * 1024]).replace('\0', 'A'));
		assertEquals("그림이 너무 큽니다. 400KB 이하로 줄여주세요", assertThrows(IllegalArgumentException.class, () -> service.addMark(m)).getMessage());
		m.setDataUrl("data:image/png;base64,AAAA");
		m.setWidthMm("250");
		when(dao.insertMark(eq("비닐류"), anyString(), eq(100.0), anyString())).thenReturn(3L);
		assertEquals(3L, service.addMark(m));
		m.setWidthMm(null);
		service.addMark(m);
		verify(dao).insertMark(eq("비닐류"), anyString(), eq(9.0), anyString());

		assertEquals("마크를 찾을 수 없습니다", assertThrows(IllegalArgumentException.class, () -> service.deleteMark(3L)).getMessage());
		when(dao.countMark(3L)).thenReturn(1);
		when(dao.countMarkUsage(3L)).thenReturn(2);
		assertEquals("이 마크를 쓰는 라벨이 2개 있어서 지울 수 없어요", assertThrows(IllegalArgumentException.class, () -> service.deleteMark(3L)).getMessage());
	}

	@DisplayName("항목: 이름 · 30자 · 중복, 양식에서 쓰면 양식 이름(3개까지)과 함께 막음")
	@Test
	void fields() throws Exception {
		assertEquals("항목 이름을 넣어주세요", assertThrows(IllegalArgumentException.class, () -> service.addField(" ")).getMessage());
		when(dao.countFieldName("유통전문판매원")).thenReturn(1);
		assertEquals("\"유통전문판매원\" 은 이미 있는 항목이에요", assertThrows(IllegalArgumentException.class, () -> service.addField("유통전문판매원")).getMessage());
		when(dao.selectFieldName(4L)).thenReturn("유통전문판매원");
		when(dao.selectTemplatesUsingField("유통전문판매원")).thenReturn(Arrays.asList("A", "B", "C", "D"));
		assertEquals("\"유통전문판매원\" 은 양식 4개에서 쓰고 있어서 지울 수 없어요 (A, B, C).",
				assertThrows(IllegalArgumentException.class, () -> service.deleteField(4L)).getMessage());
		assertEquals("항목을 찾을 수 없습니다", assertThrows(IllegalArgumentException.class, () -> service.deleteField(5L)).getMessage());
	}

	@DisplayName("목록 상태: 제품은 네 칸(식품유형·내용량·원재료·품목보고번호), 요청은 품목보고번호 빼고 세 칸")
	@Test
	void states() throws Exception {
		LabelProductRowVO done = new LabelProductRowVO();
		done.setFoodType("a");
		done.setNetWeight("b");
		done.setIngredientsText("c");
		done.setManufactureReportNo("d");
		LabelProductRowVO partial = new LabelProductRowVO();
		partial.setFoodType("a");
		when(dao.selectProducts("소스")).thenReturn(Arrays.asList(done, partial, new LabelProductRowVO()));
		List<LabelProductRowVO> rows = service.listProducts(" 소스 ");
		assertEquals(Arrays.asList("done", "partial", "none"), Arrays.asList(rows.get(0).getLabelState(), rows.get(1).getLabelState(), rows.get(2).getLabelState()));

		LabelRequestVO r = new LabelRequestVO();
		r.setFoodType("a");
		r.setNetWeight("b");
		r.setIngredientsText("c");
		when(dao.selectRequests("requested")).thenReturn(Collections.singletonList(r));
		assertEquals("done", service.listRequests("requested").get(0).getFillState());
	}

	@DisplayName("표시사항 요청: 옮긴 건은 못 고치고, 옮기면 빈 칸은 덮어쓰지 않으며 채운 칸 수를 알려준다")
	@Test
	void requests() throws Exception {
		Map<String, Object> moved = new HashMap<>();
		moved.put("moved", "P9");
		when(dao.selectRequestMoved(1L)).thenReturn(moved);
		assertEquals("이미 제품(P9)으로 옮긴 요청입니다. 라벨등록 탭에서 그 제품을 고쳐주세요.",
				assertThrows(IllegalArgumentException.class, () -> service.saveRequest(1L, new LabelContentVO(), "관리자")).getMessage());
		Map<String, Object> open = new HashMap<>();
		open.put("moved", "");
		when(dao.selectRequestMoved(2L)).thenReturn(open);
		LabelContentVO c = new LabelContentVO();
		c.setStatus("done");
		c.setLayout(json("{\"size\":\"100x150\"}"));
		assertEquals("done", service.saveRequest(2L, c, "관리자"));
		c.setStatus("x");
		assertEquals("requested", service.saveRequest(2L, c, "관리자"));

		assertEquals("어느 제품으로 옮길지 골라주세요", assertThrows(IllegalArgumentException.class, () -> service.moveRequest(2L, " ", "관리자")).getMessage());
		LabelRequestVO req = new LabelRequestVO();
		req.setFoodType("소스");
		req.setNetWeight("");
		req.setShelfLifeMonths(0);
		req.setLayoutJson("{\"size\": \"100x150\"}");
		when(dao.selectRequest(2L)).thenReturn(req);
		assertEquals("그런 제품코드가 없습니다", assertThrows(IllegalArgumentException.class, () -> service.moveRequest(2L, "P1", "관리자")).getMessage());
		when(dao.countProduct("P1")).thenReturn(1);
		when(labelDAO.countVersions("P1")).thenReturn(1);
		when(labelDAO.selectCurrentVersionId("P1")).thenReturn(7L);
		when(dao.selectVersionMeta(7L)).thenReturn(meta("P1", 1));
		Map<String, Object> result = service.moveRequest(2L, " P1 ", "관리자");
		assertEquals("P1", result.get("productCode"));
		assertEquals(2, result.get("copiedFields"));
		verify(dao).copyVersionToProducts(7L);
		verify(dao).markRequestMoved(eq(2L), eq("P1"), anyString(), eq("관리자"));
		req.setMovedProductCode("P1");
		assertEquals("이미 제품(P1)으로 옮겼습니다", assertThrows(IllegalArgumentException.class, () -> service.moveRequest(2L, "P1", "관리자")).getMessage());
		verify(dao, never()).deleteVersion(anyLong());
		verify(dao, never()).updateVersionContent(any());
	}
}

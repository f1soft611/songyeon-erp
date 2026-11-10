package egovframework.let.qm.haccp.prerequisite.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;

import com.fasterxml.jackson.databind.ObjectMapper;

import egovframework.let.qm.haccp.prerequisite.domain.model.SurveyChoiceInputVO;
import egovframework.let.qm.haccp.prerequisite.domain.model.SurveyChoicesSaveVO;
import egovframework.let.qm.haccp.prerequisite.domain.model.SurveyFormCreateResultVO;
import egovframework.let.qm.haccp.prerequisite.domain.model.SurveyFormDetailVO;
import egovframework.let.qm.haccp.prerequisite.domain.model.SurveyFormRowVO;
import egovframework.let.qm.haccp.prerequisite.domain.model.SurveyFormSaveVO;
import egovframework.let.qm.haccp.prerequisite.domain.model.SurveyItemSaveVO;
import egovframework.let.qm.haccp.prerequisite.domain.model.SurveyItemVO;
import egovframework.let.qm.haccp.prerequisite.domain.model.SurveyVersionVO;
import egovframework.let.qm.haccp.prerequisite.domain.repository.PrerequisiteDAO;

// HACCP(선행) 3단계 양식 만들기(2026-11-09). 송연 qsurvey.py create_form · update_form · _editable_version · save_choices · add_item · update_item · delete_item · move_item
class PrerequisiteFormServiceImplTest {

	private static final String SURVEY = "{\"choices\":[{\"label\":\"적합\",\"mark\":\"O\",\"score\":2},{\"label\":\"부적합\",\"mark\":\"X\",\"score\":0}],\"has_note\":1,\"has_defect\":0}";

	private PrerequisiteDAO dao;
	private PrerequisiteFormServiceImpl service;
	private final AtomicInteger ids = new AtomicInteger(500);

	@BeforeEach
	void setUp() throws Exception {
		dao = mock(PrerequisiteDAO.class);
		service = new PrerequisiteFormServiceImpl(dao, new ObjectMapper());
		doAnswer(inv -> {
			((SurveyItemVO) inv.getArgument(0)).setId(ids.incrementAndGet());
			return null;
		}).when(dao).insertItem(any());
		doAnswer(inv -> {
			((SurveyVersionVO) inv.getArgument(0)).setId(20);
			return null;
		}).when(dao).insertVersion(any());
		doAnswer(inv -> {
			((SurveyFormSaveVO) inv.getArgument(0)).setId(3);
			return null;
		}).when(dao).insertForm(any());
	}

	private static SurveyFormRowVO form(String bindType) {
		SurveyFormRowVO f = new SurveyFormRowVO();
		f.setId(1);
		f.setName("협력업체 자체 위생점검 평가표");
		f.setBindType(bindType);
		f.setCycle("연1회");
		f.setActive(1);
		f.setVersionId(10);
		f.setVersionLabel("1판");
		f.setSurveyJson(SURVEY);
		return f;
	}

	private static SurveyVersionVO version(int id, String label) {
		SurveyVersionVO v = new SurveyVersionVO();
		v.setId(id);
		v.setLabel(label);
		v.setSurveyJson(SURVEY);
		return v;
	}

	private static SurveyItemVO item(int id, Integer parentId, String kind, int sort, int versionId) {
		SurveyItemVO i = new SurveyItemVO();
		i.setId(id);
		i.setParentId(parentId);
		i.setRowKind(kind);
		i.setLabel("줄" + id);
		i.setSortOrder(sort);
		i.setVersionId(versionId);
		i.setFormId(1);
		i.setRequired(1);
		return i;
	}

	private static SurveyFormSaveVO save(String name, String bindType, String cycle, Integer copyFrom) {
		SurveyFormSaveVO s = new SurveyFormSaveVO();
		s.setName(name);
		s.setCategory("일반");
		s.setBindType(bindType);
		s.setCycle(cycle);
		s.setCopyFrom(copyFrom);
		return s;
	}

	private static SurveyItemSaveVO itemSave(String kind, String label, Integer afterId) {
		SurveyItemSaveVO s = new SurveyItemSaveVO();
		s.setRowKind(kind);
		s.setLabel(label);
		s.setTopic(" 건강검진 ");
		s.setRequired(true);
		s.setAfterId(afterId);
		return s;
	}

	private void current(int usedRecords) throws Exception {
		when(dao.selectSurveyForm(1)).thenReturn(form("client"));
		when(dao.selectCurrentVersion(1)).thenReturn(version(10, "1판"));
		when(dao.countRecordsByVersion(10)).thenReturn(usedRecords);
	}

	// ---------------------------------------------------------------- 서류

	@DisplayName("새 서류: 1판 · 기본 보기 4개(세부내역 · 부적합내역 칸), 만든 사람 사번")
	@Test
	void createForm() throws Exception {
		SurveyFormCreateResultVO out = service.createForm(save(" 월간 위생점검 ", "", "월1회", null), "2026001");
		assertEquals(3, out.getId());
		assertEquals(0, out.getCopied());
		ArgumentCaptor<SurveyFormSaveVO> f = ArgumentCaptor.forClass(SurveyFormSaveVO.class);
		verify(dao).insertForm(f.capture());
		assertEquals("월간 위생점검", f.getValue().getName());
		assertNull(f.getValue().getBindType());
		assertEquals("2026001", f.getValue().getCreatedBy());
		ArgumentCaptor<SurveyVersionVO> v = ArgumentCaptor.forClass(SurveyVersionVO.class);
		verify(dao).insertVersion(v.capture());
		assertEquals("1판", v.getValue().getLabel());
		assertEquals("새로 만듦", v.getValue().getMemo());
		assertTrue(v.getValue().getSurveyJson().contains("해당없음"));
		assertTrue(v.getValue().getSurveyJson().contains("\"has_note\":1"));
	}

	@DisplayName("새 서류: 질문 가져오기는 그 서류 지금 판의 보기와 줄을 묶음 관계째 베낀다")
	@Test
	void createFormCopy() throws Exception {
		when(dao.selectCurrentVersion(9)).thenReturn(version(90, "2판"));
		when(dao.selectItemsForCopy(90)).thenReturn(Arrays.asList(item(901, null, "group", 1, 90), item(902, 901, "single", 2, 90)));
		SurveyFormCreateResultVO out = service.createForm(save("새 평가표", "client", "연1회", 9), "2026001");
		assertEquals(2, out.getCopied());
		ArgumentCaptor<SurveyItemVO> rows = ArgumentCaptor.forClass(SurveyItemVO.class);
		verify(dao, times(2)).insertItem(rows.capture());
		assertEquals(Integer.valueOf(20), rows.getAllValues().get(0).getVersionId());
		assertNull(rows.getAllValues().get(0).getParentId());
		assertEquals(rows.getAllValues().get(0).getId(), rows.getAllValues().get(1).getParentId());
		verify(dao).updateVersionSurvey(20, SURVEY);
	}

	@DisplayName("서류 막기: 제목 없음 · 이름 겹침 · 대상 · 기간 잘못")
	@Test
	void createFormRejects() throws Exception {
		assertEquals("서류 제목을 적어주세요", assertThrows(IllegalArgumentException.class, () -> service.createForm(save(" ", "", "수시", null), "e")).getMessage());
		when(dao.countFormName("협력업체 자체 위생점검 평가표", null)).thenReturn(1);
		assertEquals("'협력업체 자체 위생점검 평가표' 은(는) 이미 있는 서류입니다",
				assertThrows(IllegalArgumentException.class, () -> service.createForm(save("협력업체 자체 위생점검 평가표", "", "수시", null), "e")).getMessage());
		assertEquals("무엇마다 쓰는 서류인지 잘못 왔습니다", assertThrows(IllegalArgumentException.class, () -> service.createForm(save("가", "lot", "수시", null), "e")).getMessage());
		assertEquals("기간을 '매일 / 주1회 / 월1회 / 분기1회 / 반기1회 / 연1회 / 수시' 중에서 골라주세요",
				assertThrows(IllegalArgumentException.class, () -> service.createForm(save("가", "", "격주", null), "e")).getMessage());
		verify(dao, never()).insertForm(any());
	}

	@DisplayName("서류 고치기: 쓴 장이 있으면 대상을 못 바꾼다. 기간은 바꿀 수 있다")
	@Test
	void updateForm() throws Exception {
		when(dao.selectSurveyForm(1)).thenReturn(form("client"));
		when(dao.countRecordsByForm(1)).thenReturn(3);
		assertEquals("이미 쓴 점검표가 있어 '대상' 은 바꿀 수 없습니다. 새 서류로 만들어주세요.",
				assertThrows(IllegalArgumentException.class, () -> service.updateForm(1, save("협력업체 자체 위생점검 평가표", "", "연1회", null))).getMessage());
		service.updateForm(1, save("협력업체 자체 위생점검 평가표", "client", "반기1회", null));
		ArgumentCaptor<SurveyFormSaveVO> f = ArgumentCaptor.forClass(SurveyFormSaveVO.class);
		verify(dao).updateForm(f.capture());
		assertEquals("반기1회", f.getValue().getCycle());
		assertEquals("client", f.getValue().getBindType());
		// 이름 겹침은 자기 서류를 빼고 센다(두 번 고쳤으므로 두 번)
		verify(dao, times(2)).countFormName("협력업체 자체 위생점검 평가표", 1);
		assertEquals("그런 서류가 없습니다", assertThrows(IllegalArgumentException.class, () -> service.updateForm(2, save("가", "", "수시", null))).getMessage());
	}

	@DisplayName("양식 한 벌: 보기 · 칸 · 줄 깊이 · 그 판으로 쓴 장 수")
	@Test
	void getForm() throws Exception {
		current(4);
		when(dao.selectItems(10)).thenReturn(new ArrayList<>(Arrays.asList(item(1, null, "group", 1, 10), item(2, 1, "single", 2, 10))));
		SurveyFormDetailVO d = service.getForm(1);
		assertEquals(4, d.getUsed());
		assertEquals(2, d.getChoices().size());
		assertTrue(d.isHasNote());
		assertFalse(d.isHasDefect());
		assertEquals(2, d.getFullMark());
		assertEquals(Integer.valueOf(1), d.getItems().get(1).getDepth());
		assertEquals(Integer.valueOf(1), d.getItems().get(0).getQuestions());
		assertEquals(7, d.getCycles().size());
	}

	// ---------------------------------------------------------------- 판

	@DisplayName("쓴 장이 없는 판은 그대로 고친다(새 판 안 뜸)")
	@Test
	void editableVersionUnused() throws Exception {
		current(0);
		when(dao.maxItemSort(10)).thenReturn(5);
		service.addItem(1, itemSave("single", "새 질문", null), "2026001");
		verify(dao, never()).insertVersion(any());
		ArgumentCaptor<SurveyItemVO> row = ArgumentCaptor.forClass(SurveyItemVO.class);
		verify(dao).insertItem(row.capture());
		assertEquals(Integer.valueOf(10), row.getValue().getVersionId());
		assertEquals(Integer.valueOf(6), row.getValue().getSortOrder());
		assertNull(row.getValue().getParentId());
		assertEquals("건강검진", row.getValue().getTopic());
		assertEquals("choice", row.getValue().getAnswerType());
	}

	@DisplayName("쓴 장이 있는 판을 고치면 새 판(N+1판)을 뜨고 줄을 베낀 뒤, 옛 줄 번호를 같은 자리 줄로 찾아 그 밑에 넣는다")
	@Test
	void editableVersionUsed() throws Exception {
		current(3);
		when(dao.countVersions(1)).thenReturn(1);
		when(dao.selectItemsForCopy(10)).thenReturn(Arrays.asList(item(101, null, "group", 1, 10), item(102, 101, "single", 2, 10)));
		// 화면이 들고 있던 옛 줄 102(자리 2) → 새 판 같은 자리 줄
		when(dao.selectItem(102)).thenReturn(item(102, 101, "single", 2, 10));
		when(dao.selectItemIdBySort(20, 2)).thenReturn(502);
		when(dao.selectItem(502)).thenReturn(item(502, 501, "single", 2, 20));

		service.addItem(1, itemSave("single", "새 질문", 102), "2026001");

		ArgumentCaptor<SurveyVersionVO> v = ArgumentCaptor.forClass(SurveyVersionVO.class);
		InOrder order = inOrder(dao);
		order.verify(dao).clearCurrentVersion(1);
		order.verify(dao).insertVersion(v.capture());
		assertEquals("2판", v.getValue().getLabel());
		assertEquals("점검표 3장을 쓴 뒤 고침", v.getValue().getMemo());
		assertEquals(SURVEY, v.getValue().getSurveyJson());
		order.verify(dao).shiftItemsAfter(20, 2);
		ArgumentCaptor<SurveyItemVO> rows = ArgumentCaptor.forClass(SurveyItemVO.class);
		verify(dao, times(3)).insertItem(rows.capture());
		SurveyItemVO added = rows.getAllValues().get(2);
		assertEquals(Integer.valueOf(20), added.getVersionId());
		assertEquals(Integer.valueOf(3), added.getSortOrder());
		// 질문 밑에 넣으면 그 질문과 형제(같은 묶음)
		assertEquals(Integer.valueOf(501), added.getParentId());
	}

	@DisplayName("줄 넣기: 묶음 밑에 넣으면 그 묶음 안으로. 본문이 비면 막는다")
	@Test
	void addItemIntoGroup() throws Exception {
		current(0);
		when(dao.selectItem(7)).thenReturn(item(7, null, "group", 4, 10));
		service.addItem(1, itemSave("group", "2 위생관리", 7), "e");
		ArgumentCaptor<SurveyItemVO> row = ArgumentCaptor.forClass(SurveyItemVO.class);
		verify(dao).insertItem(row.capture());
		assertEquals(Integer.valueOf(7), row.getValue().getParentId());
		assertEquals(Integer.valueOf(5), row.getValue().getSortOrder());
		assertNull(row.getValue().getAnswerType());
		assertNull(row.getValue().getTopic());
		assertEquals("묶음 이름을 적어주세요", assertThrows(IllegalArgumentException.class, () -> service.addItem(1, itemSave("group", " ", null), "e")).getMessage());
		assertEquals("질문을 적어주세요", assertThrows(IllegalArgumentException.class, () -> service.addItem(1, itemSave("single", "", null), "e")).getMessage());
		assertEquals("질문인지 묶음인지 잘못 왔습니다", assertThrows(IllegalArgumentException.class, () -> service.addItem(1, itemSave("note", "가", null), "e")).getMessage());
	}

	@DisplayName("줄 고치기: 본문 · 관리항목 · 필수 여부. 본문이 비면 막고, 없는 줄은 '그런 줄이 없습니다'")
	@Test
	void updateItem() throws Exception {
		current(0);
		when(dao.selectItem(2)).thenReturn(item(2, 1, "single", 2, 10));
		SurveyItemSaveVO s = itemSave("single", " 고친 질문 ", null);
		s.setRequired(false);
		service.updateItem(2, s, "e");
		verify(dao).updateItem(2, "고친 질문", "건강검진", 0);
		assertEquals("내용을 적어주세요", assertThrows(IllegalArgumentException.class, () -> service.updateItem(2, itemSave("single", " ", null), "e")).getMessage());
		assertEquals("그런 줄이 없습니다", assertThrows(IllegalArgumentException.class, () -> service.updateItem(99, itemSave("single", "가", null), "e")).getMessage());
	}

	@DisplayName("줄 지우기: 묶음이면 안의 줄까지, 아래 것부터 지운다")
	@Test
	void deleteItem() throws Exception {
		current(0);
		when(dao.selectItem(1)).thenReturn(item(1, null, "group", 1, 10));
		when(dao.selectChildIds(1)).thenReturn(Arrays.asList(2, 3));
		when(dao.selectChildIds(2)).thenReturn(Collections.singletonList(4));
		assertEquals(4, service.deleteItem(1, "e"));
		InOrder order = inOrder(dao);
		order.verify(dao).deleteItem(4);
		order.verify(dao).deleteItem(1);
		verify(dao, times(4)).deleteItem(anyInt());
	}

	@DisplayName("줄 옮기기: 같은 묶음 형제끼리만, 묶음은 딸린 줄을 데리고 통째로. 끝이면 안 옮긴다")
	@Test
	void moveItem() throws Exception {
		current(0);
		// 형제: 묶음 A(1, 자리 1, 딸린 질문 2 자리 2) · 묶음 B(3, 자리 3, 딸린 질문 4 자리 4)
		when(dao.selectItem(3)).thenReturn(item(3, null, "group", 3, 10));
		when(dao.selectItem(1)).thenReturn(item(1, null, "group", 1, 10));
		when(dao.selectItem(2)).thenReturn(item(2, 1, "single", 2, 10));
		when(dao.selectItem(4)).thenReturn(item(4, 3, "single", 4, 10));
		when(dao.selectSiblings(eq(10), isNull())).thenReturn(Arrays.asList(item(1, null, "group", 1, 10), item(3, null, "group", 3, 10)));
		when(dao.selectChildIds(1)).thenReturn(Collections.singletonList(2));
		when(dao.selectChildIds(3)).thenReturn(Collections.singletonList(4));

		assertTrue(service.moveItem(3, "up", "e"));
		verify(dao).updateItemSort(3, 1);
		verify(dao).updateItemSort(4, 2);
		verify(dao).updateItemSort(1, 3);
		verify(dao).updateItemSort(2, 4);

		assertFalse(service.moveItem(1, "up", "e"));
	}

	// ---------------------------------------------------------------- 보기

	@DisplayName("보기 저장: 이름 빈 줄은 버리고, 점수는 숫자 · 빈칸. 겹치는 이름 · 숫자 아닌 점수 · 하나도 없음은 막는다")
	@Test
	void saveChoices() throws Exception {
		current(0);
		SurveyChoicesSaveVO s = new SurveyChoicesSaveVO();
		s.setChoices(new ArrayList<>(Arrays.asList(choice("적합", "O", "2"), choice(" ", "", ""), choice("해당없음", "N/A", ""))));
		s.setHasNote(true);
		s.setHasDefect(false);
		assertEquals(10, service.saveChoices(1, s, "e"));
		ArgumentCaptor<String> json = ArgumentCaptor.forClass(String.class);
		verify(dao).updateVersionSurvey(eq(10), json.capture());
		assertEquals("{\"choices\":[{\"label\":\"적합\",\"mark\":\"O\",\"score\":2},{\"label\":\"해당없음\",\"mark\":\"N/A\",\"score\":null}],\"has_note\":1,\"has_defect\":0}", json.getValue());

		s.setChoices(Arrays.asList(choice("적합", "O", "2"), choice("적합", "X", "0")));
		assertEquals("'적합' 이(가) 두 번 있습니다. 고를 답은 서로 달라야 합니다.", assertThrows(IllegalArgumentException.class, () -> service.saveChoices(1, s, "e")).getMessage());
		s.setChoices(Collections.singletonList(choice("적합", "O", "두점")));
		assertEquals("'적합' 의 점수는 숫자로 적어주세요", assertThrows(IllegalArgumentException.class, () -> service.saveChoices(1, s, "e")).getMessage());
		s.setChoices(Collections.singletonList(choice(" ", "", "")));
		assertEquals("고를 답을 하나 이상 적어주세요", assertThrows(IllegalArgumentException.class, () -> service.saveChoices(1, s, "e")).getMessage());
		verify(dao, times(1)).updateVersionSurvey(anyInt(), anyString());
	}

	private static SurveyChoiceInputVO choice(String label, String mark, String score) {
		SurveyChoiceInputVO c = new SurveyChoiceInputVO();
		c.setLabel(label);
		c.setMark(mark);
		c.setScore(score);
		return c;
	}

	@DisplayName("목록: 만점 = 질문 수 × 최고 점수(점수 없는 양식은 비움)")
	@Test
	void listForms() throws Exception {
		SurveyFormRowVO f = form("client");
		f.setQuestions(91);
		when(dao.selectForms()).thenReturn(Collections.singletonList(f));
		List<SurveyFormRowVO> out = service.listForms();
		assertEquals(Integer.valueOf(182), out.get(0).getScoreMax());
		assertNull(out.get(0).getSurveyJson());
	}
}

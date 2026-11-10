package egovframework.let.qm.haccp.prerequisite.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import com.fasterxml.jackson.databind.ObjectMapper;

import egovframework.let.qm.haccp.prerequisite.domain.model.SurveyAnswerInputVO;
import egovframework.let.qm.haccp.prerequisite.domain.model.SurveyAnswerVO;
import egovframework.let.qm.haccp.prerequisite.domain.model.SurveyClientVO;
import egovframework.let.qm.haccp.prerequisite.domain.model.SurveyFormRowVO;
import egovframework.let.qm.haccp.prerequisite.domain.model.SurveyItemVO;
import egovframework.let.qm.haccp.prerequisite.domain.model.SurveyMissingVO;
import egovframework.let.qm.haccp.prerequisite.domain.model.SurveyRecordVO;
import egovframework.let.qm.haccp.prerequisite.domain.model.SurveySaveRequestVO;
import egovframework.let.qm.haccp.prerequisite.domain.model.SurveySaveResultVO;
import egovframework.let.qm.haccp.prerequisite.domain.model.SurveySheetVO;
import egovframework.let.qm.haccp.prerequisite.domain.repository.PrerequisiteDAO;
import egovframework.let.qm.haccp.prerequisite.service.SurveyPeriod;
import egovframework.let.qm.haccp.prerequisite.service.SurveyRecordConflictException;

// HACCP(선행) 2단계(2026-11-09). 송연 qsurvey.py 의 규칙: 기간 · 한 기간 한 장 · 점수 · 거래처 · 안 쓴 기간
class PrerequisiteServiceImplTest {

	private static final String SURVEY = "{\"choices\":[{\"label\":\"적합\",\"mark\":\"O\",\"score\":2},{\"label\":\"미흡\",\"mark\":\"△\",\"score\":1},"
			+ "{\"label\":\"부적합\",\"mark\":\"X\",\"score\":0},{\"label\":\"해당없음\",\"mark\":\"N/A\",\"score\":2}],\"has_note\":1,\"has_defect\":1}";

	private PrerequisiteDAO dao;
	private PrerequisiteServiceImpl service;

	@BeforeEach
	void setUp() {
		dao = mock(PrerequisiteDAO.class);
		service = new PrerequisiteServiceImpl(dao, new ObjectMapper());
	}

	private static SurveyFormRowVO form(String bindType, String cycle, int active) {
		SurveyFormRowVO f = new SurveyFormRowVO();
		f.setId(1);
		f.setName("협력업체 자체 위생점검 평가표");
		f.setCategory("외부감사");
		f.setBindType(bindType);
		f.setCycle(cycle);
		f.setActive(active);
		f.setVersionId(10);
		f.setVersionLabel("1판");
		f.setSurveyJson(SURVEY);
		return f;
	}

	private static SurveyItemVO item(int id, Integer parentId, String kind, int required) {
		SurveyItemVO i = new SurveyItemVO();
		i.setId(id);
		i.setParentId(parentId);
		i.setRowKind(kind);
		i.setLabel("줄" + id);
		i.setRequired(required);
		i.setSortOrder(id);
		return i;
	}

	private static List<SurveyItemVO> items() {
		return new ArrayList<>(Arrays.asList(item(100, null, "group", 1), item(101, 100, "group", 1), item(102, 101, "single", 1), item(103, 101, "single", 1), item(104, 100, "single", 0)));
	}

	private static SurveyRecordVO rec(int id, String status, String docDate) {
		SurveyRecordVO r = new SurveyRecordVO();
		r.setId(id);
		r.setStatus(status);
		r.setDocDate(docDate);
		return r;
	}

	private static SurveyAnswerInputVO answer(String value, String note, String defect) {
		SurveyAnswerInputVO a = new SurveyAnswerInputVO();
		a.setValue(value);
		a.setNote(note);
		a.setDefect(defect);
		return a;
	}

	private SurveySaveRequestVO request(String docDate, String clientCode, Map<String, SurveyAnswerInputVO> answers) {
		SurveySaveRequestVO r = new SurveySaveRequestVO();
		r.setFormId(1);
		r.setDocDate(docDate);
		r.setClientCode(clientCode);
		r.setAnswers(answers);
		return r;
	}

	private void clientForm() throws Exception {
		when(dao.selectSurveyForm(1)).thenReturn(form("client", "연1회", 1));
		when(dao.selectItems(10)).thenReturn(items());
		SurveyClientVO c = new SurveyClientVO();
		c.setId(7);
		c.setClientCode("000007");
		c.setName("송연상회");
		when(dao.selectClientByCode("000007")).thenReturn(c);
	}

	// ---------------------------------------------------------------- 기간

	@DisplayName("기간: 주1회는 ISO 주차(월~일), 월 · 분기 · 반기 · 연, 매일은 그날, 수시 · 잘못된 날짜는 없음")
	@Test
	void period() {
		assertEquals(Arrays.asList("2026-11-02", "2026-11-08", "2026년 45주차 (11.2~11.8)"), SurveyPeriod.of("주1회", "2026-11-06").asList());
		assertEquals(Arrays.asList("2026-12-28", "2027-01-03", "2026년 53주차 (12.28~1.3)"), SurveyPeriod.of("주1회", "2027-01-01").asList());
		assertEquals(Arrays.asList("2026-02-01", "2026-02-28", "2026년 2월"), SurveyPeriod.of("월1회", "2026-02-10").asList());
		assertEquals(Arrays.asList("2026-10-01", "2026-12-31", "2026년 4분기"), SurveyPeriod.of("분기1회", "2026-11-06").asList());
		assertEquals(Arrays.asList("2026-07-01", "2026-12-31", "2026년 하반기"), SurveyPeriod.of("반기1회", "2026-11-06").asList());
		assertEquals(Arrays.asList("2026-01-01", "2026-12-31", "2026년"), SurveyPeriod.of("연1회", "2026-11-06").asList());
		assertEquals(Arrays.asList("2026-11-06", "2026-11-06", "2026-11-06"), SurveyPeriod.of("매일", "2026-11-06").asList());
		assertNull(SurveyPeriod.of("수시", "2026-11-06"));
		assertNull(SurveyPeriod.of("주1회", "2026-13-40"));
	}

	@DisplayName("최근 기간 n개: 오늘이 든 기간부터 거슬러")
	@Test
	void periodsBack() {
		List<SurveyPeriod> back = SurveyPeriod.back("월1회", 3, LocalDate.of(2026, 1, 15));
		assertEquals(Arrays.asList("2026년 1월", "2025년 12월", "2025년 11월"), Arrays.asList(back.get(0).getLabel(), back.get(1).getLabel(), back.get(2).getLabel()));
	}

	// ---------------------------------------------------------------- 빈 점검표

	@DisplayName("빈 점검표: 보기 · 점수 양식 · 만점, 줄 깊이와 묶음 질문 수, 거래처, 그 기간에 이미 쓴 장")
	@Test
	void blank() throws Exception {
		clientForm();
		when(dao.selectRecordInPeriod(1, 7, "2026-01-01", "2026-12-31")).thenReturn(rec(55, "작성중", "2026-03-02"));

		SurveySheetVO s = service.blank(1, "2026-11-06", "000007");
		assertEquals(4, s.getChoices().size());
		assertTrue(s.isScoring());
		assertEquals(2, s.getFullMark());
		assertTrue(s.isHasNote());
		assertEquals("2026년", s.getPeriod());
		assertEquals("송연상회", s.getBindName());
		assertEquals(Integer.valueOf(7), s.getBindId());
		assertEquals(Arrays.asList(0, 1, 2, 2, 1), Arrays.asList(s.getItems().get(0).getDepth(), s.getItems().get(1).getDepth(), s.getItems().get(2).getDepth(), s.getItems().get(3).getDepth(), s.getItems().get(4).getDepth()));
		assertEquals(Integer.valueOf(3), s.getItems().get(0).getQuestions());
		assertEquals(Integer.valueOf(2), s.getItems().get(1).getQuestions());
		assertEquals(Integer.valueOf(55), s.getExistingId());
		assertEquals("2026-03-02", s.getExistingDate());
	}

	@DisplayName("빈 점검표 막기: 없는 서류 · 내려둔 서류 · 거래처 안 고름 · 없는 거래처")
	@Test
	void blankRejects() throws Exception {
		assertEquals("그런 서류가 없습니다", assertThrows(IllegalArgumentException.class, () -> service.blank(1, "2026-11-06", null)).getMessage());
		when(dao.selectSurveyForm(1)).thenReturn(form("client", "연1회", 0));
		assertEquals("'협력업체 자체 위생점검 평가표' 은(는) 내려둔 서류입니다", assertThrows(IllegalArgumentException.class, () -> service.blank(1, "2026-11-06", null)).getMessage());
		when(dao.selectSurveyForm(1)).thenReturn(form("client", "연1회", 1));
		assertEquals("어느 거래처를 점검했는지 골라주세요", assertThrows(IllegalArgumentException.class, () -> service.blank(1, "2026-11-06", " ")).getMessage());
		assertEquals("그런 거래처가 없습니다", assertThrows(IllegalArgumentException.class, () -> service.blank(1, "2026-11-06", "999999")).getMessage());
	}

	@DisplayName("수시 · 날짜마다 서류는 같은 날짜 장만 이미 쓴 장으로 본다")
	@Test
	void blankAnytime() throws Exception {
		when(dao.selectSurveyForm(1)).thenReturn(form(null, "수시", 1));
		when(dao.selectItems(10)).thenReturn(items());
		service.blank(1, "2026-11-06", null);
		verify(dao).selectRecordOnDate(1, 0, "2026-11-06");
		verify(dao, never()).selectRecordInPeriod(anyInt(), anyInt(), any(), any());
	}

	// ---------------------------------------------------------------- 임시저장

	@DisplayName("임시저장: 점수는 서버가 센다(만점 = 답한 질문 × 최고 점수, 부적합 = 0점 보기). 빈 답 · 다른 판의 줄은 버린다")
	@Test
	void saveNew() throws Exception {
		clientForm();
		Map<String, SurveyAnswerInputVO> answers = new LinkedHashMap<>();
		answers.put("102", answer("부적합", null, "손 세척대 없음"));
		answers.put("103", answer("미흡", "", ""));
		answers.put("104", answer("", " ", null));
		answers.put("999", answer("적합", null, null));
		answers.put("100", answer("적합", null, null));
		doAnswerInsertId();

		SurveySaveResultVO out = service.save(request("2026-11-06", "000007", answers), "2026001");
		assertEquals(1, out.getScore());
		assertEquals(4, out.getScoreMax());
		assertEquals(2, out.getAnswered());
		assertEquals(1, out.getBad());
		assertEquals("작성중", out.getStatus());

		ArgumentCaptor<SurveyRecordVO> saved = ArgumentCaptor.forClass(SurveyRecordVO.class);
		verify(dao).insertRecord(saved.capture());
		assertEquals("client", saved.getValue().getBindType());
		assertEquals(Integer.valueOf(7), saved.getValue().getBindId());
		assertEquals(Integer.valueOf(10), saved.getValue().getVersionId());
		assertEquals("2026001", saved.getValue().getWrittenBy());
		assertEquals("작성중", saved.getValue().getStatus());

		ArgumentCaptor<SurveyAnswerVO> rows = ArgumentCaptor.forClass(SurveyAnswerVO.class);
		verify(dao, org.mockito.Mockito.times(2)).insertAnswer(rows.capture());
		assertEquals(Arrays.asList(102, 103), Arrays.asList(rows.getAllValues().get(0).getItemId(), rows.getAllValues().get(1).getItemId()));
		assertEquals("손 세척대 없음", rows.getAllValues().get(0).getDefect());
		assertNull(rows.getAllValues().get(1).getNote());
	}

	private void doAnswerInsertId() throws Exception {
		org.mockito.Mockito.doAnswer(inv -> {
			((SurveyRecordVO) inv.getArgument(0)).setId(77);
			return null;
		}).when(dao).insertRecord(any());
	}

	@DisplayName("임시저장: 같은 기간 · 같은 날 장은 그 장을 고친다(답을 모두 지우고 다시 넣는다)")
	@Test
	void saveSameDay() throws Exception {
		clientForm();
		when(dao.selectRecordInPeriod(1, 7, "2026-01-01", "2026-12-31")).thenReturn(rec(55, "작성중", "2026-11-06"));
		Map<String, SurveyAnswerInputVO> answers = Collections.singletonMap("102", answer("적합", null, null));

		SurveySaveResultVO out = service.save(request("2026-11-06", "000007", answers), "2026001");
		assertEquals(55, out.getId());
		verify(dao).updateRecord(any());
		verify(dao).deleteAnswers(55);
		verify(dao, never()).insertRecord(any());
	}

	@DisplayName("임시저장 막기: 같은 기간 다른 날 장(그 장 번호 · 날짜) · 반려 장은 고칠 수 있음 · 승인 · 검토대기")
	@Test
	void saveConflicts() throws Exception {
		clientForm();
		Map<String, SurveyAnswerInputVO> answers = Collections.singletonMap("102", answer("적합", null, null));

		when(dao.selectRecordInPeriod(1, 7, "2026-01-01", "2026-12-31")).thenReturn(rec(55, "작성중", "2026-03-02"));
		SurveyRecordConflictException ex = assertThrows(SurveyRecordConflictException.class, () -> service.save(request("2026-11-06", "000007", answers), "2026001"));
		assertEquals("2026년 점검표는 2026-03-02 에 이미 썼습니다. 연1회 짜리 서류는 한 기간에 한 장이라, 그 장을 열어 고쳐주세요.", ex.getMessage());
		assertEquals(Integer.valueOf(55), ex.getExistingId());
		assertEquals("2026-03-02", ex.getExistingDate());
		assertFalse(ex.isInReview());

		when(dao.selectRecordInPeriod(1, 7, "2026-01-01", "2026-12-31")).thenReturn(rec(55, "승인", "2026-11-06"));
		assertEquals("이미 승인된 점검표입니다. 고치려면 검토자가 먼저 승인을 거둬야 합니다.", assertThrows(IllegalArgumentException.class, () -> service.save(request("2026-11-06", "000007", answers), "2026001")).getMessage());

		when(dao.selectRecordInPeriod(1, 7, "2026-01-01", "2026-12-31")).thenReturn(rec(55, "검토대기", "2026-11-06"));
		SurveyRecordConflictException review = assertThrows(SurveyRecordConflictException.class, () -> service.save(request("2026-11-06", "000007", answers), "2026001"));
		assertEquals("결재에 올라가 있는 점검표입니다. 고치려면 결재자가 돌려보내야 합니다.", review.getMessage());
		assertTrue(review.isInReview());
		verify(dao, never()).updateRecord(any());
	}

	@DisplayName("임시저장 막기: 점검일 없음 · 그 판의 보기가 아닌 답")
	@Test
	void saveRejects() throws Exception {
		clientForm();
		assertEquals("점검일을 골라주세요", assertThrows(IllegalArgumentException.class, () -> service.save(request(" ", "000007", null), "2026001")).getMessage());
		Map<String, SurveyAnswerInputVO> answers = Collections.singletonMap("102", answer("아주좋음", null, null));
		assertEquals("'아주좋음' 은(는) 이 서류에서 고를 수 없는 답입니다", assertThrows(IllegalArgumentException.class, () -> service.save(request("2026-11-06", "000007", answers), "2026001")).getMessage());
		verify(dao, never()).insertRecord(any());
	}

	// ---------------------------------------------------------------- 쓴 장 · 목록

	@DisplayName("쓴 장 한 장: 그때의 판 · 답 · 기간 이름 · 거래처")
	@Test
	void getRecord() throws Exception {
		SurveyRecordVO r = rec(55, "작성중", "2026-11-06");
		r.setFormId(1);
		r.setVersionId(10);
		r.setFormName("협력업체 자체 위생점검 평가표");
		r.setCycle("연1회");
		r.setBindType("client");
		r.setBindId(7);
		r.setBindName("송연상회");
		r.setClientCode("000007");
		r.setVersionLabel("1판");
		r.setSurveyJson(SURVEY);
		r.setScore(1);
		r.setScoreMax(4);
		when(dao.selectRecord(55)).thenReturn(r);
		when(dao.selectItems(10)).thenReturn(items());
		SurveyAnswerVO a = new SurveyAnswerVO();
		a.setItemId(102);
		a.setValueText("부적합");
		a.setDefect("손 세척대 없음");
		when(dao.selectAnswers(55)).thenReturn(Collections.singletonList(a));

		SurveySheetVO s = service.getRecord(55);
		assertEquals(Integer.valueOf(55), s.getRecordId());
		assertEquals("2026년", s.getPeriod());
		assertEquals("송연상회", s.getBindName());
		assertEquals("000007", s.getClientCode());
		assertEquals("부적합", s.getAnswers().get("102").getValue());
		assertEquals("손 세척대 없음", s.getAnswers().get("102").getDefect());
		assertEquals("그런 점검표가 없습니다", assertThrows(IllegalArgumentException.class, () -> service.getRecord(9)).getMessage());
	}

	@DisplayName("목록: 기간은 둘 다 있을 때만, 줄마다 기간 이름(수시는 비움)")
	@Test
	void listRecords() throws Exception {
		SurveyRecordVO a = rec(1, "작성중", "2026-11-06");
		a.setCycle("주1회");
		SurveyRecordVO b = rec(2, "작성중", "2026-11-05");
		b.setCycle("수시");
		when(dao.selectRecords(any(), any(), any())).thenReturn(Arrays.asList(a, b));
		List<SurveyRecordVO> rows = service.listRecords("2026-11-01", " ", null);
		verify(dao).selectRecords(null, null, null);
		assertEquals("2026년 45주차 (11.2~11.8)", rows.get(0).getPeriod());
		assertEquals("", rows.get(1).getPeriod());
	}

	// ---------------------------------------------------------------- 안 쓴 기간

	@DisplayName("안 쓴 기간: 날짜마다 서류는 최근 기간 중 한 장도 없는 기간, 거래처마다 서류는 지난 기간에 평가한 업체 중 이번 기간에 빠진 곳")
	@Test
	void missing() throws Exception {
		SurveyFormRowVO byDate = form(null, "월1회", 1);
		byDate.setId(2);
		byDate.setName("월간 위생점검");
		SurveyFormRowVO byClient = form("client", "연1회", 1);
		when(dao.selectMissingForms()).thenReturn(Arrays.asList(byDate, byClient));
		// 날짜마다: 최근 6개월 중 2026년 10월에만 썼다
		when(dao.countRecordsBetween(eq(2), any(), any())).thenReturn(0);
		when(dao.countRecordsBetween(2, "2026-10-01", "2026-10-31")).thenReturn(1);
		// 거래처마다: 작년에 7 · 8, 올해 7
		when(dao.selectBindIdsBefore(1, "2026-01-01")).thenReturn(Arrays.asList(7, 8));
		when(dao.selectBindIdsBetween(1, "2026-01-01", "2026-12-31")).thenReturn(Collections.singletonList(7));
		when(dao.selectClientName(8)).thenReturn("갑성식품");

		List<SurveyMissingVO> out = service.missingAt(LocalDate.of(2026, 11, 9));
		assertEquals(2, out.size());
		assertEquals("월간 위생점검", out.get(0).getFormName());
		assertEquals(5, out.get(0).getRows().size());
		assertEquals("2026년 11월", out.get(0).getRows().get(0).getLabel());
		assertEquals(1, out.get(1).getRows().size());
		assertEquals("갑성식품", out.get(1).getRows().get(0).getLabel());
		assertEquals("2026년", out.get(1).getRows().get(0).getPeriod());
		assertEquals(Integer.valueOf(8), out.get(1).getRows().get(0).getClientId());
	}
}

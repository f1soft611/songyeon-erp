package egovframework.let.system.screenreview.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;

import egovframework.let.system.screenreview.domain.model.ScreenReviewDraftVO;
import egovframework.let.system.screenreview.domain.model.ScreenReviewSaveVO;
import egovframework.let.system.screenreview.domain.model.ScreenReviewSummaryVO;
import egovframework.let.system.screenreview.domain.model.ScreenReviewVO;
import egovframework.let.system.screenreview.domain.repository.ScreenReviewDAO;

class ScreenReviewServiceImplTest {

	private static final LocalDate TODAY = LocalDate.of(2026, 11, 2);
	// 검수자 · 작성자는 사번(employees.id)
	private static final String EMP = "00000005";

	private static ScreenReviewServiceImpl service(ScreenReviewDAO dao) {
		return new ScreenReviewServiceImpl(dao) {
			@Override
			LocalDate today() {
				return TODAY;
			}
		};
	}

	private static ScreenReviewDAO dao(String currentStatus, String requestDate) throws Exception {
		ScreenReviewDAO dao = mock(ScreenReviewDAO.class);
		when(dao.selectMenuId(anyMap())).thenReturn(147L);
		ScreenReviewVO current = new ScreenReviewVO();
		current.setReviewId(9L);
		current.setReviewStatus(currentStatus);
		current.setRequestDate(requestDate);
		when(dao.selectReviewForUpdate(anyMap())).thenReturn(current);
		when(dao.insertHistory(anyMap())).thenReturn(31L);
		return dao;
	}

	private static ScreenReviewSaveVO payload(String status, String expected, String comment) {
		ScreenReviewSaveVO v = new ScreenReviewSaveVO();
		v.setStatus(status);
		v.setExpectedStatus(expected);
		v.setReviewComment(comment);
		return v;
	}

	@SuppressWarnings("unchecked")
	private static Map<String, Object> captured(ScreenReviewDAO dao, String method) throws Exception {
		ArgumentCaptor<Map<String, Object>> captor = ArgumentCaptor.forClass(Map.class);
		if ("update".equals(method)) {
			verify(dao).updateReview(captor.capture());
		} else {
			verify(dao).insertHistory(captor.capture());
		}
		return captor.getValue();
	}

	private static String message(ScreenReviewServiceImpl service, ScreenReviewSaveVO v) {
		return assertThrows(IllegalArgumentException.class, () -> service.save(1L, "BSBoxTypeView", EMP, v)).getMessage();
	}

	@DisplayName("흐름: 미검수→수정요청/검수완료, 수정요청→검수진행중, 검수진행중→검수완료/수정요청, 검수완료→수정요청, 그대로 두기는 언제나")
	@Test
	void canChoose_followsFlow() {
		assertTrue(ScreenReviewServiceImpl.canChoose("NOT_STARTED", "CHANGE_REQUESTED"));
		assertTrue(ScreenReviewServiceImpl.canChoose("NOT_STARTED", "COMPLETED"));
		assertFalse(ScreenReviewServiceImpl.canChoose("NOT_STARTED", "IN_PROGRESS"));
		assertTrue(ScreenReviewServiceImpl.canChoose("CHANGE_REQUESTED", "IN_PROGRESS"));
		assertFalse(ScreenReviewServiceImpl.canChoose("CHANGE_REQUESTED", "COMPLETED"));
		assertTrue(ScreenReviewServiceImpl.canChoose("IN_PROGRESS", "COMPLETED"));
		assertTrue(ScreenReviewServiceImpl.canChoose("IN_PROGRESS", "CHANGE_REQUESTED"));
		assertTrue(ScreenReviewServiceImpl.canChoose("COMPLETED", "CHANGE_REQUESTED"));
		assertFalse(ScreenReviewServiceImpl.canChoose("COMPLETED", "IN_PROGRESS"));
		assertTrue(ScreenReviewServiceImpl.canChoose("COMPLETED", "COMPLETED"));
	}

	@DisplayName("수정요청으로 바꾸면 오늘이 요청일, 검수자 · 검수일은 로그인 사용자 · 오늘, 이력 번호를 돌려준다")
	@Test
	void save_changeRequestSetsRequestDate() throws Exception {
		ScreenReviewDAO dao = dao("NOT_STARTED", null);
		Long historyId = service(dao).save(1L, "BSBoxTypeView", EMP, payload("CHANGE_REQUESTED", "NOT_STARTED", "  단가 칸 확인  "));
		assertEquals(31L, historyId);
		Map<String, Object> update = captured(dao, "update");
		assertEquals("CHANGE_REQUESTED", update.get("status"));
		assertEquals("2026-11-02", update.get("requestDate"));
		assertEquals("2026-11-02", update.get("reviewDate"));
		assertEquals(EMP, update.get("empId"));
		assertEquals(EMP, captured(dao, "history").get("empId"));
		Map<String, Object> history = captured(dao, "history");
		assertEquals("NOT_STARTED", history.get("fromStatus"));
		assertEquals("CHANGE_REQUESTED", history.get("toStatus"));
		assertEquals("단가 칸 확인", history.get("reviewComment"));
	}

	@DisplayName("수정요청 → 검수진행중이면 요청일은 그대로")
	@Test
	void save_inProgressKeepsRequestDate() throws Exception {
		ScreenReviewDAO dao = dao("CHANGE_REQUESTED", "2026-10-30");
		service(dao).save(1L, "BSBoxTypeView", EMP, payload("IN_PROGRESS", "CHANGE_REQUESTED", ""));
		Map<String, Object> update = captured(dao, "update");
		assertEquals("IN_PROGRESS", update.get("status"));
		assertEquals("2026-10-30", update.get("requestDate"));
		assertEquals(Boolean.FALSE, update.get("resetCycle"));
		assertNull(captured(dao, "history").get("reviewComment"));
	}

	@DisplayName("검수완료로 한 바퀴가 끝나면 현황은 미검수 · 요청일 비움, 이력은 검수완료로 남는다(2026-11-03)")
	@Test
	void save_completedResetsToNotStarted() throws Exception {
		ScreenReviewDAO dao = dao("IN_PROGRESS", "2026-10-30");
		service(dao).save(1L, "BSBoxTypeView", EMP, payload("COMPLETED", "IN_PROGRESS", "확인 끝"));
		Map<String, Object> update = captured(dao, "update");
		assertEquals("NOT_STARTED", update.get("status"));
		assertNull(update.get("requestDate"));
		assertEquals("2026-11-02", update.get("reviewDate"));
		// 개발담당 · 개발완료일도 비운다
		assertEquals(Boolean.TRUE, update.get("resetCycle"));
		Map<String, Object> history = captured(dao, "history");
		assertEquals("IN_PROGRESS", history.get("fromStatus"));
		assertEquals("COMPLETED", history.get("toStatus"));
		assertNull(history.get("requestNo"));

		ScreenReviewDAO direct = dao("NOT_STARTED", null);
		service(direct).save(1L, "BSBoxTypeView", EMP, payload("COMPLETED", "NOT_STARTED", null));
		assertEquals("NOT_STARTED", captured(direct, "update").get("status"));
		assertEquals("COMPLETED", captured(direct, "history").get("toStatus"));
	}

	@DisplayName("막힘: 건너뛰는 상태 · 그사이 바뀐 상태 · 없는 상태 · 의견 500자 초과 · 없는 화면")
	@Test
	void save_rejects() throws Exception {
		ScreenReviewDAO dao = dao("CHANGE_REQUESTED", null);
		ScreenReviewServiceImpl service = service(dao);
		assertEquals("수정요청에서 검수완료(으)로 바꿀 수 없어요", message(service, payload("COMPLETED", "CHANGE_REQUESTED", null)));
		assertEquals("그사이 다른 사람이 상태를 수정요청(으)로 바꿨어요. 패널을 다시 열어주세요", message(service, payload("COMPLETED", "IN_PROGRESS", null)));
		assertEquals("검수 상태를 골라주세요", message(service, payload("DONE", null, null)));
		assertEquals("검수 의견은 500자까지 쓸 수 있어요", message(service, payload("IN_PROGRESS", null, "a".repeat(501))));
		verify(dao, never()).updateReview(anyMap());
		verify(dao, never()).insertHistory(anyMap());

		when(dao.selectMenuId(anyMap())).thenReturn(null);
		assertEquals("없는 화면입니다: BSBoxTypeView", message(service, payload("IN_PROGRESS", null, null)));
	}

	@DisplayName("저장하면 내 임시저장 첨부를 이력으로 옮기고 임시저장을 지운다")
	@Test
	@SuppressWarnings("unchecked")
	void save_movesDraftFiles() throws Exception {
		ScreenReviewDAO dao = dao("IN_PROGRESS", null);
		ScreenReviewDraftVO draft = new ScreenReviewDraftVO();
		draft.setDraftId(7L);
		when(dao.selectDraft(anyMap())).thenReturn(draft);
		service(dao).save(1L, "BSBoxTypeView", EMP, payload("COMPLETED", "IN_PROGRESS", null));
		ArgumentCaptor<Map<String, Object>> move = ArgumentCaptor.forClass(Map.class);
		verify(dao).moveDraftFiles(move.capture());
		assertEquals(7L, move.getValue().get("draftId"));
		assertEquals(31L, move.getValue().get("historyId"));
		verify(dao).deleteDraft(any());
	}

	@DisplayName("임시저장은 상태를 받지 않고 의견만 저장해 번호를 돌려준다")
	@Test
	@SuppressWarnings("unchecked")
	void saveDraft_savesCommentOnly() throws Exception {
		ScreenReviewDAO dao = dao("NOT_STARTED", null);
		when(dao.upsertDraft(anyMap())).thenReturn(7L);
		assertEquals(7L, service(dao).saveDraft(1L, "BSBoxTypeView", EMP, payload("COMPLETED", null, " 작성 중 ")));
		ArgumentCaptor<Map<String, Object>> captor = ArgumentCaptor.forClass(Map.class);
		verify(dao).upsertDraft(captor.capture());
		assertEquals("작성 중", captor.getValue().get("reviewComment"));
		assertFalse(captor.getValue().containsKey("status"));
		verify(dao, never()).updateReview(anyMap());
		verify(dao, never()).insertHistory(anyMap());
	}

	@DisplayName("요청 번호: 처음 수정요청은 그 화면의 다음 번호(1)")
	@Test
	void save_changeRequestGetsNextRequestNo() throws Exception {
		ScreenReviewDAO dao = dao("NOT_STARTED", null);
		when(dao.selectNextRequestNo(anyMap())).thenReturn(1);
		service(dao).save(1L, "BSBoxTypeView", EMP, payload("CHANGE_REQUESTED", "NOT_STARTED", "검수요청"));
		assertEquals(1, captured(dao, "history").get("requestNo"));
	}

	@DisplayName("요청 번호: 수정요청에서 또 수정요청(추가)도 다음 번호 · 검수완료 뒤에도 이어서")
	@Test
	void save_addedChangeRequestGetsNextRequestNo() throws Exception {
		ScreenReviewDAO dao = dao("CHANGE_REQUESTED", "2026-11-02");
		when(dao.selectNextRequestNo(anyMap())).thenReturn(3);
		service(dao).save(1L, "BSBoxTypeView", EMP, payload("CHANGE_REQUESTED", "CHANGE_REQUESTED", "화면변경해주세요"));
		assertEquals(3, captured(dao, "history").get("requestNo"));

		ScreenReviewDAO again = dao("COMPLETED", "2026-11-02");
		when(again.selectNextRequestNo(anyMap())).thenReturn(3);
		service(again).save(1L, "BSBoxTypeView", EMP, payload("CHANGE_REQUESTED", "COMPLETED", null));
		assertEquals(3, captured(again, "history").get("requestNo"));
	}

	@DisplayName("요청 번호: 수정요청이 아닌 저장은 번호가 없고 번호를 찾지도 않는다")
	@Test
	void save_otherStatusHasNoRequestNo() throws Exception {
		ScreenReviewDAO dao = dao("CHANGE_REQUESTED", "2026-11-02");
		service(dao).save(1L, "BSBoxTypeView", EMP, payload("IN_PROGRESS", "CHANGE_REQUESTED", null));
		assertNull(captured(dao, "history").get("requestNo"));
		verify(dao, never()).selectNextRequestNo(anyMap());
	}

	@DisplayName("요청 번호는 검수현황 줄을 잠근 뒤에 찾는다(동시에 올려도 겹치지 않게)")
	@Test
	void save_requestNoAfterLock() throws Exception {
		ScreenReviewDAO dao = dao("NOT_STARTED", null);
		when(dao.selectNextRequestNo(anyMap())).thenReturn(1);
		service(dao).save(1L, "BSBoxTypeView", EMP, payload("CHANGE_REQUESTED", "NOT_STARTED", null));
		InOrder order = inOrder(dao);
		order.verify(dao).selectReviewForUpdate(anyMap());
		order.verify(dao).selectNextRequestNo(anyMap());
		order.verify(dao).insertHistory(anyMap());
	}

	@DisplayName("사번을 못 찾은 로그인은 저장 · 임시저장을 막는다")
	@Test
	void save_rejectsWithoutEmployeeId() throws Exception {
		ScreenReviewDAO dao = dao("NOT_STARTED", null);
		ScreenReviewServiceImpl service = service(dao);
		String expected = "로그인 사원을 확인할 수 없어요. 다시 로그인해주세요";
		assertEquals(expected, assertThrows(IllegalArgumentException.class,
				() -> service.save(1L, "BSBoxTypeView", " ", payload("CHANGE_REQUESTED", null, null))).getMessage());
		assertEquals(expected, assertThrows(IllegalArgumentException.class,
				() -> service.saveDraft(1L, "BSBoxTypeView", null, payload(null, null, "x"))).getMessage());
		verify(dao, never()).insertHistory(anyMap());
		verify(dao, never()).upsertDraft(anyMap());
	}
	private static ScreenReviewSummaryVO summary(String menuCode, String reviewStatus, String lastToStatus) {
		ScreenReviewSummaryVO v = new ScreenReviewSummaryVO();
		v.setMenuCode(menuCode);
		v.setReviewStatus(reviewStatus);
		v.setLastToStatus(lastToStatus);
		return v;
	}

	@DisplayName("화면검수 관리 목록: 수정요청 · 검수진행중은 현황 그대로, 미검수로 돌아간 검수완료는 검수완료, 나머지는 미진행")
	@Test
	void getSummaryList_displayStatus() throws Exception {
		ScreenReviewDAO dao = mock(ScreenReviewDAO.class);
		when(dao.selectSummaryList(anyMap())).thenReturn(Arrays.asList(
				summary("A", "CHANGE_REQUESTED", "CHANGE_REQUESTED"),
				summary("B", "IN_PROGRESS", "IN_PROGRESS"),
				summary("C", "NOT_STARTED", "COMPLETED"),
				summary("D", null, null),
				summary("E", "CHANGE_REQUESTED", "CHANGE_REQUESTED"),
				summary("F", "NOT_STARTED", "CHANGE_REQUESTED")));
		List<ScreenReviewSummaryVO> list = service(dao).getSummaryList(1L);
		assertEquals(Arrays.asList("CHANGE_REQUESTED", "IN_PROGRESS", "COMPLETED", "NOT_STARTED", "CHANGE_REQUESTED", "NOT_STARTED"),
				list.stream().map(ScreenReviewSummaryVO::getDisplayStatus).collect(java.util.stream.Collectors.toList()));
		@SuppressWarnings("unchecked")
		ArgumentCaptor<Map<String, Object>> captor = ArgumentCaptor.forClass(Map.class);
		verify(dao).selectSummaryList(captor.capture());
		assertEquals(1L, captor.getValue().get("tenantId"));
	}
}

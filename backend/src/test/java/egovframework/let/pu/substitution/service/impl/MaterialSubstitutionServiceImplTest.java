package egovframework.let.pu.substitution.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;

import egovframework.let.pd.confirm.service.ProductionConfirmService;
import egovframework.let.pu.substitution.domain.model.SubstitutionDetailVO;
import egovframework.let.pu.substitution.domain.model.SubstitutionLineVO;
import egovframework.let.pu.substitution.domain.model.SubstitutionRecordVO;
import egovframework.let.pu.substitution.domain.model.SubstitutionRequestVO;
import egovframework.let.pu.substitution.domain.model.SubstitutionScheduleVO;
import egovframework.let.pu.substitution.domain.repository.MaterialSubstitutionDAO;

class MaterialSubstitutionServiceImplTest {

	private static final String PRODUCT = "국물두루치기분말(1kg*10ea)";

	private static SubstitutionRecordVO bom(String code, String name, double ratio) {
		SubstitutionRecordVO b = new SubstitutionRecordVO();
		b.setMaterialCode(code);
		b.setMaterialName(name);
		b.setRatio(ratio);
		return b;
	}

	private static SubstitutionRecordVO record(long id, String from, String to, String toName, String reason) {
		SubstitutionRecordVO r = new SubstitutionRecordVO();
		r.setId(id);
		r.setFromMaterialCode(from);
		r.setToMaterialCode(to);
		r.setToMaterialName(toName);
		r.setReason(reason);
		return r;
	}

	private static SubstitutionScheduleVO schedule(String productCode) {
		SubstitutionScheduleVO s = new SubstitutionScheduleVO();
		s.setId(30L);
		s.setScheduleDate("2026-10-06");
		s.setClientName(null);
		s.setProductName(PRODUCT);
		s.setOrderQty("1,000kg");
		s.setLotNo("20261006-01");
		s.setProductCode(productCode);
		return s;
	}

	private static SubstitutionRequestVO request(String from, String to, String reason) {
		SubstitutionRequestVO r = new SubstitutionRequestVO();
		r.setFromMaterialCode(from);
		r.setToMaterialCode(to);
		r.setReason(reason);
		return r;
	}

	private static MaterialSubstitutionDAO dao() throws Exception {
		MaterialSubstitutionDAO dao = mock(MaterialSubstitutionDAO.class);
		when(dao.selectSchedule(30L)).thenReturn(schedule("000001"));
		when(dao.selectBomLines("000001")).thenReturn(Arrays.asList(bom("M1", "양파밀링(국내산)", 0.0599), bom("M2", "고춧가루", 0.027)));
		when(dao.selectRecords(anyLong())).thenReturn(Collections.<SubstitutionRecordVO>emptyList());
		when(dao.selectMaterialName("M1")).thenReturn("양파밀링(국내산)");
		when(dao.selectMaterialName("M9")).thenReturn("양파밀링(중국산)");
		when(dao.countBomLine("000001", "M1")).thenReturn(1);
		return dao;
	}

	@DisplayName("목록: 날짜가 없으면 송연 문구로 막는다")
	@Test
	void listNeedsDate() throws Exception {
		MaterialSubstitutionDAO dao = dao();
		MaterialSubstitutionServiceImpl service = new MaterialSubstitutionServiceImpl(dao, mock(ProductionConfirmService.class));
		assertEquals("date 파라미터가 필요합니다", assertThrows(IllegalArgumentException.class, () -> service.listSchedules(" ")).getMessage());
		service.listSchedules("2026-10-06");
		verify(dao).selectSchedules("2026-10-06");
	}

	@DisplayName("상세: 배합비(%)·투입량(kg)을 지시량으로 환산하고, 쪽지가 있으면 바꿀 것으로 보여준다. 같은 원재료 쪽지가 둘이면 나중 것")
	@Test
	void detailLines() throws Exception {
		MaterialSubstitutionDAO dao = dao();
		when(dao.selectRecords(30L)).thenReturn(Arrays.asList(record(1L, "M1", "M8", "옛것", "x"), record(2L, "M1", "M9", "양파밀링(중국산)", "국내산 미입고")));
		SubstitutionDetailVO detail = new MaterialSubstitutionServiceImpl(dao, mock(ProductionConfirmService.class)).detail(30L);
		assertEquals(PRODUCT, detail.getHeader().getProductName());
		assertEquals("", detail.getHeader().getClientName());
		assertEquals(1000.0, detail.getHeader().getOrderQtyNumber());
		assertEquals(1, detail.getHeader().getSubstitutionCount());
		List<SubstitutionLineVO> rows = detail.getRows();
		assertEquals(2, rows.size());
		SubstitutionLineVO first = rows.get(0);
		assertEquals("M9", first.getMaterialCode());
		assertEquals("양파밀링(중국산)", first.getMaterialName());
		assertEquals("M1", first.getOriginCode());
		assertEquals("양파밀링(국내산)", first.getOriginName());
		assertEquals(5.99, first.getRatioPercent(), 1e-9);
		assertEquals(59.9, first.getQty(), 1e-9);
		assertTrue(first.isSubstituted());
		assertEquals(2L, first.getSubId());
		assertEquals("국내산 미입고", first.getReason());
		SubstitutionLineVO second = rows.get(1);
		assertFalse(second.isSubstituted());
		assertNull(second.getSubId());
		assertEquals("", second.getReason());
		assertEquals(27.0, second.getQty(), 1e-9);
		assertEquals("생산확정 건을 찾을 수 없습니다",
				assertThrows(IllegalArgumentException.class, () -> new MaterialSubstitutionServiceImpl(dao, mock(ProductionConfirmService.class)).detail(99L)).getMessage());
	}

	@DisplayName("상세: 저장된 제품코드가 없으면 이름(규격 포함)으로 찾고, 그래도 없으면 줄이 비어 있다")
	@Test
	void detailWithoutStoredCode() throws Exception {
		MaterialSubstitutionDAO dao = dao();
		when(dao.selectSchedule(31L)).thenReturn(schedule(null));
		when(dao.selectProductCodeByDisplayName(PRODUCT)).thenReturn("000001");
		assertEquals(2, new MaterialSubstitutionServiceImpl(dao, mock(ProductionConfirmService.class)).detail(31L).getRows().size());
		when(dao.selectProductCodeByDisplayName(PRODUCT)).thenReturn(null);
		SubstitutionDetailVO none = new MaterialSubstitutionServiceImpl(dao, mock(ProductionConfirmService.class)).detail(31L);
		assertTrue(none.getRows().isEmpty());
		assertEquals("", none.getHeader().getProductCode());
	}

	@DisplayName("바꿔 쓰기: 검사 문구(송연 순서), 막히면 쪽지도 차감도 없다")
	@Test
	void substituteValidation() throws Exception {
		MaterialSubstitutionDAO dao = dao();
		ProductionConfirmService confirm = mock(ProductionConfirmService.class);
		MaterialSubstitutionServiceImpl service = new MaterialSubstitutionServiceImpl(dao, confirm);
		assertEquals("바꿀 원재료와 대신 쓸 원재료를 모두 골라주세요",
				assertThrows(IllegalArgumentException.class, () -> service.substitute(30L, request("M1", " ", null), "관리자")).getMessage());
		assertEquals("같은 원재료로는 바꿀 수 없어요",
				assertThrows(IllegalArgumentException.class, () -> service.substitute(30L, request("M1", "M1", null), "관리자")).getMessage());
		assertEquals("생산확정 건을 찾을 수 없습니다",
				assertThrows(IllegalArgumentException.class, () -> service.substitute(99L, request("M1", "M9", null), "관리자")).getMessage());
		assertEquals("대신 쓸 원재료를 원재료 목록에서 찾을 수 없어요",
				assertThrows(IllegalArgumentException.class, () -> service.substitute(30L, request("M1", "없음", null), "관리자")).getMessage());
		assertEquals("그 원재료는 이 제품의 배합표에 없어요",
				assertThrows(IllegalArgumentException.class, () -> service.substitute(30L, request("M5", "M9", null), "관리자")).getMessage());
		when(dao.countRecord(30L, "M1")).thenReturn(1);
		assertEquals("이미 바꿔 쓰기로 한 원재료예요. 되돌린 뒤 다시 지정해주세요",
				assertThrows(IllegalArgumentException.class, () -> service.substitute(30L, request("M1", "M9", null), "관리자")).getMessage());
		verify(dao, never()).insertRecord(any());
		verify(confirm, never()).reapplyMaterialUsage(anyLong());
	}

	@DisplayName("바꿔 쓰기: 쪽지(이름·이유·만든 사람)를 적은 뒤 생산확정과 같은 규칙으로 차감을 다시 하고, 바뀐 상세를 돌려준다")
	@Test
	void substituteWritesThenReapplies() throws Exception {
		MaterialSubstitutionDAO dao = dao();
		ProductionConfirmService confirm = mock(ProductionConfirmService.class);
		doAnswer(inv -> {
			((SubstitutionRecordVO) inv.getArgument(0)).setId(7L);
			when(dao.selectRecords(30L)).thenReturn(Collections.singletonList(record(7L, "M1", "M9", "양파밀링(중국산)", "국내산 미입고")));
			return null;
		}).when(dao).insertRecord(any());
		SubstitutionDetailVO detail = new MaterialSubstitutionServiceImpl(dao, confirm).substitute(30L, request(" M1 ", "M9", " 국내산 미입고 "), "관리자");
		ArgumentCaptor<SubstitutionRecordVO> saved = ArgumentCaptor.forClass(SubstitutionRecordVO.class);
		InOrder order = inOrder(dao, confirm);
		order.verify(dao).insertRecord(saved.capture());
		order.verify(confirm).reapplyMaterialUsage(30L);
		SubstitutionRecordVO r = saved.getValue();
		assertEquals(30L, r.getScheduleId());
		assertEquals("M1", r.getFromMaterialCode());
		assertEquals("양파밀링(국내산)", r.getFromMaterialName());
		assertEquals("M9", r.getToMaterialCode());
		assertEquals("양파밀링(중국산)", r.getToMaterialName());
		assertEquals("국내산 미입고", r.getReason());
		assertEquals("관리자", r.getCreatedBy());
		assertTrue(r.getCreatedAt().matches("\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}"), r.getCreatedAt());
		assertEquals(1, detail.getHeader().getSubstitutionCount());
		assertEquals(7L, detail.getRows().get(0).getSubId());
	}

	@DisplayName("되돌리기: 쪽지를 지우고 원래 배합대로 다시 차감. 이미 되돌린 것·없는 생산건은 막는다")
	@Test
	void undo() throws Exception {
		MaterialSubstitutionDAO dao = dao();
		ProductionConfirmService confirm = mock(ProductionConfirmService.class);
		MaterialSubstitutionServiceImpl service = new MaterialSubstitutionServiceImpl(dao, confirm);
		when(dao.deleteRecord(30L, 7L)).thenReturn(1);
		SubstitutionDetailVO detail = service.undo(30L, 7L);
		InOrder order = inOrder(dao, confirm);
		order.verify(dao).deleteRecord(30L, 7L);
		order.verify(confirm).reapplyMaterialUsage(30L);
		assertEquals(0, detail.getHeader().getSubstitutionCount());
		assertEquals("이미 되돌려진 치환이에요", assertThrows(IllegalArgumentException.class, () -> service.undo(30L, 8L)).getMessage());
		assertEquals("생산확정 건을 찾을 수 없습니다", assertThrows(IllegalArgumentException.class, () -> service.undo(99L, 7L)).getMessage());
		verify(confirm, org.mockito.Mockito.times(1)).reapplyMaterialUsage(anyLong());
	}

	@DisplayName("파이썬 round 와 같은 반올림")
	@Test
	void rounding() {
		assertEquals(5.99, MaterialSubstitutionServiceImpl.round(0.0599 * 100, 4), 1e-12);
		assertEquals(0.125, MaterialSubstitutionServiceImpl.round(0.125, 3), 1e-12);
		assertEquals(2.67, MaterialSubstitutionServiceImpl.round(2.675, 2), 1e-12); // 2.675 는 실제로 2.67499.. 라 파이썬도 2.67
		assertEquals(1000.0, MaterialSubstitutionServiceImpl.parseQty("1,000kg"), 1e-12);
		assertEquals(0.0, MaterialSubstitutionServiceImpl.parseQty("미정"), 1e-12);
	}
}

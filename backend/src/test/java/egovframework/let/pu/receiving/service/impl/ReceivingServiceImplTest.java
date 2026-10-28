package egovframework.let.pu.receiving.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.AdditionalMatchers.eq;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
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

import egovframework.let.common.attachment.domain.model.AttachmentVO;
import egovframework.let.common.attachment.service.AttachmentService;
import egovframework.let.pu.receiving.domain.model.ReceivingBulkRequestVO;
import egovframework.let.pu.receiving.domain.model.ReceivingBulkResultVO;
import egovframework.let.pu.receiving.domain.model.ReceivingItemVO;
import egovframework.let.pu.receiving.domain.model.ReceivingVO;
import egovframework.let.pu.receiving.domain.repository.ReceivingDAO;

class ReceivingServiceImplTest {

	private static ReceivingItemVO item(String code, String client, String qty, String price) {
		ReceivingItemVO it = new ReceivingItemVO();
		it.setMaterialCode(code);
		it.setClientName(client);
		it.setQty(qty);
		it.setUnitPrice(price);
		return it;
	}

	private static ReceivingBulkRequestVO bulk(String date, boolean isReturn, ReceivingItemVO... items) {
		ReceivingBulkRequestVO body = new ReceivingBulkRequestVO();
		body.setReceiveDate(date);
		body.setIsReturn(isReturn);
		body.setItems(Arrays.asList(items));
		return body;
	}

	// 2026-10-26 거래처 · 과세구분은 코드로 저장한다
	private static ReceivingDAO codedDao() throws Exception {
		ReceivingDAO dao = mock(ReceivingDAO.class);
		when(dao.selectClientCodeByName("대영")).thenReturn("000010");
		when(dao.selectClientCodeByName("대영산업")).thenReturn("000011");
		when(dao.selectTaxCode("과세")).thenReturn("001");
		when(dao.selectTaxCode("면세")).thenReturn("002");
		return dao;
	}

	@DisplayName("입고 등록: 날짜·품목 검사, 거래처 없음·수량 못 읽음·없는 원재료는 건너뜀, 단가 없으면 막음(조사), 바코드·금액·창고·재고")
	@Test
	void registerReceiving() throws Exception {
		ReceivingDAO dao = codedDao();
		ReceivingServiceImpl service = new ReceivingServiceImpl(dao, mock(AttachmentService.class));
		assertEquals("입고일이 필요합니다", assertThrows(IllegalArgumentException.class, () -> service.registerBulk(bulk(" ", false, item("M", "a", "1", "1")))).getMessage());
		assertEquals("반품일이 필요합니다", assertThrows(IllegalArgumentException.class, () -> service.registerBulk(bulk("", true, item("M", "a", "1", "1")))).getMessage());
		assertEquals("등록할 품목이 없습니다", assertThrows(IllegalArgumentException.class, () -> service.registerBulk(bulk("2026-10-08", false))).getMessage());

		when(dao.selectMaterialName("2705")).thenReturn("백설탕");
		when(dao.selectMaterialName("000013")).thenReturn("구운소금");
		assertEquals("백설탕을 등록하려면 단가가 있어야 합니다",
				assertThrows(IllegalArgumentException.class, () -> service.registerBulk(bulk("2026-10-08", false, item("2705", "대영", "10", " ")))).getMessage());
		assertEquals("구운소금을 등록하려면 단가가 있어야 합니다",
				assertThrows(IllegalArgumentException.class, () -> service.registerBulk(bulk("2026-10-08", false, item("000013", "대영", "10", null)))).getMessage());
		verify(dao, never()).insertReceiving(any());

		when(dao.selectReceivingWarehouse()).thenReturn("000001"); // 2026-10-26 입고창고 코드
		assertEquals(ReceivingServiceImpl.CLIENT_MESSAGE + "없는상사",
				assertThrows(IllegalArgumentException.class, () -> service.registerBulk(bulk("2026-10-08", false, item("2705", "없는상사", "1", "1")))).getMessage());
		ReceivingItemVO zero = item("2705", "대영", "1", "1");
		zero.setTaxType("영세"); // 공통코드 TAX_CATEGORY 에 없다
		assertEquals(ReceivingServiceImpl.TAX_MESSAGE + "영세",
				assertThrows(IllegalArgumentException.class, () -> service.registerBulk(bulk("2026-10-08", false, zero))).getMessage());
		verify(dao, never()).insertReceiving(any());
		when(dao.countSameDay("2705", "2026-10-08")).thenReturn(0, 1);
		ReceivingItemVO first = item(" 2705 ", " 대영산업 ", "12.5", "1001");
		first.setPoId(7L);
		first.setTaxType("면세");
		first.setKey("r0");
		ReceivingItemVO second = item("2705", "대영산업", "3", "2.5");
		second.setTaxType("이상한값");
		ReceivingBulkResultVO result = service.registerBulk(bulk("2026-10-08", false,
				first, item("2705", " ", "1", "1"), item("2705", "대영", "열개", "1"), item("NOPE", "대영", "1", "1"), second));
		assertEquals(2, result.getRegistered());
		assertEquals(Arrays.asList("r0", null), result.getKeys());
		ArgumentCaptor<ReceivingVO> saved = ArgumentCaptor.forClass(ReceivingVO.class);
		verify(dao, times(2)).insertReceiving(saved.capture());
		ReceivingVO a = saved.getAllValues().get(0);
		assertEquals("2705", a.getMaterialCode());
		assertEquals("백설탕", a.getMaterialName());
		assertEquals("대영산업", a.getClientName());
		assertEquals("002705_26100801", a.getBarcode());
		assertEquals(12512.0, a.getSupplyAmount()); // 1001 × 12.5 = 12512.5 → 짝수 쪽(파이썬 round)
		assertEquals(0.0, a.getVatAmount()); // 면세
		assertEquals(12512.0, a.getTotalAmount());
		assertEquals("면세", a.getTaxType());
		assertEquals(Long.valueOf(7), a.getPoId());
		assertEquals("000001", a.getWarehouseCd());
		assertEquals("000011", a.getClientCode());
		assertEquals("002", a.getTaxCode());
		assertEquals(Integer.valueOf(0), a.getIsReturn());
		ReceivingVO b = saved.getAllValues().get(1);
		assertEquals("002705_26100802", b.getBarcode());
		assertEquals("과세", b.getTaxType());
		assertEquals("001", b.getTaxCode());
		assertEquals(8.0, b.getSupplyAmount()); // 2.5 × 3 = 7.5 → 8(짝수)
		assertEquals(1.0, b.getVatAmount()); // 0.8 → 1
		verify(dao).addMaterialStock(org.mockito.ArgumentMatchers.eq("2705"), eq(12.5, 1e-9));
		verify(dao).addMaterialStock(org.mockito.ArgumentMatchers.eq("2705"), eq(3.0, 1e-9));
	}

	@DisplayName("반품: 음수로 적고 바코드 없음, 단가 없어도 받음, 남은 수량까지만(문구), 없는 입고는 막음")
	@Test
	void registerReturn() throws Exception {
		ReceivingDAO dao = codedDao();
		ReceivingServiceImpl service = new ReceivingServiceImpl(dao, mock(AttachmentService.class));
		when(dao.selectMaterialName("2705")).thenReturn("백설탕");
		ReceivingVO src = new ReceivingVO();
		src.setQty(20.0);
		src.setMaterialName("백설탕");
		when(dao.selectReturnSource(5L)).thenReturn(src);
		when(dao.selectReturnedQty(5L)).thenReturn(12.5);
		ReceivingItemVO over = item("2705", "대영", "8", "1000");
		over.setReturnOfId(5L);
		assertEquals("백설탕은 7.5까지만 반품할 수 있습니다 (입고 20 · 이미 반품 12.5)",
				assertThrows(IllegalArgumentException.class, () -> service.registerBulk(bulk("2026-10-08", true, over))).getMessage());
		ReceivingItemVO missing = item("2705", "대영", "1", "1000");
		missing.setReturnOfId(99L);
		assertEquals("반품할 입고내역을 찾을 수 없습니다",
				assertThrows(IllegalArgumentException.class, () -> service.registerBulk(bulk("2026-10-08", true, missing))).getMessage());

		ReceivingItemVO ok = item("2705", "대영", "7.5", "1000");
		ok.setReturnOfId(5L);
		ok.setReturnReason(" 파손 ");
		ReceivingItemVO noPrice = item("2705", "대영", "-2", "");
		service.registerBulk(bulk("2026-10-08", true, ok, noPrice));
		ArgumentCaptor<ReceivingVO> saved = ArgumentCaptor.forClass(ReceivingVO.class);
		verify(dao, times(2)).insertReceiving(saved.capture());
		ReceivingVO r = saved.getAllValues().get(0);
		assertEquals(-7.5, r.getQty());
		assertEquals(-7500.0, r.getSupplyAmount());
		assertEquals(-750.0, r.getVatAmount());
		assertNull(r.getBarcode());
		assertEquals(Integer.valueOf(1), r.getIsReturn());
		assertEquals("파손", r.getReturnReason());
		assertEquals(Long.valueOf(5), r.getReturnOfId());
		assertEquals(-2.0, saved.getAllValues().get(1).getQty());
		assertNull(saved.getAllValues().get(1).getTotalAmount());
		verify(dao, never()).countSameDay(anyString(), anyString());
	}

	@DisplayName("목록: 서류를 한 번에 붙이고 반품가능 수량(반품 줄은 0), kind 는 receiving·return 만")
	@Test
	void list() throws Exception {
		ReceivingDAO dao = mock(ReceivingDAO.class);
		AttachmentService attachments = mock(AttachmentService.class);
		ReceivingServiceImpl service = new ReceivingServiceImpl(dao, attachments);
		ReceivingVO in = new ReceivingVO();
		in.setId(1L);
		in.setQty(20.0);
		in.setReturnedQty(7.5);
		in.setIsReturn(0);
		ReceivingVO ret = new ReceivingVO();
		ret.setId(2L);
		ret.setQty(-7.5);
		ret.setReturnedQty(0.0);
		ret.setIsReturn(1);
		when(dao.selectReceivings(null, "2026-10-01", "2026-10-08", "대영", null, null)).thenReturn(Arrays.asList(in, ret));
		Map<String, List<AttachmentVO>> files = new HashMap<>();
		files.put("1", Collections.singletonList(new AttachmentVO()));
		when(attachments.listByRefs("receiving", Arrays.asList("1", "2"))).thenReturn(files);
		List<ReceivingVO> rows = service.listReceivings(" ", "2026-10-01", "2026-10-08", " 대영 ", "", "이상한값");
		assertEquals(12.5, rows.get(0).getReturnableQty());
		assertEquals(1, rows.get(0).getFiles().size());
		assertEquals(0.0, rows.get(1).getReturnableQty());
		assertEquals(0, rows.get(1).getFiles().size());
	}

	@DisplayName("취소: 재고를 되돌리고 줄·서류를 지운다, 없으면 막는다")
	@Test
	void cancel() throws Exception {
		ReceivingDAO dao = mock(ReceivingDAO.class);
		AttachmentService attachments = mock(AttachmentService.class);
		ReceivingServiceImpl service = new ReceivingServiceImpl(dao, attachments);
		assertEquals("입고 내역을 찾을 수 없습니다", assertThrows(IllegalArgumentException.class, () -> service.cancel(9L)).getMessage());
		ReceivingVO row = new ReceivingVO();
		row.setMaterialCode("2705");
		row.setQty(-7.5);
		when(dao.selectForCancel(3L)).thenReturn(row);
		service.cancel(3L);
		verify(dao).addMaterialStock(org.mockito.ArgumentMatchers.eq("2705"), eq(7.5, 1e-9)); // 반품 취소는 재고가 다시 는다
		verify(dao).deleteReceiving(3L);
		verify(attachments).deleteAllFor("receiving", "3");
	}

	@DisplayName("마지막 단가: 같은 거래처 우선, 없으면 전체, 코드 없으면 비움 / 집계·상세는 기간 필수")
	@Test
	void lastPriceAndSummary() throws Exception {
		ReceivingDAO dao = mock(ReceivingDAO.class);
		ReceivingServiceImpl service = new ReceivingServiceImpl(dao, mock(AttachmentService.class));
		assertNull(service.lastPrice(" ", "대영").get("unitPrice"));
		when(dao.selectLastPrice("2705", "대영")).thenReturn(null);
		when(dao.selectLastPrice("2705", null)).thenReturn(1100.0);
		Map<String, Object> any = service.lastPrice("2705", "대영");
		assertEquals(1100.0, any.get("unitPrice"));
		assertEquals("any", any.get("source"));
		when(dao.selectLastPrice("2705", "삼양")).thenReturn(990.0);
		assertEquals("vendor", service.lastPrice("2705", " 삼양 ").get("source"));

		assertEquals("조회 기간을 선택해주세요", assertThrows(IllegalArgumentException.class, () -> service.summary("2026-10-01", "", null, null)).getMessage());
		assertEquals("품목과 조회 기간이 필요합니다", assertThrows(IllegalArgumentException.class, () -> service.detail(" ", "2026-10-01", "2026-10-08", null)).getMessage());
		when(dao.selectDetailReceived("2705", "2026-10-01", "2026-10-08", null)).thenReturn(30.0);
		when(dao.selectDetailUsed("2705", "2026-10-01", "2026-10-08")).thenReturn(12.0);
		assertEquals(12.0, service.detail("2705", "2026-10-01", "2026-10-08", " ").getTotalUsed());
		verify(dao, never()).addMaterialStock(anyString(), anyDouble());
	}

	@DisplayName("숫자·조사 도우미(송연 fmt_qty · josa · round)")
	@Test
	void helpers() {
		assertEquals("10", ReceivingServiceImpl.fmtQty(10.0));
		assertEquals("2.5", ReceivingServiceImpl.fmtQty(2.5));
		assertEquals("을", ReceivingServiceImpl.josa("백설탕", "을를"));
		assertEquals("를", ReceivingServiceImpl.josa("파우치", "을를"));
		assertEquals("은", ReceivingServiceImpl.josa("ABC", "은는"));
		assertEquals(2.0, ReceivingServiceImpl.roundHalfEven(2.5));
		assertEquals(4.0, ReceivingServiceImpl.roundHalfEven(3.5));
		assertEquals(-2.0, ReceivingServiceImpl.roundHalfEven(-2.5));
	}
}

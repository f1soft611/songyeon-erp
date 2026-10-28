package egovframework.let.sl.register.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import egovframework.let.sl.register.domain.model.SalesPullRequestVO;
import egovframework.let.sl.register.domain.model.SalesPullResultVO;
import egovframework.let.sl.register.domain.model.SalesRecordVO;
import egovframework.let.sl.register.domain.model.ShippableListVO;
import egovframework.let.sl.register.domain.model.ShippableSaleVO;
import egovframework.let.sl.register.domain.repository.SalesRegisterDAO;

class SalesRegisterServiceImplTest {

	private static ShippableSaleVO shipped(String type, long id, String date, String client, String product, String qtyText) {
		ShippableSaleVO row = new ShippableSaleVO();
		row.setSourceType(type);
		row.setSourceId(id);
		row.setSaleDate(date);
		row.setClientName(client);
		row.setProductName(product);
		row.setClientCode("C:" + client); // 2026-10-26 출하 줄의 코드
		row.setProductCode("P:" + product);
		row.setQtyText(qtyText);
		return row;
	}

	private static ShippableSaleVO price(String display, Double unitPrice) {
		ShippableSaleVO p = new ShippableSaleVO();
		p.setProductName(display);
		p.setUnitPrice(unitPrice);
		return p;
	}

	private static ShippableSaleVO taken(String type, long id) {
		ShippableSaleVO t = new ShippableSaleVO();
		t.setSourceType(type);
		t.setSourceId(id);
		return t;
	}

	private static SalesRegisterDAO daoWithData() throws Exception {
		SalesRegisterDAO dao = mock(SalesRegisterDAO.class);
		when(dao.selectShipped(org.mockito.ArgumentMatchers.eq(false), any(), any(), any())).thenReturn(Arrays.asList(
				shipped("logistics", 7, "2026-10-06", "달구지", "로제파스타소스(5kg*4ea)", "135kg"),
				shipped("logistics", 5, "2026-10-06", "예나", "소불고기(5kg캡)", "1,300")));
		when(dao.selectShipped(org.mockito.ArgumentMatchers.eq(true), any(), any(), any())).thenReturn(Collections.singletonList(
				shipped("production", 7, "2026-10-05", "케이", "돼지왕구이소스(10kg*2ea)", "2500")));
		when(dao.selectProductPrices()).thenReturn(Arrays.asList(price("로제파스타소스(5kg*4ea)", 5000.0), price("돼지왕구이소스(10kg*2ea)", null)));
		when(dao.selectTakenSources()).thenReturn(Collections.singletonList(taken("logistics", 5)));
		return dao;
	}

	@DisplayName("후보: 기간 필수, 두 곳을 합쳐 날짜·거래처·품목 순, 수량은 숫자로 읽고 단가는 이름(규격)으로, 이미 넣은 건 표시")
	@Test
	void shippable() throws Exception {
		SalesRegisterDAO dao = daoWithData();
		SalesRegisterServiceImpl service = new SalesRegisterServiceImpl(dao);
		assertEquals("조회 기간을 선택해주세요", assertThrows(IllegalArgumentException.class, () -> service.listShippable("2026-10-01", " ", null)).getMessage());

		ShippableListVO result = service.listShippable(" 2026-10-01 ", "2026-10-07", " 달 ");
		verify(dao).selectShipped(false, "2026-10-01", "2026-10-07", "달");
		List<ShippableSaleVO> rows = result.getRows();
		assertEquals("production", rows.get(0).getSourceType()); // 10/5 가 먼저
		assertNull(rows.get(0).getUnitPrice());
		assertNull(rows.get(0).getAmount());
		assertEquals("로제파스타소스(5kg*4ea)", rows.get(1).getProductName()); // 같은 날 '달구지' < '예나'
		assertEquals(135.0, rows.get(1).getQty());
		assertEquals(675000.0, rows.get(1).getAmount());
		assertEquals(1300.0, rows.get(2).getQty());
		assertEquals(Boolean.TRUE, rows.get(2).getAlready());
		assertEquals(Integer.valueOf(2), result.getPendingCount());
	}

	@DisplayName("판매로 넣기: 빈 선택은 막고, 지금 기록에서 다시 세어 넣고, 이미 들어간 것·없는 것·동시에 들어간 것은 건너뛴다")
	@Test
	void pull() throws Exception {
		SalesRegisterDAO dao = daoWithData();
		SalesRegisterServiceImpl service = new SalesRegisterServiceImpl(dao);
		assertEquals("가져올 항목을 선택해주세요", assertThrows(IllegalArgumentException.class, () -> service.pull(new SalesPullRequestVO(), "관리자")).getMessage());
		SalesPullRequestVO bad = new SalesPullRequestVO();
		bad.setItems(Collections.singletonList(taken("manual", 1)));
		assertEquals("가져올 항목을 선택해주세요", assertThrows(IllegalArgumentException.class, () -> service.pull(bad, "관리자")).getMessage());

		when(dao.insertSale(any())).thenReturn(1, 0);
		SalesPullRequestVO request = new SalesPullRequestVO();
		request.setItems(Arrays.asList(taken("logistics", 7), taken("logistics", 7), taken("logistics", 5), taken("logistics", 999), taken("production", 7)));
		SalesPullResultVO result = service.pull(request, "관리자");
		assertEquals(1, result.getAdded());
		assertEquals(3, result.getSkipped()); // 이미 넣은 5, 없는 999, 동시에 들어간 production 7
		ArgumentCaptor<SalesRecordVO> sale = ArgumentCaptor.forClass(SalesRecordVO.class);
		verify(dao, times(2)).insertSale(sale.capture());
		SalesRecordVO first = sale.getAllValues().get(0);
		assertEquals("logistics", first.getSourceType());
		assertEquals(Long.valueOf(7), first.getSourceId());
		assertEquals(135.0, first.getQty());
		assertEquals(675000.0, first.getAmount());
		assertEquals("관리자", first.getCreatedBy());
		assertEquals("C:달구지", first.getClientCode());
		assertEquals("P:로제파스타소스(5kg*4ea)", first.getProductCode());
		verify(dao).selectShipped(false, "0000-01-01", "9999-12-31", null);
	}

	@DisplayName("직접 등록: 날짜·거래처·품목·수량 검사, 단가는 숫자(쉼표 허용), 비우면 판매단가, 그것도 없으면 금액 없음")
	@Test
	void manual() throws Exception {
		SalesRegisterDAO dao = daoWithData();
		SalesRegisterServiceImpl service = new SalesRegisterServiceImpl(dao);
		SalesRecordVO body = new SalesRecordVO();
		body.setSaleDate("2026-10-7");
		assertEquals("판매일자를 골라주세요", assertThrows(IllegalArgumentException.class, () -> service.createManual(body, null)).getMessage());
		body.setSaleDate("2026-10-07");
		assertEquals("거래처를 적어주세요", assertThrows(IllegalArgumentException.class, () -> service.createManual(body, null)).getMessage());
		body.setClientName(" 달구지 ");
		assertEquals("품목을 적어주세요", assertThrows(IllegalArgumentException.class, () -> service.createManual(body, null)).getMessage());
		body.setProductName("로제파스타소스(5kg*4ea)");
		body.setQtyText("0");
		assertEquals("수량을 적어주세요", assertThrows(IllegalArgumentException.class, () -> service.createManual(body, null)).getMessage());
		body.setQtyText("10박스");
		body.setUnitPriceText("오천");
		assertEquals("단가를 숫자로 적어주세요", assertThrows(IllegalArgumentException.class, () -> service.createManual(body, null)).getMessage());
		verify(dao, never()).insertSale(any());

		// 2026-10-26 코드로 저장한다: 마스터에 없는 거래처 · 품목은 막는다
		when(dao.selectClientCodeByName("달구지")).thenReturn("000001");
		when(dao.selectProductCodeByDisplayName("로제파스타소스(5kg*4ea)")).thenReturn("000006");
		when(dao.selectProductCodeByDisplayName("돼지왕구이소스(10kg*2ea)")).thenReturn("000007");
		body.setUnitPriceText("4,800");
		body.setClientName("없는거래처");
		assertEquals(SalesRegisterServiceImpl.CLIENT_CODE_MESSAGE, assertThrows(IllegalArgumentException.class, () -> service.createManual(body, null)).getMessage());
		body.setClientName(" 달구지 ");
		body.setProductName("없는제품");
		assertEquals(SalesRegisterServiceImpl.PRODUCT_CODE_MESSAGE, assertThrows(IllegalArgumentException.class, () -> service.createManual(body, null)).getMessage());
		verify(dao, never()).insertSale(any());
		body.setProductName("로제파스타소스(5kg*4ea)");
		body.setNote("  ");
		service.createManual(body, "관리자");
		body.setUnitPriceText("");
		service.createManual(body, "관리자");
		body.setProductName("돼지왕구이소스(10kg*2ea)"); // 판매단가 없는 제품
		service.createManual(body, "00000001");
		ArgumentCaptor<SalesRecordVO> sale = ArgumentCaptor.forClass(SalesRecordVO.class);
		verify(dao, times(3)).insertSale(sale.capture());
		SalesRecordVO typed = sale.getAllValues().get(0);
		assertEquals("달구지", typed.getClientName());
		assertEquals("000001", typed.getClientCode());
		assertEquals("000006", typed.getProductCode());
		assertEquals(10.0, typed.getQty());
		assertEquals(4800.0, typed.getUnitPrice());
		assertEquals(48000.0, typed.getAmount());
		assertEquals("manual", typed.getSourceType());
		assertNull(typed.getSourceId());
		assertNull(typed.getNote());
		assertEquals(5000.0, sale.getAllValues().get(1).getUnitPrice());
		assertNull(sale.getAllValues().get(2).getUnitPrice());
		assertNull(sale.getAllValues().get(2).getAmount());
		assertEquals("000007", sale.getAllValues().get(2).getProductCode());
		assertEquals("00000001", sale.getAllValues().get(2).getCreatedBy());
	}
}

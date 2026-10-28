package egovframework.let.co.master.boxtype.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Map;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import egovframework.let.co.master.boxtype.domain.model.BoxTypeVO;
import egovframework.let.co.master.boxtype.domain.repository.BoxTypeDAO;

class BoxTypeServiceImplTest {

	private static BoxTypeVO row(Long id, String code, String name) {
		BoxTypeVO v = new BoxTypeVO();
		v.setBoxTypeId(id);
		v.setBoxTypeCd(code);
		v.setBoxTypeNm(name);
		return v;
	}

	private static String message(Runnable r) {
		return assertThrows(IllegalArgumentException.class, r::run).getMessage();
	}

	private static void save(BoxTypeServiceImpl service, BoxTypeVO v) {
		try {
			service.saveBoxType(v, "0000");
		} catch (RuntimeException ex) {
			throw ex;
		} catch (Exception ex) {
			throw new IllegalStateException(ex);
		}
	}

	@DisplayName("검사: 이름 필수, 비율 0~100, 금액 0 이상(코드는 서버가 매겨 검사하지 않는다)")
	@Test
	void saveBoxType_validates() throws Exception {
		BoxTypeDAO dao = mock(BoxTypeDAO.class);
		BoxTypeServiceImpl service = new BoxTypeServiceImpl(dao);
		assertEquals("포장유형명은 필수입니다", message(() -> save(service, row(null, "BOX1", " "))));
		BoxTypeVO over = row(null, "BOX1", "소포장");
		over.setFixedMarginRate(100.5);
		assertEquals("고정마진율은(는) 0~100 사이로 입력하세요", message(() -> save(service, over)));
		BoxTypeVO minus = row(null, "BOX1", "소포장");
		minus.setPackingCost(-1d);
		assertEquals("포장비은(는) 0 이상으로 입력하세요", message(() -> save(service, minus)));
		verify(dao, never()).insertBoxType(any());
		verify(dao, never()).updateBoxType(any());
	}

	@SuppressWarnings("unchecked")
	@DisplayName("새로 등록: 사업장 F001 · 사업부 P001 고정, 보낸 코드는 쓰지 않고 6자리 자동 번호, 이름 공백 정리, 빈 값은 0, 등록자는 로그인 사원의 사번")
	@Test
	void saveBoxType_inserts() throws Exception {
		BoxTypeDAO dao = mock(BoxTypeDAO.class);
		BoxTypeServiceImpl service = new BoxTypeServiceImpl(dao);
		BoxTypeVO v = row(null, " pouch ", " 소포장 5kg ");
		v.setFixedMarginRate(15d);
		v.setLaborCost(1200d);

		service.saveBoxType(v, "0000");

		ArgumentCaptor<Map<String, Object>> cap = ArgumentCaptor.forClass(Map.class);
		verify(dao).insertBoxType(cap.capture());
		Map<String, Object> p = cap.getValue();
		assertEquals("F001", p.get("factoryCode"));
		assertEquals("P001", p.get("plantCode"));
		assertEquals("000001", p.get("boxTypeCd"));
		assertEquals("소포장 5kg", p.get("boxTypeNm"));
		assertEquals(15d, p.get("fixedMarginRate"));
		assertEquals(0d, p.get("lossRate"));
		assertEquals(1200d, p.get("laborCost"));
		assertEquals(0d, p.get("marginAmt"));
		assertEquals(0, p.get("sortSeq"));
		assertEquals("0000", p.get("userId"));
	}

	@SuppressWarnings("unchecked")
	@DisplayName("새로 등록: 표의 가장 큰 6자리 숫자 코드 + 1(없으면 000001)을 받고, 이미 있는 코드(사용안함 포함)면 다음 번호로 넘어간다")
	@Test
	void saveBoxType_generatesCode() throws Exception {
		BoxTypeDAO dao = mock(BoxTypeDAO.class);
		BoxTypeServiceImpl service = new BoxTypeServiceImpl(dao);
		when(dao.selectMaxAutoCodeNo(any())).thenReturn(null); // 6자리 숫자 코드가 하나도 없음 → 000001 부터
		when(dao.countAnyCode(any())).thenReturn(1, 0); // 000001 은 이미 있다

		service.saveBoxType(row(null, "", "소포장 1kg"), "0000");

		ArgumentCaptor<Map<String, Object>> cap = ArgumentCaptor.forClass(Map.class);
		verify(dao).insertBoxType(cap.capture());
		assertEquals("000002", cap.getValue().get("boxTypeCd"));
		assertEquals("000001", BoxTypeServiceImpl.formatCode(1L));
		assertEquals("1234567", BoxTypeServiceImpl.formatCode(1234567L));

		// 가장 큰 번호가 41 이면 000042(화면에서 보낸 코드는 무시)
		when(dao.selectMaxAutoCodeNo(any())).thenReturn(41);
		when(dao.countAnyCode(any())).thenReturn(0);
		service.saveBoxType(row(null, "PACK-ZZ", "대포장"), "0000");
		verify(dao, org.mockito.Mockito.times(2)).insertBoxType(cap.capture());
		assertEquals("000042", cap.getValue().get("boxTypeCd"));
	}

	@DisplayName("수정: boxTypeId 로 그 줄을 덮어쓴다. 없는 줄이면 다시 조회하라고 알린다")
	@Test
	void saveBoxType_updates() throws Exception {
		BoxTypeDAO dao = mock(BoxTypeDAO.class);
		BoxTypeServiceImpl service = new BoxTypeServiceImpl(dao);
		when(dao.updateBoxType(any())).thenReturn(1);

		service.saveBoxType(row(7L, "BOX005KG", "소포장 5kg(수정)"), "0000");

		ArgumentCaptor<Map<String, Object>> cap = ArgumentCaptor.forClass(Map.class);
		verify(dao).updateBoxType(cap.capture());
		assertEquals(7L, cap.getValue().get("boxTypeId"));
		assertEquals("소포장 5kg(수정)", cap.getValue().get("boxTypeNm"));
		verify(dao, never()).insertBoxType(any());

		when(dao.updateBoxType(any())).thenReturn(0);
		assertEquals("포장유형을 찾을 수 없습니다. 다시 조회해 주세요", message(() -> save(service, row(8L, "BOX9", "x"))));
	}

	@DisplayName("사용여부 체크박스(2026-10-22): useYn 을 그대로 저장(N 외는 Y), 다시 켤 때 같은 코드가 사용 중이면 막는다")
	@Test
	void saveBoxType_useYn() throws Exception {
		BoxTypeDAO dao = mock(BoxTypeDAO.class);
		BoxTypeServiceImpl service = new BoxTypeServiceImpl(dao);
		when(dao.updateBoxType(any())).thenReturn(1);

		BoxTypeVO off = row(7L, "PACK-001", "소포장");
		off.setUseYn("N");
		service.saveBoxType(off, "0000");
		ArgumentCaptor<Map<String, Object>> cap = ArgumentCaptor.forClass(Map.class);
		verify(dao).updateBoxType(cap.capture());
		assertEquals("N", cap.getValue().get("useYn"));
		verify(dao, never()).countActiveCode(any());

		BoxTypeVO on = row(7L, "PACK-001", "소포장");
		on.setUseYn("y");
		when(dao.countActiveCode(any())).thenReturn(1);
		assertEquals("이미 사용 중인 포장유형코드입니다: PACK-001", message(() -> save(service, on)));

		when(dao.countActiveCode(any())).thenReturn(0);
		BoxTypeVO blank = row(7L, "PACK-001", "소포장");
		service.saveBoxType(blank, "0000");
		verify(dao, org.mockito.Mockito.times(2)).updateBoxType(cap.capture());
		assertEquals("Y", cap.getValue().get("useYn"));
	}

	@DisplayName("포장단위: 이름 끝의 숫자 · 영문 단위를 읽는다(단위는 대문자), 없거나 0 이하면 비운다")
	@Test
	void packSize() {
		assertEquals("3|KG", size("소포장3kg"));
		assertEquals("5|KG", size("소포장 5kg"));
		assertEquals("500|G", size("소포장 500g"));
		assertEquals("1.5|KG", size("박스 1.5 KG "));
		assertEquals("12|EA", size("묶음12ea"));
		assertEquals("null|null", size("대포장"));
		assertEquals("null|null", size("5kg 소포장"));
		assertEquals("null|null", size("소포장 0kg"));
		assertEquals("null|null", size("소포장 1.2345kg"));
	}

	private static String size(String name) {
		Object[] s = BoxTypeServiceImpl.packSize(name);
		return (s[0] == null ? "null" : ((java.math.BigDecimal) s[0]).toPlainString()) + "|" + s[1];
	}

	@SuppressWarnings("unchecked")
	@DisplayName("저장 값에 포장단위가 들어간다")
	@Test
	void saveBoxType_putsPackSize() throws Exception {
		BoxTypeDAO dao = mock(BoxTypeDAO.class);
		BoxTypeServiceImpl service = new BoxTypeServiceImpl(dao);
		when(dao.updateBoxType(any())).thenReturn(1);
		service.saveBoxType(row(3L, "BT003", "소포장3kg"), "0000");
		ArgumentCaptor<Map<String, Object>> cap = ArgumentCaptor.forClass(Map.class);
		verify(dao).updateBoxType(cap.capture());
		assertEquals(new java.math.BigDecimal("3"), cap.getValue().get("packQty"));
		assertEquals("KG", cap.getValue().get("packUnit"));
	}

	@DisplayName("삭제: id 필수, 논리삭제, 없는 줄이면 알린다")
	@Test
	void deleteBoxType() throws Exception {
		BoxTypeDAO dao = mock(BoxTypeDAO.class);
		BoxTypeServiceImpl service = new BoxTypeServiceImpl(dao);
		assertEquals("삭제할 포장유형을 골라주세요", message(() -> {
			try { service.deleteBoxType(null, "0000"); } catch (RuntimeException ex) { throw ex; } catch (Exception ex) { throw new IllegalStateException(ex); }
		}));
		when(dao.deleteBoxType(any())).thenReturn(1);
		service.deleteBoxType(3L, "0000");
		verify(dao).deleteBoxType(any());
		when(dao.deleteBoxType(any())).thenReturn(0);
		assertEquals("포장유형을 찾을 수 없습니다. 다시 조회해 주세요", message(() -> {
			try { service.deleteBoxType(4L, "0000"); } catch (RuntimeException ex) { throw ex; } catch (Exception ex) { throw new IllegalStateException(ex); }
		}));
	}

	@DisplayName("새로 등록: 같은 코드가 오늘 사용안함으로 남아 표 유니크에 걸리면 안내 문구로 바꾼다")
	@Test
	void saveBoxType_duplicateKey() throws Exception {
		BoxTypeDAO dao = mock(BoxTypeDAO.class);
		BoxTypeServiceImpl service = new BoxTypeServiceImpl(dao);
		org.mockito.Mockito.doThrow(new org.springframework.dao.DuplicateKeyException("uq_box_type")).when(dao).insertBoxType(any());
		assertEquals("이미 쓴 적 있는 포장유형코드입니다(사용안함 포함): 000001", message(() -> save(service, row(null, "", "소포장"))));
	}
}

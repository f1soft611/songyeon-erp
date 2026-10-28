package egovframework.let.co.master.partnermaster.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Arrays;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.dao.DuplicateKeyException;

import egovframework.com.cmm.util.BusinessNo;
import egovframework.let.co.master.partnermaster.domain.model.ClientTypeVO;
import egovframework.let.co.master.partnermaster.domain.model.PartnerMasterVO;
import egovframework.let.co.master.partnermaster.domain.repository.PartnerMasterDAO;

class PartnerMasterServiceImplTest {

	// 공통코드 CUSTOMER_CATEGORY(2026-10-23): 001 매입거래처 · 002 매출거래처 · 003 매입+매출 거래처
	private static ClientTypeVO type(String code, String name) {
		ClientTypeVO vo = new ClientTypeVO();
		vo.setCode(code);
		vo.setName(name);
		return vo;
	}

	private static PartnerMasterDAO dao() throws Exception {
		PartnerMasterDAO dao = mock(PartnerMasterDAO.class);
		when(dao.selectClientTypes()).thenReturn(Arrays.asList(
				type("001", "매입거래처"), type("002", "매출거래처"), type("003", "매입+매출 거래처")));
		return dao;
	}

	private static PartnerMasterVO client(Long id, String name, String type) {
		PartnerMasterVO row = new PartnerMasterVO();
		row.setId(id);
		row.setName(name);
		row.setClientType(type);
		row.setUseYn("Y"); // 2026-10-27 등록 · 수정 창이 사용여부를 같이 보낸다
		return row;
	}

	@DisplayName("사업자등록번호: 숫자만 쳐도 모양을 맞추고, 자릿수·검산이 틀리면 막는다")
	@Test
	void businessNo_rules() {
		assertEquals("123-45-67891", BusinessNo.normalize("1234567891").getValue());
		assertEquals("123-45-67891", BusinessNo.normalize(" 123-45-67891 ").getValue());
		assertNull(BusinessNo.normalize("  ").getValue());
		assertNull(BusinessNo.normalize("  ").getError());
		assertEquals("사업자등록번호는 숫자 10자리여야 합니다 (지금 9자리). 예: 123-45-67890",
				BusinessNo.normalize("123456789").getError());
		assertEquals("사업자등록번호 '123-45-67890' 가 올바르지 않습니다. 숫자를 다시 확인해주세요.",
				BusinessNo.normalize("1234567890").getError());
	}

	@DisplayName("등록: 거래처명·분류 필수, 같은 이름 불가, 빈 칸은 null, 사업자번호는 모양을 맞춘다")
	@Test
	void createClient_rules() throws Exception {
		PartnerMasterDAO dao = dao();
		PartnerMasterServiceImpl service = new PartnerMasterServiceImpl(dao);

		assertEquals("거래처명은 필수입니다",
				assertThrows(IllegalArgumentException.class, () -> service.createClient(client(null, " ", "002"))).getMessage());
		assertEquals("거래처 분류를 선택해주세요",
				assertThrows(IllegalArgumentException.class, () -> service.createClient(client(null, "태화분식", ""))).getMessage());
		// 예전 글자 · 공통코드에 없는 코드는 창에서 받지 않는다(코드로만 저장)
		assertEquals("거래처 분류를 선택해주세요",
				assertThrows(IllegalArgumentException.class, () -> service.createClient(client(null, "태화분식", "매출"))).getMessage());
		assertEquals("거래처 분류를 선택해주세요",
				assertThrows(IllegalArgumentException.class, () -> service.createClient(client(null, "태화분식", "009"))).getMessage());
		PartnerMasterVO badNo = client(null, "태화분식", "002");
		badNo.setBusinessNo("1234567890");
		assertEquals("사업자등록번호 '123-45-67890' 가 올바르지 않습니다. 숫자를 다시 확인해주세요.",
				assertThrows(IllegalArgumentException.class, () -> service.createClient(badNo)).getMessage());

		when(dao.selectClientByName("디에이치식품")).thenReturn(client(1L, "디에이치식품", "002"));
		assertEquals("이미 등록된 거래처입니다",
				assertThrows(IllegalArgumentException.class, () -> service.createClient(client(null, " 디에이치식품 ", "002"))).getMessage());

		PartnerMasterVO ok = client(null, " 태화분식 ", "003");
		ok.setRegUserId("00000002");
		ok.setBusinessNo("1234567891");
		ok.setPhone("  ");
		ok.setMemo(" 담당 김 ");
		service.createClient(ok);
		ArgumentCaptor<PartnerMasterVO> saved = ArgumentCaptor.forClass(PartnerMasterVO.class);
		verify(dao).insertClient(saved.capture());
		assertEquals("태화분식", saved.getValue().getName());
		assertEquals("123-45-67891", saved.getValue().getBusinessNo());
		assertNull(saved.getValue().getPhone());
		assertEquals("담당 김", saved.getValue().getMemo());
		assertEquals("00000002", saved.getValue().getRegUserId());
	}

	@DisplayName("거래처코드(2026-10-23): 서버가 6자리로 매긴다 — 없으면 000001, 가장 큰 번호 + 1, 이미 있는 코드는 건너뜀")
	@Test
	void clientCode_autoNumber() throws Exception {
		PartnerMasterDAO dao = dao();
		PartnerMasterServiceImpl service = new PartnerMasterServiceImpl(dao);
		ArgumentCaptor<PartnerMasterVO> saved = ArgumentCaptor.forClass(PartnerMasterVO.class);

		when(dao.selectMaxClientCodeNo()).thenReturn(null);
		PartnerMasterVO first = client(null, "첫거래처", "002");
		first.setClientCode("999999"); // 화면에서 보낸 값은 쓰지 않는다
		service.createClient(first);
		verify(dao).insertClient(saved.capture());
		assertEquals("000001", saved.getValue().getClientCode());

		PartnerMasterDAO dao2 = dao();
		PartnerMasterServiceImpl service2 = new PartnerMasterServiceImpl(dao2);
		when(dao2.selectMaxClientCodeNo()).thenReturn(19);
		when(dao2.countClientCode("000020")).thenReturn(1);
		service2.createClient(client(null, "다음거래처", "001"));
		ArgumentCaptor<PartnerMasterVO> saved2 = ArgumentCaptor.forClass(PartnerMasterVO.class);
		verify(dao2).insertClient(saved2.capture());
		assertEquals("000021", saved2.getValue().getClientCode());

		assertEquals("000001", PartnerMasterServiceImpl.formatClientCode(1));
		assertEquals("123456", PartnerMasterServiceImpl.formatClientCode(123456));
	}

	@DisplayName("등록 경합·수정: 동시에 같은 이름이면 안내, 없는 거래처는 막고, 다른 거래처 이름으로 바꾸면 막는다")
	@Test
	void createRace_and_update() throws Exception {
		PartnerMasterDAO dao = dao();
		PartnerMasterServiceImpl service = new PartnerMasterServiceImpl(dao);
		doThrow(new DuplicateKeyException("dup")).when(dao).insertClient(any());
		assertEquals("방금 다른 사람이 같은 거래처명으로 먼저 등록했어요. 새로고침 후 확인해주세요.",
				assertThrows(IllegalArgumentException.class, () -> service.createClient(client(null, "새거래처", "002"))).getMessage());

		assertEquals("없는 거래처입니다",
				assertThrows(IllegalArgumentException.class, () -> service.updateClient(9L, client(null, "가", "002"))).getMessage());

		when(dao.selectClient(1L)).thenReturn(client(1L, "디에이치식품", "002"));
		PartnerMasterVO edit = client(null, "디에이치식품", "001");
		edit.setUpdUserId("00000002");
		service.updateClient(1L, edit);
		ArgumentCaptor<PartnerMasterVO> saved = ArgumentCaptor.forClass(PartnerMasterVO.class);
		verify(dao).updateClient(saved.capture());
		assertEquals(Long.valueOf(1L), saved.getValue().getId());
		assertEquals("001", saved.getValue().getClientType());
		assertEquals("00000002", saved.getValue().getUpdUserId());

		doThrow(new DuplicateKeyException("dup")).when(dao).updateClient(any());
		assertEquals("이미 등록된 거래처입니다",
				assertThrows(IllegalArgumentException.class, () -> service.updateClient(1L, client(null, "다른곳", "002"))).getMessage());
	}
}

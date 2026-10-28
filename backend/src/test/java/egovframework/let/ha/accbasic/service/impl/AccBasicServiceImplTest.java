package egovframework.let.ha.accbasic.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
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

import egovframework.let.ha.accbasic.domain.model.AccBankAccountVO;
import egovframework.let.ha.accbasic.domain.model.AccCardVO;
import egovframework.let.ha.accbasic.domain.model.AccSubjectVO;
import egovframework.let.ha.accbasic.domain.repository.AccBasicDAO;

class AccBasicServiceImplTest {

    @SuppressWarnings("unchecked")
    private static ArgumentCaptor<Map<String, Object>> captor() {
        return ArgumentCaptor.forClass(Map.class);
    }

    @DisplayName("계정과목: 코드 · 이름 필수, 구분 다섯 가지, 코드 겹침(고칠 땐 자기 빼고), 증가할 때(차변 · 대변)는 구분에서, 사용 기본값")
    @Test
    void subjects() throws Exception {
        AccBasicDAO dao = mock(AccBasicDAO.class);
        AccBasicServiceImpl service = new AccBasicServiceImpl(dao);
        AccSubjectVO r = new AccSubjectVO();
        r.setCode(" ");
        r.setName("복리후생비");
        assertEquals("계정코드와 계정과목명을 적어주세요", assertThrows(IllegalArgumentException.class, () -> service.saveSubject(r)).getMessage());
        r.setCode(" 511 ");
        r.setCategory("경비");
        assertEquals("구분은 자산·부채·자본·수익·비용 중에서 골라주세요", assertThrows(IllegalArgumentException.class, () -> service.saveSubject(r)).getMessage());
        r.setCategory("비용");
        when(dao.countSubjectCode("511", null)).thenReturn(1);
        assertEquals("계정코드 511 은(는) 이미 쓰고 있어요", assertThrows(IllegalArgumentException.class, () -> service.saveSubject(r)).getMessage());
        when(dao.countSubjectCode("511", null)).thenReturn(0);
        r.setNote(" ");
        service.saveSubject(r);
        ArgumentCaptor<Map<String, Object>> v = captor();
        verify(dao).insertSubject(v.capture());
        assertEquals("511", v.getValue().get("code"));
        assertEquals("차변", v.getValue().get("direction"));
        assertEquals(1, v.getValue().get("active"));
        assertNull(v.getValue().get("note"));
        r.setId(7L);
        r.setCategory("수익");
        r.setActive(0);
        when(dao.countSubjectCode("511", 7L)).thenReturn(0);
        service.saveSubject(r);
        ArgumentCaptor<Map<String, Object>> u = captor();
        verify(dao).updateSubject(u.capture());
        assertEquals("대변", u.getValue().get("direction"));
        assertEquals(0, u.getValue().get("active"));
        assertEquals("차변", AccBasicServiceImpl.directionOf("자산"));
        assertEquals("대변", AccBasicServiceImpl.directionOf("부채"));
        assertEquals("대변", AccBasicServiceImpl.directionOf("자본"));
    }

    @DisplayName("계좌: 은행 · 계좌번호 필수, 결제계좌로 쓰는 카드가 있으면 못 지움")
    @Test
    void bankAccounts() throws Exception {
        AccBasicDAO dao = mock(AccBasicDAO.class);
        AccBasicServiceImpl service = new AccBasicServiceImpl(dao);
        AccBankAccountVO r = new AccBankAccountVO();
        r.setBankName("농협");
        assertEquals("은행과 계좌번호를 적어주세요", assertThrows(IllegalArgumentException.class, () -> service.saveBankAccount(r)).getMessage());
        r.setAccountNo("301-1234-5678-91");
        r.setHolder(" ");
        service.saveBankAccount(r);
        ArgumentCaptor<Map<String, Object>> v = captor();
        verify(dao).insertBankAccount(v.capture());
        assertNull(v.getValue().get("holder"));
        when(dao.countCardsOfBank(3L)).thenReturn(2);
        assertEquals("이 계좌를 결제계좌로 쓰는 카드가 2개 있어요. 그 카드를 먼저 바꿔주세요",
                assertThrows(IllegalArgumentException.class, () -> service.deleteBankAccount(3L)).getMessage());
        verify(dao, never()).deleteBankAccount(3L);
        service.deleteBankAccount(4L);
        verify(dao).deleteBankAccount(4L);
    }

    @DisplayName("카드: 카드사 필수, 뒤 4자리만(숫자만 남겨 셈), 결제계좌는 숫자면 그 값 아니면 비움")
    @Test
    void cards() throws Exception {
        AccBasicDAO dao = mock(AccBasicDAO.class);
        AccBasicServiceImpl service = new AccBasicServiceImpl(dao);
        AccCardVO r = new AccCardVO();
        r.setLast4("4821");
        assertEquals("카드사를 적어주세요", assertThrows(IllegalArgumentException.class, () -> service.saveCard(r)).getMessage());
        r.setIssuer("신한");
        r.setLast4("1234-5678-9012-4821");
        assertEquals("카드번호는 뒤 4자리만 적어주세요 (앞자리는 보관하지 않아요)", assertThrows(IllegalArgumentException.class, () -> service.saveCard(r)).getMessage());
        r.setLast4(" 48-21 ");
        r.setBankAccountId("3");
        service.saveCard(r);
        ArgumentCaptor<Map<String, Object>> v = captor();
        verify(dao).insertCard(v.capture());
        assertEquals("4821", v.getValue().get("last4"));
        assertEquals(3L, v.getValue().get("bankAccountId"));
        r.setId(9L);
        r.setBankAccountId("");
        service.saveCard(r);
        ArgumentCaptor<Map<String, Object>> u = captor();
        verify(dao).updateCard(u.capture());
        assertNull(u.getValue().get("bankAccountId"));
        verify(dao, never()).insertSubject(any());
    }

    @DisplayName("사용 값: 안 보내면 사용, 0 · false · 빈 값은 사용안함")
    @Test
    void activeOf() {
        assertEquals(1, AccBasicServiceImpl.activeOf(null));
        assertEquals(1, AccBasicServiceImpl.activeOf(1));
        assertEquals(1, AccBasicServiceImpl.activeOf(true));
        assertEquals(0, AccBasicServiceImpl.activeOf(0));
        assertEquals(0, AccBasicServiceImpl.activeOf(false));
        assertEquals(0, AccBasicServiceImpl.activeOf(""));
        assertNull(AccBasicServiceImpl.toLong("x"));
    }
}

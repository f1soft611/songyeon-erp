package egovframework.let.ha.acctx.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import egovframework.let.ha.acctx.domain.model.AccTransactionSaveVO;
import egovframework.let.ha.acctx.domain.model.AccTransactionVO;
import egovframework.let.ha.acctx.domain.repository.AccTxDAO;

class AccTxServiceImplTest {

    private static AccTransactionVO tx(String kind, double amount) {
        AccTransactionVO t = new AccTransactionVO();
        t.setKind(kind);
        t.setAmount(amount);
        return t;
    }

    private static AccTransactionSaveVO save(String kind, String date, Object amount) {
        AccTransactionSaveVO r = new AccTransactionSaveVO();
        r.setKind(kind);
        r.setTxDate(date);
        r.setAmount(amount);
        return r;
    }

    @SuppressWarnings("unchecked")
    @DisplayName("목록: 기간 필수, 입금/출금만, 거래처 앞뒤 공백 떼기, 입금 · 출금 합계")
    @Test
    void list() throws Exception {
        AccTxDAO dao = mock(AccTxDAO.class);
        AccTxServiceImpl service = new AccTxServiceImpl(dao);
        Map<String, String> f = new HashMap<>();
        f.put("start", "2026-10-01");
        assertEquals("조회 기간을 선택해주세요", assertThrows(IllegalArgumentException.class, () -> service.listTransactions(f)).getMessage());
        f.put("end", "2026-10-31");
        f.put("kind", "이체");
        assertEquals("입금 또는 출금만 조회할 수 있습니다", assertThrows(IllegalArgumentException.class, () -> service.listTransactions(f)).getMessage());
        f.put("kind", "");
        f.put("clientName", " 태화 ");
        when(dao.selectTransactions(any())).thenReturn(Arrays.asList(tx("입금", 1000.5), tx("출금", 300), tx("입금", 0.1), tx("출금", 0.2)));
        Map<String, Object> result = service.listTransactions(f);
        assertEquals(1000.6, result.get("inTotal"));
        assertEquals(300.2, result.get("outTotal"));
        ArgumentCaptor<Map<String, Object>> cap = ArgumentCaptor.forClass(Map.class);
        verify(dao).selectTransactions(cap.capture());
        assertEquals("태화", cap.getValue().get("clientName"));
        assertEquals("", cap.getValue().get("kind"));
    }

    @SuppressWarnings("unchecked")
    @DisplayName("적기: 구분 · 날짜 · 금액(숫자, 0보다 큼) · 수단(비면 계좌) · 계정과목 있는지, 적은 사람은 새로 적을 때만")
    @Test
    void save() throws Exception {
        AccTxDAO dao = mock(AccTxDAO.class);
        AccTxServiceImpl service = new AccTxServiceImpl(dao);
        assertEquals("입금인지 출금인지 골라주세요", assertThrows(IllegalArgumentException.class, () -> service.saveTransaction(null, save("이체", "2026-10-14", 1), "관리자")).getMessage());
        assertEquals("날짜를 골라주세요", assertThrows(IllegalArgumentException.class, () -> service.saveTransaction(null, save("입금", " ", 1), "관리자")).getMessage());
        assertEquals("금액을 올바르게 적어주세요", assertThrows(IllegalArgumentException.class, () -> service.saveTransaction(null, save("입금", "2026-10-14", "만원"), "관리자")).getMessage());
        assertEquals("금액을 올바르게 적어주세요", assertThrows(IllegalArgumentException.class, () -> service.saveTransaction(null, save("입금", "2026-10-14", ""), "관리자")).getMessage());
        assertEquals("금액은 0보다 커야 해요. 되돌릴 것은 반대쪽(입금↔출금)으로 적어주세요",
                assertThrows(IllegalArgumentException.class, () -> service.saveTransaction(null, save("출금", "2026-10-14", "-500"), "관리자")).getMessage());
        AccTransactionSaveVO r = save("출금", "2026-10-14", "15000");
        r.setMethod("수표");
        assertEquals("결제수단이 올바르지 않습니다", assertThrows(IllegalArgumentException.class, () -> service.saveTransaction(null, r, "관리자")).getMessage());
        r.setMethod("");
        r.setSubjectId("99");
        assertEquals("계정과목을 찾을 수 없습니다", assertThrows(IllegalArgumentException.class, () -> service.saveTransaction(null, r, "관리자")).getMessage());
        verify(dao, never()).insertTransaction(any());
        when(dao.countSubject(2L)).thenReturn(1);
        r.setSubjectId(2);
        r.setClientName(" ");
        r.setBankAccountId("1");
        r.setCardId("");
        service.saveTransaction(null, r, "관리자");
        ArgumentCaptor<Map<String, Object>> v = ArgumentCaptor.forClass(Map.class);
        verify(dao).insertTransaction(v.capture());
        assertEquals("계좌", v.getValue().get("method"));
        assertEquals(15000.0, v.getValue().get("amount"));
        assertEquals(2L, v.getValue().get("subjectId"));
        assertEquals(1L, v.getValue().get("bankAccountId"));
        assertNull(v.getValue().get("cardId"));
        assertNull(v.getValue().get("clientName"));
        assertEquals("관리자", v.getValue().get("createdBy"));
        service.saveTransaction(5L, r, null);
        ArgumentCaptor<Map<String, Object>> u = ArgumentCaptor.forClass(Map.class);
        verify(dao).updateTransaction(u.capture());
        assertEquals(5L, u.getValue().get("id"));
        assertNull(u.getValue().get("createdBy"));
    }

    private static AccTransactionVO row(String date, Long subjectId, String subjectName, String client, String method, double amount) {
        AccTransactionVO t = tx("출금", amount);
        t.setTxDate(date);
        t.setSubjectId(subjectId);
        t.setSubjectName(subjectName);
        t.setClientName(client);
        t.setMethod(method);
        return t;
    }

    @SuppressWarnings("unchecked")
    @DisplayName("입·출금관리: 구분 · 기간 필수, 한쪽만 찾고, 계정과목 · 거래처 · 수단별 묶음(금액 큰 순, 없으면 '없음')과 합계")
    @Test
    void cashReport() throws Exception {
        AccTxDAO dao = mock(AccTxDAO.class);
        AccTxServiceImpl service = new AccTxServiceImpl(dao);
        Map<String, String> f = new HashMap<>();
        f.put("start", "2026-10-01");
        f.put("end", "2026-10-31");
        assertEquals("입금 또는 출금을 골라주세요", assertThrows(IllegalArgumentException.class, () -> service.cashReport(f)).getMessage());
        f.put("kind", "출금");
        f.put("end", "");
        assertEquals("조회 기간을 선택해주세요", assertThrows(IllegalArgumentException.class, () -> service.cashReport(f)).getMessage());
        f.put("end", "2026-10-31");
        when(dao.selectTransactions(any())).thenReturn(Arrays.asList(
                row("2026-10-01", 2L, "복리후생비", "동네식당", "카드", 38000),
                row("2026-10-02", null, null, null, "현금", 9000),
                row("2026-10-03", 2L, "복리후생비", null, "카드", 12000),
                row("2026-10-04", 5L, "소모품비", "동네식당", null, 60000)));
        Map<String, Object> r = service.cashReport(f);
        assertEquals(119000.0, r.get("total"));
        ArgumentCaptor<Map<String, Object>> cap = ArgumentCaptor.forClass(Map.class);
        verify(dao).selectTransactions(cap.capture());
        assertEquals("출금", cap.getValue().get("kind"));
        List<Map<String, Object>> bySubject = (List<Map<String, Object>>) r.get("bySubject");
        assertEquals("소모품비", bySubject.get(0).get("label"));
        assertEquals("복리후생비", bySubject.get(1).get("label"));
        assertEquals(50000.0, bySubject.get(1).get("amount"));
        assertEquals(2, bySubject.get(1).get("count"));
        assertEquals("계정과목 없음", bySubject.get(2).get("label"));
        List<Map<String, Object>> byClient = (List<Map<String, Object>>) r.get("byClient");
        assertEquals("동네식당", byClient.get(0).get("label"));
        assertEquals(98000.0, byClient.get(0).get("amount"));
        assertEquals("거래처 없음", byClient.get(1).get("label"));
        assertEquals(21000.0, byClient.get(1).get("amount"));
        List<Map<String, Object>> byMethod = (List<Map<String, Object>>) r.get("byMethod");
        assertEquals("-", byMethod.get(0).get("label"));
        assertEquals("카드", byMethod.get(1).get("label"));
        assertEquals("현금", byMethod.get(2).get("label"));
    }
}

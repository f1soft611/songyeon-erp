package egovframework.let.ha.accledger.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import egovframework.let.ha.accledger.domain.repository.AccLedgerDAO;
import egovframework.let.ha.accsales.domain.model.TradeSourceVO;
import egovframework.let.ha.accsales.domain.repository.AccSalesDAO;
import egovframework.let.ha.acctx.domain.model.AccTransactionVO;

class AccLedgerServiceImplTest {

    private static TradeSourceVO recv(String date, String client, String item, double qty, Double amount) {
        TradeSourceVO r = new TradeSourceVO();
        r.setDate(date);
        r.setClientName(client);
        r.setItemName(item);
        r.setQty(qty);
        r.setUnitPrice(amount == null ? null : amount / qty);
        r.setAmount(amount);
        return r;
    }

    private static AccTransactionVO paid(long id, String date, double amount, String note) {
        AccTransactionVO t = new AccTransactionVO();
        t.setId(id);
        t.setTxDate(date);
        t.setAmount(amount);
        t.setNote(note);
        return t;
    }

    private static Map<String, String> filter(String kind, String start, String end) {
        Map<String, String> f = new HashMap<>();
        if (kind != null) f.put("kind", kind);
        if (start != null) f.put("start", start);
        if (end != null) f.put("end", end);
        return f;
    }

    @DisplayName("검사: 구분 → 기간 → 거래처 한 곳 이상")
    @Test
    void validate() {
        AccLedgerServiceImpl service = new AccLedgerServiceImpl(mock(AccLedgerDAO.class), mock(AccSalesDAO.class));
        assertEquals("채권 또는 채무를 골라주세요", assertThrows(IllegalArgumentException.class, () -> service.clientLedger(filter("매출", "2026-10-01", "2026-10-31"), Arrays.asList("A"))).getMessage());
        assertEquals("조회 기간을 선택해주세요", assertThrows(IllegalArgumentException.class, () -> service.clientLedger(filter("채무", "2026-10-01", null), Arrays.asList("A"))).getMessage());
        assertEquals("거래처를 한 곳 이상 골라주세요", assertThrows(IllegalArgumentException.class, () -> service.clientLedger(filter("채무", "2026-10-01", "2026-10-31"), Arrays.asList(" ", ""))).getMessage());
        assertEquals("거래처를 한 곳 이상 골라주세요", assertThrows(IllegalArgumentException.class, () -> service.clientLedger(filter("채무", "2026-10-01", "2026-10-31"), null)).getMessage());
    }

    @SuppressWarnings("unchecked")
    @DisplayName("채무: 전월이월 = 앞 매입 − 앞 출금, 같은 날은 매입 먼저, 잔액 이어 세기, 단가 없는 입고는 0원 · 금액 모름, 남은 돈 큰 곳부터")
    @Test
    void payable() throws Exception {
        AccLedgerDAO ledgerDAO = mock(AccLedgerDAO.class);
        AccSalesDAO salesDAO = mock(AccSalesDAO.class);
        // 앞 기간(… ~ 2026-09-30)
        when(salesDAO.selectPurchases(argThat(m -> m != null && "2026-09-30".equals(m.get("end"))))).thenReturn(Arrays.asList(
                recv("2026-09-10", "한빛상사", "설탕", 10, 100000d), recv("2026-09-11", "대한식품", "고춧가루", 1, 5000d)));
        // 이번 기간
        when(salesDAO.selectPurchases(argThat(m -> m != null && "2026-10-31".equals(m.get("end"))))).thenReturn(Arrays.asList(
                recv("2026-10-05", "한빛상사", "설탕", 5, 50000d), recv("2026-10-05", "한빛상사", "물엿", 2, null),
                recv("2026-10-06", "대한식품", "고춧가루", 1, 5000d)));
        when(ledgerDAO.sumPaidBefore(argThat(m -> m != null && "한빛상사".equals(m.get("clientName")) && "출금".equals(m.get("kind"))))).thenReturn(30000d);
        when(ledgerDAO.selectPaid(argThat(m -> m != null && "한빛상사".equals(m.get("clientName"))))).thenReturn(Arrays.asList(paid(7, "2026-10-05", 20000, "10월 일부")));
        when(ledgerDAO.selectPaid(argThat(m -> m != null && "대한식품".equals(m.get("clientName"))))).thenReturn(Collections.emptyList());
        when(ledgerDAO.selectBusinessNo("한빛상사")).thenReturn("123-45-67890");
        when(ledgerDAO.selectBusinessNo("대한식품")).thenReturn("");
        AccLedgerServiceImpl service = new AccLedgerServiceImpl(ledgerDAO, salesDAO);

        Map<String, Object> r = service.clientLedger(filter("채무", "2026-10-01", "2026-10-31"), Arrays.asList("대한식품", "한빛상사"));
        List<Map<String, Object>> clients = (List<Map<String, Object>>) r.get("clients");
        assertEquals("한빛상사", clients.get(0).get("clientName"));
        Map<String, Object> c = clients.get(0);
        assertEquals("123-45-67890", c.get("businessNo"));
        assertEquals(70000d, c.get("openingBalance"));
        assertEquals(50000d, c.get("tradeTotal"));
        assertEquals(20000d, c.get("paidTotal"));
        assertEquals(100000d, c.get("closingBalance"));
        assertEquals(1, c.get("unpriced"));
        List<Map<String, Object>> entries = (List<Map<String, Object>>) c.get("entries");
        assertEquals(3, entries.size());
        assertEquals("설탕|50000.0|null|120000.0", line(entries.get(0)));
        assertEquals("물엿|0.0|null|120000.0", line(entries.get(1)));
        assertEquals(true, entries.get(1).get("unpriced"));
        assertEquals("|null|20000.0|100000.0", line(entries.get(2)));
        assertEquals("10월 일부", entries.get(2).get("note"));
        assertEquals(7L, entries.get(2).get("txId"));
        assertNull(entries.get(0).get("txId"));

        Map<String, Object> d = clients.get(1);
        assertNull(d.get("businessNo"));
        assertEquals(10000d, d.get("closingBalance"));
        assertEquals(110000d, r.get("totalClosing"));
    }

    private static String line(Map<String, Object> e) {
        return e.get("itemName") + "|" + e.get("amount") + "|" + e.get("paid") + "|" + e.get("balance");
    }

    @SuppressWarnings("unchecked")
    @DisplayName("채권: 확정 출하 × 판매단가, 이월해 들어온 줄은 '이월', 입금으로 줄어든다")
    @Test
    void receivable() throws Exception {
        AccLedgerDAO ledgerDAO = mock(AccLedgerDAO.class);
        AccSalesDAO salesDAO = mock(AccSalesDAO.class);
        TradeSourceVO ship = new TradeSourceVO();
        ship.setId(1L);
        ship.setDate("2026-10-03");
        ship.setClientName("태화분식");
        ship.setItemName("떡볶이소스(2kg)");
        ship.setQtyText("10");
        when(salesDAO.selectLogisticsShipped(argThat(m -> m != null && "2026-10-01".equals(m.get("start"))))).thenReturn(Arrays.asList(ship));
        TradeSourceVO price = new TradeSourceVO();
        price.setName("떡볶이소스");
        price.setSpec("2kg");
        price.setUnitPrice(1500d);
        when(salesDAO.selectProductPrices()).thenReturn(Arrays.asList(price));
        TradeSourceVO co = new TradeSourceVO();
        co.setDate("2026-09-29");
        co.setClientName("태화분식");
        co.setItemName("떡볶이소스(2kg)");
        co.setQty(2d);
        co.setUnitPrice(1500d);
        co.setAmount(3000d);
        when(salesDAO.selectCarryovers(argThat(m -> m != null && "2026-10".equals(m.get("startMonth"))))).thenReturn(Arrays.asList(co));
        when(ledgerDAO.selectPaid(any())).thenReturn(Arrays.asList(paid(3, "2026-10-03", 5000, null)));
        AccLedgerServiceImpl service = new AccLedgerServiceImpl(ledgerDAO, salesDAO);

        Map<String, Object> r = service.clientLedger(filter("채권", "2026-10-01", "2026-10-31"), Arrays.asList("태화분식"));
        Map<String, Object> c = ((List<Map<String, Object>>) r.get("clients")).get(0);
        List<Map<String, Object>> entries = (List<Map<String, Object>>) c.get("entries");
        assertEquals(0d, c.get("openingBalance"));
        assertEquals("2026-09-29|이월|3000.0", entries.get(0).get("date") + "|" + entries.get(0).get("note") + "|" + entries.get(0).get("balance"));
        assertEquals("2026-10-03||18000.0", entries.get(1).get("date") + "|" + entries.get(1).get("note") + "|" + entries.get(1).get("balance"));
        assertEquals(13000d, entries.get(2).get("balance"));
        assertEquals(13000d, c.get("closingBalance"));
    }

    @DisplayName("하루 앞: 달 · 해 넘김, 날짜가 아니면 그대로")
    @Test
    void prevDay() {
        assertEquals("2026-09-30", AccLedgerServiceImpl.prevDay("2026-10-01"));
        assertEquals("2025-12-31", AccLedgerServiceImpl.prevDay("2026-1-1"));
        assertEquals("x", AccLedgerServiceImpl.prevDay("x"));
    }
}

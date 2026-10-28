package egovframework.let.ha.taxinvoice.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import egovframework.let.system.serversettings.domain.model.ServerSettingVO;
import egovframework.let.system.serversettings.service.ServerSettingService;
import egovframework.let.ha.accsales.domain.model.TradeSourceVO;
import egovframework.let.ha.accsales.domain.repository.AccSalesDAO;
import egovframework.let.ha.taxinvoice.domain.repository.TaxInvoiceDAO;

class TaxInvoiceServiceImplTest {

    private static TradeSourceVO ship(long id, String date, String client, String item, String qty) {
        TradeSourceVO s = new TradeSourceVO();
        s.setId(id);
        s.setDate(date);
        s.setClientName(client);
        s.setItemName(item);
        s.setQtyText(qty);
        return s;
    }

    private static TradeSourceVO price(String name, String spec, Double p) {
        TradeSourceVO v = new TradeSourceVO();
        v.setName(name);
        v.setSpec(spec);
        v.setUnitPrice(p);
        return v;
    }

    private static ServerSettingService keys(String apiKey) throws Exception {
        ServerSettingService s = mock(ServerSettingService.class);
        ServerSettingVO v = new ServerSettingVO();
        v.setApiKey(apiKey);
        when(s.credentialOf("popbill")).thenReturn(v);
        return s;
    }

    private static AccSalesDAO sales() throws Exception {
        AccSalesDAO dao = mock(AccSalesDAO.class);
        when(dao.selectLogisticsShipped(any())).thenReturn(Arrays.asList(
                ship(1, "2026-10-03", "태화분식", "떡볶이소스(2kg)", "100"),
                ship(2, "2026-10-04", "태화분식", "매운소스(1kg)", "10"),
                ship(3, "2026-10-05", "ABC푸드", "떡볶이소스(2kg)", "300"),
                ship(4, "2026-10-06", null, "떡볶이소스(2kg)", "1")));
        when(dao.selectProductPrices()).thenReturn(Arrays.asList(price("떡볶이소스", "2kg", 1500d), price("매운소스", "1kg", null)));
        return dao;
    }

    private static Map<String, String> f(String... kv) {
        Map<String, String> m = new HashMap<>();
        for (int i = 0; i < kv.length; i += 2) m.put(kv[i], kv[i + 1]);
        return m;
    }

    @SuppressWarnings("unchecked")
    @DisplayName("즉시 발행: 필수 검사, 거래처 일부 이름 → 한 곳이면 그 이름, 그 거래처 매출 줄과 합계")
    @Test
    void single() throws Exception {
        TaxInvoiceDAO dao = mock(TaxInvoiceDAO.class);
        when(dao.selectClientsLike("태화")).thenReturn(Arrays.asList("태화분식"));
        when(dao.selectClientsLike("푸드")).thenReturn(Arrays.asList("ABC푸드", "XYZ푸드"));
        when(dao.selectClientsLike("없음")).thenReturn(Collections.emptyList());
        TaxInvoiceServiceImpl service = new TaxInvoiceServiceImpl(dao, sales(), keys(""));
        assertEquals("거래처와 조회 기간을 선택해주세요", assertThrows(IllegalArgumentException.class, () -> service.single(f("start", "2026-10-01", "end", "2026-10-31"))).getMessage());
        assertEquals("'없음'와 일치하는 거래처를 찾을 수 없어요", assertThrows(IllegalArgumentException.class, () -> service.single(f("clientName", "없음", "start", "2026-10-01", "end", "2026-10-31"))).getMessage());
        assertEquals("'푸드'와 일치하는 거래처가 여러 곳이에요(ABC푸드, XYZ푸드) — 더 정확히 입력해주세요",
                assertThrows(IllegalArgumentException.class, () -> service.single(f("clientName", "푸드", "start", "2026-10-01", "end", "2026-10-31"))).getMessage());

        Map<String, Object> r = service.single(f("clientName", " 태화 ", "start", "2026-10-01", "end", "2026-10-31"));
        assertEquals("태화분식", r.get("resolvedClientName"));
        List<Map<String, Object>> rows = (List<Map<String, Object>>) r.get("rows");
        assertEquals(2, rows.size());
        assertEquals(150000d, rows.get(0).get("amount"));
        assertEquals(null, rows.get(1).get("amount"));
        assertEquals(150000d, r.get("totalAmount"));
        assertEquals(110d, r.get("totalQty"));
    }

    @SuppressWarnings("unchecked")
    @DisplayName("일괄발행: 거래처별 수량 · 매출액, 단가 없음 표시, 거래처 없음은 '(거래처 미지정)', 매출액 큰 순")
    @Test
    void batch() throws Exception {
        TaxInvoiceServiceImpl service = new TaxInvoiceServiceImpl(mock(TaxInvoiceDAO.class), sales(), keys(""));
        assertEquals("조회 기간을 선택해주세요", assertThrows(IllegalArgumentException.class, () -> service.batch(f("start", "2026-10-01"))).getMessage());
        Map<String, Object> r = service.batch(f("start", "2026-10-01", "end", "2026-10-31"));
        List<Map<String, Object>> clients = (List<Map<String, Object>>) r.get("clients");
        assertEquals(3, clients.size());
        assertEquals("ABC푸드|300.0|450000.0|false", line(clients.get(0)));
        assertEquals("태화분식|110.0|150000.0|true", line(clients.get(1)));
        assertEquals("(거래처 미지정)|1.0|1500.0|false", line(clients.get(2)));
        assertEquals(601500d, r.get("totalAmount"));
    }

    private static String line(Map<String, Object> g) {
        return g.get("clientName") + "|" + g.get("qty") + "|" + g.get("amount") + "|" + g.get("hasMissingPrice");
    }

    @DisplayName("발행: 키가 없으면 연결 안내, 있으면 준비 중(아무것도 적지 않는다)")
    @Test
    void issue() throws Exception {
        TaxInvoiceServiceImpl none = new TaxInvoiceServiceImpl(mock(TaxInvoiceDAO.class), mock(AccSalesDAO.class), keys(""));
        assertEquals(false, none.status().get("configured"));
        assertEquals(TaxInvoiceServiceImpl.NOT_READY, assertThrows(IllegalArgumentException.class, none::issue).getMessage());
        TaxInvoiceServiceImpl ready = new TaxInvoiceServiceImpl(mock(TaxInvoiceDAO.class), mock(AccSalesDAO.class), keys("abc"));
        assertEquals(true, ready.status().get("configured"));
        assertEquals("발행 기능은 아직 준비 중이에요.", assertThrows(IllegalArgumentException.class, ready::issue).getMessage());
    }
}

package egovframework.let.ha.accsales.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import egovframework.let.ha.accsales.domain.model.TradeSourceVO;
import egovframework.let.ha.accsales.domain.repository.AccSalesDAO;

class AccSalesServiceImplTest {

    private static TradeSourceVO ship(long id, String date, String client, String item, String qtyText) {
        TradeSourceVO s = new TradeSourceVO();
        s.setId(id);
        s.setDate(date);
        s.setClientName(client);
        s.setItemName(item);
        s.setQtyText(qtyText);
        return s;
    }

    private static TradeSourceVO price(String name, String spec, Double unitPrice) {
        TradeSourceVO p = new TradeSourceVO();
        p.setName(name);
        p.setSpec(spec);
        p.setUnitPrice(unitPrice);
        return p;
    }

    private static TradeSourceVO carried(String type, long id, double qty) {
        TradeSourceVO c = new TradeSourceVO();
        c.setScheduleType(type);
        c.setScheduleId(id);
        c.setQty(qty);
        return c;
    }

    private static TradeSourceVO recv(String date, String client, String item, double qty, double unitPrice) {
        TradeSourceVO r = new TradeSourceVO();
        r.setDate(date);
        r.setClientName(client);
        r.setItemName(item);
        r.setQty(qty);
        r.setUnitPrice(unitPrice);
        r.setSupplyAmount(qty * unitPrice);
        r.setVatAmount(qty * unitPrice / 10);
        r.setAmount(qty * unitPrice * 1.1);
        return r;
    }

    private static Map<String, String> filter(String kind, String start, String end, String view, String unit) {
        Map<String, String> f = new HashMap<>();
        if (kind != null) f.put("kind", kind);
        if (start != null) f.put("start", start);
        if (end != null) f.put("end", end);
        if (view != null) f.put("view", view);
        if (unit != null) f.put("unit", unit);
        return f;
    }

    private static String message(AccSalesServiceImpl service, Map<String, String> f) {
        return assertThrows(IllegalArgumentException.class, () -> service.tradeReport(f, null, null)).getMessage();
    }

    @DisplayName("검사: 구분 → 기간 → 보기 → 단위 순, 보기 · 단위는 안 보내면 집계 · 월별")
    @Test
    void validate() throws Exception {
        AccSalesDAO dao = mock(AccSalesDAO.class);
        AccSalesServiceImpl service = new AccSalesServiceImpl(dao);
        assertEquals("매출 또는 매입을 골라주세요", message(service, filter(null, "2026-10-01", "2026-10-31", null, null)));
        assertEquals("매출 또는 매입을 골라주세요", message(service, filter("입금", "2026-10-01", "2026-10-31", null, null)));
        assertEquals("조회 기간을 선택해주세요", message(service, filter("매입", "2026-10-01", " ", null, null)));
        assertEquals("보기 방식을 골라주세요", message(service, filter("매입", "2026-10-01", "2026-10-31", "", null)));
        assertEquals("기간 단위를 골라주세요", message(service, filter("매입", "2026-10-01", "2026-10-31", "summary", "week")));
        when(dao.selectPurchases(any())).thenReturn(new ArrayList<>());
        Map<String, Object> r = service.tradeReport(filter("매입", "2026-10-01", "2026-10-31", null, null), null, null);
        assertEquals("summary", r.get("view"));
        assertEquals("month", r.get("unit"));
        assertEquals(Collections.emptyList(), r.get("periods"));
    }

    @SuppressWarnings("unchecked")
    @DisplayName("매출 내역: 이월한 수량은 빼고(다 넘긴 건은 빠짐) 이월해 들어온 건은 원래 날짜로, 단가 없으면 금액 null, 고른 이름과 똑같은 것만")
    @Test
    void salesDetail() throws Exception {
        AccSalesDAO dao = mock(AccSalesDAO.class);
        AccSalesServiceImpl service = new AccSalesServiceImpl(dao);
        when(dao.selectLogisticsShipped(any())).thenReturn(Arrays.asList(
                ship(1, "2026-10-06", "태화분식", "떡볶이소스(2kg)", "1,000kg"),
                ship(2, "2026-10-03", "태화분식", "매운소스(1kg)", "50"),
                ship(3, "2026-10-04", "ABC푸드", "떡볶이소스(2kg)", "30")));
        when(dao.selectProductionShipped(any())).thenReturn(Arrays.asList(
                ship(1, "2026-10-03", "ABC푸드", "떡볶이소스(2kg)", "20박스")));
        when(dao.selectProductPrices()).thenReturn(Arrays.asList(price("떡볶이소스", "2kg", 1500d), price("매운소스", "1kg", null)));
        // 수동 1번은 400 만 넘겼고 3번은 다 넘겼다. 생산 1번 id 는 수동 1번과 같지만 갈래가 달라 안 빠진다
        when(dao.selectCarriedQty()).thenReturn(Arrays.asList(carried("logistics", 1, 400), carried("logistics", 3, 30)));
        TradeSourceVO co = ship(0, "2026-09-28", "ABC푸드", "떡볶이소스(2kg)", null);
        co.setQty(10d);
        co.setUnitPrice(1400d);
        co.setAmount(14000d);
        when(dao.selectCarryovers(argThat(m -> "2026-10".equals(m.get("startMonth")) && "2026-10".equals(m.get("endMonth"))))).thenReturn(Arrays.asList(co));

        Map<String, Object> r = service.tradeReport(filter("매출", "2026-10-01", "2026-10-31", "detail", null), null, null);
        List<Map<String, Object>> rows = (List<Map<String, Object>>) r.get("rows");
        assertEquals(4, rows.size());
        // 날짜 → 거래처 → 품목 순
        assertEquals("2026-09-28|ABC푸드|10.0|14000.0", line(rows.get(0)));
        assertEquals("2026-10-03|ABC푸드|20.0|30000.0", line(rows.get(1)));
        assertEquals("2026-10-03|태화분식|50.0|null", line(rows.get(2)));
        assertEquals("2026-10-06|태화분식|600.0|900000.0", line(rows.get(3)));
        assertNull(rows.get(3).get("supplyAmount"));
        assertEquals(944000d, r.get("totalAmount"));
        assertEquals(680d, r.get("totalQty"));
        assertEquals(1, r.get("unpriced"));

        Map<String, Object> picked = service.tradeReport(filter("매출", "2026-10-01", "2026-10-31", "detail", null),
                Arrays.asList(" ABC푸드 ", ""), Arrays.asList("떡볶이소스(2kg)"));
        assertEquals(Arrays.asList("ABC푸드"), picked.get("clients"));
        assertEquals(2, ((List<?>) picked.get("rows")).size());
        Map<String, Object> partial = service.tradeReport(filter("매출", "2026-10-01", "2026-10-31", "detail", null), null, Arrays.asList("소스"));
        assertEquals(0, ((List<?>) partial.get("rows")).size());
    }

    private static String line(Map<String, Object> row) {
        return row.get("date") + "|" + row.get("clientName") + "|" + row.get("qty") + "|" + row.get("amount");
    }

    @SuppressWarnings("unchecked")
    @DisplayName("매입 집계: 기간 단위로 묶어 건수 · 수량 · 공급가액 · 부가세 · 합계, 묶음 이름 순")
    @Test
    void purchaseSummary() throws Exception {
        AccSalesDAO dao = mock(AccSalesDAO.class);
        AccSalesServiceImpl service = new AccSalesServiceImpl(dao);
        TradeSourceVO noPrice = recv("2026-10-02", "한빛상사", "설탕", 5, 0);
        noPrice.setAmount(null);
        when(dao.selectPurchases(any())).thenReturn(Arrays.asList(
                recv("2026-10-13", "한빛상사", "설탕", 10, 1000), noPrice, recv("2026-09-30", "대한식품", "고춧가루", 2, 5000)));
        Map<String, Object> r = service.tradeReport(filter("매입", "2026-09-01", "2026-10-31", "summary", "month"), null, null);
        List<Map<String, Object>> periods = (List<Map<String, Object>>) r.get("periods");
        assertEquals(2, periods.size());
        assertEquals("2026-09", periods.get(0).get("period"));
        assertEquals(11000d, (Double) periods.get(0).get("amount"), 1e-6);
        Map<String, Object> oct = periods.get(1);
        assertEquals("2026-10", oct.get("period"));
        assertEquals(2, oct.get("count"));
        assertEquals(15d, oct.get("qty"));
        assertEquals(10000d, (Double) oct.get("supplyAmount"), 1e-6);
        assertEquals(1000d, (Double) oct.get("vatAmount"), 1e-6);
        assertEquals(11000d, (Double) oct.get("amount"), 1e-6);
        assertEquals(1, oct.get("unpriced"));
        assertEquals(1, r.get("unpriced"));
        Map<String, Object> year = service.tradeReport(filter("매입", "2026-09-01", "2026-10-31", "summary", "year"), null, null);
        assertEquals("2026", ((List<Map<String, Object>>) year.get("periods")).get(0).get("period"));
    }

    @SuppressWarnings("unchecked")
    @DisplayName("전년동기간비교: 작년 같은 기간(2/29 → 2/28)을 해를 올려 나란히, 작년 0 이면 증감률 null")
    @Test
    void yoy() throws Exception {
        AccSalesDAO dao = mock(AccSalesDAO.class);
        AccSalesServiceImpl service = new AccSalesServiceImpl(dao);
        when(dao.selectPurchases(argThat(m -> m != null && "2028-01-01".equals(m.get("start")) && "2028-02-29".equals(m.get("end")))))
                .thenReturn(Arrays.asList(recv("2028-01-10", "A", "설탕", 10, 1000), recv("2028-02-29", "A", "설탕", 1, 1000)));
        when(dao.selectPurchases(argThat(m -> m != null && "2027-01-01".equals(m.get("start")) && "2027-02-28".equals(m.get("end")))))
                .thenReturn(Arrays.asList(recv("2027-01-05", "A", "설탕", 3, 1000)));
        Map<String, Object> r = service.tradeReport(filter("매입", "2028-01-01", "2028-02-29", "yoy", "month"), null, null);
        assertEquals("2027-01-01", r.get("prevStart"));
        assertEquals("2027-02-28", r.get("prevEnd"));
        List<Map<String, Object>> compare = (List<Map<String, Object>>) r.get("compare");
        assertEquals(2, compare.size());
        assertEquals("2028-01", compare.get(0).get("period"));
        assertEquals(233.3, compare.get(0).get("pct"));
        assertEquals("2028-02", compare.get(1).get("period"));
        assertNull(compare.get(1).get("pct"));
        assertEquals(266.7, r.get("totalPct"));
    }

    @DisplayName("작은 규칙: 수량 글자, 해 옮기기, 묶음 해 올리기, 증감률 반올림")
    @Test
    void helpers() {
        assertEquals(1000d, TradeRowReader.parseQty("1,000kg"));
        assertEquals(0d, TradeRowReader.parseQty("박스"));
        assertEquals(0d, TradeRowReader.parseQty(null));
        assertEquals("2023-02-28", AccSalesServiceImpl.shiftYear("2024-02-29", -1));
        assertEquals("2025-03-05", AccSalesServiceImpl.shiftYear("2026-3-5", -1));
        assertEquals("abc", AccSalesServiceImpl.shiftYear("abc", -1));
        assertEquals("2026-03", AccSalesServiceImpl.bumpPeriodYear("2025-03", 1));
        assertEquals("", AccSalesServiceImpl.bumpPeriodYear("", 1));
        assertEquals("", AccSalesServiceImpl.periodKey(null, "month"));
        assertEquals(-50.0, AccSalesServiceImpl.pct(50, 100));
        assertNull(AccSalesServiceImpl.pct(10, 0));
    }

    @DisplayName("고를 거리: 매출은 사용 중 거래처(2026-10-23) · 제품 '이름(규격)', 매입은 매입처 · 원재료")
    @Test
    void options() throws Exception {
        AccSalesDAO dao = mock(AccSalesDAO.class);
        AccSalesServiceImpl service = new AccSalesServiceImpl(dao);
        when(dao.selectActiveClientNames()).thenReturn(Arrays.asList("ABC푸드"));
        when(dao.selectSalesClientNames()).thenReturn(Arrays.asList("ABC푸드", "사용안함상회")); // 조회 거름용(전체), 고를 거리에는 안 씀
        when(dao.selectSaleProducts()).thenReturn(Arrays.asList(price("떡볶이소스", "2kg", null), price("간장", "", null), price(null, null, null)));
        when(dao.selectVendorClientNames()).thenReturn(Arrays.asList("한빛상사"));
        when(dao.selectMaterialNames()).thenReturn(Arrays.asList("설탕"));
        Map<String, Object> sale = service.options("매출");
        assertEquals(Arrays.asList("ABC푸드"), sale.get("clients"));
        assertEquals(Arrays.asList("떡볶이소스(2kg)", "간장"), sale.get("items"));
        Map<String, Object> buy = service.options("매입");
        assertEquals(Arrays.asList("한빛상사"), buy.get("clients"));
        assertEquals(Arrays.asList("설탕"), buy.get("items"));
        assertEquals("매출 또는 매입을 골라주세요", assertThrows(IllegalArgumentException.class, () -> service.options(null)).getMessage());
    }
}

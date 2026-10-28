package egovframework.let.ha.accsales.service.impl;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import egovframework.let.ha.accsales.domain.model.TradeSourceVO;
import egovframework.let.ha.accsales.domain.repository.AccSalesDAO;

/**
 * 인사·회계 - 매출 · 매입 줄 읽기 (송연 common.py _sales_rows · _purchase_rows)
 * 매출·매입관리와 거래처별관리대장이 같은 줄을 써야 해서 한 곳에 둔다(따로 두면 같은 출하가 화면마다 다른 금액으로 보인다).
 * 줄: {date, clientName, itemName, qty, unitPrice, supplyAmount, vatAmount, amount}. 이월해 들어온 매출 줄은 carriedOver=true 가 붙는다.
 * @author SONGYEON ERP
 * @since 2026.10.15
 * @version 1.0
 */
public class TradeRowReader {

    private static final Pattern QTY = Pattern.compile("[\\d.]+");

    private final AccSalesDAO dao;

    public TradeRowReader(AccSalesDAO dao) {
        this.dao = dao;
    }

    // 송연 _sales_rows(confirmed_only): 확정된 출하(수동 → 생산연동) × 판매단가. 이월한 수량은 원래 날짜에서 빼고(다 넘겼으면 줄째 빠진다),
    // 이 기간으로 넘어온 이월은 원래 출고일 · 적어둔 단가 · 금액으로 더한다
    public List<Map<String, Object>> salesRows(String start, String end) throws Exception {
        Map<String, Object> period = period(start, end);
        List<TradeSourceVO> manual = dao.selectLogisticsShipped(period);
        List<TradeSourceVO> produced = dao.selectProductionShipped(period);
        Map<String, Double> priceByDisplay = new HashMap<>();
        for (TradeSourceVO p : dao.selectProductPrices()) {
            priceByDisplay.put(display(p.getName(), p.getSpec()), p.getUnitPrice());
        }
        Map<String, Double> carried = new HashMap<>();
        for (TradeSourceVO c : dao.selectCarriedQty()) {
            carried.put(c.getScheduleType() + "#" + c.getScheduleId(), c.getQty() == null ? 0 : c.getQty());
        }
        List<Map<String, Object>> result = new ArrayList<>();
        addShipped(result, manual, "logistics", carried, priceByDisplay);
        addShipped(result, produced, "production", carried, priceByDisplay);
        for (TradeSourceVO c : dao.selectCarryovers(period)) {
            Map<String, Object> carriedIn = row(c.getDate(), c.getClientName(), c.getItemName(), c.getQty(), c.getUnitPrice(), null, null, c.getAmount());
            carriedIn.put("carriedOver", true);
            result.add(carriedIn);
        }
        // 송연은 여기서 날짜 → 거래처 순으로 한 번 세운다(같은 날 같은 거래처 안의 순서가 이것으로 정해진다)
        result.sort(Comparator.<Map<String, Object>, String>comparing(r -> text(r.get("date")))
                .thenComparing(r -> text(r.get("clientName"))));
        return result;
    }

    private static void addShipped(List<Map<String, Object>> result, List<TradeSourceVO> shipped, String type,
            Map<String, Double> carried, Map<String, Double> priceByDisplay) {
        for (TradeSourceVO s : shipped) {
            double qty = parseQty(s.getQtyText()) - carried.getOrDefault(type + "#" + s.getId(), 0d);
            if (qty <= 0.0001) {
                continue;
            }
            Double unitPrice = priceByDisplay.get(s.getItemName() == null ? "" : s.getItemName());
            Double amount = unitPrice == null ? null : qty * unitPrice;
            result.add(row(s.getDate(), s.getClientName(), s.getItemName(), qty, unitPrice, null, null, amount));
        }
    }

    // 송연 _purchase_rows: 입고등록이 곧 실제 입고라 확정 단계가 없다. 합계금액(total_amount)이 금액이다
    public List<Map<String, Object>> purchaseRows(String start, String end) throws Exception {
        List<Map<String, Object>> result = new ArrayList<>();
        for (TradeSourceVO r : dao.selectPurchases(period(start, end))) {
            result.add(row(r.getDate(), r.getClientName(), r.getItemName(), r.getQty(), r.getUnitPrice(), r.getSupplyAmount(), r.getVatAmount(), r.getAmount()));
        }
        return result;
    }

    private static Map<String, Object> row(String date, String client, String item, Double qty, Double unitPrice,
            Double supply, Double vat, Double amount) {
        Map<String, Object> r = new LinkedHashMap<>();
        r.put("date", date);
        r.put("clientName", client == null ? "" : client);
        r.put("itemName", item == null ? "" : item);
        r.put("qty", qty);
        r.put("unitPrice", unitPrice);
        r.put("supplyAmount", supply);
        r.put("vatAmount", vat);
        r.put("amount", amount);
        return r;
    }

    // 송연 parse_qty_number: '1,000kg' → 1000. 쉼표를 빼고 첫 숫자 덩어리, 없으면 0
    public static double parseQty(String value) {
        if (value == null || value.isEmpty()) {
            return 0;
        }
        Matcher matcher = QTY.matcher(value.replace(",", ""));
        if (!matcher.find()) {
            return 0;
        }
        try {
            return Double.parseDouble(matcher.group());
        } catch (NumberFormatException ex) {
            return 0;
        }
    }

    private static Map<String, Object> period(String start, String end) {
        Map<String, Object> p = new HashMap<>();
        p.put("start", start);
        p.put("end", end);
        p.put("startMonth", left(start, 7));
        p.put("endMonth", left(end, 7));
        return p;
    }

    public static String display(String name, String spec) {
        return spec != null && !spec.isEmpty() ? name + "(" + spec + ")" : (name == null ? "" : name);
    }

    private static String text(Object v) {
        return v == null ? "" : v.toString();
    }

    private static String left(String s, int n) {
        return s.length() <= n ? s : s.substring(0, n);
    }
}

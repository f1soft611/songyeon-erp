package egovframework.let.ha.accsales.service.impl;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DateTimeException;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.TreeSet;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

import egovframework.let.ha.accsales.domain.model.TradeSourceVO;
import egovframework.let.ha.accsales.domain.repository.AccSalesDAO;
import egovframework.let.ha.accsales.service.AccSalesService;

/**
 * 인사·회계 - 매출·매입관리 서비스 구현 클래스 (송연 accounting.py _trade_rows · _trade_buckets · accounting_trade_report, common.py _sales_rows · _purchase_rows 와 같은 규칙)
 * @author SONGYEON ERP
 * @since 2026.10.15
 * @version 1.0
 */
@Service("accSalesService")
public class AccSalesServiceImpl extends EgovAbstractServiceImpl implements AccSalesService {

    static final List<String> TRADE_KINDS = Arrays.asList("매출", "매입");
    static final List<String> TRADE_UNITS = Arrays.asList("day", "month", "year");
    static final List<String> TRADE_VIEWS = Arrays.asList("summary", "detail", "yoy");
    private static final Pattern DATE = Pattern.compile("(\\d{4})-(\\d{1,2})-(\\d{1,2})");

    private final AccSalesDAO accSalesDAO;
    private final TradeRowReader tradeRowReader;

    public AccSalesServiceImpl(AccSalesDAO accSalesDAO) {
        this.accSalesDAO = accSalesDAO;
        this.tradeRowReader = new TradeRowReader(accSalesDAO);
    }

    @Override
    public Map<String, Object> tradeReport(Map<String, String> filter, List<String> clientList, List<String> itemList) throws Exception {
        String kind = trim(filter.get("kind"));
        if (!TRADE_KINDS.contains(kind)) {
            throw new IllegalArgumentException("매출 또는 매입을 골라주세요");
        }
        String start = trim(filter.get("start"));
        String end = trim(filter.get("end"));
        if (start.isEmpty() || end.isEmpty()) {
            throw new IllegalArgumentException("조회 기간을 선택해주세요");
        }
        String view = filter.containsKey("view") ? trim(filter.get("view")) : "summary";
        if (!TRADE_VIEWS.contains(view)) {
            throw new IllegalArgumentException("보기 방식을 골라주세요");
        }
        String unit = filter.containsKey("unit") ? trim(filter.get("unit")) : "month";
        if (!TRADE_UNITS.contains(unit)) {
            throw new IllegalArgumentException("기간 단위를 골라주세요");
        }
        // 거래처도 품목도 안 고르면 전체다. 화면에서 목록을 보고 담는 방식이라 둘 다 이름을 여럿 받는다
        List<String> clients = names(clientList);
        List<String> items = names(itemList);

        List<Map<String, Object>> rows = tradeRows(kind, start, end, clients, items);
        Map<String, Object> base = new LinkedHashMap<>();
        base.put("kind", kind);
        base.put("view", view);
        base.put("unit", unit);
        base.put("start", start);
        base.put("end", end);
        base.put("clients", clients);
        base.put("items", items);
        double totalAmount = sumAmount(rows);
        double totalQty = 0;
        int unpriced = 0;
        for (Map<String, Object> r : rows) {
            totalQty += orZero(r.get("qty"));
            if (r.get("amount") == null) {
                unpriced++;
            }
        }
        base.put("totalAmount", totalAmount);
        base.put("totalQty", totalQty);
        base.put("unpriced", unpriced);

        if ("detail".equals(view)) {
            base.put("rows", rows);
            return base;
        }
        if ("summary".equals(view)) {
            base.put("periods", buckets(rows, unit));
            return base;
        }

        // 전년동기간비교. 같은 기간을 한 해 뒤로 옮겨 다시 뽑고, 작년 묶음의 해를 한 살 올려 올해 묶음 옆에 세운다(3월은 3월끼리 견준다)
        String prevStart = shiftYear(start, -1);
        String prevEnd = shiftYear(end, -1);
        List<Map<String, Object>> prevRows = tradeRows(kind, prevStart, prevEnd, clients, items);
        Map<String, Double> curBy = new HashMap<>();
        for (Map<String, Object> b : buckets(rows, unit)) {
            curBy.put((String) b.get("period"), (Double) b.get("amount"));
        }
        Map<String, Double> prevBy = new HashMap<>();
        for (Map<String, Object> b : buckets(prevRows, unit)) {
            prevBy.put(bumpPeriodYear((String) b.get("period"), 1), (Double) b.get("amount"));
        }
        Set<String> periods = new TreeSet<>(curBy.keySet());
        periods.addAll(prevBy.keySet());
        List<Map<String, Object>> compare = new ArrayList<>();
        for (String period : periods) {
            double cur = curBy.getOrDefault(period, 0d);
            double prev = prevBy.getOrDefault(period, 0d);
            Map<String, Object> c = new LinkedHashMap<>();
            c.put("period", period);
            c.put("cur", cur);
            c.put("prev", prev);
            c.put("diff", cur - prev);
            // 작년이 0원이면 몇 % 늘었는지 말할 수 없다. 비워 두고 화면에서 '신규' 라고 적는다
            c.put("pct", pct(cur, prev));
            compare.add(c);
        }
        double totalPrev = sumAmount(prevRows);
        base.put("compare", compare);
        base.put("prevStart", prevStart);
        base.put("prevEnd", prevEnd);
        base.put("totalPrev", totalPrev);
        base.put("totalDiff", totalAmount - totalPrev);
        base.put("totalPct", pct(totalAmount, totalPrev));
        return base;
    }

    @Override
    public Map<String, Object> options(String kindParam) throws Exception {
        String kind = trim(kindParam);
        if (!TRADE_KINDS.contains(kind)) {
            throw new IllegalArgumentException("매출 또는 매입을 골라주세요");
        }
        List<String> clients;
        List<String> items = new ArrayList<>();
        if ("매출".equals(kind)) {
            // 2026-10-23 고르는 목록은 사용 중 거래처만(거래처별관리대장 조회 거름은 selectSalesClientNames 로 전체)
            clients = accSalesDAO.selectActiveClientNames();
            for (TradeSourceVO p : accSalesDAO.selectSaleProducts()) {
                String display = TradeRowReader.display(p.getName(), p.getSpec());
                if (!display.isEmpty()) {
                    items.add(display);
                }
            }
        } else {
            clients = accSalesDAO.selectVendorClientNames();
            items.addAll(accSalesDAO.selectMaterialNames());
        }
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("clients", clients);
        result.put("items", items);
        return result;
    }

    // 송연 _trade_rows: 매출 또는 매입을 한 모양으로 맞추고, 고른 이름과 똑같은 것만 남긴 뒤 날짜 → 거래처 → 품목 순으로 세운다.
    // 공급가액 · 부가세는 매입에만 있다. 매출은 빈칸으로 둔다(0 이라 적으면 부가세가 0원인 것처럼 읽힌다)
    List<Map<String, Object>> tradeRows(String kind, String start, String end, List<String> clients, List<String> items) throws Exception {
        List<Map<String, Object>> rows = "매출".equals(kind) ? tradeRowReader.salesRows(start, end) : tradeRowReader.purchaseRows(start, end);
        for (Map<String, Object> r : rows) {
            r.remove("carriedOver");
        }
        if (!clients.isEmpty() || !items.isEmpty()) {
            Set<String> pickedClients = new HashSet<>(clients);
            Set<String> pickedItems = new HashSet<>(items);
            List<Map<String, Object>> kept = new ArrayList<>();
            for (Map<String, Object> r : rows) {
                if ((clients.isEmpty() || pickedClients.contains(r.get("clientName")))
                        && (items.isEmpty() || pickedItems.contains(r.get("itemName")))) {
                    kept.add(r);
                }
            }
            rows = kept;
        }
        rows.sort(Comparator.<Map<String, Object>, String>comparing(r -> text(r.get("date")))
                .thenComparing(r -> text(r.get("clientName")))
                .thenComparing(r -> text(r.get("itemName"))));
        return rows;
    }

    // 송연 _trade_buckets: 기간 단위로 묶어 합친다. 단가가 안 적힌 건은 금액에 넣지 않고 몇 건인지만 센다
    static List<Map<String, Object>> buckets(List<Map<String, Object>> rows, String unit) {
        Map<String, Map<String, Object>> byKey = new TreeMap<>();
        for (Map<String, Object> r : rows) {
            String key = periodKey((String) r.get("date"), unit);
            Map<String, Object> b = byKey.get(key);
            if (b == null) {
                b = new LinkedHashMap<>();
                b.put("period", key);
                b.put("count", 0);
                b.put("qty", 0d);
                b.put("supplyAmount", 0d);
                b.put("vatAmount", 0d);
                b.put("amount", 0d);
                b.put("unpriced", 0);
                byKey.put(key, b);
            }
            b.put("count", (Integer) b.get("count") + 1);
            b.put("qty", (Double) b.get("qty") + orZero(r.get("qty")));
            if (r.get("amount") == null) {
                b.put("unpriced", (Integer) b.get("unpriced") + 1);
                continue;
            }
            b.put("amount", (Double) b.get("amount") + (Double) r.get("amount"));
            b.put("supplyAmount", (Double) b.get("supplyAmount") + orZero(r.get("supplyAmount")));
            b.put("vatAmount", (Double) b.get("vatAmount") + orZero(r.get("vatAmount")));
        }
        return new ArrayList<>(byKey.values());
    }

    // 송연 _period_key: 2026-03-05 → 년 2026 / 월 2026-03 / 일 2026-03-05
    static String periodKey(String date, String unit) {
        String s = left(date == null ? "" : date, 10);
        if ("year".equals(unit)) {
            return left(s, 4);
        }
        if ("month".equals(unit)) {
            return left(s, 7);
        }
        return s;
    }

    // 송연 _shift_year: 해 단위로 옮긴다. 2월 29일은 옮긴 해에 없으면 28일로 내린다. 날짜가 아니면 그대로
    static String shiftYear(String date, int years) {
        Matcher m = date == null ? null : DATE.matcher(date);
        if (m == null || !m.matches()) {
            return date;
        }
        int y = Integer.parseInt(m.group(1));
        int mo = Integer.parseInt(m.group(2));
        int d = Integer.parseInt(m.group(3));
        try {
            LocalDate.of(y, mo, d);
        } catch (DateTimeException ex) {
            return date;
        }
        try {
            return LocalDate.of(y + years, mo, d).toString();
        } catch (DateTimeException ex) {
            return LocalDate.of(y + years, mo, 28).toString();
        }
    }

    // 송연 _bump_period_year: 묶음 이름의 해만 옮긴다(2025-03 → 2026-03)
    static String bumpPeriodYear(String period, int years) {
        if (period.length() < 4 || !period.substring(0, 4).chars().allMatch(Character::isDigit)) {
            return period;
        }
        return (Integer.parseInt(period.substring(0, 4)) + years) + period.substring(4);
    }

    // 송연 round((cur - prev) / prev * 100, 1). 작년이 0 이면 null
    static Double pct(double cur, double prev) {
        if (prev == 0) {
            return null;
        }
        return new BigDecimal((cur - prev) / prev * 100).setScale(1, RoundingMode.HALF_EVEN).doubleValue();
    }


    private static double sumAmount(List<Map<String, Object>> rows) {
        double sum = 0;
        for (Map<String, Object> r : rows) {
            sum += orZero(r.get("amount"));
        }
        return sum;
    }



    private static List<String> names(List<String> raw) {
        List<String> out = new ArrayList<>();
        if (raw != null) {
            for (String n : raw) {
                String t = trim(n);
                if (!t.isEmpty()) {
                    out.add(t);
                }
            }
        }
        return out;
    }

    private static double orZero(Object v) {
        return v == null ? 0 : ((Number) v).doubleValue();
    }

    private static String text(Object v) {
        return v == null ? "" : v.toString();
    }

    private static String left(String s, int n) {
        return s.length() <= n ? s : s.substring(0, n);
    }

    private static String trim(String v) {
        return v == null ? "" : v.trim();
    }
}

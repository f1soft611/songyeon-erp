package egovframework.let.ha.accledger.service.impl;

import java.time.DateTimeException;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

import egovframework.let.ha.accledger.domain.repository.AccLedgerDAO;
import egovframework.let.ha.accledger.service.AccLedgerService;
import egovframework.let.ha.accsales.domain.repository.AccSalesDAO;
import egovframework.let.ha.accsales.service.impl.TradeRowReader;
import egovframework.let.ha.acctx.domain.model.AccTransactionVO;

/**
 * 인사·회계 - 거래처별관리대장 서비스 구현 클래스 (송연 accounting.py accounting_client_ledger 와 같은 규칙)
 * @author SONGYEON ERP
 * @since 2026.10.15
 * @version 1.0
 */
@Service("accLedgerService")
public class AccLedgerServiceImpl extends EgovAbstractServiceImpl implements AccLedgerService {

    private static final String EPOCH = "0000-01-01";
    private static final Pattern DATE = Pattern.compile("(\\d{4})-(\\d{1,2})-(\\d{1,2})");

    private final AccLedgerDAO accLedgerDAO;
    private final AccSalesDAO accSalesDAO;
    private final TradeRowReader tradeRowReader;

    public AccLedgerServiceImpl(AccLedgerDAO accLedgerDAO, AccSalesDAO accSalesDAO) {
        this.accLedgerDAO = accLedgerDAO;
        this.accSalesDAO = accSalesDAO;
        this.tradeRowReader = new TradeRowReader(accSalesDAO);
    }

    @Override
    public Map<String, Object> clientLedger(Map<String, String> filter, List<String> clientList) throws Exception {
        String kind = trim(filter.get("kind"));
        if (!"채권".equals(kind) && !"채무".equals(kind)) {
            throw new IllegalArgumentException("채권 또는 채무를 골라주세요");
        }
        String start = trim(filter.get("start"));
        String end = trim(filter.get("end"));
        if (start.isEmpty() || end.isEmpty()) {
            throw new IllegalArgumentException("조회 기간을 선택해주세요");
        }
        List<String> names = new ArrayList<>();
        if (clientList != null) {
            for (String n : clientList) {
                if (!trim(n).isEmpty()) {
                    names.add(trim(n));
                }
            }
        }
        if (names.isEmpty()) {
            throw new IllegalArgumentException("거래처를 한 곳 이상 골라주세요");
        }

        boolean isRc = "채권".equals(kind);
        String moneyKind = isRc ? "입금" : "출금";   // 잔액을 줄이는 쪽
        String prev = prevDay(start);
        List<Map<String, Object>> out = new ArrayList<>();
        for (String name : names) {
            double openingTrade = 0;
            for (Map<String, Object> r : trade(isRc, EPOCH, prev, name)) {
                openingTrade += orZero(r.get("amount"));
            }
            Map<String, Object> f = new HashMap<>();
            f.put("kind", moneyKind);
            f.put("clientName", name);
            f.put("start", start);
            f.put("end", end);
            double openingPaid = accLedgerDAO.sumPaidBefore(f);
            double balance = openingTrade - openingPaid;

            // 같은 날이면 거래를 먼저, 수금 · 지급을 나중에 둔다(샀다가 갚았다 순서로 읽힌다)
            List<Object[]> sorted = new ArrayList<>();
            int unpriced = 0;
            for (Map<String, Object> r : trade(isRc, start, end, name)) {
                boolean noPrice = r.get("amount") == null;
                if (noPrice) {
                    unpriced++;
                }
                Map<String, Object> e = new LinkedHashMap<>();
                e.put("date", r.get("date") == null ? "" : r.get("date"));
                e.put("itemName", r.get("itemName"));
                e.put("qty", r.get("qty"));
                e.put("unitPrice", r.get("unitPrice"));
                e.put("amount", orZero(r.get("amount")));
                e.put("paid", null);
                e.put("unpriced", noPrice);
                e.put("note", Boolean.TRUE.equals(r.get("carriedOver")) ? "이월" : "");
                sorted.add(new Object[] { e, 0 });
            }
            for (AccTransactionVO t : accLedgerDAO.selectPaid(f)) {
                Map<String, Object> e = new LinkedHashMap<>();
                e.put("date", t.getTxDate() == null ? "" : t.getTxDate());
                e.put("itemName", "");
                e.put("qty", null);
                e.put("unitPrice", null);
                e.put("amount", null);
                e.put("paid", t.getAmount() == null ? 0d : t.getAmount());
                e.put("unpriced", false);
                e.put("note", t.getNote() == null ? "" : t.getNote());
                e.put("txId", t.getId());
                sorted.add(new Object[] { e, 1 });
            }
            sorted.sort(Comparator.<Object[], String>comparing(o -> entryDate(o))
                    .thenComparing(o -> (Integer) o[1]));
            List<Map<String, Object>> entries = new ArrayList<>();
            double tradeTotal = 0;
            double paidTotal = 0;
            for (Object[] o : sorted) {
                @SuppressWarnings("unchecked")
                Map<String, Object> e = (Map<String, Object>) o[0];
                balance += orZero(e.get("amount")) - orZero(e.get("paid"));
                e.put("balance", balance);
                entries.add(e);
            }
            for (Map<String, Object> e : entries) {
                tradeTotal += orZero(e.get("amount"));
            }
            for (Map<String, Object> e : entries) {
                paidTotal += orZero(e.get("paid"));
            }
            String businessNo = accLedgerDAO.selectBusinessNo(name);
            Map<String, Object> c = new LinkedHashMap<>();
            c.put("clientName", name);
            c.put("businessNo", businessNo == null || businessNo.isEmpty() ? null : businessNo);
            c.put("openingBalance", openingTrade - openingPaid);
            c.put("tradeTotal", tradeTotal);
            c.put("paidTotal", paidTotal);
            c.put("closingBalance", balance);
            c.put("unpriced", unpriced);
            c.put("entries", entries);
            out.add(c);
        }
        // 줄 돈 · 받을 돈이 많은 곳부터 본다(목록이 길어지면 아래쪽은 안 보게 된다)
        out.sort(Comparator.comparing(c -> -Math.abs((Double) c.get("closingBalance"))));
        double totalClosing = 0;
        for (Map<String, Object> c : out) {
            totalClosing += (Double) c.get("closingBalance");
        }
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("kind", kind);
        result.put("start", start);
        result.put("end", end);
        result.put("clients", out);
        result.put("totalClosing", totalClosing);
        return result;
    }

    @Override
    public List<String> clientNames() throws Exception {
        return accSalesDAO.selectSalesClientNames();
    }

    // 송연 _sales_rows / _purchase_rows 에 거래처 이름을 똑같이 맞춘 것
    private List<Map<String, Object>> trade(boolean isRc, String start, String end, String name) throws Exception {
        List<Map<String, Object>> rows = isRc ? tradeRowReader.salesRows(start, end) : tradeRowReader.purchaseRows(start, end);
        List<Map<String, Object>> kept = new ArrayList<>();
        for (Map<String, Object> r : rows) {
            if (name.equals(r.get("clientName"))) {
                kept.add(r);
            }
        }
        return kept;
    }

    // 송연 _prev_day: 하루 앞. 날짜가 아니면 그대로
    static String prevDay(String date) {
        Matcher m = date == null ? null : DATE.matcher(date);
        if (m == null || !m.matches()) {
            return date;
        }
        try {
            return LocalDate.of(Integer.parseInt(m.group(1)), Integer.parseInt(m.group(2)), Integer.parseInt(m.group(3))).minusDays(1).toString();
        } catch (DateTimeException ex) {
            return date;
        }
    }

    @SuppressWarnings("unchecked")
    private static String entryDate(Object[] o) {
        return (String) ((Map<String, Object>) o[0]).get("date");
    }

    private static double orZero(Object v) {
        return v == null ? 0 : ((Number) v).doubleValue();
    }

    private static String trim(String v) {
        return v == null ? "" : v.trim();
    }
}

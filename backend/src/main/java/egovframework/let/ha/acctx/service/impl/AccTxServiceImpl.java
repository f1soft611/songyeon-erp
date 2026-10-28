package egovframework.let.ha.acctx.service.impl;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

import egovframework.let.ha.acctx.domain.model.AccTransactionSaveVO;
import egovframework.let.ha.acctx.domain.model.AccTransactionVO;
import egovframework.let.ha.acctx.domain.repository.AccTxDAO;
import egovframework.let.ha.acctx.service.AccTxService;

/**
 * 인사·회계 - 회계거래현황 서비스 구현 클래스 (송연 accounting.py 와 같은 규칙)
 * @author SONGYEON ERP
 * @since 2026.10.14
 * @version 1.0
 */
@Service("accTxService")
public class AccTxServiceImpl extends EgovAbstractServiceImpl implements AccTxService {

    static final List<String> TX_KINDS = Arrays.asList("입금", "출금");
    static final List<String> TX_METHODS = Arrays.asList("현금", "계좌", "카드", "어음", "기타");
    private static final DateTimeFormatter ISO_SECONDS = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");

    private final AccTxDAO accTxDAO;

    public AccTxServiceImpl(AccTxDAO accTxDAO) {
        this.accTxDAO = accTxDAO;
    }

    @Override
    public Map<String, Object> listTransactions(Map<String, String> filter) throws Exception {
        String start = trim(filter.get("start"));
        String end = trim(filter.get("end"));
        if (start.isEmpty() || end.isEmpty()) {
            throw new IllegalArgumentException("조회 기간을 선택해주세요");
        }
        String kind = trim(filter.get("kind"));
        if (!kind.isEmpty() && !TX_KINDS.contains(kind)) {
            throw new IllegalArgumentException("입금 또는 출금만 조회할 수 있습니다");
        }
        Map<String, Object> f = new HashMap<>();
        f.put("start", start);
        f.put("end", end);
        f.put("kind", kind);
        f.put("clientName", trim(filter.get("clientName")));
        List<AccTransactionVO> rows = accTxDAO.selectTransactions(f);
        BigDecimal in = BigDecimal.ZERO;
        BigDecimal out = BigDecimal.ZERO;
        for (AccTransactionVO r : rows) {
            BigDecimal amount = r.getAmount() == null ? BigDecimal.ZERO : BigDecimal.valueOf(r.getAmount());
            if ("입금".equals(r.getKind())) {
                in = in.add(amount);
            } else if ("출금".equals(r.getKind())) {
                out = out.add(amount);
            }
        }
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("rows", rows);
        result.put("inTotal", in.doubleValue());
        result.put("outTotal", out.doubleValue());
        return result;
    }

    @Override
    public void saveTransaction(Long id, AccTransactionSaveVO r, String employeeName) throws Exception {
        String kind = trim(r.getKind());
        if (!TX_KINDS.contains(kind)) {
            throw new IllegalArgumentException("입금인지 출금인지 골라주세요");
        }
        String txDate = trim(r.getTxDate());
        if (txDate.isEmpty()) {
            throw new IllegalArgumentException("날짜를 골라주세요");
        }
        Double amount = toDouble(r.getAmount());
        if (amount == null) {
            throw new IllegalArgumentException("금액을 올바르게 적어주세요");
        }
        // 금액은 늘 양수로 적는다. 음수를 받으면 '마이너스 출금' 이 들어오고, 합계를 낼 때마다 부호를 어디서 뒤집었는지 따라가야 한다
        if (amount <= 0) {
            throw new IllegalArgumentException("금액은 0보다 커야 해요. 되돌릴 것은 반대쪽(입금↔출금)으로 적어주세요");
        }
        String method = trim(r.getMethod());
        if (method.isEmpty()) {
            method = "계좌";
        }
        if (!TX_METHODS.contains(method)) {
            throw new IllegalArgumentException("결제수단이 올바르지 않습니다");
        }
        Long subjectId = toLong(r.getSubjectId());
        if (subjectId != null && subjectId != 0 && accTxDAO.countSubject(subjectId) == 0) {
            throw new IllegalArgumentException("계정과목을 찾을 수 없습니다");
        }
        Map<String, Object> v = new HashMap<>();
        v.put("id", id);
        v.put("kind", kind);
        v.put("txDate", txDate);
        v.put("clientName", blankToNull(r.getClientName()));
        v.put("subjectId", subjectId);
        v.put("amount", amount);
        v.put("method", method);
        v.put("bankAccountId", toLong(r.getBankAccountId()));
        v.put("cardId", toLong(r.getCardId()));
        v.put("note", blankToNull(r.getNote()));
        if (id == null) {
            v.put("createdBy", employeeName);
            v.put("now", LocalDateTime.now(ZoneId.of("Asia/Seoul")).format(ISO_SECONDS));
            accTxDAO.insertTransaction(v);
        } else {
            accTxDAO.updateTransaction(v);
        }
    }

    @Override
    public void deleteTransaction(long id) throws Exception {
        accTxDAO.deleteTransaction(id);
    }

    @Override
    public Map<String, Object> cashReport(Map<String, String> filter) throws Exception {
        String kind = trim(filter.get("kind"));
        if (!TX_KINDS.contains(kind)) {
            throw new IllegalArgumentException("입금 또는 출금을 골라주세요");
        }
        String start = trim(filter.get("start"));
        String end = trim(filter.get("end"));
        if (start.isEmpty() || end.isEmpty()) {
            throw new IllegalArgumentException("조회 기간을 선택해주세요");
        }
        Map<String, Object> f = new HashMap<>();
        f.put("start", start);
        f.put("end", end);
        f.put("kind", kind);
        f.put("clientName", trim(filter.get("clientName")));
        List<AccTransactionVO> rows = accTxDAO.selectTransactions(f);
        BigDecimal total = BigDecimal.ZERO;
        for (AccTransactionVO r : rows) {
            total = total.add(amountOf(r));
        }
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("kind", kind);
        result.put("start", start);
        result.put("end", end);
        result.put("rows", rows);
        result.put("total", total.doubleValue());
        result.put("bySubject", bucket(rows, r -> r.getSubjectId() == null ? "" : String.valueOf(r.getSubjectId()),
                r -> hasText(r.getSubjectName()) ? r.getSubjectName() : "계정과목 없음"));
        result.put("byClient", bucket(rows, r -> r.getClientName() == null ? "" : r.getClientName(),
                r -> hasText(r.getClientName()) ? r.getClientName() : "거래처 없음"));
        result.put("byMethod", bucket(rows, r -> r.getMethod() == null ? "" : r.getMethod(),
                r -> hasText(r.getMethod()) ? r.getMethod() : "-"));
        return result;
    }

    /** 송연 bucket: 열쇠별로 금액 · 건수를 모아 금액 큰 순(같으면 처음 나온 순) */
    static List<Map<String, Object>> bucket(List<AccTransactionVO> rows, Function<AccTransactionVO, String> key,
            Function<AccTransactionVO, String> label) {
        Map<String, Object[]> groups = new LinkedHashMap<>();
        for (AccTransactionVO r : rows) {
            Object[] g = groups.computeIfAbsent(key.apply(r), k -> new Object[] { label.apply(r), BigDecimal.ZERO, 0 });
            g[1] = ((BigDecimal) g[1]).add(amountOf(r));
            g[2] = (Integer) g[2] + 1;
        }
        List<Map<String, Object>> out = new ArrayList<>();
        for (Object[] g : groups.values()) {
            Map<String, Object> b = new LinkedHashMap<>();
            b.put("label", g[0]);
            b.put("amount", ((BigDecimal) g[1]).doubleValue());
            b.put("count", g[2]);
            out.add(b);
        }
        out.sort((a, b) -> Double.compare((Double) b.get("amount"), (Double) a.get("amount")));
        return out;
    }

    private static BigDecimal amountOf(AccTransactionVO r) {
        return r.getAmount() == null ? BigDecimal.ZERO : BigDecimal.valueOf(r.getAmount());
    }

    private static boolean hasText(String value) {
        return value != null && !value.isEmpty();
    }

    /** 파이썬 float(x): 숫자나 숫자 글자, 아니면 null */
    static Double toDouble(Object value) {
        if (value instanceof Number) {
            return ((Number) value).doubleValue();
        }
        String s = value == null ? "" : String.valueOf(value).trim();
        if (s.isEmpty()) {
            return null;
        }
        try {
            double d = Double.parseDouble(s);
            return Double.isNaN(d) || Double.isInfinite(d) ? null : d;
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    /** 송연 _acc_num: 정수로 읽히면 그 값, 아니면 null */
    static Long toLong(Object value) {
        if (value instanceof Number) {
            return ((Number) value).longValue();
        }
        String s = value == null ? "" : String.valueOf(value).trim();
        return s.matches("-?\\d+") ? Long.valueOf(s) : null;
    }

    private static String blankToNull(String value) {
        String s = trim(value);
        return s.isEmpty() ? null : s;
    }

    private static String trim(String value) {
        return value == null ? "" : value.trim();
    }
}

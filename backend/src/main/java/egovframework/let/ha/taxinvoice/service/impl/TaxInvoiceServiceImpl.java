package egovframework.let.ha.taxinvoice.service.impl;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

import egovframework.let.system.serversettings.service.ServerSettingService;
import egovframework.let.ha.accsales.domain.repository.AccSalesDAO;
import egovframework.let.ha.accsales.service.impl.TradeRowReader;
import egovframework.let.ha.taxinvoice.domain.repository.TaxInvoiceDAO;
import egovframework.let.ha.taxinvoice.service.TaxInvoiceService;

/**
 * 인사·회계 - 세금계산서 서비스 구현 클래스 (송연과 같은 규칙)
 * @author SONGYEON ERP
 * @since 2026.10.15
 * @version 1.0
 */
@Service("taxInvoiceService")
public class TaxInvoiceServiceImpl extends EgovAbstractServiceImpl implements TaxInvoiceService {

    static final String NOT_READY = "아직 전자세금계산서 발급업체(팝빌 등) API 키가 연결되지 않았어요. "
            + "기초정보 > 서버관리에서 등록하시면 실제 발행이 가능해집니다.";
    static final String PENDING = "발행 기능은 아직 준비 중이에요.";
    static final String NO_CLIENT = "(거래처 미지정)";

    private final TaxInvoiceDAO taxInvoiceDAO;
    private final ServerSettingService serverSettingService;
    private final TradeRowReader tradeRowReader;

    public TaxInvoiceServiceImpl(TaxInvoiceDAO taxInvoiceDAO, AccSalesDAO accSalesDAO, ServerSettingService serverSettingService) {
        this.taxInvoiceDAO = taxInvoiceDAO;
        this.serverSettingService = serverSettingService;
        this.tradeRowReader = new TradeRowReader(accSalesDAO);
    }

    private boolean configured() throws Exception {
        String key = serverSettingService.credentialOf("popbill").getApiKey();
        return key != null && !key.isEmpty();
    }

    @Override
    public Map<String, Object> status() throws Exception {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("configured", configured());
        return result;
    }

    // 송연 /api/accounting/sales-by-client/detail
    @Override
    public Map<String, Object> single(Map<String, String> filter) throws Exception {
        String start = trim(filter.get("start"));
        String end = trim(filter.get("end"));
        String query = trim(filter.get("clientName"));
        if (start.isEmpty() || end.isEmpty() || query.isEmpty()) {
            throw new IllegalArgumentException("거래처와 조회 기간을 선택해주세요");
        }
        String clientName = resolveClient(query);
        List<Map<String, Object>> rows = new ArrayList<>();
        double totalAmount = 0;
        double totalQty = 0;
        for (Map<String, Object> r : tradeRowReader.salesRows(start, end)) {
            if (clientName.equals(r.get("clientName"))) {
                r.remove("supplyAmount");
                r.remove("vatAmount");
                r.put("carriedOver", Boolean.TRUE.equals(r.get("carriedOver")));
                rows.add(r);
                totalAmount += orZero(r.get("amount"));
                totalQty += orZero(r.get("qty"));
            }
        }
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("rows", rows);
        result.put("totalAmount", totalAmount);
        result.put("totalQty", totalQty);
        result.put("resolvedClientName", clientName);
        return result;
    }

    // 송연 /api/accounting/sales-by-client: 거래처별로 묶어 수량 · 매출액을 더한다. 단가가 없는 건은 금액에 넣지 않고 표시만 한다
    @Override
    public Map<String, Object> batch(Map<String, String> filter) throws Exception {
        String start = trim(filter.get("start"));
        String end = trim(filter.get("end"));
        if (start.isEmpty() || end.isEmpty()) {
            throw new IllegalArgumentException("조회 기간을 선택해주세요");
        }
        Map<String, Map<String, Object>> grouped = new LinkedHashMap<>();
        for (Map<String, Object> r : tradeRowReader.salesRows(start, end)) {
            String name = (String) r.get("clientName");
            String key = name == null || name.isEmpty() ? NO_CLIENT : name;
            Map<String, Object> g = grouped.get(key);
            if (g == null) {
                g = new LinkedHashMap<>();
                g.put("clientName", key);
                g.put("qty", 0d);
                g.put("amount", 0d);
                g.put("hasMissingPrice", false);
                grouped.put(key, g);
            }
            g.put("qty", (Double) g.get("qty") + orZero(r.get("qty")));
            if (r.get("amount") != null) {
                g.put("amount", (Double) g.get("amount") + ((Number) r.get("amount")).doubleValue());
            } else {
                g.put("hasMissingPrice", true);
            }
        }
        List<Map<String, Object>> clients = new ArrayList<>(grouped.values());
        clients.sort(Comparator.comparing(g -> -(Double) g.get("amount")));
        double total = 0;
        for (Map<String, Object> g : clients) {
            total += (Double) g.get("amount");
        }
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("clients", clients);
        result.put("totalAmount", total);
        return result;
    }

    @Override
    public void issue() throws Exception {
        if (!configured()) {
            throw new IllegalArgumentException(NOT_READY);
        }
        // 송연도 팝빌 API 키 연결 후 실제 발행 로직을 넣기로 하고 비워 두었다
        throw new IllegalArgumentException(PENDING);
    }

    // 송연 _resolve_single_client: 똑같은 이름이 있으면 그것, 없으면 일부가 맞는 곳이 한 곳뿐일 때 그 이름
    String resolveClient(String query) throws Exception {
        String exact = taxInvoiceDAO.selectExactClient(query);
        if (exact != null) {
            return exact;
        }
        List<String> names = taxInvoiceDAO.selectClientsLike(query);
        if (names.size() == 1) {
            return names.get(0);
        }
        if (names.isEmpty()) {
            throw new IllegalArgumentException("'" + query + "'와 일치하는 거래처를 찾을 수 없어요");
        }
        throw new IllegalArgumentException("'" + query + "'와 일치하는 거래처가 여러 곳이에요("
                + String.join(", ", names.subList(0, Math.min(10, names.size()))) + ") — 더 정확히 입력해주세요");
    }

    private static double orZero(Object v) {
        return v == null ? 0 : ((Number) v).doubleValue();
    }

    private static String trim(String v) {
        return v == null ? "" : v.trim();
    }
}

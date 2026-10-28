package egovframework.let.sl.register.service.impl;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

import egovframework.let.sl.register.domain.model.SalesPullRequestVO;
import egovframework.let.sl.register.domain.model.SalesPullResultVO;
import egovframework.let.sl.register.domain.model.SalesRecordVO;
import egovframework.let.sl.register.domain.model.ShippableListVO;
import egovframework.let.sl.register.domain.model.ShippableSaleVO;
import egovframework.let.sl.register.domain.repository.SalesRegisterDAO;
import egovframework.let.sl.register.service.SalesRegisterService;

/**
 * 판매관리 - 판매등록 서비스 구현 클래스 (송연 sales.py 를 옮김).
 *
 * ■ 매출·매입관리와 무엇이 다른가
 * 매출·매입관리는 출하확정된 것을 '계산해서' 보여준다. 여기는 '적어두는' 곳이다.
 * 출하확정된 것을 끌어와 판매로 남기고, 출하 없이 판 것은 직접 적는다. 한 번 적으면 출하 쪽이 바뀌어도 그대로 남는다.
 * ■ 금액은 적어둘 때 값으로 굳는다 — 단가를 고치는 순간 지난달 판매 금액까지 바뀌면 안 된다.
 * @author SONGYEON ERP
 * @since 2026.10.07
 * @version 1.0
 */
@Service("salesRegisterService")
public class SalesRegisterServiceImpl extends EgovAbstractServiceImpl implements SalesRegisterService {

    static final String CLIENT_CODE_MESSAGE = "거래처마스터에 있는 거래처를 적어주세요";
    static final String PRODUCT_CODE_MESSAGE = "제품마스터에 있는 품목을 적어주세요";
    private static final Pattern QTY = Pattern.compile("[\\d.]+");
    private static final Pattern DATE = Pattern.compile("^\\d{4}-\\d{2}-\\d{2}$");
    private static final DateTimeFormatter CREATED_AT = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");

    private final SalesRegisterDAO salesRegisterDAO;

    public SalesRegisterServiceImpl(SalesRegisterDAO salesRegisterDAO) {
        this.salesRegisterDAO = salesRegisterDAO;
    }

    @Override
    public ShippableListVO listShippable(String start, String end, String clientName) throws Exception {
        if (isBlank(start) || isBlank(end)) {
            throw new IllegalArgumentException("조회 기간을 선택해주세요");
        }
        List<ShippableSaleVO> rows = shippableRows(start.trim(), end.trim(), blankToNull(clientName));
        int pending = 0;
        for (ShippableSaleVO row : rows) {
            if (!Boolean.TRUE.equals(row.getAlready())) {
                pending++;
            }
        }
        ShippableListVO result = new ShippableListVO();
        result.setRows(rows);
        result.setPendingCount(pending);
        return result;
    }

    // 화면이 보낸 금액을 그대로 믿지 않는다. 지금 출하 기록에서 다시 센다 —
    // 화면을 열어둔 사이에 출하가 취소되거나 수량이 바뀌었을 수 있다.
    @Override
    public SalesPullResultVO pull(SalesPullRequestVO request, String employeeId) throws Exception {
        TreeSet<String> wanted = new TreeSet<>();
        if (request != null && request.getItems() != null) {
            for (ShippableSaleVO item : request.getItems()) {
                String type = item.getSourceType();
                if (("logistics".equals(type) || "production".equals(type)) && item.getSourceId() != null && item.getSourceId() != 0) {
                    wanted.add(key(type, item.getSourceId()));
                }
            }
        }
        if (wanted.isEmpty()) {
            throw new IllegalArgumentException("가져올 항목을 선택해주세요");
        }
        Map<String, ShippableSaleVO> fresh = new HashMap<>();
        for (ShippableSaleVO row : shippableRows("0000-01-01", "9999-12-31", null)) {
            fresh.put(key(row.getSourceType(), row.getSourceId()), row);
        }
        String now = LocalDateTime.now(ZoneId.of("Asia/Seoul")).format(CREATED_AT);
        SalesPullResultVO result = new SalesPullResultVO();
        for (String k : wanted) {
            ShippableSaleVO row = fresh.get(k);
            if (row == null || Boolean.TRUE.equals(row.getAlready())) {
                result.setSkipped(result.getSkipped() + 1);
                continue;
            }
            SalesRecordVO sale = new SalesRecordVO();
            sale.setSaleDate(row.getSaleDate());
            sale.setClientName(row.getClientName());
            sale.setProductName(row.getProductName());
            sale.setClientCode(row.getClientCode()); // 2026-10-26 출하 줄의 코드를 그대로
            sale.setProductCode(row.getProductCode());
            sale.setQty(row.getQty());
            sale.setUnitPrice(row.getUnitPrice());
            sale.setAmount(row.getAmount());
            sale.setSourceType(row.getSourceType());
            sale.setSourceId(row.getSourceId());
            sale.setCreatedAt(now);
            sale.setCreatedBy(employeeId); // 2026-10-26 등록자 사번
            // 같은 건을 동시에 두 사람이 눌렀으면 DB 가 막아 0건이 된다
            if (salesRegisterDAO.insertSale(sale) > 0) {
                result.setAdded(result.getAdded() + 1);
            } else {
                result.setSkipped(result.getSkipped() + 1);
            }
        }
        return result;
    }

    @Override
    public void createManual(SalesRecordVO request, String employeeId) throws Exception {
        SalesRecordVO body = request == null ? new SalesRecordVO() : request;
        String saleDate = trim(body.getSaleDate());
        String clientName = trim(body.getClientName());
        String productName = trim(body.getProductName());
        double qty = parseQty(body.getQtyText());
        if (!DATE.matcher(saleDate).matches()) {
            throw new IllegalArgumentException("판매일자를 골라주세요");
        }
        if (clientName.isEmpty()) {
            throw new IllegalArgumentException("거래처를 적어주세요");
        }
        if (productName.isEmpty()) {
            throw new IllegalArgumentException("품목을 적어주세요");
        }
        if (qty <= 0) {
            throw new IllegalArgumentException("수량을 적어주세요");
        }
        Double unitPrice = null;
        String priceText = body.getUnitPriceText();
        if (priceText != null && !priceText.isEmpty()) {
            try {
                unitPrice = Double.valueOf(priceText.replace(",", "").trim());
            } catch (NumberFormatException ex) {
                throw new IllegalArgumentException("단가를 숫자로 적어주세요");
            }
        }
        // 2026-10-26 sales_record 는 코드로 저장한다. 마스터에 없는 거래처 · 품목은 저장하면 사라지므로 막는다
        String clientCode = salesRegisterDAO.selectClientCodeByName(clientName);
        if (clientCode == null) {
            throw new IllegalArgumentException(CLIENT_CODE_MESSAGE);
        }
        String productCode = salesRegisterDAO.selectProductCodeByDisplayName(productName);
        if (productCode == null) {
            throw new IllegalArgumentException(PRODUCT_CODE_MESSAGE);
        }
        if (unitPrice == null) {
            // 안 적었으면 단가관리의 판매단가를 가져다 쓴다. 그것도 없으면 금액이 빈다.
            unitPrice = priceMap().get(productName);
        }
        SalesRecordVO sale = new SalesRecordVO();
        sale.setSaleDate(saleDate);
        sale.setClientName(clientName);
        sale.setProductName(productName);
        sale.setClientCode(clientCode);
        sale.setProductCode(productCode);
        sale.setQty(qty);
        sale.setUnitPrice(unitPrice);
        sale.setAmount(unitPrice == null ? null : qty * unitPrice);
        String note = trim(body.getNote());
        sale.setNote(note.isEmpty() ? null : note);
        sale.setSourceType("manual");
        sale.setCreatedAt(LocalDateTime.now(ZoneId.of("Asia/Seoul")).format(CREATED_AT));
        sale.setCreatedBy(employeeId); // 2026-10-26 등록자 사번
        salesRegisterDAO.insertSale(sale);
    }

    // 출하확정된 건을 판매 후보로. 매출집계와 달리 어느 출하 건인지를 함께 준다.
    private List<ShippableSaleVO> shippableRows(String start, String end, String clientName) throws Exception {
        Map<String, Double> prices = priceMap();
        Set<String> taken = new HashSet<>();
        for (ShippableSaleVO t : salesRegisterDAO.selectTakenSources()) {
            taken.add(key(t.getSourceType(), t.getSourceId()));
        }
        List<ShippableSaleVO> rows = new ArrayList<>(salesRegisterDAO.selectShipped(false, start, end, clientName));
        rows.addAll(salesRegisterDAO.selectShipped(true, start, end, clientName));
        for (ShippableSaleVO row : rows) {
            double qty = parseQty(row.getQtyText());
            Double unitPrice = prices.get(row.getProductName() == null ? "" : row.getProductName());
            row.setQty(qty);
            row.setUnitPrice(unitPrice);
            row.setAmount(unitPrice == null ? null : qty * unitPrice);
            row.setAlready(taken.contains(key(row.getSourceType(), row.getSourceId())));
        }
        rows.sort((a, b) -> {
            int c = nz(a.getSaleDate()).compareTo(nz(b.getSaleDate()));
            if (c != 0) {
                return c;
            }
            c = nz(a.getClientName()).compareTo(nz(b.getClientName()));
            return c != 0 ? c : nz(a.getProductName()).compareTo(nz(b.getProductName()));
        });
        return rows;
    }

    // '품명(규격)' → 판매단가. 출하 기록에는 품목코드가 아니라 화면에 보이는 이름이 적혀 있어서 이름으로 찾는다.
    private Map<String, Double> priceMap() throws Exception {
        Map<String, Double> prices = new HashMap<>();
        for (ShippableSaleVO p : salesRegisterDAO.selectProductPrices()) {
            prices.put(p.getProductName(), p.getUnitPrice());
        }
        return prices;
    }

    // 송연 parse_qty_number: '1,000kg' → 1000. 쉼표를 빼고 첫 숫자 덩어리, 없으면 0
    static double parseQty(String value) {
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

    private static String key(String type, Long id) {
        return type + ":" + id;
    }

    private static boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    private static String blankToNull(String value) {
        return isBlank(value) ? null : value.trim();
    }

    private static String trim(String value) {
        return value == null ? "" : value.trim();
    }

    private static String nz(String value) {
        return value == null ? "" : value;
    }
}

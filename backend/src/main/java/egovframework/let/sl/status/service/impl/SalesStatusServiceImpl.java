package egovframework.let.sl.status.service.impl;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

import egovframework.let.sl.status.domain.model.SaleRowVO;
import egovframework.let.sl.status.domain.model.SalesStatusVO;
import egovframework.let.sl.status.domain.model.SalesTotalVO;
import egovframework.let.sl.status.domain.repository.SalesStatusDAO;
import egovframework.let.sl.status.service.SalesStatusService;

/**
 * 판매관리 - 판매현황·토탈집계 서비스 구현 클래스 (송연 sales.py 를 옮김).
 *
 * ■ 판매현황과 토탈집계는 보는 것이 다르다
 * 현황은 sales_record 만 본다. 줄마다 지울 수 있는 관리 화면이라, 손댈 수 없는 생산입고가 섞이면
 * 지우기 단추가 걸리는 줄과 안 걸리는 줄이 뒤섞인다. 집계는 나간 것과 들어온 것을 한 표에 펴놓고 보기만 한다.
 * @author SONGYEON ERP
 * @since 2026.10.07
 * @version 1.0
 */
@Service("salesStatusService")
public class SalesStatusServiceImpl extends EgovAbstractServiceImpl implements SalesStatusService {

    static final String PERIOD_REQUIRED_MESSAGE = "조회 기간을 선택해주세요";
    private static final Pattern QTY = Pattern.compile("[\\d.]+");

    private final SalesStatusDAO salesStatusDAO;

    public SalesStatusServiceImpl(SalesStatusDAO salesStatusDAO) {
        this.salesStatusDAO = salesStatusDAO;
    }

    @Override
    public SalesStatusVO listStatus(String start, String end, String clientName, String productName) throws Exception {
        requirePeriod(start, end);
        List<SaleRowVO> rows = records(start, end, clientName, productName);
        SalesStatusVO result = new SalesStatusVO();
        result.setRows(rows);
        result.setCount(rows.size());
        double qty = 0;
        double amount = 0;
        int noPrice = 0;
        for (SaleRowVO row : rows) {
            qty += row.getQty() == null ? 0 : row.getQty();
            amount += row.getAmount() == null ? 0 : row.getAmount();
            if (row.getAmount() == null) {
                // 합계만 보면 '적게 팔렸네' 로 읽히는데, 실은 단가가 없어서 안 더해진 것일 수 있다
                noPrice++;
            }
        }
        result.setTotalQty(qty);
        result.setTotalAmount(amount);
        result.setNoPriceCount(noPrice);
        return result;
    }

    @Override
    public void delete(long id) throws Exception {
        salesStatusDAO.deleteRecord(id);
    }

    @Override
    public SalesTotalVO total(String start, String end, String clientName, String productName) throws Exception {
        requirePeriod(start, end);
        String client = blankToNull(clientName);
        String product = blankToNull(productName);
        List<SaleRowVO> rows = new ArrayList<>();
        for (SaleRowVO r : salesStatusDAO.selectReceipts(start.trim(), end.trim(), client, product)) {
            r.setQty(parseQty(r.getQtyText()));
            // 입고 줄은 단가·금액을 비워둔다. 만든 것은 아직 판 것이 아니다.
            r.setUnitPrice(null);
            r.setAmount(null);
            r.setDirection("in");
            r.setDirectionLabel("입고");
            r.setSourceLabel("생산입고");
            rows.add(r);
        }
        for (SaleRowVO r : records(start, end, clientName, productName)) {
            r.setDirection("out");
            r.setDirectionLabel("출고");
            rows.add(r);
        }
        // 같은 날이면 입고를 먼저 놓는다. 만들어서 들어온 다음에 나가는 순서다.
        rows.sort((a, b) -> {
            int c = nz(a.getSaleDate()).compareTo(nz(b.getSaleDate()));
            if (c != 0) {
                return c;
            }
            c = Integer.compare("in".equals(a.getDirection()) ? 0 : 1, "in".equals(b.getDirection()) ? 0 : 1);
            if (c != 0) {
                return c;
            }
            c = nz(a.getClientName()).compareTo(nz(b.getClientName()));
            return c != 0 ? c : nz(a.getProductName()).compareTo(nz(b.getProductName()));
        });
        SalesTotalVO result = new SalesTotalVO();
        result.setRows(rows);
        result.setCount(rows.size());
        for (SaleRowVO r : rows) {
            double qty = r.getQty() == null ? 0 : r.getQty();
            if ("in".equals(r.getDirection())) {
                result.setInCount(result.getInCount() + 1);
                result.setInQty(result.getInQty() + qty);
            } else {
                result.setOutCount(result.getOutCount() + 1);
                result.setOutQty(result.getOutQty() + qty);
                result.setTotalAmount(result.getTotalAmount() + (r.getAmount() == null ? 0 : r.getAmount()));
                if (r.getAmount() == null) {
                    result.setNoPriceCount(result.getNoPriceCount() + 1);
                }
            }
        }
        return result;
    }

    private List<SaleRowVO> records(String start, String end, String clientName, String productName) throws Exception {
        List<SaleRowVO> rows = salesStatusDAO.selectRecords(start.trim(), end.trim(), blankToNull(clientName), blankToNull(productName));
        for (SaleRowVO row : rows) {
            row.setSourceLabel("manual".equals(row.getSourceType()) ? "직접등록" : "출하확정");
        }
        return rows;
    }

    private static void requirePeriod(String start, String end) {
        if (start == null || start.trim().isEmpty() || end == null || end.trim().isEmpty()) {
            throw new IllegalArgumentException(PERIOD_REQUIRED_MESSAGE);
        }
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

    private static String blankToNull(String value) {
        return value == null || value.trim().isEmpty() ? null : value.trim();
    }

    private static String nz(String value) {
        return value == null ? "" : value;
    }
}

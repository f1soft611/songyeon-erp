package egovframework.let.pu.receiving.service.impl;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

import egovframework.let.common.attachment.domain.model.AttachmentVO;
import egovframework.let.common.attachment.service.AttachmentService;
import egovframework.let.pu.receiving.domain.model.ReceivingBulkRequestVO;
import egovframework.let.pu.receiving.domain.model.ReceivingBulkResultVO;
import egovframework.let.pu.receiving.domain.model.ReceivingDetailVO;
import egovframework.let.pu.receiving.domain.model.ReceivingItemVO;
import egovframework.let.pu.receiving.domain.model.ReceivingSummaryVO;
import egovframework.let.pu.receiving.domain.model.ReceivingVO;
import egovframework.let.pu.receiving.domain.repository.ReceivingDAO;
import egovframework.let.pu.receiving.service.ReceivingService;

/**
 * 구매관리 - 입고관리 서비스 구현 클래스 (송연 app.py list_receiving · register_receiving_bulk · cancel_receiving ·
 * get_material_last_price · materials_receiving_status(+detail) 를 옮김).
 *
 * ■ 반품을 같은 표에 넣는 이유
 * 반품은 '마이너스 입고' 다. 수량과 금액을 음수로 넣어두면 입고현황·합계·재고가 저절로 맞는다.
 * 표를 따로 두면 합계를 낼 때마다 두 표를 더해야 하고, 한쪽만 고치면 조용히 어긋난다.
 * @author SONGYEON ERP
 * @since 2026.10.08
 * @version 1.0
 */
@Service("receivingService")
public class ReceivingServiceImpl extends EgovAbstractServiceImpl implements ReceivingService {

    static final String SCOPE = "receiving";
    static final String CLIENT_MESSAGE = "거래처마스터에 등록된 거래처가 아닙니다: ";
    static final String TAX_MESSAGE = "공통코드 과세구분(TAX_CATEGORY)에 없는 과세구분입니다: ";
    /** 과세구분별 부가세율. 면세·영세는 부가세가 붙지 않는다(송연 VAT_RATE_BY_TAX_TYPE). */
    static final Map<String, Double> VAT_RATE = new LinkedHashMap<>();
    static {
        VAT_RATE.put("과세", 0.1);
        VAT_RATE.put("면세", 0.0);
        VAT_RATE.put("영세", 0.0);
    }
    private static final DateTimeFormatter CREATED_AT = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");

    private final ReceivingDAO receivingDAO;
    private final AttachmentService attachmentService;

    public ReceivingServiceImpl(ReceivingDAO receivingDAO, AttachmentService attachmentService) {
        this.receivingDAO = receivingDAO;
        this.attachmentService = attachmentService;
    }

    @Override
    public List<ReceivingVO> listReceivings(String date, String start, String end, String clientQ, String materialQ, String kind) throws Exception {
        String from = blankToNull(start);
        String to = blankToNull(end);
        boolean period = from != null && to != null;
        String k = blankToNull(kind);
        List<ReceivingVO> rows = receivingDAO.selectReceivings(blankToNull(date), period ? from : null, period ? to : null,
                blankToNull(clientQ), blankToNull(materialQ), "return".equals(k) || "receiving".equals(k) ? k : null);
        // 줄마다 첨부를 따로 물어보면 조회가 줄 수만큼 나간다. 한 번에 가져와 붙인다.
        List<String> ids = new ArrayList<>();
        for (ReceivingVO row : rows) {
            ids.add(String.valueOf(row.getId()));
        }
        Map<String, List<AttachmentVO>> files = attachmentService.listByRefs(SCOPE, ids);
        for (ReceivingVO row : rows) {
            List<AttachmentVO> list = files.get(String.valueOf(row.getId()));
            row.setFiles(list == null ? Collections.<AttachmentVO>emptyList() : list);
            // 앞으로 더 반품할 수 있는 수량. 반품 줄 자신에게는 뜻이 없으므로 0.
            double returned = row.getReturnedQty() == null ? 0 : row.getReturnedQty();
            row.setReturnableQty(isReturn(row) ? 0.0 : Math.max(0.0, nz(row.getQty()) - returned));
        }
        return rows;
    }

    @Override
    public ReceivingBulkResultVO registerBulk(ReceivingBulkRequestVO request) throws Exception {
        ReceivingBulkRequestVO body = request == null ? new ReceivingBulkRequestVO() : request;
        String date = trim(body.getReceiveDate());
        boolean returning = Boolean.TRUE.equals(body.getIsReturn());
        List<ReceivingItemVO> items = body.getItems();
        if (date.isEmpty()) {
            throw new IllegalArgumentException(returning ? "반품일이 필요합니다" : "입고일이 필요합니다");
        }
        if (items == null || items.isEmpty()) {
            throw new IllegalArgumentException("등록할 품목이 없습니다");
        }
        String warehouseCd = receivingDAO.selectReceivingWarehouse(); // 줄마다 다시 찾을 까닭이 없다(2026-10-26 창고코드)
        String now = LocalDateTime.now(ZoneId.of("Asia/Seoul")).format(CREATED_AT);
        List<ReceivingVO> created = new ArrayList<>();
        List<String> keys = new ArrayList<>();
        for (ReceivingItemVO item : items) {
            String code = trim(item.getMaterialCode());
            String clientName = trim(item.getClientName());
            if (clientName.isEmpty()) {
                continue; // 거래처 없는 품목은 건너뜀(품목별로 거래처가 필수)
            }
            Double parsedQty = toDouble(item.getQty());
            if (parsedQty == null) {
                continue;
            }
            String name = receivingDAO.selectMaterialName(code);
            if (name == null) {
                continue;
            }
            // 단가 없이는 입고를 받지 않는다. 비면 매입 합계와 재고금액이 모자라게 나오는데 화면에 표시가 없어,
            // 월말에 세금계산서와 안 맞을 때에야 알게 된다. 넣을 때 막는 편이 싸다. (반품은 원래 입고의 단가를 따라오므로 막지 않는다)
            if (!returning && toDouble(item.getUnitPrice()) == null) {
                throw new IllegalArgumentException(name + josa(name, "을를") + " 등록하려면 단가가 있어야 합니다");
            }
            String taxType = trim(item.getTaxType()).isEmpty() ? "과세" : trim(item.getTaxType());
            if (!VAT_RATE.containsKey(taxType)) {
                taxType = "과세";
            }
            // 2026-10-26 거래처 · 과세구분은 코드로 저장한다. 못 바꾸면 막는다(같은 요청에서 앞서 넣은 줄도 함께 되돌린다)
            String clientCode = receivingDAO.selectClientCodeByName(clientName);
            if (clientCode == null) {
                throw new IllegalArgumentException(CLIENT_MESSAGE + clientName);
            }
            String taxCode = receivingDAO.selectTaxCode(taxType);
            if (taxCode == null) {
                throw new IllegalArgumentException(TAX_MESSAGE + taxType);
            }
            // 어느 입고에서 나온 반품인지. 일부만 반품할 수 있으므로, 이미 반품한 양을 세어 남은 만큼까지만 받는다.
            Long returnOfId = returning ? item.getReturnOfId() : null;
            if (returnOfId != null && returnOfId != 0) {
                ReceivingVO src = receivingDAO.selectReturnSource(returnOfId);
                if (src == null) {
                    throw new IllegalArgumentException("반품할 입고내역을 찾을 수 없습니다");
                }
                double already = nz(receivingDAO.selectReturnedQty(returnOfId));
                double remaining = nz(src.getQty()) - already;
                if (Math.abs(parsedQty) > remaining + 1e-9) {
                    String srcName = src.getMaterialName() == null ? "" : src.getMaterialName();
                    throw new IllegalArgumentException(srcName + josa(srcName, "은는") + " " + fmtQty(remaining) + "까지만 반품할 수 있습니다 "
                            + "(입고 " + fmtQty(nz(src.getQty())) + " · 이미 반품 " + fmtQty(already) + ")");
                }
            } else {
                returnOfId = null;
            }
            // 반품은 들어온 만큼 되돌려 보내는 것이라 수량도 금액도 음수로 적는다.
            double qty = returning ? -Math.abs(parsedQty) : parsedQty;
            ReceivingVO row = new ReceivingVO();
            row.setMaterialCode(code);
            row.setMaterialName(name);
            row.setQty(qty);
            row.setReceiveDate(date);
            row.setPoId(item.getPoId());
            row.setCreatedAt(now);
            row.setClientName(clientName);
            row.setClientCode(clientCode);
            applyAmounts(row, item.getUnitPrice(), qty, taxType);
            row.setTaxType(taxType);
            row.setTaxCode(taxCode);
            row.setBarcode(returning ? null : barcode(code, date));
            row.setIsReturn(returning ? 1 : 0);
            String reason = trim(item.getReturnReason());
            row.setReturnReason(reason.isEmpty() ? null : reason);
            row.setReturnOfId(returnOfId);
            // 들여온 것은 아직 뜯지 않은 완포장이라 자재창고로 들어간다. 반품도 그 창고에서 나간다.
            row.setWarehouseCd(warehouseCd);
            receivingDAO.insertReceiving(row);
            receivingDAO.addMaterialStock(code, qty);
            created.add(row);
            keys.add(item.getKey());
        }
        ReceivingBulkResultVO result = new ReceivingBulkResultVO();
        result.setRegistered(created.size());
        result.setRows(created);
        result.setKeys(keys);
        return result;
    }

    @Override
    public void cancel(long id) throws Exception {
        ReceivingVO row = receivingDAO.selectForCancel(id);
        if (row == null) {
            throw new IllegalArgumentException("입고 내역을 찾을 수 없습니다");
        }
        receivingDAO.addMaterialStock(row.getMaterialCode(), -nz(row.getQty()));
        receivingDAO.deleteReceiving(id);
        // 입고줄이 사라지면 거기 붙어있던 서류도 같이 치운다. 안 그러면 주인 없는 파일만 쌓인다.
        attachmentService.deleteAllFor(SCOPE, String.valueOf(id));
    }

    @Override
    public Map<String, Object> lastPrice(String materialCode, String clientName) throws Exception {
        Map<String, Object> result = new HashMap<>();
        String code = trim(materialCode);
        result.put("unitPrice", null);
        result.put("source", null);
        if (code.isEmpty()) {
            return result;
        }
        String client = trim(clientName);
        Double price = null;
        String source = null;
        if (!client.isEmpty()) {
            price = receivingDAO.selectLastPrice(code, client);
            if (price != null) {
                source = "vendor";
            }
        }
        if (price == null) {
            price = receivingDAO.selectLastPrice(code, null);
            if (price != null) {
                source = "any";
            }
        }
        result.put("unitPrice", price);
        result.put("source", source);
        return result;
    }

    @Override
    public List<ReceivingSummaryVO> summary(String start, String end, String clientQ, String materialQ) throws Exception {
        if (blankToNull(start) == null || blankToNull(end) == null) {
            throw new IllegalArgumentException("조회 기간을 선택해주세요");
        }
        return receivingDAO.selectSummary(start.trim(), end.trim(), blankToNull(clientQ), blankToNull(materialQ));
    }

    @Override
    public ReceivingDetailVO detail(String materialCode, String start, String end, String clientQ) throws Exception {
        String code = blankToNull(materialCode);
        if (code == null || blankToNull(start) == null || blankToNull(end) == null) {
            throw new IllegalArgumentException("품목과 조회 기간이 필요합니다");
        }
        String client = blankToNull(clientQ);
        ReceivingDetailVO result = new ReceivingDetailVO();
        result.setRows(receivingDAO.selectDetailRows(code, start.trim(), end.trim(), client));
        result.setTotalReceived(nz(receivingDAO.selectDetailReceived(code, start.trim(), end.trim(), client)));
        result.setTotalUsed(nz(receivingDAO.selectDetailUsed(code, start.trim(), end.trim())));
        return result;
    }

    // 15자리 바코드: 품목코드(6) + '_' + 입고일자(6) + 순번(2). 예 002705_26090301 (송연 make_receiving_barcode)
    private String barcode(String materialCode, String receiveDate) throws Exception {
        String digits = materialCode == null ? "" : materialCode.replaceAll("\\D", "");
        String code6 = String.format("%6s", digits).replace(' ', '0');
        code6 = code6.substring(code6.length() - 6);
        String compact = receiveDate == null ? "" : receiveDate.replace("-", "");
        String date6 = compact.length() >= 8 ? compact.substring(2, 8) : (compact.length() > 2 ? compact.substring(2) : "");
        int used = receivingDAO.countSameDay(materialCode, receiveDate);
        return code6 + "_" + date6 + String.format("%02d", Math.min(used + 1, 99));
    }

    // 송연 receiving_amounts: 단가·수량·과세구분으로 공급가액·부가세·합계. 파이썬 round 처럼 짝수 쪽으로 반올림한다.
    static void applyAmounts(ReceivingVO row, String unitPriceRaw, double qty, String taxType) {
        Double unitPrice = toDouble(unitPriceRaw);
        if (unitPrice == null) {
            row.setUnitPrice(null);
            row.setSupplyAmount(null);
            row.setVatAmount(null);
            row.setTotalAmount(null);
            return;
        }
        double supply = roundHalfEven(unitPrice * qty);
        Double rate = VAT_RATE.get(taxType);
        double vat = roundHalfEven(supply * (rate == null ? 0.1 : rate));
        row.setUnitPrice(unitPrice);
        row.setSupplyAmount(supply);
        row.setVatAmount(vat);
        row.setTotalAmount(supply + vat);
    }

    static double roundHalfEven(double value) {
        return new BigDecimal(value).setScale(0, RoundingMode.HALF_EVEN).doubleValue();
    }

    // 송연 fmt_qty: 10.0 은 '10', 2.5 는 '2.5'
    static String fmtQty(double value) {
        if (value == Math.rint(value) && Math.abs(value) < 1e15) {
            return String.valueOf((long) value);
        }
        return BigDecimal.valueOf(value).stripTrailingZeros().toPlainString();
    }

    // 송연 josa: 받침에 맞는 조사(은는·이가·을를·과와). 한글로 끝나지 않으면 앞엣것.
    static String josa(String word, String pair) {
        if (word == null || word.trim().isEmpty()) {
            return pair.substring(0, 1);
        }
        String w = word.trim();
        char last = w.charAt(w.length() - 1);
        if (last < '가' || last > '힣') {
            return pair.substring(0, 1);
        }
        int jong = (last - 0xAC00) % 28;
        return jong != 0 ? pair.substring(0, 1) : pair.substring(1, 2);
    }

    // 송연 float(x): 숫자로 못 읽으면 null
    static Double toDouble(String value) {
        if (value == null || value.trim().isEmpty()) {
            return null;
        }
        try {
            double parsed = Double.parseDouble(value.trim());
            return Double.isNaN(parsed) || Double.isInfinite(parsed) ? null : parsed;
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private static boolean isReturn(ReceivingVO row) {
        return row.getIsReturn() != null && row.getIsReturn() != 0;
    }

    private static double nz(Double value) {
        return value == null ? 0 : value;
    }

    private static String blankToNull(String value) {
        return value == null || value.trim().isEmpty() ? null : value.trim();
    }

    private static String trim(String value) {
        return value == null ? "" : value.trim();
    }

    static List<String> taxTypes() {
        return Arrays.asList("과세", "면세", "영세");
    }
}

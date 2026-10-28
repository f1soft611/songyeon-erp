package egovframework.let.pd.confirm.service.impl;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

import egovframework.let.co.master.itemmaster.service.ItemMasterService;
import egovframework.let.pd.confirm.domain.model.BatchSheetLineVO;
import egovframework.let.pd.confirm.domain.model.BatchSheetVO;
import egovframework.let.pd.confirm.domain.model.MaterialLineVO;
import egovframework.let.pd.confirm.domain.model.ProductionOrderVO;
import egovframework.let.pd.confirm.domain.model.ProductionSaveRequestVO;
import egovframework.let.pd.confirm.domain.model.ProductionScheduleVO;
import egovframework.let.pd.confirm.domain.repository.ProductionConfirmDAO;
import egovframework.let.pd.confirm.service.ProductionConfirmService;

/**
 * 생산관리 - 생산확정 서비스 구현 클래스
 * 송연 변환본(PD0001Service, 기존 create/update/delete_production_schedule · apply/reverse_production_material_usage · make_lot_no)과 같은 규칙.
 * 거래처는 거래처BOM 이름만(비우면 없음 — 재고생산은 갈 곳이 아직 없다). 기초정보 제품BOM 과 같은 안내를 쓴다.
 * @author SONGYEON ERP
 * @since 2026.10.06
 * @version 1.0
 */
@Service("productionConfirmService")
public class ProductionConfirmServiceImpl extends EgovAbstractServiceImpl implements ProductionConfirmService {

    static final String DATE_PARAM_MESSAGE = "date 파라미터가 필요합니다";
    static final String DATE_REQUIRED_MESSAGE = "날짜가 필요합니다";
    static final String NOT_FOUND_MESSAGE = "생산스케줄 항목을 찾을 수 없습니다";
    static final String DELETE_BLOCKED_MESSAGE = "실생산량이 등록됐거나 출하확정된 건이라 여기서 지울 수 없습니다. "
            + "생산입고에서 실생산량을 먼저 지워주세요.";
    static final String PRODUCT_MESSAGE = "제품마스터에 등록된 품목을 골라주세요";
    static final String CLIENT_MESSAGE = "거래처코드가 있는 거래처를 골라주세요";

    private static final DateTimeFormatter CREATED_AT = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");
    private static final Pattern QTY = Pattern.compile("[\\d.]+");

    private final ProductionConfirmDAO productionConfirmDAO;
    private final ItemMasterService itemMasterService;

    public ProductionConfirmServiceImpl(ProductionConfirmDAO productionConfirmDAO, ItemMasterService itemMasterService) {
        this.productionConfirmDAO = productionConfirmDAO;
        this.itemMasterService = itemMasterService;
    }

    @Override
    public List<ProductionScheduleVO> listSchedule(String date) throws Exception {
        String day = text(date);
        if (day == null) {
            throw new IllegalArgumentException(DATE_PARAM_MESSAGE);
        }
        return productionConfirmDAO.selectSchedule(day);
    }

    @Override
    public ProductionScheduleVO create(ProductionSaveRequestVO payload) throws Exception {
        ProductionSaveRequestVO request = payload == null ? new ProductionSaveRequestVO() : payload;
        String date = text(request.getScheduleDate());
        if (date == null) {
            throw new IllegalArgumentException(DATE_REQUIRED_MESSAGE);
        }
        ProductionScheduleVO row = new ProductionScheduleVO();
        row.setScheduleDate(date);
        row.setClientName(itemMasterService.resolveRegisteredClient(request.getClientName()));
        row.setClientCode(requireClientCode(row.getClientName()));
        row.setProductName(text(request.getProductName()));
        row.setProductCode(requireProductCode(row.getProductName()));
        row.setOrderQty(text(request.getOrderQty()));
        row.setNote(text(request.getNote()));
        row.setLogisticsDate(text(request.getLogisticsDate()));
        row.setSourceOrderId(request.getSourceOrderId());
        // 수주에서 끌어온 것이 아니면 재고생산(미리 만들어두는 것)이다. 끌어온 건이면 그 수주의 표시를 따라간다.
        row.setIsStockProduction(request.getSourceOrderId() == null ? 1
                : (request.getIsStockProduction() != null && request.getIsStockProduction() != 0 ? 1 : 0));
        Integer max = productionConfirmDAO.selectMaxSortOrder(date);
        row.setSortOrder((max == null ? 0 : max) + 1);
        row.setLotNo(nextLotNo(date, row.getProductCode(), null));
        row.setCreatedAt(now());
        productionConfirmDAO.insertSchedule(row);

        applyMaterialUsage(row.getId(), row.getProductCode(), row.getOrderQty());
        if (row.getSourceOrderId() != null) {
            productionConfirmDAO.updateOrderImportedProduction(row.getSourceOrderId(), 1);
            productionConfirmDAO.linkShipmentsToLot(row.getSourceOrderId(), row.getId());
        }
        ProductionScheduleVO saved = new ProductionScheduleVO();
        saved.setId(row.getId());
        saved.setLotNo(row.getLotNo());
        return saved;
    }

    @Override
    public void update(long id, ProductionSaveRequestVO payload) throws Exception {
        ProductionSaveRequestVO request = payload == null ? new ProductionSaveRequestVO() : payload;
        ProductionScheduleVO current = productionConfirmDAO.selectScheduleRow(id);
        if (current == null) {
            throw new IllegalArgumentException(NOT_FOUND_MESSAGE);
        }
        String clientName = itemMasterService.resolveRegisteredClient(request.getClientName());
        String productName = text(request.getProductName());
        String clientCode = requireClientCode(clientName);
        String productCode = requireProductCode(productName);
        reverseMaterialUsage(id);
        // 품목이 바뀌면 로트번호 회차를 다시 뽑는다('그 품목·그 날' 안에서 세는 번호라 그대로 두면 겹친다)
        if (!Objects.equals(productCode, current.getProductCode())) {
            productionConfirmDAO.updateLotNo(id, nextLotNo(current.getScheduleDate(), productCode, id));
        }
        ProductionScheduleVO row = new ProductionScheduleVO();
        row.setId(id);
        row.setClientName(clientName);
        row.setClientCode(clientCode);
        row.setProductName(productName);
        row.setProductCode(productCode);
        row.setOrderQty(text(request.getOrderQty()));
        row.setNote(text(request.getNote()));
        row.setLogisticsDate(text(request.getLogisticsDate()));
        productionConfirmDAO.updateSchedule(row);
        applyMaterialUsage(id, row.getProductCode(), row.getOrderQty());
    }

    // 실생산량이 적혔거나 출하확정된 건은 제품 재고까지 되돌려야 하는데 그 원장은 아직 옮기지 않았다.
    // 조용히 지워 재고를 어긋나게 두느니 막고 알린다(송연 변환본과 같음).
    @Override
    public void delete(long id) throws Exception {
        ProductionScheduleVO current = productionConfirmDAO.selectScheduleRow(id);
        if (current == null) {
            throw new IllegalArgumentException(NOT_FOUND_MESSAGE);
        }
        if (text(current.getActualQty()) != null || (current.getShipConfirmed() != null && current.getShipConfirmed() != 0)) {
            throw new IllegalArgumentException(DELETE_BLOCKED_MESSAGE);
        }
        reverseMaterialUsage(id);
        if (current.getSourceOrderId() != null) {
            productionConfirmDAO.updateOrderImportedProduction(current.getSourceOrderId(), 0);
        }
        productionConfirmDAO.deleteSchedule(id);
        productionConfirmDAO.deleteSubstitutions(id);
    }

    // 송연 printPcBatchSheet: '오늘 이 로트에 몇 kg 씩 넣어라' 는 지시. 바꿔 쓰기로 한 원재료는 바뀐 이름으로 나온다.
    @Override
    public BatchSheetVO batchSheet(long id) throws Exception {
        ProductionScheduleVO row = productionConfirmDAO.selectScheduleRow(id);
        if (row == null) {
            throw new IllegalArgumentException(NOT_FOUND_MESSAGE);
        }
        String productCode = row.getProductCode() != null ? row.getProductCode() : productCodeOf(row.getProductName());
        double qty = parseQty(row.getOrderQty());
        Map<String, MaterialLineVO> subs = new LinkedHashMap<>();
        for (MaterialLineVO sub : productionConfirmDAO.selectSubstitutions(id)) {
            subs.put(sub.getFromMaterialCode(), sub);
        }
        List<BatchSheetLineVO> lines = new ArrayList<>();
        if (productCode != null) {
            for (MaterialLineVO line : productionConfirmDAO.selectBatchLines(productCode)) {
                MaterialLineVO sub = subs.get(line.getMaterialCode());
                BatchSheetLineVO out = new BatchSheetLineVO();
                out.setMaterialCode(sub != null ? sub.getToMaterialCode() : line.getMaterialCode());
                out.setMaterialName(sub != null ? sub.getToMaterialName() : line.getMaterialName());
                out.setOriginName(line.getMaterialName());
                out.setQty(Math.round(qty * line.getRatioPercent() * 1000) / 1000.0);
                out.setSubstituted(sub != null);
                out.setReason(sub == null ? null : sub.getReason());
                lines.add(out);
            }
        }
        ProductionScheduleVO header = new ProductionScheduleVO();
        header.setId(id);
        header.setClientName(row.getClientName());
        header.setProductName(row.getProductName());
        header.setProductCode(productCode);
        header.setOrderQty(row.getOrderQty());
        header.setNote(row.getNote());
        header.setScheduleDate(row.getScheduleDate());
        header.setLotNo(row.getLotNo());
        header.setSubstitutionCount(subs.size());
        BatchSheetVO sheet = new BatchSheetVO();
        sheet.setHeader(header);
        sheet.setRows(lines);
        return sheet;
    }

    @Override
    public List<ProductionOrderVO> listImportOrders(String start, String end) throws Exception {
        String from = text(start);
        String to = text(end);
        if (from == null || to == null) {
            return Collections.emptyList();
        }
        return productionConfirmDAO.selectImportOrders(from, to);
    }

    // 송연 substitute/undo 의 reverse_production_material_usage → apply_production_material_usage 와 같다
    @Override
    public void reapplyMaterialUsage(long id) throws Exception {
        ProductionScheduleVO current = productionConfirmDAO.selectScheduleRow(id);
        if (current == null) {
            throw new IllegalArgumentException(NOT_FOUND_MESSAGE);
        }
        String productCode = current.getProductCode() != null ? current.getProductCode() : productCodeOf(current.getProductName());
        reverseMaterialUsage(id);
        applyMaterialUsage(id, productCode, current.getOrderQty());
    }

    // 송연 apply_production_material_usage: 생산지시량만큼 배합비율대로 원재료를 깎고 사용이력을 남긴다.
    // 바꿔 쓰기 쪽지가 붙어 있으면 그 원재료 대신 바꿀 것을 깎는다(배합비는 그대로).
    private void applyMaterialUsage(long scheduleId, String productCode, String orderQty) throws Exception {
        double qty = parseQty(orderQty);
        if (qty <= 0 || productCode == null) {
            return;
        }
        Map<String, MaterialLineVO> subs = new LinkedHashMap<>();
        for (MaterialLineVO sub : productionConfirmDAO.selectSubstitutions(scheduleId)) {
            subs.put(sub.getFromMaterialCode(), sub);
        }
        for (MaterialLineVO line : productionConfirmDAO.selectBom(productCode)) {
            String code = line.getMaterialCode();
            String name = line.getMaterialName();
            MaterialLineVO sub = subs.get(code);
            if (sub != null) {
                code = sub.getToMaterialCode();
                name = sub.getToMaterialName();
            }
            double used = qty * line.getRatioPercent();
            productionConfirmDAO.addMaterialStock(code, -used);
            MaterialLineVO usage = new MaterialLineVO();
            usage.setScheduleId(scheduleId);
            usage.setMaterialCode(code);
            usage.setMaterialName(name);
            usage.setQtyUsed(used);
            usage.setCreatedAt(now());
            productionConfirmDAO.insertMaterialUsage(usage);
        }
    }

    // 송연 reverse_production_material_usage: 깎았던 만큼 되돌린다(수정·삭제 때)
    private void reverseMaterialUsage(long scheduleId) throws Exception {
        for (MaterialLineVO usage : productionConfirmDAO.selectMaterialUsage(scheduleId)) {
            productionConfirmDAO.addMaterialStock(usage.getMaterialCode(), usage.getQtyUsed() == null ? 0 : usage.getQtyUsed());
        }
        productionConfirmDAO.deleteMaterialUsage(scheduleId);
    }

    // 송연 make_lot_no: 20260921-01. 회차는 '같은 품목 · 같은 날' 안에서만 센다.
    String nextLotNo(String date, String productCode, Long exceptId) throws Exception {
        String datePart = date == null ? "" : date.replace("-", "");
        if (datePart.isEmpty()) {
            datePart = "00000000";
        }
        int nth = 0;
        for (String lotNo : productionConfirmDAO.selectLotNos(date, productCode, exceptId)) {
            int dash = lotNo == null ? -1 : lotNo.lastIndexOf('-');
            if (dash < 0) {
                continue;
            }
            String tail = lotNo.substring(dash + 1);
            if (!tail.isEmpty() && tail.chars().allMatch(Character::isDigit)) {
                nth = Math.max(nth, Integer.parseInt(tail));
            }
        }
        return String.format("%s-%02d", datePart, nth + 1);
    }

    // 제품명은 바뀔 수 있으므로 코드도 함께 남긴다
    private String productCodeOf(String productName) throws Exception {
        String name = text(productName);
        return name == null ? null : productionConfirmDAO.selectProductCodeByDisplayName(name);
    }

    // 2026-10-26 production_schedule 에는 제품명 칸이 없어 코드로만 남는다. 코드를 못 찾는 품목명은 저장하면 사라지므로 막는다
    private String requireProductCode(String productName) throws Exception {
        String code = productCodeOf(productName);
        if (productName != null && code == null) {
            throw new IllegalArgumentException(PRODUCT_MESSAGE);
        }
        return code;
    }

    // 2026-10-26 production_schedule 에는 거래처코드가 남는다. 코드 없는 거래처는 저장하면 거래처가 사라지므로 막는다
    private String requireClientCode(String clientName) throws Exception {
        if (clientName == null) {
            return null;
        }
        String code = productionConfirmDAO.selectClientCodeByName(clientName);
        if (code == null) {
            throw new IllegalArgumentException(CLIENT_MESSAGE);
        }
        return code;
    }

    // 송연 parse_qty_number: '1,000kg' → 1000
    static double parseQty(String value) {
        if (value == null) {
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

    private static String now() {
        return LocalDateTime.now(ZoneId.of("Asia/Seoul")).format(CREATED_AT);
    }

    private static String text(Object raw) {
        String value = raw == null ? "" : raw.toString().trim();
        return value.isEmpty() ? null : value;
    }
}

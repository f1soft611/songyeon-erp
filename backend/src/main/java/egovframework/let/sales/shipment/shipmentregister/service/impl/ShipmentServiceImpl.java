package egovframework.let.sa.shipment.service.impl;

import java.math.BigDecimal;
import java.math.MathContext;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

import egovframework.let.sa.order.domain.model.OrderProductVO;
import egovframework.let.sa.order.service.SalesOrderService;
import egovframework.let.sa.shipment.domain.model.LotAllocationVO;
import egovframework.let.sa.shipment.domain.model.LotRowVO;
import egovframework.let.sa.shipment.domain.model.PendingOrderVO;
import egovframework.let.sa.shipment.domain.model.ProductLotListVO;
import egovframework.let.sa.shipment.domain.model.ProductLotVO;
import egovframework.let.sa.shipment.domain.model.ShipmentVO;
import egovframework.let.sa.shipment.domain.repository.ShipmentDAO;
import egovframework.let.sa.shipment.service.ShipmentService;

/**
 * 영업관리 - 출하등록 서비스 구현 클래스
 * 송연 변환본(SA0005Service, 기존 logistics-schedule · lot-allocation · products/lots)과 같은 규칙.
 * 거래처 확인·제품코드 찾기는 수주등록과 같은 것을 쓴다.
 * @author SONGYEON ERP
 * @since 2026.10.06
 * @version 1.0
 */
@Service("shipmentService")
public class ShipmentServiceImpl extends EgovAbstractServiceImpl implements ShipmentService {

    static final String DATE_PARAM_MESSAGE = "date 파라미터가 필요합니다";
    static final String DATE_REQUIRED_MESSAGE = "날짜가 필요합니다";
    static final String NOT_FOUND_MESSAGE = "물류스케줄 항목을 찾을 수 없습니다";
    static final String PRODUCTION_NOT_FOUND_MESSAGE = "생산스케줄 항목을 찾을 수 없습니다";
    static final String CONFIRMED_EDIT_MESSAGE = "출하확정된 건은 수정할 수 없습니다";
    static final String CONFIRMED_DELETE_MESSAGE = "출하확정된 건은 삭제할 수 없습니다";
    static final String CONFIRMED_LOT_MESSAGE = "출하확정된 건은 로트를 바꿀 수 없습니다. 확정취소 후 고쳐주세요";
    static final String ALLOCATION_NUMBER_MESSAGE = "로트와 수량을 숫자로 정해주세요";
    static final String ALLOCATION_DUPLICATE_MESSAGE = "같은 로트를 두 번 적었습니다. 한 줄로 합쳐주세요";

    private static final DateTimeFormatter CREATED_AT = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");
    private static final Pattern QTY = Pattern.compile("[\\d.]+");

    private final ShipmentDAO shipmentDAO;
    private final SalesOrderService salesOrderService;

    public ShipmentServiceImpl(ShipmentDAO shipmentDAO, SalesOrderService salesOrderService) {
        this.shipmentDAO = shipmentDAO;
        this.salesOrderService = salesOrderService;
    }

    @Override
    public List<ShipmentVO> listShipments(String date) throws Exception {
        String day = date == null ? "" : date.trim();
        if (day.isEmpty()) {
            throw new IllegalArgumentException(DATE_PARAM_MESSAGE);
        }
        List<ShipmentVO> manual = shipmentDAO.selectManualShipments(day);
        Map<Long, List<LotAllocationVO>> allocations = new HashMap<>();
        for (LotAllocationVO allocation : shipmentDAO.selectAllocationsByDate(day)) {
            allocations.computeIfAbsent(allocation.getShipmentId(), key -> new ArrayList<>()).add(allocation);
        }
        for (ShipmentVO row : manual) {
            List<LotAllocationVO> mine = allocations.get(row.getId());
            row.setLotAllocations(mine == null ? Collections.<LotAllocationVO>emptyList() : mine);
        }
        List<ShipmentVO> rows = new ArrayList<>(manual);
        rows.addAll(shipmentDAO.selectProductionShipments(day));
        return rows;
    }

    @Override
    public Long createShipment(ShipmentVO payload) throws Exception {
        ShipmentVO request = payload == null ? new ShipmentVO() : payload;
        String date = request.getScheduleDate() == null ? "" : request.getScheduleDate().trim();
        if (date.isEmpty()) {
            throw new IllegalArgumentException(DATE_REQUIRED_MESSAGE);
        }
        String clientName = salesOrderService.resolveSalesClient(request.getClientName());
        Integer max = shipmentDAO.selectMaxSortOrder(date);
        Long sourceOrderId = request.getSourceOrderId();
        Long lotId = request.getLotId();
        boolean autoLinked = false;
        if (lotId == null && sourceOrderId != null) {
            // 로트를 직접 고르지 않았으면 같은 수주건에서 이미 생산확정된 로트를 찾아 연결
            lotId = shipmentDAO.selectLotIdBySourceOrder(sourceOrderId);
            autoLinked = lotId != null;
        }
        ShipmentVO record = new ShipmentVO();
        record.setScheduleDate(date);
        record.setClientName(clientName);
        // 2026-10-26 logistics_schedule 에는 거래처코드 · 제품코드만 남는다(못 바꾸면 막는다)
        record.setClientCode(salesOrderService.requireClientCode(clientName));
        record.setProductName(request.getProductName());
        record.setProductCode(salesOrderService.requireProductCode(request.getProductName(), request.getSpec(), request.getProductCode()));
        record.setOrderQty(request.getOrderQty());
        record.setNote(request.getNote());
        record.setLotId(lotId);
        record.setSourceOrderId(sourceOrderId);
        record.setSortOrder((max == null ? 0 : max) + 1);
        record.setCreatedAt(now());
        shipmentDAO.insertShipment(record);
        if (autoLinked) {
            // 자동으로 연결된 경우 이번 출하량만큼 그 로트의 출하량에도 더한다('1500kg' 모양)
            double qty = parseQty(request.getOrderQty());
            String current = shipmentDAO.selectLotLogisticsActualQty(lotId);
            if (qty > 0 && current != null) {
                double already = current.isEmpty() ? 0 : parseQty(current);
                shipmentDAO.updateLotLogisticsActualQty(lotId, formatG(already + qty) + "kg");
            }
        }
        if (sourceOrderId != null) {
            shipmentDAO.updateOrderImportedShipment(sourceOrderId, 1);
        }
        return record.getId();
    }

    @Override
    public void updateActualQty(long id, Object actualQty) throws Exception {
        ShipmentVO state = shipmentDAO.selectShipmentState(id);
        if (state == null) {
            throw new IllegalArgumentException(NOT_FOUND_MESSAGE);
        }
        if (state.confirmed()) {
            throw new IllegalArgumentException(CONFIRMED_EDIT_MESSAGE);
        }
        shipmentDAO.updateActualQty(id, qtyText(actualQty));
    }

    @Override
    public void updateProductionActualQty(long lotId, Object actualQty) throws Exception {
        Integer confirmed = shipmentDAO.selectProductionShipConfirmed(lotId);
        if (confirmed == null) {
            throw new IllegalArgumentException(PRODUCTION_NOT_FOUND_MESSAGE);
        }
        if (confirmed != 0) {
            throw new IllegalArgumentException(CONFIRMED_EDIT_MESSAGE);
        }
        shipmentDAO.updateProductionActualQty(lotId, qtyText(actualQty));
    }

    @Override
    public void deleteShipment(long id) throws Exception {
        ShipmentVO state = shipmentDAO.selectShipmentState(id);
        if (state == null) {
            return;
        }
        if (state.confirmed()) {
            throw new IllegalArgumentException(CONFIRMED_DELETE_MESSAGE);
        }
        if (state.getSourceOrderId() != null) {
            shipmentDAO.updateOrderImportedShipment(state.getSourceOrderId(), 0);
        }
        shipmentDAO.deleteAllocations(id);
        shipmentDAO.deleteShipment(id);
    }

    @Override
    public List<LotAllocationVO> getAllocations(long id) throws Exception {
        List<LotAllocationVO> rows = shipmentDAO.selectAllocations(id);
        if (!rows.isEmpty()) {
            return rows;
        }
        ShipmentVO state = shipmentDAO.selectShipmentState(id);
        if (state == null || state.getLotId() == null) {
            return Collections.emptyList();
        }
        double qty = shippedQty(null, state.getActualQty(), state.getOrderQty());
        if (qty <= 0) {
            return Collections.emptyList();
        }
        // 배분 없이 예전 방식(로트 하나)으로 걸려 있으면 그 연결을 배분 한 줄처럼 돌려준다
        LotAllocationVO legacy = new LotAllocationVO();
        legacy.setLotId(state.getLotId());
        legacy.setQty(qty);
        legacy.setLotNo(state.getLotNo());
        legacy.setLotDate(state.getLotDate());
        return Collections.singletonList(legacy);
    }

    @Override
    public int saveAllocations(long id, List<Map<String, Object>> items) throws Exception {
        ShipmentVO state = shipmentDAO.selectShipmentState(id);
        if (state == null) {
            throw new IllegalArgumentException(NOT_FOUND_MESSAGE);
        }
        if (state.confirmed()) {
            throw new IllegalArgumentException(CONFIRMED_LOT_MESSAGE);
        }
        List<Long> lots = new ArrayList<>();
        List<Double> qtys = new ArrayList<>();
        for (Map<String, Object> item : items == null ? Collections.<Map<String, Object>>emptyList() : items) {
            Long lotId = item == null ? null : toLong(item.get("lotId"));
            Double qty = item == null ? null : toDouble(item.get("qty"));
            if (lotId == null || qty == null) {
                throw new IllegalArgumentException(ALLOCATION_NUMBER_MESSAGE);
            }
            if (qty <= 0) {
                continue;
            }
            lots.add(lotId);
            qtys.add(qty);
        }
        Set<Long> seen = new HashSet<>();
        for (Long lot : lots) {
            if (!seen.add(lot)) {
                throw new IllegalArgumentException(ALLOCATION_DUPLICATE_MESSAGE);
            }
        }
        shipmentDAO.deleteAllocations(id);
        String createdAt = now();
        for (int i = 0; i < lots.size(); i++) {
            shipmentDAO.insertAllocation(id, lots.get(i), qtys.get(i), createdAt);
        }
        shipmentDAO.updateShipmentLot(id, lots.size() == 1 ? lots.get(0) : null);
        return lots.size();
    }

    // 품목명(규격)으로 제품(사용 중, 이름 순 첫 번째)을 찾고 그 로트를 받는다.
    // 잔량 = 생산량(생산입고 전이면 계획수량) - 출하량. 출하량은 적어두지 않고 출하 기록에서 센다.
    @Override
    public ProductLotListVO listLots(String productName) throws Exception {
        String name = productName == null ? "" : productName.trim();
        OrderProductVO product = null;
        for (OrderProductVO candidate : salesOrderService.listProductCandidates()) {
            if (name.equals(candidate.getDisplay())) {
                product = candidate;
                break;
            }
        }
        ProductLotListVO result = new ProductLotListVO();
        result.setLots(new ArrayList<ProductLotVO>());
        if (product == null) {
            return result;
        }
        String display = product.getDisplay();
        Map<Long, Double> shipped = lotShippedMap(display);
        for (LotRowVO row : shipmentDAO.selectLotsByProduct(display)) {
            boolean produced = row.getActualQty() != null && !row.getActualQty().trim().isEmpty();
            double base = parseQty(produced ? row.getActualQty() : row.getOrderQty());
            Double out = shipped.get(row.getId());
            double shippedQty = out == null ? 0 : out;
            ProductLotVO lot = new ProductLotVO();
            lot.setLotId(row.getId());
            lot.setLotDate(row.getScheduleDate());
            lot.setLotNo(row.getLotNo() == null ? "" : row.getLotNo());
            lot.setStatus(produced ? "produced" : "planned");
            lot.setProducedQty(base);
            lot.setShippedQty(shippedQty);
            lot.setRemainingQty(base - shippedQty);
            lot.setClientName(row.getClientName() == null ? "" : row.getClientName());
            lot.setOrderQty(row.getOrderQty() == null ? "" : row.getOrderQty());
            result.getLots().add(lot);
        }
        result.setProductCode(product.getCode());
        return result;
    }

    // 로트마다 나간 양: ① 로트 배분 ② 배분 없이 로트 하나만 걸어둔 출하등록 줄 ③ 물류출고일이 있는 생산확정 줄 자신.
    // ③은 ②가 그 로트를 가리키면(출하확정 전) 세지 않는다. 출하 목록에서 ③을 숨기는 규칙과 같다.
    private Map<Long, Double> lotShippedMap(String productName) throws Exception {
        Map<Long, Double> shipped = new HashMap<>();
        for (LotRowVO a : shipmentDAO.selectAllocationSumsByProduct(productName)) {
            add(shipped, a.getLotId(), a.getQty() == null ? 0 : a.getQty());
        }
        Set<Long> linked = new HashSet<>();
        for (LotRowVO s : shipmentDAO.selectLinkedShipmentsByProduct(productName)) {
            linked.add(s.getLotId());
            if (!Boolean.TRUE.equals(s.getAllocated())) {
                add(shipped, s.getLotId(), shippedQty(null, s.getActualQty(), s.getOrderQty()));
            }
        }
        for (LotRowVO p : shipmentDAO.selectLotShipmentsByProduct(productName)) {
            boolean confirmed = p.getShipConfirmed() != null && p.getShipConfirmed() != 0;
            if (linked.contains(p.getId()) && !confirmed) {
                continue;
            }
            add(shipped, p.getId(), shippedQty(p.getLogisticsActualQty(), null, p.getOrderQty()));
        }
        return shipped;
    }

    @Override
    public List<PendingOrderVO> listPlannedOrders(String productName) throws Exception {
        return shipmentDAO.selectPlannedOrders(productName == null ? "" : productName.trim());
    }

    @Override
    public List<PendingOrderVO> listImportOrders(String start, String end) throws Exception {
        if (start == null || start.trim().isEmpty() || end == null || end.trim().isEmpty()) {
            return Collections.emptyList();
        }
        return shipmentDAO.selectImportOrders(start.trim(), end.trim());
    }

    private static void add(Map<Long, Double> shipped, Long lotId, double qty) {
        if (lotId != null && qty != 0) {
            shipped.merge(lotId, qty, Double::sum);
        }
    }

    // 송연 shipped_qty_of: 물류 실출하량 → 실출하량 → 예정량 중 처음 적힌 것
    private static double shippedQty(String logisticsActual, String actual, String order) {
        for (String value : new String[] { logisticsActual, actual, order }) {
            if (value != null && !value.isEmpty()) {
                return parseQty(value);
            }
        }
        return 0;
    }

    // 송연 parse_qty_number: '1,000kg' → 1000. 쉼표를 빼고 첫 숫자 덩어리, 없으면 0
    static double parseQty(Object value) {
        if (value == null) {
            return 0;
        }
        String text = value.toString().replace(",", "");
        Matcher matcher = QTY.matcher(text);
        if (!matcher.find()) {
            return 0;
        }
        try {
            return Double.parseDouble(matcher.group());
        } catch (NumberFormatException ex) {
            return 0;
        }
    }

    // 송연 NumberUtil.formatG: 파이썬 '%g' 와 같은 표시(유효숫자 6자리, 1500.0 → 1500)
    static String formatG(double value) {
        if (value == 0) {
            return "0";
        }
        BigDecimal rounded = new BigDecimal(value).round(new MathContext(6));
        int exponent = rounded.precision() - rounded.scale() - 1;
        if (exponent < -4 || exponent >= 6) {
            BigDecimal mantissa = rounded.movePointLeft(exponent).stripTrailingZeros();
            return mantissa.toPlainString() + (exponent < 0 ? "e-" : "e+") + String.format("%02d", Math.abs(exponent));
        }
        return rounded.stripTrailingZeros().toPlainString();
    }

    // 화면은 글자, 다른 프로그램은 숫자를 보낸다. 비우면 null(실출하량 없음). 숫자 0 도 비움(송연 `or ""`)
    static String qtyText(Object value) {
        if (value instanceof Number && ((Number) value).doubleValue() == 0) {
            return null;
        }
        String text = value == null ? "" : value.toString().trim();
        return text.isEmpty() ? null : text;
    }

    private static Long toLong(Object value) {
        if (value instanceof Number) {
            return ((Number) value).longValue();
        }
        try {
            return value == null ? null : Long.valueOf(value.toString().trim());
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private static Double toDouble(Object value) {
        if (value instanceof Number) {
            return ((Number) value).doubleValue();
        }
        try {
            return value == null ? null : Double.valueOf(value.toString().trim());
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private static String now() {
        return LocalDateTime.now(ZoneId.of("Asia/Seoul")).format(CREATED_AT);
    }
}

package egovframework.let.lg.confirm.service.impl;

import java.math.BigDecimal;
import java.math.MathContext;
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

import egovframework.let.common.inventory.domain.model.ProductStockMovementVO;
import egovframework.let.common.inventory.service.InventoryService;
import egovframework.let.lg.confirm.domain.model.CharterSummaryVO;
import egovframework.let.lg.confirm.domain.model.ShipConfirmRequestVO;
import egovframework.let.lg.confirm.domain.model.ShipConfirmVO;
import egovframework.let.lg.confirm.domain.model.ShipLotAllocationVO;
import egovframework.let.lg.confirm.domain.repository.ShipConfirmDAO;
import egovframework.let.lg.confirm.service.ShipConfirmService;

/**
 * 물류관리 - 출하확정 서비스 구현 클래스 (송연 LG0002Service 를 옮김).
 *
 * ■ 재고는 확정에서 움직인다 — 매출도 확정된 것만 센다. 두 숫자가 같은 사건을 봐야 어긋나지 않는다.
 * ■ 두 번 빼지 않는다 — 지금 상태를 보고 실제로 바뀔 때만 움직인다.
 * ■ 로트 배분이 있으면 로트마다 한 줄씩 뺀다(나중에 '이 로트가 어디로 나갔나' 를 되짚을 수 있게).
 * @author SONGYEON ERP
 * @since 2026.10.06
 * @version 1.0
 */
@Service("shipConfirmService")
public class ShipConfirmServiceImpl extends EgovAbstractServiceImpl implements ShipConfirmService {

    private static final Pattern QTY = Pattern.compile("[\\d.]+");
    static final String VEHICLE_GROUP = "VEHICLE_INFO";
    static final String PACKING_GROUP = "PACKING_TYPE";
    static final String VEHICLE_MESSAGE = "공통코드 '차량정보'(VEHICLE_INFO)에 없는 배차입니다";
    static final String PACKING_MESSAGE = "공통코드 'PACKING_TYPE' 에 없는 포장방법입니다";
    static final String DRIVER_MESSAGE = "직원 목록에 있는 운행자를 골라주세요(용차 기사는 용차정보에 적어주세요)";

    private final ShipConfirmDAO shipConfirmDAO;
    private final InventoryService inventoryService;

    public ShipConfirmServiceImpl(ShipConfirmDAO shipConfirmDAO, InventoryService inventoryService) {
        this.shipConfirmDAO = shipConfirmDAO;
        this.inventoryService = inventoryService;
    }

    // ■ 같은 출하가 두 줄로 보이는 것을 막는다
    //   출하등록에서 그 로트를 골라 한 줄 넣은 순간부터는 ①이 그 출하의 기록이므로 ②는 숨긴다.
    //   다만 ②가 이미 출하확정된 것이면 매출로 잡힌 기록이라 그대로 둔다.
    // 보관방법과 지금 재고는 품목명 '이름(규격)' 으로 제품BOM 에서 붙인다(확정 전에 재고가 마이너스가 되는지 화면이 따진다).
    @Override
    public List<ShipConfirmVO> listSchedule(String date) throws Exception {
        if (isBlank(date)) {
            throw new IllegalArgumentException("date 파라미터가 필요합니다");
        }
        String day = date.trim();
        Map<Long, List<ShipLotAllocationVO>> allocations = new HashMap<>();
        for (ShipLotAllocationVO a : shipConfirmDAO.selectAllocations()) {
            a.setLotNo(a.getLotNo() == null ? "" : a.getLotNo());
            a.setLotDate(a.getLotDate() == null ? "" : a.getLotDate());
            List<ShipLotAllocationVO> list = allocations.get(a.getShipmentId());
            if (list == null) {
                list = new ArrayList<>();
                allocations.put(a.getShipmentId(), list);
            }
            list.add(a);
        }
        List<ShipConfirmVO> all = new ArrayList<>();
        for (ShipConfirmVO row : shipConfirmDAO.selectManualRows(day)) {
            row.setSource("manual");
            row.setShipped(!isBlank(row.getActualQty()));
            List<ShipLotAllocationVO> list = allocations.get(row.getId());
            row.setLotAllocations(list == null ? Collections.<ShipLotAllocationVO>emptyList() : list);
            all.add(row);
        }
        Set<Long> linked = new HashSet<>(shipConfirmDAO.selectLinkedLotIds());
        for (ShipConfirmVO row : shipConfirmDAO.selectProductionRows(day)) {
            if (linked.contains(row.getId()) && !confirmed(row)) {
                continue;
            }
            row.setSource("production");
            row.setShipped(!isBlank(row.getActualQty()));
            row.setLotAllocations(Collections.<ShipLotAllocationVO>emptyList());
            all.add(row);
        }
        if (!all.isEmpty()) {
            Map<String, ShipConfirmVO> byDisplay = new HashMap<>();
            for (ShipConfirmVO product : shipConfirmDAO.selectProductsForDisplay()) {
                byDisplay.put(displayName(product.getName(), product.getSpec()), product);
            }
            for (ShipConfirmVO row : all) {
                ShipConfirmVO product = byDisplay.get(row.getProductName() == null ? "" : row.getProductName());
                row.setStorage(product == null ? null : product.getStorage());
                row.setStockQty(product == null ? null : product.getStockQty());
            }
        }
        return all;
    }

    @Override
    public List<String> listDriverNames() throws Exception {
        return shipConfirmDAO.selectEmployeeNames();
    }

    // 송연 화면은 실출하량 저장 → 확정 두 번을 불렀다. 여기서는 한 번에 한다(중간에 막히면 둘 다 되돌린다).
    // 순서가 중요하다: 실출하량과 박스수량을 먼저 적고, 그 값으로 재고를 뺀 뒤, 배차·포장 등을 적고 확정 표시.
    @Override
    public void confirm(String source, long id, ShipConfirmRequestVO request, String userName) throws Exception {
        boolean production = isProduction(source);
        ShipConfirmVO row = requireShipment(production, id);
        ShipConfirmRequestVO body = request == null ? new ShipConfirmRequestVO() : request;
        String actualQty = body.getActualQty() == null ? "" : body.getActualQty().trim();
        if (actualQty.isEmpty()) {
            throw new IllegalArgumentException("실출하량을 입력해주세요. 이 수량만큼 재고가 빠져요.");
        }
        // 2026-10-26 배차 · 포장방법은 공통코드 코드로 저장한다(재고를 움직이기 전에 확인)
        String vehicleCode = commonCodeOf(VEHICLE_GROUP, body.getVehicle(), VEHICLE_MESSAGE);
        String packingCode = commonCodeOf(PACKING_GROUP, body.getPackingMethod(), PACKING_MESSAGE);
        String driverId = driverIdOf(body.getDriverName()); // 2026-10-26 운행자는 사번으로 저장(직원만)
        saveActualQty(production, id, row, actualQty, userName);
        shipConfirmDAO.updateBoxQty(production, id, toDouble(body.getBoxQty()));
        applyShipmentStock(production, id, true, userName);

        ShipConfirmVO fields = new ShipConfirmVO();
        fields.setVehicle(vehicleCode);
        fields.setPackingMethod(packingCode);
        fields.setShipNote(body.getNote());
        fields.setVisitOrder(toInteger(body.getVisitOrder()));
        fields.setDriverId(driverId);
        fields.setCharterInfo(body.getCharterInfo());
        fields.setCharterAmount(toDouble(body.getCharterAmount()));
        shipConfirmDAO.updateConfirm(production, id, fields);
    }

    // 생산입고를 건너뛰어 확정 때 자동으로 잡은 입고는 되돌리지 않는다 — 물건은 만들어졌고 나가지만 않은 것이다.
    @Override
    public void unconfirm(String source, long id, String userName) throws Exception {
        boolean production = isProduction(source);
        requireShipment(production, id);
        applyShipmentStock(production, id, false, userName);
        shipConfirmDAO.updateUnconfirm(production, id);
    }

    @Override
    public CharterSummaryVO charterSummary(String start, String end) throws Exception {
        if (isBlank(start) || isBlank(end)) {
            throw new IllegalArgumentException("조회 기간을 선택해주세요");
        }
        List<ShipConfirmVO> rows = new ArrayList<>(shipConfirmDAO.selectCharterRows(false, start.trim(), end.trim()));
        rows.addAll(shipConfirmDAO.selectCharterRows(true, start.trim(), end.trim()));
        Collections.sort(rows, (a, b) -> nz(a.getScheduleDate()).compareTo(nz(b.getScheduleDate())));
        double total = 0;
        for (ShipConfirmVO row : rows) {
            total += row.getCharterAmount() == null ? 0 : row.getCharterAmount();
        }
        CharterSummaryVO result = new CharterSummaryVO();
        result.setRows(rows);
        result.setTotalAmount(total);
        return result;
    }

    // 실출하량을 적는다. 이미 확정된 건이면 확정 때 뺀 재고를 새 수량만큼 다시 맞춘다(송연 _reprice_shipped_stock).
    // 확정된 건에 로트 배분이 있으면 실출하량만 따로 못 바꾼다 — 배분 합계와 어긋나 어느 로트에서 차이가 났는지 모르게 된다.
    private void saveActualQty(boolean production, long id, ShipConfirmVO row, String actualQty, String userName) throws Exception {
        if (!production && confirmed(row) && !shipConfirmDAO.selectAllocationsOf(id).isEmpty()) {
            throw new IllegalArgumentException("로트가 나뉜 출하는 확정 후에 수량을 바꿀 수 없습니다. 확정취소하고 로트선택에서 함께 고쳐주세요");
        }
        if (confirmed(row)) {
            String productCode = productCodeOf(row);
            double before = production
                    ? shippedQtyOf(row.getLogisticsActualQty(), row.getActualQty(), row.getOrderQty())
                    : shippedQtyOf(row.getActualQty(), row.getOrderQty());
            double after = production
                    ? shippedQtyOf(actualQty, row.getActualQty(), row.getOrderQty())
                    : shippedQtyOf(actualQty, row.getOrderQty());
            if (productCode != null && before != after) {
                inventoryService.moveProductStock(productCode, before - after, "출하정정",
                        movement(row, production, id, "출하수량 " + formatG(before) + " -> " + formatG(after), userName));
            }
        }
        shipConfirmDAO.updateActualQty(production, id, actualQty);
    }

    // 출하확정/해제에 맞춰 제품재고를 빼거나 되돌린다(송연 _apply_shipment_stock).
    // 배분 합계와 실출하량이 다르면 어느 쪽이 맞는지 알 수 없으니 확정을 막는다.
    private void applyShipmentStock(boolean production, long id, boolean confirming, String userName) throws Exception {
        ShipConfirmVO row = shipConfirmDAO.selectShipment(production, id);
        if (row == null || confirmed(row) == confirming) {
            return;
        }
        String productCode = productCodeOf(row);
        if (productCode == null) {
            return;
        }
        String productName = row.getProductName() == null ? "" : row.getProductName();
        double box = row.getBoxQty() == null ? 0 : row.getBoxQty();
        if (box != 0) {
            inventoryService.applyBoxUsage(productCode, confirming ? box : -box, ((confirming ? "출하" : "출하취소") + " " + productName).trim());
        }
        double out = production
                ? shippedQtyOf(row.getLogisticsActualQty(), row.getActualQty(), row.getOrderQty())
                : shippedQtyOf(row.getActualQty(), row.getOrderQty());
        if (out == 0) {
            return;
        }
        String kind = confirming ? "출하" : "출하취소";

        List<ShipLotAllocationVO> allocations = production ? Collections.<ShipLotAllocationVO>emptyList() : shipConfirmDAO.selectAllocationsOf(id);
        if (!allocations.isEmpty()) {
            double total = 0;
            for (ShipLotAllocationVO a : allocations) {
                total += a.getQty() == null ? 0 : a.getQty();
            }
            if (Math.abs(total - out) > 0.001) {
                throw new IllegalArgumentException("로트 배분 합계 " + formatG(total) + " 가 실출하량 " + formatG(out) + " 과 다릅니다. 로트선택에서 수량을 맞춰주세요.");
            }
            for (ShipLotAllocationVO a : allocations) {
                double qty = a.getQty() == null ? 0 : a.getQty();
                if (confirming) {
                    receiveLotIfNeeded(a.getLotId(), qty, userName);
                }
                String lot = !isBlank(a.getLotNo()) ? a.getLotNo() : !isBlank(a.getLotDate()) ? a.getLotDate() : String.valueOf(a.getLotId());
                inventoryService.moveProductStock(productCode, confirming ? -qty : qty, kind, movement(row, production, id, "로트 " + lot, userName));
            }
            return;
        }
        // 생산입고를 건너뛴 로트라면 빼기 전에 먼저 잡는다
        if (confirming) {
            receiveLotIfNeeded(row.getLotId(), out, userName);
        }
        String lotNo = row.getLotId() == null ? null : shipConfirmDAO.selectLotNo(row.getLotId());
        inventoryService.moveProductStock(productCode, confirming ? -out : out, kind,
                movement(row, production, id, !isBlank(lotNo) ? "로트 " + lotNo : null, userName));
    }

    // 아직 생산입고가 안 잡힌 로트를 나간 만큼 입고 처리한다(송연 _receive_lot_if_needed).
    // 없는 물건이 나갈 수는 없으니 나간 만큼은 만들어진 것이다. 그 로트의 계획수량은 넘기지 않는다.
    // 이미 실생산량이 적혀 있으면 사람이 넣은 숫자가 기준이라 건드리지 않는다.
    private void receiveLotIfNeeded(Long lotId, double qty, String userName) throws Exception {
        if (lotId == null || lotId == 0 || qty <= 0) {
            return;
        }
        ShipConfirmVO lot = shipConfirmDAO.selectLot(lotId);
        if (lot == null || !isBlank(lot.getActualQty())) {
            return;
        }
        double planned = isBlank(lot.getOrderQty()) ? 0 : parseQty(lot.getOrderQty());
        double receive = planned > 0 ? Math.min(qty, planned) : qty;
        String productCode = !isBlank(lot.getProductCode()) ? lot.getProductCode() : shipConfirmDAO.selectProductCodeByDisplayName(lot.getProductName());
        if (productCode == null) {
            return;
        }
        shipConfirmDAO.updateLotActualQty(lotId, formatG(receive) + "kg");
        ProductStockMovementVO options = new ProductStockMovementVO();
        options.setProductName(lot.getProductName());
        options.setMovedOn(lot.getScheduleDate());
        options.setSourceTable("production_schedule");
        options.setSourceId(lotId);
        options.setClientName(lot.getClientName());
        options.setNote("출하확정 때 자동으로 잡음");
        options.setCreatedBy(userName); // 2026-10-26 로그인 사번
        inventoryService.moveProductStock(productCode, receive, "생산입고", options);
        inventoryService.applyFilmPouchUsage(productCode, receive, ("생산입고 " + nz(lot.getProductName())).trim());
    }

    private static ProductStockMovementVO movement(ShipConfirmVO row, boolean production, long id, String note, String userName) {
        ProductStockMovementVO options = new ProductStockMovementVO();
        options.setProductName(row.getProductName());
        options.setMovedOn(row.getMovedOn());
        options.setSourceTable(production ? "production_schedule" : "logistics_schedule");
        options.setSourceId(id);
        options.setClientName(row.getClientName());
        options.setNote(note);
        options.setCreatedBy(userName); // 2026-10-26 로그인 사번
        return options;
    }

    private String productCodeOf(ShipConfirmVO row) throws Exception {
        if (!isBlank(row.getProductCode())) {
            return row.getProductCode();
        }
        return shipConfirmDAO.selectProductCodeByDisplayName(row.getProductName());
    }

    private ShipConfirmVO requireShipment(boolean production, long id) throws Exception {
        ShipConfirmVO row = shipConfirmDAO.selectShipment(production, id);
        if (row == null) {
            throw new IllegalArgumentException(production ? "생산스케줄 항목을 찾을 수 없습니다" : "물류스케줄 항목을 찾을 수 없습니다");
        }
        return row;
    }

    private static boolean isProduction(String source) {
        if ("production".equals(source)) {
            return true;
        }
        if ("manual".equals(source)) {
            return false;
        }
        throw new IllegalArgumentException("출하 항목을 찾을 수 없습니다");
    }

    private static boolean confirmed(ShipConfirmVO row) {
        return row.getShipConfirmed() != null && row.getShipConfirmed() != 0;
    }

    // 송연 shipped_qty_of: 출하 한 줄에서 '실제로 나간 수량'. 적힌 칸을 앞에서부터 고른다
    static double shippedQtyOf(String... qtyTexts) {
        for (String value : qtyTexts) {
            if (!isBlank(value)) {
                return parseQty(value);
            }
        }
        return 0;
    }

    // 송연 parse_qty_number: '1,000kg' → 1000. 쉼표를 빼고 첫 숫자 덩어리, 없으면 0
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

    private static String displayName(String name, String spec) {
        return spec != null && !spec.isEmpty() ? nz(name) + "(" + spec + ")" : nz(name);
    }

    // 2026-10-26 화면은 코드명을 보낸다. 비우면 null, 공통코드에 없는 이름은 저장하면 알아볼 수 없으므로 막는다
    private String commonCodeOf(String groupCode, String name, String message) throws Exception {
        if (isBlank(name)) {
            return null;
        }
        String code = shipConfirmDAO.selectCommonCodeByName(groupCode, name.trim());
        if (code == null) {
            throw new IllegalArgumentException(message);
        }
        return code;
    }

    private String driverIdOf(String name) throws Exception {
        if (isBlank(name)) {
            return null;
        }
        String id = shipConfirmDAO.selectEmployeeIdByName(name.trim());
        if (id == null) {
            throw new IllegalArgumentException(DRIVER_MESSAGE);
        }
        return id;
    }

    private static Double toDouble(String value) {
        if (isBlank(value)) {
            return null;
        }
        try {
            return Double.valueOf(value.trim());
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private static Integer toInteger(String value) {
        if (isBlank(value)) {
            return null;
        }
        try {
            return Integer.valueOf(value.trim());
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private static boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    private static String nz(String value) {
        return value == null ? "" : value;
    }
}

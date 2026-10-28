package egovframework.let.pd.actual.service.impl;

import java.math.BigDecimal;
import java.math.MathContext;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

import egovframework.let.common.inventory.domain.model.ProductStockMovementVO;
import egovframework.let.common.inventory.service.InventoryService;
import egovframework.let.pd.actual.domain.model.ProductionActualVO;
import egovframework.let.pd.actual.domain.repository.ProductionActualDAO;
import egovframework.let.pd.actual.service.ProductionActualService;

/**
 * 생산관리 - 생산입고 서비스 구현 클래스
 * 송연 변환본(PD0002Service, 기존 update_production_actual_qty)과 같은 규칙.
 * @author SONGYEON ERP
 * @since 2026.10.06
 * @version 1.0
 */
@Service("productionActualService")
public class ProductionActualServiceImpl extends EgovAbstractServiceImpl implements ProductionActualService {

    static final String DATE_PARAM_MESSAGE = "date 파라미터가 필요합니다";
    static final String NOT_FOUND_MESSAGE = "생산스케줄 항목을 찾을 수 없습니다";
    private static final Pattern QTY = Pattern.compile("[\\d.]+");

    private final ProductionActualDAO productionActualDAO;
    private final InventoryService inventoryService;

    public ProductionActualServiceImpl(ProductionActualDAO productionActualDAO, InventoryService inventoryService) {
        this.productionActualDAO = productionActualDAO;
        this.inventoryService = inventoryService;
    }

    @Override
    public List<ProductionActualVO> listSchedule(String date) throws Exception {
        String day = date == null ? "" : date.trim();
        if (day.isEmpty()) {
            throw new IllegalArgumentException(DATE_PARAM_MESSAGE);
        }
        return productionActualDAO.selectSchedule(day);
    }

    @Override
    public void saveActualQty(long id, String value, String userName) throws Exception {
        String actualQty = value == null ? "" : value.trim();
        ProductionActualVO row = productionActualDAO.selectScheduleRow(id);
        if (row == null) {
            throw new IllegalArgumentException(NOT_FOUND_MESSAGE);
        }
        double oldQty = row.getActualQty() == null || row.getActualQty().trim().isEmpty() ? 0 : parseQty(row.getActualQty());
        double newQty = actualQty.isEmpty() ? 0 : parseQty(actualQty);
        String productCode = row.getProductCode() != null && !row.getProductCode().trim().isEmpty()
                ? row.getProductCode() : productionActualDAO.selectProductCodeByDisplayName(row.getProductName());
        double delta = newQty - oldQty;

        if (productCode != null && delta != 0) {
            // 처음 넣으면 '생산입고', 비우면 '입고취소', 값을 고치면 '생산정정'. 원장만 보고도 무슨 일이 있었는지 알 수 있어야 한다.
            String kind;
            String note;
            if (oldQty == 0) {
                kind = "생산입고";
                note = null;
            } else if (newQty == 0) {
                kind = "입고취소";
                note = formatG(oldQty) + " 취소";
            } else {
                kind = "생산정정";
                note = formatG(oldQty) + " -> " + formatG(newQty);
            }
            ProductStockMovementVO options = new ProductStockMovementVO();
            options.setProductName(row.getProductName());
            options.setMovedOn(row.getScheduleDate());
            options.setSourceTable("production_schedule");
            options.setSourceId(id);
            options.setClientName(row.getClientName());
            options.setNote(note);
            options.setCreatedBy(userName); // 2026-10-26 로그인 사번
            inventoryService.moveProductStock(productCode, delta, kind, options);
            // 만든 만큼 필름·파우치도 쓴 것이다. 고치면 그 차이만큼만 따라 움직인다.
            inventoryService.applyFilmPouchUsage(productCode, delta,
                    (kind + " " + (row.getProductName() == null ? "" : row.getProductName())).trim());
        }
        productionActualDAO.updateActualQty(id, actualQty.isEmpty() ? null : actualQty);
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

    // 송연 NumberUtil.formatG: 파이썬 '%g' 와 같은 표시(980.0 → 980)
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
}

package egovframework.let.lg.stock.service.impl;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

import egovframework.let.lg.stock.domain.model.ProductStockVO;
import egovframework.let.lg.stock.domain.model.StockAsOfVO;
import egovframework.let.lg.stock.domain.repository.ProductStockDAO;
import egovframework.let.lg.stock.service.ProductStockService;
import egovframework.let.sa.shipment.domain.model.ProductLotListVO;
import egovframework.let.sa.shipment.domain.model.ProductLotVO;
import egovframework.let.sa.shipment.service.ShipmentService;

/**
 * 물류관리 - 제품재고관리 서비스 구현 클래스 (송연 LG0001Service)
 * @author SONGYEON ERP
 * @since 2026.10.06
 * @version 1.0
 */
@Service("productStockService")
public class ProductStockServiceImpl extends EgovAbstractServiceImpl implements ProductStockService {

    private static final Pattern QTY = Pattern.compile("[\\d.]+");

    private final ProductStockDAO productStockDAO;
    private final ShipmentService shipmentService;

    public ProductStockServiceImpl(ProductStockDAO productStockDAO, ShipmentService shipmentService) {
        this.productStockDAO = productStockDAO;
        this.shipmentService = shipmentService;
    }

    // 생산확정 줄은 품목명이 '이름(규격)' 으로 적혀 있어 그 모양으로 맞춘다.
    @Override
    public List<ProductStockVO> listStock(String q, String clientName, String sort) throws Exception {
        List<ProductStockVO> rows = productStockDAO.selectStock(blankToNull(q), blankToNull(clientName), "name-desc".equals(sort));
        Map<String, Double> plannedQty = new HashMap<>();
        Map<String, Integer> plannedCount = new HashMap<>();
        for (ProductStockVO pending : productStockDAO.selectPendingProduction()) {
            String name = pending.getProductName() == null ? "" : pending.getProductName();
            plannedQty.merge(name, parseQty(pending.getOrderQty()), Double::sum);
            plannedCount.merge(name, 1, Integer::sum);
        }
        for (ProductStockVO row : rows) {
            String display = displayName(row.getName(), row.getSpec());
            Double qty = plannedQty.get(display);
            Integer count = plannedCount.get(display);
            row.setPlannedQty(qty == null ? 0.0 : qty);
            row.setPlannedCount(count == null ? 0 : count);
        }
        return rows;
    }

    // 지금 재고에서 그 날짜 뒤의 움직임을 원장으로 되감는다. 원장이 생기기 전 날짜는 되감을 기록이 없어 지금 재고에 가깝다.
    @Override
    public StockAsOfVO stockAsOf(String date, String clientName) throws Exception {
        String day = blankToNull(date) == null ? LocalDate.now(ZoneId.of("Asia/Seoul")).toString() : date.trim();
        Map<String, Double> later = new HashMap<>();
        for (ProductStockVO row : productStockDAO.selectProductDeltaAfter(day)) {
            later.put(row.getProductCode(), row.getQty() == null ? 0 : row.getQty());
        }
        Map<String, Double> materialCost = new HashMap<>();
        for (ProductStockVO cost : productStockDAO.selectMaterialCosts()) {
            materialCost.put(cost.getProductCode(), cost.getMaterialCost());
        }
        List<ProductStockVO> products = productStockDAO.selectProductsForAsOf(blankToNull(clientName));
        double total = 0;
        for (ProductStockVO product : products) {
            Double moved = later.get(product.getCode());
            double stock = (product.getStockQty() == null ? 0 : product.getStockQty()) - (moved == null ? 0 : moved);
            Double cost = materialCost.get(product.getCode());
            Double amount = cost == null ? null : stock * cost;
            if (amount != null) {
                total += amount;
            }
            product.setStockQty(stock);
            product.setMaterialCost(cost);
            product.setAmount(amount);
        }
        StockAsOfVO result = new StockAsOfVO();
        result.setDate(day);
        result.setProducts(products);
        result.setTotalAmount(total);
        return result;
    }

    // 로트 = 그 제품('이름(규격)')의 생산확정 줄. 출하등록의 로트 고르기와 같은 계산을 그대로 쓴다.
    @Override
    public List<ProductLotVO> listLots(String code) throws Exception {
        ProductStockVO product = productStockDAO.selectProduct(code);
        if (product == null) {
            throw new IllegalArgumentException("제품을 찾을 수 없습니다");
        }
        ProductLotListVO lots = shipmentService.listLots(displayName(product.getName(), product.getSpec()));
        return lots.getLots() == null ? new ArrayList<ProductLotVO>() : lots.getLots();
    }

    private static String displayName(String name, String spec) {
        return spec != null && !spec.isEmpty() ? name + "(" + spec + ")" : (name == null ? "" : name);
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

    private static String blankToNull(String value) {
        return value == null || value.trim().isEmpty() ? null : value.trim();
    }
}

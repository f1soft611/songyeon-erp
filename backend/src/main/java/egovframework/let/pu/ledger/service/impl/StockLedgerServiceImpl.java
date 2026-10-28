package egovframework.let.pu.ledger.service.impl;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

import egovframework.let.common.inventory.service.MaterialStockSnapshotService;
import egovframework.let.common.inventory.service.WarehouseSplit;
import egovframework.let.pu.ledger.domain.model.LedgerDataVO;
import egovframework.let.pu.ledger.domain.model.LedgerRowVO;
import egovframework.let.pu.ledger.domain.model.StockAsOfVO;
import egovframework.let.pu.ledger.domain.repository.StockLedgerDAO;
import egovframework.let.pu.ledger.service.StockLedgerService;

/**
 * 구매관리 - 수불대장 서비스 구현 클래스 (송연 app.py 2621-2769 · 2925-2981 과 같은 규칙)
 * 전일재고·남은재고는 재고현황과 같은 계산(공통 재고 MaterialStockSnapshotService.deltaAfter)을 쓴다 —
 * 예전에 '지금 재고' 에서 이 기간 것만 빼다가 지난 달을 조회해도 오늘 재고가 나와 재고현황과 어긋난 적이 있다.
 * @author SONGYEON ERP
 * @since 2026.10.13
 * @version 1.0
 */
@Service("stockLedgerService")
public class StockLedgerServiceImpl extends EgovAbstractServiceImpl implements StockLedgerService {

    static final String PERIOD_MESSAGE = "start, end 파라미터가 필요합니다";

    private final StockLedgerDAO stockLedgerDAO;
    private final MaterialStockSnapshotService materialStockSnapshotService;

    public StockLedgerServiceImpl(StockLedgerDAO stockLedgerDAO, MaterialStockSnapshotService materialStockSnapshotService) {
        this.stockLedgerDAO = stockLedgerDAO;
        this.materialStockSnapshotService = materialStockSnapshotService;
    }

    @Override
    public List<LedgerRowVO> ledger(String startDate, String endDate) throws Exception {
        String start = text(startDate);
        String end = text(endDate);
        if (start == null || end == null) {
            throw new IllegalArgumentException(PERIOD_MESSAGE);
        }
        String dayBefore;
        try {
            dayBefore = LocalDate.parse(start).minusDays(1).toString();
        } catch (DateTimeParseException ex) {
            throw new IllegalArgumentException(PERIOD_MESSAGE);
        }
        // 창고별로 나누는 규칙은 공통 재고 한 곳에만 있다(재고현황도 같은 것을 쓴다)
        WarehouseSplit split = materialStockSnapshotService.warehouseSplit(end);
        Map<String, Double> deltaBefore = materialStockSnapshotService.deltaAfter(dayBefore);
        Map<String, Double> deltaEnd = materialStockSnapshotService.deltaAfter(end);

        Map<String, Map<String, Double>> orders = byDate(stockLedgerDAO.selectOrders(start, end));
        Map<String, Map<String, Double>> usage = byDate(stockLedgerDAO.selectUsage(start, end));
        Map<String, Map<String, Double>> receiving = byDate(stockLedgerDAO.selectReceiving(start, end));
        // 손으로 고친 것과 부자재 차감도 수불에 들어와야 '전일재고 - 사용 + 입고' 가 남은재고와 맞는다
        for (LedgerDataVO move : stockLedgerDAO.selectMovements(start, end)) {
            if (nz(move.getOutQty()) != 0) {
                usage.computeIfAbsent(move.getCode(), k -> new LinkedHashMap<>()).merge(move.getD(), move.getOutQty(), Double::sum);
            }
            if (nz(move.getInQty()) != 0) {
                receiving.computeIfAbsent(move.getCode(), k -> new LinkedHashMap<>()).merge(move.getD(), move.getInQty(), Double::sum);
            }
        }
        // 재고조사를 한 품목은 남은재고가 '센 값' 으로 바뀐다 — 얼마나 맞췄는지와 사유를 같이 실어 '조사' 꼬리표에 띄운다
        Map<String, LedgerDataVO> adjustments = new HashMap<>();
        for (LedgerDataVO adjust : stockLedgerDAO.selectAdjustments(start, end)) {
            adjustments.put(adjust.getCode(), adjust);
        }

        List<LedgerRowVO> rows = new ArrayList<>();
        for (LedgerDataVO m : stockLedgerDAO.selectMaterials()) {
            String code = m.getCode();
            double stock = nz(m.getStockQty());
            Map<String, Double> usageByDate = usage.getOrDefault(code, new LinkedHashMap<>());
            Map<String, Double> receivingByDate = receiving.getOrDefault(code, new LinkedHashMap<>());
            // 안전재고보다 재고가 적으면 기초발주량(없으면 모자란 만큼)을 발주칸에 미리 채워준다. 저장은 하지 않는다
            Double safety = m.getSafetyStock();
            Double suggested = null;
            if (safety != null && stock < safety) {
                suggested = m.getBaseOrderQty() != null && m.getBaseOrderQty() != 0 ? m.getBaseOrderQty() : safety - stock;
            }
            double remaining = stock - deltaEnd.getOrDefault(code, 0.0);
            LedgerDataVO adjust = adjustments.get(code);

            LedgerRowVO row = new LedgerRowVO();
            row.setCode(code);
            row.setName(m.getName());
            row.setSpec(m.getSpec());
            row.setStockQty(stock);
            row.setUsageByDate(usageByDate);
            row.setReceivingByDate(receivingByDate);
            row.setOrderByDate(orders.getOrDefault(code, new LinkedHashMap<>()));
            row.setTotalUsage(sum(usageByDate));
            row.setTotalReceiving(sum(receivingByDate));
            row.setTotalAdjust(adjust == null ? 0 : nz(adjust.getQty()));
            row.setAdjustNote(adjust == null || adjust.getNotes() == null ? "" : adjust.getNotes());
            row.setBaseStock(stock - deltaBefore.getOrDefault(code, 0.0));
            row.setRemainingStock(remaining);
            row.setWarehouseStock(split.split(code, remaining));
            row.setSafetyStock(safety);
            row.setBaseOrderQty(m.getBaseOrderQty());
            row.setSuggestedOrderQty(suggested);
            row.setBelowSafety(suggested != null);
            row.setWarehouse(m.getWarehouse());
            row.setSubCategory(m.getSubCategory());
            row.setSubCategoryNm(m.getSubCategoryNm());
            row.setUnit(m.getUnit());
            row.setUnitNm(m.getUnitNm());
            row.setSuppliers(m.getSuppliers() == null ? Collections.<String>emptyList() : Arrays.asList(m.getSuppliers()));
            rows.add(row);
        }
        return rows;
    }

    // 지금 재고에서 그 날짜 뒤에 일어난 움직임을 되감아 역산한다(기록이 남기 전의 움직임은 되돌릴 수 없다)
    @Override
    public StockAsOfVO stockAsOf(String date) throws Exception {
        String day = text(date);
        if (day == null) {
            day = LocalDate.now(ZoneId.of("Asia/Seoul")).toString();
        }
        Map<String, Double> delta = materialStockSnapshotService.deltaAfter(day);
        WarehouseSplit split = materialStockSnapshotService.warehouseSplit(day);
        List<StockAsOfVO.Row> rows = new ArrayList<>();
        double total = 0;
        for (LedgerDataVO m : stockLedgerDAO.selectMaterials()) {
            double stock = nz(m.getStockQty()) - delta.getOrDefault(m.getCode(), 0.0);
            Double amount = m.getUnitPrice() == null ? null : stock * m.getUnitPrice();
            if (amount != null) {
                total += amount;
            }
            StockAsOfVO.Row row = new StockAsOfVO.Row();
            row.setCode(m.getCode());
            row.setName(m.getName());
            row.setSpec(m.getSpec());
            row.setSubCategory(m.getSubCategory());
            row.setSubCategoryNm(m.getSubCategoryNm());
            row.setStockQty(stock);
            row.setUnitPrice(m.getUnitPrice());
            row.setAmount(amount);
            row.setWarehouseStock(split.split(m.getCode(), stock));
            rows.add(row);
        }
        StockAsOfVO result = new StockAsOfVO();
        result.setDate(day);
        result.setMaterials(rows);
        result.setTotalAmount(total);
        result.setWarehouses(split.getNames());
        return result;
    }

    private static Map<String, Map<String, Double>> byDate(List<LedgerDataVO> rows) {
        Map<String, Map<String, Double>> out = new HashMap<>();
        for (LedgerDataVO row : rows) {
            if (row.getCode() == null || row.getD() == null) {
                continue;
            }
            out.computeIfAbsent(row.getCode(), k -> new LinkedHashMap<>()).put(row.getD(), nz(row.getQty()));
        }
        return out;
    }

    private static double sum(Map<String, Double> byDate) {
        double total = 0;
        for (Double value : byDate.values()) {
            total += nz(value);
        }
        return total;
    }

    private static double nz(Double value) {
        return value == null ? 0 : value;
    }

    private static String text(Object raw) {
        String value = raw == null ? "" : raw.toString().trim();
        return value.isEmpty() ? null : value;
    }
}

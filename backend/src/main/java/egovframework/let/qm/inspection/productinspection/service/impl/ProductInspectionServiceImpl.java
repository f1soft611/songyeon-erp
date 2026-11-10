package egovframework.let.qm.inspection.productinspection.service.impl;

import java.util.Collections;
import java.util.List;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

import egovframework.let.qm.inspection.productinspection.domain.model.InspectionLotVO;
import egovframework.let.qm.inspection.productinspection.domain.model.ProductSpecRowVO;
import egovframework.let.qm.inspection.productinspection.domain.model.ProductSpecStatsVO;
import egovframework.let.qm.inspection.productinspection.domain.repository.ProductInspectionDAO;
import egovframework.let.qm.inspection.productinspection.service.ProductInspectionService;

/**
 * 품질관리 - 제품검사 서비스 구현 클래스 (송연 qdocs.py pspec_products · list_lots).
 * 제품별 기준 표(송연 qdoc_product_spec)는 ERP 에 아직 없다(2026-11-06 조회까지만). 그래서 넣은 기준이 하나도 없는 것으로 본다:
 * 규격있음은 0줄, 규격없음은 전체, 규격 넣은 수는 0.
 * 성적서 표(송연 qdoc_record)도 아직 없어 검사 탭 로트의 성적서는 늘 비어 있다.
 * @author SONGYEON ERP
 * @since 2026.11.06
 * @version 1.0
 */
@Service("productInspectionService")
public class ProductInspectionServiceImpl extends EgovAbstractServiceImpl implements ProductInspectionService {

    static final String ONLY_MESSAGE = "보기 조건이 올바르지 않습니다";
    static final String DATE_BY_MESSAGE = "날짜 기준이 올바르지 않습니다";

    private final ProductInspectionDAO productInspectionDAO;

    public ProductInspectionServiceImpl(ProductInspectionDAO productInspectionDAO) {
        this.productInspectionDAO = productInspectionDAO;
    }

    @Override
    public List<ProductSpecRowVO> listProductSpecs(String q, String only) throws Exception {
        String typed;
        switch (only == null ? "" : only.trim()) {
            case "":
            case "규격없음":
                typed = null;
                break;
            case "유형있음":
                typed = "Y";
                break;
            case "유형없음":
                typed = "N";
                break;
            case "규격있음":
                return Collections.emptyList();
            default:
                throw new IllegalArgumentException(ONLY_MESSAGE);
        }
        String term = q == null ? null : q.trim();
        return productInspectionDAO.selectProductSpecs(term == null || term.isEmpty() ? null : term, typed);
    }

    @Override
    public ProductSpecStatsVO specStats() throws Exception {
        ProductSpecStatsVO stats = productInspectionDAO.selectSpecStats();
        if (stats == null) {
            stats = new ProductSpecStatsVO();
        }
        stats.setWithSpec(0);
        return stats;
    }

    @Override
    public List<InspectionLotVO> listLots(String start, String end, String dateBy, boolean planned) throws Exception {
        boolean byShip;
        switch (dateBy == null ? "" : dateBy.trim()) {
            case "":
            case "made":
                byShip = false;
                break;
            case "ship":
                byShip = true;
                break;
            default:
                throw new IllegalArgumentException(DATE_BY_MESSAGE);
        }
        // 원본처럼 시작일 · 종료일이 둘 다 있을 때만 기간을 건다
        String from = blankToNull(start);
        String to = blankToNull(end);
        if (from == null || to == null) {
            from = null;
            to = null;
        }
        List<InspectionLotVO> lots = productInspectionDAO.selectLots(from, to, byShip, planned);
        for (InspectionLotVO lot : lots) {
            fillLot(lot);
        }
        return lots;
    }

    // 송연 lot_context: 생산량 · 출고일(확정/예정/미정/재고생산) · 소비기한
    private static void fillLot(InspectionLotVO lot) {
        String actual = blankToNull(lot.getActualQty());
        lot.setQty(actual != null ? actual : blankToEmpty(lot.getOrderQty()));
        lot.setQtyIsActual(actual != null);

        // 출고일을 날짜만 보여주면 예정일이 실제 출고일인 것처럼 읽힌다. 어느 쪽인지 밝힌다
        String done = blankToNull(lot.getDoneShipDates());
        String plannedShip = blankToNull(lot.getPlannedShipDates());
        if (plannedShip == null) {
            plannedShip = blankToNull(lot.getLogisticsDate());
        }
        if (done != null) {
            lot.setShippedOn(done);
            lot.setShipState("확정");
        } else if (plannedShip != null) {
            lot.setShippedOn(plannedShip);
            lot.setShipState("예정");
        } else {
            lot.setShippedOn("미정");
            boolean stock = lot.getStockProduction() != null && lot.getStockProduction() != 0;
            lot.setShipState(stock ? "재고생산" : "미정");
        }

        String shelf = "";
        if (lot.getShelfLifeMonths() != null && lot.getShelfLifeMonths() != 0) {
            String unit = blankToNull(lot.getShelfLifeUnit());
            shelf = "제조일로부터 " + lot.getShelfLifeMonths() + (unit != null ? unit : "개월") + "까지";
            String storage = blankToNull(lot.getStorage());
            if (storage != null) {
                shelf += " [" + storage + "]";
            }
        }
        lot.setShelfLife(shelf);
        lot.setRecordId(null);
        lot.setRecordStatus(null);
    }

    private static String blankToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private static String blankToEmpty(String value) {
        String trimmed = blankToNull(value);
        return trimmed == null ? "" : trimmed;
    }
}

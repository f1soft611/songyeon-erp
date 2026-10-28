package egovframework.let.pu.ledger.domain.repository;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.egovframe.rte.psl.dataaccess.EgovAbstractMapper;
import org.springframework.stereotype.Repository;

import egovframework.let.pu.ledger.domain.model.LedgerDataVO;

/**
 * 구매관리 - 수불대장 데이터 접근 클래스
 * (송연 materials · material_purchase_order · production_material_usage · material_receiving · material_stock_movement · material_stock_schedule, 조회만)
 * @author SONGYEON ERP
 * @since 2026.10.13
 * @version 1.0
 */
@Repository("stockLedgerDAO")
public class StockLedgerDAO extends EgovAbstractMapper {

    public List<LedgerDataVO> selectMaterials() throws Exception {
        return selectList("StockLedgerDAO.selectMaterials");
    }

    public List<LedgerDataVO> selectOrders(String start, String end) throws Exception {
        return selectList("StockLedgerDAO.selectOrders", period(start, end));
    }

    public List<LedgerDataVO> selectUsage(String start, String end) throws Exception {
        return selectList("StockLedgerDAO.selectUsage", period(start, end));
    }

    public List<LedgerDataVO> selectReceiving(String start, String end) throws Exception {
        return selectList("StockLedgerDAO.selectReceiving", period(start, end));
    }

    public List<LedgerDataVO> selectMovements(String start, String end) throws Exception {
        return selectList("StockLedgerDAO.selectMovements", period(start, end));
    }

    public List<LedgerDataVO> selectAdjustments(String start, String end) throws Exception {
        return selectList("StockLedgerDAO.selectAdjustments", period(start, end));
    }

    private static Map<String, Object> period(String start, String end) {
        Map<String, Object> params = new HashMap<>();
        params.put("start", start);
        params.put("end", end);
        return params;
    }
}

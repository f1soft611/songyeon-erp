package egovframework.let.common.inventory.domain.repository;

import java.util.List;

import org.egovframe.rte.psl.dataaccess.EgovAbstractMapper;
import org.springframework.stereotype.Repository;

import egovframework.let.common.inventory.domain.model.StockDeltaVO;

/**
 * 공통 재고 - 원재료 '그 날짜 재고' 와 창고별 나누기 데이터 접근 클래스
 * (송연 material_delta_after · moved_stock_map · receiving_warehouse_name, 조회만)
 * @author SONGYEON ERP
 * @since 2026.10.13
 * @version 1.0
 */
@Repository("materialStockSnapshotDAO")
public class MaterialStockSnapshotDAO extends EgovAbstractMapper {

    public List<StockDeltaVO> selectReceivingAfter(String date) throws Exception {
        return selectList("MaterialStockSnapshotDAO.selectReceivingAfter", date);
    }

    public List<StockDeltaVO> selectUsageAfter(String date) throws Exception {
        return selectList("MaterialStockSnapshotDAO.selectUsageAfter", date);
    }

    public List<StockDeltaVO> selectMovementAfter(String date) throws Exception {
        return selectList("MaterialStockSnapshotDAO.selectMovementAfter", date);
    }

    public List<StockDeltaVO> selectAdjustmentAfter(String date) throws Exception {
        return selectList("MaterialStockSnapshotDAO.selectAdjustmentAfter", date);
    }

    public List<String> selectWarehouseNames() throws Exception {
        return selectList("MaterialStockSnapshotDAO.selectWarehouseNames");
    }

    public String selectReceivingWarehouseName() throws Exception {
        return selectOne("MaterialStockSnapshotDAO.selectReceivingWarehouseName");
    }

    /** date 가 null 이면 기간 제한 없이 */
    public List<StockDeltaVO> selectMovedStock(String date) throws Exception {
        return selectList("MaterialStockSnapshotDAO.selectMovedStock", date);
    }
}

package egovframework.let.pu.stockadjust.domain.repository;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.egovframe.rte.psl.dataaccess.EgovAbstractMapper;
import org.springframework.stereotype.Repository;

import egovframework.let.common.inventory.domain.model.ProductStockMovementVO;
import egovframework.let.pu.stockadjust.domain.model.MaterialStockVO;
import egovframework.let.pu.stockadjust.domain.model.StockScheduleVO;
import egovframework.let.pu.stockadjust.domain.model.WarehouseMoveVO;

/**
 * 구매관리 - 재고조정 데이터 접근 클래스
 * (송연 material_stock_schedule · materials · material_stock_movement · product_stock_schedule · product_stock_movement
 *  · material_warehouse_move · material_receiving · warehouses)
 * @author SONGYEON ERP
 * @since 2026.10.13
 * @version 1.0
 */
@Repository("stockAdjustDAO")
public class StockAdjustDAO extends EgovAbstractMapper {

    // ===== 원재료 재고조정 =====
    public List<StockScheduleVO> selectMaterialSchedule() throws Exception {
        return selectList("StockAdjustDAO.selectMaterialSchedule");
    }

    public List<StockScheduleVO> selectMaterialPending() throws Exception {
        return selectList("StockAdjustDAO.selectMaterialPending");
    }

    public boolean existsMaterial(String code) throws Exception {
        Integer count = selectOne("StockAdjustDAO.countMaterial", code);
        return count != null && count > 0;
    }

    public void insertMaterialSchedule(StockScheduleVO row) throws Exception {
        insert("StockAdjustDAO.insertMaterialSchedule", row);
    }

    public int updateMaterialScheduleEdited(long id, double qty) throws Exception {
        return update("StockAdjustDAO.updateMaterialScheduleEdited", idQty(id, qty));
    }

    public void deleteMaterialSchedule(long id) throws Exception {
        delete("StockAdjustDAO.deleteMaterialSchedule", id);
    }

    public int deleteMaterialPending() throws Exception {
        return delete("StockAdjustDAO.deleteMaterialPending");
    }

    public Double selectMaterialStock(String code) throws Exception {
        return selectOne("StockAdjustDAO.selectMaterialStock", code);
    }

    public void updateMaterialStock(String code, double qty) throws Exception {
        Map<String, Object> params = new HashMap<>();
        params.put("code", code);
        params.put("qty", qty);
        update("StockAdjustDAO.updateMaterialStock", params);
    }

    public void updateMaterialWarehouse(String code, String warehouse) throws Exception {
        Map<String, Object> params = new HashMap<>();
        params.put("code", code);
        params.put("warehouse", warehouse);
        update("StockAdjustDAO.updateMaterialWarehouse", params);
    }

    public void applyMaterialSchedule(long id, String effectiveDate, double newQty, Double oldQty, String note) throws Exception {
        Map<String, Object> params = apply(id, effectiveDate, newQty, oldQty);
        params.put("note", note);
        update("StockAdjustDAO.applyMaterialSchedule", params);
    }

    /** start·end 가 둘 다 있을 때만 기간으로 거른다 */
    public List<StockScheduleVO> selectMaterialHistory(String start, String end) throws Exception {
        Map<String, Object> params = new HashMap<>();
        params.put("start", start);
        params.put("end", end);
        return selectList("StockAdjustDAO.selectMaterialHistory", params);
    }

    public List<MaterialStockVO> selectMaterials() throws Exception {
        return selectList("StockAdjustDAO.selectMaterials");
    }

    public MaterialStockVO selectMaterial(String code) throws Exception {
        return selectOne("StockAdjustDAO.selectMaterial", code);
    }

    public void addMaterialStockInOut(String code, double inQty, double outQty) throws Exception {
        Map<String, Object> params = new HashMap<>();
        params.put("code", code);
        params.put("inQty", inQty);
        params.put("outQty", outQty);
        update("StockAdjustDAO.addMaterialStockInOut", params);
    }

    public void insertMaterialMovement(String code, String name, double inQty, double outQty, String note, String createdAt) throws Exception {
        Map<String, Object> params = new HashMap<>();
        params.put("code", code);
        params.put("name", name);
        params.put("inQty", inQty);
        params.put("outQty", outQty);
        params.put("note", note);
        params.put("createdAt", createdAt);
        insert("StockAdjustDAO.insertMaterialMovement", params);
    }

    public List<String> selectWarehouseNames() throws Exception {
        return selectList("StockAdjustDAO.selectWarehouseNames");
    }

    // ===== 제품 재고조정 =====
    public List<StockScheduleVO> selectProductSchedule() throws Exception {
        return selectList("StockAdjustDAO.selectProductSchedule");
    }

    public List<StockScheduleVO> selectProductPending() throws Exception {
        return selectList("StockAdjustDAO.selectProductPending");
    }

    public boolean existsProduct(String code) throws Exception {
        Integer count = selectOne("StockAdjustDAO.countProduct", code);
        return count != null && count > 0;
    }

    public void insertProductSchedule(StockScheduleVO row) throws Exception {
        insert("StockAdjustDAO.insertProductSchedule", row);
    }

    public int updateProductScheduleEdited(long id, double qty) throws Exception {
        return update("StockAdjustDAO.updateProductScheduleEdited", idQty(id, qty));
    }

    public void deleteProductSchedule(long id) throws Exception {
        delete("StockAdjustDAO.deleteProductSchedule", id);
    }

    public int deleteProductPending() throws Exception {
        return delete("StockAdjustDAO.deleteProductPending");
    }

    public Double selectProductStock(String code) throws Exception {
        return selectOne("StockAdjustDAO.selectProductStock", code);
    }

    public void applyProductSchedule(long id, String effectiveDate, double newQty, Double oldQty) throws Exception {
        update("StockAdjustDAO.applyProductSchedule", apply(id, effectiveDate, newQty, oldQty));
    }

    /** 그 날짜 뒤 제품별 증감(code · diff) */
    public List<StockScheduleVO> selectProductDeltaAfter(String date) throws Exception {
        return selectList("StockAdjustDAO.selectProductDeltaAfter", date);
    }

    /** 조건은 null 이면 거르지 않는다 */
    public List<ProductStockMovementVO> selectProductHistory(String start, String end, String productCode, String kind) throws Exception {
        Map<String, Object> params = new HashMap<>();
        params.put("start", start);
        params.put("end", end);
        params.put("productCode", productCode);
        params.put("kind", kind);
        return selectList("StockAdjustDAO.selectProductHistory", params);
    }

    // ===== 창고이동 =====
    public WarehouseMoveVO selectReceivingByBarcode(String barcode) throws Exception {
        return selectOne("StockAdjustDAO.selectReceivingByBarcode", barcode);
    }

    public String selectReceivingWarehouseName() throws Exception {
        return selectOne("StockAdjustDAO.selectReceivingWarehouseName");
    }

    public List<String> selectOtherWarehouseNames() throws Exception {
        return selectList("StockAdjustDAO.selectOtherWarehouseNames");
    }

    public void insertWarehouseMove(WarehouseMoveVO row) throws Exception {
        insert("StockAdjustDAO.insertWarehouseMove", row);
    }

    public List<WarehouseMoveVO> selectWarehouseMoves(String date) throws Exception {
        return selectList("StockAdjustDAO.selectWarehouseMoves", date);
    }

    public void deleteWarehouseMove(long id) throws Exception {
        delete("StockAdjustDAO.deleteWarehouseMove", id);
    }

    private static Map<String, Object> idQty(long id, double qty) {
        Map<String, Object> params = new HashMap<>();
        params.put("id", id);
        params.put("qty", qty);
        return params;
    }

    private static Map<String, Object> apply(long id, String effectiveDate, double newQty, Double oldQty) {
        Map<String, Object> params = new HashMap<>();
        params.put("id", id);
        params.put("effectiveDate", effectiveDate);
        params.put("newQty", newQty);
        params.put("oldQty", oldQty);
        return params;
    }
}

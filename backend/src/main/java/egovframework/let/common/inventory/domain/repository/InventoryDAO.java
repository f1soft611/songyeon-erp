package egovframework.let.common.inventory.domain.repository;

import java.util.HashMap;
import java.util.Map;

import org.egovframe.rte.psl.dataaccess.EgovAbstractMapper;
import org.springframework.stereotype.Repository;

import egovframework.let.common.inventory.domain.model.InventoryItemVO;
import egovframework.let.common.inventory.domain.model.MaterialStockMovementVO;
import egovframework.let.common.inventory.domain.model.ProductStockMovementVO;

/**
 * 공통 재고 데이터 접근 클래스 (송연 products.stock_qty · product_stock_movement · materials.stock_qty · material_stock_movement)
 * @author SONGYEON ERP
 * @since 2026.10.06
 * @version 1.0
 */
@Repository("inventoryDAO")
public class InventoryDAO extends EgovAbstractMapper {

    /** 제품 이름·규격·지금 재고. 없으면 null. */
    public InventoryItemVO selectProduct(String code) throws Exception {
        return selectOne("InventoryDAO.selectProduct", code);
    }

    public void updateProductStock(String code, double stockQty) throws Exception {
        Map<String, Object> params = new HashMap<>();
        params.put("code", code);
        params.put("stockQty", stockQty);
        update("InventoryDAO.updateProductStock", params);
    }

    public void insertProductMovement(ProductStockMovementVO movement) throws Exception {
        insert("InventoryDAO.insertProductMovement", movement);
    }

    /** 원재료 이름. 없으면 null. */
    public String selectMaterialName(String code) throws Exception {
        return selectOne("InventoryDAO.selectMaterialName", code);
    }

    public void addMaterialStock(String code, double delta) throws Exception {
        Map<String, Object> params = new HashMap<>();
        params.put("code", code);
        params.put("delta", delta);
        update("InventoryDAO.addMaterialStock", params);
    }

    public void insertMaterialMovement(MaterialStockMovementVO movement) throws Exception {
        insert("InventoryDAO.insertMaterialMovement", movement);
    }

    /** 제품에 연결된 부자재(필름·파우치·박스)와 한 봉 내용량. 없으면 null. */
    public InventoryItemVO selectSubMaterials(String productCode) throws Exception {
        return selectOne("InventoryDAO.selectSubMaterials", productCode);
    }
}

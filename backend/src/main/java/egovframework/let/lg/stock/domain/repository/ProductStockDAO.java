package egovframework.let.lg.stock.domain.repository;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.egovframe.rte.psl.dataaccess.EgovAbstractMapper;
import org.springframework.stereotype.Repository;

import egovframework.let.lg.stock.domain.model.ProductStockVO;

/**
 * 물류관리 - 제품재고관리 데이터 접근 클래스 (송연 products · production_schedule · pricing · product_stock_movement, 조회만)
 * @author SONGYEON ERP
 * @since 2026.10.06
 * @version 1.0
 */
@Repository("productStockDAO")
public class ProductStockDAO extends EgovAbstractMapper {

    public List<ProductStockVO> selectStock(String q, String clientName, boolean desc) throws Exception {
        Map<String, Object> params = new HashMap<>();
        params.put("q", q);
        params.put("clientName", clientName);
        params.put("desc", desc);
        return selectList("ProductStockDAO.selectStock", params);
    }

    public List<ProductStockVO> selectPendingProduction() throws Exception {
        return selectList("ProductStockDAO.selectPendingProduction");
    }

    public List<ProductStockVO> selectProductsForAsOf(String clientName) throws Exception {
        Map<String, Object> params = new HashMap<>();
        params.put("clientName", clientName);
        return selectList("ProductStockDAO.selectProductsForAsOf", params);
    }

    public List<ProductStockVO> selectMaterialCosts() throws Exception {
        return selectList("ProductStockDAO.selectMaterialCosts");
    }

    public List<ProductStockVO> selectProductDeltaAfter(String date) throws Exception {
        return selectList("ProductStockDAO.selectProductDeltaAfter", date);
    }

    public ProductStockVO selectProduct(String code) throws Exception {
        return selectOne("ProductStockDAO.selectProduct", code);
    }
}

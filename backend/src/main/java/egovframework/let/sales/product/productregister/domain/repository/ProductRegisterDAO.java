package egovframework.let.sales.product.productregister.domain.repository;

import java.util.HashMap;
import java.util.Map;

import org.egovframe.rte.psl.dataaccess.EgovAbstractMapper;
import org.springframework.stereotype.Repository;

import egovframework.let.sales.product.productregister.domain.model.ProductRegisterVO;

/**
 * 영업관리 - 제품등록 데이터 접근 클래스 (송연 products · pricing)
 * 배합비 줄 넣기는 기초정보 제품BOM 의 ItemMasterDAO.insertBomLine 을 같이 쓴다.
 * @author SONGYEON ERP
 * @since 2026.10.06
 * @version 1.0
 */
@Repository("productRegisterDAO")
public class ProductRegisterDAO extends EgovAbstractMapper {

    /** 제품을 넣는다. 제품코드는 넣기 직전 발번해 product.productCode 에 채운다. */
    public void insertProduct(ProductRegisterVO product) throws Exception {
        insert("ProductRegisterDAO.insertProduct", product);
    }

    /** 새 제품의 단가표(로스·고정마진 0, 제품단가 = 원재료비) */
    public void insertPricing(ProductRegisterVO product) throws Exception {
        insert("ProductRegisterDAO.insertPricing", product);
    }

    // ===== 제품등록 [삭제](2026-10-28) =====
    public boolean existsProduct(String productCode) throws Exception {
        return selectOne("ProductRegisterDAO.existsProduct", productCode) != null;
    }

    public Double selectProductStockQty(String productCode) throws Exception {
        return selectOne("ProductRegisterDAO.selectProductStockQty", productCode);
    }

    /** 수주 · 판매 · 생산 · 물류 스케줄 · 제품 입출고 · 출하 이월 · 라벨에 쓰인 줄 수 */
    public int countProductUsage(String productCode) throws Exception {
        Integer count = selectOne("ProductRegisterDAO.countProductUsage", productCode);
        return count == null ? 0 : count;
    }

    public int revertConfirmedQuotes(String productCode) throws Exception {
        return update("ProductRegisterDAO.revertConfirmedQuotes", productCode);
    }

    public int deleteProductBom(String productCode) throws Exception {
        return delete("ProductRegisterDAO.deleteProductBom", productCode);
    }

    public int deleteProductBomLog(String productCode) throws Exception {
        return delete("ProductRegisterDAO.deleteProductBomLog", productCode);
    }

    public int deleteProductPricing(String productCode) throws Exception {
        return delete("ProductRegisterDAO.deleteProductPricing", productCode);
    }

    public int deleteProduct(String productCode) throws Exception {
        return delete("ProductRegisterDAO.deleteProduct", productCode);
    }

    /** 견적 확정 표시(제품코드를 적는다). 없거나 이미 확정된 견적이면 0. */
    public int updateQuoteConfirmed(long quoteId, String productCode) throws Exception {
        Map<String, Object> params = new HashMap<>();
        params.put("quoteId", quoteId);
        params.put("productCode", productCode);
        return update("ProductRegisterDAO.updateQuoteConfirmed", params);
    }
}

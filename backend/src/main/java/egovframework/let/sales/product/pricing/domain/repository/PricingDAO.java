package egovframework.let.sales.product.pricing.domain.repository;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.egovframe.rte.psl.dataaccess.EgovAbstractMapper;
import org.springframework.stereotype.Repository;

import egovframework.let.sales.product.pricing.domain.model.PricingBomLineVO;
import egovframework.let.sales.product.pricing.domain.model.PricingVO;

/**
 * 영업관리 - 단가관리 데이터 접근 클래스 (송연 pricing · bom · products)
 * @author SONGYEON ERP
 * @since 2026.10.06
 * @version 1.0
 */
@Repository("pricingDAO")
public class PricingDAO extends EgovAbstractMapper {

    /** 단가 목록. q 가 있으면 제품명·제품코드·거래처 부분 일치(대소문자 무시), 제품코드 순. */
    public List<PricingVO> selectPricingList(String q) throws Exception {
        return selectList("PricingDAO.selectPricingList", q);
    }

    /** 단가표 한 줄 전체. 없으면 null. */
    public PricingVO selectPricing(String productCode) throws Exception {
        return selectOne("PricingDAO.selectPricing", productCode);
    }

    /** 단가상세 원재료 구성(순번 순) */
    public List<PricingBomLineVO> selectPricingBom(String productCode) throws Exception {
        return selectList("PricingDAO.selectPricingBom", productCode);
    }

    /** 보낸 칸(fields)만 고친다. */
    public void updatePricingFields(PricingVO row, Set<String> fields) throws Exception {
        Map<String, Object> params = new HashMap<>();
        params.put("row", row);
        params.put("fields", fields);
        update("PricingDAO.updatePricingFields", params);
    }

    /** 제품단가 = 모든 원가 항목의 합(빈 값은 0)으로 다시 적는다. */
    /** 사용 중 거래처코드면 그 코드, 아니면 null(2026-10-28) */
    public String selectActiveClientCode(String clientCode) throws Exception {
        return selectOne("PricingDAO.selectActiveClientCode", clientCode);
    }

    public void updatePricingTotal(String productCode) throws Exception {
        update("PricingDAO.updatePricingTotal", productCode);
    }
}

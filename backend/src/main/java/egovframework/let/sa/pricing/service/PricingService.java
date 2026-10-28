package egovframework.let.sa.pricing.service;

import java.util.List;
import java.util.Map;

import egovframework.let.sa.pricing.domain.model.PricingBomLineVO;
import egovframework.let.sa.pricing.domain.model.PricingVO;

/**
 * 영업관리 - 단가관리 서비스 인터페이스 클래스
 * @author SONGYEON ERP
 * @since 2026.10.06
 * @version 1.0
 */
public interface PricingService {

    /** 단가 목록(제품명·제품코드·거래처 검색) */
    List<PricingVO> listPricing(String q) throws Exception;

    /** 단가표 한 줄. 없으면 막는다. */
    PricingVO getPricing(String productCode) throws Exception;

    /** 단가상세 원재료 구성 */
    List<PricingBomLineVO> listPricingBom(String productCode) throws Exception;

    /**
     * 보낸 항목만 고친다(송연 update_pricing). 고정마진율을 보내면 고정마진 = 원재료비 × 율/100,
     * 로스율을 보내면 로스 = (원재료비 + 고정마진) × 율/100 을 다시 계산하고, 마지막에 제품단가 = 모든 원가 항목의 합.
     */
    void updatePricing(String productCode, Map<String, Object> body) throws Exception;
}

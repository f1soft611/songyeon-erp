package egovframework.let.co.master.partneritem.service;

import java.util.List;

import egovframework.let.co.master.itemmaster.domain.model.ProductBomVO;

/**
 * 공통관리 > 기초정보 > 거래처별 제품조회 서비스 인터페이스 클래스
 * @author SONGYEON ERP
 * @since 2026.10.20
 * @version 1.0
 */
public interface PartnerItemService {

    /**
     * 사용 중인 제품 목록(거래처명 포함)을 조회한다.
     *
     * @exception Exception
     */
    List<ProductBomVO> listPartnerItems() throws Exception;
}

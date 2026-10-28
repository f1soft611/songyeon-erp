package egovframework.let.co.master.partneritem.domain.repository;

import java.util.List;

import org.egovframe.rte.psl.dataaccess.EgovAbstractMapper;
import org.springframework.stereotype.Repository;

import egovframework.let.co.master.itemmaster.domain.model.ProductBomVO;

/**
 * 공통관리 > 기초정보 > 거래처별 제품조회 데이터 접근 클래스
 * @author SONGYEON ERP
 * @since 2026.10.20
 * @version 1.0
 */
@Repository("partnerItemDAO")
public class PartnerItemDAO extends EgovAbstractMapper {

    /** 사용 중인 제품 목록(제품코드 큰 순) */
    public List<ProductBomVO> selectPartnerItemList() throws Exception {
        return selectList("PartnerItemDAO.selectPartnerItemList");
    }
}

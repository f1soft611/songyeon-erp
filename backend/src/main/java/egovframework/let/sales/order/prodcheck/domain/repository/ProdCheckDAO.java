package egovframework.let.sales.order.prodcheck.domain.repository;

import java.util.List;

import org.egovframe.rte.psl.dataaccess.EgovAbstractMapper;
import org.springframework.stereotype.Repository;

import egovframework.let.sales.order.prodcheck.domain.model.ProdCheckDataVO;

/**
 * 영업관리 - 생산가능확인 데이터 접근 클래스 (송연 products · bom · materials 와 재고 증감 기록, 조회만)
 * @author SONGYEON ERP
 * @since 2026.10.06
 * @version 1.0
 */
@Repository("prodCheckDAO")
public class ProdCheckDAO extends EgovAbstractMapper {

    /** 고를 수 있는 제품(사용 중, 배합비 있음) */
    public List<ProdCheckDataVO> selectBomProducts() throws Exception {
        return selectList("ProdCheckDAO.selectBomProducts");
    }

    /** 모든 제품의 코드·이름·규격(품목명(규격) → 코드 찾기) */
    public List<ProdCheckDataVO> selectProductNameSpecs() throws Exception {
        return selectList("ProdCheckDAO.selectProductNameSpecs");
    }

    /** 제품의 배합비(비율 0~1) */
    public List<ProdCheckDataVO> selectBomLines(String productCode) throws Exception {
        return selectList("ProdCheckDAO.selectBomLines", productCode);
    }

    /** 원재료 지금 재고 */
    public List<ProdCheckDataVO> selectMaterialStocks() throws Exception {
        return selectList("ProdCheckDAO.selectMaterialStocks");
    }

    public List<ProdCheckDataVO> selectReceivingAfter(String date) throws Exception {
        return selectList("ProdCheckDAO.selectReceivingAfter", date);
    }

    public List<ProdCheckDataVO> selectUsageAfter(String date) throws Exception {
        return selectList("ProdCheckDAO.selectUsageAfter", date);
    }

    public List<ProdCheckDataVO> selectMovementAfter(String date) throws Exception {
        return selectList("ProdCheckDAO.selectMovementAfter", date);
    }

    public List<ProdCheckDataVO> selectAdjustmentAfter(String date) throws Exception {
        return selectList("ProdCheckDAO.selectAdjustmentAfter", date);
    }
}

package egovframework.let.sa.feasibility.domain.repository;

import java.util.List;

import org.egovframe.rte.psl.dataaccess.EgovAbstractMapper;
import org.springframework.stereotype.Repository;

import egovframework.let.sa.feasibility.domain.model.FeasibilityDataVO;

/**
 * 영업관리 - 생산가능확인 데이터 접근 클래스 (송연 products · bom · materials 와 재고 증감 기록, 조회만)
 * @author SONGYEON ERP
 * @since 2026.10.06
 * @version 1.0
 */
@Repository("feasibilityDAO")
public class FeasibilityDAO extends EgovAbstractMapper {

    /** 고를 수 있는 제품(사용 중, 배합비 있음) */
    public List<FeasibilityDataVO> selectBomProducts() throws Exception {
        return selectList("FeasibilityDAO.selectBomProducts");
    }

    /** 모든 제품의 코드·이름·규격(품목명(규격) → 코드 찾기) */
    public List<FeasibilityDataVO> selectProductNameSpecs() throws Exception {
        return selectList("FeasibilityDAO.selectProductNameSpecs");
    }

    /** 제품의 배합비(비율 0~1) */
    public List<FeasibilityDataVO> selectBomLines(String productCode) throws Exception {
        return selectList("FeasibilityDAO.selectBomLines", productCode);
    }

    /** 원재료 지금 재고 */
    public List<FeasibilityDataVO> selectMaterialStocks() throws Exception {
        return selectList("FeasibilityDAO.selectMaterialStocks");
    }

    public List<FeasibilityDataVO> selectReceivingAfter(String date) throws Exception {
        return selectList("FeasibilityDAO.selectReceivingAfter", date);
    }

    public List<FeasibilityDataVO> selectUsageAfter(String date) throws Exception {
        return selectList("FeasibilityDAO.selectUsageAfter", date);
    }

    public List<FeasibilityDataVO> selectMovementAfter(String date) throws Exception {
        return selectList("FeasibilityDAO.selectMovementAfter", date);
    }

    public List<FeasibilityDataVO> selectAdjustmentAfter(String date) throws Exception {
        return selectList("FeasibilityDAO.selectAdjustmentAfter", date);
    }
}

package egovframework.let.pd.actual.domain.repository;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.egovframe.rte.psl.dataaccess.EgovAbstractMapper;
import org.springframework.stereotype.Repository;

import egovframework.let.pd.actual.domain.model.ProductionActualVO;

/**
 * 생산관리 - 생산입고 데이터 접근 클래스 (송연 production_schedule 의 실생산량)
 * @author SONGYEON ERP
 * @since 2026.10.06
 * @version 1.0
 */
@Repository("productionActualDAO")
public class ProductionActualDAO extends EgovAbstractMapper {

    public List<ProductionActualVO> selectSchedule(String date) throws Exception {
        return selectList("ProductionActualDAO.selectSchedule", date);
    }

    /** 한 건. 없으면 null. */
    public ProductionActualVO selectScheduleRow(long id) throws Exception {
        return selectOne("ProductionActualDAO.selectScheduleRow", id);
    }

    /** 실생산량(비우면 null) */
    public void updateActualQty(long id, String actualQty) throws Exception {
        Map<String, Object> params = new HashMap<>();
        params.put("id", id);
        params.put("actualQty", actualQty);
        update("ProductionActualDAO.updateActualQty", params);
    }

    public String selectProductCodeByDisplayName(String displayName) throws Exception {
        return selectOne("ProductionActualDAO.selectProductCodeByDisplayName", displayName);
    }
}

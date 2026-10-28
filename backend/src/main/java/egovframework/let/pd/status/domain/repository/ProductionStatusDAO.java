package egovframework.let.pd.status.domain.repository;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.egovframe.rte.psl.dataaccess.EgovAbstractMapper;
import org.springframework.stereotype.Repository;

import egovframework.let.pd.status.domain.model.ProductionStatusVO;

/**
 * 생산관리 - 생산현황 데이터 접근 클래스 (송연 production_schedule, 조회만)
 * @author SONGYEON ERP
 * @since 2026.10.06
 * @version 1.0
 */
@Repository("productionStatusDAO")
public class ProductionStatusDAO extends EgovAbstractMapper {

    /** 기간 안의 생산입고 기록. productName·clientName 은 null 이면 거르지 않는다. */
    public List<ProductionStatusVO> selectStatus(String start, String end, String productName, String clientName) throws Exception {
        Map<String, Object> params = new HashMap<>();
        params.put("start", start);
        params.put("end", end);
        params.put("productName", productName);
        params.put("clientName", clientName);
        return selectList("ProductionStatusDAO.selectStatus", params);
    }
}

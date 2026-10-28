package egovframework.let.lg.status.domain.repository;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.egovframe.rte.psl.dataaccess.EgovAbstractMapper;
import org.springframework.stereotype.Repository;

import egovframework.let.lg.status.domain.model.ShipStatusVO;

/**
 * 물류관리 - 출하현황 데이터 접근 클래스 (송연 logistics_schedule · production_schedule · delivery_carryover, 조회만)
 * @author SONGYEON ERP
 * @since 2026.10.07
 * @version 1.0
 */
@Repository("shipStatusDAO")
public class ShipStatusDAO extends EgovAbstractMapper {

    /** production 이면 물류출고일이 적힌 생산확정 줄, 아니면 출하등록 줄. productName·clientName 은 null 이면 거르지 않는다. */
    public List<ShipStatusVO> selectShipped(boolean production, String start, String end, String productName, String clientName) throws Exception {
        Map<String, Object> params = new HashMap<>();
        params.put("production", production);
        params.put("start", start);
        params.put("end", end);
        params.put("productName", productName);
        params.put("clientName", clientName);
        return selectList("ShipStatusDAO.selectShipped", params);
    }

    public List<ShipStatusVO> selectCarryovers() throws Exception {
        return selectList("ShipStatusDAO.selectCarryovers");
    }

    public List<ShipStatusVO> selectProductStorage() throws Exception {
        return selectList("ShipStatusDAO.selectProductStorage");
    }
}

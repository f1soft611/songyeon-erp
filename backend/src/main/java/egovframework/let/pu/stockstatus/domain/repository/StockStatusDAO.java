package egovframework.let.pu.stockstatus.domain.repository;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.egovframe.rte.psl.dataaccess.EgovAbstractMapper;
import org.springframework.stereotype.Repository;

import egovframework.let.pu.stockstatus.domain.model.MaterialLotVO;

/**
 * 구매관리 - 재고현황 데이터 접근 클래스 (송연 material_receiving, 조회만)
 * @author SONGYEON ERP
 * @since 2026.10.13
 * @version 1.0
 */
@Repository("stockStatusDAO")
public class StockStatusDAO extends EgovAbstractMapper {

    public List<MaterialLotVO> selectLots(String code, String date) throws Exception {
        Map<String, Object> params = new HashMap<>();
        params.put("code", code);
        params.put("date", date);
        return selectList("StockStatusDAO.selectLots", params);
    }
}

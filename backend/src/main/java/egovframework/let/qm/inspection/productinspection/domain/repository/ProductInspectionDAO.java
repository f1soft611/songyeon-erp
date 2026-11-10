package egovframework.let.qm.inspection.productinspection.domain.repository;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.egovframe.rte.psl.dataaccess.EgovAbstractMapper;
import org.springframework.stereotype.Repository;

import egovframework.let.qm.inspection.productinspection.domain.model.InspectionLotVO;
import egovframework.let.qm.inspection.productinspection.domain.model.ProductSpecRowVO;
import egovframework.let.qm.inspection.productinspection.domain.model.ProductSpecStatsVO;

/**
 * 품질관리 - 제품검사 데이터 접근 클래스 (송연 qdocs.py 의 제품별 기준 목록: products, 검사 탭 로트: production_schedule · logistics_schedule)
 * @author SONGYEON ERP
 * @since 2026.11.06
 * @version 1.0
 */
@Repository("productInspectionDAO")
public class ProductInspectionDAO extends EgovAbstractMapper {

    /** typed: null 전체 · Y 식품유형 있는 것 · N 없는 것 */
    public List<ProductSpecRowVO> selectProductSpecs(String q, String typed) throws Exception {
        Map<String, Object> params = new HashMap<>();
        params.put("q", q);
        params.put("typed", typed);
        return selectList("ProductInspectionDAO.selectProductSpecs", params);
    }

    public ProductSpecStatsVO selectSpecStats() throws Exception {
        return selectOne("ProductInspectionDAO.selectSpecStats");
    }

    /** 검사 탭 로트. start · end 가 null 이면 기간 없음. byShip: 출고일 기준, planned: 생산예정 줄도 */
    public List<InspectionLotVO> selectLots(String start, String end, boolean byShip, boolean planned) throws Exception {
        Map<String, Object> params = new HashMap<>();
        params.put("start", start);
        params.put("end", end);
        params.put("byShip", byShip);
        params.put("planned", planned);
        return selectList("ProductInspectionDAO.selectLots", params);
    }
}

package egovframework.let.ha.accsales.domain.repository;

import java.util.List;
import java.util.Map;

import org.egovframe.rte.psl.dataaccess.EgovAbstractMapper;
import org.springframework.stereotype.Repository;

import egovframework.let.ha.accsales.domain.model.TradeSourceVO;

/**
 * 인사·회계 - 매출·매입관리 데이터 접근 클래스 (송연 common.py _sales_rows · _purchase_rows · product_price_map, 조회만)
 * @author SONGYEON ERP
 * @since 2026.10.15
 * @version 1.0
 */
@Repository("accSalesDAO")
public class AccSalesDAO extends EgovAbstractMapper {

    /** 확정된 수동 출하 {start, end} (id 순) */
    public List<TradeSourceVO> selectLogisticsShipped(Map<String, Object> period) throws Exception {
        return selectList("AccSalesDAO.selectLogisticsShipped", period);
    }

    /** 확정된 생산연동 출하 {start, end} (id 순) */
    public List<TradeSourceVO> selectProductionShipped(Map<String, Object> period) throws Exception {
        return selectList("AccSalesDAO.selectProductionShipped", period);
    }

    /** 원본별로 이미 넘긴 수량 합 {scheduleType, scheduleId, qty} */
    public List<TradeSourceVO> selectCarriedQty() throws Exception {
        return selectList("AccSalesDAO.selectCarriedQty");
    }

    /** 이 기간으로 넘어온 이월 중 원본이 지금도 확정인 것 {start, end, startMonth, endMonth} */
    public List<TradeSourceVO> selectCarryovers(Map<String, Object> period) throws Exception {
        return selectList("AccSalesDAO.selectCarryovers", period);
    }

    /** 제품 이름 · 규격 · 판매단가(현재 판매단가, 없으면 최종계산단가) */
    public List<TradeSourceVO> selectProductPrices() throws Exception {
        return selectList("AccSalesDAO.selectProductPrices");
    }

    /** 입고 {start, end} (입고일 → id 순) */
    public List<TradeSourceVO> selectPurchases(Map<String, Object> period) throws Exception {
        return selectList("AccSalesDAO.selectPurchases", period);
    }

    public List<String> selectSalesClientNames() throws Exception {
        return selectList("AccSalesDAO.selectSalesClientNames");
    }

    public List<TradeSourceVO> selectSaleProducts() throws Exception {
        return selectList("AccSalesDAO.selectSaleProducts");
    }

    /** 매출 입력에서 고를 거래처: 사용 중만(2026-10-23) */
    public List<String> selectActiveClientNames() throws Exception {
        return selectList("AccSalesDAO.selectActiveClientNames");
    }

    public List<String> selectVendorClientNames() throws Exception {
        return selectList("AccSalesDAO.selectVendorClientNames");
    }

    public List<String> selectMaterialNames() throws Exception {
        return selectList("AccSalesDAO.selectMaterialNames");
    }
}

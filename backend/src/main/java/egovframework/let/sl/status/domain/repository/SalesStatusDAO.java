package egovframework.let.sl.status.domain.repository;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.egovframe.rte.psl.dataaccess.EgovAbstractMapper;
import org.springframework.stereotype.Repository;

import egovframework.let.sl.status.domain.model.SaleRowVO;

/**
 * 판매관리 - 판매현황·토탈집계 데이터 접근 클래스 (송연 sales_record · production_schedule)
 * @author SONGYEON ERP
 * @since 2026.10.07
 * @version 1.0
 */
@Repository("salesStatusDAO")
public class SalesStatusDAO extends EgovAbstractMapper {

    private static Map<String, Object> query(String start, String end, String clientName, String productName) {
        Map<String, Object> params = new HashMap<>();
        params.put("start", start);
        params.put("end", end);
        params.put("clientName", clientName);
        params.put("productName", productName);
        return params;
    }

    /** 적어둔 판매. clientName·productName 은 null 이면 거르지 않는다. */
    public List<SaleRowVO> selectRecords(String start, String end, String clientName, String productName) throws Exception {
        return selectList("SalesStatusDAO.selectRecords", query(start, end, clientName, productName));
    }

    /** 생산입고(실생산량이 적힌 생산확정 줄) */
    public List<SaleRowVO> selectReceipts(String start, String end, String clientName, String productName) throws Exception {
        return selectList("SalesStatusDAO.selectReceipts", query(start, end, clientName, productName));
    }

    public int deleteRecord(long id) throws Exception {
        return delete("SalesStatusDAO.deleteRecord", id);
    }
}

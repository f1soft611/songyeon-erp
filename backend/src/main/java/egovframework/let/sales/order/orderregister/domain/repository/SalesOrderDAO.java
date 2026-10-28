package egovframework.let.sales.order.orderregister.domain.repository;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.egovframe.rte.psl.dataaccess.EgovAbstractMapper;
import org.springframework.stereotype.Repository;

import egovframework.let.sales.order.orderregister.domain.model.OrderProductVO;
import egovframework.let.sales.order.orderregister.domain.model.SalesOrderVO;

/**
 * 영업관리 - 수주등록 데이터 접근 클래스 (송연 sales_order · clients · products)
 * @author SONGYEON ERP
 * @since 2026.10.06
 * @version 1.0
 */
@Repository("salesOrderDAO")
public class SalesOrderDAO extends EgovAbstractMapper {

    /** 그 수주일의 수주(날짜가 없으면 전체). 생산예정일 → 순서 → ID 순. */
    public List<SalesOrderVO> selectOrderList(String orderDate) throws Exception {
        return selectList("SalesOrderDAO.selectOrderList", orderDate);
    }

    public Integer selectMaxSortOrder(String orderDate) throws Exception {
        return selectOne("SalesOrderDAO.selectMaxSortOrder", orderDate);
    }

    /** 넣은 뒤 order.id 에 새 ID 가 채워진다. */
    public void insertOrder(SalesOrderVO order) throws Exception {
        insert("SalesOrderDAO.insertOrder", order);
    }

    /** 수주일·순서는 바꾸지 않는다. 고친 줄 수를 돌려준다. */
    public int updateOrder(SalesOrderVO order) throws Exception {
        return update("SalesOrderDAO.updateOrder", order);
    }

    public int deleteOrder(long id) throws Exception {
        return delete("SalesOrderDAO.deleteOrder", id);
    }

    /** 가져간 수주면 1, 아니면 0, 없으면 null(2026-10-23) */
    public Integer selectOrderImported(long id) throws Exception {
        return selectOne("SalesOrderDAO.selectOrderImported", id);
    }

    /** 분류에 '매출' 이 들어간 거래처 이름 */
    public List<String> selectSalesClientNames() throws Exception {
        return selectList("SalesOrderDAO.selectSalesClientNames");
    }

    /** 거래처 분류. 없으면 null. */
    public String selectClientType(String name) throws Exception {
        return selectOne("SalesOrderDAO.selectClientType", name);
    }

    /** 사용 중인 제품(이름 순) */
    public List<OrderProductVO> selectProductCandidates() throws Exception {
        return selectList("SalesOrderDAO.selectProductCandidates");
    }

    public String selectProductCode(String code) throws Exception {
        return selectOne("SalesOrderDAO.selectProductCode", code);
    }

    /** 거래처마스터 이름 → 거래처코드(2026-10-26) */
    public String selectClientCodeByName(String clientName) throws Exception {
        return selectOne("SalesOrderDAO.selectClientCodeByName", clientName);
    }

    public List<String> selectProductCodesByNameAndSpec(String name, String spec) throws Exception {
        Map<String, Object> params = new HashMap<>();
        params.put("name", name);
        params.put("spec", spec);
        return selectList("SalesOrderDAO.selectProductCodesByNameAndSpec", params);
    }

    public List<String> selectProductCodesByName(String name) throws Exception {
        return selectList("SalesOrderDAO.selectProductCodesByName", name);
    }

    /** 모든 제품의 코드·이름·규격('이름(규격)' 으로 찾기용) */
    public List<OrderProductVO> selectProductNameSpecs() throws Exception {
        return selectList("SalesOrderDAO.selectProductNameSpecs");
    }
}

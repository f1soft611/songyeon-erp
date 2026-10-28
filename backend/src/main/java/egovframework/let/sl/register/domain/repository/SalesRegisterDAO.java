package egovframework.let.sl.register.domain.repository;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.egovframe.rte.psl.dataaccess.EgovAbstractMapper;
import org.springframework.stereotype.Repository;

import egovframework.let.sl.register.domain.model.SalesRecordVO;
import egovframework.let.sl.register.domain.model.ShippableSaleVO;

/**
 * 판매관리 - 판매등록 데이터 접근 클래스 (송연 sales_record · logistics_schedule · production_schedule · pricing)
 * @author SONGYEON ERP
 * @since 2026.10.07
 * @version 1.0
 */
@Repository("salesRegisterDAO")
public class SalesRegisterDAO extends EgovAbstractMapper {

    /** production 이면 물류출고일이 적힌 생산확정 줄, 아니면 출하등록 줄. clientName 은 null 이면 거르지 않는다. */
    public List<ShippableSaleVO> selectShipped(boolean production, String start, String end, String clientName) throws Exception {
        Map<String, Object> params = new HashMap<>();
        params.put("production", production);
        params.put("start", start);
        params.put("end", end);
        params.put("clientName", clientName);
        return selectList("SalesRegisterDAO.selectShipped", params);
    }

    public List<ShippableSaleVO> selectTakenSources() throws Exception {
        return selectList("SalesRegisterDAO.selectTakenSources");
    }

    public List<ShippableSaleVO> selectProductPrices() throws Exception {
        return selectList("SalesRegisterDAO.selectProductPrices");
    }

    /** 거래처마스터 이름 → 거래처코드(2026-10-26). 없으면 null */
    public String selectClientCodeByName(String clientName) throws Exception {
        return selectOne("SalesRegisterDAO.selectClientCodeByName", clientName);
    }

    /** '품명(규격)' · 품명 → 제품코드(2026-10-26). 없으면 null */
    public String selectProductCodeByDisplayName(String displayName) throws Exception {
        return selectOne("SalesRegisterDAO.selectProductCodeByDisplayName", displayName);
    }

    /** @return 넣은 줄 수(같은 출하 건이 이미 있으면 0) */
    public int insertSale(SalesRecordVO sale) throws Exception {
        return insert("SalesRegisterDAO.insertSale", sale);
    }
}

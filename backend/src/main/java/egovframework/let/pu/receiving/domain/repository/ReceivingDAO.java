package egovframework.let.pu.receiving.domain.repository;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.egovframe.rte.psl.dataaccess.EgovAbstractMapper;
import org.springframework.stereotype.Repository;

import egovframework.let.pu.receiving.domain.model.ReceivingSummaryVO;
import egovframework.let.pu.receiving.domain.model.ReceivingVO;

/**
 * 구매관리 - 입고관리 데이터 접근 클래스 (송연 material_receiving · materials · warehouses · production_material_usage)
 * @author SONGYEON ERP
 * @since 2026.10.08
 * @version 1.0
 */
@Repository("receivingDAO")
public class ReceivingDAO extends EgovAbstractMapper {

    /** 조건은 null 이면 거르지 않는다. kind 는 receiving(입고만) · return(반품만) · null(전부) */
    public List<ReceivingVO> selectReceivings(String date, String start, String end, String clientQ, String materialQ, String kind) throws Exception {
        Map<String, Object> params = new HashMap<>();
        params.put("date", date);
        params.put("start", start);
        params.put("end", end);
        params.put("clientQ", clientQ);
        params.put("materialQ", materialQ);
        params.put("kind", kind);
        return selectList("ReceivingDAO.selectReceivings", params);
    }

    public String selectMaterialName(String code) throws Exception {
        return selectOne("ReceivingDAO.selectMaterialName", code);
    }

    /** 입고창고의 창고코드(2026-10-26 코드로 저장). 정해둔 곳이 없으면 null */
    public String selectReceivingWarehouse() throws Exception {
        return selectOne("ReceivingDAO.selectReceivingWarehouse");
    }

    /** 거래처명 → 거래처코드(2026-10-26). 없으면 null */
    public String selectClientCodeByName(String name) throws Exception {
        return selectOne("ReceivingDAO.selectClientCodeByName", name);
    }

    /** 과세구분 이름 → 공통코드 TAX_CATEGORY 코드(2026-10-26). 없으면 null */
    public String selectTaxCode(String name) throws Exception {
        return selectOne("ReceivingDAO.selectTaxCode", name);
    }

    public ReceivingVO selectReturnSource(long id) throws Exception {
        return selectOne("ReceivingDAO.selectReturnSource", id);
    }

    public Double selectReturnedQty(long id) throws Exception {
        return selectOne("ReceivingDAO.selectReturnedQty", id);
    }

    public int countSameDay(String code, String date) throws Exception {
        Map<String, Object> params = new HashMap<>();
        params.put("code", code);
        params.put("date", date);
        return selectOne("ReceivingDAO.countSameDay", params);
    }

    public int insertReceiving(ReceivingVO row) throws Exception {
        return insert("ReceivingDAO.insertReceiving", row);
    }

    public int addMaterialStock(String code, double qty) throws Exception {
        Map<String, Object> params = new HashMap<>();
        params.put("code", code);
        params.put("qty", qty);
        return update("ReceivingDAO.addMaterialStock", params);
    }

    public ReceivingVO selectForCancel(long id) throws Exception {
        return selectOne("ReceivingDAO.selectForCancel", id);
    }

    public int deleteReceiving(long id) throws Exception {
        return delete("ReceivingDAO.deleteReceiving", id);
    }

    public Double selectLastPrice(String code, String clientName) throws Exception {
        Map<String, Object> params = new HashMap<>();
        params.put("code", code);
        params.put("clientName", clientName);
        return selectOne("ReceivingDAO.selectLastPrice", params);
    }

    private static Map<String, Object> period(String code, String start, String end, String clientQ, String materialQ) {
        Map<String, Object> params = new HashMap<>();
        params.put("code", code);
        params.put("start", start);
        params.put("end", end);
        params.put("clientQ", clientQ);
        params.put("materialQ", materialQ);
        return params;
    }

    public List<ReceivingSummaryVO> selectSummary(String start, String end, String clientQ, String materialQ) throws Exception {
        return selectList("ReceivingDAO.selectSummary", period(null, start, end, clientQ, materialQ));
    }

    public List<ReceivingSummaryVO> selectDetailRows(String code, String start, String end, String clientQ) throws Exception {
        return selectList("ReceivingDAO.selectDetailRows", period(code, start, end, clientQ, null));
    }

    public Double selectDetailReceived(String code, String start, String end, String clientQ) throws Exception {
        return selectOne("ReceivingDAO.selectDetailReceived", period(code, start, end, clientQ, null));
    }

    public Double selectDetailUsed(String code, String start, String end) throws Exception {
        return selectOne("ReceivingDAO.selectDetailUsed", period(code, start, end, null, null));
    }
}

package egovframework.let.lg.confirm.domain.repository;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.egovframe.rte.psl.dataaccess.EgovAbstractMapper;
import org.springframework.stereotype.Repository;

import egovframework.let.lg.confirm.domain.model.ShipConfirmVO;
import egovframework.let.lg.confirm.domain.model.ShipLotAllocationVO;

/**
 * 물류관리 - 출하확정 데이터 접근 클래스 (송연 logistics_schedule · production_schedule · shipment_lot_allocation)
 * @author SONGYEON ERP
 * @since 2026.10.06
 * @version 1.0
 */
@Repository("shipConfirmDAO")
public class ShipConfirmDAO extends EgovAbstractMapper {

    private static Map<String, Object> target(boolean production, long id) {
        Map<String, Object> params = new HashMap<>();
        params.put("production", production);
        params.put("id", id);
        return params;
    }

    public List<ShipConfirmVO> selectManualRows(String date) throws Exception {
        return selectList("ShipConfirmDAO.selectManualRows", date);
    }

    public List<ShipLotAllocationVO> selectAllocations() throws Exception {
        return selectList("ShipConfirmDAO.selectAllocations");
    }

    public List<ShipConfirmVO> selectProductionRows(String date) throws Exception {
        return selectList("ShipConfirmDAO.selectProductionRows", date);
    }

    public List<Long> selectLinkedLotIds() throws Exception {
        return selectList("ShipConfirmDAO.selectLinkedLotIds");
    }

    public List<ShipConfirmVO> selectProductsForDisplay() throws Exception {
        return selectList("ShipConfirmDAO.selectProductsForDisplay");
    }

    public List<String> selectEmployeeNames() throws Exception {
        return selectList("ShipConfirmDAO.selectEmployeeNames");
    }

    /** 직원 이름 → 사번(2026-10-26 운행자). 없으면 null */
    public String selectEmployeeIdByName(String name) throws Exception {
        return selectOne("ShipConfirmDAO.selectEmployeeIdByName", name);
    }

    /** 공통코드 이름 → 코드(2026-10-26 배차 · 포장방법). 없으면 null */
    public String selectCommonCodeByName(String groupCode, String name) throws Exception {
        Map<String, Object> params = new HashMap<>();
        params.put("groupCode", groupCode);
        params.put("name", name);
        return selectOne("ShipConfirmDAO.selectCommonCodeByName", params);
    }

    public ShipConfirmVO selectShipment(boolean production, long id) throws Exception {
        return selectOne("ShipConfirmDAO.selectShipment", target(production, id));
    }

    public List<ShipLotAllocationVO> selectAllocationsOf(long shipmentId) throws Exception {
        return selectList("ShipConfirmDAO.selectAllocationsOf", shipmentId);
    }

    public String selectProductCodeByDisplayName(String displayName) throws Exception {
        return selectOne("ShipConfirmDAO.selectProductCodeByDisplayName", displayName == null ? "" : displayName);
    }

    public String selectLotNo(long id) throws Exception {
        return selectOne("ShipConfirmDAO.selectLotNo", id);
    }

    public int updateActualQty(boolean production, long id, String actualQty) throws Exception {
        Map<String, Object> params = target(production, id);
        params.put("actualQty", actualQty);
        return update("ShipConfirmDAO.updateActualQty", params);
    }

    public int updateBoxQty(boolean production, long id, Double boxQty) throws Exception {
        Map<String, Object> params = target(production, id);
        params.put("boxQty", boxQty);
        return update("ShipConfirmDAO.updateBoxQty", params);
    }

    public int updateConfirm(boolean production, long id, ShipConfirmVO row) throws Exception {
        Map<String, Object> params = target(production, id);
        params.put("row", row);
        return update("ShipConfirmDAO.updateConfirm", params);
    }

    public int updateUnconfirm(boolean production, long id) throws Exception {
        return update("ShipConfirmDAO.updateUnconfirm", target(production, id));
    }

    public ShipConfirmVO selectLot(long id) throws Exception {
        return selectOne("ShipConfirmDAO.selectLot", id);
    }

    public int updateLotActualQty(long id, String actualQty) throws Exception {
        Map<String, Object> params = new HashMap<>();
        params.put("id", id);
        params.put("actualQty", actualQty);
        return update("ShipConfirmDAO.updateLotActualQty", params);
    }

    public List<ShipConfirmVO> selectCharterRows(boolean production, String start, String end) throws Exception {
        Map<String, Object> params = new HashMap<>();
        params.put("production", production);
        params.put("start", start);
        params.put("end", end);
        return selectList("ShipConfirmDAO.selectCharterRows", params);
    }
}

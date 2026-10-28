package egovframework.let.sales.shipment.shipmentregister.domain.repository;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.egovframe.rte.psl.dataaccess.EgovAbstractMapper;
import org.springframework.stereotype.Repository;

import egovframework.let.sales.shipment.shipmentregister.domain.model.LotAllocationVO;
import egovframework.let.sales.shipment.shipmentregister.domain.model.LotRowVO;
import egovframework.let.sales.shipment.shipmentregister.domain.model.PendingOrderVO;
import egovframework.let.sales.shipment.shipmentregister.domain.model.ShipmentVO;

/**
 * 영업관리 - 출하등록 데이터 접근 클래스 (송연 logistics_schedule · production_schedule · shipment_lot_allocation · sales_order)
 * @author SONGYEON ERP
 * @since 2026.10.06
 * @version 1.0
 */
@Repository("shipmentDAO")
public class ShipmentDAO extends EgovAbstractMapper {

    /** ① 출하등록에서 넣은 줄 */
    public List<ShipmentVO> selectManualShipments(String date) throws Exception {
        return selectList("ShipmentDAO.selectManualShipments", date);
    }

    /** ② 물류출고일이 있는 생산확정 줄 */
    public List<ShipmentVO> selectProductionShipments(String date) throws Exception {
        return selectList("ShipmentDAO.selectProductionShipments", date);
    }

    public List<LotAllocationVO> selectAllocationsByDate(String date) throws Exception {
        return selectList("ShipmentDAO.selectAllocationsByDate", date);
    }

    public Integer selectMaxSortOrder(String date) throws Exception {
        return selectOne("ShipmentDAO.selectMaxSortOrder", date);
    }

    public Long selectLotIdBySourceOrder(long sourceOrderId) throws Exception {
        return selectOne("ShipmentDAO.selectLotIdBySourceOrder", sourceOrderId);
    }

    /** 넣은 뒤 shipment.id 에 새 ID 가 채워진다. */
    public void insertShipment(ShipmentVO shipment) throws Exception {
        insert("ShipmentDAO.insertShipment", shipment);
    }

    /** 로트의 물류 실출하량(없으면 빈 글자). 로트가 없으면 null. */
    public String selectLotLogisticsActualQty(long lotId) throws Exception {
        return selectOne("ShipmentDAO.selectLotLogisticsActualQty", lotId);
    }

    public void updateLotLogisticsActualQty(long lotId, String qty) throws Exception {
        Map<String, Object> params = new HashMap<>();
        params.put("lotId", lotId);
        params.put("qty", qty);
        update("ShipmentDAO.updateLotLogisticsActualQty", params);
    }

    /** 수주의 '출하로 가져감' 표시 */
    public void updateOrderImportedShipment(long orderId, int imported) throws Exception {
        Map<String, Object> params = new HashMap<>();
        params.put("orderId", orderId);
        params.put("imported", imported);
        update("ShipmentDAO.updateOrderImportedShipment", params);
    }

    /** 출하등록 줄의 상태(수정·삭제 전 확인). 없으면 null. */
    public ShipmentVO selectShipmentState(long id) throws Exception {
        return selectOne("ShipmentDAO.selectShipmentState", id);
    }

    /** 생산확정 줄의 출하확정 여부(0/1). 없으면 null. */
    public Integer selectProductionShipConfirmed(long lotId) throws Exception {
        return selectOne("ShipmentDAO.selectProductionShipConfirmed", lotId);
    }

    public void updateActualQty(long id, String qty) throws Exception {
        update("ShipmentDAO.updateActualQty", idQty(id, qty));
    }

    public void updateProductionActualQty(long lotId, String qty) throws Exception {
        update("ShipmentDAO.updateProductionActualQty", idQty(lotId, qty));
    }

    public void deleteShipment(long id) throws Exception {
        delete("ShipmentDAO.deleteShipment", id);
    }

    public List<LotAllocationVO> selectAllocations(long shipmentId) throws Exception {
        return selectList("ShipmentDAO.selectAllocations", shipmentId);
    }

    public void deleteAllocations(long shipmentId) throws Exception {
        delete("ShipmentDAO.deleteAllocations", shipmentId);
    }

    public void insertAllocation(long shipmentId, long lotId, double qty, String createdAt) throws Exception {
        Map<String, Object> params = new HashMap<>();
        params.put("shipmentId", shipmentId);
        params.put("lotId", lotId);
        params.put("qty", qty);
        params.put("createdAt", createdAt);
        insert("ShipmentDAO.insertAllocation", params);
    }

    /** 출하 줄의 로트(하나일 때만, 여러 개면 null) */
    public void updateShipmentLot(long id, Long lotId) throws Exception {
        Map<String, Object> params = new HashMap<>();
        params.put("id", id);
        params.put("lotId", lotId);
        update("ShipmentDAO.updateShipmentLot", params);
    }

    public List<LotRowVO> selectLotsByProduct(String productName) throws Exception {
        return selectList("ShipmentDAO.selectLotsByProduct", productName);
    }

    public List<LotRowVO> selectAllocationSumsByProduct(String productName) throws Exception {
        return selectList("ShipmentDAO.selectAllocationSumsByProduct", productName);
    }

    public List<LotRowVO> selectLinkedShipmentsByProduct(String productName) throws Exception {
        return selectList("ShipmentDAO.selectLinkedShipmentsByProduct", productName);
    }

    public List<LotRowVO> selectLotShipmentsByProduct(String productName) throws Exception {
        return selectList("ShipmentDAO.selectLotShipmentsByProduct", productName);
    }

    public List<PendingOrderVO> selectPlannedOrders(String productName) throws Exception {
        return selectList("ShipmentDAO.selectPlannedOrders", productName);
    }

    public List<PendingOrderVO> selectImportOrders(String start, String end) throws Exception {
        Map<String, Object> params = new HashMap<>();
        params.put("start", start);
        params.put("end", end);
        return selectList("ShipmentDAO.selectImportOrders", params);
    }

    private static Map<String, Object> idQty(long id, String qty) {
        Map<String, Object> params = new HashMap<>();
        params.put("id", id);
        params.put("qty", qty);
        return params;
    }
}

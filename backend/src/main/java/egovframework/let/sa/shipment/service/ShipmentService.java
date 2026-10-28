package egovframework.let.sa.shipment.service;

import java.util.List;
import java.util.Map;

import egovframework.let.sa.shipment.domain.model.LotAllocationVO;
import egovframework.let.sa.shipment.domain.model.PendingOrderVO;
import egovframework.let.sa.shipment.domain.model.ProductLotListVO;
import egovframework.let.sa.shipment.domain.model.ShipmentVO;

/**
 * 영업관리 - 출하등록 서비스 인터페이스 클래스
 * (출하확정·확정취소(재고 차감)는 출하확정 화면을 옮길 때 그 화면에 만든다)
 * @author SONGYEON ERP
 * @since 2026.10.06
 * @version 1.0
 */
public interface ShipmentService {

    /** 그 출고일의 출하: ① 출하등록 줄(로트 배분 포함) + ② 물류출고일이 있는 생산확정 줄 */
    List<ShipmentVO> listShipments(String date) throws Exception;

    /** 출하 추가. 수주에서 가져온 줄이면 그 수주에 '출하로 가져감' 표시까지 한 번에. 새 ID 를 돌려준다. */
    Long createShipment(ShipmentVO request) throws Exception;

    /** 출하등록 줄의 실출하량(출하확정된 줄은 막는다) */
    void updateActualQty(long id, Object actualQty) throws Exception;

    /** 생산연동 줄의 실출하량(출하확정된 줄은 막는다) */
    void updateProductionActualQty(long lotId, Object actualQty) throws Exception;

    /** 출하 삭제. 가져온 수주는 다시 가져올 수 있게 되고, 로트 배분도 같이 지운다. */
    void deleteShipment(long id) throws Exception;

    /** 로트 배분(없고 로트 하나만 걸려 있으면 그 연결을 한 줄처럼) */
    List<LotAllocationVO> getAllocations(long id) throws Exception;

    /** 로트 배분을 통째로 다시 적는다. 저장한 줄 수를 돌려준다. */
    int saveAllocations(long id, List<Map<String, Object>> items) throws Exception;

    /** 로트 선택: 품목명(규격)과 같은 제품의 로트와 잔량 */
    ProductLotListVO listLots(String productName) throws Exception;

    /** 로트 선택의 생산예정 수주 */
    List<PendingOrderVO> listPlannedOrders(String productName) throws Exception;

    /** 수주등록 가져오기: 물류출고일이 기간 안이고 아직 출하로 안 가져간 수주 */
    List<PendingOrderVO> listImportOrders(String start, String end) throws Exception;
}

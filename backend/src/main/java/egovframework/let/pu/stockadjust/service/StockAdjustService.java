package egovframework.let.pu.stockadjust.service;

import java.util.List;

import egovframework.let.common.inventory.domain.model.ProductStockMovementVO;
import egovframework.let.pu.stockadjust.domain.model.MaterialStockVO;
import egovframework.let.pu.stockadjust.domain.model.MovementRequestVO;
import egovframework.let.pu.stockadjust.domain.model.StockConfirmRequestVO;
import egovframework.let.pu.stockadjust.domain.model.StockConfirmResultVO;
import egovframework.let.pu.stockadjust.domain.model.StockScheduleVO;
import egovframework.let.pu.stockadjust.domain.model.StockUploadRequestVO;
import egovframework.let.pu.stockadjust.domain.model.StockUploadResultVO;
import egovframework.let.pu.stockadjust.domain.model.WarehouseLookupVO;
import egovframework.let.pu.stockadjust.domain.model.WarehouseMoveRequestVO;
import egovframework.let.pu.stockadjust.domain.model.WarehouseMoveResultVO;
import egovframework.let.pu.stockadjust.domain.model.WarehouseMoveVO;

/**
 * 구매관리 - 재고조정 서비스 인터페이스 (송연 app.py 원재료·제품 stock-upload/confirm/schedule/history · movement · warehouse-moves)
 * 엑셀로 센 재고는 바로 반영하지 않고 대기 목록에 쌓았다가, 반영일을 정해 확정할 때 실제 재고에 넣는다.
 * 입력이 잘못되면 IllegalArgumentException(송연과 같은 문구).
 * @author SONGYEON ERP
 * @since 2026.10.13
 * @version 1.0
 */
public interface StockAdjustService {

    // ===== 원재료 재고조정 =====
    /** 대기 중인 원재료 재고조정(목표 수량 · 차이 포함, 원재료명 순) */
    List<StockScheduleVO> listMaterialSchedule() throws Exception;

    /** 재고조사 엑셀(코드 · 이름 · 규격 · 재고수량) 줄을 대기 목록에 쌓는다. 창고는 파일 하나에 하나 */
    StockUploadResultVO uploadMaterial(StockUploadRequestVO request) throws Exception;

    void editMaterialSchedule(long id, String editedQty) throws Exception;

    void cancelMaterialSchedule(long id) throws Exception;

    /** 대기 전부 취소 → 지운 건수 */
    int cancelAllMaterialSchedule() throws Exception;

    /** 대기 전부를 반영일로 확정(사유 필수). 센 값에 반영일 뒤의 움직임을 더해 넣는다 */
    StockConfirmResultVO confirmMaterial(StockConfirmRequestVO request) throws Exception;

    /** 적용된 재고조정(시작·끝이 둘 다 있으면 기간으로) */
    List<StockScheduleVO> listMaterialHistory(String start, String end) throws Exception;

    /** 전체 재고 조회(원재료 전부, 이름 순) */
    List<MaterialStockVO> listMaterials() throws Exception;

    /** 원재료 재고를 손으로 고친다(입고 · 출고 또는 적용재고) */
    void moveMaterial(String code, MovementRequestVO request) throws Exception;

    // ===== 제품 재고조정 =====
    List<StockScheduleVO> listProductSchedule() throws Exception;

    StockUploadResultVO uploadProduct(StockUploadRequestVO request) throws Exception;

    void editProductSchedule(long id, String editedQty) throws Exception;

    void cancelProductSchedule(long id) throws Exception;

    int cancelAllProductSchedule() throws Exception;

    /** 대기 전부를 반영일로 확정. 원장에는 '얼마로' 가 아니라 '얼마나 움직였나' 로 남긴다 */
    StockConfirmResultVO confirmProduct(StockConfirmRequestVO request, String userName) throws Exception;

    /** 제품 입출고 원장(빈 조건은 거르지 않는다) */
    List<ProductStockMovementVO> listProductHistory(String start, String end, String productCode, String kind) throws Exception;

    // ===== 창고이동 =====
    /** 바코드(또는 원재료코드)로 무엇을 몇 kg 씩 옮기는지 */
    WarehouseLookupVO lookupWarehouseMove(String barcode) throws Exception;

    WarehouseMoveResultVO moveWarehouse(WarehouseMoveRequestVO request, String userName) throws Exception;

    /** 그 날 옮긴 것(날짜를 비우면 오늘) */
    List<WarehouseMoveVO> listWarehouseMoves(String date) throws Exception;

    void cancelWarehouseMove(long id) throws Exception;

    /** 옮겨갈 수 있는 창고(입고창고가 아닌 곳) */
    List<String> listMoveTargets() throws Exception;
}

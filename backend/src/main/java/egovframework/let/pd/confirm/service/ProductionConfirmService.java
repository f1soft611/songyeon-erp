package egovframework.let.pd.confirm.service;

import java.util.List;

import egovframework.let.pd.confirm.domain.model.BatchSheetVO;
import egovframework.let.pd.confirm.domain.model.ProductionOrderVO;
import egovframework.let.pd.confirm.domain.model.ProductionSaveRequestVO;
import egovframework.let.pd.confirm.domain.model.ProductionScheduleVO;

/**
 * 생산관리 - 생산확정 서비스 인터페이스 클래스
 * @author SONGYEON ERP
 * @since 2026.10.06
 * @version 1.0
 */
public interface ProductionConfirmService {

    /** 그 날짜의 확정된 생산건(날짜 필수) */
    List<ProductionScheduleVO> listSchedule(String date) throws Exception;

    /**
     * 확정: 로트번호를 붙이고 배합비대로 원재료를 깎는다.
     * 수주에서 가져온 건이면 그 수주를 '생산으로 가져감' 으로 표시하고, 같은 수주에서 나온 출하줄을 이 로트에 연결한다.
     * 새 ID 와 로트번호를 돌려준다.
     */
    ProductionScheduleVO create(ProductionSaveRequestVO request) throws Exception;

    /** 수정: 깎아뒀던 원재료를 되돌린 뒤 바뀐 내용으로 다시 깎는다(품목이 바뀌면 로트번호 회차도 다시) */
    void update(long id, ProductionSaveRequestVO request) throws Exception;

    /** 삭제: 원재료를 되돌리고 수주를 다시 가져올 수 있게 푼다. 실생산량이 있거나 출하확정된 건은 막는다. */
    void delete(long id) throws Exception;

    /** 현장 투입지시서(생산지시량으로 환산한 원재료 kg) */
    BatchSheetVO batchSheet(long id) throws Exception;

    /** 가져오기 창: 생산예정일이 기간 안이고 아직 생산으로 가져가지 않은 수주 */
    List<ProductionOrderVO> listImportOrders(String start, String end) throws Exception;

    /**
     * 깎아뒀던 원재료를 되돌리고 지금의 배합(+바꿔 쓰기 쪽지)대로 다시 깎는다.
     * 재료 치환등록이 쪽지를 적거나 지운 뒤 부른다 — 차감을 따로 계산하지 않고 확정 때와 같은 규칙을 쓴다.
     * 생산건이 없으면 IllegalArgumentException.
     */
    void reapplyMaterialUsage(long id) throws Exception;
}

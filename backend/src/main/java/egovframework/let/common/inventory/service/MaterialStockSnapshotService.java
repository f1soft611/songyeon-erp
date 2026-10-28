package egovframework.let.common.inventory.service;

import java.util.Map;

/**
 * 공통 재고 - 원재료 '그 날짜 재고' 서비스 인터페이스 (송연 material_delta_after · warehouse_splitter)
 * 수불대장 · 재고현황 · 재고금액이 같은 질문에 같은 답을 내도록 한 곳에 둔다(두 화면이 따로 계산하다 어긋난 적이 있다).
 * @author SONGYEON ERP
 * @since 2026.10.13
 * @version 1.0
 */
public interface MaterialStockSnapshotService {

    /**
     * 그 날짜 뒤에 원재료 재고가 얼마나 움직였는지 {원재료코드: 증감}(+ 는 늘어난 것).
     * 그 날짜 끝 재고 = 지금 재고 - 이 값. 입고·반품 / 생산 사용 / 손으로 고침 / 재고조정 네 갈래를 모두 되감는다.
     */
    Map<String, Double> deltaAfter(String date) throws Exception;

    /** 그 날짜 끝 기준으로 남은재고를 창고별로 나누는 규칙(date 가 null 이면 지금) */
    WarehouseSplit warehouseSplit(String date) throws Exception;

    /** 원재료별로 입고창고 밖(계량창고 등)으로 옮겨간 양 합계 {원재료코드: 양}(송연 weighing_stock_map, 기간 제한 없이) */
    Map<String, Double> movedOutOfReceiving() throws Exception;
}

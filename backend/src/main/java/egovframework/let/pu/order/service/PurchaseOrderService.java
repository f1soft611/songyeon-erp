package egovframework.let.pu.order.service;

import java.util.List;

import egovframework.let.pu.order.domain.model.PurchaseOrderBulkRequestVO;
import egovframework.let.pu.order.domain.model.PurchaseOrderVO;

/**
 * 구매관리 - 발주관리 서비스 인터페이스 클래스 (송연 app.py purchase-order)
 * @author SONGYEON ERP
 * @since 2026.10.07
 * @version 1.0
 */
public interface PurchaseOrderService {

    /** 발주 목록(최근 발주일·최근 등록 순). 발주일 하나 또는 기간, 거래처·원재료명, 입고여부("0"·"1")로 거른다. 조건이 없으면 전부. */
    List<PurchaseOrderVO> listOrders(String date, String start, String end, String clientQ, String materialQ, String received) throws Exception;

    /** 여러 품목을 한꺼번에 발주로 넣는다. 거래처 없는 것·수량을 못 읽는 것·없는 원재료는 건너뛴다. @return 넣은 건수 */
    int registerBulk(PurchaseOrderBulkRequestVO request) throws Exception;

    /** 발주 취소. 이미 입고가 연결된 발주는 막는다. */
    void cancel(long id) throws Exception;
}

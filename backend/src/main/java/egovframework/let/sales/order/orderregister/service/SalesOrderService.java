package egovframework.let.sales.order.orderregister.service;

import java.util.List;

import egovframework.let.sales.order.orderregister.domain.model.OrderProductVO;
import egovframework.let.sales.order.orderregister.domain.model.SalesOrderVO;

/**
 * 영업관리 - 수주등록 서비스 인터페이스 클래스
 * @author SONGYEON ERP
 * @since 2026.10.06
 * @version 1.0
 */
public interface SalesOrderService {

    /** 그 수주일의 수주(날짜가 없으면 전체) */
    List<SalesOrderVO> listOrders(String orderDate) throws Exception;

    /** 수주를 받을 수 있는 거래처(분류에 '매출') */
    List<String> listSalesClientNames() throws Exception;

    /** 수주 품목 후보(사용 중인 제품) */
    List<OrderProductVO> listProductCandidates() throws Exception;

    /**
     * 수주 추가. 수주일 필수 → 물류출고일/재고생산 → 매출 거래처 → 같은 날 순서 +1. 새 ID 를 돌려준다.
     */
    Long createOrder(SalesOrderVO request) throws Exception;

    /** 수주 수정(수주일·순서는 그대로). 없는 줄이면 막는다. */
    void updateOrder(long id, SalesOrderVO request) throws Exception;

    void deleteOrder(long id) throws Exception;

    /** 수주·출하 거래처 확인: 필수, 거래처BOM 에 있고 분류에 '매출' 이 있어야 한다. 거래처BOM 철자로 돌려준다. */
    String resolveSalesClient(String raw) throws Exception;

    /** 제품코드 찾기: 준 코드 → 이름+규격 → 이름 → '이름(규격)'. 하나로 정해지지 않으면 null. */
    String resolveProductCode(String name, String spec, String given) throws Exception;

    /** 2026-10-26 수주 · 출하는 거래처코드를 저장한다. 거래처명 → 코드, 코드가 없으면 막는다. */
    String requireClientCode(String clientName) throws Exception;

    /** 2026-10-26 수주 · 출하는 제품코드만 저장한다. 품목명이 있는데 코드가 하나로 정해지지 않으면 막는다. */
    String requireProductCode(String name, String spec, String given) throws Exception;
}

package egovframework.let.ha.taxinvoice.service;

import java.util.Map;

/**
 * 인사·회계 - 세금계산서 서비스 인터페이스 (송연 app.py /api/tax-invoice/*, accounting.py /api/accounting/sales-by-client)
 * 즉시 발행(거래처 한 곳의 기간 매출)과 월단위 일괄발행(기간 안 거래처별 매출)을 보여주고 발행을 요청한다.
 * 실제 발행은 송연도 아직 없다: 발급업체(팝빌) API 키가 없으면 그 안내를, 있으면 '준비 중' 을 돌려준다. 아무것도 적지 않는다.
 * @author SONGYEON ERP
 * @since 2026.10.15
 * @version 1.0
 */
public interface TaxInvoiceService {

    /** 발급업체(팝빌) API 키가 등록돼 있는가 → {configured} */
    Map<String, Object> status() throws Exception;

    /** 즉시 발행: clientName(일부도 됨) · start · end → {rows, totalAmount, totalQty, resolvedClientName} */
    Map<String, Object> single(Map<String, String> filter) throws Exception;

    /** 월단위 일괄발행: start · end → {clients: [{clientName, qty, amount, hasMissingPrice}], totalAmount} (매출액 큰 순) */
    Map<String, Object> batch(Map<String, String> filter) throws Exception;

    /** 발행 요청. 키가 없으면 그 안내, 있으면 '준비 중' 을 IllegalArgumentException 으로 돌려준다(아무것도 적지 않는다) */
    void issue() throws Exception;
}

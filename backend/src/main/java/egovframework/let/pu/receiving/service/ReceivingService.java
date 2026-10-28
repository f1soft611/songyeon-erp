package egovframework.let.pu.receiving.service;

import java.util.List;
import java.util.Map;

import egovframework.let.pu.receiving.domain.model.ReceivingBulkRequestVO;
import egovframework.let.pu.receiving.domain.model.ReceivingBulkResultVO;
import egovframework.let.pu.receiving.domain.model.ReceivingDetailVO;
import egovframework.let.pu.receiving.domain.model.ReceivingSummaryVO;
import egovframework.let.pu.receiving.domain.model.ReceivingVO;

/**
 * 구매관리 - 입고관리 서비스 인터페이스 클래스 (송연 app.py receiving)
 * @author SONGYEON ERP
 * @since 2026.10.08
 * @version 1.0
 */
public interface ReceivingService {

    /** 입고(반품) 목록. 날짜 하나 또는 기간, 거래처·원재료명, kind(receiving·return). 줄마다 붙은 서류와 반품가능 수량. */
    List<ReceivingVO> listReceivings(String date, String start, String end, String clientQ, String materialQ, String kind) throws Exception;

    /** 입고·반품 여러 건 등록(한 트랜잭션). 재고를 그만큼 움직인다. */
    ReceivingBulkResultVO registerBulk(ReceivingBulkRequestVO request) throws Exception;

    /** 입고(반품) 취소: 재고를 되돌리고 줄과 붙은 서류를 지운다 */
    void cancel(long id) throws Exception;

    /** 이 원재료를 마지막으로 입고했을 때의 단가 {unitPrice, source(vendor·any)} */
    Map<String, Object> lastPrice(String materialCode, String clientName) throws Exception;

    /** 서류등록 탭: 기간 안 원재료별 입고량. 기간 필수. */
    List<ReceivingSummaryVO> summary(String start, String end, String clientQ, String materialQ) throws Exception;

    /** 서류등록 탭 상세: 그 원재료의 기간 안 입고 건 + 총 입고량 + 같은 기간 생산사용량. 품목·기간 필수. */
    ReceivingDetailVO detail(String materialCode, String start, String end, String clientQ) throws Exception;
}
